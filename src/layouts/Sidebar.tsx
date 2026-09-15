import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  ReceiptText,
  History,
  Users,
  Sparkles,
  UserRound,
  CreditCard,
  BarChart3,
  Landmark,
  Settings,
  CalendarClock,
  Scissors,
  Percent,
  Package,
  Wallet,
  Gem,
} from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { hasPermission } from "@/auth/permissions";
import type { Permission } from "@/auth/permissions";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  requires?: Permission;
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/billing/new", label: "New Bill", icon: ReceiptText },
  { to: "/billing/history", label: "Bill History", icon: History },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/appointments", label: "Appointments", icon: CalendarClock },
  { to: "/services", label: "Services", icon: Sparkles, requires: "services.manage" },
  { to: "/employees", label: "Employees", icon: UserRound, requires: "employees.manage" },
  { to: "/commissions", label: "Commissions", icon: Percent, requires: "commissions.manage" },
  { to: "/memberships", label: "Memberships", icon: CreditCard, requires: "memberships.manage" },
  { to: "/inventory", label: "Inventory", icon: Package, requires: "inventory.manage" },
  { to: "/expenses", label: "Expenses", icon: Wallet, requires: "expenses.manage" },
  { to: "/jewellery", label: "Jewellery", icon: Gem, requires: "jewellery.manage" },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/gst", label: "GST", icon: Landmark, requires: "gst.manage" },
  { to: "/settings", label: "Settings", icon: Settings, requires: "settings.manage" },
];

export function Sidebar() {
  const { user } = useAuth();
  const visibleItems = NAV_ITEMS.filter((item) => !item.requires || hasPermission(user?.role, item.requires));

  return (
    <aside className="w-64 shrink-0 bg-ink-950 text-cream-100 flex flex-col h-screen sticky top-0">
      <div className="px-6 py-6 flex items-center gap-3 border-b border-white/10">
        <div className="w-10 h-10 rounded-xl bg-gold-400 text-ink-950 flex items-center justify-center shrink-0">
          <Scissors size={20} strokeWidth={2.25} />
        </div>
        <div className="min-w-0">
          <p className="font-display text-base leading-tight truncate text-white">Priya UNISEX</p>
          <p className="text-[11px] tracking-widest uppercase text-gold-300">Beauty Care</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-0.5">
        {visibleItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? "bg-gold-400 text-ink-950"
                  : "text-cream-200/80 hover:bg-white/5 hover:text-white"
              }`
            }
          >
            <Icon size={18} strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-white/10">
        <p className="text-[11px] text-cream-200/50 px-2">Priya UNISEX Beauty Care © 2026</p>
      </div>
    </aside>
  );
}
