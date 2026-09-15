import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";
import type { Permission } from "./permissions";
import { hasPermission } from "./permissions";

export function ProtectedRoute({ requires }: { requires?: Permission }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (requires && !hasPermission(user.role, requires)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
}
