import { index, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const analyticsEventName = [
  "signup", "profile_completed", "want_created", "offer_created", "xsect_created", "xsect_viewed", "request_sent", "request_accepted",
  "mutual_consent", "connection_created", "chat_started", "crossing_created", "missed_xsect_viewed", "standing_alert_created",
  "introduction_requested", "introduction_accepted", "event_rsvp", "ai_query", "ai_recommendation",
  "review_submitted", "organization_created", "agent_created", "plan_switched",
] as const;
export type AnalyticsEventName = (typeof analyticsEventName)[number];

export const analyticsEventsTable = pgTable("analytics_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id"),
  name: text("name").$type<AnalyticsEventName>().notNull(),
  properties: jsonb("properties").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("analytics_events_name_created_idx").on(t.name, t.createdAt), index("analytics_events_user_idx").on(t.userId, t.createdAt)]);

export const adminUsersTable = pgTable("admin_users", {
  userId: text("user_id").primaryKey(),
  grantedBy: text("granted_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Append-only record of privileged moderation changes. */
export const adminModerationAuditTable = pgTable("admin_moderation_audit", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorId: text("actor_id").notNull(),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Demo/developer plan override used to preview server-enforced plan access. */
export const planOverridePlan = pgEnum("plan_override_plan", ["free", "pro", "pro_plus"]);
export const planOverridesTable = pgTable("plan_overrides", {
  userId: text("user_id").primaryKey(),
  plan: planOverridePlan("plan").notNull(),
  setBy: text("set_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type AnalyticsEvent = typeof analyticsEventsTable.$inferSelect;
export type AdminUser = typeof adminUsersTable.$inferSelect;
export type AdminModerationAudit = typeof adminModerationAuditTable.$inferSelect;
export type PlanOverride = typeof planOverridesTable.$inferSelect;
