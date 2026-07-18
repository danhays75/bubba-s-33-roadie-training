import { AuthGate } from "@/components/AuthGate";
import { QueryErrorState } from "@/components/QueryErrorState";
import { useMyProfile } from "@/hooks/useMyProfile";
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
import { ArrowLeft, ShieldAlert } from "lucide-react";
import type { ReactElement } from "react";
import { Toaster } from "sonner";
import { Route as RootRoute } from "./routes/__root";
import { AdminPositionsPage } from "./routes/admin.positions";
import { AdminPositionLibraryRoute } from "./routes/admin.positions.$positionId.library";
import { AdminPositionLibraryItemEditorRoute } from "./routes/admin.positions.$positionId.library.$categoryId.item.$itemId";
import { AdminUsersPage } from "./routes/admin.users";
import { Home } from "./routes/index";
import { NsoPage } from "./routes/new-store-opening";
import { PositionDetailRoute } from "./routes/position.$id";
import { HeartShowcaseRoute } from "./routes/position.$id.heart.$categoryId";
import { BeLegendaryRoute } from "./routes/position.$id.legendary";
import { LegendaryFlashcardsRoute } from "./routes/position.$id.legendary.flashcards.$activityId";
import { LegendaryQuizRoute } from "./routes/position.$id.legendary.quiz.$activityId";
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
 *
 * Read-critical routes (every route whose primary content is a read query)
 * declare an `errorComponent` so a thrown read query renders a scoped
 * fallback (RouteErrorComponent → QueryErrorState with Reload) instead of
 * degrading to an empty/blank state. The root route's errorComponent is the
 * outermost backstop; per-route errorComponents give a tighter scoped UI.
 */

const ADMIN_SUB_NAV = [
  { to: "/admin/positions", label: "Positions" },
  { to: "/admin/users", label: "Users & Roles" },
] as const;

/**
 * Shared per-route error fallback. Reuses QueryErrorState so the read-error
 * UI matches the inline read-error pattern (dashed card, ShieldAlert, Retry).
 * TanStack Router passes the route error and a `reset` callback; onRetry
 * reloads the page so the read query re-runs fresh.
 */
function RouteErrorComponent({ error }: { error: Error; reset: () => void }) {
  return (
    <div className="px-4 py-8">
      <div className="mx-auto w-full max-w-md">
        <QueryErrorState
          title="Couldn't load this page"
          description="We couldn't load this page right now. Reloading usually fixes it."
          error={error}
          onRetry={() => window.location.reload()}
        />
      </div>
    </div>
  );
}

function AdminShellPage() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: profile, isError, error, refetch } = useMyProfile();

  // Read-error guard — a failed profile read must NOT look like a confirmed
  // non-admin. Render the shared inline QueryErrorState with a Retry affordance
  // before any role check or admin chrome.
  if (isError) {
    return (
      <div className="px-4 py-8">
        <div className="mx-auto w-full max-w-md">
          <QueryErrorState
            title="Couldn't verify admin access"
            description="We couldn't load your profile to check your role. Please try again."
            error={error}
            onRetry={() => void refetch()}
          />
        </div>
      </div>
    );
  }

  // Loading / actor-not-ready — profile is undefined while the query is
  // fetching or the actor isn't ready. Render a dark placeholder so there's
  // no flash of admin chrome or AccessDenied before the role is known.
  if (profile === undefined) {
    return <div className="min-h-[60vh] bg-background" aria-hidden />;
  }

  // Role gate — a confirmed non-admin (or a profile-less user, which AuthGate
  // normally intercepts earlier) sees a clean AccessDenied block with NO
  // admin chrome (header, Exit-admin link, subnav). Returns early so the
  // chrome below never renders for non-admins.
  if (!profile || profile.role !== "admin") {
    return (
      <div
        className="mx-auto flex w-full max-w-md flex-col items-center justify-center gap-4 px-4 py-20 text-center"
        data-ocid="admin.access_denied"
      >
        <ShieldAlert className="size-10 text-primary" />
        <h1 className="font-display text-3xl uppercase leading-none tracking-wide text-foreground">
          Admins only
        </h1>
        <p className="max-w-xs font-body text-sm text-muted-foreground">
          You need an Admin role to view this area. Ask an admin to upgrade your
          account.
        </p>
        <Link
          to="/"
          className={cn(
            "inline-flex items-center gap-1.5 font-heading text-xs uppercase tracking-wide",
            "text-muted-foreground transition-colors duration-200 hover:text-primary",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          )}
          data-ocid="admin.access_denied.go_home_link"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to home
        </Link>
      </div>
    );
  }

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
  errorComponent: RouteErrorComponent,
});

