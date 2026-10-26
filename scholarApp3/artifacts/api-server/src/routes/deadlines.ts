import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, deadlinesTable } from "@workspace/db";
import {
  CreateDeadlineBody,
  UpdateDeadlineBody,
  UpdateDeadlineParams,
  DeleteDeadlineParams,
  ListDeadlinesResponse,
  UpdateDeadlineResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function mapDeadline(d: typeof deadlinesTable.$inferSelect) {
  return { ...d, createdAt: d.createdAt.toISOString() };
}

router.get("/deadlines", async (_req, res): Promise<void> => {
  const deadlines = await db.select().from(deadlinesTable);
  res.json(ListDeadlinesResponse.parse(deadlines.map(mapDeadline)));
});

router.post("/deadlines", async (req, res): Promise<void> => {
  const parsed = CreateDeadlineBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [deadline] = await db.insert(deadlinesTable).values(parsed.data).returning();
  res.status(201).json(mapDeadline(deadline));
});

router.put("/deadlines/:id", async (req, res): Promise<void> => {
  const params = UpdateDeadlineParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateDeadlineBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [deadline] = await db.update(deadlinesTable).set(parsed.data).where(eq(deadlinesTable.id, params.data.id)).returning();
  if (!deadline) { res.status(404).json({ error: "Deadline not found" }); return; }
  res.json(UpdateDeadlineResponse.parse(mapDeadline(deadline)));
});

router.delete("/deadlines/:id", async (req, res): Promise<void> => {
  const params = DeleteDeadlineParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  await db.delete(deadlinesTable).where(eq(deadlinesTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
