import type { CustomerMembership, MembershipPlan, MembershipStatus, WalletTransaction } from "@/types";
import { store } from "./storage";
import { generateId, generateMembershipId } from "@/utils/id";
import { addMonths, differenceInCalendarDays, isBefore } from "date-fns";
import { roundMoney } from "@/utils/currency";

const PLANS_COLLECTION = "membershipPlans";
const MEMBERSHIPS_COLLECTION = "customerMemberships";
const WALLET_TRANSACTIONS_COLLECTION = "walletTransactions";
const EXPIRING_SOON_DAYS = 30;

/** Derives the live status of a membership from today's date rather than trusting stale stored status. */
export function deriveMembershipStatus(membership: CustomerMembership): MembershipStatus {
  if (membership.status === "CANCELLED") return "CANCELLED";
  const today = new Date();
  const expiry = new Date(membership.expiryDate);
  if (isBefore(expiry, today)) return "EXPIRED";
  const daysLeft = differenceInCalendarDays(expiry, today);
  if (daysLeft <= EXPIRING_SOON_DAYS) return "EXPIRING_SOON";
  return "ACTIVE";
}

export const membershipPlanService = {
  getAll: () => store.getAll<MembershipPlan>(PLANS_COLLECTION),
  getById: (id: string) => store.getById<MembershipPlan>(PLANS_COLLECTION, id),

  async create(input: Omit<MembershipPlan, "id">): Promise<MembershipPlan> {
    const plan: MembershipPlan = { ...input, id: generateId() };
    return store.create(PLANS_COLLECTION, plan);
  },

  update: (id: string, patch: Partial<MembershipPlan>) =>
    store.update<MembershipPlan>(PLANS_COLLECTION, id, patch),

  setStatus: (id: string, status: MembershipPlan["status"]) =>
    store.update<MembershipPlan>(PLANS_COLLECTION, id, { status }),
};

