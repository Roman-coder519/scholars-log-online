import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Flame, CheckCircle2, Circle, Trash2, Pencil } from "lucide-react";
import {
  useGetTodayHabits, useCompleteHabit, useUncompleteHabit, useDeleteHabit,
  useCreateHabit, useUpdateHabit,
  getGetTodayHabitsQueryKey, getListHabitsQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const habitSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  frequency: z.enum(["daily", "weekly"]),
  targetDays: z.string().min(1),
});
type HabitFormValues = z.infer<typeof habitSchema>;

function HabitForm({ open, onOpenChange, habit, onSuccess }: {
  open: boolean; onOpenChange: (v: boolean) => void; habit?: any; onSuccess: () => void;
}) {
  const createHabit = useCreateHabit();
  const updateHabit = useUpdateHabit();
  const { toast } = useToast();
  const form = useForm<HabitFormValues>({
    resolver: zodResolver(habitSchema),
    defaultValues: { name: habit?.name ?? "", description: habit?.description ?? "", frequency: habit?.frequency ?? "daily", targetDays: habit?.targetDays?.toString() ?? "7" },
  });
  function onSubmit(values: HabitFormValues) {
    const payload = { name: values.name, description: values.description || null, frequency: values.frequency, targetDays: parseInt(values.targetDays) };
    if (habit) {
      updateHabit.mutate({ id: habit.id, data: payload }, { onSuccess: () => { toast({ title: "Habit updated" }); onSuccess(); onOpenChange(false); } });
    } else {
      createHabit.mutate({ data: payload }, { onSuccess: () => { toast({ title: "Habit created" }); onSuccess(); onOpenChange(false); } });
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle className="font-display">{habit ? "Edit Habit" : "New Habit"}</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Name</FormLabel><FormControl><Input placeholder="e.g. Morning Quran" data-testid="input-habit-name" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>Description</FormLabel><FormControl><Input placeholder="Optional" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="frequency" render={({ field }) => (
                <FormItem><FormLabel>Frequency</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent><SelectItem value="daily">Daily</SelectItem><SelectItem value="weekly">Weekly</SelectItem></SelectContent>
                  </Select><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="targetDays" render={({ field }) => (
                <FormItem><FormLabel>Target Days</FormLabel><FormControl><Input type="number" min="1" max="7" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={createHabit.isPending || updateHabit.isPending} data-testid="button-save-habit">
                {createHabit.isPending || updateHabit.isPending ? "Saving…" : "Save Habit"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function Habits() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editHabit, setEditHabit] = useState<any>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: habits = [], isLoading } = useGetTodayHabits({ query: { queryKey: getGetTodayHabitsQueryKey() } });
  const completeHabit = useCompleteHabit();
  const uncompleteHabit = useUncompleteHabit();
  const deleteHabit = useDeleteHabit();

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getGetTodayHabitsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListHabitsQueryKey() });
  }

  function toggleHabit(habit: typeof habits[0]) {
    if (habit.completedToday) {
      uncompleteHabit.mutate({ id: habit.id }, { onSuccess: invalidate });
    } else {
      completeHabit.mutate({ id: habit.id }, { onSuccess: invalidate });
    }
  }

  const completed = habits.filter(h => h.completedToday).length;
  const pct = habits.length > 0 ? Math.round((completed / habits.length) * 100) : 0;

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between mb-7">
        <div>
          <h1 className="font-display text-2xl font-bold">Habits</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{completed}/{habits.length} completed today · {pct}%</p>
        </div>
        <Button size="sm" className="gap-2 h-9" onClick={() => { setEditHabit(null); setDialogOpen(true); }} data-testid="button-add-habit">
          <Plus className="w-3.5 h-3.5" />
          New Habit
        </Button>
      </motion.div>

      {/* Progress bar */}
      {habits.length > 0 && (
        <div className="mb-6 bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">Today's progress</p>
            <span className="text-sm font-bold text-primary">{pct}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : habits.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-24 text-muted-foreground">
          <div className="w-14 h-14 rounded-2xl bg-muted mx-auto flex items-center justify-center mb-4">
            <Flame className="w-7 h-7 opacity-30" />
          </div>
          <p className="font-display font-semibold text-base text-foreground/60">No habits yet</p>
          <p className="text-sm mt-1">Start building positive routines</p>
        </motion.div>
      ) : (
        <div className="space-y-2">
          {habits.map((habit, i) => (
            <motion.div
              key={habit.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className={cn(
                "flex items-center gap-4 px-4 py-4 rounded-xl border bg-card transition-all group",
                habit.completedToday ? "border-primary/20 bg-primary/3" : "border-border"
              )}
              data-testid={`habit-item-${habit.id}`}
            >
              <button
                onClick={() => toggleHabit(habit)}
                className={cn(
                  "flex-shrink-0 transition-colors",
                  habit.completedToday ? "text-primary" : "text-muted-foreground hover:text-primary"
                )}
                data-testid={`button-toggle-habit-${habit.id}`}
              >
                {habit.completedToday
                  ? <CheckCircle2 className="w-6 h-6" />
                  : <Circle className="w-6 h-6" />
                }
              </button>
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-semibold", habit.completedToday && "line-through text-muted-foreground")}>
                  {habit.name}
                </p>
                {habit.description && <p className="text-xs text-muted-foreground mt-0.5">{habit.description}</p>}
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                    <Flame className="w-3 h-3" />
                    {habit.currentStreak} day streak
                  </span>
                  <span className="text-xs text-muted-foreground">Best: {habit.longestStreak}</span>
                  <span className="text-xs text-muted-foreground capitalize px-1.5 py-0.5 bg-muted rounded">{habit.frequency}</span>
                </div>
              </div>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg"
                  onClick={() => { setEditHabit(habit); setDialogOpen(true); }}
                  data-testid={`button-edit-habit-${habit.id}`}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-destructive/70 hover:text-destructive"
                  onClick={() => deleteHabit.mutate({ id: habit.id }, { onSuccess: () => { toast({ title: "Habit deleted" }); invalidate(); } })}
                  data-testid={`button-delete-habit-${habit.id}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <HabitForm
        open={dialogOpen}
        onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditHabit(null); }}
        habit={editHabit}
        onSuccess={invalidate}
      />
    </div>
  );
}
