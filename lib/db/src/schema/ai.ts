import { index, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export type TwinSummary = {
  whatYouOffer: string[];
  whatYouWant: string[];
  whatYouAreGoodAt: string[];
  whoYouShouldMeet: string[];
  opportunitiesThatFit: string[];
  industries: string[];
  networkingGoals: string[];
};

/** Structured, editable representation of a user's professional signals. */
export const professionalTwinsTable = pgTable("professional_twins", {
  userId: text("user_id").primaryKey(),
  generated: jsonb("generated").$type<TwinSummary>().notNull(),
  /** User corrections layered over `generated`. Keys mirror TwinSummary. */
  overrides: jsonb("overrides").$type<Partial<TwinSummary>>().notNull().default({}),
  model: text("model").notNull(),
  sourceHash: text("source_hash").notNull(),
  generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const aiQueriesTable = pgTable("ai_queries", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  prompt: text("prompt").notNull(),
  answer: text("answer").notNull(),
  /** Internal grounding: ids of XSECTs / paths / events the answer was derived from. */
  citations: jsonb("citations").$type<Array<{ kind: "xsect" | "path" | "event" | "missed" | "opportunity" | "alert"; id: string; reason: string }>>().notNull().default([]),
  model: text("model").notNull(),
  latencyMs: integer("latency_ms"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("ai_queries_user_idx").on(t.userId, t.createdAt)]);

export const aiRecommendationsTable = pgTable("ai_recommendations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  queryId: uuid("query_id").references(() => aiQueriesTable.id, { onDelete: "cascade" }),
  xsectId: uuid("xsect_id"),
  targetUserId: text("target_user_id"),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("ai_recommendations_user_idx").on(t.userId, t.createdAt)]);

export type AgentIntent = {
  role: string | null;
  companyStage: string | null;
  industry: string | null;
  location: string | null;
  availability: string | null;
  keywords: string[];
  wantCategories: string[];
  offerCategories: string[];
};

export const aiAgentStatus = pgEnum("ai_agent_status", ["active", "paused", "archived"]);
export const aiAgentsTable = pgTable("ai_agents", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  rawIntent: text("raw_intent").notNull(),
  structured: jsonb("structured").$type<AgentIntent>().notNull(),
  status: aiAgentStatus("status").notNull().default("active"),
  model: text("model").notNull(),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  findingCount: integer("finding_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [index("ai_agents_user_status_idx").on(t.userId, t.status)]);

export const aiAgentFindingsTable = pgTable("ai_agent_findings", {
  id: uuid("id").defaultRandom().primaryKey(),
  agentId: uuid("agent_id").notNull().references(() => aiAgentsTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  xsectId: uuid("xsect_id"),
  targetUserId: text("target_user_id"),
  organizationOpportunityId: uuid("organization_opportunity_id"),
  score: integer("score").notNull(),
  reason: text("reason").notNull(),
  seenAt: timestamp("seen_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("ai_agent_findings_agent_idx").on(t.agentId, t.createdAt)]);

export type ProfessionalTwin = typeof professionalTwinsTable.$inferSelect;
export type AiQuery = typeof aiQueriesTable.$inferSelect;
export type AiAgent = typeof aiAgentsTable.$inferSelect;
export type AiAgentFinding = typeof aiAgentFindingsTable.$inferSelect;
