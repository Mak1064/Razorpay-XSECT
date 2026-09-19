import { CreateBillingCheckoutBody } from "@workspace/api-zod";
import { db, planOverridesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { Router, type IRouter, type Request } from "express";
import {
  createCheckout,
  createPortal,
  getSubscriptionForUser,
  listBillingCatalog,
} from "../billing";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../middlewares/requireAuth";
import { PLAN_ENTITLEMENTS } from "../lib/entitlements";

const router: IRouter = Router();

function requestOrigin(req: Request): string {
  const forwardedProto = req.get("x-forwarded-proto")?.split(",")[0];
  const protocol = forwardedProto ?? req.protocol;
  return `${protocol}://${req.get("host")}`;
}

router.get("/billing/plans", async (_req, res, next) => {
  try {
    res.json({ plans: await listBillingCatalog() });
  } catch (error) {
    next(error);
  }
});

router.get("/billing/subscription", requireAuth, async (req, res, next) => {
  try {
    const { userId } = req as AuthenticatedRequest;
    const override = (await db.select().from(planOverridesTable).where(eq(planOverridesTable.userId, userId)).limit(1))[0];
    if (override) {
      res.json({
        plan: override.plan,
        billingCycle: "monthly",
        status: "demo_override",
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        entitlements: PLAN_ENTITLEMENTS[override.plan],
      });
      return;
    }
    res.json(await getSubscriptionForUser(userId));
  } catch (error) {
    next(error);
  }
});

router.post("/billing/checkout", requireAuth, async (req, res, next) => {
  try {
    const parsed = CreateBillingCheckoutBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid plan or billing cycle." });
      return;
    }

    const { userId } = req as AuthenticatedRequest;
    const url = await createCheckout(
      userId,
      parsed.data.plan,
      parsed.data.cycle,
      requestOrigin(req),
    );
    res.json({ url });
  } catch (error) {
    next(error);
  }
});

router.post("/billing/portal", requireAuth, async (req, res, next) => {
  try {
    const { userId } = req as AuthenticatedRequest;
    const url = await createPortal(userId, requestOrigin(req));
    res.json({ url });
  } catch (error) {
    next(error);
  }
});

export default router;