// DrinksBuilderActivity — the Be Legendary Drinks Builder practice game.
//
// Tap-based drink-construction game on a dark roadhouse stage. The player
// builds a drink across four sections (Glassware → Specs → Assembly →
// Garnish) by tapping the correct chips. Correct taps fill the SVG glass,
// build a streak, and award points (when scoring is on). Wrong taps shake
// red, buzz, and break the streak. On completion the glass tops off with
// foam, confetti bursts, a LEGENDARY! banner reveals, and a victory chime
// plays. The next-drink button advances rounds; the final round shows a
// session summary (or just a return-to-list button when scoring is off).
//
// All orchestration lives in useDrinksBuilder (session state, scoring,
// round generation, mute). Sound is synthesized in-app via
// useDrinksBuilderSound (WebAudio, no asset files). Confetti is drawn
// client-side via useConfetti (canvas, no asset files). This component is
// purely presentational — it reads session/settings and wires taps to
// hook.tapChip + sound + confetti side effects.

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Check,
  Flame,
  RotateCcw,
  Star,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";
import type {
  Chip,
  GameRound,
  GameSection,
  GameSectionKind,
  SessionState,
} from "./types";
import { useConfetti } from "./useConfetti";
import { useDrinksBuilder } from "./useDrinksBuilder";
import { useDrinksBuilderSound } from "./useDrinksBuilderSound";

interface DrinksBuilderActivityProps {
  /** The Be Legendary activity id (stringified bigint). */
  activityId: string;
}

/** Section metadata for the four stacked sections, in play order. */
const SECTION_META: Array<{
  kind: GameSectionKind;
  label: string;
  index: number;
}> = [
  { kind: "glassware", label: "Glassware", index: 1 },
  { kind: "specs", label: "Specs", index: 2 },
  { kind: "assembly", label: "Assembly", index: 3 },
  { kind: "garnish", label: "Garnish", index: 4 },
];

