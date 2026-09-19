import { createInsertSchema } from "drizzle-zod";
import { index, integer, jsonb, pgEnum, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

/** Shared enums used across the XSECT opportunity model. */
export const intentLevel = pgEnum("intent_level", ["casual", "active", "urgent"]);
export const workMode = pgEnum("work_mode", ["remote", "hybrid", "in_person", "flexible"]);
export const opportunityVisibility = pgEnum("opportunity_visibility", ["discoverable", "trusted_only", "hidden"]);
export const trustLevel = pgEnum("trust_level", ["contact", "professional", "enhanced"]);
export const opportunityStatus = pgEnum("opportunity_status", ["active", "paused", "fulfilled", "expired"]);
export const wantCategory = pgEnum("want_category", [
  "job", "referral", "investor", "cofounder", "mentor", "advisor", "freelancer", "client", "partnership", "introduction", "advice", "service",
]);
export const offerCategory = pgEnum("offer_category", [
  "hiring", "mentoring", "referrals", "introductions", "consulting", "freelancing", "investment", "partnership", "services", "expertise", "resources",
]);

const opportunityColumns = {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  skills: jsonb("skills").$type<string[]>().notNull().default([]),
  industry: text("industry"),
  locationPreference: text("location_preference"),
  radiusKm: integer("radius_km").notNull().default(25),
  intent: intentLevel("intent").notNull().default("active"),
  availability: text("availability").notNull().default("flexible"),
  workMode: workMode("work_mode").notNull().default("flexible"),
  visibility: opportunityVisibility("visibility").notNull().default("discoverable"),
  trustRequirement: trustLevel("trust_requirement").notNull().default("contact"),
  status: opportunityStatus("status").notNull().default("active"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
};

export const wantsTable = pgTable("wants", {
  ...opportunityColumns,
  category: wantCategory("category").notNull(),
}, (t) => [index("wants_user_idx").on(t.userId), index("wants_status_category_idx").on(t.status, t.category), index("wants_expires_idx").on(t.expiresAt), index("wants_intent_idx").on(t.intent)]);

export const offersTable = pgTable("offers", {
  ...opportunityColumns,
  category: offerCategory("category").notNull(),
}, (t) => [index("offers_user_idx").on(t.userId), index("offers_status_category_idx").on(t.status, t.category), index("offers_expires_idx").on(t.expiresAt), index("offers_intent_idx").on(t.intent)]);

export const insertWantSchema = createInsertSchema(wantsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertOfferSchema = createInsertSchema(offersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type Want = typeof wantsTable.$inferSelect;
export type Offer = typeof offersTable.$inferSelect;
export type InsertWant = typeof wantsTable.$inferInsert;
export type InsertOffer = typeof offersTable.$inferInsert;

/** Organizations */
export const verificationState = pgEnum("verification_state", ["unverified", "pending", "verified"]);
export const organizationsTable = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logoUrl: text("logo_url"),
  description: text("description").notNull().default(""),
  industry: text("industry"),
  size: text("size"),
  city: text("city"),
  area: text("area"),
  website: text("website"),
  verificationState: verificationState("verification_state").notNull().default("unverified"),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [index("organizations_industry_idx").on(t.industry), index("organizations_city_idx").on(t.city)]);

export const organizationRole = pgEnum("organization_role", ["owner", "admin", "member"]);
export const organizationMembersTable = pgTable("organization_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  role: organizationRole("role").notNull().default("member"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique("organization_members_pair").on(t.organizationId, t.userId), index("organization_members_user_idx").on(t.userId)]);

export const organizationOpportunityType = pgEnum("organization_opportunity_type", [
  "job", "partnership", "freelance", "vendor", "mentorship", "event", "investor", "collaboration", "service",
]);
export const organizationOpportunitiesTable = pgTable("organization_opportunities", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  type: organizationOpportunityType("type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  skills: jsonb("skills").$type<string[]>().notNull().default([]),
  industry: text("industry"),
  workMode: workMode("work_mode").notNull().default("flexible"),
  city: text("city"),
  area: text("area"),
  intent: intentLevel("intent").notNull().default("active"),
  status: opportunityStatus("status").notNull().default("active"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [index("organization_opportunities_org_idx").on(t.organizationId), index("organization_opportunities_status_type_idx").on(t.status, t.type), index("organization_opportunities_expires_idx").on(t.expiresAt)]);

export const insertOrganizationSchema = createInsertSchema(organizationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertOrganizationOpportunitySchema = createInsertSchema(organizationOpportunitiesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type Organization = typeof organizationsTable.$inferSelect;
export type OrganizationMember = typeof organizationMembersTable.$inferSelect;
export type OrganizationOpportunity = typeof organizationOpportunitiesTable.$inferSelect;

/** Availability rules (recurring + one-off windows). */
export const availabilityRuleMode = pgEnum("availability_rule_mode", ["recurring", "one_off"]);
export const availabilityRulesTable = pgTable("availability_rules", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  mode: availabilityRuleMode("mode").notNull().default("recurring"),
  /** 0 = Sunday … 6 = Saturday. Required for recurring rules. */
  weekday: integer("weekday"),
  /** ISO date (YYYY-MM-DD) for one-off windows. */
  date: text("date"),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  timezone: text("timezone").notNull().default("Asia/Kolkata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("availability_rules_user_idx").on(t.userId)]);
export type AvailabilityRule = typeof availabilityRulesTable.$inferSelect;
