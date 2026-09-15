import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, PackagePlus, AlertTriangle, Boxes } from "lucide-react";
import { Header } from "@/layouts/Header";
import { PageContainer } from "@/components/PageContainer";
import { DataTable } from "@/components/DataTable";
import type { DataTableColumn } from "@/components/DataTable";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Select } from "@/components/Form";
import { DashboardCard } from "@/components/DashboardCard";
import { ProductFormModal } from "@/features/inventory/ProductFormModal";
import { StockMovementModal } from "@/features/inventory/StockMovementModal";
import { inventoryService, isLowStock } from "@/services/inventoryService";
import { formatCurrency } from "@/utils/currency";
import { format } from "date-fns";
import type { InventoryProduct, StockTransaction, StockTransactionType } from "@/types";

type Tab = "PRODUCTS" | "LOW_STOCK" | "MOVEMENT";

export function InventoryPage() {
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [movements, setMovements] = useState<StockTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("PRODUCTS");
  const [movementTypeFilter, setMovementTypeFilter] = useState<StockTransactionType | "ALL">("ALL");

  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<InventoryProduct | null>(null);
  const [stockModalProduct, setStockModalProduct] = useState<InventoryProduct | null>(null);

  const load = () => {
    setIsLoading(true);
    Promise.all([inventoryService.getAll(), inventoryService.getAllStockHistory()]).then(([p, m]) => {
      setProducts(p);
      setMovements(m.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setIsLoading(false);
    });
  };

  useEffect(load, []);

  const lowStockProducts = useMemo(() => products.filter(isLowStock), [products]);
  const totalStockValue = useMemo(
    () => products.reduce((s, p) => s + p.quantity * p.purchasePrice, 0),
    [products]
  );
  const filteredMovements = useMemo(
    () => (movementTypeFilter === "ALL" ? movements : movements.filter((m) => m.type === movementTypeFilter)),
    [movements, movementTypeFilter]
  );

  const productColumns: DataTableColumn<InventoryProduct>[] = [
    {
      key: "name",
      header: "Product",
      render: (p) => (
        <div>
          <p className="font-medium text-ink-950">{p.name}</p>
          <p className="text-xs text-ink-600">{p.category}{p.brand ? ` · ${p.brand}` : ""}</p>
        </div>
      ),
    },
    { key: "supplier", header: "Supplier", render: (p) => p.supplier ?? "—" },
    {
      key: "stock",
      header: "Current Stock",
      align: "center",
      render: (p) => (
        <div className="flex flex-col items-center gap-1">
          <span className="font-semibold">{p.quantity} {p.unit}</span>
          {isLowStock(p) && <Badge tone="danger"><AlertTriangle size={11} /> LOW STOCK</Badge>}
        </div>
      ),
    },
    { key: "min", header: "Min. Level", align: "center", render: (p) => `${p.minStockLevel} ${p.unit}` },
    { key: "price", header: "Purchase Price", align: "right", render: (p) => formatCurrency(p.purchasePrice) },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (p) => (
        <div className="flex items-center justify-end gap-1">
          <Button size="sm" variant="secondary" icon={<PackagePlus size={13} />} onClick={() => setStockModalProduct(p)}>
            Update Stock
          </Button>
          <button
            onClick={() => {
              setEditingProduct(p);
              setIsProductFormOpen(true);
            }}
            className="text-ink-600 hover:text-ink-950 p-1.5 rounded-lg hover:bg-cream-100"
          >
            <Pencil size={14} />
          </button>
        </div>
      ),
    },
  ];

  const movementColumns: DataTableColumn<StockTransaction>[] = [
    { key: "date", header: "Date", render: (m) => format(new Date(m.date), "d MMM yyyy, h:mm a") },
    { key: "product", header: "Product", render: (m) => <span className="font-medium text-ink-950">{m.productName}</span> },
    { key: "type", header: "Type", render: (m) => <Badge tone={m.type === "ADD" ? "success" : m.type === "REMOVE" ? "danger" : "neutral"}>{m.type}</Badge> },
    { key: "change", header: "Change", align: "right", render: (m) => (m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange) },
    { key: "after", header: "Stock After", align: "right", render: (m) => m.quantityAfter },
    { key: "reason", header: "Reason", render: (m) => <span className="text-xs text-ink-600">{m.reason ?? "—"}</span> },
    { key: "by", header: "By", render: (m) => m.performedByName },
  ];

  return (
    <>
      <Header title="Inventory" subtitle="Track salon product stock — simple and practical, not a warehouse system." />
      <PageContainer>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-5">
          <DashboardCard label="Products Tracked" value={String(products.length)} icon={<Boxes size={18} />} accent="ink" />
          <DashboardCard label="Low Stock Items" value={String(lowStockProducts.length)} icon={<AlertTriangle size={18} />} accent="wine" />
          <DashboardCard label="Stock Value" value={formatCurrency(totalStockValue)} icon={<Boxes size={18} />} accent="gold" />
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            <TabButton label="Products" active={tab === "PRODUCTS"} onClick={() => setTab("PRODUCTS")} />
            <TabButton label={`Low Stock (${lowStockProducts.length})`} active={tab === "LOW_STOCK"} onClick={() => setTab("LOW_STOCK")} />
            <TabButton label="Stock Movement" active={tab === "MOVEMENT"} onClick={() => setTab("MOVEMENT")} />
          </div>
          {tab === "MOVEMENT" ? (
            <Select value={movementTypeFilter} onChange={(e) => setMovementTypeFilter(e.target.value as StockTransactionType | "ALL")} className="w-56">
              <option value="ALL">All Movements</option>
              <option value="ADD">Purchase History (Added)</option>
              <option value="REMOVE">Stock Removed</option>
              <option value="ADJUST">Adjustments</option>
            </Select>
          ) : (
            <Button
              variant="gold"
              icon={<Plus size={16} />}
              onClick={() => {
                setEditingProduct(null);
                setIsProductFormOpen(true);
              }}
            >
              Add Product
            </Button>
          )}
        </div>

        {tab === "PRODUCTS" && (
          <DataTable columns={productColumns} data={products} rowKey={(p) => p.id} isLoading={isLoading} emptyMessage="No products in inventory yet." />
        )}
        {tab === "LOW_STOCK" && (
          <DataTable columns={productColumns} data={lowStockProducts} rowKey={(p) => p.id} isLoading={isLoading} emptyMessage="No products are low on stock." />
        )}
        {tab === "MOVEMENT" && (
          <DataTable columns={movementColumns} data={filteredMovements} rowKey={(m) => m.id} isLoading={isLoading} emptyMessage="No stock movements recorded yet." />
        )}
      </PageContainer>

      <ProductFormModal
        isOpen={isProductFormOpen}
        onClose={() => setIsProductFormOpen(false)}
        product={editingProduct}
        onSaved={() => {
          setIsProductFormOpen(false);
          load();
        }}
      />
      <StockMovementModal
        isOpen={!!stockModalProduct}
        onClose={() => setStockModalProduct(null)}
        product={stockModalProduct}
        onSaved={() => {
          setStockModalProduct(null);
          load();
        }}
      />
    </>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
        active ? "bg-ink-950 text-white" : "bg-white border border-cream-300 text-ink-700 hover:bg-cream-100"
      }`}
    >
      {label}
    </button>
  );
}
