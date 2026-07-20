import { DrinksBuilderActivity } from "@/components/legendary/drinks-builder/DrinksBuilderActivity";
import { useParams } from "@tanstack/react-router";
import type { ReactElement } from "react";

/**
 * Route component for /position/$id/legendary/drinks-builder/$activityId.
 *
 * Reads $id (position id) and $activityId from the TanStack Router params
 * and renders the DrinksBuilderActivity with the activityId prop.
 * Registered in App.tsx as a flat child of RootRoute (full path), following
 * the same pattern as the quiz and flashcards routes.
 *
 * The position id is available in the route but the DrinksBuilderActivity
 * reads the positionId from the fetched activity data (for the back link),
 * so only $activityId is passed as a prop here.
 */
export function LegendaryDrinksBuilderRoute(): ReactElement {
  const { activityId } = useParams({ strict: false });
  return <DrinksBuilderActivity activityId={String(activityId ?? "")} />;
}

export default LegendaryDrinksBuilderRoute;
