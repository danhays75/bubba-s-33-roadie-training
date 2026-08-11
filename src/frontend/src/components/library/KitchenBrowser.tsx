import { QueryErrorState } from "@/components/QueryErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCategoriesByPosition,
  useItemsByCategory,
} from "@/hooks/useLibrary";
import { cn } from "@/lib/utils";
import type { Category, LibraryItem } from "@/types/foundation";
import { Link } from "@tanstack/react-router";
import { ChefHat, PackageOpen, Search, SearchX } from "lucide-react";
import {
  type KeyboardEvent,
  type ReactElement,
  useEffect,
  useMemo,
  useState,
} from "react";

/**
 * KitchenBrowser — the industrial KDS-style recipe browser for a kitchen
 * position. Replaces the placeholder stub.
 *
 * Owns its own data fetching (mirroring OrientationLayout): categories via
 * `useCategoriesByPosition(positionId)` and items per category via
 * `useItemsByCategory`, flattened into one list. Only items with a
 * `foodRecipe` are shown — beverage/plain cards are filtered out.
 *
 * Filters:
 *   1. Station chips across the top — distinct `foodRecipe.station` values.
 *      Falls back to the position's category names when no food recipes exist
 *      yet so the bar isn't empty/broken-looking before recipes are loaded.
 *      "All" chip clears the station filter.
 *   2. Menu / Prep toggle — filters by `foodRecipe.kind`. "All" included.
 *   3. Search box — matches recipe title AND any component/ingredient name
 *      (`foodRecipe.components[].item`), case-insensitive. So "cheddar"
 *      surfaces every recipe that uses it.
 *
 * Tiles: plating-photo thumbnail (item.photo) OR a station-colored
 * placeholder for prep recipes (large Anton initial of the title on a
 * station-wash background). Title, station, and menu-section tag (menuBuild)
 * or PREP tag (prep). Tapping a tile navigates to the Food Recipe card via
 * the existing item detail route (mirrors ItemListItem's link pattern).
 *
 * Empty state: no food recipes at all → friendly empty message.
 * No-results state: filters/search produce zero matches → no-results message.
 *
 * Uses the food-* CSS utility classes already in index.css (station chips,
 * Menu/Prep toggle, kitchen browser tile, thumbnail, placeholder).
 * Mobile-first responsive grid.
 */
