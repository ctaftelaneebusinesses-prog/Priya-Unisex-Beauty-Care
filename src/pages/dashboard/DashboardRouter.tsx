import { useAuth } from "@/auth/AuthContext";
import { OwnerDashboardPage } from "./OwnerDashboardPage";
import { EmployeeDashboardPage } from "./EmployeeDashboardPage";

export function DashboardRouter() {
  const { user } = useAuth();
  if (user?.role === "OWNER") return <OwnerDashboardPage />;
  return <EmployeeDashboardPage />;
}
