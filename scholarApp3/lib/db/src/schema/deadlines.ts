import { pgTable, serial, text, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const deadlinePriorityEnum = pgEnum("deadline_priority", ["low", "medium", "high", "critical"]);

export const deadlinesTable = pgTable("deadlines", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  subject: text("subject"),
  dueDate: text("due_date").notNull(),
  dueTime: text("due_time"),
  priority: deadlinePriorityEnum("priority").notNull().default("medium"),
  completed: boolean("completed").notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDeadlineSchema = createInsertSchema(deadlinesTable).omit({ id: true, createdAt: true });
export type InsertDeadline = z.infer<typeof insertDeadlineSchema>;
export type Deadline = typeof deadlinesTable.$inferSelect;
