import { ItemEditorPage } from "@/components/admin/library/ItemEditorPage";
import { useParams } from "@tanstack/react-router";
import type { ReactElement } from "react";

/**
 * Route component for /admin/positions/$positionId/library/$categoryId/item/$itemId.
 *
 * Reads $positionId, $categoryId, and $itemId from the TanStack Router params
 * and renders the ItemEditorPage — the dedicated admin edit PAGE (not a
 * dialog) for creating and editing Library items. The $itemId param is 'new'
 * for create mode; the component handles that branch internally.
 *
 * Mirrors admin.positions.$positionId.library.tsx (useParams({ strict: false })
 * + render a single component with stringified params). Gated on the admin
 * role inside ItemEditorPage (AdminsOnly fallback), consistent with the
 * other admin routes.
 */
export function AdminPositionLibraryItemEditorRoute(): ReactElement {
  const { positionId, categoryId, itemId } = useParams({ strict: false });
  return (
    <ItemEditorPage
      positionId={String(positionId ?? "")}
      categoryId={String(categoryId ?? "")}
      itemId={String(itemId ?? "")}
    />
  );
}

export default AdminPositionLibraryItemEditorRoute;
