import {
  aiAgentFindingsTable, aiAgentsTable, aiQueriesTable, consentRecordsTable, db,
  crossingsTable, eventRsvpTable, introductionRequestsTable, missedXsectsTable,
  professionalProfileTable, privacyRightsRequestsTable,
  wantsTable, offersTable, xsectsTable, connectionTable, conversationTable, messageTable,
} from "@workspace/db";
import { and, desc, eq, or, inArray } from "drizzle-orm";
import { Router, type IRouter, type Request } from "express";
import { z } from "zod";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";

const router: IRouter = Router();
router.use(requireAuth);
const user = (req: Request) => (req as AuthenticatedRequest).userId;
const purposes = ["terms", "privacy", "age_18_plus", "precise_location", "analytics", "ai_profiling", "marketing"] as const;
const purposeSchema = z.enum(purposes);
const consentInput = z.object({
  terms: z.boolean(),
  privacy: z.boolean(),
  age18: z.boolean(),
  location: z.boolean(),
  analytics: z.boolean(),
  aiProfiling: z.boolean(),
  marketing: z.boolean(),
});
const consentKeys = {
  terms: "terms",
  privacy: "privacy",
  age18: "age_18_plus",
  location: "precise_location",
  analytics: "analytics",
  aiProfiling: "ai_profiling",
  marketing: "marketing",
} as const;

router.get(["/privacy/consents", "/privacy/consent"], async (req, res, next) => {
  try {
    const rows = await db.select().from(consentRecordsTable)
      .where(eq(consentRecordsTable.userId, user(req))).orderBy(desc(consentRecordsTable.createdAt));
    const latest = new Map<string, (typeof rows)[number]>();
    for (const row of rows) if (!latest.has(row.purpose)) latest.set(row.purpose, row);
    const values = Object.fromEntries(
      Object.entries(consentKeys).map(([key, purpose]) => [key, latest.get(purpose)?.granted ?? false]),
    );
    res.json({
      ...values,
      consents: purposes.map((purpose) => latest.get(purpose) ?? { purpose, granted: false, version: null }),
    });
  } catch (error) { return next(error); }
});

router.put("/privacy/consents", async (req, res, next) => {
  try {
    const parsed = consentInput.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "All consent choices are required." });
    const userId = user(req);
    const version = "2026-09-19";
    const records = await db.insert(consentRecordsTable).values(
      Object.entries(consentKeys).map(([key, purpose]) => ({
        userId,
        purpose,
        version,
        granted: parsed.data[key as keyof typeof parsed.data],
        metadata: { method: "privacy_center" },
      })),
    ).returning();
    return res.json({ ...parsed.data, consents: records });
  } catch (error) { return next(error); }
});

router.put(["/privacy/consents/:purpose", "/privacy/consent/:purpose"], async (req, res, next) => {
  try {
    const parsed = z.object({ granted: z.boolean(), version: z.string().min(1).max(100), metadata: z.record(z.string(), z.unknown()).optional() }).safeParse(req.body);
    const purpose = purposeSchema.safeParse(req.params.purpose);
    if (!purpose.success || !parsed.success) return res.status(400).json({ error: "purpose, granted, and version are required." });
    const [record] = await db.insert(consentRecordsTable).values({
      userId: user(req), purpose: purpose.data, version: parsed.data.version,
      granted: parsed.data.granted, metadata: parsed.data.metadata ?? {},
    }).returning();
    return res.status(201).json({ consent: record });
  } catch (error) { return next(error); }
});

router.post(["/privacy/consents/:purpose/withdraw", "/privacy/consent/:purpose/withdraw"], async (req, res, next) => {
  try {
    const purpose = purposeSchema.safeParse(req.params.purpose);
    if (!purpose.success) return res.status(400).json({ error: "Invalid consent purpose." });
    const version = typeof req.body?.version === "string" && req.body.version.length <= 100 ? req.body.version : "withdrawal";
    const [record] = await db.insert(consentRecordsTable).values({
      userId: user(req), purpose: purpose.data, version, granted: false, metadata: {},
    }).returning();
    return res.status(201).json({ consent: record });
  } catch (error) { return next(error); }
});

