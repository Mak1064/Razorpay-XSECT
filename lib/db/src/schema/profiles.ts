import { pgTable, text, integer, boolean, timestamp, jsonb, real, pgEnum, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const profileTrustLevel = pgEnum("profile_trust_level", ["contact", "professional", "enhanced"]);
export const profileVisibility = pgEnum("profile_visibility", ["discoverable", "trusted_only", "stealth", "ghost"]);

export const professionalProfileTable = pgTable("professional_profiles", {
  userId: text("user_id").primaryKey(),
  displayName: text("display_name").notNull().default(""),
  role: text("role").notNull().default(""),
  intent: text("intent").notNull().default(""),
  photoUrl: text("photo_url"),
  company: text("company"),
  industry: text("industry"),
  identity: jsonb("identity").$type<{ pronouns?: string; location?: string; ageRange?: string }>().notNull().default({}),
  experience: jsonb("experience").$type<Array<{ title: string; company: string; startYear?: number; endYear?: number; description?: string }>>().notNull().default([]),
  links: jsonb("links").$type<Array<{ label: string; url: string }>>().notNull().default([]),
  skills: jsonb("skills").$type<string[]>().notNull().default([]),
  wants: jsonb("wants").$type<string[]>().notNull().default([]),
  offers: jsonb("offers").$type<string[]>().notNull().default([]),
  opportunityCategories: jsonb("opportunity_categories").$type<string[]>().notNull().default([]),
  availability: text("availability").notNull().default("not_available"),
  urgency: text("urgency").notNull().default("exploring"),
  discoveryRadius: integer("discovery_radius").notNull().default(25),
  notificationPreferences: jsonb("notification_preferences").$type<{ email: boolean; push: boolean; matches: boolean; messages: boolean }>().notNull().default({ email: true, push: true, matches: true, messages: true }),
  privacy: jsonb("privacy").$type<{ trustedConnectionsOnly: boolean; womenOnly: boolean; stealthMode: boolean; visibilitySchedule?: { start: string; end: string; timezone?: string }; fieldVisibility: Record<string, boolean> }>().notNull().default({ trustedConnectionsOnly: false, womenOnly: false, stealthMode: false, fieldVisibility: {} }),
  trustReputation: jsonb("trust_reputation").$type<{ score: number; completedConnections: number; endorsements: number }>().notNull().default({ score: 0, completedConnections: 0, endorsements: 0 }),
  onboardingComplete: boolean("onboarding_complete").notNull().default(false),
  /** Approximate location. Precise values are never returned to other users; only distance bands / area labels are. */
  city: text("city"),
  area: text("area"),
  approxLat: real("approx_lat"),
  approxLng: real("approx_lng"),
  trustLevel: profileTrustLevel("trust_level").notNull().default("contact"),
  visibility: profileVisibility("visibility").notNull().default("discoverable"),
  /** Intents the user is discoverable for while in stealth (want/offer categories). */
  stealthIntents: jsonb("stealth_intents").$type<string[]>().notNull().default([]),
  lastActiveAt: timestamp("last_active_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [index("profiles_city_area_idx").on(t.city, t.area), index("profiles_visibility_idx").on(t.visibility), index("profiles_last_active_idx").on(t.lastActiveAt)]);

export const insertProfessionalProfileSchema = createInsertSchema(professionalProfileTable).omit({ createdAt: true, updatedAt: true });
export type ProfessionalProfile = typeof professionalProfileTable.$inferSelect;
export type InsertProfessionalProfile = typeof professionalProfileTable.$inferInsert;