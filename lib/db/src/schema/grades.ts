import { pgTable, serial, text, real, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const gradeTypeEnum = pgEnum("grade_type", ["exam", "quiz", "assignment", "project", "other"]);

export const gradesTable = pgTable("grades", {
  id: serial("id").primaryKey(),
  subject: text("subject").notNull(),
  assignmentName: text("assignment_name").notNull(),
  score: real("score").notNull(),
  maxScore: real("max_score").notNull(),
  type: gradeTypeEnum("type").notNull().default("assignment"),
  date: text("date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertGradeSchema = createInsertSchema(gradesTable).omit({ id: true, createdAt: true });
export type InsertGrade = z.infer<typeof insertGradeSchema>;
export type Grade = typeof gradesTable.$inferSelect;
