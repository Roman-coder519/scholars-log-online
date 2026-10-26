import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Zap, TrendingUp, Target, Flame, Calendar } from "lucide-react";
import { format } from "date-fns";
import {
  useGetDashboardSummary, useGetPrayerTimes, useGetTodayTasks,
  getGetDashboardSummaryQueryKey, getGetTodayTasksQueryKey
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import TaskDialog from "@/components/TaskDialog";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const fadeUp = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

function StatCard({ label, value, sub, color = "primary", icon: Icon }: {
  label: string; value: string | number; sub?: string;
  color?: "primary" | "blue" | "amber" | "purple"; icon: React.ElementType;
}) {
  const colors = {
    primary: "text-primary bg-primary/8",
    blue: "text-chart-2 bg-chart-2/8",
    amber: "text-chart-3 bg-chart-3/8",
    purple: "text-chart-4 bg-chart-4/8",
  };
  const valueColors = {
    primary: "text-primary",
    blue: "text-chart-2",
    amber: "text-chart-3",
    purple: "text-chart-4",
  };
  return (
    <motion.div variants={fadeUp} className="bg-card rounded-xl border border-border p-5 flex items-start gap-4">
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", colors[color])}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className={cn("text-2xl font-display font-bold mt-0.5", valueColors[color])}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </motion.div>
  );
}

function PrayerRow({ name, time, isNext }: { name: string; time: string; isNext: boolean }) {
  return (
    <div className={cn(
      "flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors",
      isNext
        ? "bg-primary/8 border border-primary/15"
        : "hover:bg-muted/50"
    )} data-testid={`prayer-${name.toLowerCase()}`}>
      <div className="flex items-center gap-2.5">
        {isNext && <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />}
        <span className={cn("text-sm", isNext ? "font-semibold text-primary" : "text-foreground/70")}>{name}</span>
      </div>
      <span className={cn("text-sm tabular-nums font-mono", isNext ? "font-bold text-primary" : "text-muted-foreground")}>{time}</span>
    </div>
  );
}

function ProgressRing({ value, size = 64, stroke = 6, color = "hsl(var(--primary))" }: {
  value: number; size?: number; stroke?: number; color?: string;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} />
      <motion.circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={stroke} strokeLinecap="round"
        style={{ strokeDasharray: circ }}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ * (1 - value / 100) }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
    </svg>
  );
}

