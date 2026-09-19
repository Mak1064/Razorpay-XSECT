import {
  alertTriggersTable, availabilityRulesTable, connectionTable, crossingsTable, db, eventTable,
  missedXsectsTable, momentsTable, notificationTable, offersTable, organizationOpportunitiesTable,
  professionalProfileTable, standingAlertsTable, wantsTable, xsectFactorsTable, xsectsTable,
  type Offer, type ProfessionalProfile, type Want, type Xsect, type XsectFactor, type XsectFactorName, type XsectType,
} from "@workspace/db";
import { and, asc, count, desc, eq, gt, gte, inArray, isNull, lt, ne, or, sql } from "drizzle-orm";
import { track } from "../../lib/analytics";
import { DISTANCE_BAND_LABELS } from "../../lib/geo";
import {
  crossingPairKey, pairKeyFor, type FactorBreakdown, type PairScore, type ProtectedProfileView,
  type RecordCrossingInput, type ScoreContext, type XsectEngine, type XsectWithFactors,
} from "./index";

const DAY = 86_400_000;
const trustRank = { contact: 0, professional: 1, enhanced: 2 } as const;
const urgencyRank: Record<string, number> = { casual: 35, exploring: 35, active: 72, urgent: 100 };
const categoryPairs: Record<string, string[]> = {
  job: ["hiring", "referrals", "introductions"], referral: ["referrals", "introductions"],
  investor: ["investment", "introductions"], cofounder: ["expertise", "partnership", "investment"],
  mentor: ["mentoring", "expertise"], advisor: ["consulting", "expertise", "mentoring"],
  freelancer: ["freelancing", "consulting", "services"], client: ["services", "consulting", "freelancing"],
  partnership: ["partnership", "introductions"], introduction: ["introductions", "referrals"],
  advice: ["mentoring", "consulting", "expertise"], service: ["services", "consulting", "freelancing"],
};
const weights: Record<XsectType, Record<XsectFactorName, number>> = {
  physical: { intent: 20, skills: 8, industry: 5, goals: 6, proximity: 22, availability: 8, urgency: 7, trust: 7, activity: 5, freshness: 7, network: 5 },
  intent: { intent: 27, skills: 19, industry: 8, goals: 10, proximity: 3, availability: 7, urgency: 7, trust: 6, activity: 4, freshness: 6, network: 3 },
  network: { intent: 10, skills: 7, industry: 5, goals: 5, proximity: 2, availability: 4, urgency: 4, trust: 21, activity: 5, freshness: 5, network: 32 },
  time: { intent: 14, skills: 8, industry: 5, goals: 5, proximity: 2, availability: 37, urgency: 10, trust: 5, activity: 5, freshness: 6, network: 3 },
  event: { intent: 23, skills: 10, industry: 6, goals: 25, proximity: 2, availability: 5, urgency: 5, trust: 6, activity: 6, freshness: 8, network: 4 },
  opportunity: { intent: 16, skills: 25, industry: 21, goals: 9, proximity: 3, availability: 5, urgency: 5, trust: 4, activity: 4, freshness: 6, network: 2 },
};

