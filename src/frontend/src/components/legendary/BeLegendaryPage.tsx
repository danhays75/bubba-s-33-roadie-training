import { ActivityBuilderDialog } from "@/components/legendary/ActivityBuilderDialog";
import { ActivityEditorDialog } from "@/components/legendary/ActivityEditorDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useDeleteLegendaryActivity,
  useLegendaryActivitiesByPosition,
  useRebuildLegendaryActivity,
} from "@/hooks/useLegendary";
import { useCategoriesByPosition } from "@/hooks/useLibrary";
import { useMyProfile } from "@/hooks/useMyProfile";
import { cn } from "@/lib/utils";
import type { LegendaryActivity } from "@/types/legendary";
import { useNavigate } from "@tanstack/react-router";
import { Link, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  Brain,
  ChevronRight,
  Hammer,
  Layers,
  Pencil,
  RefreshCw,
  Sparkles,
  Trash2,
  Trophy,
  Wine,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { ReactElement } from "react";
import { toast } from "sonner";

/**
 * Be Legendary page — the per-position practice hub.
 *
 * Lists all admin-built activities (quiz / flashcards) for the current
 * position as clickable cards. Each card shows the activity name (Oswald),
 * a type badge, and the source category names. Tapping a card navigates to
 * the activity's practice route (quiz or flashcards).
 *
 * Admins see a "Build Activity" button that opens the ActivityBuilderDialog,
 * and a delete button (with confirmation) on each card.
 *
 * The "BE LEGENDARY" header uses the Anton display font with the gold→red
 * gradient banner styling — the only sanctioned gradient/glow zone in the
 * app. Activity cards use the warm-tinted bg-legendary-card /
 * border-legendary-card tokens.
 */
interface BeLegendaryPageProps {
  /** Route param: the position id as a string (translated to bigint at call). */
  positionId: string;
}

export function BeLegendaryPage({
  positionId,
}: BeLegendaryPageProps): ReactElement {
  // Read the position id from the router as well so a deep link without the
  // prop still resolves; prefer the explicit prop when present.
  const { id } = useParams({ strict: false });
  const resolvedPositionId = positionId || String(id ?? "");

  const activitiesQuery = useLegendaryActivitiesByPosition(resolvedPositionId);
  const categoriesQuery = useCategoriesByPosition(resolvedPositionId);
  const profileQuery = useMyProfile();

  const isAdmin = profileQuery.data?.role === "admin";
  // Sort activities by createdAt ascending in the frontend so editing an
  // activity's name/categories (which the backend re-appends) leaves its card
  // in the same visual position, and newly built activities appear in a
  // consistent predictable spot. createdAt is a stringified bigint
  // nanosecond timestamp — compare via BigInt() for safe cross-digit-width
  // ascending sort. Do NOT mutate the query cache; sort a copy.
  const activities = useMemo(() => {
    const data = activitiesQuery.data ?? [];
    return [...data].sort((a, b) => {
      const aN = BigInt(a.createdAt);
      const bN = BigInt(b.createdAt);
      if (aN < bN) return -1;
      if (aN > bN) return 1;
      return 0;
    });
  }, [activitiesQuery.data]);
  const categories = categoriesQuery.data ?? [];

  // Resolve category ids → names for display on the cards.
  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of categories) map.set(c.id, c.name);
    return map;
  }, [categories]);

  const [builderOpen, setBuilderOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LegendaryActivity | null>(
    null,
  );
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingActivity, setEditingActivity] =
    useState<LegendaryActivity | null>(null);
  const [rebuildTarget, setRebuildTarget] = useState<LegendaryActivity | null>(
    null,
  );

  const isLoading =
    activitiesQuery.isLoading ||
    (categoriesQuery.isLoading && !categories.length);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <BackToPosition positionId={resolvedPositionId} />

      <LegendaryBanner />

      {isAdmin ? (
        <div className="mt-5 flex justify-end">
          <Button
            onClick={() => setBuilderOpen(true)}
            data-ocid="legendary.build_button"
            className="bg-primary text-primary-foreground hover:bg-primary-hover"
          >
            <Hammer className="size-4" />
            Build Activity
          </Button>
        </div>
      ) : null}

      <section
        className="mt-6"
        data-ocid="legendary.activities"
        aria-label="Be Legendary activities"
      >
        {isLoading ? (
          <ActivityListSkeleton />
        ) : activities.length === 0 ? (
          <EmptyActivities isAdmin={isAdmin} />
        ) : (
          <ul className="flex flex-col gap-3">
            {activities.map((activity, index) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                positionId={resolvedPositionId}
                categoryNameById={categoryNameById}
                isAdmin={isAdmin}
                index={index}
                onDelete={() => setDeleteTarget(activity)}
                onEdit={() => {
                  setEditingActivity(activity);
                  setEditorOpen(true);
                }}
                onRebuild={() => setRebuildTarget(activity)}
              />
            ))}
          </ul>
        )}
      </section>

      {isAdmin ? (
        <>
          <ActivityBuilderDialog
            open={builderOpen}
            onOpenChange={setBuilderOpen}
            positionId={resolvedPositionId}
          />
          <ActivityEditorDialog
            open={editorOpen}
            onOpenChange={setEditorOpen}
            positionId={resolvedPositionId}
            activity={editingActivity}
          />
        </>
      ) : null}

      <DeleteActivityDialog
        activity={deleteTarget}
        onClose={() => setDeleteTarget(null)}
      />

      <RebuildActivityDialog
        activity={rebuildTarget}
        positionId={resolvedPositionId}
        onClose={() => setRebuildTarget(null)}
      />
    </div>
  );
}

