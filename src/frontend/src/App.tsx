import { AuthGate } from "@/components/AuthGate";
import {
  Outlet,
  RouterProvider,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { Route as RootRoute } from "./routes/__root";
import { AdminPositionsPage } from "./routes/admin.positions";
import { AdminUsersPage } from "./routes/admin.users";
import { Home } from "./routes/index";
import { PositionDetailRoute } from "./routes/position.$id";

/**
 * App entry: TanStack Router with a root route, the position detail route,
 * and the admin shell + sub-pages.
 *
 * The AuthGate wraps the router outlet so unauthenticated users see the
 * sign-in screen and profile-less users see the profile-creation form,
 * without a splash/loading screen.
 *
 * The QueryClientProvider is already in main.tsx — do NOT add a second one.
 */

function AdminShellPage() {
  return (
    <div className="px-4 py-8">
      <h1 className="font-display text-3xl uppercase text-foreground">Admin</h1>
      <p className="mt-2 font-body text-sm text-muted-foreground">
        Admin shell — sub-pages below.
      </p>
      <Outlet />
    </div>
  );
}

// --- Route tree ---

const homeRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: "/",
  component: Home,
});

const positionDetailRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: "/position/$id",
  component: PositionDetailRoute,
});

const adminRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: "/admin",
  component: AdminShellPage,
});

const adminPositionsRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/positions",
  component: AdminPositionsPage,
});

const adminUsersRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/users",
  component: AdminUsersPage,
});

const routeTree = RootRoute.addChildren([
  homeRoute,
  positionDetailRoute,
  adminRoute.addChildren([adminPositionsRoute, adminUsersRoute]),
]);

const router = createRouter({
  routeTree,
  defaultPreload: "intent",
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return (
    <AuthGate>
      <RouterProvider router={router} />
    </AuthGate>
  );
}
