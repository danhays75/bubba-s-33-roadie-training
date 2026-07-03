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

  // A Library item (a recipe / reference entry). Belongs to a category.
  // sortOrder is PER CATEGORY (1-based, renumbered on delete/reorder) — NOT a
  // global running count. photo is optional — never required to save an item.
  // details is a variable-length array the admin can add/remove freely.
  // subtitle is optional — renders underneath the title, a little smaller.
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
  };
};