export function DrinksBuilderActivity({
  activityId,
}: DrinksBuilderActivityProps): ReactElement {
  const {
    isLoading,
    isError,
    activityName,
    positionId,
    settings,
    session,
    emptyReason,
    tapChip,
    nextDrink,
    restart,
    toggleMute,
  } = useDrinksBuilder(activityId);

  // Sound hook — initialized from the activity's soundDefault once settings
  // arrive. The hook owns its own muted state; we sync it from the session
  // on mount/restart so the two stay aligned (per the task contract).
  const sound = useDrinksBuilderSound(settings?.soundDefault ?? true);

  // Confetti overlay — rendered once, fixed full-screen. burst() is fired
  // when a round completes.
  const { burst, ConfettiCanvas } = useConfetti();

  // Keep the sound hook's mute state in sync with the session's mute state.
  // The session is the source of truth (it survives re-renders); the sound
  // hook is a mirror that gates the play* functions. Sync on session
  // identity changes (mount, restart, external mute toggles).
  const lastSyncedMuted = useRef<boolean | null>(null);
  useEffect(() => {
    if (!session) return;
    if (lastSyncedMuted.current !== session.muted) {
      lastSyncedMuted.current = session.muted;
      sound.setMuted(session.muted);
    }
  }, [session, sound]);

  // Track which round we last celebrated so we fire confetti + chime once
  // per round completion (not on every re-render while the banner is up).
  const celebratedRoundKey = useRef<string>("");
  useEffect(() => {
    if (!session || !settings) return;
    const round = session.rounds[session.currentIndex] ?? null;
    if (!round || !round.complete) return;
    const key = `${session.currentIndex}-${round.drink.id}`;
    if (celebratedRoundKey.current === key) return;
    celebratedRoundKey.current = key;
    // Round just completed — fire the celebration.
    sound.playFinish();
    burst();
  }, [session, settings, sound, burst]);

  // Transient "Step N" popup shown over the game when the player taps the
  // correct assembly step in sequence. Mirrors the rising-points popup
  // pattern (state + setTimeout 900ms). Null when no popup is showing.
  const [showStep, setShowStep] = useState<number | null>(null);
  const stepTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (stepTimer.current) clearTimeout(stepTimer.current);
    };
  }, []);

  // Reset the celebration guard when the session restarts or advances so
  // the next round can celebrate again.
  useEffect(() => {
    if (!session) {
      celebratedRoundKey.current = "";
      lastSyncedMuted.current = null;
    }
  }, [session]);

  if (isLoading) {
    return <DrinksBuilderSkeleton />;
  }

  if (isError) {
    return (
      <DrinksBuilderError
        positionId={positionId}
        onRetry={() => window.location.reload()}
      />
    );
  }

  if (emptyReason === "wrongActivityKind") {
    return <DrinksBuilderWrongKind positionId={positionId} />;
  }

  if (emptyReason === "noPlayable") {
    return (
      <DrinksBuilderEmptyPool
        positionId={positionId}
        activityName={activityName}
      />
    );
  }

  if (!session || !settings) {
    return <DrinksBuilderSkeleton />;
  }

  // Session-finished screen — shown when all rounds are complete.
  if (session.finished) {
    return (
      <SessionSummary
        session={session}
        showScoring={settings.showScoring}
        positionId={positionId ?? ""}
        onRestart={restart}
      />
    );
  }

  const round = session.rounds[session.currentIndex] ?? null;
  if (!round) {
    return <DrinksBuilderSkeleton />;
  }

  const showScore = settings.showScoring;
  const completedSections = round.sections.filter((s) => s.done).length;
  const fillFraction = completedSections / 4;
  const isComplete = round.complete;
  const streak = session.streak;
  const onFire = streak >= 4;
  const streakActive = streak >= 2;

  // Streak multiplier label: x2 at 2, x3 at 3+, ON FIRE at 4+.
  const streakLabel = onFire
    ? "ON FIRE"
    : streak === 3
      ? "x3"
      : streak === 2
        ? "x2"
        : null;

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <ConfettiCanvas />

      {/* Transient "Step N" popup — centered over the game on a correct
          assembly tap. Auto-dismisses after ~900ms (see showStep state).
          pointer-events-none so it never blocks taps underneath. */}
      {showStep !== null ? (
        <div
          className="pointer-events-none fixed inset-x-0 top-1/3 z-40 flex justify-center px-4"
          aria-live="polite"
          data-ocid="drinks.assembly.step_popup"
        >
          <span className="inline-flex items-center rounded-full border border-primary/50 bg-gradient-to-r from-[oklch(var(--legendary-banner-from))] via-[oklch(var(--legendary-banner-via))] to-[oklch(var(--legendary-banner-to))] px-5 py-2 font-display text-lg uppercase tracking-wide text-[oklch(var(--legendary-banner-foreground))] shadow-subtle animate-drinks-legendary-banner">
            Step {showStep}
          </span>
        </div>
      ) : null}

      <DrinksBuilderHeader
        positionId={positionId ?? ""}
        showScore={showScore}
        score={session.score}
        muted={sound.muted}
        onToggleMute={() => {
          sound.toggleMute();
          toggleMute();
        }}
      />

      <main className="mx-auto w-full max-w-md px-4 pb-16">
        {/* Hero row — SVG glass + drink meta */}
        <section
          className="mt-4 flex items-center gap-4"
          data-ocid="drinks.hero.section"
          aria-label="Current drink"
        >
          <DrinksGlass
            fillFraction={fillFraction}
            isComplete={isComplete}
            color={round.drink.color}
          />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h2
              className="break-words text-balance font-display text-2xl uppercase leading-tight tracking-wide text-foreground"
              data-ocid="drinks.hero.drink_name"
            >
              {round.drink.title}
            </h2>
            <span
              className="inline-flex w-fit items-center rounded-sm border border-secondary/50 bg-secondary/20 px-2 py-0.5 font-heading text-[0.65rem] uppercase tracking-[0.2em] text-secondary-foreground"
              data-ocid="drinks.hero.category_badge"
            >
              {round.drink.categoryName || "Classic"}
            </span>
            {showScore &&
            settings.streakMultiplier &&
            streakActive &&
            streakLabel ? (
              <span
                className={cn(
                  "inline-flex w-fit items-center gap-1 font-heading text-xs uppercase tracking-wide",
                  onFire
                    ? "text-drinks-streak-flame animate-drinks-streak-flame"
                    : "text-drinks-section-done",
                )}
                data-ocid="drinks.hero.streak_indicator"
              >
                <Flame className="size-4" aria-hidden />
                {streakLabel} STREAK
              </span>
            ) : null}
          </div>
        </section>

        {/* Four stacked sections */}
        <section
          className="mt-6 flex flex-col gap-3"
          data-ocid="drinks.sections"
          aria-label="Drink sections"
        >
          {SECTION_META.map((meta) => {
            const section = round.sections.find((s) => s.kind === meta.kind);
            if (!section) return null;
            // Find the first not-done section's meta index to determine
            // which section is active and which are future/done.
            const activeMeta = SECTION_META.find(
              (m) => !round.sections.find((s) => s.kind === m.kind)?.done,
            );
            const activeMetaIndex = activeMeta ? activeMeta.index : 5;
            const isActive = meta.index === activeMetaIndex;
            const isFuture = meta.index > activeMetaIndex;
            return (
              <SectionCard
                key={meta.kind}
                section={section}
                label={meta.label}
                index={meta.index}
                isActive={isActive}
                isFuture={isFuture}
                showScore={showScore}
                pointsPerCorrect={settings.pointsPerCorrect}
                streakMultiplier={settings.streakMultiplier}
                streak={streak}
                enforceAssemblyOrder={settings.enforceAssemblyOrder}
                onTapChip={(chipId) => {
                  const chip = section.chips.find((c) => c.id === chipId);
                  if (!chip || chip.selected) return;
                  // The hook is the single source of truth for whether a
                  // tap was correct or wrong — including the assembly-order
                  // case where a statically-correct chip tapped out of order
                  // is downgraded to a wrong tap. We branch on the returned
                  // TapResult so out-of-order assembly taps play the buzzer
                  // + haptic, not the correct chime.
                  const result = tapChip(section.kind, chipId);
                  if (result === "correct") {
                    sound.playCorrect();
                    // Show a transient "Step N" popup on a correct
                    // assembly tap. The step number is the recipe array
                    // index (1-based) of the step just tapped — i.e. the
                    // position of that step in the drink's assembly array
                    // — read from chip.orderIndex. We fall back to the
                    // count of selected correct assembly chips + 1 when
                    // orderIndex is undefined (defensive; should not
                    // happen for assembly chips since buildRound tags
                    // every correct assembly chip with orderIndex).
                    if (section.kind === "assembly" && chip.isCorrect) {
                      const stepNumber =
                        typeof chip.orderIndex === "number"
                          ? chip.orderIndex + 1
                          : section.chips.filter(
                              (c) => c.isCorrect && c.selected,
                            ).length + 1;
                      setShowStep(stepNumber);
                      if (stepTimer.current) clearTimeout(stepTimer.current);
                      stepTimer.current = setTimeout(
                        () => setShowStep(null),
                        900,
                      );
                    }
                  } else if (result === "wrong") {
                    sound.playWrong();
                    if (typeof navigator !== "undefined" && navigator.vibrate) {
                      try {
                        navigator.vibrate(200);
                      } catch {
                        // ignore — haptics are best-effort
                      }
                    }
                  }
                  // "noop" — no feedback (finished section, already-selected
                  // chip, finished round, or null session).
                }}
              />
            );
          })}
        </section>

        {/* LEGENDARY! banner + drink photo + star rating + next-drink button */}
        {isComplete ? (
          <LegendaryBanner
            round={round}
            showScore={showScore}
            score={session.score}
            isLastRound={session.currentIndex + 1 >= session.rounds.length}
            onNextDrink={nextDrink}
          />
        ) : null}
      </main>
    </div>
  );
}

