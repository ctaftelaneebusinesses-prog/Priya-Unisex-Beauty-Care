import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ReceiptText, Sparkles, IndianRupee, Star, CalendarCheck, CalendarX, Percent, CheckCircle2, Clock } from "lucide-react";
import { Header } from "@/layouts/Header";
import { PageContainer } from "@/components/PageContainer";
import { DashboardCard } from "@/components/DashboardCard";
import { Select } from "@/components/Form";
import { RevenueAreaChart } from "@/components/charts/RevenueAreaChart";
import { employeeService } from "@/services/employeeService";
import { billingService } from "@/services/billingService";
import { appointmentService } from "@/services/appointmentService";
import { commissionService } from "@/services/commissionService";
import { getEmployeeReport, getRevenueSeries } from "@/services/reportService";
import { resolveDateRange } from "@/utils/dateRange";
import { isWithinRange } from "@/utils/dateRange";
import { formatCompactCurrency, formatCurrency } from "@/utils/currency";
import type { Appointment, Bill, CommissionRecord, DateRangePreset, Employee, EmployeeReview } from "@/types";

export function EmployeePerformancePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [reviews, setReviews] = useState<EmployeeReview[]>([]);
  const [commissionRecords, setCommissionRecords] = useState<CommissionRecord[]>([]);
  const [preset, setPreset] = useState<DateRangePreset>("THIS_MONTH");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      employeeService.getById(id),
      billingService.getAll(),
      appointmentService.getAll(),
      employeeService.getReviews(id),
      commissionService.getForEmployee(id),
    ]).then(([e, b, a, r, cr]) => {
      setEmployee(e ?? null);
      setBills(b);
      setAppointments(a.filter((appt) => appt.employeeId === id));
      setReviews(r);
      setCommissionRecords(cr);
      setIsLoading(false);
    });
  }, [id]);

  const range = useMemo(() => resolveDateRange(preset), [preset]);
  const scopedBills = useMemo(
    () => bills.filter((b) => isWithinRange(b.date, range) && b.status === "COMPLETED"),
    [bills, range]
  );

  const stats = useMemo(() => {
    if (!employee) return null;
    const [report] = getEmployeeReport(scopedBills, [employee]);
    return {
      bills: report?.bills ?? 0,
      servicesCompleted: report?.servicesCompleted ?? 0,
      revenue: report?.revenue ?? 0,
    };
  }, [scopedBills, employee]);

  const employeeOnlyBills = useMemo(() => {
    return scopedBills
      .map((b) => ({
        ...b,
        items: b.items.filter((i) => i.employeeId === id),
      }))
      .filter((b) => b.items.length > 0);
  }, [scopedBills, id]);

  const revenueSeries = useMemo(() => getRevenueSeries(employeeOnlyBills), [employeeOnlyBills]);

  const scopedCommissions = useMemo(
    () => commissionRecords.filter((r) => isWithinRange(r.date, range)),
    [commissionRecords, range]
  );
  const commissionSummary = useMemo(() => {
    const totalCommission = scopedCommissions.reduce((s, r) => s + r.commissionAmount, 0);
    const paidCommission = scopedCommissions.filter((r) => r.status === "Paid").reduce((s, r) => s + r.commissionAmount, 0);
    return {
      totalSales: scopedCommissions.reduce((s, r) => s + r.saleAmount, 0),
      totalCommission,
      paidCommission,
      pendingCommission: totalCommission - paidCommission,
    };
  }, [scopedCommissions]);

  const completedAppointments = appointments.filter((a) => a.status === "Completed").length;
  const cancelledAppointments = appointments.filter((a) => a.status === "Cancelled" || a.status === "No Show").length;
  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : "—";

  if (isLoading || !employee) {
    return (
      <>
        <Header title="Employee Performance" />
        <PageContainer>
          <p className="text-sm text-ink-600">Loading…</p>
        </PageContainer>
      </>
    );
  }

  return (
    <>
      <Header title={employee.name} subtitle={employee.position} />
      <PageContainer>
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => navigate("/employees")}
            className="flex items-center gap-1.5 text-sm text-ink-600 hover:text-ink-950 transition-colors"
          >
            <ArrowLeft size={16} /> Back to Employees
          </button>
          <Select value={preset} onChange={(e) => setPreset(e.target.value as DateRangePreset)} className="w-44">
            <option value="TODAY">Today</option>
            <option value="THIS_WEEK">This Week</option>
            <option value="THIS_MONTH">This Month</option>
            <option value="THIS_YEAR">This Year</option>
          </Select>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
          <DashboardCard label="Services Completed" value={String(stats?.servicesCompleted ?? 0)} icon={<Sparkles size={18} />} accent="gold" />
          <DashboardCard label="Bills" value={String(stats?.bills ?? 0)} icon={<ReceiptText size={18} />} accent="ink" />
          <DashboardCard label="Revenue Generated" value={formatCompactCurrency(stats?.revenue ?? 0)} icon={<IndianRupee size={18} />} accent="ink" />
          <DashboardCard label="Completed Appointments" value={String(completedAppointments)} icon={<CalendarCheck size={18} />} accent="sage" />
          <DashboardCard label="Cancelled Appointments" value={String(cancelledAppointments)} icon={<CalendarX size={18} />} accent="wine" />
          <DashboardCard label="Average Rating" value={avgRating} icon={<Star size={18} />} accent="gold" />
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-card border border-cream-200 mb-6">
          <h3 className="font-display text-lg text-ink-950 mb-3">Revenue Trend</h3>
          <RevenueAreaChart data={revenueSeries} />
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-card border border-cream-200 mb-6">
          <h3 className="font-display text-lg text-ink-950 mb-3">Commission Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <DashboardCard label="Total Sales" value={formatCurrency(commissionSummary.totalSales)} icon={<IndianRupee size={16} />} accent="ink" />
            <DashboardCard label="Total Commission" value={formatCurrency(commissionSummary.totalCommission)} icon={<Percent size={16} />} accent="gold" />
            <DashboardCard label="Paid Commission" value={formatCurrency(commissionSummary.paidCommission)} icon={<CheckCircle2 size={16} />} accent="sage" />
            <DashboardCard label="Pending Commission" value={formatCurrency(commissionSummary.pendingCommission)} icon={<Clock size={16} />} accent="wine" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-card border border-cream-200">
          <h3 className="font-display text-lg text-ink-950 mb-3">Customer Reviews</h3>
          {reviews.length === 0 ? (
            <p className="text-sm text-ink-600">No reviews recorded yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {reviews.map((r) => (
                <div key={r.id} className="border-b border-cream-100 last:border-0 pb-3 last:pb-0">
                  <div className="flex items-center gap-1 text-gold-500 mb-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={13} fill={i < r.rating ? "currentColor" : "none"} />
                    ))}
                  </div>
                  {r.comment && <p className="text-sm text-ink-700">{r.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </PageContainer>
    </>
  );
}
