// useDrinksBuilder — the orchestration hook for the Drinks Builder game.
//
// Responsibilities:
//   1. Fetch the activity via getLegendaryActivity (to read settings).
//   2. Fetch the playable pool + decoy pool via the dedicated backend
//      methods (getDrinksBuilderPlayablePool / getDrinksBuilderDecoyPool).
//   3. Apply client-side filtering:
//        - includedCategories (empty = all)
//        - excludedDrinkTitles
//        - bulk-mix exclusion (yield non-null OR equipment non-empty)
//        - in-scope: recipe with non-empty specs AND assembly AND glassware
//   4. Build the global decoy pool from ALL other in-scope recipes across
//      all categories (glassware options, spec ingredient+amount pairs,
//      assembly steps, garnish options).
//   5. Generate rounds with decoys (one drink per round, four sections,
//      each section = correct answer + decoys, shuffled).
//   6. Manage session state (current round, score, streak, wrong taps,
//      completed drinks) and expose game actions (tapChip, nextDrink,
//      mute toggle, restart).
//
// Scores are session-only — never persisted to the backend (per doNotBuild).
// If fewer in-scope drinks exist than roundsPerSession, the session is
// gracefully shortened and an empty-state reason is surfaced.

import type { LibraryItem as BackendLibraryItem } from "@/backend";
import { useBackend } from "@/hooks/useBackend";
import { useLegendaryActivity } from "@/hooks/useLegendary";
import { useCategoriesByPosition } from "@/hooks/useLibrary";
import type { DetailField, LibraryItem, Recipe } from "@/types/foundation";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type Chip,
  DEFAULT_LIQUID_COLOR,
  type DrinksBuilderSettings,
  type EmptyReason,
  type FeedbackState,
  type GameRound,
  type GameSection,
  type GameSectionKind,
  type PlayableDrink,
  type PlayablePoolResult,
  type SessionState,
} from "./types";

// --- Backend -> frontend translation ---------------------------------------

/**
 * Translates a backend LibraryItem (bigint ids) to the frontend LibraryItem
 * (string ids), mirroring the toItem() pattern in useLibrary.ts. The Drinks
 * Builder pool methods return backend LibraryItem[]; we translate at the query
 * boundary so the rest of the hook works against the string-id frontend type.
 *
 * makeDetailFieldId is not imported here to avoid coupling; the drinks-builder
 * only reads recipe fields (specs/assembly/glassware/garnish) and never edits
 * detail rows, so a simple counter-based id is sufficient for React keys.
 */
let detailFieldCounter = 0;
function toFrontendItem(i: BackendLibraryItem): LibraryItem {
  const details: DetailField[] = (i.details ?? []).map((d) => ({
    id: `db-detail-${detailFieldCounter++}`,
    fieldLabel: d.fieldLabel,
    value: d.value,
  }));
  return {
    id: i.id.toString(),
    categoryId: i.categoryId.toString(),
    title: i.title,
    subtitle: i.subtitle ?? null,
    photo: i.photo ?? null,
    details,
    notes: i.notes ?? null,
    tags: i.tags ?? [],
    seasonal: i.seasonal,
    sortOrder: Number(i.sortOrder),
    recipe: i.recipe
      ? {
          glassware: i.recipe.glassware,
          specs: i.recipe.specs.map((s) => ({
            amount: s.amount,
            ingredient: s.ingredient,
          })),
          assembly: i.recipe.assembly,
          garnish: i.recipe.garnish,
          variants: i.recipe.variants.map((v) => ({
            variantLabel: v.variantLabel,
            specs: v.specs.map((s) => ({
              amount: s.amount,
              ingredient: s.ingredient,
            })),
            assembly: v.assembly,
          })),
          equipment: i.recipe.equipment ?? [],
          yield:
            i.recipe.yield && i.recipe.yield.length > 0 ? i.recipe.yield : null,
          shelfLife:
            i.recipe.shelfLife && i.recipe.shelfLife.length > 0
              ? i.recipe.shelfLife
              : null,
          qualityIdentifier: i.recipe.qualityIdentifier ?? [],
        }
      : null,
  };
}

// --- Pure helpers (exported for testing / reuse) ---------------------------

/**
 * Returns true when a LibraryItem is a bulk-mix recipe (excluded from the
 * playable pool). Bulk-mix = recipe with non-null yield OR non-empty
 * equipment. Per the project's bulk-mix detection learning.
 */
export function isBulkMix(item: LibraryItem): boolean {
  const r = item.recipe;
  if (!r) return false;
  return r.yield != null || (r.equipment != null && r.equipment.length > 0);
}

/**
 * Returns true when a LibraryItem is in-scope for the game: it has a recipe
 * with non-empty specs AND non-empty assembly AND non-empty glassware, and
 * is not a bulk-mix.
 */
export function isInScope(item: LibraryItem): boolean {
  const r = item.recipe;
  if (!r) return false;
  if (isBulkMix(item)) return false;
  return (
    r.glassware.trim().length > 0 && r.specs.length > 0 && r.assembly.length > 0
  );
}

