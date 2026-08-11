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
 * Approval status for a user's access request.
 *
 * New sign-ups start as `pending` and are fully blocked behind the
 * pending-approval screen until an admin approves them. The first user
 * (auto-admin) and pre-existing users retain full access (the backend
 * defaults them to `approved`). Admins can move a pending user to
 * `approved` (grants access) or `rejected` (denies access).
 *
 * Mirrors the backend Candid `ApprovalStatus` variant surfaced in
 * backend.d.ts. The hook layer translates the enum to this plain string
 * union and back to the enum on the way in, so components stay in
 * string-land.
 */
export type ApprovalStatus = "pending" | "approved" | "rejected";

/**
 * A user's profile. Created on first sign-in. The very first user to sign
 * up becomes Admin (handled backend-side); the rest default to trainee.
 *
 * `principal` is the stringified Principal (`user.id.toString()`) — set by
 * the hook layer when translating the Candid UserProfile (which has
 * `id: Principal`).
 *
 * `approvalStatus` controls whether the user can enter the app. Pending
 * users see a pending-approval screen; rejected users see an access-denied
 * screen; approved users proceed through AuthGate as before. The hook
 * layer translates the backend `ApprovalStatus` enum to the plain string
 * union here.
 *
 * `email` is the optional contact address the user provided during
 * sign-up. The backend stores it as `?Text`; the hook layer surfaces it as
 * `string | undefined`.
 *
 * `photo` is the optional profile-photo URL (object-storage gateway URL
 * uploaded via the Profile page). The backend stores it as `?Text`; the
 * hook layer surfaces it as `string | undefined`. When absent, the UI
 * falls back to the initials avatar.
 */
