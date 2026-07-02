import { HeroStripe } from "@/components/HeroStripe";
import { PositionTile } from "@/components/PositionTile";
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
  const { data: positions, isLoading: positionsLoading } = useAllPositions();
  const { data: assignments, isLoading: assignmentsLoading } =
    useMyAssignments();

  const loading = positionsLoading || assignmentsLoading;
  const list = positions ?? [];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <HeroSection />

      {loading ? (
        <TileSkeleton />
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
    <section className="pt-2 pb-6" data-ocid="home.hero.section">
      <h1
        className="font-display text-4xl uppercase leading-none tracking-wide text-foreground sm:text-5xl"
        data-ocid="home.hero.title"
      >
        Pick your position
      </h1>
      <HeroStripe className="mt-3 w-full max-w-xs" />
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
