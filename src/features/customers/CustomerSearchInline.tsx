import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { customerService } from "@/services/customerService";
import type { Customer } from "@/types";

interface CustomerSearchInlineProps {
  selected: Customer | null;
  onSelect: (customer: Customer | null) => void;
}

export function CustomerSearchInline({ selected, onSelect }: CustomerSearchInlineProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) return;
    customerService.search(query).then(setResults);
  }, [query, isFocused]);

  if (selected) {
    return (
      <div className="flex items-center justify-between bg-cream-100 rounded-xl px-3.5 py-2.5">
        <div>
          <p className="text-sm font-medium text-ink-950">{selected.name}</p>
          <p className="text-xs text-ink-600">{selected.phone}</p>
        </div>
        <button onClick={() => onSelect(null)} className="text-ink-600 hover:text-wine-600">
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2 border border-cream-300 rounded-xl px-3.5 py-2.5 focus-within:ring-2 focus-within:ring-gold-400/40">
        <Search size={15} className="text-ink-600" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 150)}
          placeholder="Search by name or phone…"
          className="flex-1 outline-none text-sm bg-transparent"
        />
      </div>
      {isFocused && query.trim() && (
        <div className="absolute z-20 mt-1 w-full bg-white rounded-xl shadow-soft border border-cream-200 max-h-52 overflow-y-auto">
          {results.length === 0 && <p className="px-3.5 py-3 text-xs text-ink-600">No customers found.</p>}
          {results.map((c) => (
            <button
              key={c.id}
              onMouseDown={() => {
                onSelect(c);
                setQuery("");
              }}
              className="w-full text-left px-3.5 py-2.5 hover:bg-cream-50 border-b border-cream-100 last:border-0"
            >
              <p className="text-sm font-medium text-ink-950">{c.name}</p>
              <p className="text-xs text-ink-600">{c.phone}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
