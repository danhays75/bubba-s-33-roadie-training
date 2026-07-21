// Foundation types mirroring the backend Candid bindings in backend.d.ts.
//
// The backend returns Principal and bigint; the frontend keeps ergonomic
// string versions (principal text, stringified bigint ids) for routing,
// display, and React keys. The hooks in src/hooks/* translate at the
// boundary: string -> Principal (Principal.fromText) and string -> bigint
// (BigInt(...)) on the way in, and the reverse on the way out.

export type Role = "trainee" | "trainer" | "manager" | "admin";

export type AssignmentStatus = "inTraining" | "certified";

/**
 * A user's profile. Created on first sign-in. The very first user to sign
 * up becomes Admin (handled backend-side); the rest default to trainee.
 *
 * `principal` is the stringified Principal (`user.id.toString()`) — set by
 * the hook layer when translating the Candid UserProfile (which has
 * `id: Principal`).
 */
export interface UserProfile {
  principal: string;
  name: string;
  storeLocation: string;
  role: Role;
}

/**
 * A training position (e.g. "Line Cook", "Server", "Bartender").
 * Positions are ordered per-parent (the position list) using sortOrder.
 *
 * `id` is the stringified bigint (`position.id.toString()`) — set by the
 * hook layer when translating the Candid Position (which has `id: bigint`).
 * `sortOrder` is the number form of the bigint sortOrder.
 *
 * `layoutStyle` controls how the position's detail page renders its
 * Library. The backend Candid variant is `{ #library; #orientation }`,
 * surfaced as the `LayoutStyle` enum in backend.d.ts. The hook layer
 * translates the enum to the plain string union here and back to the enum
 * on the way in, so components stay in string-land. `'library'` is the
 * default (search box + category tile grid); `'orientation'` renders the
 * patriotic Orientation layout.
 */
export type LayoutStyle = "library" | "orientation";

export interface Position {
  id: string;
  name: string;
  description: string;
  coverPhoto: string | undefined;
  sortOrder: number;
  layoutStyle: LayoutStyle;
}

/**
 * A user's assignment to a position, with a training status. Keyed by
 * (userId, positionId) — there is NO assignment id. Both keys are
 * stringified (Principal text and bigint-as-string) by the hook layer.
 */
export interface PositionAssignment {
  positionId: string;
  userPrincipal: string;
  status: AssignmentStatus;
}

/** Convenience: status badge label + tone for a position tile. */
export type StatusTone = "inTraining" | "certified" | "notStarted";

/**
 * A labeled detail field on a Library item (e.g. SPIRIT: Bourbon).
 *
 * NOTE: the backend Candid field is `fieldLabel` (not `label`) because
 * `label` is a reserved Motoko keyword. The hook layer passes this through
 * unchanged.
 *
 * `id` is a FRONTEND-ONLY field — it is NOT part of the backend DetailField
 * record. It exists solely to give React a stable key for each row in the
 * DetailFieldEditor so inputs do not remount (and lose focus) on every
 * keystroke. The hook layer generates the id when reading from the backend
 * and strips it before persisting (createItem/updateItem map only
 * {fieldLabel, value}).
 */
export interface DetailField {
  id: string;
  fieldLabel: string;
  value: string;
}

/**
 * A single measured ingredient in a recipe spec (e.g. "2 oz" / "Bourbon").
 *
 * Mirrors the backend Candid RecipeSpec exactly (amount, ingredient). No ids
 * on recipe sub-records — they are value records, so React keys are derived
 * positionally by the editor.
 */
export interface RecipeSpec {
  amount: string;
  ingredient: string;
}

/**
 * A named variant of a recipe (e.g. "Rye Manhattan", "Split-Base Manhattan").
 *
 * NOTE: the backend Candid field is `variantLabel` (not `label`) because
 * `label` is a reserved Motoko keyword. The hook layer passes this through
 * unchanged. A variant carries its own specs and assembly steps, overriding
 * the base recipe's specs/assembly when present.
 */
export interface RecipeVariant {
  variantLabel: string;
  specs: RecipeSpec[];
  assembly: string[];
}

/**
 * A recipe attached to a Library item (cocktail spec). Mirrors the backend
 * Candid Recipe shape: glassware, base specs, assembly steps, garnish list,
 * named variants, and bulk-mix metadata (equipment, yield, shelfLife,
 * qualityIdentifier). All fields are plain strings / arrays — no bigint ids
 * to translate. The hook layer maps this 1:1 (variantLabel, not label).
 *
 * Bulk-mix fields:
 * - `equipment`: tools needed for the batch (required array, defaults to []).
 * - `yield`: batch yield description (e.g. "750 ml"), nullable — null when
 *   the backend omits the optional ?Text field.
 * - `shelfLife`: shelf-life label (e.g. "5 Days"), nullable — null when the
 *   backend omits the optional ?Text field.
 * - `qualityIdentifier`: quality checks to perform on the batch (required
 *   array, defaults to []).
 */
export interface Recipe {
  glassware: string;
  specs: RecipeSpec[];
  assembly: string[];
  garnish: string[];
  variants: RecipeVariant[];
  equipment: string[];
  yield: string | null;
  shelfLife: string | null;
  qualityIdentifier: string[];
}

/**
 * A Library category scoped to a single position (e.g. "Cocktails" under
 * Bartender). Categories are ordered per-parent (within their position) using
 * sortOrder.
 *
 * `id` and `positionId` are stringified bigints — set by the hook layer when
 * translating the Candid Category (which has `id: bigint`, `positionId: bigint`).
 * `sortOrder` is the number form of the bigint sortOrder.
 * `coverPhoto` is null when the backend omits the optional ?Text.
 */
export interface Category {
  id: string;
  positionId: string;
  name: string;
  coverPhoto: string | null;
  sortOrder: number;
}

/**
 * A Library item (recipe / training card) scoped to a single category.
 *
 * `id` and `categoryId` are stringified bigints — set by the hook layer when
 * translating the Candid LibraryItem (which has `id: bigint`,
 * `categoryId: bigint`). `sortOrder` is the number form of the bigint
 * sortOrder. `subtitle`, `photo`, and `notes` are null when the backend omits
 * the optional ?Text fields. `seasonal` is a plain boolean. `details` is an
 * array of DetailField (fieldLabel + value). `tags` is an array of strings.
 *
 * `recipe` is null when the backend omits the optional ?Recipe field (i.e.
 * the item is a plain Library card, not a cocktail spec). When present, the
 * hook layer maps the backend Recipe 1:1 (variantLabel, not label). Recipes
 * are an intentional LIGHT island in the UI — see AGENTS.md.
 */
export interface LibraryItem {
  id: string;
  categoryId: string;
  title: string;
  subtitle: string | null;
  photo: string | null;
  details: DetailField[];
  notes: string | null;
  tags: string[];
  seasonal: boolean;
  sortOrder: number;
  recipe: Recipe | null;
}
