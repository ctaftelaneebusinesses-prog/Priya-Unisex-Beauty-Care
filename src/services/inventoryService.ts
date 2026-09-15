import type { InventoryProduct, StockTransaction, StockTransactionType } from "@/types";
import { store } from "./storage";
import { generateId } from "@/utils/id";

const PRODUCTS_COLLECTION = "inventoryProducts";
const TRANSACTIONS_COLLECTION = "stockTransactions";

export const inventoryService = {
  getAll: () => store.getAll<InventoryProduct>(PRODUCTS_COLLECTION),
  getById: (id: string) => store.getById<InventoryProduct>(PRODUCTS_COLLECTION, id),

  async create(input: Omit<InventoryProduct, "id" | "createdAt">): Promise<InventoryProduct> {
    const product: InventoryProduct = { ...input, id: generateId(), createdAt: new Date().toISOString() };
    return store.create(PRODUCTS_COLLECTION, product);
  },

  update: (id: string, patch: Partial<InventoryProduct>) =>
    store.update<InventoryProduct>(PRODUCTS_COLLECTION, id, patch),

  setStatus: (id: string, status: InventoryProduct["status"]) =>
    store.update<InventoryProduct>(PRODUCTS_COLLECTION, id, { status }),

  remove: (id: string) => store.remove(PRODUCTS_COLLECTION, id),

  async getStockHistory(productId: string): Promise<StockTransaction[]> {
    const all = await store.getAll<StockTransaction>(TRANSACTIONS_COLLECTION);
    return all
      .filter((t) => t.productId === productId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  getAllStockHistory: () => store.getAll<StockTransaction>(TRANSACTIONS_COLLECTION),

  /**
   * Applies a stock movement and keeps the product's `quantity` in sync with
   * the transaction log — the log is always the source of truth for "how did
   * we get to this number", the product row is just the current snapshot.
   */
  async applyStockMovement(
    productId: string,
    type: StockTransactionType,
    quantity: number,
    reason: string | undefined,
    performedByUserId: string,
    performedByName: string
  ): Promise<InventoryProduct> {
    const product = await inventoryService.getById(productId);
    if (!product) throw new Error("Product not found");

    const quantityChange = type === "REMOVE" ? -Math.abs(quantity) : type === "ADD" ? Math.abs(quantity) : quantity;
    const quantityAfter = Math.max(0, product.quantity + quantityChange);

    const updated = await store.update<InventoryProduct>(PRODUCTS_COLLECTION, productId, { quantity: quantityAfter });

    const transaction: StockTransaction = {
      id: generateId(),
      productId,
      productName: product.name,
      type,
      quantityChange,
      quantityAfter,
      reason,
      date: new Date().toISOString(),
      performedByUserId,
      performedByName,
    };
    await store.create(TRANSACTIONS_COLLECTION, transaction);

    return updated;
  },
};

export function isLowStock(product: InventoryProduct): boolean {
  return product.quantity <= product.minStockLevel;
}
