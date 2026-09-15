import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { FormField, Input, Select, TextArea } from "@/components/Form";
import { jewelleryRentalService } from "@/services/jewelleryService";
import { useToast } from "@/components/Toast";
import { formatCurrency } from "@/utils/currency";
import type { JewelleryReturnCondition, JewelleryRental } from "@/types";

interface ReturnRentalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  rental: JewelleryRental | null;
}

export function ReturnRentalModal({ isOpen, onClose, onSaved, rental }: ReturnRentalModalProps) {
  const { showToast } = useToast();
  const [actualReturnDate, setActualReturnDate] = useState(new Date().toISOString().slice(0, 10));
  const [returnCondition, setReturnCondition] = useState<JewelleryReturnCondition>("GOOD");
  const [damageCharges, setDamageCharges] = useState(0);
  const [otherPenalty, setOtherPenalty] = useState(0);
  const [returnNotes, setReturnNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setActualReturnDate(new Date().toISOString().slice(0, 10));
    setReturnCondition("GOOD");
    setDamageCharges(0);
    setOtherPenalty(0);
    setReturnNotes("");
  }, [isOpen]);

  if (!rental) return null;

  const deductions = Math.max(0, damageCharges) + Math.max(0, otherPenalty);
  const depositReturned = Math.max(0, rental.securityDeposit - deductions);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await jewelleryRentalService.processReturn(rental.id, {
        actualReturnDate: new Date(actualReturnDate).toISOString(),
        returnCondition,
        damageCharges,
        otherPenalty,
        returnNotes: returnNotes.trim() || undefined,
      });
      showToast(`${rental.jewelleryItemName} marked as returned.`);
      onSaved();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Process Return — ${rental.jewelleryItemName}`}
      subtitle={`Customer: ${rental.customerName}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>Complete Return</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label="Actual Return Date" required>
          <Input type="date" value={actualReturnDate} onChange={(e) => setActualReturnDate(e.target.value)} />
        </FormField>
        <FormField label="Return Condition" required>
          <Select value={returnCondition} onChange={(e) => setReturnCondition(e.target.value as JewelleryReturnCondition)}>
            <option value="GOOD">Good — no issues</option>
            <option value="DAMAGED">Damaged</option>
            <option value="LOST">Lost</option>
          </Select>
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Damage Charges (₹)">
            <Input type="number" min={0} value={damageCharges} onChange={(e) => setDamageCharges(Number(e.target.value))} disabled={returnCondition === "GOOD"} />
          </FormField>
          <FormField label="Other Penalty (₹)">
            <Input type="number" min={0} value={otherPenalty} onChange={(e) => setOtherPenalty(Number(e.target.value))} />
          </FormField>
        </div>
        <FormField label="Return Notes" hint="Optional">
          <TextArea rows={2} value={returnNotes} onChange={(e) => setReturnNotes(e.target.value)} />
        </FormField>

        <div className="rounded-xl bg-cream-100 px-4 py-3 text-sm flex flex-col gap-1.5">
          <Row label="Security Deposit Held" value={formatCurrency(rental.securityDeposit)} />
          <Row label="Damage / Penalty Deducted" value={`- ${formatCurrency(deductions)}`} muted />
          <div className="flex justify-between pt-1.5 border-t border-cream-300">
            <span className="font-display text-ink-950">Deposit to Refund</span>
            <span className="font-display text-ink-950">{formatCurrency(depositReturned)}</span>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className={muted ? "text-wine-600" : "text-ink-600"}>{label}</span>
      <span className={muted ? "text-wine-600 font-medium" : "text-ink-800 font-medium"}>{value}</span>
    </div>
  );
}