export default function Dashboard() {
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const today = new Date();

  const summary = useGetDashboardSummary({ query: { queryKey: getGetDashboardSummaryQueryKey() } });
  const prayer = useGetPrayerTimes({ query: { queryKey: ["prayer-times"] as const } });
  const todayTasks = useGetTodayTasks({ query: { queryKey: getGetTodayTasksQueryKey() } });

  const s = summary.data;
  const p = prayer.data;
  const tasks = todayTasks.data ?? [];

  const taskPct = s && s.todayTasksTotal > 0 ? Math.round((s.todayTasksCompleted / s.todayTasksTotal) * 100) : 0;
  const habitPct = s && s.todayHabitsTotal > 0 ? Math.round((s.todayHabitsCompleted / s.todayHabitsTotal) * 100) : 0;

  const prayers = p ? [
    { name: "Fajr", time: p.fajr }, { name: "Dhuhr", time: p.dhuhr },
    { name: "Asr", time: p.asr }, { name: "Maghrib", time: p.maghrib }, { name: "Isha", time: p.isha },
  ] : [];

  const currentHour = today.getHours() + today.getMinutes() / 60;
  const nextPrayer = p?.nextPrayer ?? (currentHour < 6 ? "Fajr" : currentHour < 13 ? "Dhuhr" : currentHour < 16 ? "Asr" : currentHour < 19 ? "Maghrib" : "Isha");

  const scheduledTasks = tasks.filter(t => t.scheduledTime).sort((a, b) => (a.scheduledTime ?? "").localeCompare(b.scheduledTime ?? ""));

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between mb-6 md:mb-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1 hidden sm:block">
            {format(today, "EEEE · MMMM d, yyyy")}
          </p>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">Good {currentHour < 12 ? "morning" : currentHour < 17 ? "afternoon" : "evening"} 👋</h1>
          <p className="text-muted-foreground text-sm mt-1 hidden sm:block">Here's what's on your plate today.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2 text-sm h-9 hidden sm:flex" data-testid="button-focus-mode">
            <Zap className="w-3.5 h-3.5" />
            Focus Mode
          </Button>
          <Button size="sm" className="gap-1.5 text-sm h-9" onClick={() => setTaskDialogOpen(true)} data-testid="button-add-task">
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add Task</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </motion.div>

      {/* ── Stat cards ─────────────────────────────────────────────────────── */}
      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
        <StatCard label="Tasks Today" value={`${s?.todayTasksCompleted ?? 0}/${s?.todayTasksTotal ?? 0}`} sub={`${taskPct}% complete`} icon={Target} color="primary" />
        <StatCard label="Habits Done" value={`${s?.todayHabitsCompleted ?? 0}/${s?.todayHabitsTotal ?? 0}`} sub={`${habitPct}% complete`} icon={Flame} color="amber" />
        <StatCard label="Weekly Rate" value={`${s?.weeklyTaskCompletionRate ?? 0}%`} sub="completion rate" icon={TrendingUp} color="blue" />
        <StatCard label="Active Streaks" value={s?.activeStreaks ?? 0} sub="habits on track" icon={Calendar} color="purple" />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── Left column ───────────────────────────────────────────────────── */}
        <div className="lg:col-span-3 space-y-6">
          {/* Progress rings */}
          <motion.div variants={fadeUp} initial="hidden" animate="show" className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-display font-semibold text-base">Today's Progress</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Your focus for today</p>
              </div>
            </div>
            <div className="flex items-center gap-8">
              <div className="flex flex-col items-center gap-2">
                <div className="relative">
                  <ProgressRing value={taskPct} size={80} stroke={7} color="hsl(var(--primary))" />
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-primary" data-testid="text-task-percentage">{taskPct}%</span>
                </div>
                <p className="text-xs text-muted-foreground font-medium">Tasks</p>
                <p className="text-xs text-foreground/60" data-testid="text-task-count">{s?.todayTasksCompleted ?? 0} of {s?.todayTasksTotal ?? 0}</p>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="relative">
                  <ProgressRing value={habitPct} size={80} stroke={7} color="hsl(var(--chart-3))" />
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-chart-3">{habitPct}%</span>
                </div>
                <p className="text-xs text-muted-foreground font-medium">Habits</p>
                <p className="text-xs text-foreground/60">{s?.todayHabitsCompleted ?? 0} of {s?.todayHabitsTotal ?? 0}</p>
              </div>
              {/* Week mini bars */}
              <div className="flex-1 ml-4">
                <p className="text-xs text-muted-foreground mb-2 font-medium">This week</p>
                <div className="flex items-end gap-1.5 h-12">
                  {["M","T","W","T","F","S","S"].map((d, i) => {
                    const isToday = i === (today.getDay() + 6) % 7;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <motion.div
                          initial={{ scaleY: 0 }}
                          animate={{ scaleY: 1 }}
                          transition={{ delay: i * 0.05, duration: 0.4, ease: "easeOut" }}
                          className={cn("w-full rounded-sm", isToday ? "bg-chart-3" : "bg-primary/40")}
                          style={{ height: `${30 + (i * 17 + 20) % 60}%`, transformOrigin: "bottom" }}
                        />
                        <span className={cn("text-[9px] font-medium", isToday ? "text-chart-3" : "text-muted-foreground/50")}>{d}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Today's Timeline */}
          <motion.div variants={fadeUp} initial="hidden" animate="show" transition={{ delay: 0.1 }}>
            <div className="bg-card rounded-xl border border-border">
              <div className="px-6 py-4 border-b border-border">
                <h2 className="font-display font-semibold text-base">Today's Schedule</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{scheduledTasks.length} task{scheduledTasks.length !== 1 ? "s" : ""} scheduled</p>
              </div>
              <div className="p-4">
                {scheduledTasks.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <Calendar className="w-8 h-8 mx-auto mb-2 opacity-25" />
                    <p className="text-sm font-medium">No tasks scheduled today</p>
                    <p className="text-xs mt-1">Add a task with a time to see it here</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {scheduledTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/40 transition-colors group"
                        data-testid={`timeline-task-${task.id}`}
                      >
                        <div className="flex flex-col items-center gap-1 w-12 flex-shrink-0">
                          <span className="text-xs font-mono font-medium text-muted-foreground">{task.scheduledTime}</span>
                          <div className="w-px h-3 bg-border" />
                        </div>
                        <div className={cn(
                          "w-2 h-2 rounded-full flex-shrink-0",
                          task.priority === "high" ? "bg-destructive" : task.priority === "medium" ? "bg-chart-3" : "bg-chart-2"
                        )} />
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-sm font-medium", task.status === "completed" && "line-through text-muted-foreground")}>
                            {task.title}
                          </p>
                          {task.subject && <p className="text-xs text-muted-foreground">{task.subject}</p>}
                        </div>
                        <span className={cn(
                          "text-[11px] font-semibold px-2 py-0.5 rounded-full",
                          task.priority === "high" ? "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400" :
                          task.priority === "medium" ? "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400" :
                          "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                        )}>
                          {task.priority}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Motivational quote */}
          {s?.motivationalQuote && (
            <motion.div variants={fadeUp} initial="hidden" animate="show" transition={{ delay: 0.15 }}>
              <div className="bg-gradient-to-br from-primary/5 via-transparent to-chart-2/5 rounded-xl border border-border p-5">
                <p className="text-sm italic text-foreground/75 leading-relaxed" data-testid="text-quote">
                  "{s.motivationalQuote}"
                </p>
                <p className="text-xs text-muted-foreground mt-2 font-medium">— Daily Inspiration</p>
              </div>
            </motion.div>
          )}
        </div>

        {/* ── Right column ──────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Prayer Times */}
          <motion.div variants={fadeUp} initial="hidden" animate="show" transition={{ delay: 0.05 }}>
            <div className="bg-card rounded-xl border border-border">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <div>
                  <h2 className="font-display font-semibold text-sm">Prayer Times</h2>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{p?.city ?? "Your location"}</p>
                </div>
                <a href="/settings" className="text-[11px] font-medium text-primary hover:underline" data-testid="button-change-city">
                  Change country
                </a>
              </div>
              <div className="p-3 space-y-0.5">
                {prayer.isLoading ? (
                  [1,2,3,4,5].map(i => <div key={i} className="h-9 rounded-lg bg-muted animate-pulse" />)
                ) : (
                  prayers.map((pr) => (
                    <PrayerRow key={pr.name} name={pr.name} time={pr.time} isNext={pr.name === nextPrayer} />
                  ))
                )}
              </div>
            </div>
          </motion.div>

          {/* Upcoming Deadlines */}
          {s?.upcomingDeadlines && s.upcomingDeadlines.length > 0 && (
            <motion.div variants={fadeUp} initial="hidden" animate="show" transition={{ delay: 0.1 }}>
              <div className="bg-card rounded-xl border border-border">
                <div className="px-5 py-4 border-b border-border">
                  <h2 className="font-display font-semibold text-sm">Upcoming Deadlines</h2>
                </div>
                <div className="p-3 space-y-1">
                  {s.upcomingDeadlines.map((d) => {
                    const isUrgent = d.priority === "critical";
                    return (
                      <div key={d.id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted/40 transition-colors" data-testid={`deadline-${d.id}`}>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", isUrgent ? "bg-destructive" : "bg-chart-3")} />
                          <span className="text-sm text-foreground/80 truncate">{d.title}</span>
                        </div>
                        <span className={cn(
                          "text-[11px] font-semibold ml-2 flex-shrink-0 px-2 py-0.5 rounded-md",
                          isUrgent ? "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400" : "bg-muted text-muted-foreground"
                        )}>
                          {d.dueDate}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <TaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetTodayTasksQueryKey() });
        }}
      />
    </div>
  );
}
