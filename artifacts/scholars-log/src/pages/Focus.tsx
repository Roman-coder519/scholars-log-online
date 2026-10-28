import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, RotateCcw, Coffee, BookOpen, Timer, CheckCircle2, Clock } from "lucide-react";
import {
  useListTasks, useCreateFocusSession, useListFocusSessions,
  getListFocusSessionsQueryKey, getListTasksQueryKey
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";

type Phase = "work" | "break" | "idle";
const WORK_DURATION = 25 * 60;
const BREAK_DURATION = 5 * 60;
const pad = (n: number) => n.toString().padStart(2, "0");
const fmt = (s: number) => `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;

export default function Focus() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [timeLeft, setTimeLeft] = useState(WORK_DURATION);
  const [running, setRunning] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string>("free");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAt = useRef<number>(0);
  const queryClient = useQueryClient();

  const { data: tasks = [] } = useListTasks({}, { query: { queryKey: getListTasksQueryKey() } });
  const { data: sessions = [] } = useListFocusSessions({ query: { queryKey: getListFocusSessionsQueryKey() } });
  const createSession = useCreateFocusSession();

  const today = new Date().toISOString().split("T")[0];
  const todaySessions = sessions.filter(s => s.completedAt.startsWith(today));
  const totalMinutesToday = todaySessions.reduce((sum, s) => sum + s.durationMinutes, 0);
  const pendingTasks = tasks.filter(t => t.status !== "completed");
  const selectedTask = selectedTaskId !== "free" ? tasks.find(t => t.id === parseInt(selectedTaskId)) ?? null : null;

  const tick = useCallback(() => {
    setTimeLeft(prev => {
      if (prev <= 1) {
        setRunning(false);
        if (phase === "work") {
          const elapsed = Math.round((Date.now() - startedAt.current) / 60000);
          const taskObj = selectedTaskId !== "free" ? tasks.find(t => t.id === parseInt(selectedTaskId)) : null;
          createSession.mutate({
            data: { taskId: taskObj?.id ?? null, taskTitle: taskObj?.title ?? "Free study", subject: taskObj?.subject ?? null, durationMinutes: Math.max(1, elapsed) },
          }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListFocusSessionsQueryKey() }) });
          setPhase("break");
          return BREAK_DURATION;
        } else {
          setPhase("idle");
          return WORK_DURATION;
        }
      }
      return prev - 1;
    });
  }, [phase, selectedTaskId, tasks]);

  useEffect(() => {
    if (running) { intervalRef.current = setInterval(tick, 1000); }
    else { if (intervalRef.current) clearInterval(intervalRef.current); }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, tick]);

  function handleStart() {
    if (phase === "idle") { setPhase("work"); setTimeLeft(WORK_DURATION); }
    startedAt.current = Date.now();
    setRunning(true);
  }

  const progress = phase === "work" ? 1 - timeLeft / WORK_DURATION : phase === "break" ? 1 - timeLeft / BREAK_DURATION : 0;
  const R = 110;
  const circ = 2 * Math.PI * R;
  const dashOffset = circ * (1 - progress);

  const phaseColors = {
    work:  { ring: "hsl(var(--primary))",  text: "text-primary",  badge: "bg-primary/10 text-primary", icon: BookOpen, label: "Focus Time" },
    break: { ring: "hsl(var(--chart-2))",  text: "text-chart-2",  badge: "bg-chart-2/10 text-chart-2", icon: Coffee,   label: "Break Time" },
    idle:  { ring: "hsl(var(--muted-foreground))", text: "text-muted-foreground", badge: "bg-muted text-muted-foreground", icon: Timer, label: "Ready" },
  };
  const pc = phaseColors[phase];
  const PhaseIcon = pc.icon;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-7">
        <h1 className="font-display text-2xl font-bold">Focus Timer</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Pomodoro sessions to power through your work</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timer */}
        <div className="lg:col-span-2">
          <div className="bg-card rounded-2xl border border-border p-8 flex flex-col items-center gap-7">
            {/* Phase badge */}
            <AnimatePresence mode="wait">
              <motion.div key={phase} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <span className={cn("flex items-center gap-2 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full", pc.badge)}>
                  <PhaseIcon className="w-3.5 h-3.5" />
                  {pc.label}
                </span>
              </motion.div>
            </AnimatePresence>

            {/* Ring */}
            <div className="relative w-64 h-64 flex items-center justify-center">
              <svg className="absolute inset-0 -rotate-90" width="256" height="256" viewBox="0 0 256 256">
                <circle cx="128" cy="128" r={R} fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                <motion.circle
                  cx="128" cy="128" r={R}
                  fill="none" strokeWidth="8" strokeLinecap="round"
                  stroke={pc.ring}
                  style={{ strokeDasharray: circ, strokeDashoffset: dashOffset }}
                  initial={false}
                  animate={{ strokeDashoffset: dashOffset }}
                  transition={{ duration: 0.5 }}
                />
              </svg>
              <div className="text-center z-10 relative">
                <div className={cn("font-mono text-5xl font-bold tabular-nums", pc.text)} data-testid="timer-display">
                  {fmt(timeLeft)}
                </div>
                {selectedTask && (
                  <p className="text-xs text-muted-foreground mt-2 max-w-[160px] text-center leading-snug line-clamp-2">{selectedTask.title}</p>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" onClick={() => { setRunning(false); setPhase("idle"); setTimeLeft(WORK_DURATION); }} className="h-10 w-10 rounded-xl" data-testid="button-timer-reset">
                <RotateCcw className="w-4 h-4" />
              </Button>
              {running ? (
                <Button size="lg" onClick={() => setRunning(false)} className="px-10 gap-2 rounded-xl" data-testid="button-timer-pause">
                  <Pause className="w-4 h-4" /> Pause
                </Button>
              ) : (
                <Button size="lg" onClick={handleStart} className="px-10 gap-2 rounded-xl" data-testid="button-timer-start">
                  <Play className="w-4 h-4" /> {phase === "idle" ? "Start" : "Resume"}
                </Button>
              )}
              {phase === "break" && (
                <Button variant="outline" onClick={() => { setPhase("idle"); setTimeLeft(WORK_DURATION); setRunning(false); }} className="rounded-xl" data-testid="button-skip-break">
                  Skip Break
                </Button>
              )}
            </div>

            {/* Task selector */}
            <div className="w-full max-w-xs">
              <p className="text-[11px] font-medium text-muted-foreground mb-1.5 text-center uppercase tracking-wide">Working on</p>
              <Select value={selectedTaskId} onValueChange={setSelectedTaskId} disabled={running}>
                <SelectTrigger className="rounded-xl" data-testid="select-focus-task">
                  <SelectValue placeholder="Select a task…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free Study Session</SelectItem>
                  {pendingTasks.map(t => (
                    <SelectItem key={t.id} value={t.id.toString()}>
                      {t.title}{t.subject ? ` — ${t.subject}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Today stats */}
            <div className="w-full border-t border-border pt-5 flex justify-center gap-10">
              {[
                { label: "Sessions today", value: todaySessions.length, color: "text-primary" },
                { label: "Minutes focused", value: totalMinutesToday, color: "text-chart-2" },
                { label: "Total sessions", value: sessions.length, color: "text-chart-3" },
              ].map(({ label, value, color }) => (
                <div key={label} className="text-center">
                  <div className={cn("font-display text-2xl font-bold", color)}>{value}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Session history */}
        <div>
          <div className="bg-card rounded-2xl border border-border h-full flex flex-col">
            <div className="px-4 py-4 border-b border-border">
              <p className="font-display font-semibold text-sm">Recent Sessions</p>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {sessions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-25" />
                  <p className="text-xs">No sessions yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {[...sessions].reverse().slice(0, 15).map((s, i) => (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="p-3 rounded-xl border border-border bg-background/50"
                      data-testid={`session-${s.id}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-primary">{s.durationMinutes}m</span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {(() => { try { return formatDistanceToNow(new Date(s.completedAt), { addSuffix: true }); } catch { return ""; } })()}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-foreground/70 truncate">{s.taskTitle}</p>
                      {s.subject && <p className="text-[10px] text-muted-foreground mt-0.5">{s.subject}</p>}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
