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
import { useDeleteItem, useReorderItems } from "@/hooks/useLibrary";
import { cn } from "@/lib/utils";
import type { LibraryItem } from "@/types/foundation";
import { Link } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, Loader2, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

/**
 * Admin Library — a single item row inside a category's item list.
 *
 * Shows the item title, optional photo thumbnail, seasonal flag indicator,
 * and edit / delete / reorder controls. Edit navigates to the dedicated item
 * editor route (NOT a modal — the editor is a separate page task). Delete
 * uses useDeleteItem with an AlertDialog confirm. Reorder up/down uses
 * useReorderItems (per-category sort order).
 *
 * The edit/new routes are owned by a separate task; this component just
 * wires the navigation to the agreed paths:
 *   - edit: /admin/positions/$positionId/library/$categoryId/item/$itemId
 *   - new:  /admin/positions/$positionId/library/$categoryId/item/new
 */
export function ItemListItem({
  item,
  index,
  total,
  positionId,
  categoryId,
  onReorder,
  reorderPending,
}: {
  item: LibraryItem;
  index: number;
  total: number;
  positionId: string;
  categoryId: string;
  onReorder: (index: number, direction: -1 | 1) => void;
  reorderPending: boolean;
}) {
  const deleteMutation = useDeleteItem();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isFirst = index === 0;
  const isLast = index === total - 1;
  const editTo = `/admin/positions/${positionId}/library/${categoryId}/item/${item.id}`;
  const isPendingDelete = deleteMutation.isPending;

  async function handleDelete() {
    try {
      await deleteMutation.mutateAsync({ itemId: item.id, categoryId });
      toast.success("Item deleted");
      setConfirmOpen(false);
    } catch (err) {
      toast.error("Could not delete item", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  return (
    <>
      <li
        className={cn(
          "flex items-stretch gap-3 rounded-md border border-border bg-library-card transition-smooth hover:border-primary/60",
        )}
        data-ocid={`library.admin.item.row.${index + 1}`}
      >
        {/* Sort number — per-parent (within category), starts at 1 */}
        <div
          className="flex w-9 shrink-0 items-center justify-center rounded-l-md border-r border-border bg-nav font-heading text-base text-foreground"
          aria-label={`Sort order ${index + 1}`}
        >
          {index + 1}
        </div>

        {/* Thumbnail + title + meta */}
        <div className="flex min-w-0 flex-1 items-center gap-3 py-2.5 pl-3">
          <div
            className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-nav"
            aria-hidden
          >
            {item.photo ? (
              <img
                src={item.photo}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <span className="font-display text-lg uppercase text-foreground">
                {item.title.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-heading text-sm uppercase leading-tight tracking-wide text-foreground">
              {item.title}
            </span>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
              {item.seasonal && (
                <span
                  className="bg-seasonal px-1.5 py-0.5 font-heading text-[0.55rem] uppercase tracking-wider text-seasonal-foreground"
                  data-ocid={`library.admin.item.seasonal_badge.${index + 1}`}
                >
                  Seasonal
                </span>
              )}
              {item.tags.length > 0 && (
                <span className="truncate font-body text-xs text-muted-foreground">
                  {item.tags.join(" · ")}
                </span>
              )}
              {item.details.length > 0 && (
                <span className="font-body text-xs text-muted-foreground/70">
                  {item.details.length} field
                  {item.details.length === 1 ? "" : "s"}
                </span>
              )}
            </div>
          </div>
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
              aria-label={`Move ${item.title} up`}
              data-ocid={`library.admin.item.move_up_button.${index + 1}`}
            >
              <ArrowUp />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => onReorder(index, 1)}
              disabled={isLast || reorderPending}
              aria-label={`Move ${item.title} down`}
              data-ocid={`library.admin.item.move_down_button.${index + 1}`}
            >
              <ArrowDown />
            </Button>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            asChild
            aria-label={`Edit ${item.title}`}
            data-ocid={`library.admin.item.edit_button.${index + 1}`}
          >
            <Link to={editTo}>
              <Pencil />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-primary hover:bg-primary/10 hover:text-primary"
            onClick={() => setConfirmOpen(true)}
            aria-label={`Delete ${item.title}`}
            data-ocid={`library.admin.item.delete_button.${index + 1}`}
          >
            <Trash2 />
          </Button>
        </div>
      </li>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent
          className="bg-card border-border"
          data-ocid={`library.admin.item.delete_dialog.${index + 1}`}
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading uppercase tracking-wide text-foreground">
              Delete item?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This removes &ldquo;{item.title}&rdquo; from the category. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isPendingDelete}
              data-ocid={`library.admin.item.delete_dialog.cancel_button.${index + 1}`}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPendingDelete}
              className="bg-primary text-primary-foreground hover:bg-primary-hover"
              data-ocid={`library.admin.item.delete_dialog.confirm_button.${index + 1}`}
            >
              {isPendingDelete && <Loader2 className="animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/**
 * Convenience hook wrapper so the parent doesn't have to wire reorder
 * mutation + toast handling itself. Returns a stable onReorder callback.
 */
export function useItemReorder(categoryId: string) {
  const reorderMutation = useReorderItems();
  return {
    reorder: async (items: LibraryItem[], index: number, direction: -1 | 1) => {
      const next = [...items];
      const target = index + direction;
      if (target < 0 || target >= next.length) return;
      [next[index], next[target]] = [next[target], next[index]];
      try {
        await reorderMutation.mutateAsync({
          categoryId,
          orderedItemIds: next.map((i) => i.id),
        });
      } catch (err) {
        toast.error("Could not reorder items", {
          description: err instanceof Error ? err.message : undefined,
        });
      }
    },
    isPending: reorderMutation.isPending,
  };
}
