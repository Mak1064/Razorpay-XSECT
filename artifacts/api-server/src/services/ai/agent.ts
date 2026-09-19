import {
  aiAgentFindingsTable,
  aiAgentsTable,
  db,
  momentsTable,
  offersTable,
  organizationOpportunitiesTable,
  organizationsTable,
  professionalProfileTable,
  wantsTable,
  type AgentIntent,
} from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import { and, eq, inArray, ne, or, sql } from "drizzle-orm";
import { track } from "../../lib/analytics";
import { getEffectivePlan } from "../../lib/entitlements";
import { engine, pairKeyFor, type PairScore } from "../xsect-engine";
import { z } from "zod";

const MODEL = "gpt-5.6-luna";
const intentSchema = {
  type: "object", additionalProperties: false,
  required: ["role", "companyStage", "industry", "location", "availability", "keywords", "wantCategories", "offerCategories"],
  properties: {
    role: { type: ["string", "null"] },
    companyStage: { type: ["string", "null"] },
    industry: { type: ["string", "null"] },
    location: { type: ["string", "null"] },
    availability: { type: ["string", "null"] },
    keywords: { type: "array", items: { type: "string" }, maxItems: 20 },
    wantCategories: { type: "array", items: { type: "string" }, maxItems: 12 },
    offerCategories: { type: "array", items: { type: "string" }, maxItems: 11 },
  },
} as const;
const intentResult = z.object({
  role: z.string().nullable(), companyStage: z.string().nullable(), industry: z.string().nullable(),
  location: z.string().nullable(), availability: z.string().nullable(), keywords: z.array(z.string()).max(20),
  wantCategories: z.array(z.string()).max(12), offerCategories: z.array(z.string()).max(11),
});

export class AgentEntitlementError extends Error {
  readonly status = 402;
  readonly entitlement = "ai_agent";
  constructor() { super("XSECT AI Agent requires Pro+."); }
}

async function requireAgentPlan(userId: string) {
  if (!(await getEffectivePlan(userId)).entitlements.includes("ai_agent")) throw new AgentEntitlementError();
}

export async function createAgent(userId: string, rawIntent: string) {
  await requireAgentPlan(userId);
  const active = await db.select({ count: sql<number>`count(*)::int` }).from(aiAgentsTable)
    .where(and(eq(aiAgentsTable.userId, userId), ne(aiAgentsTable.status, "archived")));
  if (active[0].count >= 3) throw new Error("You can have at most three active or paused XSECT Agents.");
  const response = await openai.chat.completions.create({
    model: MODEL,
    max_completion_tokens: 8192,
    messages: [
      { role: "system", content: "Extract only professional search criteria explicitly stated. Use null and empty arrays for unknown fields. Normalize category words, but never invent requirements. Availability means an explicit timing requirement such as today or this month; do not infer it from words like seeking, hiring, or looking." },
      { role: "user", content: rawIntent },
    ],
    response_format: { type: "json_schema", json_schema: { name: "agent_intent", strict: true, schema: intentSchema } },
  });
  const structured: AgentIntent = intentResult.parse(JSON.parse(response.choices[0]?.message?.content ?? "{}"));
  const [agent] = await db.insert(aiAgentsTable).values({ userId, rawIntent, structured, model: MODEL }).returning();
  await track("agent_created", userId, { agentId: agent.id });
  return agent;
}

const stopWords = new Set(["the", "and", "for", "with", "that", "this", "from", "who", "where", "looking", "find", "seeking", "need", "want"]);
const tokens = (...values: unknown[]) => new Set(values.flatMap((value) => {
  if (Array.isArray(value)) return value.flatMap((v) => typeof v === "string" ? v.toLowerCase().split(/[^a-z0-9+.-]+/) : []);
  return typeof value === "string" ? value.toLowerCase().split(/[^a-z0-9+.-]+/) : [];
}).filter((v) => v.length > 1 && !stopWords.has(v)));
const overlap = (a: Set<string>, b: Set<string>) => [...a].filter((v) => b.has(v));

