import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ReceiptText } from "lucide-react";
import { Header } from "@/layouts/Header";
import { PageContainer } from "@/components/PageContainer";
import { DataTable } from "@/components/DataTable";
import type { DataTableColumn } from "@/components/DataTable";
import { Badge, statusBadgeTone } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Select } from "@/components/Form";
import { AppointmentFormModal } from "@/features/appointments/AppointmentFormModal";
import { appointmentService } from "@/services/appointmentService";
import { customerService } from "@/services/customerService";
import { serviceService } from "@/services/serviceService";
import { employeeService } from "@/services/employeeService";
import { useToast } from "@/components/Toast";
import { format } from "date-fns";
import type { Appointment, AppointmentStatus, Customer, Employee, SalonService } from "@/types";

interface AppointmentRow extends Appointment {
  customerName: string;
  serviceName: string;
  employeeName: string;
}

const STATUS_OPTIONS: AppointmentStatus[] = ["Pending", "Confirmed", "Completed", "Cancelled", "No Show"];

export function AppointmentsPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<SalonService[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const load = () => {
    setIsLoading(true);
    Promise.all([
      appointmentService.getAll(),
      customerService.getAll(),
      serviceService.getAll(),
      employeeService.getAll(),
    ]).then(([a, c, s, e]) => {
      setAppointments(a.sort((x, y) => `${y.date}${y.time}`.localeCompare(`${x.date}${x.time}`)));
      setCustomers(c);
      setServices(s.filter((svc) => svc.status === "Active"));
      setEmployees(e);
      setIsLoading(false);
    });
  };

  useEffect(load, []);

  const rows: AppointmentRow[] = useMemo(() => {
    return appointments.map((a) => ({
      ...a,
      customerName: customers.find((c) => c.id === a.customerId)?.name ?? "Unknown",
      serviceName: services.find((s) => s.id === a.serviceId)?.name ?? "Unknown",
      employeeName: employees.find((e) => e.id === a.employeeId)?.name ?? "Unassigned",
    }));
  }, [appointments, customers, services, employees]);

  const handleStatusChange = async (appointment: Appointment, status: AppointmentStatus) => {
    await appointmentService.setStatus(appointment.id, status);
    showToast(`Appointment marked ${status.toLowerCase()}.`);
    load();
  };

  const columns: DataTableColumn<AppointmentRow>[] = [
    { key: "customer", header: "Customer", render: (a) => <span className="font-medium text-ink-950">{a.customerName}</span> },
    { key: "service", header: "Service", render: (a) => a.serviceName },
    { key: "employee", header: "Employee", render: (a) => a.employeeName },
    { key: "date", header: "Date & Time", render: (a) => `${format(new Date(a.date), "d MMM yyyy")}, ${a.time}` },
    { key: "duration", header: "Duration", render: (a) => `${a.durationMinutes}m` },
    {
      key: "status",
      header: "Status",
      render: (a) =>
        a.billId ? (
          <Badge tone={statusBadgeTone(a.status)}>{a.status}</Badge>
        ) : (
          <Select
            value={a.status}
            onChange={(e) => handleStatusChange(a, e.target.value as AppointmentStatus)}
            className="!py-1 !text-xs !w-32"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
        ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (a) =>
        !a.billId && (a.status === "Confirmed" || a.status === "Pending") ? (
          <Button size="sm" variant="secondary" icon={<ReceiptText size={13} />} onClick={() => navigate(`/billing/new?appointmentId=${a.id}`)}>
            Create Bill
          </Button>
        ) : a.billId ? (
          <span className="text-xs text-sage-600 font-medium">Billed</span>
        ) : null,
    },
  ];

  return (
    <>
      <Header title="Appointments" subtitle="Manually scheduled internal appointments — not a public booking site." />
      <PageContainer>
        <div className="flex justify-end mb-5">
          <Button variant="gold" icon={<Plus size={16} />} onClick={() => setIsFormOpen(true)}>
            New Appointment
          </Button>
        </div>

        <DataTable columns={columns} data={rows} rowKey={(a) => a.id} isLoading={isLoading} emptyMessage="No appointments scheduled yet." />
      </PageContainer>

      <AppointmentFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        services={services}
        employees={employees}
        onSaved={() => {
          setIsFormOpen(false);
          load();
        }}
      />
    </>
  );
}
