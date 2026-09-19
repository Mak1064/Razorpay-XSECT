import { CreateBillingCheckoutBody } from "@workspace/api-zod";
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