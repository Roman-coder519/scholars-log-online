import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, flashcardSetsTable, flashcardsTable } from "@workspace/db";
import { z } from "zod";

const router: IRouter = Router();

const SetBody = z.object({ title: z.string().min(1), subject: z.string().nullable().optional(), description: z.string().nullable().optional() });
const CardBody = z.object({ front: z.string().min(1), back: z.string().min(1) });
const IdParam = z.object({ id: z.coerce.number().int().positive() });
const SetCardParams = z.object({ setId: z.coerce.number().int().positive(), cardId: z.coerce.number().int().positive() });

function mapSet(s: typeof flashcardSetsTable.$inferSelect) {
  return { ...s, createdAt: s.createdAt.toISOString(), updatedAt: s.updatedAt.toISOString(), subject: s.subject ?? null, description: s.description ?? null };
}
function mapCard(c: typeof flashcardsTable.$inferSelect) {
  return { ...c, createdAt: c.createdAt.toISOString() };
}

// List sets
router.get("/flashcard-sets", async (_req, res): Promise<void> => {
  const sets = await db.select().from(flashcardSetsTable).orderBy(flashcardSetsTable.createdAt);
  res.json(sets.map(mapSet));
});

// Create set
router.post("/flashcard-sets", async (req, res): Promise<void> => {
  const parsed = SetBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [s] = await db.insert(flashcardSetsTable).values(parsed.data).returning();
  res.status(201).json(mapSet(s));
});

// Get set with cards
router.get("/flashcard-sets/:id", async (req, res): Promise<void> => {
  const { id } = IdParam.parse(req.params);
  const [s] = await db.select().from(flashcardSetsTable).where(eq(flashcardSetsTable.id, id));
  if (!s) { res.status(404).json({ error: "Not found" }); return; }
  const cards = await db.select().from(flashcardsTable).where(eq(flashcardsTable.setId, id)).orderBy(flashcardsTable.createdAt);
  res.json({ ...mapSet(s), cards: cards.map(mapCard) });
});

// Update set
router.put("/flashcard-sets/:id", async (req, res): Promise<void> => {
  const { id } = IdParam.parse(req.params);
  const parsed = SetBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [s] = await db.update(flashcardSetsTable).set({ ...parsed.data, updatedAt: new Date() }).where(eq(flashcardSetsTable.id, id)).returning();
  if (!s) { res.status(404).json({ error: "Not found" }); return; }
  res.json(mapSet(s));
});

// Delete set
router.delete("/flashcard-sets/:id", async (req, res): Promise<void> => {
  const { id } = IdParam.parse(req.params);
  await db.delete(flashcardSetsTable).where(eq(flashcardSetsTable.id, id));
  res.sendStatus(204);
});

// Add card to set
router.post("/flashcard-sets/:id/cards", async (req, res): Promise<void> => {
  const { id } = IdParam.parse(req.params);
  const parsed = CardBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [card] = await db.insert(flashcardsTable).values({ ...parsed.data, setId: id }).returning();
  // Update card count
  await db.update(flashcardSetsTable)
    .set({ cardCount: sql`${flashcardSetsTable.cardCount} + 1`, updatedAt: new Date() })
    .where(eq(flashcardSetsTable.id, id));
  res.status(201).json(mapCard(card));
});

// Update card
router.put("/flashcard-sets/:setId/cards/:cardId", async (req, res): Promise<void> => {
  const { cardId } = SetCardParams.parse(req.params);
  const parsed = CardBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [card] = await db.update(flashcardsTable).set(parsed.data).where(eq(flashcardsTable.id, cardId)).returning();
  if (!card) { res.status(404).json({ error: "Not found" }); return; }
  res.json(mapCard(card));
});

// Delete card
router.delete("/flashcard-sets/:setId/cards/:cardId", async (req, res): Promise<void> => {
  const { setId, cardId } = SetCardParams.parse(req.params);
  await db.delete(flashcardsTable).where(eq(flashcardsTable.id, cardId));
  await db.update(flashcardSetsTable)
    .set({ cardCount: sql`GREATEST(${flashcardSetsTable.cardCount} - 1, 0)`, updatedAt: new Date() })
    .where(eq(flashcardSetsTable.id, setId));
  res.sendStatus(204);
});

export default router;
