import { HeartShowcaseHeader } from "@/components/heart/HeartShowcaseHeader";
import { PillarCard } from "@/components/heart/PillarCard";
import { ServingSpecsStrip } from "@/components/heart/ServingSpecsStrip";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useItemsByCategory } from "@/hooks/useLibrary";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, HeartCrack } from "lucide-react";
import { useMemo } from "react";
import type { ReactElement } from "react";

/**
 * HeartShowcasePage — the per-position "Service with HEART" branded
 * showcase.
 *
 * Fetches items via useItemsByCategory(categoryId) and identifies:
 *   - the "Serving Specs" item (title === "Serving Specs") → stat strip
 *   - the five pillar items (Hello, Engage, Arrive, Respond, Thank You)
 *     → expandable pillar cards ordered by their per-category sortOrder
 *
 * Renders the HeartShowcaseHeader, then the ServingSpecsStrip (if the
 * Serving Specs item is present), then the five pillar cards. Includes
 * a back link to the position page. Handles loading / empty / not-found
 * states. Mobile-first, polished hero layout — not a plain list.
 *
 * Tolerant: if a pillar is missing, the present ones still render. Extra
 * non-pillar, non-specs items are ignored in the showcase.
 */
const PILLAR_TITLES = ["Hello", "Engage", "Arrive", "Respond", "Thank You"];
const SPECS_TITLE = "Serving Specs";

export function HeartShowcasePage({
  positionId,
  categoryId,
}: {
  positionId: string;
  categoryId: string;
}): ReactElement {
  const itemsQuery = useItemsByCategory(categoryId);
  const isLoading = itemsQuery.isLoading;
  const items = itemsQuery.data ?? [];

  const { specsItem, pillars } = useMemo(() => {
    const specs = items.find((it) => it.title === SPECS_TITLE) ?? null;
    const pillarSet = new Set(PILLAR_TITLES);
    const pillarItems = items
      .filter((it) => pillarSet.has(it.title))
      .sort((a, b) => a.sortOrder - b.sortOrder);
    return { specsItem: specs, pillars: pillarItems };
  }, [items]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <BackToPosition positionId={positionId} />

      {isLoading ? (
        <HeartShowcaseSkeleton />
      ) : (
        <div className="mt-6 flex flex-col gap-2">
          <HeartShowcaseHeader />

          {specsItem ? <ServingSpecsStrip item={specsItem} /> : null}

          {pillars.length > 0 ? (
            <section
              className="mt-8 flex flex-col gap-3"
              data-ocid="heart.pillars"
              aria-label="HEART pillars"
            >
              {pillars.map((item, index) => (
                <PillarCard key={item.id} item={item} index={index} />
              ))}
            </section>
          ) : (
            <EmptyPillars />
          )}
        </div>
      )}
    </div>
  );
}

/* -------------------------------- Chrome -------------------------------- */

function BackToPosition({
  positionId,
}: {
  positionId: string;
}): ReactElement {
  const to = `/position/${positionId}`;
  return (
    <Button variant="ghost" size="sm" asChild data-ocid="heart.back_button">
      <Link to={to}>
        <ArrowLeft className="size-4" />
        Back to position
      </Link>
    </Button>
  );
}

function EmptyPillars(): ReactElement {
  return (
    <div
      className="mt-8 flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border bg-card px-6 py-12 text-center"
      data-ocid="heart.pillars.empty_state"
    >
      <HeartCrack className="size-8 text-muted-foreground" aria-hidden />
      <div>
        <p className="font-heading text-base uppercase tracking-wide text-foreground">
          No pillars yet
        </p>
        <p className="mt-1 max-w-xs font-body text-sm text-muted-foreground">
          An admin can add the five HEART pillars (Hello, Engage, Arrive,
          Respond, Thank You) to this category. Once they exist, you&rsquo;ll
          see them here.
        </p>
      </div>
    </div>
  );
}

function HeartShowcaseSkeleton(): ReactElement {
  return (
    <div className="mt-6 flex flex-col items-center gap-4" aria-hidden>
      <Skeleton className="h-12 w-2/3" />
      <Skeleton className="h-1.5 w-2/3 rounded-full" />
      <Skeleton className="h-6 w-4/5" />
      <div className="mt-4 grid w-full grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {["s1", "s2", "s3", "s4", "s5"].map((k) => (
          <Skeleton key={k} className="h-16 w-full" />
        ))}
      </div>
      <div className="mt-4 flex w-full flex-col gap-3">
        {["s1", "s2", "s3", "s4", "s5"].map((k) => (
          <Skeleton key={k} className="h-20 w-full" />
        ))}
      </div>
    </div>
  );
}

export default HeartShowcasePage;