export function KitchenBrowser({
  positionId,
  positionName,
}: {
  positionId: string;
  positionName: string;
}): ReactElement {
  const categoriesQuery = useCategoriesByPosition(positionId);

  const categories = useMemo(
    () =>
      [...(categoriesQuery.data ?? [])].sort(
        (a, b) => a.sortOrder - b.sortOrder,
      ),
    [categoriesQuery.data],
  );

  // Category lookup by id so each tile can read its category's accentColor.
  // Built from the already-fetched categories array (no extra query). Used to
  // apply a per-category accent color to the tile stripe and station badge
  // when the category has a non-null accentColor; null falls back to the
  // existing station-accent behavior.
  const categoriesById = useMemo<Map<string, Category>>(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );

  // Per-category items state, keyed by category id. Each
  // CategoryItemsFetcher reports up via onItems; the parent merges into
  // this record. Using a single state object keyed by id keeps the
  // aggregation idempotent — a fetcher re-reporting the same data doesn't
  // loop because the state only changes when the array reference changes.
  const [itemsByCategory, setItemsByCategory] = useState<
    Record<string, LibraryItem[]>
  >({});
  const [loadingByCategory, setLoadingByCategory] = useState<
    Record<string, boolean>
  >({});
  const [errorByCategory, setErrorByCategory] = useState<
    Record<string, unknown>
  >({});

  const allItems = useMemo<LibraryItem[]>(() => {
    const out: LibraryItem[] = [];
    for (const c of categories) {
      const arr = itemsByCategory[c.id];
      if (arr) for (const item of arr) out.push(item);
    }
    return out;
  }, [categories, itemsByCategory]);

  // Only items that carry a food recipe are shown in the kitchen browser.
  const foodItems = useMemo(
    () => allItems.filter((i) => i.foodRecipe !== null),
    [allItems],
  );

  const anyLoading = useMemo(
    () =>
      categories.length === 0
        ? false
        : categories.some((c) => loadingByCategory[c.id] !== false),
    [categories, loadingByCategory],
  );

  const firstError = useMemo(() => {
    for (const c of categories) {
      const e = errorByCategory[c.id];
      if (e) return e;
    }
    return null;
  }, [categories, errorByCategory]);

  // --- Filter state ---------------------------------------------------------
  const [stationFilter, setStationFilter] = useState<string | "all">("all");
  const [kindFilter, setKindFilter] = useState<"all" | "menuBuild" | "prep">(
    "all",
  );
  const [searchText, setSearchText] = useState("");

  // Station chips: distinct foodRecipe.station values across all food-recipe
  // items. If NO food recipes exist yet, fall back to the position's category
  // names as chip labels so the filter bar isn't empty/broken-looking before
  // recipes are loaded.
  const stationChips = useMemo<string[]>(() => {
    if (foodItems.length > 0) {
      const seen = new Set<string>();
      const out: string[] = [];
      for (const item of foodItems) {
        const station = item.foodRecipe?.station;
        if (station && !seen.has(station)) {
          seen.add(station);
          out.push(station);
        }
      }
      // Preserve first-seen order (stable across re-renders).
      return out;
    }
    // Fallback: position's category names.
    return categories.map((c) => c.name);
  }, [foodItems, categories]);

  // Filtered + searched list. Memoized so the grid doesn't recompute on
  // every keystroke beyond the dependency array.
  const filteredItems = useMemo<LibraryItem[]>(() => {
    const q = searchText.trim().toLowerCase();
    return foodItems.filter((item) => {
      const fr = item.foodRecipe;
      if (!fr) return false;
      if (stationFilter !== "all" && fr.station !== stationFilter) return false;
      if (kindFilter !== "all" && fr.kind !== kindFilter) return false;
      if (q.length > 0) {
        const inTitle = item.title.toLowerCase().includes(q);
        const inComponents = fr.components.some((c) =>
          c.item.toLowerCase().includes(q),
        );
        if (!inTitle && !inComponents) return false;
      }
      return true;
    });
  }, [foodItems, stationFilter, kindFilter, searchText]);

  const hasFoodRecipes = foodItems.length > 0;
  const hasFiltersActive =
    stationFilter !== "all" ||
    kindFilter !== "all" ||
    searchText.trim().length > 0;

  return (
    <section className="mt-8" data-ocid="kitchen.browser.section">
      <div className="flex items-center gap-2">
        <ChefHat className="size-5 text-primary" aria-hidden />
        <h2
          className="font-heading text-xl uppercase tracking-wide text-foreground"
          data-ocid="kitchen.browser.title"
        >
          {positionName ? `${positionName} Kitchen` : "Kitchen"}
        </h2>
      </div>

      {/* One fetcher per category. Rendered as invisible children so each
          one owns a stable useItemsByCategory hook slot. Keyed by category
          id so they remount only when the category set actually changes. */}
      {categories.map((c) => (
        <CategoryItemsFetcher
          key={c.id}
          categoryId={c.id}
          onItems={(items, loading, error) => {
            setItemsByCategory((prev) =>
              prev[c.id] === items ? prev : { ...prev, [c.id]: items },
            );
            setLoadingByCategory((prev) =>
              prev[c.id] === loading ? prev : { ...prev, [c.id]: loading },
            );
            setErrorByCategory((prev) =>
              prev[c.id] === error ? prev : { ...prev, [c.id]: error },
            );
          }}
        />
      ))}

      {categoriesQuery.isLoading ? (
        <KitchenBrowserSkeleton />
      ) : categoriesQuery.isError ? (
        <div className="mt-4" data-ocid="kitchen.browser.error_state">
          <QueryErrorState
            title="Couldn't load the kitchen"
            description="We couldn't load this position's kitchen right now. Please try again."
            error={categoriesQuery.error}
            onRetry={() => void categoriesQuery.refetch()}
          />
        </div>
      ) : anyLoading ? (
        <KitchenBrowserSkeleton />
      ) : firstError ? (
        <div className="mt-4" data-ocid="kitchen.browser.items.error_state">
          <QueryErrorState
            title="Couldn't load items"
            description="We couldn't load some kitchen items right now. Please try again."
            error={firstError}
            onRetry={() => void categoriesQuery.refetch()}
          />
        </div>
      ) : !hasFoodRecipes ? (
        <KitchenBrowserEmpty />
      ) : (
        <>
          <KitchenFilters
            stationChips={stationChips}
            stationFilter={stationFilter}
            onStationChange={setStationFilter}
            kindFilter={kindFilter}
            onKindChange={setKindFilter}
            searchText={searchText}
            onSearchChange={setSearchText}
          />
          {filteredItems.length === 0 ? (
            <KitchenBrowserNoResults
              hasFiltersActive={hasFiltersActive}
              onClear={() => {
                setStationFilter("all");
                setKindFilter("all");
                setSearchText("");
              }}
            />
          ) : (
            <KitchenTileGrid
              items={filteredItems}
              positionId={positionId}
              categoriesById={categoriesById}
            />
          )}
        </>
      )}
    </section>
  );
}

