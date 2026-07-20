/* eslint-disable */
// @ts-nocheck
//
// Mock backend for visual QA and frontend-only iteration.
//
// Exports `mockBackend` implementing the full `backendInterface` from
// ../backend.d.ts with realistic Be Legendary sample data so the Be Legendary
// banner, page, quiz, and flashcard components render without a live canister.
//
// Usage: VITE_USE_MOCK=true pnpm dev (when the app wires VITE_USE_MOCK to
// swap createActor for this mock). Kept after QA so developers can run the
// frontend without the backend.
//
// The data is shaped to exercise every Be Legendary code path:
//   - Two positions (Roadie, Bartender) so the home grid + position page render.
//   - Categories including "Service with HEART" so the HEART entry button shows.
//   - Two Be Legendary activities per position: one quiz (with all three
//     question variants: multipleChoice, trueFalse, matching) and one
//     flashcard set (with detail fields + a photo card).
//   - A user profile with role=admin so the Build Activity button + delete
//     actions render on the Be Legendary page.
//   - One assignment (inTraining) so the StatusBadge shows a non-default tone.

import type { backendInterface } from "../backend";

// A stable fake Principal text. The hooks call `.toString()` on it.
const FAKE_PRINCIPAL = {
  toString: () =>
    "2vxsx-faeaaa-aaaaq-aaaca-cai" as unknown as string,
  toText: () => "2vxsx-faeaaa-aaaaq-aaaca-cai",
} as never;

// --- Sample data ------------------------------------------------------------

const positions = [
  {
    id: 1n,
    sortOrder: 0n,
    name: "Bartender",
    description:
      "Craft cocktails, cold beer, and the personality that keeps the bar alive.",
    coverPhoto: undefined,
  },
  {
    id: 2n,
    sortOrder: 1n,
    name: "Server",
    description:
      "Front-of-house hospitality — taking orders, serving food, and creating great guest experiences.",
    coverPhoto: undefined,
  },
  {
    id: 3n,
    sortOrder: 2n,
    name: "Host",
    description:
      "First impression of the roadhouse — greeting guests, managing the wait, and setting the tone.",
    coverPhoto: undefined,
  },
  {
    id: 4n,
    sortOrder: 3n,
    name: "Server Support",
    description:
      "The backbone of the floor — running food, refilling drinks, and keeping the team moving.",
    coverPhoto: undefined,
  },
];

const categories = [
  // Position 1 — Bartender
  {
    id: 10n,
    sortOrder: 0n,
    name: "Service with HEART",
    positionId: 1n,
    coverPhoto: undefined,
  },
  {
    id: 11n,
    sortOrder: 1n,
    name: "Setup & Teardown",
    positionId: 1n,
    coverPhoto: undefined,
  },
  {
    id: 12n,
    sortOrder: 2n,
    name: "Safety & Sanitation",
    positionId: 1n,
    coverPhoto: undefined,
  },
  // Position 2 — Server
  {
    id: 20n,
    sortOrder: 0n,
    name: "Service with HEART",
    positionId: 2n,
    coverPhoto: undefined,
  },
  {
    id: 21n,
    sortOrder: 1n,
    name: "Cocktails",
    positionId: 2n,
    coverPhoto: undefined,
  },
  {
    id: 22n,
    sortOrder: 2n,
    name: "Beer & Wine",
    positionId: 2n,
    coverPhoto: undefined,
  },
];

// Recipes attached to cocktail items so the Drinks Builder game has a
// playable pool (specs + assembly + glassware + garnish all non-empty).
// Bulk-mix recipes (yield/equipment) are intentionally NOT included so the
// in-scope filter keeps these drinks playable.
const oldFashionedRecipe = {
  glassware: "Rocks",
  specs: [
    { ingredient: "Bourbon", amount: "2 oz" },
    { ingredient: "Sugar cube", amount: "1" },
    { ingredient: "Angostura bitters", amount: "2 dashes" },
  ],
  assembly: [
    "Muddle sugar with bitters and a splash of water",
    "Add bourbon and a large ice cube",
    "Stir until well chilled",
  ],
  garnish: ["Orange peel"],
  variants: [],
  equipment: [],
  yield: null,
  shelfLife: null,
  qualityIdentifier: [],
};

