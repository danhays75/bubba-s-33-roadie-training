import { CategoryList } from "@/components/admin/library/CategoryList";
import {
  ItemListItem,
  useItemReorder,
} from "@/components/admin/library/ItemListItem";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAllPositions } from "@/hooks/useAllPositions";
import {
  useCategoriesByPosition,
  useItemsByCategory,
} from "@/hooks/useLibrary";
import { useMyProfile } from "@/hooks/useMyProfile";
import { cn } from "@/lib/utils";
import type { LibraryItem } from "@/types/foundation";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, BookOpen, Lock, Package, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ReactElement } from "react";

/**
 * Admin Library manager — the per-position admin page for managing
 * categories and items. Reached from the Positions manager via the
 * "Manage Library" action on each position row.
 *
 * Layout (mobile-first, single column; two-pane on >= sm):
 *   - Breadcrumb back to /admin/positions
 *   - Position name header
 *   - Left/top: CategoryList for this position
 *   - Right/bottom: when a category is selected, that category's items as a
 *     list of ItemListItem components with an "Add item" button
 *
 * "Add item" and item "Edit" navigate to the item editor route (a separate
 * dedicated edit page task — NOT a modal). The agreed paths are:
 *   - new:  /admin/positions/$positionId/library/$categoryId/item/new
 *   - edit: /admin/positions/$positionId/library/$categoryId/item/$itemId
 *
 * Gated on profile?.role === 'admin' with an AdminsOnly fallback, matching
 * admin.positions.tsx and admin.users.tsx. The wordmark in the top bar
 * (Layout.tsx) still links home from here.
 */
export function AdminLibraryManager({
  positionId,
}: {
  positionId: string;
}): ReactElement {
  const { data: profile } = useMyProfile();
  const { data: positions } = useAllPositions();
  const { data: categories, isLoading: categoriesLoading } =
    useCategoriesByPosition(positionId);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );

  const isAdmin = profile?.role === "admin";

  // Resolve the position name from the all-positions cache (no extra fetch).
  const position = useMemo(
    () => (positions ?? []).find((p) => p.id === positionId) ?? null,
    [positions, positionId],
  );

  // Auto-select the first category once the list loads, so the items pane
  // is populated without an extra click on desktop. Done in an effect (not
  // during render) to keep React's render pure and avoid lint/runtime
  // warnings about setState during render.
  const orderedCategories = useMemo(
    () =>
      [...(categories ?? [])].sort(
        (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
      ),
    [categories],
  );
  useEffect(() => {
    if (
      selectedCategoryId === null &&
      orderedCategories.length > 0 &&
      !categoriesLoading
    ) {
      setSelectedCategoryId(orderedCategories[0].id);
    }
  }, [selectedCategoryId, orderedCategories, categoriesLoading]);

  if (!isAdmin) {
    return <AdminsOnly />;
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6">
      {/* Breadcrumb back to /admin/positions */}
      <Button
        variant="ghost"
        size="sm"
        asChild
        data-ocid="library.admin.manager.back_button"
      >
        <Link to="/admin/positions">
          <ArrowLeft className="size-4" />
          Back to positions
        </Link>
      </Button>

      {/* Header */}
      <header
        className="mt-3 flex items-center gap-2"
        data-ocid="library.admin.manager.header"
      >
        <BookOpen className="size-6 text-primary" aria-hidden />
        <h1
          className="font-display text-2xl uppercase leading-none tracking-wide text-foreground"
          data-ocid="library.admin.manager.title"
        >
          {position ? `${position.name} library` : "Manage library"}
        </h1>
      </header>
      <p className="mt-1.5 font-body text-sm text-muted-foreground">
        Manage the categories and items in this position&rsquo;s training
        library.
      </p>

      {/* Body: two-pane on sm+, stacked on mobile */}
      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <CategoryList
          positionId={positionId}
          categories={orderedCategories}
          isLoading={categoriesLoading}
          selectedCategoryId={selectedCategoryId}
          onSelect={setSelectedCategoryId}
        />

        <ItemsPane positionId={positionId} categoryId={selectedCategoryId} />
      </div>
    </div>
  );
}

/* ------------------------------- Items pane ------------------------------ */

