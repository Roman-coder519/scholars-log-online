import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, AlarmClock, CheckCircle2, Circle, Trash2, Pencil, Clock } from "lucide-react";
import {
  useListDeadlines, useCreateDeadline, useUpdateDeadline, useDeleteDeadline,
  getListDeadlinesQueryKey, getGetDashboardSummaryQueryKey,
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
import { formatDistanceToNow } from "date-fns";

const schema = z.object({
  title: z.string().min(1), subject: z.string().optional(),
  dueDate: z.string().min(1), dueTime: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]), notes: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

const priorityConfig = {
  low:      { label: "Low",      dot: "bg-blue-400",   cls: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400" },
  medium:   { label: "Medium",   dot: "bg-amber-400",  cls: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400" },
  high:     { label: "High",     dot: "bg-orange-400", cls: "bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400" },
  critical: { label: "Critical", dot: "bg-red-500",    cls: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400" },
};

export default function Deadlines() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDeadline, setEditDeadline] = useState<any>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: deadlines = [], isLoading } = useListDeadlines({ query: { queryKey: getListDeadlinesQueryKey() } });
  const createDeadline = useCreateDeadline();
  const updateDeadline = useUpdateDeadline();
  const deleteDeadline = useDeleteDeadline();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", subject: "", dueDate: "", dueTime: "", priority: "medium", notes: "" },
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getListDeadlinesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
  }

  function openCreate() {
    setEditDeadline(null);
    form.reset({ title: "", subject: "", dueDate: "", dueTime: "", priority: "medium", notes: "" });
    setDialogOpen(true);
  }

  function openEdit(d: typeof deadlines[0]) {
    setEditDeadline(d);
    form.reset({ title: d.title, subject: d.subject ?? "", dueDate: d.dueDate, dueTime: d.dueTime ?? "", priority: d.priority, notes: d.notes ?? "" });
    setDialogOpen(true);
  }

  function onSubmit(values: FormValues) {
    const payload = { ...values, subject: values.subject || null, dueTime: values.dueTime || null, notes: values.notes || null };
    if (editDeadline) {
      updateDeadline.mutate({ id: editDeadline.id, data: payload }, { onSuccess: () => { toast({ title: "Deadline updated" }); invalidate(); setDialogOpen(false); } });
    } else {
      createDeadline.mutate({ data: payload }, { onSuccess: () => { toast({ title: "Deadline added" }); invalidate(); setDialogOpen(false); } });
    }
  }

  const today = new Date().toISOString().split("T")[0];
  const upcoming = deadlines.filter(d => !d.completed && d.dueDate >= today).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const completed = deadlines.filter(d => d.completed);
  const overdue = deadlines.filter(d => !d.completed && d.dueDate < today).sort((a, b) => b.dueDate.localeCompare(a.dueDate));

  function DeadlineRow({ d }: { d: typeof deadlines[0] }) {
    const isOverdue = !d.completed && d.dueDate < today;
    const p = priorityConfig[d.priority];
    let timeLabel = "";
    try { timeLabel = formatDistanceToNow(new Date(d.dueDate + "T00:00:00"), { addSuffix: true }); } catch {}

    return (
      <div
        className={cn(
          "flex items-start gap-3.5 px-4 py-4 rounded-xl border bg-card transition-all group",
          d.completed ? "opacity-55 border-border" : isOverdue ? "border-destructive/30 bg-destructive/2" : "border-border"
        )}
        data-testid={`deadline-item-${d.id}`}
      >
        <button
          onClick={() => updateDeadline.mutate({ id: d.id, data: { completed: !d.completed } }, { onSuccess: invalidate })}
          className={cn("mt-0.5 flex-shrink-0 transition-colors", d.completed ? "text-primary" : "text-muted-foreground hover:text-primary")}
          data-testid={`button-toggle-deadline-${d.id}`}
        >
          {d.completed ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            <p className={cn("font-semibold text-sm", d.completed && "line-through text-muted-foreground")}>{d.title}</p>
            <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1.5", p.cls)}>
              <span className={cn("w-1.5 h-1.5 rounded-full", p.dot)} />
              {p.label}
            </span>
          </div>
          {d.subject && <p className="text-xs text-muted-foreground mt-0.5">{d.subject}</p>}
          <div className="flex items-center gap-2.5 mt-2">
            <span className={cn("flex items-center gap-1 text-xs font-medium", isOverdue ? "text-destructive" : "text-muted-foreground")}>
              <Clock className="w-3 h-3" />
              {d.dueDate}{d.dueTime ? ` · ${d.dueTime}` : ""}
            </span>
            {timeLabel && <span className="text-xs text-muted-foreground">{timeLabel}</span>}
          </div>
        </div>
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => openEdit(d)} data-testid={`button-edit-deadline-${d.id}`}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-destructive/70 hover:text-destructive"
            onClick={() => deleteDeadline.mutate({ id: d.id }, { onSuccess: () => { toast({ title: "Deleted" }); invalidate(); } })}
            data-testid={`button-delete-deadline-${d.id}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  function Section({ title, items, titleCls }: { title: string; items: typeof deadlines; titleCls?: string }) {
    if (items.length === 0) return null;
    return (
      <div>
        <p className={cn("text-[11px] font-semibold uppercase tracking-widest mb-2.5 px-1", titleCls ?? "text-muted-foreground")}>
          {title}
        </p>
        <div className="space-y-2">
          {items.map((d, i) => (
            <motion.div key={d.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
              <DeadlineRow d={d} />
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between mb-7">
        <div>
          <h1 className="font-display text-2xl font-bold">Deadlines</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {upcoming.length} upcoming{overdue.length > 0 && <span className="text-destructive"> · {overdue.length} overdue</span>}
          </p>
        </div>
        <Button size="sm" className="gap-2 h-9" onClick={openCreate} data-testid="button-add-deadline">
          <Plus className="w-3.5 h-3.5" />
          Add Deadline
        </Button>
      </motion.div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : deadlines.length === 0 ? (
        <div className="text-center py-24 text-muted-foreground">
          <div className="w-14 h-14 rounded-2xl bg-muted mx-auto flex items-center justify-center mb-4">
            <AlarmClock className="w-7 h-7 opacity-30" />
          </div>
          <p className="font-display font-semibold text-base text-foreground/60">No deadlines</p>
          <p className="text-sm mt-1">Add important due dates to stay on track</p>
        </div>
      ) : (
        <div className="space-y-7">
          <Section title="Overdue" items={overdue} titleCls="text-destructive" />
          <Section title="Upcoming" items={upcoming} />
          <Section title="Completed" items={completed} />
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditDeadline(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="font-display">{editDeadline ? "Edit Deadline" : "New Deadline"}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="e.g. Physics Final Exam" data-testid="input-deadline-title" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="subject" render={({ field }) => (
                  <FormItem><FormLabel>Subject</FormLabel><FormControl><Input placeholder="Subject" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="priority" render={({ field }) => (
                  <FormItem><FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select><FormMessage /></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="dueDate" render={({ field }) => (
                  <FormItem><FormLabel>Due Date</FormLabel><FormControl><Input type="date" data-testid="input-deadline-date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="dueTime" render={({ field }) => (
                  <FormItem><FormLabel>Due Time</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Notes</FormLabel><FormControl><Input placeholder="Optional" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createDeadline.isPending || updateDeadline.isPending} data-testid="button-save-deadline">
                  {createDeadline.isPending || updateDeadline.isPending ? "Saving…" : "Save Deadline"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
