import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { FormField, Input, Select } from "@/components/Form";
import { inventoryService } from "@/services/inventoryService";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/auth/AuthContext";
import type { InventoryProduct, StockTransactionType } from "@/types";

interface StockMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  product: InventoryProduct | null;
}

export function StockMovementModal({ isOpen, onClose, onSaved, product }: StockMovementModalProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [type, setType] = useState<StockTransactionType>("ADD");
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setType("ADD");
    setQuantity(1);
    setReason("");
  }, [isOpen]);

  if (!product) return null;

  const projectedQuantity =
    type === "ADD" ? product.quantity + Math.abs(quantity) : type === "REMOVE" ? Math.max(0, product.quantity - Math.abs(quantity)) : quantity;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    try {
      await inventoryService.applyStockMovement(
        product.id,
        type,
        type === "ADJUST" ? quantity - product.quantity : quantity,
        reason.trim() || undefined,
        user.id,
        user.name
      );
      showToast(`Stock updated for ${product.name}.`);
      onSaved();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Update Stock — ${product.name}`}
      subtitle={`Current stock: ${product.quantity} ${product.unit}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>Save</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label="Action" required>
          <Select value={type} onChange={(e) => setType(e.target.value as StockTransactionType)}>
            <option value="ADD">Add Stock (new purchase received)</option>
            <option value="REMOVE">Remove Stock (used / damaged / expired)</option>
            <option value="ADJUST">Adjust Stock (set exact count)</option>
          </Select>
        </FormField>
        <FormField label={type === "ADJUST" ? "New Stock Count" : "Quantity"} required>
          <Input type="number" min={0} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
        </FormField>
        <FormField label="Reason / Note" hint="Optional">
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Restock from supplier, used in services" />
        </FormField>
        <p className="text-xs text-ink-600 bg-cream-100 rounded-lg px-3 py-2">
          Stock after this action: <span className="font-semibold text-ink-950">{projectedQuantity} {product.unit}</span>
        </p>
      </form>
    </Modal>
  );
}
