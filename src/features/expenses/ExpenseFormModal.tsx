import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { FormField, Input, Select, TextArea } from "@/components/Form";
import { expenseService } from "@/services/expenseService";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/auth/AuthContext";
import { EXPENSE_CATEGORIES } from "@/types";
import type { Expense, ExpenseCategory, ExpensePaymentMethod } from "@/types";

const PAYMENT_METHODS: ExpensePaymentMethod[] = ["Cash", "UPI", "Card", "Bank Transfer", "Other"];

interface ExpenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  expense?: Expense | null;
}

export function ExpenseFormModal({ isOpen, onClose, onSaved, expense }: ExpenseFormModalProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [category, setCategory] = useState<ExpenseCategory>("Rent");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<ExpensePaymentMethod>("Cash");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setCategory(expense?.category ?? "Rent");
    setDescription(expense?.description ?? "");
    setAmount(expense?.amount ?? 0);
    setDate(expense?.date ?? new Date().toISOString().slice(0, 10));
    setPaymentMethod(expense?.paymentMethod ?? "Cash");
    setReferenceNumber(expense?.referenceNumber ?? "");
    setNotes(expense?.notes ?? "");
  }, [isOpen, expense]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!description.trim() || amount <= 0 || !user) return;
    setIsSubmitting(true);
    try {
      const payload = {
        category,
        description: description.trim(),
        amount,
        date,
        paymentMethod,
        referenceNumber: referenceNumber.trim() || undefined,
        notes: notes.trim() || undefined,
        createdByUserId: user.id,
        createdByName: user.name,
      };
      if (expense) {
        await expenseService.update(expense.id, payload);
        showToast("Expense updated.");
      } else {
        await expenseService.create(payload);
        showToast("Expense recorded.");
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
      title={expense ? "Edit Expense" : "Add Expense"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>{expense ? "Save Changes" : "Add Expense"}</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Category" required>
          <Select value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)}>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Amount (₹)" required>
          <Input type="number" min={0} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
        </FormField>
        <div className="sm:col-span-2">
          <FormField label="Description" required>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Shop rent — September" autoFocus />
          </FormField>
        </div>
        <FormField label="Date" required>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </FormField>
        <FormField label="Payment Method" required>
          <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as ExpensePaymentMethod)}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Reference Number" hint="Optional">
          <Input value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} />
        </FormField>
        <div className="sm:col-span-2">
          <FormField label="Notes" hint="Optional">
            <TextArea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </FormField>
        </div>
      </form>
    </Modal>
  );
}
