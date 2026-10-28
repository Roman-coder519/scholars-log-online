import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Download, Trash2, Pencil, TrendingUp, TrendingDown, Wallet, Calendar, Filter, Banknote } from "lucide-react";
import {
  useListTransactions, useGetTransactionsSummary, useCreateTransaction, useUpdateTransaction, useDeleteTransaction,
  getListTransactionsQueryKey, getGetTransactionsSummaryQueryKey
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
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";

const INCOME_CATEGORIES = ["Salary", "Freelance", "Scholarship", "Gift", "Investment", "Allowance", "Other"];
const EXPENSE_CATEGORIES = ["Food", "Transport", "Books", "Stationery", "Entertainment", "Health", "Clothing", "Utilities", "Rent", "Subscriptions", "Other"];
const EXPENSE_COLORS = ['#c0392b', '#e74c3c', '#d35400', '#f39c12', '#f1c40f', '#16a085', '#27ae60', '#2980b9', '#8e44ad', '#2c3e50', '#7f8c8d'];

const transactionSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Must be a valid positive amount"),
  category: z.string().min(1, "Category is required"),
  description: z.string().min(1, "Description is required"),
  date: z.string().min(1, "Date is required"),
  note: z.string().optional(),
});
type TransactionFormValues = z.infer<typeof transactionSchema>;

const formatCurrency = (val: string | number) => {
  const num = typeof val === 'string' ? parseFloat(val) : val;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num || 0);
};

const formatMonth = (m: string) => {
  if (!m) return "";
  const [year, month] = m.split("-");
  if (!year || !month) return m;
  const d = new Date(parseInt(year), parseInt(month) - 1, 1);
  return d.toLocaleDateString('default', { month: 'short', year: 'numeric' });
};