/* ----------------------------- Filters ---------------------------------- */

function KitchenFilters({
  stationChips,
  stationFilter,
  onStationChange,
  kindFilter,
  onKindChange,
  searchText,
  onSearchChange,
}: {
  stationChips: string[];
  stationFilter: string | "all";
  onStationChange: (s: string | "all") => void;
  kindFilter: "all" | "menuBuild" | "prep";
  onKindChange: (k: "all" | "menuBuild" | "prep") => void;
  searchText: string;
  onSearchChange: (v: string) => void;
}): ReactElement {
  return (
    <div
      className="mt-4 flex flex-col gap-3"
      data-ocid="kitchen.browser.filters"
    >
      {/* Station chips — horizontal scroll on mobile, wrap on larger. */}
      <div
        className="flex gap-2 overflow-x-auto pb-1"
        // biome-ignore lint/a11y/useSemanticElements: filter chip group needs div + role=group for flex layout; fieldset styling would break the chip row
        role="group"
        aria-label="Filter by station"
        data-ocid="kitchen.browser.station_chips"
      >
        <StationChip
          label="All"
          isActive={stationFilter === "all"}
          accentClass="bg-food-station-default"
          onClick={() => onStationChange("all")}
        />
        {stationChips.map((station) => {
          const isActive = stationFilter === station;
          const accent = stationAccentClass(station);
          return (
            <StationChip
              key={station}
              label={station}
              isActive={isActive}
              accentClass={accent.bg}
              onClick={() => onStationChange(station)}
            />
          );
        })}
      </div>

      {/* Menu / Prep toggle + search box. Toggle is a segmented control;
          search is a border-only input with a red focus ring (mirrors the
          Library SearchBox). */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          className="food-layout-toggle"
          // biome-ignore lint/a11y/useSemanticElements: filter chip group needs div + role=group for flex layout; fieldset styling would break the chip row
          role="group"
          aria-label="Filter by recipe kind"
          data-ocid="kitchen.browser.kind_toggle"
        >
          <KindToggleSegment
            label="All"
            isActive={kindFilter === "all"}
            onClick={() => onKindChange("all")}
          />
          <KindToggleSegment
            label="Menu"
            isActive={kindFilter === "menuBuild"}
            onClick={() => onKindChange("menuBuild")}
          />
          <KindToggleSegment
            label="Prep"
            isActive={kindFilter === "prep"}
            onClick={() => onKindChange("prep")}
          />
        </div>

        <KitchenSearchBox value={searchText} onChange={onSearchChange} />
      </div>
    </div>
  );
}

function StationChip({
  label,
  isActive,
  accentClass,
  onClick,
}: {
  label: string;
  isActive: boolean;
  accentClass: string;
  onClick: () => void;
}): ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={cn(
        "food-station-chip shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        isActive && accentClass,
        isActive && "border-transparent text-primary-foreground",
      )}
      data-ocid={`kitchen.browser.station_chip.${label.toLowerCase().replace(/\s+/g, "_")}`}
    >
      {label}
    </button>
  );
}

