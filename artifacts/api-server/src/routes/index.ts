import { Router, type IRouter } from "express";
import healthRouter from "./health";
import tasksRouter from "./tasks";
import habitsRouter from "./habits";
import gradesRouter from "./grades";
import transactionsRouter from "./transactions";
import deadlinesRouter from "./deadlines";
import dashboardRouter from "./dashboard";
import settingsRouter from "./settings";
import focusSessionsRouter from "./focus-sessions";
import openaiChatRouter from "./openai-chat";
import flashcardsRouter from "./flashcards";
import notesRouter from "./notes";
import badgesRouter from "./badges";
import pushRouter from "./push";

const router: IRouter = Router();

router.use(healthRouter);
router.use(tasksRouter);
router.use(habitsRouter);
router.use(gradesRouter);
router.use(deadlinesRouter);
router.use(dashboardRouter);
router.use(settingsRouter);
router.use(focusSessionsRouter);
router.use(openaiChatRouter);
router.use(flashcardsRouter);
router.use(notesRouter);
router.use(badgesRouter);
router.use(pushRouter);
router.use(transactionsRouter);

export default router;
