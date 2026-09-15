import { useEffect, useMemo, useState } from "react";
import { Printer, Download, IndianRupee, ReceiptText, Percent, CreditCard, AlertTriangle, Gem, ShieldCheck } from "lucide-react";
import { Header } from "@/layouts/Header";
import { PageContainer } from "@/components/PageContainer";
import { DataTable } from "@/components/DataTable";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Select } from "@/components/Form";
import { DashboardCard } from "@/components/DashboardCard";
import { RevenueAreaChart } from "@/components/charts/RevenueAreaChart";
import { SimpleBarChart } from "@/components/charts/SimpleBarChart";
import { DonutChart, DonutLegend } from "@/components/charts/DonutChart";
import { useAuth } from "@/auth/AuthContext";
import { hasPermission } from "@/auth/permissions";
import { billingService } from "@/services/billingService";
import { employeeService } from "@/services/employeeService";
import { serviceService } from "@/services/serviceService";
import { commissionService, summarizeCommissionsByEmployee } from "@/services/commissionService";
import { inventoryService, isLowStock } from "@/services/inventoryService";
import { expenseService } from "@/services/expenseService";
import { membershipService, membershipPlanService } from "@/services/membershipService";
import { jewelleryRentalService } from "@/services/jewelleryService";
import {
  filterBillsByRange,
  getDiscountReport,
  getEmployeeReport,
  getGSTReport,
  getMembershipImpact,
  getPaymentMethodReport,
  getRevenueSeries,
  getServiceReport,
} from "@/services/reportService";
import { resolveDateRange, isWithinRange } from "@/utils/dateRange";
import { formatCurrency } from "@/utils/currency";
import { exportToCsv } from "@/utils/csvExport";
import { isPast, format } from "date-fns";
import type {
  Bill,
  CommissionRecord,
  CustomerMembership,
  DateRangePreset,
  Employee,
  Expense,
  InventoryProduct,
  JewelleryRental,
  MembershipPlan,
  SalonService,
  WalletTransaction,
} from "@/types";

type ReportTab =
  | "SALES"
  | "SERVICES"
  | "EMPLOYEES"
  | "MEMBERSHIPS"
  | "PAYMENTS"
  | "DISCOUNTS"
  | "COMMISSION"
  | "INVENTORY"
  | "EXPENSES"
  | "JEWELLERY";

const OWNER_TABS: Array<{ key: ReportTab; label: string }> = [
  { key: "SALES", label: "Sales Overview" },
  { key: "SERVICES", label: "Service Revenue" },
  { key: "EMPLOYEES", label: "Employee Revenue" },
  { key: "COMMISSION", label: "Staff Commission" },
  { key: "MEMBERSHIPS", label: "Membership Wallet" },
  { key: "PAYMENTS", label: "Payment Methods" },
  { key: "DISCOUNTS", label: "Discounts" },
  { key: "INVENTORY", label: "Inventory" },
  { key: "EXPENSES", label: "Expenses" },
  { key: "JEWELLERY", label: "Jewellery & Deposits" },
];

