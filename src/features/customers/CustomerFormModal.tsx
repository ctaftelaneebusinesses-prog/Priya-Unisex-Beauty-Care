import { useState } from "react";
import type { FormEvent } from "react";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { FormField, Input, TextArea } from "@/components/Form";
import { customerService } from "@/services/customerService";
import { useToast } from "@/components/Toast";
import type { Customer } from "@/types";

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (customer: Customer) => void;
  initialPhone?: string;
}

export function CustomerFormModal({ isOpen, onClose, onSaved, initialPhone }: CustomerFormModalProps) {
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName("");
    setPhone(initialPhone ?? "");
    setEmail("");
    setAddress("");
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setError("Name and phone number are required.");
      return;
    }
    setIsSubmitting(true);
    try {
      const existing = await customerService.findByPhone(phone.trim());
      if (existing) {
        setError("A customer with this phone number already exists.");
        setIsSubmitting(false);
        return;
      }
      const customer = await customerService.create({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        address: address.trim() || undefined,
      });
      showToast(`Customer "${customer.name}" added.`);
      onSaved(customer);
      reset();
    } catch {
      setError("Could not save customer. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Customer"
      subtitle="Create a new customer profile."
      footer={
        <>
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            Save Customer
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label="Full Name" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Priya Sharma" autoFocus />
        </FormField>
        <FormField label="Phone Number" required>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile number" />
        </FormField>
        <FormField label="Email" hint="Optional">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="customer@email.com" />
        </FormField>
        <FormField label="Address" hint="Optional">
          <TextArea rows={2} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, area, city" />
        </FormField>
        {error && <p className="text-sm text-wine-600 bg-wine-50 rounded-lg px-3 py-2">{error}</p>}
      </form>
    </Modal>
  );
}
