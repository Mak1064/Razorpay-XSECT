import { index, integer, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

/**
 * One-time authorization for a private object upload.
 * The row binds an opaque storage path and declared metadata to one user.
 */
export const uploadIntentsTable = pgTable("upload_intents", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  objectPath: text("object_path").notNull(),
  originalName: text("original_name").notNull(),
  size: integer("size").notNull(),
  contentType: text("content_type").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  finalizedAt: timestamp("finalized_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("upload_intents_object_path_unique").on(table.objectPath),
  index("upload_intents_user_created_idx").on(table.userId, table.createdAt),
  index("upload_intents_expiry_idx").on(table.expiresAt),
]);

export type UploadIntent = typeof uploadIntentsTable.$inferSelect;