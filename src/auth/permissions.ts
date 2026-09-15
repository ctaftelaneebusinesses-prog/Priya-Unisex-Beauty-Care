import type { UserRole } from "@/types";

export type Permission =
  | "billing.create"
  | "billing.void"
  | "customers.manage"
  | "services.manage"
  | "employees.manage"
  | "memberships.manage"
  | "appointments.manage"
  | "gst.manage"
  | "settings.manage"
  | "reports.owner"
  | "reports.self"
  | "commissions.manage"
  | "inventory.manage"
  | "expenses.manage"
  | "jewellery.manage";

const OWNER_PERMISSIONS: Permission[] = [
  "billing.create",
  "billing.void",
  "customers.manage",
  "services.manage",
  "employees.manage",
  "memberships.manage",
  "appointments.manage",
  "gst.manage",
  "settings.manage",
  "reports.owner",
  "reports.self",
  "commissions.manage",
  "inventory.manage",
  "expenses.manage",
  "jewellery.manage",
];

const EMPLOYEE_PERMISSIONS: Permission[] = [
  "billing.create",
  "customers.manage",
  "appointments.manage",
  "reports.self",
];

const PERMISSIONS_BY_ROLE: Record<UserRole, Permission[]> = {
  OWNER: OWNER_PERMISSIONS,
  EMPLOYEE: EMPLOYEE_PERMISSIONS,
};

export function hasPermission(role: UserRole | undefined, permission: Permission): boolean {
  if (!role) return false;
  return PERMISSIONS_BY_ROLE[role].includes(permission);
}
