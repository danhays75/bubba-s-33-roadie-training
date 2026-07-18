import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLegendaryActivity } from "@/hooks/useLegendary";
import { cn } from "@/lib/utils";
import type { LegendaryActivity, LegendaryFlashcard } from "@/types/legendary";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ImageOff,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useRef, useState } from "react";
import type { ReactElement } from "react";

/**
 * FlashcardActivity — the Be Legendary flashcard practice flow.
 *
 * Accepts an activityId, fetches the activity via useLegendaryActivity,
 * and renders a one-card-at-a-time study experience using the 3D flip
 * CSS utilities (flashcard-scene / flipper / face / front / back) defined
 * in index.css.
 *
 *   - Front face: item title (Oswald, large) + item photo if present
 *   - Back face: all detail fields (fieldLabel: value pairs)
 *   - Tap the card to flip between front and back
 *   - Swipe left/right to advance to next/previous card (touch events)
 *   - "Card X of Y" progress indicator
 *   - At the end: "Start over" + "Back to activities"
 *
 * Practice only — no scoring or progress tracking. Mobile-first, dark
 * theme with gold accents.
 */

interface FlashcardActivityProps {
  /** The Be Legendary activity id (stringified bigint). */
  activityId: string;
}

export function FlashcardActivity({
  activityId,
}: FlashcardActivityProps): ReactElement {
  const query = useLegendaryActivity(activityId);
  const activity = query.data ?? null;

  if (query.isLoading) {
    return <FlashcardSkeleton />;
  }

  if (!activity) {
    return <FlashcardNotFound activityId={activityId} />;
  }

  if (activity.content.kind !== "flashcardContent") {
    return <FlashcardWrongKind activity={activity} />;
  }

  return <FlashcardFlow activity={activity} />;
}

/* ---------------------------- Flashcard flow ----------------------------- */

function FlashcardFlow({
  activity,
}: {
  activity: LegendaryActivity;
}): ReactElement {
  const cards: LegendaryFlashcard[] =
    activity.content.kind === "flashcardContent"
      ? activity.content.flashcards
      : [];
  const total = cards.length;
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const goNext = () => {
    setFlipped(false);
    setIndex((i) => Math.min(i + 1, total - 1));
  };
  const goPrev = () => {
    setFlipped(false);
    setIndex((i) => Math.max(i - 1, 0));
  };
  const handleRestart = () => {
    setFlipped(false);
    setIndex(0);
  };

  if (total === 0) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <FlashcardHeader activity={activity} />
        <EmptyCards activity={activity} />
      </div>
    );
  }

  const card = cards[index];
  const atEnd = index >= total - 1;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <FlashcardHeader activity={activity} />
      <ProgressIndicator current={index + 1} total={total} />

      {atEnd ? <EndOfDeck onRestart={handleRestart} /> : null}

      <Flashcard
        key={index}
        card={card}
        flipped={flipped}
        onFlip={() => setFlipped((f) => !f)}
        onNext={goNext}
        onPrev={goPrev}
        canPrev={index > 0}
        canNext={index < total - 1}
      />

      <DeckControls
        onPrev={goPrev}
        onNext={goNext}
        canPrev={index > 0}
        canNext={index < total - 1}
        onFlip={() => setFlipped((f) => !f)}
        flipped={flipped}
      />

      <p className="mt-3 text-center font-body text-xs text-muted-foreground">
        Tap the card to flip · swipe left/right to move between cards
      </p>
    </div>
  );
}

/* ------------------------------ Flashcard -------------------------------- */

function Flashcard({
  card,
  flipped,
  onFlip,
  onNext,
  onPrev,
  canPrev,
  canNext,
}: {
  card: LegendaryFlashcard;
  flipped: boolean;
  onFlip: () => void;
  onNext: () => void;
  onPrev: () => void;
  canPrev: boolean;
  canNext: boolean;
}): ReactElement {
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
    touchStartY.current = e.touches[0]?.clientY ?? null;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
    const endY = e.changedTouches[0]?.clientY ?? touchStartY.current;
    const dx = endX - touchStartX.current;
    const dy = endY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;
    // Only treat as a horizontal swipe if the X delta dominates the Y delta
    // (so vertical scroll doesn't trigger card advance) and exceeds threshold.
    const SWIPE_THRESHOLD = 50;
    if (Math.abs(dx) < SWIPE_THRESHOLD) return;
    if (Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) {
      if (canNext) onNext();
    } else {
      if (canPrev) onPrev();
    }
  };

  return (
    <div
      className="flashcard-scene mt-5 select-none"
      style={{ height: "22rem" }}
      data-ocid="flashcard.scene"
    >
      <button
        type="button"
        className={cn(
          "flashcard-flipper h-full w-full cursor-pointer",
          flipped && "is-flipped",
        )}
        onClick={onFlip}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        data-ocid="flashcard.flipper"
        aria-label={flipped ? "Show front of card" : "Show back of card"}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onFlip();
          } else if (e.key === "ArrowRight" && canNext) {
            onNext();
          } else if (e.key === "ArrowLeft" && canPrev) {
            onPrev();
          }
        }}
      >
        {/* Front face — title + photo. overflow-y-auto mirrors the back face so
            any content exceeding the fixed 22rem scene scrolls within the card
            instead of spilling past the rounded border. */}
        <div className="flashcard-face flashcard-front flex flex-col overflow-y-auto">
          <FrontFace card={card} />
        </div>

        {/* Back face — detail fields */}
        <div className="flashcard-face flashcard-back overflow-y-auto">
          <BackFace card={card} />
        </div>
      </button>
    </div>
  );
}