/**
 * Reads the per-recipe optional color field for liquid fill. The backend
 * LibraryItem does not currently expose a color field on the recipe; this
 * helper is the single place that resolves the default amber/gold when the
 * field is absent. (Per doNotBuild, no admin editing of this field is built.)
 *
 * NOTE: if a future backend adds an optional `color: ?Text` to Recipe, this
 * is the only function that needs to change — return `r.color ?? DEFAULT`.
 */
function resolveLiquidColor(_recipe: Recipe): string {
  return DEFAULT_LIQUID_COLOR;
}

/**
 * Builds the playable pool from raw LibraryItems + a category-name lookup.
 * Applies includedCategories (empty = all), excludedDrinkTitles, and the
 * in-scope/bulk-mix filters. Returns the drinks, the category-name map,
 * and an empty-state reason when the pool is empty/too small.
 */
export function buildPlayablePool(
  items: LibraryItem[],
  categoryNameById: Map<string, string>,
  settings: {
    includedCategories: string[];
    excludedDrinkTitles: string[];
  },
): PlayablePoolResult {
  const included = settings.includedCategories;
  const excluded = new Set(
    settings.excludedDrinkTitles.map((t) => t.trim().toLowerCase()),
  );
  const drinks: PlayableDrink[] = [];
  for (const item of items) {
    if (!isInScope(item)) continue;
    if (included.length > 0 && !included.includes(item.categoryId)) continue;
    if (excluded.has(item.title.trim().toLowerCase())) continue;
    const r = item.recipe;
    if (!r) continue; // narrowed by isInScope, but TS needs the guard
    drinks.push({
      id: item.id,
      title: item.title,
      categoryId: item.categoryId,
      categoryName: categoryNameById.get(item.categoryId) ?? "",
      glassware: r.glassware,
      specs: r.specs.map((s) => ({
        amount: s.amount,
        ingredient: s.ingredient,
      })),
      assembly: [...r.assembly],
      garnish: [...r.garnish],
      color: resolveLiquidColor(r),
      photo: item.photo ?? null,
    });
  }
  let emptyReason: EmptyReason | null = null;
  if (drinks.length === 0) emptyReason = "noPlayable";
  return { drinks, categoryNameById, emptyReason };
}

/**
 * Formats a spec (amount + ingredient) into the chip label, honoring the
 * requireExactAmounts setting. When true (default), the label is
 * "${amount} ${ingredient}" and grading matches on both. When false, the
 * label is the ingredient alone and grading matches on ingredient alone.
 */
export function formatSpecLabel(
  amount: string,
  ingredient: string,
  requireExactAmounts: boolean,
): string {
  return requireExactAmounts
    ? `${amount} ${ingredient}`.trim()
    : ingredient.trim();
}

/**
 * Dedupes a list of correct-answer labels within a single section, keeping
 * the first occurrence of each label so order is preserved (matters for
 * assembly-order enforcement, which grades against the recipe's first-seen
 * sequence). Empty labels are dropped. Returns a new array — the input is
 * not mutated.
 *
 * Used by buildRound so identical correct chips collapse to a single chip
 * requiring a single tap (e.g. when requireExactAmounts is off and two
 * specs share the same ingredient, or a recipe lists a duplicate assembly
 * step / garnish).
 */
function dedupeLabels(labels: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const label of labels) {
    if (label.length === 0) continue;
    if (seen.has(label)) continue;
    seen.add(label);
    out.push(label);
  }
  return out;
}

/**
 * Builds the decoy pool for a single round, with same-category preference.
 *
 * Decoys are drawn from ALL in-scope recipes EXCEPT the current round's
 * drink, but recipes in the SAME categoryId as the current drink are
 * preferred — they tend to share glassware styles, ingredient families,
 * and assembly techniques, which makes the decoys feel plausible. The
 * returned arrays preserve insertion order so same-category entries come
 * first; pickDecoys then seeds-shuffles within that ordering, giving
 * in-category decoys a higher chance of being selected before the pool
 * is exhausted.
 *
 * Returns four arrays: glassware options, spec strings, assembly steps,
 * and garnish options. Spec strings are formatted via formatSpecLabel so
 * decoys match the requireExactAmounts-controlled chip format.
 */
