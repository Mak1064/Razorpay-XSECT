import { boolean, index, integer, jsonb, pgEnum, pgTable, real, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

export const distanceBand = pgEnum("distance_band", ["lt_250m", "250m_500m", "500m_1km", "1km_2km", "2km_5km", "5km_plus"]);
export const xsectType = pgEnum("xsect_type", ["physical", "intent", "network", "time", "event", "opportunity"]);
export const xsectStatus = pgEnum("xsect_status", ["active", "requested", "connected", "dismissed", "expired"]);

/** Individual factor scores stored per XSECT. All are 0–100. */
export type XsectFactorName =
  | "intent" | "skills" | "industry" | "goals" | "proximity" | "availability"
  | "urgency" | "trust" | "activity" | "freshness" | "network";

/**
 * One XSECT row is owned by `userId` (the viewer). A mutual intersection produces two rows
 * (one per participant) sharing the same `pairKey` so each side sees its own explanation.
 */
export const xsectsTable = pgTable("xsects", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  counterpartUserId: text("counterpart_user_id"),
  type: xsectType("type").notNull(),
  score: integer("score").notNull(),
  explanation: jsonb("explanation").$type<string[]>().notNull().default([]),
  status: xsectStatus("status").notNull().default("active"),
  isHot: boolean("is_hot").notNull().default(false),
  distanceBand: distanceBand("distance_band"),
  /** Stable dedupe key: `${type}:${sortedUserA}:${sortedUserB}:${sourceId ?? ""}` */
  pairKey: text("pair_key").notNull(),
  wantId: uuid("want_id"),
  offerId: uuid("offer_id"),
  crossingId: uuid("crossing_id"),
  eventId: uuid("event_id"),
  organizationOpportunityId: uuid("organization_opportunity_id"),
  /** For network XSECTs: intermediary user ids in order. */
  pathUserIds: jsonb("path_user_ids").$type<string[]>().notNull().default([]),
  lastEvaluatedAt: timestamp("last_evaluated_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  unique("xsects_owner_pair").on(t.userId, t.pairKey),
  index("xsects_user_status_idx").on(t.userId, t.status),
  index("xsects_user_type_idx").on(t.userId, t.type),
  index("xsects_counterpart_idx").on(t.counterpartUserId),
  index("xsects_created_idx").on(t.createdAt),
  index("xsects_expires_idx").on(t.expiresAt),
  index("xsects_score_idx").on(t.score),
]);

export const xsectFactorsTable = pgTable("xsect_factors", {
  id: uuid("id").defaultRandom().primaryKey(),
  xsectId: uuid("xsect_id").notNull().references(() => xsectsTable.id, { onDelete: "cascade" }),
  factor: text("factor").$type<XsectFactorName>().notNull(),
  score: integer("score").notNull(),
  weight: real("weight").notNull(),
  detail: text("detail").notNull().default(""),
}, (t) => [index("xsect_factors_xsect_idx").on(t.xsectId), unique("xsect_factors_unique").on(t.xsectId, t.factor)]);

export const crossingSource = pgEnum("crossing_source", ["simulated", "manual", "gps"]);
export const crossingsTable = pgTable("crossings", {
  id: uuid("id").defaultRandom().primaryKey(),
  userAId: text("user_a_id").notNull(),
  userBId: text("user_b_id").notNull(),
  /** Sorted `${a}:${b}` for repeated-crossing detection. */
  pairKey: text("pair_key").notNull(),
  area: text("area").notNull(),
  city: text("city").notNull(),
  approxLat: real("approx_lat"),
  approxLng: real("approx_lng"),
  distanceBand: distanceBand("distance_band").notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(5),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  source: crossingSource("source").notNull().default("simulated"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("crossings_user_a_idx").on(t.userAId, t.occurredAt),
  index("crossings_user_b_idx").on(t.userBId, t.occurredAt),
  index("crossings_pair_idx").on(t.pairKey, t.occurredAt),
  index("crossings_area_idx").on(t.city, t.area),
]);

export const missedStatus = pgEnum("missed_xsect_status", ["active", "expired", "dismissed", "requested", "connected"]);
export const missedXsectsTable = pgTable("missed_xsects", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  counterpartUserId: text("counterpart_user_id").notNull(),
  xsectId: uuid("xsect_id").references(() => xsectsTable.id, { onDelete: "set null" }),
  crossingId: uuid("crossing_id").references(() => crossingsTable.id, { onDelete: "cascade" }),
  score: integer("score").notNull(),
  distanceBand: distanceBand("distance_band").notNull(),
  status: missedStatus("status").notNull().default("active"),
  wantId: uuid("want_id"),
  offerId: uuid("offer_id"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [index("missed_user_status_idx").on(t.userId, t.status), index("missed_occurred_idx").on(t.occurredAt), unique("missed_user_crossing").on(t.userId, t.crossingId)]);

export const momentKind = pgEnum("moment_kind", [
  "nearby_need", "network_intersection", "almost_met", "dormant_relevant", "event_matches", "repeated_crossing", "time_overlap", "alert_triggered", "agent_discovery", "introduction",
]);
export const momentsTable = pgTable("moments", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  kind: momentKind("kind").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  xsectId: uuid("xsect_id").references(() => xsectsTable.id, { onDelete: "cascade" }),
  relatedUserId: text("related_user_id"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("moments_user_created_idx").on(t.userId, t.createdAt)]);

export const alertFrequency = pgEnum("alert_frequency", ["instant", "daily", "weekly"]);
export const alertStatus = pgEnum("alert_status", ["active", "paused", "expired"]);
export const standingAlertsTable = pgTable("standing_alerts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  criteria: jsonb("criteria").$type<{ keywords: string[]; skills: string[]; industries: string[]; wantCategories: string[]; offerCategories: string[]; minScore: number }>().notNull(),
  radiusKm: integer("radius_km").notNull().default(25),
  trustRequirement: text("trust_requirement").notNull().default("contact"),
  frequency: alertFrequency("frequency").notNull().default("instant"),
  status: alertStatus("status").notNull().default("active"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  lastTriggeredAt: timestamp("last_triggered_at", { withTimezone: true }),
  triggerCount: integer("trigger_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [index("standing_alerts_user_status_idx").on(t.userId, t.status), index("standing_alerts_expires_idx").on(t.expiresAt)]);

export const alertTriggersTable = pgTable("alert_triggers", {
  id: uuid("id").defaultRandom().primaryKey(),
  alertId: uuid("alert_id").notNull().references(() => standingAlertsTable.id, { onDelete: "cascade" }),
  xsectId: uuid("xsect_id").references(() => xsectsTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("alert_triggers_alert_idx").on(t.alertId), unique("alert_triggers_unique").on(t.alertId, t.xsectId)]);

export const xsectPathsTable = pgTable("xsect_paths", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  query: text("query").notNull(),
  targetUserId: text("target_user_id"),
  targetOrganizationId: uuid("target_organization_id"),
  /** Ordered hop list excluding the owner. Names are only populated for consented connections. */
  steps: jsonb("steps").$type<Array<{ userId: string; label: string; relationshipStrength: number; trust: string; revealed: boolean }>>().notNull(),
  stepCount: integer("step_count").notNull(),
  strength: integer("strength").notNull(),
  relevance: integer("relevance").notNull(),
  trust: text("trust").notNull(),
  explanation: text("explanation").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("xsect_paths_user_idx").on(t.userId, t.createdAt)]);

export type Xsect = typeof xsectsTable.$inferSelect;
export type XsectFactor = typeof xsectFactorsTable.$inferSelect;
export type Crossing = typeof crossingsTable.$inferSelect;
export type MissedXsect = typeof missedXsectsTable.$inferSelect;
export type Moment = typeof momentsTable.$inferSelect;
export type StandingAlert = typeof standingAlertsTable.$inferSelect;
export type XsectPath = typeof xsectPathsTable.$inferSelect;
export type DistanceBand = (typeof distanceBand.enumValues)[number];
export type XsectType = (typeof xsectType.enumValues)[number];
