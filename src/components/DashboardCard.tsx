import type { ReactNode } from "react";
import clsx from "clsx";

interface DashboardCardProps {
  label: string;
  value: string;
  icon: ReactNode;
  trend?: { value: string; positive: boolean };
  accent?: "ink" | "gold" | "wine" | "sage";
}

const ACCENT_CLASSES: Record<NonNullable<DashboardCardProps["accent"]>, string> = {
  ink: "bg-ink-950 text-white",
  gold: "bg-gold-400 text-ink-950",
  wine: "bg-wine-600 text-white",
  sage: "bg-sage-500 text-white",
};

export function DashboardCard({ label, value, icon, trend, accent = "ink" }: DashboardCardProps) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-card border border-cream-200 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <p className="text-sm text-ink-600 font-medium">{label}</p>
        <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", ACCENT_CLASSES[accent])}>
          {icon}
        </div>
      </div>
      <div>
        <p className="font-display text-2xl text-ink-950">{value}</p>
        {trend && (
          <p className={clsx("text-xs font-semibold mt-1", trend.positive ? "text-sage-600" : "text-wine-600")}>
            {trend.positive ? "▲" : "▼"} {trend.value}
          </p>
        )}
      </div>
    </div>
  );
}
