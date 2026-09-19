import {
  alertTriggersTable,
  availabilityRulesTable,
  db,
  eventRsvpTable,
  eventTable,
  missedXsectsTable,
  offersTable,
  organizationMembersTable,
  organizationOpportunitiesTable,
  organizationsTable,
  professionalProfileTable,
  reputationEventsTable,
  standingAlertsTable,
  wantsTable,
  xsectPathsTable,
} from "@workspace/db";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { engine } from "../xsect-engine";

export type ContextKind = "xsect" | "path" | "event" | "missed" | "opportunity" | "alert";

export type UserContext = {
  profile: Record<string, unknown> | null;
  wants: unknown[];
  offers: unknown[];
  availability: unknown[];
  xsects: unknown[];
  missed: unknown[];
  paths: unknown[];
  events: unknown[];
  opportunities: unknown[];
  alerts: unknown[];
  organizations: unknown[];
  reputation: { score: number; completedConnections: number; endorsements: number; events: Record<string, number> } | null;
  entityIds: Record<ContextKind, string[]>;
};

const compactOpportunity = (row: typeof wantsTable.$inferSelect | typeof offersTable.$inferSelect) => ({
  id: row.id,
  title: row.title,
  description: row.description,
  category: row.category,
  skills: row.skills,
  industry: row.industry,
  locationPreference: row.locationPreference,
  intent: row.intent,
  availability: row.availability,
  workMode: row.workMode,
  trustRequirement: row.trustRequirement,
});

