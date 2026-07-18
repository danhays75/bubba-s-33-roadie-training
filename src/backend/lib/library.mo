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

  // --- Category helpers ---

  public func getCategory(categories : List.List<Category>, id : Nat) : ?Category {
    categories.find(func(c) { c.id == id });
  };

  public func listCategoriesByPosition(categories : List.List<Category>, positionId : Nat) : [Category] {
    categories
      .filter(func(c) { c.positionId == positionId })
      .toArray()
      .sort(func(a, b) { Nat.compare(a.sortOrder, b.sortOrder) });
  };

  public func createCategory(
    categories : List.List<Category>,
    nextId : { var value : Nat },
    positionId : Nat,
    name : Text,
    coverPhoto : ?Text,
  ) : Category {
    let id = nextId.value;
    nextId.value := nextId.value + 1;
    // sortOrder = current count of categories in this position + 1, so the new
    // category appends to the end of the per-position sequence starting at 1.
    let samePositionCount = categories.filter(func(c) { c.positionId == positionId }).size();
    let sortOrder = samePositionCount + 1;
    let category : Category = {
      id;
      positionId;
      name;
      coverPhoto;
      sortOrder;
    };
    categories.add(category);
    category;
  };

  public func updateCategory(
    categories : List.List<Category>,
    id : Nat,
    name : Text,
    coverPhoto : ?Text,
  ) : ?Category {
    let found = categories.find(func(c) { c.id == id });
    switch (found) {
      case (?existing) {
        let updated : Category = { existing with name; coverPhoto };
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

  // Remove the category AND cascade-delete its items. Renumber the remaining
  // categories' sortOrder within the affected position (1-based, contiguous).
  public func deleteCategory(categories : List.List<Category>, items : List.List<LibraryItem>, id : Nat) : ?Category {
    let found = categories.find(func(c) { c.id == id });
    switch (found) {
      case (?existing) {
        // Cascade-delete items belonging to this category.
        let keptItems = items.filter(func(i) { i.categoryId != id });
        items.clear();
        keptItems.forEach(func(i) { items.add(i) });
        // Remove the category and renumber the remaining categories within the
        // affected position (1-based, contiguous).
        let positionId = existing.positionId;
        let keptCategories = categories.filter(func(c) { c.id != id });
        categories.clear();
        var order = 1;
        keptCategories.forEach(func(c) {
          let renumbered : Category = if (c.positionId == positionId) {
            { c with sortOrder = order };
          } else {
            c;
          };
          categories.add(renumbered);
          if (c.positionId == positionId) { order := order + 1 };
        });
        ?existing;
      };
      case null null;
    };
  };

  // Reassign sortOrder 1..N within the given position based on the order of ids
  // in orderedCategoryIds. Categories in this position not listed keep their
  // relative order after the listed ones. Returns the position's categories
  // sorted by new sortOrder.
  public func reorderCategories(
    categories : List.List<Category>,
    positionId : Nat,
    orderedCategoryIds : [Nat],
  ) : [Category] {
    let all = categories.toArray();
    let inPosition = all.filter(func(c) { c.positionId == positionId });
    let others = all.filter(func(c) { c.positionId != positionId });
    // Rebuild the in-position list: listed ids first (in given order), then
    // unlisted in-position categories preserving their existing relative order.
    let placed : Map.Map<Nat, Bool> = Map.empty();
    var reordered : [Category] = [];
    var order = 1;
    for (id in orderedCategoryIds.values()) {
      // Dedup guard: skip ids already placed in this same call so a duplicated
      // id in the input cannot renumber the same record twice and corrupt the
      // list with duplicate sortOrder values.
      switch (placed.get(id)) {
        case (?_) {};
        case null {
          switch (inPosition.find(func(c) { c.id == id })) {
            case (?c) {
              placed.add(id, true);
              let renumbered : Category = { c with sortOrder = order };
              reordered := reordered.concat([renumbered]);
              order := order + 1;
            };
            case null {};
          };
        };
      };
    };
    for (c in inPosition.values()) {
      switch (placed.get(c.id)) {
        case (?_) {};
        case null {
          let renumbered : Category = { c with sortOrder = order };
          reordered := reordered.concat([renumbered]);
          order := order + 1;
        };
      };
    };
    // Rewrite the categories list: others unchanged, then reordered in-position.
    categories.clear();
    others.forEach(func(c) { categories.add(c) });
    reordered.forEach(func(c) { categories.add(c) });
    reordered;
  };

  // --- LibraryItem helpers ---

  public func getItem(items : List.List<LibraryItem>, id : Nat) : ?LibraryItem {
    items.find(func(i) { i.id == id });
  };

  public func listItemsByCategory(items : List.List<LibraryItem>, categoryId : Nat) : [LibraryItem] {
    items
      .filter(func(i) { i.categoryId == categoryId })
      .toArray()
      .sort(func(a, b) { Nat.compare(a.sortOrder, b.sortOrder) });
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
  ) : LibraryItem {
    let id = nextId.value;
    nextId.value := nextId.value + 1;
    // sortOrder = current count of items in this category + 1, so the new item
    // appends to the end of the per-category sequence starting at 1.
    let sameCategoryCount = items.filter(func(i) { i.categoryId == categoryId }).size();
    let sortOrder = sameCategoryCount + 1;
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
  ) : ?LibraryItem {
    let found = items.find(func(i) { i.id == id });
    switch (found) {
      case (?existing) {
        let updated : LibraryItem = {
          existing with
          title;
          subtitle;
          photo;
          details;
          notes;
          tags;
          seasonal;
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

  // Remove the item and renumber the remaining items' sortOrder within the
  // affected category (1-based, contiguous).
  public func deleteItem(items : List.List<LibraryItem>, id : Nat) : ?LibraryItem {
    let found = items.find(func(i) { i.id == id });
    switch (found) {
      case (?existing) {
        let categoryId = existing.categoryId;
        let kept = items.filter(func(i) { i.id != id });
        items.clear();
        var order = 1;
        kept.forEach(func(i) {
          let renumbered : LibraryItem = if (i.categoryId == categoryId) {
            { i with sortOrder = order };
          } else {
            i;
          };
          items.add(renumbered);
          if (i.categoryId == categoryId) { order := order + 1 };
        });
        ?existing;
      };
      case null null;
    };
  };

  // Reassign sortOrder 1..N within the given category based on the order of ids
  // in orderedItemIds. Items in this category not listed keep their relative
  // order after the listed ones. Returns the category's items sorted by new
  // sortOrder.
  public func reorderItems(
    items : List.List<LibraryItem>,
    categoryId : Nat,
    orderedItemIds : [Nat],
  ) : [LibraryItem] {
    let all = items.toArray();
    let inCategory = all.filter(func(i) { i.categoryId == categoryId });
    let others = all.filter(func(i) { i.categoryId != categoryId });
    let placed : Map.Map<Nat, Bool> = Map.empty();
    var reordered : [LibraryItem] = [];
    var order = 1;
    for (id in orderedItemIds.values()) {
      // Dedup guard: skip ids already placed in this same call so a duplicated
      // id in the input cannot renumber the same record twice and corrupt the
      // list with duplicate sortOrder values.
      switch (placed.get(id)) {
        case (?_) {};
        case null {
          switch (inCategory.find(func(i) { i.id == id })) {
            case (?i) {
              placed.add(id, true);
              let renumbered : LibraryItem = { i with sortOrder = order };
              reordered := reordered.concat([renumbered]);
              order := order + 1;
            };
            case null {};
          };
        };
      };
    };
    for (i in inCategory.values()) {
      switch (placed.get(i.id)) {
        case (?_) {};
        case null {
          let renumbered : LibraryItem = { i with sortOrder = order };
          reordered := reordered.concat([renumbered]);
          order := order + 1;
        };
      };
    };
    items.clear();
    others.forEach(func(i) { items.add(i) });
    reordered.forEach(func(i) { items.add(i) });
    reordered;
  };

  // Position-scoped search: returns items whose title, subtitle, any
  // detail-field label or value, or any tag contains the query
  // (case-insensitive). Scoped to the items belonging to the categories of the
  // given position. Returns sorted by categoryId then sortOrder.
  public func searchItemsInPosition(
    categories : List.List<Category>,
    items : List.List<LibraryItem>,
    positionId : Nat,
    searchText : Text,
  ) : [LibraryItem] {
    let needle = searchText.toLower();
    // Collect the category ids belonging to this position.
    let positionCategoryIds : Map.Map<Nat, Bool> = Map.empty();
    categories
      .filter(func(c) { c.positionId == positionId })
      .forEach(func(c) { positionCategoryIds.add(c.id, true) });
    // Filter items in those categories whose searchable text contains needle.
    let matches = items.filter(func(i) {
      switch (positionCategoryIds.get(i.categoryId)) {
        case (?_) {
          i.title.toLower().contains(#text needle)
          or (
            switch (i.subtitle) {
              case null false;
              case (?s) s.toLower().contains(#text needle);
            }
          )
          or (
            switch (i.details.find(func(d) {
              d.fieldLabel.toLower().contains(#text needle)
              or d.value.toLower().contains(#text needle);
            })) {
              case null false;
              case (?_) true;
            }
          )
          or (
            switch (i.tags.find(func(t) {
              t.toLower().contains(#text needle);
            })) {
              case null false;
              case (?_) true;
            }
          );
        };
        case null false;
      };
    });
    matches
      .toArray()
      .sort(func(a, b) {
        switch (Nat.compare(a.categoryId, b.categoryId)) {
          case (#equal) Nat.compare(a.sortOrder, b.sortOrder);
          case order order;
        };
      });
  };
};
