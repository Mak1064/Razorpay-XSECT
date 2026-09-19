import { aiQueriesTable, aiRecommendationsTable, db } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import { and, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";
import { track } from "../../lib/analytics";
import { FREE_LIMITS, getEffectivePlan } from "../../lib/entitlements";
import { buildUserContext, type ContextKind, type UserContext } from "./context";

const MODEL = "gpt-5.6-terra";
const citationKinds = ["xsect", "path", "event", "missed", "opportunity", "alert"] as const;
const resultSchema = z.object({
  answer: z.string(),
  citations: z.array(z.object({ kind: z.enum(citationKinds), id: z.string(), reason: z.string() })),
  suggestedActions: z.array(z.object({ label: z.string(), href: z.string() })),
});
export type IntelligenceResult = z.infer<typeof resultSchema>;

const jsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["answer", "citations", "suggestedActions"],
  properties: {
    answer: { type: "string" },
    citations: {
      type: "array",
      items: {
        type: "object", additionalProperties: false, required: ["kind", "id", "reason"],
        properties: { kind: { type: "string", enum: citationKinds }, id: { type: "string" }, reason: { type: "string" } },
      },
    },
    suggestedActions: {
      type: "array",
      items: {
        type: "object", additionalProperties: false, required: ["label", "href"],
        properties: { label: { type: "string" }, href: { type: "string" } },
      },
    },
  },
} as const;

export class IntelligenceLimitError extends Error {
  readonly status = 402;
  readonly entitlement = "intelligence_full";
  constructor() { super("Your three free XSECT Intelligence queries for today have been used."); }
}

async function ask(prompt: string, context: UserContext, strict = false): Promise<IntelligenceResult> {
  const system = [
    "You are XSECT Intelligence, a premium professional opportunity intelligence layer.",
    "Use only facts and entities present in the supplied context. Refer to every entity only by its supplied stable id.",
    "Never invent people, identities, relationships, paths, opportunities, events, or location details.",
    "Never infer or reveal a protected counterpart's name, company, photo, contact details, or exact coordinates.",
    "When recommending an XSECT, state its XSECT Score and concise reasons grounded in explanation/factors.",
    "If nothing fits, say so directly and suggest a concrete next action such as adding a Want, publishing an Offer, expanding discovery, or creating a Standing XSECT.",
    "Keep the answer concise and use a confident, premium tone.",
    "Citations must use the exact id and matching kind from context. Suggested hrefs must be one of these registered paths exactly: /xsects, /paths, /events, /opportunities, /alerts, /profile, /plans, /ai.",
    strict ? "STRICT RETRY: The prior answer claimed relevant results without citations. Cite every claimed result, or explicitly say no grounded result exists." : "",
  ].filter(Boolean).join("\n");
  const response = await openai.chat.completions.create({
    model: MODEL,
    max_completion_tokens: 8192,
    messages: [{ role: "system", content: system }, { role: "user", content: JSON.stringify({ question: prompt, context }) }],
    response_format: { type: "json_schema", json_schema: { name: "xsect_intelligence", strict: true, schema: jsonSchema } },
  });
  return resultSchema.parse(JSON.parse(response.choices[0]?.message?.content ?? "{}"));
}

function validCitations(result: IntelligenceResult, context: UserContext): IntelligenceResult {
  const citations = result.citations.filter((citation) => context.entityIds[citation.kind as ContextKind]?.includes(citation.id));
  const allowedPaths = new Set(["/xsects", "/paths", "/events", "/opportunities", "/alerts", "/profile", "/plans", "/ai"]);
  const suggestedActions = result.suggestedActions.filter((a) => allowedPaths.has(a.href));
  return { ...result, citations, suggestedActions };
}

export async function answerQuery(userId: string, prompt: string) {
  const plan = await getEffectivePlan(userId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (!plan.entitlements.includes("intelligence_full")) {
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(aiQueriesTable)
      .where(and(eq(aiQueriesTable.userId, userId), gte(aiQueriesTable.createdAt, today)));
    if (count >= FREE_LIMITS.intelligenceQueriesPerDay) throw new IntelligenceLimitError();
  }

  const started = Date.now();
  const context = await buildUserContext(userId);
  let result = validCitations(await ask(prompt, context), context);
  const claimsResults = /\b(found|recommend|strongest|best|xsect score|should meet|opportunit(?:y|ies)|path)\b/i.test(result.answer)
    && !/\b(no|none|couldn't|cannot|not find|quiet)\b/i.test(result.answer);
  if (!result.citations.length && claimsResults) result = validCitations(await ask(prompt, context, true), context);

  const [query] = await db.insert(aiQueriesTable).values({
    userId, prompt, answer: result.answer, citations: result.citations, model: MODEL, latencyMs: Date.now() - started,
  }).returning();
  await track("ai_query", userId, { queryId: query.id, citationCount: result.citations.length, model: MODEL });

  const xsectCitations = result.citations.filter((c) => c.kind === "xsect");
  if (xsectCitations.length) {
    await db.insert(aiRecommendationsTable).values(xsectCitations.map((citation) => ({
      userId,
      queryId: query.id,
      xsectId: citation.id.replace(/^x:/, ""),
      reason: citation.reason,
    })));
    await Promise.all(xsectCitations.map((citation) => track("ai_recommendation", userId, { queryId: query.id, xsectId: citation.id.replace(/^x:/, "") })));
  }
  return { query: { ...query, suggestedActions: result.suggestedActions }, quota: { plan: plan.plan, dailyLimit: plan.plan === "free" ? FREE_LIMITS.intelligenceQueriesPerDay : null } };
}