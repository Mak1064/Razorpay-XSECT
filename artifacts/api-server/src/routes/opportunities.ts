import {
  availabilityRulesTable, connectionTable, db, offerCategory, offersTable, opportunityStatus,
  organizationMembersTable, organizationOpportunitiesTable, organizationOpportunityType, organizationsTable,
  professionalProfileTable, reputationEventsTable, reviewsTable, wantCategory, wantsTable,
  intentLevel, workMode, opportunityVisibility, trustLevel,
} from "@workspace/db";
import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { track } from "../lib/analytics";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import { computeOpportunityFit } from "../services/opportunities/fit";
import { computeTrustProgress, type TrustStats } from "../services/trust";
import { engine } from "../services/xsect-engine";

const router: IRouter = Router();
router.use(requireAuth);
const actor = (req: Request) => (req as AuthenticatedRequest).userId;
const bad = (res: Response, message: string, status = 400): void => { res.status(status).json({ error: message }); };

const nullableText = (max = 160) => z.string().trim().max(max).nullable().optional();
const futureDate = z.union([z.string().datetime(), z.date()]).transform((value) => new Date(value)).refine((date) => date > new Date(), "expiresAt must be in the future").nullable().optional();
const baseIntent = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(1000).default(""),
  skills: z.array(z.string().trim().min(1).max(100)).max(15).default([]),
  industry: nullableText(),
  locationPreference: nullableText(),
  radiusKm: z.number().int().min(1).max(100).default(25),
  intent: z.enum(intentLevel.enumValues).default("active"),
  availability: z.string().trim().min(1).max(160).default("flexible"),
  workMode: z.enum(workMode.enumValues).default("flexible"),
  visibility: z.enum(opportunityVisibility.enumValues).default("discoverable"),
  trustRequirement: z.enum(trustLevel.enumValues).default("contact"),
  expiresAt: futureDate,
});
const wantInput = baseIntent.extend({ category: z.enum(wantCategory.enumValues) });
const offerInput = baseIntent.extend({ category: z.enum(offerCategory.enumValues) });
const statusInput = z.object({ status: z.enum(["active", "paused", "fulfilled"]) });

async function recompute(userId: string) {
  try { await engine.recomputeIntentXsects(userId); } catch (error) { console.error("Intent XSECT recompute failed", error); }
}
const triggerRecompute = (userId: string) => { void recompute(userId); };

function intentRoutes(kind: "wants" | "offers") {
  const table = kind === "wants" ? wantsTable : offersTable;
  const schema: z.ZodTypeAny = kind === "wants" ? wantInput : offerInput;
  const patchSchema: z.ZodTypeAny = kind === "wants"
    ? wantInput.partial().refine((value) => Object.keys(value).length > 0, "At least one field is required.")
    : offerInput.partial().refine((value) => Object.keys(value).length > 0, "At least one field is required.");
  router.get(`/${kind}`, async (req, res, next) => {
    try { res.json({ [kind]: await db.select().from(table).where(eq(table.userId, actor(req))).orderBy(desc(table.createdAt)) }); } catch (error) { next(error); }
  });
  router.post(`/${kind}`, async (req, res, next) => {
    try {
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return bad(res, parsed.error.issues[0]?.message ?? "Invalid opportunity.");
      const userId = actor(req);
      const active = await db.select({ id: table.id }).from(table).where(and(eq(table.userId, userId), eq(table.status, "active")));
      if (active.length >= 20) return bad(res, `You may have at most 20 active ${kind}.`, 409);
      const [row] = await db.insert(table).values({ ...parsed.data, userId } as never).returning();
      await track(kind === "wants" ? "want_created" : "offer_created", userId, { id: row.id, category: row.category });
      triggerRecompute(userId);
      res.status(201).json({ [kind.slice(0, -1)]: row });
    } catch (error) { next(error); }
  });
  router.patch(`/${kind}/:id`, async (req, res, next) => {
    try {
      const parsed = patchSchema.safeParse(req.body);
      if (!parsed.success) return bad(res, parsed.error.issues[0]?.message ?? "Invalid opportunity.");
      const userId = actor(req);
      const [row] = await db.update(table).set(parsed.data as never).where(and(eq(table.id, req.params.id), eq(table.userId, userId))).returning();
      if (!row) return bad(res, "Opportunity not found.", 404);
      triggerRecompute(userId);
      res.json({ [kind.slice(0, -1)]: row });
    } catch (error) { next(error); }
  });
  router.delete(`/${kind}/:id`, async (req, res, next) => {
    try {
      const [row] = await db.delete(table).where(and(eq(table.id, req.params.id), eq(table.userId, actor(req)))).returning({ id: table.id });
      if (!row) return bad(res, "Opportunity not found.", 404);
      triggerRecompute(actor(req));
      res.status(204).send();
    } catch (error) { next(error); }
  });
  router.post(`/${kind}/:id/status`, async (req, res, next) => {
    try {
      const parsed = statusInput.safeParse(req.body);
      if (!parsed.success) return bad(res, parsed.error.issues[0]?.message ?? "Invalid status.");
      const userId = actor(req);
      if (parsed.data.status === "active") {
        const active = await db.select({ id: table.id }).from(table).where(and(eq(table.userId, userId), eq(table.status, "active"), sql`${table.id} <> ${req.params.id}`));
        if (active.length >= 20) return bad(res, `You may have at most 20 active ${kind}.`, 409);
      }
      const [row] = await db.update(table).set({ status: parsed.data.status }).where(and(eq(table.id, req.params.id), eq(table.userId, userId))).returning();
      if (!row) return bad(res, "Opportunity not found.", 404);
      triggerRecompute(userId);
      res.json({ [kind.slice(0, -1)]: row });
    } catch (error) { next(error); }
  });
}
intentRoutes("wants");
intentRoutes("offers");

