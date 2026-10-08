import * as React from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { AppShell } from "@/components/layout/AppShell";
import { Skeleton } from "@/components/ui/skeleton";
const DeliveriesPage = lazyPage(() => import("@/pages/DeliveriesPage"), "DeliveriesPage");
const DisputeDetailPage = lazyPage(() => import("@/pages/DisputesPage"), "DisputeDetailPage");
const DisputesPage = lazyPage(() => import("@/pages/DisputesPage"), "DisputesPage");
const ListingsPage = lazyPage(() => import("@/pages/ListingsPage"), "ListingsPage");
const LoginPage = lazyPage(() => import("@/pages/LoginPage"), "LoginPage");
const NotFoundPage = lazyPage(() => import("@/pages/NotFoundPage"), "NotFoundPage");
const NotificationsPage = lazyPage(() => import("@/pages/NotificationsPage"), "NotificationsPage");
const OrderDetailPage = lazyPage(() => import("@/pages/OrdersPage"), "OrderDetailPage");
const OrdersPage = lazyPage(() => import("@/pages/OrdersPage"), "OrdersPage");
const OverviewPage = lazyPage(() => import("@/pages/OverviewPage"), "OverviewPage");
const PaymentsPage = lazyPage(() => import("@/pages/PaymentsPage"), "PaymentsPage");
const ReportsPage = lazyPage(() => import("@/pages/ReportsPage"), "ReportsPage");
const SettingsPage = lazyPage(() => import("@/pages/SettingsPage"), "SettingsPage");
const UserDetailPage = lazyPage(() => import("@/pages/UsersPage"), "UserDetailPage");
const UsersPage = lazyPage(() => import("@/pages/UsersPage"), "UsersPage");
const VerificationPage = lazyPage(() => import("@/pages/VerificationPage"), "VerificationPage");

/** Route pages are loaded on demand so the first screen stays small. */
function lazyPage<T extends Record<string, React.ComponentType>>(load: () => Promise<T>, name: keyof T & string) {
  return React.lazy(async () => ({ default: (await load())[name] as React.ComponentType }));
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();
  if (status === "loading") {
    return (
      <div className="grid min-h-screen place-items-center">
        <Skeleton className="h-10 w-48" />
      </div>
    );
  }
  if (status === "anonymous") return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <>{children}</>;
}

export function App() {
  return (
    <React.Suspense fallback={null}>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireAdmin>
            <AppShell />
          </RequireAdmin>
        }
      >
        <Route index element={<OverviewPage />} />
        <Route path="verification" element={<VerificationPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="users/:id" element={<UserDetailPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="orders/:id" element={<OrderDetailPage />} />
        <Route path="deliveries" element={<DeliveriesPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="disputes" element={<DisputesPage />} />
        <Route path="disputes/:id" element={<DisputeDetailPage />} />
        <Route path="listings" element={<ListingsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
    </React.Suspense>
  );
}
