import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const flashcardSetsTable = pgTable("flashcard_sets", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  subject: text("subject"),
  description: text("description"),
  cardCount: integer("card_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const flashcardsTable = pgTable("flashcards", {
  id: serial("id").primaryKey(),
  setId: integer("set_id").notNull().references(() => flashcardSetsTable.id, { onDelete: "cascade" }),
  front: text("front").notNull(),
  back: text("back").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertFlashcardSetSchema = createInsertSchema(flashcardSetsTable).omit({ id: true, createdAt: true, updatedAt: true, cardCount: true });
export const insertFlashcardSchema = createInsertSchema(flashcardsTable).omit({ id: true, createdAt: true });

export type InsertFlashcardSet = z.infer<typeof insertFlashcardSetSchema>;
export type FlashcardSet = typeof flashcardSetsTable.$inferSelect;
export type InsertFlashcard = z.infer<typeof insertFlashcardSchema>;
export type Flashcard = typeof flashcardsTable.$inferSelect;
