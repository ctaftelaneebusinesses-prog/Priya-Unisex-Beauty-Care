import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Pencil, Clock, Package } from "lucide-react";
import { Header } from "@/layouts/Header";
import { PageContainer } from "@/components/PageContainer";
import { DataTable } from "@/components/DataTable";
import type { DataTableColumn } from "@/components/DataTable";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Select } from "@/components/Form";
import { ServiceFormModal } from "@/features/services/ServiceFormModal";
import { serviceService } from "@/services/serviceService";
import { employeeService } from "@/services/employeeService";
import { useToast } from "@/components/Toast";
import { formatCurrency } from "@/utils/currency";
import { SERVICE_CATEGORIES } from "@/types";
import type { Employee, SalonService } from "@/types";

export function ServicesPage() {
  const { showToast } = useToast();
  const [services, setServices] = useState<SalonService[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("ALL");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingService, setEditingService] = useState<SalonService | null>(null);

  const load = () => {
    setIsLoading(true);
    Promise.all([serviceService.getAll(), employeeService.getAll()]).then(([s, e]) => {
      setServices(s);
      setEmployees(e);
      setIsLoading(false);
    });
  };

  useEffect(load, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return services.filter((s) => {
      const matchesCategory = category === "ALL" || s.category === category;
      const matchesQuery = !q || s.name.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [services, category, query]);

  const handleToggleStatus = async (service: SalonService) => {
    const nextStatus = service.status === "Active" ? "Inactive" : "Active";
    await serviceService.setStatus(service.id, nextStatus);
    showToast(`"${service.name}" marked ${nextStatus.toLowerCase()}.`);
    load();
  };

  const columns: DataTableColumn<SalonService>[] = [
    {
      key: "name",
      header: "Service",
      render: (s) => (
        <div className="flex items-center gap-2">
          {s.isPackage && <Package size={14} className="text-gold-500 shrink-0" />}
          <div>
            <p className="font-medium text-ink-950">{s.name}</p>
            <p className="text-xs text-ink-600">{s.category}</p>
          </div>
        </div>
      ),
    },
    { key: "price", header: "Price", align: "right", render: (s) => <span className="font-semibold">{formatCurrency(s.price)}</span> },
    { key: "duration", header: "Duration", render: (s) => <span className="flex items-center gap-1 text-ink-600"><Clock size={12} />{s.durationMinutes}m</span> },
    { key: "gender", header: "Applicable", render: (s) => <Badge tone={s.gender === "Unisex" ? "neutral" : s.gender === "Female" ? "gold" : "info"}>{s.gender}</Badge> },
    { key: "gst", header: "GST", align: "center", render: (s) => `${s.gstRatePercent}%` },
    { key: "employees", header: "Employees", render: (s) => <span className="text-xs text-ink-600">{s.assignedEmployeeIds.length} assigned</span> },
    {
      key: "status",
      header: "Status",
      render: (s) => (
        <button onClick={() => handleToggleStatus(s)}>
          <Badge tone={s.status === "Active" ? "success" : "danger"}>{s.status}</Badge>
        </button>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (s) => (
        <button
          onClick={() => {
            setEditingService(s);
            setIsFormOpen(true);
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
      <Header title="Services" subtitle="Manage every service offered at Priya UNISEX Beauty Care." />
      <PageContainer>
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="flex items-center gap-2 bg-white rounded-xl border border-cream-300 px-3.5 py-2.5 flex-1">
            <Search size={16} className="text-ink-600" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search services…"
              className="flex-1 outline-none text-sm bg-transparent"
            />
          </div>
          <Select value={category} onChange={(e) => setCategory(e.target.value)} className="sm:w-64">
            <option value="ALL">All Categories</option>
            {SERVICE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
          <Button
            variant="gold"
            icon={<Plus size={16} />}
            onClick={() => {
              setEditingService(null);
              setIsFormOpen(true);
            }}
          >
            Add Service
          </Button>
        </div>

        <DataTable columns={columns} data={filtered} rowKey={(s) => s.id} isLoading={isLoading} emptyMessage="No services match your filters." />
      </PageContainer>

      <ServiceFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        service={editingService}
        employees={employees}
        onSaved={() => {
          setIsFormOpen(false);
          load();
        }}
      />
    </>
  );
}
