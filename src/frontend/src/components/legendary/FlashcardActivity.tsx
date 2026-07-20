import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLegendaryActivity } from "@/hooks/useLegendary";
import { cn } from "@/lib/utils";
import type {
  LegendaryActivity,
  LegendaryFlashcard,
  LegendaryFlashcardRecipe,
} from "@/types/legendary";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ImageOff,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ReactElement, ReactNode } from "react";

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

/* ───────────────────────────────────────────────────────────────────────
   Reading-wave gold glow sweep
   ───────────────────────────────────────────────────────────────────────

   When the card flips to the back, a gold glow wave flows through every
    character on the back face in reading order over ~28s. Each character
    briefly takes on the gold --legendary-glow color + a soft gold
    text-shadow as the wave passes, then returns to normal. No font-size
    or layout change — the effect is purely color + text-shadow per
    character, so nothing reflows.

    Mechanism:
      - useReadingWave(active, totalChars) drives a requestAnimationFrame
        loop that advances --wave-progress from 0 to 1 over WAVE_DURATION
        (28s). It cancels on unmount or when `active` flips to false, and
        restarts cleanly whenever `active` goes true (so flip-back-to-front
        then flip-again starts the sweep from the beginning).
     - The container (.flashcard-wave) gets --wave-progress and --wave-count
       set inline; .is-active is toggled so the CSS only applies the glow
       while the wave is running.
     - Each character is a .flashcard-wave-char span with --wave-i set to
       its reading-order index. CSS computes the distance from the current
       wave position and blends the inherited color with the gold glow by
       an intensity falloff (see index.css).
     - prefers-reduced-motion: the CSS guard in index.css skips the glow
       entirely; the hook still runs but the visual effect is a no-op, so
       text just appears normally on flip.

   Reading order is established by the order React renders the
   WaveText / WaveHtml spans: title first, then (recipe) glassware,
   specs, assembly, garnish top-to-bottom; (generic) each detailField's
   label then value in document order. Each WaveText/WaveHtml mounts with
   a starting index offset so the whole back face shares one continuous
   character index space. The parent BackFace owns the running counter
   via a ref and passes the start index to each child; children return
   the count of characters they consumed so the next child continues.
*/

const WAVE_DURATION_MS = 55000;

/**
 * Drives the reading-wave progress custom property. Returns a ref to
 * attach to the .flashcard-wave container; the hook writes --wave-progress
 * and toggles the .is-active class on it directly.
 *
 * `active` should be true only while the back face is showing AND the
 * total character count is known (> 0). When `active` transitions to
 * false (flip back to front, or navigation), the loop cancels and the
 * container is reset to inactive so the glow clears immediately.
 */
function useReadingWave(
  active: boolean,
  totalChars: number,
): React.RefObject<HTMLDivElement | null> {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // No characters to sweep, or reduced motion: leave text normal.
    if (totalChars <= 0) {
      el.classList.remove("is-active");
      el.style.setProperty("--wave-progress", "-1");
      return;
    }

    if (!active) {
      el.classList.remove("is-active");
      el.style.setProperty("--wave-progress", "-1");
      return;
    }

    // Start the sweep.
    el.classList.add("is-active");
    el.style.setProperty("--wave-count", String(totalChars));
    el.style.setProperty("--wave-progress", "0");

    let rafId = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / WAVE_DURATION_MS, 1);
      el.style.setProperty("--wave-progress", progress.toFixed(6));
      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        // Wave complete: return all text to normal.
        el.classList.remove("is-active");
        el.style.setProperty("--wave-progress", "-1");
      }
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      el.classList.remove("is-active");
      el.style.setProperty("--wave-progress", "-1");
    };
  }, [active, totalChars]);

  return containerRef;
}

/**
 * Splits a plain string into per-character spans in reading order, each
 * tagged with its sequential index starting at `startIndex`. Returns the
 * rendered spans and the number of characters consumed (so the next
 * WaveText/WaveHtml can continue the index space).
 *
 * Whitespace is preserved: spaces become .is-wave-space spans with
 * white-space:pre so they keep their width without the glow.
 */
function WaveText({
  text,
  startIndex,
  className,
}: {
  text: string;
  startIndex: number;
  className?: string;
}): { node: ReactElement; count: number } {
  const chars = Array.from(text);
  const node = (
    <>
      {chars.map((ch, i) => {
        const isSpace = /\s/.test(ch);
        return (
          <span
            key={`w-${startIndex + i}`}
            className={cn(
              "flashcard-wave-char",
              isSpace && "is-wave-space",
              className,
            )}
            style={{ ["--wave-i" as string]: startIndex + i }}
          >
            {ch}
          </span>
        );
      })}
    </>
  );
  return { node, count: chars.length };
}

