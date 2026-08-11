module {
  // An admin-defined label + value pair on a Library item. The admin controls
  // both the label (e.g. "Rocks Ingredients", "Glassware", "Garnish",
  // "Instructions") and the value. The number of detail fields varies per item
  // — admins can add and remove fields freely.
  public type DetailField = {
    fieldLabel : Text;
    value : Text;
  };

  // A Library category. Belongs to a position. sortOrder is PER POSITION
  // (1-based, renumbered on delete/reorder) — NOT a global running count.
  // coverPhoto is optional — never required to save a category. accentColor is
  // an optional hex string (e.g. "#8C5421") used to theme the category's Food
  // Recipe cards; null means the neutral brand default.
  public type Category = {
    id : Nat;
    positionId : Nat;
    name : Text;
    coverPhoto : ?Text;
    sortOrder : Nat;
    accentColor : ?Text;
  };

  // A single measured ingredient line in a recipe spec list. `amount` carries
  // the full measure (e.g. "2 oz", "3 dashes", "0.5 tsp") as free text so the
  // admin controls the format; `ingredient` is the ingredient name. `upsell`
  // marks this ingredient as a premium upsell option (e.g. a top-shelf spirit
  // the bartender can offer in place of the well pour). Defaults to false —
  // most ingredients are not upsells. The flag is informational today; quiz
  // generation may use it later to surface upsell questions only for
  // ingredients tagged upsell=true (graceful degradation: untagged
  // ingredients simply produce no upsell questions).
  public type RecipeSpec = {
    amount : Text;
    ingredient : Text;
    upsell : Bool;
  };

  // A named variant of a recipe (e.g. "Smoked", "Spicy", "On the Rocks"). A
  // variant carries its own specs and assembly steps but reuses the parent
  // recipe's glassware/garnish. `variantLabel` is the variant display name.
  // (variantLabel, not label, because `label` is a reserved Motoko keyword —
  // mirrors the fieldLabel convention on DetailField.)
  public type RecipeVariant = {
    variantLabel : Text;
    specs : [RecipeSpec];
    assembly : [Text];
  };

  // A structured recipe payload. When present on a LibraryItem, the item is a
  // recipe; when absent, the item keeps the existing generic detail shape with
  // no regression. All sub-fields are ordered arrays so the admin controls
  // display order. `glassware` is free text (e.g. "Rocks glass", "Coupe").
  // `specs` is the ordered ingredient list. `assembly` is the ordered
  // step-by-step instructions. `garnish` is the ordered garnish list (a drink
  // may have more than one). `variants` is the ordered list of named variants.
  //
  // Bulk-mix fields (optional, additive): a recipe is treated as a bulk mix
  // when `yield` is non-null or `equipment` is non-empty. Bulk mixes have no
  // glassware/garnish/photo/variants — those fields may be empty/absent and
  // must not render for a bulk mix. `equipment` is the ordered list of tools
  // needed (Cambro, measures, whisk, etc.). `yield` is the batch yield string
  // shown under "Bulk Mix" (e.g. "2 Gallons + 1 Quart + 1½ cups (300 oz)").
  // `shelfLife` is the storage shelf life (e.g. "5 Days"). `qualityIdentifier`
  // is the ordered list of optional quality checks. `equipment` and
  // `qualityIdentifier` default to empty arrays (like garnish and assembly);
  // `yield` and `shelfLife` default to null (genuinely optional for bulk mixes).
  //
  // `recapAudio` is the optional durable object-storage URL of the drink's
  // recap voice clip — a full spoken walk-through played at the end of a
  // Drinks Builder round after a Roadie builds this drink. Playback-only —
  // NO pool, decoy, scoring, or round-flow logic reads it; it rides along on
  // the LibraryItem returned by getDrinksBuilderPlayablePool unchanged.
  // Defaults to null — drinks without a clip just show the visual recap.
  //
  // `buildAudio` is the optional durable object-storage URL of the drink's
  // build voice clip — a spoken walk-through played while a Roadie builds
  // this drink (parallel to recapAudio, which plays after the round). Like
  // recapAudio it is playback-only — NO pool, decoy, scoring, or round-flow
  // logic reads it; it rides along on the LibraryItem returned by
  // getDrinksBuilderPlayablePool unchanged. Defaults to null — drinks
  // without a clip just show the visual build.
  public type Recipe = {
    glassware : Text;
    specs : [RecipeSpec];
    assembly : [Text];
    garnish : [Text];
    variants : [RecipeVariant];
    equipment : [Text];
    yield : ?Text;
    shelfLife : ?Text;
    qualityIdentifier : [Text];
    recapAudio : ?Text;
    buildAudio : ?Text;
  };

  // A food recipe kind. #menuBuild is a plated dish built to order (with
  // serviceware, components, build steps, and EXPO finishing steps); #prep is
  // a batch/prep recipe (with a yield, shelf life, and step-grouped
  // ingredient tables). Mirrors the beverage `recipe` field's additive
  // pattern: presence of `foodRecipe` on a LibraryItem marks the item as a
  // food recipe; absence keeps the existing generic / beverage-recipe shape.
  public type FoodRecipeKind = {
    #menuBuild;
    #prep;
  };

  // A per-size amount entry on a food recipe component. `size` is the size
  // label shared across a recipe's components (e.g. "12\"", "16\""); `value`
  // is the free-text measure for that size (e.g. "16 each", "32 each"). A
  // component carries an `amounts` array of these entries when the recipe
  // is multi-size (pizzas: 12"/16"); single-size recipes (burgers, Kids 10")
  // leave `amounts` empty and fall back to the scalar `amount` field.
  public type FoodComponentSize = {
    size : Text;
    value : Text;
  };

  // A single component line in a food recipe's component list. `item` is the
  // component name (e.g. "Cheddar Cheese", "Burger Patty"). `amount` is the
  // free-text measure (e.g. "2 oz", "1 each") — kept as the scalar fallback
  // for single-size recipes (burgers) and components without per-size
  // amounts. `group` is the optional grouping label — for prep recipes it
  // names the ingredient table ("Step 1", "Step 2", …); for menuBuild
  // recipes it is typically null (components render as a flat table). `note`
  // is an optional per-component note (e.g. "to taste", "heated"). Both
  // `group` and `note` default to null — most components carry neither.
  //
  // `anchorY` is the optional vertical position (0.0–1.0) of this ingredient
  // on the build photo (0 = top of the image, 1 = bottom). Used by the Build
  // Card layout to place each label beside its layer. Defaults to null —
  // components without it render exactly as they do today.
  //
  // `amounts` is the optional per-size amount list. When non-empty, the
  // Build Card renders a size selector and each STEP label shows the
  // selected size's amount as a chip; when empty, the Build Card falls back
  // to the scalar `amount` and renders exactly as today (burgers and other
  // single-amount recipes are unchanged). Defaults to an empty list —
  // existing components migrate to `amounts = []` and behave exactly as
  // today.
  public type FoodComponent = {
    item : Text;
    amount : Text;
    group : ?Text;
    note : ?Text;
    anchorY : ?Float;
    amounts : [FoodComponentSize];
  };

  // A plating vessel / serviceware line for a menuBuild food recipe (e.g.
  // the plate, bowl, or board the dish is plated on). `item` is the
  // serviceware name (e.g. "Cast Iron Skillet", "10" Bowl"). `amount` is the
  // free-text quantity (e.g. "1 each"). Serviceware renders first, in a
  // subtle "Plating" group, ahead of the components table. Only meaningful
  // for #menuBuild recipes; #prep recipes carry an empty serviceware list.
  public type FoodServiceware = {
    item : Text;
    amount : Text;
  };

  // A structured food recipe payload, parallel to the beverage `Recipe`.
  // When present on a LibraryItem (as `foodRecipe`), the item is a food
  // recipe and the Food Recipe card renders from this payload; when null,
  // the item keeps the existing generic / beverage-recipe shape with no
  // regression.
  //
  // `station` is the kitchen station the recipe belongs to ("Expo", "Grill",
  // "Fry", "Pizza", "Sauté", "Hot Prep", "Cold Prep", …) — drives the
  // station-filter chips in the kitchen browser. `kind` selects the layout:
  // #menuBuild renders the plated-dish card (serviceware + components +
  // build steps + EXPO callout); #prep renders the batch/prep card
  // (yield/shelf-life meta + step-grouped ingredients + procedure +
  // quality-ID checklist).
  //
  // `menuSection` is the menu section the dish belongs to ("Appetizers",
  // "Burgers", …) — only meaningful for #menuBuild; null for #prep.
  // `buildHeader` is the optional small kicker line above the title on the
  // Build Card layout (e.g. "Build Your Burger"). Defaults to null — recipes
  // without it render exactly as they do today (no kicker).
  // `serviceware` is the ordered plating-vessel list (#menuBuild only;
  // empty for #prep). `components` is the ordered component/ingredient
  // list — for #prep it is grouped by `group` ("Step 1", "Step 2", …).
  // `steps` is the ordered build/procedure steps. `expoSteps` is the
  // highlighted EXPO finishing steps (#menuBuild only; empty for #prep).
  // `allergenNote` is the optional allergen callout text.
  //
  // Prep-only meta (all optional, additive): `yieldText` is the batch yield
  // string ("4 ¾ gallons"); `shelfLife` is the storage shelf life;
  // `holdTemp` is the hold temperature; `storeTemp` is the storage
  // temperature; `lineUtensil` is the line utensil; `equipment` is the
  // equipment needed. `qualityIdentifiers` is the ordered quality-check
  // checklist (✓ bullets) — defaults to an empty array (like components).
  public type FoodRecipe = {
    station : Text;
    kind : FoodRecipeKind;
    menuSection : ?Text;
    buildHeader : ?Text;
    serviceware : [FoodServiceware];
    components : [FoodComponent];
    steps : [Text];
    expoSteps : [Text];
    allergenNote : ?Text;
    yieldText : ?Text;
    shelfLife : ?Text;
    holdTemp : ?Text;
    storeTemp : ?Text;
    lineUtensil : ?Text;
    equipment : ?Text;
    qualityIdentifiers : [Text];
  };

  // A Library item (a recipe / reference entry). Belongs to a category.
  // sortOrder is PER CATEGORY (1-based, renumbered on delete/reorder) — NOT a
  // global running count. photo is optional — never required to save an item.
  // details is a variable-length array the admin can add/remove freely.
  // subtitle is optional — renders underneath the title, a little smaller.
  // recipe is optional — when present, the item is a beverage recipe and the
  // recipe card renders from this structured payload; when null, the item
  // keeps the existing generic detail shape. foodRecipe is optional — when
  // present, the item is a food recipe and the Food Recipe card renders from
  // this structured payload (parallel to the beverage `recipe` field); when
  // null, the item is not a food recipe. An item is treated as an LTO when
  // `seasonal` is true and/or it carries an "LTO" tag.
  public type LibraryItem = {
    id : Nat;
    categoryId : Nat;
    title : Text;
    subtitle : ?Text;
    photo : ?Text;
    details : [DetailField];
    notes : ?Text;
    tags : [Text];
    seasonal : Bool;
    sortOrder : Nat;
    recipe : ?Recipe;
    foodRecipe : ?FoodRecipe;
  };
};