function KindToggleSegment({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}): ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={cn(
        "food-layout-toggle-segment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        isActive && "is-active",
      )}
      data-ocid={`kitchen.browser.kind_toggle.${label.toLowerCase()}`}
    >
      {label}
    </button>
  );
}

function KitchenSearchBox({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}): ReactElement {
  return (
    <div className="relative w-full sm:w-72" data-ocid="kitchen.browser.search">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
          // Prevent form submission if a future wrapper nests this in a form.
          if (e.key === "Enter") e.preventDefault();
        }}
        placeholder="Search recipes or ingredients…"
        aria-label="Search kitchen recipes by title or ingredient"
        data-ocid="kitchen.browser.search_input"
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

/* ------------------------------- Tile grid ------------------------------ */

function KitchenTileGrid({
  items,
  positionId,
  categoriesById,
}: {
  items: LibraryItem[];
  positionId: string;
  categoriesById: Map<string, Category>;
}): ReactElement {
  return (
    <ul
      className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      data-ocid="kitchen.browser.tile_grid"
    >
      {items.map((item, index) => (
        <KitchenTile
          key={item.id}
          item={item}
          positionId={positionId}
          index={index}
          categoryAccent={
            categoriesById.get(item.categoryId)?.accentColor ?? null
          }
        />
      ))}
    </ul>
  );
}

function KitchenTile({
  item,
  positionId,
  index,
  categoryAccent,
}: {
  item: LibraryItem;
  positionId: string;
  index: number;
  categoryAccent: string | null;
}): ReactElement {
  const fr = item.foodRecipe;
  // foodItems are pre-filtered to foodRecipe !== null, but guard for TS.
  if (!fr) return <li />;

  const accent = stationAccentClass(fr.station);
  const initial = item.title.trim().charAt(0).toUpperCase() || "?";
  const isPrep = fr.kind === "prep";
  // Navigation target mirrors ItemListItem: the existing item detail route
  // that RecipeCardPage renders at. Tapping opens the Food Recipe card.
  const to = `/position/${positionId}/library/${item.categoryId}/item/${item.id}`;

  // When the category has a non-null accentColor, the tile stripe and station
  // badge use that accent via inline backgroundColor (the accent is an
  // arbitrary hex not in the Tailwind palette). When null, the existing
  // station-accent classes drive the colors — no regression.
  const accentStyle = categoryAccent
    ? { backgroundColor: categoryAccent }
    : undefined;

  return (
    <li>
      <Link
        to={to}
        className={cn(
          "food-tile group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        )}
        data-ocid={`kitchen.browser.tile.${index + 1}`}
        aria-label={`Open ${item.title} recipe card`}
      >
        {/* Station/category accent top stripe. Inline backgroundColor takes
            precedence over the station accent.bg class when a category
            accent is set; the class remains as the null-accent fallback. */}
        <div
          className={cn("food-tile-stripe", !categoryAccent && accent.bg)}
          style={accentStyle}
          aria-hidden
        />

        {/* Thumbnail OR station-wash placeholder for prep recipes (or any
            recipe without a plating photo). Large Anton initial of the
            title on a station-wash background, with the station name in
            Oswald uppercase below. */}
        <div className="food-tile-thumb" aria-hidden>
          {item.photo ? (
            <img
              src={item.photo}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className={cn("food-tile-placeholder", accent.wash)}>
              <span className="food-tile-placeholder-initial text-5xl sm:text-6xl">
                {initial}
              </span>
              <span
                className={cn("food-tile-placeholder-station", accent.text)}
              >
                {fr.station}
              </span>
            </div>
          )}
        </div>

        {/* Body — title, station, and menu-section tag (menuBuild) or
            PREP tag (prep). */}
        <div className="flex flex-col gap-1.5 p-3">
          <h3 className="food-tile-title text-sm sm:text-base line-clamp-2">
            {item.title}
          </h3>
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "food-station-badge",
                !categoryAccent && accent.bg,
                !categoryAccent && accent.textOnAccent,
              )}
              style={
                categoryAccent
                  ? {
                      backgroundColor: categoryAccent,
                      color: "#ffffff",
                    }
                  : undefined
              }
              data-ocid={`kitchen.browser.tile.station.${index + 1}`}
            >
              {fr.station}
            </span>
            {isPrep ? (
              <span
                className="food-section-badge"
                data-ocid={`kitchen.browser.tile.prep_tag.${index + 1}`}
              >
                Prep
              </span>
            ) : fr.menuSection ? (
              <span
                className="food-section-badge"
                data-ocid={`kitchen.browser.tile.section_tag.${index + 1}`}
              >
                {fr.menuSection}
              </span>
            ) : null}
          </div>
        </div>
      </Link>
    </li>
  );
}

