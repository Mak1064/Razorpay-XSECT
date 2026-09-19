import { index, integer, jsonb, pgEnum, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

/** XSECT Bridge: warm introduction requests routed through an intermediary. */
export const introductionRequestStatus = pgEnum("introduction_request_status", ["pending", "accepted", "declined", "ignored", "expired", "completed"]);
export const introductionRequestsTable = pgTable("introduction_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  requesterId: text("requester_id").notNull(),
  intermediaryId: text("intermediary_id").notNull(),
  targetUserId: text("target_user_id").notNull(),
  reason: text("reason").notNull(),
  pathId: uuid("path_id"),
  xsectId: uuid("xsect_id"),
  status: introductionRequestStatus("status").notNull().default("pending"),
  intermediaryNote: text("intermediary_note"),
  /** Set when the target also accepts and a connection is created. */
  resultingConnectionId: uuid("resulting_connection_id"),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("introduction_requests_requester_idx").on(t.requesterId, t.status),
  index("introduction_requests_intermediary_idx").on(t.intermediaryId, t.status),
  index("introduction_requests_target_idx").on(t.targetUserId, t.status),
]);

/** Reviews are only permitted for a mutually consented, accepted connection. */
export const reviewsTable = pgTable("reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  connectionId: uuid("connection_id").notNull(),
  reviewerId: text("reviewer_id").notNull(),
  revieweeId: text("reviewee_id").notNull(),
  rating: integer("rating").notNull(),
  professionalism: integer("professionalism").notNull(),
  reliability: integer("reliability").notNull(),
  helpfulness: integer("helpfulness").notNull(),
  comment: text("comment").notNull().default(""),
  reportedAt: timestamp("reported_at", { withTimezone: true }),
  reportReason: text("report_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [unique("reviews_connection_reviewer").on(t.connectionId, t.reviewerId), index("reviews_reviewee_idx").on(t.revieweeId)]);

export const reputationEventKind = pgEnum("reputation_event_kind", [
  "connection_success", "opportunity_completed", "introduction_given", "introduction_received", "referral_given", "review_received", "response", "collaboration_success", "trust_progression",
]);
export const reputationEventsTable = pgTable("reputation_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  kind: reputationEventKind("kind").notNull(),
  delta: integer("delta").notNull().default(0),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("reputation_events_user_idx").on(t.userId, t.createdAt), index("reputation_events_kind_idx").on(t.kind)]);

export type IntroductionRequest = typeof introductionRequestsTable.$inferSelect;
export type Review = typeof reviewsTable.$inferSelect;
export type ReputationEvent = typeof reputationEventsTable.$inferSelect;
