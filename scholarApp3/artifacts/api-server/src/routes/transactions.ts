import { Router, type IRouter } from "express";
import { db, transactionsTable } from "@workspace/db";
import { eq, desc, and, like, sql } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();

const CreateTransactionSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Amount must be a valid decimal"),
  category: z.string().min(1),
  description: z.string().min(1),
  note: z.string().nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
});

// GET /transactions/summary — must come before /:id
router.get("/transactions/summary", async (req, res) => {
  const months = parseInt(String(req.query["months"] ?? "6"), 10);

  const allTx = await db
    .select()
    .from(transactionsTable)
    .orderBy(desc(transactionsTable.date));

  // Compute date boundary
  const now = new Date();
  const cutoff = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const recent = allTx.filter((t) => t.date >= cutoffStr);

  // Monthly buckets
  const monthMap = new Map<string, { income: number; expenses: number }>();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthMap.set(key, { income: 0, expenses: 0 });
  }

  let totalIncome = 0;
  let totalExpenses = 0;
  const expCatMap = new Map<string, { total: number; count: number }>();
  const incCatMap = new Map<string, { total: number; count: number }>();

  for (const t of recent) {
    const monthKey = t.date.slice(0, 7);
    const amount = parseFloat(t.amount);
    const bucket = monthMap.get(monthKey);
    if (t.type === "income") {
      totalIncome += amount;
      if (bucket) bucket.income += amount;
      const cat = incCatMap.get(t.category) ?? { total: 0, count: 0 };
      cat.total += amount;
      cat.count += 1;
      incCatMap.set(t.category, cat);
    } else {
      totalExpenses += amount;
      if (bucket) bucket.expenses += amount;
      const cat = expCatMap.get(t.category) ?? { total: 0, count: 0 };
      cat.total += amount;
      cat.count += 1;
      expCatMap.set(t.category, cat);
    }
  }

  const monthlyData = Array.from(monthMap.entries()).map(([month, v]) => ({
    month,
    income: v.income.toFixed(2),
    expenses: v.expenses.toFixed(2),
  }));

  const expensesByCategory = Array.from(expCatMap.entries())
    .map(([category, v]) => ({ category, total: v.total.toFixed(2), count: v.count }))
    .sort((a, b) => parseFloat(b.total) - parseFloat(a.total));

  const incomeByCategory = Array.from(incCatMap.entries())
    .map(([category, v]) => ({ category, total: v.total.toFixed(2), count: v.count }))
    .sort((a, b) => parseFloat(b.total) - parseFloat(a.total));

  res.json({
    totalIncome: totalIncome.toFixed(2),
    totalExpenses: totalExpenses.toFixed(2),
    netBalance: (totalIncome - totalExpenses).toFixed(2),
    monthlyData,
    expensesByCategory,
    incomeByCategory,
  });
});

// GET /transactions
router.get("/transactions", async (req, res) => {
  const { type, month, category } = req.query as Record<string, string | undefined>;

  const rows = await db
    .select()
    .from(transactionsTable)
    .orderBy(desc(transactionsTable.date), desc(transactionsTable.createdAt));

  let filtered = rows;
  if (type) filtered = filtered.filter((t) => t.type === type);
  if (month) filtered = filtered.filter((t) => t.date.startsWith(month));
  if (category) filtered = filtered.filter((t) => t.category === category);

  res.json(filtered);
});

// POST /transactions
router.post("/transactions", async (req, res) => {
  const parsed = CreateTransactionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
    return;
  }
  const [created] = await db
    .insert(transactionsTable)
    .values({
      ...parsed.data,
      note: parsed.data.note ?? null,
    })
    .returning();
  res.status(201).json(created);
});

// PUT /transactions/:id
router.put("/transactions/:id", async (req, res) => {
  const id = parseInt(req.params["id"] ?? "", 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = CreateTransactionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
    return;
  }
  const [updated] = await db
    .update(transactionsTable)
    .set({ ...parsed.data, note: parsed.data.note ?? null })
    .where(eq(transactionsTable.id, id))
    .returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

// DELETE /transactions/:id
router.delete("/transactions/:id", async (req, res) => {
  const id = parseInt(req.params["id"] ?? "", 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(transactionsTable).where(eq(transactionsTable.id, id));
  res.status(204).send();
});

export default router;
