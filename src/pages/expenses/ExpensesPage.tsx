import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Ban, IndianRupee, TrendingDown, TrendingUp, Download } from "lucide-react";
import { Header } from "@/layouts/Header";
import { PageContainer } from "@/components/PageContainer";
import { DataTable } from "@/components/DataTable";
import type { DataTableColumn } from "@/components/DataTable";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Select } from "@/components/Form";
import { DashboardCard } from "@/components/DashboardCard";
import { SimpleBarChart } from "@/components/charts/SimpleBarChart";
import { ExpenseFormModal } from "@/features/expenses/ExpenseFormModal";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { expenseService } from "@/services/expenseService";
import { billingService } from "@/services/billingService";
import { useToast } from "@/components/Toast";
import { resolveDateRange, isWithinRange } from "@/utils/dateRange";
import { formatCurrency } from "@/utils/currency";
import { exportToCsv } from "@/utils/csvExport";
import { EXPENSE_CATEGORIES } from "@/types";
import { format } from "date-fns";
import type { Bill, DateRangePreset, Expense } from "@/types";

export function ExpensesPage() {
  const { showToast } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [preset, setPreset] = useState<DateRangePreset>("THIS_MONTH");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [voidTarget, setVoidTarget] = useState<Expense | null>(null);

  const load = () => {
    setIsLoading(true);
    Promise.all([expenseService.getAll(), billingService.getAll()]).then(([e, b]) => {
      setExpenses(e.sort((x, y) => new Date(y.date).getTime() - new Date(x.date).getTime()));
      setBills(b);
      setIsLoading(false);
    });
  };

  useEffect(load, []);

  const range = useMemo(() => resolveDateRange(preset), [preset]);
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const inRange = preset === "CUSTOM" ? true : isWithinRange(e.date, range);
      const matchesCategory = categoryFilter === "ALL" || e.category === categoryFilter;
      return inRange && matchesCategory && e.status === "Recorded";
    });
  }, [expenses, preset, range, categoryFilter]);

  const totalExpenses = filteredExpenses.reduce((s, e) => s + e.amount, 0);
  const totalSales = useMemo(() => {
    return bills
      .filter((b) => b.status === "COMPLETED" && (preset === "CUSTOM" || isWithinRange(b.date, range)))
      .reduce((s, b) => s + b.grandTotal, 0);
  }, [bills, preset, range]);
  const netBusinessAmount = totalSales - totalExpenses;

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of filteredExpenses) map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredExpenses]);

  const handleVoid = async () => {
    if (!voidTarget) return;
    await expenseService.void(voidTarget.id);
    showToast("Expense voided.");
    setVoidTarget(null);
    load();
  };

  const columns: DataTableColumn<Expense>[] = [
    { key: "date", header: "Date", render: (e) => format(new Date(e.date), "d MMM yyyy") },
    { key: "category", header: "Category", render: (e) => <Badge tone="neutral">{e.category}</Badge> },
    { key: "description", header: "Description", render: (e) => e.description },
    { key: "reference", header: "Reference #", render: (e) => e.referenceNumber ?? "—" },
    { key: "method", header: "Payment Method", render: (e) => e.paymentMethod },
    { key: "amount", header: "Amount", align: "right", render: (e) => <span className="font-semibold">{formatCurrency(e.amount)}</span> },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (e) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => { setEditingExpense(e); setIsFormOpen(true); }} className="text-ink-600 hover:text-ink-950 p-1.5 rounded-lg hover:bg-cream-100">
            <Pencil size={14} />
          </button>
          <button onClick={() => setVoidTarget(e)} className="text-wine-600 hover:bg-wine-50 p-1.5 rounded-lg">
            <Ban size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <Header title="Expenses" subtitle="Record salon expenses and see the true net business amount." />
      <PageContainer>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-48">
              <option value="ALL">All Categories</option>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
            <Select value={preset} onChange={(e) => setPreset(e.target.value as DateRangePreset)} className="w-40">
              <option value="TODAY">Today</option>
              <option value="THIS_WEEK">This Week</option>
              <option value="THIS_MONTH">This Month</option>
              <option value="THIS_YEAR">This Year</option>
              <option value="CUSTOM">All Time</option>
            </Select>
            <Button variant="secondary" size="sm" icon={<Download size={13} />} onClick={() => exportToCsv("expense-report", filteredExpenses)}>
              Export
            </Button>
          </div>
          <Button
            variant="gold"
            icon={<Plus size={16} />}
            onClick={() => {
              setEditingExpense(null);
              setIsFormOpen(true);
            }}
          >
            Add Expense
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-5">
          <DashboardCard label="Total Sales" value={formatCurrency(totalSales)} icon={<TrendingUp size={16} />} accent="sage" />
          <DashboardCard label="Total Expenses" value={formatCurrency(totalExpenses)} icon={<TrendingDown size={16} />} accent="wine" />
          <DashboardCard label="Net Business Amount" value={formatCurrency(netBusinessAmount)} icon={<IndianRupee size={16} />} accent={netBusinessAmount >= 0 ? "gold" : "wine"} />
        </div>

        {byCategory.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-card border border-cream-200 mb-6">
            <h3 className="font-display text-lg text-ink-950 mb-3">Expenses by Category</h3>
            <SimpleBarChart
              data={byCategory}
              dataKey="value"
              labelKey="name"
              color="#7a2540"
              layout="vertical"
              valueFormatter={(v) => formatCurrency(v)}
            />
          </div>
        )}

        <DataTable columns={columns} data={filteredExpenses} rowKey={(e) => e.id} isLoading={isLoading} emptyMessage="No expenses recorded for this filter." />
      </PageContainer>

      <ExpenseFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        expense={editingExpense}
        onSaved={() => {
          setIsFormOpen(false);
          load();
        }}
      />
      <ConfirmationDialog
        isOpen={!!voidTarget}
        title="Void this expense?"
        message={`"${voidTarget?.description}" will be excluded from expense reports. This cannot be undone.`}
        confirmLabel="Void Expense"
        variant="danger"
        onConfirm={handleVoid}
        onCancel={() => setVoidTarget(null)}
      />
    </>
  );
}
