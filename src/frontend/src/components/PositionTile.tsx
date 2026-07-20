import { StatusBadge } from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import type { Position, StatusTone } from "@/types/foundation";
import { Link } from "@tanstack/react-router";

/**
 * Static placeholder headshot photos for each position, keyed by a slug
 * derived from the position name. These are placeholder Roadie photos —
 * swap in real Roadie photos later by replacing the files in
 * public/assets/positions/ (keep the same filenames). An admin-uploaded
 * `position.coverPhoto` always takes precedence over this fallback.
 */
const POSITION_HEADSHOTS: Record<string, string> = {
  bartender: "/assets/positions/bartender.webp",
  server: "/assets/positions/server.webp",
  host: "/assets/positions/host.webp",
  "server-support": "/assets/positions/server-support.webp",
};

/**
 * Build a stable slug from a position name: lowercase, trim, collapse
 * whitespace/hyphens into a single hyphen. e.g. "Server Support" ->
 * "server-support", "Bartender" -> "bartender".
 */
function positionHeadshotSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, "-");
}

/**
 * A single position tile in the home grid.
 *
 * Dark card (#1E1E1B) with the position name in Oswald and an optional cover
 * photo. The signed-in user's status badge for this position sits on the
 * tile. Tapping navigates to /position/$id.
 *
 * Cover photo precedence: admin-uploaded `position.coverPhoto` wins; otherwise
 * the matching static headshot in /assets/positions/ is used; if no headshot
 * matches, the single-letter placeholder is shown.
 *
 * Mobile-first: full-width on small screens, multi-column on larger.
 */
export function PositionTile({
  position,
  tone,
  index,
}: {
  position: Position;
  tone: StatusTone;
  index: number;
}) {
  const headshot = POSITION_HEADSHOTS[positionHeadshotSlug(position.name)];

  return (
    <Link
      to="/position/$id"
      params={{ id: position.id }}
      className={cn(
        "group relative flex w-full flex-col overflow-hidden",
        "bg-card border border-border text-left",
        "transition-smooth",
        "hover:border-primary focus-visible:border-primary",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "active:translate-y-px",
      )}
      data-ocid={`position.tile.${index + 1}`}
      aria-label={`${position.name} — ${toneLabel(tone)}`}
    >
      {position.coverPhoto ? (
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
          <img
            src={position.coverPhoto}
            alt={`${position.name} Roadie at work`}
            loading="lazy"
            className="size-full object-cover transition-smooth group-hover:opacity-90"
          />
          <div className="absolute inset-0 bg-black/30" aria-hidden />
        </div>
      ) : headshot ? (
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
          <img
            src={headshot}
            alt={`${position.name} Roadie at work`}
            loading="lazy"
            className="size-full object-cover transition-smooth group-hover:opacity-90"
          />
          <div className="absolute inset-0 bg-black/30" aria-hidden />
        </div>
      ) : (
        <div className="relative aspect-[16/9] w-full bg-muted">
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-display text-5xl uppercase leading-none text-muted-foreground/40">
              {position.name.slice(0, 1)}
            </span>
          </div>
        </div>
      )}

      <div className="flex flex-1 items-center justify-between gap-3 px-4 py-3">
        <h3 className="font-heading text-lg font-semibold uppercase leading-tight tracking-wide text-foreground">
          {position.name}
        </h3>
        <StatusBadge tone={tone} />
      </div>
    </Link>
  );
}

function toneLabel(tone: StatusTone): string {
  switch (tone) {
    case "inTraining":
      return "in training";
    case "certified":
      return "certified";
    default:
      return "not started";
  }
}
