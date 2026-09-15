import { Banknote, Smartphone, CreditCard as CreditCardIcon, MoreHorizontal } from "lucide-react";
import { Input } from "@/components/Form";
import { formatCurrency } from "@/utils/currency";
import type { PaymentMethod, PaymentStatus } from "@/types";

const METHODS: Array<{ value: PaymentMethod; label: string; icon: typeof Banknote }> = [
  { value: "Cash", label: "Cash", icon: Banknote },
  { value: "UPI", label: "UPI", icon: Smartphone },
  { value: "Card", label: "Card", icon: CreditCardIcon },
  { value: "Other", label: "Other", icon: MoreHorizontal },
];

const STATUSES: PaymentStatus[] = ["Paid", "Partial", "Pending"];

interface PaymentSelectorProps {
  method: PaymentMethod;
  status: PaymentStatus;
  grandTotal: number;
  amountPaid: number;
  onMethodChange: (method: PaymentMethod) => void;
  onStatusChange: (status: PaymentStatus) => void;
  onAmountPaidChange: (amount: number) => void;
}

export function PaymentSelector({
  method,
  status,
  grandTotal,
  amountPaid,
  onMethodChange,
  onStatusChange,
  onAmountPaidChange,
}: PaymentSelectorProps) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-xs font-semibold text-ink-600 uppercase tracking-wide mb-2">Payment Method</p>
        <div className="grid grid-cols-4 gap-2">
          {METHODS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => onMethodChange(value)}
              className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-medium transition-colors ${
                method === value
                  ? "border-ink-950 bg-ink-950 text-white"
                  : "border-cream-300 text-ink-700 hover:bg-cream-100"
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-ink-600 uppercase tracking-wide mb-2">Payment Status</p>
        <div className="grid grid-cols-3 gap-2">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => {
                onStatusChange(s);
                if (s === "Paid") onAmountPaidChange(grandTotal);
                if (s === "Pending") onAmountPaidChange(0);
              }}
              className={`py-2.5 rounded-xl border text-xs font-semibold transition-colors ${
                status === s
                  ? s === "Paid"
                    ? "border-sage-500 bg-sage-50 text-sage-600"
                    : s === "Partial"
                      ? "border-amber-500 bg-amber-50 text-amber-500"
                      : "border-wine-500 bg-wine-50 text-wine-600"
                  : "border-cream-300 text-ink-700 hover:bg-cream-100"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {status === "Partial" && (
        <div>
          <p className="text-xs font-semibold text-ink-600 uppercase tracking-wide mb-2">Amount Paid Now</p>
          <Input
            type="number"
            min={0}
            max={grandTotal}
            value={amountPaid}
            onChange={(e) => onAmountPaidChange(Math.min(grandTotal, Math.max(0, Number(e.target.value))))}
          />
          <p className="text-xs text-ink-600 mt-1">
            Balance due: {formatCurrency(Math.max(0, grandTotal - amountPaid))}
          </p>
        </div>
      )}
    </div>
  );
}
