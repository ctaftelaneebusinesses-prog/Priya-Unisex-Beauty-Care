import { useEffect, useMemo, useState } from "react";
import { Plus, Gem, AlertTriangle, IndianRupee, ShieldCheck, PackageCheck, CalendarClock } from "lucide-react";
import { Header } from "@/layouts/Header";
import { PageContainer } from "@/components/PageContainer";
import { DataTable } from "@/components/DataTable";
import type { DataTableColumn } from "@/components/DataTable";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { DashboardCard } from "@/components/DashboardCard";
import { JewelleryItemFormModal } from "@/features/jewellery/JewelleryItemFormModal";
import { StartRentalModal } from "@/features/jewellery/StartRentalModal";
import { ReturnRentalModal } from "@/features/jewellery/ReturnRentalModal";
import { jewelleryItemService, jewelleryRentalService } from "@/services/jewelleryService";
import { employeeService } from "@/services/employeeService";
import { useToast } from "@/components/Toast";
import { formatCurrency } from "@/utils/currency";
import { format, isPast } from "date-fns";
import type { Employee, JewelleryItem, JewelleryRental } from "@/types";

type Tab = "CATALOG" | "ACTIVE" | "RETURNED";

const ITEM_STATUS_TONE = { AVAILABLE: "success", RESERVED: "warning", RENTED: "info" } as const;

