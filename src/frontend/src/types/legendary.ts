// Frontend Be Legendary types mirroring the backend Candid bindings in
// backend.d.ts.
//
// The backend returns bigint ids and Principal; the frontend keeps ergonomic
// string versions (stringified bigint ids, principal text) for routing,
// display, and React keys. The hooks in src/hooks/useLegendary.ts translate
// at the boundary: string -> bigint (BigInt(...)) and string -> Principal
// (Principal.fromText(...)) on the way in, and the reverse on the way out.
//
// Optional ?Text fields (itemPhoto) are translated to `T | null` on the
// frontend — `null` represents the absent optional, matching the
// foundation.ts / nso.ts pattern.
//
// The ActivityType and Question variants are Candid tagged unions
// (`{ __kind__: "quiz" }` etc.). The frontend mirrors them as discriminated
// unions keyed on `kind` so the page components can switch cleanly.

import type { DrinksBuilderSettings } from "../components/legendary/drinks-builder/types";

/**
 * The kind of Be Legendary activity a position can practice.
 * Mirrors the backend ActivityType enum.
 */
export type LegendaryActivityType = "quiz" | "flashcards" | "drinksBuilder";

/**
 * A multiple-choice question. `correctIndex` is the number form of the
 * backend's bigint index into `choices`. Exactly one choice is correct;
 * the rest are distractors.
 */
export interface LegendaryMultipleChoiceQuestion {
  kind: "multipleChoice";
  prompt: string;
  choices: string[];
  correctIndex: number;
}

/**
 * A matching question. `pairs` is the list of (itemTitle, fieldValue)
 * pairings the learner must reproduce; `shuffledOptions` is the backend's
 * shuffled pool of field values to choose from.
 */
export interface LegendaryMatchingQuestion {
  kind: "matching";
  pairs: Array<{ itemTitle: string; fieldValue: string }>;
  shuffledOptions: string[];
}

/**
 * A true/false statement. `isTrue` is the backend's boolean.
 */
export interface LegendaryTrueFalseQuestion {
  kind: "trueFalse";
  statement: string;
  isTrue: boolean;
}

/**
 * A single quiz question — one of three variants. The `kind` field
 * discriminates the union so the quiz page can switch on it.
 */
export type LegendaryQuestion =
  | LegendaryMultipleChoiceQuestion
  | LegendaryMatchingQuestion
  | LegendaryTrueFalseQuestion;

/** The content of a quiz activity — an ordered list of questions. */
export type LegendaryQuizContent = LegendaryQuestion[];

/**
 * A flashcard recipe payload — a subset of the full foundation Recipe shape
 * (glassware, specs, assembly, garnish). Mirrors the agreed backend
 * Flashcard.recipe field. Variants, equipment, yield, shelfLife, and
 * qualityIdentifier are intentionally NOT included — the flashcard back
 * shows the base build only.
 */
export interface LegendaryFlashcardRecipe {
  glassware: string;
  specs: Array<{ amount: string; ingredient: string }>;
  assembly: string[];
  garnish: string[];
}

/**
 * A single flashcard. The front shows the item title (and photo when
 * present); the back shows the detail fields, OR — when `recipe` is
 * non-null — the structured recipe (glassware, specs, assembly, garnish)
 * in a dark-roadhouse-themed layout. `itemPhoto` is null when the backend
 * omits the optional ?Text. `recipe` is null when the backend omits the
 * optional ?Recipe (non-recipe cards keep the detailFields rendering).
 */
export interface LegendaryFlashcard {
  itemTitle: string;
  itemPhoto: string | null;
  detailFields: Array<{ fieldLabel: string; value: string }>;
  recipe: LegendaryFlashcardRecipe | null;
}

/** The content of a flashcard activity — an ordered list of flashcards. */
export type LegendaryFlashcardContent = LegendaryFlashcard[];

/**
 * The content of a Be Legendary activity — either a quiz or a flashcard
 * set. The `kind` field discriminates the union so the page can switch on
 * it. Mirrors the backend ActivityContent tagged union.
 */
export type LegendaryActivityContent =
  | { kind: "quizContent"; questions: LegendaryQuizContent }
  | { kind: "flashcardContent"; flashcards: LegendaryFlashcardContent }
  | { kind: "drinksBuilderContent"; settings: DrinksBuilderSettings };