export function ReportsPage() {
  const { user } = useAuth();
  const isOwner = hasPermission(user?.role, "reports.owner");
  const [bills, setBills] = useState<Bill[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [services, setServices] = useState<SalonService[]>([]);
  const [commissionRecords, setCommissionRecords] = useState<CommissionRecord[]>([]);
  const [inventoryProducts, setInventoryProducts] = useState<InventoryProduct[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
  const [memberships, setMemberships] = useState<CustomerMembership[]>([]);
  const [membershipPlans, setMembershipPlans] = useState<MembershipPlan[]>([]);
  const [jewelleryRentals, setJewelleryRentals] = useState<JewelleryRental[]>([]);
  const [preset, setPreset] = useState<DateRangePreset>("THIS_MONTH");
  const [tab, setTab] = useState<ReportTab>("SALES");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isOwner) {
      Promise.all([billingService.getAll(), employeeService.getAll()]).then(([b, e]) => {
        setBills(b);
        setEmployees(e);
        setIsLoading(false);
      });
      return;
    }
    Promise.all([
      billingService.getAll(),
      employeeService.getAll(),
      serviceService.getAll(),
      commissionService.getAll(),
      inventoryService.getAll(),
      expenseService.getAll(),
      membershipService.getAll(),
      membershipPlanService.getAll(),
      jewelleryRentalService.getAll(),
      membershipService.getAllWalletTransactions(),
    ]).then(([b, e, s, cr, inv, exp, mem, plans, jr, wt]) => {
      setBills(b);
      setEmployees(e);
      setServices(s);
      setCommissionRecords(cr);
      setInventoryProducts(inv);
      setExpenses(exp);
      setMemberships(mem);
      setMembershipPlans(plans);
      setJewelleryRentals(jr);
      setWalletTransactions(wt);
      setIsLoading(false);
    });
  }, [isOwner]);

  const range = useMemo(() => resolveDateRange(preset), [preset]);
  const scopedBills = useMemo(() => filterBillsByRange(bills, range), [bills, range]);

  const myBills = useMemo(() => {
    if (isOwner || !user?.employeeId) return scopedBills;
    return scopedBills
      .map((b) => ({ ...b, items: b.items.filter((i) => i.employeeId === user.employeeId) }))
      .filter((b) => b.items.length > 0);
  }, [scopedBills, isOwner, user?.employeeId]);

  if (!isOwner) {
    return <MyPerformanceReport bills={myBills} preset={preset} onPresetChange={setPreset} employees={employees} employeeId={user?.employeeId} />;
  }

  const revenueSeries = getRevenueSeries(scopedBills);
  const serviceReport = getServiceReport(scopedBills, services);
  const employeeReport = getEmployeeReport(scopedBills, employees);
  const paymentReport = getPaymentMethodReport(scopedBills);
  const discountReport = getDiscountReport(scopedBills);
  const membershipImpact = getMembershipImpact(scopedBills);
  const gstReport = getGSTReport(scopedBills);
  const totalSales = scopedBills.reduce((s, b) => s + b.grandTotal, 0);

  const scopedCommissions = commissionRecords.filter((r) => preset === "CUSTOM" || isWithinRange(r.date, range));
  const commissionSummary = summarizeCommissionsByEmployee(scopedCommissions);
  const totalCommission = scopedCommissions.reduce((s, r) => s + r.commissionAmount, 0);
  const paidCommission = scopedCommissions.filter((r) => r.status === "Paid").reduce((s, r) => s + r.commissionAmount, 0);

  const lowStockProducts = inventoryProducts.filter(isLowStock);
  const stockValue = inventoryProducts.reduce((s, p) => s + p.quantity * p.purchasePrice, 0);

  const scopedExpenses = expenses.filter((e) => e.status === "Recorded" && (preset === "CUSTOM" || isWithinRange(e.date, range)));
  const totalExpenses = scopedExpenses.reduce((s, e) => s + e.amount, 0);
  const netBusinessAmount = totalSales - totalExpenses;

  const walletMemberships = memberships.filter((m) => membershipPlans.find((p) => p.id === m.planId)?.type === "WALLET");
  const activeWallets = walletMemberships.filter((m) => m.status === "ACTIVE" || m.status === "EXPIRING_SOON");
  const totalWalletBalance = activeWallets.reduce((s, m) => s + (m.walletBalance ?? 0), 0);
  const scopedWalletTx = walletTransactions.filter((t) => preset === "CUSTOM" || isWithinRange(t.date, range));

  const activeJewelleryRentals = jewelleryRentals.filter((r) => r.status === "RESERVED" || r.status === "RENTED");
  const overdueRentals = jewelleryRentals.filter((r) => r.status === "RENTED" && isPast(new Date(r.expectedReturnDate)));
  const jewelleryRevenue = jewelleryRentals
    .filter((r) => (r.status === "RENTED" || r.status === "RETURNED") && (preset === "CUSTOM" || isWithinRange(r.rentalDate, range)))
    .reduce((s, r) => s + r.rentalAmount, 0);
  const depositsHeld = activeJewelleryRentals.reduce((s, r) => s + r.securityDeposit, 0);

  return (
    <>
      <Header title="Reports" subtitle="Business performance across every part of the salon." />
      <PageContainer>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {OWNER_TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  tab === t.key ? "bg-ink-950 text-white" : "bg-white border border-cream-300 text-ink-700 hover:bg-cream-100"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Select value={preset} onChange={(e) => setPreset(e.target.value as DateRangePreset)} className="w-40">
              <option value="TODAY">Today</option>
              <option value="THIS_WEEK">This Week</option>
              <option value="THIS_MONTH">This Month</option>
              <option value="THIS_YEAR">This Year</option>
              <option value="CUSTOM">All Time</option>
            </Select>
            <Button variant="secondary" size="sm" icon={<Printer size={14} />} onClick={() => window.print()}>
              Print
            </Button>
          </div>
        </div>

        {tab === "SALES" && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
              <DashboardCard label="Total Sales" value={formatCurrency(totalSales)} icon={<IndianRupee size={18} />} accent="gold" />
              <DashboardCard label="Total Bills" value={String(scopedBills.length)} icon={<ReceiptText size={18} />} accent="ink" />
              <DashboardCard label="GST Collected" value={formatCurrency(gstReport.totalGst)} icon={<Percent size={18} />} accent="ink" />
              <DashboardCard label="Discounts Given" value={formatCurrency(discountReport.reduce((s, d) => s + d.discountAmount, 0))} icon={<CreditCard size={18} />} accent="wine" />
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-card border border-cream-200">
              <h3 className="font-display text-lg text-ink-950 mb-3">Revenue Trend</h3>
              <RevenueAreaChart data={revenueSeries} />
            </div>
          </>
        )}

        {tab === "SERVICES" && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl p-5 shadow-card border border-cream-200">
              <h3 className="font-display text-lg text-ink-950 mb-3">Most Billed Services</h3>
              <SimpleBarChart
                data={serviceReport.slice(0, 8).map((s) => ({ name: s.serviceName, value: s.transactions }))}
                dataKey="value"
                labelKey="name"
                color="#c9a15b"
                layout="vertical"
                height={320}
              />
            </div>
            <div>
              <div className="flex justify-end mb-2">
                <Button size="sm" variant="ghost" icon={<Download size={13} />} onClick={() => exportToCsv("service-report", serviceReport)}>
                  Export CSV
                </Button>
              </div>
              <DataTable
                isLoading={isLoading}
                rowKey={(r) => r.serviceId}
                data={serviceReport}
                columns={[
                  { key: "name", header: "Service", render: (r) => <span className="font-medium text-ink-950">{r.serviceName}</span> },
                  { key: "category", header: "Category", render: (r) => <span className="text-xs text-ink-600">{r.category}</span> },
                  { key: "count", header: "Transactions", align: "center", render: (r) => r.transactions },
                  { key: "revenue", header: "Revenue", align: "right", render: (r) => formatCurrency(r.revenue) },
                ]}
              />
            </div>
          </div>
        )}

        {tab === "EMPLOYEES" && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl p-5 shadow-card border border-cream-200">
              <h3 className="font-display text-lg text-ink-950 mb-3">Revenue by Employee</h3>
              <SimpleBarChart
                data={employeeReport.map((e) => ({ name: e.employeeName, value: e.revenue }))}
                dataKey="value"
                labelKey="name"
                color="#14100d"
                layout="vertical"
                valueFormatter={(v) => formatCurrency(v)}
                height={320}
              />
            </div>
            <DataTable
              isLoading={isLoading}
              rowKey={(r) => r.employeeId}
              data={employeeReport}
              columns={[
                { key: "name", header: "Employee", render: (r) => <span className="font-medium text-ink-950">{r.employeeName}</span> },
                { key: "bills", header: "Bills", align: "center", render: (r) => r.bills },
                { key: "services", header: "Services", align: "center", render: (r) => r.servicesCompleted },
                { key: "revenue", header: "Revenue", align: "right", render: (r) => formatCurrency(r.revenue) },
              ]}
            />
          </div>
        )}

        {tab === "COMMISSION" && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-5">
              <DashboardCard label="Total Commission" value={formatCurrency(totalCommission)} icon={<Percent size={16} />} accent="gold" />
              <DashboardCard label="Paid" value={formatCurrency(paidCommission)} icon={<CreditCard size={16} />} accent="sage" />
              <DashboardCard label="Pending" value={formatCurrency(totalCommission - paidCommission)} icon={<CreditCard size={16} />} accent="wine" />
            </div>
            <div className="flex justify-end mb-2">
              <Button size="sm" variant="ghost" icon={<Download size={13} />} onClick={() => exportToCsv("staff-commission-report", commissionSummary)}>
                Export CSV
              </Button>
            </div>
            <DataTable
              isLoading={isLoading}
              rowKey={(r) => r.employeeId}
              data={commissionSummary}
              emptyMessage="No commission activity in this period."
              columns={[
                { key: "name", header: "Employee", render: (r) => <span className="font-medium text-ink-950">{r.employeeName}</span> },
                { key: "services", header: "Services", align: "center", render: (r) => r.servicesCompleted },
                { key: "sales", header: "Sales", align: "right", render: (r) => formatCurrency(r.totalSales) },
                { key: "commission", header: "Total Commission", align: "right", render: (r) => formatCurrency(r.totalCommission) },
                { key: "paid", header: "Paid", align: "right", render: (r) => formatCurrency(r.paidCommission) },
                { key: "pending", header: "Pending", align: "right", render: (r) => formatCurrency(r.pendingCommission) },
              ]}
            />
          </div>
        )}

        {tab === "MEMBERSHIPS" && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
              <DashboardCard label="Bills Using Discount Membership" value={String(membershipImpact.billsWithMembership)} icon={<CreditCard size={18} />} accent="gold" />
              <DashboardCard label="Discount Benefit Given" value={formatCurrency(membershipImpact.totalMembershipDiscountGiven)} icon={<IndianRupee size={18} />} accent="wine" />
              <DashboardCard label="Active Wallets" value={String(activeWallets.length)} icon={<CreditCard size={18} />} accent="sage" />
              <DashboardCard label="Total Wallet Balance" value={formatCurrency(totalWalletBalance)} icon={<IndianRupee size={18} />} accent="ink" />
            </div>
            <h3 className="font-display text-lg text-ink-950 mb-3">Wallet Transactions</h3>
            <DataTable
              isLoading={isLoading}
              rowKey={(t) => t.id}
              data={scopedWalletTx}
              emptyMessage="No wallet transactions in this period."
              columns={[
                { key: "date", header: "Date", render: (t) => format(new Date(t.date), "d MMM yyyy") },
                { key: "membership", header: "Membership", render: (t) => t.membershipId },
                { key: "type", header: "Type", render: (t) => <Badge tone="neutral">{t.type}</Badge> },
                { key: "invoice", header: "Invoice #", render: (t) => t.invoiceNumber ?? "—" },
                { key: "added", header: "Added", align: "right", render: (t) => (t.amountAdded ? formatCurrency(t.amountAdded) : "—") },
                { key: "used", header: "Used", align: "right", render: (t) => (t.amountUsed ? formatCurrency(t.amountUsed) : "—") },
                { key: "balance", header: "New Balance", align: "right", render: (t) => <span className="font-semibold">{formatCurrency(t.newBalance)}</span> },
              ]}
            />
          </div>
        )}

        {tab === "PAYMENTS" && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl p-5 shadow-card border border-cream-200">
              <DonutChart data={paymentReport.map((p) => ({ name: p.method, value: p.amount }))} valueFormatter={(v) => formatCurrency(v)} height={260} />
              <div className="mt-4">
                <DonutLegend data={paymentReport.map((p) => ({ name: p.method, value: p.amount }))} valueFormatter={(v) => formatCurrency(v)} />
              </div>
            </div>
            <DataTable
              isLoading={isLoading}
              rowKey={(r) => r.method}
              data={paymentReport}
              columns={[
                { key: "method", header: "Method", render: (r) => <span className="font-medium text-ink-950">{r.method}</span> },
                { key: "count", header: "Transactions", align: "center", render: (r) => r.count },
                { key: "amount", header: "Amount", align: "right", render: (r) => <span className="font-semibold">{formatCurrency(r.amount)}</span> },
              ]}
            />
          </div>
        )}

        {tab === "DISCOUNTS" && (
          <div>
            <div className="flex justify-end mb-2">
              <Button size="sm" variant="ghost" icon={<Download size={13} />} onClick={() => exportToCsv("discount-report", discountReport)}>
                Export CSV
              </Button>
            </div>
            <DataTable
              isLoading={isLoading}
              rowKey={(r) => r.invoiceNumber}
              data={discountReport}
              emptyMessage="No discounts given in this period."
              columns={[
                { key: "invoice", header: "Invoice #", render: (r) => <span className="font-semibold text-ink-950">{r.invoiceNumber}</span> },
                { key: "customer", header: "Customer", render: (r) => r.customerName },
                { key: "date", header: "Date", render: (r) => format(new Date(r.date), "d MMM yyyy") },
                { key: "discount", header: "Discount", align: "right", render: (r) => formatCurrency(r.discountAmount) },
                { key: "total", header: "Bill Total", align: "right", render: (r) => formatCurrency(r.grandTotal) },
              ]}
            />
          </div>
        )}

        {tab === "INVENTORY" && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-5">
              <DashboardCard label="Products Tracked" value={String(inventoryProducts.length)} icon={<AlertTriangle size={16} />} accent="ink" />
              <DashboardCard label="Low Stock Items" value={String(lowStockProducts.length)} icon={<AlertTriangle size={16} />} accent="wine" />
              <DashboardCard label="Stock Value" value={formatCurrency(stockValue)} icon={<IndianRupee size={16} />} accent="gold" />
            </div>
            <div className="flex justify-end mb-2">
              <Button size="sm" variant="ghost" icon={<Download size={13} />} onClick={() => exportToCsv("inventory-report", inventoryProducts)}>
                Export CSV
              </Button>
            </div>
            <DataTable
              isLoading={isLoading}
              rowKey={(p) => p.id}
              data={inventoryProducts}
              columns={[
                { key: "name", header: "Product", render: (p) => <span className="font-medium text-ink-950">{p.name}</span> },
                { key: "category", header: "Category", render: (p) => p.category },
                { key: "stock", header: "Current Stock", align: "center", render: (p) => `${p.quantity} ${p.unit}` },
                { key: "min", header: "Min. Level", align: "center", render: (p) => `${p.minStockLevel} ${p.unit}` },
                { key: "status", header: "Status", render: (p) => (isLowStock(p) ? <Badge tone="danger">LOW STOCK</Badge> : <Badge tone="success">OK</Badge>) },
                { key: "value", header: "Stock Value", align: "right", render: (p) => formatCurrency(p.quantity * p.purchasePrice) },
              ]}
            />
          </div>
        )}

        {tab === "EXPENSES" && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-5">
              <DashboardCard label="Total Sales" value={formatCurrency(totalSales)} icon={<IndianRupee size={16} />} accent="sage" />
              <DashboardCard label="Total Expenses" value={formatCurrency(totalExpenses)} icon={<CreditCard size={16} />} accent="wine" />
              <DashboardCard label="Net Business Amount" value={formatCurrency(netBusinessAmount)} icon={<IndianRupee size={16} />} accent={netBusinessAmount >= 0 ? "gold" : "wine"} />
            </div>
            <div className="flex justify-end mb-2">
              <Button size="sm" variant="ghost" icon={<Download size={13} />} onClick={() => exportToCsv("expense-report", scopedExpenses)}>
                Export CSV
              </Button>
            </div>
            <DataTable
              isLoading={isLoading}
              rowKey={(e) => e.id}
              data={scopedExpenses}
              emptyMessage="No expenses recorded in this period."
              columns={[
                { key: "date", header: "Date", render: (e) => format(new Date(e.date), "d MMM yyyy") },
                { key: "category", header: "Category", render: (e) => <Badge tone="neutral">{e.category}</Badge> },
                { key: "description", header: "Description", render: (e) => e.description },
                { key: "amount", header: "Amount", align: "right", render: (e) => <span className="font-semibold">{formatCurrency(e.amount)}</span> },
              ]}
            />
          </div>
        )}

        {tab === "JEWELLERY" && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
              <DashboardCard label="Active Rentals" value={String(activeJewelleryRentals.length)} icon={<Gem size={16} />} accent="ink" />
              <DashboardCard label="Overdue Returns" value={String(overdueRentals.length)} icon={<AlertTriangle size={16} />} accent="wine" />
              <DashboardCard label="Rental Revenue" value={formatCurrency(jewelleryRevenue)} icon={<IndianRupee size={16} />} accent="gold" />
              <DashboardCard label="Security Deposits Held" value={formatCurrency(depositsHeld)} icon={<ShieldCheck size={16} />} accent="sage" />
            </div>
            <div className="flex justify-end mb-2">
              <Button size="sm" variant="ghost" icon={<Download size={13} />} onClick={() => exportToCsv("jewellery-rental-report", jewelleryRentals)}>
                Export CSV
              </Button>
            </div>
            <DataTable
              isLoading={isLoading}
              rowKey={(r) => r.id}
              data={jewelleryRentals}
              columns={[
                { key: "item", header: "Item", render: (r) => <span className="font-medium text-ink-950">{r.jewelleryItemName}</span> },
                { key: "customer", header: "Customer", render: (r) => r.customerName },
                { key: "status", header: "Status", render: (r) => <Badge tone={r.status === "RETURNED" ? "success" : r.status === "CANCELLED" ? "neutral" : "info"}>{r.status}</Badge> },
                { key: "amount", header: "Rental Amount", align: "right", render: (r) => formatCurrency(r.rentalAmount) },
                { key: "deposit", header: "Security Deposit", align: "right", render: (r) => formatCurrency(r.securityDeposit) },
                { key: "refund", header: "Deposit Refunded", align: "right", render: (r) => (r.finalRefundAmount !== undefined ? formatCurrency(r.finalRefundAmount) : "—") },
              ]}
            />
          </div>
        )}
      </PageContainer>
    </>
  );
}

