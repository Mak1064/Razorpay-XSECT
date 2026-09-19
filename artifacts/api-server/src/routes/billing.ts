import { db, planOverridesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { BILLING_PLANS } from "../billing";
import { PLAN_ENTITLEMENTS } from "../lib/entitlements";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/billing/plans", (_req, res) => {
  res.json({ plans: BILLING_PLANS });
});

router.get("/billing/subscription", requireAuth, async (req, res, next) => {
  try {
    const { userId } = req as AuthenticatedRequest;
    const override = (await db.select().from(planOverridesTable).where(eq(planOverridesTable.userId, userId)).limit(1))[0];
    const plan = override?.plan ?? "free";
    res.json({
      plan,
      billingCycle: null,
      status: override ? "demo_override" : "free",
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      entitlements: PLAN_ENTITLEMENTS[plan],
    });
  } catch (error) {
    next(error);
  }
});

export default router;