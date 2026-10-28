import { pgTable, serial, text, integer, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const habitFrequencyEnum = pgEnum("habit_frequency", ["daily", "weekly"]);

export const habitsTable = pgTable("habits", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  frequency: habitFrequencyEnum("frequency").notNull().default("daily"),
  targetDays: integer("target_days").notNull().default(7),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const habitCompletionsTable = pgTable("habit_completions", {
  id: serial("id").primaryKey(),
  habitId: integer("habit_id").notNull().references(() => habitsTable.id, { onDelete: "cascade" }),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
  completedDate: text("completed_date").notNull(),
});

export const insertHabitSchema = createInsertSchema(habitsTable).omit({ id: true, createdAt: true, currentStreak: true, longestStreak: true });
export type InsertHabit = z.infer<typeof insertHabitSchema>;
export type Habit = typeof habitsTable.$inferSelect;
export type HabitCompletion = typeof habitCompletionsTable.$inferSelect;
