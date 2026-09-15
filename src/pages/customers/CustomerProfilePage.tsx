import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Phone, Mail, MapPin, Calendar, Sparkles, ReceiptText, Wallet, Plus } from "lucide-react";
import { Header } from "@/layouts/Header";
import { PageContainer } from "@/components/PageContainer";
import { DataTable } from "@/components/DataTable";
import type { DataTableColumn } from "@/components/DataTable";
import { Badge, statusBadgeTone } from "@/components/Badge";
import { Button } from "@/components/Button";
import { TopUpWalletModal } from "@/features/memberships/TopUpWalletModal";
import { customerService } from "@/services/customerService";
import { billingService } from "@/services/billingService";
import { membershipService, membershipPlanService } from "@/services/membershipService";
import { formatCurrency } from "@/utils/currency";
import { format } from "date-fns";
import type { Bill, Customer, CustomerMembership, MembershipPlan, WalletTransaction } from "@/types";

export function CustomerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [memberships, setMemberships] = useState<CustomerMembership[]>([]);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);

  const load = () => {
    if (!id) return;
    Promise.all([
      customerService.getById(id),
      billingService.getAll(),
      membershipService.getForCustomer(id),
      membershipPlanService.getAll(),
    ]).then(([c, allBills, m, p]) => {
      setCustomer(c ?? null);
      setBills(allBills.filter((b) => b.customerId === id));
      setMemberships(m);
      setPlans(p);
      setIsLoading(false);
    });
  };

  useEffect(load, [id]);

  const completedBills = useMemo(() => bills.filter((b) => b.status === "COMPLETED"), [bills]);
  const totalSpent = completedBills.reduce((s, b) => s + b.grandTotal, 0);
  const lastVisit = completedBills.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]?.date;
  const activeMembership = memberships.find(
    (m) => (m.status === "ACTIVE" || m.status === "EXPIRING_SOON") && plans.find((p) => p.id === m.planId)?.type === "DISCOUNT"
  );
  const activePlan = activeMembership ? plans.find((p) => p.id === activeMembership.planId) : undefined;
  const walletMembership = memberships.find((m) => plans.find((p) => p.id === m.planId)?.type === "WALLET");
  const walletPlan = walletMembership ? plans.find((p) => p.id === walletMembership.planId) : undefined;

  useEffect(() => {
    if (!walletMembership) return;
    membershipService.getWalletTransactions(walletMembership.id).then(setWalletTransactions);
  }, [walletMembership]);

  const columns: DataTableColumn<Bill>[] = [
    { key: "invoice", header: "Invoice #", render: (b) => <span className="font-semibold text-ink-950">{b.invoiceNumber}</span> },
    { key: "date", header: "Date", render: (b) => format(new Date(b.date), "d MMM yyyy") },
    { key: "services", header: "Services", render: (b) => <span className="text-xs text-ink-600">{b.items.map((i) => i.name).join(", ")}</span> },
    { key: "employee", header: "Employee", render: (b) => [...new Set(b.items.map((i) => i.employeeName).filter(Boolean))].join(", ") || "—" },
    { key: "amount", header: "Amount", align: "right", render: (b) => <span className="font-semibold">{formatCurrency(b.grandTotal)}</span> },
    { key: "status", header: "Status", render: (b) => <Badge tone={statusBadgeTone(b.paymentStatus)}>{b.paymentStatus}</Badge> },
  ];

  if (isLoading || !customer) {
    return (
      <>
        <Header title="Customer Profile" />
        <PageContainer>
          <p className="text-sm text-ink-600">Loading…</p>
        </PageContainer>
      </>
    );
  }

  return (
    <>
      <Header title={customer.name} subtitle={customer.phone} />
      <PageContainer>
        <button
          onClick={() => navigate("/customers")}
          className="flex items-center gap-1.5 text-sm text-ink-600 hover:text-ink-950 transition-colors mb-5"
        >
          <ArrowLeft size={16} /> Back to Customers
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5">
          <div className="flex flex-col gap-5">
            <div className="bg-white rounded-2xl border border-cream-200 shadow-card p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-full bg-ink-950 text-gold-300 flex items-center justify-center font-display text-xl shrink-0">
                  {customer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-display text-lg text-ink-950">{customer.name}</p>
                  {activePlan && <Badge tone="gold"><Sparkles size={11} /> {activePlan.name}</Badge>}
                </div>
              </div>
              <div className="flex flex-col gap-2.5 text-sm text-ink-700">
                <p className="flex items-center gap-2"><Phone size={14} className="text-ink-600" /> {customer.phone}</p>
                {customer.email && <p className="flex items-center gap-2"><Mail size={14} className="text-ink-600" /> {customer.email}</p>}
                {customer.address && <p className="flex items-center gap-2"><MapPin size={14} className="text-ink-600" /> {customer.address}</p>}
                <p className="flex items-center gap-2">
                  <Calendar size={14} className="text-ink-600" /> Customer since {format(new Date(customer.createdAt), "MMM yyyy")}
                </p>
              </div>
              <Button
                variant="gold"
                fullWidth
                className="mt-5"
                icon={<ReceiptText size={16} />}
                onClick={() => navigate("/billing/new")}
              >
                New Bill for {customer.name.split(" ")[0]}
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <StatBlock label="Total Visits" value={String(completedBills.length)} />
              <StatBlock label="Total Spent" value={formatCurrency(totalSpent)} />
              <StatBlock label="Last Visit" value={lastVisit ? format(new Date(lastVisit), "d MMM yyyy") : "—"} />
              <StatBlock label="Membership" value={activePlan ? "Active" : "None"} />
            </div>

            {walletMembership && (
              <div className="bg-white rounded-2xl border border-cream-200 shadow-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-display text-lg text-ink-950 flex items-center gap-2">
                    <Wallet size={18} className="text-gold-500" /> Wallet
                  </h3>
                  <Badge tone={statusBadgeTone(walletMembership.status)}>{walletMembership.status.replace("_", " ")}</Badge>
                </div>
                <p className="font-display text-2xl text-ink-950 mb-1">{formatCurrency(walletMembership.walletBalance ?? 0)}</p>
                <p className="text-xs text-ink-600 mb-3">Remaining balance on {walletPlan?.name}</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-ink-600 mb-4">
                  <p>Wallet Purchased: <span className="font-semibold text-ink-950">{formatCurrency(walletMembership.amountPaid)}</span></p>
                  <p>Expiry: <span className="font-semibold text-ink-950">{format(new Date(walletMembership.expiryDate), "d MMM yyyy")}</span></p>
                </div>
                <Button size="sm" variant="secondary" fullWidth icon={<Plus size={14} />} onClick={() => setIsTopUpOpen(true)}>
                  Top Up Wallet
                </Button>

                {walletTransactions.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-cream-100 flex flex-col gap-2 max-h-48 overflow-y-auto">
                    {walletTransactions.map((t) => (
                      <div key={t.id} className="flex items-center justify-between text-xs">
                        <div>
                          <p className="text-ink-800 font-medium">{t.type}</p>
                          <p className="text-ink-600">{format(new Date(t.date), "d MMM yyyy")}</p>
                        </div>
                        <p className={t.amountUsed > 0 ? "text-wine-600 font-semibold" : "text-sage-600 font-semibold"}>
                          {t.amountUsed > 0 ? `- ${formatCurrency(t.amountUsed)}` : `+ ${formatCurrency(t.amountAdded)}`}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <h3 className="font-display text-lg text-ink-950 mb-3">Billing History</h3>
            <DataTable columns={columns} data={bills} rowKey={(b) => b.id} emptyMessage="No bills yet for this customer." onRowClick={(b) => navigate(`/billing/history/${b.id}`)} />
          </div>
        </div>
      </PageContainer>

      <TopUpWalletModal
        isOpen={isTopUpOpen}
        onClose={() => setIsTopUpOpen(false)}
        membership={walletMembership ?? null}
        onSaved={() => {
          setIsTopUpOpen(false);
          load();
        }}
      />
    </>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-cream-200 p-4">
      <p className="text-xs text-ink-600 mb-1">{label}</p>
      <p className="font-display text-lg text-ink-950 truncate">{value}</p>
    </div>
  );
}
