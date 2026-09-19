import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const billingUsersTable = pgTable("billing_users", {
  id: text("id").primaryKey(),
  email: text("email"),
  stripeCustomerId: text("stripe_customer_id").unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertBillingUserSchema = createInsertSchema(billingUsersTable).omit({
  createdAt: true,
  updatedAt: true,
});

export type InsertBillingUser = z.infer<typeof insertBillingUserSchema>;
export type BillingUser = typeof billingUsersTable.$inferSelect;