/**
 * A Be Legendary activity built for a position.
 *
 * `id`, `positionId` are stringified bigints — set by the hook layer when
 * translating the Candid Activity (which has `id: bigint`, `positionId:
 * bigint`). `sourceCategoryIds` is the stringified form of the backend's
 * `Array<bigint>`. `createdAt` is the stringified bigint timestamp. `createdBy`
 * is the stringified Principal text.
 */
export interface LegendaryActivity {
  id: string;
  positionId: string;
  activityType: LegendaryActivityType;
  name: string;
  sourceCategoryIds: string[];
  content: LegendaryActivityContent;
  createdAt: string;
  createdBy: string;
}

/**
 * Input for building a Be Legendary activity. `positionId` and
 * `sourceCategoryIds` are strings on the frontend; the hook layer translates
 * them to bigint / Array<bigint> at the boundary.
 */
export interface BuildLegendaryActivityInput {
  positionId: string;
  activityType: LegendaryActivityType;
  name: string;
  sourceCategoryIds: string[];
  /**
   * Optional activity content. Currently only sent for drinksBuilder
   * activities (carries the DrinksBuilderSettings). The hook layer
   * translates the frontend DrinksBuilderSettings (number fields) to the
   * Candid shape (bigint fields) at the boundary. Omitted for quiz /
   * flashcards — the backend generates that content from the source
   * categories.
   */
  content?: LegendaryActivityContent;
}

/**
 * Input for updating a Be Legendary activity's name and source categories.
 * Mirrors the backend's UpdateActivityInput ({ id: bigint; name: string;
 * sourceCategoryIds: Array<bigint> }) but with stringified bigint ids for
 * frontend use. The hook layer translates `id` and `sourceCategoryIds` to
 * bigint / Array<bigint> at the boundary. `positionId` is included so the
 * hook can invalidate the position's activities list on success — it is not
 * sent to the backend.
 */
export interface UpdateLegendaryActivityInput {
  id: string;
  name: string;
  sourceCategoryIds: string[];
  positionId: string;
  /**
   * Optional activity content. Currently only sent for drinksBuilder
   * activities (carries the updated DrinksBuilderSettings). The hook layer
   * translates the frontend DrinksBuilderSettings (number fields) to the
   * Candid shape (bigint fields) at the boundary. Omitted for quiz /
   * flashcards — the backend regenerates that content via rebuild.
   */
  content?: LegendaryActivityContent;
}

// --- Translators -----------------------------------------------------------

/** Candid ActivityType enum shape from backend.d.ts. */
type CandidActivityType = "quiz" | "flashcards" | "drinksBuilder";

/**
 * Candid DrinksBuilderSettings shape from backend.d.ts. bigint fields
 * (decoyCount, pointsPerCorrect, roundsPerSession) are translated to number
 * in toFrontendActivityContent.
 */
type CandidDrinksBuilderSettings = {
  includedCategories: string[];
  excludedDrinkTitles: string[];
  decoyCount: bigint;
  requireExactAmounts: boolean;
  enforceAssemblyOrder: boolean;
  showScoring: boolean;
  streakMultiplier: boolean;
  pointsPerCorrect: bigint;
  roundsPerSession: bigint;
  soundDefault: boolean;
};

/** Candid Question tagged-union shape from backend.d.ts. */
type CandidQuestion =
  | {
      __kind__: "multipleChoice";
      multipleChoice: {
        correctIndex: bigint;
        prompt: string;
        choices: string[];
      };
    }
  | {
      __kind__: "matching";
      matching: {
        pairs: Array<{ itemTitle: string; fieldValue: string }>;
        shuffledOptions: string[];
      };
    }
  | {
      __kind__: "trueFalse";
      trueFalse: { statement: string; isTrue: boolean };
    };

/**
 * Candid Flashcard recipe shape from backend.d.ts — the optional ?Recipe
 * payload appended after detailFields. Mirrors the agreed backend shape
 * (glassware, specs, assembly, garnish only — no variants/equipment/yield/
 * shelfLife/qualityIdentifier).
 */
type CandidFlashcardRecipe = {
  glassware: string;
  specs: Array<{ amount: string; ingredient: string }>;
  assembly: string[];
  garnish: string[];
};

/** Candid Flashcard shape from backend.d.ts (itemPhoto + recipe are optional). */
type CandidFlashcard = {
  itemTitle: string;
  detailFields: Array<{ fieldLabel: string; value: string }>;
  itemPhoto?: string;
  recipe?: CandidFlashcardRecipe;
};

