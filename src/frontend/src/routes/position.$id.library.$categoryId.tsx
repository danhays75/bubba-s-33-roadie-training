import { CategoryDetailPage } from "@/components/library/CategoryDetailPage";
import { useParams } from "@tanstack/react-router";
import type { ReactElement } from "react";

/**
 * Route component for /position/$id/library/$categoryId.
 *
 * Reads $id (position id) and $categoryId from the TanStack Router params and
 * renders the CategoryDetailPage with those props. Registered in App.tsx
 * (replacing the LibraryStub for this path) as a child of the root route,
 * following the existing position.$id.tsx pattern.
 */
export function CategoryDetailRoute(): ReactElement {
  const { id, categoryId } = useParams({ strict: false });
  return (
    <CategoryDetailPage
      positionId={String(id ?? "")}
      categoryId={String(categoryId ?? "")}
    />
  );
}

export default CategoryDetailRoute;
