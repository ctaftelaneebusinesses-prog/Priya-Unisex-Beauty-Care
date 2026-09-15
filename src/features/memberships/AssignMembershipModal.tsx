import { useState } from "react";
import type { FormEvent } from "react";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { FormField, Input, Select } from "@/components/Form";
import { CustomerSearchInline } from "@/features/customers/CustomerSearchInline";
import { membershipService } from "@/services/membershipService";
import { useToast } from "@/components/Toast";
import { formatCurrency } from "@/utils/currency";
import type { Customer, MembershipPlan } from "@/types";

interface AssignMembershipModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  plans: MembershipPlan[];
}

export function AssignMembershipModal({ isOpen, onClose, onSaved, plans }: AssignMembershipModalProps) {
  const { showToast } = useToast();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [planId, setPlanId] = useState(plans[0]?.id ?? "");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    setCustomer(null);
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!customer || !planId) return;
    setIsSubmitting(true);
    try {
      await membershipService.purchase(customer.id, planId, new Date(startDate).toISOString());
      showToast(`Membership assigned to ${customer.name}.`);
      setCustomer(null);
      onSaved();
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedPlan = plans.find((p) => p.id === planId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Assign Membership"
      subtitle="Sell a membership plan to a customer."
      footer={
        <>
          <Button variant="ghost" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !customer}>Assign Membership</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label="Customer" required>
          <CustomerSearchInline selected={customer} onSelect={setCustomer} />
        </FormField>
        <FormField label="Membership Plan" required>
          <Select value={planId} onChange={(e) => setPlanId(e.target.value)}>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {formatCurrency(p.price)} / {p.durationMonths}mo
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Start Date" required>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </FormField>
        {selectedPlan && (
          <div className="text-xs text-ink-600 bg-cream-100 rounded-lg px-3 py-2.5">
            Benefit: {selectedPlan.benefitType === "PERCENT_DISCOUNT" ? `${selectedPlan.benefitValue}% off` : `${formatCurrency(selectedPlan.benefitValue)} off`}
            {" "}every visit for {selectedPlan.durationMonths} months.
          </div>
        )}
      </form>
    </Modal>
  );
}