const organizationInput = z.object({
  name: z.string().trim().min(2).max(160), description: z.string().trim().max(2000).default(""),
  logoUrl: z.string().url().nullable().optional(), industry: nullableText(), size: nullableText(80),
  city: nullableText(), area: nullableText(), website: z.string().url().refine((url) => url.startsWith("https://"), "website must use HTTPS").nullable().optional(),
});
const organizationOpportunityInput = z.object({
  type: z.enum(organizationOpportunityType.enumValues), title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(1000).default(""), skills: z.array(z.string().trim().min(1).max(100)).max(15).default([]),
  industry: nullableText(), workMode: z.enum(workMode.enumValues).default("flexible"), city: nullableText(), area: nullableText(),
  intent: z.enum(intentLevel.enumValues).default("active"), status: z.enum(opportunityStatus.enumValues).default("active"), expiresAt: futureDate,
});
const slugify = (name: string) => name.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_-]+/g, "-").slice(0, 70) || "organization";
async function uniqueSlug(name: string) {
  const base = slugify(name);
  for (let suffix = 0; suffix < 1000; suffix++) {
    const slug = suffix ? `${base}-${suffix + 1}` : base;
    if (!(await db.select({ id: organizationsTable.id }).from(organizationsTable).where(eq(organizationsTable.slug, slug)).limit(1))[0]) return slug;
  }
  throw new Error("Unable to generate a unique organization slug.");
}
async function membership(organizationId: string, userId: string) {
  return (await db.select().from(organizationMembersTable).where(and(eq(organizationMembersTable.organizationId, organizationId), eq(organizationMembersTable.userId, userId))).limit(1))[0];
}
async function requireOrgAdmin(organizationId: string, userId: string) {
  const member = await membership(organizationId, userId);
  return member && (member.role === "owner" || member.role === "admin") ? member : null;
}

