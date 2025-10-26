import { Navigate, Outlet, useLocation } from "react-router-dom";
import { hasToken } from "~/shared/lib/helpers/storageHelpers";

export default function ProtectedRoute() {
  const location = useLocation();
  return hasToken()
    ? <Outlet />
    : <Navigate to="/login" replace state={{ from: location }} />;
}
