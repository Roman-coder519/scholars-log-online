import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, GraduationCap, Trash2, Pencil } from "lucide-react";
import {
  useListGrades, useGetGradesSummary, useCreateGrade, useUpdateGrade, useDeleteGrade,
  getListGradesQueryKey, getGetGradesSummaryQueryKey,
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

const gradeSchema = z.object({
  subject: z.string().min(1), assignmentName: z.string().min(1),
  score: z.string().min(1), maxScore: z.string().min(1),
  type: z.enum(["exam", "quiz", "assignment", "project", "other"]),
  date: z.string().min(1), notes: z.string().optional(),
});
type GradeFormValues = z.infer<typeof gradeSchema>;

const letterConfig: Record<string, { cls: string }> = {
  "A":  { cls: "text-emerald-600 bg-emerald-50 ring-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400" },
  "A-": { cls: "text-emerald-600 bg-emerald-50 ring-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400" },
  "B+": { cls: "text-blue-600 bg-blue-50 ring-blue-100 dark:bg-blue-900/20 dark:text-blue-400" },
  "B":  { cls: "text-blue-600 bg-blue-50 ring-blue-100 dark:bg-blue-900/20 dark:text-blue-400" },
  "B-": { cls: "text-blue-600 bg-blue-50 ring-blue-100 dark:bg-blue-900/20 dark:text-blue-400" },
  "C+": { cls: "text-amber-600 bg-amber-50 ring-amber-100 dark:bg-amber-900/20 dark:text-amber-400" },
  "C":  { cls: "text-amber-600 bg-amber-50 ring-amber-100 dark:bg-amber-900/20 dark:text-amber-400" },
  "D":  { cls: "text-orange-600 bg-orange-50 ring-orange-100 dark:bg-orange-900/20 dark:text-orange-400" },
  "F":  { cls: "text-red-600 bg-red-50 ring-red-100 dark:bg-red-900/20 dark:text-red-400" },
};

export default function Grades() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editGrade, setEditGrade] = useState<any>(null);
  const [activeSubject, setActiveSubject] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: grades = [], isLoading } = useListGrades({ query: { queryKey: getListGradesQueryKey() } });
  const { data: summary } = useGetGradesSummary({ query: { queryKey: getGetGradesSummaryQueryKey() } });
  const createGrade = useCreateGrade();
  const updateGrade = useUpdateGrade();
  const deleteGrade = useDeleteGrade();

  const form = useForm<GradeFormValues>({
    resolver: zodResolver(gradeSchema),
    defaultValues: { subject: "", assignmentName: "", score: "", maxScore: "100", type: "assignment", date: "", notes: "" },
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getListGradesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetGradesSummaryQueryKey() });
  }

  function openEdit(grade: typeof grades[0]) {
    setEditGrade(grade);
    form.reset({ subject: grade.subject, assignmentName: grade.assignmentName, score: grade.score.toString(), maxScore: grade.maxScore.toString(), type: grade.type, date: grade.date, notes: grade.notes ?? "" });
    setDialogOpen(true);
  }

  function openCreate() {
    setEditGrade(null);
    form.reset({ subject: "", assignmentName: "", score: "", maxScore: "100", type: "assignment", date: new Date().toISOString().split("T")[0], notes: "" });
    setDialogOpen(true);
  }

  function onSubmit(values: GradeFormValues) {
    const payload = { ...values, score: parseFloat(values.score), maxScore: parseFloat(values.maxScore), notes: values.notes || null };
    if (editGrade) {
      updateGrade.mutate({ id: editGrade.id, data: payload }, { onSuccess: () => { toast({ title: "Grade updated" }); invalidate(); setDialogOpen(false); } });
    } else {
      createGrade.mutate({ data: payload }, { onSuccess: () => { toast({ title: "Grade added" }); invalidate(); setDialogOpen(false); } });
    }
  }

  const filteredGrades = activeSubject ? grades.filter(g => g.subject === activeSubject) : grades;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between mb-7">
        <div>
          <h1 className="font-display text-2xl font-bold">Grades</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Overall average: <span className="font-semibold text-foreground">{summary?.overallAverage?.toFixed(1) ?? "—"}%</span>
          </p>
        </div>
        <Button size="sm" className="gap-2 h-9" onClick={openCreate} data-testid="button-add-grade">
          <Plus className="w-3.5 h-3.5" />
          Add Grade
        </Button>
      </motion.div>

      {/* Subject cards */}
      {summary && summary.subjects.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-7">
          {summary.subjects.map((s, i) => {
            const cfg = letterConfig[s.letterGrade];
            return (
              <motion.button
                key={s.subject}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setActiveSubject(activeSubject === s.subject ? null : s.subject)}
                className={cn(
                  "text-left p-4 rounded-xl border bg-card transition-all hover:shadow-sm",
                  activeSubject === s.subject ? "border-primary ring-1 ring-primary/20" : "border-border"
                )}
                data-testid={`subject-card-${s.subject.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <p className="text-sm font-semibold truncate flex-1">{s.subject}</p>
                  <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full ml-2 flex-shrink-0", cfg?.cls ?? "text-foreground bg-muted")}>
                    {s.letterGrade}
                  </span>
                </div>
                <p className="font-display text-2xl font-bold text-foreground">{s.average.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.gradeCount} {s.gradeCount === 1 ? "grade" : "grades"}</p>
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Grade list */}
      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : filteredGrades.length === 0 ? (
        <div className="text-center py-24 text-muted-foreground">
          <div className="w-14 h-14 rounded-2xl bg-muted mx-auto flex items-center justify-center mb-4">
            <GraduationCap className="w-7 h-7 opacity-30" />
          </div>
          <p className="font-display font-semibold text-base text-foreground/60">No grades yet</p>
          <p className="text-sm mt-1">Track your academic progress</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredGrades.map((grade, i) => {
            const pct = Math.round((grade.score / grade.maxScore) * 100);
            const letterCfg = letterConfig[Object.keys(letterConfig).find(k =>
              (pct >= 93 && k === "A") || (pct >= 90 && k === "A-") ||
              (pct >= 87 && k === "B+") || (pct >= 83 && k === "B") ||
              (pct >= 80 && k === "B-") || (pct >= 77 && k === "C+") ||
              (pct >= 73 && k === "C") || (pct >= 60 && k === "D") || k === "F"
            ) ?? "F"];
            return (
              <motion.div
                key={grade.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-4 px-5 py-4 rounded-xl border border-border bg-card hover:shadow-sm transition-all group"
                data-testid={`grade-item-${grade.id}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">{grade.assignmentName}</p>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">{grade.type}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{grade.subject} · {grade.date}</p>
                </div>
                <div className="text-right">
                  <div className="font-display text-xl font-bold">{pct}%</div>
                  <div className="text-xs text-muted-foreground">{grade.score}/{grade.maxScore}</div>
                </div>
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => openEdit(grade)} data-testid={`button-edit-grade-${grade.id}`}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-destructive/70 hover:text-destructive"
                    onClick={() => deleteGrade.mutate({ id: grade.id }, { onSuccess: () => { toast({ title: "Deleted" }); invalidate(); } })}
                    data-testid={`button-delete-grade-${grade.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditGrade(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="font-display">{editGrade ? "Edit Grade" : "Add Grade"}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="subject" render={({ field }) => (
                  <FormItem><FormLabel>Subject</FormLabel><FormControl><Input placeholder="e.g. Mathematics" data-testid="input-grade-subject" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem><FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="exam">Exam</SelectItem><SelectItem value="quiz">Quiz</SelectItem>
                        <SelectItem value="assignment">Assignment</SelectItem><SelectItem value="project">Project</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="assignmentName" render={({ field }) => (
                <FormItem><FormLabel>Assignment Name</FormLabel><FormControl><Input placeholder="e.g. Midterm Exam" data-testid="input-grade-assignment" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-3 gap-3">
                <FormField control={form.control} name="score" render={({ field }) => (
                  <FormItem><FormLabel>Score</FormLabel><FormControl><Input type="number" step="0.01" data-testid="input-grade-score" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="maxScore" render={({ field }) => (
                  <FormItem><FormLabel>Max Score</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="date" render={({ field }) => (
                  <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Notes</FormLabel><FormControl><Input placeholder="Optional" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createGrade.isPending || updateGrade.isPending} data-testid="button-save-grade">
                  {createGrade.isPending || updateGrade.isPending ? "Saving…" : "Save Grade"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
