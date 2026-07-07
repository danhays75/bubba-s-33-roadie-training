import { HeartShowcasePage } from "@/components/heart/HeartShowcasePage";
import { useParams } from "@tanstack/react-router";
import type { ReactElement } from "react";

/**
 * Route component for /position/$id/heart/$categoryId.
 *
 * Reads $id (position id) and $categoryId from the TanStack Router params
 * and renders the HeartShowcasePage with those props. Registered in
 * App.tsx as a child of the root route, alongside the existing
 * /position/$id/library/$categoryId route, following the same pattern as
 * position.$id.library.$categoryId.tsx.
 */
export function HeartShowcaseRoute(): ReactElement {
  const { id, categoryId } = useParams({ strict: false });
  return (
    <HeartShowcasePage
      positionId={String(id ?? "")}
      categoryId={String(categoryId ?? "")}
    />
  );
}

export default HeartShowcaseRoute;