const margaritaRecipe = {
  glassware: "Coupe",
  specs: [
    { ingredient: "Tequila", amount: "2 oz" },
    { ingredient: "Lime juice", amount: "1 oz" },
    { ingredient: "Cointreau", amount: "1 oz" },
  ],
  assembly: [
    "Shake all ingredients with ice",
    "Strain into a salt-rimmed chilled coupe",
  ],
  garnish: ["Lime wheel"],
  variants: [],
  equipment: [],
  yield: null,
  shelfLife: null,
  qualityIdentifier: [],
};

const negroniRecipe = {
  glassware: "Rocks",
  specs: [
    { ingredient: "Gin", amount: "1 oz" },
    { ingredient: "Campari", amount: "1 oz" },
    { ingredient: "Sweet vermouth", amount: "1 oz" },
  ],
  assembly: [
    "Stir all ingredients over a large ice cube",
    "Express an orange peel over the top",
  ],
  garnish: ["Orange peel"],
  variants: [],
  equipment: [],
  yield: null,
  shelfLife: null,
  qualityIdentifier: [],
};

const items = [
  {
    id: 100n,
    categoryId: 21n,
    title: "Old Fashioned",
    subtitle: "Whiskey classic",
    photo: undefined,
    details: [
      { fieldLabel: "SPIRIT", value: "Bourbon" },
      { fieldLabel: "BUILD", value: "<ul><li>2 oz bourbon</li><li>1 sugar cube</li><li>2 dashes Angostura bitters</li><li>Orange peel garnish</li></ul>" },
      { fieldLabel: "GLASS", value: "Rocks" },
    ],
    notes: undefined,
    tags: ["whiskey", "classic", "rocks"],
    seasonal: false,
    sortOrder: 0n,
    recipe: oldFashionedRecipe,
  },
  {
    id: 101n,
    categoryId: 21n,
    title: "Margarita",
    subtitle: "Tequila favorite",
    photo: undefined,
    details: [
      { fieldLabel: "SPIRIT", value: "Tequila" },
      { fieldLabel: "BUILD", value: "<ul><li>2 oz tequila</li><li>1 oz lime juice</li><li>1 oz Cointreau</li><li>Salt rim</li></ul>" },
      { fieldLabel: "GLASS", value: "Coupe" },
    ],
    notes: undefined,
    tags: ["tequila", "citrus", "classic"],
    seasonal: false,
    sortOrder: 1n,
    recipe: margaritaRecipe,
  },
  {
    id: 103n,
    categoryId: 21n,
    title: "Negroni",
    subtitle: "Italian bitter classic",
    photo: undefined,
    details: [
      { fieldLabel: "SPIRIT", value: "Gin" },
      { fieldLabel: "BUILD", value: "<ul><li>1 oz gin</li><li>1 oz Campari</li><li>1 oz sweet vermouth</li></ul>" },
      { fieldLabel: "GLASS", value: "Rocks" },
    ],
    notes: undefined,
    tags: ["gin", "bitter", "classic"],
    seasonal: false,
    sortOrder: 2n,
    recipe: negroniRecipe,
  },
  {
    id: 102n,
    categoryId: 22n,
    title: "Seasonal Pumpkin Ale",
    subtitle: "Fall favorite",
    photo: undefined,
    details: [
      { fieldLabel: "STYLE", value: "Spiced ale" },
      { fieldLabel: "ABV", value: "5.6%" },
    ],
    notes: undefined,
    tags: ["seasonal", "fall", "ale"],
    seasonal: true,
    sortOrder: 0n,
  },
];

// --- Be Legendary activities ------------------------------------------------

const quizActivity = {
  id: 1000n,
  activityType: "quiz" as const,
  name: "Bartender Basics Quiz",
  positionId: 2n,
  sourceCategoryIds: [21n, 22n],
  createdAt: 1700000000n,
  createdBy: FAKE_PRINCIPAL,
  content: {
    __kind__: "quizContent" as const,
    quizContent: [
      {
        __kind__: "multipleChoice" as const,
        multipleChoice: {
          correctIndex: 1n,
          prompt: "Which glass does an Old Fashioned go in?",
          choices: ["Coupe", "Rocks", "Highball", "Martini"],
        },
      },
      {
        __kind__: "trueFalse" as const,
        trueFalse: {
          statement: "A Margarita uses tequila as its base spirit.",
          isTrue: true,
        },
      },
      {
        __kind__: "matching" as const,
        matching: {
          pairs: [
            { itemTitle: "Old Fashioned", fieldValue: "Bourbon" },
            { itemTitle: "Margarita", fieldValue: "Tequila" },
            { itemTitle: "Pumpkin Ale", fieldValue: "Spiced ale" },
          ],
          shuffledOptions: ["Spiced ale", "Bourbon", "Tequila"],
        },
      },
    ],
  },
};

