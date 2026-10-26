import { Router, type IRouter } from "express";
import { db, settingsTable } from "@workspace/db";
import { UpdateSettingsBody, GetSettingsResponse, UpdateSettingsResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/settings", async (_req, res): Promise<void> => {
  const settings = await db.select().from(settingsTable);
  if (settings.length === 0) {
    const [created] = await db.insert(settingsTable).values({}).returning();
    res.json(GetSettingsResponse.parse(created));
    return;
  }
  res.json(GetSettingsResponse.parse(settings[0]));
});

router.put("/settings", async (req, res): Promise<void> => {
  const parsed = UpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const settings = await db.select().from(settingsTable);
  if (settings.length === 0) {
    const [created] = await db.insert(settingsTable).values(parsed.data).returning();
    res.json(UpdateSettingsResponse.parse(created));
    return;
  }
  const [updated] = await db.update(settingsTable).set(parsed.data).returning();
  res.json(UpdateSettingsResponse.parse(updated));
});

export default router;
