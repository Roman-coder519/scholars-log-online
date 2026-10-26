import { useEffect, useRef, useState, useCallback } from "react";

export type NotifPerm = "default" | "granted" | "denied";

const VAPID_PUBLIC_KEY = "BBBk1prlnTmiqXR6YEowhuzs_lAfvV23zBBGYR2nrFxD_pkvS5DUQIxnhqgAJ2IWVqj-SsQgBTMzU9w0ddmxmUk";

interface ScheduledNotif {
  title: string;
  body: string;
  tag: string;
  fireAt: number;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

function parseTimeToDate(timeStr: string, dateStr: string): Date | null {
  try {
    const base = new Date(dateStr + "T00:00:00");
    base.setHours(0, 0, 0, 0);
    const upper = timeStr.toUpperCase().trim();
    const isPM = upper.includes("PM");
    const isAM = upper.includes("AM");
    const clean = upper.replace("AM", "").replace("PM", "").trim();
    const [hStr, mStr] = clean.split(":");
    let h = parseInt(hStr, 10);
    const m = parseInt(mStr || "0", 10);
    if (isPM && h !== 12) h += 12;
    if (isAM && h === 12) h = 0;
    base.setHours(h, m, 0, 0);
    return isNaN(base.getTime()) ? null : base;
  } catch {
    return null;
  }
}

/** Show a notification. Tries SW registration API first (works locked screen),
 *  falls back to direct Notification API. */
async function showNotification(title: string, body: string, tag: string): Promise<void> {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;

  // Try via SW registration (most reliable — works even when screen is off)
  if ("serviceWorker" in navigator) {
    try {
      const reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 2000)),
      ]);
      // Use reg.showNotification directly — no postMessage roundtrip needed
      await (reg as ServiceWorkerRegistration).showNotification(title, {
        body,
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        tag,
        silent: false,
      } as NotificationOptions);
      return;
    } catch {
      // SW not ready — fall through to direct API
    }
  }

  // Direct Notification API fallback
  try {
    new Notification(title, { body, icon: "/icon-192.png", tag });
  } catch {}
}

export function usePWA() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [notifPerm, setNotifPerm] = useState<NotifPerm>(
    typeof Notification !== "undefined" ? (Notification.permission as NotifPerm) : "denied"
  );
  const [pushSubscribed, setPushSubscribed] = useState(false);

  const timerIds = useRef<ReturnType<typeof setTimeout>[]>([]);
  const pendingNotifs = useRef<ScheduledNotif[]>([]);

  // ── Register service worker ───────────────────────────────────────────────
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then(async (reg) => {
        reg.update();
        const existing = await reg.pushManager.getSubscription().catch(() => null);
        setPushSubscribed(!!existing);
      })
      .catch((err) => {
        // SW registration may fail in dev sandboxed iframes — that's ok
        console.debug("SW registration failed (non-critical):", err?.message);
      });
  }, []);

  // ── Online / offline ──────────────────────────────────────────────────────
  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  // ── Subscribe to Web Push ─────────────────────────────────────────────────
  const subscribeToPush = useCallback(async (): Promise<boolean> => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
    try {
      const reg = await navigator.serviceWorker.ready;
      const keyArray = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      const applicationServerKey = keyArray.buffer.slice(
        keyArray.byteOffset,
        keyArray.byteOffset + keyArray.byteLength
      ) as ArrayBuffer;

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      const p256dh = subscription.getKey("p256dh");
      const auth = subscription.getKey("auth");
      if (!p256dh || !auth) throw new Error("Missing push keys");

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: btoa(String.fromCharCode(...new Uint8Array(p256dh))),
            auth: btoa(String.fromCharCode(...new Uint8Array(auth))),
          },
        }),
      });
      setPushSubscribed(true);
      return true;
    } catch (err) {
      console.debug("Push subscription failed (non-critical):", err);
      return false;
    }
  }, []);

  // ── Local timer scheduling ────────────────────────────────────────────────
  const scheduleAll = useCallback((notifs: ScheduledNotif[]) => {
    timerIds.current.forEach(clearTimeout);
    timerIds.current = [];
    pendingNotifs.current = notifs;

    const now = Date.now();
    notifs.forEach((n) => {
      const delay = n.fireAt - now;
      if (delay <= 0 || delay > 24 * 60 * 60 * 1000) return;
      const id = setTimeout(() => showNotification(n.title, n.body, n.tag), delay);
      timerIds.current.push(id);
    });
  }, []);

  // Reschedule timers when page becomes visible (timers drift in background)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && pendingNotifs.current.length > 0) {
        scheduleAll(pendingNotifs.current);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [scheduleAll]);

  useEffect(() => {
    return () => { timerIds.current.forEach(clearTimeout); };
  }, []);

  // ── Request permission ────────────────────────────────────────────────────
  async function requestNotificationPermission(): Promise<NotifPerm> {
    if (typeof Notification === "undefined") return "denied";
    if (Notification.permission === "granted") {
      setNotifPerm("granted");
      return "granted";
    }

    // Request permission — must be triggered by a user gesture
    const result = await Notification.requestPermission();
    setNotifPerm(result as NotifPerm);

    if (result === "granted") {
      // Attempt Web Push subscription (server-sent push, works with screen off)
      const pushOk = await subscribeToPush();

      // Show a welcome notification to confirm it's working
      setTimeout(() => {
        showNotification(
          "🎉 Scholar's Log",
          pushOk
            ? "Notifications enabled! You'll get prayer times and task alerts."
            : "Notifications enabled! You'll get alerts while the app is open.",
          "welcome"
        );
      }, 600);
    }
    return result as NotifPerm;
  }

  // ── Prayer time notifications ─────────────────────────────────────────────
  function schedulePrayerNotifications(prayers: Record<string, string>, date: string) {
    if (Notification.permission !== "granted") return;
    const names: Record<string, string> = {
      fajr: "Fajr", dhuhr: "Dhuhr", asr: "Asr", maghrib: "Maghrib", isha: "Isha",
    };
    const notifs: ScheduledNotif[] = [];
    for (const [key, timeStr] of Object.entries(prayers)) {
      if (!timeStr || !(key in names)) continue;
      const d = parseTimeToDate(timeStr, date);
      if (!d) continue;
      notifs.push({
        title: `🕌 ${names[key]} Prayer`,
        body: `It is time for ${names[key]} prayer (${timeStr})`,
        tag: `prayer-${key}-${date}`,
        fireAt: d.getTime(),
      });
    }
    scheduleAll(notifs);
  }

  // ── Task notifications ────────────────────────────────────────────────────
  function scheduleTaskNotifications(
    tasks: Array<{ title: string; dueTime?: string | null; dueDate?: string | null }>
  ) {
    if (Notification.permission !== "granted") return;
    const notifs: ScheduledNotif[] = [];
    for (const task of tasks) {
      if (!task.dueTime || !task.dueDate) continue;
      const d = parseTimeToDate(task.dueTime, task.dueDate);
      if (!d) continue;
      notifs.push({
        title: "📚 Task Due Soon",
        body: `"${task.title}" is due in 30 minutes`,
        tag: `task-${task.title}-${task.dueDate}`,
        fireAt: d.getTime() - 30 * 60 * 1000,
      });
    }
    scheduleAll([...pendingNotifs.current, ...notifs]);
  }

  return {
    isOnline,
    notifPerm,
    pushSubscribed,
    requestNotificationPermission,
    schedulePrayerNotifications,
    scheduleTaskNotifications,
    subscribeToPush,
  };
}