router.get("/organizations/mine", async (req, res, next) => {
  try {
    const rows = await db.select({ organization: organizationsTable, role: organizationMembersTable.role })
      .from(organizationMembersTable).innerJoin(organizationsTable, eq(organizationsTable.id, organizationMembersTable.organizationId))
      .where(eq(organizationMembersTable.userId, actor(req))).orderBy(asc(organizationsTable.name));
    res.json({ organizations: rows });
  } catch (error) { next(error); }
});
router.get("/organizations", async (req, res, next) => {
  try {
    const query = z.object({ q: z.string().trim().max(160).optional(), industry: z.string().trim().max(160).optional(), city: z.string().trim().max(160).optional(), page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(50).default(20) }).safeParse(req.query);
    if (!query.success) return bad(res, query.error.issues[0]?.message ?? "Invalid query.");
    const filters = [
      query.data.q ? or(ilike(organizationsTable.name, `%${query.data.q}%`), ilike(organizationsTable.description, `%${query.data.q}%`)) : undefined,
      query.data.industry ? ilike(organizationsTable.industry, query.data.industry) : undefined,
      query.data.city ? ilike(organizationsTable.city, query.data.city) : undefined,
    ].filter(Boolean);
    const where = filters.length ? and(...filters) : undefined;
    const [organizations, total] = await Promise.all([
      db.select().from(organizationsTable).where(where).orderBy(asc(organizationsTable.name)).limit(query.data.limit).offset((query.data.page - 1) * query.data.limit),
      db.select({ count: sql<number>`count(*)::int` }).from(organizationsTable).where(where),
    ]);
    res.json({ organizations, pagination: { page: query.data.page, limit: query.data.limit, total: total[0]?.count ?? 0 } });
  } catch (error) { next(error); }
});
router.post("/organizations", async (req, res, next) => {
  try {
    const parsed = organizationInput.safeParse(req.body);
    if (!parsed.success) return bad(res, parsed.error.issues[0]?.message ?? "Invalid organization.");
    const userId = actor(req);
    const organization = await db.transaction(async (tx) => {
      const [created] = await tx.insert(organizationsTable).values({ ...parsed.data, slug: await uniqueSlug(parsed.data.name), createdBy: userId }).returning();
      await tx.insert(organizationMembersTable).values({ organizationId: created.id, userId, role: "owner" });
      return created;
    });
    await track("organization_created", userId, { id: organization.id });
    res.status(201).json({ organization, role: "owner" });
  } catch (error) { next(error); }
});
router.get("/organizations/:id", async (req, res, next) => {
  try {
    const organization = (await db.select().from(organizationsTable).where(eq(organizationsTable.id, req.params.id)).limit(1))[0];
    if (!organization) return bad(res, "Organization not found.", 404);
    const userId = actor(req);
    const viewerMembership = await membership(organization.id, userId);
    const members = await db.select({ id: organizationMembersTable.id, userId: organizationMembersTable.userId, organizationRole: organizationMembersTable.role, displayName: professionalProfileTable.displayName, professionalRole: professionalProfileTable.role })
      .from(organizationMembersTable).leftJoin(professionalProfileTable, eq(professionalProfileTable.userId, organizationMembersTable.userId))
      .where(eq(organizationMembersTable.organizationId, organization.id));
    const connectedIds = viewerMembership ? [] : (await db.select().from(connectionTable).where(and(eq(connectionTable.status, "accepted"), or(eq(connectionTable.requesterId, userId), eq(connectionTable.recipientId, userId))))).map((connection) => connection.requesterId === userId ? connection.recipientId : connection.requesterId);
    const protectedMembers = members.map((member) => ({
      id: member.id, userId: member.userId, organizationRole: member.organizationRole,
      displayName: viewerMembership || member.userId === userId || connectedIds.includes(member.userId) ? member.displayName : null,
      role: member.professionalRole ?? "",
    }));
    const opportunities = await db.select().from(organizationOpportunitiesTable).where(and(eq(organizationOpportunitiesTable.organizationId, organization.id), eq(organizationOpportunitiesTable.status, "active"))).orderBy(desc(organizationOpportunitiesTable.createdAt));
    res.json({ organization, members: protectedMembers, opportunities, viewerRole: viewerMembership?.role ?? null });
  } catch (error) { next(error); }
});
router.patch("/organizations/:id", async (req, res, next) => {
  try {
    if (!(await requireOrgAdmin(req.params.id, actor(req)))) return bad(res, "Organization administrator access required.", 403);
    const parsed = organizationInput.partial().refine((value) => Object.keys(value).length > 0, "At least one field is required.").safeParse(req.body);
    if (!parsed.success) return bad(res, parsed.error.issues[0]?.message ?? "Invalid organization.");
    const [organization] = await db.update(organizationsTable).set(parsed.data).where(eq(organizationsTable.id, req.params.id)).returning();
    if (!organization) return bad(res, "Organization not found.", 404);
    res.json({ organization });
  } catch (error) { next(error); }
});
router.post("/organizations/:id/members", async (req, res, next) => {
  try {
    if (!(await requireOrgAdmin(req.params.id, actor(req)))) return bad(res, "Organization administrator access required.", 403);
    const parsed = z.object({ userId: z.string().trim().min(1).max(255), role: z.enum(["admin", "member"]).default("member") }).safeParse(req.body);
    if (!parsed.success) return bad(res, parsed.error.issues[0]?.message ?? "Invalid member.");
    const exists = (await db.select({ userId: professionalProfileTable.userId }).from(professionalProfileTable).where(eq(professionalProfileTable.userId, parsed.data.userId)).limit(1))[0];
    if (!exists) return bad(res, "A professional profile for that userId was not found.", 404);
    const [member] = await db.insert(organizationMembersTable).values({ organizationId: req.params.id, ...parsed.data }).onConflictDoNothing().returning();
    if (!member) return bad(res, "This user is already a member.", 409);
    res.status(201).json({ member });
  } catch (error) { next(error); }
});
router.delete("/organizations/:id/members/:memberId", async (req, res, next) => {
  try {
    if (!(await requireOrgAdmin(req.params.id, actor(req)))) return bad(res, "Organization administrator access required.", 403);
    const target = (await db.select().from(organizationMembersTable).where(and(eq(organizationMembersTable.id, req.params.memberId), eq(organizationMembersTable.organizationId, req.params.id))).limit(1))[0];
    if (!target) return bad(res, "Member not found.", 404);
    if (target.role === "owner") return bad(res, "The organization owner cannot be removed.", 409);
    await db.delete(organizationMembersTable).where(eq(organizationMembersTable.id, target.id));
    res.status(204).send();
  } catch (error) { next(error); }
});
router.post("/organizations/:id/opportunities", async (req, res, next) => {
  try {
    if (!(await requireOrgAdmin(req.params.id, actor(req)))) return bad(res, "Organization administrator access required.", 403);
    const parsed = organizationOpportunityInput.safeParse(req.body);
    if (!parsed.success) return bad(res, parsed.error.issues[0]?.message ?? "Invalid opportunity.");
    const [opportunity] = await db.insert(organizationOpportunitiesTable).values({ ...parsed.data, organizationId: req.params.id, createdBy: actor(req) }).returning();
    triggerRecompute(actor(req));
    res.status(201).json({ opportunity });
  } catch (error) { next(error); }
});
router.patch("/organizations/:id/opportunities/:opportunityId", async (req, res, next) => {
  try {
    if (!(await requireOrgAdmin(req.params.id, actor(req)))) return bad(res, "Organization administrator access required.", 403);
    const parsed = organizationOpportunityInput.partial().refine((value) => Object.keys(value).length > 0, "At least one field is required.").safeParse(req.body);
    if (!parsed.success) return bad(res, parsed.error.issues[0]?.message ?? "Invalid opportunity.");
    const [opportunity] = await db.update(organizationOpportunitiesTable).set(parsed.data).where(and(eq(organizationOpportunitiesTable.id, req.params.opportunityId), eq(organizationOpportunitiesTable.organizationId, req.params.id))).returning();
    if (!opportunity) return bad(res, "Opportunity not found.", 404);
    triggerRecompute(actor(req));
    res.json({ opportunity });
  } catch (error) { next(error); }
});
router.delete("/organizations/:id/opportunities/:opportunityId", async (req, res, next) => {
  try {
    if (!(await requireOrgAdmin(req.params.id, actor(req)))) return bad(res, "Organization administrator access required.", 403);
    const [opportunity] = await db.delete(organizationOpportunitiesTable).where(and(eq(organizationOpportunitiesTable.id, req.params.opportunityId), eq(organizationOpportunitiesTable.organizationId, req.params.id))).returning({ id: organizationOpportunitiesTable.id });
    if (!opportunity) return bad(res, "Opportunity not found.", 404);
    triggerRecompute(actor(req));
    res.status(204).send();
  } catch (error) { next(error); }
});
router.get("/organization-opportunities", async (req, res, next) => {
  try {
    const query = z.object({ type: z.enum(organizationOpportunityType.enumValues).optional(), industry: z.string().trim().max(160).optional(), city: z.string().trim().max(160).optional() }).safeParse(req.query);
    if (!query.success) return bad(res, query.error.issues[0]?.message ?? "Invalid query.");
    const filters = [eq(organizationOpportunitiesTable.status, "active"), sql`(${organizationOpportunitiesTable.expiresAt} is null or ${organizationOpportunitiesTable.expiresAt} > now())`,
      query.data.type ? eq(organizationOpportunitiesTable.type, query.data.type) : undefined,
      query.data.industry ? ilike(organizationOpportunitiesTable.industry, query.data.industry) : undefined,
      query.data.city ? ilike(organizationOpportunitiesTable.city, query.data.city) : undefined,
    ].filter(Boolean);
    const userId = actor(req);
    const [rows, profile, wants] = await Promise.all([
      db.select({ opportunity: organizationOpportunitiesTable, organization: organizationsTable }).from(organizationOpportunitiesTable).innerJoin(organizationsTable, eq(organizationsTable.id, organizationOpportunitiesTable.organizationId)).where(and(...filters)).orderBy(desc(organizationOpportunitiesTable.createdAt)).limit(100),
      db.select().from(professionalProfileTable).where(eq(professionalProfileTable.userId, userId)).limit(1),
      db.select().from(wantsTable).where(and(eq(wantsTable.userId, userId), eq(wantsTable.status, "active"))),
    ]);
    res.json({ opportunities: rows.map((row) => ({ ...row, fit: computeOpportunityFit(profile[0], wants, row.opportunity) })) });
  } catch (error) { next(error); }
});

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM.");
const availabilityRule = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("recurring"), weekday: z.number().int().min(0).max(6), date: z.null().optional(), startTime: time, endTime: time, timezone: z.string().trim().min(1).max(100).default("Asia/Kolkata") }),
  z.object({ mode: z.literal("one_off"), weekday: z.null().optional(), date: z.string().date(), startTime: time, endTime: time, timezone: z.string().trim().min(1).max(100).default("Asia/Kolkata") }),
]).refine((rule) => rule.startTime < rule.endTime, "startTime must be before endTime");
router.get("/availability", async (req, res, next) => {
  try { res.json({ rules: await db.select().from(availabilityRulesTable).where(eq(availabilityRulesTable.userId, actor(req))).orderBy(asc(availabilityRulesTable.weekday), asc(availabilityRulesTable.date), asc(availabilityRulesTable.startTime)) }); } catch (error) { next(error); }
});
router.put("/availability", async (req, res, next) => {
  try {
    const parsed = z.object({ rules: z.array(availabilityRule).max(21) }).safeParse(req.body);
    if (!parsed.success) return bad(res, parsed.error.issues[0]?.message ?? "Invalid availability.");
    const userId = actor(req);
    const rules = await db.transaction(async (tx) => {
      await tx.delete(availabilityRulesTable).where(eq(availabilityRulesTable.userId, userId));
      return parsed.data.rules.length ? tx.insert(availabilityRulesTable).values(parsed.data.rules.map((rule) => ({ ...rule, userId }))).returning() : [];
    });
    try { await engine.recomputeTimeXsects(userId); } catch (error) { console.error("Time XSECT recompute failed", error); }
    res.json({ rules });
  } catch (error) { next(error); }
});

