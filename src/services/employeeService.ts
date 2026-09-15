import type { Employee, EmployeeReview } from "@/types";
import { store } from "./storage";
import { generateId } from "@/utils/id";

const COLLECTION = "employees";
const REVIEWS_COLLECTION = "employeeReviews";

export const employeeService = {
  getAll: () => store.getAll<Employee>(COLLECTION),
  getById: (id: string) => store.getById<Employee>(COLLECTION, id),

  async create(input: Omit<Employee, "id">): Promise<Employee> {
    const employee: Employee = { ...input, id: generateId() };
    return store.create(COLLECTION, employee);
  },

  update: (id: string, patch: Partial<Employee>) =>
    store.update<Employee>(COLLECTION, id, patch),

  setStatus: (id: string, status: Employee["status"]) =>
    store.update<Employee>(COLLECTION, id, { status }),

  remove: (id: string) => store.remove(COLLECTION, id),

  getReviews: (employeeId: string) =>
    store
      .getAll<EmployeeReview>(REVIEWS_COLLECTION)
      .then((reviews) => reviews.filter((r) => r.employeeId === employeeId)),

  async addReview(input: Omit<EmployeeReview, "id">): Promise<EmployeeReview> {
    const review: EmployeeReview = { ...input, id: generateId() };
    return store.create(REVIEWS_COLLECTION, review);
  },
};
