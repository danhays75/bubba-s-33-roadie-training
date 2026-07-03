import Map "mo:core/Map";
import List "mo:core/List";
import Principal "mo:core/Principal";
import Text "mo:core/Text";
import MixinViews "mo:caffeineai-data-viewer/MixinViews";
import AccessControl "mo:caffeineai-authorization/access-control";
import MixinAuthorization "mo:caffeineai-authorization/MixinAuthorization";
import OQL "mo:caffeineai-oql";
import Expose "mo:caffeineai-oql/Expose";
import MixinObjectStorage "mo:caffeineai-object-storage/Mixin";
import Foundation "lib/foundation";
import Library "lib/library";
import FoundationApi "mixins/foundation-api";
import LibraryApi "mixins/library-api";

actor {
  include MixinViews();
  include MixinObjectStorage();

  let accessControlState : AccessControl.AccessControlState;
  include MixinAuthorization(accessControlState, null);

  // --- Foundation domain state ---
  // Declared WITHOUT initializers per enhanced-migration mode; initial values
  // come from the migration chain in src/backend/migrations/.
  let profiles : Map.Map<Principal, Foundation.UserProfile>;
  let positions : List.List<Foundation.Position>;
  let assignments : List.List<Foundation.PositionAssignment>;
  // Wrapped in a record so mutations from the mixin propagate back to the
  // actor (var fields are passed by value).
  let nextPositionId : { var value : Nat };

  // --- Library domain state ---
  // Additive to the foundation state. Same enhanced-migration pattern: types
  // only, no initializers; the new migration supplies the initial values.
  let categories : List.List<Library.Category>;
  let items : List.List<Library.LibraryItem>;
  let nextCategoryId : { var value : Nat };
  let nextItemId : { var value : Nat };

  include FoundationApi(accessControlState, profiles, positions, assignments, nextPositionId);
  include LibraryApi(accessControlState, categories, items, nextCategoryId, nextItemId);

  // --- OQL (Data Intelligence) ---
  // Expose the Library collections to the Caffeine Data Intelligence agent.
  // Both entities use manual mode: Category has an optional ?Text field and
  // LibraryItem has nested [DetailField] / [Text] collection fields, neither
  // of which auto-derive cleanly. Authorization is the default #controllerOnly
  // — the agent reads everything; end users browse via the explicit
  // getCategoriesByPosition / getItemsByCategory query methods above.
  include Expose({
    entities = [
      // Category: belongs to a position. positionId is an edge to the
      // foundation "position" entity (declared elsewhere); kept as a plain
      // payload here since the foundation entity is outside this domain's
      // OQL scope.
      OQL.Entity.manual<Library.Category>(
        "category",
        func () = categories.values(),
        "Category",
        "id",
      )
        .payload("id", func (c) = c.id)
        .payload("positionId", func (c) = c.positionId)
        .payload("name", func (c) = c.name)
        .payload("coverPhoto", func (c) = switch (c.coverPhoto) { case null ""; case (?t) t })
        .payload("sortOrder", func (c) = c.sortOrder)
        .sample({
          id = 0;
          positionId = 0;
          name = "";
          coverPhoto = null;
          sortOrder = 0;
        })
        .build(),
      // LibraryItem: belongs to a category. details and tags are collection
      // fields — exposed as a count and a joined text column respectively so
      // they remain queryable without a nested-record _toRow.
      OQL.Entity.manual<Library.LibraryItem>(
        "libraryItem",
        func () = items.values(),
        "LibraryItem",
        "id",
      )
        .payload("id", func (i) = i.id)
        .payload("categoryId", func (i) = i.categoryId)
        .payload("title", func (i) = i.title)
        .payload("subtitle", func (i) = switch (i.subtitle) { case null ""; case (?t) t })
        .payload("photo", func (i) = switch (i.photo) { case null ""; case (?t) t })
        .payload("notes", func (i) = switch (i.notes) { case null ""; case (?t) t })
        .payload("tags", func (i) = i.tags.vals().join(", "))
        .payload("seasonal", func (i) = i.seasonal)
        .payload("sortOrder", func (i) = i.sortOrder)
        .payload("detailCount", func (i) = i.details.size())
        .sample({
          id = 0;
          categoryId = 0;
          title = "";
          subtitle = null;
          photo = null;
          details = [];
          notes = null;
          tags = [];
          seasonal = false;
          sortOrder = 0;
        })
        .build(),
    ];
  });
};