/** Build the complete, privacy-safe grounding bundle for XSECT Intelligence. */
export async function buildUserContext(userId: string): Promise<UserContext> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const [
    profile,
    wants,
    offers,
    availability,
    xsects,
    missed,
    paths,
    eventRows,
    rsvps,
    alerts,
    memberships,
    reputationRows,
    organizationOpportunities,
  ] = await Promise.all([
    db.select().from(professionalProfileTable).where(eq(professionalProfileTable.userId, userId)).limit(1).then((r) => r[0] ?? null),
    db.select().from(wantsTable).where(and(eq(wantsTable.userId, userId), eq(wantsTable.status, "active"))),
    db.select().from(offersTable).where(and(eq(offersTable.userId, userId), eq(offersTable.status, "active"))),
    db.select().from(availabilityRulesTable).where(eq(availabilityRulesTable.userId, userId)),
    engine.listXsects(userId, { status: "active", limit: 100 }),
    db.select().from(missedXsectsTable).where(and(eq(missedXsectsTable.userId, userId), gte(missedXsectsTable.occurredAt, thirtyDaysAgo))).orderBy(desc(missedXsectsTable.occurredAt)).limit(100),
    db.select().from(xsectPathsTable).where(eq(xsectPathsTable.userId, userId)).orderBy(desc(xsectPathsTable.createdAt)).limit(50),
    db.select().from(eventTable).where(and(gte(eventTable.startsAt, now), sql`${eventTable.cancelledAt} is null`)).orderBy(eventTable.startsAt).limit(50),
    db.select().from(eventRsvpTable).where(eq(eventRsvpTable.userId, userId)),
    db.select().from(standingAlertsTable).where(eq(standingAlertsTable.userId, userId)).orderBy(desc(standingAlertsTable.createdAt)),
    db.select({ membership: organizationMembersTable, organization: organizationsTable })
      .from(organizationMembersTable)
      .innerJoin(organizationsTable, eq(organizationMembersTable.organizationId, organizationsTable.id))
      .where(eq(organizationMembersTable.userId, userId)),
    db.select({ kind: reputationEventsTable.kind, count: sql<number>`count(*)::int` })
      .from(reputationEventsTable).where(eq(reputationEventsTable.userId, userId)).groupBy(reputationEventsTable.kind),
    db.select({ opportunity: organizationOpportunitiesTable, organization: organizationsTable })
      .from(organizationOpportunitiesTable)
      .innerJoin(organizationsTable, eq(organizationOpportunitiesTable.organizationId, organizationsTable.id))
      .where(and(eq(organizationOpportunitiesTable.status, "active"), sql`${organizationOpportunitiesTable.expiresAt} is null or ${organizationOpportunitiesTable.expiresAt} >= ${now}`))
      .orderBy(desc(organizationOpportunitiesTable.createdAt)).limit(100),
  ]);

  const triggers = alerts.length
    ? await db.select().from(alertTriggersTable).where(inArray(alertTriggersTable.alertId, alerts.map((a) => a.id))).orderBy(desc(alertTriggersTable.createdAt)).limit(100)
    : [];
  const eventRsvp = new Map(rsvps.map((r) => [r.eventId, r]));

  const safeProfile = profile ? {
    role: profile.role,
    intent: profile.intent,
    company: profile.company,
    industry: profile.industry,
    experience: profile.experience,
    skills: profile.skills,
    wants: profile.wants,
    offers: profile.offers,
    availability: profile.availability,
    urgency: profile.urgency,
    city: profile.city,
    area: profile.area,
    trustLevel: profile.trustLevel,
  } : null;

  return {
    profile: safeProfile,
    wants: wants.map(compactOpportunity),
    offers: offers.map(compactOpportunity),
    availability: availability.map(({ id, mode, weekday, date, startTime, endTime, timezone }) => ({ id, mode, weekday, date, startTime, endTime, timezone })),
    xsects: xsects.map((x) => ({
      id: `x:${x.id}`,
      type: x.type,
      score: x.score,
      explanation: x.explanation,
      factors: x.factors.map(({ factor, score, detail }) => ({ factor, score, detail })),
      distanceBand: x.distanceBand,
      counterpart: x.counterpart && {
        revealed: x.counterpart.revealed,
        displayName: x.counterpart.displayName,
        role: x.counterpart.role,
        industry: x.counterpart.industry,
        company: x.counterpart.company,
        city: x.counterpart.city,
        area: x.counterpart.area,
        trustLevel: x.counterpart.trustLevel,
        skills: x.counterpart.skills,
        intentSummary: x.counterpart.intentSummary,
        handle: x.counterpart.handle,
      },
    })),
    missed: missed.map((m) => ({ id: `m:${m.id}`, xsectId: m.xsectId ? `x:${m.xsectId}` : null, score: m.score, distanceBand: m.distanceBand, status: m.status, occurredAt: m.occurredAt })),
    paths: paths.map((p) => ({ id: `p:${p.id}`, query: p.query, steps: p.steps, stepCount: p.stepCount, strength: p.strength, relevance: p.relevance, trust: p.trust, explanation: p.explanation })),
    events: eventRows.map((e) => ({ id: `e:${e.id}`, title: e.title, description: e.description, startsAt: e.startsAt, intentTags: e.intentTags, rsvp: eventRsvp.get(e.id)?.status ?? null })),
    opportunities: organizationOpportunities.map(({ opportunity, organization }) => ({
      id: `o:${opportunity.id}`,
      title: opportunity.title,
      description: opportunity.description,
      type: opportunity.type,
      skills: opportunity.skills,
      industry: opportunity.industry,
      workMode: opportunity.workMode,
      city: opportunity.city,
      area: opportunity.area,
      intent: opportunity.intent,
      organization: { id: organization.id, name: organization.name, industry: organization.industry },
    })),
    alerts: alerts.map((a) => ({ id: `a:${a.id}`, title: a.title, criteria: a.criteria, radiusKm: a.radiusKm, trustRequirement: a.trustRequirement, status: a.status, triggers: triggers.filter((t) => t.alertId === a.id).map((t) => ({ xsectId: t.xsectId ? `x:${t.xsectId}` : null, createdAt: t.createdAt })) })),
    organizations: memberships.map(({ membership, organization }) => ({ id: organization.id, role: membership.role, name: organization.name, industry: organization.industry, city: organization.city, area: organization.area })),
    reputation: profile ? {
      ...profile.trustReputation,
      events: Object.fromEntries(reputationRows.map((r) => [r.kind, r.count])),
    } : null,
    entityIds: {
      xsect: xsects.map((x) => `x:${x.id}`),
      path: paths.map((p) => `p:${p.id}`),
      event: eventRows.map((e) => `e:${e.id}`),
      missed: missed.map((m) => `m:${m.id}`),
      opportunity: organizationOpportunities.map(({ opportunity }) => `o:${opportunity.id}`),
      alert: alerts.map((a) => `a:${a.id}`),
    },
  };
}