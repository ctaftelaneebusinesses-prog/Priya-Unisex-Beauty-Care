import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { FormField, Input } from "@/components/Form";
import { inventoryService } from "@/services/inventoryService";
import { useToast } from "@/components/Toast";
import type { InventoryProduct } from "@/types";

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  product?: InventoryProduct | null;
}

export function ProductFormModal({ isOpen, onClose, onSaved, product }: ProductFormModalProps) {
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [supplier, setSupplier] = useState("");
  const [quantity, setQuantity] = useState(0);
  const [unit, setUnit] = useState("pcs");
  const [purchasePrice, setPurchasePrice] = useState(0);
  const [minStockLevel, setMinStockLevel] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setName(product?.name ?? "");
    setCategory(product?.category ?? "");
    setBrand(product?.brand ?? "");
    setSupplier(product?.supplier ?? "");
    setQuantity(product?.quantity ?? 0);
    setUnit(product?.unit ?? "pcs");
    setPurchasePrice(product?.purchasePrice ?? 0);
    setMinStockLevel(product?.minStockLevel ?? 5);
  }, [isOpen, product]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !category.trim()) return;
    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        category: category.trim(),
        brand: brand.trim() || undefined,
        supplier: supplier.trim() || undefined,
        quantity,
        unit: unit.trim() || "pcs",
        purchasePrice,
        minStockLevel,
        status: product?.status ?? ("Active" as const),
      };
      if (product) {
        await inventoryService.update(product.id, payload);
        showToast(`"${name}" updated.`);
      } else {
        await inventoryService.create(payload);
        showToast(`"${name}" added to inventory.`);
      }
      onSaved();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={product ? "Edit Product" : "Add Product"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>{product ? "Save Changes" : "Add Product"}</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <FormField label="Product Name" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Hair Color" autoFocus />
          </FormField>
        </div>
        <FormField label="Category" required>
          <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Hair Care" />
        </FormField>
        <FormField label="Brand" hint="Optional">
          <Input value={brand} onChange={(e) => setBrand(e.target.value)} />
        </FormField>
        <FormField label="Supplier" hint="Optional">
          <Input value={supplier} onChange={(e) => setSupplier(e.target.value)} />
        </FormField>
        <FormField label="Unit" required hint="e.g. pcs, ml, ltr, box">
          <Input value={unit} onChange={(e) => setUnit(e.target.value)} />
        </FormField>
        <FormField label={product ? "Current Stock (read-only)" : "Opening Stock"} required>
          <Input type="number" min={0} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} disabled={!!product} />
        </FormField>
        <FormField label="Minimum Stock Level" required>
          <Input type="number" min={0} value={minStockLevel} onChange={(e) => setMinStockLevel(Number(e.target.value))} />
        </FormField>
        <FormField label="Purchase Price (₹)" required>
          <Input type="number" min={0} value={purchasePrice} onChange={(e) => setPurchasePrice(Number(e.target.value))} />
        </FormField>
      </form>
    </Modal>
  );
}
