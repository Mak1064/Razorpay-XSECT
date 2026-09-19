import {
  aiAgentFindingsTable,
  aiAgentsTable,
  aiQueriesTable,
  db,
  organizationOpportunitiesTable,
  organizationsTable,
  type TwinSummary,
} from "@workspace/db";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import { requireConsent } from "../lib/consent";
import { FREE_LIMITS, getEffectivePlan, requireEntitlement } from "../lib/entitlements";
import { AgentEntitlementError, createAgent, runAgent } from "../services/ai/agent";
import { answerQuery, IntelligenceLimitError } from "../services/ai/intelligence";
import { generateTwin, getTwin, updateTwinOverrides } from "../services/ai/twin";
import { engine } from "../services/xsect-engine";

// Owned by the "ai" build stream. Mounted under /api by routes/index.ts.
const router: IRouter = Router();
router.use(requireAuth);
const actor = (req: Request) => (req as AuthenticatedRequest).userId;
const bad = (res: Response, message: string, status = 400): void => { res.status(status).json({ error: message }); };

const queryBody = z.object({ prompt: z.string().trim().min(1).max(2000) });
const agentBody = z.object({ rawIntent: z.string().trim().min(4).max(2000) });
const twinKeys = ["whatYouOffer", "whatYouWant", "whatYouAreGoodAt", "whoYouShouldMeet", "opportunitiesThatFit", "industries", "networkingGoals"] as const;
const twinPatch = z.object(Object.fromEntries(twinKeys.map((key) => [key, z.array(z.string().trim().min(1).max(200)).max(20).optional()])) as Record<(typeof twinKeys)[number], z.ZodOptional<z.ZodArray<z.ZodString>>>).partial();
const entitlementError = (res: Response, error: IntelligenceLimitError | AgentEntitlementError) =>
  res.status(402).json({ error: error.message, entitlement: error.entitlement, requiredPlan: error instanceof AgentEntitlementError ? "pro_plus" : "pro" });

router.post("/ai/query", requireConsent("ai_profiling"), async (req, res, next) => {
  try {
    const { prompt } = queryBody.parse(req.body);
    res.status(201).json(await answerQuery(actor(req), prompt));
  } catch (error) {
    if (error instanceof IntelligenceLimitError) return entitlementError(res, error);
    if (error instanceof z.ZodError) return bad(res, error.issues[0]?.message ?? "Invalid query.");
    next(error);
  }
});

router.get("/ai/history", async (req, res, next) => {
  try {
    const userId = actor(req);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const history = await db.select().from(aiQueriesTable).where(eq(aiQueriesTable.userId, userId)).orderBy(desc(aiQueriesTable.createdAt)).limit(limit);
    const plan = await getEffectivePlan(userId);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(aiQueriesTable).where(and(eq(aiQueriesTable.userId, userId), gte(aiQueriesTable.createdAt, today)));
    res.json({ history, quota: { plan: plan.plan, used: count, dailyLimit: plan.plan === "free" ? FREE_LIMITS.intelligenceQueriesPerDay : null } });
  } catch (error) { next(error); }
});

router.get("/ai/twin", async (req, res, next) => {
  try { res.json({ twin: await getTwin(actor(req)) }); } catch (error) { next(error); }
});
router.post("/ai/twin/regenerate", requireConsent("ai_profiling"), async (req, res, next) => {
  try { res.json({ twin: await generateTwin(actor(req), true) }); } catch (error) { next(error); }
});
router.patch("/ai/twin", async (req, res, next) => {
  try { res.json({ twin: await updateTwinOverrides(actor(req), twinPatch.parse(req.body) as Partial<TwinSummary>) }); }
  catch (error) {
    if (error instanceof z.ZodError) return bad(res, error.issues[0]?.message ?? "Invalid Professional Twin override.");
    next(error);
  }
});

