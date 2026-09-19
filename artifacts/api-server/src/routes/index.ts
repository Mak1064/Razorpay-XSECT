import { Router, type IRouter } from "express";
import healthRouter from "./health";
import billingRouter from "./billing";
import socialRouter from "./social";
import storageRouter from "./storage";
import profilesRouter from "./profiles";

const router: IRouter = Router();

router.use(healthRouter);
router.use(billingRouter);
router.use(socialRouter);
router.use(storageRouter);
router.use(profilesRouter);

export default router;
