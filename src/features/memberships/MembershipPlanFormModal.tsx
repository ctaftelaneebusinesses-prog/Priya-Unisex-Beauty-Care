import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { FormField, Input, Select, TextArea } from "@/components/Form";
import { membershipPlanService } from "@/services/membershipService";
import { useToast } from "@/components/Toast";
import type { MembershipBenefitType, MembershipPlan, MembershipPlanType } from "@/types";

interface MembershipPlanFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  plan?: MembershipPlan | null;
}

export function MembershipPlanFormModal({ isOpen, onClose, onSaved, plan }: MembershipPlanFormModalProps) {
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [type, setType] = useState<MembershipPlanType>("DISCOUNT");
  const [durationMonths, setDurationMonths] = useState(12);
  const [price, setPrice] = useState(0);
  const [benefitType, setBenefitType] = useState<MembershipBenefitType>("PERCENT_DISCOUNT");
  const [benefitValue, setBenefitValue] = useState(10);
  const [walletCreditAmount, setWalletCreditAmount] = useState(0);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setName(plan?.name ?? "");
    setType(plan?.type ?? "DISCOUNT");
    setDurationMonths(plan?.durationMonths ?? 12);
    setPrice(plan?.price ?? 0);
    setBenefitType(plan?.benefitType ?? "PERCENT_DISCOUNT");
    setBenefitValue(plan?.benefitValue ?? 10);
    setWalletCreditAmount(plan?.walletCreditAmount ?? plan?.price ?? 0);
    setDescription(plan?.description ?? "");
  }, [isOpen, plan]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || price <= 0) return;
    if (type === "WALLET" && walletCreditAmount <= 0) return;
    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        type,
        durationMonths,
        price,
        benefitType,
        benefitValue: type === "DISCOUNT" ? benefitValue : 0,
        walletCreditAmount: type === "WALLET" ? walletCreditAmount : undefined,
        description: description.trim() || undefined,
        status: plan?.status ?? ("Active" as const),
      };
      if (plan) {
        await membershipPlanService.update(plan.id, payload);
        showToast(`"${name}" plan updated.`);
      } else {
        await membershipPlanService.create(payload);
        showToast(`"${name}" plan created.`);
      }
      onSaved();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={plan ? "Edit Membership Plan" : "New Membership Plan"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>{plan ? "Save Changes" : "Create Plan"}</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label="Plan Name" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Annual Membership" autoFocus />
        </FormField>
        <FormField label="Plan Type" required>
          <Select value={type} onChange={(e) => setType(e.target.value as MembershipPlanType)}>
            <option value="DISCOUNT">Discount Membership (% or flat off every visit)</option>
            <option value="WALLET">Prepaid Wallet (shop card / balance card)</option>
          </Select>
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Duration (months)" required>
            <Input type="number" min={1} value={durationMonths} onChange={(e) => setDurationMonths(Number(e.target.value))} />
          </FormField>
          <FormField label="Price (₹)" required hint="Amount the customer pays">
            <Input type="number" min={0} value={price} onChange={(e) => setPrice(Number(e.target.value))} />
          </FormField>
        </div>

        {type === "DISCOUNT" ? (
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Benefit Type" required>
              <Select value={benefitType} onChange={(e) => setBenefitType(e.target.value as MembershipBenefitType)}>
                <option value="PERCENT_DISCOUNT">Percentage Discount</option>
                <option value="FLAT_DISCOUNT">Flat Discount</option>
              </Select>
            </FormField>
            <FormField label={benefitType === "PERCENT_DISCOUNT" ? "Discount %" : "Discount ₹"} required>
              <Input type="number" min={0} value={benefitValue} onChange={(e) => setBenefitValue(Number(e.target.value))} />
            </FormField>
          </div>
        ) : (
          <FormField label="Wallet Credit Amount (₹)" required hint="Balance credited to the customer's wallet on purchase — can exceed price as a bonus">
            <Input type="number" min={0} value={walletCreditAmount} onChange={(e) => setWalletCreditAmount(Number(e.target.value))} />
          </FormField>
        )}

        <FormField label="Description" hint="Optional">
          <TextArea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </FormField>
      </form>
    </Modal>
  );
}
