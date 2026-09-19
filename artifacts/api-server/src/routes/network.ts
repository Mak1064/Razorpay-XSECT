import {
  alertTriggersTable,
  connectionTable,
  consentAuditTable,
  db,
  eventRsvpTable,
  introductionRequestsTable,
  notificationTable,
  offersTable,
  organizationOpportunitiesTable,
  professionalProfileTable,
  reputationEventsTable,
  reviewsTable,
  standingAlertsTable,
  wantsTable,
  xsectPathsTable,
  xsectsTable,
} from "@workspace/db";
import { and, desc, eq, gt, inArray, lt, or, sql } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { track } from "../lib/analytics";
import { AREAS } from "../lib/geo";
import { FREE_LIMITS, getEffectivePlan, requireEntitlement } from "../lib/entitlements";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import { findAndPersistPaths } from "../services/network/paths";
import { engine, pairKeyFor, type ProtectedProfileView, type XsectWithFactors } from "../services/xsect-engine";

const router: IRouter = Router();
router.use(requireAuth);
const actor = (req: Request) => (req as AuthenticatedRequest).userId;
const bad = (res: Response, message: string, status = 400): void => { res.status(status).json({ error: message }); };
const isPlaceholder = (error: unknown) => error instanceof Error && /PLACEHOLDER|not implemented/i.test(error.message);
const pair = (a: string, b: string) => [a, b].sort();

async function connectionFor(a: string, b: string) {
  return (await db.select().from(connectionTable).where(or(
    and(eq(connectionTable.requesterId, a), eq(connectionTable.recipientId, b)),
    and(eq(connectionTable.requesterId, b), eq(connectionTable.recipientId, a)),
  )).limit(1))[0];
}
async function accepted(a: string, b: string) {
  return (await connectionFor(a, b))?.status === "accepted";
}
async function notify(userId: string, type: string, title: string, body: string, resourceId: string) {
  await db.insert(notificationTable).values({ userId, type, title, body, resourceId });
}
async function protectedView(viewerId: string, counterpartId: string): Promise<ProtectedProfileView | null> {
  try { return await engine.protectedProfileView(viewerId, counterpartId); }
  catch (error) {
    if (!isPlaceholder(error)) throw error;
    const profile = (await db.select().from(professionalProfileTable).where(eq(professionalProfileTable.userId, counterpartId)).limit(1))[0];
    if (!profile || profile.visibility === "ghost") return null;
    const revealed = await accepted(viewerId, counterpartId);
    if (!revealed && profile.visibility === "trusted_only") return null;
    return {
      userId: profile.userId, revealed, displayName: revealed ? profile.displayName : null,
      photoUrl: revealed ? profile.photoUrl : null, role: profile.role, industry: profile.industry,
      company: revealed ? profile.company : null, city: profile.city, area: profile.area,
      trustLevel: profile.trustLevel, skills: profile.skills, intentSummary: profile.intent,
      lastActiveBand: profile.lastActiveAt > new Date(Date.now() - 86_400_000) ? "today" : "this_week",
      handle: [profile.role || "Protected professional", profile.area].filter(Boolean).join(" · "),
    };
  }
}

router.get("/paths", async (req, res, next) => {
  try {
    const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (query.length < 2 || query.length > 300) return bad(res, "Enter a Path query between 2 and 300 characters.");
    const userId = actor(req);
    const effective = await getEffectivePlan(userId);
    const maxHops = effective.entitlements.includes("paths_multi_step") ? 3 : effective.entitlements.includes("paths_two_step") ? 2 : 1;
    const limit = effective.plan === "free" ? FREE_LIMITS.pathResults : 20;
    const paths = await findAndPersistPaths(userId, query, maxHops, limit);
    res.json({ paths, plan: effective.plan, maxHops });
  } catch (error) { next(error); }
});
router.get("/paths/history", async (req, res, next) => {
  try {
    res.json({ paths: await db.select().from(xsectPathsTable).where(eq(xsectPathsTable.userId, actor(req))).orderBy(desc(xsectPathsTable.createdAt)).limit(100) });
  } catch (error) { next(error); }
});
router.get("/paths/:id", async (req, res, next) => {
  try {
    const path = (await db.select().from(xsectPathsTable).where(and(eq(xsectPathsTable.id, req.params.id), eq(xsectPathsTable.userId, actor(req)))).limit(1))[0];
    if (!path) return bad(res, "Path not found.", 404);
    res.json({ path });
  } catch (error) { next(error); }
});

