import type {
  Bill,
  BillLineItem,
  GSTTaxType,
  PaymentMethod,
  PaymentStatus,
} from "@/types";
import { store } from "./storage";
import { generateId } from "@/utils/id";
import { calculateBillTotals } from "@/utils/gst";
import { gstService } from "./settingsService";
import { appointmentService } from "./appointmentService";
import { commissionService } from "./commissionService";
import { membershipService } from "./membershipService";

const COLLECTION = "bills";

export interface CreateBillInput {
  customerId: string;
  customerName: string;
  customerPhone: string;
  items: BillLineItem[];
  additionalDiscountAmount: number; // manual discount entered by cashier
  membershipId?: string;
  membershipDiscountAmount?: number;
  gstTaxType: GSTTaxType;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  amountPaid: number;
  walletMembershipId?: string; // set when part of the bill is paid from a prepaid wallet
  walletAmountUsed?: number;
  createdByUserId: string;
  createdByName: string;
  notes?: string;
  appointmentId?: string;
}

export const billingService = {
  getAll: () => store.getAll<Bill>(COLLECTION),
  getById: (id: string) => store.getById<Bill>(COLLECTION, id),

  async search(query: string): Promise<Bill[]> {
    const all = await store.getAll<Bill>(COLLECTION);
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (b) =>
        b.invoiceNumber.toLowerCase().includes(q) ||
        b.customerName.toLowerCase().includes(q) ||
        b.customerPhone.includes(q)
    );
  },

  async create(input: CreateBillInput): Promise<Bill> {
    const totalAdditionalDiscount =
      input.additionalDiscountAmount + (input.membershipDiscountAmount ?? 0);
    const totals = calculateBillTotals(input.items, totalAdditionalDiscount, input.gstTaxType);
    const { invoiceNumber } = await gstService.reserveNextInvoiceNumber();

    const balanceDue = Math.max(0, totals.grandTotal - input.amountPaid);

    const bill: Bill = {
      id: generateId(),
      invoiceNumber,
      date: new Date().toISOString(),
      customerId: input.customerId,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      items: input.items,
      subtotal: totals.subtotal,
      discountAmount: totals.lineDiscountTotal + input.additionalDiscountAmount,
      membershipId: input.membershipId,
      membershipDiscountAmount: input.membershipDiscountAmount,
      taxableAmount: totals.taxableAmount,
      cgstAmount: totals.cgstAmount,
      sgstAmount: totals.sgstAmount,
      igstAmount: totals.igstAmount,
      totalGstAmount: totals.totalGstAmount,
      grandTotal: totals.grandTotal,
      paymentMethod: input.paymentMethod,
      paymentStatus: input.paymentStatus,
      amountPaid: input.amountPaid,
      walletAmountUsed: input.walletAmountUsed,
      balanceDue,
      gstTaxType: input.gstTaxType,
      createdByUserId: input.createdByUserId,
      createdByName: input.createdByName,
      status: "COMPLETED",
      notes: input.notes,
      appointmentId: input.appointmentId,
    };

    const created = await store.create(COLLECTION, bill);

    if (input.appointmentId) {
      await appointmentService.linkBill(input.appointmentId, created.id);
    }

    if (input.walletMembershipId && input.walletAmountUsed && input.walletAmountUsed > 0) {
      await membershipService.useWallet(input.walletMembershipId, input.walletAmountUsed, {
        invoiceNumber: created.invoiceNumber,
        billId: created.id,
      });
    }

    // Commission is always derived from the actual completed bill, never entered manually.
    await commissionService.generateForBill(created);

    return created;
  },

  void: (id: string) => store.update<Bill>(COLLECTION, id, { status: "VOID" }),

  updatePaymentStatus: (id: string, paymentStatus: PaymentStatus, amountPaid: number) =>
    store.update<Bill>(COLLECTION, id, { paymentStatus, amountPaid }),
};

export function previewBillTotals(
  items: BillLineItem[],
  additionalDiscountAmount: number,
  membershipDiscountAmount: number,
  gstTaxType: GSTTaxType
) {
  return calculateBillTotals(items, additionalDiscountAmount + membershipDiscountAmount, gstTaxType);
}