/* ------------------------------- States --------------------------------- */

function KitchenBrowserEmpty(): ReactElement {
  return (
    <div
      className="mt-4 flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border bg-card px-6 py-12 text-center"
      data-ocid="kitchen.browser.empty_state"
    >
      <PackageOpen className="size-8 text-muted-foreground" aria-hidden />
      <div>
        <p
          className="font-heading text-base uppercase tracking-wide text-foreground"
          data-ocid="kitchen.browser.empty_state.title"
        >
          No food recipes yet
        </p>
        <p className="mt-1 max-w-sm font-body text-sm text-muted-foreground">
          This kitchen&rsquo;s recipe browser is empty. Once an admin adds food
          recipes to this position&rsquo;s library, they&rsquo;ll appear here
          grouped by station.
        </p>
      </div>
    </div>
  );
}

function KitchenBrowserNoResults({
  hasFiltersActive,
  onClear,
}: {
  hasFiltersActive: boolean;
  onClear: () => void;
}): ReactElement {
  return (
    <div
      className="mt-4 flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border bg-card px-6 py-12 text-center"
      data-ocid="kitchen.browser.no_results_state"
    >
      <SearchX className="size-8 text-muted-foreground" aria-hidden />
      <div>
        <p
          className="font-heading text-base uppercase tracking-wide text-foreground"
          data-ocid="kitchen.browser.no_results_state.title"
        >
          No matching recipes
        </p>
        <p className="mt-1 max-w-sm font-body text-sm text-muted-foreground">
          No recipes match the current station, Menu/Prep, or search filters.
          Try adjusting your filters or clearing the search.
        </p>
      </div>
      {hasFiltersActive ? (
        <button
          type="button"
          onClick={onClear}
          className={cn(
            "mt-1 inline-flex items-center rounded-md border border-border bg-card px-3 py-1.5",
            "font-heading text-xs uppercase tracking-wide text-foreground",
            "transition-smooth hover:border-primary/60",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          )}
          data-ocid="kitchen.browser.no_results_state.clear_button"
        >
          Clear filters
        </button>
      ) : null}
    </div>
  );
}

/* ------------------------------- Skeleton ------------------------------- */

