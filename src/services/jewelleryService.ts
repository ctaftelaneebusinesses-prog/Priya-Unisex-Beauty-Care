import type { JewelleryItem, JewelleryRental, JewelleryReturnCondition } from "@/types";
import { store } from "./storage";
import { generateId } from "@/utils/id";

const ITEMS_COLLECTION = "jewelleryItems";
const RENTALS_COLLECTION = "jewelleryRentals";

export const jewelleryItemService = {
  getAll: () => store.getAll<JewelleryItem>(ITEMS_COLLECTION),
  getById: (id: string) => store.getById<JewelleryItem>(ITEMS_COLLECTION, id),

  async create(input: Omit<JewelleryItem, "id" | "createdAt" | "status">): Promise<JewelleryItem> {
    const item: JewelleryItem = { ...input, id: generateId(), status: "AVAILABLE", createdAt: new Date().toISOString() };
    return store.create(ITEMS_COLLECTION, item);
  },

  update: (id: string, patch: Partial<JewelleryItem>) => store.update<JewelleryItem>(ITEMS_COLLECTION, id, patch),
  remove: (id: string) => store.remove(ITEMS_COLLECTION, id),
};

export interface StartRentalInput {
  jewelleryItemId: string;
  customerId: string;
  customerName: string;
  employeeId?: string;
  employeeName?: string;
  rentalDate: string;
  expectedReturnDate: string;
  notes?: string;
  /** RESERVED = held for later pickup; RENTED = item is going out today. */
  initialStatus: "RESERVED" | "RENTED";
}

export interface ProcessReturnInput {
  actualReturnDate: string;
  returnCondition: JewelleryReturnCondition;
  damageCharges: number;
  otherPenalty: number;
  returnNotes?: string;
}

export const jewelleryRentalService = {
  getAll: () => store.getAll<JewelleryRental>(RENTALS_COLLECTION),
  getById: (id: string) => store.getById<JewelleryRental>(RENTALS_COLLECTION, id),

  async start(input: StartRentalInput): Promise<JewelleryRental> {
    const item = await jewelleryItemService.getById(input.jewelleryItemId);
    if (!item) throw new Error("Jewellery item not found");
    if (item.status !== "AVAILABLE") throw new Error(`${item.name} is not currently available.`);

    const rental: JewelleryRental = {
      id: generateId(),
      jewelleryItemId: item.id,
      jewelleryItemName: item.name,
      customerId: input.customerId,
      customerName: input.customerName,
      employeeId: input.employeeId,
      employeeName: input.employeeName,
      rentalDate: input.rentalDate,
      expectedReturnDate: input.expectedReturnDate,
      rentalAmount: item.rentalPrice,
      securityDeposit: item.securityDeposit,
      status: input.initialStatus,
      notes: input.notes,
      createdAt: new Date().toISOString(),
    };
    const created = await store.create(RENTALS_COLLECTION, rental);
    await jewelleryItemService.update(item.id, { status: input.initialStatus });
    return created;
  },

  /** RESERVED -> RENTED, e.g. when the customer picks up a previously reserved item. */
  async confirmPickup(rentalId: string): Promise<JewelleryRental> {
    const rental = await jewelleryRentalService.getById(rentalId);
    if (!rental) throw new Error("Rental not found");
    const updated = await store.update<JewelleryRental>(RENTALS_COLLECTION, rentalId, { status: "RENTED" });
    await jewelleryItemService.update(rental.jewelleryItemId, { status: "RENTED" });
    return updated;
  },

  async cancel(rentalId: string): Promise<JewelleryRental> {
    const rental = await jewelleryRentalService.getById(rentalId);
    if (!rental) throw new Error("Rental not found");
    const updated = await store.update<JewelleryRental>(RENTALS_COLLECTION, rentalId, { status: "CANCELLED" });
    await jewelleryItemService.update(rental.jewelleryItemId, { status: "AVAILABLE" });
    return updated;
  },

  /**
   * Completes a rental: computes the refund (deposit minus damage/penalty,
   * never below zero) and returns the jewellery item to AVAILABLE. Damage and
   * penalty amounts are tracked separately from the rental amount — neither
   * the deposit nor its deductions are ever counted as salon revenue.
   */
  async processReturn(rentalId: string, input: ProcessReturnInput): Promise<JewelleryRental> {
    const rental = await jewelleryRentalService.getById(rentalId);
    if (!rental) throw new Error("Rental not found");

    const deductions = Math.max(0, input.damageCharges) + Math.max(0, input.otherPenalty);
    const depositReturned = Math.max(0, rental.securityDeposit - deductions);

    const updated = await store.update<JewelleryRental>(RENTALS_COLLECTION, rentalId, {
      status: "RETURNED",
      actualReturnDate: input.actualReturnDate,
      returnCondition: input.returnCondition,
      damageCharges: input.damageCharges,
      otherPenalty: input.otherPenalty,
      depositReturned,
      finalRefundAmount: depositReturned,
      returnNotes: input.returnNotes,
    });
    await jewelleryItemService.update(rental.jewelleryItemId, { status: "AVAILABLE" });
    return updated;
  },
};
