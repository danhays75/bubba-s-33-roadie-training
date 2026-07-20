import Map "mo:core/Map";
import List "mo:core/List";
import Principal "mo:core/Principal";
import Text "mo:core/Text";
import Iter "mo:core/Iter";
import Nat "mo:core/Nat";
import MixinViews "mo:caffeineai-data-viewer/MixinViews";
import AccessControl "mo:caffeineai-authorization/access-control";
import MixinAuthorization "mo:caffeineai-authorization/MixinAuthorization";
import OQL "mo:caffeineai-oql";
import Expose "mo:caffeineai-oql/Expose";
import MixinObjectStorage "mo:caffeineai-object-storage/Mixin";
import Foundation "lib/foundation";
import Library "lib/library";
import Nso "lib/nso";
import Legendary "lib/legendary";
import FoundationApi "mixins/foundation-api";
import LibraryApi "mixins/library-api";
import NsoApi "mixins/nso-api";
import LegendaryApi "mixins/legendary-api";

actor {
  include MixinViews();
  include MixinObjectStorage();

  let accessControlState : AccessControl.AccessControlState;

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

  // --- NSO (New Store Opening) domain state ---
  // Additive to the foundation + library state. Same enhanced-migration
  // pattern: types only, no initializers; the new migration supplies the
  // initial values. Manager/admin-only writes; reads are public query.
  let nsoPhases : List.List<Nso.Phase>;
  let nsoTasks : List.List<Nso.Task>;
  let nextPhaseId : { var value : Nat };
  let nextTaskId : { var value : Nat };

  // --- Legendary (Be Legendary practice activities) domain state ---
  // Additive to the foundation + library + NSO state. Same enhanced-migration
  // pattern: types only, no initializers; the new migration supplies the
  // initial values. Admin-only generation; reads are public query. Practice
  // only — no scores, no tracking.
  let legendaryActivities : List.List<Legendary.Activity>;
  let nextLegendaryActivityId : { var value : Nat };

  // Access-control sign-in mixin. The unsuppressable contract rule from
  // the caffeineai-authorization package requires this exact include.
  // The admin-guard repair for the B-tree corruption left by the frozen
  // migration 20260703_000001 is applied additively inside getMyProfile
  // (see mixins/foundation-api.mo) via AccessControlAdminGuard.initialize,
  // which runs before the existing role-sync read and re-grants #admin to
  // a caller whose stored profile.role == #admin but whose userRoles entry
  // is missing/corrupted.
  include MixinAuthorization(accessControlState, null);

  include FoundationApi(accessControlState, profiles, positions, assignments, nextPositionId);
  include LibraryApi(accessControlState, positions, categories, items, nextCategoryId, nextItemId);
  include NsoApi(accessControlState, profiles, nsoPhases, nsoTasks, nextPhaseId, nextTaskId);
  include LegendaryApi(accessControlState, categories, items, legendaryActivities, nextLegendaryActivityId);

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
        .payload("hasRecipe", func (i) = switch (i.recipe) { case null false; case (?_) true })
        .payload("recipeGlassware", func (i) = switch (i.recipe) { case null ""; case (?r) r.glassware })
        .payload("recipeSpecCount", func (i) = switch (i.recipe) { case null 0; case (?r) r.specs.size() })
        .payload("recipeVariantCount", func (i) = switch (i.recipe) { case null 0; case (?r) r.variants.size() })
        .payload("recipeEquipmentCount", func (i) = switch (i.recipe) { case null 0; case (?r) r.equipment.size() })
        .payload("recipeHasBulkMix", func (i) = switch (i.recipe) { case null false; case (?r) switch (r.yield) { case null r.equipment.size() > 0; case (?_) true } })
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
          recipe = null;
        })
        .build(),
      // NsoPhase: an ordered stage of a new store opening. Manager/admin-only
      // domain; authorization is the default #controllerOnly — the agent reads
      // everything, end users browse via the explicit getNsoPhases query method.
      OQL.Entity.manual<Nso.Phase>(
        "nsoPhase",
        func () = nsoPhases.values(),
        "Phase",
        "id",
      )
        .payload("id", func (p) = p.id)
        .payload("name", func (p) = p.name)
        .payload("sortOrder", func (p) = p.sortOrder)
        .sample({
          id = 0;
          name = "";
          sortOrder = 0;
        })
        .build(),
      // NsoTask: belongs to a phase. phaseId is an edge to the nsoPhase entity
      // above; kept as a plain payload here for consistency with the
      // category/libraryItem pattern. assignedTo is a ?Principal exposed as
      // empty text when null (mirrors the coverPhoto/photo handling above).
      OQL.Entity.manual<Nso.Task>(
        "nsoTask",
        func () = nsoTasks.values(),
        "Task",
        "id",
      )
        .payload("id", func (t) = t.id)
        .payload("phaseId", func (t) = t.phaseId)
        .payload("text", func (t) = t.text)
        .payload("section", func (t) = switch (t.section) { case null ""; case (?s) s })
        .payload("done", func (t) = t.done)
        .payload("assignedTo", func (t) = switch (t.assignedTo) { case null ""; case (?p) p.toText() })
        .payload("completionDate", func (t) = switch (t.completionDate) { case null ""; case (?d) d })
        .payload("notes", func (t) = switch (t.notes) { case null ""; case (?n) n })
        .payload("sortOrder", func (t) = t.sortOrder)
        .sample({
          id = 0;
          phaseId = 0;
          text = "";
          section = null;
          done = false;
          assignedTo = null;
          completionDate = null;
          notes = null;
          sortOrder = 0;
        })
        .build(),
      // LegendaryActivity: a generated practice activity (quiz or flashcards).
      // Belongs to a position. sourceCategoryIds is the list of Library
      // categories the items were drawn from — exposed as a joined text column
      // so it remains queryable. activityType is the ActivityType variant
      // exposed as text ("quiz" / "flashcards"). content is the generated
      // payload — exposed as a count of questions or flashcards so it stays
      // queryable without a nested-record _toRow. createdBy is the admin
      // Principal who triggered generation. Authorization is the default
      // #controllerOnly — the agent reads everything; end users browse via the
      // explicit getLegendaryActivitiesByPosition query method.
      OQL.Entity.manual<Legendary.Activity>(
        "legendaryActivity",
        func () = legendaryActivities.values(),
        "Activity",
        "id",
      )
        .payload("id", func (a) = a.id)
        .payload("positionId", func (a) = a.positionId)
        .payload("activityType", func (a) = switch (a.activityType) { case (#quiz) "quiz"; case (#flashcards) "flashcards"; case (#drinksBuilder) "drinksBuilder" })
        .payload("name", func (a) = a.name)
        .payload("sourceCategoryIds", func (a) = a.sourceCategoryIds.vals().map(Nat.toText).join(", "))
        .payload("contentCount", func (a) = switch (a.content) {
          case (#quizContent q) q.size();
          case (#flashcardContent f) f.size();
          case (#drinksBuilderContent _) 1;
        })
        .payload("createdAt", func (a) = a.createdAt)
        .payload("createdBy", func (a) = a.createdBy.toText())
        .sample({
          id = 0;
          positionId = 0;
          activityType = #quiz;
          name = "";
          sourceCategoryIds = [];
          content = #quizContent([]);
          createdAt = 0;
          createdBy = Principal.fromText("aaaaa-aa");
        })
        .build(),
    ];
  });
};
