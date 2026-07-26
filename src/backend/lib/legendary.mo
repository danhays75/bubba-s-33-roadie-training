import Array "mo:core/Array";
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
// derived at play time from the Library.
module {
  public type Activity = Types.Activity;
  public type ActivityType = Types.ActivityType;
  public type ActivityContent = Types.ActivityContent;
  public type BuildActivityInput = Types.BuildActivityInput;
  public type UpdateActivityInput = Types.UpdateActivityInput;
  public type DrinksBuilderSettings = Types.DrinksBuilderSettings;
  public type DrinksBuilderContent = Types.DrinksBuilderContent;
  public type QuizSettings = Types.QuizSettings;

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
  // mixin from the source items. `quizSettings` is the admin's per-quiz
  // question-type selection (which of #multipleChoice / #trueFalse / #matching
  // the generator emits); null means all-three-on (the default, backward
  // compatible with quizzes generated before this field existed). Ignored for
  // #flashcards and #drinksBuilder activities (the mixin passes null for
  // those).
  public func createActivity(
    activities : List.List<Activity>,
    nextId : { var value : Nat },
    positionId : Nat,
    activityType : ActivityType,
    name : Text,
    sourceCategoryIds : [Nat],
    content : ActivityContent,
    quizSettings : ?QuizSettings,
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
      quizSettings;
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
  // `newQuizSettings` carries the admin's question-type selection for #quiz
  // activities. null means "leave the existing quizSettings unchanged" (so an
  // admin editing only the name does not silently reset the question-type
  // selection); non-null replaces the stored selection. Ignored for
  // #flashcards and #drinksBuilder activities (the mixin passes null for
  // those, preserving the existing null).
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
    newQuizSettings : ?QuizSettings,
  ) : Activity {
    switch (activities.find(func(a) { a.id == id })) {
      case (?existing) {
        // null = keep existing quizSettings; non-null = replace.
        let resolvedQuizSettings : ?QuizSettings = switch (newQuizSettings) {
          case (?qs) ?qs;
          case null existing.quizSettings;
        };
        let updated : Activity = {
          existing with
          name = newName;
          sourceCategoryIds = newSourceCategoryIds;
          content = newContent;
          quizSettings = resolvedQuizSettings;
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

  // Resolve the effective QuizSettings: null means all-three-on (the default,
  // backward compatible with quizzes generated before this field existed).
  func resolveQuizSettings(settings : ?QuizSettings) : QuizSettings {
    switch (settings) {
      case (?qs) qs;
      case null { { includeMultipleChoice = true; includeTrueFalse = true; includeMatching = true } };
    };
  };

  // --- Recipe-field quiz generation ---
  // The primary quiz path: read item.recipe structured fields (glassware,
  // specs/ingredients, assembly, garnish, variants) and build MC / TF /
  // matching questions from them. Distractors and false-statement swaps are
  // drawn from OTHER recipes in the same source set so wrong answers are
  // plausible (e.g. a wrong glass is a real glass from a sibling recipe).
  //
  // Items without a recipe are skipped here — they fall through to the
  // detail-text fallback path so non-drink categories keep working.
  //
  // All helpers are deterministic (no randomness source); ordering is driven
  // by item index and field order so an admin regenerating the same activity
  // gets the same content.

  // Collect distinct glassware strings across the recipe items, preserving
  // first-seen order. Returns (itemIndex, glassware) pairs.
  func collectGlassware(items : [LibraryTypes.LibraryItem]) : [(Nat, Text)] {
    var pairs : [(Nat, Text)] = [];
    var seen : [Text] = [];
    for ((index, item) in items.enumerate()) {
      switch (item.recipe) {
        case (?r) {
          if (r.glassware.size() > 0) {
            if (seen.find(func(v) { v == r.glassware }) == null) {
              seen := seen.concat([r.glassware]);
              pairs := pairs.concat([(index, r.glassware)]);
            };
          };
        };
        case null {};
      };
    };
    pairs;
  };

  // Collect distinct garnish strings across the recipe items. A recipe may
  // carry more than one garnish; each distinct garnish string is one entry.
  func collectGarnishes(items : [LibraryTypes.LibraryItem]) : [(Nat, Text)] {
    var pairs : [(Nat, Text)] = [];
    var seen : [Text] = [];
    for ((index, item) in items.enumerate()) {
      switch (item.recipe) {
        case (?r) {
          for (g in r.garnish.values()) {
            if (g.size() > 0 and seen.find(func(v) { v == g }) == null) {
              seen := seen.concat([g]);
              pairs := pairs.concat([(index, g)]);
            };
          };
        };
        case null {};
      };
    };
    pairs;
  };

  // Collect distinct ingredient names across the recipe items' specs.
  // Returns (itemIndex, ingredient) pairs.
  func collectIngredients(items : [LibraryTypes.LibraryItem]) : [(Nat, Text)] {
    var pairs : [(Nat, Text)] = [];
    var seen : [Text] = [];
    for ((index, item) in items.enumerate()) {
      switch (item.recipe) {
        case (?r) {
          for (s in r.specs.values()) {
            if (s.ingredient.size() > 0 and seen.find(func(v) { v == s.ingredient }) == null) {
              seen := seen.concat([s.ingredient]);
              pairs := pairs.concat([(index, s.ingredient)]);
            };
          };
        };
        case null {};
      };
    };
    pairs;
  };

  // Collect distinct upsell ingredient names across the recipe items' specs
  // (only specs where upsell=true). Returns (itemIndex, ingredient) pairs.
  func collectUpsellIngredients(items : [LibraryTypes.LibraryItem]) : [(Nat, Text)] {
    var pairs : [(Nat, Text)] = [];
    var seen : [Text] = [];
    for ((index, item) in items.enumerate()) {
      switch (item.recipe) {
        case (?r) {
          for (s in r.specs.values()) {
            if (s.upsell and s.ingredient.size() > 0 and seen.find(func(v) { v == s.ingredient }) == null) {
              seen := seen.concat([s.ingredient]);
              pairs := pairs.concat([(index, s.ingredient)]);
            };
          };
        };
        case null {};
      };
    };
    pairs;
  };

  // Collect distinct variant labels across the recipe items. Returns
  // (itemIndex, variantLabel) pairs.
  func collectVariantLabels(items : [LibraryTypes.LibraryItem]) : [(Nat, Text)] {
    var pairs : [(Nat, Text)] = [];
    var seen : [Text] = [];
    for ((index, item) in items.enumerate()) {
      switch (item.recipe) {
        case (?r) {
          for (v in r.variants.values()) {
            if (v.variantLabel.size() > 0 and seen.find(func(l) { l == v.variantLabel }) == null) {
              seen := seen.concat([v.variantLabel]);
              pairs := pairs.concat([(index, v.variantLabel)]);
            };
          };
        };
        case null {};
      };
    };
    pairs;
  };

  // Build a list of distractor strings for a given correct value, drawn from
  // the supplied pool (a list of (itemIndex, value) pairs) excluding the
  // correct value and the correct item's own values. Returns up to `max`
  // distractors. Distractors are unique and never equal the correct value.
  func buildDistractors(pool : [(Nat, Text)], correctItemIndex : Nat, correctValue : Text, max : Nat) : [Text] {
    var distractors : [Text] = [];
    for ((idx, v) in pool.values()) {
      if (distractors.size() >= max) { break };
      // Skip the correct value itself and any value from the correct item
      // (so a recipe with two garnishes does not use its own other garnish
      // as a distractor for the first).
      if (v != correctValue and idx != correctItemIndex) {
        if (distractors.find(func(x) { x == v }) == null) {
          distractors := distractors.concat([v]);
        };
      };
    };
    distractors;
  };

  // Build a single multiple-choice question. Returns null when there are not
  // enough distractors (need at least 1).
  func buildMC(prompt : Text, correct : Text, distractors : [Text]) : ?Types.Question {
    if (distractors.size() < 1) { return null };
    let choices = [correct].concat(distractors);
    ?#multipleChoice { prompt; choices; correctIndex = 0 };
  };

  // Generate the recipe-field multiple-choice bucket. One question per
  // eligible (item, field) pair, drawing distractors from sibling recipes.
  func generateRecipeMC(items : [LibraryTypes.LibraryItem]) : [Types.Question] {
    var bucket : [Types.Question] = [];
    let glasswarePool = collectGlassware(items);
    let garnishPool = collectGarnishes(items);
    let ingredientPool = collectIngredients(items);
    let upsellPool = collectUpsellIngredients(items);
    let variantPool = collectVariantLabels(items);

    for ((index, item) in items.enumerate()) {
      switch (item.recipe) {
        case (?r) {
          // Glassware: "What glass does the [recipe] use?"
          if (r.glassware.size() > 0 and glasswarePool.size() >= 2) {
            let distractors = buildDistractors(glasswarePool, index, r.glassware, 3);
            switch (buildMC("What glass does the " # item.title # " use?", r.glassware, distractors)) {
              case (?q) { bucket := bucket.concat([q]) };
              case null {};
            };
          };

          // Ingredient: "Which ingredient is in the [recipe]?" — use the
          // first spec's ingredient as the correct answer.
          if (r.specs.size() > 0 and ingredientPool.size() >= 2) {
            let correct = r.specs[0].ingredient;
            if (correct.size() > 0) {
              let distractors = buildDistractors(ingredientPool, index, correct, 3);
              switch (buildMC("Which ingredient is in the " # item.title # "?", correct, distractors)) {
                case (?q) { bucket := bucket.concat([q]) };
                case null {};
              };
            };
          };

          // Garnish: "What garnish does the [recipe] use?" — one question
          // per distinct garnish on the recipe.
          if (r.garnish.size() > 0 and garnishPool.size() >= 2) {
            for (g in r.garnish.values()) {
              if (g.size() > 0) {
                let distractors = buildDistractors(garnishPool, index, g, 3);
                switch (buildMC("What garnish does the " # item.title # " use?", g, distractors)) {
                  case (?q) { bucket := bucket.concat([q]) };
                  case null {};
                };
              };
            };
          };

          // Upsell: "Which ingredient is the upsell in the [recipe]?" — only
          // for ingredients tagged upsell=true. Distractors are other upsell
          // ingredients from sibling recipes (plausible premium-liquor wrong
          // answers). Degrades gracefully: no upsell ingredients means no
          // upsell questions.
          if (upsellPool.size() >= 2) {
            for (s in r.specs.values()) {
              if (s.upsell and s.ingredient.size() > 0) {
                let distractors = buildDistractors(upsellPool, index, s.ingredient, 3);
                switch (buildMC("Which ingredient is the upsell in the " # item.title # "?", s.ingredient, distractors)) {
                  case (?q) { bucket := bucket.concat([q]) };
                  case null {};
                };
              };
            };
          };

          // Variants: "Which variant of the [recipe] uses [variantLabel]?"
          // — alternate question source. The correct answer is the variant
          // label; distractors are other variant labels from sibling
          // recipes.
          if (r.variants.size() > 0 and variantPool.size() >= 2) {
            for (v in r.variants.values()) {
              if (v.variantLabel.size() > 0) {
                let distractors = buildDistractors(variantPool, index, v.variantLabel, 3);
                switch (buildMC("Which variant of the " # item.title # " uses " # v.variantLabel # "?", v.variantLabel, distractors)) {
                  case (?q) { bucket := bucket.concat([q]) };
                  case null {};
                };
              };
            };
          };
        };
        case null {};
      };
    };
    bucket;
  };

  // Generate the recipe-field true/false bucket. True statements are built
  // from real recipe facts; false statements swap in an incorrect value
  // drawn from a sibling recipe.
  func generateRecipeTF(items : [LibraryTypes.LibraryItem]) : [Types.Question] {
    var bucket : [Types.Question] = [];
    let glasswarePool = collectGlassware(items);
    let garnishPool = collectGarnishes(items);
    let upsellPool = collectUpsellIngredients(items);

    for ((index, item) in items.enumerate()) {
      switch (item.recipe) {
        case (?r) {
          // Glassware true/false: "The [recipe] is served in a [glass]."
          if (r.glassware.size() > 0 and glasswarePool.size() >= 2) {
            let trueStmt = "The " # item.title # " is served in a " # r.glassware # ".";
            bucket := bucket.concat([#trueFalse { statement = trueStmt; isTrue = true }]);
            // False variant: swap in another recipe's glass.
            let distractors = buildDistractors(glasswarePool, index, r.glassware, 1);
            switch (distractors.size()) {
              case 0 {};
              case _ {
                let falseStmt = "The " # item.title # " is served in a " # distractors[0] # ".";
                bucket := bucket.concat([#trueFalse { statement = falseStmt; isTrue = false }]);
              };
            };
          };

          // Garnish true/false: "The [recipe] uses a [garnish] as garnish."
          if (r.garnish.size() > 0 and garnishPool.size() >= 2) {
            let g = r.garnish[0];
            if (g.size() > 0) {
              let trueStmt = "The " # item.title # " uses a " # g # " as garnish.";
              bucket := bucket.concat([#trueFalse { statement = trueStmt; isTrue = true }]);
              let distractors = buildDistractors(garnishPool, index, g, 1);
              switch (distractors.size()) {
                case 0 {};
                case _ {
                  let falseStmt = "The " # item.title # " uses a " # distractors[0] # " as garnish.";
                  bucket := bucket.concat([#trueFalse { statement = falseStmt; isTrue = false }]);
                };
              };
            };
          };

          // Upsell true/false: "The upsell in the [recipe] is [ingredient]."
          // — only for ingredients tagged upsell=true. False variant swaps in
          // another recipe's upsell ingredient.
          if (upsellPool.size() >= 2) {
            for (s in r.specs.values()) {
              if (s.upsell and s.ingredient.size() > 0) {
                let trueStmt = "The upsell in the " # item.title # " is " # s.ingredient # ".";
                bucket := bucket.concat([#trueFalse { statement = trueStmt; isTrue = true }]);
                let distractors = buildDistractors(upsellPool, index, s.ingredient, 1);
                switch (distractors.size()) {
                  case 0 {};
                  case _ {
                    let falseStmt = "The upsell in the " # item.title # " is " # distractors[0] # ".";
                    bucket := bucket.concat([#trueFalse { statement = falseStmt; isTrue = false }]);
                  };
                };
              };
            };
          };
        };
        case null {};
      };
    };
    bucket;
  };

  // Generate the recipe-field matching bucket. Pair shapes:
  //   - recipe-name to glassware
  //   - recipe-name to garnish (first garnish)
  //   - recipe-name to first ingredient (ingredient-to-recipe matching)
  //   - recipe-name to its upsell ingredient (only recipes with an upsell)
  //   - recipe-name to variant label
  // Each matching question needs >= 2 unique pairs (a 1-pair matching
  // question is trivial). The dedup guard on fieldValue prevents the
  // frontend soft-lock where two pairs share a fieldValue.
  func generateRecipeMatching(items : [LibraryTypes.LibraryItem]) : [Types.Question] {
    var bucket : [Types.Question] = [];

    // recipe-name -> glassware
    var glassPairs : [{ itemTitle : Text; fieldValue : Text }] = [];
    for (item in items.values()) {
      switch (item.recipe) {
        case (?r) {
          if (r.glassware.size() > 0) {
            if (glassPairs.find(func(p) { p.fieldValue == r.glassware }) == null) {
              glassPairs := glassPairs.concat([{ itemTitle = item.title; fieldValue = r.glassware }]);
            };
          };
        };
        case null {};
      };
    };
    if (glassPairs.size() >= 2) {
      let shuffledOptions = glassPairs.map(func(p) = p.fieldValue);
      bucket := bucket.concat([#matching { pairs = glassPairs; shuffledOptions }]);
    };

    // recipe-name -> garnish (first garnish per recipe)
    var garnishPairs : [{ itemTitle : Text; fieldValue : Text }] = [];
    for (item in items.values()) {
      switch (item.recipe) {
        case (?r) {
          if (r.garnish.size() > 0 and r.garnish[0].size() > 0) {
            let g = r.garnish[0];
            if (garnishPairs.find(func(p) { p.fieldValue == g }) == null) {
              garnishPairs := garnishPairs.concat([{ itemTitle = item.title; fieldValue = g }]);
            };
          };
        };
        case null {};
      };
    };
    if (garnishPairs.size() >= 2) {
      let shuffledOptions = garnishPairs.map(func(p) = p.fieldValue);
      bucket := bucket.concat([#matching { pairs = garnishPairs; shuffledOptions }]);
    };

    // recipe-name -> first ingredient (ingredient-to-recipe matching).
    var ingredientPairs : [{ itemTitle : Text; fieldValue : Text }] = [];
    for (item in items.values()) {
      switch (item.recipe) {
        case (?r) {
          if (r.specs.size() > 0 and r.specs[0].ingredient.size() > 0) {
            let ing = r.specs[0].ingredient;
            if (ingredientPairs.find(func(p) { p.fieldValue == ing }) == null) {
              ingredientPairs := ingredientPairs.concat([{ itemTitle = item.title; fieldValue = ing }]);
            };
          };
        };
        case null {};
      };
    };
    if (ingredientPairs.size() >= 2) {
      let shuffledOptions = ingredientPairs.map(func(p) = p.fieldValue);
      bucket := bucket.concat([#matching { pairs = ingredientPairs; shuffledOptions }]);
    };

    // recipe-name -> upsell ingredient (only recipes with an upsell spec).
    // Degrades gracefully: no upsell ingredients means no upsell matching.
    var upsellPairs : [{ itemTitle : Text; fieldValue : Text }] = [];
    for (item in items.values()) {
      switch (item.recipe) {
        case (?r) {
          switch (r.specs.find(func(s) { s.upsell and s.ingredient.size() > 0 })) {
            case (?s) {
              if (upsellPairs.find(func(p) { p.fieldValue == s.ingredient }) == null) {
                upsellPairs := upsellPairs.concat([{ itemTitle = item.title; fieldValue = s.ingredient }]);
              };
            };
            case null {};
          };
        };
        case null {};
      };
    };
    if (upsellPairs.size() >= 2) {
      let shuffledOptions = upsellPairs.map(func(p) = p.fieldValue);
      bucket := bucket.concat([#matching { pairs = upsellPairs; shuffledOptions }]);
    };

    // recipe-name -> variant label. Dedup on variantLabel so the frontend
    // does not soft-lock on duplicate fieldValues.
    var variantPairs : [{ itemTitle : Text; fieldValue : Text }] = [];
    for (item in items.values()) {
      switch (item.recipe) {
        case (?r) {
          for (v in r.variants.values()) {
            if (v.variantLabel.size() > 0) {
              if (variantPairs.find(func(p) { p.fieldValue == v.variantLabel }) == null) {
                variantPairs := variantPairs.concat([{ itemTitle = item.title; fieldValue = v.variantLabel }]);
              };
            };
          };
        };
        case null {};
      };
    };
    if (variantPairs.size() >= 2) {
      let shuffledOptions = variantPairs.map(func(p) = p.fieldValue);
      bucket := bucket.concat([#matching { pairs = variantPairs; shuffledOptions }]);
    };

    bucket;
  };

  // --- Detail-text fallback path ---
  // For items without a recipe (non-drink categories), generate quiz content
  // from the generic detail fields exactly as the previous implementation
  // did. This preserves the existing behavior for non-recipe items so the
  // rework does not regress non-drink categories.

  func generateDetailMC(items : [LibraryTypes.LibraryItem]) : [Types.Question] {
    var mcBucket : [Types.Question] = [];
    for (item in items.values()) {
      var made : Bool = false;
      for (d in item.details.values()) {
        if (made) { break };
        let distinct = collectFieldValues(items, d.fieldLabel);
        if (distinct.size() >= 2) {
          let correct = d.value;
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
    mcBucket;
  };

  func generateDetailMatching(items : [LibraryTypes.LibraryItem]) : [Types.Question] {
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
        let shuffledOptions = matchPairs.map(func(p) = p.fieldValue);
        matchBucket := matchBucket.concat([#matching { pairs = matchPairs; shuffledOptions }]);
      };
    };
    matchBucket;
  };

  func generateDetailTF(items : [LibraryTypes.LibraryItem]) : [Types.Question] {
    var tfBucket : [Types.Question] = [];
    for (item in items.values()) {
      for (d in item.details.values()) {
        let distinct = collectFieldValues(items, d.fieldLabel);
        if (distinct.size() >= 2) {
          let trueStmt = "The " # item.title # " uses a " # d.value # " for " # d.fieldLabel;
          tfBucket := tfBucket.concat([#trueFalse { statement = trueStmt; isTrue = true }]);
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
    tfBucket;
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
  public func generateQuizContent(items : [LibraryTypes.LibraryItem], quizSettings : ?QuizSettings) : Types.QuizContent {
    if (items.size() < 2) {
      // Need at least two items to build distractors / swaps.
      return [];
    };

    let settings = resolveQuizSettings(quizSettings);

    // Split items into recipe items (drink recipes) and non-recipe items
    // (non-drink categories). Recipe items go through the recipe-field path;
    // non-recipe items go through the detail-text fallback.
    var recipeItems : [LibraryTypes.LibraryItem] = [];
    var detailItems : [LibraryTypes.LibraryItem] = [];
    for (item in items.values()) {
      switch (item.recipe) {
        case (?_) { recipeItems := recipeItems.concat([item]) };
        case null { detailItems := detailItems.concat([item]) };
      };
    };

    // --- Build the three buckets independently, then interleave. ---
    var mcBucket : [Types.Question] = [];
    var tfBucket : [Types.Question] = [];
    var matchBucket : [Types.Question] = [];

    if (settings.includeMultipleChoice) {
      if (recipeItems.size() >= 2) {
        mcBucket := mcBucket.concat(generateRecipeMC(recipeItems));
      };
      if (detailItems.size() >= 2) {
        mcBucket := mcBucket.concat(generateDetailMC(detailItems));
      };
    };

    if (settings.includeTrueFalse) {
      if (recipeItems.size() >= 2) {
        tfBucket := tfBucket.concat(generateRecipeTF(recipeItems));
      };
      if (detailItems.size() >= 2) {
        tfBucket := tfBucket.concat(generateDetailTF(detailItems));
      };
    };

    if (settings.includeMatching) {
      if (recipeItems.size() >= 2) {
        matchBucket := matchBucket.concat(generateRecipeMatching(recipeItems));
      };
      if (detailItems.size() >= 2) {
        matchBucket := matchBucket.concat(generateDetailMatching(detailItems));
      };
    };

    // --- Interleave the buckets round-robin so the mix is visible. ---
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
  //
  // The four prompt lists (glasswarePrompts / specsPrompts /
  // assemblyPrompts / garnishPrompts) are capped to their first 8 entries
  // before being stored — see capDrinksBuilderPrompts. Longer lists are
  // silently truncated, never rejected.
  public func buildDrinksBuilderContent(settings : DrinksBuilderSettings) : Types.DrinksBuilderContent {
    { settings = capDrinksBuilderPrompts(settings) };
  };

  // Cap each of the four DrinksBuilderSettings prompt lists to its first 8
  // entries. Returns a new DrinksBuilderSettings record with the truncated
  // lists; all other fields are carried forward verbatim via record spread.
  // Used wherever DrinksBuilderSettings is constructed or updated from admin
  // input (build / update / rebuild paths) so the persisted lists never
  // exceed 8 entries. Silently truncates — does not reject longer lists.
  public func capDrinksBuilderPrompts(settings : DrinksBuilderSettings) : DrinksBuilderSettings {
    { settings with
      glasswarePrompts = capPromptList(settings.glasswarePrompts);
      specsPrompts = capPromptList(settings.specsPrompts);
      assemblyPrompts = capPromptList(settings.assemblyPrompts);
      garnishPrompts = capPromptList(settings.garnishPrompts);
    };
  };

  // Truncate a prompt list to its first 8 entries. Returns the same array
  // reference when it is already within the cap (no allocation); otherwise
  // returns a new array containing only the first 8 entries.
  func capPromptList(prompts : [Text]) : [Text] {
    if (prompts.size() <= 8) { return prompts };
    prompts.sliceToArray(0, 8);
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