/* ------------------------------- Banner --------------------------------- */

function LegendaryBanner(): ReactElement {
  return (
    <header
      className="legendary-hero-backdrop legendary-hero-sweep legendary-hero-flash relative mt-4 rounded-md"
      data-ocid="legendary.banner"
      aria-label="Be Legendary practice hub"
    >
      {/* Bartender hero image — cinematic illustrated silhouette behind the bar.
          Layered on top of the near-black roadhouse backdrop, below the
          legibility scrim. Non-interactive (display only). */}
      <img
        src="/assets/generated/bartender-hero.webp"
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 h-full w-full select-none object-cover"
      />

      {/* Legibility scrim over the hero image so the wordmark stays readable
          regardless of how bright the bartender illustration is. */}
      <div className="legendary-hero-overlay" aria-hidden />

      {/* Content — Trophy icon, metallic-gold wordmark, Practice Hub subtitle.
          z-10 sits above the image (z-0), overlay (z-1), sweep/flash (z-2). */}
      <div className="relative z-10 flex flex-col items-center gap-2 px-6 py-10 text-center sm:py-12">
        <Trophy
          className="size-7 text-legendary-metallic-bright drop-shadow-[0_0_8px_oklch(var(--legendary-metallic-glow)/0.6)]"
          aria-hidden
        />
        <h1
          className="legendary-hero-wordmark text-4xl uppercase leading-none tracking-wide sm:text-5xl"
          data-ocid="legendary.banner.title"
        >
          Be Legendary
        </h1>
        <p className="font-heading text-xs uppercase tracking-[0.3em] text-legendary-metallic-highlight/80 drop-shadow-[0_1px_2px_oklch(0.12_0.005_75/0.8)]">
          Practice Hub
        </p>
      </div>
    </header>
  );
}

/* --------------------------- Activity card ------------------------------ */

