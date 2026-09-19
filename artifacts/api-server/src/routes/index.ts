import { Router, type IRouter } from "express";
import healthRouter from "./health";
import accessRouter from "./access";
import socialRouter from "./social";
import storageRouter from "./storage";
import profilesRouter from "./profiles";
import xsectsRouter from "./xsects";
import opportunitiesRouter from "./opportunities";
import networkRouter from "./network";
import aiRouter from "./ai";
import adminRouter from "./admin";
import privacyRouter from "./privacy";

const router: IRouter = Router();

router.use(healthRouter);
router.use(accessRouter);
router.use(socialRouter);
router.use(storageRouter);
router.use(profilesRouter);
router.use(xsectsRouter);
router.use(opportunitiesRouter);
router.use(networkRouter);
router.use(aiRouter);
router.use(adminRouter);
router.use(privacyRouter);

export default router;
