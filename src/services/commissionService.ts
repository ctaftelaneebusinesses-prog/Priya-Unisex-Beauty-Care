import type { Bill, CommissionRecord, CommissionRule } from "@/types";
import { store } from "./storage";
import { generateId } from "@/utils/id";
import { roundMoney } from "@/utils/currency";

const RULES_COLLECTION = "commissionRules";
const RECORDS_COLLECTION = "commissionRecords";

function resolveRule(rules: CommissionRule[], employeeId: string, serviceId: string): CommissionRule | undefined {
  const active = rules.filter((r) => r.status === "Active");
  return (
    active.find((r) => r.scope === "EMPLOYEE_SERVICE" && r.employeeId === employeeId && r.serviceId === serviceId) ??
    active.find((r) => r.scope === "SERVICE" && r.serviceId === serviceId) ??
    active.find((r) => r.scope === "EMPLOYEE" && r.employeeId === employeeId) ??
    active.find((r) => r.scope === "GLOBAL")
  );
}

export const commissionRuleService = {
  getAll: () => store.getAll<CommissionRule>(RULES_COLLECTION),
  getById: (id: string) => store.getById<CommissionRule>(RULES_COLLECTION, id),

  async create(input: Omit<CommissionRule, "id" | "createdAt">): Promise<CommissionRule> {
    const rule: CommissionRule = { ...input, id: generateId(), createdAt: new Date().toISOString() };
    return store.create(RULES_COLLECTION, rule);
  },

  update: (id: string, patch: Partial<CommissionRule>) => store.update<CommissionRule>(RULES_COLLECTION, id, patch),
  remove: (id: string) => store.remove(RULES_COLLECTION, id),
};

export const commissionService = {
  getAll: () => store.getAll<CommissionRecord>(RECORDS_COLLECTION),

  async getForEmployee(employeeId: string): Promise<CommissionRecord[]> {
    const all = await store.getAll<CommissionRecord>(RECORDS_COLLECTION);
    return all.filter((r) => r.employeeId === employeeId);
  },

  /**
   * Generates a Pending commission record for every SERVICE line item on a
   * completed bill that has an assigned employee and a matching active rule.
   * Called automatically right after a bill is created — commission is always
   * derived from an actual completed sale, never entered manually.
   */
  async generateForBill(bill: Bill): Promise<CommissionRecord[]> {
    const rules = await commissionRuleService.getAll();
    if (rules.length === 0) return [];

    const created: CommissionRecord[] = [];
    for (const item of bill.items) {
      if (item.type !== "SERVICE" || !item.employeeId) continue;
      const rule = resolveRule(rules, item.employeeId, item.refId);
      if (!rule) continue;

      const saleAmount = roundMoney(item.unitPrice * item.quantity - item.discountAmount);
      const commissionAmount = roundMoney(
        rule.type === "PERCENTAGE" ? (saleAmount * rule.value) / 100 : rule.value
      );

      const record: CommissionRecord = {
        id: generateId(),
        employeeId: item.employeeId,
        employeeName: item.employeeName ?? "",
        billId: bill.id,
        invoiceNumber: bill.invoiceNumber,
        serviceId: item.refId,
        serviceName: item.name,
        date: bill.date,
        saleAmount,
        commissionType: rule.type,
        commissionValue: rule.value,
        commissionAmount,
        status: "Pending",
      };
      created.push(await store.create(RECORDS_COLLECTION, record));
    }
    return created;
  },

  async markPaid(ids: string[]): Promise<void> {
    const paidDate = new Date().toISOString();
    await Promise.all(ids.map((id) => store.update<CommissionRecord>(RECORDS_COLLECTION, id, { status: "Paid", paidDate })));
  },
};

export interface EmployeeCommissionSummary {
  employeeId: string;
  employeeName: string;
  servicesCompleted: number;
  totalSales: number;
  totalCommission: number;
  paidCommission: number;
  pendingCommission: number;
}

export function summarizeCommissionsByEmployee(records: CommissionRecord[]): EmployeeCommissionSummary[] {
  const map = new Map<string, EmployeeCommissionSummary>();
  for (const r of records) {
    const existing = map.get(r.employeeId) ?? {
      employeeId: r.employeeId,
      employeeName: r.employeeName,
      servicesCompleted: 0,
      totalSales: 0,
      totalCommission: 0,
      paidCommission: 0,
      pendingCommission: 0,
    };
    existing.servicesCompleted += 1;
    existing.totalSales += r.saleAmount;
    existing.totalCommission += r.commissionAmount;
    if (r.status === "Paid") existing.paidCommission += r.commissionAmount;
    else existing.pendingCommission += r.commissionAmount;
    map.set(r.employeeId, existing);
  }
  return Array.from(map.values()).sort((a, b) => b.totalCommission - a.totalCommission);
}
