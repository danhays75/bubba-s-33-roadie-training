import { AuthGate } from "@/components/AuthGate";
import { cn } from "@/lib/utils";
import {
  Link,
  Navigate,
  Outlet,
  RouterProvider,
  createRoute,
  createRouter,
  useRouterState,
} from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { ReactElement } from "react";
import { Route as RootRoute } from "./routes/__root";
import { AdminPositionsPage } from "./routes/admin.positions";
import { AdminPositionLibraryRoute } from "./routes/admin.positions.$positionId.library";
import { AdminPositionLibraryItemEditorRoute } from "./routes/admin.positions.$positionId.library.$categoryId.item.$itemId";
import { AdminUsersPage } from "./routes/admin.users";
import { Home } from "./routes/index";
import { PositionDetailRoute } from "./routes/position.$id";
import { CategoryDetailRoute } from "./routes/position.$id.library.$categoryId";
import { ItemDetailRoute } from "./routes/position.$id.library.$categoryId.item.$itemId";

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

const ADMIN_SUB_NAV = [
  { to: "/admin/positions", label: "Positions" },
  { to: "/admin/users", label: "Users & Roles" },
] as const;

function AdminShellPage() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="px-4 py-8">
      <div className="mx-auto w-full max-w-3xl">
        <div className="flex items-center justify-between gap-4">
          <h1 className="font-display text-3xl uppercase text-foreground">
            Admin
          </h1>
          <Link
            to="/"
            className={cn(
              "inline-flex items-center gap-1.5 font-heading text-xs uppercase tracking-wide",
              "text-muted-foreground transition-colors duration-200 hover:text-primary",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            )}
            data-ocid="admin.exit_admin_link"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Exit admin
          </Link>
        </div>

        <nav
          className="mt-4 flex gap-1 border-b border-border"
          aria-label="Admin sections"
          data-ocid="admin.subnav"
        >
          {ADMIN_SUB_NAV.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "-mb-px border-b-2 px-3 py-2 font-heading text-xs uppercase tracking-wide transition-colors duration-200",
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                )}
                aria-current={active ? "page" : undefined}
                data-ocid={
                  item.to === "/admin/positions"
                    ? "admin.subnav.positions_tab"
                    : "admin.subnav.users_tab"
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mx-auto mt-6 w-full max-w-3xl">
        <Outlet />
      </div>
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

// Library drill-down routes. The full page components ship in the pages wave;
// these stubs render a themed "Coming soon" placeholder so the position
// page's category Links resolve today.
const categoryDetailRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: "/position/$id/library/$categoryId",
  component: CategoryDetailRoute,
});

const itemDetailRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: "/position/$id/library/$categoryId/item/$itemId",
  component: ItemDetailRoute,
});

const adminRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: "/admin",
  component: AdminShellPage,
});

const adminIndexRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/",
  component: () => <Navigate to="/admin/positions" />,
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

// Per-position Library manager reached from the Positions manager via the
// "Manage Library" action on each position row. Full admin UI lives in
// AdminLibraryManager (components/admin/library/).
const adminPositionLibraryRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/positions/$positionId/library",
  component: AdminPositionLibraryRoute,
});

// Per-category item editor (create + edit). $itemId === 'new' means create.
// Reached from AdminLibraryManager's "Add item" button and each item row's
// Edit action. The editor is a dedicated page (not a modal).
const adminPositionLibraryItemEditorRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/positions/$positionId/library/$categoryId/item/$itemId",
  component: AdminPositionLibraryItemEditorRoute,
});

const routeTree = RootRoute.addChildren([
  homeRoute,
  positionDetailRoute,
  categoryDetailRoute,
  itemDetailRoute,
  adminRoute.addChildren([
    adminIndexRoute,
    adminPositionsRoute,
    adminUsersRoute,
    adminPositionLibraryRoute,
    adminPositionLibraryItemEditorRoute,
  ]),
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

/* ----------------------- Library route stubs ---------------------------- */

export default function App() {
  return (
    <AuthGate>
      <RouterProvider router={router} />
    </AuthGate>
  );
}
