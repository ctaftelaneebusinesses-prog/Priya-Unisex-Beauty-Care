import type { BillableItem } from "@/types";
import { store } from "./storage";
import { generateId } from "@/utils/id";

const COLLECTION = "billableItems";

export const billableItemService = {
  getAll: () => store.getAll<BillableItem>(COLLECTION),
  getById: (id: string) => store.getById<BillableItem>(COLLECTION, id),

  async create(input: Omit<BillableItem, "id">): Promise<BillableItem> {
    const item: BillableItem = { ...input, id: generateId() };
    return store.create(COLLECTION, item);
  },

  update: (id: string, patch: Partial<BillableItem>) =>
    store.update<BillableItem>(COLLECTION, id, patch),

  remove: (id: string) => store.remove(COLLECTION, id),
};
