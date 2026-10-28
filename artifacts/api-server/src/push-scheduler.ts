import { db, settingsTable, tasksTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { sendPushToAll } from "./routes/push.js";

const PRAYER_NAMES: Record<string, string> = {
  fajr: "Fajr", dhuhr: "Dhuhr", asr: "Asr", maghrib: "Maghrib", isha: "Isha",
};

function parseTimeToMinutes(timeStr: string): number | null {
  try {
    const upper = timeStr.toUpperCase().trim();
    const isPM = upper.includes("PM");
    const isAM = upper.includes("AM");
    const clean = upper.replace("AM", "").replace("PM", "").trim();
    const [hStr, mStr] = clean.split(":");
    let h = parseInt(hStr, 10);
    const m = parseInt(mStr || "0", 10);
    if (isPM && h !== 12) h += 12;
    if (isAM && h === 12) h = 0;
    return h * 60 + m;
  } catch { return null; }
}

let lastCheckMin = -1;

async function checkAndSend() {
  const now = new Date();
  const currentMin = now.getHours() * 60 + now.getMinutes();
  if (currentMin === lastCheckMin) return;
  lastCheckMin = currentMin;

  try {
    const settings = await db.select().from(settingsTable);
    if (!settings[0]?.showPrayerTimes) return;

    // Check prayer times from settings (using custom or computed values)
    // The computed prayer times are fetched via the prayer-times API route
    // Here we just check custom times if set
    const s = settings[0];
    const prayers: Record<string, string | null | undefined> = {
      fajr: s.customFajr,
      dhuhr: s.customDhuhr,
      asr: s.customAsr,
      maghrib: s.customMaghrib,
      isha: s.customIsha,
    };

    for (const [key, time] of Object.entries(prayers)) {
      if (!time) continue;
      const mins = parseTimeToMinutes(time);
      if (mins === null) continue;
      // Fire if within 1 minute window
      if (Math.abs(currentMin - mins) <= 0) {
        const name = PRAYER_NAMES[key] ?? key;
        await sendPushToAll(`🕌 ${name} Prayer`, `It's time for ${name} prayer`, "/");
      }
    }

    // 30-min task reminders
    const today = now.toISOString().split("T")[0];
    const tasks = await db.select().from(tasksTable).where(eq(tasksTable.dueDate, today));
    for (const task of tasks) {
      if (task.status === "completed" || !task.scheduledTime) continue;
      const taskMin = parseTimeToMinutes(task.scheduledTime);
      if (taskMin === null) continue;
      if (Math.abs(currentMin - (taskMin - 30)) <= 0) {
        await sendPushToAll("📚 Task Due Soon", `"${task.title}" is due in 30 minutes`, "/tasks");
      }
    }
  } catch (err) {
    // Silently ignore scheduler errors
  }
}

export function startPushScheduler() {
  // Check every 30 seconds
  setInterval(checkAndSend, 30_000);
  checkAndSend();
}
