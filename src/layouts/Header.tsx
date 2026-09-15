import { useState } from "react";
import { LogOut, ChevronDown, User as UserIcon } from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { format } from "date-fns";

export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-cream-100/90 backdrop-blur-sm border-b border-cream-300 px-8 py-5 flex items-center justify-between">
      <div>
        <h1 className="font-display text-2xl text-ink-950">{title}</h1>
        {subtitle && <p className="text-sm text-ink-600 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-5">
        <p className="text-sm text-ink-600 hidden sm:block">{format(new Date(), "EEEE, d MMMM yyyy")}</p>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-full border border-cream-300 bg-white hover:shadow-card transition-shadow"
          >
            <div className="w-8 h-8 rounded-full bg-ink-950 text-gold-300 flex items-center justify-center">
              <UserIcon size={16} />
            </div>
            <div className="text-left hidden md:block">
              <p className="text-xs font-semibold text-ink-950 leading-tight">{user?.name}</p>
              <p className="text-[11px] text-ink-600 leading-tight">{user?.role}</p>
            </div>
            <ChevronDown size={14} className="text-ink-600" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-soft border border-cream-200 z-20 py-1.5 animate-fade-in">
                <div className="px-3.5 py-2 border-b border-cream-200">
                  <p className="text-sm font-semibold text-ink-950 truncate">{user?.name}</p>
                  <p className="text-xs text-ink-600 truncate">{user?.email}</p>
                </div>
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2 px-3.5 py-2.5 text-sm text-wine-600 hover:bg-wine-50 transition-colors"
                >
                  <LogOut size={15} />
                  Log out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
