import type { MembershipPlan, SalonService } from "@/types";
import type { CartItem } from "@/features/billing/cartTypes";

/** Computes the membership benefit amount applicable to the current cart. */
export function computeMembershipDiscount(
  cartItems: CartItem[],
  plan: MembershipPlan | undefined,
  services: SalonService[]
): number {
  if (!plan) return 0;

  const eligibleItems = cartItems.filter((item) => {
    if (!plan.applicableCategories || plan.applicableCategories.length === 0) return true;
    if (item.type !== "SERVICE") return false;
    const service = services.find((s) => s.id === item.refId);
    return service ? plan.applicableCategories.includes(service.category) : false;
  });

  const eligibleSubtotal = eligibleItems.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity - item.discountAmount,
    0
  );

  if (eligibleSubtotal <= 0) return 0;

  if (plan.benefitType === "PERCENT_DISCOUNT") {
    return (eligibleSubtotal * plan.benefitValue) / 100;
  }
  return Math.min(plan.benefitValue, eligibleSubtotal);
}
