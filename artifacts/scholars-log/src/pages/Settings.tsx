import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useGetSettings, useUpdateSettings, getGetSettingsQueryKey } from "@workspace/api-client-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/ThemeProvider";
import { User, Moon, Clock, ChevronDown, ChevronUp, Edit2 } from "lucide-react";
import { COUNTRIES } from "@/lib/countries";
import { cn } from "@/lib/utils";

const schema = z.object({
  userName: z.string().min(1),
  country: z.string().min(1),
  prayerCalculationMethod: z.string(),
  showPrayerTimes: z.boolean(),
  weekStartsOn: z.enum(["sunday", "monday"]),
  theme: z.enum(["light", "dark", "system"]),
  customFajr: z.string().optional(),
  customDhuhr: z.string().optional(),
  customAsr: z.string().optional(),
  customMaghrib: z.string().optional(),
  customIsha: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

const PRAYER_KEYS = ["customFajr", "customDhuhr", "customAsr", "customMaghrib", "customIsha"] as const;
const PRAYER_LABELS: Record<string, string> = { customFajr: "Fajr", customDhuhr: "Dhuhr", customAsr: "Asr", customMaghrib: "Maghrib", customIsha: "Isha" };

function Section({ icon: Icon, title, description, children }: {
  icon: React.ElementType; title: string; description?: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="px-6 py-4 border-b border-border flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="font-display font-semibold text-sm">{title}</p>
          {description && <p className="text-[11px] text-muted-foreground">{description}</p>}
        </div>
      </div>
      <div className="px-6 py-5 space-y-5">{children}</div>
    </div>
  );
}

export default function Settings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { setTheme } = useTheme();
  const [showCustomTimes, setShowCustomTimes] = useState(false);

  const { data: settings, isLoading } = useGetSettings({ query: { queryKey: getGetSettingsQueryKey() } });
  const updateSettings = useUpdateSettings();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      userName: "Student", country: "United States",
      prayerCalculationMethod: "2", showPrayerTimes: true,
      weekStartsOn: "monday", theme: "light",
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        userName: settings.userName,
        country: settings.country ?? "United States",
        prayerCalculationMethod: settings.prayerCalculationMethod.toString(),
        showPrayerTimes: settings.showPrayerTimes,
        weekStartsOn: settings.weekStartsOn as "sunday" | "monday",
        theme: settings.theme as "light" | "dark" | "system",
        customFajr: settings.customFajr ?? "",
        customDhuhr: settings.customDhuhr ?? "",
        customAsr: settings.customAsr ?? "",
        customMaghrib: settings.customMaghrib ?? "",
        customIsha: settings.customIsha ?? "",
      });
      // Show custom times section if any are set
      if (settings.customFajr || settings.customDhuhr || settings.customAsr || settings.customMaghrib || settings.customIsha) {
        setShowCustomTimes(true);
      }
    }
  }, [settings]);

  function onSubmit(values: FormValues) {
    const country = COUNTRIES.find(c => c.name === values.country);
    updateSettings.mutate({
      data: {
        userName: values.userName,
        country: values.country,
        city: country?.city ?? "New York",
        prayerCalculationMethod: parseInt(values.prayerCalculationMethod),
        showPrayerTimes: values.showPrayerTimes,
        weekStartsOn: values.weekStartsOn,
        theme: values.theme,
        customFajr: values.customFajr || null,
        customDhuhr: values.customDhuhr || null,
        customAsr: values.customAsr || null,
        customMaghrib: values.customMaghrib || null,
        customIsha: values.customIsha || null,
      }
    }, {
      onSuccess: () => {
        toast({ title: "Settings saved" });
        queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
        setTheme(values.theme);
      },
      onError: () => toast({ title: "Failed to save", variant: "destructive" }),
    });
  }

  if (isLoading) {
    return (
      <div className="p-8 max-w-2xl mx-auto space-y-4">
        {[1, 2, 3].map(i => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-7">
        <h1 className="font-display text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Customize your Scholar's Log experience</p>
      </motion.div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          {/* Profile */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Section icon={User} title="Profile">
              <FormField control={form.control} name="userName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Name</FormLabel>
                  <FormControl><Input placeholder="Student" className="max-w-xs" data-testid="input-user-name" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </Section>
          </motion.div>

          {/* Prayer Times */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Section icon={Clock} title="Prayer Times" description="Configure prayer time calculations">
              <FormField control={form.control} name="showPrayerTimes" render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <div>
                    <FormLabel className="cursor-pointer">Show Prayer Times</FormLabel>
                    <FormDescription className="text-xs">Display on the dashboard</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-prayer-times" />
                  </FormControl>
                </FormItem>
              )} />

              <FormField control={form.control} name="country" render={({ field }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                  <FormDescription className="text-xs">Prayer times are calculated based on your country's coordinates</FormDescription>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="max-w-sm" data-testid="select-country">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-72">
                      {COUNTRIES.map(c => (
                        <SelectItem key={c.name} value={c.name}>{c.flag} {c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="prayerCalculationMethod" render={({ field }) => (
                <FormItem>
                  <FormLabel>Calculation Method</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="max-w-sm" data-testid="select-prayer-method"><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="1">Muslim World League</SelectItem>
                      <SelectItem value="2">Islamic Society of North America (ISNA)</SelectItem>
                      <SelectItem value="3">Egyptian General Authority</SelectItem>
                      <SelectItem value="4">Umm Al-Qura University, Makkah</SelectItem>
                      <SelectItem value="5">University of Islamic Sciences, Karachi</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Custom Prayer Times */}
              <div className="border border-border rounded-lg overflow-hidden">
                <button type="button" onClick={() => setShowCustomTimes(!showCustomTimes)}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <Edit2 className="w-4 h-4 text-primary" />
                    <span>Custom Prayer Times</span>
                    <span className="text-xs text-muted-foreground">(override calculated times)</span>
                  </div>
                  {showCustomTimes ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>

                {showCustomTimes && (
                  <div className="px-4 pb-4 pt-1 grid grid-cols-2 sm:grid-cols-3 gap-3 border-t border-border">
                    {PRAYER_KEYS.map((key) => (
                      <FormField key={key} control={form.control} name={key} render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">{PRAYER_LABELS[key]}</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. 5:30 AM" className="h-8 text-sm" {...field} value={field.value ?? ""} />
                          </FormControl>
                        </FormItem>
                      )} />
                    ))}
                    <div className="col-span-full">
                      <p className="text-[11px] text-muted-foreground">Format: HH:MM AM/PM (e.g. "5:30 AM", "1:15 PM"). Leave blank to use calculated time.</p>
                    </div>
                  </div>
                )}
              </div>
            </Section>
          </motion.div>

          {/* Appearance */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Section icon={Moon} title="Appearance" description="Theme and display preferences">
              <FormField control={form.control} name="theme" render={({ field }) => (
                <FormItem>
                  <FormLabel>Theme</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="max-w-xs" data-testid="select-theme"><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="weekStartsOn" render={({ field }) => (
                <FormItem>
                  <FormLabel>Week Starts On</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="max-w-xs" data-testid="select-week-start"><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="sunday">Sunday</SelectItem>
                      <SelectItem value="monday">Monday</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </Section>
          </motion.div>

          <Button type="submit" className="w-full h-10 font-semibold" disabled={updateSettings.isPending} data-testid="button-save-settings">
            {updateSettings.isPending ? "Saving…" : "Save Changes"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
