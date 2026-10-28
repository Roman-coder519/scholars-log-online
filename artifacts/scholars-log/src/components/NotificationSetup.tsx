import { useEffect, useRef } from "react";
import { useGetPrayerTimes, useListTasks } from "@workspace/api-client-react";

interface Props {
  schedulePrayerNotifications: (prayers: Record<string, string>, date: string) => void;
  scheduleTaskNotifications: (tasks: Array<{ title: string; dueTime?: string | null; dueDate?: string | null }>) => void;
  notifPerm: string;
}

export default function NotificationSetup({
  schedulePrayerNotifications,
  scheduleTaskNotifications,
  notifPerm,
}: Props) {
  const scheduled = useRef(false);
  const today = new Date().toISOString().split("T")[0];

  const prayerQuery = useGetPrayerTimes();
  const tasksQuery = useListTasks({ status: "pending" });

  useEffect(() => {
    if (notifPerm !== "granted") return;
    if (scheduled.current) return;
    if (!prayerQuery.data) return;

    const prayers = prayerQuery.data as unknown as Record<string, string>;
    const keys = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;
    const filtered: Record<string, string> = {};
    keys.forEach((k) => {
      if (prayers[k]) filtered[k] = prayers[k];
    });

    if (Object.keys(filtered).length > 0) {
      schedulePrayerNotifications(filtered, today);
      scheduled.current = true;
    }
  }, [prayerQuery.data, notifPerm, today]);

  useEffect(() => {
    if (notifPerm !== "granted") return;
    if (!tasksQuery.data) return;

    const tasksWithTimes = tasksQuery.data
      .filter((t) => t.status !== "completed" && t.scheduledTime && t.dueDate)
      .map((t) => ({ title: t.title, dueTime: t.scheduledTime, dueDate: t.dueDate }));

    if (tasksWithTimes.length > 0) {
      scheduleTaskNotifications(tasksWithTimes);
    }
  }, [tasksQuery.data, notifPerm]);

  return null;
}
