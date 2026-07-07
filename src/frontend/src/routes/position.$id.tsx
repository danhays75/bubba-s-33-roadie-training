import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useBackend } from "@/hooks/useBackend";
import { useCategoriesByPosition, useSearchLibrary } from "@/hooks/useLibrary";
import { useMyAssignments } from "@/hooks/useMyAssignments";
import { cn } from "@/lib/utils";
import type {
  Category,
  LibraryItem,
  Position,
  StatusTone,
} from "@/types/foundation";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, BookOpen, Heart, Library, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { ReactElement } from "react";

/**
 * Position Detail — the per-position Library.
 *
 * Reads the position id from the route params, fetches the position via the
 * backend getPosition method (translating the string id to bigint), and shows
 * the position header (cover photo, name, StatusBadge, description) followed
 * by the Library: a position-scoped search box and a category tile grid.
 *
 * When the search box has text, the page shows matching items as a flat list
 * (via useSearchLibrary). When the search is empty, it shows the category
 * tile grid (via useCategoriesByPosition). Clicking a category navigates to
 * the category detail route (built in the pages wave).
 */

interface PositionDetailPageProps {
  /** Route param: the position id as a string (translated to bigint at call). */
  positionId: string;
}

/** Route component. Reads the position id from TanStack Router params. */
export function PositionDetailRoute(): ReactElement {
  const { id } = useParams({ strict: false });
  return <PositionDetailPage positionId={String(id ?? "")} />;
}

export function PositionDetailPage({
  positionId,
}: PositionDetailPageProps): ReactElement {
  const { actor, isFetching } = useBackend();
  const { data: assignments } = useMyAssignments();

  const positionQuery = useQuery<Position | null>({
    queryKey: ["position", positionId],
    queryFn: async () => {
      if (!actor) return null;
      const result = (await actor.getPosition(BigInt(positionId))) as
        | Position
        | null
        | undefined;
      return result ?? null;
    },
    enabled: !!actor && !isFetching && !!positionId,
  });

  const position = positionQuery.data ?? null;
  const isLoading = positionQuery.isLoading || (isFetching && !actor);
  const notFound = !isLoading && !position;

  if (isLoading) {
    return <PositionDetailSkeleton />;
  }

  if (notFound) {
    return <PositionNotFound />;
  }

  // Determine the signed-in user's status for this position.
  const assignment = assignments?.find((a) => a.positionId === positionId);
  const tone: StatusTone = assignment
    ? assignment.status === "certified"
      ? "certified"
      : "inTraining"
    : "notStarted";

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <BackLink />

      <article className="mt-4">
        {position?.coverPhoto ? (
          <div
            className="w-full overflow-hidden rounded-md border border-border bg-card max-h-60 sm:max-h-80"
            data-ocid="position.cover_photo"
          >
            <img
              src={position.coverPhoto}
              alt={position.name}
              className="h-60 w-full object-cover sm:h-80"
              loading="lazy"
            />
          </div>
        ) : null}

        <header className="mt-4 flex flex-col gap-3">
          <h1
            className="font-heading text-3xl uppercase tracking-wide text-foreground sm:text-4xl"
            data-ocid="position.name"
          >
            {position?.name}
          </h1>
          <StatusBadge tone={tone} />
        </header>

        {position?.description ? (
          <p
            className="mt-4 font-body text-base leading-relaxed text-muted-foreground"
            data-ocid="position.description"
          >
            {position.description}
          </p>
        ) : null}

        <LibrarySection positionId={positionId} positionName={position?.name} />
      </article>
    </div>
  );
}

/* ------------------------------- Library -------------------------------- */

function LibrarySection({
  positionId,
  positionName,
}: {
  positionId: string;
  positionName?: string;
}): ReactElement {
  const [searchText, setSearchText] = useState("");
  const trimmed = searchText.trim();
  const isSearching = trimmed.length > 0;

  const categoriesQuery = useCategoriesByPosition(positionId);
  const searchQuery = useSearchLibrary(positionId, trimmed);

  const categories = useMemo(
    () =>
      [...(categoriesQuery.data ?? [])].sort(
        (a, b) => a.sortOrder - b.sortOrder,
      ),
    [categoriesQuery.data],
  );

  const heartCategory = useMemo(
    () =>
      (categoriesQuery.data ?? []).find(
        (c) => c.name === "Service with HEART",
      ) ?? null,
    [categoriesQuery.data],
  );

  return (
    <section className="mt-8" data-ocid="library.section">
      <div className="flex items-center gap-2">
        <Library className="size-5 text-primary" aria-hidden />
        <h2
          className="font-heading text-xl uppercase tracking-wide text-foreground"
          data-ocid="library.title"
        >
          {positionName ? `${positionName} Library` : "Library"}
        </h2>
      </div>

      {heartCategory ? (
        <HeartEntryButton
          positionId={positionId}
          categoryId={heartCategory.id}
        />
      ) : null}

      <SearchBox value={searchText} onChange={setSearchText} />

      {isSearching ? (
        <SearchResults
          query={searchQuery}
          positionId={positionId}
          searchText={trimmed}
        />
      ) : (
        <CategoryGrid
          categories={categories}
          isLoading={categoriesQuery.isLoading}
          positionId={positionId}
        />
      )}
    </section>
  );
}

