import { ItemListItem } from "@/components/library/ItemListItem";
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
 * Patriotic roadhouse treatment — mirrors the Orientation page so the
 * Service / Food / Community Priorities detail screens match the
 * onboarding aesthetic the Orientation priority cards link from. The
 * category's tone (red / blue / gold) is derived from its name using the
 * same NAME constants OrientationLayout uses; defaults to red.
 *
 * Empty + loading states follow the patriotic header + numbered card
 * shapes so the loading state reads as the same surface filling in.
 */

/* Category name → tone mapping. Names are matched case-insensitively and
   trimmed so admin-entered variants resolve. Mirrors the NAME constants
   in OrientationLayout so the detail screen's tone matches the teaser
   card the user tapped to get here. */
const SERVICE_PRIORITIES_NAME = "Service Priorities";
const FOOD_PRIORITIES_NAME = "Food Priorities";
const MARKETING_PRIORITIES_NAME = "Marketing / Community Priorities";

type PriorityTone = "red" | "blue" | "gold";

/**
 * Derives the patriotic tone for a category from its name. Service
 * Priorities → red, Food Priorities → blue, Community Priorities → gold.
 * Community uses the same tolerant lookup as OrientationLayout: exact
 * "Marketing / Community Priorities" OR any name containing "community".
 * Defaults to red when the name does not match.
 */
function toneForCategoryName(name: string): PriorityTone {
  const key = name.trim().toLowerCase();
  if (key === SERVICE_PRIORITIES_NAME.trim().toLowerCase()) return "red";
  if (key === FOOD_PRIORITIES_NAME.trim().toLowerCase()) return "blue";
  if (key === MARKETING_PRIORITIES_NAME.trim().toLowerCase()) return "gold";
  if (key.includes("community")) return "gold";
  return "red";
}

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

  const tone: PriorityTone = category
    ? toneForCategoryName(category.name)
    : "red";

  return (
    <div
      className="orientation-detail-page mx-auto w-full max-w-3xl px-4 py-6"
      data-ocid="library.category.detail.page"
    >
      <BackToPosition positionId={positionId} />

      {/* Category header */}
      <header className="mt-4" data-ocid="library.category.header">
        {categoryLoading ? (
          <CategoryHeaderSkeleton />
        ) : notFound || !category ? (
          <CategoryNotFound positionId={positionId} />
        ) : (
          <PatrioticHeader category={category} tone={tone} />
        )}
      </header>

      {/* Item list */}
      {categoryLoading || notFound ? null : itemsLoading ? (
        <ItemListSkeleton />
      ) : items.length === 0 ? (
        <EmptyItems />
      ) : (
        <ul
          className="orientation-detail-item-list mt-5 flex flex-col gap-3"
          data-ocid="library.item.list"
        >
          {items.map((item, index) => (
            <ItemListItem
              key={item.id}
              item={item}
              positionId={positionId}
              categoryId={categoryId}
              index={index}
              tone={tone}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

/* -------------------------------- Header -------------------------------- */

/**
 * Patriotic category header — tri-stripe top edge, Anton category-name
 * headline, optional Pacifico script flourish, flag-bar underline.
 * Optional cover photo renders above the header as a banner. Mirrors
 * the Orientation hero's tri-stripe + Anton + flag-bar pattern on a
 * smaller, card-mounted scale.
 */
function PatrioticHeader({
  category,
  tone,
}: {
  category: { name: string; coverPhoto: string | null };
  tone: PriorityTone;
}): ReactElement {
  return (
    <>
      {category.coverPhoto ? (
        <div
          className="orientation-detail-cover mb-4 max-h-60 sm:max-h-80"
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

      <div className="orientation-detail-header">
        <div
          className="orientation-detail-tri-stripe"
          aria-hidden
          data-ocid="library.category.tri_stripe"
        >
          <span />
          <span />
          <span />
        </div>

        <div className="px-5 py-6 sm:px-7 sm:py-8">
          <p
            className="orientation-detail-flourish text-xl sm:text-2xl"
            data-ocid="library.category.flourish"
          >
            {tone === "red"
              ? "Service"
              : tone === "blue"
                ? "Food"
                : tone === "gold"
                  ? "Community"
                  : "Priorities"}
          </p>
          <h1
            className="orientation-detail-headline mt-1 text-4xl sm:text-5xl"
            data-ocid="library.category.name"
          >
            {category.name}
          </h1>
          <div
            className="orientation-detail-flag-bar mt-4"
            aria-hidden
            data-ocid="library.category.flag_bar"
          >
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>
    </>
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
    <Link
      to={to}
      className="orientation-detail-back focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      data-ocid="library.category.back"
      aria-label="Back to position"
    >
      <ArrowLeft className="size-4" aria-hidden />
      Back to position
    </Link>
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
      className="orientation-detail-not-found"
      data-ocid="library.category.not_found"
    >
      <div>
        <h1 className="orientation-detail-not-found-title text-2xl">
          Category not found
        </h1>
        <p className="orientation-detail-not-found-body mt-2 text-base">
          This category doesn&rsquo;t exist or may have been removed.
        </p>
      </div>
      <Link
        to={to}
        className="orientation-detail-back focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        data-ocid="library.category.go_back_button"
      >
        Back to position
      </Link>
    </div>
  );
}

function EmptyItems(): ReactElement {
  return (
    <div
      className="orientation-detail-empty mt-5"
      data-ocid="library.item.empty_state"
    >
      <PackageOpen className="size-8 text-patriotic-gold" aria-hidden />
      <div>
        <p className="orientation-detail-empty-title text-base">No items yet</p>
        <p className="orientation-detail-empty-body mt-1 text-sm">
          An admin can add items to this category. Once they exist, you&rsquo;ll
          see them here.
        </p>
      </div>
    </div>
  );
}

function CategoryHeaderSkeleton(): ReactElement {
  return (
    <div
      className="orientation-detail-header-skeleton"
      aria-hidden
      data-ocid="library.category.header_skeleton"
    >
      <div className="orientation-detail-tri-stripe">
        <span />
        <span />
        <span />
      </div>
      <div className="px-5 py-6 sm:px-7 sm:py-8">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="mt-2 h-10 w-2/3" />
        <Skeleton className="mt-4 h-1 w-40" />
      </div>
    </div>
  );
}

function ItemListSkeleton(): ReactElement {
  return (
    <ul
      className="mt-5 flex flex-col gap-3"
      data-ocid="library.item.loading_state"
      aria-hidden
    >
      {["s1", "s2", "s3", "s4"].map((k) => (
        <li key={k} className="orientation-detail-item-skeleton h-[5.5rem]">
          <div className="orientation-detail-item-skeleton-num" />
          <Skeleton className="m-4 flex-1" />
        </li>
      ))}
    </ul>
  );
}