const flashcardActivity = {
  id: 1001n,
  activityType: "flashcards" as const,
  name: "Cocktail Flashcards",
  positionId: 2n,
  sourceCategoryIds: [21n],
  createdAt: 1700000001n,
  createdBy: FAKE_PRINCIPAL,
  content: {
    __kind__: "flashcardContent" as const,
    flashcardContent: [
      {
        itemTitle: "Old Fashioned",
        itemPhoto: undefined,
        detailFields: [
          { fieldLabel: "SPIRIT", value: "Bourbon" },
          { fieldLabel: "BUILD", value: "<ul><li>2 oz bourbon</li><li>1 sugar cube</li><li>2 dashes Angostura bitters</li><li>Orange peel garnish</li></ul>" },
          { fieldLabel: "GLASS", value: "Rocks" },
        ],
        recipe: {
          glassware: oldFashionedRecipe.glassware,
          specs: oldFashionedRecipe.specs,
          assembly: oldFashionedRecipe.assembly,
          garnish: oldFashionedRecipe.garnish,
        },
      },
      {
        itemTitle: "Margarita",
        itemPhoto: undefined,
        detailFields: [
          { fieldLabel: "SPIRIT", value: "Tequila" },
          { fieldLabel: "BUILD", value: "<ul><li>2 oz tequila</li><li>1 oz lime juice</li><li>1 oz Cointreau</li><li>Salt rim</li></ul>" },
          { fieldLabel: "GLASS", value: "Coupe" },
        ],
        recipe: {
          glassware: margaritaRecipe.glassware,
          specs: margaritaRecipe.specs,
          assembly: margaritaRecipe.assembly,
          garnish: margaritaRecipe.garnish,
        },
      },
    ],
  },
};

const legendaryActivities = [quizActivity, flashcardActivity];

// Bartender position: one quiz activity so the banner + page have content there too.
const roadieQuiz = {
  id: 2000n,
  activityType: "quiz" as const,
  name: "Bartender Safety Quiz",
  positionId: 1n,
  sourceCategoryIds: [12n],
  createdAt: 1700000002n,
  createdBy: FAKE_PRINCIPAL,
  content: {
    __kind__: "quizContent" as const,
    quizContent: [
      {
        __kind__: "multipleChoice" as const,
        multipleChoice: {
          correctIndex: 0n,
          prompt: "How often should you sanitize your hands during setup?",
          choices: [
            "Every 30 minutes",
            "Once per shift",
            "Only at clock-in",
            "Never",
          ],
        },
      },
      {
        __kind__: "trueFalse" as const,
        trueFalse: {
          statement: "Wet floors should be marked with a yellow sign.",
          isTrue: true,
        },
      },
    ],
  },
};

const allLegendaryActivities = [
  ...legendaryActivities,
  roadieQuiz,
];

// --- Profile + assignments --------------------------------------------------

const myProfile = {
  id: FAKE_PRINCIPAL,
  name: "Alex Roadie",
  storeLocation: "Fort Worth, TX",
  role: "admin" as const,
};

const myAssignments = [
  {
    userId: FAKE_PRINCIPAL,
    positionId: 2n,
    status: "inTraining" as const,
  },
];

// --- Mock actor -------------------------------------------------------------

