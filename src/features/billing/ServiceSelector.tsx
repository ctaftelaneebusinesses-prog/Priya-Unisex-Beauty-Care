import { useMemo, useState } from "react";
import { Search, Plus, Clock, Gem } from "lucide-react";
import { Badge } from "@/components/Badge";
import { formatCurrency } from "@/utils/currency";
import { SERVICE_CATEGORIES } from "@/types";
import type { BillableItem, SalonService, ServiceCategory } from "@/types";

interface ServiceSelectorProps {
  services: SalonService[];
  billableItems: BillableItem[];
  onAddService: (service: SalonService) => void;
  onAddItem: (item: BillableItem) => void;
}

const GENDER_TONE: Record<SalonService["gender"], "info" | "gold" | "neutral"> = {
  Male: "info",
  Female: "gold",
  Unisex: "neutral",
};

export function ServiceSelector({ services, billableItems, onAddService, onAddItem }: ServiceSelectorProps) {
  const [activeCategory, setActiveCategory] = useState<ServiceCategory | "ALL" | "ITEMS">("ALL");
  const [search, setSearch] = useState("");

  const items = billableItems;

  const filteredServices = useMemo(() => {
    const q = search.trim().toLowerCase();
    return services.filter((s) => {
      const matchesCategory = activeCategory === "ALL" || s.category === activeCategory;
      const matchesSearch = !q || s.name.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [services, activeCategory, search]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => !q || i.name.toLowerCase().includes(q));
  }, [items, search]);

  return (
    <div className="bg-white rounded-2xl border border-cream-200 shadow-card p-5">
      <div className="flex items-center gap-2 bg-cream-100 rounded-xl px-3.5 py-2.5 mb-4">
        <Search size={16} className="text-ink-600 shrink-0" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search services…"
          className="flex-1 outline-none text-sm bg-transparent placeholder:text-ink-600/50"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-3 mb-1 -mx-1 px-1">
        <CategoryTab label="All Services" active={activeCategory === "ALL"} onClick={() => setActiveCategory("ALL")} />
        {SERVICE_CATEGORIES.map((cat) => (
          <CategoryTab key={cat} label={cat} active={activeCategory === cat} onClick={() => setActiveCategory(cat)} />
        ))}
        {items.length > 0 && (
          <CategoryTab label="Other Items" active={activeCategory === "ITEMS"} onClick={() => setActiveCategory("ITEMS")} />
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[520px] overflow-y-auto pr-1 pt-2">
        {activeCategory !== "ITEMS" &&
          filteredServices.map((service) => (
            <button
              key={service.id}
              onClick={() => onAddService(service)}
              className="group text-left rounded-xl border border-cream-200 p-3.5 hover:border-gold-400 hover:shadow-card transition-all bg-cream-50/40"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-sm font-semibold text-ink-950 leading-snug">{service.name}</p>
                <div className="w-7 h-7 rounded-lg bg-ink-950 text-gold-300 flex items-center justify-center shrink-0 group-hover:bg-gold-400 group-hover:text-ink-950 transition-colors">
                  <Plus size={14} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <p className="font-display text-base text-ink-950">{formatCurrency(service.price)}</p>
                <span className="flex items-center gap-1 text-xs text-ink-600">
                  <Clock size={11} /> {service.durationMinutes}m
                </span>
              </div>
              <div className="mt-2">
                <Badge tone={GENDER_TONE[service.gender]}>{service.gender}</Badge>
              </div>
            </button>
          ))}

        {activeCategory === "ITEMS" &&
          filteredItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onAddItem(item)}
              className="group text-left rounded-xl border border-cream-200 p-3.5 hover:border-gold-400 hover:shadow-card transition-all bg-cream-50/40"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-sm font-semibold text-ink-950 leading-snug flex items-center gap-1.5">
                  <Gem size={13} className="text-gold-500" /> {item.name}
                </p>
                <div className="w-7 h-7 rounded-lg bg-ink-950 text-gold-300 flex items-center justify-center shrink-0 group-hover:bg-gold-400 group-hover:text-ink-950 transition-colors">
                  <Plus size={14} />
                </div>
              </div>
              <p className="font-display text-base text-ink-950">{formatCurrency(item.price)}</p>
              {item.deposit ? (
                <p className="text-xs text-ink-600 mt-1">+ {formatCurrency(item.deposit)} refundable deposit</p>
              ) : null}
            </button>
          ))}

        {activeCategory !== "ITEMS" && filteredServices.length === 0 && (
          <p className="col-span-full text-center text-sm text-ink-600 py-10">No services match your search.</p>
        )}
        {activeCategory === "ITEMS" && filteredItems.length === 0 && (
          <p className="col-span-full text-center text-sm text-ink-600 py-10">No billable items available.</p>
        )}
      </div>
    </div>
  );
}

function CategoryTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
        active ? "bg-ink-950 text-white" : "bg-cream-100 text-ink-700 hover:bg-cream-200"
      }`}
    >
      {label}
    </button>
  );
}