/* ------------------------------- Header ---------------------------------- */

function DrinksBuilderHeader({
  positionId,
  showScore,
  score,
  muted,
  onToggleMute,
}: {
  positionId: string;
  showScore: boolean;
  score: number;
  muted: boolean;
  onToggleMute: () => void;
}): ReactElement {
  return (
    <header
      className="sticky top-0 z-30 border-b border-border bg-card"
      data-ocid="drinks.header"
    >
      <div className="mx-auto flex w-full max-w-md items-center justify-between gap-2 px-4 py-3">
        <Button
          variant="ghost"
          size="sm"
          asChild
          data-ocid="drinks.back_button"
          className="text-muted-foreground hover:text-foreground"
        >
          <Link
            to="/position/$id/legendary"
            params={{ id: positionId }}
            aria-label="Back to Be Legendary"
          >
            <ArrowLeft className="size-4" />
          </Link>
        </Button>

        <h1
          className="font-display text-xl uppercase leading-none tracking-wide text-foreground"
          data-ocid="drinks.header.title"
        >
          Be Legendary
        </h1>

        <div className="flex items-center gap-2">
          {showScore ? (
            <span
              className="font-heading text-lg tabular-nums tracking-wide text-foreground"
              data-ocid="drinks.header.score"
              aria-label={`Score ${score}`}
            >
              {score}
            </span>
          ) : null}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleMute}
            aria-label={muted ? "Unmute sound" : "Mute sound"}
            aria-pressed={muted}
            data-ocid="drinks.mute_toggle"
            className="text-muted-foreground hover:text-foreground"
          >
            {muted ? (
              <VolumeX className="size-4" />
            ) : (
              <Volume2 className="size-4" />
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}

/* ------------------------------ Glass hero ------------------------------- */

/**
 * DrinksGlass — SVG martini glass that fills proportionally to completed
 * sections. Liquid rises from the bottom of the bowl; foam appears on
 * completion. The fill uses the drink's color (defaulting to amber/gold
 * via the drinks-liquid tokens). The liquid rect's height is driven by
 * fillFraction; the drinks-glass-fill transition smooths the rise.
 */
function DrinksGlass({
  fillFraction,
  isComplete,
  color,
}: {
  fillFraction: number;
  isComplete: boolean;
  color: string;
}): ReactElement {
  const clamped = Math.max(0, Math.min(1, fillFraction));
  // Bowl spans y=20..80 (height 60). Liquid rises from the bottom (y=80)
  // up to y = 80 - 60*fill. We render the liquid as a polygon matching the
  // bowl's triangular silhouette so it always clips to the glass shape.
  const liquidTop = 80 - 60 * clamped;
  // Foam sits just above the liquid when complete; otherwise hidden.
  const foamY = 20;

  return (
    <svg
      viewBox="0 0 100 110"
      className="size-20 shrink-0"
      role="img"
      aria-label={
        isComplete
          ? "Filled martini glass, complete"
          : `Martini glass, ${Math.round(clamped * 100)}% filled`
      }
      data-ocid="drinks.hero.glass"
    >
      {/* Bowl outline */}
      <polygon
        points="20,20 80,20 50,80"
        fill="none"
        className="stroke-drinks-glass"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Liquid fill (clipped to the bowl) */}
      <clipPath id="drinks-bowl-clip">
        <polygon points="20,20 80,20 50,80" />
      </clipPath>
      <g clipPath="url(#drinks-bowl-clip)">
        {clamped > 0 ? (
          <polygon
            points={`20,${liquidTop} 80,${liquidTop} 50,80`}
            fill={color}
            className="drinks-glass-fill"
            style={{ transformOrigin: "50px 80px" }}
          />
        ) : null}
        {/* Foam cap — only when complete */}
        {isComplete ? (
          <ellipse
            cx="50"
            cy={foamY + 4}
            rx="30"
            ry="6"
            className="fill-drinks-foam drinks-glass-foam is-complete"
          />
        ) : null}
      </g>
      {/* Glass shine */}
      <line
        x1="28"
        y1="26"
        x2="44"
        y2="58"
        className="fill-drinks-glass-shine"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Stem + base */}
      <line
        x1="50"
        y1="80"
        x2="50"
        y2="98"
        className="stroke-drinks-glass"
        strokeWidth="2"
      />
      <line
        x1="36"
        y1="98"
        x2="64"
        y2="98"
        className="stroke-drinks-glass"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* --------------------------- Section card -------------------------------- */

function SectionCard({
  section,
  label,
  index,
  isActive,
  isFuture,
  showScore,
  pointsPerCorrect,
  streakMultiplier,
  streak,
  enforceAssemblyOrder,
  onTapChip,
}: {
  section: GameSection;
  label: string;
  index: number;
  isActive: boolean;
  isFuture: boolean;
  showScore: boolean;
  pointsPerCorrect: number;
  streakMultiplier: boolean;
  streak: number;
  enforceAssemblyOrder: boolean;
  onTapChip: (chipId: string) => void;
}): ReactElement {
  const done = section.done;
  // For assembly, show the correct position number on locked-correct chips.
  // The hook flattens assembly to a single correct step, so the correct
  // chip is position 1. We render the number badge on the correct chip
  // once it's locked.
  const isAssembly = section.kind === "assembly";

  return (
    <div
      className={cn(
        "rounded-md border p-4 transition-smooth",
        done
          ? "border-drinks-correct/60 bg-drinks-correct/10"
          : isActive
            ? "border-primary/50 bg-card"
            : "border-border bg-card/60",
        isFuture && "opacity-50",
      )}
      data-ocid={`drinks.section.${section.kind}`}
      aria-label={label}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-full transition-smooth",
            done
              ? "bg-drinks-correct text-drinks-correct-foreground"
              : "bg-muted text-drinks-section-pending",
          )}
          aria-hidden
        >
          <Check className="size-3.5" />
        </span>
        <h3
          className="font-heading text-sm uppercase tracking-[0.2em] text-foreground"
          data-ocid={`drinks.section.${section.kind}.label`}
        >
          {label}
        </h3>
        <span
          className="ml-auto font-heading text-[0.65rem] uppercase tracking-wide text-muted-foreground"
          aria-hidden
        >
          {index}/4
        </span>
      </div>

      {/* Chip grid */}
      <div
        className="mt-3 flex flex-wrap gap-2"
        data-ocid={`drinks.section.${section.kind}.chips`}
      >
        {section.chips.length === 0 ? (
          <p className="w-full rounded-sm border border-dashed border-border/60 px-3 py-2 text-center font-body text-xs text-muted-foreground">
            No options for this section.
          </p>
        ) : (
          section.chips.map((chip, i) => (
            <ChipButton
              key={chip.id}
              chip={chip}
              index={i}
              sectionKind={section.kind}
              isAssembly={isAssembly}
              enforceAssemblyOrder={enforceAssemblyOrder}
              disabled={!isActive || chip.selected}
              showScore={showScore}
              pointsPerCorrect={pointsPerCorrect}
              streakMultiplier={streakMultiplier}
              streak={streak}
              onTap={() => onTapChip(chip.id)}
            />
          ))
        )}
      </div>

      {/* Helper line for the active section */}
      {isActive && !done ? (
        <p className="mt-2 font-body text-[0.7rem] text-muted-foreground">
          {section.kind === "glassware" && "Tap the correct glass."}
          {section.kind === "specs" && "Tap every correct spec."}
          {section.kind === "assembly" &&
            "Pick the steps of building this drink in order."}
          {section.kind === "garnish" && "Tap every correct garnish."}
        </p>
      ) : null}
    </div>
  );
}

