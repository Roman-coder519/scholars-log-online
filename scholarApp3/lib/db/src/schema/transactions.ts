import { pgTable, serial, text, timestamp, numeric, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const transactionTypeEnum = pgEnum("transaction_type", ["income", "expense"]);

export const transactionsTable = pgTable("transactions", {
  id: serial("id").primaryKey(),
  type: transactionTypeEnum("type").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  note: text("note"),
  date: text("date").notNull(), // YYYY-MM-DD
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTransactionSchema = createInsertSchema(transactionsTable).omit({ id: true, createdAt: true });
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactionsTable.$inferSelect;
