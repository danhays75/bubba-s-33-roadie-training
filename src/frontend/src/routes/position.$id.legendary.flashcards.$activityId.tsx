import { FlashcardActivity } from "@/components/legendary/FlashcardActivity";
import { useParams } from "@tanstack/react-router";
import type { ReactElement } from "react";

/**
 * Route component for /position/$id/legendary/flashcards/$activityId.
 *
 * Reads $id (position id) and $activityId from the TanStack Router params
 * and renders the FlashcardActivity with the activityId prop. Registered
 * in App.tsx as a child of the beLegendaryRoute, following the same pattern
 * as position.$id.heart.$categoryId.tsx and position.$id.legendary.tsx.
 *
 * The position id is available in the route but the FlashcardActivity reads
 * the positionId from the fetched activity data (for the back link), so only
 * $activityId is passed as a prop here.
 */
export function LegendaryFlashcardsRoute(): ReactElement {
  const { activityId } = useParams({ strict: false });
  return <FlashcardActivity activityId={String(activityId ?? "")} />;
}

export default LegendaryFlashcardsRoute;
