import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { FormField, Input, Select } from "@/components/Form";
import { commissionRuleService } from "@/services/commissionService";
import { useToast } from "@/components/Toast";
import type { CommissionRule, CommissionScope, CommissionType, Employee, SalonService } from "@/types";

interface CommissionRuleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  employees: Employee[];
  services: SalonService[];
  rule?: CommissionRule | null;
}

export function CommissionRuleFormModal({ isOpen, onClose, onSaved, employees, services, rule }: CommissionRuleFormModalProps) {
  const { showToast } = useToast();
  const [scope, setScope] = useState<CommissionScope>("GLOBAL");
  const [employeeId, setEmployeeId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [type, setType] = useState<CommissionType>("PERCENTAGE");
  const [value, setValue] = useState(10);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setScope(rule?.scope ?? "GLOBAL");
    setEmployeeId(rule?.employeeId ?? employees[0]?.id ?? "");
    setServiceId(rule?.serviceId ?? services[0]?.id ?? "");
    setType(rule?.type ?? "PERCENTAGE");
    setValue(rule?.value ?? 10);
  }, [isOpen, rule, employees, services]);

  const needsEmployee = scope === "EMPLOYEE" || scope === "EMPLOYEE_SERVICE";
  const needsService = scope === "SERVICE" || scope === "EMPLOYEE_SERVICE";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (needsEmployee && !employeeId) return;
    if (needsService && !serviceId) return;
    setIsSubmitting(true);
    try {
      const payload = {
        scope,
        employeeId: needsEmployee ? employeeId : undefined,
        serviceId: needsService ? serviceId : undefined,
        type,
        value,
        status: rule?.status ?? ("Active" as const),
      };
      if (rule) {
        await commissionRuleService.update(rule.id, payload);
        showToast("Commission rule updated.");
      } else {
        await commissionRuleService.create(payload);
        showToast("Commission rule created.");
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
      title={rule ? "Edit Commission Rule" : "New Commission Rule"}
      subtitle="Applied automatically whenever a matching service is billed."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>{rule ? "Save Changes" : "Create Rule"}</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label="Applies To" required hint="Most specific matching rule wins: Employee + Service, then Service, then Employee, then Global default.">
          <Select value={scope} onChange={(e) => setScope(e.target.value as CommissionScope)}>
            <option value="GLOBAL">Global default (all employees, all services)</option>
            <option value="EMPLOYEE">Specific employee (any service)</option>
            <option value="SERVICE">Specific service (any employee)</option>
            <option value="EMPLOYEE_SERVICE">Specific employee + specific service</option>
          </Select>
        </FormField>

        {needsEmployee && (
          <FormField label="Employee" required>
            <Select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </Select>
          </FormField>
        )}
        {needsService && (
          <FormField label="Service" required>
            <Select value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
              {services.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
          </FormField>
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Commission Type" required>
            <Select value={type} onChange={(e) => setType(e.target.value as CommissionType)}>
              <option value="PERCENTAGE">Percentage of sale</option>
              <option value="FIXED">Fixed amount per service</option>
            </Select>
          </FormField>
          <FormField label={type === "PERCENTAGE" ? "Percentage (%)" : "Amount (₹)"} required>
            <Input type="number" min={0} value={value} onChange={(e) => setValue(Number(e.target.value))} />
          </FormField>
        </div>
      </form>
    </Modal>
  );
}
