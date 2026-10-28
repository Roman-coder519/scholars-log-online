import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, habitsTable, habitCompletionsTable } from "@workspace/db";
import {
  CreateHabitBody,
  UpdateHabitBody,
  UpdateHabitParams,
  DeleteHabitParams,
  CompleteHabitParams,
  UncompleteHabitParams,
  ListHabitsResponse,
  GetTodayHabitsResponse,
  UpdateHabitResponse,
  CompleteHabitResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function mapHabit(h: typeof habitsTable.$inferSelect) {
  return { ...h, createdAt: h.createdAt.toISOString() };
}

router.get("/habits", async (_req, res): Promise<void> => {
  const habits = await db.select().from(habitsTable);
  res.json(ListHabitsResponse.parse(habits.map(mapHabit)));
});

router.get("/habits/today", async (_req, res): Promise<void> => {
  const today = getToday();
  const habits = await db.select().from(habitsTable);
  const completions = await db.select().from(habitCompletionsTable).where(eq(habitCompletionsTable.completedDate, today));
  const completedIds = new Set(completions.map((c) => c.habitId));
  const result = habits.map((h) => ({ ...mapHabit(h), completedToday: completedIds.has(h.id) }));
  res.json(GetTodayHabitsResponse.parse(result));
});

router.post("/habits", async (req, res): Promise<void> => {
  const parsed = CreateHabitBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [habit] = await db.insert(habitsTable).values({ ...parsed.data, currentStreak: 0, longestStreak: 0 }).returning();
  res.status(201).json(mapHabit(habit));
});

router.put("/habits/:id", async (req, res): Promise<void> => {
  const params = UpdateHabitParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateHabitBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [habit] = await db.update(habitsTable).set(parsed.data).where(eq(habitsTable.id, params.data.id)).returning();
  if (!habit) { res.status(404).json({ error: "Habit not found" }); return; }
  res.json(UpdateHabitResponse.parse(mapHabit(habit)));
});

router.delete("/habits/:id", async (req, res): Promise<void> => {
  const params = DeleteHabitParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  await db.delete(habitsTable).where(eq(habitsTable.id, params.data.id));
  res.sendStatus(204);
});

router.post("/habits/:id/complete", async (req, res): Promise<void> => {
  const params = CompleteHabitParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const today = getToday();
  const existing = await db.select().from(habitCompletionsTable)
    .where(and(eq(habitCompletionsTable.habitId, params.data.id), eq(habitCompletionsTable.completedDate, today)));
  if (existing.length > 0) {
    res.json(CompleteHabitResponse.parse({ ...existing[0], completedAt: existing[0].completedAt.toISOString() }));
    return;
  }
  const [completion] = await db.insert(habitCompletionsTable)
    .values({ habitId: params.data.id, completedDate: today })
    .returning();
  // Update streak
  const habit = await db.select().from(habitsTable).where(eq(habitsTable.id, params.data.id));
  if (habit[0]) {
    const newStreak = habit[0].currentStreak + 1;
    await db.update(habitsTable).set({
      currentStreak: newStreak,
      longestStreak: Math.max(habit[0].longestStreak, newStreak),
    }).where(eq(habitsTable.id, params.data.id));
  }
  res.json(CompleteHabitResponse.parse({ ...completion, completedAt: completion.completedAt.toISOString() }));
});

router.post("/habits/:id/uncomplete", async (req, res): Promise<void> => {
  const params = UncompleteHabitParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const today = getToday();
  await db.delete(habitCompletionsTable)
    .where(and(eq(habitCompletionsTable.habitId, params.data.id), eq(habitCompletionsTable.completedDate, today)));
  const habit = await db.select().from(habitsTable).where(eq(habitsTable.id, params.data.id));
  if (habit[0] && habit[0].currentStreak > 0) {
    await db.update(habitsTable).set({ currentStreak: habit[0].currentStreak - 1 }).where(eq(habitsTable.id, params.data.id));
  }
  res.sendStatus(204);
});

export default router;
