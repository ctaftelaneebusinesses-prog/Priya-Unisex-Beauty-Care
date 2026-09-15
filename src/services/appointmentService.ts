import type { Appointment } from "@/types";
import { store } from "./storage";
import { generateId } from "@/utils/id";

const COLLECTION = "appointments";

export const appointmentService = {
  getAll: () => store.getAll<Appointment>(COLLECTION),
  getById: (id: string) => store.getById<Appointment>(COLLECTION, id),

  async getForDate(date: string): Promise<Appointment[]> {
    const all = await store.getAll<Appointment>(COLLECTION);
    return all.filter((a) => a.date === date);
  },

  async create(input: Omit<Appointment, "id" | "createdAt">): Promise<Appointment> {
    const appointment: Appointment = {
      ...input,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    return store.create(COLLECTION, appointment);
  },

  update: (id: string, patch: Partial<Appointment>) =>
    store.update<Appointment>(COLLECTION, id, patch),

  setStatus: (id: string, status: Appointment["status"]) =>
    store.update<Appointment>(COLLECTION, id, { status }),

  linkBill: (id: string, billId: string) =>
    store.update<Appointment>(COLLECTION, id, { billId, status: "Completed" }),

  remove: (id: string) => store.remove(COLLECTION, id),
};
