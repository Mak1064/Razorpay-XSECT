import { analyticsEventsTable, db, type AnalyticsEventName } from "@workspace/db";

/** Record a product analytics event. Never throws — analytics must not break product flows. */
export async function track(name: AnalyticsEventName, userId: string | null, properties: Record<string, unknown> = {}): Promise<void> {
  try {
    await db.insert(analyticsEventsTable).values({ name, userId, properties });
  } catch (error) {
    console.error("analytics.track failed", name, error);
  }
}
