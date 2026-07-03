import { cn } from "@/lib/utils";
import type { ReactElement } from "react";

/**
 * Seasonal badge for Library items flagged `seasonal: true`.
 *
 * Flat sage fill (bg-seasonal) with dark text (text-seasonal-foreground) and
 * a subtle opacity-only shimmer on the edge. Distinct from the gold
 * in-training StatusBadge — no gradient, no pulse, no gold.
 *
 * Text "SEASONAL" in Oswald (font-heading), uppercase, tight tracking.
 */
export function SeasonalBadge({
  className,
  label = "Seasonal",
}: {
  className?: string;
  label?: string;
}): ReactElement {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border bg-seasonal px-2 py-0.5",
        "border-seasonal text-seasonal-foreground animate-seasonal-shimmer",
        "font-heading text-[0.65rem] font-semibold uppercase tracking-wider",
        "leading-none whitespace-nowrap",
        className,
      )}
      data-ocid="library.seasonal_badge"
    >
      {label}
    </span>
  );
}
