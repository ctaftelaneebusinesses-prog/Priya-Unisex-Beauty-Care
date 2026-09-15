import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { FormField, Input, Select } from "@/components/Form";
import { CustomerSearchInline } from "@/features/customers/CustomerSearchInline";
import { jewelleryRentalService } from "@/services/jewelleryService";
import { useToast } from "@/components/Toast";
import { addDays, format } from "date-fns";
import { formatCurrency } from "@/utils/currency";
import type { Customer, Employee, JewelleryItem } from "@/types";

interface StartRentalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  item: JewelleryItem | null;
  employees: Employee[];
}

export function StartRentalModal({ isOpen, onClose, onSaved, item, employees }: StartRentalModalProps) {
  const { showToast } = useToast();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [employeeId, setEmployeeId] = useState("");
  const [rentalDate, setRentalDate] = useState(new Date().toISOString().slice(0, 10));
  const [expectedReturnDate, setExpectedReturnDate] = useState("");
  const [mode, setMode] = useState<"RESERVED" | "RENTED">("RENTED");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !item) return;
    setCustomer(null);
    setEmployeeId("");
    const today = new Date();
    setRentalDate(today.toISOString().slice(0, 10));
    setExpectedReturnDate(addDays(today, item.rentalDurationDays).toISOString().slice(0, 10));
    setMode("RENTED");
    setNotes("");
  }, [isOpen, item]);

  if (!item) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!customer) return;
    setIsSubmitting(true);
    try {
      const employee = employees.find((emp) => emp.id === employeeId);
      await jewelleryRentalService.start({
        jewelleryItemId: item.id,
        customerId: customer.id,
        customerName: customer.name,
        employeeId: employeeId || undefined,
        employeeName: employee?.name,
        rentalDate: new Date(rentalDate).toISOString(),
        expectedReturnDate: new Date(expectedReturnDate).toISOString(),
        notes: notes.trim() || undefined,
        initialStatus: mode,
      });
      showToast(`${item.name} ${mode === "RENTED" ? "rented out to" : "reserved for"} ${customer.name}.`);
      onSaved();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Rent — ${item.name}`}
      subtitle={`Rental: ${formatCurrency(item.rentalPrice)} · Security Deposit: ${formatCurrency(item.securityDeposit)}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !customer}>
            {mode === "RENTED" ? "Confirm Rental" : "Reserve Item"}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label="Customer" required>
          <CustomerSearchInline selected={customer} onSelect={setCustomer} />
        </FormField>
        <FormField label="Status" required>
          <Select value={mode} onChange={(e) => setMode(e.target.value as "RESERVED" | "RENTED")}>
            <option value="RENTED">Renting out now</option>
            <option value="RESERVED">Reserve for later pickup</option>
          </Select>
        </FormField>
        <FormField label="Handled By" hint="Optional">
          <Select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
            <option value="">— None —</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </Select>
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label={mode === "RENTED" ? "Rental Date" : "Reservation Date"} required>
            <Input type="date" value={rentalDate} onChange={(e) => setRentalDate(e.target.value)} />
          </FormField>
          <FormField label="Expected Return Date" required>
            <Input type="date" value={expectedReturnDate} onChange={(e) => setExpectedReturnDate(e.target.value)} min={rentalDate} />
          </FormField>
        </div>
        <FormField label="Notes" hint="Optional">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </FormField>
        <p className="text-xs text-ink-600">Standard return by {format(new Date(expectedReturnDate || rentalDate), "d MMM yyyy")}.</p>
      </form>
    </Modal>
  );
}