const introductionSchema = z.object({
  intermediaryId: z.string().min(1),
  targetUserId: z.string().min(1),
  reason: z.string().trim().min(10).max(500),
  pathId: z.string().uuid().optional(),
  xsectId: z.string().uuid().optional(),
});
router.post("/introductions", async (req, res, next) => {
  try {
    const parsed = introductionSchema.safeParse(req.body);
    if (!parsed.success) return bad(res, parsed.error.issues[0]?.message ?? "Invalid introduction request.");
    const requesterId = actor(req);
    const { intermediaryId, targetUserId, reason, pathId, xsectId } = parsed.data;
    if (new Set([requesterId, intermediaryId, targetUserId]).size !== 3) return bad(res, "Bridge participants must be different people.");
    if (!(await accepted(requesterId, intermediaryId))) return bad(res, "The intermediary must be your accepted connection.", 403);
    if (!(await accepted(intermediaryId, targetUserId))) return bad(res, "The target must be the intermediary's accepted connection.", 403);
    if (pathId) {
      const path = (await db.select().from(xsectPathsTable).where(and(eq(xsectPathsTable.id, pathId), eq(xsectPathsTable.userId, requesterId))).limit(1))[0];
      if (!path || path.targetUserId !== targetUserId) return bad(res, "The selected Path does not authorize this request.", 403);
    }
    if (xsectId) {
      const xsect = (await db.select().from(xsectsTable).where(and(eq(xsectsTable.id, xsectId), eq(xsectsTable.userId, requesterId))).limit(1))[0];
      if (!xsect || xsect.counterpartUserId !== targetUserId) return bad(res, "The selected XSECT does not authorize this request.", 403);
    }
    const [introduction] = await db.insert(introductionRequestsTable).values({
      requesterId, intermediaryId, targetUserId, reason, pathId, xsectId,
      expiresAt: new Date(Date.now() + 14 * 86_400_000),
    }).returning();
    await notify(intermediaryId, "introduction_request", "Bridge introduction requested", "A connection asked you to make a professional introduction.", introduction.id);
    await track("introduction_requested", requesterId, { introductionId: introduction.id, pathId, xsectId });
    res.status(201).json({ introduction });
  } catch (error) { next(error); }
});
router.get("/introductions", async (req, res, next) => {
  try {
    const userId = actor(req);
    const [inbox, sent, received] = await Promise.all([
      db.select().from(introductionRequestsTable).where(and(eq(introductionRequestsTable.intermediaryId, userId), eq(introductionRequestsTable.status, "pending"))).orderBy(desc(introductionRequestsTable.createdAt)),
      db.select().from(introductionRequestsTable).where(eq(introductionRequestsTable.requesterId, userId)).orderBy(desc(introductionRequestsTable.createdAt)),
      db.select().from(introductionRequestsTable).where(eq(introductionRequestsTable.targetUserId, userId)).orderBy(desc(introductionRequestsTable.createdAt)),
    ]);
    res.json({ inbox, sent, received });
  } catch (error) { next(error); }
});
router.post("/introductions/:id/accept", async (req, res, next) => {
  try {
    const userId = actor(req);
    const row = (await db.select().from(introductionRequestsTable).where(eq(introductionRequestsTable.id, req.params.id)).limit(1))[0];
    if (!row) return bad(res, "Introduction not found.", 404);
    if (row.intermediaryId !== userId) return bad(res, "Only the intermediary may accept.", 403);
    if (row.status !== "pending" || (row.expiresAt && row.expiresAt < new Date())) return bad(res, "This introduction is no longer pending.", 409);
    const [introduction] = await db.update(introductionRequestsTable).set({ status: "accepted", decidedAt: new Date() }).where(eq(introductionRequestsTable.id, row.id)).returning();
    await Promise.all([
      notify(row.targetUserId, "introduction_accepted", "Bridge introduction available", "A trusted connection accepted a professional introduction.", row.id),
      notify(row.requesterId, "introduction_accepted", "Bridge introduction accepted", "Your intermediary accepted the introduction.", row.id),
      db.insert(reputationEventsTable).values({ userId, kind: "introduction_given", delta: 5, metadata: { introductionId: row.id } }),
      track("introduction_accepted", userId, { introductionId: row.id }),
    ]);
    res.json({ introduction });
  } catch (error) { next(error); }
});
router.post("/introductions/:id/decline", async (req, res, next) => {
  try {
    const userId = actor(req);
    const row = (await db.select().from(introductionRequestsTable).where(eq(introductionRequestsTable.id, req.params.id)).limit(1))[0];
    if (!row) return bad(res, "Introduction not found.", 404);
    if (row.intermediaryId !== userId) return bad(res, "Only the intermediary may decline.", 403);
    if (row.status !== "pending") return bad(res, "This introduction is no longer pending.", 409);
    const [introduction] = await db.update(introductionRequestsTable).set({ status: "declined", decidedAt: new Date(), intermediaryNote: null }).where(eq(introductionRequestsTable.id, row.id)).returning();
    await notify(row.requesterId, "introduction_declined", "Bridge request declined", "Your intermediary could not make this introduction.", row.id);
    res.json({ introduction });
  } catch (error) { next(error); }
});
router.post("/introductions/:id/complete", async (req, res, next) => {
  try {
    const userId = actor(req);
    const row = (await db.select().from(introductionRequestsTable).where(eq(introductionRequestsTable.id, req.params.id)).limit(1))[0];
    if (!row) return bad(res, "Introduction not found.", 404);
    if (row.targetUserId !== userId) return bad(res, "Only the target may complete this introduction.", 403);
    if (row.status !== "accepted") return bad(res, "The intermediary must accept first.", 409);
    const existing = await connectionFor(row.requesterId, row.targetUserId);
    const [a, b] = pair(row.requesterId, row.targetUserId);
    const [connection] = existing
      ? await db.update(connectionTable).set({ status: "accepted", blockedBy: null }).where(eq(connectionTable.id, existing.id)).returning()
      : await db.insert(connectionTable).values({ requesterId: a, recipientId: b, status: "accepted" }).returning();
    await engine.syncPairState(row.requesterId, row.targetUserId, "connected");
    await db.insert(consentAuditTable).values({ connectionId: connection.id, actorId: userId, action: "bridge_intro", contextId: row.id, fields: ["name", "role", "intent"] });
    const [introduction] = await db.update(introductionRequestsTable).set({ status: "completed", resultingConnectionId: connection.id, decidedAt: new Date() }).where(eq(introductionRequestsTable.id, row.id)).returning();
    await Promise.all([
      db.insert(reputationEventsTable).values({ userId, kind: "introduction_received", delta: 5, metadata: { introductionId: row.id } }),
      notify(row.requesterId, "introduction_completed", "Bridge introduction completed", "The target accepted your introduction and is now a connection.", row.id),
    ]);
    res.json({ introduction, connection });
  } catch (error) { next(error); }
});