function KitchenBrowserSkeleton(): ReactElement {
  return (
    <div
      className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      data-ocid="kitchen.browser.loading_state"
      aria-hidden
    >
      {["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"].map((k) => (
        <div key={k} className="food-tile">
          <Skeleton className="food-tile-stripe rounded-none" />
          <Skeleton className="food-tile-thumb rounded-none" />
          <div className="flex flex-col gap-2 p-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* --------------------- Per-category items fetcher ---------------------- */

/**
 * Per-category items fetcher. Calls useItemsByCategory at a fixed hook
 * position and reports the result up via onItems. Renders nothing — it's
 * a data-only child. The effect guards against redundant reports by
 * comparing against the previous values.
 */
function CategoryItemsFetcher({
  categoryId,
  onItems,
}: {
  categoryId: string;
  onItems: (items: LibraryItem[], loading: boolean, error: unknown) => void;
}): ReactElement | null {
  const q = useItemsByCategory(categoryId);
  const items = q.data ?? [];
  const loading = q.isLoading;
  const error = q.isError ? q.error : null;

  useEffect(() => {
    onItems(items, loading, error);
  }, [items, loading, error, onItems]);

  return null;
}

/* ------------------------- Station accent mapping ---------------------- */

/**
 * Maps a station name to its accent color utility classes.
 *
 * The kitchen browser uses station accent flat fills for chips, tile
 * stripes, badges, and prep-tile placeholders. Station names are
 * normalized to lowercase + trimmed before matching the known stations
 * (grill, fry, pizza, saute/sauté, hotprep/hot prep, coldprep/cold prep,
 * expo). Unknown stations fall back to the brand primary red
 * (food-station-default).
 *
 * Returns:
 *   - bg: the flat fill class (e.g. "bg-food-station-grill")
 *   - wash: the low-opacity placeholder fill class
 *   - text: the station accent text color class (for the placeholder
 *     station name label)
 *   - textOnAccent: the foreground text color class to use ON TOP of the
 *     accent fill (for chips and badges). Some stations (fry, coldprep)
 *     use a dark foreground because their accent is light; the rest use
 *     cream.
 */
interface StationAccent {
  bg: string;
  wash: string;
  text: string;
  textOnAccent: string;
}

function stationAccentClass(station: string): StationAccent {
  const s = station.trim().toLowerCase();
  // Match common spellings/variants.
  if (s === "expo") {
    return {
      bg: "bg-food-station-expo",
      wash: "bg-food-station-expo-wash",
      text: "text-food-station-expo",
      textOnAccent: "text-food-station-expo-fg",
    };
  }
  if (s === "grill") {
    return {
      bg: "bg-food-station-grill",
      wash: "bg-food-station-grill-wash",
      text: "text-food-station-grill",
      textOnAccent: "text-food-station-grill-fg",
    };
  }
  if (s === "fry" || s === "fryer") {
    return {
      bg: "bg-food-station-fry",
      wash: "bg-food-station-fry-wash",
      text: "text-food-station-fry",
      textOnAccent: "text-food-station-fry-fg",
    };
  }
  if (s === "pizza") {
    return {
      bg: "bg-food-station-pizza",
      wash: "bg-food-station-pizza-wash",
      text: "text-food-station-pizza",
      textOnAccent: "text-food-station-pizza-fg",
    };
  }
  if (s === "saute" || s === "sauté" || s === "saut\u00e9") {
    return {
      bg: "bg-food-station-saute",
      wash: "bg-food-station-saute-wash",
      text: "text-food-station-saute",
      textOnAccent: "text-food-station-saute-fg",
    };
  }
  if (s === "hotprep" || s === "hot prep" || s === "hot-prep") {
    return {
      bg: "bg-food-station-hotprep",
      wash: "bg-food-station-hotprep-wash",
      text: "text-food-station-hotprep",
      textOnAccent: "text-food-station-hotprep-fg",
    };
  }
  if (s === "coldprep" || s === "cold prep" || s === "cold-prep") {
    return {
      bg: "bg-food-station-coldprep",
      wash: "bg-food-station-coldprep-wash",
      text: "text-food-station-coldprep",
      textOnAccent: "text-food-station-coldprep-fg",
    };
  }
  // Default fallback = brand primary red.
  return {
    bg: "bg-food-station-default",
    wash: "bg-food-station-default-wash",
    text: "text-food-station-default",
    textOnAccent: "text-food-station-default-fg",
  };
}

export default KitchenBrowser;