export async function runAgent(agentId: string, ownerId?: string) {
  const agent = (await db.select().from(aiAgentsTable).where(eq(aiAgentsTable.id, agentId)).limit(1))[0];
  if (!agent || (ownerId && agent.userId !== ownerId)) throw new Error("XSECT Agent not found.");
  await requireAgentPlan(agent.userId);
  if (agent.status !== "active") throw new Error("Resume this XSECT Agent before running it.");

  const intentTerms = tokens(agent.rawIntent, agent.structured.role, agent.structured.companyStage, agent.structured.industry, agent.structured.location, agent.structured.keywords, agent.structured.wantCategories, agent.structured.offerCategories);
  const [profiles, wants, offers, orgOpps] = await Promise.all([
    db.select().from(professionalProfileTable).where(and(ne(professionalProfileTable.userId, agent.userId), ne(professionalProfileTable.visibility, "ghost"))).limit(300),
    db.select().from(wantsTable).where(eq(wantsTable.status, "active")).limit(500),
    db.select().from(offersTable).where(eq(offersTable.status, "active")).limit(500),
    db.select({ opportunity: organizationOpportunitiesTable, organization: organizationsTable }).from(organizationOpportunitiesTable)
      .innerJoin(organizationsTable, eq(organizationOpportunitiesTable.organizationId, organizationsTable.id))
      .where(eq(organizationOpportunitiesTable.status, "active")).limit(300),
  ]);
  const byUserWants = new Map<string, typeof wants>();
  const byUserOffers = new Map<string, typeof offers>();
  for (const row of wants) byUserWants.set(row.userId, [...(byUserWants.get(row.userId) ?? []), row]);
  for (const row of offers) byUserOffers.set(row.userId, [...(byUserOffers.get(row.userId) ?? []), row]);

  const existing = await db.select().from(aiAgentFindingsTable).where(eq(aiAgentFindingsTable.agentId, agent.id));
  const existingTargets = new Set(existing.map((f) => f.targetUserId).filter(Boolean));
  const existingOpps = new Set(existing.map((f) => f.organizationOpportunityId).filter(Boolean));
  let created = 0;

  for (const profile of profiles) {
    if (existingTargets.has(profile.userId)) continue;
    const candidateTerms = tokens(profile.role, profile.industry, profile.skills, profile.wants, profile.offers, profile.city, profile.area,
      ...(byUserWants.get(profile.userId) ?? []).flatMap((r) => [r.title, r.description, r.category, r.skills, r.industry]),
      ...(byUserOffers.get(profile.userId) ?? []).flatMap((r) => [r.title, r.description, r.category, r.skills, r.industry]));
    const shared = overlap(intentTerms, candidateTerms);
    if (!shared.length || !(await engine.isDiscoverable(agent.userId, profile.userId))) continue;
    const score = await engine.scorePair(agent.userId, profile.userId, { type: "intent" });
    const xsect = await engine.upsertXsect(agent.userId, profile.userId, { type: "intent", pairKey: pairKeyFor("intent", agent.userId, profile.userId, agent.id) }, score);
    const reason = score.explanation[0] ?? `Relevant signals: ${shared.slice(0, 4).join(", ")}.`;
    const [finding] = await db.insert(aiAgentFindingsTable).values({ agentId: agent.id, userId: agent.userId, xsectId: xsect.id, targetUserId: profile.userId, score: score.score, reason }).returning();
    if (finding.score >= 60) await db.insert(momentsTable).values({ userId: agent.userId, kind: "agent_discovery", title: "XSECT Agent discovery", body: reason, xsectId: xsect.id, relatedUserId: profile.userId, metadata: { agentId: agent.id, findingId: finding.id } });
    created++;
  }

  for (const { opportunity, organization } of orgOpps) {
    if (existingOpps.has(opportunity.id)) continue;
    const opportunityTerms = tokens(opportunity.title, opportunity.description, opportunity.type, opportunity.skills, opportunity.industry, opportunity.city, opportunity.area, organization.industry);
    const shared = overlap(intentTerms, opportunityTerms);
    if (!shared.length) continue;
    const scoreValue = Math.min(100, 35 + shared.length * 12 + (agent.structured.industry && opportunity.industry?.toLowerCase() === agent.structured.industry.toLowerCase() ? 15 : 0));
    const score: PairScore = {
      score: scoreValue,
      factors: [
        { factor: "intent", score: Math.min(100, 40 + shared.length * 15), weight: 0.6, detail: `Shared criteria: ${shared.slice(0, 5).join(", ")}` },
        { factor: "skills", score: Math.min(100, shared.length * 20), weight: 0.4, detail: "Keyword and category overlap with the organization opportunity." },
      ],
      explanation: [`This organization opportunity overlaps on ${shared.slice(0, 5).join(", ")}.`],
      wantId: null, offerId: null, isHot: scoreValue >= 80,
    };
    const xsect = await engine.upsertXsect(agent.userId, null, { type: "opportunity", pairKey: pairKeyFor("opportunity", agent.userId, null, opportunity.id), organizationOpportunityId: opportunity.id }, score);
    const [finding] = await db.insert(aiAgentFindingsTable).values({ agentId: agent.id, userId: agent.userId, xsectId: xsect.id, organizationOpportunityId: opportunity.id, score: score.score, reason: score.explanation[0] }).returning();
    if (finding.score >= 60) await db.insert(momentsTable).values({ userId: agent.userId, kind: "agent_discovery", title: "XSECT Agent discovery", body: finding.reason, xsectId: xsect.id, metadata: { agentId: agent.id, findingId: finding.id, organizationOpportunityId: opportunity.id } });
    created++;
  }

  const total = existing.length + created;
  const [updated] = await db.update(aiAgentsTable).set({ lastRunAt: new Date(), findingCount: total }).where(eq(aiAgentsTable.id, agent.id)).returning();
  return { agent: updated, newFindings: created };
}