/**
 * Wraps every text node inside an HTML-rendered container (e.g. a Quill
 * value emitted via dangerouslySetInnerHTML) in per-character
 * .flashcard-wave-char spans, preserving the original element structure
 * (lists stay lists, bold stays bold, etc.) so the visual rendering is
 * unchanged. Characters are indexed in document order starting at
 * `startIndex`.
 *
 * This is done imperatively after the browser parses the HTML, using a
 * TreeWalker to find text nodes and splitting each into spans. The
 * container ref is returned for the parent to attach; the parent reads
 * `count` (set on the element via a data attribute) to continue the
 * index space.
 */
function useWaveHtml(
  html: string,
  startIndex: number,
  active: boolean,
): {
  ref: React.RefObject<HTMLDivElement | null>;
  count: number;
} {
  const ref = useRef<HTMLDivElement | null>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Reset to a clean slate, then set the HTML.
    el.innerHTML = html;

    // Walk all text nodes in document order and wrap each character.
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) =>
        node.nodeValue && node.nodeValue.length > 0
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT,
    });

    let runningIndex = startIndex;
    const textNodes: Text[] = [];
    let current = walker.nextNode();
    while (current) {
      textNodes.push(current as Text);
      current = walker.nextNode();
    }

    for (const textNode of textNodes) {
      const text = textNode.nodeValue ?? "";
      const chars = Array.from(text);
      const frag = document.createDocumentFragment();
      for (const ch of chars) {
        const isSpace = /\s/.test(ch);
        const span = document.createElement("span");
        span.className = cn("flashcard-wave-char", isSpace && "is-wave-space");
        span.style.setProperty("--wave-i", String(runningIndex));
        span.textContent = ch;
        frag.appendChild(span);
        runningIndex += 1;
      }
      textNode.parentNode?.replaceChild(frag, textNode);
    }

    setCount(runningIndex - startIndex);
    // The count does not depend on `active`; we only re-run when html or
    // startIndex changes. `active` is referenced to satisfy lint without
    // changing behavior — the wave CSS handles active/inactive.
    void active;
  }, [html, startIndex, active]);

  return { ref, count };
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
  // Compute the flat reading-order list of text runs and their start
  // indices so the whole back face shares one continuous character index
  // space for the wave. The title is always first; then either the
  // recipe sections (glassware/specs/assembly/garnish) or the generic
  // detailFields (label + value each).
  const runs = computeBackFaceRuns(card);
  const totalChars = runs.reduce((sum, r) => sum + r.text.length, 0);

  // The wave runs only while the back face is showing. BackFace is only
  // mounted while flipped (the flipper shows the back face via CSS, but
  // BackFace is always in the DOM). We drive the wave with a local
  // `active` state toggled by an IntersectionObserver-style check: the
  // flipper has the .is-flipped class while flipped. We observe it.
  // Simpler: pass `flipped` down. But BackFace doesn't receive it.
  // Instead, we observe the parent flipper's class via a MutationObserver
  // on the closest .flashcard-flipper.
  const [active, setActive] = useState(false);
  const containerRef = useReadingWave(active, totalChars);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const flipper = el.closest(".flashcard-flipper");
    if (!flipper) return;

    const sync = () => {
      setActive(flipper.classList.contains("is-flipped"));
    };
    sync();

    const observer = new MutationObserver(sync);
    observer.observe(flipper, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, [containerRef]);

  return (
    <div
      ref={containerRef}
      className="flashcard-wave flex h-full flex-col gap-3"
    >
      <div className="flex items-center justify-between border-b border-legendary-card-border pb-2">
        <h2 className="font-heading text-base uppercase leading-tight tracking-wide text-foreground break-words text-balance">
          {runs[0]
            ? WaveText({ text: runs[0].text, startIndex: runs[0].start }).node
            : null}
        </h2>
        <span className="font-heading text-xs uppercase tracking-widest text-muted-foreground shrink-0 ml-2">
          {card.recipe ? "Recipe" : "Details"}
        </span>
      </div>

      {card.recipe ? (
        <FlashcardRecipeBack recipe={card.recipe} runs={runs} />
      ) : card.detailFields.length === 0 ? (
        <p className="font-body text-sm text-muted-foreground">
          No detail fields recorded for this item.
        </p>
      ) : (
        <dl className="flex flex-col gap-2.5">
          {card.detailFields.map((field, i) => {
            const labelRun = runs.find(
              (r) => r.source === "detailLabel" && r.index === i,
            );
            const valueRun = runs.find(
              (r) => r.source === "detailValue" && r.index === i,
            );
            return (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: duplicate fieldLabels within a card can collide, index is the stable key
                key={`field-${i}`}
                data-ocid={`flashcard.detail.${i + 1}`}
                className="flex flex-col gap-0.5 border-b border-legendary-card-border/40 pb-2 last:border-b-0 last:pb-0"
              >
                <dt className="font-heading text-xs uppercase tracking-wide text-primary">
                  {labelRun
                    ? WaveText({
                        text: labelRun.text,
                        startIndex: labelRun.start,
                      }).node
                    : field.fieldLabel}
                </dt>
                <dd className="font-body text-sm text-foreground [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4">
                  {valueRun ? (
                    <WaveHtmlValue
                      html={valueRun.text}
                      startIndex={valueRun.start}
                      active={active}
                    />
                  ) : (
                    <span
                      /* biome-ignore lint/security/noDangerouslySetInnerHtml: admin-authored Quill HTML from restricted toolbar, same pattern as RecipeCardPage */
                      dangerouslySetInnerHTML={{ __html: field.value }}
                    />
                  )}
                </dd>
              </div>
            );
          })}
        </dl>
      )}
    </div>
  );
}

