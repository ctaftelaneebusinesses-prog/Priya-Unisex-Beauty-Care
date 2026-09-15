import { useEffect, useMemo, useState } from "react";
import { Search, UserPlus, Phone, X, Sparkles } from "lucide-react";
import { customerService } from "@/services/customerService";
import { membershipService } from "@/services/membershipService";
import { membershipPlanService } from "@/services/membershipService";
import { CustomerFormModal } from "@/features/customers/CustomerFormModal";
import { Badge } from "@/components/Badge";
import type { Customer, CustomerMembership, MembershipPlan } from "@/types";

interface CustomerSearchProps {
  selectedCustomer: Customer | null;
  activeMembership: (CustomerMembership & { plan?: MembershipPlan }) | null;
  onSelectCustomer: (customer: Customer | null, membership: (CustomerMembership & { plan?: MembershipPlan }) | null) => void;
}

export function CustomerSearch({ selectedCustomer, activeMembership, onSelectCustomer }: CustomerSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    if (!isFocused) return;
    customerService.search(query).then(setResults);
  }, [query, isFocused]);

  const showDropdown = isFocused && query.trim().length > 0;

  const resolveMembership = async (customerId: string) => {
    const membership = await membershipService.getActiveForCustomer(customerId);
    if (!membership) {
      onSelectCustomer(await customerService.getById(customerId).then((c) => c ?? null), null);
      return;
    }
    const plan = await membershipPlanService.getById(membership.planId);
    const customer = await customerService.getById(customerId);
    onSelectCustomer(customer ?? null, { ...membership, plan });
  };

  const handlePick = async (customer: Customer) => {
    setQuery("");
    setIsFocused(false);
    await resolveMembership(customer.id);
  };

  const handleClear = () => onSelectCustomer(null, null);

  const canAdd = useMemo(() => query.trim().length > 0 && results.length === 0, [query, results]);

  if (selectedCustomer) {
    return (
      <div className="bg-white rounded-2xl border border-cream-200 shadow-card p-4 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-full bg-ink-950 text-gold-300 flex items-center justify-center font-display text-lg shrink-0">
            {selectedCustomer.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-ink-950">{selectedCustomer.name}</p>
            <p className="text-sm text-ink-600 flex items-center gap-1.5 mt-0.5">
              <Phone size={13} /> {selectedCustomer.phone}
            </p>
            {activeMembership && (
              <div className="mt-2">
                <Badge tone="gold">
                  <Sparkles size={12} /> ACTIVE MEMBERSHIP — {activeMembership.plan?.name}
                </Badge>
              </div>
            )}
          </div>
        </div>
        <button
          onClick={handleClear}
          className="text-ink-600 hover:text-wine-600 p-1.5 rounded-full hover:bg-wine-50 transition-colors shrink-0"
          aria-label="Clear customer"
        >
          <X size={18} />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2 bg-white rounded-2xl border border-cream-200 shadow-card px-4 py-3 focus-within:ring-2 focus-within:ring-gold-400/40">
        <Search size={18} className="text-ink-600 shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 150)}
          placeholder="Search customer by name or phone number…"
          className="flex-1 outline-none text-sm placeholder:text-ink-600/50 bg-transparent"
        />
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 text-xs font-semibold text-gold-600 hover:text-gold-500 shrink-0 px-2 py-1"
        >
          <UserPlus size={15} /> Add Customer
        </button>
      </div>

      {showDropdown && (
        <div className="absolute z-20 mt-2 w-full bg-white rounded-xl shadow-soft border border-cream-200 max-h-72 overflow-y-auto animate-fade-in">
          {results.map((customer) => (
            <button
              key={customer.id}
              onMouseDown={() => handlePick(customer)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-cream-50 text-left transition-colors border-b border-cream-100 last:border-0"
            >
              <div className="w-9 h-9 rounded-full bg-cream-200 text-ink-800 flex items-center justify-center font-semibold text-sm shrink-0">
                {customer.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink-950 truncate">{customer.name}</p>
                <p className="text-xs text-ink-600">{customer.phone}</p>
              </div>
            </button>
          ))}
          {canAdd && (
            <button
              onMouseDown={() => setIsAddModalOpen(true)}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm text-gold-600 hover:bg-gold-50 font-medium transition-colors"
            >
              <UserPlus size={15} /> Add "{query}" as new customer
            </button>
          )}
        </div>
      )}

      <CustomerFormModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        initialPhone={/^\d+$/.test(query) ? query : undefined}
        onSaved={async (customer) => {
          setIsAddModalOpen(false);
          await resolveMembership(customer.id);
        }}
      />
    </div>
  );
}
