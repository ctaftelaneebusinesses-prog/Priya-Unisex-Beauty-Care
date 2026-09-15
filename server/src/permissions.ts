/**
 * Collection-level authorization. Mirrors src/auth/permissions.ts on the frontend,
 * but this is the copy that actually matters: the frontend hiding a nav item is UX,
 * this is what stops an EMPLOYEE token from writing to owner-only data even if they
 * craft the request directly.
 */

export type Role = "OWNER" | "EMPLOYEE";

// Collections both roles may read. Anything not listed here is OWNER-only to read.
const ANY_ROLE_READ = new Set([
  "employees",
  "services",
  "customers",
  "bills",
  "membershipPlans",
  "customerMemberships",
  "walletTransactions",
  "appointments",
  "billableItems",
  "employeeReviews",
]);

// Collections both roles may write (create/update/delete). Anything not listed is OWNER-only to write.
const ANY_ROLE_WRITE = new Set([
  "customers",
  "bills",
  "customerMemberships",
  "walletTransactions",
  "appointments",
  "commissionRecords",
]);

// Singletons: name -> whether EMPLOYEE can read/write.
const SINGLETON_RULES: Record<string, { read: "ANY" | "OWNER"; write: "ANY" | "OWNER" }> = {
  "gst-settings": { read: "ANY", write: "OWNER" },
  "invoice-counter": { read: "ANY", write: "ANY" },
  "business-settings": { read: "ANY", write: "OWNER" },
};

export function canReadCollection(role: Role, collection: string): boolean {
  if (role === "OWNER") return true;
  return ANY_ROLE_READ.has(collection);
}

export function canWriteCollection(role: Role, collection: string): boolean {
  if (role === "OWNER") return true;
  return ANY_ROLE_WRITE.has(collection);
}

export function canReadSingleton(role: Role, name: string): boolean {
  if (role === "OWNER") return true;
  return (SINGLETON_RULES[name]?.read ?? "OWNER") === "ANY";
}

export function canWriteSingleton(role: Role, name: string): boolean {
  if (role === "OWNER") return true;
  return (SINGLETON_RULES[name]?.write ?? "OWNER") === "ANY";
}
