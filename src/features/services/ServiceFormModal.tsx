import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { FormField, Input, Select, TextArea } from "@/components/Form";
import { serviceService } from "@/services/serviceService";
import { useToast } from "@/components/Toast";
import { SERVICE_CATEGORIES } from "@/types";
import type { Employee, Gender, SalonService, ServiceCategory } from "@/types";

interface ServiceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  employees: Employee[];
  service?: SalonService | null;
}

const GENDERS: Gender[] = ["Unisex", "Female", "Male"];

export function ServiceFormModal({ isOpen, onClose, onSaved, employees, service }: ServiceFormModalProps) {
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ServiceCategory>(SERVICE_CATEGORIES[0]);
  const [price, setPrice] = useState(0);
  const [duration, setDuration] = useState(30);
  const [gender, setGender] = useState<Gender>("Unisex");
  const [description, setDescription] = useState("");
  const [gstRate, setGstRate] = useState(18);
  const [assignedEmployeeIds, setAssignedEmployeeIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setName(service?.name ?? "");
    setCategory(service?.category ?? SERVICE_CATEGORIES[0]);
    setPrice(service?.price ?? 0);
    setDuration(service?.durationMinutes ?? 30);
    setGender(service?.gender ?? "Unisex");
    setDescription(service?.description ?? "");
    setGstRate(service?.gstRatePercent ?? 18);
    setAssignedEmployeeIds(service?.assignedEmployeeIds ?? []);
  }, [isOpen, service]);

  const toggleEmployee = (employeeId: string) => {
    setAssignedEmployeeIds((prev) =>
      prev.includes(employeeId) ? prev.filter((id) => id !== employeeId) : [...prev, employeeId]
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || price <= 0) return;
    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        category,
        price,
        durationMinutes: duration,
        gender,
        description: description.trim() || undefined,
        assignedEmployeeIds,
        gstRatePercent: gstRate,
        status: service?.status ?? ("Active" as const),
      };
      if (service) {
        await serviceService.update(service.id, payload);
        showToast(`"${name}" updated.`);
      } else {
        await serviceService.create(payload);
        showToast(`"${name}" added to services.`);
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
      title={service ? "Edit Service" : "Add Service"}
      subtitle="Configure pricing, duration and eligible employees."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>{service ? "Save Changes" : "Add Service"}</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Service Name" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Hydra Facial" autoFocus />
        </FormField>
        <FormField label="Category" required>
          <Select value={category} onChange={(e) => setCategory(e.target.value as ServiceCategory)}>
            {SERVICE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Price (₹)" required>
          <Input type="number" min={0} value={price} onChange={(e) => setPrice(Number(e.target.value))} />
        </FormField>
        <FormField label="Duration (minutes)" required>
          <Input type="number" min={5} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
        </FormField>
        <FormField label="Applicable Gender" required>
          <Select value={gender} onChange={(e) => setGender(e.target.value as Gender)}>
            {GENDERS.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="GST Rate (%)" required>
          <Input type="number" min={0} max={28} value={gstRate} onChange={(e) => setGstRate(Number(e.target.value))} />
        </FormField>
        <div className="sm:col-span-2">
          <FormField label="Description" hint="Optional">
            <TextArea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </FormField>
        </div>
        <div className="sm:col-span-2">
          <p className="text-sm font-medium text-ink-800 mb-2">Assigned Employees</p>
          <div className="flex flex-wrap gap-2">
            {employees.map((emp) => (
              <button
                type="button"
                key={emp.id}
                onClick={() => toggleEmployee(emp.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  assignedEmployeeIds.includes(emp.id)
                    ? "bg-ink-950 text-white border-ink-950"
                    : "bg-white text-ink-700 border-cream-300 hover:bg-cream-100"
                }`}
              >
                {emp.name}
              </button>
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
}
