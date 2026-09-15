import type { Bill, DateRange, Employee, PaymentMethod, SalonService } from "@/types";
import { format, startOfDay } from "date-fns";
import { isWithinRange } from "@/utils/dateRange";

function activeBills(bills: Bill[]): Bill[] {
  return bills.filter((b) => b.status === "COMPLETED");
}

export function filterBillsByRange(bills: Bill[], range: DateRange): Bill[] {
  return activeBills(bills).filter((b) => isWithinRange(b.date, range));
}

export interface DashboardStats {
  todayRevenue: number;
  todayBills: number;
  todayCustomers: number;
  pendingPayments: number;
  gstCollected: number;
  activeMemberships: number;
}

export function getDashboardStats(
  todaysBills: Bill[],
  allBills: Bill[],
  activeMembershipsCount: number
): DashboardStats {
  const completed = activeBills(todaysBills);
  const todayRevenue = completed.reduce((s, b) => s + b.grandTotal, 0);
  const uniqueCustomers = new Set(completed.map((b) => b.customerId));
  const pendingPayments = activeBills(allBills)
    .filter((b) => b.paymentStatus !== "Paid")
    .reduce((s, b) => s + b.balanceDue, 0);
  const gstCollected = completed.reduce((s, b) => s + b.totalGstAmount, 0);

  return {
    todayRevenue,
    todayBills: completed.length,
    todayCustomers: uniqueCustomers.size,
    pendingPayments,
    gstCollected,
    activeMemberships: activeMembershipsCount,
  };
}

export interface RevenuePoint {
  label: string;
  revenue: number;
  bills: number;
}

export function getRevenueSeries(bills: Bill[]): RevenuePoint[] {
  const byDay = new Map<string, RevenuePoint>();
  for (const bill of activeBills(bills)) {
    const key = format(startOfDay(new Date(bill.date)), "MMM d");
    const existing = byDay.get(key) ?? { label: key, revenue: 0, bills: 0 };
    existing.revenue += bill.grandTotal;
    existing.bills += 1;
    byDay.set(key, existing);
  }
  return Array.from(byDay.values());
}

export interface ServiceReportRow {
  serviceId: string;
  serviceName: string;
  category: string;
  transactions: number;
  revenue: number;
}

export function getServiceReport(bills: Bill[], services: SalonService[]): ServiceReportRow[] {
  const map = new Map<string, ServiceReportRow>();
  for (const bill of activeBills(bills)) {
    for (const item of bill.items) {
      if (item.type !== "SERVICE") continue;
      const service = services.find((s) => s.id === item.refId);
      const existing = map.get(item.refId) ?? {
        serviceId: item.refId,
        serviceName: item.name,
        category: service?.category ?? "Other",
        transactions: 0,
        revenue: 0,
      };
      existing.transactions += item.quantity;
      existing.revenue += item.unitPrice * item.quantity - item.discountAmount;
      map.set(item.refId, existing);
    }
  }
  return Array.from(map.values()).sort((a, b) => b.transactions - a.transactions);
}

export interface EmployeeReportRow {
  employeeId: string;
  employeeName: string;
  bills: number;
  servicesCompleted: number;
  revenue: number;
}

export function getEmployeeReport(bills: Bill[], employees: Employee[]): EmployeeReportRow[] {
  const map = new Map<string, EmployeeReportRow>();
  const billIdsByEmployee = new Map<string, Set<string>>();

  for (const bill of activeBills(bills)) {
    for (const item of bill.items) {
      if (!item.employeeId) continue;
      const employee = employees.find((e) => e.id === item.employeeId);
      const existing = map.get(item.employeeId) ?? {
        employeeId: item.employeeId,
        employeeName: employee?.name ?? item.employeeName ?? "Unassigned",
        bills: 0,
        servicesCompleted: 0,
        revenue: 0,
      };
      existing.servicesCompleted += item.quantity;
      existing.revenue += item.unitPrice * item.quantity - item.discountAmount;
      map.set(item.employeeId, existing);

      const billSet = billIdsByEmployee.get(item.employeeId) ?? new Set<string>();
      billSet.add(bill.id);
      billIdsByEmployee.set(item.employeeId, billSet);
    }
  }

  for (const [employeeId, row] of map.entries()) {
    row.bills = billIdsByEmployee.get(employeeId)?.size ?? 0;
  }

  return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
}

export interface PaymentMethodReportRow {
  method: PaymentMethod;
  amount: number;
  count: number;
}

export function getPaymentMethodReport(bills: Bill[]): PaymentMethodReportRow[] {
  const methods: PaymentMethod[] = ["Cash", "UPI", "Card", "Other"];
  return methods.map((method) => {
    const matching = activeBills(bills).filter((b) => b.paymentMethod === method);
    return {
      method,
      amount: matching.reduce((s, b) => s + b.amountPaid, 0),
      count: matching.length,
    };
  });
}

export interface DiscountReportRow {
  invoiceNumber: string;
  customerName: string;
  date: string;
  discountAmount: number;
  grandTotal: number;
}

export function getDiscountReport(bills: Bill[]): DiscountReportRow[] {
  return activeBills(bills)
    .filter((b) => b.discountAmount > 0)
    .map((b) => ({
      invoiceNumber: b.invoiceNumber,
      customerName: b.customerName,
      date: b.date,
      discountAmount: b.discountAmount,
      grandTotal: b.grandTotal,
    }))
    .sort((a, b) => b.discountAmount - a.discountAmount);
}

export interface GSTReportSummary {
  totalSales: number;
  taxableSales: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalGst: number;
  billCount: number;
}

export function getGSTReport(bills: Bill[]): GSTReportSummary {
  const filtered = activeBills(bills);
  return filtered.reduce(
    (acc, b) => ({
      totalSales: acc.totalSales + b.grandTotal,
      taxableSales: acc.taxableSales + b.taxableAmount,
      cgst: acc.cgst + b.cgstAmount,
      sgst: acc.sgst + b.sgstAmount,
      igst: acc.igst + b.igstAmount,
      totalGst: acc.totalGst + b.totalGstAmount,
      billCount: acc.billCount + 1,
    }),
    { totalSales: 0, taxableSales: 0, cgst: 0, sgst: 0, igst: 0, totalGst: 0, billCount: 0 }
  );
}

export interface MembershipRevenueSummary {
  totalMembershipDiscountGiven: number;
  billsWithMembership: number;
}

export function getMembershipImpact(bills: Bill[]): MembershipRevenueSummary {
  const filtered = activeBills(bills).filter((b) => b.membershipId);
  return {
    totalMembershipDiscountGiven: filtered.reduce(
      (s, b) => s + (b.membershipDiscountAmount ?? 0),
      0
    ),
    billsWithMembership: filtered.length,
  };
}