const alertCriteria = z.object({
  keywords: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  skills: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  industries: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  wantCategories: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  offerCategories: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  minScore: z.number().int().min(0).max(100).default(60),
});
const alertCreate = z.object({
  title: z.string().trim().min(2).max(120), criteria: alertCriteria,
  radiusKm: z.number().int().min(1).max(500).default(25),
  trustRequirement: z.enum(["contact", "professional", "enhanced"]).default("contact"),
  frequency: z.enum(["instant", "daily", "weekly"]).default("instant"),
  expiresAt: z.coerce.date().optional(),
});
router.get("/alerts", async (req, res, next) => {
  try { res.json({ alerts: await db.select().from(standingAlertsTable).where(eq(standingAlertsTable.userId, actor(req))).orderBy(desc(standingAlertsTable.createdAt)) }); }
  catch (error) { next(error); }
});
router.post("/alerts", requireEntitlement("standing_alerts"), async (req, res, next) => {
  try {
    const parsed = alertCreate.safeParse(req.body);
    if (!parsed.success) return bad(res, parsed.error.issues[0]?.message ?? "Invalid Standing XSECT.");
    const userId = actor(req);
    const expiry = parsed.data.expiresAt;
    if (expiry && (expiry <= new Date() || expiry > new Date(Date.now() + 90 * 86_400_000))) return bad(res, "Expiration must be within the next 90 days.");
    const active = await db.select({ id: standingAlertsTable.id }).from(standingAlertsTable).where(and(eq(standingAlertsTable.userId, userId), eq(standingAlertsTable.status, "active")));
    if (active.length >= 10) return bad(res, "You may have at most 10 active Standing XSECTs.", 409);
    const [alert] = await db.insert(standingAlertsTable).values({ userId, ...parsed.data }).returning();
    await track("standing_alert_created", userId, { alertId: alert.id });
    res.status(201).json({ alert });
  } catch (error) { next(error); }
});
router.patch("/alerts/:id", async (req, res, next) => {
  try {
    const parsed = alertCreate.partial().safeParse(req.body);
    if (!parsed.success) return bad(res, parsed.error.issues[0]?.message ?? "Invalid update.");
    if (parsed.data.expiresAt && (parsed.data.expiresAt <= new Date() || parsed.data.expiresAt > new Date(Date.now() + 90 * 86_400_000))) return bad(res, "Expiration must be within the next 90 days.");
    const [alert] = await db.update(standingAlertsTable).set(parsed.data).where(and(eq(standingAlertsTable.id, req.params.id), eq(standingAlertsTable.userId, actor(req)))).returning();
    if (!alert) return bad(res, "Standing XSECT not found.", 404);
    res.json({ alert });
  } catch (error) { next(error); }
});
router.delete("/alerts/:id", async (req, res, next) => {
  try {
    const [alert] = await db.delete(standingAlertsTable).where(and(eq(standingAlertsTable.id, req.params.id), eq(standingAlertsTable.userId, actor(req)))).returning();
    if (!alert) return bad(res, "Standing XSECT not found.", 404);
    res.status(204).send();
  } catch (error) { next(error); }
});
router.post("/alerts/:id/pause", (req, res, next) => updateAlertStatus(req, res, next, "paused"));
router.post("/alerts/:id/resume", (req, res, next) => updateAlertStatus(req, res, next, "active"));
async function updateAlertStatus(req: Request, res: Response, next: (error?: unknown) => void, status: "active" | "paused") {
  try {
    const alertId = String(req.params.id);
    if (status === "active") {
      const active = await db.select({ id: standingAlertsTable.id }).from(standingAlertsTable).where(and(eq(standingAlertsTable.userId, actor(req)), eq(standingAlertsTable.status, "active")));
      if (active.length >= 10) return bad(res, "You may have at most 10 active Standing XSECTs.", 409);
    }
    const [alert] = await db.update(standingAlertsTable).set({ status }).where(and(eq(standingAlertsTable.id, alertId), eq(standingAlertsTable.userId, actor(req)))).returning();
    if (!alert) return bad(res, "Standing XSECT not found.", 404);
    res.json({ alert });
  } catch (error) { next(error); }
}
router.get("/alerts/:id/triggers", async (req, res, next) => {
  try {
    const userId = actor(req);
    const alert = (await db.select().from(standingAlertsTable).where(and(eq(standingAlertsTable.id, req.params.id), eq(standingAlertsTable.userId, userId))).limit(1))[0];
    if (!alert) return bad(res, "Standing XSECT not found.", 404);
    const triggers = await db.select().from(alertTriggersTable).where(eq(alertTriggersTable.alertId, alert.id)).orderBy(desc(alertTriggersTable.createdAt));
    const xsectIds = triggers.flatMap((trigger) => trigger.xsectId ? [trigger.xsectId] : []);
    const xsects = xsectIds.length ? await db.select().from(xsectsTable).where(inArray(xsectsTable.id, xsectIds)) : [];
    const results = (await Promise.all(triggers.map(async (trigger) => {
      const xsect = xsects.find((item) => item.id === trigger.xsectId);
      if (!xsect?.counterpartUserId) return null;
      const counterpart = await protectedView(userId, xsect.counterpartUserId);
      return counterpart ? { ...trigger, score: xsect.score, explanation: xsect.explanation, counterpart } : null;
    }))).filter(Boolean);
    res.json({ triggers: results });
  } catch (error) { next(error); }
});
router.post("/alerts/:id/run-now", requireEntitlement("standing_alerts"), async (req, res, next) => {
  try {
    const userId = actor(req);
    const alertId = String(req.params.id);
    const alert = (await db.select().from(standingAlertsTable).where(and(eq(standingAlertsTable.id, alertId), eq(standingAlertsTable.userId, userId))).limit(1))[0];
    if (!alert) return bad(res, "Standing XSECT not found.", 404);
    if (alert.status !== "active" || (alert.expiresAt && alert.expiresAt < new Date())) return bad(res, "This Standing XSECT is not active.", 409);
    let xsects: XsectWithFactors[];
    try { xsects = await engine.listXsects(userId, { status: "active", minScore: alert.criteria.minScore, limit: 200 }); }
    catch (error) {
      if (!isPlaceholder(error)) throw error;
      const rows = await db.select().from(xsectsTable).where(and(eq(xsectsTable.userId, userId), eq(xsectsTable.status, "active"), sql`${xsectsTable.score} >= ${alert.criteria.minScore}`));
      xsects = rows.map((row) => ({ ...row, factors: [], counterpart: null }));
    }
    const candidates = xsects.filter((xsect) => xsect.counterpartUserId);
    const candidateIds = candidates.map((xsect) => xsect.counterpartUserId!);
    const [candidateWants, candidateOffers] = await Promise.all([
      candidateIds.length && alert.criteria.wantCategories.length
        ? db.select().from(wantsTable).where(and(inArray(wantsTable.userId, candidateIds), eq(wantsTable.status, "active")))
        : Promise.resolve([] as Array<typeof wantsTable.$inferSelect>),
      candidateIds.length && alert.criteria.offerCategories.length
        ? db.select().from(offersTable).where(and(inArray(offersTable.userId, candidateIds), eq(offersTable.status, "active")))
        : Promise.resolve([] as Array<typeof offersTable.$inferSelect>),
    ]);
    const trustRank = { contact: 0, professional: 1, enhanced: 2 } as const;
    const radiusUpperKm = { lt_250m: 0.25, "250m_500m": 0.5, "500m_1km": 1, "1km_2km": 2, "2km_5km": 5, "5km_plus": Infinity } as const;
    let inserted = 0;
    for (const xsect of candidates) {
      const counterpart = await protectedView(userId, xsect.counterpartUserId!);
      if (!counterpart) continue;
      if (trustRank[counterpart.trustLevel] < trustRank[alert.trustRequirement as keyof typeof trustRank]) continue;
      if (xsect.distanceBand && radiusUpperKm[xsect.distanceBand] > alert.radiusKm) continue;
      const terms = `${counterpart.role} ${counterpart.industry ?? ""} ${counterpart.skills.join(" ")} ${counterpart.intentSummary}`.toLowerCase();
      if (alert.criteria.keywords.length && !alert.criteria.keywords.some((item) => terms.includes(item.toLowerCase()))) continue;
      if (alert.criteria.skills.length && !alert.criteria.skills.some((item) => counterpart.skills.some((skill) => skill.toLowerCase().includes(item.toLowerCase())))) continue;
      if (alert.criteria.industries.length && !alert.criteria.industries.some((item) => counterpart.industry?.toLowerCase().includes(item.toLowerCase()))) continue;
      if (alert.criteria.wantCategories.length && !candidateWants.some((want) => want.userId === xsect.counterpartUserId && alert.criteria.wantCategories.includes(want.category))) continue;
      if (alert.criteria.offerCategories.length && !candidateOffers.some((offer) => offer.userId === xsect.counterpartUserId && alert.criteria.offerCategories.includes(offer.category))) continue;
      const [trigger] = await db.insert(alertTriggersTable).values({ alertId: alert.id, xsectId: xsect.id, userId }).onConflictDoNothing().returning();
      if (trigger) {
        inserted++;
        await notify(userId, "standing_alert", "Standing XSECT triggered", `${alert.title} detected a protected professional with XSECT Score ${xsect.score}.`, trigger.id);
      }
    }
    if (inserted) await db.update(standingAlertsTable).set({ lastTriggeredAt: new Date(), triggerCount: sql`${standingAlertsTable.triggerCount} + ${inserted}` }).where(eq(standingAlertsTable.id, alert.id));
    res.json({ evaluated: candidates.length, triggered: inserted });
  } catch (error) { next(error); }
});

