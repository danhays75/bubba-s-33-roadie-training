import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useBackend } from "@/hooks/useBackend";
import { useMyAssignments } from "@/hooks/useMyAssignments";
import type { Position, StatusTone } from "@/types/foundation";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { ArrowLeft, Clock } from "lucide-react";
import type { ReactElement } from "react";

/**
 * Position Detail (placeholder).
 *
 * Reads the position id from the route params, fetches the position via the
 * backend getPosition method (translating the string id to bigint), and shows
 * the position name, optional description, optional cover photo, and the
 * signed-in user's current status for that position.
 *
 * Training content and tests come in a later wave — this page is a
 * placeholder only. A clear "Training content coming soon" note is shown.
 */

interface PositionDetailPageProps {
  /** Route param: the position id as a string (translated to bigint at call). */
  positionId: string;
}

/**
 * Route component. Reads the position id from TanStack Router params and
 * renders the detail page.
 */
export function PositionDetailRoute(): ReactElement {
  const { id } = useParams({ strict: false });
  return <PositionDetailPage positionId={String(id ?? "")} />;
}

export function PositionDetailPage({
  positionId,
}: PositionDetailPageProps): ReactElement {
  const { actor, isFetching } = useBackend();
  const { data: assignments } = useMyAssignments();

  const positionQuery = useQuery<Position | null>({
    queryKey: ["position", positionId],
    queryFn: async () => {
      if (!actor) return null;
      const result = (await actor.getPosition(BigInt(positionId))) as
        | Position
        | null
        | undefined;
      return result ?? null;
    },
    enabled: !!actor && !isFetching && !!positionId,
  });

  const position = positionQuery.data ?? null;
  const isLoading = positionQuery.isLoading || (isFetching && !actor);
  const notFound = !isLoading && !position;

  if (isLoading) {
    return <PositionDetailSkeleton />;
  }

  if (notFound) {
    return <PositionNotFound />;
  }

  // Determine the signed-in user's status for this position.
  const assignment = assignments?.find((a) => a.positionId === positionId);
  const tone: StatusTone = assignment
    ? assignment.status === "certified"
      ? "certified"
      : "inTraining"
    : "notStarted";

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <BackLink />

      <article className="mt-4">
        {position?.coverPhoto ? (
          <div
            className="aspect-[16/9] w-full overflow-hidden rounded-md border border-border bg-card"
            data-ocid="position.cover_photo"
          >
            <img
              src={position.coverPhoto}
              alt={position.name}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        ) : null}

        <header className="mt-4 flex flex-col gap-3">
          <h1
            className="font-heading text-3xl uppercase tracking-wide text-foreground sm:text-4xl"
            data-ocid="position.name"
          >
            {position?.name}
          </h1>
          <StatusBadge tone={tone} />
        </header>

        {position?.description ? (
          <p
            className="mt-4 font-body text-base leading-relaxed text-muted-foreground"
            data-ocid="position.description"
          >
            {position.description}
          </p>
        ) : null}

        <ComingSoonNote />
      </article>
    </div>
  );
}

/** Back button linking to the home grid. */
function BackLink(): ReactElement {
  return (
    <Button variant="ghost" size="sm" asChild data-ocid="position.back_button">
      <a href="/">
        <ArrowLeft className="size-4" />
        Back to positions
      </a>
    </Button>
  );
}

/** Placeholder note that training content is coming soon. */
function ComingSoonNote(): ReactElement {
  return (
    <div
      className="mt-8 flex items-start gap-3 rounded-md border border-border bg-card p-4"
      data-ocid="position.coming_soon_note"
    >
      <Clock className="mt-0.5 size-5 shrink-0 text-in-training" />
      <div>
        <p className="font-heading text-sm uppercase tracking-wide text-foreground">
          Training content coming soon
        </p>
        <p className="mt-1 font-body text-sm text-muted-foreground">
          Training steps and tests for this position will appear here in a
          future update.
        </p>
      </div>
    </div>
  );
}

/** Not-found state with a link home. */
function PositionNotFound(): ReactElement {
  return (
    <div
      className="mx-auto flex w-full max-w-3xl flex-col items-start gap-4 px-4 py-16"
      data-ocid="position.not_found"
    >
      <BackLink />
      <div className="mt-4">
        <h1 className="font-heading text-3xl uppercase tracking-wide text-foreground">
          Position not found
        </h1>
        <p className="mt-2 font-body text-base text-muted-foreground">
          This position doesn&rsquo;t exist or may have been removed.
        </p>
      </div>
      <Button asChild variant="default" data-ocid="position.go_home_button">
        <a href="/">Go to positions</a>
      </Button>
    </div>
  );
}

/** Loading skeleton shown while the position is being fetched. */
function PositionDetailSkeleton(): ReactElement {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <Skeleton className="h-8 w-36" />
      <Skeleton className="mt-4 aspect-[16/9] w-full rounded-md" />
      <Skeleton className="mt-4 h-10 w-2/3" />
      <Skeleton className="mt-3 h-6 w-28" />
      <Skeleton className="mt-4 h-20 w-full" />
    </div>
  );
}

export default PositionDetailPage;
