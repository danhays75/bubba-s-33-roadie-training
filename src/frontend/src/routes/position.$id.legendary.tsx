import { BeLegendaryPage } from "@/components/legendary/BeLegendaryPage";
import { useParams } from "@tanstack/react-router";
import type { ReactElement } from "react";

/**
 * Route component for /position/$id/legendary.
 *
 * Reads $id (position id) from the TanStack Router params and renders the
 * BeLegendaryPage with that prop. Registered in App.tsx as a child of the
 * positionDetailRoute, following the same pattern as
 * position.$id.heart.$categoryId.tsx and position.$id.library.$categoryId.tsx.
 *
 * The full page component (banner, activity list, admin builder entry) ships
 * in the pages wave; this stub wires the route so the position page's
 * "BE LEGENDARY" banner link resolves today.
 */
export function BeLegendaryRoute(): ReactElement {
  const { id } = useParams({ strict: false });
  return <BeLegendaryPage positionId={String(id ?? "")} />;
}

export default BeLegendaryRoute;
