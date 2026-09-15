import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Ban, ReceiptText } from "lucide-react";
import { Header } from "@/layouts/Header";
import { PageContainer } from "@/components/PageContainer";
import { DataTable } from "@/components/DataTable";
import type { DataTableColumn } from "@/components/DataTable";
import { Badge, statusBadgeTone } from "@/components/Badge";
import { Select } from "@/components/Form";
import { Button } from "@/components/Button";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { billingService } from "@/services/billingService";
import { useAuth } from "@/auth/AuthContext";
import { hasPermission } from "@/auth/permissions";
import { useToast } from "@/components/Toast";
import { resolveDateRange, isWithinRange } from "@/utils/dateRange";
import { formatCurrency } from "@/utils/currency";
import { format } from "date-fns";
import type { Bill, DateRangePreset } from "@/types";

export function BillHistoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [bills, setBills] = useState<Bill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [preset, setPreset] = useState<DateRangePreset>("THIS_MONTH");
  const [voidTarget, setVoidTarget] = useState<Bill | null>(null);

  const canVoid = hasPermission(user?.role, "billing.void");

  const load = () => {
    setIsLoading(true);
    billingService.getAll().then((all) => {
      setBills(all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setIsLoading(false);
    });
  };

  useEffect(load, []);

  const filtered = useMemo(() => {
    const range = resolveDateRange(preset);
    const q = query.trim().toLowerCase();
    return bills.filter((b) => {
      const inRange = preset === "CUSTOM" ? true : isWithinRange(b.date, range);
      const matchesQuery =
        !q ||
        b.invoiceNumber.toLowerCase().includes(q) ||
        b.customerName.toLowerCase().includes(q) ||
        b.customerPhone.includes(q);
      return inRange && matchesQuery;
    });
  }, [bills, preset, query]);

  const handleVoid = async () => {
    if (!voidTarget) return;
    await billingService.void(voidTarget.id);
    showToast(`Invoice ${voidTarget.invoiceNumber} has been voided.`);
    setVoidTarget(null);
    load();
  };

  const columns: DataTableColumn<Bill>[] = [
    { key: "invoiceNumber", header: "Invoice #", render: (b) => <span className="font-semibold text-ink-950">{b.invoiceNumber}</span> },
    { key: "date", header: "Date", render: (b) => format(new Date(b.date), "d MMM yyyy, h:mm a") },
    { key: "customer", header: "Customer", render: (b) => (
      <div>
        <p className="font-medium text-ink-950">{b.customerName}</p>
        <p className="text-xs text-ink-600">{b.customerPhone}</p>
      </div>
    ) },
    { key: "services", header: "Services", render: (b) => (
      <span className="text-xs text-ink-600">{b.items.map((i) => i.name).join(", ")}</span>
    ) },
    { key: "employee", header: "Employee", render: (b) => (
      <span className="text-xs text-ink-600">
        {[...new Set(b.items.map((i) => i.employeeName).filter(Boolean))].join(", ") || "—"}
      </span>
    ) },
    { key: "subtotal", header: "Subtotal", align: "right", render: (b) => formatCurrency(b.subtotal) },
    { key: "gst", header: "GST", align: "right", render: (b) => formatCurrency(b.totalGstAmount) },
    { key: "total", header: "Total", align: "right", render: (b) => <span className="font-semibold">{formatCurrency(b.grandTotal)}</span> },
    { key: "method", header: "Method", render: (b) => b.paymentMethod },
    { key: "status", header: "Status", render: (b) => (
      <div className="flex flex-col gap-1 items-start">
        <Badge tone={statusBadgeTone(b.paymentStatus)}>{b.paymentStatus}</Badge>
        {b.status === "VOID" && <Badge tone="danger">VOID</Badge>}
      </div>
    ) },
    ...(canVoid
      ? [
          {
            key: "actions",
            header: "",
            align: "right" as const,
            render: (b: Bill) =>
              b.status === "COMPLETED" && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setVoidTarget(b);
                  }}
                  className="text-xs text-wine-600 hover:underline flex items-center gap-1 ml-auto"
                >
                  <Ban size={13} /> Void
                </button>
              ),
          },
        ]
      : []),
  ];

  return (
    <>
      <Header title="Bill History" subtitle="Search and review every invoice generated at the salon." />
      <PageContainer>
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="flex items-center gap-2 bg-white rounded-xl border border-cream-300 px-3.5 py-2.5 flex-1">
            <Search size={16} className="text-ink-600" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by invoice number, customer name or phone…"
              className="flex-1 outline-none text-sm bg-transparent"
            />
          </div>
          <Select value={preset} onChange={(e) => setPreset(e.target.value as DateRangePreset)} className="sm:w-52">
            <option value="TODAY">Today</option>
            <option value="THIS_WEEK">This Week</option>
            <option value="THIS_MONTH">This Month</option>
            <option value="THIS_YEAR">This Year</option>
            <option value="CUSTOM">All Time</option>
          </Select>
          <Button variant="gold" icon={<ReceiptText size={16} />} onClick={() => navigate("/billing/new")}>
            New Bill
          </Button>
        </div>

        <DataTable
          columns={columns}
          data={filtered}
          rowKey={(b) => b.id}
          isLoading={isLoading}
          emptyMessage="No invoices found for this filter."
          onRowClick={(b) => navigate(`/billing/history/${b.id}`)}
        />
      </PageContainer>

      <ConfirmationDialog
        isOpen={!!voidTarget}
        title="Void this invoice?"
        message={`Invoice ${voidTarget?.invoiceNumber} will be marked as void and excluded from revenue reports. This cannot be undone.`}
        confirmLabel="Void Invoice"
        variant="danger"
        onConfirm={handleVoid}
        onCancel={() => setVoidTarget(null)}
      />
    </>
  );
}