export interface UserProfile {
  principal: string;
  name: string;
  storeLocation: string;
  role: Role;
  approvalStatus: ApprovalStatus;
  email?: string;
  photo?: string;
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
export type LayoutStyle = "library" | "orientation" | "kitchen";

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
 * Mirrors the backend Candid RecipeSpec exactly (amount, ingredient, upsell).
 * `upsell` flags ingredients the quiz generator can ask upsell questions
 * about; it defaults to false on the import path and is not surfaced in the
 * admin editor (the editor strips it on persist and the backend defaults
 * absent specs to upsell=false). No ids on recipe sub-records — they are
 * value records, so React keys are derived positionally by the editor.
 */
export interface RecipeSpec {
  amount: string;
  ingredient: string;
  upsell: boolean;
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
 * - `recapAudio`: optional audio-recap clip URL (durable object-storage
 *   URL, same shape as profile photos). Mirrors backend `recapAudio : ?Text`.
 *   Null when the backend omits the optional ?Text field.
 * - `buildAudio`: optional audio-build clip URL (durable object-storage
 *   URL, same shape as profile photos). Mirrors backend `buildAudio : ?Text`.
 *   Null when the backend omits the optional ?Text field.
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
  recapAudio: string | null;
  buildAudio: string | null;
}

/**
 * The kind of a food recipe. Mirrors the backend Candid `FoodRecipeKind`
 * variant surfaced in backend.d.ts (`{ #prep; #menuBuild }`). The hook layer
 * translates the enum to this plain string union and back to the enum on the
 * way in, so components stay in string-land.
 *
 * - `'prep'` — a prep recipe: a make-ahead component produced in bulk
 *   (e.g. pizza sauce, marinated chicken). Renders as a prep tile in the
 *   Kitchen browser and as a prep card on the item detail page.
 * - `'menuBuild'` — a menu build recipe: an assembled-to-order menu item
 *   built from prep components (e.g. a pizza, a sandwich). Renders as a
 *   menu-build card with EXPO finishing steps on the item detail page.
 */
export type FoodRecipeKind = "prep" | "menuBuild";

/**
 * A per-size amount entry on a food component (e.g. { size: "16\"", value:
 * "5 oz" }). Mirrors the backend Candid FoodComponentSize shape exactly
 * (size, value). Used by pizza-style components that vary their amount by
 * menu size — a component without per-size amounts carries an empty array
 * (the back-compat sentinel) and falls back to the scalar `amount`.
 */
export interface FoodComponentSize {
  size: string;
  value: string;
}

/**
 * A single measured component in a food recipe (e.g. "2 cups" / "Pizza
 * Sauce"). Mirrors the backend Candid FoodComponent shape exactly (item,
 * amount, group, note, anchorY, amounts). `group` and `note` are null when
 * the backend omits the optional ?Text fields. `anchorY` is null when the
 * backend omits the optional ?Float field.
 *
 * `amounts` is the per-size amount array (e.g. pizza toppings that vary by
 * menu size). It is a non-optional array on the backend; the hook layer
 * defaults it to [] when absent so the frontend treats components without
 * per-size amounts uniformly (empty array = use the scalar `amount`
 * fallback). No ids on food sub-records — they are value records, so React
 * keys are derived positionally by the editor.
 */
export interface FoodComponent {
  item: string;
  amount: string;
  group: string | null;
  note: string | null;
  anchorY: number | null;
  amounts: FoodComponentSize[];
}

/**
 * A single piece of serviceware for a food recipe (e.g. "1" / "9" Pizza
 * Box"). Mirrors the backend Candid FoodServiceware shape exactly (item,
 * amount). Serviceware is the plating/packaging layer of a menu-build
 * recipe — what the finished item is served in or on.
 */
export interface FoodServiceware {
  item: string;
  amount: string;
}

/**
 * A food recipe attached to a Library item. Mirrors the backend Candid
 * FoodRecipe shape: station, kind (prep/menuBuild), menu section,
 * serviceware, components, steps, EXPO steps, allergen note, yield, shelf
 * life, hold/store temps, line utensil, equipment, and quality identifiers.
 *
 * All fields are plain strings / arrays — no bigint ids to translate. The
 * hook layer maps this 1:1 via toFoodRecipe/fromFoodRecipe, normalizing
 * optional ?Text fields to null on the way in and to undefined on the way
 * out (the Candid ?Text boundary expects undefined for absent optionals).
 *
 * - `station` — the kitchen station this recipe belongs to (e.g. "Grill",
 *   "Pizza", "EXPO"). Drives the station chip color on the kitchen browser
 *   and the food recipe card.
 * - `kind` — `'prep'` or `'menuBuild'` (see FoodRecipeKind).
 * - `menuSection` — the menu section the menu-build item is filed under
 *   (e.g. "Specialty Pizzas"), null for prep recipes.
 * - `serviceware` — plating/packaging for a menu-build recipe (empty array
 *   for prep recipes).
 * - `components` — the measured components that make up the recipe (prep
 *   components for a menu-build, ingredients for a prep).
 * - `steps` — the build/prep steps.
 * - `expoSteps` — the EXPO finishing steps for a menu-build recipe
 *   (empty array for prep recipes). Rendered in a purple-red callout.
 * - `allergenNote` — optional allergen callout, null when absent.
 * - `yieldText` — batch yield description for a prep recipe (e.g. "2 qt"),
 *   null when absent.
 * - `shelfLife` — shelf-life label for a prep recipe (e.g. "5 Days"),
 *   null when absent.
 * - `holdTemp` — hold-temperature label, null when absent.
 * - `storeTemp` — storage-temperature label, null when absent.
 * - `lineUtensil` — the line utensil used to portion/serve (e.g. "8 oz
 *   ladle"), null when absent.
 * - `equipment` — the equipment needed (e.g. "Flat-top grill"), null when
 *   absent. NOTE: this is a single optional string (not an array) — distinct
 *   from the beverage Recipe.equipment array.
 * - `qualityIdentifiers` — quality checks to perform (required array,
 *   defaults to []).
 */
export interface FoodRecipe {
  station: string;
  kind: FoodRecipeKind;
  menuSection: string | null;
  buildHeader: string | null;
  serviceware: FoodServiceware[];
  components: FoodComponent[];
  steps: string[];
  expoSteps: string[];
  allergenNote: string | null;
  yieldText: string | null;
  shelfLife: string | null;
  holdTemp: string | null;
  storeTemp: string | null;
  lineUtensil: string | null;
  equipment: string | null;
  qualityIdentifiers: string[];
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
 *
 * `accentColor` is the optional per-category brand accent (a hex string like
 * "#8C5421") used to color the food recipe card title/column bands and the
 * EXPO callout. Null means "use the default navy brand band" — the frontend
 * falls back to the `--category-accent` CSS default (navy) when no inline
 * override is set on the card root.
 */
export interface Category {
  id: string;
  positionId: string;
  name: string;
  coverPhoto: string | null;
  accentColor: string | null;
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
 *
 * `foodRecipe` is null when the backend omits the optional ?FoodRecipe field
 * (i.e. the item is a beverage/plain card, not a food recipe). When present,
 * the hook layer maps the backend FoodRecipe 1:1 via toFoodRecipe. A food
 * recipe is the sibling of a beverage recipe: station, kind (prep/menuBuild),
 * serviceware, components, steps, expo steps, allergen note, yield, shelf
 * life, hold/store temps, line utensil, equipment, and quality identifiers.
 * The RecipeCardPage dispatches on `foodRecipe` to render a FoodRecipeCard
 * instead of the beverage/generic card.
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
  foodRecipe: FoodRecipe | null;
}
