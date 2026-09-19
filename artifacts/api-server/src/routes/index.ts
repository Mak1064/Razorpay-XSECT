import { Router, type IRouter } from "express";
import healthRouter from "./health";
import billingRouter from "./billing";
import socialRouter from "./social";
import storageRouter from "./storage";
import profilesRouter from "./profiles";
import xsectsRouter from "./xsects";
import opportunitiesRouter from "./opportunities";
import networkRouter from "./network";
import aiRouter from "./ai";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(billingRouter);
router.use(socialRouter);
router.use(storageRouter);
router.use(profilesRouter);
router.use(xsectsRouter);
router.use(opportunitiesRouter);
router.use(networkRouter);
router.use(aiRouter);
router.use(adminRouter);

export default router;
