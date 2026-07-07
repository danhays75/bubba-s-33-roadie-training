import type { LibraryItem } from "@/types/foundation";
import type { ReactElement } from "react";

/**
 * ServingSpecsStrip — a horizontal responsive strip of small stat cards
 * built from the "Serving Specs" item's detail fields.
 *
 * Each detail field becomes one stat card:
 *   - fieldLabel above (Oswald, uppercase, small, muted)
 *   - value below (Barlow, larger, foreground)
 *
 * Mobile-first: cards wrap on small screens, sit in a row on larger ones.
 * Hidden entirely when the item is null/undefined or has no details.
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
      <div
        className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5"
        data-ocid="heart.serving_specs.strip"
      >
        {item.details.map((field, index) => (
          <StatCard
            key={`${field.fieldLabel}-${index}`}
            label={field.fieldLabel}
            value={field.value}
            index={index}
          />
        ))}
      </div>
    </section>
  );
}

function StatCard({
  label,
  value,
  index,
}: {
  label: string;
  value: string;
  index: number;
}): ReactElement {
  return (
    <div
      className="flex flex-col gap-1 bg-library-card border border-border px-3 py-3 text-center"
      data-ocid={`heart.serving_specs.card.${index + 1}`}
    >
      <span className="font-heading text-[0.65rem] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="font-body text-base font-medium leading-tight text-foreground">
        {value}
      </span>
    </div>
  );
}

export default ServingSpecsStrip;
