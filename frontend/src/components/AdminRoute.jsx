import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AdminRoute() {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0D0D0D]">
        <p className="text-xs tracking-[0.3em] text-[#C6A66B]">
          VERIFYING ADMIN ACCESS...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    );
  }

  const isAdmin = user?.is_staff || user?.is_superuser;

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}