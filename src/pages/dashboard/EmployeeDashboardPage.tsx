import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IndianRupee, ReceiptText, Users, CheckCircle2, Plus, UserPlus, History } from "lucide-react";
import { Header } from "@/layouts/Header";
import { PageContainer } from "@/components/PageContainer";
import { DashboardCard } from "@/components/DashboardCard";
import { Button } from "@/components/Button";
import { useAuth } from "@/auth/AuthContext";
import { billingService } from "@/services/billingService";
import { resolveDateRange, isWithinRange } from "@/utils/dateRange";
import { formatCompactCurrency } from "@/utils/currency";
import type { Bill } from "@/types";

export function EmployeeDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bills, setBills] = useState<Bill[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    billingService.getAll().then((b) => {
      setBills(b);
      setIsLoading(false);
    });
  }, []);

  const todayRange = useMemo(() => resolveDateRange("TODAY"), []);
  const myTodaysBills = useMemo(() => {
    return bills.filter(
      (b) =>
        isWithinRange(b.date, todayRange) &&
        b.status === "COMPLETED" &&
        b.items.some((i) => i.employeeId === user?.employeeId)
    );
  }, [bills, todayRange, user?.employeeId]);

  const myTodaySales = myTodaysBills.reduce((sum, b) => {
    const mine = b.items.filter((i) => i.employeeId === user?.employeeId);
    return sum + mine.reduce((s, i) => s + i.unitPrice * i.quantity - i.discountAmount, 0);
  }, 0);
  const myServicesCompleted = myTodaysBills.reduce(
    (sum, b) => sum + b.items.filter((i) => i.employeeId === user?.employeeId).length,
    0
  );
  const myCustomers = new Set(myTodaysBills.map((b) => b.customerId)).size;

  return (
    <>
      <Header title={`Welcome, ${user?.name?.split(" ")[0] ?? ""}`} subtitle="Here's your day at a glance." />
      <PageContainer>
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <Button size="lg" variant="gold" icon={<Plus size={18} />} onClick={() => navigate("/billing/new")}>
            New Bill
          </Button>
          <Button variant="secondary" icon={<UserPlus size={16} />} onClick={() => navigate("/customers")}>
            New Customer
          </Button>
          <Button variant="secondary" icon={<History size={16} />} onClick={() => navigate("/billing/history")}>
            Bill History
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <DashboardCard label="Today's Bills" value={isLoading ? "…" : String(myTodaysBills.length)} icon={<ReceiptText size={18} />} accent="ink" />
          <DashboardCard label="Today's Sales" value={isLoading ? "…" : formatCompactCurrency(myTodaySales)} icon={<IndianRupee size={18} />} accent="gold" />
          <DashboardCard label="Today's Customers" value={isLoading ? "…" : String(myCustomers)} icon={<Users size={18} />} accent="ink" />
          <DashboardCard label="Services Completed" value={isLoading ? "…" : String(myServicesCompleted)} icon={<CheckCircle2 size={18} />} accent="sage" />
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-card border border-cream-200 text-center">
          <p className="text-sm text-ink-600">
            Want to see your full performance history — bills, revenue and ratings over time?
          </p>
          <Button variant="secondary" className="mt-3" onClick={() => navigate("/reports")}>
            View My Performance
          </Button>
        </div>
      </PageContainer>
    </>
  );
}
