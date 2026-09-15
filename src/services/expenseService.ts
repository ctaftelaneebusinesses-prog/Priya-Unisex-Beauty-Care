import type { Expense } from "@/types";
import { store } from "./storage";
import { generateId } from "@/utils/id";

const COLLECTION = "expenses";

export const expenseService = {
  getAll: () => store.getAll<Expense>(COLLECTION),
  getById: (id: string) => store.getById<Expense>(COLLECTION, id),

  async create(input: Omit<Expense, "id" | "createdAt" | "status">): Promise<Expense> {
    const expense: Expense = { ...input, id: generateId(), status: "Recorded", createdAt: new Date().toISOString() };
    return store.create(COLLECTION, expense);
  },

  update: (id: string, patch: Partial<Expense>) => store.update<Expense>(COLLECTION, id, patch),

  void: (id: string) => store.update<Expense>(COLLECTION, id, { status: "Void" }),

  remove: (id: string) => store.remove(COLLECTION, id),
};