/**
 * A single back-face text run in reading order, with its sequential
 * character start index. `source` + `index` let the renderer find the
 * run for a given section/field.
 */
type WaveRun = {
  text: string;
  start: number;
  source:
    | "title"
    | "glassware"
    | "spec"
    | "assembly"
    | "garnish"
    | "detailLabel"
    | "detailValue";
  index: number;
};

/**
 * Builds the flat reading-order list of text runs for the back face and
 * assigns each a sequential character start index. Title is always run 0.
 */
function computeBackFaceRuns(card: LegendaryFlashcard): WaveRun[] {
  const runs: WaveRun[] = [];
  let cursor = 0;
  const push = (
    text: string,
    source: WaveRun["source"],
    index: number,
  ): void => {
    if (text.length === 0) return;
    runs.push({ text, start: cursor, source, index });
    cursor += Array.from(text).length;
  };

  push(card.itemTitle, "title", 0);

  if (card.recipe) {
    const r = card.recipe;
    push(r.glassware, "glassware", 0);
    r.specs.forEach((spec, i) =>
      push(`${spec.amount} ${spec.ingredient}`, "spec", i),
    );
    r.assembly.forEach((step, i) => push(step, "assembly", i));
    r.garnish.forEach((g, i) => push(g, "garnish", i));
  } else {
    card.detailFields.forEach((field, i) => {
      push(field.fieldLabel, "detailLabel", i);
      // For the value, strip HTML tags to get a plain-text character count
      // that matches what WaveHtml will wrap. The actual rendered HTML is
      // preserved by WaveHtml; we only need the character count for the
      // index space.
      push(htmlToPlainText(field.value), "detailValue", i);
    });
  }

  return runs;
}

/**
 * Converts a Quill HTML string to plain text in document order, matching
 * the character sequence that WaveHtml will wrap (text nodes only, tags
 * stripped, whitespace preserved). Used only for character counting so
 * the index space stays continuous across the value.
 */
function htmlToPlainText(html: string): string {
  if (typeof document === "undefined") return html.replace(/<[^>]+>/g, "");
  const tpl = document.createElement("template");
  tpl.innerHTML = html;
  let out = "";
  const walker = document.createTreeWalker(tpl.content, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) =>
      node.nodeValue && node.nodeValue.length > 0
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT,
  });
  let current = walker.nextNode();
  while (current) {
    out += current.nodeValue ?? "";
    current = walker.nextNode();
  }
  return out;
}

/**
 * Renders a Quill HTML value with every text-node character wrapped in a
 * .flashcard-wave-char span (preserving the original element structure),
 * starting at `startIndex` in the back face's reading order.
 */
function WaveHtmlValue({
  html,
  startIndex,
  active,
}: {
  html: string;
  startIndex: number;
  active: boolean;
}): ReactElement {
  const { ref } = useWaveHtml(html, startIndex, active);
  return <div ref={ref} />;
}

/**
 * Renders the structured recipe on the flashcard back face, themed for the
 * dark roadhouse card. Mirrors the section order and content semantics of
 * RecipeCardPage's RecipeContent (Glassware -> Specs -> Assembly -> Garnish)
 * but uses the flashcard's dark tokens (text-foreground, text-primary,
 * border-legendary-card-border) instead of the light-blue print-card classes.
 *
 * Each section's text is split into per-character .flashcard-wave-char spans
 * (via WaveText) using the precomputed reading-order start indices from
 * `runs` so the whole back face shares one continuous wave index space.
 */
