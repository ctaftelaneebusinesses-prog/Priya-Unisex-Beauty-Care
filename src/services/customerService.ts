import type { Customer } from "@/types";
import { store } from "./storage";
import { generateId } from "@/utils/id";

const COLLECTION = "customers";

export const customerService = {
  getAll: () => store.getAll<Customer>(COLLECTION),
  getById: (id: string) => store.getById<Customer>(COLLECTION, id),

  async search(query: string): Promise<Customer[]> {
    const all = await store.getAll<Customer>(COLLECTION);
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q)
    );
  },

  async findByPhone(phone: string): Promise<Customer | undefined> {
    const all = await store.getAll<Customer>(COLLECTION);
    return all.find((c) => c.phone === phone.trim());
  },

  async create(input: Omit<Customer, "id" | "createdAt">): Promise<Customer> {
    const customer: Customer = {
      ...input,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    return store.create(COLLECTION, customer);
  },

  update: (id: string, patch: Partial<Customer>) =>
    store.update<Customer>(COLLECTION, id, patch),

  remove: (id: string) => store.remove(COLLECTION, id),
};
