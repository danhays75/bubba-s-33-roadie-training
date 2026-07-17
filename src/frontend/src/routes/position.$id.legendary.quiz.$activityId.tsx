import { QuizActivity } from "@/components/legendary/QuizActivity";
import { useParams } from "@tanstack/react-router";
import type { ReactElement } from "react";

/**
 * Route component for /position/$id/legendary/quiz/$activityId.
 *
 * Reads $id (position id) and $activityId from the TanStack Router params
 * and renders the QuizActivity with the activityId prop. Registered in
 * App.tsx as a child of the beLegendaryRoute, following the same pattern as
 * position.$id.heart.$categoryId.tsx and position.$id.legendary.tsx.
 *
 * The position id is available in the route but the QuizActivity reads the
 * positionId from the fetched activity data (for the back link), so only
 * $activityId is passed as a prop here.
 */
export function LegendaryQuizRoute(): ReactElement {
  const { activityId } = useParams({ strict: false });
  return <QuizActivity activityId={String(activityId ?? "")} />;
}

export default LegendaryQuizRoute;
