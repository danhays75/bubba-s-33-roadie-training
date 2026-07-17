import Int "mo:core/Int";
import List "mo:core/List";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import AccessControl "mo:caffeineai-authorization/access-control";
import Legendary "../lib/legendary";
import Library "../lib/library";
import Types "../types/legendary";

// Legendary domain API mixin. Exposes the public canister interface for the
// "Be Legendary" practice activities (quiz + flashcards).
//
// State slices are injected from main.mo:
//   - accessControlState       : the existing authorization state (admin/user/guest)
//   - categories               : stable List of Library categories (read-only here)
//   - items                    : stable List of Library items (read-only here)
//   - legendaryActivities      : stable List of generated activities
//   - nextLegendaryActivityId  : stable counter record for new activity ids
//
// Authorization: read methods are public query with NO guard. Write methods
// (buildLegendaryActivity, deleteLegendaryActivity) are admin-only — guarded
// by AccessControl.isAdmin + Runtime.trap, mirroring the library-api pattern.
// buildLegendaryActivity accepts BuildActivityInput, fetches items from the
// selected sourceCategoryIds via the library lib, generates quiz or flashcard
// content from those items and their detail fields, and persists the Activity.
mixin (
  accessControlState : AccessControl.AccessControlState,
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
  // Fetches items from sourceCategoryIds, generates quiz or flashcard content
  // from those items and their detail fields, and persists the Activity.
  public shared ({ caller }) func buildLegendaryActivity(input : Types.BuildActivityInput) : async Legendary.Activity {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: admin only");
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
  // persists the updated name and sourceCategoryIds; content, positionId,
  // activityType, createdAt, and createdBy are preserved. Returns the updated
  // Activity.
  public shared ({ caller }) func updateLegendaryActivity(input : Types.UpdateActivityInput) : async Legendary.Activity {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: admin only");
    };
    switch (Legendary.getActivity(legendaryActivities, input.id)) {
      case (?_) {
        Legendary.updateActivity(
          legendaryActivities,
          input.id,
          input.name,
          input.sourceCategoryIds,
        );
      };
      case null { Runtime.trap("Activity not found") };
    };
  };

  // Rebuild an existing activity's content in place. Admin-only. Finds the
  // activity by id, re-fetches items from its CURRENT sourceCategoryIds via
  // Library.listItemsByCategory, regenerates content using the existing
  // generateQuizContent/generateFlashcardContent (based on the activity's
  // existing activityType), and persists the regenerated content. Returns the
  // updated Activity.
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
    // Regenerate content based on the activity's existing activityType.
    let newContent : Legendary.ActivityContent = switch (activity.activityType) {
      case (#quiz) #quizContent(Legendary.generateQuizContent(sourceItems));
      case (#flashcards) #flashcardContent(Legendary.generateFlashcardContent(sourceItems));
    };
    Legendary.rebuildActivity(legendaryActivities, id, newContent);
  };
};