/**
 * Prominent "Service with HEART" entry button. Shown only when the
 * position has a category named exactly "Service with HEART". Links to
 * the branded showcase route /position/$id/heart/$categoryId.
 */
function HeartEntryButton({
  positionId,
  categoryId,
}: {
  positionId: string;
  categoryId: string;
}): ReactElement {
  const to = `/position/${positionId}/heart/${categoryId}`;
  return (
    <Link
      to={to}
      className={cn(
        "mt-4 flex items-center gap-3 rounded-md bg-primary px-4 py-3",
        "transition-smooth hover:bg-primary-hover",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      )}
      data-ocid="heart.entry_button"
      aria-label="Open Service with HEART showcase"
    >
      <Heart className="size-5 text-primary-foreground" aria-hidden />
      <span className="flex flex-1 flex-col">
        <span className="font-display text-lg uppercase leading-none tracking-wide text-primary-foreground">
          Service with HEART
        </span>
        <span className="mt-0.5 font-body text-xs text-primary-foreground/80">
          The five pillars of legendary service
        </span>
      </span>
      <span
        className="font-heading text-xs uppercase tracking-wider text-primary-foreground/80"
        aria-hidden
      >
        Open
      </span>
    </Link>
  );
}

/** Position-scoped search box. Border-only, red focus ring. */
function SearchBox({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}): ReactElement {
  return (
    <div className="relative mt-4" data-ocid="library.search">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search this position's library…"
        aria-label="Search this position's library"
        data-ocid="library.search_input"
        className={cn(
          "w-full rounded-md border border-border bg-card py-2.5 pl-10 pr-3",
          "font-body text-sm text-foreground placeholder:text-muted-foreground",
          "transition-colors duration-200",
          "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background",
        )}
      />
    </div>
  );
}

/* --------------------------- Category grid ------------------------------ */

function CategoryGrid({
  categories,
  isLoading,
  positionId,
}: {
  categories: Category[];
  isLoading: boolean;
  positionId: string;
}): ReactElement {
  if (isLoading) {
    return <CategoryGridSkeleton />;
  }

  if (categories.length === 0) {
    return <EmptyLibrary />;
  }

  return (
    <div
      className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2"
      data-ocid="library.category_grid"
    >
      {categories.map((category, index) => (
        <CategoryTile
          key={category.id}
          category={category}
          positionId={positionId}
          index={index}
        />
      ))}
    </div>
  );
}

function CategoryTile({
  category,
  positionId,
  index,
}: {
  category: Category;
  positionId: string;
  index: number;
}): ReactElement {
  const initial = category.name.trim().charAt(0).toUpperCase() || "?";
  const to = `/position/${positionId}/library/${category.id}`;

  return (
    <Link
      to={to}
      className={cn(
        "group flex items-stretch gap-3 rounded-md bg-category-tile border-navy-edge",
        "transition-smooth hover:border-primary/60",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      )}
      data-ocid={`library.category.tile.${index + 1}`}
      aria-label={`Open ${category.name} category`}
    >
      {/* Cover photo or fallback initial */}
      <div
        className="flex size-16 shrink-0 items-center justify-center overflow-hidden bg-nav"
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
          <span className="font-display text-2xl uppercase text-foreground">
            {initial}
          </span>
        )}
      </div>

      {/* Name + sort numeral */}
      <div className="flex min-w-0 flex-1 flex-col justify-center pr-3">
        <span
          className="font-heading text-xs uppercase tracking-wider text-muted-foreground"
          aria-hidden
        >
          {String(index + 1).padStart(2, "0")}
        </span>
        <h3 className="truncate font-heading text-lg uppercase leading-tight tracking-wide text-category-tile">
          {category.name}
        </h3>
      </div>
    </Link>
  );
}

