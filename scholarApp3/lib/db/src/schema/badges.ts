import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const badgesTable = pgTable("badges", {
  id: serial("id").primaryKey(),
  type: text("type").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  earnedAt: timestamp("earned_at"),
  seen: boolean("seen").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Badge = typeof badgesTable.$inferSelect;

// Badge definitions seeded into the DB
export const BADGE_DEFINITIONS = [
  { type: "first_task",    name: "First Step",       description: "Complete your first task",                    icon: "✅" },
  { type: "streak_3",     name: "On a Roll",        description: "Study 3 days in a row",                      icon: "🔥" },
  { type: "streak_7",     name: "Week Warrior",     description: "Study 7 days in a row",                      icon: "⚡" },
  { type: "streak_30",    name: "Iron Scholar",     description: "Study 30 days in a row",                     icon: "🏆" },
  { type: "focus_5",      name: "Focused",          description: "Complete 5 focus sessions",                  icon: "🎯" },
  { type: "focus_10",     name: "Focus Master",     description: "Complete 10 focus sessions",                 icon: "🧠" },
  { type: "focus_25",     name: "Deep Worker",      description: "Complete 25 focus sessions",                 icon: "💎" },
  { type: "habit_week",   name: "Habit Hero",       description: "Complete all habits for 7 consecutive days", icon: "💪" },
  { type: "grade_a",      name: "Top Grade",        description: "Score 90% or above on an assignment",        icon: "⭐" },
  { type: "note_taker",   name: "Note Taker",       description: "Create 5 notes",                             icon: "📝" },
  { type: "flashcard_10", name: "Card Collector",   description: "Create 10 flashcards",                       icon: "🃏" },
  { type: "flashcard_study","name": "Memory Ace",   description: "Study a complete flashcard set",             icon: "🎓" },
] satisfies { type: string; name: string; description: string; icon: string }[];

export const badgeTypeSchema = z.enum([
  "first_task", "streak_3", "streak_7", "streak_30",
  "focus_5", "focus_10", "focus_25", "habit_week",
  "grade_a", "note_taker", "flashcard_10", "flashcard_study",
]);
