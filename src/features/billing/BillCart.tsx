import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { Select } from "@/components/Form";
import { formatCurrency } from "@/utils/currency";
import type { Employee } from "@/types";
import type { CartItem } from "./cartTypes";

interface BillCartProps {
  items: CartItem[];
  employees: Employee[];
  onUpdateEmployee: (itemId: string, employeeId: string) => void;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemove: (itemId: string) => void;
}

export function BillCart({ items, employees, onUpdateEmployee, onUpdateQuantity, onRemove }: BillCartProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 text-ink-600">
        <ShoppingBag size={30} className="opacity-30 mb-2" />
        <p className="text-sm">No services added yet.</p>
        <p className="text-xs text-ink-600/70">Select services from the left to build the bill.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => {
        const eligibleEmployees = item.type === "SERVICE"
          ? employees.filter((e) => item.availableEmployeeIds?.includes(e.id) && e.status === "Active")
          : [];

        return (
          <div key={item.id} className="rounded-xl border border-cream-200 p-3.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink-950 truncate">{item.name}</p>
                {item.durationMinutes && (
                  <p className="text-xs text-ink-600">{item.durationMinutes} min</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <p className="text-sm font-semibold text-ink-950">
                  {formatCurrency(item.unitPrice * item.quantity - item.discountAmount)}
                </p>
                <button
                  onClick={() => onRemove(item.id)}
                  className="text-ink-600 hover:text-wine-600 p-1 rounded-md hover:bg-wine-50 transition-colors"
                  aria-label={`Remove ${item.name}`}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>

            <div className="mt-2.5 flex items-center justify-between gap-2">
              {item.type === "SERVICE" ? (
                <Select
                  value={item.employeeId ?? ""}
                  onChange={(e) => onUpdateEmployee(item.id, e.target.value)}
                  className="!py-1.5 !text-xs flex-1"
                  error={!item.employeeId}
                >
                  <option value="" disabled>
                    Performed by…
                  </option>
                  {eligibleEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </Select>
              ) : (
                <span className="text-xs text-ink-600 italic">Billable item</span>
              )}

              <div className="flex items-center gap-1 shrink-0 bg-cream-100 rounded-lg px-1">
                <button
                  onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
                  className="p-1.5 text-ink-700 hover:text-ink-950"
                  aria-label="Decrease quantity"
                >
                  <Minus size={13} />
                </button>
                <span className="text-xs font-semibold w-5 text-center">{item.quantity}</span>
                <button
                  onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                  className="p-1.5 text-ink-700 hover:text-ink-950"
                  aria-label="Increase quantity"
                >
                  <Plus size={13} />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
