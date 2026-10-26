import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, notesTable } from "@workspace/db";
import { z } from "zod";

const router: IRouter = Router();

const NoteBody = z.object({
  title: z.string().min(1),
  content: z.string().optional().default(""),
  subject: z.string().nullable().optional(),
  color: z.string().optional().default("default"),
  pinned: z.boolean().optional().default(false),
});
const IdParam = z.object({ id: z.coerce.number().int().positive() });

function mapNote(n: typeof notesTable.$inferSelect) {
  return { ...n, createdAt: n.createdAt.toISOString(), updatedAt: n.updatedAt.toISOString(), subject: n.subject ?? null };
}

router.get("/notes", async (_req, res): Promise<void> => {
  const notes = await db.select().from(notesTable).orderBy(desc(notesTable.pinned), desc(notesTable.updatedAt));
  res.json(notes.map(mapNote));
});

router.post("/notes", async (req, res): Promise<void> => {
  const parsed = NoteBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [note] = await db.insert(notesTable).values(parsed.data).returning();
  res.status(201).json(mapNote(note));
});

router.put("/notes/:id", async (req, res): Promise<void> => {
  const { id } = IdParam.parse(req.params);
  const parsed = NoteBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [note] = await db.update(notesTable).set({ ...parsed.data, updatedAt: new Date() }).where(eq(notesTable.id, id)).returning();
  if (!note) { res.status(404).json({ error: "Not found" }); return; }
  res.json(mapNote(note));
});

router.delete("/notes/:id", async (req, res): Promise<void> => {
  const { id } = IdParam.parse(req.params);
  await db.delete(notesTable).where(eq(notesTable.id, id));
  res.sendStatus(204);
});

export default router;
