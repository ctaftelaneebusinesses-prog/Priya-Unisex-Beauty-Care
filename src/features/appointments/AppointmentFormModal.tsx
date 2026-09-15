import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { FormField, Input, Select, TextArea } from "@/components/Form";
import { CustomerSearchInline } from "@/features/customers/CustomerSearchInline";
import { appointmentService } from "@/services/appointmentService";
import { useToast } from "@/components/Toast";
import type { Customer, Employee, SalonService } from "@/types";

interface AppointmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  services: SalonService[];
  employees: Employee[];
}

export function AppointmentFormModal({ isOpen, onClose, onSaved, services, employees }: AppointmentFormModalProps) {
  const { showToast } = useToast();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [serviceId, setServiceId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("11:00");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setCustomer(null);
    setServiceId(services[0]?.id ?? "");
    setEmployeeId("");
    setDate(new Date().toISOString().slice(0, 10));
    setTime("11:00");
    setNotes("");
  }, [isOpen, services]);

  const selectedService = services.find((s) => s.id === serviceId);
  const eligibleEmployees = employees.filter((e) => selectedService?.assignedEmployeeIds.includes(e.id));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!customer || !serviceId || !employeeId || !selectedService) return;
    setIsSubmitting(true);
    try {
      await appointmentService.create({
        customerId: customer.id,
        serviceId,
        employeeId,
        date,
        time,
        durationMinutes: selectedService.durationMinutes,
        status: "Confirmed",
        notes: notes.trim() || undefined,
      });
      showToast(`Appointment booked for ${customer.name}.`);
      onSaved();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="New Appointment"
      subtitle="Record an internal appointment for a customer."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !customer || !employeeId}>Book Appointment</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label="Customer" required>
          <CustomerSearchInline selected={customer} onSelect={setCustomer} />
        </FormField>
        <FormField label="Service" required>
          <Select value={serviceId} onChange={(e) => { setServiceId(e.target.value); setEmployeeId(""); }}>
            {services.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Employee" required>
          <Select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
            <option value="" disabled>Select employee…</option>
            {eligibleEmployees.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </Select>
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Date" required>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </FormField>
          <FormField label="Time" required>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </FormField>
        </div>
        <FormField label="Notes" hint="Optional">
          <TextArea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </FormField>
      </form>
    </Modal>
  );
}
