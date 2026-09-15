import { useState } from "react";
import type { FormEvent } from "react";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { FormField, Input } from "@/components/Form";
import { membershipService } from "@/services/membershipService";
import { useToast } from "@/components/Toast";
import type { CustomerMembership } from "@/types";

interface TopUpWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  membership: CustomerMembership | null;
}

export function TopUpWalletModal({ isOpen, onClose, onSaved, membership }: TopUpWalletModalProps) {
  const { showToast } = useToast();
  const [amount, setAmount] = useState(1000);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!membership) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return;
    setIsSubmitting(true);
    try {
      await membershipService.topUpWallet(membership.id, amount, "Manual top-up");
      showToast(`₹${amount} added to wallet.`);
      onSaved();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Top Up Wallet"
      subtitle={`Current balance: ₹${(membership.walletBalance ?? 0).toLocaleString("en-IN")}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>Add to Wallet</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <FormField label="Amount to Add (₹)" required>
          <Input type="number" min={1} value={amount} onChange={(e) => setAmount(Number(e.target.value))} autoFocus />
        </FormField>
      </form>
    </Modal>
  );
}
