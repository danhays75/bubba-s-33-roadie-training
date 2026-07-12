import { cn } from "@/lib/utils";
import type { LibraryItem } from "@/types/foundation";
import { ChevronDown } from "lucide-react";
import type { ReactElement } from "react";

/**
 * PillarCard — one of the five HEART pillars (Hello, Engage, Arrive,
 * Respond, Thank You).
 *
 * Controlled accordion card. The parent (HeartShowcasePage) owns the
 * open state so only ONE pillar is expanded at a time; this component
 * is purely presentational given `expanded` + `onToggle`.
 *
 * Collapsed row (compact):
 *   - Red first letter INLINE in the header row at ~20px (Anton)
 *   - Pillar word in Oswald uppercase
 *   - Small navy Timing badge (bg-secondary) when a Timing detail exists
 *   - Chevron that rotates 180° when expanded
 *
 * Expanded body:
 *   - Steps from item.notes (one per line, empties dropped) rendered as a
 *     NUMBERED list (1, 2, 3...) with the number in red
 *   - The first word/verb of each step is bolded
 *   - Tighter line spacing + slightly smaller body text so steps take
 *     less vertical room and don't wrap awkwardly on phones
 *
 * The whole header is a <button> for accessibility — keyboard users can
 * toggle with Enter/Space, aria-expanded + aria-controls are wired up.
 */
export function PillarCard({
  item,
  index,
  expanded,
  onToggle,
}: {
  item: LibraryItem;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}): ReactElement {
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
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={`heart-pillar-${index + 1}-steps`}
        data-ocid={`heart.pillar.toggle.${index + 1}`}
        className={cn(
          "flex w-full items-center gap-2.5 px-4 py-3 text-left sm:gap-3 sm:px-5",
          "transition-smooth hover:border-primary/60",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        )}
      >
        {/* Red first letter INLINE in the header row at ~20px */}
        <span
          className="font-display text-xl leading-none text-primary sm:text-2xl"
          aria-hidden
        >
          {firstLetter}
        </span>

        {/* Pillar word + Timing badge */}
        <span className="flex min-w-0 flex-1 items-baseline gap-2">
          <span className="font-heading text-lg uppercase tracking-wide text-foreground sm:text-xl">
            {item.title}
          </span>
          {timing ? (
            <span
              className="inline-flex w-fit shrink-0 bg-secondary px-1.5 py-0.5 font-heading text-[0.6rem] uppercase tracking-wider text-secondary-foreground sm:text-[0.65rem]"
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

      {/* Steps — numbered list, revealed on expand */}
      {expanded && steps.length > 0 ? (
        <ol
          id={`heart-pillar-${index + 1}-steps`}
          className="flex flex-col gap-1.5 border-t border-border px-4 py-3 sm:px-5"
          data-ocid={`heart.pillar.steps.${index + 1}`}
        >
          {steps.map((step, stepIndex) => (
            <li
              key={`step-${stepIndex}-${step.slice(0, 24)}`}
              className="flex gap-2 font-body text-[0.8rem] leading-snug text-foreground sm:text-sm sm:leading-snug"
              data-ocid={`heart.pillar.step.${index + 1}.${stepIndex + 1}`}
            >
              <span
                className="font-heading shrink-0 font-bold text-primary"
                aria-hidden
              >
                {stepIndex + 1}.
              </span>
              <span className="min-w-0">{boldFirstWord(step)}</span>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}

/**
 * Bold the first word/verb of a step. The first whitespace-delimited
 * token is wrapped in <strong>; the rest is rendered as-is. Leading
 * punctuation (e.g. a bullet or dash) is skipped so the actual verb
 * gets the bold treatment.
 */
function boldFirstWord(step: string): ReactElement {
  const trimmed = step.trim();
  if (trimmed.length === 0) {
    return <span>{step}</span>;
  }
  const firstSpace = trimmed.search(/\s/);
  if (firstSpace === -1) {
    return <strong className="font-semibold text-foreground">{trimmed}</strong>;
  }
  const firstWord = trimmed.slice(0, firstSpace);
  const rest = trimmed.slice(firstSpace);
  return (
    <>
      <strong className="font-semibold text-foreground">{firstWord}</strong>
      {rest}
    </>
  );
}

export default PillarCard;
