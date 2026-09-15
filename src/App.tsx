import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/auth/AuthContext";
import { ToastProvider } from "@/components/Toast";
import { ProtectedRoute } from "@/auth/ProtectedRoute";
import { LoginPage } from "@/auth/LoginPage";
import { AppLayout } from "@/layouts/AppLayout";
import { DashboardRouter } from "@/pages/dashboard/DashboardRouter";
import { NewBillPage } from "@/pages/billing/NewBillPage";
import { BillHistoryPage } from "@/pages/billing/BillHistoryPage";
import { BillDetailPage } from "@/pages/billing/BillDetailPage";
import { CustomersPage } from "@/pages/customers/CustomersPage";
import { CustomerProfilePage } from "@/pages/customers/CustomerProfilePage";
import { AppointmentsPage } from "@/pages/appointments/AppointmentsPage";
import { ServicesPage } from "@/pages/services/ServicesPage";
import { EmployeesPage } from "@/pages/employees/EmployeesPage";
import { EmployeePerformancePage } from "@/pages/employees/EmployeePerformancePage";
import { MembershipsPage } from "@/pages/memberships/MembershipsPage";
import { ReportsPage } from "@/pages/reports/ReportsPage";
import { GSTPage } from "@/pages/gst/GSTPage";
import { SettingsPage } from "@/pages/settings/SettingsPage";
import { CommissionsPage } from "@/pages/commissions/CommissionsPage";
import { InventoryPage } from "@/pages/inventory/InventoryPage";
import { ExpensesPage } from "@/pages/expenses/ExpensesPage";
import { JewelleryPage } from "@/pages/jewellery/JewelleryPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardRouter />} />

                <Route path="/billing/new" element={<NewBillPage />} />
                <Route path="/billing/history" element={<BillHistoryPage />} />
                <Route path="/billing/history/:id" element={<BillDetailPage />} />

                <Route path="/customers" element={<CustomersPage />} />
                <Route path="/customers/:id" element={<CustomerProfilePage />} />

                <Route path="/appointments" element={<AppointmentsPage />} />
                <Route path="/reports" element={<ReportsPage />} />

                <Route element={<ProtectedRoute requires="services.manage" />}>
                  <Route path="/services" element={<ServicesPage />} />
                </Route>

                <Route element={<ProtectedRoute requires="employees.manage" />}>
                  <Route path="/employees" element={<EmployeesPage />} />
                  <Route path="/employees/:id" element={<EmployeePerformancePage />} />
                </Route>

                <Route element={<ProtectedRoute requires="memberships.manage" />}>
                  <Route path="/memberships" element={<MembershipsPage />} />
                </Route>

                <Route element={<ProtectedRoute requires="commissions.manage" />}>
                  <Route path="/commissions" element={<CommissionsPage />} />
                </Route>

                <Route element={<ProtectedRoute requires="inventory.manage" />}>
                  <Route path="/inventory" element={<InventoryPage />} />
                </Route>

                <Route element={<ProtectedRoute requires="expenses.manage" />}>
                  <Route path="/expenses" element={<ExpensesPage />} />
                </Route>

                <Route element={<ProtectedRoute requires="jewellery.manage" />}>
                  <Route path="/jewellery" element={<JewelleryPage />} />
                </Route>

                <Route element={<ProtectedRoute requires="gst.manage" />}>
                  <Route path="/gst" element={<GSTPage />} />
                </Route>

                <Route element={<ProtectedRoute requires="settings.manage" />}>
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
