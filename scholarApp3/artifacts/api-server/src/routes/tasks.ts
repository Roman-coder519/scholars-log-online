import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, tasksTable } from "@workspace/db";
import {
  CreateTaskBody,
  UpdateTaskBody,
  GetTaskParams,
  UpdateTaskParams,
  DeleteTaskParams,
  ListTasksQueryParams,
  ListTasksResponse,
  GetTodayTasksResponse,
  GetTaskResponse,
  UpdateTaskResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/tasks", async (req, res): Promise<void> => {
  const parsed = ListTasksQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { status, date } = parsed.data;
  let query = db.select().from(tasksTable);
  const conditions = [];
  if (status) conditions.push(eq(tasksTable.status, status));
  if (date) conditions.push(eq(tasksTable.dueDate, date));
  const tasks = conditions.length
    ? await db.select().from(tasksTable).where(and(...conditions))
    : await db.select().from(tasksTable);
  res.json(ListTasksResponse.parse(tasks.map(mapTask)));
});

router.get("/tasks/today", async (_req, res): Promise<void> => {
  const today = new Date().toISOString().split("T")[0];
  const tasks = await db.select().from(tasksTable).where(eq(tasksTable.dueDate, today));
  res.json(GetTodayTasksResponse.parse(tasks.map(mapTask)));
});

router.post("/tasks", async (req, res): Promise<void> => {
  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [task] = await db.insert(tasksTable).values(parsed.data).returning();
  res.status(201).json(GetTaskResponse.parse(mapTask(task)));
});

router.get("/tasks/:id", async (req, res): Promise<void> => {
  const params = GetTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, params.data.id));
  if (!task) { res.status(404).json({ error: "Task not found" }); return; }
  res.json(GetTaskResponse.parse(mapTask(task)));
});

router.put("/tasks/:id", async (req, res): Promise<void> => {
  const params = UpdateTaskParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateTaskBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [task] = await db.update(tasksTable).set(parsed.data).where(eq(tasksTable.id, params.data.id)).returning();
  if (!task) { res.status(404).json({ error: "Task not found" }); return; }
  res.json(UpdateTaskResponse.parse(mapTask(task)));
});

router.delete("/tasks/:id", async (req, res): Promise<void> => {
  const params = DeleteTaskParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  await db.delete(tasksTable).where(eq(tasksTable.id, params.data.id));
  res.sendStatus(204);
});

function mapTask(t: typeof tasksTable.$inferSelect) {
  return {
    ...t,
    createdAt: t.createdAt.toISOString(),
  };
}

export default router;
