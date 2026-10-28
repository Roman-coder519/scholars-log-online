import { motion } from "framer-motion";
import {
  useGetWeekSummary, useGetGradesSummary, useListHabits,
  getGetWeekSummaryQueryKey, getGetGradesSummaryQueryKey, getListHabitsQueryKey
} from "@workspace/api-client-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";
import { format } from "date-fns";
import { TrendingUp, BarChart2, Award, Flame } from "lucide-react";

const CHART_COLORS = [
  "hsl(var(--chart-1))", "hsl(var(--chart-2))",
  "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"
];

const tooltipStyle = {
  contentStyle: {
    background: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "10px",
    boxShadow: "var(--shadow-md)",
    fontSize: "12px",
  },
  labelStyle: { color: "hsl(var(--foreground))", fontWeight: 600 },
};

export default function Analytics() {
  const { data: weekData } = useGetWeekSummary({ query: { queryKey: getGetWeekSummaryQueryKey() } });
  const { data: gradesSummary } = useGetGradesSummary({ query: { queryKey: getGetGradesSummaryQueryKey() } });
  const { data: habits = [] } = useListHabits({ query: { queryKey: getListHabitsQueryKey() } });

  const weekChartData = weekData?.days.map(d => {
    let label = d.date;
    try { label = format(new Date(d.date + "T00:00:00"), "EEE"); } catch {}
    return {
      date: label,
      taskRate: d.tasksTotal > 0 ? Math.round((d.tasksCompleted / d.tasksTotal) * 100) : 0,
      habitRate: d.habitsTotal > 0 ? Math.round((d.habitsCompleted / d.habitsTotal) * 100) : 0,
    };
  }) ?? [];

  const gradesPieData = gradesSummary?.subjects.map(s => ({
    name: s.subject.length > 10 ? s.subject.slice(0, 10) + "…" : s.subject,
    value: Math.round(s.average * 10) / 10,
  })) ?? [];

  const streakData = habits.map(h => ({
    name: h.name.length > 14 ? h.name.slice(0, 14) + "…" : h.name,
    streak: h.currentStreak,
    best: h.longestStreak,
  }));

  const topStreak = habits.reduce((m, h) => h.currentStreak > m ? h.currentStreak : m, 0);
  const avgGrade = gradesSummary?.overallAverage?.toFixed(1) ?? "—";
  const weekCompletion = weekChartData.length > 0
    ? Math.round(weekChartData.reduce((s, d) => s + d.taskRate, 0) / weekChartData.length)
    : 0;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-7">
        <h1 className="font-display text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Track your academic performance over time</p>
      </motion.div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-7">
        {[
          { label: "Weekly Completion", value: `${weekCompletion}%`, sub: "avg task rate", icon: TrendingUp, color: "text-primary bg-primary/8" },
          { label: "Grade Average", value: `${avgGrade}%`, sub: "across all subjects", icon: Award, color: "text-chart-2 bg-chart-2/8" },
          { label: "Top Streak", value: `${topStreak}d`, sub: "best active habit", icon: Flame, color: "text-chart-3 bg-chart-3/8" },
        ].map(({ label, value, sub, icon: Icon, color }, i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <div className="bg-card rounded-xl border border-border p-5 flex items-start gap-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">{label}</p>
                <p className="font-display text-2xl font-bold mt-0.5">{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Completion rates line chart */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-display font-semibold text-sm">Weekly Completion</p>
                <p className="text-[11px] text-muted-foreground">Tasks & habits rate</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={weekChartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} domain={[0, 100]} unit="%" axisLine={false} tickLine={false} />
                <Tooltip {...tooltipStyle} formatter={(v) => [`${v}%`]} />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Line type="monotone" dataKey="taskRate" stroke="hsl(var(--chart-1))" strokeWidth={2.5} dot={{ r: 3, fill: "hsl(var(--chart-1))" }} activeDot={{ r: 5 }} name="Tasks" />
                <Line type="monotone" dataKey="habitRate" stroke="hsl(var(--chart-2))" strokeWidth={2.5} dot={{ r: 3, fill: "hsl(var(--chart-2))" }} activeDot={{ r: 5 }} name="Habits" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Grades donut */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-chart-2/8 flex items-center justify-center">
                <Award className="w-4 h-4 text-chart-2" />
              </div>
              <div>
                <p className="font-display font-semibold text-sm">Subject Averages</p>
                <p className="text-[11px] text-muted-foreground">Grade breakdown by subject</p>
              </div>
            </div>
            {gradesPieData.length === 0 ? (
              <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground">
                <BarChart2 className="w-8 h-8 opacity-25 mb-2" />
                <p className="text-sm">Add grades to see this chart</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={gradesPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75}
                    paddingAngle={4} dataKey="value"
                  >
                    {gradesPieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip {...tooltipStyle} formatter={(v) => [`${v}%`]} />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        {/* Habit streaks bar */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="md:col-span-2">
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-chart-3/8 flex items-center justify-center">
                <Flame className="w-4 h-4 text-chart-3" />
              </div>
              <div>
                <p className="font-display font-semibold text-sm">Habit Streaks</p>
                <p className="text-[11px] text-muted-foreground">Current vs best streaks</p>
              </div>
            </div>
            {streakData.length === 0 ? (
              <div className="h-[180px] flex flex-col items-center justify-center text-muted-foreground">
                <Flame className="w-8 h-8 opacity-25 mb-2" />
                <p className="text-sm">Add habits to see your streaks</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={streakData} layout="vertical" barCategoryGap="35%" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={100} axisLine={false} tickLine={false} />
                  <Tooltip {...tooltipStyle} formatter={(v) => [`${v} days`]} />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Bar dataKey="streak" fill="hsl(var(--chart-1))" radius={[0, 6, 6, 0]} name="Current" />
                  <Bar dataKey="best" fill="hsl(var(--chart-2))" radius={[0, 6, 6, 0]} name="Best" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
