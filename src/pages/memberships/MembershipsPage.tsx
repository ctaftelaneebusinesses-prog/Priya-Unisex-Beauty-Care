import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, UserPlus, Sparkles } from "lucide-react";
import { Header } from "@/layouts/Header";
import { PageContainer } from "@/components/PageContainer";
import { DataTable } from "@/components/DataTable";
import type { DataTableColumn } from "@/components/DataTable";
import { Badge, statusBadgeTone } from "@/components/Badge";
import { Button } from "@/components/Button";
import { MembershipPlanFormModal } from "@/features/memberships/MembershipPlanFormModal";
import { AssignMembershipModal } from "@/features/memberships/AssignMembershipModal";
import { membershipService, membershipPlanService } from "@/services/membershipService";
import { customerService } from "@/services/customerService";
import { formatCurrency } from "@/utils/currency";
import { format } from "date-fns";
import type { Customer, CustomerMembership, MembershipPlan } from "@/types";

type Tab = "ALL" | "ACTIVE" | "EXPIRING_SOON" | "EXPIRED";

interface MembershipRow extends CustomerMembership {
  customerName: string;
  customerPhone: string;
  planName: string;
}

export function MembershipsPage() {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [memberships, setMemberships] = useState<CustomerMembership[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("ALL");
  const [isPlanFormOpen, setIsPlanFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null);
  const [isAssignOpen, setIsAssignOpen] = useState(false);

  const load = () => {
    setIsLoading(true);
    Promise.all([membershipPlanService.getAll(), membershipService.getAll(), customerService.getAll()]).then(
      ([p, m, c]) => {
        setPlans(p);
        setMemberships(m);
        setCustomers(c);
        setIsLoading(false);
      }
    );
  };

  useEffect(load, []);

  const rows: MembershipRow[] = useMemo(() => {
    return memberships.map((m) => {
      const customer = customers.find((c) => c.id === m.customerId);
      const plan = plans.find((p) => p.id === m.planId);
      return {
        ...m,
        customerName: customer?.name ?? "Unknown",
        customerPhone: customer?.phone ?? "",
        planName: plan?.name ?? "Unknown Plan",
      };
    });
  }, [memberships, customers, plans]);

  const filteredRows = useMemo(() => (tab === "ALL" ? rows : rows.filter((r) => r.status === tab)), [rows, tab]);

  const counts = {
    ALL: rows.length,
    ACTIVE: rows.filter((r) => r.status === "ACTIVE").length,
    EXPIRING_SOON: rows.filter((r) => r.status === "EXPIRING_SOON").length,
    EXPIRED: rows.filter((r) => r.status === "EXPIRED").length,
  };

  const columns: DataTableColumn<MembershipRow>[] = [
    { key: "id", header: "Membership ID", render: (m) => <span className="font-semibold text-ink-950">{m.id}</span> },
    { key: "customer", header: "Customer", render: (m) => (
      <div>
        <p className="font-medium text-ink-950">{m.customerName}</p>
        <p className="text-xs text-ink-600">{m.customerPhone}</p>
      </div>
    ) },
    { key: "plan", header: "Plan", render: (m) => m.planName },
    { key: "purchase", header: "Purchase Date", render: (m) => format(new Date(m.purchaseDate), "d MMM yyyy") },
    { key: "start", header: "Start Date", render: (m) => format(new Date(m.startDate), "d MMM yyyy") },
    { key: "expiry", header: "Expiry Date", render: (m) => format(new Date(m.expiryDate), "d MMM yyyy") },
    { key: "amount", header: "Amount Paid", align: "right", render: (m) => formatCurrency(m.amountPaid) },
    { key: "status", header: "Status", render: (m) => <Badge tone={statusBadgeTone(m.status)}>{m.status.replace("_", " ")}</Badge> },
  ];

  return (
    <>
      <Header title="Memberships" subtitle="Manage membership plans and customer subscriptions." />
      <PageContainer>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg text-ink-950">Membership Plans</h3>
          <Button
            size="sm"
            variant="secondary"
            icon={<Plus size={14} />}
            onClick={() => {
              setEditingPlan(null);
              setIsPlanFormOpen(true);
            }}
          >
            New Plan
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
          {plans.map((plan) => (
            <div key={plan.id} className="bg-white rounded-2xl border border-cream-200 shadow-card p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-gold-50 text-gold-600 flex items-center justify-center">
                  <Sparkles size={18} />
                </div>
                <button
                  onClick={() => {
                    setEditingPlan(plan);
                    setIsPlanFormOpen(true);
                  }}
                  className="text-ink-600 hover:text-ink-950 p-1.5 rounded-lg hover:bg-cream-100"
                >
                  <Pencil size={14} />
                </button>
              </div>
              <div>
                <p className="font-display text-lg text-ink-950">{plan.name}</p>
                <p className="text-xs text-ink-600 mt-1">{plan.description}</p>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-cream-100">
                <p className="font-display text-xl text-ink-950">{formatCurrency(plan.price)}</p>
                <Badge tone="gold">
                  {plan.benefitType === "PERCENT_DISCOUNT" ? `${plan.benefitValue}% off` : `${formatCurrency(plan.benefitValue)} off`}
                </Badge>
              </div>
              <p className="text-xs text-ink-600">{plan.durationMonths} month validity</p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            {(["ALL", "ACTIVE", "EXPIRING_SOON", "EXPIRED"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  tab === t ? "bg-ink-950 text-white" : "bg-white border border-cream-300 text-ink-700 hover:bg-cream-100"
                }`}
              >
                {t.replace("_", " ")} ({counts[t]})
              </button>
            ))}
          </div>
          <Button variant="gold" icon={<UserPlus size={16} />} onClick={() => setIsAssignOpen(true)}>
            Assign Membership
          </Button>
        </div>

        <DataTable columns={columns} data={filteredRows} rowKey={(m) => m.id} isLoading={isLoading} emptyMessage="No memberships in this category." />
      </PageContainer>

      <MembershipPlanFormModal
        isOpen={isPlanFormOpen}
        onClose={() => setIsPlanFormOpen(false)}
        plan={editingPlan}
        onSaved={() => {
          setIsPlanFormOpen(false);
          load();
        }}
      />
      <AssignMembershipModal
        isOpen={isAssignOpen}
        onClose={() => setIsAssignOpen(false)}
        plans={plans.filter((p) => p.status === "Active")}
        onSaved={() => {
          setIsAssignOpen(false);
          load();
        }}
      />
    </>
  );
}
