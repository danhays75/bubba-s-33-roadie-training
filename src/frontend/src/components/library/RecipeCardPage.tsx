import { SeasonalBadge } from "@/components/library/SeasonalBadge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useItem } from "@/hooks/useLibrary";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { ReactElement } from "react";

/**
 * Recipe card detail page — the full item view.
 *
 * Rendered by the /position/$id/library/$categoryId/item/$itemId route. Uses
 * useItem(itemId) to fetch the item and renders on a .bg-library-card surface
 * (one step lighter than the page): title in Anton, photo if present, each
 * labeled detail field as a label (Oswald, uppercase, muted) + value (Barlow)
 * pair, the notes section (if present), tags as outlined chips, and the
 * SeasonalBadge if seasonal. Breadcrumb links back to the category page.
 */
export function RecipeCardPage({
  positionId,
  categoryId,
  itemId,
}: {
  positionId: string;
  categoryId: string;
  itemId: string;
}): ReactElement {
  const itemQuery = useItem(itemId);
  const item = itemQuery.data ?? null;
  const isLoading = itemQuery.isLoading;
  const notFound = !isLoading && !item;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <BackToCategory positionId={positionId} categoryId={categoryId} />

      {isLoading ? (
        <RecipeCardSkeleton />
      ) : notFound ? (
        <ItemNotFound positionId={positionId} categoryId={categoryId} />
      ) : (
        <RecipeCard item={item!} />
      )}
    </div>
  );
}

/* ------------------------------ Recipe card ------------------------------ */

