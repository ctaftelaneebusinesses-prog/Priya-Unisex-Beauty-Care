import type { BillLineItem } from "@/types";

export interface CartItem extends BillLineItem {
  availableEmployeeIds?: string[];
}
