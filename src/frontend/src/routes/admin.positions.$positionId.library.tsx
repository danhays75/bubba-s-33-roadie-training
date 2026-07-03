import { AdminLibraryManager } from "@/components/admin/library/AdminLibraryManager";
import { useParams } from "@tanstack/react-router";
import type { ReactElement } from "react";

/**
 * Route component for /admin/positions/$positionId/library.
 *
 * Reads the $positionId param and renders the AdminLibraryManager — the
 * per-position admin Library manager (categories + items). Replaces the
 * AdminLibraryStub previously registered in App.tsx.
 *
 * Gated on the admin role inside AdminLibraryManager (AdminsOnly fallback),
 * consistent with admin.positions.tsx and admin.users.tsx.
 */
export function AdminPositionLibraryRoute(): ReactElement {
  const { positionId } = useParams({ strict: false });
  return <AdminLibraryManager positionId={String(positionId ?? "")} />;
}

export default AdminPositionLibraryRoute;
