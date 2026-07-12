import type { LibraryItem } from "@/types/foundation";
import type { ReactElement } from "react";

/**
 * ServingSpecsStrip — a single horizontal row of compact stat chips built
 * from the "Serving Specs" item's detail fields (Apps, Salads, Entrées,
 * Refills).
 *
 * Phone-first: all chips sit on ONE row with tight horizontal spacing. Each
 * chip is a flex item that shrinks to fit (flex-1 min-w-0) so the four chips
 * stay inline on a phone. On very narrow viewports the row scrolls
 * horizontally (overflow-x-auto) rather than wrapping to a second line.
 *
 * Each chip: small label above (Oswald, uppercase, muted) over value below
 * (Barlow, foreground). Hidden entirely when the item is null/undefined or
 * has no details.
 */
export function ServingSpecsStrip({
  item,
}: {
  item: LibraryItem | null | undefined;
}): ReactElement | null {
  if (!item || item.details.length === 0) return null;

  return (
    <section
      className="mt-8 w-full"
      data-ocid="heart.serving_specs"
      aria-label="Serving specs"
    >
      <h2
        className="font-heading text-xs uppercase tracking-wider text-muted-foreground"
        data-ocid="heart.serving_specs.title"
      >
        {item.title}
      </h2>
      <ul
        className="mt-3 flex w-full list-none gap-1.5 overflow-x-auto pb-1 m-0"
        data-ocid="heart.serving_specs.strip"
      >
        {item.details.map((field, index) => (
          <StatChip
            key={`${field.fieldLabel}-${index}`}
            label={field.fieldLabel}
            value={field.value}
            index={index}
          />
        ))}
      </ul>
    </section>
  );
}

function StatChip({
  label,
  value,
  index,
}: {
  label: string;
  value: string;
  index: number;
}): ReactElement {
  return (
    <li
      className="flex min-w-0 flex-1 flex-col gap-0.5 bg-library-card border border-border px-2 py-2 text-center"
      data-ocid={`heart.serving_specs.card.${index + 1}`}
    >
      <span className="font-heading text-[0.6rem] uppercase leading-tight tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="font-body text-sm font-medium leading-tight text-foreground">
        {value}
      </span>
    </li>
  );
}

export default ServingSpecsStrip;
