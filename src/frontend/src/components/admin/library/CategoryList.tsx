import { CategoryFormDialog } from "@/components/admin/library/CategoryFormDialog";
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
import { useDeleteCategory, useReorderCategories } from "@/hooks/useLibrary";
import { cn } from "@/lib/utils";
import type { Category } from "@/types/foundation";
import {
  ArrowDown,
  ArrowUp,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

/**
 * Admin Library — Category list for a position.
 *
 * Lists every category for the given position, ordered by per-parent
 * sortOrder. Each row shows the sort number, optional cover photo thumbnail,
 * name, and reorder / edit / delete controls. Create and edit go through the
 * shared CategoryFormDialog; delete goes through a confirm AlertDialog that
 * warns about the cascade (deleting a category deletes its items).
 *
 * Mirrors the admin.positions.tsx list pattern. The parent
 * AdminLibraryManager owns the "selected category" state and renders the
 * items pane; this component just emits onSelect when a row is clicked.
 */
export function CategoryList({
  positionId,
  categories,
  isLoading,
  selectedCategoryId,
  onSelect,
}: {
  positionId: string;
  categories: Category[];
  isLoading: boolean;
  selectedCategoryId: string | null;
  onSelect: (categoryId: string) => void;
}) {
  const reorderMutation = useReorderCategories();
  const deleteMutation = useDeleteCategory();

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<Category | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Sort client-side by sortOrder so the UI is always stable while mutations
  // round-trip. The backend already returns them ordered, but this guarantees
  // a consistent view during optimistic refetches.
  const ordered = useMemo(
    () =>
      [...categories].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [categories],
  );

  async function handleReorder(index: number, direction: -1 | 1) {
    const next = [...ordered];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    try {
      await reorderMutation.mutateAsync({
        positionId,
        orderedCategoryIds: next.map((c) => c.id),
      });
    } catch (err) {
      toast.error("Could not reorder categories", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  async function handleDelete() {
    if (!deletingId) return;
    try {
      await deleteMutation.mutateAsync({
        categoryId: deletingId,
        positionId,
      });
      toast.success("Category deleted");
      setDeletingId(null);
    } catch (err) {
      toast.error("Could not delete category", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  function openCreate() {
    setFormMode("create");
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(category: Category) {
    setFormMode("edit");
    setEditing(category);
    setFormOpen(true);
  }

  return (
    <section data-ocid="library.admin.category.section">
      <div className="flex items-center justify-between gap-3">
        <h3
          className="font-heading text-sm uppercase tracking-wider text-muted-foreground"
          data-ocid="library.admin.category.heading"
        >
          Categories
        </h3>
        <Button
          onClick={openCreate}
          size="sm"
          data-ocid="library.admin.category.add_button"
        >
          <Plus />
          Add category
        </Button>
      </div>

      <div className="mt-3">
        {isLoading ? (
          <CategoryListSkeleton />
        ) : ordered.length === 0 ? (
          <CategoryEmptyState onCreate={openCreate} />
        ) : (
          <ul
            className="flex flex-col gap-2"
            data-ocid="library.admin.category.list"
          >
            {ordered.map((category, index) => (
              <CategoryRow
                key={category.id}
                category={category}
                index={index}
                total={ordered.length}
                isSelected={category.id === selectedCategoryId}
                onSelect={onSelect}
                onEdit={openEdit}
                onDelete={(id) => setDeletingId(id)}
                onReorder={handleReorder}
                reorderPending={reorderMutation.isPending}
              />
            ))}
          </ul>
        )}
      </div>

      <CategoryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        positionId={positionId}
        category={editing}
        mode={formMode}
      />

      <AlertDialog
        open={deletingId !== null}
        onOpenChange={(o) => !o && setDeletingId(null)}
      >
        <AlertDialogContent
          className="bg-card border-border"
          data-ocid="library.admin.category.delete_dialog"
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading uppercase tracking-wide text-foreground">
              Delete category?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This removes the category and{" "}
              <strong className="text-foreground">all items inside it</strong>.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deleteMutation.isPending}
              data-ocid="library.admin.category.delete_dialog.cancel_button"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary-hover"
              data-ocid="library.admin.category.delete_dialog.confirm_button"
            >
              {deleteMutation.isPending && <Loader2 className="animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

/* ----------------------------- Sub-components ---------------------------- */

function CategoryRow({
  category,
  index,
  total,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onReorder,
  reorderPending,
}: {
  category: Category;
  index: number;
  total: number;
  isSelected: boolean;
  onSelect: (categoryId: string) => void;
  onEdit: (c: Category) => void;
  onDelete: (id: string) => void;
  onReorder: (index: number, direction: -1 | 1) => void;
  reorderPending: boolean;
}) {
  const isFirst = index === 0;
  const isLast = index === total - 1;

  return (
    <li
      className={cn(
        "flex items-stretch gap-3 rounded-md border bg-card transition-smooth",
        isSelected ? "border-primary" : "border-border hover:border-primary/60",
      )}
      data-ocid={`library.admin.category.row.${index + 1}`}
    >
      {/* Sort number — per-parent, starts at 1 */}
      <button
        type="button"
        onClick={() => onSelect(category.id)}
        className="flex w-10 shrink-0 items-center justify-center rounded-l-md border-r border-border bg-nav font-heading text-lg text-foreground transition-colors duration-200 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-label={`Select ${category.name} category (sort order ${index + 1})`}
        aria-pressed={isSelected}
        data-ocid={`library.admin.category.select_button.${index + 1}`}
      >
        {index + 1}
      </button>

      {/* Thumbnail + name — clickable to select */}
      <button
        type="button"
        onClick={() => onSelect(category.id)}
        className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-3 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-label={`Select ${category.name} category`}
        aria-pressed={isSelected}
        data-ocid={`library.admin.category.select_button.${index + 1}`}
      >
        <div
          className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-nav"
          aria-hidden
        >
          {category.coverPhoto ? (
            <img
              src={category.coverPhoto}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <span className="font-display text-lg uppercase text-foreground">
              {category.name.trim().charAt(0).toUpperCase() || "?"}
            </span>
          )}
        </div>
        <span className="truncate font-heading text-base uppercase leading-tight tracking-wide text-foreground">
          {category.name}
        </span>
      </button>

      {/* Reorder + actions */}
      <div className="flex shrink-0 items-center gap-1 pr-2">
        <div className="flex flex-col">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => onReorder(index, -1)}
            disabled={isFirst || reorderPending}
            aria-label={`Move ${category.name} up`}
            data-ocid={`library.admin.category.move_up_button.${index + 1}`}
          >
            <ArrowUp />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => onReorder(index, 1)}
            disabled={isLast || reorderPending}
            aria-label={`Move ${category.name} down`}
            data-ocid={`library.admin.category.move_down_button.${index + 1}`}
          >
            <ArrowDown />
          </Button>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => onEdit(category)}
          aria-label={`Edit ${category.name}`}
          data-ocid={`library.admin.category.edit_button.${index + 1}`}
        >
          <Pencil />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-primary hover:bg-primary/10 hover:text-primary"
          onClick={() => onDelete(category.id)}
          aria-label={`Delete ${category.name}`}
          data-ocid={`library.admin.category.delete_button.${index + 1}`}
        >
          <Trash2 />
        </Button>
      </div>
    </li>
  );
}

function CategoryEmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border bg-card px-6 py-10 text-center"
      data-ocid="library.admin.category.empty_state"
    >
      <div className="flex size-10 items-center justify-center rounded-full bg-nav text-primary">
        <Plus />
      </div>
      <div>
        <p className="font-heading text-sm uppercase tracking-wide text-foreground">
          No categories yet
        </p>
        <p className="mt-1 font-body text-sm text-muted-foreground">
          Add a category to start building this position&rsquo;s library.
        </p>
      </div>
      <Button
        onClick={onCreate}
        size="sm"
        data-ocid="library.admin.category.empty_state.add_button"
      >
        <Plus />
        Add category
      </Button>
    </div>
  );
}

function CategoryListSkeleton() {
  return (
    <ul
      className="flex flex-col gap-2"
      data-ocid="library.admin.category.loading_state"
      aria-hidden
    >
      {["s1", "s2", "s3"].map((k) => (
        <li
          key={k}
          className="flex items-center gap-3 rounded-md border border-border bg-card py-3"
        >
          <div className="h-12 w-10 shrink-0 animate-pulse rounded-l-md bg-muted" />
          <div className="size-10 shrink-0 animate-pulse rounded-md bg-muted" />
          <div className="h-4 flex-1 animate-pulse rounded bg-muted" />
          <div className="h-8 w-24 animate-pulse rounded bg-muted/60" />
        </li>
      ))}
    </ul>
  );
}