/* ------------------------------ Chip button ------------------------------ */

function ChipButton({
  chip,
  index,
  sectionKind,
  isAssembly,
  enforceAssemblyOrder,
  disabled,
  showScore,
  pointsPerCorrect,
  streakMultiplier,
  streak,
  onTap,
}: {
  chip: Chip;
  index: number;
  sectionKind: GameSectionKind;
  isAssembly: boolean;
  enforceAssemblyOrder: boolean;
  disabled: boolean;
  showScore: boolean;
  pointsPerCorrect: number;
  streakMultiplier: boolean;
  streak: number;
  onTap: () => void;
}): ReactElement {
  // Track whether the rising-points popup has been shown for this chip so
  // it only fires once (on the tap that locks the chip as correct).
  const [showPoints, setShowPoints] = useState(false);
  useEffect(() => {
    if (chip.feedback === "correct" && chip.selected) {
      setShowPoints(true);
      const t = setTimeout(() => setShowPoints(false), 900);
      return () => clearTimeout(t);
    }
  }, [chip.feedback, chip.selected]);

  const isCorrectFeedback = chip.feedback === "correct";
  const isIncorrectFeedback = chip.feedback === "incorrect";
  const isLocked = chip.selected;

  // Compute the points value for the rising popup. The hook awards
  // pointsPerCorrect (+ streak bonus) only on the tap that completes a
  // round; for non-completing correct taps the hook awards 0. We can't
  // know from the chip alone whether this tap completed the round, so we
  // show the base points value as the popup (the actual score delta is
  // applied by the hook and reflected in the header score). This keeps the
  // popup meaningful without duplicating the hook's scoring logic.
  const popupValue = streakMultiplier
    ? pointsPerCorrect * Math.min(5, Math.max(1, streak))
    : pointsPerCorrect;

  return (
    <button
      type="button"
      onClick={onTap}
      disabled={disabled}
      data-ocid={`drinks.section.${sectionKind}.chip.${index + 1}`}
      aria-label={`${chip.label}${isLocked ? ", selected" : ""}`}
      className={cn(
        "relative inline-flex min-h-11 items-center gap-2 rounded-md border px-3 py-2 text-left font-body text-sm transition-smooth",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        !isLocked &&
          !disabled &&
          "border-drinks-chip-border bg-drinks-chip text-foreground hover:border-primary/60 hover:bg-drinks-chip/80",
        !isLocked &&
          disabled &&
          "border-border bg-card/40 text-muted-foreground opacity-60 cursor-not-allowed",
        isCorrectFeedback &&
          "border-drinks-correct bg-drinks-correct/15 text-drinks-correct animate-drinks-green-pop",
        isIncorrectFeedback &&
          "border-drinks-incorrect bg-drinks-incorrect/15 text-drinks-incorrect animate-drinks-red-shake",
      )}
    >
      {/* Assembly position number badge — shown on locked-correct chips.
           When the chip carries a recipe array index (orderIndex), show
           that step number (1-based); otherwise fall back to the chip's
           position in the shuffled array (index + 1) when
           enforceAssemblyOrder is on, or a generic "1" marker. */}
      {isAssembly && isLocked && isCorrectFeedback ? (
        <span
          className="flex size-5 shrink-0 items-center justify-center rounded-full bg-drinks-correct text-[0.6rem] font-semibold text-drinks-correct-foreground"
          aria-hidden
        >
          {enforceAssemblyOrder ? (chip.orderIndex ?? index) + 1 : 1}
        </span>
      ) : null}

      <span className="min-w-0 flex-1 break-words">{chip.label}</span>

      {/* Locked indicator icon */}
      {isCorrectFeedback ? (
        <Check className="size-3.5 shrink-0" aria-hidden />
      ) : null}

      {/* Rising +points popup — only when scoring is on */}
      {showPoints && showScore ? (
        <span
          className="pointer-events-none absolute -top-2 right-2 font-heading text-xs font-semibold text-drinks-section-done animate-drinks-rising-points"
          aria-hidden
          data-ocid={`drinks.section.${sectionKind}.points.${index + 1}`}
        >
          +{popupValue}
        </span>
      ) : null}
    </button>
  );
}

