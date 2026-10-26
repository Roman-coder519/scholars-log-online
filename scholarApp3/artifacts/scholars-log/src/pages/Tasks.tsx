import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, CheckCircle2, Circle, Clock, Trash2, Pencil, ListFilter } from "lucide-react";
import {
  useListTasks, useUpdateTask, useDeleteTask,
  getListTasksQueryKey, getGetDashboardSummaryQueryKey, getGetTodayTasksQueryKey
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TaskDialog from "@/components/TaskDialog";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const priorityConfig = {
  low:    { label: "Low",    cls: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",   dot: "bg-blue-400" },
  medium: { label: "Medium", cls: "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400", dot: "bg-amber-400" },
  high:   { label: "High",   cls: "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400",      dot: "bg-red-400" },
};

export default function Tasks() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTask, setEditTask] = useState<any>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const params = statusFilter !== "all" ? { status: statusFilter as "pending" | "in_progress" | "completed" } : {};
  const { data: tasks = [], isLoading } = useListTasks(params, { query: { queryKey: getListTasksQueryKey(params) } });
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetTodayTasksQueryKey() });
  }

  function toggleComplete(task: typeof tasks[0]) {
    updateTask.mutate({ id: task.id, data: { status: task.status === "completed" ? "pending" : "completed" } }, { onSuccess: invalidate });
  }

  function handleDelete(id: number) {
    deleteTask.mutate({ id }, { onSuccess: () => { toast({ title: "Task deleted" }); invalidate(); } });
  }

  const grouped = tasks.reduce<Record<string, typeof tasks>>((acc, t) => {
    const date = t.dueDate ?? "No date";
    acc[date] = [...(acc[date] ?? []), t];
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort((a, b) =>
    a === "No date" ? 1 : b === "No date" ? -1 : a.localeCompare(b)
  );

  const pending = tasks.filter(t => t.status !== "completed").length;
  const completed = tasks.filter(t => t.status === "completed").length;

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-7">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Tasks</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {pending} pending · {completed} completed
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 h-9 text-sm gap-1.5" data-testid="select-task-filter">
                <ListFilter className="w-3.5 h-3.5 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tasks</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" className="gap-2 h-9" onClick={() => { setEditTask(null); setDialogOpen(true); }} data-testid="button-add-task">
              <Plus className="w-3.5 h-3.5" />
              Add Task
            </Button>
          </div>
        </div>
      </motion.div>

      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3,4].map(i => <div key={i} className="h-[68px] rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : tasks.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="text-center py-24 text-muted-foreground"
        >
          <div className="w-14 h-14 rounded-2xl bg-muted mx-auto flex items-center justify-center mb-4">
            <CheckCircle2 className="w-7 h-7 opacity-30" />
          </div>
          <p className="font-display font-semibold text-base text-foreground/60">No tasks yet</p>
          <p className="text-sm mt-1">Add your first task to get started</p>
        </motion.div>
      ) : (
        <div className="space-y-7">
          {sortedDates.map((date) => (
            <div key={date}>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2.5 px-1">
                {date === "No date" ? "No Date" : (() => {
                  try { return format(new Date(date + "T00:00:00"), "EEEE, MMMM d"); } catch { return date; }
                })()}
              </p>
              <div className="space-y-2">
                {grouped[date].map((task, i) => {
                  const p = priorityConfig[task.priority];
                  return (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="flex items-center gap-3.5 px-4 py-3.5 rounded-xl border border-border bg-card hover:shadow-sm transition-all group"
                      data-testid={`task-item-${task.id}`}
                    >
                      <button
                        onClick={() => toggleComplete(task)}
                        className="flex-shrink-0 text-muted-foreground hover:text-primary transition-colors"
                        data-testid={`button-toggle-task-${task.id}`}
                      >
                        {task.status === "completed"
                          ? <CheckCircle2 className="w-5 h-5 text-primary" />
                          : <Circle className="w-5 h-5" />
                        }
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm font-medium leading-snug",
                          task.status === "completed" && "line-through text-muted-foreground"
                        )}>
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2.5 mt-0.5">
                          {task.subject && (
                            <span className="text-[11px] text-muted-foreground">{task.subject}</span>
                          )}
                          {task.scheduledTime && (
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />{task.scheduledTime}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1.5", p.cls)}>
                          <span className={cn("w-1.5 h-1.5 rounded-full", p.dot)} />
                          {p.label}
                        </span>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7 rounded-lg"
                            onClick={() => { setEditTask(task); setDialogOpen(true); }}
                            data-testid={`button-edit-task-${task.id}`}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-destructive/70 hover:text-destructive"
                            onClick={() => handleDelete(task.id)}
                            data-testid={`button-delete-task-${task.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <TaskDialog
        open={dialogOpen}
        onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditTask(null); }}
        task={editTask}
        onSuccess={invalidate}
      />
    </div>
  );
}
