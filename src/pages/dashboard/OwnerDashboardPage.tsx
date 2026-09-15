import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  IndianRupee,
  ReceiptText,
  Users,
  Clock,
  Landmark,
  CreditCard,
  Plus,
  UserPlus,
  Sparkles,
  UserRoundPlus,
  TrendingDown,
  TrendingUp,
  Percent,
  AlertTriangle,
  Gem,
  CalendarClock,
} from "lucide-react";
import { Header } from "@/layouts/Header";
import { PageContainer } from "@/components/PageContainer";
import { DashboardCard } from "@/components/DashboardCard";
import { Button } from "@/components/Button";
import { RevenueAreaChart } from "@/components/charts/RevenueAreaChart";
import { SimpleBarChart } from "@/components/charts/SimpleBarChart";
import { DonutChart, DonutLegend } from "@/components/charts/DonutChart";
import { billingService } from "@/services/billingService";
import { employeeService } from "@/services/employeeService";
import { serviceService } from "@/services/serviceService";
import { membershipService, membershipPlanService } from "@/services/membershipService";
import { expenseService } from "@/services/expenseService";
import { commissionService } from "@/services/commissionService";
import { inventoryService, isLowStock } from "@/services/inventoryService";
import { jewelleryRentalService } from "@/services/jewelleryService";
import {
  getDashboardStats,
  getEmployeeReport,
  getPaymentMethodReport,
  getRevenueSeries,
  getServiceReport,
} from "@/services/reportService";
import { resolveDateRange, isWithinRange } from "@/utils/dateRange";
import { formatCompactCurrency, formatCurrency } from "@/utils/currency";
import { isPast } from "date-fns";
import type {
  Bill,
  CommissionRecord,
  CustomerMembership,
  Employee,
  Expense,
  InventoryProduct,
  JewelleryRental,
  MembershipPlan,
  SalonService,
} from "@/types";

