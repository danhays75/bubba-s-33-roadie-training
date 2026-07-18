import { Layout } from "@/components/Layout";
import { QueryErrorState } from "@/components/QueryErrorState";
import { createRootRouteWithContext } from "@tanstack/react-router";

type RouterContext = Record<string, never>;

/**
 * Root route. The Layout (black nav bar + dark content area) wraps every
 * authenticated page via its <Outlet />.
 *
 * The root errorComponent is the outermost scoped fallback for any uncaught
 * route error (including React Query throws from read-critical routes that
 * have no per-route errorComponent). It reuses the shared QueryErrorState
 * with a Reload affordance so the failure is clearly an error, not empty.
 */
export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
  errorComponent: RootRouteError,
});

function RootComponent() {
  return <Layout />;
}

function RootRouteError({ error }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-[60vh] bg-background px-4 py-8">
      <div className="mx-auto w-full max-w-md">
        <QueryErrorState
          title="Couldn't load this page"
          description="An unexpected error occurred while loading this page. Reloading usually fixes it."
          error={error}
          onRetry={() => window.location.reload()}
        />
      </div>
    </div>
  );
}
