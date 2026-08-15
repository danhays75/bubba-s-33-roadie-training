import Array "mo:core/Array";
import List "mo:core/List";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Types "../types/library";

// Library domain logic. Pure helpers operating on List state passed in by
// reference — no caller awareness, no actor state.
//
// Ordering is PER PARENT: each category's sortOrder is within its position;
// each item's sortOrder is within its category. Never a single global running
// count. The pattern mirrors lib/foundation.mo exactly: filter, clear, renumber
// 1-based contiguous, re-add.
module {
  public type Category = Types.Category;
  public type LibraryItem = Types.LibraryItem;
  public type DetailField = Types.DetailField;
  public type Recipe = Types.Recipe;
  public type RecipeSpec = Types.RecipeSpec;
  public type RecipeVariant = Types.RecipeVariant;
  public type FoodRecipe = Types.FoodRecipe;
  public type FoodRecipeKind = Types.FoodRecipeKind;
  public type FoodComponent = Types.FoodComponent;
  public type FoodComponentSize = Types.FoodComponentSize;
  public type FoodSizeAmount = Types.FoodSizeAmount;
  public type FoodServiceware = Types.FoodServiceware;

  // Auto-tag upsell ingredients in the recipe import path. The admin supplies
  // the Recipe with `upsell` already on each RecipeSpec, so the field is
  // always accepted and persisted. This helper upgrades `upsell=false` to
  // `upsell=true` when the ingredient name signals a premium liquor upgrade
  // (keywords like "top shelf", "premium", "reserve", "single barrel",
  // "anejo", "añejo", "vsop", "x.o", "luxury"). It NEVER downgrades an
  // explicit `upsell=true` — the admin's explicit tag always wins. Applied
  // in both createItem and updateItem so the import path tags upsells
  // consistently. Degrades gracefully: ingredients without a premium signal
  // keep the admin-supplied upsell value (typically false).
  //
  // Case-insensitive substring match against the lowercased ingredient name.
  func isUpsellSignal(ingredient : Text) : Bool {
    let name = ingredient.toLower();
    let signals = ["top shelf", "top-shelf", "premium", "reserve", "single barrel", "anejo", "añejo", "vsop", "x.o", "x.o.", "luxury"];
    signals.vals().find(func(s) { name.contains(#text s) }) != null;
  };

  func tagSpecs(specs : [RecipeSpec]) : [RecipeSpec] {
    specs.map(func(s) : RecipeSpec {
      if (s.upsell) {
        // Admin's explicit upsell=true always wins.
        s;
      } else if (isUpsellSignal(s.ingredient)) {
        { s with upsell = true };
      } else {
        s;
      };
    });
  };

  // Apply auto-tagging to a recipe's specs and each variant's specs. Returns
  // the recipe with upsell flags set on premium-liquor ingredients. Glassware,
  // assembly, garnish, equipment, yield, shelfLife, and qualityIdentifier are
  // unchanged.
  func tagRecipeUpsells(recipe : ?Recipe) : ?Recipe {
    switch (recipe) {
      case (?r) {
        ?{
          r with
          specs = tagSpecs(r.specs);
          variants = r.variants.map(func(v) : RecipeVariant {
            { v with specs = tagSpecs(v.specs) };
          });
        };
      };
      case null null;
    };
  };

  // --- Category helpers ---

  public func getCategory(categories : List.List<Category>, id : Nat) : ?Category {
    categories.find(func(c) { c.id == id });
  };

  public func listCategoriesByPosition(categories : List.List<Category>, positionId : Nat) : [Category] {
    categories.filter(func(c) { c.positionId == positionId }).toArray();
  };

  public func createCategory(
    categories : List.List<Category>,
    nextId : { var value : Nat },
    positionId : Nat,
    name : Text,
    coverPhoto : ?Text,
    accentColor : ?Text,
  ) : Category {
    let id = nextId.value;
    nextId.value := nextId.value + 1;
    // sortOrder is PER POSITION: the new category appends to the end of its
    // position's sequence starting at 1. Count the existing categories in the
    // same position and add 1 — mirrors the createItem pattern below and the
    // createPosition pattern in foundation.mo.
    let samePositionCount = categories.filter(func(c) { c.positionId == positionId }).size();
    let sortOrder = samePositionCount + 1;
    let category : Category = {
      id;
      positionId;
      name;
      coverPhoto;
      sortOrder;
      accentColor;
    };
    categories.add(category);
    category;
  };

  public func updateCategory(
    categories : List.List<Category>,
    id : Nat,
    name : Text,
    coverPhoto : ?Text,
    accentColor : ?Text,
  ) : ?Category {
    let found = categories.find(func(c) { c.id == id });
    switch (found) {
      case (?existing) {
        // Spread the existing record and override the editable fields. The
        // id / positionId / sortOrder are preserved (not part of the update
        // payload); accentColor is carried through so the admin can set, change,
        // or clear (null) the category's accent color. Mirrors updateItem below
        // and updatePosition in foundation.mo.
        let updated : Category = {
          existing with
          name;
          coverPhoto;
          accentColor;
        };
        categories.mapInPlace(
          func(c) {
            if (c.id == id) { updated } else { c };
          }
        );
        ?updated;
      };
      case null null;
    };
  };

  public func deleteCategory(categories : List.List<Category>, items : List.List<LibraryItem>, id : Nat) : ?Category {
    let found = categories.find(func(c) { c.id == id });
    switch (found) {
      case (?existing) {
        // Cascade delete: remove the category's items first.
        let keptItems = items.filter(func(i) { i.categoryId != id });
        items.clear();
        keptItems.forEach(func(i) { items.add(i) });
        // Now remove the category and renumber the remaining categories
        // per-position starting at 1. Mirrors deletePosition in foundation.mo,
        // but scoped per position.
        let keptCategories = categories.filter(func(c) { c.id != id });
        categories.clear();
        // Group kept categories by position so each position's sequence is
        // renumbered independently starting at 1.
        let positionIds = keptCategories.map<Category, Nat>(func(c) { c.positionId }).toArray();
        // For each distinct position (in first-seen order), renumber its
        // categories in their existing order.
        let seen : Map.Map<Nat, Bool> = Map.empty();
        positionIds.forEach(func(pid) {
          switch (seen.get(pid)) {
            case (?_) {};
            case null {
              seen.add(pid, true);
              var order = 1;
              keptCategories.filter(func(c) { c.positionId == pid }).forEach(func(c) {
                let renumbered : Category = { c with sortOrder = order };
                categories.add(renumbered);
                order := order + 1;
              });
            };
          };
        });
        ?existing;
      };
      case null null;
    };
  };

  public func reorderCategories(
    categories : List.List<Category>,
    positionId : Nat,
    orderedCategoryIds : [Nat],
  ) : [Category] {
    // Reassign sortOrder per-position starting at 1 in the given order.
    // Categories in this position not listed keep their relative order after
    // the listed ones. Categories in other positions are untouched.
    let all = categories.toArray();
    categories.clear();
    let placed : Map.Map<Nat, Bool> = Map.empty();
    var order = 1;
    for (id in orderedCategoryIds.values()) {
      switch (all.find(func(c) { c.id == id and c.positionId == positionId })) {
        case (?c) {
          let renumbered : Category = { c with sortOrder = order };
          categories.add(renumbered);
          placed.add(id, true);
          order := order + 1;
        };
        case null {};
      };
    };
    // Append unlisted categories of this position, preserving their existing order.
    for (c in all.values()) {
      if (c.positionId == positionId) {
        switch (placed.get(c.id)) {
          case (?_) {};
          case null {
            let renumbered : Category = { c with sortOrder = order };
            categories.add(renumbered);
            order := order + 1;
          };
        };
      } else {
        // Other positions: re-add unchanged.
        categories.add(c);
      };
    };
    categories.filter(func(c) { c.positionId == positionId }).toArray();
  };

  // --- LibraryItem helpers ---

  public func getItem(items : List.List<LibraryItem>, id : Nat) : ?LibraryItem {
    items.find(func(i) { i.id == id });
  };

  public func listItemsByCategory(items : List.List<LibraryItem>, categoryId : Nat) : [LibraryItem] {
    items.filter(func(i) { i.categoryId == categoryId }).toArray();
  };

  public func createItem(
    items : List.List<LibraryItem>,
    nextId : { var value : Nat },
    categoryId : Nat,
    title : Text,
    subtitle : ?Text,
    photo : ?Text,
    details : [DetailField],
    notes : ?Text,
    tags : [Text],
    seasonal : Bool,
    recipe : ?Recipe,
    foodRecipe : ?FoodRecipe,
  ) : LibraryItem {
    let id = nextId.value;
    nextId.value := nextId.value + 1;
    // sortOrder is PER CATEGORY: the new item appends to the end of its
    // category's sequence starting at 1. Count the existing items in the same
    // category and add 1 — mirrors the createPosition pattern in foundation.mo.
    let sameCategoryCount = items.filter(func(i) { i.categoryId == categoryId }).size();
    let sortOrder = sameCategoryCount + 1;
    // Auto-tag upsell ingredients on the recipe import path before persisting.
    // Premium-liquor signals (top shelf, premium, reserve, single barrel,
    // anejo, añejo, vsop, x.o, luxury) flip upsell=false → upsell=true;
    // explicit upsell=true is never downgraded. null recipe passes through.
    // foodRecipe is passed through unchanged — no auto-tagging applies to
    // food recipe components (the upsell concept is beverage-only).
    let taggedRecipe = tagRecipeUpsells(recipe);
    let item : LibraryItem = {
      id;
      categoryId;
      title;
      subtitle;
      photo;
      details;
      notes;
      tags;
      seasonal;
      sortOrder;
      recipe = taggedRecipe;
      foodRecipe;
    };
    items.add(item);
    item;
  };

  public func updateItem(
    items : List.List<LibraryItem>,
    id : Nat,
    title : Text,
    subtitle : ?Text,
    photo : ?Text,
    details : [DetailField],
    notes : ?Text,
    tags : [Text],
    seasonal : Bool,
    recipe : ?Recipe,
    foodRecipe : ?FoodRecipe,
  ) : ?LibraryItem {
    let found = items.find(func(i) { i.id == id });
    switch (found) {
      case (?existing) {
        // Spread the existing record and override the editable fields. The
        // id / categoryId / sortOrder are preserved (not part of the update
        // payload); recipe and foodRecipe are carried through so the item can
        // be promoted to or demoted from a beverage recipe and/or a food
        // recipe. Mirrors updatePosition in foundation.mo.
        // Auto-tag upsell ingredients on the recipe import path before
        // persisting — same tagging as createItem so updates stay consistent.
        // foodRecipe is passed through unchanged (no beverage upsell tagging).
        let taggedRecipe = tagRecipeUpsells(recipe);
        let updated : LibraryItem = {
          existing with
          title;
          subtitle;
          photo;
          details;
          notes;
          tags;
          seasonal;
          recipe = taggedRecipe;
          foodRecipe;
        };
        items.mapInPlace(
          func(i) {
            if (i.id == id) { updated } else { i };
          }
        );
        ?updated;
      };
      case null null;
    };
  };

  public func deleteItem(items : List.List<LibraryItem>, id : Nat) : ?LibraryItem {
    let found = items.find(func(i) { i.id == id });
    switch (found) {
      case (?existing) {
        // Remove the item by filtering it out, then renumber the remaining
        // items in the same category per-parent starting at 1. Items in other
        // categories are re-added unchanged.
        let categoryId = existing.categoryId;
        let kept = items.filter(func(i) { i.id != id });
        items.clear();
        // Re-add items in other categories unchanged.
        kept.filter(func(i) { i.categoryId != categoryId }).forEach(func(i) { items.add(i) });
        // Renumber the affected category's items in their original order.
        var order = 1;
        kept.filter(func(i) { i.categoryId == categoryId }).forEach(func(i) {
          let renumbered : LibraryItem = { i with sortOrder = order };
          items.add(renumbered);
          order := order + 1;
        });
        ?existing;
      };
      case null null;
    };
  };

  public func reorderItems(
    items : List.List<LibraryItem>,
    categoryId : Nat,
    orderedItemIds : [Nat],
  ) : [LibraryItem] {
    // Reassign sortOrder per-category starting at 1 in the given order.
    // Items in this category not listed keep their relative order after the
    // listed ones. Items in other categories are untouched.
    let all = items.toArray();
    items.clear();
    let placed : Map.Map<Nat, Bool> = Map.empty();
    var order = 1;
    for (id in orderedItemIds.values()) {
      switch (all.find(func(i) { i.id == id and i.categoryId == categoryId })) {
        case (?i) {
          let renumbered : LibraryItem = { i with sortOrder = order };
          items.add(renumbered);
          placed.add(id, true);
          order := order + 1;
        };
        case null {};
      };
    };
    // Append unlisted items of this category, preserving their existing order.
    for (i in all.values()) {
      if (i.categoryId == categoryId) {
        switch (placed.get(i.id)) {
          case (?_) {};
          case null {
            let renumbered : LibraryItem = { i with sortOrder = order };
            items.add(renumbered);
            order := order + 1;
          };
        };
      } else {
        // Other categories: re-add unchanged.
        items.add(i);
      };
    };
    items.filter(func(i) { i.categoryId == categoryId }).toArray();
  };

  public func searchItemsInPosition(
    categories : List.List<Category>,
    items : List.List<LibraryItem>,
    positionId : Nat,
    searchText : Text,
  ) : [LibraryItem] {
    // Case-insensitive contains over title / subtitle / detail fieldLabel +
    // value / tags, scoped to the position's categories, sorted by categoryId
    // then sortOrder.
    let needle = searchText.toLower();
    let positionCategoryIds = categories.filter(func(c) { c.positionId == positionId }).map<Category, Nat>(func(c) { c.id });
    let matching = items.filter(func(i) {
      let inPosition = positionCategoryIds.contains(i.categoryId);
      if (not inPosition) { false } else {
        let titleHit = i.title.toLower().contains(#text needle);
        let subtitleHit = switch (i.subtitle) {
          case null false;
          case (?s) s.toLower().contains(#text needle);
        };
        let detailHit = i.details.vals().find(func(d) {
          d.fieldLabel.toLower().contains(#text needle) or d.value.toLower().contains(#text needle);
        }) != null;
        let tagHit = i.tags.vals().find(func(t) { t.toLower().contains(#text needle) }) != null;
        titleHit or subtitleHit or detailHit or tagHit;
      };
    });
    let sorted = matching.toArray();
    // Sort by categoryId then sortOrder (stable for equal keys).
    let byCategoryThenOrder = sorted.sort(
      func(a, b) {
        let catCmp = Nat.compare(a.categoryId, b.categoryId);
        switch (catCmp) {
          case (#equal) Nat.compare(a.sortOrder, b.sortOrder);
          case _ catCmp;
        };
      }
    );
    byCategoryThenOrder;
  };
};