async function trustData(userId: string) {
  const profile = (await db.select().from(professionalProfileTable).where(eq(professionalProfileTable.userId, userId)).limit(1))[0];
  if (!profile) return null;
  const [activeWants, activeOffers, connections, reviewStats, verifiedMembership] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(wantsTable).where(and(eq(wantsTable.userId, userId), eq(wantsTable.status, "active"))),
    db.select({ count: sql<number>`count(*)::int` }).from(offersTable).where(and(eq(offersTable.userId, userId), eq(offersTable.status, "active"))),
    db.select({ count: sql<number>`count(*)::int` }).from(connectionTable).where(and(eq(connectionTable.status, "accepted"), or(eq(connectionTable.requesterId, userId), eq(connectionTable.recipientId, userId)))),
    db.select({ count: sql<number>`count(*)::int`, average: sql<number>`coalesce(avg(${reviewsTable.rating}), 0)::float` }).from(reviewsTable).where(eq(reviewsTable.revieweeId, userId)),
    db.select({ id: organizationMembersTable.id }).from(organizationMembersTable).innerJoin(organizationsTable, eq(organizationsTable.id, organizationMembersTable.organizationId)).where(and(eq(organizationMembersTable.userId, userId), eq(organizationsTable.verificationState, "verified"))).limit(1),
  ]);
  const stats: TrustStats = {
    activeWantOrOfferCount: (activeWants[0]?.count ?? 0) + (activeOffers[0]?.count ?? 0),
    acceptedConnections: connections[0]?.count ?? 0,
    reviewsReceived: reviewStats[0]?.count ?? 0,
    averageReviewRating: reviewStats[0]?.average ?? 0,
    verifiedOrganizationMembership: Boolean(verifiedMembership[0]),
  };
  return { profile, stats, progress: computeTrustProgress(profile, stats) };
}
router.get("/trust/me", async (req, res, next) => {
  try {
    const data = await trustData(actor(req));
    if (!data) return bad(res, "Complete your professional profile first.", 404);
    res.json({ level: data.profile.trustLevel, computedLevel: data.progress.level, missing: data.progress.missing, stats: data.stats });
  } catch (error) { next(error); }
});
router.post("/trust/recompute", async (req, res, next) => {
  try {
    const userId = actor(req);
    const data = await trustData(userId);
    if (!data) return bad(res, "Complete your professional profile first.", 404);
    const changed = data.profile.trustLevel !== data.progress.level;
    if (changed) await db.transaction(async (tx) => {
      await tx.update(professionalProfileTable).set({ trustLevel: data.progress.level }).where(eq(professionalProfileTable.userId, userId));
      await tx.insert(reputationEventsTable).values({ userId, kind: "trust_progression", delta: 0, metadata: { from: data.profile.trustLevel, to: data.progress.level } });
    });
    res.json({ level: data.progress.level, changed, missing: data.progress.missing, stats: data.stats });
  } catch (error) { next(error); }
});

export default router;