function FrontFace({ card }: { card: LegendaryFlashcard }): ReactElement {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      {card.itemPhoto ? (
        <div className="flex w-full flex-1 items-center justify-center overflow-hidden rounded-md border border-legendary-card-border bg-background/40">
          <img
            src={card.itemPhoto}
            alt={card.itemTitle}
            className="max-h-full max-w-full object-contain"
            loading="lazy"
            onError={(e) => {
              const img = e.currentTarget;
              img.style.display = "none";
              const sib = img.nextElementSibling as HTMLElement | null;
              if (sib) sib.style.display = "flex";
            }}
          />
          <div
            className="hidden flex-col items-center gap-2 text-muted-foreground"
            style={{ display: "none" }}
          >
            <ImageOff className="size-8" aria-hidden />
            <span className="font-body text-xs">Photo unavailable</span>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col items-center gap-1.5">
        <span className="font-heading text-xs uppercase tracking-widest text-muted-foreground">
          {card.itemPhoto ? "Item" : "Name"}
        </span>
        <h2 className="font-heading text-2xl uppercase leading-tight tracking-wide text-foreground">
          {card.itemTitle}
        </h2>
      </div>

      <span className="mt-1 inline-flex items-center gap-1.5 font-body text-xs text-muted-foreground">
        <Sparkles className="size-3.5 text-primary" aria-hidden />
        Tap to reveal details
      </span>
    </div>
  );
}

function BackFace({ card }: { card: LegendaryFlashcard }): ReactElement {
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between border-b border-legendary-card-border pb-2">
        <h3 className="font-heading text-base uppercase tracking-wide text-foreground">
          {card.itemTitle}
        </h3>
        <span className="font-heading text-xs uppercase tracking-widest text-muted-foreground">
          Details
        </span>
      </div>

      {card.detailFields.length === 0 ? (
        <p className="font-body text-sm text-muted-foreground">
          No detail fields recorded for this item.
        </p>
      ) : (
        <dl className="flex flex-col gap-2.5">
          {card.detailFields.map((field, i) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: duplicate fieldLabels within a card can collide, index is the stable key
              key={`field-${i}`}
              data-ocid={`flashcard.detail.${i + 1}`}
              className="flex flex-col gap-0.5 border-b border-legendary-card-border/40 pb-2 last:border-b-0 last:pb-0"
            >
              <dt className="font-heading text-xs uppercase tracking-wide text-primary">
                {field.fieldLabel}
              </dt>
              <dd
                className="font-body text-sm text-foreground [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4"
                /* biome-ignore lint/security/noDangerouslySetInnerHtml: admin-authored Quill HTML from restricted toolbar, same pattern as RecipeCardPage */
                dangerouslySetInnerHTML={{ __html: field.value }}
              />
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

/* ----------------------------- Deck controls ----------------------------- */

function DeckControls({
  onPrev,
  onNext,
  canPrev,
  canNext,
  onFlip,
  flipped,
}: {
  onPrev: () => void;
  onNext: () => void;
  canPrev: boolean;
  canNext: boolean;
  onFlip: () => void;
  flipped: boolean;
}): ReactElement {
  return (
    <div className="mt-4 flex items-center justify-between gap-3">
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={onPrev}
        disabled={!canPrev}
        aria-label="Previous card"
        data-ocid="flashcard.prev_button"
      >
        <ChevronLeft className="size-5" aria-hidden />
      </Button>

      <Button
        type="button"
        variant="secondary"
        onClick={onFlip}
        data-ocid="flashcard.flip_button"
        className="flex-1"
      >
        {flipped ? "Show front" : "Show back"}
      </Button>

      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={onNext}
        disabled={!canNext}
        aria-label="Next card"
        data-ocid="flashcard.next_button"
      >
        <ChevronRight className="size-5" aria-hidden />
      </Button>
    </div>
  );
}

function ProgressIndicator({
  current,
  total,
}: {
  current: number;
  total: number;
}): ReactElement {
  const pct = total > 0 ? (current / total) * 100 : 0;
  return (
    <div className="mt-4 flex flex-col gap-1.5">
      <div className="flex items-center justify-between font-heading text-xs uppercase tracking-wide text-muted-foreground">
        <span data-ocid="flashcard.progress_label">
          Card {current} of {total}
        </span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        tabIndex={0}
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={total}
      >
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ------------------------------- End state ------------------------------- */

function EndOfDeck({ onRestart }: { onRestart: () => void }): ReactElement {
  return (
    <section
      className="mt-5 flex flex-col items-center justify-center gap-3 rounded-md bg-legendary-card px-6 py-8 text-center"
      data-ocid="flashcard.end_of_deck"
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-primary/15 text-primary">
        <Sparkles className="size-6" aria-hidden />
      </div>
      <h2 className="font-heading text-lg uppercase tracking-wide text-foreground">
        End of deck
      </h2>
      <p className="max-w-sm font-body text-sm text-muted-foreground">
        You&rsquo;ve reached the last card. Swipe back to review, or start the
        deck over.
      </p>
      <Button
        type="button"
        onClick={onRestart}
        data-ocid="flashcard.start_over_button"
        className="mt-1"
      >
        <RotateCcw className="size-4" aria-hidden />
        Start over
      </Button>
    </section>
  );
}

function EmptyCards({
  activity,
}: {
  activity: LegendaryActivity;
}): ReactElement {
  return (
    <section
      className="mt-6 flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border bg-card px-6 py-12 text-center"
      data-ocid="flashcard.empty_state"
    >
      <h2 className="font-heading text-base uppercase tracking-wide text-foreground">
        No cards in this deck
      </h2>
      <p className="max-w-sm font-body text-sm text-muted-foreground">
        This flashcard activity doesn&rsquo;t have any cards yet. An admin can
        rebuild it from items with detail fields.
      </p>
      <Button variant="outline" asChild data-ocid="flashcard.empty_back_link">
        <Link to="/position/$id/legendary" params={{ id: activity.positionId }}>
          <ArrowLeft className="size-4" aria-hidden />
          Back to activities
        </Link>
      </Button>
    </section>
  );
}

/* ------------------------------- Chrome ---------------------------------- */

function FlashcardHeader({
  activity,
}: {
  activity: LegendaryActivity;
}): ReactElement {
  return (
    <div className="flex flex-col gap-2">
      <BackToActivities positionId={activity.positionId} />
      <h1 className="font-display text-2xl uppercase tracking-wide text-foreground">
        {activity.name}
      </h1>
    </div>
  );
}

function BackToActivities({
  positionId,
}: {
  positionId: string;
}): ReactElement {
  return (
    <Button
      variant="ghost"
      size="sm"
      asChild
      data-ocid="flashcard.back_to_activities_button"
    >
      <Link to="/position/$id/legendary" params={{ id: positionId }}>
        <ArrowLeft className="size-4" aria-hidden />
        Back to activities
      </Link>
    </Button>
  );
}

function FlashcardSkeleton(): ReactElement {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="mt-4 h-6 w-28" />
      <Skeleton className="mt-3 h-1.5 w-full rounded-full" />
      <Skeleton className="mt-5 h-80 w-full rounded-md" />
      <div className="mt-4 flex items-center justify-between">
        <Skeleton className="size-9 rounded-md" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="size-9 rounded-md" />
      </div>
    </div>
  );
}

function FlashcardNotFound({
  activityId,
}: {
  activityId: string;
}): ReactElement {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <section
        className="mt-6 flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border bg-card px-6 py-12 text-center"
        data-ocid="flashcard.not_found"
      >
        <h1 className="font-heading text-lg uppercase tracking-wide text-foreground">
          Activity not found
        </h1>
        <p className="max-w-sm font-body text-sm text-muted-foreground">
          We couldn&rsquo;t load this flashcard deck. It may have been removed.
          Ask an admin to rebuild it, then try again.
        </p>
        <p className="font-mono text-xs text-muted-foreground">
          id: {activityId}
        </p>
      </section>
    </div>
  );
}

function FlashcardWrongKind({
  activity,
}: {
  activity: LegendaryActivity;
}): ReactElement {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <BackToActivities positionId={activity.positionId} />
      <section
        className="mt-6 flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border bg-card px-6 py-12 text-center"
        data-ocid="flashcard.wrong_kind"
      >
        <h1 className="font-heading text-lg uppercase tracking-wide text-foreground">
          Not a flashcard deck
        </h1>
        <p className="max-w-sm font-body text-sm text-muted-foreground">
          This activity is a quiz, not a flashcard set. Open it from the quiz
          entry on the Be Legendary page.
        </p>
      </section>
    </div>
  );
}

export default FlashcardActivity;