function ActivityCard({
  activity,
  positionId,
  categoryNameById,
  isAdmin,
  index,
  onDelete,
  onEdit,
  onRebuild,
}: {
  activity: LegendaryActivity;
  positionId: string;
  categoryNameById: Map<string, string>;
  isAdmin: boolean;
  index: number;
  onDelete: () => void;
  onEdit: () => void;
  onRebuild: () => void;
}): ReactElement {
  const navigate = useNavigate();
  const isQuiz = activity.activityType === "quiz";
  const isDrinksBuilder = activity.activityType === "drinksBuilder";

  const sourceNames = activity.sourceCategoryIds
    .map((id) => categoryNameById.get(id))
    .filter((n): n is string => typeof n === "string");

  function handleOpen() {
    // Navigate to the activity's practice route. Quiz activities go to the
    // quiz route; flashcard activities go to the flashcards route; drinks
    // builder activities go to the drinks-builder route. The activity id
    // comes AFTER the literal segment to match the flattened RootRoute paths.
    const to = isQuiz
      ? `/position/${positionId}/legendary/quiz/${activity.id}`
      : isDrinksBuilder
        ? `/position/${positionId}/legendary/drinks-builder/${activity.id}`
        : `/position/${positionId}/legendary/flashcards/${activity.id}`;
    void navigate({ to });
  }

  return (
    <li>
      <div
        className={cn(
          "group relative flex items-stretch gap-3 overflow-hidden rounded-md bg-legendary-card text-legendary-card",
          "transition-smooth hover:border-primary/60",
          "focus-within:border-primary/60",
        )}
        data-ocid={`legendary.activity.item.${index + 1}`}
      >
        {/* Clickable area — opens the activity */}
        <button
          type="button"
          onClick={handleOpen}
          aria-label={`Open ${activity.name}`}
          data-ocid={`legendary.activity.open_button.${index + 1}`}
          className={cn(
            "flex flex-1 items-center gap-3 p-4 text-left",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
          )}
        >
          {/* Type icon */}
          <span
            className="flex size-11 shrink-0 items-center justify-center rounded-md bg-background/40 text-primary"
            aria-hidden
          >
            {isQuiz ? (
              <Brain className="size-5" />
            ) : isDrinksBuilder ? (
              <Wine className="size-5" />
            ) : (
              <Layers className="size-5" />
            )}
          </span>

          {/* Name + meta */}
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="truncate font-heading text-lg uppercase leading-tight tracking-wide text-foreground">
              {activity.name}
            </span>
            <span className="flex min-w-0 flex-wrap items-center gap-1.5">
              <ActivityTypeBadge type={activity.activityType} />
              {sourceNames.length > 0 ? (
                <span className="min-w-0 break-words font-body text-xs text-muted-foreground">
                  {sourceNames.join(" · ")}
                </span>
              ) : null}
            </span>
          </span>

          {/* Practice affordance — signals the card launches a session */}
          <span
            className="flex shrink-0 items-center gap-1 font-heading text-xs uppercase tracking-wide text-primary"
            aria-hidden
          >
            Practice
            <ChevronRight className="size-4" />
          </span>
        </button>

        {/* Admin actions — edit, rebuild, delete */}
        {isAdmin ? (
          <div className="flex shrink-0 items-center gap-0.5 pr-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onEdit}
              aria-label={`Edit ${activity.name}`}
              data-ocid={`legendary.activity.edit_button.${index + 1}`}
              className="text-muted-foreground hover:text-primary"
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onRebuild}
              aria-label={`Rebuild ${activity.name} content`}
              data-ocid={`legendary.activity.rebuild_button.${index + 1}`}
              className="text-muted-foreground hover:text-primary"
            >
              <RefreshCw className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onDelete}
              aria-label={`Delete ${activity.name}`}
              data-ocid={`legendary.activity.delete_button.${index + 1}`}
              className="text-muted-foreground hover:text-primary"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ) : null}
      </div>
    </li>
  );
}

function ActivityTypeBadge({
  type,
}: {
  type: LegendaryActivity["activityType"];
}): ReactElement {
  const label =
    type === "quiz"
      ? "Quiz"
      : type === "drinksBuilder"
        ? "Drinks Builder"
        : "Flashcards";
  const ocid =
    type === "quiz"
      ? "legendary.activity.type.quiz.badge"
      : type === "drinksBuilder"
        ? "legendary.activity.type.drinks_builder.badge"
        : "legendary.activity.type.flashcards.badge";
  return (
    <Badge
      variant="outline"
      className="border-primary/40 text-primary"
      data-ocid={ocid}
    >
      {label}
    </Badge>
  );
}

/* ------------------------------ Empty state ----------------------------- */

function EmptyActivities({ isAdmin }: { isAdmin: boolean }): ReactElement {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-legendary-card bg-legendary-card/40 px-6 py-14 text-center"
      data-ocid="legendary.activities.empty_state"
    >
      <Sparkles className="size-8 text-primary" aria-hidden />
      <div>
        <p className="font-heading text-base uppercase tracking-wide text-foreground">
          No activities yet
        </p>
        <p className="mt-1 max-w-xs font-body text-sm text-muted-foreground">
          {isAdmin
            ? "Build the first practice activity for this position using the Build Activity button above."
            : "Check back after your admin builds one."}
        </p>
      </div>
    </div>
  );
}

