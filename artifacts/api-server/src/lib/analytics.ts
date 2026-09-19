import { analyticsEventsTable, db, type AnalyticsEventName } from "@workspace/db";
import { hasConsent } from "./consent";

/** Record a product analytics event. Never throws — analytics must not break product flows. */
export async function track(name: AnalyticsEventName, userId: string | null, properties: Record<string, unknown> = {}): Promise<void> {
  try {
    if (userId && !(await hasConsent(userId, "analytics"))) return;
    await db.insert(analyticsEventsTable).values({ name, userId, properties });
  } catch (error) {
    console.error("analytics.track failed", name);
  }
}
