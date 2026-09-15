import type { SalonService } from "@/types";
import { store } from "./storage";
import { generateId } from "@/utils/id";

const COLLECTION = "services";

export const serviceService = {
  getAll: () => store.getAll<SalonService>(COLLECTION),
  getById: (id: string) => store.getById<SalonService>(COLLECTION, id),

  async create(input: Omit<SalonService, "id" | "createdAt">): Promise<SalonService> {
    const service: SalonService = {
      ...input,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    return store.create(COLLECTION, service);
  },

  update: (id: string, patch: Partial<SalonService>) =>
    store.update<SalonService>(COLLECTION, id, patch),

  setStatus: (id: string, status: SalonService["status"]) =>
    store.update<SalonService>(COLLECTION, id, { status }),

  remove: (id: string) => store.remove(COLLECTION, id),
};