function FlashcardRecipeBack({
  recipe,
  runs,
}: {
  recipe: LegendaryFlashcardRecipe;
  runs: WaveRun[];
}): ReactElement {
  const glasswareRun = runs.find((r) => r.source === "glassware");
  const specRuns = runs.filter((r) => r.source === "spec");
  const assemblyRuns = runs.filter((r) => r.source === "assembly");
  const garnishRuns = runs.filter((r) => r.source === "garnish");

  return (
    <div className="flex flex-col gap-3.5">
      {/* Glassware */}
      {recipe.glassware.trim().length > 0 && glasswareRun ? (
        <section data-ocid="flashcard.recipe.glassware">
          <h3 className="font-heading text-xs uppercase tracking-widest text-primary">
            Glassware
          </h3>
          <p className="mt-1 font-body text-sm text-foreground">
            {
              WaveText({
                text: glasswareRun.text,
                startIndex: glasswareRun.start,
              }).node
            }
          </p>
        </section>
      ) : null}

      {/* Specs */}
      {recipe.specs.length > 0 ? (
        <section data-ocid="flashcard.recipe.specs">
          <h3 className="font-heading text-xs uppercase tracking-widest text-primary">
            Specs
          </h3>
          <ul className="mt-1 flex flex-col gap-1">
            {recipe.specs.map((spec, i) => {
              const run = specRuns[i];
              if (!run) return null;
              // The run text is "amount ingredient"; split on the first
              // space to preserve the amount/ingredient layout while still
              // waving the whole run in reading order.
              const sepIdx = run.text.indexOf(" ");
              const amountText =
                sepIdx >= 0 ? run.text.slice(0, sepIdx) : run.text;
              const ingredientText =
                sepIdx >= 0 ? run.text.slice(sepIdx + 1) : "";
              const amountWave = WaveText({
                text: amountText,
                startIndex: run.start,
              });
              const ingredientWave = WaveText({
                text: ingredientText,
                startIndex: run.start + Array.from(amountText).length + 1,
              });
              return (
                <li
                  key={`fspec-${spec.amount}-${spec.ingredient}`}
                  data-ocid={`flashcard.recipe.spec.${i + 1}`}
                  className="flex items-baseline gap-2 font-body text-sm text-foreground"
                >
                  <span className="shrink-0 whitespace-nowrap font-mono text-xs text-muted-foreground">
                    {amountWave.node}
                  </span>
                  <span className="min-w-0 break-words">
                    {ingredientWave.node}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {/* Assembly */}
      {recipe.assembly.length > 0 ? (
        <section data-ocid="flashcard.recipe.assembly">
          <h3 className="font-heading text-xs uppercase tracking-widest text-primary">
            Assembly
          </h3>
          <ol className="mt-1 flex flex-col gap-1.5">
            {recipe.assembly.map((step, i) => {
              const run = assemblyRuns[i];
              if (!run) return null;
              return (
                <li
                  key={`fasm-${step}`}
                  data-ocid={`flashcard.recipe.assembly_step.${i + 1}`}
                  className="flex items-baseline gap-2 font-body text-sm leading-relaxed text-foreground"
                >
                  <span className="shrink-0 font-heading text-xs text-primary">
                    {i + 1}.
                  </span>
                  <span className="min-w-0 break-words">
                    {
                      WaveText({
                        text: run.text,
                        startIndex: run.start,
                      }).node
                    }
                  </span>
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}

      {/* Garnish */}
      {recipe.garnish.length > 0 ? (
        <section data-ocid="flashcard.recipe.garnish">
          <h3 className="font-heading text-xs uppercase tracking-widest text-primary">
            Garnish
          </h3>
          <ul className="mt-1 flex flex-col gap-1">
            {recipe.garnish.map((g, i) => {
              const run = garnishRuns[i];
              if (!run) return null;
              return (
                <li
                  key={`fgar-${g}`}
                  data-ocid={`flashcard.recipe.garnish_item.${i + 1}`}
                  className="flex items-baseline gap-2 font-body text-sm text-foreground"
                >
                  <span className="shrink-0 text-primary" aria-hidden>
                    &bull;
                  </span>
                  <span className="min-w-0 break-words">
                    {
                      WaveText({
                        text: run.text,
                        startIndex: run.start,
                      }).node
                    }
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
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
