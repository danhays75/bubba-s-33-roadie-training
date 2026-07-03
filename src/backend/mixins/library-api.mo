import List "mo:core/List";
import Runtime "mo:core/Runtime";
import AccessControl "mo:caffeineai-authorization/access-control";
import Library "../lib/library";
import Types "../types/library";

// Library domain API mixin. Exposes the public canister interface for the
// per-position Library: categories and items (recipes / reference entries).
//
// State slices are injected from main.mo:
//   - accessControlState : the existing authorization state (admin/user/guest)
//   - categories         : stable List of Library categories
//   - items              : stable List of Library items
//   - nextCategoryId     : stable counter record for new category ids
//   - nextItemId         : stable counter record for new item ids
//
// Authorization: read/browse methods are public query; admin-only write
// endpoints (create/edit/reorder/delete) guard with AccessControl.isAdmin +
// Runtime.trap, mirroring the FoundationApi pattern.
mixin (
  accessControlState : AccessControl.AccessControlState,
  categories : List.List<Library.Category>,
  items : List.List<Library.LibraryItem>,
  nextCategoryId : { var value : Nat },
  nextItemId : { var value : Nat },
) {

  // --- Browsing (public query, no admin guard) ---

  public query func getCategoriesByPosition(positionId : Nat) : async [Library.Category] {
    Library.listCategoriesByPosition(categories, positionId);
  };

  public query func getCategory(categoryId : Nat) : async ?Library.Category {
    Library.getCategory(categories, categoryId);
  };

  public query func getItemsByCategory(categoryId : Nat) : async [Library.LibraryItem] {
    Library.listItemsByCategory(items, categoryId);
  };

  public query func getItem(itemId : Nat) : async ?Library.LibraryItem {
    Library.getItem(items, itemId);
  };

  // Position-scoped search by title, subtitle, detail-field label/value, or tag
  // (case-insensitive contains). Global cross-position search is out of scope.
  public query func searchLibrary(positionId : Nat, searchText : Text) : async [Library.LibraryItem] {
    Library.searchItemsInPosition(categories, items, positionId, searchText);
  };

  // --- Category management (admin only) ---

  public shared ({ caller }) func createCategory(positionId : Nat, name : Text, coverPhoto : ?Text) : async Library.Category {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: admin only");
    };
    Library.createCategory(categories, nextCategoryId, positionId, name, coverPhoto);
  };

  public shared ({ caller }) func updateCategory(categoryId : Nat, name : Text, coverPhoto : ?Text) : async Library.Category {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: admin only");
    };
    switch (Library.updateCategory(categories, categoryId, name, coverPhoto)) {
      case (?updated) { updated };
      case null { Runtime.trap("Category not found") };
    };
  };

  // Deleting a category also deletes its items (cascade).
  public shared ({ caller }) func deleteCategory(categoryId : Nat) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: admin only");
    };
    switch (Library.deleteCategory(categories, items, categoryId)) {
      case (?_) {};
      case null { Runtime.trap("Category not found") };
    };
  };

  public shared ({ caller }) func reorderCategories(positionId : Nat, orderedCategoryIds : [Nat]) : async [Library.Category] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: admin only");
    };
    Library.reorderCategories(categories, positionId, orderedCategoryIds);
  };

  // --- Item management (admin only) ---

  public shared ({ caller }) func createItem(
    categoryId : Nat,
    title : Text,
    subtitle : ?Text,
    photo : ?Text,
    details : [Types.DetailField],
    notes : ?Text,
    tags : [Text],
    seasonal : Bool,
  ) : async Library.LibraryItem {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: admin only");
    };
    // Verify the parent category exists before creating an item under it.
    switch (Library.getCategory(categories, categoryId)) {
      case (?_) {};
      case null { Runtime.trap("Category not found") };
    };
    Library.createItem(items, nextItemId, categoryId, title, subtitle, photo, details, notes, tags, seasonal);
  };

  public shared ({ caller }) func updateItem(
    itemId : Nat,
    title : Text,
    subtitle : ?Text,
    photo : ?Text,
    details : [Types.DetailField],
    notes : ?Text,
    tags : [Text],
    seasonal : Bool,
  ) : async Library.LibraryItem {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: admin only");
    };
    switch (Library.updateItem(items, itemId, title, subtitle, photo, details, notes, tags, seasonal)) {
      case (?updated) { updated };
      case null { Runtime.trap("Item not found") };
    };
  };

  public shared ({ caller }) func deleteItem(itemId : Nat) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: admin only");
    };
    switch (Library.deleteItem(items, itemId)) {
      case (?_) {};
      case null { Runtime.trap("Item not found") };
    };
  };

  public shared ({ caller }) func reorderItems(categoryId : Nat, orderedItemIds : [Nat]) : async [Library.LibraryItem] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: admin only");
    };
    Library.reorderItems(items, categoryId, orderedItemIds);
  };
};
