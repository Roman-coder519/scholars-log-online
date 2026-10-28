import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, badgesTable, tasksTable, focusSessionsTable, notesTable, flashcardsTable, gradesTable, habitCompletionsTable, habitsTable, BADGE_DEFINITIONS } from "@workspace/db";
import { z } from "zod";

const router: IRouter = Router();

function mapBadge(b: typeof badgesTable.$inferSelect) {
  return { ...b, earnedAt: b.earnedAt?.toISOString() ?? null, createdAt: b.createdAt.toISOString() };
}

// Ensure all badge rows exist in DB (seed if missing)
async function seedBadges() {
  for (const def of BADGE_DEFINITIONS) {
    const existing = await db.select().from(badgesTable).where(eq(badgesTable.type, def.type));
    if (existing.length === 0) {
      await db.insert(badgesTable).values({ type: def.type, name: def.name, description: def.description, icon: def.icon });
    }
  }
}

// List all badges
router.get("/badges", async (_req, res): Promise<void> => {
  await seedBadges();
  const badges = await db.select().from(badgesTable).orderBy(badgesTable.createdAt);
  res.json(badges.map(mapBadge));
});

// Check and award newly earned badges
router.post("/badges/check", async (_req, res): Promise<void> => {
  await seedBadges();
  const newlyEarned: (typeof badgesTable.$inferSelect)[] = [];
  const now = new Date();

  async function award(type: string) {
    const [badge] = await db.select().from(badgesTable).where(eq(badgesTable.type, type));
    if (!badge || badge.earnedAt) return; // already earned
    const [updated] = await db.update(badgesTable).set({ earnedAt: now, seen: false }).where(eq(badgesTable.type, type)).returning();
    if (updated) newlyEarned.push(updated);
  }

  // first_task: complete at least 1 task
  const completedTasks = await db.select().from(tasksTable).where(eq(tasksTable.status, "completed"));
  if (completedTasks.length >= 1) await award("first_task");

  // focus sessions
  const sessions = await db.select().from(focusSessionsTable);
  if (sessions.length >= 5) await award("focus_5");
  if (sessions.length >= 10) await award("focus_10");
  if (sessions.length >= 25) await award("focus_25");

  // grade_a: score >= 90%
  const grades = await db.select().from(gradesTable);
  const hasA = grades.some(g => (g.score / g.maxScore) >= 0.9);
  if (hasA) await award("grade_a");

  // note_taker: 5+ notes
  const notes = await db.select().from(notesTable);
  if (notes.length >= 5) await award("note_taker");

  // flashcard_10: 10+ total flashcards
  const cards = await db.select().from(flashcardsTable);
  if (cards.length >= 10) await award("flashcard_10");

  // streak badges: check habit streaks
  const habits = await db.select().from(habitsTable);
  const maxStreak = habits.reduce((m, h) => Math.max(m, h.currentStreak), 0);
  if (maxStreak >= 3) await award("streak_3");
  if (maxStreak >= 7) await award("streak_7");
  if (maxStreak >= 30) await award("streak_30");

  // habit_week: any habit completed on 7+ consecutive days
  if (maxStreak >= 7) await award("habit_week");

  res.json(newlyEarned.map(mapBadge));
});

// Mark badge seen
router.post("/badges/:type/seen", async (req, res): Promise<void> => {
  const { type } = z.object({ type: z.string() }).parse(req.params);
  const [badge] = await db.update(badgesTable).set({ seen: true }).where(eq(badgesTable.type, type)).returning();
  if (!badge) { res.status(404).json({ error: "Not found" }); return; }
  res.json(mapBadge(badge));
});

export default router;