export function buildDecoyPool(
  allDrinks: PlayableDrink[],
  currentDrinkId: string,
  requireExactAmounts: boolean,
): {
  glassware: string[];
  specs: string[];
  assembly: string[];
  garnish: string[];
} {
  const current = allDrinks.find((d) => d.id === currentDrinkId);
  const currentCategoryId = current?.categoryId ?? null;

  // Partition the other drinks into same-category first, then the rest.
  // Same-category entries are pushed first so they appear earlier in the
  // arrays; pickDecoys seeds-shuffles the filtered pool, so earlier
  // entries have a higher probability of being selected before the pool
  // is exhausted.
  const sameCategory: PlayableDrink[] = [];
  const others: PlayableDrink[] = [];
  for (const d of allDrinks) {
    if (d.id === currentDrinkId) continue;
    if (currentCategoryId !== null && d.categoryId === currentCategoryId) {
      sameCategory.push(d);
    } else {
      others.push(d);
    }
  }
  const ordered = [...sameCategory, ...others];

  const glassware: string[] = [];
  const specs: string[] = [];
  const assembly: string[] = [];
  const garnish: string[] = [];
  const seenGlassware = new Set<string>();
  const seenSpecs = new Set<string>();
  const seenAssembly = new Set<string>();
  const seenGarnish = new Set<string>();
  for (const d of ordered) {
    if (d.glassware && !seenGlassware.has(d.glassware)) {
      seenGlassware.add(d.glassware);
      glassware.push(d.glassware);
    }
    for (const s of d.specs) {
      const label = formatSpecLabel(
        s.amount,
        s.ingredient,
        requireExactAmounts,
      );
      if (!seenSpecs.has(label)) {
        seenSpecs.add(label);
        specs.push(label);
      }
    }
    for (const a of d.assembly) {
      if (!seenAssembly.has(a)) {
        seenAssembly.add(a);
        assembly.push(a);
      }
    }
    for (const g of d.garnish) {
      if (g && !seenGarnish.has(g)) {
        seenGarnish.add(g);
        garnish.push(g);
      }
    }
  }
  return { glassware, specs, assembly, garnish };
}

/** Deterministic seeded PRNG (mulberry32) for stable shuffle per round. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates shuffle driven by a seeded PRNG. Returns a new array. */
function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  if (items.length <= 1) return [...items];
  const rand = mulberry32(seed);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Pick `n` decoys from `pool`, excluding every label in `correctLabels`
 * (so no decoy duplicates a correct chip for this drink), seeded for
 * stability. Decoys are also deduped among themselves.
 */
function pickDecoys(
  pool: string[],
  correctLabels: string[],
  n: number,
  seed: number,
): string[] {
  const exclude = new Set(correctLabels);
  const seen = new Set<string>();
  const filtered: string[] = [];
  for (const p of pool) {
    if (exclude.has(p)) continue;
    if (seen.has(p)) continue;
    seen.add(p);
    filtered.push(p);
  }
  const shuffled = seededShuffle(filtered, seed);
  return shuffled.slice(0, Math.max(0, n));
}

const SECTION_LABELS: Record<GameSectionKind, string> = {
  glassware: "Glassware",
  specs: "Specs",
  assembly: "Assembly",
  garnish: "Garnish",
};

/**
 * Builds a single round for a drink: four sections, each with ALL of the
 * drink's correct answers for that section + decoys, shuffled.
 *
 * For `specs` the correct chips are EVERY spec in drink.specs (formatted
 * via formatSpecLabel so the label honors requireExactAmounts). For
 * `assembly` the correct chips are EVERY step in drink.assembly. For
 * `garnish` the correct chips are EVERY entry in drink.garnish. For
 * `glassware` the correct chip is the single glassware string.
 *
 * Decoys are picked from the global decoy pool (other drinks only) and
 * deduped against the correct labels so no decoy duplicates a correct
 * chip. The combined set (correct + decoys) is seeded-shuffled so the
 * same roundSeed always produces the same chip order.
 *
 * Grading is driven by the `isCorrect` flag set at chip-build time
 * (label is one of the correct labels), so tapChip just needs to check
 * whether every correct chip in a section has been tapped.
 */