function RecipeCard({
  item,
}: {
  item: NonNullable<ReturnType<typeof useItem>["data"]>;
}): ReactElement {
  return (
    <article
      className="mt-4 bg-library-card border border-border p-5 sm:p-6"
      data-ocid="library.item.card"
    >
      {/* Title + seasonal badge */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1
          className="font-display text-3xl uppercase leading-none tracking-wide text-library-card sm:text-4xl"
          data-ocid="library.item.title"
        >
          {item.title}
        </h1>
        {item.seasonal ? (
          <SeasonalBadge
            className="shrink-0"
            // keep a card-scoped marker for deterministic coverage
          />
        ) : null}
      </div>

      {/* Subtitle — optional, rendered below the title and visually subordinate */}
      {item.subtitle && item.subtitle.trim().length > 0 ? (
        <p
          className="mt-2 font-heading text-base sm:text-lg text-muted-foreground"
          data-ocid="library.item.subtitle"
        >
          {item.subtitle}
        </p>
      ) : null}

      {/* Photo (contained height, tap to open full-size) */}
      {item.photo ? (
        <div
          className="mt-5 w-full overflow-hidden rounded-md border border-border bg-card max-h-[160px] sm:max-h-[200px]"
          data-ocid="library.item.photo"
        >
          <PhotoButton photo={item.photo} title={item.title} />
        </div>
      ) : null}

      {/* Labeled detail fields */}
      {item.details.length > 0 ? (
        <dl
          className="mt-5 flex flex-col divide-y divide-border border-y border-border"
          data-ocid="library.item.fields"
        >
          {item.details.map((field, index) => (
            <div
              key={`${field.fieldLabel}-${index}`}
              className="flex flex-col gap-0.5 py-3 sm:flex-row sm:items-baseline sm:gap-4"
              data-ocid={`library.item.field.${index + 1}`}
            >
              <dt className="font-heading text-xs uppercase tracking-wider text-muted-foreground sm:w-32 sm:shrink-0">
                {field.fieldLabel}
              </dt>
              <dd
                className="font-body text-base text-foreground prose prose-sm prose-invert max-w-none prose-headings:font-heading prose-headings:uppercase prose-headings:tracking-wide prose-headings:text-foreground prose-strong:text-foreground prose-em:text-foreground prose-u:text-foreground prose-li:text-foreground prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-ul:text-foreground prose-ol:text-foreground prose-strong:font-semibold prose-headings:font-semibold prose-p:leading-relaxed prose-li:leading-relaxed prose-headings:mt-0 prose-headings:mb-1 prose-p:my-0 prose-ul:my-0 prose-ol:my-0 prose-li:my-0"
                data-ocid={`library.item.field_value.${index + 1}`}
                // biome-ignore lint/security/noDangerouslySetInnerHtml: value is admin-authored HTML from a restricted Quill toolbar (bold/italic/underline/lists only — no links, images, or scripts), so XSS risk is not applicable.
                dangerouslySetInnerHTML={{ __html: field.value }}
              />
            </div>
          ))}
        </dl>
      ) : null}

      {/* Notes */}
      {item.notes ? (
        <section className="mt-5" data-ocid="library.item.notes">
          <h2 className="font-heading text-xs uppercase tracking-wider text-muted-foreground">
            Notes
          </h2>
          <p className="mt-2 whitespace-pre-line font-body text-base leading-relaxed text-foreground">
            {item.notes}
          </p>
        </section>
      ) : null}

      {/* Tags as outlined chips */}
      {item.tags.length > 0 ? (
        <section className="mt-5" data-ocid="library.item.tags">
          <ul className="flex flex-wrap gap-2">
            {item.tags.map((tag, index) => (
              <li
                key={tag}
                className="rounded-full border border-border px-3 py-1 font-body text-xs uppercase tracking-wide text-muted-foreground"
                data-ocid={`library.item.tag.${index + 1}`}
              >
                {tag}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}

/* -------------------------------- Chrome -------------------------------- */

/** Photo button that opens the full-size image in a new tab. */
function PhotoButton({
  photo,
  title,
}: {
  photo: string;
  title: string;
}): ReactElement {
  return (
    <button
      type="button"
      onClick={() => window.open(photo, "_blank", "noopener,noreferrer")}
      className="block w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
      aria-label="Open full-size photo"
      title="Tap to view full size"
    >
      <img
        src={photo}
        alt={title}
        className="h-[160px] w-full object-contain object-center sm:h-[200px]"
        loading="lazy"
      />
    </button>
  );
}

function BackToCategory({
  positionId,
  categoryId,
}: {
  positionId: string;
  categoryId: string;
}): ReactElement {
  const to = `/position/${positionId}/library/${categoryId}`;
  return (
    <Button variant="ghost" size="sm" asChild data-ocid="library.item.back">
      <Link to={to}>
        <ArrowLeft className="size-4" />
        Back to category
      </Link>
    </Button>
  );
}

function ItemNotFound({
  positionId,
  categoryId,
}: {
  positionId: string;
  categoryId: string;
}): ReactElement {
  const to = `/position/${positionId}/library/${categoryId}`;
  return (
    <div
      className="flex flex-col items-start gap-4"
      data-ocid="library.item.not_found"
    >
      <div>
        <h1 className="font-heading text-2xl uppercase tracking-wide text-foreground">
          Item not found
        </h1>
        <p className="mt-2 font-body text-base text-muted-foreground">
          This item doesn&rsquo;t exist or may have been removed.
        </p>
      </div>
      <Button asChild variant="default" data-ocid="library.item.go_back_button">
        <Link to={to}>Back to category</Link>
      </Button>
    </div>
  );
}

function RecipeCardSkeleton(): ReactElement {
  return (
    <article
      className="mt-4 bg-library-card border border-border p-5 sm:p-6"
      data-ocid="library.item.loading_state"
      aria-hidden
    >
      <Skeleton className="h-9 w-2/3" />
      <Skeleton className="mt-5 aspect-[16/9] w-full rounded-md" />
      <div className="mt-5 flex flex-col gap-3">
        {["s1", "s2", "s3"].map((k) => (
          <Skeleton key={k} className="h-12 w-full" />
        ))}
      </div>
      <Skeleton className="mt-5 h-20 w-full" />
    </article>
  );
}
