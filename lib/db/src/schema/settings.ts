import { pgTable, serial, text, boolean, integer } from "drizzle-orm/pg-core";

export const settingsTable = pgTable("settings", {
  id: serial("id").primaryKey(),
  userName: text("user_name").notNull().default("Student"),
  country: text("country").notNull().default("United States"),
  city: text("city").notNull().default("New York"),
  prayerCalculationMethod: integer("prayer_calculation_method").notNull().default(2),
  showPrayerTimes: boolean("show_prayer_times").notNull().default(true),
  weekStartsOn: text("week_starts_on").notNull().default("monday"),
  theme: text("theme").notNull().default("light"),
  customFajr: text("custom_fajr"),
  customDhuhr: text("custom_dhuhr"),
  customAsr: text("custom_asr"),
  customMaghrib: text("custom_maghrib"),
  customIsha: text("custom_isha"),
});

export type Settings = typeof settingsTable.$inferSelect;
