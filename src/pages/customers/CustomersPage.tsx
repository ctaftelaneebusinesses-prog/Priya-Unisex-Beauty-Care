import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, UserPlus, Phone, Mail } from "lucide-react";
import { Header } from "@/layouts/Header";
import { PageContainer } from "@/components/PageContainer";
import { DataTable } from "@/components/DataTable";
import type { DataTableColumn } from "@/components/DataTable";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { CustomerFormModal } from "@/features/customers/CustomerFormModal";
import { customerService } from "@/services/customerService";
import { billingService } from "@/services/billingService";
import { membershipService } from "@/services/membershipService";
import { formatCurrency } from "@/utils/currency";
import type { Bill, Customer, CustomerMembership } from "@/types";

interface CustomerRow extends Customer {
  totalVisits: number;
  totalSpent: number;
  hasActiveMembership: boolean;
  lastVisit?: string;
}

export function CustomersPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [memberships, setMemberships] = useState<CustomerMembership[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);

  const load = () => {
    setIsLoading(true);
    Promise.all([customerService.getAll(), billingService.getAll(), membershipService.getAll()]).then(
      ([c, b, m]) => {
        setCustomers(c);
        setBills(b);
        setMemberships(m);
        setIsLoading(false);
      }
    );
  };

  useEffect(load, []);

  const rows: CustomerRow[] = useMemo(() => {
    return customers.map((customer) => {
      const customerBills = bills.filter((b) => b.customerId === customer.id && b.status === "COMPLETED");
      const lastVisit = customerBills.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]?.date;
      const hasActiveMembership = memberships.some(
        (m) => m.customerId === customer.id && (m.status === "ACTIVE" || m.status === "EXPIRING_SOON")
      );
      return {
        ...customer,
        totalVisits: customerBills.length,
        totalSpent: customerBills.reduce((s, b) => s + b.grandTotal, 0),
        hasActiveMembership,
        lastVisit,
      };
    });
  }, [customers, bills, memberships]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(q) || r.phone.includes(q));
  }, [rows, query]);

  const columns: DataTableColumn<CustomerRow>[] = [
    {
      key: "name",
      header: "Customer",
      render: (c) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-ink-950 text-gold-300 flex items-center justify-center font-semibold text-sm shrink-0">
            {c.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-ink-950">{c.name}</p>
            {c.hasActiveMembership && <Badge tone="gold">Member</Badge>}
          </div>
        </div>
      ),
    },
    { key: "phone", header: "Phone", render: (c) => <span className="flex items-center gap-1.5"><Phone size={12} />{c.phone}</span> },
    { key: "email", header: "Email", render: (c) => c.email ? <span className="flex items-center gap-1.5 text-ink-600"><Mail size={12} />{c.email}</span> : "—" },
    { key: "visits", header: "Total Visits", align: "center", render: (c) => c.totalVisits },
    { key: "spent", header: "Total Spent", align: "right", render: (c) => formatCurrency(c.totalSpent) },
    { key: "lastVisit", header: "Last Visit", render: (c) => (c.lastVisit ? new Date(c.lastVisit).toLocaleDateString("en-IN") : "—") },
  ];

  return (
    <>
      <Header title="Customers" subtitle="Every customer who has visited Priya UNISEX Beauty Care." />
      <PageContainer>
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="flex items-center gap-2 bg-white rounded-xl border border-cream-300 px-3.5 py-2.5 flex-1">
            <Search size={16} className="text-ink-600" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or phone number…"
              className="flex-1 outline-none text-sm bg-transparent"
            />
          </div>
          <Button variant="gold" icon={<UserPlus size={16} />} onClick={() => setIsAddOpen(true)}>
            Add Customer
          </Button>
        </div>

        <DataTable
          columns={columns}
          data={filtered}
          rowKey={(c) => c.id}
          isLoading={isLoading}
          emptyMessage="No customers found."
          onRowClick={(c) => navigate(`/customers/${c.id}`)}
        />
      </PageContainer>

      <CustomerFormModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSaved={() => {
          setIsAddOpen(false);
          load();
        }}
      />
    </>
  );
}
