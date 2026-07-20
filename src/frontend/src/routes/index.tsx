import { HeroStripe } from "@/components/HeroStripe";
import { PositionTile } from "@/components/PositionTile";
import { QueryErrorState } from "@/components/QueryErrorState";
import { useAllPositions } from "@/hooks/useAllPositions";
import { useMyAssignments } from "@/hooks/useMyAssignments";
import type {
  Position,
  PositionAssignment,
  StatusTone,
} from "@/types/foundation";

/**
 * Home — the position-first centerpiece.
 *
 * Bold "Pick your position" hero with a slim red-white-navy stripe beneath,
 * then a responsive grid of position tiles. Each tile shows the signed-in
 * user's status for that position (In training / Certified / Not started),
 * computed by matching the position ID against the user's assignments.
 *
 * Mobile-first: single column on small screens, multi-column on larger.
 */
export function Home() {
  const {
    data: positions,
    isLoading: positionsLoading,
    isError: positionsError,
    error: positionsErrorDetail,
    refetch: refetchPositions,
  } = useAllPositions();
  const { data: assignments, isLoading: assignmentsLoading } =
    useMyAssignments();

  const loading = positionsLoading || assignmentsLoading;
  const list = positions ?? [];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <HeroSection />

      {loading ? (
        <TileSkeleton />
      ) : positionsError ? (
        <QueryErrorState
          title="Couldn't load positions"
          description="We couldn't load your positions right now. Please try again."
          error={positionsErrorDetail}
          onRetry={() => void refetchPositions()}
        />
      ) : list.length === 0 ? (
        <EmptyState />
      ) : (
        <PositionGrid positions={list} assignments={assignments ?? []} />
      )}
    </div>
  );
}

function HeroSection() {
  return (
    <section
      className="relative mt-2 mb-6 overflow-hidden border border-border bg-card"
      data-ocid="home.hero.section"
    >
      {/* Cinematic roadhouse hero banner — smiling bartender with Bubba's 33
          eye-black. Swap the file at public/assets/generated/bartender-hero-eyeblack.png
          to update the hero photo. */}
      <img
        src="/assets/generated/bartender-hero-eyeblack.webp"
        alt="Bartender with Bubba's 33 eye-black under her eyes, smiling behind the bar"
        loading="eager"
        className="pointer-events-none absolute inset-0 z-0 h-full w-full select-none object-cover object-center"
      />
      {/* Legibility scrim so the white heading stays readable over the photo. */}
      <div
        className="absolute inset-0 z-0 bg-gradient-to-t from-background via-background/85 to-background/55"
        aria-hidden
      />

      <div className="relative z-10 flex min-h-[18rem] flex-col justify-end px-5 pb-5 pt-16 sm:min-h-[22rem] sm:px-8 sm:pb-7">
        <h1
          className="font-display text-4xl uppercase leading-none tracking-wide text-foreground drop-shadow-[0_2px_8px_oklch(0.12_0.005_95/0.85)] sm:text-5xl"
          data-ocid="home.hero.title"
        >
          Pick your position
        </h1>
        <HeroStripe className="mt-3 w-full max-w-xs" />
      </div>
    </section>
  );
}

function PositionGrid({
  positions,
  assignments,
}: {
  positions: Position[];
  assignments: PositionAssignment[];
}) {
  // Index assignments by positionId for O(1) status lookup.
  const byPosition = new Map<string, PositionAssignment>();
  for (const a of assignments) byPosition.set(a.positionId, a);

  return (
    <section
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      data-ocid="home.position_grid.section"
    >
      {positions.map((position, index) => {
        const assignment = byPosition.get(position.id);
        const tone: StatusTone = assignment
          ? assignment.status === "certified"
            ? "certified"
            : "inTraining"
          : "notStarted";
        return (
          <PositionTile
            key={position.id}
            position={position}
            tone={tone}
            index={index}
          />
        );
      })}
    </section>
  );
}

function EmptyState() {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 border border-dashed border-border bg-card px-6 py-16 text-center"
      data-ocid="home.empty_state"
    >
      <p className="font-heading text-lg uppercase tracking-wide text-foreground">
        No positions yet
      </p>
      <p className="max-w-xs font-body text-sm text-muted-foreground">
        An admin can add them. Once positions exist, you&rsquo;ll see them here
        with your training status.
      </p>
    </div>
  );
}

function TileSkeleton() {
  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      data-ocid="home.loading_state"
      aria-hidden
    >
      {["skeleton-1", "skeleton-2", "skeleton-3", "skeleton-4"].map((k) => (
        <div key={k} className="flex flex-col bg-card border border-border">
          <div className="aspect-[16/9] w-full bg-muted" />
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="h-4 w-24 bg-muted" />
            <div className="h-4 w-16 bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}
