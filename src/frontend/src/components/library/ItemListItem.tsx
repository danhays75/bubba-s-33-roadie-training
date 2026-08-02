import { SeasonalBadge } from "@/components/library/SeasonalBadge";
import { cn } from "@/lib/utils";
import type { LibraryItem } from "@/types/foundation";
import { Link } from "@tanstack/react-router";
import { Star } from "lucide-react";
import type { ReactElement } from "react";

/**
 * A numbered priority row in a category's item list.
 *
 * Patriotic roadhouse treatment — mirrors the Orientation priority
 * card pattern: a tone-colored top stripe (red / blue / gold), a big
 * Anton index numeral on a navy backdrop, a gold star accent, an
 * Oswald uppercase title, a Barlow tag preview, and the SeasonalBadge
 * when the item is seasonal. The thumbnail (item.photo) renders in a
 * navy frame; falls back to an Anton initial in the tone color.
 *
 * Clicking navigates to the recipe card / item detail route unchanged.
 */
type PriorityTone = "red" | "blue" | "gold";

export function ItemListItem({
  item,
  positionId,
  categoryId,
  index,
  tone,
}: {
  item: LibraryItem;
  positionId: string;
  categoryId: string;
  index: number;
  tone: PriorityTone;
}): ReactElement {
  const to = `/position/${positionId}/library/${categoryId}/item/${item.id}`;
  const initial = item.title.trim().charAt(0).toUpperCase() || "?";
  // 1-based Anton numeral — matches the Orientation priority card's
  // big-number treatment.
  const numeral = String(index + 1);

  return (
    <li className="orientation-detail-item-row">
      <Link
        to={to}
        className={cn(
          "orientation-detail-item-card group",
          tone === "red" ? "is-red" : tone === "blue" ? "is-blue" : "is-gold",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        )}
        data-ocid={`library.item.row.${index + 1}`}
        aria-label={`Open ${item.title}`}
      >
        {/* Numeral column — gold star + big Anton index numeral on navy */}
        <div className="orientation-detail-item-number-col" aria-hidden>
          <div className="flex flex-col items-center gap-1">
            <Star
              className="orientation-detail-item-star size-3"
              fill="currentColor"
            />
            <span className="orientation-detail-item-number text-4xl sm:text-5xl">
              {numeral}
            </span>
          </div>
        </div>

        {/* Body column — thumbnail + title + tag preview + seasonal */}
        <div className="orientation-detail-item-body">
          {/* Thumbnail or fallback initial on a navy backdrop */}
          <div className="orientation-detail-item-thumb" aria-hidden>
            {item.photo ? (
              <img
                src={item.photo}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <span className="orientation-detail-item-thumb-initial text-xl">
                {initial}
              </span>
            )}
          </div>

          {/* Title + tag preview */}
          <div className="orientation-detail-item-text">
            <span className="orientation-detail-item-title truncate text-base sm:text-lg">
              {item.title}
            </span>
            {item.tags.length > 0 ? (
              <span className="orientation-detail-item-meta mt-0.5 truncate text-xs">
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
        </div>
      </Link>
    </li>
  );
}
