import { createInsertSchema } from "drizzle-zod";
import { boolean, jsonb, pgEnum, pgTable, text, timestamp, uuid, unique } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const connectionStatus = pgEnum("connection_status", ["pending", "accepted", "declined", "withdrawn", "blocked"]);
export const connectionTable = pgTable("social_connections", {
  id: uuid("id").defaultRandom().primaryKey(),
  requesterId: text("requester_id").notNull(),
  recipientId: text("recipient_id").notNull(),
  status: connectionStatus("status").notNull().default("pending"),
  blockedBy: text("blocked_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [unique("social_connections_pair").on(t.requesterId, t.recipientId)]);
export const insertConnectionSchema = createInsertSchema(connectionTable).omit({ id: true, createdAt: true, updatedAt: true });
export type Connection = typeof connectionTable.$inferSelect;

export const conversationTable = pgTable("social_conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  participantA: text("participant_a").notNull(),
  participantB: text("participant_b").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique("social_conversation_pair").on(t.participantA, t.participantB)]);
export const messageTable = pgTable("social_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversation_id").notNull().references(() => conversationTable.id, { onDelete: "cascade" }),
  senderId: text("sender_id").notNull(),
  body: text("body").notNull(),
  status: text("status").notNull().default("sent"),
  attachment: jsonb("attachment"),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export type Message = typeof messageTable.$inferSelect;

export const consentAuditTable = pgTable("social_consent_audit", {
  id: uuid("id").defaultRandom().primaryKey(),
  connectionId: uuid("connection_id").notNull().references(() => connectionTable.id, { onDelete: "cascade" }),
  actorId: text("actor_id").notNull(),
  action: text("action").notNull(),
  contextId: text("context_id"),
  fields: jsonb("fields"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const reportTable = pgTable("social_reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  reporterId: text("reporter_id").notNull(),
  subjectId: text("subject_id").notNull(),
  connectionId: uuid("connection_id").references(() => connectionTable.id, { onDelete: "set null" }),
  reason: text("reason").notNull(),
  details: text("details"),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const introductionTable = pgTable("social_introductions", {
  id: uuid("id").defaultRandom().primaryKey(),
  requesterId: text("requester_id").notNull(),
  targetId: text("target_id").notNull(),
  contextId: text("context_id"),
  trustedOnly: boolean("trusted_only").notNull().default(false),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const eventTable = pgTable("social_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  location: text("location").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  capacity: text("capacity").notNull().default("50"),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  cancelledReason: text("cancelled_reason"),
  createdBy: text("created_by").notNull().default("system"),
  intentTags: jsonb("intent_tags").$type<string[]>().notNull().default([]),
  womenOnly: boolean("women_only").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const eventAdminRole = pgEnum("event_admin_role", ["owner", "admin"]);
export const eventAdminTable = pgTable("social_event_admins", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id").notNull().references(() => eventTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  role: eventAdminRole("role").notNull().default("admin"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique("social_event_admin_unique").on(t.eventId, t.userId)]);
export const rsvpStatus = pgEnum("event_rsvp_status", ["requested", "confirmed", "waitlisted", "cancelled", "declined"]);
export const eventRsvpTable = pgTable("social_event_rsvps", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id").notNull().references(() => eventTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  status: rsvpStatus("status").notNull().default("requested"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [unique("social_event_rsvp_unique").on(t.eventId, t.userId)]);
export type EventRsvp = typeof eventRsvpTable.$inferSelect;
export const eventReportTable = pgTable("social_event_reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id").notNull().references(() => eventTable.id, { onDelete: "cascade" }),
  reporterId: text("reporter_id").notNull(),
  reason: text("reason").notNull(),
  details: text("details"),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const eventGenerationTable = pgTable("social_event_generations", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id").notNull().references(() => eventTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  prompt: text("prompt").notNull(),
  status: text("status").notNull().default("available"),
  output: text("output"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notificationTable = pgTable("social_notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  resourceId: text("resource_id"),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export type Notification = typeof notificationTable.$inferSelect;
export type InsertConnection = z.infer<typeof insertConnectionSchema>;