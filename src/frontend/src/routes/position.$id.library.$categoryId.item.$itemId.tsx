import { RecipeCardPage } from "@/components/library/RecipeCardPage";
import { useParams } from "@tanstack/react-router";
import type { ReactElement } from "react";

/**
 * Route component for /position/$id/library/$categoryId/item/$itemId.
 *
 * Reads $id (position id), $categoryId, and $itemId from the TanStack Router
 * params and renders the RecipeCardPage with those props. Registered in
 * App.tsx (replacing the LibraryStub for this path) as a child of the root
 * route, following the existing position.$id.tsx pattern.
 */
export function ItemDetailRoute(): ReactElement {
  const { id, categoryId, itemId } = useParams({ strict: false });
  return (
    <RecipeCardPage
      positionId={String(id ?? "")}
      categoryId={String(categoryId ?? "")}
      itemId={String(itemId ?? "")}
    />
  );
}

export default ItemDetailRoute;
