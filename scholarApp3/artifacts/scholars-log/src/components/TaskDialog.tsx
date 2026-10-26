import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateTask, useUpdateTask, getGetTodayTasksQueryKey, getListTasksQueryKey, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  subject: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]),
  status: z.enum(["pending", "in_progress", "completed"]),
  dueDate: z.string().optional(),
  scheduledTime: z.string().optional(),
  estimatedMinutes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: { id: number; title: string; subject?: string | null; priority: string; status: string; dueDate?: string | null; scheduledTime?: string | null; estimatedMinutes?: number | null };
  onSuccess?: () => void;
}

export default function TaskDialog({ open, onOpenChange, task, onSuccess }: TaskDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      subject: "",
      priority: "medium",
      status: "pending",
      dueDate: "",
      scheduledTime: "",
      estimatedMinutes: "",
    },
  });

  useEffect(() => {
    if (task) {
      form.reset({
        title: task.title,
        subject: task.subject ?? "",
        priority: task.priority as "low" | "medium" | "high",
        status: task.status as "pending" | "in_progress" | "completed",
        dueDate: task.dueDate ?? "",
        scheduledTime: task.scheduledTime ?? "",
        estimatedMinutes: task.estimatedMinutes?.toString() ?? "",
      });
    } else {
      form.reset({ title: "", subject: "", priority: "medium", status: "pending", dueDate: "", scheduledTime: "", estimatedMinutes: "" });
    }
  }, [task, open]);

  function onSubmit(values: FormValues) {
    const payload = {
      title: values.title,
      subject: values.subject || null,
      priority: values.priority,
      status: values.status,
      dueDate: values.dueDate || null,
      scheduledTime: values.scheduledTime || null,
      estimatedMinutes: values.estimatedMinutes ? parseInt(values.estimatedMinutes) : null,
    };

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: getGetTodayTasksQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      onSuccess?.();
      onOpenChange(false);
    };

    if (task) {
      updateTask.mutate({ id: task.id, data: payload }, {
        onSuccess: () => { toast({ title: "Task updated" }); invalidate(); },
        onError: () => toast({ title: "Failed to update task", variant: "destructive" }),
      });
    } else {
      createTask.mutate({ data: payload }, {
        onSuccess: () => { toast({ title: "Task created" }); invalidate(); },
        onError: () => toast({ title: "Failed to create task", variant: "destructive" }),
      });
    }
  }

  const isPending = createTask.isPending || updateTask.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{task ? "Edit Task" : "New Task"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl><Input placeholder="Task title" data-testid="input-task-title" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="subject" render={({ field }) => (
              <FormItem>
                <FormLabel>Subject</FormLabel>
                <FormControl><Input placeholder="e.g. Mathematics" data-testid="input-task-subject" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="priority" render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger data-testid="select-task-priority"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger data-testid="select-task-status"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="dueDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Due Date</FormLabel>
                  <FormControl><Input type="date" data-testid="input-task-due-date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="scheduledTime" render={({ field }) => (
                <FormItem>
                  <FormLabel>Scheduled Time</FormLabel>
                  <FormControl><Input type="time" data-testid="input-task-time" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="estimatedMinutes" render={({ field }) => (
              <FormItem>
                <FormLabel>Estimated Minutes</FormLabel>
                <FormControl><Input type="number" placeholder="60" data-testid="input-task-minutes" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending} data-testid="button-save-task">
                {isPending ? "Saving..." : task ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