function MyPerformanceReport({
  bills,
  preset,
  onPresetChange,
  employees,
  employeeId,
}: {
  bills: Bill[];
  preset: DateRangePreset;
  onPresetChange: (p: DateRangePreset) => void;
  employees: Employee[];
  employeeId?: string;
}) {
  const revenueSeries = getRevenueSeries(bills);
  const [report] = employeeId ? getEmployeeReport(bills, employees.filter((e) => e.id === employeeId)) : [undefined];

  return (
    <>
      <Header title="My Performance" subtitle="Your billing activity and revenue contribution." />
      <PageContainer>
        <div className="flex justify-end mb-5">
          <Select value={preset} onChange={(e) => onPresetChange(e.target.value as DateRangePreset)} className="w-44">
            <option value="TODAY">Today</option>
            <option value="THIS_WEEK">This Week</option>
            <option value="THIS_MONTH">This Month</option>
            <option value="THIS_YEAR">This Year</option>
          </Select>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-5">
          <DashboardCard label="Bills" value={String(report?.bills ?? 0)} icon={<ReceiptText size={18} />} accent="ink" />
          <DashboardCard label="Services Completed" value={String(report?.servicesCompleted ?? 0)} icon={<Percent size={18} />} accent="gold" />
          <DashboardCard label="Revenue Generated" value={formatCurrency(report?.revenue ?? 0)} icon={<IndianRupee size={18} />} accent="sage" />
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-card border border-cream-200">
          <h3 className="font-display text-lg text-ink-950 mb-3">Revenue Trend</h3>
          <RevenueAreaChart data={revenueSeries} />
        </div>
      </PageContainer>
    </>
  );
}
