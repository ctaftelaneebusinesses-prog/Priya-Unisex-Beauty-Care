import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { FormField, Input } from "@/components/Form";
import { employeeService } from "@/services/employeeService";
import { useToast } from "@/components/Toast";
import type { Employee, SalonService } from "@/types";

interface EmployeeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  services: SalonService[];
  employee?: Employee | null;
}

export function EmployeeFormModal({ isOpen, onClose, onSaved, services, employee }: EmployeeFormModalProps) {
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [position, setPosition] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [joiningDate, setJoiningDate] = useState("");
  const [workingHours, setWorkingHours] = useState("10:00 AM - 8:00 PM");
  const [assignedServiceIds, setAssignedServiceIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setName(employee?.name ?? "");
    setPhone(employee?.phone ?? "");
    setEmail(employee?.email ?? "");
    setPosition(employee?.position ?? "");
    setSpecialization(employee?.specialization.join(", ") ?? "");
    setJoiningDate(employee?.joiningDate ?? new Date().toISOString().slice(0, 10));
    setWorkingHours(employee?.workingHours ?? "10:00 AM - 8:00 PM");
    setAssignedServiceIds(employee?.assignedServiceIds ?? []);
  }, [isOpen, employee]);

  const toggleService = (serviceId: string) => {
    setAssignedServiceIds((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId]
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !position.trim()) return;
    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        position: position.trim(),
        specialization: specialization.split(",").map((s) => s.trim()).filter(Boolean),
        joiningDate,
        workingHours,
        assignedServiceIds,
        status: employee?.status ?? ("Active" as const),
      };
      if (employee) {
        await employeeService.update(employee.id, payload);
        showToast(`${name} updated.`);
      } else {
        await employeeService.create(payload);
        showToast(`${name} added to the team.`);
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
      title={employee ? "Edit Employee" : "Add Employee"}
      subtitle="Manage staff details and which services they can perform."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>{employee ? "Save Changes" : "Add Employee"}</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Full Name" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </FormField>
        <FormField label="Position" required>
          <Input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="e.g. Senior Beauty Professional" />
        </FormField>
        <FormField label="Phone" required>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </FormField>
        <FormField label="Email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </FormField>
        <FormField label="Specialization" hint="Comma-separated">
          <Input value={specialization} onChange={(e) => setSpecialization(e.target.value)} placeholder="Hair Styling, Makeup" />
        </FormField>
        <FormField label="Working Hours">
          <Input value={workingHours} onChange={(e) => setWorkingHours(e.target.value)} />
        </FormField>
        <FormField label="Joining Date">
          <Input type="date" value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)} />
        </FormField>

        <div className="sm:col-span-2">
          <p className="text-sm font-medium text-ink-800 mb-2">Assigned Services</p>
          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
            {services.map((service) => (
              <button
                type="button"
                key={service.id}
                onClick={() => toggleService(service.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  assignedServiceIds.includes(service.id)
                    ? "bg-ink-950 text-white border-ink-950"
                    : "bg-white text-ink-700 border-cream-300 hover:bg-cream-100"
                }`}
              >
                {service.name}
              </button>
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
}
