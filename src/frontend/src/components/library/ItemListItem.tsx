import { SeasonalBadge } from "@/components/library/SeasonalBadge";
import { cn } from "@/lib/utils";
import type { LibraryItem } from "@/types/foundation";
import { Link } from "@tanstack/react-router";
import type { ReactElement } from "react";

/**
 * A row in a category's item list. Shows an optional thumbnail (item.photo or
 * a muted placeholder initial), the title in Oswald, and the SeasonalBadge
 * when item.seasonal is true. Clicking navigates to the recipe card route.
 *
 * Follows the PositionTile / SearchResultRow styling cues: dark surface, hard
 * edges, navy thumbnail backdrop, transition-smooth hover.
 */
export function ItemListItem({
  item,
  positionId,
  categoryId,
  index,
}: {
  item: LibraryItem;
  positionId: string;
  categoryId: string;
  index: number;
}): ReactElement {
  const to = `/position/${positionId}/library/${categoryId}/item/${item.id}`;
  const initial = item.title.trim().charAt(0).toUpperCase() || "?";

  return (
    <li>
      <Link
        to={to}
        className={cn(
          "flex items-center gap-3 rounded-md border border-border bg-card p-3",
          "transition-smooth hover:border-primary/60",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        )}
        data-ocid={`library.item.row.${index + 1}`}
        aria-label={`Open ${item.title}`}
      >
        {/* Thumbnail or fallback initial on a navy backdrop */}
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
              {initial}
            </span>
          )}
        </div>

        {/* Title + tag preview */}
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
          <SeasonalBadge
            className="shrink-0"
            // keep a row-scoped marker for deterministic coverage
          />
        ) : null}
      </Link>
    </li>
  );
}