/* --------------------------- Delete dialog ------------------------------ */

function DeleteActivityDialog({
  activity,
  onClose,
}: {
  activity: LegendaryActivity | null;
  onClose: () => void;
}): ReactElement {
  const deleteMutation = useDeleteLegendaryActivity();

  async function handleConfirm() {
    if (!activity) return;
    try {
      await deleteMutation.mutateAsync({
        id: activity.id,
        positionId: activity.positionId,
      });
      toast.success("Activity deleted", {
        description: `"${activity.name}" was removed.`,
      });
      onClose();
    } catch (err) {
      toast.error("Could not delete activity", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  return (
    <AlertDialog
      open={activity !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <AlertDialogContent
        className="bg-card border-border"
        data-ocid="legendary.delete.dialog"
      >
        <AlertDialogHeader>
          <AlertDialogTitle className="font-heading uppercase tracking-wide text-foreground">
            Delete activity
          </AlertDialogTitle>
          <AlertDialogDescription>
            Delete &ldquo;{activity?.name ?? ""}&rdquo;? This removes it for all
            staff. You can build a new one anytime.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={deleteMutation.isPending}
            data-ocid="legendary.delete.dialog.cancel_button"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={deleteMutation.isPending}
            className="bg-primary text-primary-foreground hover:bg-primary-hover"
            data-ocid="legendary.delete.dialog.confirm_button"
          >
            {deleteMutation.isPending ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/* --------------------------- Rebuild dialog ----------------------------- */

/**
 * RebuildActivityDialog — admin-only confirmation that warns rebuild
 * overwrites the activity's generated content (quiz questions / flashcards)
 * from its current source categories. The activity's name, type, and source
 * categories are unchanged. On confirm it calls
 * useRebuildLegendaryActivity with { id, positionId }.
 *
 * Styled to match the delete confirmation (dark roadhouse + gold accents).
 */
function RebuildActivityDialog({
  activity,
  positionId,
  onClose,
}: {
  activity: LegendaryActivity | null;
  positionId: string;
  onClose: () => void;
}): ReactElement {
  const rebuildMutation = useRebuildLegendaryActivity();

  async function handleConfirm() {
    if (!activity) return;
    try {
      await rebuildMutation.mutateAsync({
        id: activity.id,
        positionId,
      });
      toast.success("Activity rebuilt", {
        description: `"${activity.name}" content was regenerated.`,
      });
      onClose();
    } catch (err) {
      toast.error("Could not rebuild activity", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  return (
    <AlertDialog
      open={activity !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <AlertDialogContent
        className="bg-card border-border"
        data-ocid="legendary.rebuild.dialog"
      >
        <AlertDialogHeader>
          <AlertDialogTitle className="font-heading uppercase tracking-wide text-foreground">
            Rebuild activity content
          </AlertDialogTitle>
          <AlertDialogDescription>
            Regenerate the content of &ldquo;{activity?.name ?? ""}&rdquo; from
            its current source categories? This overwrites the existing quiz
            questions or flashcards. The name, type, and source categories stay
            the same.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={rebuildMutation.isPending}
            data-ocid="legendary.rebuild.dialog.cancel_button"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={rebuildMutation.isPending}
            className="bg-primary text-primary-foreground hover:bg-primary-hover"
            data-ocid="legendary.rebuild.dialog.confirm_button"
          >
            {rebuildMutation.isPending ? "Rebuilding…" : "Rebuild"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/* ------------------------------- Chrome -------------------------------- */

function BackToPosition({
  positionId,
}: {
  positionId: string;
}): ReactElement {
  return (
    <Button variant="ghost" size="sm" asChild data-ocid="legendary.back_button">
      <Link to="/position/$id" params={{ id: positionId }}>
        <ArrowLeft className="size-4" />
        Back to position
      </Link>
    </Button>
  );
}

function ActivityListSkeleton(): ReactElement {
  return (
    <ul
      className="flex flex-col gap-3"
      data-ocid="legendary.activities.loading_state"
      aria-hidden
    >
      {["s1", "s2", "s3"].map((k) => (
        <li key={k}>
          <Skeleton className="h-20 w-full rounded-md" />
        </li>
      ))}
    </ul>
  );
}

export default BeLegendaryPage;