export function JewelleryPage() {
  const { showToast } = useToast();
  const [items, setItems] = useState<JewelleryItem[]>([]);
  const [rentals, setRentals] = useState<JewelleryRental[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("CATALOG");

  const [isItemFormOpen, setIsItemFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<JewelleryItem | null>(null);
  const [rentalTargetItem, setRentalTargetItem] = useState<JewelleryItem | null>(null);
  const [returnTargetRental, setReturnTargetRental] = useState<JewelleryRental | null>(null);

  const load = () => {
    setIsLoading(true);
    Promise.all([jewelleryItemService.getAll(), jewelleryRentalService.getAll(), employeeService.getAll()]).then(
      ([i, r, e]) => {
        setItems(i);
        setRentals(r.sort((a, b) => new Date(b.rentalDate).getTime() - new Date(a.rentalDate).getTime()));
        setEmployees(e);
        setIsLoading(false);
      }
    );
  };

  useEffect(load, []);

  const activeRentals = useMemo(() => rentals.filter((r) => r.status === "RESERVED" || r.status === "RENTED"), [rentals]);
  const returnedRentals = useMemo(() => rentals.filter((r) => r.status === "RETURNED"), [rentals]);
  const overdueRentals = useMemo(
    () => rentals.filter((r) => r.status === "RENTED" && isPast(new Date(r.expectedReturnDate))),
    [rentals]
  );
  const availableCount = items.filter((i) => i.status === "AVAILABLE").length;
  const reservedCount = items.filter((i) => i.status === "RESERVED").length;
  const rentedCount = items.filter((i) => i.status === "RENTED").length;
  const rentalRevenue = rentals.filter((r) => r.status === "RENTED" || r.status === "RETURNED").reduce((s, r) => s + r.rentalAmount, 0);
  const depositsHeld = activeRentals.reduce((s, r) => s + r.securityDeposit, 0);

  const handleConfirmPickup = async (rental: JewelleryRental) => {
    await jewelleryRentalService.confirmPickup(rental.id);
    showToast(`${rental.jewelleryItemName} handed over to ${rental.customerName}.`);
    load();
  };

  const handleCancel = async (rental: JewelleryRental) => {
    await jewelleryRentalService.cancel(rental.id);
    showToast(`Reservation for ${rental.jewelleryItemName} cancelled.`);
    load();
  };

  const itemColumns: DataTableColumn<JewelleryItem>[] = [
    { key: "name", header: "Item", render: (i) => <span className="font-medium text-ink-950 flex items-center gap-1.5"><Gem size={13} className="text-gold-500" />{i.name}</span> },
    { key: "category", header: "Category", render: (i) => i.category },
    { key: "price", header: "Rental Price", align: "right", render: (i) => formatCurrency(i.rentalPrice) },
    { key: "deposit", header: "Security Deposit", align: "right", render: (i) => formatCurrency(i.securityDeposit) },
    { key: "duration", header: "Duration", align: "center", render: (i) => `${i.rentalDurationDays} day(s)` },
    { key: "status", header: "Status", render: (i) => <Badge tone={ITEM_STATUS_TONE[i.status]}>{i.status}</Badge> },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (i) =>
        i.status === "AVAILABLE" ? (
          <Button size="sm" variant="secondary" onClick={() => setRentalTargetItem(i)}>Rent Out</Button>
        ) : (
          <button onClick={() => { setEditingItem(i); setIsItemFormOpen(true); }} className="text-xs text-ink-600 hover:text-ink-950">Edit</button>
        ),
    },
  ];

  const rentalColumns: DataTableColumn<JewelleryRental>[] = [
    { key: "item", header: "Item", render: (r) => <span className="font-medium text-ink-950">{r.jewelleryItemName}</span> },
    { key: "customer", header: "Customer", render: (r) => r.customerName },
    { key: "employee", header: "Handled By", render: (r) => r.employeeName ?? "—" },
    { key: "rentalDate", header: "Rental Date", render: (r) => format(new Date(r.rentalDate), "d MMM yyyy") },
    {
      key: "expectedReturn",
      header: "Expected Return",
      render: (r) => {
        const overdue = r.status === "RENTED" && isPast(new Date(r.expectedReturnDate));
        return (
          <span className={overdue ? "text-wine-600 font-semibold flex items-center gap-1" : ""}>
            {overdue && <AlertTriangle size={12} />} {format(new Date(r.expectedReturnDate), "d MMM yyyy")}
          </span>
        );
      },
    },
    { key: "amount", header: "Rental Amount", align: "right", render: (r) => formatCurrency(r.rentalAmount) },
    { key: "deposit", header: "Deposit", align: "right", render: (r) => formatCurrency(r.securityDeposit) },
    { key: "status", header: "Status", render: (r) => <Badge tone={r.status === "RESERVED" ? "warning" : "info"}>{r.status}</Badge> },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (r) => (
        <div className="flex items-center justify-end gap-2">
          {r.status === "RESERVED" && (
            <Button size="sm" variant="secondary" onClick={() => handleConfirmPickup(r)}>Confirm Pickup</Button>
          )}
          {r.status === "RENTED" && (
            <Button size="sm" variant="gold" onClick={() => setReturnTargetRental(r)}>Process Return</Button>
          )}
          <button onClick={() => handleCancel(r)} className="text-xs text-wine-600 hover:underline">Cancel</button>
        </div>
      ),
    },
  ];

  const returnedColumns: DataTableColumn<JewelleryRental>[] = [
    { key: "item", header: "Item", render: (r) => <span className="font-medium text-ink-950">{r.jewelleryItemName}</span> },
    { key: "customer", header: "Customer", render: (r) => r.customerName },
    { key: "returnDate", header: "Returned On", render: (r) => (r.actualReturnDate ? format(new Date(r.actualReturnDate), "d MMM yyyy") : "—") },
    { key: "condition", header: "Condition", render: (r) => <Badge tone={r.returnCondition === "GOOD" ? "success" : "danger"}>{r.returnCondition}</Badge> },
    { key: "damage", header: "Damage Charge", align: "right", render: (r) => formatCurrency(r.damageCharges ?? 0) },
    { key: "penalty", header: "Other Penalty", align: "right", render: (r) => formatCurrency(r.otherPenalty ?? 0) },
    { key: "refund", header: "Deposit Refunded", align: "right", render: (r) => <span className="font-semibold">{formatCurrency(r.finalRefundAmount ?? 0)}</span> },
  ];

  return (
    <>
      <Header title="Jewellery Rental" subtitle="Availability, reservation, rental and return — with deposits tracked separately from revenue." />
      <PageContainer>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
          <DashboardCard label="Available" value={String(availableCount)} icon={<PackageCheck size={16} />} accent="sage" />
          <DashboardCard label="Reserved" value={String(reservedCount)} icon={<CalendarClock size={16} />} accent="gold" />
          <DashboardCard label="Currently Rented" value={String(rentedCount)} icon={<Gem size={16} />} accent="ink" />
          <DashboardCard label="Overdue Returns" value={String(overdueRentals.length)} icon={<AlertTriangle size={16} />} accent="wine" />
          <DashboardCard label="Rental Revenue" value={formatCurrency(rentalRevenue)} icon={<IndianRupee size={16} />} accent="gold" />
          <DashboardCard label="Deposits Held" value={formatCurrency(depositsHeld)} icon={<ShieldCheck size={16} />} accent="ink" />
        </div>

        {overdueRentals.length > 0 && (
          <div className="flex items-center gap-2 bg-wine-50 text-wine-600 rounded-xl px-4 py-3 mb-5 text-sm font-medium">
            <AlertTriangle size={16} />
            {overdueRentals.length} jewellery item(s) are overdue for return.
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            <TabButton label="Catalog" active={tab === "CATALOG"} onClick={() => setTab("CATALOG")} />
            <TabButton label={`Active Rentals (${activeRentals.length})`} active={tab === "ACTIVE"} onClick={() => setTab("ACTIVE")} />
            <TabButton label="Returned History" active={tab === "RETURNED"} onClick={() => setTab("RETURNED")} />
          </div>
          {tab === "CATALOG" && (
            <Button variant="gold" icon={<Plus size={16} />} onClick={() => { setEditingItem(null); setIsItemFormOpen(true); }}>
              Add Jewellery Item
            </Button>
          )}
        </div>

        {tab === "CATALOG" && (
          <DataTable columns={itemColumns} data={items} rowKey={(i) => i.id} isLoading={isLoading} emptyMessage="No jewellery items yet." />
        )}
        {tab === "ACTIVE" && (
          <DataTable columns={rentalColumns} data={activeRentals} rowKey={(r) => r.id} isLoading={isLoading} emptyMessage="No active reservations or rentals." />
        )}
        {tab === "RETURNED" && (
          <DataTable columns={returnedColumns} data={returnedRentals} rowKey={(r) => r.id} isLoading={isLoading} emptyMessage="No returned rentals yet." />
        )}
      </PageContainer>

      <JewelleryItemFormModal
        isOpen={isItemFormOpen}
        onClose={() => setIsItemFormOpen(false)}
        item={editingItem}
        onSaved={() => { setIsItemFormOpen(false); load(); }}
      />
      <StartRentalModal
        isOpen={!!rentalTargetItem}
        onClose={() => setRentalTargetItem(null)}
        item={rentalTargetItem}
        employees={employees}
        onSaved={() => { setRentalTargetItem(null); load(); }}
      />
      <ReturnRentalModal
        isOpen={!!returnTargetRental}
        onClose={() => setReturnTargetRental(null)}
        rental={returnTargetRental}
        onSaved={() => { setReturnTargetRental(null); load(); }}
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