export const mockBackend: backendInterface = {
  // Access control / II (no-ops in mock)
  __accessControlState: async () => ({}),
  __assignments: async () => myAssignments,
  __categories: async () => categories,
  __items: async () => items,
  __legendaryActivities: async () => allLegendaryActivities,
  __nextCategoryId: async () => ({ value: 100n }),
  __nextItemId: async () => ({ value: 200n }),
  __nextLegendaryActivityId: async () => ({ value: 3000n }),
  __nextPhaseId: async () => ({ value: 100n }),
  __nextPositionId: async () => ({ value: 10n }),
  __nextTaskId: async () => ({ value: 200n }),
  __nsoPhases: async () => [],
  __nsoTasks: async () => [],
  __positions: async () => positions,
  __profiles: async () => [[FAKE_PRINCIPAL, myProfile]],
  _immutableObjectStorageBlobsAreLive: async () => [],
  _immutableObjectStorageBlobsToDelete: async () => [],
  _immutableObjectStorageConfirmBlobDeletion: async () => undefined,
  _immutableObjectStorageCreateCertificate: async () => ({
    method: "http",
    blob_hash: "mock",
  }),
  _immutableObjectStorageRefillCashier: async () => ({
    success: true,
    topped_up_amount: 0n,
  }),
  _immutableObjectStorageUpdateGatewayPrincipals: async () => undefined,
  _initialize_access_control: async () => undefined,
  _internet_identity_sign_in_finish: async () => ({ __kind__: "ok", ok: null }),
  _internet_identity_sign_in_start: async () => new Uint8Array(),

  // Foundation
  assignCallerUserRole: async () => undefined,
  assignPosition: async (_userId, positionId) => ({
    userId: FAKE_PRINCIPAL,
    positionId,
    status: "inTraining",
  }),
  createMyProfile: async (name, storeLocation) => ({
    ...myProfile,
    name,
    storeLocation,
  }),
  updateMyProfile: async (name, storeLocation) => ({
    ...myProfile,
    name,
    storeLocation,
  }),
  getMyProfile: async () => myProfile,
  getMyAssignments: async () => myAssignments,
  getAllPositions: async () => positions,
  getPosition: async (id) => positions.find((p) => p.id === id) ?? null,
  createPosition: async (name, description, coverPhoto) => ({
    id: 10n,
    sortOrder: 10n,
    name,
    description: description ?? undefined,
    coverPhoto: coverPhoto ?? undefined,
  }),
  updatePosition: async (id, name, description, coverPhoto) => ({
    id,
    sortOrder: 0n,
    name,
    description: description ?? undefined,
    coverPhoto: coverPhoto ?? undefined,
  }),
  deletePosition: async () => undefined,
  reorderPositions: async () => positions,
  getAllUsers: async () => [myProfile],
  getCallerUserRole: async () => "admin" as never,
  getUserRole: async () => "admin" as never,
  setUserRole: async (_userId, role) => ({ ...myProfile, role }),
  getUserAssignments: async () => myAssignments,
  setAssignmentStatus: async (_userId, positionId, status) => ({
    userId: FAKE_PRINCIPAL,
    positionId,
    status,
  }),
  unassignPosition: async () => undefined,

  // Library
  getCategoriesByPosition: async (positionId) =>
    categories.filter((c) => c.positionId === positionId),
  getCategory: async (id) => categories.find((c) => c.id === id) ?? null,
  createCategory: async (positionId, name, coverPhoto) => ({
    id: 100n,
    sortOrder: 100n,
    name,
    positionId,
    coverPhoto: coverPhoto ?? undefined,
  }),
  updateCategory: async (id, name, coverPhoto) => {
    const c = categories.find((x) => x.id === id);
    return { ...c, name, coverPhoto: coverPhoto ?? undefined } as never;
  },
  deleteCategory: async () => undefined,
  reorderCategories: async (_positionId, orderedIds) =>
    orderedIds.map((id, i) => {
      const c = categories.find((x) => x.id === id);
      return { ...c, sortOrder: BigInt(i) } as never;
    }),
  getItemsByCategory: async (categoryId) =>
    items.filter((i) => i.categoryId === categoryId),
  getItem: async (id) => items.find((i) => i.id === id) ?? null,
  searchLibrary: async (_positionId, searchText) => {
    const q = searchText.toLowerCase();
    return items.filter((i) => i.title.toLowerCase().includes(q));
  },
  createItem: async (
    categoryId,
    title,
    subtitle,
    photo,
    details,
    notes,
    tags,
    seasonal,
  ) => ({
    id: 200n,
    categoryId,
    title,
    subtitle: subtitle ?? undefined,
    photo: photo ?? undefined,
    details,
    notes: notes ?? undefined,
    tags,
    seasonal,
    sortOrder: 200n,
  }),
  updateItem: async (
    id,
    title,
    subtitle,
    photo,
    details,
    notes,
    tags,
    seasonal,
  ) => ({
    id,
    categoryId: 21n,
    title,
    subtitle: subtitle ?? undefined,
    photo: photo ?? undefined,
    details,
    notes: notes ?? undefined,
    tags,
    seasonal,
    sortOrder: 0n,
  }),
  deleteItem: async () => undefined,
  reorderItems: async (_categoryId, orderedIds) =>
    orderedIds.map((id, i) => {
      const it = items.find((x) => x.id === id);
      return { ...it, sortOrder: BigInt(i) } as never;
    }),

  // Be Legendary
  getLegendaryActivitiesByPosition: async (positionId) =>
    allLegendaryActivities.filter((a) => a.positionId === positionId),
  getLegendaryActivity: async (id) =>
    allLegendaryActivities.find((a) => a.id === id) ?? null,
  buildLegendaryActivity: async (input) => {
    // Mirror the real backend's generateFlashcardContent: map every library
    // item in the selected source categories to a flashcard with itemTitle,
    // itemPhoto (if available), and detailFields. When the source item has a
    // non-null recipe, populate the recipe field (glassware/specs/assembly/
    // garnish) so the flashcard back renders the structured recipe; otherwise
    // emit null and keep detailFields from it.details. This ensures local
    // testing shows all flashcards, not just the hardcoded ones in
    // flashcardActivity, and keeps mock parity with the real backend.
    const sourceItems = items.filter((it) =>
      input.sourceCategoryIds.includes(it.categoryId),
    );

    const flashcardContent = sourceItems.map((it) => {
      const recipe = it.recipe
        ? {
            glassware: it.recipe.glassware,
            specs: it.recipe.specs.map((s) => ({
              amount: s.amount,
              ingredient: s.ingredient,
            })),
            assembly: [...it.recipe.assembly],
            garnish: [...it.recipe.garnish],
          }
        : undefined;

      return {
        itemTitle: it.title,
        itemPhoto: it.photo,
        detailFields: it.details.map((d) => ({
          fieldLabel: d.fieldLabel,
          value: d.value,
        })),
        recipe,
      };
    });

    return {
      id: 3000n,
      activityType: input.activityType,
      name: input.name,
      positionId: input.positionId,
      sourceCategoryIds: input.sourceCategoryIds,
      createdAt: 1700000003n,
      createdBy: FAKE_PRINCIPAL,
      content:
        input.activityType === "quiz"
          ? { __kind__: "quizContent" as const, quizContent: [] }
          : {
              __kind__: "flashcardContent" as const,
              flashcardContent,
            },
    };
  },
  deleteLegendaryActivity: async () => undefined,
  updateLegendaryActivity: async (input) => {
    const existing = allLegendaryActivities.find((a) => a.id === input.id);
    return {
      ...(existing ?? quizActivity),
      name: input.name,
      sourceCategoryIds: input.sourceCategoryIds,
    } as never;
  },
  rebuildLegendaryActivity: async (id) => {
    const existing = allLegendaryActivities.find((a) => a.id === id);
    // Return the existing activity with its content unchanged (mock rebuild).
    return (existing ?? quizActivity) as never;
  },

  // NSO (empty in mock — not the focus of this QA)
  getNsoPhases: async () => [],
  getNsoPhase: async () => null,
  createNsoPhase: async (name) => ({ id: 100n, sortOrder: 0n, name }),
  updateNsoPhase: async () => undefined,
  deleteNsoPhase: async () => undefined,
  reorderNsoPhases: async () => undefined,
  getNsoTasksByPhase: async () => [],
  getNsoTask: async () => null,
  createNsoTask: async (phaseId, text, section, assignedTo) => ({
    id: 200n,
    phaseId,
    text,
    section: section ?? undefined,
    assignedTo: assignedTo ?? undefined,
    done: false,
    completionDate: undefined,
    notes: undefined,
    sortOrder: 0n,
  }),
  updateNsoTask: async () => undefined,
  deleteNsoTask: async () => undefined,
  reorderNsoTasks: async () => undefined,
  toggleNsoTask: async () => undefined,
  setNsoTaskAssignment: async () => undefined,
  setNsoTaskCompletionDate: async () => undefined,
  getNsoOverallProgress: async () => ({ doneCount: 0n, totalCount: 0n }),
  getNsoPhaseProgressCounts: async () => [],
  getNsoAssignableUsers: async () => [myProfile],
  importNsoTasks: async () => ({
    phasesCreated: 0n,
    phasesReused: 0n,
    tasksAdded: 0n,
  }),

  // OQL / Data Intelligence
  schema: async () => '{"entities":[]}',
  execute: async () => ({ hasMore: false, rows: [] }),

  isCallerAdmin: async () => true,
};
