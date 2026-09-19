import { boolean, index, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const consentPurpose = pgEnum("consent_purpose", [
  "terms", "privacy", "age_18_plus", "precise_location", "analytics", "ai_profiling", "marketing",
]);
export const consentRecordsTable = pgTable("consent_records", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  purpose: consentPurpose("purpose").notNull(),
  version: text("version").notNull(),
  granted: boolean("granted").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("consent_records_user_purpose_idx").on(t.userId, t.purpose, t.createdAt)]);

export const privacyRightType = pgEnum("privacy_right_type", [
  "access_export", "deletion", "correction", "restriction", "objection_opt_out",
]);
export const privacyRequestStatus = pgEnum("privacy_request_status", ["pending", "in_review", "completed", "rejected"]);
export const privacyRightsRequestsTable = pgTable("privacy_rights_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  type: privacyRightType("type").notNull(),
  status: privacyRequestStatus("status").notNull().default("pending"),
  details: text("details"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [index("privacy_requests_user_idx").on(t.userId, t.createdAt)]);

export type ConsentRecord = typeof consentRecordsTable.$inferSelect;
export type PrivacyRightsRequest = typeof privacyRightsRequestsTable.$inferSelect;