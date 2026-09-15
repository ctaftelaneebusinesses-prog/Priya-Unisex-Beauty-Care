import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { FormField, Input } from "@/components/Form";
import { jewelleryItemService } from "@/services/jewelleryService";
import { useToast } from "@/components/Toast";
import type { JewelleryItem } from "@/types";

interface JewelleryItemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  item?: JewelleryItem | null;
}

export function JewelleryItemFormModal({ isOpen, onClose, onSaved, item }: JewelleryItemFormModalProps) {
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [rentalPrice, setRentalPrice] = useState(0);
  const [securityDeposit, setSecurityDeposit] = useState(0);
  const [rentalDurationDays, setRentalDurationDays] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setName(item?.name ?? "");
    setCategory(item?.category ?? "");
    setRentalPrice(item?.rentalPrice ?? 0);
    setSecurityDeposit(item?.securityDeposit ?? 0);
    setRentalDurationDays(item?.rentalDurationDays ?? 1);
  }, [isOpen, item]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !category.trim()) return;
    setIsSubmitting(true);
    try {
      const payload = { name: name.trim(), category: category.trim(), rentalPrice, securityDeposit, rentalDurationDays };
      if (item) {
        await jewelleryItemService.update(item.id, payload);
        showToast(`"${name}" updated.`);
      } else {
        await jewelleryItemService.create(payload);
        showToast(`"${name}" added to jewellery catalog.`);
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
      title={item ? "Edit Jewellery Item" : "Add Jewellery Item"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>{item ? "Save Changes" : "Add Item"}</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <FormField label="Jewellery Name" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Bridal Necklace Set" autoFocus />
          </FormField>
        </div>
        <FormField label="Category" required>
          <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Bridal, Earrings" />
        </FormField>
        <FormField label="Standard Rental Duration (days)" required>
          <Input type="number" min={1} value={rentalDurationDays} onChange={(e) => setRentalDurationDays(Number(e.target.value))} />
        </FormField>
        <FormField label="Rental Price (₹)" required>
          <Input type="number" min={0} value={rentalPrice} onChange={(e) => setRentalPrice(Number(e.target.value))} />
        </FormField>
        <FormField label="Security Deposit (₹)" required hint="Refundable — never counted as revenue">
          <Input type="number" min={0} value={securityDeposit} onChange={(e) => setSecurityDeposit(Number(e.target.value))} />
        </FormField>
      </form>
    </Modal>
  );
}