router.get(["/privacy/requests", "/privacy/rights-requests"], async (req, res, next) => {
  try {
    const requests = await db.select().from(privacyRightsRequestsTable)
      .where(eq(privacyRightsRequestsTable.userId, user(req))).orderBy(desc(privacyRightsRequestsTable.createdAt));
    res.json({ requests });
  } catch (error) { next(error); }
});

router.post(["/privacy/requests", "/privacy/rights-requests"], async (req, res, next) => {
  try {
    const parsed = z.object({
      type: z.enum(["access_export", "deletion", "correction", "restriction", "objection_opt_out"]),
      details: z.string().max(5000).optional(),
    }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid privacy-rights request." });
    const [request] = await db.insert(privacyRightsRequestsTable).values({ userId: user(req), ...parsed.data }).returning();
    return res.status(201).json({ request });
  } catch (error) { return next(error); }
});

/** Export only records owned by the authenticated user. Deliberately excludes credentials, tokens and secrets. */
router.get("/privacy/export", async (req, res, next) => {
  try {
    const id = user(req);
    const [profile, wants, offers, xsects, missed, crossings, consents, rights, connections, requests, rsvps, introductions, aiQueries, agents] = await Promise.all([
      db.select().from(professionalProfileTable).where(eq(professionalProfileTable.userId, id)).limit(1),
      db.select().from(wantsTable).where(eq(wantsTable.userId, id)),
      db.select().from(offersTable).where(eq(offersTable.userId, id)),
      db.select().from(xsectsTable).where(eq(xsectsTable.userId, id)),
      db.select().from(missedXsectsTable).where(eq(missedXsectsTable.userId, id)),
      db.select().from(crossingsTable).where(or(eq(crossingsTable.userAId, id), eq(crossingsTable.userBId, id))),
      db.select().from(consentRecordsTable).where(eq(consentRecordsTable.userId, id)),
      db.select().from(privacyRightsRequestsTable).where(eq(privacyRightsRequestsTable.userId, id)),
      db.select().from(connectionTable).where(or(eq(connectionTable.requesterId, id), eq(connectionTable.recipientId, id))),
      db.select({ id: conversationTable.id }).from(conversationTable).where(or(eq(conversationTable.participantA, id), eq(conversationTable.participantB, id))),
      db.select().from(eventRsvpTable).where(eq(eventRsvpTable.userId, id)),
      db.select().from(introductionRequestsTable).where(or(eq(introductionRequestsTable.requesterId, id), eq(introductionRequestsTable.intermediaryId, id), eq(introductionRequestsTable.targetUserId, id))),
      db.select().from(aiQueriesTable).where(eq(aiQueriesTable.userId, id)),
      db.select().from(aiAgentsTable).where(eq(aiAgentsTable.userId, id)),
    ]);
    const conversationIds = requests.map((row) => row.id);
    // Message bodies belong to their sender; do not disclose another participant's messages.
    const messages = conversationIds.length ? await db.select().from(messageTable).where(and(eq(messageTable.senderId, id), inArray(messageTable.conversationId, conversationIds))) : [];
    const findings = agents.length ? await db.select().from(aiAgentFindingsTable).where(and(eq(aiAgentFindingsTable.userId, id), inArray(aiAgentFindingsTable.agentId, agents.map((a) => a.id)))) : [];
    res.json({ exportedAt: new Date().toISOString(), userId: id, profile: profile[0] ?? null, wants, offers, xsects, missed, crossings, consents, rightsRequests: rights, connections, conversations: requests, messages, eventRsvps: rsvps, introductionRequests: introductions, aiQueries, aiAgents: agents, aiAgentFindings: findings });
  } catch (error) { next(error); }
});

export default router;