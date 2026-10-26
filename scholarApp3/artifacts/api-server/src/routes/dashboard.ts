import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, tasksTable, habitsTable, habitCompletionsTable, deadlinesTable } from "@workspace/db";
import {
  GetDashboardSummaryResponse,
  GetPrayerTimesResponse,
  GetWeekSummaryResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const QUOTES = [
  "Success is the sum of small efforts, repeated day in and day out.",
  "The secret of getting ahead is getting started.",
  "An investment in knowledge pays the best interest.",
  "Education is the most powerful weapon which you can use to change the world.",
  "The beautiful thing about learning is that no one can take it away from you.",
  "Seek knowledge from the cradle to the grave.",
  "Whoever follows a path in pursuit of knowledge, Allah will make easy for him a path to Paradise.",
  "Read in the name of your Lord who created.",
  "Your time is limited, so don't waste it living someone else's life.",
  "Strive for progress, not perfection.",
];

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function computePrayerTimes(date: Date, lat: number, lng: number, method: number) {
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);
  const declination = (23.45 * Math.PI / 180) * Math.sin((2 * Math.PI / 365) * (dayOfYear - 81));
  const equationOfTime = -7.655 * Math.sin((2 * Math.PI / 365) * (dayOfYear - 1)) + 9.873 * Math.sin((4 * Math.PI / 365) * (dayOfYear + 10));
  const timezone = -date.getTimezoneOffset() / 60;
  const noon = 12 + (lng / 15 - timezone) - equationOfTime / 60;

  function angleTime(angle: number): number {
    const cosAngle = (Math.sin(angle * Math.PI / 180) - Math.sin(lat * Math.PI / 180) * Math.sin(declination)) /
      (Math.cos(lat * Math.PI / 180) * Math.cos(declination));
    if (cosAngle > 1 || cosAngle < -1) return noon;
    return Math.acos(cosAngle) * 180 / Math.PI / 15;
  }

  const fajrAngle = method === 1 ? 15 : method === 3 ? 18 : 15;
  const ishaAngle = method === 1 ? 15 : method === 3 ? 17 : 15;

  const fajrTime = noon - angleTime(fajrAngle);
  const sunriseTime = noon - angleTime(0.833);
  const asrShadow = 1;
  const asrAngle = Math.atan(1 / (asrShadow + Math.tan(Math.abs(lat * Math.PI / 180 - declination)))) * 180 / Math.PI;
  const asrTime = noon + Math.acos((Math.sin(asrAngle * Math.PI / 180) - Math.sin(lat * Math.PI / 180) * Math.sin(declination)) / (Math.cos(lat * Math.PI / 180) * Math.cos(declination))) * 180 / Math.PI / 15;
  const sunsetTime = noon + angleTime(0.833);
  const ishaTime = sunsetTime + angleTime(ishaAngle);
  const dhuhrTime = noon + 0.017;
  const maghribTime = sunsetTime + 2 / 60;

  function toTimeStr(decimal: number): string {
    const hours = Math.floor(decimal);
    const minutes = Math.round((decimal - hours) * 60);
    const h = ((hours % 24) + 24) % 24;
    const isPM = h >= 12;
    const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${displayH}:${minutes.toString().padStart(2, "0")} ${isPM ? "PM" : "AM"}`;
  }

  return {
    fajr: toTimeStr(fajrTime),
    dhuhr: toTimeStr(dhuhrTime),
    asr: toTimeStr(asrTime),
    maghrib: toTimeStr(maghribTime),
    isha: toTimeStr(ishaTime),
    sunrise: sunriseTime,
  };
}

// Country → coordinates lookup (capital/major city)
const COUNTRY_COORDS: Record<string, { lat: number; lng: number; city: string }> = {
  "afghanistan": { lat: 34.5, lng: 69.2, city: "Kabul" },
  "albania": { lat: 41.3, lng: 19.8, city: "Tirana" },
  "algeria": { lat: 36.7, lng: 3.0, city: "Algiers" },
  "australia": { lat: -33.9, lng: 151.2, city: "Sydney" },
  "azerbaijan": { lat: 40.4, lng: 49.9, city: "Baku" },
  "bahrain": { lat: 26.2, lng: 50.6, city: "Manama" },
  "bangladesh": { lat: 23.8, lng: 90.4, city: "Dhaka" },
  "bosnia": { lat: 43.8, lng: 18.4, city: "Sarajevo" },
  "brazil": { lat: -15.8, lng: -47.9, city: "Brasilia" },
  "brunei": { lat: 4.9, lng: 114.9, city: "Bandar Seri Begawan" },
  "canada": { lat: 43.7, lng: -79.4, city: "Toronto" },
  "china": { lat: 39.9, lng: 116.4, city: "Beijing" },
  "egypt": { lat: 30.0, lng: 31.2, city: "Cairo" },
  "ethiopia": { lat: 9.0, lng: 38.7, city: "Addis Ababa" },
  "france": { lat: 48.9, lng: 2.4, city: "Paris" },
  "germany": { lat: 52.5, lng: 13.4, city: "Berlin" },
  "ghana": { lat: 5.6, lng: -0.2, city: "Accra" },
  "india": { lat: 28.6, lng: 77.2, city: "New Delhi" },
  "indonesia": { lat: -6.2, lng: 106.8, city: "Jakarta" },
  "iran": { lat: 35.7, lng: 51.4, city: "Tehran" },
  "iraq": { lat: 33.3, lng: 44.4, city: "Baghdad" },
  "jordan": { lat: 31.9, lng: 35.9, city: "Amman" },
  "kazakhstan": { lat: 51.2, lng: 71.4, city: "Astana" },
  "kosovo": { lat: 42.7, lng: 21.2, city: "Pristina" },
  "kuwait": { lat: 29.4, lng: 47.9, city: "Kuwait City" },
  "kyrgyzstan": { lat: 42.9, lng: 74.6, city: "Bishkek" },
  "lebanon": { lat: 33.9, lng: 35.5, city: "Beirut" },
  "libya": { lat: 32.9, lng: 13.2, city: "Tripoli" },
  "malaysia": { lat: 3.1, lng: 101.7, city: "Kuala Lumpur" },
  "maldives": { lat: 4.2, lng: 73.5, city: "Male" },
  "mali": { lat: 12.6, lng: -8.0, city: "Bamako" },
  "mauritania": { lat: 18.1, lng: -15.9, city: "Nouakchott" },
  "morocco": { lat: 34.0, lng: -6.8, city: "Rabat" },
  "netherlands": { lat: 52.4, lng: 4.9, city: "Amsterdam" },
  "niger": { lat: 13.5, lng: 2.1, city: "Niamey" },
  "nigeria": { lat: 9.1, lng: 7.4, city: "Abuja" },
  "oman": { lat: 23.6, lng: 58.6, city: "Muscat" },
  "pakistan": { lat: 33.7, lng: 73.0, city: "Islamabad" },
  "palestine": { lat: 31.9, lng: 35.2, city: "Ramallah" },
  "qatar": { lat: 25.3, lng: 51.5, city: "Doha" },
  "saudi arabia": { lat: 24.7, lng: 46.7, city: "Riyadh" },
  "senegal": { lat: 14.7, lng: -17.4, city: "Dakar" },
  "singapore": { lat: 1.3, lng: 103.8, city: "Singapore" },
  "somalia": { lat: 2.0, lng: 45.3, city: "Mogadishu" },
  "south africa": { lat: -33.9, lng: 18.4, city: "Cape Town" },
  "sudan": { lat: 15.6, lng: 32.5, city: "Khartoum" },
  "sweden": { lat: 59.3, lng: 18.1, city: "Stockholm" },
  "syria": { lat: 33.5, lng: 36.3, city: "Damascus" },
  "tajikistan": { lat: 38.6, lng: 68.8, city: "Dushanbe" },
  "tunisia": { lat: 36.8, lng: 10.2, city: "Tunis" },
  "turkey": { lat: 41.0, lng: 28.9, city: "Istanbul" },
  "turkmenistan": { lat: 37.9, lng: 58.4, city: "Ashgabat" },
  "uganda": { lat: 0.3, lng: 32.6, city: "Kampala" },
  "united arab emirates": { lat: 25.2, lng: 55.3, city: "Dubai" },
  "united kingdom": { lat: 51.5, lng: -0.1, city: "London" },
  "united states": { lat: 40.7, lng: -74.0, city: "New York" },
  "uzbekistan": { lat: 41.3, lng: 69.2, city: "Tashkent" },
  "yemen": { lat: 15.4, lng: 44.2, city: "Sanaa" },
  // Legacy city names for backward compatibility
  "new york": { lat: 40.7128, lng: -74.006, city: "New York" },
  "london": { lat: 51.5074, lng: -0.1278, city: "London" },
  "dubai": { lat: 25.2048, lng: 55.2708, city: "Dubai" },
  "riyadh": { lat: 24.7136, lng: 46.6753, city: "Riyadh" },
  "cairo": { lat: 30.0444, lng: 31.2357, city: "Cairo" },
  "istanbul": { lat: 41.0082, lng: 28.9784, city: "Istanbul" },
  "karachi": { lat: 24.8607, lng: 67.0011, city: "Karachi" },
  "lahore": { lat: 31.5204, lng: 74.3587, city: "Lahore" },
  "dhaka": { lat: 23.8103, lng: 90.4125, city: "Dhaka" },
  "kuala lumpur": { lat: 3.1390, lng: 101.6869, city: "Kuala Lumpur" },
  "jakarta": { lat: -6.2088, lng: 106.8456, city: "Jakarta" },
  "toronto": { lat: 43.6532, lng: -79.3832, city: "Toronto" },
};

function getCoords(countryOrCity: string) {
  const key = countryOrCity.toLowerCase().trim();
  return COUNTRY_COORDS[key] ?? { lat: 40.7128, lng: -74.006, city: "New York" };
}

router.get("/dashboard/prayer-times", async (_req, res): Promise<void> => {
  const now = new Date();

  let country = "United States";
  let method = 2;
  let customTimes: Record<string, string | null | undefined> = {};

  try {
    const { settingsTable } = await import("@workspace/db");
    const settings = await db.select().from(settingsTable);
    if (settings[0]) {
      country = settings[0].country ?? settings[0].city ?? "United States";
      method = settings[0].prayerCalculationMethod;
      customTimes = {
        fajr: settings[0].customFajr,
        dhuhr: settings[0].customDhuhr,
        asr: settings[0].customAsr,
        maghrib: settings[0].customMaghrib,
        isha: settings[0].customIsha,
      };
    }
  } catch {}

  const coords = getCoords(country);
  const computed = computePrayerTimes(now, coords.lat, coords.lng, method);

  // Apply custom overrides
  const times = {
    fajr: customTimes.fajr || computed.fajr,
    dhuhr: customTimes.dhuhr || computed.dhuhr,
    asr: customTimes.asr || computed.asr,
    maghrib: customTimes.maghrib || computed.maghrib,
    isha: customTimes.isha || computed.isha,
  };

  res.json(GetPrayerTimesResponse.parse({
    ...times,
    city: coords.city,
    nextPrayer: null,
    nextPrayerTime: null,
  }));
});

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const today = getToday();

  const todayTasks = await db.select().from(tasksTable).where(eq(tasksTable.dueDate, today));
  const todayTasksCompleted = todayTasks.filter((t) => t.status === "completed").length;

  const habits = await db.select().from(habitsTable);
  const completions = await db.select().from(habitCompletionsTable).where(eq(habitCompletionsTable.completedDate, today));
  const todayHabitsCompleted = completions.length;

  const upcomingDeadlines = await db.select().from(deadlinesTable);
  const upcoming = upcomingDeadlines
    .filter((d) => !d.completed && d.dueDate >= today)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 5)
    .map((d) => ({ ...d, createdAt: d.createdAt.toISOString() }));

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
  const weekTasks = await db.select().from(tasksTable);
  const weekTasksInRange = weekTasks.filter((t) => t.dueDate && t.dueDate >= sevenDaysAgo && t.dueDate <= today);
  const weekRate = weekTasksInRange.length > 0
    ? Math.round((weekTasksInRange.filter((t) => t.status === "completed").length / weekTasksInRange.length) * 100)
    : 0;

  const activeStreaks = habits.filter((h) => h.currentStreak > 0).length;
  const motivationalQuote = QUOTES[Math.floor(Math.random() * QUOTES.length)];

  res.json(GetDashboardSummaryResponse.parse({
    todayTasksTotal: todayTasks.length,
    todayTasksCompleted,
    todayHabitsTotal: habits.length,
    todayHabitsCompleted,
    upcomingDeadlines: upcoming,
    weeklyTaskCompletionRate: weekRate,
    activeStreaks,
    motivationalQuote,
  }));
});

router.get("/dashboard/week", async (_req, res): Promise<void> => {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const date = d.toISOString().split("T")[0];
    const dayTasks = await db.select().from(tasksTable).where(eq(tasksTable.dueDate, date));
    const dayCompletions = await db.select().from(habitCompletionsTable).where(eq(habitCompletionsTable.completedDate, date));
    const habits = await db.select().from(habitsTable);
    days.push({
      date,
      tasksCompleted: dayTasks.filter((t) => t.status === "completed").length,
      tasksTotal: dayTasks.length,
      habitsCompleted: dayCompletions.length,
      habitsTotal: habits.length,
    });
  }
  res.json(GetWeekSummaryResponse.parse({ days }));
});

export default router;