const reviewSchema = z.object({
  connectionId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  professionalism: z.number().int().min(1).max(5),
  reliability: z.number().int().min(1).max(5),
  helpfulness: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).default(""),
});
async function reputationAggregate(userId: string) {
  const received = await db.select().from(reviewsTable).where(eq(reviewsTable.revieweeId, userId));
  const average = received.length ? received.reduce((sum, review) => sum + review.rating, 0) / received.length : 0;
  return { score: Math.round(average * 20), completedConnections: received.length, endorsements: received.filter((review) => review.rating >= 4).length, count: received.length, average };
}
router.post("/reviews", async (req, res, next) => {
  try {
    const parsed = reviewSchema.safeParse(req.body);
    if (!parsed.success) return bad(res, parsed.error.issues[0]?.message ?? "Invalid review.");
    const reviewerId = actor(req);
    const connection = (await db.select().from(connectionTable).where(eq(connectionTable.id, parsed.data.connectionId)).limit(1))[0];
    if (!connection || connection.status !== "accepted" || (connection.requesterId !== reviewerId && connection.recipientId !== reviewerId)) return bad(res, "An accepted connection is required.", 403);
    const revieweeId = connection.requesterId === reviewerId ? connection.recipientId : connection.requesterId;
    const existing = (await db.select({ id: reviewsTable.id }).from(reviewsTable).where(and(eq(reviewsTable.connectionId, connection.id), eq(reviewsTable.reviewerId, reviewerId))).limit(1))[0];
    if (existing) return bad(res, "You have already reviewed this connection.", 409);
    const [review] = await db.insert(reviewsTable).values({ ...parsed.data, reviewerId, revieweeId }).returning();
    await db.insert(reputationEventsTable).values({ userId: revieweeId, kind: "review_received", delta: parsed.data.rating - 3, metadata: { reviewId: review.id, connectionId: connection.id } });
    const aggregate = await reputationAggregate(revieweeId);
    await db.update(professionalProfileTable).set({ trustReputation: { score: aggregate.score, completedConnections: aggregate.completedConnections, endorsements: aggregate.endorsements } }).where(eq(professionalProfileTable.userId, revieweeId));
    await track("review_submitted", reviewerId, { reviewId: review.id, connectionId: connection.id });
    res.status(201).json({ review });
  } catch (error) { next(error); }
});
router.get("/reviews/me", async (req, res, next) => {
  try {
    const userId = actor(req);
    res.json({ received: await db.select().from(reviewsTable).where(eq(reviewsTable.revieweeId, userId)).orderBy(desc(reviewsTable.createdAt)), aggregate: await reputationAggregate(userId) });
  } catch (error) { next(error); }
});
router.get("/reviews/for/:userId", async (req, res, next) => {
  try {
    const rows = await db.select().from(reviewsTable).where(eq(reviewsTable.revieweeId, req.params.userId)).orderBy(desc(reviewsTable.createdAt));
    const mayReadComments = await accepted(actor(req), req.params.userId);
    res.json({ aggregate: await reputationAggregate(req.params.userId), count: rows.length, reviews: mayReadComments ? rows : [] });
  } catch (error) { next(error); }
});
router.post("/reviews/:id/report", async (req, res, next) => {
  try {
    const reason = z.string().trim().min(3).max(500).safeParse(req.body?.reason);
    if (!reason.success) return bad(res, "A report reason between 3 and 500 characters is required.");
    const userId = actor(req);
    const review = (await db.select().from(reviewsTable).where(eq(reviewsTable.id, req.params.id)).limit(1))[0];
    if (!review) return bad(res, "Review not found.", 404);
    if (review.revieweeId !== userId && review.reviewerId !== userId) return bad(res, "You cannot report this review.", 403);
    const [updated] = await db.update(reviewsTable).set({ reportedAt: new Date(), reportReason: reason.data }).where(eq(reviewsTable.id, review.id)).returning();
    res.json({ review: { id: updated.id, reportedAt: updated.reportedAt } });
  } catch (error) { next(error); }
});
router.get("/reputation/me", async (req, res, next) => {
  try {
    const events = await db.select().from(reputationEventsTable).where(eq(reputationEventsTable.userId, actor(req))).orderBy(desc(reputationEventsTable.createdAt));
    res.json({ events, total: events.reduce((sum, event) => sum + event.delta, 0), byKind: events.reduce<Record<string, number>>((result, event) => ({ ...result, [event.kind]: (result[event.kind] ?? 0) + event.delta }), {}) });
  } catch (error) { next(error); }
});