router.get("/ai/agents", async (req, res, next) => {
  try {
    const userId = actor(req);
    const plan = await getEffectivePlan(userId);
    const agents = await db.select().from(aiAgentsTable).where(eq(aiAgentsTable.userId, userId)).orderBy(desc(aiAgentsTable.createdAt));
    res.json({ agents, entitlement: plan.entitlements.includes("ai_agent"), plan: plan.plan });
  } catch (error) { next(error); }
});
router.post("/ai/agents", requireConsent("ai_profiling"), async (req, res, next) => {
  try { res.status(201).json({ agent: await createAgent(actor(req), agentBody.parse(req.body).rawIntent) }); }
  catch (error) {
    if (error instanceof AgentEntitlementError) return entitlementError(res, error);
    if (error instanceof z.ZodError) return bad(res, error.issues[0]?.message ?? "Invalid agent intent.");
    if (error instanceof Error && error.message.includes("at most three")) return bad(res, error.message, 409);
    next(error);
  }
});
router.post("/ai/agents/:id/run", requireConsent("ai_profiling"), async (req, res, next) => {
  try { res.json(await runAgent(String(req.params.id), actor(req))); }
  catch (error) {
    if (error instanceof AgentEntitlementError) return entitlementError(res, error);
    if (error instanceof Error && error.message.includes("not found")) return bad(res, error.message, 404);
    if (error instanceof Error && error.message.includes("Resume")) return bad(res, error.message, 409);
    next(error);
  }
});
router.patch("/ai/agents/:id", requireEntitlement("ai_agent"), async (req, res, next) => {
  try {
    const agentId = String(req.params.id);
    const { status } = z.object({ status: z.enum(["active", "paused", "archived"]) }).parse(req.body);
    if (status !== "archived") {
      const current = (await db.select().from(aiAgentsTable).where(and(eq(aiAgentsTable.id, agentId), eq(aiAgentsTable.userId, actor(req)))).limit(1))[0];
      if (!current) return bad(res, "XSECT Agent not found.", 404);
      if (current.status === "archived") {
        const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(aiAgentsTable)
          .where(and(eq(aiAgentsTable.userId, actor(req)), sql`${aiAgentsTable.status} <> 'archived'`));
        if (count >= 3) return bad(res, "You can have at most three active or paused XSECT Agents.", 409);
      }
    }
    const [agent] = await db.update(aiAgentsTable).set({ status }).where(and(eq(aiAgentsTable.id, agentId), eq(aiAgentsTable.userId, actor(req)))).returning();
    if (!agent) return bad(res, "XSECT Agent not found.", 404);
    res.json({ agent });
  } catch (error) {
    if (error instanceof z.ZodError) return bad(res, "Status must be active, paused, or archived.");
    next(error);
  }
});
router.get("/ai/agents/:id/findings", requireEntitlement("ai_agent"), async (req, res, next) => {
  try {
    const userId = actor(req);
    const agent = (await db.select().from(aiAgentsTable).where(and(eq(aiAgentsTable.id, String(req.params.id)), eq(aiAgentsTable.userId, userId))).limit(1))[0];
    if (!agent) return bad(res, "XSECT Agent not found.", 404);
    const rows = await db.select({
      finding: aiAgentFindingsTable,
      opportunity: organizationOpportunitiesTable,
      organization: organizationsTable,
    }).from(aiAgentFindingsTable)
      .leftJoin(organizationOpportunitiesTable, eq(aiAgentFindingsTable.organizationOpportunityId, organizationOpportunitiesTable.id))
      .leftJoin(organizationsTable, eq(organizationOpportunitiesTable.organizationId, organizationsTable.id))
      .where(eq(aiAgentFindingsTable.agentId, agent.id)).orderBy(desc(aiAgentFindingsTable.createdAt));
    const findings = await Promise.all(rows.map(async ({ finding, opportunity, organization }) => ({
      ...finding,
      target: finding.targetUserId ? await engine.protectedProfileView(userId, finding.targetUserId) : null,
      opportunity: opportunity ? { id: opportunity.id, title: opportunity.title, type: opportunity.type, description: opportunity.description, skills: opportunity.skills, industry: opportunity.industry, workMode: opportunity.workMode, city: opportunity.city, area: opportunity.area, organization: organization ? { id: organization.id, name: organization.name } : null } : null,
    })));
    res.json({ findings });
  } catch (error) { next(error); }
});
router.post("/ai/agents/:id/findings/:findingId/seen", requireEntitlement("ai_agent"), async (req, res, next) => {
  try {
    const agentId = String(req.params.id);
    const findingId = String(req.params.findingId);
    const [finding] = await db.update(aiAgentFindingsTable).set({ seenAt: new Date() }).where(and(
      eq(aiAgentFindingsTable.id, findingId), eq(aiAgentFindingsTable.agentId, agentId), eq(aiAgentFindingsTable.userId, actor(req)),
    )).returning();
    if (!finding) return bad(res, "Finding not found.", 404);
    res.json({ finding });
  } catch (error) { next(error); }
});

export default router;