function buildRound(
  drink: PlayableDrink,
  decoyPool: ReturnType<typeof buildDecoyPool>,
  decoyCount: number,
  roundSeed: number,
  requireExactAmounts: boolean,
): GameRound {
  // Dedupe correct labels WITHIN a section. When requireExactAmounts is off,
  // multiple specs sharing the same ingredient produce identical correct
  // chips the player would otherwise have to tap multiple times. Deduping
  // collapses identical labels to a single chip requiring a single tap. The
  // same dedup is applied to repeated assembly and garnish strings so a
  // recipe with duplicate steps/garnishes does not force duplicate taps.
  // Order is preserved (first occurrence wins) so the assembly-order
  // enforcement still grades against the recipe's first-seen sequence.
  const correctSpecs = dedupeLabels(
    drink.specs.map((s) =>
      formatSpecLabel(s.amount, s.ingredient, requireExactAmounts),
    ),
  );
  const correctAssembly = dedupeLabels([...drink.assembly]);
  const correctGarnish = dedupeLabels(
    drink.garnish.filter((g) => g.length > 0),
  );

  const makeChips = (
    correctLabels: string[],
    pool: string[],
    sectionSeed: number,
    orderIndices?: number[],
  ): Chip[] => {
    const correct = correctLabels.filter((l) => l.length > 0);
    if (correct.length === 0) return [];
    const decoys = pickDecoys(pool, correct, decoyCount, sectionSeed);
    // Build the correct chips WITH their recipe array index (orderIndex)
    // BEFORE the shuffle so the shuffle preserves the field on each chip
    // object. orderIndex is only passed for the assembly section's correct
    // chips; decoys and non-assembly sections leave it undefined.
    const correctChips: Chip[] = correct.map((label, i) => ({
      id: `${drink.id}-${label}-${i}`,
      label,
      isCorrect: true,
      selected: false,
      feedback: "idle" as FeedbackState,
      orderIndex: orderIndices ? orderIndices[i] : undefined,
    }));
    const decoyChips: Chip[] = decoys.map((label, i) => ({
      id: `${drink.id}-${label}-d${i}`,
      label,
      isCorrect: false,
      selected: false,
      feedback: "idle" as FeedbackState,
    }));
    const all = seededShuffle(
      [...correctChips, ...decoyChips],
      sectionSeed ^ 0x5a5a5a,
    );
    return all;
  };

  // A section with zero chips can never be completed by tapping (there is
  // nothing to tap, so the vacuous-truth check in tapChip never runs). Such
  // sections correspond to a recipe that legitimately lacks one of the four
  // components (e.g. a drink with no garnish, or no assembly steps). They
  // MUST auto-complete at build time — otherwise the round soft-locks
  // because newComplete = every(s => s.done) can never become true.
  // isInScope intentionally does NOT require garnish, so empty-garnish
  // drinks are in scope and reach this path; the same defensive rule is
  // applied to every section so any future legitimately-empty section is
  // handled too. The tapChip logic is unchanged — it already correctly
  // handles the vacuous-truth case when a tap occurs.
  const sections: GameSection[] = (
    [
      {
        kind: "glassware" as const,
        label: SECTION_LABELS.glassware,
        chips: makeChips(
          drink.glassware ? [drink.glassware] : [],
          decoyPool.glassware,
          roundSeed + 1,
        ),
        done: false,
      },
      {
        kind: "specs" as const,
        label: SECTION_LABELS.specs,
        chips: makeChips(correctSpecs, decoyPool.specs, roundSeed + 2),
        done: false,
      },
      {
        kind: "assembly" as const,
        label: SECTION_LABELS.assembly,
        // Tag each correct assembly chip with its recipe array index
        // (0-based position in drink.assembly) BEFORE the shuffle so the
        // shuffle preserves orderIndex on each chip object. Only the
        // assembly section passes orderIndices; the grading and the Step N
        // popup number read orderIndex back to compare against recipe order.
        chips: makeChips(
          correctAssembly,
          decoyPool.assembly,
          roundSeed + 3,
          correctAssembly.map((_, i) => i),
        ),
        done: false,
      },
      {
        kind: "garnish" as const,
        label: SECTION_LABELS.garnish,
        chips: makeChips(correctGarnish, decoyPool.garnish, roundSeed + 4),
        done: false,
      },
    ] satisfies GameSection[]
  ).map((section) =>
    section.chips.length === 0 ? { ...section, done: true } : section,
  );

  // A round is complete at build time only when every section is already
  // done — i.e. every section was auto-completed because the recipe had
  // no chips for it. This is rare (a recipe with no glassware, no specs,
  // no assembly, AND no garnish would be filtered out by isInScope), but
  // the defensive check keeps the round in a consistent state.
  const completeAtBuild = sections.every((s) => s.done);

  return {
    drink,
    sections,
    wrongTaps: 0,
    complete: completeAtBuild,
  };
}

// --- Hook -------------------------------------------------------------------

/**
 * The result of a tap, used by the page to fire the right sound + haptic
 * feedback. The hook is the single source of truth for whether a tap was
 * correct or wrong — including the assembly-order case where a chip is
 * statically `isCorrect` but is tapped out of order (treated as a wrong tap
 * when `enforceAssemblyOrder` is on). The page reads this signal instead
 * of `chip.isCorrect` so out-of-order assembly taps play the buzzer, not
 * the correct chime.
 *
 * - "correct": the tap advanced the section (a correct chip tapped in
 *   the allowed order).
 * - "wrong": the tap was incorrect OR an out-of-order assembly tap. The
 *   chip is NOT consumed (stays available), the streak resets, and the
 *   page should fire the wrong-tap feedback (red shake via the chip's
 *   `feedback: "incorrect"` state, buzzer, haptic).
 * - "noop": the tap hit a finished section, an already-selected chip, a
 *   finished round, or a null session — no feedback should fire.
 */
export type TapResult = "correct" | "wrong" | "noop";