router.get("/map/clusters", requireEntitlement("opportunity_map"), async (req, res, next) => {
  try {
    const userId = actor(req);
    const city = typeof req.query.city === "string" ? req.query.city.trim().toLowerCase() : "";
    const areas = AREAS.filter((area) => !city || area.city.toLowerCase() === city);
    const [wants, offers, orgOpportunities, profiles, hotXsects] = await Promise.all([
      db.select().from(wantsTable).where(eq(wantsTable.status, "active")),
      db.select().from(offersTable).where(eq(offersTable.status, "active")),
      db.select().from(organizationOpportunitiesTable).where(eq(organizationOpportunitiesTable.status, "active")),
      db.select().from(professionalProfileTable),
      db.select().from(xsectsTable).where(and(eq(xsectsTable.userId, userId), eq(xsectsTable.status, "active"), eq(xsectsTable.isHot, true))),
    ]);
    const hotIds = hotXsects.flatMap((xsect) => xsect.counterpartUserId ? [xsect.counterpartUserId] : []);
    const hotProfiles = hotIds.length ? await db.select().from(professionalProfileTable).where(inArray(professionalProfileTable.userId, hotIds)) : [];
    const clusters = areas.map((area) => {
      const same = (valueCity: string | null, valueArea: string | null) => valueCity?.toLowerCase() === area.city.toLowerCase() && valueArea?.toLowerCase() === area.area.toLowerCase();
      const allAreaProfiles = profiles.filter((profile) => same(profile.city, profile.area));
      const areaProfiles = allAreaProfiles.filter((profile) => profile.lastActiveAt > new Date(Date.now() - 7 * 86_400_000));
      const userIds = new Set(allAreaProfiles.map((profile) => profile.userId));
      const demand = counts(wants.filter((want) => userIds.has(want.userId)).map((want) => want.category));
      const supply = counts(offers.filter((offer) => userIds.has(offer.userId)).map((offer) => offer.category));
      const organizationOpportunities = counts(orgOpportunities.filter((opportunity) => same(opportunity.city, opportunity.area)).map((opportunity) => opportunity.type));
      const categories = new Set([...Object.keys(demand), ...Object.keys(supply)]);
      const gaps = [...categories].map((category) => ({ category, demand: demand[category] ?? 0, supply: supply[category] ?? 0, gap: (demand[category] ?? 0) - (supply[category] ?? 0) })).sort((a, b) => b.gap - a.gap).slice(0, 3);
      return {
        city: area.city, area: area.area, centroid: { lat: area.lat, lng: area.lng },
        wantsByCategory: demand, offersByCategory: supply, organizationOpportunitiesByType: organizationOpportunities,
        activeUsers: areaProfiles.length, hotXsects: hotProfiles.filter((profile) => same(profile.city, profile.area)).length, gaps,
      };
    });
    res.json({ clusters });
  } catch (error) { next(error); }
});

