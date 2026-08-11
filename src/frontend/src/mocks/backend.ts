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

import { LayoutStyle } from "../backend";
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
    layoutStyle: LayoutStyle.library,
  },
  {
    id: 2n,
    sortOrder: 1n,
    name: "Server",
    description:
      "Front-of-house hospitality — taking orders, serving food, and creating great guest experiences.",
    coverPhoto: undefined,
    layoutStyle: LayoutStyle.library,
  },
  {
    id: 3n,
    sortOrder: 2n,
    name: "Host",
    description:
      "First impression of the roadhouse — greeting guests, managing the wait, and setting the tone.",
    coverPhoto: undefined,
    layoutStyle: LayoutStyle.library,
  },
  {
    id: 4n,
    sortOrder: 3n,
    name: "Server Support",
    description:
      "The backbone of the floor — running food, refilling drinks, and keeping the team moving.",
    coverPhoto: undefined,
    layoutStyle: LayoutStyle.library,
  },
  // "Legendary Starts Here" — the orientation-layout position. layoutStyle
  // is "orientation" so position.$id.tsx renders OrientationLayout instead
  // of the generic library tile grid. Carries the full set of categories
  // the OrientationLayout maps by name (Mission Statement, Core Values,
  // Our Story, Operational Goals, Service Priorities, Food Priorities) plus
  // the "Rules of the Road" policy categories that fall through to the
  // compact reference grid.
  {
    id: 5n,
    sortOrder: 4n,
    name: "Legendary Starts Here",
    description:
      "Your first stop as a Roadie. Welcome to Roadie Nation — where legendary service starts with you.",
    coverPhoto: undefined,
    layoutStyle: LayoutStyle.orientation,
  },
  // "Line Cook" — the kitchen-layout position. layoutStyle is "kitchen" so
  // position.$id.tsx renders KitchenBrowser (the station-filtered recipe
  // browser). Carries food-recipe items across multiple stations and both
  // kinds (menuBuild + prep) so the KitchenBrowser's station chips,
  // Menu/Prep toggle, search, and tile grid all render with realistic
  // content. Tapping a tile navigates to the Food Recipe card.
  {
    id: 6n,
    sortOrder: 5n,
    name: "Line Cook",
    description:
      "The kitchen line — grill, fry, sauté, pizza, and prep stations. Look up your recipe by station and build it to spec.",
    coverPhoto: undefined,
    layoutStyle: LayoutStyle.kitchen,
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
  // Position 1 — Bartender: a MOCKTAILS category with a blue accent so the
  // drink recipe card's accent (title band, section headers, photo border,
  // footer category) renders in the reference blue. Mirrors the Bubba's 33
  // recipe-book reference page.
  {
    id: 13n,
    sortOrder: 3n,
    name: "Mocktails",
    positionId: 1n,
    coverPhoto: undefined,
    accentColor: "#1d4ed8",
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
  // Position 5 — Legendary Starts Here (orientation layout). Categories are
  // mapped by NAME in OrientationLayout, so the names below must match the
  // constants in OrientationLayout.tsx (Mission Statement, Core Values,
  // Our Story, Operational Goals, Service Priorities, Food Priorities,
  // Marketing / Community Priorities). Every category NOT in that hero set
  // falls through to "The Rules of the Road".
  {
    id: 50n,
    sortOrder: 0n,
    name: "Mission Statement",
    positionId: 5n,
    coverPhoto: undefined,
  },
  {
    id: 51n,
    sortOrder: 1n,
    name: "Core Values",
    positionId: 5n,
    coverPhoto: undefined,
  },
  {
    id: 52n,
    sortOrder: 2n,
    name: "Our Story",
    positionId: 5n,
    coverPhoto: undefined,
  },
  {
    id: 53n,
    sortOrder: 3n,
    name: "Operational Goals",
    positionId: 5n,
    coverPhoto: undefined,
  },
  {
    id: 54n,
    sortOrder: 4n,
    name: "Service Priorities",
    positionId: 5n,
    coverPhoto: undefined,
  },
  {
    id: 55n,
    sortOrder: 5n,
    name: "Food Priorities",
    positionId: 5n,
    coverPhoto: undefined,
  },
  {
    id: 68n,
    sortOrder: 6n,
    name: "Marketing / Community Priorities",
    positionId: 5n,
    coverPhoto: undefined,
  },
  // Rules of the Road categories — these fall through to the compact grid.
  {
    id: 56n,
    sortOrder: 7n,
    name: "10-4 With Heart",
    positionId: 5n,
    coverPhoto: undefined,
  },
  {
    id: 57n,
    sortOrder: 8n,
    name: "The Roadie Mentality",
    positionId: 5n,
    coverPhoto: undefined,
  },
  {
    id: 58n,
    sortOrder: 9n,
    name: "Legendary For All",
    positionId: 5n,
    coverPhoto: undefined,
  },
  {
    id: 59n,
    sortOrder: 10n,
    name: "EEO & Harassment Prevention",
    positionId: 5n,
    coverPhoto: undefined,
  },
  {
    id: 60n,
    sortOrder: 11n,
    name: "Reporting a Concern",
    positionId: 5n,
    coverPhoto: undefined,
  },
  {
    id: 61n,
    sortOrder: 12n,
    name: "Work Performance & Behaviors",
    positionId: 5n,
    coverPhoto: undefined,
  },
  {
    id: 62n,
    sortOrder: 13n,
    name: "Reporting an Illness / Food Safety",
    positionId: 5n,
    coverPhoto: undefined,
  },
  {
    id: 63n,
    sortOrder: 14n,
    name: "Alcohol Awareness & Responsible Service",
    positionId: 5n,
    coverPhoto: undefined,
  },
  {
    id: 64n,
    sortOrder: 15n,
    name: "Attendance & Scheduling",
    positionId: 5n,
    coverPhoto: undefined,
  },
  {
    id: 65n,
    sortOrder: 16n,
    name: "Dress & Appearance",
    positionId: 5n,
    coverPhoto: undefined,
  },
  {
    id: 66n,
    sortOrder: 17n,
    name: "Internet & Social Media Use",
    positionId: 5n,
    coverPhoto: undefined,
  },
  {
    id: 67n,
    sortOrder: 18n,
    name: "Employee Timekeeping",
    positionId: 5n,
    coverPhoto: undefined,
  },
  // Position 6 — Line Cook (kitchen layout). Categories group the food
  // recipes by menu section so the KitchenBrowser's station chips + tile
  // grid have realistic content. The browser filters by foodRecipe.station
  // (not category), so the category here is just the organizational bucket.
  // accentColor is set per category so the Food Recipe card theming + the
  // kitchen browser tile stripe/badge pick up the category accent:
  //   - Appetizers → Purple #521A5E (mirrors the printed recipe book)
  //   - Burgers    → Brown #8C5421 (mirrors the printed recipe book)
  //   - Prep Recipes → null (exercises the navy brand-default fallback so
  //     the visual QA verifies the null-accent path, not just the set path)
  {
    id: 70n,
    sortOrder: 0n,
    name: "Appetizers",
    positionId: 6n,
    coverPhoto: undefined,
    accentColor: "#521A5E",
  },
  {
    id: 71n,
    sortOrder: 1n,
    name: "Burgers",
    positionId: 6n,
    coverPhoto: undefined,
    accentColor: "#8C5421",
  },
  {
    id: 72n,
    sortOrder: 2n,
    name: "Prep Recipes",
    positionId: 6n,
    coverPhoto: undefined,
    accentColor: null,
  },
];

// Recipes attached to cocktail items so the Drinks Builder game has a
// playable pool (specs + assembly + glassware + garnish all non-empty).
// Bulk-mix recipes (yield/equipment) are intentionally NOT included so the
// in-scope filter keeps these drinks playable.
const oldFashionedRecipe = {
  glassware: "Rocks",
  specs: [
    { ingredient: "Bourbon", amount: "2 oz", upsell: false },
    { ingredient: "Sugar cube", amount: "1", upsell: false },
    { ingredient: "Angostura bitters", amount: "2 dashes", upsell: false },
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
  // Visual-QA: a recap clip URL so the finish screen's "Skip recap" gating
  // path is exercised. Points to a tiny public-domain WAV so the audio
  // element can attempt playback (the ended/error handlers reveal Next
  // regardless of whether the clip actually plays in the headless browser).
  recapAudio:
    "https://actions.google.com/sounds/v1/cartoon/clang_and_wobble.ogg",
};

const margaritaRecipe = {
  glassware: "Coupe",
  specs: [
    { ingredient: "Tequila", amount: "2 oz", upsell: false },
    { ingredient: "Lime juice", amount: "1 oz", upsell: false },
    { ingredient: "Cointreau", amount: "1 oz", upsell: false },
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
    { ingredient: "Gin", amount: "1 oz", upsell: false },
    { ingredient: "Campari", amount: "1 oz", upsell: false },
    { ingredient: "Sweet vermouth", amount: "1 oz", upsell: false },
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
  // Tropical Breeze — a non-alcoholic mocktail that mirrors the Bubba's 33
  // recipe-book reference page: a photo (so the two-column text-left /
  // photo-right split is exercised), the "(Does Not Contain Alcohol)"
  // subtitle, the blue-accent Mocktails category, and the full Specs /
  // Assembly / Garnish sections. The photo is an inline SVG data URL so the
  // headless browser loads it without a network request.
  {
    id: 104n,
    categoryId: 13n,
    title: "Tropical Breeze",
    subtitle: "(Does Not Contain Alcohol)",
    photo:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="800" viewBox="0 0 640 800"><rect width="640" height="800" fill="#bfe3f5"/><rect x="220" y="180" width="200" height="520" rx="20" fill="#ffffff" stroke="#c9c9c9" stroke-width="6"/><rect x="240" y="320" width="160" height="360" rx="8" fill="#1ca6e0"/><rect x="240" y="560" width="160" height="120" rx="8" fill="#0a7fb8"/><circle cx="300" cy="300" r="14" fill="#ff8a3d"/><circle cx="350" cy="290" r="12" fill="#ff8a3d"/><path d="M320 180 Q300 120 340 100 Q330 150 320 180" fill="#3fa34d"/><path d="M320 180 Q340 130 360 110 Q345 150 320 180" fill="#5cc46a"/></svg>',
      ),
    details: [],
    notes: undefined,
    tags: ["mocktail", "non-alcoholic", "tropical"],
    seasonal: false,
    sortOrder: 3n,
    recipe: {
      glassware: "16 oz. Collins Glass",
      specs: [
        { ingredient: "Monin Blue Curacao", amount: "1 pump", upsell: false },
        { ingredient: "Monin Coconut", amount: "1 pump", upsell: false },
        { ingredient: "Monin Mango", amount: "1 pump", upsell: false },
        { ingredient: "Bubba's Sweet 'N Sour", amount: "1 oz", upsell: false },
        { ingredient: "Mango Chunks", amount: "3", upsell: false },
        { ingredient: "Lime Juice", amount: "1 wedge", upsell: false },
        { ingredient: "Club Soda", amount: "Approx. 2 oz", upsell: false },
      ],
      assembly: [
        "Fill glass with ice.",
        "Using designated NA jigger, add ingredients (minus Club Soda and lime wedge) to glass.",
        "Add juice from 1 squeezed lime wedge. Discard rind.",
        "Pour into designated NA mixing tin and shake vigorously 4-6 times.",
        "Pour ingredients into glass.",
        "Add enough Club Soda to fill glass.",
        "Roll into mixing tin and back into glass 1 time to mix.",
      ],
      garnish: ["Mint sprig"],
      variants: [],
      equipment: [],
      yield: null,
      shelfLife: null,
      qualityIdentifier: [],
    },
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
  // --- Position 5 (Legendary Starts Here) items ---
  // Mission Statement — the item's "Mission" field drives the gold headline;
  // notes becomes the subtitle.
  {
    id: 500n,
    categoryId: 50n,
    title: "Our Mission",
    subtitle: undefined,
    photo: undefined,
    details: [
      {
        fieldLabel: "Mission",
        value: "To Create Legendary Experiences, One Guest at a Time.",
      },
    ],
    notes:
      "Every shift, every guest, every plate — we show up to be legendary. That's the Roadie way.",
    tags: [],
    seasonal: false,
    sortOrder: 0n,
  },
  // Core Values — overview + four value cards + the "All With Purpose" capstone.
  {
    id: 510n,
    categoryId: 51n,
    title: "Our Core Values",
    subtitle: undefined,
    photo: undefined,
    details: [],
    notes:
      "Four values guide every Roadie. They're how we serve guests, support teammates, and build the brand.",
    tags: [],
    seasonal: false,
    sortOrder: 0n,
  },
  {
    id: 511n,
    categoryId: 51n,
    title: "Passion",
    subtitle: undefined,
    photo: undefined,
    details: [
      {
        fieldLabel: "Meaning",
        value:
          "We bring energy and pride to every shift. We love what we do and it shows.",
      },
    ],
    notes: undefined,
    tags: [],
    seasonal: false,
    sortOrder: 1n,
  },
  {
    id: 512n,
    categoryId: 51n,
    title: "Partnership",
    subtitle: undefined,
    photo: undefined,
    details: [
      {
        fieldLabel: "Meaning",
        value:
          "We work as one team. We have each other's backs, on the floor and off.",
      },
    ],
    notes: undefined,
    tags: [],
    seasonal: false,
    sortOrder: 2n,
  },
  {
    id: 513n,
    categoryId: 51n,
    title: "Integrity",
    subtitle: undefined,
    photo: undefined,
    details: [
      {
        fieldLabel: "Meaning",
        value:
          "We do the right thing, even when no one is watching. Honest, accountable, dependable.",
      },
    ],
    notes: undefined,
    tags: [],
    seasonal: false,
    sortOrder: 3n,
  },
  {
    id: 514n,
    categoryId: 51n,
    title: "Fun",
    subtitle: undefined,
    photo: undefined,
    details: [
      {
        fieldLabel: "Meaning",
        value:
          "We keep the roadhouse spirit alive — smiles, laughter, and a great time for every guest.",
      },
    ],
    notes: undefined,
    tags: [],
    seasonal: false,
    sortOrder: 4n,
  },
  {
    id: 515n,
    categoryId: 51n,
    title: "…All With Purpose",
    subtitle: undefined,
    photo: undefined,
    details: [],
    notes: undefined,
    tags: [],
    seasonal: false,
    sortOrder: 5n,
  },
  // Our Story — "Known for" + "This means we have" fields + emoji chips.
  {
    id: 520n,
    categoryId: 52n,
    title: "Our Story",
    subtitle: undefined,
    photo: undefined,
    details: [
      { fieldLabel: "Known for", value: "Burgers. Beer. Bourbon. Good times." },
      {
        fieldLabel: "This means we have",
        value:
          "Hand-cut burgers, ice-cold beer, a full bourbon shelf, and a roadhouse vibe that keeps guests coming back. We're the place to kick back, dig in, and be legendary.",
      },
    ],
    notes: undefined,
    tags: ["🍔 Burgers", "🍺 Beer", "🥃 Bourbon", "🤠 Roadhouse"],
    seasonal: false,
    sortOrder: 0n,
  },
  // Operational Goals — one item with multiple detail fields; each field label
  // becomes a goal card (with abbreviation).
  {
    id: 530n,
    categoryId: 53n,
    title: "Operational Goals",
    subtitle: undefined,
    photo: undefined,
    details: [
      {
        fieldLabel: "Manager in the Window (MIW)",
        value: "A manager is visible at the host stand every shift.",
      },
      {
        fieldLabel: "Maximize Guest Satisfaction (MGS)",
        value: "Every guest leaves happy. Check in, follow up, follow through.",
      },
      {
        fieldLabel: "Drive Sales Growth (DSG)",
        value: "Suggest, upsell, and feature the right items every time.",
      },
      {
        fieldLabel: "Maintain Cleanliness (MC)",
        value: "A clean roadhouse is a legendary roadhouse. Walk the floor.",
      },
    ],
    notes: undefined,
    tags: [],
    seasonal: false,
    sortOrder: 0n,
  },
  // Service Priorities + Food Priorities — the two "10" teaser cards. The
  // OrientationLayout links these to the category detail route, so a single
  // item each is enough to make the destination non-empty.
  {
    id: 540n,
    categoryId: 54n,
    title: "10 Steps to Service",
    subtitle: undefined,
    photo: undefined,
    details: [
      { fieldLabel: "01", value: "Greet within 30 seconds." },
      { fieldLabel: "02", value: "Suggest a drink." },
      { fieldLabel: "03", value: "Take the order." },
    ],
    notes: "The ten steps every Roadie follows to deliver legendary service.",
    tags: ["service", "standards"],
    seasonal: false,
    sortOrder: 0n,
  },
  {
    id: 550n,
    categoryId: 55n,
    title: "10 Daily Essentials",
    subtitle: undefined,
    photo: undefined,
    details: [
      { fieldLabel: "01", value: "Quality check every plate." },
      { fieldLabel: "02", value: "Fresh prep, every shift." },
      { fieldLabel: "03", value: "Hold times honored." },
    ],
    notes: "The ten food priorities that keep our kitchen legendary.",
    tags: ["food", "quality"],
    seasonal: false,
    sortOrder: 0n,
  },
  {
    id: 680n,
    categoryId: 68n,
    title: "10 Community Priorities",
    subtitle: undefined,
    photo: undefined,
    details: [
      { fieldLabel: "01", value: "Know your neighborhood." },
      { fieldLabel: "02", value: "Support local causes." },
      { fieldLabel: "03", value: "Be a good neighbor." },
    ],
    notes:
      "The ten community priorities that keep Roadie Nation rooted in the towns we serve.",
    tags: ["community", "marketing"],
    seasonal: false,
    sortOrder: 0n,
  },
  // Rules of the Road categories — one item each so the destination route
  // has content. These render as the compact 2-column reference grid.
  {
    id: 560n,
    categoryId: 56n,
    title: "10-4 With Heart",
    subtitle: undefined,
    photo: undefined,
    details: [],
    notes: "Acknowledge every guest and teammate. 10-4, we've got you.",
    tags: [],
    seasonal: false,
    sortOrder: 0n,
  },
  {
    id: 570n,
    categoryId: 57n,
    title: "The Roadie Mentality",
    subtitle: undefined,
    photo: undefined,
    details: [],
    notes: "Hustle, heart, and a can-do attitude. That's the Roadie way.",
    tags: [],
    seasonal: false,
    sortOrder: 0n,
  },
  {
    id: 580n,
    categoryId: 58n,
    title: "Legendary For All",
    subtitle: undefined,
    photo: undefined,
    details: [],
    notes: "Every guest, every team, every shift — legendary for all.",
    tags: [],
    seasonal: false,
    sortOrder: 0n,
  },
  {
    id: 590n,
    categoryId: 59n,
    title: "EEO & Harassment Prevention",
    subtitle: undefined,
    photo: undefined,
    details: [],
    notes: "We respect everyone. No exceptions. Report concerns immediately.",
    tags: [],
    seasonal: false,
    sortOrder: 0n,
  },
  {
    id: 600n,
    categoryId: 60n,
    title: "Reporting a Concern",
    subtitle: undefined,
    photo: undefined,
    details: [],
    notes: "Speak up. Use the open-door policy or the anonymous hotline.",
    tags: [],
    seasonal: false,
    sortOrder: 0n,
  },
  {
    id: 610n,
    categoryId: 61n,
    title: "Work Performance & Behaviors",
    subtitle: undefined,
    photo: undefined,
    details: [],
    notes: "Show up, work hard, be kind. The basics of being a Roadie.",
    tags: [],
    seasonal: false,
    sortOrder: 0n,
  },
  {
    id: 620n,
    categoryId: 62n,
    title: "Reporting an Illness / Food Safety",
    subtitle: undefined,
    photo: undefined,
    details: [],
    notes: "If you're sick, tell your manager. Food safety is non-negotiable.",
    tags: [],
    seasonal: false,
    sortOrder: 0n,
  },
  {
    id: 630n,
    categoryId: 63n,
    title: "Alcohol Awareness & Responsible Service",
    subtitle: undefined,
    photo: undefined,
    details: [],
    notes: "Card everyone who looks under 40. Never over-serve. Always safe.",
    tags: [],
    seasonal: false,
    sortOrder: 0n,
  },
  {
    id: 640n,
    categoryId: 64n,
    title: "Attendance & Scheduling",
    subtitle: undefined,
    photo: undefined,
    details: [],
    notes: "Show up on time for every shift. Trade shifts through the app.",
    tags: [],
    seasonal: false,
    sortOrder: 0n,
  },
  {
    id: 650n,
    categoryId: 65n,
    title: "Dress & Appearance",
    subtitle: undefined,
    photo: undefined,
    details: [],
    notes: "Clean uniform, neat hair, roadhouse pride. Look the part.",
    tags: [],
    seasonal: false,
    sortOrder: 0n,
  },
  {
    id: 660n,
    categoryId: 66n,
    title: "Internet & Social Media Use",
    subtitle: undefined,
    photo: undefined,
    details: [],
    notes: "Be kind online. You represent Roadie Nation, on and off the clock.",
    tags: [],
    seasonal: false,
    sortOrder: 0n,
  },
  {
    id: 670n,
    categoryId: 67n,
    title: "Employee Timekeeping",
    subtitle: undefined,
    photo: undefined,
    details: [],
    notes: "Clock in, clock out, every shift. Accurate timekeeping protects you.",
    tags: [],
    seasonal: false,
    sortOrder: 0n,
  },
  // --- Position 6 (Line Cook) food-recipe items ---
  // menuBuild items across multiple stations (Grill, Fry, Sauté, Pizza,
  // Expo) so the KitchenBrowser's station chips render with variety. One
  // menuBuild item carries a plating photo so the Food Recipe card's photo
  // hero + the kitchen tile's photo thumbnail are both exercised. The rest
  // have no photo so the station-colored placeholder tiles render too.
  {
    id: 700n,
    categoryId: 70n,
    title: "Bubba's Nachos",
    subtitle: undefined,
    // A plating photo so the Food Recipe card's photo hero AND the kitchen
    // tile's photo thumbnail both render. Tiny inline SVG data URL so the
    // headless browser can load it without a network request.
    photo:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480"><rect width="640" height="480" fill="#1a1a1f"/><text x="320" y="240" font-family="Arial" font-size="48" fill="#f5f1e8" text-anchor="middle">Bubba\'s Nachos</text></svg>',
      ),
    details: [],
    notes: undefined,
    tags: ["appetizer", "nachos"],
    seasonal: false,
    sortOrder: 0n,
    foodRecipe: {
      station: "Expo",
      kind: "menuBuild" as const,
      menuSection: "Appetizers",
      serviceware: [
        { item: "12-inch oval platter", amount: "1" },
        { item: "Sauce boat", amount: "1" },
      ],
      components: [
        { item: "Tortilla chips", amount: "8 oz", group: null, note: null },
        { item: "Queso", amount: "6 oz", group: null, note: "House queso" },
        { item: "Pickled jalapeños", amount: "1 oz", group: null, note: null },
        { item: "Pico de gallo", amount: "2 oz", group: null, note: null },
        { item: "Sour cream", amount: "1 oz", group: null, note: null },
        { item: "Scallions", amount: "0.5 oz", group: null, note: null },
      ],
      steps: [
        "Spread chips across the platter in an even layer.",
        "Ladle hot queso over the chips, covering the center.",
        "Top with pico, jalapeños, and scallions.",
        "Add a sour cream rosette to one corner.",
      ],
      expoSteps: [
        "Confirm allergen note with the guest before plating.",
        "Garnish with a single scallion fan on the queso.",
        "Expedite immediately — nachos wait for no one.",
      ],
      allergenNote:
        "Contains dairy and wheat. Chips fried in a shared fryer with gluten items.",
      yieldText: null,
      shelfLife: null,
      holdTemp: null,
      storeTemp: null,
      lineUtensil: null,
      equipment: null,
      qualityIdentifiers: [],
    },
  },
  {
    id: 701n,
    categoryId: 70n,
    title: "Buffalo Wings",
    subtitle: undefined,
    photo: undefined,
    details: [],
    notes: undefined,
    tags: ["appetizer", "wings", "spicy"],
    seasonal: false,
    sortOrder: 1n,
    foodRecipe: {
      station: "Fry",
      kind: "menuBuild" as const,
      menuSection: "Appetizers",
      serviceware: [{ item: "Round basket with liner", amount: "1" }],
      components: [
        { item: "Jumbo wings", amount: "10 ct", group: null, note: null },
        { item: "Buffalo sauce", amount: "3 oz", group: null, note: null },
        { item: "Ranch dressing", amount: "2 oz", group: null, note: null },
        { item: "Celery sticks", amount: "4 ct", group: null, note: null },
        { item: "Carrot sticks", amount: "4 ct", group: null, note: null },
      ],
      steps: [
        "Fry wings at 350°F for 8 minutes until golden and crisp.",
        "Toss in warm buffalo sauce until fully coated.",
        "Plate in the basket with celery and carrot on the side.",
        "Add a ramekin of ranch.",
      ],
      expoSteps: [
        "Verify wing crispness before saucing — re-fry if needed.",
        "Confirm heat level with the guest (mild / medium / hot).",
      ],
      allergenNote: "Contains dairy (ranch, buffalo butter).",
      yieldText: null,
      shelfLife: null,
      holdTemp: null,
      storeTemp: null,
      lineUtensil: null,
      equipment: null,
      qualityIdentifiers: [],
    },
  },
  {
    id: 702n,
    categoryId: 70n,
    title: "Mozzarella Sticks",
    subtitle: undefined,
    photo: undefined,
    details: [],
    notes: undefined,
    tags: ["appetizer", "fried", "cheese"],
    seasonal: false,
    sortOrder: 2n,
    foodRecipe: {
      station: "Fry",
      kind: "menuBuild" as const,
      menuSection: "Appetizers",
      serviceware: [{ item: "Rectangle platter", amount: "1" }],
      components: [
        { item: "Mozzarella sticks", amount: "6 ct", group: null, note: null },
        { item: "Marinara", amount: "3 oz", group: null, note: "Warm" },
      ],
      steps: [
        "Fry mozzarella sticks at 350°F for 3 minutes.",
        "Drain briefly on the basket liner.",
        "Plate with marinara in a ramekin.",
      ],
      expoSteps: ["Serve immediately — cheese must be molten."],
      allergenNote: "Contains dairy and wheat.",
      yieldText: null,
      shelfLife: null,
      holdTemp: null,
      storeTemp: null,
      lineUtensil: null,
      equipment: null,
      qualityIdentifiers: [],
    },
  },
  {
    id: 710n,
    categoryId: 71n,
    title: "Bubba's Burger",
    subtitle: undefined,
    photo: undefined,
    details: [],
    notes: undefined,
    tags: ["burger", "grill", "beef"],
    seasonal: false,
    sortOrder: 0n,
    foodRecipe: {
      station: "Grill",
      kind: "menuBuild" as const,
      menuSection: "Burgers",
      serviceware: [
        { item: "Burger basket with liner", amount: "1" },
        { item: "Pickle spear cup", amount: "1" },
      ],
      components: [
        { item: "Beef patty (8 oz)", amount: "1", group: null, note: null },
        { item: "Brioche bun", amount: "1", group: null, note: "Toasted" },
        { item: "American cheese", amount: "1 slice", group: null, note: null },
        { item: "Lettuce", amount: "1 leaf", group: null, note: null },
        { item: "Tomato", amount: "1 slice", group: null, note: null },
        { item: "Red onion", amount: "2 rings", group: null, note: null },
        { item: "Bubba sauce", amount: "1 oz", group: null, note: null },
      ],
      steps: [
        "Season patty and grill to order temp (default medium).",
        "Toast the bun cut-side down on the flat-top.",
        "Add cheese to the patty in the last 30 seconds.",
        "Build: bun, sauce, lettuce, tomato, onion, patty, bun.",
      ],
      expoSteps: [
        "Verify temp with the guest ticket before plating.",
        "Confirm cheese is fully melted.",
        "Expedite hot — burger buns sog fast.",
      ],
      allergenNote:
        "Contains gluten (bun) and dairy (cheese). Bubba sauce contains egg.",
      yieldText: null,
      shelfLife: null,
      holdTemp: null,
      storeTemp: null,
      lineUtensil: null,
      equipment: null,
      qualityIdentifiers: [],
    },
  },
  {
    id: 711n,
    categoryId: 71n,
    title: "Margherita Flatbread",
    subtitle: undefined,
    photo: undefined,
    details: [],
    notes: undefined,
    tags: ["pizza", "flatbread", "vegetarian"],
    seasonal: false,
    sortOrder: 1n,
    foodRecipe: {
      station: "Pizza",
      kind: "menuBuild" as const,
      menuSection: "Burgers",
      serviceware: [{ item: "Wooden board", amount: "1" }],
      components: [
        { item: "Flatbread dough", amount: "1 ball", group: null, note: null },
        { item: "San Marzano sauce", amount: "3 oz", group: null, note: null },
        { item: "Fresh mozzarella", amount: "3 oz", group: null, note: null },
        { item: "Basil leaves", amount: "4 ct", group: null, note: null },
        { item: "Olive oil", amount: "0.5 oz", group: null, note: null },
      ],
      steps: [
        "Stretch dough to a 10-inch round.",
        "Spread sauce, tear mozzarella over the top.",
        "Bake at 550°F for 6 minutes until the crust blisters.",
        "Finish with fresh basil and a drizzle of olive oil.",
      ],
      expoSteps: [
        "Basil must be added AFTER the bake — never before.",
        "Cut into 6 slices before expedite.",
      ],
      allergenNote: "Contains gluten and dairy.",
      yieldText: null,
      shelfLife: null,
      holdTemp: null,
      storeTemp: null,
      lineUtensil: null,
      equipment: null,
      qualityIdentifiers: [],
    },
  },
  {
    id: 712n,
    categoryId: 71n,
    title: "Sautéed Mushrooms Side",
    subtitle: undefined,
    photo: undefined,
    details: [],
    notes: undefined,
    tags: ["side", "sauté", "vegetarian"],
    seasonal: false,
    sortOrder: 2n,
    foodRecipe: {
      station: "Sauté",
      kind: "menuBuild" as const,
      menuSection: "Burgers",
      serviceware: [{ item: "Small ramekin", amount: "1" }],
      components: [
        { item: "Cremini mushrooms", amount: "4 oz", group: null, note: null },
        { item: "Butter", amount: "1 oz", group: null, note: null },
        { item: "Garlic, minced", amount: "0.25 oz", group: null, note: null },
        { item: "White wine", amount: "1 oz", group: null, note: null },
        { item: "Parsley", amount: "0.25 oz", group: null, note: null },
      ],
      steps: [
        "Melt butter in a sauté pan over medium-high.",
        "Add mushrooms; sear without stirring for 90 seconds.",
        "Add garlic, deglaze with wine, toss to coat.",
        "Finish with parsley.",
      ],
      expoSteps: ["Serve hot — mushrooms weep if held."],
      allergenNote: "Contains dairy. Cooked with wine (alcohol cooked off).",
      yieldText: null,
      shelfLife: null,
      holdTemp: null,
      storeTemp: null,
      lineUtensil: null,
      equipment: null,
      qualityIdentifiers: [],
    },
  },
  // prep items — make-ahead recipes with yield, shelf life, line utensil,
  // hold/store temp, step-grouped ingredients, procedure, and a quality
  // identifiers checklist. These exercise the prep layout of the Food
  // Recipe card AND the station-colored placeholder tiles in the kitchen
  // browser (no plating photo on prep recipes).
  {
    id: 720n,
    categoryId: 72n,
    title: "House Ranch Dressing",
    subtitle: undefined,
    photo: undefined,
    details: [],
    notes: undefined,
    tags: ["prep", "sauce", "dairy"],
    seasonal: false,
    sortOrder: 0n,
    foodRecipe: {
      station: "Cold Prep",
      kind: "prep" as const,
      menuSection: null,
      serviceware: [],
      components: [
        { item: "Mayonnaise", amount: "1 gallon", group: "Step 1", note: null },
        { item: "Buttermilk", amount: "1 quart", group: "Step 1", note: null },
        { item: "Sour cream", amount: "1 pint", group: "Step 1", note: null },
        { item: "Dill, chopped", amount: "0.5 oz", group: "Step 2", note: null },
        {
          item: "Parsley, chopped",
          amount: "0.5 oz",
          group: "Step 2",
          note: null,
        },
        { item: "Garlic powder", amount: "2 tbsp", group: "Step 2", note: null },
        { item: "Onion powder", amount: "1 tbsp", group: "Step 2", note: null },
        { item: "Black pepper", amount: "1 tsp", group: "Step 2", note: null },
        { item: "Lemon juice", amount: "2 tbsp", group: "Step 2", note: null },
      ],
      steps: [
        "Whisk mayonnaise, buttermilk, and sour cream until smooth.",
        "Fold in herbs, spices, and lemon juice.",
        "Transfer to a covered container; refrigerate.",
      ],
      expoSteps: [],
      allergenNote: "Contains dairy and egg.",
      yieldText: "1.5 gallons",
      shelfLife: "5 days refrigerated",
      holdTemp: null,
      storeTemp: "34–38°F",
      lineUtensil: "2-oz spoodle",
      equipment: "Whisk, 1-gallon container",
      qualityIdentifiers: [
        "Smooth, pourable consistency — not lumpy or separated.",
        "Pale cream color with visible green herb flecks.",
        "Tangy, herby aroma — no sour or off smell.",
        "Coats the back of a spoon without running thin.",
      ],
    },
  },
  {
    id: 721n,
    categoryId: 72n,
    title: "Marinara Sauce",
    subtitle: undefined,
    photo: undefined,
    details: [],
    notes: undefined,
    tags: ["prep", "sauce", "pizza"],
    seasonal: false,
    sortOrder: 1n,
    foodRecipe: {
      station: "Hot Prep",
      kind: "prep" as const,
      menuSection: null,
      serviceware: [],
      components: [
        {
          item: "San Marzano tomatoes",
          amount: "2 #10 cans",
          group: "Step 1",
          note: "Crushed by hand",
        },
        { item: "Olive oil", amount: "8 oz", group: "Step 1", note: null },
        {
          item: "Yellow onion, diced",
          amount: "1 lb",
          group: "Step 1",
          note: null,
        },
        { item: "Garlic, minced", amount: "2 oz", group: "Step 1", note: null },
        { item: "Basil, fresh", amount: "1 bunch", group: "Step 2", note: null },
        { item: "Oregano, dried", amount: "2 tbsp", group: "Step 2", note: null },
        { item: "Salt", amount: "to taste", group: "Step 2", note: null },
        { item: "Sugar", amount: "1 tbsp", group: "Step 2", note: null },
      ],
      steps: [
        "Sweat onion and garlic in olive oil until translucent.",
        "Add crushed tomatoes; simmer 45 minutes, stirring occasionally.",
        "Stir in basil, oregano, salt, and sugar.",
        "Cool to 70°F within 2 hours, then refrigerate.",
      ],
      expoSteps: [],
      allergenNote: null,
      yieldText: "4 ¾ gallons",
      shelfLife: "7 days refrigerated",
      holdTemp: "145°F",
      storeTemp: "34–38°F",
      lineUtensil: "8-oz ladle",
      equipment: "60-quart stockpot, immersion blender",
      qualityIdentifiers: [
        "Bright red color — not brown or orange.",
        "Thick enough to coat a spoon; not watery.",
        "Balanced tomato flavor with a hint of sweetness.",
        "No whole tomato chunks remaining.",
      ],
    },
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

// A Drinks Builder activity so the drinks-builder game route + admin form
// render under the mock. Uses the Candid shape (bigint fields for
// decoyCount/pointsPerCorrect/roundsPerSession) so the hook's
// toFrontendDrinksBuilderSettings translation runs identically to a live
// canister. The settings mirror DEFAULT_DRINKS_BUILDER_SETTINGS from
// DrinksBuilderSettingsForm, with one prompt per section carrying a
// (fake) audioUrl so the "🔊 clip" indicator + audio-backed subset
// selection are exercised visually.
const drinksBuilderActivity = {
  id: 3000n,
  activityType: "drinksBuilder" as const,
  name: "Cocktail Construction",
  positionId: 2n,
  sourceCategoryIds: [21n],
  createdAt: 1700000004n,
  createdBy: FAKE_PRINCIPAL,
  content: {
    __kind__: "drinksBuilderContent" as const,
    drinksBuilderContent: {
      settings: {
        includedCategories: [],
        excludedDrinkTitles: [],
        decoyCount: 2n,
        requireExactAmounts: true,
        enforceAssemblyOrder: true,
        showScoring: true,
        streakMultiplier: true,
        pointsPerCorrect: 50n,
        roundsPerSession: 0n,
        soundDefault: true,
        glasswarePrompts: [
          { text: "GLASSWARE", audioUrl: undefined },
          { text: "What glass are you reaching for?", audioUrl: undefined },
          {
            text: "Surprise me with your wisdom — what glass?",
            audioUrl: undefined,
          },
          { text: "Be legendary — pick the glass.", audioUrl: undefined },
          { text: "Which glass makes this one shine?", audioUrl: undefined },
          { text: "Glass check! What's it going in?", audioUrl: undefined },
          { text: "Grab the right glass, Roadie.", audioUrl: undefined },
          { text: "First things first — the glass?", audioUrl: undefined },
        ],
        specsPrompts: [
          { text: "SPECS", audioUrl: undefined },
          { text: "Build the pour — what goes in?", audioUrl: undefined },
          { text: "Tap every spec that belongs.", audioUrl: undefined },
          { text: "Show me the recipe, Roadie.", audioUrl: undefined },
          { text: "What's in this legend?", audioUrl: undefined },
          { text: "Load it up — every correct spec.", audioUrl: undefined },
          { text: "Nail the pour. What's in it?", audioUrl: undefined },
          { text: "Ingredients, please — all of 'em.", audioUrl: undefined },
        ],
        assemblyPrompts: [
          { text: "ASSEMBLY", audioUrl: undefined },
          { text: "How do we build it? In order!", audioUrl: undefined },
          { text: "Walk me through the steps.", audioUrl: undefined },
          { text: "Put it together, step by step.", audioUrl: undefined },
          { text: "What's the play — in order?", audioUrl: undefined },
          { text: "Assemble like a legend.", audioUrl: undefined },
          { text: "Order matters — build it right.", audioUrl: undefined },
          { text: "Steps in sequence, Roadie.", audioUrl: undefined },
        ],
        garnishPrompts: [
          { text: "GARNISH", audioUrl: undefined },
          { text: "Finish strong — what's the garnish?", audioUrl: undefined },
          { text: "Top it off like a legend.", audioUrl: undefined },
          { text: "The final touch — garnish?", audioUrl: undefined },
          { text: "What makes it pop?", audioUrl: undefined },
          { text: "Dress it up — pick the garnish.", audioUrl: undefined },
          { text: "Last step — garnish it.", audioUrl: undefined },
          {
            text: "Make it picture-perfect — garnish?",
            audioUrl: undefined,
          },
        ],
      },
    },
  },
};

const allLegendaryActivities = [
  ...legendaryActivities,
  roadieQuiz,
  drinksBuilderActivity,
];

// --- Profile + assignments --------------------------------------------------
//
// Visual-QA scenario switch. The mock reads a `?qa=` query param at module
// load so a single dev server can render every approval-flow screen without
// a restart:
//   - qa=pending        acting user is a PENDING non-admin → AuthGate shows
//                       PendingApprovalScreen.
//   - qa=rejected       acting user is a REJECTED non-admin → AuthGate shows
//                       RejectedAccessScreen.
//   - qa=admin-pending  acting user is an APPROVED admin; getAllUsers returns
//                       a mix of approved + pending users so the admin Users
//                       page renders the "Awaiting approval" section with the
//                       pending-count badge and Approve/Reject buttons.
//   - (default)        acting user is an APPROVED admin with no pending users
//                     (the original mock behaviour).
//
// The scenario is read once at module load; changing it requires a navigation
// to a URL with the new `?qa=` value followed by a reload (the actor query is
// cached with staleTime=Infinity, so a fresh load is required to re-resolve
// the mock).

type QaScenario = "default" | "pending" | "rejected" | "admin-pending";

function readQaScenario(): QaScenario {
  if (typeof window === "undefined") return "default";
  const params = new URLSearchParams(window.location.search);
  const qa = params.get("qa");
  if (qa === "pending" || qa === "rejected" || qa === "admin-pending") {
    return qa;
  }
  return "default";
}

const QA_SCENARIO = readQaScenario();

// A second fake principal used for the "other users" in the admin-pending
// scenario so the pending table has multiple rows with distinct principals.
const FAKE_PRINCIPAL_2 = {
  toString: () => "2vxsx-faeaaa-aaaaq-aaaca-cab" as unknown as string,
  toText: () => "2vxsx-faeaaa-aaaaq-aaaca-cab",
} as never;

const FAKE_PRINCIPAL_3 = {
  toString: () => "2vxsx-faeaaa-aaaaq-aaaca-cac" as unknown as string,
  toText: () => "2vxsx-faeaaa-aaaaq-aaaca-cac",
} as never;

// The acting user's profile, shaped by the active QA scenario. The
// `approvalStatus` field is what AuthGate gates on; `role` controls whether
// the admin Users page is reachable.
function buildMyProfile() {
  const base = {
    id: FAKE_PRINCIPAL,
    name: "Alex Roadie",
    storeLocation: "Fort Worth, TX",
    email: "alex@bubbas33.example",
  };
  switch (QA_SCENARIO) {
    case "pending":
      return {
        ...base,
        role: "trainee" as const,
        approvalStatus: "pending" as const,
      };
    case "rejected":
      return {
        ...base,
        role: "trainee" as const,
        approvalStatus: "rejected" as const,
      };
    case "admin-pending":
    case "default":
    default:
      return {
        ...base,
        role: "admin" as const,
        approvalStatus: "approved" as const,
      };
  }
}

const myProfile = buildMyProfile();

// The full user list returned by getAllUsers. In the admin-pending scenario
// it includes pending users so the admin Users page renders the "Awaiting
// approval" section + pending-count badge. In the pending/rejected scenarios
// the acting user is the only user (the admin page isn't reachable anyway).
function buildAllUsers() {
  if (QA_SCENARIO === "admin-pending") {
    return [
      myProfile,
      {
        id: FAKE_PRINCIPAL_2,
        name: "Jordan Lee",
        storeLocation: "Dallas, TX",
        email: "jordan@bubbas33.example",
        role: "trainee" as const,
        approvalStatus: "pending" as const,
      },
      {
        id: FAKE_PRINCIPAL_3,
        name: "Sam Rivera",
        storeLocation: "Austin, TX",
        email: "sam@bubbas33.example",
        role: "trainee" as const,
        approvalStatus: "pending" as const,
      },
    ];
  }
  return [myProfile];
}

const allUsers = buildAllUsers();

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
  __profiles: async () => allUsers.map((u) => [u.id, u]),
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
  createPosition: async (name, description, coverPhoto, layoutStyle) => ({
    id: 10n,
    sortOrder: 10n,
    name,
    description: description ?? undefined,
    coverPhoto: coverPhoto ?? undefined,
    layoutStyle: layoutStyle ?? LayoutStyle.library,
  }),
  updatePosition: async (id, name, description, coverPhoto, layoutStyle) => ({
    id,
    sortOrder: 0n,
    name,
    description: description ?? undefined,
    coverPhoto: coverPhoto ?? undefined,
    layoutStyle: layoutStyle ?? LayoutStyle.library,
  }),
  deletePosition: async () => undefined,
  reorderPositions: async () => positions,
  getAllUsers: async () => allUsers,
  getCallerUserRole: async () => myProfile.role as never,
  getUserRole: async (userId) =>
    (allUsers.find((u) => u.id === userId)?.role ?? null) as never,
  setUserRole: async (userId, role) => {
    const u = allUsers.find((x) => x.id === userId) ?? myProfile;
    return { ...u, role } as never;
  },
  approveUser: async (userId) => {
    const u = allUsers.find((x) => x.id === userId) ?? myProfile;
    return { ...u, approvalStatus: "approved" as const } as never;
  },
  rejectUser: async (userId) => {
    const u = allUsers.find((x) => x.id === userId) ?? myProfile;
    return { ...u, approvalStatus: "rejected" as const } as never;
  },
  // Admin per-user email/photo edit (UserEditSheet) + Resend email action.
  setUserEmail: async (userId, email) => {
    const u = allUsers.find((x) => x.id === userId) ?? myProfile;
    return { ...u, email } as never;
  },
  setUserPhoto: async (userId, photo) => {
    const u = allUsers.find((x) => x.id === userId) ?? myProfile;
    return { ...u, photo: photo ?? undefined } as never;
  },
  resendApprovalEmail: async () => undefined,
  // Profile page photo + email-change flows.
  setMyPhoto: async (photo) => ({
    ...myProfile,
    photo: photo ?? undefined,
  }),
  setEmailForUser: async (newEmail) => ({
    ...myProfile,
    email: newEmail,
  }),
  updateMyProfileWithPhoto: async (name, storeLocation, photo) => ({
    ...myProfile,
    name,
    storeLocation,
    photo: photo ?? undefined,
  }),
  initiateEmailVerification: async () => ({ __kind__: "ok" as const, ok: null }),
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
  createCategory: async (positionId, name, coverPhoto, accentColor) => ({
    id: 100n,
    sortOrder: 100n,
    name,
    positionId,
    coverPhoto: coverPhoto ?? undefined,
    accentColor: accentColor ?? undefined,
  }),
  updateCategory: async (id, name, coverPhoto, accentColor) => {
    const c = categories.find((x) => x.id === id);
    return {
      ...c,
      name,
      coverPhoto: coverPhoto ?? undefined,
      accentColor: accentColor ?? undefined,
    } as never;
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
  // Drinks Builder pool methods. The hook translates the returned backend
  // LibraryItems (bigint ids) to the frontend shape. The playable pool
  // returns in-scope recipe items from the activity's source categories;
  // the decoy pool returns other in-scope recipe items across all
  // categories (the hook builds the global decoy pool from the union).
  // In-scope = has a recipe with non-empty glassware + specs + assembly
  // and is not a bulk-mix (no yield, no equipment) — mirroring the hook's
  // isInScope() filter so the mock exercises the same code paths.
  getDrinksBuilderPlayablePool: async (activityId) => {
    const activity = allLegendaryActivities.find(
      (a) => a.id === activityId,
    );
    if (!activity) return [];
    const sourceIds = new Set(activity.sourceCategoryIds);
    return items.filter(
      (i) =>
        sourceIds.has(i.categoryId) &&
        i.recipe &&
        i.recipe.glassware.trim().length > 0 &&
        i.recipe.specs.length > 0 &&
        i.recipe.assembly.length > 0 &&
        !(i.recipe.yield && i.recipe.yield.length > 0) &&
        !(i.recipe.equipment && i.recipe.equipment.length > 0),
    );
  },
  getDrinksBuilderDecoyPool: async (activityId) => {
    const activity = allLegendaryActivities.find(
      (a) => a.id === activityId,
    );
    const sourceIds = new Set(activity?.sourceCategoryIds ?? []);
    return items.filter(
      (i) =>
        !sourceIds.has(i.categoryId) &&
        i.recipe &&
        i.recipe.glassware.trim().length > 0 &&
        i.recipe.specs.length > 0 &&
        i.recipe.assembly.length > 0 &&
        !(i.recipe.yield && i.recipe.yield.length > 0) &&
        !(i.recipe.equipment && i.recipe.equipment.length > 0),
    );
  },
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
