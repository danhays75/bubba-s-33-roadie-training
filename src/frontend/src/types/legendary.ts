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

/**
 * The kind of Be Legendary activity a position can practice.
 * Mirrors the backend ActivityType enum.
 */
export type LegendaryActivityType = "quiz" | "flashcards";

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
 * A single flashcard. The front shows the item title (and photo when
 * present); the back shows the detail fields. `itemPhoto` is null when the
 * backend omits the optional ?Text.
 */
export interface LegendaryFlashcard {
  itemTitle: string;
  itemPhoto: string | null;
  detailFields: Array<{ fieldLabel: string; value: string }>;
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
  | { kind: "flashcardContent"; flashcards: LegendaryFlashcardContent };

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
}

// --- Translators -----------------------------------------------------------

/** Candid ActivityType enum shape from backend.d.ts. */
type CandidActivityType = "quiz" | "flashcards";

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

/** Candid Flashcard shape from backend.d.ts (itemPhoto is optional). */
type CandidFlashcard = {
  itemTitle: string;
  detailFields: Array<{ fieldLabel: string; value: string }>;
  itemPhoto?: string;
};

/** Candid ActivityContent tagged-union shape from backend.d.ts. */
type CandidActivityContent =
  | { __kind__: "quizContent"; quizContent: CandidQuestion[] }
  | {
      __kind__: "flashcardContent";
      flashcardContent: CandidFlashcard[];
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

/** Translates a Candid Flashcard (optional itemPhoto) to the local shape. */
export function toFrontendFlashcard(f: CandidFlashcard): LegendaryFlashcard {
  return {
    itemTitle: f.itemTitle,
    itemPhoto: f.itemPhoto ?? null,
    detailFields: f.detailFields,
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
  return {
    kind: "flashcardContent",
    flashcards: c.flashcardContent.map(toFrontendFlashcard),
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