// Library drill-down routes. The full page components ship in the pages wave;
// these stubs render a themed "Coming soon" placeholder so the position
// page's category Links resolve today.
const categoryDetailRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: "/position/$id/library/$categoryId",
  component: CategoryDetailRoute,
  errorComponent: RouteErrorComponent,
});

// Per-position "Service with HEART" branded showcase. Additive route —
// reuses the existing Library data model and hooks (no backend changes).
const heartShowcaseRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: "/position/$id/heart/$categoryId",
  component: HeartShowcaseRoute,
  errorComponent: RouteErrorComponent,
});

// Per-position "Be Legendary" practice area (admin-built quiz / flashcard
// activities). Additive route — uses the Be Legendary backend methods and
// the useLegendary hooks. Registered as a child of RootRoute with the full
// path (matching heartShowcaseRoute / categoryDetailRoute) so it mounts
// without requiring PositionDetailPage to render an <Outlet/>.
const beLegendaryRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: "/position/$id/legendary",
  component: BeLegendaryRoute,
  errorComponent: RouteErrorComponent,
});

// Be Legendary quiz practice flow. Registered as a flat child of RootRoute
// with the full path (matching heartShowcaseRoute / categoryDetailRoute) so
// it mounts without requiring BeLegendaryPage to render an <Outlet/>. Reads
// $activityId and renders QuizActivity, which fetches the activity and reads
// positionId from it.
const legendaryQuizRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: "/position/$id/legendary/quiz/$activityId",
  component: LegendaryQuizRoute,
  errorComponent: RouteErrorComponent,
});

// Be Legendary flashcard practice flow. Registered as a flat child of
// RootRoute with the full path (matching heartShowcaseRoute /
// categoryDetailRoute) so it mounts without requiring BeLegendaryPage to
// render an <Outlet/>. Reads $activityId and renders FlashcardActivity,
// which fetches the activity and reads positionId from it.
const legendaryFlashcardsRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: "/position/$id/legendary/flashcards/$activityId",
  component: LegendaryFlashcardsRoute,
  errorComponent: RouteErrorComponent,
});

// New Store Opening tracker — additive top-level route (own page under the
// Layout nav, NOT nested under /admin). Manager/Admin gated inside NsoPage.
const nsoRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: "/new-store-opening",
  component: NsoPage,
  errorComponent: RouteErrorComponent,
});

const itemDetailRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: "/position/$id/library/$categoryId/item/$itemId",
  component: ItemDetailRoute,
  errorComponent: RouteErrorComponent,
});

const adminRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: "/admin",
  component: AdminShellPage,
  errorComponent: RouteErrorComponent,
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
  errorComponent: RouteErrorComponent,
});

const adminUsersRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/users",
  component: AdminUsersPage,
  errorComponent: RouteErrorComponent,
});

// Per-position Library manager reached from the Positions manager via the
// "Manage Library" action on each position row. Full admin UI lives in
// AdminLibraryManager (components/admin/library/).
const adminPositionLibraryRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/positions/$positionId/library",
  component: AdminPositionLibraryRoute,
  errorComponent: RouteErrorComponent,
});

// Per-category item editor (create + edit). $itemId === 'new' means create.
// Reached from AdminLibraryManager's "Add item" button and each item row's
// Edit action. The editor is a dedicated page (not a modal).
const adminPositionLibraryItemEditorRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/positions/$positionId/library/$categoryId/item/$itemId",
  component: AdminPositionLibraryItemEditorRoute,
  errorComponent: RouteErrorComponent,
});

const routeTree = RootRoute.addChildren([
  homeRoute,
  positionDetailRoute,
  beLegendaryRoute,
  legendaryQuizRoute,
  legendaryFlashcardsRoute,
  categoryDetailRoute,
  heartShowcaseRoute,
  itemDetailRoute,
  nsoRoute,
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
      <Toaster richColors position="top-right" />
    </AuthGate>
  );
}
