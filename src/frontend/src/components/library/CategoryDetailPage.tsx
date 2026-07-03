import { ItemListItem } from "@/components/library/ItemListItem";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCategory, useItemsByCategory } from "@/hooks/useLibrary";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, PackageOpen } from "lucide-react";
import { useMemo } from "react";
import type { ReactElement } from "react";

/**
 * Category detail page content — the item list for a single category.
 *
 * Rendered by the /position/$id/library/$categoryId route. Uses
 * useCategory(categoryId) for the header (name + optional cover photo) and
 * useItemsByCategory(categoryId) for the list, sorted by per-parent
 * sortOrder. Breadcrumb links back to the position page (TanStack <Link>).
 *
 * Empty + loading states follow the existing skeleton / EmptyState patterns
 * from the position detail page.
 */
export function CategoryDetailPage({
  positionId,
  categoryId,
}: {
  positionId: string;
  categoryId: string;
}): ReactElement {
  const categoryQuery = useCategory(categoryId);
  const itemsQuery = useItemsByCategory(categoryId);

  const category = categoryQuery.data ?? null;
  const items = useMemo(
    () =>
      [...(itemsQuery.data ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
    [itemsQuery.data],
  );

  const categoryLoading = categoryQuery.isLoading;
  const itemsLoading = itemsQuery.isLoading;
  const notFound = !categoryLoading && !category;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <BackToPosition positionId={positionId} />

      {/* Category header */}
      <header className="mt-4">
        {categoryLoading ? (
          <CategoryHeaderSkeleton />
        ) : notFound ? (
          <CategoryNotFound positionId={positionId} />
        ) : (
          <>
            {category?.coverPhoto ? (
              <div
                className="w-full overflow-hidden rounded-md border border-border bg-card max-h-60 sm:max-h-80"
                data-ocid="library.category.cover_photo"
              >
                <img
                  src={category.coverPhoto}
                  alt={category.name}
                  className="h-60 w-full object-cover sm:h-80"
                  loading="lazy"
                />
              </div>
            ) : null}
            <h1
              className="mt-4 font-heading text-3xl uppercase tracking-wide text-foreground sm:text-4xl"
              data-ocid="library.category.name"
            >
              {category?.name}
            </h1>
          </>
        )}
      </header>

      {/* Item list */}
      {categoryLoading || notFound ? null : itemsLoading ? (
        <ItemListSkeleton />
      ) : items.length === 0 ? (
        <EmptyItems />
      ) : (
        <ul className="mt-5 flex flex-col gap-2" data-ocid="library.item.list">
          {items.map((item, index) => (
            <ItemListItem
              key={item.id}
              item={item}
              positionId={positionId}
              categoryId={categoryId}
              index={index}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

/* -------------------------------- Chrome -------------------------------- */

function BackToPosition({
  positionId,
}: {
  positionId: string;
}): ReactElement {
  const to = `/position/${positionId}`;
  return (
    <Button variant="ghost" size="sm" asChild data-ocid="library.category.back">
      <Link to={to}>
        <ArrowLeft className="size-4" />
        Back to position
      </Link>
    </Button>
  );
}

function CategoryNotFound({
  positionId,
}: {
  positionId: string;
}): ReactElement {
  const to = `/position/${positionId}`;
  return (
    <div
      className="flex flex-col items-start gap-4"
      data-ocid="library.category.not_found"
    >
      <div>
        <h1 className="font-heading text-2xl uppercase tracking-wide text-foreground">
          Category not found
        </h1>
        <p className="mt-2 font-body text-base text-muted-foreground">
          This category doesn&rsquo;t exist or may have been removed.
        </p>
      </div>
      <Button
        asChild
        variant="default"
        data-ocid="library.category.go_back_button"
      >
        <Link to={to}>Back to position</Link>
      </Button>
    </div>
  );
}

function EmptyItems(): ReactElement {
  return (
    <div
      className="mt-5 flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border bg-card px-6 py-12 text-center"
      data-ocid="library.item.empty_state"
    >
      <PackageOpen className="size-8 text-muted-foreground" aria-hidden />
      <div>
        <p className="font-heading text-base uppercase tracking-wide text-foreground">
          No items yet
        </p>
        <p className="mt-1 max-w-xs font-body text-sm text-muted-foreground">
          An admin can add items to this category. Once they exist, you&rsquo;ll
          see them here.
        </p>
      </div>
    </div>
  );
}

function CategoryHeaderSkeleton(): ReactElement {
  return (
    <div aria-hidden>
      <Skeleton className="aspect-[16/9] w-full rounded-md" />
      <Skeleton className="mt-4 h-9 w-1/2" />
    </div>
  );
}

function ItemListSkeleton(): ReactElement {
  return (
    <ul
      className="mt-5 flex flex-col gap-2"
      data-ocid="library.item.loading_state"
      aria-hidden
    >
      {["s1", "s2", "s3", "s4"].map((k) => (
        <Skeleton key={k} className="h-[4.5rem] w-full rounded-md" />
      ))}
    </ul>
  );
}