/* --------------------------- Legendary banner ---------------------------- */

function LegendaryBanner({
  round,
  showScore,
  score,
  isLastRound,
  onNextDrink,
}: {
  round: GameRound;
  showScore: boolean;
  score: number;
  isLastRound: boolean;
  onNextDrink: () => void;
}): ReactElement {
  // Star rating: 3 stars = 0 wrong, 2 = 1-2 wrong, 1 = 3+ wrong.
  const wrong = round.wrongTaps;
  const stars = wrong === 0 ? 3 : wrong <= 2 ? 2 : 1;
  const drink = round.drink;
  // Extract the photo into a local const so TypeScript narrows it through
  // the typeof check for JSX use (a hasPhoto boolean alone does not narrow
  // drink.photo).
  const photo = drink.photo;
  const hasPhoto = typeof photo === "string" && photo.length > 0;
  // Lightbox state — only the finish-screen photo opens it.
  const [lightboxOpen, setLightboxOpen] = useState(false);

  return (
    <section
      className="mt-8 flex flex-col items-center gap-4"
      data-ocid="drinks.finish.section"
      aria-label="Drink complete"
    >
      {/* Drink photo (or filled-glass fallback) — the centerpiece of the
          finish moment. Always visible (even when scoring is off) so the
          moment still celebrates completion. The photo is shown uncropped
          at its natural aspect ratio (object-contain, width 100%, height
          auto) and is tappable to open a full-size lightbox Dialog. */}
      <div
        className="relative flex w-full max-w-xs flex-col items-center gap-3 rounded-lg border border-primary/40 bg-card/80 p-5 shadow-subtle animate-drinks-legendary-banner"
        data-ocid="drinks.finish.photo_card"
      >
        {hasPhoto ? (
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            className="group block w-full cursor-zoom-in rounded-md border border-border bg-background/60 p-2 transition-smooth hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label={`Open ${drink.title} drink full size`}
            data-ocid="drinks.finish.photo_frame"
          >
            <img
              src={photo}
              alt={`${drink.title} drink`}
              className="block h-auto w-full object-contain"
              loading="lazy"
              data-ocid="drinks.finish.photo"
            />
          </button>
        ) : (
          <div
            className="flex w-full items-center justify-center rounded-md border border-border bg-background/60 p-4"
            data-ocid="drinks.finish.photo_frame"
          >
            <DrinksGlass fillFraction={1} isComplete color={drink.color} />
          </div>
        )}
        <p
          className="break-words text-balance text-center font-display text-lg uppercase leading-tight tracking-wide text-foreground"
          data-ocid="drinks.finish.drink_name"
        >
          {drink.title}
        </p>
        {drink.categoryName ? (
          <span
            className="inline-flex w-fit items-center rounded-sm border border-secondary/50 bg-secondary/20 px-2 py-0.5 font-heading text-[0.65rem] uppercase tracking-[0.2em] text-secondary-foreground"
            data-ocid="drinks.finish.category_badge"
          >
            {drink.categoryName}
          </span>
        ) : null}
      </div>

      {/* Lightbox Dialog — full uncropped drink photo over a dark roadhouse
          backdrop. Tapping the backdrop or the close button dismisses it.
          Only rendered when a photo exists. */}
      {hasPhoto ? (
        <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
          <DialogContent
            className="max-w-[90vw] max-h-[80vh] border-primary/40 bg-card p-0 overflow-hidden"
            data-ocid="drinks.finish.lightbox"
          >
            <DialogTitle className="sr-only">{drink.title}</DialogTitle>
            <div className="flex flex-col">
              <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                <p
                  className="break-words text-balance font-display text-base uppercase leading-tight tracking-wide text-foreground"
                  data-ocid="drinks.finish.lightbox.title"
                >
                  {drink.title}
                </p>
                <DialogClose
                  asChild
                  data-ocid="drinks.finish.lightbox.close_button"
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Close lightbox"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-4" aria-hidden />
                  </Button>
                </DialogClose>
              </div>
              <div className="flex items-center justify-center bg-background/80 p-3">
                <img
                  src={photo}
                  alt={`${drink.title} drink`}
                  className="block h-auto max-h-[70vh] w-auto max-w-full object-contain"
                  data-ocid="drinks.finish.lightbox.photo"
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}

      <div
        className="w-full rounded-md border border-primary/40 bg-gradient-to-r from-[oklch(var(--legendary-banner-from))] via-[oklch(var(--legendary-banner-via))] to-[oklch(var(--legendary-banner-to))] px-4 py-6 text-center animate-drinks-legendary-banner"
        data-ocid="drinks.legendary_banner"
      >
        <p className="font-display text-3xl uppercase tracking-wide text-[oklch(var(--legendary-banner-foreground))]">
          Legendary!
        </p>
        <p className="mt-1 font-heading text-xs uppercase tracking-[0.2em] text-[oklch(var(--legendary-banner-foreground))]/80">
          {round.drink.title} complete
        </p>
      </div>

      {/* Star rating — hidden when scoring is off */}
      {showScore ? (
        <div
          className="flex items-center gap-1"
          data-ocid="drinks.star_rating"
          aria-label={`${stars} out of 3 stars`}
        >
          {[1, 2, 3].map((s) => (
            <Star
              key={s}
              className={cn(
                "size-7 animate-drinks-star-pop",
                s <= stars
                  ? "fill-drinks-star text-drinks-star"
                  : "text-muted-foreground/40",
              )}
              style={{ animationDelay: `${(s - 1) * 0.12}s` }}
              aria-hidden
            />
          ))}
        </div>
      ) : null}

      {/* Score — shown only when scoring is on, mirrors the header gating */}
      {showScore ? (
        <p
          className="font-heading text-sm uppercase tracking-[0.2em] text-muted-foreground"
          data-ocid="drinks.finish.score"
          aria-label={`Score ${score}`}
        >
          Score{" "}
          <span className="font-display text-lg tabular-nums text-foreground">
            {score}
          </span>
        </p>
      ) : null}

      <Button
        type="button"
        onClick={onNextDrink}
        data-ocid="drinks.next_drink_button"
        className="min-w-40"
      >
        {isLastRound ? "See results" : "Next drink"}
      </Button>
    </section>
  );
}

/* --------------------------- Session summary ----------------------------- */

function SessionSummary({
  session,
  showScoring,
  positionId,
  onRestart,
}: {
  session: SessionState;
  showScoring: boolean;
  positionId: string;
  onRestart: () => void;
}): ReactElement {
  // Stars earned across the session: 3 stars per perfect round (0 wrong),
  // 2 per mostly-correct (1-2 wrong), 1 per completed round (3+ wrong).
  const starsEarned = session.rounds.reduce((acc, r) => {
    if (!r.complete) return acc;
    return acc + (r.wrongTaps === 0 ? 3 : r.wrongTaps <= 2 ? 2 : 1);
  }, 0);

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <DrinksBuilderHeader
        positionId={positionId}
        showScore={false}
        score={0}
        muted
        onToggleMute={() => {}}
      />
      <main
        className="mx-auto flex w-full max-w-md flex-col items-center gap-6 px-4 py-12 text-center"
        data-ocid="drinks.session_summary"
      >
        <h1
          className="font-display text-3xl uppercase tracking-wide text-foreground"
          data-ocid="drinks.session_summary.title"
        >
          Session complete
        </h1>

        {showScoring ? (
          <div className="grid w-full grid-cols-3 gap-3">
            <SummaryStat
              label="Score"
              value={String(session.score)}
              dataOcid="drinks.session_summary.score"
            />
            <SummaryStat
              label="Stars"
              value={String(starsEarned)}
              dataOcid="drinks.session_summary.stars"
            />
            <SummaryStat
              label="Drinks"
              value={String(session.completedDrinks)}
              dataOcid="drinks.session_summary.drinks"
            />
          </div>
        ) : (
          <p className="max-w-sm font-body text-sm text-muted-foreground">
            You built {session.completedDrinks}{" "}
            {session.completedDrinks === 1 ? "drink" : "drinks"}. Nice reps.
          </p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            type="button"
            onClick={onRestart}
            data-ocid="drinks.session_summary.restart_button"
          >
            <RotateCcw className="size-4" aria-hidden />
            Play again
          </Button>
          <Button
            variant="outline"
            asChild
            data-ocid="drinks.session_summary.back_button"
          >
            <Link to="/position/$id/legendary" params={{ id: positionId }}>
              <ArrowLeft className="size-4" aria-hidden />
              Back to Be Legendary
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  dataOcid,
}: {
  label: string;
  value: string;
  dataOcid: string;
}): ReactElement {
  return (
    <div
      className="flex flex-col items-center gap-1 rounded-md border border-border bg-card px-3 py-4"
      data-ocid={dataOcid}
    >
      <span className="font-display text-2xl tabular-nums text-foreground">
        {value}
      </span>
      <span className="font-heading text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

/* ------------------------------ States ----------------------------------- */

function DrinksBuilderSkeleton(): ReactElement {
  return (
    <div
      className="min-h-[100dvh] bg-background"
      data-ocid="drinks.loading_state"
    >
      <div className="mx-auto w-full max-w-md px-4 py-4">
        <Skeleton className="h-12 w-full rounded-md" />
        <div className="mt-4 flex items-center gap-4">
          <Skeleton className="size-20 rounded-md" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-md" />
          ))}
        </div>
      </div>
    </div>
  );
}

function DrinksBuilderError({
  positionId,
  onRetry,
}: {
  positionId: string | null;
  onRetry: () => void;
}): ReactElement {
  return (
    <div
      className="mx-auto flex w-full max-w-md flex-col items-center justify-center gap-4 px-4 py-20 text-center"
      data-ocid="drinks.error_state"
    >
      <h2 className="font-display text-2xl uppercase tracking-wide text-foreground">
        Couldn't load the game
      </h2>
      <p className="max-w-xs font-body text-sm text-muted-foreground">
        We couldn't load this Drinks Builder session. Reloading usually fixes
        it.
      </p>
      <Button onClick={onRetry} data-ocid="drinks.error_state.retry_button">
        Reload
      </Button>
      {positionId ? (
        <Button
          variant="ghost"
          size="sm"
          asChild
          data-ocid="drinks.error_state.back_button"
        >
          <Link to="/position/$id/legendary" params={{ id: positionId }}>
            <ArrowLeft className="size-4" />
            Back to Be Legendary
          </Link>
        </Button>
      ) : null}
    </div>
  );
}

function DrinksBuilderWrongKind({
  positionId,
}: {
  positionId: string | null;
}): ReactElement {
  return (
    <div
      className="mx-auto flex w-full max-w-md flex-col items-center justify-center gap-4 px-4 py-20 text-center"
      data-ocid="drinks.empty_state"
    >
      <h2 className="font-display text-2xl uppercase tracking-wide text-foreground">
        Not a Drinks Builder game
      </h2>
      <p className="max-w-xs font-body text-sm text-muted-foreground">
        This activity isn't a Drinks Builder game. Head back to Be Legendary to
        pick a Drinks Builder activity.
      </p>
      {positionId ? (
        <Button
          variant="ghost"
          size="sm"
          asChild
          data-ocid="drinks.empty_state.back_button"
        >
          <Link to="/position/$id/legendary" params={{ id: positionId }}>
            <ArrowLeft className="size-4" />
            Back to Be Legendary
          </Link>
        </Button>
      ) : null}
    </div>
  );
}

function DrinksBuilderEmptyPool({
  positionId,
  activityName,
}: {
  positionId: string | null;
  activityName: string | null;
}): ReactElement {
  return (
    <div
      className="mx-auto flex w-full max-w-md flex-col items-center justify-center gap-4 px-4 py-20 text-center"
      data-ocid="drinks.empty_state"
    >
      <h2 className="font-display text-2xl uppercase tracking-wide text-foreground">
        No playable drinks
      </h2>
      <p className="max-w-xs font-body text-sm text-muted-foreground">
        {activityName
          ? `"${activityName}" has no in-scope recipes yet. An admin needs to add recipes with glassware, specs, and assembly to the source categories.`
          : "This activity has no in-scope recipes yet. An admin needs to add recipes with glassware, specs, and assembly to the source categories."}
      </p>
      {positionId ? (
        <Button
          variant="ghost"
          size="sm"
          asChild
          data-ocid="drinks.empty_state.back_button"
        >
          <Link to="/position/$id/legendary" params={{ id: positionId }}>
            <ArrowLeft className="size-4" />
            Back to Be Legendary
          </Link>
        </Button>
      ) : null}
    </div>
  );
}

export default DrinksBuilderActivity;
