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
  // coverPhoto is optional — never required to save a category.
  public type Category = {
    id : Nat;
    positionId : Nat;
    name : Text;
    coverPhoto : ?Text;
    sortOrder : Nat;
  };

  // A single measured ingredient line in a recipe spec list. `amount` carries
  // the full measure (e.g. "2 oz", "3 dashes", "0.5 tsp") as free text so the
  // admin controls the format; `ingredient` is the ingredient name.
  public type RecipeSpec = {
    amount : Text;
    ingredient : Text;
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
  };

  // A Library item (a recipe / reference entry). Belongs to a category.
  // sortOrder is PER CATEGORY (1-based, renumbered on delete/reorder) — NOT a
  // global running count. photo is optional — never required to save an item.
  // details is a variable-length array the admin can add/remove freely.
  // subtitle is optional — renders underneath the title, a little smaller.
  // recipe is optional — when present, the item is a recipe and the recipe
  // card renders from this structured payload; when null, the item keeps the
  // existing generic detail shape. An item is treated as an LTO when
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
  };
};
