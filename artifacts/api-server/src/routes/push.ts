import { Router, type IRouter } from "express";
import webpush from "web-push";
import { db, pushSubscriptionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:scholars-log@example.com";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

const SubscribeBody = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string(), auth: z.string() }),
});

// Get the VAPID public key for the client
router.get("/push/vapid-public-key", (_req, res): void => {
  res.json({ publicKey: VAPID_PUBLIC_KEY || "" });
});

// Subscribe to push notifications
router.post("/push/subscribe", async (req, res): Promise<void> => {
  const parsed = SubscribeBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { endpoint, keys } = parsed.data;
  try {
    await db.insert(pushSubscriptionsTable)
      .values({ endpoint, p256dh: keys.p256dh, auth: keys.auth })
      .onConflictDoUpdate({ target: pushSubscriptionsTable.endpoint, set: { p256dh: keys.p256dh, auth: keys.auth } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to save subscription" });
  }
});

// Unsubscribe
router.post("/push/unsubscribe", async (req, res): Promise<void> => {
  const { endpoint } = z.object({ endpoint: z.string() }).parse(req.body);
  await db.delete(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.endpoint, endpoint));
  res.json({ success: true });
});

// Send a push to all subscribers (used by the scheduler)
export async function sendPushToAll(title: string, body: string, url = "/") {
  const subs = await db.select().from(pushSubscriptionsTable);
  const dead: number[] = [];
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title, body, url })
      );
    } catch {
      dead.push(sub.id);
    }
  }
  if (dead.length > 0) {
    for (const id of dead) {
      await db.delete(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.id, id));
    }
  }
}

export default router;
