import { Layout } from "@/components/Layout";
import { createRootRouteWithContext } from "@tanstack/react-router";

type RouterContext = Record<string, never>;

/**
 * Root route. The Layout (black nav bar + dark content area) wraps every
 * authenticated page via its <Outlet />.
 */
export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
});

function RootComponent() {
  return <Layout />;
}
