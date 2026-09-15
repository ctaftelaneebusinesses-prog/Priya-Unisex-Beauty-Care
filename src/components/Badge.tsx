import clsx from "clsx";
import type { ReactNode } from "react";

type BadgeTone = "success" | "warning" | "danger" | "neutral" | "info" | "gold";

const TONE_CLASSES: Record<BadgeTone, string> = {
  success: "bg-sage-50 text-sage-600",
  warning: "bg-amber-50 text-amber-500",
  danger: "bg-wine-50 text-wine-600",
  neutral: "bg-cream-200 text-ink-700",
  info: "bg-ink-900/5 text-ink-800",
  gold: "bg-gold-50 text-gold-600",
};

export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap",
        TONE_CLASSES[tone]
      )}
    >
      {children}
    </span>
  );
}

export function statusBadgeTone(status: string): BadgeTone {
  switch (status) {
    case "Active":
    case "ACTIVE":
    case "Paid":
    case "Completed":
    case "COMPLETED":
    case "Confirmed":
      return "success";
    case "Inactive":
    case "EXPIRED":
    case "Pending":
    case "Cancelled":
    case "CANCELLED":
    case "VOID":
    case "No Show":
      return "danger";
    case "Partial":
    case "EXPIRING_SOON":
      return "warning";
    default:
      return "neutral";
  }
}