export default function Accounts() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTransaction, setEditTransaction] = useState<any>(null);
  
  const [filterType, setFilterType] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>("all");

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const queryParams = {
    ...(filterType !== "all" ? { type: filterType as "income" | "expense" } : {}),
    ...(filterMonth !== "all" ? { month: filterMonth } : {})
  };

  const { data: transactions = [], isLoading: isLoadingTx } = useListTransactions(queryParams, { query: { queryKey: getListTransactionsQueryKey(queryParams) } });
  const { data: summary, isLoading: isLoadingSummary } = useGetTransactionsSummary({ months: 6 }, { query: { queryKey: getGetTransactionsSummaryQueryKey({ months: 6 }) } });

  const createTransaction = useCreateTransaction();
  const updateTransaction = useUpdateTransaction();
  const deleteTransaction = useDeleteTransaction();

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: { type: "expense", amount: "", category: "", description: "", date: new Date().toISOString().split("T")[0], note: "" },
  });

  const formType = form.watch("type");
  const categoryOptions = formType === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  useEffect(() => {
    const currentCategory = form.getValues("category");
    if (currentCategory && !categoryOptions.includes(currentCategory)) {
      form.setValue("category", "");
    }
  }, [formType, categoryOptions, form]);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
  }

  function openEdit(tx: any) {
    setEditTransaction(tx);
    form.reset({
      type: tx.type,
      amount: tx.amount.toString(),
      category: tx.category,
      description: tx.description,
      date: tx.date,
      note: tx.note || ""
    });
    setDialogOpen(true);
  }

  function openCreate() {
    setEditTransaction(null);
    form.reset({
      type: "expense",
      amount: "",
      category: "",
      description: "",
      date: new Date().toISOString().split("T")[0],
      note: ""
    });
    setDialogOpen(true);
  }

  function onSubmit(values: TransactionFormValues) {
    const payload = {
      ...values,
      note: values.note || null,
    };
    if (editTransaction) {
      updateTransaction.mutate({ id: editTransaction.id, data: payload }, {
        onSuccess: () => { toast({ title: "Transaction updated" }); invalidate(); setDialogOpen(false); }
      });
    } else {
      createTransaction.mutate({ data: payload }, {
        onSuccess: () => { toast({ title: "Transaction added" }); invalidate(); setDialogOpen(false); }
      });
    }
  }

  const monthOptions = useMemo(() => {
    const result = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const labelStr = d.toLocaleDateString('default', { month: 'long', year: 'numeric' });
      result.push({ value: monthStr, label: labelStr });
    }
    return result;
  }, []);

  const chartData = (summary?.monthlyData || [])
    .map(d => ({
      month: d.month,
      income: parseFloat(d.income),
      expenses: parseFloat(d.expenses),
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const pieData = (summary?.expensesByCategory || [])
    .map(d => ({
      name: d.category,
      value: parseFloat(d.total)
    }))
    .sort((a, b) => b.value - a.value);

  const transactionsByDate = useMemo(() => {
    const groups: Record<string, typeof transactions> = {};
    transactions.forEach(tx => {
      if (!groups[tx.date]) groups[tx.date] = [];
      groups[tx.date].push(tx);
    });
    return Object.keys(groups).sort((a, b) => b.localeCompare(a)).map(date => ({
      date,
      transactions: groups[date]
    }));
  }, [transactions]);

  const totalIncome = summary?.totalIncome ? parseFloat(summary.totalIncome) : 0;
  const totalExpenses = summary?.totalExpenses ? parseFloat(summary.totalExpenses) : 0;
  const netBalance = summary?.netBalance ? parseFloat(summary.netBalance) : 0;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto print:p-0 print:max-w-none">
      
      {/* HEADER (Screen) */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 print:hidden">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Accounts</h1>
          <p className="text-muted-foreground mt-1 text-sm">Track your finances and monitor your spending.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2 bg-background" onClick={() => window.print()}>
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export PDF</span>
          </Button>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Transaction
          </Button>
        </div>
      </motion.div>

      {/* HEADER (Print) */}
      <div className="hidden print:block mb-8">
        <h1 className="text-3xl font-bold border-b pb-4 mb-2">Scholar's Log — Financial Report</h1>
        <p className="text-sm text-gray-500">
          Generated on {new Date().toLocaleDateString('default', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 print:gap-8 print:mb-10">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="p-5 rounded-2xl border bg-card print:border-gray-200 print:shadow-none">
          <div className="flex items-center gap-3 mb-3 text-emerald-600 dark:text-emerald-400 print:text-emerald-700">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl print:bg-transparent print:p-0"><TrendingUp className="w-5 h-5" /></div>
            <h3 className="font-semibold text-sm">Total Income</h3>
          </div>
          <p className="font-display text-3xl font-bold text-foreground print:text-black">{formatCurrency(totalIncome)}</p>
        </motion.div>
        
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="p-5 rounded-2xl border bg-card print:border-gray-200 print:shadow-none">
          <div className="flex items-center gap-3 mb-3 text-rose-600 dark:text-rose-400 print:text-rose-700">
            <div className="p-2 bg-rose-50 dark:bg-rose-900/20 rounded-xl print:bg-transparent print:p-0"><TrendingDown className="w-5 h-5" /></div>
            <h3 className="font-semibold text-sm">Total Expenses</h3>
          </div>
          <p className="font-display text-3xl font-bold text-foreground print:text-black">{formatCurrency(totalExpenses)}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="p-5 rounded-2xl border bg-card print:border-gray-200 print:shadow-none">
          <div className="flex items-center gap-3 mb-3 text-blue-600 dark:text-blue-400 print:text-blue-700">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl print:bg-transparent print:p-0"><Wallet className="w-5 h-5" /></div>
            <h3 className="font-semibold text-sm">Net Balance</h3>
          </div>
          <p className={cn("font-display text-3xl font-bold", netBalance >= 0 ? "text-foreground print:text-black" : "text-rose-600 dark:text-rose-400 print:text-rose-700")}>
            {formatCurrency(netBalance)}
          </p>
        </motion.div>
      </div>

      {/* CHARTS (Screen only) */}
      {!isLoadingSummary && summary && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8 print:hidden">
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="lg:col-span-2 p-6 rounded-2xl border bg-card flex flex-col">
            <h3 className="font-semibold mb-6">Cash Flow</h3>
            <div className="flex-1 min-h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tickFormatter={formatMonth} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                  <RechartsTooltip 
                    formatter={(val: number) => formatCurrency(val)} 
                    labelFormatter={formatMonth} 
                    contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))', padding: '12px' }} 
                    cursor={{ fill: 'hsl(var(--muted))' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '14px' }} />
                  <Bar dataKey="income" name="Income" fill="#2d7a4f" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="expenses" name="Expenses" fill="#c0392b" radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
          
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.25 }} className="p-6 rounded-2xl border bg-card flex flex-col">
            <h3 className="font-semibold mb-2">Expenses Breakdown</h3>
            {pieData.length > 0 ? (
              <div className="flex-1 flex flex-col justify-center">
                <div className="h-[180px] w-full mb-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={2} stroke="none">
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={EXPENSE_COLORS[index % EXPENSE_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        formatter={(val: number) => formatCurrency(val)}
                        contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2.5 max-h-[110px] overflow-y-auto pr-2">
                  {pieData.slice(0, 5).map((d, i) => (
                    <div key={d.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2.5">
                        <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: EXPENSE_COLORS[i % EXPENSE_COLORS.length] }} />
                        <span className="text-muted-foreground truncate max-w-[120px]">{d.name}</span>
                      </div>
                      <span className="font-medium text-foreground">{formatCurrency(d.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">No expenses to display</div>
            )}
          </motion.div>
        </div>
      )}

      {/* MONTHLY SUMMARY TABLE (Print only) */}
      <div className="hidden print:block mb-10 break-inside-avoid">
        <h3 className="font-bold text-lg border-b border-black pb-2 mb-4">Monthly Summary</h3>
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="py-3 font-semibold text-gray-700">Month</th>
              <th className="py-3 font-semibold text-gray-700 text-right">Income</th>
              <th className="py-3 font-semibold text-gray-700 text-right">Expenses</th>
              <th className="py-3 font-semibold text-gray-700 text-right">Net Flow</th>
            </tr>
          </thead>
          <tbody>
            {chartData.length > 0 ? chartData.map(d => (
              <tr key={d.month} className="border-b border-gray-100">
                <td className="py-3 font-medium">{formatMonth(d.month)}</td>
                <td className="py-3 text-right text-emerald-700">{formatCurrency(d.income)}</td>
                <td className="py-3 text-right text-rose-700">{formatCurrency(d.expenses)}</td>
                <td className="py-3 text-right font-semibold">{formatCurrency(d.income - d.expenses)}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={4} className="py-4 text-center text-gray-500 italic">No monthly data available.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* TRANSACTIONS LIST */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
          <h2 className="font-display text-xl font-bold">Recent Transactions</h2>
          <div className="flex items-center gap-2">
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger className="w-[140px] h-9 bg-card">
                <Calendar className="w-3.5 h-3.5 mr-2 opacity-50" />
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                {monthOptions.map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[120px] h-9 bg-card">
                <Filter className="w-3.5 h-3.5 mr-2 opacity-50" />
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="hidden print:block break-inside-avoid">
           <h3 className="font-bold text-lg border-b border-black pb-2 mb-6">Transaction Log</h3>
        </div>

        {isLoadingTx ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-[72px] rounded-xl bg-muted/50 animate-pulse print:hidden" />)}
          </div>
        ) : transactionsByDate.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground bg-card rounded-2xl border border-dashed print:border-none print:bg-transparent">
            <div className="w-12 h-12 rounded-full bg-muted mx-auto flex items-center justify-center mb-3 print:hidden">
              <Banknote className="w-5 h-5 opacity-40" />
            </div>
            <p className="font-display font-semibold text-base text-foreground">No transactions found</p>
            <p className="text-sm mt-1 mb-5 opacity-80">Start tracking your income and expenses.</p>
            <Button onClick={openCreate} variant="outline" className="print:hidden h-9">Add Transaction</Button>
          </div>
        ) : (
          <div className="space-y-8 print:space-y-6">
            {transactionsByDate.map(group => (
              <div key={group.date} className="space-y-3 print:space-y-2 break-inside-avoid">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1 print:text-black">
                  {new Date(group.date).toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </h4>
                <div className="space-y-2 print:space-y-0 text-sm">
                  {group.transactions.map((tx) => (
                    <div 
                      key={tx.id} 
                      className="flex items-center gap-4 p-4 rounded-xl border bg-card shadow-sm hover:border-primary/20 transition-all group print:border-b print:border-gray-200 print:border-x-0 print:border-t-0 print:rounded-none print:shadow-none print:bg-transparent print:p-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-medium truncate print:font-semibold print:text-base">{tx.description}</p>
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-muted text-muted-foreground print:border print:border-gray-300 print:bg-transparent print:text-gray-600">
                            {tx.category}
                          </span>
                        </div>
                        {tx.note && <p className="text-xs text-muted-foreground truncate">{tx.note}</p>}
                      </div>
                      <div className={cn("font-display font-bold whitespace-nowrap text-right text-base", tx.type === "income" ? "text-emerald-600 dark:text-emerald-400 print:text-emerald-700" : "text-foreground print:text-black")}>
                        {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}
                      </div>
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity print:hidden">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground" onClick={() => openEdit(tx)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                          onClick={() => deleteTransaction.mutate({ id: tx.id }, { onSuccess: () => { toast({ title: "Transaction deleted" }); invalidate(); } })}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* DIALOG */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">{editTransaction ? "Edit Transaction" : "New Transaction"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Type</FormLabel>
                  <div className="flex gap-2">
                    <Button 
                      type="button" 
                      variant={field.value === "expense" ? "default" : "outline"} 
                      className={cn("flex-1", field.value === "expense" && "bg-rose-600 hover:bg-rose-700 text-white border-transparent")}
                      onClick={() => field.onChange("expense")}
                    >
                      Expense
                    </Button>
                    <Button 
                      type="button" 
                      variant={field.value === "income" ? "default" : "outline"} 
                      className={cn("flex-1", field.value === "income" && "bg-emerald-600 hover:bg-emerald-700 text-white border-transparent")}
                      onClick={() => field.onChange("income")}
                    >
                      Income
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )} />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="amount" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                        <Input type="number" step="0.01" min="0" placeholder="0.00" className="pl-7" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="date" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger></FormControl>
                      <SelectContent>
                        {categoryOptions.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl><Input placeholder="e.g. Groceries" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="note" render={({ field }) => (
                <FormItem>
                  <FormLabel>Note <span className="text-muted-foreground font-normal">(Optional)</span></FormLabel>
                  <FormControl><Input placeholder="Additional details..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createTransaction.isPending || updateTransaction.isPending}>
                  {createTransaction.isPending || updateTransaction.isPending ? "Saving…" : "Save Transaction"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