const words = (...values: unknown[]) => new Set(values.flatMap((value) => {
  if (Array.isArray(value)) return value.flatMap((item) => String(item).toLowerCase().split(/[^a-z0-9+#.]+/));
  return typeof value === "string" ? value.toLowerCase().split(/[^a-z0-9+#.]+/) : [];
}).filter((word) => word.length > 1));
const overlap = (a: Set<string>, b: Set<string>) => [...a].filter((value) => b.has(value));
const overlapScore = (a: Set<string>, b: Set<string>) => {
  if (!a.size || !b.size) return 25;
  const shared = overlap(a, b).length;
  return Math.min(100, Math.round(100 * shared / Math.max(1, Math.min(a.size, b.size))));
};
const profileFor = async (id: string) => (await db.select().from(professionalProfileTable).where(eq(professionalProfileTable.userId, id)).limit(1))[0] ?? null;
const activeWants = async (id: string) => db.select().from(wantsTable).where(and(eq(wantsTable.userId, id), eq(wantsTable.status, "active"), ne(wantsTable.visibility, "hidden"), or(isNull(wantsTable.expiresAt), gt(wantsTable.expiresAt, new Date()))));
const activeOffers = async (id: string) => db.select().from(offersTable).where(and(eq(offersTable.userId, id), eq(offersTable.status, "active"), ne(offersTable.visibility, "hidden"), or(isNull(offersTable.expiresAt), gt(offersTable.expiresAt, new Date()))));
const connectionFor = async (a: string, b: string) => (await db.select().from(connectionTable).where(or(
  and(eq(connectionTable.requesterId, a), eq(connectionTable.recipientId, b)),
  and(eq(connectionTable.requesterId, b), eq(connectionTable.recipientId, a)),
)).limit(1))[0] ?? null;
const daysOldScore = (date: Date | null | undefined, now: Date, horizon = 30) => date ? Math.max(0, Math.round(100 - ((now.getTime() - date.getTime()) / DAY) * (100 / horizon))) : 25;
const highestIntent = (wants: Want[], offers: Offer[], profile: ProfessionalProfile) =>
  Math.max(urgencyRank[profile.urgency] ?? 35, ...wants.map((w) => urgencyRank[w.intent]), ...offers.map((o) => urgencyRank[o.intent]));
const bestPair = (viewerWants: Want[], counterpartOffers: Offer[]) => {
  let best: { want: Want | null; offer: Offer | null; score: number; shared: string[] } = { want: null, offer: null, score: 0, shared: [] };
  for (const want of viewerWants) for (const offer of counterpartOffers) {
    const category = categoryPairs[want.category]?.includes(offer.category) ? 100 : 20;
    const shared = overlap(words(want.title, want.description, want.skills), words(offer.title, offer.description, offer.skills));
    const lexical = overlapScore(words(want.title, want.description, want.skills), words(offer.title, offer.description, offer.skills));
    const score = Math.round(category * .55 + lexical * .45);
    if (score > best.score) best = { want, offer, score, shared };
  }
  return best;
};
const label = (value: string) => value.replace(/_/g, " ");

async function scorePair(viewerId: string, counterpartId: string, context: ScoreContext): Promise<PairScore> {
  const [viewer, counterpart, rawViewerWants, rawViewerOffers, rawCounterpartWants, rawCounterpartOffers, viewerRules, counterpartRules, connections] = await Promise.all([
    profileFor(viewerId), profileFor(counterpartId), activeWants(viewerId), activeOffers(viewerId),
    activeWants(counterpartId), activeOffers(counterpartId),
    db.select().from(availabilityRulesTable).where(eq(availabilityRulesTable.userId, viewerId)),
    db.select().from(availabilityRulesTable).where(eq(availabilityRulesTable.userId, counterpartId)),
    db.select().from(connectionTable).where(and(eq(connectionTable.status, "accepted"), or(eq(connectionTable.requesterId, viewerId), eq(connectionTable.recipientId, viewerId), eq(connectionTable.requesterId, counterpartId), eq(connectionTable.recipientId, counterpartId)))),
  ]);
  if (!viewer || !counterpart) throw new Error("Both professional profiles are required to score an XSECT.");
  const viewerWants = rawViewerWants.filter((row) => trustRank[counterpart.trustLevel] >= trustRank[row.trustRequirement]);
  const viewerOffers = rawViewerOffers.filter((row) => trustRank[counterpart.trustLevel] >= trustRank[row.trustRequirement]);
  const counterpartWants = rawCounterpartWants.filter((row) => trustRank[viewer.trustLevel] >= trustRank[row.trustRequirement]);
  const counterpartOffers = rawCounterpartOffers.filter((row) => trustRank[viewer.trustLevel] >= trustRank[row.trustRequirement]);
  const now = context.now ?? new Date();
  const forward = bestPair(viewerWants, counterpartOffers);
  const reverse = bestPair(counterpartWants, viewerOffers);
  const intent = Math.max(forward.score, reverse.score, overlapScore(words(viewer.wants, viewer.offers, viewer.intent), words(counterpart.wants, counterpart.offers, counterpart.intent)));
  const skills = Math.max(
    overlapScore(words(viewer.skills, ...viewerWants.map((w) => w.skills)), words(counterpart.skills, ...counterpartOffers.map((o) => o.skills))),
    overlapScore(words(counterpart.skills, ...counterpartWants.map((w) => w.skills)), words(viewer.skills, ...viewerOffers.map((o) => o.skills))),
  );
  const industry = viewer.industry && counterpart.industry ? (viewer.industry.toLowerCase() === counterpart.industry.toLowerCase() ? 100 : overlapScore(words(viewer.industry), words(counterpart.industry))) : 30;
  const goals = overlapScore(words(viewer.opportunityCategories, viewer.intent, ...viewerWants.map((w) => [w.category, w.title])), words(counterpart.opportunityCategories, counterpart.intent, ...counterpartOffers.map((o) => [o.category, o.title])));
  const distanceScores: Record<string, number> = { lt_250m: 100, "250m_500m": 92, "500m_1km": 82, "1km_2km": 68, "2km_5km": 50, "5km_plus": 25 };
  const proximity = Math.min(100, (context.distanceBand ? distanceScores[context.distanceBand] : viewer.city && viewer.city === counterpart.city ? 45 : 20) + Math.min(20, Math.max(0, (context.crossingCount ?? 1) - 1) * 7));
  const textAvailable = /now|today|week|flexible/i.test(viewer.availability) && /now|today|week|flexible/i.test(counterpart.availability);
  const availability = context.availabilityOverlapMinutes != null
    ? Math.min(100, 40 + context.availabilityOverlapMinutes / 3)
    : viewerRules.length && counterpartRules.length ? (rulesOverlap(viewerRules, counterpartRules, now) > 0 ? 90 : 20) : textAvailable ? 75 : 30;
  const viewerUrgency = highestIntent(viewerWants, viewerOffers, viewer);
  const counterpartUrgency = highestIntent(counterpartWants, counterpartOffers, counterpart);
  const urgency = Math.round((viewerUrgency + counterpartUrgency) / 2);
  const requirements = [...viewerWants, ...counterpartWants, ...viewerOffers, ...counterpartOffers].map((row) => row.trustRequirement);
  const trustSatisfied = requirements.every((requirement) => trustRank[viewer.trustLevel] >= trustRank[requirement] && trustRank[counterpart.trustLevel] >= trustRank[requirement]);
  const trust = trustSatisfied ? 70 + Math.min(trustRank[viewer.trustLevel], trustRank[counterpart.trustLevel]) * 15 : 15;
  const activity = Math.round((daysOldScore(viewer.lastActiveAt, now, 14) + daysOldScore(counterpart.lastActiveAt, now, 14)) / 2);
  const relevantRows = [forward.want, forward.offer, reverse.want, reverse.offer].filter(Boolean) as Array<Want | Offer>;
  const freshness = relevantRows.length ? Math.round(relevantRows.reduce((sum, row) => sum + Math.min(daysOldScore(row.createdAt, now), row.expiresAt ? Math.max(0, Math.min(100, (row.expiresAt.getTime() - now.getTime()) / DAY * 10)) : 80), 0) / relevantRows.length) : 30;
  const viewerNeighbours = new Set(connections.filter((c) => c.requesterId === viewerId || c.recipientId === viewerId).map((c) => c.requesterId === viewerId ? c.recipientId : c.requesterId));
  const counterpartNeighbours = new Set(connections.filter((c) => c.requesterId === counterpartId || c.recipientId === counterpartId).map((c) => c.requesterId === counterpartId ? c.recipientId : c.requesterId));
  const mutual = overlap(viewerNeighbours, counterpartNeighbours).length;
  const network = context.pathLength ? Math.max(20, 110 - context.pathLength * 25) : Math.min(100, 20 + mutual * 25);
  const raw: Record<XsectFactorName, number> = { intent, skills, industry, goals, proximity, availability: Math.round(availability), urgency, trust, activity, freshness, network };
  const factors: FactorBreakdown[] = Object.entries(raw).map(([factor, value]) => ({
    factor: factor as XsectFactorName, score: Math.max(0, Math.min(100, Math.round(value))),
    weight: weights[context.type][factor as XsectFactorName],
    detail: `${label(factor)} relevance is ${Math.max(0, Math.min(100, Math.round(value)))} of 100`,
  }));
  const score = Math.round(factors.reduce((sum, factor) => sum + factor.score * factor.weight, 0) / 100);
  const chosen = forward.score >= reverse.score ? forward : reverse;
  const explanation: string[] = [];
  if (chosen.want && chosen.offer) explanation.push(chosen === forward
    ? `You want ${chosen.want.title}; they offer ${chosen.offer.title}${chosen.shared.length ? ` with shared focus on ${chosen.shared.slice(0, 3).join(", ")}` : ""}.`
    : `They want ${chosen.want.title}; you offer ${chosen.offer.title}${chosen.shared.length ? ` with shared focus on ${chosen.shared.slice(0, 3).join(", ")}` : ""}.`);
  else if (intent >= 50) explanation.push("Your current professional goals and their active intent are complementary.");
  if (skills >= 55) explanation.push(`Relevant skills overlap${overlap(words(viewer.skills), words(counterpart.skills)).length ? ` in ${overlap(words(viewer.skills), words(counterpart.skills)).slice(0, 3).join(", ")}` : ""}.`);
  if (context.distanceBand) explanation.push(`${context.crossingCount && context.crossingCount > 1 ? `Crossed paths ${context.crossingCount} times` : "Crossed paths"} in the ${DISTANCE_BAND_LABELS[context.distanceBand]} distance band.`);
  if (context.availabilityOverlapMinutes && context.availabilityOverlapMinutes >= 30) explanation.push(`Availability overlaps for ${context.availabilityOverlapMinutes} minutes in the next week.`);
  else if (availability >= 70) explanation.push("Both are available within a compatible timeframe.");
  if (industry >= 80) explanation.push(`Both work in ${viewer.industry}.`);
  if (mutual) explanation.push(`${mutual} mutual accepted connection${mutual === 1 ? "" : "s"} strengthen this path.`);
  if (trustSatisfied) explanation.push("Both profiles meet the relevant trust preferences.");
  const hotSignal = viewerUrgency >= 100 || counterpartUrgency >= 100 || /now/i.test(viewer.availability) || /now/i.test(counterpart.availability);
  return { score, factors, explanation: explanation.slice(0, 5), wantId: chosen.want?.id ?? null, offerId: chosen.offer?.id ?? null, isHot: score >= 80 && hotSignal };
}

function minutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}
function ruleDates(rule: typeof availabilityRulesTable.$inferSelect, now: Date) {
  const dates: string[] = [];
  for (let offset = 0; offset < 7; offset++) {
    const date = new Date(now.getTime() + offset * DAY);
    const iso = date.toISOString().slice(0, 10);
    if ((rule.mode === "one_off" && rule.date === iso) || (rule.mode === "recurring" && rule.weekday === date.getUTCDay())) dates.push(iso);
  }
  return dates;
}
function rulesOverlap(a: Array<typeof availabilityRulesTable.$inferSelect>, b: Array<typeof availabilityRulesTable.$inferSelect>, now: Date) {
  let total = 0;
  for (const left of a) for (const right of b) {
    if (!ruleDates(left, now).some((date) => ruleDates(right, now).includes(date))) continue;
    total += Math.max(0, Math.min(minutes(left.endTime), minutes(right.endTime)) - Math.max(minutes(left.startTime), minutes(right.startTime)));
  }
  return total;
}

async function expiryFor(context: ScoreContext & { eventId?: string | null; organizationOpportunityId?: string | null }) {
  const now = context.now ?? new Date();
  if (context.type === "physical") return new Date(now.getTime() + 14 * DAY);
  if (context.type === "intent") return new Date(now.getTime() + 30 * DAY);
  if (context.type === "time") return new Date(now.getTime() + 7 * DAY);
  if (context.type === "event" && context.eventId) {
    const event = (await db.select().from(eventTable).where(eq(eventTable.id, context.eventId)).limit(1))[0];
    return event ? new Date(event.startsAt.getTime() + 3 * DAY) : new Date(now.getTime() + 3 * DAY);
  }
  if (context.type === "opportunity" && context.organizationOpportunityId) {
    return (await db.select().from(organizationOpportunitiesTable).where(eq(organizationOpportunitiesTable.id, context.organizationOpportunityId)).limit(1))[0]?.expiresAt ?? null;
  }
  return new Date(now.getTime() + 30 * DAY);
}
function momentKind(context: ScoreContext, newlyHot: boolean) {
  if (context.crossingCount && context.crossingCount >= 2) return "repeated_crossing" as const;
  if (context.type === "physical") return "nearby_need" as const;
  if (context.type === "network") return "network_intersection" as const;
  if (context.type === "time") return "time_overlap" as const;
  if (context.type === "event") return "event_matches" as const;
  return newlyHot ? "nearby_need" as const : "almost_met" as const;
}

async function triggerAlerts(ownerId: string, counterpartId: string | null, xsect: Xsect, score: PairScore) {
  if (!counterpartId) return;
  const [profile, offers] = await Promise.all([profileFor(counterpartId), activeOffers(counterpartId)]);
  if (!profile) return;
  const corpus = words(profile.role, profile.intent, profile.skills, profile.industry, profile.opportunityCategories, ...offers.map((o) => [o.title, o.description, o.skills, o.industry, o.category]));
  const alerts = await db.select().from(standingAlertsTable).where(and(eq(standingAlertsTable.userId, ownerId), eq(standingAlertsTable.status, "active"), or(isNull(standingAlertsTable.expiresAt), gt(standingAlertsTable.expiresAt, new Date()))));
  for (const alert of alerts) {
    const criteria = alert.criteria;
    const terms = [...criteria.keywords, ...criteria.skills, ...criteria.industries, ...criteria.offerCategories].map((term) => term.toLowerCase());
    if (score.score < criteria.minScore || (terms.length && !terms.some((term) => corpus.has(term) || [...corpus].some((word) => word.includes(term))))) continue;
    const [trigger] = await db.insert(alertTriggersTable).values({ alertId: alert.id, xsectId: xsect.id, userId: counterpartId }).onConflictDoNothing().returning();
    if (!trigger) continue;
    await db.update(standingAlertsTable).set({ triggerCount: sql`${standingAlertsTable.triggerCount} + 1`, lastTriggeredAt: new Date() }).where(eq(standingAlertsTable.id, alert.id));
    await db.insert(momentsTable).values({ userId: ownerId, kind: "alert_triggered", title: "Standing XSECT triggered", body: alert.title, xsectId: xsect.id, relatedUserId: counterpartId });
    if (alert.frequency === "instant") await db.insert(notificationTable).values({ userId: ownerId, type: "standing_alert", title: "Standing XSECT triggered", body: "A protected professional meets your alert criteria.", resourceId: xsect.id });
  }
}

async function upsertXsect(ownerId: string, counterpartId: string | null, context: ScoreContext & { pairKey: string; crossingId?: string | null; eventId?: string | null; organizationOpportunityId?: string | null; pathUserIds?: string[] }, score: PairScore) {
  const existing = (await db.select().from(xsectsTable).where(and(eq(xsectsTable.userId, ownerId), eq(xsectsTable.pairKey, context.pairKey))).limit(1))[0];
  const values = {
    counterpartUserId: counterpartId, type: context.type, score: score.score, explanation: score.explanation,
    isHot: score.isHot, distanceBand: context.distanceBand ?? null, wantId: score.wantId, offerId: score.offerId,
    crossingId: context.crossingId ?? null, eventId: context.eventId ?? null,
    organizationOpportunityId: context.organizationOpportunityId ?? null, pathUserIds: context.pathUserIds ?? [],
    expiresAt: await expiryFor(context), lastEvaluatedAt: context.now ?? new Date(),
  };
  const [xsect] = existing
    ? await db.update(xsectsTable).set(values).where(eq(xsectsTable.id, existing.id)).returning()
    : await db.insert(xsectsTable).values({ ...values, userId: ownerId, pairKey: context.pairKey }).returning();
  await db.delete(xsectFactorsTable).where(eq(xsectFactorsTable.xsectId, xsect.id));
  if (score.factors.length) await db.insert(xsectFactorsTable).values(score.factors.map((factor) => ({ ...factor, xsectId: xsect.id })));
  const newlyHot = score.isHot && !existing?.isHot;
  if (!existing || newlyHot || (context.crossingCount != null && context.crossingCount >= 2)) await db.insert(momentsTable).values({
    userId: ownerId, kind: momentKind(context, newlyHot), title: newlyHot ? "Hot XSECT detected" : "New XSECT detected",
    body: score.explanation[0] ?? "A relevant professional intersection was detected.", xsectId: xsect.id, relatedUserId: counterpartId,
    metadata: { type: context.type, score: score.score, distanceBand: context.distanceBand ?? null },
  });
  if (!existing) await track("xsect_created", ownerId, { xsectId: xsect.id, type: xsect.type, score: xsect.score });
  await triggerAlerts(ownerId, counterpartId, xsect, score);
  return xsect;
}

async function isDiscoverable(viewerId: string, counterpartId: string) {
  if (viewerId === counterpartId) return false;
  const [viewer, counterpart, connection, viewerWants, viewerOffers, counterpartWants, counterpartOffers] = await Promise.all([
    profileFor(viewerId), profileFor(counterpartId), connectionFor(viewerId, counterpartId),
    activeWants(viewerId), activeOffers(viewerId), activeWants(counterpartId), activeOffers(counterpartId),
  ]);
  if (!viewer || !counterpart || connection?.status === "blocked" || viewer.visibility === "ghost" || counterpart.visibility === "ghost") return false;
  const accepted = connection?.status === "accepted";
  if (counterpart.privacy.trustedConnectionsOnly && !accepted) return false;
  if (viewer.privacy.trustedConnectionsOnly && !accepted) return false;
  if (counterpart.visibility === "trusted_only" && !accepted && trustRank[viewer.trustLevel] < trustRank.professional) return false;
  if (viewer.visibility === "trusted_only" && !accepted && trustRank[counterpart.trustLevel] < trustRank.professional) return false;
  if ([...counterpartWants, ...counterpartOffers].length && ![...counterpartWants, ...counterpartOffers].some((row) => trustRank[viewer.trustLevel] >= trustRank[row.trustRequirement])) return false;
  if ([...viewerWants, ...viewerOffers].length && ![...viewerWants, ...viewerOffers].some((row) => trustRank[counterpart.trustLevel] >= trustRank[row.trustRequirement])) return false;
  const explicitWoman = (profile: ProfessionalProfile) => /(^|\W)(woman|female|she\/her|she)(\W|$)/i.test(profile.identity.pronouns ?? "");
  if (counterpart.privacy.womenOnly && !explicitWoman(viewer)) return false;
  if (viewer.privacy.womenOnly && !explicitWoman(counterpart)) return false;
  if (counterpart.visibility === "stealth" || counterpart.privacy.stealthMode) {
    const intents = words(counterpart.stealthIntents);
    const viewerIntents = words(viewer.opportunityCategories, viewer.wants, viewer.offers);
    if (!overlap(intents, viewerIntents).length) return false;
  }
  if (viewer.visibility === "stealth" || viewer.privacy.stealthMode) {
    const intents = words(viewer.stealthIntents);
    const counterpartIntents = words(counterpart.opportunityCategories, counterpart.wants, counterpart.offers);
    if (!overlap(intents, counterpartIntents).length) return false;
  }
  return true;
}

async function protectedProfileView(viewerId: string, counterpartId: string): Promise<ProtectedProfileView | null> {
  const [profile, discoverable, connection] = await Promise.all([profileFor(counterpartId), isDiscoverable(viewerId, counterpartId), connectionFor(viewerId, counterpartId)]);
  if (!profile || (!discoverable && connection?.status !== "accepted")) return null;
  const revealed = connection?.status === "accepted";
  const elapsed = Date.now() - profile.lastActiveAt.getTime();
  const lastActiveBand = elapsed < 15 * 60_000 ? "now" : elapsed < DAY ? "today" : elapsed < 7 * DAY ? "this_week" : "earlier";
  const role = profile.role || "Professional";
  const area = profile.area || profile.city || "your network";
  return {
    userId: counterpartId, revealed, displayName: revealed ? profile.displayName : null, photoUrl: revealed ? profile.photoUrl : null,
    role, industry: profile.industry, company: revealed ? profile.company : null, city: profile.city, area: profile.area,
    trustLevel: profile.trustLevel, skills: profile.skills, intentSummary: profile.intent || profile.wants[0] || "Open to relevant professional opportunities",
    lastActiveBand, handle: `${role} · ${area}`,
  };
}

async function recordCrossing(input: RecordCrossingInput) {
  if (input.userAId === input.userBId) throw new Error("A crossing requires two different users.");
  const pairKey = crossingPairKey(input.userAId, input.userBId);
  const [crossing] = await db.insert(crossingsTable).values({
    userAId: input.userAId, userBId: input.userBId, pairKey, city: input.city, area: input.area,
    distanceBand: input.distanceBand, occurredAt: input.occurredAt, durationMinutes: input.durationMinutes,
    source: input.source, createdBy: input.createdBy,
  }).returning();
  const repeatedCount = Number((await db.select({ value: count() }).from(crossingsTable).where(eq(crossingsTable.pairKey, pairKey)))[0]?.value ?? 1);
  const processSide = async (ownerId: string, counterpartId: string) => {
    if (!(await isDiscoverable(ownerId, counterpartId))) return { xsect: null, missedId: null };
    const context: ScoreContext = { type: "physical", distanceBand: input.distanceBand, crossingCount: repeatedCount, now: input.occurredAt ?? new Date() };
    const score = await scorePair(ownerId, counterpartId, context);
    const xsect = await upsertXsect(ownerId, counterpartId, { ...context, pairKey: pairKeyFor("physical", ownerId, counterpartId), crossingId: crossing.id }, score);
    const [missed] = await db.insert(missedXsectsTable).values({
      userId: ownerId, counterpartUserId: counterpartId, xsectId: xsect.id, crossingId: crossing.id, score: score.score,
      distanceBand: input.distanceBand, wantId: score.wantId, offerId: score.offerId, occurredAt: crossing.occurredAt,
      expiresAt: new Date(crossing.occurredAt.getTime() + 14 * DAY),
    }).onConflictDoNothing().returning();
    if (missed) await db.insert(momentsTable).values({
      userId: ownerId, kind: "almost_met", title: "You almost met a relevant professional",
      body: score.explanation[0] ?? "A protected professional crossed your path.", xsectId: xsect.id,
      relatedUserId: counterpartId, metadata: { crossingId: crossing.id, distanceBand: input.distanceBand, score: score.score },
    });
    if (score.score >= 70) {
      const owner = await profileFor(ownerId);
      if (owner?.notificationPreferences.matches) await db.insert(notificationTable).values({ userId: ownerId, type: "xsect_crossing", title: "You just crossed a strong XSECT", body: `A protected opportunity scored ${score.score}.`, resourceId: xsect.id });
    }
    return { xsect, missedId: missed?.id ?? null };
  };
  const [forA, forB] = await Promise.all([processSide(input.userAId, input.userBId), processSide(input.userBId, input.userAId)]);
  await track("crossing_created", input.createdBy ?? null, { crossingId: crossing.id, source: crossing.source, repeatedCount });
  return { crossingId: crossing.id, repeatedCount, xsects: { forA: forA.xsect, forB: forB.xsect }, missed: { forA: forA.missedId, forB: forB.missedId } };
}

async function recomputeIntentXsects(userId: string, options?: { limit?: number }) {
  const [viewer, viewerWants, viewerOffers] = await Promise.all([profileFor(userId), activeWants(userId), activeOffers(userId)]);
  if (!viewer || (!viewerWants.length && !viewerOffers.length)) return 0;
  const limit = Math.max(1, Math.min(options?.limit ?? 200, 500));
  const candidates = await db.select().from(professionalProfileTable).where(and(
    ne(professionalProfileTable.userId, userId), ne(professionalProfileTable.visibility, "ghost"),
    sql`(exists (select 1 from ${offersTable} active_offer where active_offer.user_id = ${professionalProfileTable.userId} and active_offer.status = 'active' and (active_offer.expires_at is null or active_offer.expires_at > now()))
      or exists (select 1 from ${wantsTable} active_want where active_want.user_id = ${professionalProfileTable.userId} and active_want.status = 'active' and (active_want.expires_at is null or active_want.expires_at > now())))`,
    or(viewer.city ? eq(professionalProfileTable.city, viewer.city) : sql`false`,
      sql`exists (select 1 from ${offersTable} o where o.user_id = ${professionalProfileTable.userId} and o.status = 'active' and o.work_mode in ('remote','flexible'))`,
      sql`exists (select 1 from ${wantsTable} w where w.user_id = ${professionalProfileTable.userId} and w.status = 'active' and w.work_mode in ('remote','flexible'))`),
  )).orderBy(desc(professionalProfileTable.lastActiveAt)).limit(limit);
  let written = 0;
  for (const candidate of candidates) {
    if (!(await isDiscoverable(userId, candidate.userId))) continue;
    const context: ScoreContext = { type: "intent" };
    const score = await scorePair(userId, candidate.userId, context);
    if (score.score < 45) continue;
    await upsertXsect(userId, candidate.userId, { ...context, pairKey: pairKeyFor("intent", userId, candidate.userId) }, score);
    written++;
  }
  return written;
}

async function recomputeTimeXsects(userId: string) {
  const [existing, connections, ownerRules] = await Promise.all([
    db.select({ id: xsectsTable.counterpartUserId }).from(xsectsTable).where(and(eq(xsectsTable.userId, userId), eq(xsectsTable.status, "active"), sql`${xsectsTable.counterpartUserId} is not null`)),
    db.select().from(connectionTable).where(and(eq(connectionTable.status, "accepted"), or(eq(connectionTable.requesterId, userId), eq(connectionTable.recipientId, userId)))),
    db.select().from(availabilityRulesTable).where(eq(availabilityRulesTable.userId, userId)),
  ]);
  const ids = new Set<string>(existing.flatMap((row) => row.id ? [row.id] : []));
  connections.forEach((connection) => ids.add(connection.requesterId === userId ? connection.recipientId : connection.requesterId));
  let written = 0;
  for (const counterpartId of ids) {
    if (!(await isDiscoverable(userId, counterpartId))) continue;
    const counterpartRules = await db.select().from(availabilityRulesTable).where(eq(availabilityRulesTable.userId, counterpartId));
    const overlapMinutes = rulesOverlap(ownerRules, counterpartRules, new Date());
    if (overlapMinutes < 30) continue;
    const context: ScoreContext = { type: "time", availabilityOverlapMinutes: overlapMinutes };
    const score = await scorePair(userId, counterpartId, context);
    await upsertXsect(userId, counterpartId, { ...context, pairKey: pairKeyFor("time", userId, counterpartId) }, score);
    written++;
  }
  return written;
}

async function listXsects(userId: string, filters: Parameters<XsectEngine["listXsects"]>[1] = {}): Promise<XsectWithFactors[]> {
  const conditions = [eq(xsectsTable.userId, userId)];
  if (filters?.type) conditions.push(eq(xsectsTable.type, filters.type));
  if (filters?.status) conditions.push(eq(xsectsTable.status, filters.status));
  if (filters?.minScore != null) conditions.push(gte(xsectsTable.score, filters.minScore));
  const rows = await db.select().from(xsectsTable).where(and(...conditions)).orderBy(desc(xsectsTable.isHot), desc(xsectsTable.score), desc(xsectsTable.createdAt)).limit(filters?.limit ?? 200);
  if (!rows.length) return [];
  const allFactors = await db.select().from(xsectFactorsTable).where(inArray(xsectFactorsTable.xsectId, rows.map((row) => row.id))).orderBy(desc(xsectFactorsTable.weight));
  const byXsect = new Map<string, XsectFactor[]>();
  for (const factor of allFactors) byXsect.set(factor.xsectId, [...(byXsect.get(factor.xsectId) ?? []), factor]);
  const counterpartIds = [...new Set(rows.map((row) => row.counterpartUserId).filter((id): id is string => !!id))];
  const views = new Map(await Promise.all(counterpartIds.map(async (id) => [id, await protectedProfileView(userId, id)] as const)));
  return rows.map((row) => ({ ...row, factors: byXsect.get(row.id) ?? [], counterpart: row.counterpartUserId ? views.get(row.counterpartUserId) ?? null : null }));
}

async function getXsect(userId: string, xsectId: string) {
  const row = (await db.select().from(xsectsTable).where(and(eq(xsectsTable.id, xsectId), eq(xsectsTable.userId, userId))).limit(1))[0];
  if (!row) return null;
  return { ...row, factors: await db.select().from(xsectFactorsTable).where(eq(xsectFactorsTable.xsectId, row.id)).orderBy(desc(xsectFactorsTable.weight)), counterpart: row.counterpartUserId ? await protectedProfileView(userId, row.counterpartUserId) : null };
}

async function expireStale(now = new Date()) {
  const xsects = await db.update(xsectsTable).set({ status: "expired" }).where(and(lt(xsectsTable.expiresAt, now), eq(xsectsTable.status, "active"))).returning({ id: xsectsTable.id });
  const missed = await db.update(missedXsectsTable).set({ status: "expired" }).where(and(lt(missedXsectsTable.expiresAt, now), eq(missedXsectsTable.status, "active"))).returning({ id: missedXsectsTable.id });
  const alerts = await db.update(standingAlertsTable).set({ status: "expired" }).where(and(lt(standingAlertsTable.expiresAt, now), ne(standingAlertsTable.status, "expired"))).returning({ id: standingAlertsTable.id });
  return { xsects: xsects.length, missed: missed.length, alerts: alerts.length };
}

/** Keep XSECT + Missed rows for a pair consistent with the underlying connection state (both sides). */
async function syncPairState(userAId: string, userBId: string, state: "connected" | "dismissed" | "active") {
  const pairMatch = or(and(eq(xsectsTable.userId, userAId), eq(xsectsTable.counterpartUserId, userBId)), and(eq(xsectsTable.userId, userBId), eq(xsectsTable.counterpartUserId, userAId)));
  const missedMatch = or(and(eq(missedXsectsTable.userId, userAId), eq(missedXsectsTable.counterpartUserId, userBId)), and(eq(missedXsectsTable.userId, userBId), eq(missedXsectsTable.counterpartUserId, userAId)));
  const xsects = await db.update(xsectsTable).set({ status: state }).where(and(pairMatch, inArray(xsectsTable.status, ["active", "requested", "connected"]))).returning({ id: xsectsTable.id });
  const missed = await db.update(missedXsectsTable).set({ status: state }).where(and(missedMatch, inArray(missedXsectsTable.status, ["active", "requested", "connected"]))).returning({ id: missedXsectsTable.id });
  return { xsects: xsects.length, missed: missed.length };
}

export const engine: XsectEngine = {
  syncPairState,
  scorePair, upsertXsect, recordCrossing, recomputeIntentXsects, recomputeTimeXsects,
  listXsects, getXsect, protectedProfileView, isDiscoverable, expireStale,
};
