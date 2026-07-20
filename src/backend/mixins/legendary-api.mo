import Int "mo:core/Int";
import List "mo:core/List";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import AccessControl "mo:caffeineai-authorization/access-control";
import Foundation "../lib/foundation";
import Legendary "../lib/legendary";
import Library "../lib/library";
import Types "../types/legendary";

// Legendary domain API mixin. Exposes the public canister interface for the
// "Be Legendary" practice activities (quiz + flashcards + drinksBuilder).
//
// State slices are injected from main.mo:
//   - accessControlState       : the existing authorization state (admin/user/guest)
//   - categories               : stable List of Library categories (read-only here)
//   - items                    : stable List of Library items (read-only here)
//   - legendaryActivities      : stable List of generated activities
//   - nextLegendaryActivityId  : stable counter record for new activity ids
//
// Authorization: read methods are public query with NO guard. Write methods
// (buildLegendaryActivity, deleteLegendaryActivity, updateLegendaryActivity,
// rebuildLegendaryActivity) are admin-only — guarded by AccessControl.isAdmin
// + Runtime.trap, mirroring the library-api pattern.
//
// buildLegendaryActivity accepts BuildActivityInput. For #quiz/#flashcards it
// fetches items from the selected sourceCategoryIds via the library lib and
// generates content from those items and their detail fields. For
// #drinksBuilder it persists the admin-supplied DrinksBuilderSettings as the
// activity's content (no item-derived generation — the playable pool is
// derived at play time).
//
// updateLegendaryActivity accepts UpdateActivityInput. For #drinksBuilder it
// also applies an optional replacement DrinksBuilderContent; for
// #quiz/#flashcards the content field is ignored (use rebuildLegendaryActivity
// to regenerate).
mixin (
  accessControlState : AccessControl.AccessControlState,
  positions : List.List<Foundation.Position>,
  categories : List.List<Library.Category>,
  items : List.List<Library.LibraryItem>,
  legendaryActivities : List.List<Legendary.Activity>,
  nextLegendaryActivityId : { var value : Nat },
) {

  // --- Browsing (public query, no admin guard) ---

  public query func getLegendaryActivitiesByPosition(positionId : Nat) : async [Legendary.Activity] {
    Legendary.listActivitiesByPosition(legendaryActivities, positionId);
  };

  public query func getLegendaryActivity(id : Nat) : async ?Legendary.Activity {
    Legendary.getActivity(legendaryActivities, id);
  };

  // --- Activity management (admin only) ---

  // Generate a new practice activity from the selected Library categories.
  // For #quiz/#flashcards: fetches items from sourceCategoryIds, generates
  // content from those items and their detail fields, and persists the
  // Activity. For #drinksBuilder: persists the admin-supplied
  // DrinksBuilderSettings (from input.content) as the activity's content —
  // no item-derived generation.
  public shared ({ caller }) func buildLegendaryActivity(input : Types.BuildActivityInput) : async Legendary.Activity {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: admin only");
    };
    // Parent-existence + input validation: refuse to persist an empty or
    // orphaned activity. The positionId MUST refer to an existing Foundation
    // position, sourceCategoryIds MUST be non-empty, and every source
    // category id MUST refer to an existing Library category.
    if (Foundation.getPosition(positions, input.positionId) == null) {
      Runtime.trap("buildLegendaryActivity: position not found");
    };
    if (input.sourceCategoryIds.size() == 0) {
      Runtime.trap("buildLegendaryActivity: sourceCategoryIds is empty");
    };
    for (categoryId in input.sourceCategoryIds.values()) {
      if (Library.getCategory(categories, categoryId) == null) {
        Runtime.trap("buildLegendaryActivity: source category not found");
      };
    };
    // Fetch items from each selected source category and flatten into a single
    // array. Items are drawn from the Library via the existing lib helper.
    var sourceItems : [Library.LibraryItem] = [];
    for (categoryId in input.sourceCategoryIds.values()) {
      let categoryItems = Library.listItemsByCategory(items, categoryId);
      sourceItems := sourceItems.concat(categoryItems);
    };
    // Generate content based on the requested activity type.
    let content : Legendary.ActivityContent = switch (input.activityType) {
      case (#quiz) #quizContent(Legendary.generateQuizContent(sourceItems));
      case (#flashcards) #flashcardContent(Legendary.generateFlashcardContent(sourceItems));
      case (#drinksBuilder) {
        switch (input.content) {
          case (?(#drinksBuilderContent(dbContent))) {
            #drinksBuilderContent(dbContent);
          };
          case _ { Runtime.trap("drinksBuilder activity requires #drinksBuilderContent in input.content") };
        };
      };
    };
    Legendary.createActivity(
      legendaryActivities,
      nextLegendaryActivityId,
      input.positionId,
      input.activityType,
      input.name,
      input.sourceCategoryIds,
      content,
      caller,
      Int.abs(Time.now()),
    );
  };

  public shared ({ caller }) func deleteLegendaryActivity(id : Nat) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: admin only");
    };
    switch (Legendary.deleteActivity(legendaryActivities, id)) {
      case (?_) {};
      case null { Runtime.trap("Activity not found") };
    };
  };

  // Edit an existing activity's metadata (name + sourceCategoryIds) WITHOUT
  // regenerating content. Admin-only. Finds the activity by input.id and
  // persists the updated name and sourceCategoryIds; positionId, activityType,
  // createdAt, and createdBy are preserved. For #drinksBuilder activities,
  // input.content may carry a replacement DrinksBuilderContent (settings);
  // for #quiz/#flashcards input.content is ignored and the existing content is
  // preserved (use rebuildLegendaryActivity to regenerate). Returns the
  // updated Activity.
  public shared ({ caller }) func updateLegendaryActivity(input : Types.UpdateActivityInput) : async Legendary.Activity {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: admin only");
    };
    let existing = switch (Legendary.getActivity(legendaryActivities, input.id)) {
      case (?a) a;
      case null { Runtime.trap("Activity not found") };
    };
    // Resolve the content to persist: for #drinksBuilder, apply the
    // replacement content if supplied, otherwise keep the existing content.
    // For #quiz/#flashcards, always keep the existing content (regeneration is
    // rebuildLegendaryActivity's job).
    let newContent : Legendary.ActivityContent = switch (existing.activityType) {
      case (#drinksBuilder) {
        switch (input.content) {
          case (?(#drinksBuilderContent(dbContent))) #drinksBuilderContent(dbContent);
          case _ existing.content;
        };
      };
      case (#quiz) existing.content;
      case (#flashcards) existing.content;
    };
    Legendary.updateActivity(
      legendaryActivities,
      input.id,
      input.name,
      input.sourceCategoryIds,
      newContent,
    );
  };

  // Rebuild an existing activity's content in place. Admin-only. Finds the
  // activity by id, re-fetches items from its CURRENT sourceCategoryIds via
  // Library.listItemsByCategory, regenerates content using the existing
  // generateQuizContent/generateFlashcardContent (based on the activity's
  // existing activityType), and persists the regenerated content. For
  // #drinksBuilder, rebuild is a no-op on content (the playable pool is
  // derived at play time from the Library, so there is nothing to
  // regenerate) and returns the activity unchanged. Returns the updated
  // Activity.
  public shared ({ caller }) func rebuildLegendaryActivity(id : Nat) : async Legendary.Activity {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: admin only");
    };
    let activity = switch (Legendary.getActivity(legendaryActivities, id)) {
      case (?a) a;
      case null { Runtime.trap("Activity not found") };
    };
    // Re-fetch items from the activity's CURRENT sourceCategoryIds — same
    // pattern as buildLegendaryActivity, but on the existing activity's
    // sourceCategoryIds instead of input.sourceCategoryIds.
    var sourceItems : [Library.LibraryItem] = [];
    for (categoryId in activity.sourceCategoryIds.values()) {
      let categoryItems = Library.listItemsByCategory(items, categoryId);
      sourceItems := sourceItems.concat(categoryItems);
    };
    // Regenerate content based on the activity's existing activityType. For
    // #drinksBuilder there is nothing to regenerate (content is just the
    // admin's settings; the playable pool is derived at play time), so we
    // return the activity unchanged.
    let newContent : Legendary.ActivityContent = switch (activity.activityType) {
      case (#quiz) #quizContent(Legendary.generateQuizContent(sourceItems));
      case (#flashcards) #flashcardContent(Legendary.generateFlashcardContent(sourceItems));
      case (#drinksBuilder) activity.content;
    };
    Legendary.rebuildActivity(legendaryActivities, id, newContent);
  };

  // --- Drinks Builder play-time resolution (public query, no admin guard) ---
  // These let the frontend derive the playable drink pool and decoy pool at
  // play time from a #drinksBuilder activity's settings + the current Library.
  // Practice-only — no scores are stored; the frontend tracks session scores.

  // Resolve the playable drink pool for a #drinksBuilder activity by id.
  // Returns the in-scope Library items (bulk-mix recipes excluded) the
  // learner can be quizzed on. Traps if the activity is not found or is not a
  // #drinksBuilder activity.
  public query func getDrinksBuilderPlayablePool(activityId : Nat) : async [Library.LibraryItem] {
    let activity = switch (Legendary.getActivity(legendaryActivities, activityId)) {
      case (?a) a;
      case null { Runtime.trap("Activity not found") };
    };
    let settings = switch (activity.content) {
      case (#drinksBuilderContent(content)) content.settings;
      case _ { Runtime.trap("Activity is not a drinksBuilder activity") };
    };
    Legendary.resolvePlayableDrinks(items, settings);
  };

  // Resolve the global decoy pool for a #drinksBuilder activity by id.
  // Returns ALL in-scope recipes (filtered by isPlayableDrink +
  // matchesSettings) — the frontend draws per-drink decoys from this pool,
  // excluding the drink currently being quizzed on. The backend does NOT cap
  // to decoyCount or dedupe against the playable pool; that capping is done
  // client-side. Traps if the activity is not found or is not a
  // #drinksBuilder activity.
  public query func getDrinksBuilderDecoyPool(activityId : Nat) : async [Library.LibraryItem] {
    let activity = switch (Legendary.getActivity(legendaryActivities, activityId)) {
      case (?a) a;
      case null { Runtime.trap("Activity not found") };
    };
    let settings = switch (activity.content) {
      case (#drinksBuilderContent(content)) content.settings;
      case _ { Runtime.trap("Activity is not a drinksBuilder activity") };
    };
    Legendary.resolveDecoyPool(items, settings);
  };
};
