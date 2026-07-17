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
module {
  public type Activity = Types.Activity;
  public type ActivityType = Types.ActivityType;
  public type ActivityContent = Types.ActivityContent;
  public type BuildActivityInput = Types.BuildActivityInput;
  public type UpdateActivityInput = Types.UpdateActivityInput;

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
  public func updateActivity(
    activities : List.List<Activity>,
    id : Nat,
    newName : Text,
    newSourceCategoryIds : [Nat],
  ) : Activity {
    switch (activities.find(func(a) { a.id == id })) {
      case (?existing) {
        let updated : Activity = {
          existing with
          name = newName;
          sourceCategoryIds = newSourceCategoryIds;
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
    var matchBucket : [Types.Question] = [];
    for (fieldLabel in allFieldLabels(items).values()) {
      let pairs = collectFieldValues(items, fieldLabel);
      if (pairs.size() >= 2) {
        var matchPairs : [{ itemTitle : Text; fieldValue : Text }] = [];
        for ((idx, v) in pairs.values()) {
          matchPairs := matchPairs.concat([{ itemTitle = items[idx].title; fieldValue = v }]);
        };
        // shuffledOptions: field values in first-seen order (frontend shuffles
        // at render time).
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

  // Generate flashcard content — one flashcard per item.
  public func generateFlashcardContent(items : [LibraryTypes.LibraryItem]) : Types.FlashcardContent {
    items.map(func(item) {
      {
        itemTitle = item.title;
        itemPhoto = item.photo;
        detailFields = item.details.map(func(d) = { fieldLabel = d.fieldLabel; value = d.value });
      };
    });
  };
};