export function OwnerDashboardPage() {
  const navigate = useNavigate();
  const [bills, setBills] = useState<Bill[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [services, setServices] = useState<SalonService[]>([]);
  const [memberships, setMemberships] = useState<CustomerMembership[]>([]);
  const [membershipPlans, setMembershipPlans] = useState<MembershipPlan[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [commissionRecords, setCommissionRecords] = useState<CommissionRecord[]>([]);
  const [inventoryProducts, setInventoryProducts] = useState<InventoryProduct[]>([]);
  const [jewelleryRentals, setJewelleryRentals] = useState<JewelleryRental[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      billingService.getAll(),
      employeeService.getAll(),
      serviceService.getAll(),
      membershipService.getAll(),
      membershipPlanService.getAll(),
      expenseService.getAll(),
      commissionService.getAll(),
      inventoryService.getAll(),
      jewelleryRentalService.getAll(),
    ]).then(([b, e, s, m, plans, exp, cr, inv, jr]) => {
      setBills(b);
      setEmployees(e);
      setServices(s);
      setMemberships(m);
      setMembershipPlans(plans);
      setExpenses(exp);
      setCommissionRecords(cr);
      setInventoryProducts(inv);
      setJewelleryRentals(jr);
      setIsLoading(false);
    });
  }, []);

  const todayRange = useMemo(() => resolveDateRange("TODAY"), []);
  const todaysBills = useMemo(() => bills.filter((b) => isWithinRange(b.date, todayRange)), [bills, todayRange]);
  const last30DaysBills = useMemo(() => {
    const from = new Date();
    from.setDate(from.getDate() - 29);
    return bills.filter((b) => new Date(b.date) >= from);
  }, [bills]);

  const activeMembershipsCount = memberships.filter(
    (m) => m.status === "ACTIVE" || m.status === "EXPIRING_SOON"
  ).length;

  const stats = useMemo(
    () => getDashboardStats(todaysBills, bills, activeMembershipsCount),
    [todaysBills, bills, activeMembershipsCount]
  );
  const revenueSeries = useMemo(() => getRevenueSeries(last30DaysBills), [last30DaysBills]);
  const serviceReport = useMemo(() => getServiceReport(last30DaysBills, services).slice(0, 6), [last30DaysBills, services]);
  const employeeReport = useMemo(() => getEmployeeReport(last30DaysBills, employees).slice(0, 6), [last30DaysBills, employees]);
  const paymentMethodReport = useMemo(() => getPaymentMethodReport(last30DaysBills), [last30DaysBills]);

  const thisMonthRange = useMemo(() => resolveDateRange("THIS_MONTH"), []);
  const thisMonthBills = useMemo(
    () => bills.filter((b) => b.status === "COMPLETED" && isWithinRange(b.date, thisMonthRange)),
    [bills, thisMonthRange]
  );
  const thisMonthSales = thisMonthBills.reduce((s, b) => s + b.grandTotal, 0);
  const thisMonthExpenses = useMemo(
    () => expenses.filter((e) => e.status === "Recorded" && isWithinRange(e.date, thisMonthRange)).reduce((s, e) => s + e.amount, 0),
    [expenses, thisMonthRange]
  );
  const netBusinessAmount = thisMonthSales - thisMonthExpenses;
  const pendingCommission = useMemo(
    () => commissionRecords.filter((r) => r.status === "Pending").reduce((s, r) => s + r.commissionAmount, 0),
    [commissionRecords]
  );
  const activeWalletsCount = useMemo(
    () =>
      memberships.filter(
        (m) =>
          (m.status === "ACTIVE" || m.status === "EXPIRING_SOON") &&
          membershipPlans.find((p) => p.id === m.planId)?.type === "WALLET"
      ).length,
    [memberships, membershipPlans]
  );
  const lowStockCount = useMemo(() => inventoryProducts.filter(isLowStock).length, [inventoryProducts]);
  const activeRentalsCount = useMemo(
    () => jewelleryRentals.filter((r) => r.status === "RESERVED" || r.status === "RENTED").length,
    [jewelleryRentals]
  );
  const overdueRentalsCount = useMemo(
    () => jewelleryRentals.filter((r) => r.status === "RENTED" && isPast(new Date(r.expectedReturnDate))).length,
    [jewelleryRentals]
  );

  return (
    <>
      <Header title="Dashboard" subtitle="Here's how Priya UNISEX Beauty Care is performing today." />
      <PageContainer>
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <Button size="lg" variant="gold" icon={<Plus size={18} />} onClick={() => navigate("/billing/new")}>
            NEW BILL
          </Button>
          <Button variant="secondary" icon={<UserPlus size={16} />} onClick={() => navigate("/customers")}>
            Add Customer
          </Button>
          <Button variant="secondary" icon={<Sparkles size={16} />} onClick={() => navigate("/services")}>
            Add Service
          </Button>
          <Button variant="secondary" icon={<UserRoundPlus size={16} />} onClick={() => navigate("/employees")}>
            Add Employee
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
          <DashboardCard label="Today's Revenue" value={isLoading ? "…" : formatCompactCurrency(stats.todayRevenue)} icon={<IndianRupee size={18} />} accent="gold" />
          <DashboardCard label="Today's Bills" value={isLoading ? "…" : String(stats.todayBills)} icon={<ReceiptText size={18} />} accent="ink" />
          <DashboardCard label="Today's Customers" value={isLoading ? "…" : String(stats.todayCustomers)} icon={<Users size={18} />} accent="ink" />
          <DashboardCard label="Pending Payments" value={isLoading ? "…" : formatCompactCurrency(stats.pendingPayments)} icon={<Clock size={18} />} accent="wine" />
          <DashboardCard label="GST Collected" value={isLoading ? "…" : formatCompactCurrency(stats.gstCollected)} icon={<Landmark size={18} />} accent="ink" />
          <DashboardCard label="Active Memberships" value={isLoading ? "…" : String(stats.activeMemberships)} icon={<CreditCard size={18} />} accent="sage" />
        </div>

        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-600 mb-3">Business Health — This Month</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4 mb-6">
          <DashboardCard label="Total Sales" value={isLoading ? "…" : formatCompactCurrency(thisMonthSales)} icon={<TrendingUp size={16} />} accent="sage" />
          <DashboardCard label="Total Expenses" value={isLoading ? "…" : formatCompactCurrency(thisMonthExpenses)} icon={<TrendingDown size={16} />} accent="wine" />
          <DashboardCard label="Net Business Amount" value={isLoading ? "…" : formatCompactCurrency(netBusinessAmount)} icon={<IndianRupee size={16} />} accent={netBusinessAmount >= 0 ? "gold" : "wine"} />
          <DashboardCard label="Pending Commission" value={isLoading ? "…" : formatCompactCurrency(pendingCommission)} icon={<Percent size={16} />} accent="ink" />
          <DashboardCard label="Active Wallets" value={isLoading ? "…" : String(activeWalletsCount)} icon={<CreditCard size={16} />} accent="sage" />
          <DashboardCard label="Low Stock Items" value={isLoading ? "…" : String(lowStockCount)} icon={<AlertTriangle size={16} />} accent="wine" />
          <DashboardCard label="Jewellery Rentals" value={isLoading ? "…" : `${activeRentalsCount} active${overdueRentalsCount ? ` · ${overdueRentalsCount} overdue` : ""}`} icon={overdueRentalsCount ? <CalendarClock size={16} /> : <Gem size={16} />} accent={overdueRentalsCount ? "wine" : "ink"} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-5">
          <div className="xl:col-span-2 bg-white rounded-2xl p-5 shadow-card border border-cream-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-lg text-ink-950">Revenue — Last 30 Days</h3>
            </div>
            <RevenueAreaChart data={revenueSeries} />
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-card border border-cream-200">
            <h3 className="font-display text-lg text-ink-950 mb-3">Payment Methods</h3>
            <DonutChart
              data={paymentMethodReport.map((p) => ({ name: p.method, value: p.amount }))}
              valueFormatter={(v) => formatCurrency(v)}
            />
            <div className="mt-3">
              <DonutLegend
                data={paymentMethodReport.map((p) => ({ name: p.method, value: p.amount }))}
                valueFormatter={(v) => formatCurrency(v)}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl p-5 shadow-card border border-cream-200">
            <h3 className="font-display text-lg text-ink-950 mb-3">Top Services</h3>
            <SimpleBarChart
              data={serviceReport.map((s) => ({ name: s.serviceName, value: s.transactions }))}
              dataKey="value"
              labelKey="name"
              color="#c9a15b"
              layout="vertical"
            />
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-card border border-cream-200">
            <h3 className="font-display text-lg text-ink-950 mb-3">Top Employees by Revenue</h3>
            <SimpleBarChart
              data={employeeReport.map((e) => ({ name: e.employeeName, value: e.revenue }))}
              dataKey="value"
              labelKey="name"
              color="#14100d"
              layout="vertical"
              valueFormatter={(v) => formatCompactCurrency(v)}
            />
          </div>
        </div>
      </PageContainer>
    </>
  );
}
