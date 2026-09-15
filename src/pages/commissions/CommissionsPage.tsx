import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, IndianRupee, CheckCircle2, Clock, Percent } from "lucide-react";
import { Header } from "@/layouts/Header";
import { PageContainer } from "@/components/PageContainer";
import { DataTable } from "@/components/DataTable";
import type { DataTableColumn } from "@/components/DataTable";
import { Badge, statusBadgeTone } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Select } from "@/components/Form";
import { DashboardCard } from "@/components/DashboardCard";
import { CommissionRuleFormModal } from "@/features/commissions/CommissionRuleFormModal";
import { commissionRuleService, commissionService, summarizeCommissionsByEmployee } from "@/services/commissionService";
import { employeeService } from "@/services/employeeService";
import { serviceService } from "@/services/serviceService";
import { useToast } from "@/components/Toast";
import { resolveDateRange, isWithinRange } from "@/utils/dateRange";
import { formatCurrency } from "@/utils/currency";
import { exportToCsv } from "@/utils/csvExport";
import { Download } from "lucide-react";
import { format } from "date-fns";
import type { CommissionRecord, CommissionRule, DateRangePreset, Employee, SalonService } from "@/types";

export function CommissionsPage() {
  const { showToast } = useToast();
  const [rules, setRules] = useState<CommissionRule[]>([]);
  const [records, setRecords] = useState<CommissionRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [services, setServices] = useState<SalonService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRuleFormOpen, setIsRuleFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<CommissionRule | null>(null);

  const [preset, setPreset] = useState<DateRangePreset>("THIS_MONTH");
  const [employeeFilter, setEmployeeFilter] = useState("ALL");
  const [serviceFilter, setServiceFilter] = useState("ALL");

  const load = () => {
    setIsLoading(true);
    Promise.all([
      commissionRuleService.getAll(),
      commissionService.getAll(),
      employeeService.getAll(),
      serviceService.getAll(),
    ]).then(([r, rec, e, s]) => {
      setRules(r);
      setRecords(rec);
      setEmployees(e);
      setServices(s);
      setIsLoading(false);
    });
  };

  useEffect(load, []);

  const range = useMemo(() => resolveDateRange(preset), [preset]);
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const inRange = preset === "CUSTOM" ? true : isWithinRange(r.date, range);
      const matchesEmployee = employeeFilter === "ALL" || r.employeeId === employeeFilter;
      const matchesService = serviceFilter === "ALL" || r.serviceId === serviceFilter;
      return inRange && matchesEmployee && matchesService;
    });
  }, [records, preset, range, employeeFilter, serviceFilter]);

  const summary = useMemo(() => {
    const totalSales = filteredRecords.reduce((s, r) => s + r.saleAmount, 0);
    const totalCommission = filteredRecords.reduce((s, r) => s + r.commissionAmount, 0);
    const paidCommission = filteredRecords.filter((r) => r.status === "Paid").reduce((s, r) => s + r.commissionAmount, 0);
    const pendingCommission = totalCommission - paidCommission;
    return { totalSales, totalCommission, paidCommission, pendingCommission };
  }, [filteredRecords]);

  const employeeSummary = useMemo(() => summarizeCommissionsByEmployee(filteredRecords), [filteredRecords]);

  const handleMarkPaid = async (record: CommissionRecord) => {
    await commissionService.markPaid([record.id]);
    showToast(`Commission for ${record.employeeName} marked as paid.`);
    load();
  };

  const handleMarkAllPending = async () => {
    const pendingIds = filteredRecords.filter((r) => r.status === "Pending").map((r) => r.id);
    if (pendingIds.length === 0) return;
    await commissionService.markPaid(pendingIds);
    showToast(`${pendingIds.length} commission record(s) marked as paid.`);
    load();
  };

  const recordColumns: DataTableColumn<CommissionRecord>[] = [
    { key: "date", header: "Date", render: (r) => format(new Date(r.date), "d MMM yyyy") },
    { key: "invoice", header: "Invoice #", render: (r) => r.invoiceNumber },
    { key: "employee", header: "Employee", render: (r) => <span className="font-medium text-ink-950">{r.employeeName}</span> },
    { key: "service", header: "Service", render: (r) => r.serviceName },
    { key: "sale", header: "Sale Amount", align: "right", render: (r) => formatCurrency(r.saleAmount) },
    { key: "rate", header: "Commission", align: "right", render: (r) => (r.commissionType === "PERCENTAGE" ? `${r.commissionValue}%` : formatCurrency(r.commissionValue)) },
    { key: "earned", header: "Commission Earned", align: "right", render: (r) => <span className="font-semibold">{formatCurrency(r.commissionAmount)}</span> },
    {
      key: "status",
      header: "Status",
      render: (r) =>
        r.status === "Pending" ? (
          <button onClick={() => handleMarkPaid(r)}>
            <Badge tone="warning">Pending — mark paid</Badge>
          </button>
        ) : (
          <Badge tone="success">Paid</Badge>
        ),
    },
  ];

  const ruleColumns: DataTableColumn<CommissionRule>[] = [
    {
      key: "scope",
      header: "Applies To",
      render: (r) => {
        const emp = employees.find((e) => e.id === r.employeeId)?.name;
        const svc = services.find((s) => s.id === r.serviceId)?.name;
        if (r.scope === "GLOBAL") return "All employees, all services";
        if (r.scope === "EMPLOYEE") return `Employee: ${emp}`;
        if (r.scope === "SERVICE") return `Service: ${svc}`;
        return `${emp} — ${svc}`;
      },
    },
    { key: "type", header: "Type", render: (r) => (r.type === "PERCENTAGE" ? "Percentage" : "Fixed Amount") },
    { key: "value", header: "Value", align: "right", render: (r) => (r.type === "PERCENTAGE" ? `${r.value}%` : formatCurrency(r.value)) },
    { key: "status", header: "Status", render: (r) => <Badge tone={statusBadgeTone(r.status)}>{r.status}</Badge> },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (r) => (
        <button
          onClick={() => {
            setEditingRule(r);
            setIsRuleFormOpen(true);
          }}
          className="text-ink-600 hover:text-ink-950 p-1.5 rounded-lg hover:bg-cream-100 ml-auto"
        >
          <Pencil size={14} />
        </button>
      ),
    },
  ];

  return (
    <>
      <Header title="Staff Commission" subtitle="Configure commission rules and track what's earned, paid and pending." />
      <PageContainer>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg text-ink-950">Commission Rules</h3>
          <Button
            size="sm"
            variant="secondary"
            icon={<Plus size={14} />}
            onClick={() => {
              setEditingRule(null);
              setIsRuleFormOpen(true);
            }}
          >
            New Rule
          </Button>
        </div>
        <DataTable columns={ruleColumns} data={rules} rowKey={(r) => r.id} isLoading={isLoading} emptyMessage="No commission rules configured yet." />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-8 mb-4">
          <h3 className="font-display text-lg text-ink-950">Commission Records</h3>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)} className="w-40">
              <option value="ALL">All Employees</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </Select>
            <Select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} className="w-40">
              <option value="ALL">All Services</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
            <Select value={preset} onChange={(e) => setPreset(e.target.value as DateRangePreset)} className="w-36">
              <option value="TODAY">Today</option>
              <option value="THIS_WEEK">This Week</option>
              <option value="THIS_MONTH">This Month</option>
              <option value="THIS_YEAR">This Year</option>
              <option value="CUSTOM">All Time</option>
            </Select>
            <Button variant="secondary" size="sm" icon={<Download size={13} />} onClick={() => exportToCsv("commission-report", filteredRecords)}>
              Export
            </Button>
            <Button size="sm" onClick={handleMarkAllPending}>
              Mark All Pending Paid
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
          <DashboardCard label="Total Sales" value={formatCurrency(summary.totalSales)} icon={<IndianRupee size={16} />} accent="ink" />
          <DashboardCard label="Total Commission" value={formatCurrency(summary.totalCommission)} icon={<Percent size={16} />} accent="gold" />
          <DashboardCard label="Paid Commission" value={formatCurrency(summary.paidCommission)} icon={<CheckCircle2 size={16} />} accent="sage" />
          <DashboardCard label="Pending Commission" value={formatCurrency(summary.pendingCommission)} icon={<Clock size={16} />} accent="wine" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5">
          <DataTable
            isLoading={isLoading}
            rowKey={(r) => r.employeeId}
            data={employeeSummary}
            columns={[
              { key: "name", header: "Employee", render: (r) => <span className="font-medium text-ink-950">{r.employeeName}</span> },
              { key: "services", header: "Services", align: "center", render: (r) => r.servicesCompleted },
              { key: "sales", header: "Sales", align: "right", render: (r) => formatCurrency(r.totalSales) },
              { key: "commission", header: "Commission", align: "right", render: (r) => <span className="font-semibold">{formatCurrency(r.totalCommission)}</span> },
            ]}
          />
        </div>

        <DataTable columns={recordColumns} data={filteredRecords} rowKey={(r) => r.id} isLoading={isLoading} emptyMessage="No commission records for this filter." />
      </PageContainer>

      <CommissionRuleFormModal
        isOpen={isRuleFormOpen}
        onClose={() => setIsRuleFormOpen(false)}
        rule={editingRule}
        employees={employees}
        services={services}
        onSaved={() => {
          setIsRuleFormOpen(false);
          load();
        }}
      />
    </>
  );
}
