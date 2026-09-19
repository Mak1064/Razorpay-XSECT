import { db, planOverridesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";
import type { AuthenticatedRequest } from "../middlewares/requireAuth";

export type XsectPlan = "free" | "pro" | "pro_plus";

/**
 * Plan-gated capabilities. Trust/verification is NEVER an entitlement — plan access must not affect trust.
 * Free: limited XSECTs per day, basic Radar, limited Missed history, basic Paths.
 * Pro: unlimited XSECTs, full Missed, Standing Alerts, Time XSECTs, full Intelligence, 2-step paths.
 * Pro+: everything in Pro + Opportunity Map, Event XSECT mode, AI Agent, Professional Twin auto-refresh, priority visibility, multi-step paths.
 */
export type Entitlement =
  | "unlimited_xsects" | "missed_full_history" | "standing_alerts" | "time_xsects" | "intelligence_full"
  | "paths_two_step" | "paths_multi_step" | "opportunity_map" | "event_mode" | "ai_agent" | "twin_auto_refresh" | "priority_visibility" | "moments_full";

export const PLAN_ENTITLEMENTS: Record<XsectPlan, Entitlement[]> = {
  free: [],
  pro: ["unlimited_xsects", "missed_full_history", "standing_alerts", "time_xsects", "intelligence_full", "paths_two_step", "moments_full"],
  pro_plus: ["unlimited_xsects", "missed_full_history", "standing_alerts", "time_xsects", "intelligence_full", "paths_two_step", "paths_multi_step", "opportunity_map", "event_mode", "ai_agent", "twin_auto_refresh", "priority_visibility", "moments_full"],
};

export const FREE_LIMITS = { xsectsPerDay: 5, missedHistoryDays: 7, intelligenceQueriesPerDay: 3, pathResults: 3 } as const;

export type EffectivePlan = { plan: XsectPlan; source: "override" | "free"; entitlements: Entitlement[] };

/** Resolve the effective plan from an admin-set demo override, otherwise free. */
export async function getEffectivePlan(userId: string): Promise<EffectivePlan> {
  const override = (await db.select().from(planOverridesTable).where(eq(planOverridesTable.userId, userId)).limit(1))[0];
  if (override) return { plan: override.plan, source: "override", entitlements: PLAN_ENTITLEMENTS[override.plan] };
  return { plan: "free", source: "free", entitlements: [] };
}

export async function hasEntitlement(userId: string, entitlement: Entitlement): Promise<boolean> {
  return (await getEffectivePlan(userId)).entitlements.includes(entitlement);
}

/** Express middleware: 402 with an upgrade hint when the entitlement is missing. */
export function requireEntitlement(entitlement: Entitlement) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as AuthenticatedRequest).userId;
      const effective = await getEffectivePlan(userId);
      if (!effective.entitlements.includes(entitlement)) {
        const requiredPlan: XsectPlan = PLAN_ENTITLEMENTS.pro.includes(entitlement) ? "pro" : "pro_plus";
        res.status(402).json({ error: "This feature requires an upgraded plan.", entitlement, currentPlan: effective.plan, requiredPlan });
        return;
      }
      next();
    } catch (error) { next(error); }
  };
}
