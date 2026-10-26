import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const focusSessionsTable = pgTable("focus_sessions", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id"),
  taskTitle: text("task_title").notNull(),
  subject: text("subject"),
  durationMinutes: integer("duration_minutes").notNull(),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
});

export type FocusSession = typeof focusSessionsTable.$inferSelect;
