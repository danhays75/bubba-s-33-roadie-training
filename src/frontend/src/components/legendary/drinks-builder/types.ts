// Drinks Builder game types — frontend-only shapes for the tap-based
// drink-construction practice game (Be Legendary Learning Hub).
//
// The backend exposes:
//   - getDrinksBuilderPlayablePool(activityId) -> [LibraryItem]
//   - getDrinksBuilderDecoyPool(activityId)   -> [LibraryItem]
//   - DrinksBuilderSettings (mirrored below)
//   - DrinksBuilderContent { settings: DrinksBuilderSettings }
//
// The frontend applies client-side filtering (includedCategories,
// excludedDrinkTitles, bulk-mix exclusion), builds the global decoy pool,
// generates rounds with decoys, and manages session state. Scores are
// session-only — never persisted to the backend (per doNotBuild).

import type { LibraryItem } from "@/types/foundation";

/**
 * Mirrors the backend DrinksBuilderSettings (backend.d.ts). bigint fields
 * are translated to number at the hook boundary for ergonomic frontend use.
 */
export interface DrinksBuilderSettings {
  includedCategories: string[];
  excludedDrinkTitles: string[];
  decoyCount: number;
  requireExactAmounts: boolean;
  enforceAssemblyOrder: boolean;
  showScoring: boolean;
  streakMultiplier: boolean;
  pointsPerCorrect: number;
  roundsPerSession: number;
  soundDefault: boolean;
}

/** Default amber/gold liquid fill when a recipe omits the optional color. */
export const DEFAULT_LIQUID_COLOR = "#F2A900";

/**
 * A drink that is playable in the game — derived from a LibraryItem with a
 * recipe that has non-empty specs, assembly, and glassware, and is not a
 * bulk-mix (no yield, no equipment). `color` is the per-recipe optional hex
 * liquid fill, defaulting to amber/gold when absent.
 */
export interface PlayableDrink {
  id: string;
  title: string;
  categoryId: string;
  categoryName: string;
  glassware: string;
  specs: Array<{ amount: string; ingredient: string }>;
  assembly: string[];
  garnish: string[];
  color: string;
  /**
   * The drink's photo URL (mirrors LibraryItem.photo, used on the recipe
   * card). Null when the recipe has no photo — the finish screen falls back
   * to the filled SVG glass in that case.
   */
  photo: string | null;
}

/** The four modular sections of a drink the player builds. */
export type GameSectionKind = "glassware" | "specs" | "assembly" | "garnish";

/** A single tappable chip option within a section. */
export interface Chip {
  /** Stable id for React keys (deterministic, not a runtime uuid). */
  id: string;
  /** Display label (e.g. "Rocks glass", "2 oz Bourbon", "Stir 30s"). */
  label: string;
  /** True when this chip is the correct answer for the current drink. */
  isCorrect: boolean;
  /** True when the player has tapped this chip. */
  selected: boolean;
  /** Feedback state for this chip after a tap. */
  feedback: FeedbackState;
  /**
   * Recipe array index for correct ASSEMBLY chips (the position of this
   * step in drink.assembly, 0-based). Undefined for decoys and for every
   * non-assembly section (glassware/specs/garnish). Set at chip-build time
   * BEFORE the seeded shuffle so the shuffle preserves it on each chip
   * object; only the GRADING and the Step N popup number read it back.
   */
  orderIndex?: number;
}

/** Per-chip feedback after a tap. */
export type FeedbackState = "idle" | "correct" | "incorrect";

/** A single section in a round — one of the four drink parts. */
export interface GameSection {
  kind: GameSectionKind;
  /** Section heading label (GLASSWARE / SPECS / ASSEMBLY / GARNISH). */
  label: string;
  /** All chip options (correct + decoys), shuffled. */
  chips: Chip[];
  /** True when every correct chip in this section has been tapped. */
  done: boolean;
}

/** A single round — one drink with its four sections. */
export interface GameRound {
  /** The drink the player is building this round. */
  drink: PlayableDrink;
  /** The four sections, in display order. */
  sections: GameSection[];
  /** Number of wrong taps this round (resets streak). */
  wrongTaps: number;
  /** True when all four sections are done. */
  complete: boolean;
}

/** Top-level session state for a play-through. */
export interface SessionState {
  /** All rounds for this session (length = roundsPerSession, capped by pool). */
  rounds: GameRound[];
  /** Index into rounds of the current round. */
  currentIndex: number;
  /** Cumulative score across completed rounds. */
  score: number;
  /** Current consecutive-correct streak (resets on a wrong tap). */
  streak: number;
  /** Total wrong taps across the session. */
  totalWrongTaps: number;
  /** Number of drinks completed (all four sections done). */
  completedDrinks: number;
  /** True when the session is over (all rounds complete). */
  finished: boolean;
  /** Sound mute state (initial = !settings.soundDefault). */
  muted: boolean;
}

/** Empty-state reason when the playable pool is too small, or the
 *  fetched activity isn't a Drinks Builder game at all. */
export type EmptyReason = "noPlayable" | "tooFew" | "wrongActivityKind";

/** Result of building the playable pool from LibraryItems. */
export interface PlayablePoolResult {
  drinks: PlayableDrink[];
  /** Map of categoryId -> categoryName for display. */
  categoryNameById: Map<string, string>;
  /** Reason the pool is empty/too small, when applicable. */
  emptyReason: EmptyReason | null;
}
