import { db, planOverridesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { PLAN_ENTITLEMENTS } from "../lib/entitlements";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/access/plan", requireAuth, async (req, res, next) => {
  try {
    const { userId } = req as AuthenticatedRequest;
    const override = (await db.select().from(planOverridesTable).where(eq(planOverridesTable.userId, userId)).limit(1))[0];
    const plan = override?.plan ?? "free";
    res.json({
      plan,
      source: override ? "override" : "free",
      entitlements: PLAN_ENTITLEMENTS[plan],
    });
  } catch (error) {
    next(error);
  }
});

export default router;