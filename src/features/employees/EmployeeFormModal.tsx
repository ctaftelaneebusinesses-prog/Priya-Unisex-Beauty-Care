import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { KeyRound, ShieldCheck, ShieldOff } from "lucide-react";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { FormField, Input } from "@/components/Form";
import { employeeService } from "@/services/employeeService";
import { userAccountService } from "@/services/authService";
import { useToast } from "@/components/Toast";
import type { AuthUser, Employee, SalonService } from "@/types";

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

  // Login access (separate concern from the employee profile itself)
  const [linkedUser, setLinkedUser] = useState<AuthUser | null | undefined>(undefined); // undefined = not checked yet
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [isLoginBusy, setIsLoginBusy] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [isRevokeConfirmOpen, setIsRevokeConfirmOpen] = useState(false);

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
    setLoginEmail(employee?.email ?? "");
    setLoginPassword("");
    setIsResettingPassword(false);
    setNewPassword("");

    if (employee) {
      setLinkedUser(undefined);
      userAccountService
        .listUsers()
        .then((users) => setLinkedUser(users.find((u) => u.employeeId === employee.id) ?? null))
        .catch(() => setLinkedUser(null));
    } else {
      setLinkedUser(null);
    }
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
        const created = await employeeService.create(payload);
        showToast(`${name} added to the team.`);
        if (loginEmail.trim() && loginPassword.trim()) {
          await userAccountService.createLogin({
            name: name.trim(),
            email: loginEmail.trim(),
            password: loginPassword.trim(),
            employeeId: created.id,
          });
          showToast(`Login access created for ${name}.`);
        }
      }
      onSaved();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Something went wrong.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGrantLogin = async () => {
    if (!employee || !loginEmail.trim() || !loginPassword.trim()) return;
    setIsLoginBusy(true);
    try {
      const user = await userAccountService.createLogin({
        name: employee.name,
        email: loginEmail.trim(),
        password: loginPassword.trim(),
        employeeId: employee.id,
      });
      setLinkedUser(user);
      setLoginPassword("");
      showToast(`Login access granted to ${employee.name}.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not create login.", "error");
    } finally {
      setIsLoginBusy(false);
    }
  };

  const handleResetPassword = async () => {
    if (!linkedUser || newPassword.trim().length < 4) return;
    setIsLoginBusy(true);
    try {
      await userAccountService.resetPassword(linkedUser.id, newPassword.trim());
      showToast("Password reset.");
      setNewPassword("");
      setIsResettingPassword(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not reset password.", "error");
    } finally {
      setIsLoginBusy(false);
    }
  };

  const handleRevoke = async () => {
    if (!linkedUser) return;
    setIsLoginBusy(true);
    try {
      await userAccountService.revokeLogin(linkedUser.id);
      showToast("Login access revoked.");
      setLinkedUser(null);
      setIsRevokeConfirmOpen(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not revoke login.", "error");
    } finally {
      setIsLoginBusy(false);
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

        <div className="sm:col-span-2 border-t border-cream-200 pt-4 mt-1">
          <p className="text-sm font-medium text-ink-800 mb-1 flex items-center gap-1.5">
            <KeyRound size={14} /> Login Access
          </p>
          <p className="text-xs text-ink-600 mb-3">
            Adding an employee record does not by itself let them sign in — grant login access separately below.
          </p>

          {!employee && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-cream-100 rounded-xl p-3.5">
              <FormField label="Login Email" hint="Leave blank to set up later from the employee's profile">
                <Input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
              </FormField>
              <FormField label="Temporary Password" hint="Min. 4 characters">
                <Input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} />
              </FormField>
            </div>
          )}

          {employee && linkedUser === undefined && (
            <p className="text-xs text-ink-600">Checking login status…</p>
          )}

          {employee && linkedUser === null && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-cream-100 rounded-xl p-3.5">
              <div className="sm:col-span-2 flex items-center gap-1.5 text-xs text-wine-600 font-medium mb-1">
                <ShieldOff size={13} /> No login access yet — this employee cannot sign in.
              </div>
              <FormField label="Login Email">
                <Input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
              </FormField>
              <FormField label="Temporary Password" hint="Min. 4 characters">
                <Input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} />
              </FormField>
              <div className="sm:col-span-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={isLoginBusy || !loginEmail.trim() || loginPassword.trim().length < 4}
                  onClick={handleGrantLogin}
                >
                  Grant Login Access
                </Button>
              </div>
            </div>
          )}

          {employee && linkedUser && (
            <div className="bg-sage-50 rounded-xl p-3.5">
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-1.5 text-xs text-sage-600 font-semibold">
                  <ShieldCheck size={13} /> Can sign in with {linkedUser.email}
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="text-xs text-ink-700 hover:underline"
                    onClick={() => setIsResettingPassword((v) => !v)}
                  >
                    Reset Password
                  </button>
                  <button
                    type="button"
                    className="text-xs text-wine-600 hover:underline"
                    onClick={() => setIsRevokeConfirmOpen(true)}
                  >
                    Revoke Access
                  </button>
                </div>
              </div>
              {isResettingPassword && (
                <div className="flex items-center gap-2">
                  <Input
                    type="password"
                    placeholder="New password (min. 4 characters)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="button" size="sm" disabled={isLoginBusy || newPassword.trim().length < 4} onClick={handleResetPassword}>
                    Save
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </form>

      <ConfirmationDialog
        isOpen={isRevokeConfirmOpen}
        title="Revoke login access?"
        message={`${employee?.name} will no longer be able to sign in until access is granted again.`}
        confirmLabel="Revoke Access"
        variant="danger"
        onConfirm={handleRevoke}
        onCancel={() => setIsRevokeConfirmOpen(false)}
      />
    </Modal>
  );
}