function CategoryGridSkeleton(): ReactElement {
  return (
    <div
      className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2"
      data-ocid="library.loading_state"
      aria-hidden
    >
      {["s1", "s2", "s3", "s4"].map((k) => (
        <div
          key={k}
          className="flex items-stretch gap-3 rounded-md bg-category-tile border-navy-edge"
        >
          <Skeleton className="size-16 shrink-0 rounded-none" />
          <div className="flex flex-1 flex-col justify-center gap-2 py-3 pr-3">
            <Skeleton className="h-3 w-8" />
            <Skeleton className="h-5 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyLibrary(): ReactElement {
  return (
    <div
      className="mt-4 flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border bg-card px-6 py-12 text-center"
      data-ocid="library.empty_state"
    >
      <BookOpen className="size-8 text-muted-foreground" aria-hidden />
      <div>
        <p className="font-heading text-base uppercase tracking-wide text-foreground">
          No categories yet
        </p>
        <p className="mt-1 max-w-xs font-body text-sm text-muted-foreground">
          An admin can add categories and items to this position&rsquo;s
          library. Once they exist, you&rsquo;ll see them here.
        </p>
      </div>
    </div>
  );
}

/* ----------------------------- Search results --------------------------- */

function SearchResults({
  query,
  positionId,
  searchText,
}: {
  query: ReturnType<typeof useSearchLibrary>;
  positionId: string;
  searchText: string;
}): ReactElement {
  if (query.isLoading) {
    return (
      <div
        className="mt-4 flex flex-col gap-2"
        data-ocid="library.search.loading_state"
        aria-hidden
      >
        {["s1", "s2", "s3"].map((k) => (
          <Skeleton key={k} className="h-14 w-full rounded-md" />
        ))}
      </div>
    );
  }

  const items = query.data ?? [];

  if (items.length === 0) {
    return (
      <div
        className="mt-4 flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-card px-6 py-10 text-center"
        data-ocid="library.search.empty_state"
      >
        <Search className="size-6 text-muted-foreground" aria-hidden />
        <p className="font-heading text-sm uppercase tracking-wide text-foreground">
          No matches
        </p>
        <p className="font-body text-sm text-muted-foreground">
          Nothing in this position&rsquo;s library matches &ldquo;{searchText}
          &rdquo;.
        </p>
      </div>
    );
  }

  return (
    <ul className="mt-4 flex flex-col gap-2" data-ocid="library.search.results">
      {items.map((item, index) => (
        <SearchResultRow
          key={item.id}
          item={item}
          positionId={positionId}
          index={index}
        />
      ))}
    </ul>
  );
}

function SearchResultRow({
  item,
  positionId,
  index,
}: {
  item: LibraryItem;
  positionId: string;
  index: number;
}): ReactElement {
  const to = `/position/${positionId}/library/${item.categoryId}/item/${item.id}`;
  return (
    <li>
      <Link
        to={to}
        className={cn(
          "flex items-center gap-3 rounded-md border border-border bg-card p-3",
          "transition-smooth hover:border-primary/60",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        )}
        data-ocid={`library.search.item.${index + 1}`}
      >
        <div
          className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-nav"
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
            <span className="font-display text-xl uppercase text-foreground">
              {item.title.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-heading text-base uppercase leading-tight tracking-wide text-foreground">
            {item.title}
          </span>
          {item.tags.length > 0 ? (
            <span className="mt-0.5 truncate font-body text-xs text-muted-foreground">
              {item.tags.join(" · ")}
            </span>
          ) : null}
        </div>
        {item.seasonal ? (
          <span
            className="shrink-0 bg-seasonal px-2 py-0.5 font-heading text-[0.6rem] uppercase tracking-wider text-seasonal-foreground"
            data-ocid={`library.search.seasonal_badge.${index + 1}`}
          >
            Seasonal
          </span>
        ) : null}
      </Link>
    </li>
  );
}

/* ------------------------------- Chrome --------------------------------- */

/** Back button linking to the home grid (client-side nav). */
function BackLink(): ReactElement {
  return (
    <Button variant="ghost" size="sm" asChild data-ocid="position.back_button">
      <Link to="/">
        <ArrowLeft className="size-4" />
        Back to positions
      </Link>
    </Button>
  );
}

/** Not-found state with a link home. */
function PositionNotFound(): ReactElement {
  return (
    <div
      className="mx-auto flex w-full max-w-3xl flex-col items-start gap-4 px-4 py-16"
      data-ocid="position.not_found"
    >
      <BackLink />
      <div className="mt-4">
        <h1 className="font-heading text-3xl uppercase tracking-wide text-foreground">
          Position not found
        </h1>
        <p className="mt-2 font-body text-base text-muted-foreground">
          This position doesn&rsquo;t exist or may have been removed.
        </p>
      </div>
      <Button asChild variant="default" data-ocid="position.go_home_button">
        <Link to="/">Go to positions</Link>
      </Button>
    </div>
  );
}

/** Loading skeleton shown while the position is being fetched. */
function PositionDetailSkeleton(): ReactElement {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <Skeleton className="h-8 w-36" />
      <Skeleton className="mt-4 aspect-[16/9] w-full rounded-md" />
      <Skeleton className="mt-4 h-10 w-2/3" />
      <Skeleton className="mt-3 h-6 w-28" />
      <Skeleton className="mt-4 h-20 w-full" />
      <Skeleton className="mt-8 h-6 w-40" />
      <Skeleton className="mt-4 h-10 w-full" />
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {["s1", "s2", "s3", "s4"].map((k) => (
          <Skeleton key={k} className="h-20 w-full rounded-md" />
        ))}
      </div>
    </div>
  );
}

export default PositionDetailPage;