export const membershipService = {
  async getAll(): Promise<CustomerMembership[]> {
    const memberships = await store.getAll<CustomerMembership>(MEMBERSHIPS_COLLECTION);
    return memberships.map((m) => ({ ...m, status: deriveMembershipStatus(m) }));
  },

  getById: (id: string) => store.getById<CustomerMembership>(MEMBERSHIPS_COLLECTION, id),

  async getActiveMembershipsForCustomer(customerId: string): Promise<CustomerMembership[]> {
    const memberships = await membershipService.getAll();
    return memberships.filter(
      (m) => m.customerId === customerId && (m.status === "ACTIVE" || m.status === "EXPIRING_SOON")
    );
  },

  /** The active DISCOUNT-type membership for a customer, if any (used to auto-apply a billing discount). */
  async getActiveForCustomer(customerId: string): Promise<CustomerMembership | undefined> {
    const [active, plans] = await Promise.all([
      membershipService.getActiveMembershipsForCustomer(customerId),
      membershipPlanService.getAll(),
    ]);
    return active.find((m) => plans.find((p) => p.id === m.planId)?.type === "DISCOUNT");
  },

  /** The active WALLET-type membership for a customer, if any (used to offer "Pay with Wallet" at billing). */
  async getActiveWalletForCustomer(customerId: string): Promise<CustomerMembership | undefined> {
    const [active, plans] = await Promise.all([
      membershipService.getActiveMembershipsForCustomer(customerId),
      membershipPlanService.getAll(),
    ]);
    return active.find((m) => plans.find((p) => p.id === m.planId)?.type === "WALLET");
  },

  async getForCustomer(customerId: string): Promise<CustomerMembership[]> {
    const memberships = await membershipService.getAll();
    return memberships.filter((m) => m.customerId === customerId);
  },

  async purchase(
    customerId: string,
    planId: string,
    startDate: string
  ): Promise<CustomerMembership> {
    const plan = await membershipPlanService.getById(planId);
    if (!plan) throw new Error("Membership plan not found");
    const existing = await store.getAll<CustomerMembership>(MEMBERSHIPS_COLLECTION);
    const expiryDate = addMonths(new Date(startDate), plan.durationMonths).toISOString();
    const isWallet = plan.type === "WALLET";
    const walletBalance = isWallet ? plan.walletCreditAmount ?? 0 : undefined;

    const membership: CustomerMembership = {
      id: generateMembershipId(existing.length + 101),
      customerId,
      planId,
      purchaseDate: new Date().toISOString(),
      startDate,
      expiryDate,
      status: "ACTIVE",
      amountPaid: plan.price,
      walletBalance,
    };
    const created = await store.create(MEMBERSHIPS_COLLECTION, membership);

    if (isWallet) {
      const transaction: WalletTransaction = {
        id: generateId(),
        membershipId: created.id,
        customerId,
        type: "PURCHASE",
        amountAdded: walletBalance ?? 0,
        amountUsed: 0,
        previousBalance: 0,
        newBalance: walletBalance ?? 0,
        date: new Date().toISOString(),
        notes: `${plan.name} purchased`,
      };
      await store.create(WALLET_TRANSACTIONS_COLLECTION, transaction);
    }

    return created;
  },

  cancel: (id: string) =>
    store.update<CustomerMembership>(MEMBERSHIPS_COLLECTION, id, { status: "CANCELLED" }),

  getAllWalletTransactions: () => store.getAll<WalletTransaction>(WALLET_TRANSACTIONS_COLLECTION),

  async getWalletTransactions(membershipId: string): Promise<WalletTransaction[]> {
    const all = await membershipService.getAllWalletTransactions();
    return all
      .filter((t) => t.membershipId === membershipId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  async topUpWallet(membershipId: string, amount: number, notes?: string): Promise<CustomerMembership> {
    if (amount <= 0) throw new Error("Top-up amount must be greater than zero.");
    const membership = await membershipService.getById(membershipId);
    if (!membership) throw new Error("Membership not found");
    const previousBalance = membership.walletBalance ?? 0;
    const newBalance = roundMoney(previousBalance + amount);
    const updated = await store.update<CustomerMembership>(MEMBERSHIPS_COLLECTION, membershipId, {
      walletBalance: newBalance,
    });
    const transaction: WalletTransaction = {
      id: generateId(),
      membershipId,
      customerId: membership.customerId,
      type: "TOPUP",
      amountAdded: amount,
      amountUsed: 0,
      previousBalance,
      newBalance,
      date: new Date().toISOString(),
      notes,
    };
    await store.create(WALLET_TRANSACTIONS_COLLECTION, transaction);
    return updated;
  },

  /**
   * Deducts `amount` from the membership's wallet balance for a bill. Never allows
   * the balance to go negative, and refuses to spend from an expired wallet.
   */
  async useWallet(
    membershipId: string,
    amount: number,
    context: { invoiceNumber?: string; billId?: string }
  ): Promise<CustomerMembership> {
    const membership = await membershipService.getById(membershipId);
    if (!membership) throw new Error("Membership not found");
    const status = deriveMembershipStatus(membership);
    if (status === "EXPIRED" || status === "CANCELLED") {
      throw new Error("This wallet is expired or cancelled and cannot be used.");
    }
    const previousBalance = membership.walletBalance ?? 0;
    if (amount <= 0 || amount > previousBalance) {
      throw new Error("Insufficient wallet balance for this amount.");
    }
    const newBalance = roundMoney(previousBalance - amount);
    const updated = await store.update<CustomerMembership>(MEMBERSHIPS_COLLECTION, membershipId, {
      walletBalance: newBalance,
    });
    const transaction: WalletTransaction = {
      id: generateId(),
      membershipId,
      customerId: membership.customerId,
      type: "USAGE",
      amountAdded: 0,
      amountUsed: amount,
      previousBalance,
      newBalance,
      invoiceNumber: context.invoiceNumber,
      billId: context.billId,
      date: new Date().toISOString(),
    };
    await store.create(WALLET_TRANSACTIONS_COLLECTION, transaction);
    return updated;
  },
};
