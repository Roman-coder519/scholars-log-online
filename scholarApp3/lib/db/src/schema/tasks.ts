import { pgTable, serial, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const priorityEnum = pgEnum("priority", ["low", "medium", "high"]);
export const taskStatusEnum = pgEnum("task_status", ["pending", "in_progress", "completed"]);

export const tasksTable = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  subject: text("subject"),
  priority: priorityEnum("priority").notNull().default("medium"),
  status: taskStatusEnum("status").notNull().default("pending"),
  dueDate: text("due_date"),
  scheduledTime: text("scheduled_time"),
  estimatedMinutes: integer("estimated_minutes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTaskSchema = createInsertSchema(tasksTable).omit({ id: true, createdAt: true });
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasksTable.$inferSelect;
