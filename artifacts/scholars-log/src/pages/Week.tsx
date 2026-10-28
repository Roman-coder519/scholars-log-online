import { motion } from "framer-motion";
import { useGetWeekSummary, getGetWeekSummaryQueryKey } from "@workspace/api-client-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format } from "date-fns";
import { CheckSquare, Flame, TrendingUp, Target } from "lucide-react";

const tooltipStyle = {
  contentStyle: {
    background: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "10px",
    boxShadow: "var(--shadow-md)",
    fontSize: "12px",
  },
};

export default function Week() {
  const { data: weekData, isLoading } = useGetWeekSummary({ query: { queryKey: getGetWeekSummaryQueryKey() } });

  const chartData = weekData?.days.map(d => {
    let label = d.date;
    try { label = format(new Date(d.date + "T00:00:00"), "EEE"); } catch {}
    return { date: label, fullDate: d.date, tasksCompleted: d.tasksCompleted, habitsCompleted: d.habitsCompleted,
      taskRate: d.tasksTotal > 0 ? Math.round((d.tasksCompleted / d.tasksTotal) * 100) : 0,
      habitRate: d.habitsTotal > 0 ? Math.round((d.habitsCompleted / d.habitsTotal) * 100) : 0,
    };
  }) ?? [];

  const totalTasksDone = weekData?.days.reduce((s, d) => s + d.tasksCompleted, 0) ?? 0;
  const totalTasksAll = weekData?.days.reduce((s, d) => s + d.tasksTotal, 0) ?? 0;
  const totalHabitsDone = weekData?.days.reduce((s, d) => s + d.habitsCompleted, 0) ?? 0;
  const totalHabitsAll = weekData?.days.reduce((s, d) => s + d.habitsTotal, 0) ?? 0;
  const taskRate = totalTasksAll > 0 ? Math.round((totalTasksDone / totalTasksAll) * 100) : 0;
  const habitRate = totalHabitsAll > 0 ? Math.round((totalHabitsDone / totalHabitsAll) * 100) : 0;

  const todayStr = new Date().toISOString().split("T")[0];

  const stats = [
    { label: "Tasks Done", value: totalTasksDone, sub: `of ${totalTasksAll}`, icon: CheckSquare, color: "text-primary bg-primary/8" },
    { label: "Habits Done", value: totalHabitsDone, sub: `of ${totalHabitsAll}`, icon: Flame, color: "text-chart-3 bg-chart-3/8" },
    { label: "Task Rate", value: `${taskRate}%`, sub: "completion", icon: TrendingUp, color: "text-chart-2 bg-chart-2/8" },
    { label: "Habit Rate", value: `${habitRate}%`, sub: "completion", icon: Target, color: "text-chart-4 bg-chart-4/8" },
  ];

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-7">
        <h1 className="font-display text-2xl font-bold">This Week</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Your last 7 days at a glance</p>
      </motion.div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 mb-7">
        {stats.map(({ label, value, sub, icon: Icon, color }, i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <div className="bg-card rounded-xl border border-border p-4 flex items-start gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">{label}</p>
                <p className="font-display text-xl font-bold mt-0.5" data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>{value}</p>
                <p className="text-[11px] text-muted-foreground">{sub}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Bar chart */}
      {isLoading ? (
        <div className="h-72 rounded-xl bg-muted animate-pulse" />
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="bg-card rounded-xl border border-border p-5 mb-5">
            <div className="mb-4">
              <p className="font-display font-semibold text-sm">Daily Overview</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Completed tasks & habits per day</p>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} barCategoryGap="35%" margin={{ left: -20, right: 4, top: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip {...tooltipStyle}
                  formatter={(v, n) => [v, n === "tasksCompleted" ? "Tasks" : "Habits"]}
                />
                <Legend wrapperStyle={{ fontSize: "12px" }} formatter={(v) => v === "tasksCompleted" ? "Tasks" : "Habits"} />
                <Bar dataKey="tasksCompleted" fill="hsl(var(--chart-1))" radius={[5, 5, 0, 0]} />
                <Bar dataKey="habitsCompleted" fill="hsl(var(--chart-3))" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* Day breakdown row */}
      <div className="grid grid-cols-7 gap-1 md:gap-2">
        {chartData.map((d, i) => {
          const isToday = d.fullDate === todayStr;
          const hasBoth = d.tasksCompleted > 0 || d.habitsCompleted > 0;
          return (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.04 }}>
              <div className={`rounded-xl border p-2.5 text-center transition-all ${isToday ? "border-primary ring-1 ring-primary/20 bg-primary/3" : "border-border bg-card"} ${!hasBoth ? "opacity-50" : ""}`}>
                <p className={`text-[11px] font-semibold ${isToday ? "text-primary" : "text-muted-foreground"}`}>{d.date}</p>
                <div className="mt-2 space-y-1">
                  <p className="text-xs font-bold text-primary">{d.tasksCompleted}<span className="text-[10px] font-normal text-muted-foreground">T</span></p>
                  <p className="text-xs font-bold text-chart-3">{d.habitsCompleted}<span className="text-[10px] font-normal text-muted-foreground">H</span></p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