function ItemsPane({
  positionId,
  categoryId,
}: {
  positionId: string;
  categoryId: string | null;
}): ReactElement {
  const { data: items, isLoading } = useItemsByCategory(categoryId ?? "");
  const { reorder, isPending: reorderPending } = useItemReorder(
    categoryId ?? "",
  );

  const orderedItems = useMemo<LibraryItem[]>(
    () =>
      [...(items ?? [])].sort(
        (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
      ),
    [items],
  );

  if (!categoryId) {
    return <NoCategorySelected />;
  }

  const newTo = `/admin/positions/${positionId}/library/${categoryId}/item/new`;

  return (
    <section data-ocid="library.admin.item.section">
      <div className="flex items-center justify-between gap-3">
        <h3
          className="font-heading text-sm uppercase tracking-wider text-muted-foreground"
          data-ocid="library.admin.item.heading"
        >
          Items
        </h3>
        <Button size="sm" asChild data-ocid="library.admin.item.add_button">
          <Link to={newTo}>
            <Plus />
            Add item
          </Link>
        </Button>
      </div>

      <div className="mt-3">
        {isLoading ? (
          <ItemsSkeleton />
        ) : orderedItems.length === 0 ? (
          <ItemsEmptyState newTo={newTo} />
        ) : (
          <ul
            className="flex flex-col gap-2"
            data-ocid="library.admin.item.list"
          >
            {orderedItems.map((item, index) => (
              <ItemListItem
                key={item.id}
                item={item}
                index={index}
                total={orderedItems.length}
                positionId={positionId}
                categoryId={categoryId}
                onReorder={(i, dir) => reorder(orderedItems, i, dir)}
                reorderPending={reorderPending}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function NoCategorySelected(): ReactElement {
  return (
    <section data-ocid="library.admin.item.section">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-heading text-sm uppercase tracking-wider text-muted-foreground">
          Items
        </h3>
      </div>
      <div
        className="mt-3 flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border bg-card px-6 py-10 text-center"
        data-ocid="library.admin.item.empty_state"
      >
        <Package className="size-8 text-muted-foreground" aria-hidden />
        <div>
          <p className="font-heading text-sm uppercase tracking-wide text-foreground">
            Select a category
          </p>
          <p className="mt-1 font-body text-sm text-muted-foreground">
            Choose a category on the left to manage its items.
          </p>
        </div>
      </div>
    </section>
  );
}

function ItemsEmptyState({ newTo }: { newTo: string }): ReactElement {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border bg-card px-6 py-10 text-center"
      data-ocid="library.admin.item.empty_state"
    >
      <div className="flex size-10 items-center justify-center rounded-full bg-nav text-primary">
        <Plus />
      </div>
      <div>
        <p className="font-heading text-sm uppercase tracking-wide text-foreground">
          No items yet
        </p>
        <p className="mt-1 font-body text-sm text-muted-foreground">
          Add the first item to this category.
        </p>
      </div>
      <Button
        size="sm"
        asChild
        data-ocid="library.admin.item.empty_state.add_button"
      >
        <Link to={newTo}>
          <Plus />
          Add item
        </Link>
      </Button>
    </div>
  );
}

function ItemsSkeleton(): ReactElement {
  return (
    <ul
      className="flex flex-col gap-2"
      data-ocid="library.admin.item.loading_state"
      aria-hidden
    >
      {["s1", "s2", "s3"].map((k) => (
        <li
          key={k}
          className="flex items-center gap-3 rounded-md border border-border bg-library-card py-2.5"
        >
          <Skeleton className="h-12 w-9 shrink-0 rounded-none" />
          <Skeleton className="size-10 shrink-0 rounded-md" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-8 w-24" />
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------- Access gate ----------------------------- */

function AdminsOnly(): ReactElement {
  return (
    <div
      className="mx-auto flex w-full max-w-3xl flex-col items-center justify-center gap-4 px-4 py-20 text-center"
      data-ocid="library.admin.manager.admins_only"
    >
      <div className="flex size-14 items-center justify-center rounded-full bg-nav text-primary">
        <Lock />
      </div>
      <div>
        <h2 className="font-display text-2xl uppercase tracking-wide text-foreground">
          Admins only
        </h2>
        <p className="mt-1.5 font-body text-sm text-muted-foreground">
          You need an admin role to manage this position&rsquo;s library.
        </p>
      </div>
      <Button
        asChild
        variant="default"
        data-ocid="library.admin.manager.go_positions_button"
      >
        <Link to="/admin/positions">Back to positions</Link>
      </Button>
    </div>
  );
}