router.get("/events/:id/who-to-meet", async (req, res, next) => {
  try {
    const userId = actor(req);
    const attendees = await db.select().from(eventRsvpTable).where(and(eq(eventRsvpTable.eventId, req.params.id), inArray(eventRsvpTable.status, ["confirmed", "waitlisted"])));
    const candidateIds: string[] = [];
    for (const attendee of attendees) {
      if (attendee.userId === userId) continue;
      try { if (await engine.isDiscoverable(userId, attendee.userId)) candidateIds.push(attendee.userId); }
      catch (error) {
        if (!isPlaceholder(error)) throw error;
        if (await protectedView(userId, attendee.userId)) candidateIds.push(attendee.userId);
      }
    }
    const effective = await getEffectivePlan(userId);
    if (!effective.entitlements.includes("event_mode")) {
      res.status(402).json({ error: "Event XSECT mode requires XSECT Pro+.", entitlement: "event_mode", currentPlan: effective.plan, requiredPlan: "pro_plus", potentialXsects: candidateIds.length });
      return;
    }
    const results = [];
    for (const counterpartId of candidateIds) {
      const score = await engine.scorePair(userId, counterpartId, { type: "event", sharedEventId: req.params.id });
      const xsect = await engine.upsertXsect(userId, counterpartId, { type: "event", sharedEventId: req.params.id, eventId: req.params.id, pairKey: pairKeyFor("event", userId, counterpartId, req.params.id) }, score);
      const counterpart = await protectedView(userId, counterpartId);
      if (counterpart) results.push({ xsectId: xsect.id, score: score.score, explanation: score.explanation, counterpart });
    }
    results.sort((a, b) => b.score - a.score);
    res.json({ xsects: results, count: results.length });
  } catch (error) { next(error); }
});

function counts(values: string[]) {
  return values.reduce<Record<string, number>>((result, value) => ({ ...result, [value]: (result[value] ?? 0) + 1 }), {});
}

export default router;