/** Candid ActivityContent tagged-union shape from backend.d.ts. */
type CandidActivityContent =
  | { __kind__: "quizContent"; quizContent: CandidQuestion[] }
  | {
      __kind__: "flashcardContent";
      flashcardContent: CandidFlashcard[];
    }
  | {
      __kind__: "drinksBuilderContent";
      drinksBuilderContent: { settings: CandidDrinksBuilderSettings };
    };

/** Candid Activity shape from backend.d.ts (bigint ids, Principal createdBy). */
type CandidActivity = {
  id: bigint;
  positionId: bigint;
  activityType: CandidActivityType;
  name: string;
  sourceCategoryIds: bigint[];
  content: CandidActivityContent;
  createdAt: bigint;
  createdBy: { toString(): string };
};

/** Translates a Candid Question tagged union to the local discriminated union. */
export function toFrontendQuestion(q: CandidQuestion): LegendaryQuestion {
  if (q.__kind__ === "multipleChoice") {
    return {
      kind: "multipleChoice",
      prompt: q.multipleChoice.prompt,
      choices: q.multipleChoice.choices,
      correctIndex: Number(q.multipleChoice.correctIndex),
    };
  }
  if (q.__kind__ === "matching") {
    return {
      kind: "matching",
      pairs: q.matching.pairs,
      shuffledOptions: q.matching.shuffledOptions,
    };
  }
  return {
    kind: "trueFalse",
    statement: q.trueFalse.statement,
    isTrue: q.trueFalse.isTrue,
  };
}

/**
 * Translates a Candid Flashcard (optional itemPhoto + optional recipe) to
 * the local shape. `itemPhoto` and `recipe` become null when the backend
 * omits the optionals, so non-recipe cards keep the detailFields rendering
 * path on the back face.
 */
export function toFrontendFlashcard(f: CandidFlashcard): LegendaryFlashcard {
  return {
    itemTitle: f.itemTitle,
    itemPhoto: f.itemPhoto ?? null,
    detailFields: f.detailFields,
    recipe: f.recipe
      ? {
          glassware: f.recipe.glassware,
          specs: f.recipe.specs,
          assembly: f.recipe.assembly,
          garnish: f.recipe.garnish,
        }
      : null,
  };
}

/** Translates a Candid DrinksBuilderSettings (bigint fields) to the local shape. */
function toFrontendDrinksBuilderSettings(
  s: CandidDrinksBuilderSettings,
): DrinksBuilderSettings {
  return {
    includedCategories: s.includedCategories,
    excludedDrinkTitles: s.excludedDrinkTitles,
    decoyCount: Number(s.decoyCount),
    requireExactAmounts: s.requireExactAmounts,
    enforceAssemblyOrder: s.enforceAssemblyOrder,
    showScoring: s.showScoring,
    streakMultiplier: s.streakMultiplier,
    pointsPerCorrect: Number(s.pointsPerCorrect),
    roundsPerSession: Number(s.roundsPerSession),
    soundDefault: s.soundDefault,
  };
}

/** Translates a Candid ActivityContent tagged union to the local shape. */
export function toFrontendActivityContent(
  c: CandidActivityContent,
): LegendaryActivityContent {
  if (c.__kind__ === "quizContent") {
    return {
      kind: "quizContent",
      questions: c.quizContent.map(toFrontendQuestion),
    };
  }
  if (c.__kind__ === "flashcardContent") {
    return {
      kind: "flashcardContent",
      flashcards: c.flashcardContent.map(toFrontendFlashcard),
    };
  }
  return {
    kind: "drinksBuilderContent",
    settings: toFrontendDrinksBuilderSettings(c.drinksBuilderContent.settings),
  };
}

/** Translates a Candid Activity (bigint ids, Principal) to the local shape. */
export function toFrontendActivity(a: CandidActivity): LegendaryActivity {
  return {
    id: a.id.toString(),
    positionId: a.positionId.toString(),
    activityType: a.activityType,
    name: a.name,
    sourceCategoryIds: a.sourceCategoryIds.map((id) => id.toString()),
    content: toFrontendActivityContent(a.content),
    createdAt: a.createdAt.toString(),
    createdBy: a.createdBy.toString(),
  };
}
