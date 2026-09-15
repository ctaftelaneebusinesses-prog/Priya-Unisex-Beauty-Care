import { useEffect, useMemo, useState } from "react";
import type { MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Pencil, Phone } from "lucide-react";
import { Header } from "@/layouts/Header";
import { PageContainer } from "@/components/PageContainer";
import { DataTable } from "@/components/DataTable";
import type { DataTableColumn } from "@/components/DataTable";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { EmployeeFormModal } from "@/features/employees/EmployeeFormModal";
import { employeeService } from "@/services/employeeService";
import { serviceService } from "@/services/serviceService";
import { useToast } from "@/components/Toast";
import type { Employee, SalonService } from "@/types";

export function EmployeesPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [services, setServices] = useState<SalonService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const load = () => {
    setIsLoading(true);
    Promise.all([employeeService.getAll(), serviceService.getAll()]).then(([e, s]) => {
      setEmployees(e);
      setServices(s);
      setIsLoading(false);
    });
  };

  useEffect(load, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) => e.name.toLowerCase().includes(q) || e.position.toLowerCase().includes(q));
  }, [employees, query]);

  const handleToggleStatus = async (employee: Employee, e: MouseEvent) => {
    e.stopPropagation();
    const nextStatus = employee.status === "Active" ? "Inactive" : "Active";
    await employeeService.setStatus(employee.id, nextStatus);
    showToast(`${employee.name} marked ${nextStatus.toLowerCase()}.`);
    load();
  };

  const columns: DataTableColumn<Employee>[] = [
    {
      key: "name",
      header: "Employee",
      render: (e) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-ink-950 text-gold-300 flex items-center justify-center font-semibold text-sm shrink-0">
            {e.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-ink-950">{e.name}</p>
            <p className="text-xs text-ink-600">{e.position}</p>
          </div>
        </div>
      ),
    },
    { key: "phone", header: "Phone", render: (e) => <span className="flex items-center gap-1.5"><Phone size={12} />{e.phone}</span> },
    { key: "specialization", header: "Specialization", render: (e) => <span className="text-xs text-ink-600">{e.specialization.join(", ")}</span> },
    { key: "services", header: "Services", align: "center", render: (e) => e.assignedServiceIds.length },
    { key: "hours", header: "Working Hours", render: (e) => <span className="text-xs text-ink-600">{e.workingHours}</span> },
    {
      key: "status",
      header: "Status",
      render: (e) => (
        <button onClick={(evt) => handleToggleStatus(e, evt)}>
          <Badge tone={e.status === "Active" ? "success" : "danger"}>{e.status}</Badge>
        </button>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (e) => (
        <button
          onClick={(evt) => {
            evt.stopPropagation();
            setEditingEmployee(e);
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
      <Header title="Employees" subtitle="Manage your salon team, roles and assigned services." />
      <PageContainer>
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="flex items-center gap-2 bg-white rounded-xl border border-cream-300 px-3.5 py-2.5 flex-1">
            <Search size={16} className="text-ink-600" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search employees…"
              className="flex-1 outline-none text-sm bg-transparent"
            />
          </div>
          <Button
            variant="gold"
            icon={<Plus size={16} />}
            onClick={() => {
              setEditingEmployee(null);
              setIsFormOpen(true);
            }}
          >
            Add Employee
          </Button>
        </div>

        <DataTable
          columns={columns}
          data={filtered}
          rowKey={(e) => e.id}
          isLoading={isLoading}
          emptyMessage="No employees found."
          onRowClick={(e) => navigate(`/employees/${e.id}`)}
        />
      </PageContainer>

      <EmployeeFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        employee={editingEmployee}
        services={services}
        onSaved={() => {
          setIsFormOpen(false);
          load();
        }}
      />
    </>
  );
}
