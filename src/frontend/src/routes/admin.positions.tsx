import { PositionFormDialog } from "@/components/admin/PositionFormDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  useAllPositions,
  useDeletePosition,
  useReorderPositions,
} from "@/hooks/useAllPositions";
import { useMyProfile } from "@/hooks/useMyProfile";
import { cn } from "@/lib/utils";
import type { Position } from "@/types/foundation";
import {
  ArrowDown,
  ArrowUp,
  Loader2,
  Lock,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

/**
 * Admin → Manage Positions.
 *
 * Lists every position ordered by per-parent sortOrder. Each row shows the
 * sort number, name, truncated description, and reorder / edit / delete
 * controls. Create and edit go through the shared PositionFormDialog; delete
 * goes through a confirm AlertDialog.
 *
 * Gated on the admin role — non-admins see an "Admins only" message even
 * though the AuthGate/Layout should already restrict /admin routes.
 */
export function AdminPositionsPage() {
  const { data: profile } = useMyProfile();
  const { data: positions, isLoading } = useAllPositions();
  const deleteMutation = useDeletePosition();
  const reorderMutation = useReorderPositions();

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<Position | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Sort client-side by sortOrder so the UI is always stable while mutations
  // round-trip. The backend already returns them ordered, but this guarantees
  // a consistent view during optimistic refetches.
  const ordered = useMemo(
    () =>
      [...(positions ?? [])].sort(
        (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
      ),
    [positions],
  );

  const isAdmin = profile?.role === "admin";

  if (!isAdmin) {
    return <AdminsOnly />;
  }

  async function handleReorder(index: number, direction: -1 | 1) {
    const next = [...ordered];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    try {
      await reorderMutation.mutateAsync(next.map((p) => p.id));
    } catch (err) {
      toast.error("Could not reorder positions", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  async function handleDelete() {
    if (!deletingId) return;
    try {
      await deleteMutation.mutateAsync(deletingId);
      toast.success("Position deleted");
      setDeletingId(null);
    } catch (err) {
      toast.error("Could not delete position", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  function openCreate() {
    setFormMode("create");
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(position: Position) {
    setFormMode("edit");
    setEditing(position);
    setFormOpen(true);
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl uppercase leading-none tracking-wide text-foreground">
            Manage positions
          </h2>
          <p className="mt-1.5 font-body text-sm text-muted-foreground">
            Create, edit, reorder, and delete training positions on the floor.
          </p>
        </div>
        <Button
          onClick={openCreate}
          data-ocid="position.add_button"
          className="shrink-0"
        >
          <Plus />
          Add position
        </Button>
      </div>

      {/* Body */}
      <div className="mt-6">
        {isLoading ? (
          <LoadingState />
        ) : ordered.length === 0 ? (
          <EmptyState onCreate={openCreate} />
        ) : (
          <PositionList
            positions={ordered}
            onEdit={openEdit}
            onDelete={(id) => setDeletingId(id)}
            onReorder={handleReorder}
            reorderPending={reorderMutation.isPending}
          />
        )}
      </div>

      {/* Create / edit dialog */}
      <PositionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        position={editing}
        mode={formMode}
      />

      {/* Delete confirm */}
      <AlertDialog
        open={deletingId !== null}
        onOpenChange={(o) => !o && setDeletingId(null)}
      >
        <AlertDialogContent
          className="bg-card border-border"
          data-ocid="position.delete_dialog"
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading uppercase tracking-wide text-foreground">
              Delete position?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This removes the position and its sort slot. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deleteMutation.isPending}
              data-ocid="position.delete_dialog.cancel_button"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary-hover"
              data-ocid="position.delete_dialog.confirm_button"
            >
              {deleteMutation.isPending && <Loader2 className="animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ----------------------------- Sub-components ---------------------------- */

function PositionList({
  positions,
  onEdit,
  onDelete,
  onReorder,
  reorderPending,
}: {
  positions: Position[];
  onEdit: (p: Position) => void;
  onDelete: (id: string) => void;
  onReorder: (index: number, direction: -1 | 1) => void;
  reorderPending: boolean;
}) {
  return (
    <ul className="flex flex-col gap-2" data-ocid="position.list">
      {positions.map((p, index) => (
        <PositionRow
          key={p.id}
          position={p}
          index={index}
          total={positions.length}
          onEdit={onEdit}
          onDelete={onDelete}
          onReorder={onReorder}
          reorderPending={reorderPending}
        />
      ))}
    </ul>
  );
}

function PositionRow({
  position,
  index,
  total,
  onEdit,
  onDelete,
  onReorder,
  reorderPending,
}: {
  position: Position;
  index: number;
  total: number;
  onEdit: (p: Position) => void;
  onDelete: (id: string) => void;
  onReorder: (index: number, direction: -1 | 1) => void;
  reorderPending: boolean;
}) {
  const isFirst = index === 0;
  const isLast = index === total - 1;

  return (
    <li
      className={cn(
        "flex items-stretch gap-3 rounded-md border border-border bg-card",
        "transition-smooth hover:border-primary/60",
      )}
      data-ocid={`position.item.${index + 1}`}
    >
      {/* Sort number — per-parent, starts at 1 */}
      <div
        className="flex w-10 shrink-0 items-center justify-center rounded-l-md border-r border-border bg-nav font-heading text-lg text-foreground"
        aria-label={`Sort order ${index + 1}`}
      >
        {index + 1}
      </div>

      {/* Name + description */}
      <div className="flex min-w-0 flex-1 flex-col justify-center py-3">
        <h3 className="font-heading text-base uppercase leading-tight tracking-wide text-foreground">
          {position.name}
        </h3>
        {position.description ? (
          <p className="mt-0.5 line-clamp-1 font-body text-sm text-muted-foreground">
            {position.description}
          </p>
        ) : (
          <p className="mt-0.5 font-body text-sm text-muted-foreground/60 italic">
            No description
          </p>
        )}
      </div>

      {/* Reorder + actions */}
      <div className="flex shrink-0 items-center gap-1 pr-2">
        <div className="flex flex-col">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => onReorder(index, -1)}
            disabled={isFirst || reorderPending}
            aria-label={`Move ${position.name} up`}
            data-ocid={`position.move_up_button.${index + 1}`}
          >
            <ArrowUp />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => onReorder(index, 1)}
            disabled={isLast || reorderPending}
            aria-label={`Move ${position.name} down`}
            data-ocid={`position.move_down_button.${index + 1}`}
          >
            <ArrowDown />
          </Button>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => onEdit(position)}
          aria-label={`Edit ${position.name}`}
          data-ocid={`position.edit_button.${index + 1}`}
        >
          <Pencil />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-primary hover:bg-primary/10 hover:text-primary"
          onClick={() => onDelete(position.id)}
          aria-label={`Delete ${position.name}`}
          data-ocid={`position.delete_button.${index + 1}`}
        >
          <Trash2 />
        </Button>
      </div>
    </li>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-4 rounded-md border border-dashed border-border bg-card px-6 py-14 text-center"
      data-ocid="position.empty_state"
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-nav text-primary">
        <Plus />
      </div>
      <div>
        <h3 className="font-heading text-lg uppercase tracking-wide text-foreground">
          No positions yet
        </h3>
        <p className="mt-1 font-body text-sm text-muted-foreground">
          Add your first training position to get the floor running.
        </p>
      </div>
      <Button onClick={onCreate} data-ocid="position.empty_state.add_button">
        <Plus />
        Add position
      </Button>
    </div>
  );
}

function LoadingState() {
  return (
    <ul className="flex flex-col gap-2" data-ocid="position.loading_state">
      {["skeleton-1", "skeleton-2", "skeleton-3", "skeleton-4"].map((k) => (
        <li
          key={k}
          className="flex items-center gap-3 rounded-md border border-border bg-card py-3"
        >
          <div className="h-12 w-10 shrink-0 animate-pulse rounded-l-md bg-muted" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-muted/60" />
          </div>
          <div className="h-8 w-24 animate-pulse rounded bg-muted/60" />
        </li>
      ))}
    </ul>
  );
}

function AdminsOnly() {
  return (
    <div
      className="mx-auto flex w-full max-w-3xl flex-col items-center justify-center gap-4 px-4 py-20 text-center"
      data-ocid="position.admins_only"
    >
      <div className="flex size-14 items-center justify-center rounded-full bg-nav text-primary">
        <Lock />
      </div>
      <div>
        <h2 className="font-display text-2xl uppercase tracking-wide text-foreground">
          Admins only
        </h2>
        <p className="mt-1.5 font-body text-sm text-muted-foreground">
          You need an admin role to manage positions.
        </p>
      </div>
    </div>
  );
}

export default AdminPositionsPage;
