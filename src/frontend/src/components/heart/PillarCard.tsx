import { cn } from "@/lib/utils";
import type { LibraryItem } from "@/types/foundation";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import type { ReactElement } from "react";

/**
 * PillarCard — one of the five HEART pillars (Hello, Engage, Arrive,
 * Respond, Thank You).
 *
 * Collapsed by default. Shows:
 *   - A large red first letter (from item.title) in Anton
 *   - The pillar word in Oswald as the title
 *   - The "Timing" detail field as a small navy badge (bg-secondary)
 *
 * Tap to expand and reveal the item's notes rendered as a bulleted list
 * of steps (split notes by newline, one step per line, empty lines
 * ignored). Tap again to collapse.
 *
 * The whole card is a button for accessibility — keyboard users can
 * toggle with Enter/Space, and the chevron rotates to signal state.
 */
export function PillarCard({
  item,
  index,
}: {
  item: LibraryItem;
  index: number;
}): ReactElement {
  const [expanded, setExpanded] = useState(false);

  const firstLetter = item.title.trim().charAt(0).toUpperCase() || "?";
  const timing = item.details.find(
    (d) => d.fieldLabel.trim().toLowerCase() === "timing",
  );
  const steps = item.notes
    ? item.notes
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
    : [];

  return (
    <div
      className="bg-library-card border border-border"
      data-ocid={`heart.pillar.card.${index + 1}`}
    >
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        aria-controls={`heart-pillar-${index + 1}-steps`}
        data-ocid={`heart.pillar.toggle.${index + 1}`}
        className={cn(
          "flex w-full items-center gap-4 px-4 py-4 text-left sm:px-5",
          "transition-smooth hover:border-primary/60",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        )}
      >
        {/* Large red first letter in Anton */}
        <span
          className="font-display text-5xl leading-none text-primary sm:text-6xl"
          aria-hidden
        >
          {firstLetter}
        </span>

        {/* Pillar word + Timing badge */}
        <span className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="font-heading text-xl uppercase tracking-wide text-foreground sm:text-2xl">
            {item.title}
          </span>
          {timing ? (
            <span
              className="inline-flex w-fit bg-secondary px-2 py-0.5 font-heading text-[0.65rem] uppercase tracking-wider text-secondary-foreground"
              data-ocid={`heart.pillar.timing_badge.${index + 1}`}
            >
              {timing.value}
            </span>
          ) : null}
        </span>

        {/* Chevron rotates when expanded */}
        <ChevronDown
          className={cn(
            "size-5 shrink-0 text-muted-foreground transition-transform duration-200",
            expanded && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {/* Steps — bulleted list, revealed on expand */}
      {expanded && steps.length > 0 ? (
        <ul
          id={`heart-pillar-${index + 1}-steps`}
          className="flex flex-col gap-2 border-t border-border px-4 py-4 sm:px-5"
          data-ocid={`heart.pillar.steps.${index + 1}`}
        >
          {steps.map((step, stepIndex) => (
            <li
              key={`step-${stepIndex}-${step.slice(0, 24)}`}
              className="flex gap-2.5 font-body text-sm leading-relaxed text-foreground"
              data-ocid={`heart.pillar.step.${index + 1}.${stepIndex + 1}`}
            >
              <span
                className="mt-2 size-1.5 shrink-0 rounded-full bg-primary"
                aria-hidden
              />
              <span className="min-w-0">{step}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export default PillarCard;
