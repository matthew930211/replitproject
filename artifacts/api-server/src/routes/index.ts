import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import reportsRouter from "./reports";
import messagesRouter from "./messages";
import presenceRouter from "./presence";
import profilesRouter from "./profiles";
import statsRouter from "./stats";
import storageRouter from "./storage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(usersRouter);
router.use(reportsRouter);
router.use(messagesRouter);
router.use(presenceRouter);
router.use(profilesRouter);
router.use(statsRouter);
router.use(storageRouter);

export default router;
