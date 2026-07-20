import List "mo:core/List";
import Runtime "mo:core/Runtime";
import Types "../types/legendary";
import LibraryTypes "../types/library";

// Legendary domain logic. Pure helpers operating on List state passed in by
// reference — no caller awareness, no actor state. Mirrors the lib/library.mo
// pattern: filter, find, add, counter increment.
//
// Content generation (generateQuizContent / generateFlashcardContent) is pure:
// given a set of Library items and their detail fields, build the quiz or
// flashcard payload. No state mutation, no randomness source beyond the order
// of the input items — quizzes are deterministic so an admin can regenerate the
// same activity and get the same content.
//
// #drinksBuilder activities do NOT derive content from items at build time —
// the admin supplies DrinksBuilderSettings and the playable drink pool is
// derived at play time from the Library. The lib helpers for drinksBuilder
// are stubs in this contract pass; the develop agent will implement them.
module {
  public type Activity = Types.Activity;
  public type ActivityType = Types.ActivityType;
  public type ActivityContent = Types.ActivityContent;
  public type BuildActivityInput = Types.BuildActivityInput;
  public type UpdateActivityInput = Types.UpdateActivityInput;
  public type DrinksBuilderSettings = Types.DrinksBuilderSettings;
  public type DrinksBuilderContent = Types.DrinksBuilderContent;

  // List activities belonging to a position (filter by positionId).
  public func listActivitiesByPosition(activities : List.List<Activity>, positionId : Nat) : [Activity] {
    activities
      .filter(func(a) { a.positionId == positionId })
      .toArray();
  };

  // Get a single activity by id.
  public func getActivity(activities : List.List<Activity>, id : Nat) : ?Activity {
    activities.find(func(a) { a.id == id });
  };

  // Create a new activity. Assigns nextId, sets createdAt/createdBy, and
  // persists the Activity. `content` is the generated payload produced by the
  // mixin from the source items.
  public func createActivity(
    activities : List.List<Activity>,
    nextId : { var value : Nat },
    positionId : Nat,
    activityType : ActivityType,
    name : Text,
    sourceCategoryIds : [Nat],
    content : ActivityContent,
    createdBy : Principal,
    createdAt : Nat,
  ) : Activity {
    let id = nextId.value;
    nextId.value := nextId.value + 1;
    let activity : Activity = {
      id;
      positionId;
      activityType;
      name;
      sourceCategoryIds;
      content;
      createdAt;
      createdBy;
    };
    activities.add(activity);
    activity;
  };

  // Delete an activity by id. Returns the deleted activity, or null if not
  // found. Mirrors the library deleteItem pattern: filter out the matching
  // record, clear, re-add the rest.
  public func deleteActivity(activities : List.List<Activity>, id : Nat) : ?Activity {
    let found = activities.find(func(a) { a.id == id });
    switch (found) {
      case (?existing) {
        let kept = activities.filter(func(a) { a.id != id });
        activities.clear();
        kept.forEach(func(a) { activities.add(a) });
        ?existing;
      };
      case null null;
    };
  };

  // Update an existing activity's metadata (name + sourceCategoryIds) WITHOUT
  // regenerating content. Finds the activity by id and replaces it in the list,
  // preserving id/positionId/activityType/content/createdAt/createdBy. Traps if
  // the activity is not found.
  //
  // For #drinksBuilder activities, the caller may also pass a replacement
  // DrinksBuilderContent via `newContent`; for #quiz/#flashcards the caller
  // passes the existing content unchanged (use rebuildActivity to regenerate).
  public func updateActivity(
    activities : List.List<Activity>,
    id : Nat,
    newName : Text,
    newSourceCategoryIds : [Nat],
    newContent : ActivityContent,
  ) : Activity {
    switch (activities.find(func(a) { a.id == id })) {
      case (?existing) {
        let updated : Activity = {
          existing with
          name = newName;
          sourceCategoryIds = newSourceCategoryIds;
          content = newContent;
        };
        let kept = activities.filter(func(a) { a.id != id });
        activities.clear();
        kept.forEach(func(a) { activities.add(a) });
        activities.add(updated);
        updated;
      };
      case null { Runtime.trap("Activity not found") };
    };
  };

  // Rebuild an existing activity's content in place. Finds the activity by id
  // and replaces ONLY the content field, preserving
  // id/positionId/activityType/name/sourceCategoryIds/createdAt/createdBy.
  // Traps if the activity is not found.
  public func rebuildActivity(
    activities : List.List<Activity>,
    id : Nat,
    newContent : ActivityContent,
  ) : Activity {
    switch (activities.find(func(a) { a.id == id })) {
      case (?existing) {
        let updated : Activity = {
          existing with
          content = newContent;
        };
        let kept = activities.filter(func(a) { a.id != id });
        activities.clear();
        kept.forEach(func(a) { activities.add(a) });
        activities.add(updated);
        updated;
      };
      case null { Runtime.trap("Activity not found") };
    };
  };

  // --- Content generation helpers ---
  // These build quiz/flashcard content from a set of Library items and their
  // detail fields. Pure functions — no state mutation.

  // Collect, for a given field label, the distinct values across all items
  // (preserving first-seen order). Returns the label and the list of
  // (itemIndex, value) pairs so the caller can build questions.
  func collectFieldValues(items : [LibraryTypes.LibraryItem], fieldLabel : Text) : [(Nat, Text)] {
    var pairs : [(Nat, Text)] = [];
    var seen : [Text] = [];
    for ((index, item) in items.enumerate()) {
      switch (item.details.find(func(d) { d.fieldLabel == fieldLabel })) {
        case (?d) {
          // Only keep distinct values.
          if (seen.find(func(v) { v == d.value }) == null) {
            seen := seen.concat([d.value]);
            pairs := pairs.concat([(index, d.value)]);
          };
        };
        case null {};
      };
    };
    pairs;
  };

  // All distinct field labels across the items, in first-seen order.
  func allFieldLabels(items : [LibraryTypes.LibraryItem]) : [Text] {
    var labels : [Text] = [];
    for (item in items.values()) {
      for (d in item.details.values()) {
        if (labels.find(func(l) { l == d.fieldLabel }) == null) {
          labels := labels.concat([d.fieldLabel]);
        };
      };
    };
    labels;
  };

  // Generate quiz content (a balanced mix of #multipleChoice, #matching, and
  // #trueFalse questions) from the given items. Deterministic — no randomness
  // source; ordering is driven by item index and field order so an admin
  // regenerating the same activity gets the same content.
  //
  // Thresholds are intentionally relaxed so all three types are produced from
  // available data whenever possible:
  //   - multiple choice: needs >= 2 distinct values for a field across items
  //     (1 correct + at least 1 distractor; padded/reused if fewer than 3
  //     distinct distractors exist).
  //   - matching: needs >= 2 items sharing a common field label.
  //   - true/false: needs >= 2 items each having >= 1 detail field (true uses
  //     the item's actual value; false swaps in another item's value for the
  //     same field).
  // The three buckets are interleaved (MC, TF, MATCH, MC, TF, MATCH, ...) so
  // the frontend renders a real variety rather than all of one type followed
  // by all of another.
  public func generateQuizContent(items : [LibraryTypes.LibraryItem]) : Types.QuizContent {
    if (items.size() < 2) {
      // Need at least two items to build distractors / swaps.
      return [];
    };

    // --- Build the three buckets independently, then interleave. ---

    // Multiple choice: one question per item (first eligible field). A field
    // is eligible if it has >= 2 distinct values across items so we have at
    // least one distractor. We do NOT require 4 distinct values — that gate
    // starved quizzes of multiple choice when fields were sparse. Distractors
    // are filled from other items' values for the same field; if fewer than 3
    // distinct others exist, we reuse the available ones (still a valid MC
    // question, just with fewer than 4 choices).
    var mcBucket : [Types.Question] = [];
    for (item in items.values()) {
      var made : Bool = false;
      for (d in item.details.values()) {
        if (made) { break };
        let distinct = collectFieldValues(items, d.fieldLabel);
        if (distinct.size() >= 2) {
          let correct = d.value;
          // Distractors: distinct values from other items for the same field,
          // excluding the correct value. Take up to 3.
          var distractors : [Text] = [];
          for ((_, v) in distinct.values()) {
            if (v != correct and distractors.find(func(x) { x == v }) == null) {
              distractors := distractors.concat([v]);
            };
          };
          if (distractors.size() >= 1) {
            let choices = [correct].concat(distractors);
            let prompt = "What " # d.fieldLabel # " does " # item.title # " use?";
            mcBucket := mcBucket.concat([#multipleChoice { prompt; choices; correctIndex = 0 }]);
            made := true;
          };
        };
      };
    };

    // Matching: for each shared field label (>= 2 items have it), build pairs
    // of (itemTitle, fieldValue). Cap at a reasonable number so the quiz does
    // not become all-matching.
    //
    // Dedup guard: every pair in a matching question MUST have a unique
    // fieldValue. If two pairs share the same fieldValue, the frontend
    // soft-locks — once one is used, both read as "used" and the learner can
    // never finish. collectFieldValues already dedupes by value within a
    // field label, but we re-check here so the matching path stays safe even
    // if that helper changes, and so duplicate values are dropped rather than
    // producing an uncompletable question. A field label that yields fewer
    // than 2 unique values is skipped (a 1-pair matching question is trivial
    // and not worth emitting).
    var matchBucket : [Types.Question] = [];
    for (fieldLabel in allFieldLabels(items).values()) {
      let pairs = collectFieldValues(items, fieldLabel);
      var matchPairs : [{ itemTitle : Text; fieldValue : Text }] = [];
      for ((idx, v) in pairs.values()) {
        if (matchPairs.find(func(p) { p.fieldValue == v }) == null) {
          matchPairs := matchPairs.concat([{ itemTitle = items[idx].title; fieldValue = v }]);
        };
      };
      if (matchPairs.size() >= 2) {
        // shuffledOptions: field values in first-seen order (frontend shuffles
        // at render time). Unique by construction thanks to the guard above.
        let shuffledOptions = matchPairs.map(func(p) = p.fieldValue);
        matchBucket := matchBucket.concat([#matching { pairs = matchPairs; shuffledOptions }]);
      };
    };

    // True/false: for each item, for each detail field, emit a true statement
    // (item's actual value) and, if another item has a different value for the
    // same field, a false statement (swapped value). Cap so the quiz stays
    // balanced.
    var tfBucket : [Types.Question] = [];
    for (item in items.values()) {
      for (d in item.details.values()) {
        let distinct = collectFieldValues(items, d.fieldLabel);
        if (distinct.size() >= 2) {
          // True statement: the item's actual value.
          let trueStmt = "The " # item.title # " uses a " # d.value # " for " # d.fieldLabel;
          tfBucket := tfBucket.concat([#trueFalse { statement = trueStmt; isTrue = true }]);
          // False statement: swap in another item's value for the same field.
          switch (distinct.find(func(p) { p.1 != d.value })) {
            case (?(_, swapped)) {
              let falseStmt = "The " # item.title # " uses a " # swapped # " for " # d.fieldLabel;
              tfBucket := tfBucket.concat([#trueFalse { statement = falseStmt; isTrue = false }]);
            };
            case null {};
          };
        };
      };
    };

    // --- Interleave the buckets round-robin so the mix is visible. ---
    // Walk all three buckets in lockstep, taking one question from each in
    // turn (MC, TF, MATCH, MC, TF, MATCH, ...). Buckets that run out early
    // are simply skipped. This guarantees a real variety when data supports
    // more than one type, while gracefully falling back when a type has no
    // questions.
    var questions : [Types.Question] = [];
    var i : Nat = 0;
    let maxLen = mcBucket.size() + tfBucket.size() + matchBucket.size();
    while (questions.size() < maxLen) {
      if (i < mcBucket.size()) {
        questions := questions.concat([mcBucket[i]]);
      };
      if (i < tfBucket.size()) {
        questions := questions.concat([tfBucket[i]]);
      };
      if (i < matchBucket.size()) {
        questions := questions.concat([matchBucket[i]]);
      };
      i := i + 1;
    };

    questions;
  };

  // Generate flashcard content — one flashcard per item. Populates the
  // optional recipe field when item.recipe is non-null (mapping glassware,
  // specs, assembly, garnish into the flashcard recipe shape); emits null for
  // the recipe field when item.recipe is null. detailFields behavior is
  // unchanged — no regression for non-recipe items.
  public func generateFlashcardContent(items : [LibraryTypes.LibraryItem]) : Types.FlashcardContent {
    items.map(func(item) : Types.Flashcard {
      let recipe : ?Types.FlashcardRecipe = switch (item.recipe) {
        case (?r) {
          ?{
            glassware = r.glassware;
            specs = r.specs.map(func(s) = { amount = s.amount; ingredient = s.ingredient });
            assembly = r.assembly;
            garnish = r.garnish;
          };
        };
        case null null;
      };
      {
        itemTitle = item.title;
        itemPhoto = item.photo;
        detailFields = item.details.map(func(d) = { fieldLabel = d.fieldLabel; value = d.value });
        recipe;
      };
    });
  };

  // --- Drinks Builder helpers ---
  // The Drinks Builder game is practice-only with session-only scores. The
  // backend does NOT generate a playable drink pool at build time — it
  // persists the admin's DrinksBuilderSettings as the activity's content, and
  // the playable pool + decoys are derived at play time from the Library.
  // Bulk-mix recipes (non-null yield OR non-empty equipment) are excluded
  // from the playable pool; the global decoy pool is drawn from ALL other
  // in-scope recipes across all categories.

  // Build the DrinksBuilderContent to persist for a #drinksBuilder activity.
  // The settings are admin-provided; this helper just wraps them into the
  // content record the mixin stores on the Activity. No content generation —
  // the playable pool is derived at play time from the Library.
  public func buildDrinksBuilderContent(settings : DrinksBuilderSettings) : Types.DrinksBuilderContent {
    { settings };
  };

  // A Library item is a playable drink when it has a recipe with non-empty
  // specs AND non-empty assembly AND non-empty glassware, AND it is NOT a
  // bulk-mix recipe (yield non-null OR equipment non-empty). Bulk mixes have
  // no glassware/garnish and are excluded from the playable drink pool.
  func isPlayableDrink(item : LibraryTypes.LibraryItem) : Bool {
    switch (item.recipe) {
      case (?r) {
        let hasSpecs = r.specs.size() > 0;
        let hasAssembly = r.assembly.size() > 0;
        let hasGlassware = r.glassware.size() > 0;
        let isBulkMix = switch (r.yield) { case null r.equipment.size() > 0; case (?_) true };
        hasSpecs and hasAssembly and hasGlassware and (not isBulkMix);
      };
      case null false;
    };
  };

  // Apply the admin's includedCategories (empty = all categories) and
  // excludedDrinkTitles filters to an item. includedCategories holds category
  // ids encoded as text (e.g. "12") so the lib helper can match against
  // item.categoryId without a separate categories lookup; empty means all
  // categories are in scope.
  func matchesSettings(
    item : LibraryTypes.LibraryItem,
    settings : DrinksBuilderSettings,
  ) : Bool {
    // excludedDrinkTitles: drop the item if its title is in the list.
    let excluded = settings.excludedDrinkTitles.vals().find(func(t) { t == item.title }) != null;
    if (excluded) { return false };
    // includedCategories: empty = all categories; otherwise the item's
    // category id (as text) must be in the list.
    if (settings.includedCategories.size() == 0) { return true };
    let idText = item.categoryId.toText();
    settings.includedCategories.vals().find(func(c) { c == idText }) != null;
  };

  // Resolve the playable drink pool for a #drinksBuilder activity at play
  // time. Reads the Library items, applies includedCategories (empty = all)
  // and excludedDrinkTitles, and excludes bulk-mix recipes (non-null yield OR
  // non-empty equipment). Returns the in-scope Library items the learner can
  // be quizzed on.
  public func resolvePlayableDrinks(
    items : List.List<LibraryTypes.LibraryItem>,
    settings : DrinksBuilderSettings,
  ) : [LibraryTypes.LibraryItem] {
    items
      .filter(func(item) {
        isPlayableDrink(item) and matchesSettings(item, settings);
      })
      .toArray();
  };

  // Resolve the global decoy pool for a #drinksBuilder activity at play
  // time. Returns ALL in-scope recipes (the global decoy pool) using the same
  // filtering as resolvePlayableDrinks — the frontend draws per-drink decoys
  // from this pool, excluding the drink currently being quizzed on. Same
  // filtering keeps the decoy pool in sync with the playable pool as the
  // Library changes.
  public func resolveDecoyPool(
    items : List.List<LibraryTypes.LibraryItem>,
    settings : DrinksBuilderSettings,
  ) : [LibraryTypes.LibraryItem] {
    items
      .filter(func(item) {
        isPlayableDrink(item) and matchesSettings(item, settings);
      })
      .toArray();
  };
};
