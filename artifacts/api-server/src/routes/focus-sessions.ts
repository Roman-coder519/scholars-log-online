import { Router, type IRouter } from "express";
import { db, focusSessionsTable } from "@workspace/db";
import { CreateFocusSessionBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/focus-sessions", async (_req, res): Promise<void> => {
  const sessions = await db.select().from(focusSessionsTable).orderBy(focusSessionsTable.completedAt);
  res.json(sessions.map(s => ({ ...s, completedAt: s.completedAt.toISOString() })));
});

router.post("/focus-sessions", async (req, res): Promise<void> => {
  const parsed = CreateFocusSessionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: String(parsed.error) }); return; }
  const [session] = await db.insert(focusSessionsTable).values(parsed.data).returning();
  res.status(201).json({ ...session, completedAt: session.completedAt.toISOString() });
});

export default router;