interface UseDrinksBuilderResult {
  /** True while the activity or pools are still loading. */
  isLoading: boolean;
  /** True when the activity read or pool reads failed. */
  isError: boolean;
  /** The activity name (for the header), or null while loading. */
  activityName: string | null;
  /** The position id (for the back link), or null while loading. */
  positionId: string | null;
  /** The resolved settings, or null while loading. */
  settings: DrinksBuilderSettings | null;
  /** The current session state, or null while loading. */
  session: SessionState | null;
  /** Empty-state reason when the playable pool is too small. */
  emptyReason: EmptyReason | null;
  /** Tap a chip in the current round's section. Returns the tap result so
   *  the page can fire the matching sound + haptic feedback. */
  tapChip: (sectionKind: GameSectionKind, chipId: string) => TapResult;
  /** Advance to the next drink (or finish the session). */
  nextDrink: () => void;
  /** Restart the session with fresh rounds. */
  restart: () => void;
  /** Toggle sound mute. */
  toggleMute: () => void;
  /** Set mute state directly. */
  setMuted: (next: boolean) => void;
}

// Re-export the settings type for the page component.
export type { DrinksBuilderSettings } from "./types";

/**
 * @param activityId the Be Legendary activity id (stringified bigint).
 */
export function useDrinksBuilder(activityId: string): UseDrinksBuilderResult {
  const { actor, isFetching } = useBackend();
  const activityQuery = useLegendaryActivity(activityId);

  // Resolve settings from the activity content. The activity is a
  // drinksBuilder activity; its content is drinksBuilderContent with a
  // settings record. We read it defensively in case the activity is
  // missing or the wrong kind.
  const settings: DrinksBuilderSettings | null = useMemo(() => {
    const a = activityQuery.data;
    if (!a) return null;
    if (a.content.kind !== "drinksBuilderContent") return null;
    const s = a.content.settings;
    return {
      includedCategories: s.includedCategories,
      excludedDrinkTitles: s.excludedDrinkTitles,
      decoyCount: s.decoyCount,
      requireExactAmounts: s.requireExactAmounts,
      enforceAssemblyOrder: s.enforceAssemblyOrder,
      showScoring: s.showScoring,
      streakMultiplier: s.streakMultiplier,
      pointsPerCorrect: s.pointsPerCorrect,
      roundsPerSession: s.roundsPerSession,
      soundDefault: s.soundDefault,
    };
  }, [activityQuery.data]);

  // Fetch the playable pool. The backend already applies the activity's
  // includedCategories / excludedDrinkTitles / bulk-mix filters, but we
  // re-filter client-side too (defensive + lets us build the decoy pool
  // from the same in-scope set). The query is enabled once we have the
  // activity id (the backend method only needs the activity id).
  const playableQuery = useQuery<LibraryItem[]>({
    queryKey: ["drinks-builder-playable", activityId],
    queryFn: async () => {
      if (!actor) return [];
      const result = await actor.getDrinksBuilderPlayablePool(
        BigInt(activityId),
      );
      return result.map(toFrontendItem);
    },
    enabled: !!actor && !isFetching && !!activityId,
  });

  // Fetch the decoy pool. The backend returns the full set of OTHER
  // in-scope recipes (across all categories) for the global decoy pool.
  const decoyQuery = useQuery<LibraryItem[]>({
    queryKey: ["drinks-builder-decoys", activityId],
    queryFn: async () => {
      if (!actor) return [];
      const result = await actor.getDrinksBuilderDecoyPool(BigInt(activityId));
      return result.map(toFrontendItem);
    },
    enabled: !!actor && !isFetching && !!activityId,
  });

  // Resolve the position id from the activity so we can fetch the
  // position's categories and map categoryId -> category.name. The
  // playable/decoy pool methods only return categoryId on each item, so
  // without this lookup the hero badge would always fall back to
  // "Classic" in the page (see DrinksBuilderActivity.tsx).
  const positionId = activityQuery.data?.positionId ?? null;
  const categoriesQuery = useCategoriesByPosition(positionId ?? "");

  // Build the category-name lookup. The playable/decoy pool methods
  // return categoryId on each item but NOT the category name, so we
  // populate the names from useCategoriesByPosition(positionId). Items
  // whose categoryId isn't in the position's category list fall back to
  // "" (the page renders "Classic" for empty names).
  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    // Seed every categoryId we've seen so the map has a key for each
    // (defensive — keeps buildPlayablePool's `?? ""` fallback working
    // even if a category was deleted after items were assigned to it).
    for (const item of [
      ...(playableQuery.data ?? []),
      ...(decoyQuery.data ?? []),
    ]) {
      if (!map.has(item.categoryId)) map.set(item.categoryId, "");
    }
    // Overlay real names from the position's categories.
    for (const c of categoriesQuery.data ?? []) {
      map.set(c.id, c.name);
    }
    return map;
  }, [playableQuery.data, decoyQuery.data, categoriesQuery.data]);

  // Build the playable pool (client-side filter on top of the backend's
  // pre-filtered list, for defense + decoy-pool consistency).
  const playablePool = useMemo<PlayablePoolResult>(() => {
    if (!settings) {
      return { drinks: [], categoryNameById, emptyReason: null };
    }
    return buildPlayablePool(playableQuery.data ?? [], categoryNameById, {
      includedCategories: settings.includedCategories,
      excludedDrinkTitles: settings.excludedDrinkTitles,
    });
  }, [playableQuery.data, categoryNameById, settings]);

  // Build the global decoy pool from ALL in-scope recipes (playable + decoy
  // items, deduped). We use the union so the decoy pool is as rich as
  // possible even when the playable pool is small.
  const allInScopeDrinks = useMemo<PlayableDrink[]>(() => {
    const seen = new Set<string>();
    const out: PlayableDrink[] = [];
    for (const d of playablePool.drinks) {
      if (!seen.has(d.id)) {
        seen.add(d.id);
        out.push(d);
      }
    }
    // Also include decoy items that are in-scope (they may belong to
    // categories excluded from the playable pool but still valid decoys).
    for (const item of decoyQuery.data ?? []) {
      if (seen.has(item.id)) continue;
      if (!isInScope(item)) continue;
      const r = item.recipe;
      if (!r) continue;
      seen.add(item.id);
      out.push({
        id: item.id,
        title: item.title,
        categoryId: item.categoryId,
        categoryName: "",
        glassware: r.glassware,
        specs: r.specs.map((s) => ({
          amount: s.amount,
          ingredient: s.ingredient,
        })),
        assembly: [...r.assembly],
        garnish: [...r.garnish],
        color: resolveLiquidColor(r),
        photo: item.photo ?? null,
      });
    }
    return out;
  }, [playablePool.drinks, decoyQuery.data]);

  // Generate the session rounds once settings + pools are ready, or when
  // the user restarts. We track the inputs we built from so we only rebuild
  // when they actually change (not on every render). The session is held in
  // state — building it is a side effect, so this lives in useEffect, not
  // useMemo (useMemo must stay pure).
  const [session, setSession] = useState<SessionState | null>(null);
  // Initialize sessionKey with a random integer so the first shuffle
  // (seededShuffle(..., sessionKey + 1)) is non-deterministic on a fresh
  // page load — every fresh visit produces a different drink order. The
  // restart() handler below increments this value, so each "Play again"
  // also produces a new different order. No persistence — a new visit
  // re-rolls the seed.
  const [sessionKey, setSessionKey] = useState(() =>
    Math.floor(Math.random() * 1_000_000),
  );
  const builtFromRef = useRef<string>("");

  useEffect(() => {
    if (!settings) return;
    if (playablePool.emptyReason === "noPlayable") return;
    // Early-return guard: do not build the session until BOTH the
    // playable pool and the decoy pool have resolved. Without this, a
    // slow decoy query could let the session build from an empty
    // allInScopeDrinks (decoys missing), so every round's chips would
    // have only the correct answers and no decoys. The fingerprint
    // below also includes the decoy query state so a late decoy
    // resolution triggers a rebuild with the full decoy pool.
    if (!playableQuery.data || !decoyQuery.data) return;
    // roundsPerSession=0 means endless practice (the default). Treat 0 as
    // "use the full pool" so the session builds and is playable with the
    // default settings — Math.min(0, poolSize) would otherwise return 0 and
    // the early return below would prevent the session from ever building.
    const poolSize = playablePool.drinks.length;
    const requestedRounds =
      settings.roundsPerSession === 0 ? poolSize : settings.roundsPerSession;
    const roundsCount = Math.min(requestedRounds, poolSize);
    if (roundsCount === 0) return;

    // Fingerprint the inputs so we only rebuild when they meaningfully
    // change. sessionKey is included so a restart forces a rebuild even
    // when the underlying data is identical. The decoy query's data
    // identity is included so a late decoy resolution (after the
    // playable pool resolved) triggers a rebuild with the full decoy
    // pool — without it the session could be built with empty decoys and
    // never rebuilt once decoys arrive.
    const decoyFingerprint = (decoyQuery.data ?? []).map((d) => d.id).join(",");
    const fingerprint = `${sessionKey}|${roundsCount}|${settings.requireExactAmounts}|${playablePool.drinks
      .map((d) => d.id)
      .join(",")}|${decoyFingerprint}`;
    if (fingerprint === builtFromRef.current) return;
    builtFromRef.current = fingerprint;

    // Shuffle the playable drinks so each session picks a different set.
    const shuffled = seededShuffle(playablePool.drinks, sessionKey + 1);
    const chosen = shuffled.slice(0, roundsCount);
    const rounds: GameRound[] = chosen.map((drink, i) => {
      const decoys = buildDecoyPool(
        allInScopeDrinks,
        drink.id,
        settings.requireExactAmounts,
      );
      return buildRound(
        drink,
        decoys,
        settings.decoyCount,
        i * 31 + sessionKey,
        settings.requireExactAmounts,
      );
    });
    setSession({
      rounds,
      currentIndex: 0,
      score: 0,
      streak: 0,
      totalWrongTaps: 0,
      completedDrinks: 0,
      finished: rounds.length === 0,
      muted: !settings.soundDefault,
    });
  }, [
    settings,
    playablePool.drinks,
    playablePool.emptyReason,
    allInScopeDrinks,
    sessionKey,
    // The early-return guard checks `!playableQuery.data || !decoyQuery.data`,
    // so the effect must re-evaluate when those queries resolve. Without
    // these deps the session would never rebuild once the pools arrive.
    playableQuery.data,
    decoyQuery.data,
  ]);

  // tapChip — handle a tap on a chip in the current round's section.
  //
  // Scoring is computed in a single pass inside setSession so the score,
  // streak, and structural state stay in sync. The just-tapped chip's
  // `isCorrect` flag tells us whether to award points; a correct tap that
  // completes the round awards pointsPerCorrect plus a streak bonus when
  // streakMultiplier is on. A wrong tap resets the streak to 0.
  //
  // Assembly-order enforcement: when settings.enforceAssemblyOrder is ON
  // and the tapped chip is in an assembly section, a correct chip must be
  // tapped in the order buildRound emits it (the order it appears among
  // the correct chips in that section). The "next expected" correct chip
  // is the first not-yet-selected correct chip in emission order. Tapping
  // a correct assembly chip out of order is treated as a WRONG tap: the
  // chip is NOT consumed (stays unselected + tappable), the streak resets,
  // wrongTaps increments, and the chip's feedback is set to "incorrect"
  // so the red shake animation fires. The page reads the returned
  // TapResult to play the buzzer + haptic (it can't rely on chip.isCorrect
  // because the chip IS statically correct).
  //
  // The result is captured via a closure variable because the decision is
  // made inside setSession's updater (which runs synchronously for useState
  // in React 18+, but defensively we treat it as async).
  const tapChip = useCallback(
    (sectionKind: GameSectionKind, chipId: string): TapResult => {
      let result: TapResult = "noop";
      setSession((prev) => {
        if (!prev || prev.finished) {
          result = "noop";
          return prev;
        }
        const round = prev.rounds[prev.currentIndex];
        if (!round || round.complete) {
          result = "noop";
          return prev;
        }
        const section = round.sections.find((s) => s.kind === sectionKind);
        if (!section || section.done) {
          result = "noop";
          return prev;
        }
        const chip = section.chips.find((c) => c.id === chipId);
        if (!chip || chip.selected) {
          result = "noop";
          return prev;
        }

        const isCorrect = chip.isCorrect;

        // Assembly-order enforcement. When the toggle is ON and this is an
        // assembly section, a correct chip is only allowed if its recipe
        // array index (chip.orderIndex) equals the next-expected recipe
        // array index — the SMALLEST orderIndex among unselected correct
        // assembly chips. This compares against the recipe's assembly
        // array order (the canonical correct sequence), NOT the shuffled
        // chip array order. Tapping a correct chip out of order is
        // downgraded to a wrong tap: the chip is NOT consumed (stays
        // unselected + tappable), the streak resets, and the chip's
        // feedback is set to "incorrect" so the red shake fires.
        const enforceOrder =
          !!settings?.enforceAssemblyOrder && sectionKind === "assembly";
        let outOfOrder = false;
        if (enforceOrder && isCorrect) {
          const unselectedOrderIndices = section.chips
            .filter(
              (c) =>
                c.isCorrect && !c.selected && typeof c.orderIndex === "number",
            )
            .map((c) => c.orderIndex as number);
          if (unselectedOrderIndices.length > 0) {
            const nextExpectedOrderIndex = Math.min(...unselectedOrderIndices);
            if (
              typeof chip.orderIndex !== "number" ||
              chip.orderIndex > nextExpectedOrderIndex
            ) {
              outOfOrder = true;
            }
          }
        }

        // A "wrong" tap is either a statically-incorrect chip OR an
        // out-of-order assembly tap. In both cases the chip is NOT
        // consumed (stays available), the streak resets, and the chip's
        // feedback is set to "incorrect" so the red shake fires.
        const isWrongTap = !isCorrect || outOfOrder;

        if (isWrongTap) {
          // Mark the chip with incorrect feedback but DO NOT select it —
          // it stays available for the player to tap again (in the right
          // order, for assembly). The red shake animation is driven by
          // chip.feedback === "incorrect" in ChipButton.
          const newChips = section.chips.map((c) =>
            c.id === chipId
              ? { ...c, feedback: "incorrect" as FeedbackState }
              : c,
          );
          const newSection: GameSection = {
            ...section,
            chips: newChips,
            done: false, // unchanged — wrong taps never complete a section
          };
          const newSections = round.sections.map((s) =>
            s.kind === sectionKind ? newSection : s,
          );
          const newWrongTaps = round.wrongTaps + 1;
          const newRound: GameRound = {
            ...round,
            sections: newSections,
            wrongTaps: newWrongTaps,
            complete: false, // unchanged
          };
          const newRounds = prev.rounds.map((r, i) =>
            i === prev.currentIndex ? newRound : r,
          );
          result = "wrong";
          return {
            ...prev,
            rounds: newRounds,
            streak: 0,
            totalWrongTaps: prev.totalWrongTaps + 1,
          };
        }

        // Correct tap (and, for assembly, in the allowed order).
        const newChips = section.chips.map((c) =>
          c.id === chipId
            ? {
                ...c,
                selected: true,
                feedback: "correct" as FeedbackState,
              }
            : c,
        );
        // A section is done when EVERY correct chip in it has been
        // tapped. This supports multi-correct sections (all specs, all
        // assembly steps, all garnishes) — the player must tap every
        // correct chip to complete the section. For assembly with
        // enforceAssemblyOrder ON, the chips must also be tapped in
        // order, which is enforced above.
        const sectionDone = newChips.every((c) => !c.isCorrect || c.selected);
        const newSection: GameSection = {
          ...section,
          chips: newChips,
          done: sectionDone,
        };
        const newSections = round.sections.map((s) =>
          s.kind === sectionKind ? newSection : s,
        );
        const newComplete = newSections.every((s) => s.done);
        const newRound: GameRound = {
          ...round,
          sections: newSections,
          wrongTaps: round.wrongTaps, // unchanged on a correct tap
          complete: newComplete,
        };
        const newRounds = prev.rounds.map((r, i) =>
          i === prev.currentIndex ? newRound : r,
        );

        // Scoring — single pass. Per the user's per-correct-tap scoring
        // preference, points are awarded on EVERY correct tap, not just
        // round-completing taps. The streak used for the bonus is the
        // streak BEFORE this tap (the just-completed correct tap is the
        // (streak+1)th in a row). When streakMultiplier is on, the per-tap
        // award scales with the new streak, capped at 5 so a long streak
        // doesn't inflate the score unboundedly. completedDrinksDelta
        // still only fires on round completion (below).
        const newStreak = prev.streak + 1;
        const basePoints = settings ? settings.pointsPerCorrect : 0;
        const perTapMultiplier = settings?.streakMultiplier
          ? Math.min(5, newStreak)
          : 1;
        const scoreDelta = basePoints * perTapMultiplier;

        const completedDrinksDelta = newComplete && !round.complete ? 1 : 0;
        result = "correct";

        return {
          ...prev,
          rounds: newRounds,
          score: prev.score + scoreDelta,
          streak: newStreak,
          totalWrongTaps: prev.totalWrongTaps, // unchanged on a correct tap
          completedDrinks: prev.completedDrinks + completedDrinksDelta,
        };
      });
      return result;
    },
    [settings],
  );

  // nextDrink — advance to the next round, or finish the session.
  const nextDrink = useCallback(() => {
    setSession((prev) => {
      if (!prev || prev.finished) return prev;
      const nextIndex = prev.currentIndex + 1;
      if (nextIndex >= prev.rounds.length) {
        return { ...prev, finished: true };
      }
      // Reset the streak at the start of each drink per the user's
      // learning-feel preference: a fresh drink starts the streak over.
      return { ...prev, currentIndex: nextIndex, streak: 0 };
    });
  }, []);

  // restart — rebuild the session with fresh rounds (new shuffle).
  const restart = useCallback(() => {
    setSession(null);
    setSessionKey((k) => k + 1);
  }, []);

  // toggleMute / setMuted — sound state lives in the session so it
  // survives re-renders. The page wires these to the sound hook.
  const toggleMute = useCallback(() => {
    setSession((prev) => (prev ? { ...prev, muted: !prev.muted } : prev));
  }, []);
  const setMuted = useCallback((next: boolean) => {
    setSession((prev) => (prev ? { ...prev, muted: next } : prev));
  }, []);

  // Detect the bug-3 case: the activity query resolved successfully but
  // the fetched activity isn't a Drinks Builder game (e.g. a quiz or
  // flashcard activity id was opened on the drinks-builder route). This
  // is not a query error and settings is null, so without an explicit
  // flag the `(!settings && !activityQuery.isError)` clause in isLoading
  // would stay true forever and the page would render an endless skeleton.
  const wrongActivityKind =
    !activityQuery.isLoading &&
    !activityQuery.isError &&
    !!activityQuery.data &&
    activityQuery.data.content.kind !== "drinksBuilderContent";

  const isLoading =
    activityQuery.isLoading ||
    playableQuery.isLoading ||
    decoyQuery.isLoading ||
    // Still loading while we wait for the activity query and don't yet
    // know whether it's the right kind. Once the query resolves, the
    // wrongActivityKind flag takes over and clears loading.
    (!settings && !activityQuery.isError && !wrongActivityKind);
  const isError =
    activityQuery.isError || playableQuery.isError || decoyQuery.isError;

  return {
    isLoading,
    isError,
    activityName: activityQuery.data?.name ?? null,
    positionId: activityQuery.data?.positionId ?? null,
    settings,
    session,
    emptyReason: wrongActivityKind
      ? "wrongActivityKind"
      : playablePool.emptyReason,
    tapChip,
    nextDrink,
    restart,
    toggleMute,
    setMuted,
  };
}
