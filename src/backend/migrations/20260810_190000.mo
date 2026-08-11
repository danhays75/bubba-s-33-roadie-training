import Map "mo:core/Map";
import List "mo:core/List";
import Principal "mo:core/Principal";
import Set "mo:core/Set";
import Text "mo:core/Text";
import Char "mo:core/Char";

module {
  // Twenty-second migration: repair missing degree symbols (°, U+00B0) in
  // recipe temperature text across every free-text field of every LibraryItem.
  //
  // The user reports that recipe temperatures are frequently written as
  // "325 F", "<40 F", ">=165 F", "145F" etc. — the degree symbol is missing
  // before the F/C unit. This migration walks every LibraryItem in the items
  // list and applies `fixTemps` to every free-text field (title, subtitle,
  // notes, tags, details, and every text field of the nested beverage Recipe
  // and food FoodRecipe when present), inserting ° where a temperature value
  // is followed by F or C without an existing degree symbol.
  //
  // This migration does NOT change the type shape — OldRecipe/NewRecipe,
  // OldFoodRecipe/NewFoodRecipe, OldLibraryItem/NewLibraryItem etc. are
  // structurally identical to the current types. The Old*/New* type aliases
  // and the full stable-signature OldActor/NewActor mirror are still
  // required by the migration framework; the types are identical because the
  // only change is TEXT CONTENT inside existing fields.
  //
  // The items List is invariant in its element type, so it must be rebuilt
  // even though the element type is unchanged — each OldLibraryItem is mapped
  // to a NewLibraryItem with fixTemps applied to every free-text field. No
  // data is lost — every field is carried forward; only text content is
  // normalized. Categories and all other stable state are carried forward
  // UNCHANGED (this migration touches only item text fields).
  //
  // OldActor mirrors the NewActor of the preceding migration
  // (20260810_180000.mo) — the previously deployed stable signature, where
  // Recipe already has the `buildAudio` field. The NewActor inlines the same
  // shape (no type change). Every stable field is carried forward verbatim
  // except `items`, which is rebuilt with fixTemps applied to item text.

  // UserRole mirrors mo:caffeineai-authorization/access-control.AccessControl.UserRole
  type UserRole = {
    #admin;
    #user;
    #guest;
  };

  // AccessControlState mirrors mo:caffeineai-authorization/access-control.AccessControl.AccessControlState
  type AccessControlState = {
    var adminAssigned : Bool;
    userRoles : Map.Map<Principal, UserRole>;
  };

  // Role mirrors src/backend/types/foundation.mo Role
  type Role = {
    #trainee;
    #trainer;
    #manager;
    #admin;
  };

  // ApprovalStatus mirrors src/backend/types/foundation.mo ApprovalStatus
  type ApprovalStatus = {
    #pending;
    #approved;
    #rejected;
  };

  // UserProfile mirrors src/backend/types/foundation.mo UserProfile. Carried
  // forward verbatim — unchanged by this migration.
  type UserProfile = {
    id : Principal;
    name : Text;
    storeLocation : Text;
    role : Role;
    approvalStatus : ApprovalStatus;
    email : ?Text;
    photo : ?Text;
  };

  // LayoutStyle mirrors src/backend/types/foundation.mo LayoutStyle (the
  // three-tag shape from the preceding migration, WITH #kitchen). Carried
  // forward verbatim — unchanged by this migration.
  type LayoutStyle = {
    #library;
    #orientation;
    #kitchen;
  };

  // Position mirrors src/backend/types/foundation.mo Position (layoutStyle uses
  // the three-tag LayoutStyle). Carried forward verbatim — unchanged by this
  // migration.
  type Position = {
    id : Nat;
    name : Text;
    description : ?Text;
    coverPhoto : ?Text;
    sortOrder : Nat;
    layoutStyle : LayoutStyle;
  };

  // AssignmentStatus mirrors src/backend/types/foundation.mo AssignmentStatus
  type AssignmentStatus = {
    #inTraining;
    #certified;
  };

  // PositionAssignment mirrors src/backend/types/foundation.mo PositionAssignment
  type PositionAssignment = {
    userId : Principal;
    positionId : Nat;
    status : AssignmentStatus;
  };

  // DetailField mirrors src/backend/types/library.mo DetailField
  type DetailField = {
    fieldLabel : Text;
    value : Text;
  };

  // Category mirrors src/backend/types/library.mo Category (the six-field
  // shape WITH accentColor, from the preceding migration). Carried forward
  // verbatim — unchanged by this migration.
  type Category = {
    id : Nat;
    positionId : Nat;
    name : Text;
    coverPhoto : ?Text;
    sortOrder : Nat;
    accentColor : ?Text;
  };

  // RecipeSpec mirrors src/backend/types/library.mo RecipeSpec (with upsell).
  // Carried forward verbatim — only the text fields (amount, ingredient) are
  // normalized by fixTemps; upsell is a Bool and is never touched.
  type RecipeSpec = {
    amount : Text;
    ingredient : Text;
    upsell : Bool;
  };

  // RecipeVariant mirrors src/backend/types/library.mo RecipeVariant. Carried
  // forward verbatim — only the text fields are normalized by fixTemps.
  type RecipeVariant = {
    variantLabel : Text;
    specs : [RecipeSpec];
    assembly : [Text];
  };

  // OldRecipe mirrors the PRE-migration Recipe shape (the eleven-field shape
  // with recapAudio and buildAudio from the preceding migration). Identical to
  // NewRecipe — this migration changes only text content, not the type shape.
  type OldRecipe = {
    glassware : Text;
    specs : [RecipeSpec];
    assembly : [Text];
    garnish : [Text];
    variants : [RecipeVariant];
    equipment : [Text];
    yield : ?Text;
    shelfLife : ?Text;
    qualityIdentifier : [Text];
    recapAudio : ?Text;
    buildAudio : ?Text;
  };

  // NewRecipe mirrors the POST-migration Recipe shape — structurally
  // identical to OldRecipe (no type change). Only text content is normalized.
  type NewRecipe = {
    glassware : Text;
    specs : [RecipeSpec];
    assembly : [Text];
    garnish : [Text];
    variants : [RecipeVariant];
    equipment : [Text];
    yield : ?Text;
    shelfLife : ?Text;
    qualityIdentifier : [Text];
    recapAudio : ?Text;
    buildAudio : ?Text;
  };

  // FoodRecipeKind mirrors src/backend/types/library.mo FoodRecipeKind.
  // Carried forward verbatim — a variant, never touched by fixTemps.
  type FoodRecipeKind = {
    #menuBuild;
    #prep;
  };

  // FoodComponent mirrors src/backend/types/library.mo FoodComponent. Carried
  // forward verbatim — only the text fields (item, amount, note) are
  // normalized by fixTemps; group is carried forward unchanged (it is a
  // grouping label, not a temperature field, but fixTemps is harmless on it
  // per the spec which lists components.item/amount/note but NOT group — so
  // group is carried forward verbatim, not fixed).
  type FoodComponent = {
    item : Text;
    amount : Text;
    group : ?Text;
    note : ?Text;
  };

  // FoodServiceware mirrors src/backend/types/library.mo FoodServiceware.
  // Carried forward verbatim — only the text fields (item, amount) are
  // normalized by fixTemps.
  type FoodServiceware = {
    item : Text;
    amount : Text;
  };

  // OldFoodRecipe mirrors the PRE-migration FoodRecipe shape. Identical to
  // NewFoodRecipe — this migration changes only text content, not the type
  // shape.
  type OldFoodRecipe = {
    station : Text;
    kind : FoodRecipeKind;
    menuSection : ?Text;
    serviceware : [FoodServiceware];
    components : [FoodComponent];
    steps : [Text];
    expoSteps : [Text];
    allergenNote : ?Text;
    yieldText : ?Text;
    shelfLife : ?Text;
    holdTemp : ?Text;
    storeTemp : ?Text;
    lineUtensil : ?Text;
    equipment : ?Text;
    qualityIdentifiers : [Text];
  };

  // NewFoodRecipe mirrors the POST-migration FoodRecipe shape — structurally
  // identical to OldFoodRecipe (no type change). Only text content is
  // normalized.
  type NewFoodRecipe = {
    station : Text;
    kind : FoodRecipeKind;
    menuSection : ?Text;
    serviceware : [FoodServiceware];
    components : [FoodComponent];
    steps : [Text];
    expoSteps : [Text];
    allergenNote : ?Text;
    yieldText : ?Text;
    shelfLife : ?Text;
    holdTemp : ?Text;
    storeTemp : ?Text;
    lineUtensil : ?Text;
    equipment : ?Text;
    qualityIdentifiers : [Text];
  };

  // OldLibraryItem mirrors src/backend/types/library.mo LibraryItem (the
  // eleven-field shape), where the nested ?Recipe uses OldRecipe and the
  // nested ?FoodRecipe uses OldFoodRecipe. Identical in shape to
  // NewLibraryItem.
  type OldLibraryItem = {
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
    recipe : ?OldRecipe;
    foodRecipe : ?OldFoodRecipe;
  };

  // NewLibraryItem mirrors src/backend/types/library.mo LibraryItem (the
  // eleven-field shape), where the nested ?Recipe uses NewRecipe and the
  // nested ?FoodRecipe uses NewFoodRecipe. Identical in shape to
  // OldLibraryItem.
  type NewLibraryItem = {
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
    recipe : ?NewRecipe;
    foodRecipe : ?NewFoodRecipe;
  };

  // Phase mirrors src/backend/types/nso.mo Phase
  type Phase = {
    id : Nat;
    name : Text;
    sortOrder : Nat;
  };

  // Task mirrors src/backend/types/nso.mo Task
  type Task = {
    id : Nat;
    phaseId : Nat;
    text : Text;
    section : ?Text;
    done : Bool;
    assignedTo : ?Principal;
    completionDate : ?Text;
    notes : ?Text;
    sortOrder : Nat;
  };

  // Question mirrors src/backend/types/legendary.mo Question
  type Question = {
    #multipleChoice : {
      prompt : Text;
      choices : [Text];
      correctIndex : Nat;
    };
    #matching : {
      pairs : [{ itemTitle : Text; fieldValue : Text }];
      shuffledOptions : [Text];
    };
    #trueFalse : {
      statement : Text;
      isTrue : Bool;
    };
  };

  // QuizContent mirrors src/backend/types/legendary.mo QuizContent
  type QuizContent = [Question];

  // FlashcardRecipe mirrors src/backend/types/legendary.mo FlashcardRecipe
  type FlashcardRecipe = {
    glassware : Text;
    specs : [{ amount : Text; ingredient : Text }];
    assembly : [Text];
    garnish : [Text];
  };

  // Flashcard mirrors src/backend/types/legendary.mo Flashcard
  type Flashcard = {
    itemTitle : Text;
    itemPhoto : ?Text;
    detailFields : [{ fieldLabel : Text; value : Text }];
    recipe : ?FlashcardRecipe;
  };

  // FlashcardContent mirrors src/backend/types/legendary.mo FlashcardContent
  type FlashcardContent = [Flashcard];

  // ActivityType mirrors src/backend/types/legendary.mo ActivityType
  type ActivityType = {
    #quiz;
    #flashcards;
    #drinksBuilder;
  };

  // DrinksBuilderPrompt mirrors src/backend/types/legendary.mo
  // DrinksBuilderPrompt. Carried forward verbatim.
  type DrinksBuilderPrompt = {
    text : Text;
    audioUrl : ?Text;
  };

  // DrinksBuilderAnswerClip mirrors src/backend/types/legendary.mo
  // DrinksBuilderAnswerClip. Carried forward verbatim.
  type DrinksBuilderAnswerClip = {
    answer : Text;
    audioUrl : Text;
  };

  // DrinksBuilderSettings mirrors src/backend/types/legendary.mo
  // DrinksBuilderSettings. Carried forward verbatim.
  type DrinksBuilderSettings = {
    includedCategories : [Text];
    excludedDrinkTitles : [Text];
    decoyCount : Nat;
    requireExactAmounts : Bool;
    enforceAssemblyOrder : Bool;
    showScoring : Bool;
    streakMultiplier : Bool;
    pointsPerCorrect : Nat;
    roundsPerSession : Nat;
    soundDefault : Bool;
    glasswarePrompts : [DrinksBuilderPrompt];
    specsPrompts : [DrinksBuilderPrompt];
    assemblyPrompts : [DrinksBuilderPrompt];
    garnishPrompts : [DrinksBuilderPrompt];
    correctAffirmations : [Text];
    answerClips : [DrinksBuilderAnswerClip];
    celebrationClips : [Text];
  };

  // DrinksBuilderContent mirrors src/backend/types/legendary.mo
  // DrinksBuilderContent. Carried forward verbatim.
  type DrinksBuilderContent = {
    settings : DrinksBuilderSettings;
  };

  // ActivityContent mirrors src/backend/types/legendary.mo ActivityContent.
  // Carried forward verbatim.
  type ActivityContent = {
    #quizContent : QuizContent;
    #flashcardContent : FlashcardContent;
    #drinksBuilderContent : DrinksBuilderContent;
  };

  // QuizSettings mirrors src/backend/types/legendary.mo QuizSettings. Carried
  // forward verbatim.
  type QuizSettings = {
    includeMultipleChoice : Bool;
    includeTrueFalse : Bool;
    includeMatching : Bool;
  };

  // Activity mirrors src/backend/types/legendary.mo Activity. Carried forward
  // verbatim — unchanged by this migration.
  type Activity = {
    id : Nat;
    positionId : Nat;
    activityType : ActivityType;
    name : Text;
    sourceCategoryIds : [Nat];
    content : ActivityContent;
    quizSettings : ?QuizSettings;
    createdAt : Nat;
    createdBy : Principal;
  };

  // VerifiedEmailsState mirrors mo:caffeineai-email-verification/verifiedEmails.mo
  // VerifiedEmails.State. Carried forward verbatim.
  type VerifiedEmailsState = {
    verifiedEmails : Set.Set<Text>;
  };

  type OldActor = {
    var accessControlState : AccessControlState;
    profiles : Map.Map<Principal, UserProfile>;
    positions : List.List<Position>;
    assignments : List.List<PositionAssignment>;
    nextPositionId : { var value : Nat };
    categories : List.List<Category>;
    items : List.List<OldLibraryItem>;
    nextCategoryId : { var value : Nat };
    nextItemId : { var value : Nat };
    nsoPhases : List.List<Phase>;
    nsoTasks : List.List<Task>;
    nextPhaseId : { var value : Nat };
    nextTaskId : { var value : Nat };
    legendaryActivities : List.List<Activity>;
    nextLegendaryActivityId : { var value : Nat };
    verifiedEmails : VerifiedEmailsState;
  };

  type NewActor = {
    var accessControlState : AccessControlState;
    profiles : Map.Map<Principal, UserProfile>;
    positions : List.List<Position>;
    assignments : List.List<PositionAssignment>;
    nextPositionId : { var value : Nat };
    categories : List.List<Category>;
    items : List.List<NewLibraryItem>;
    nextCategoryId : { var value : Nat };
    nextItemId : { var value : Nat };
    nsoPhases : List.List<Phase>;
    nsoTasks : List.List<Task>;
    nextPhaseId : { var value : Nat };
    nextTaskId : { var value : Nat };
    legendaryActivities : List.List<Activity>;
    nextLegendaryActivityId : { var value : Nat };
    verifiedEmails : VerifiedEmailsState;
  };

  // The degree symbol (U+00B0) inserted before F/C temperature units.
  let degree : Char = '°';

  // Whether `c` is an F or C temperature-unit letter (case-insensitive).
  func isTempUnit(c : Char) : Bool {
    c == 'F' or c == 'f' or c == 'C' or c == 'c';
  };

  // fixTemps inserts the degree symbol (°) into temperature values in `t`.
  //
  // The pattern to fix: a number (digits, optionally with decimals like
  // 325.5 or fractions like 1/2, optionally with a leading comparison
  // operator < > <= >= ≤ ≥) immediately followed by an OPTIONAL single space
  // and then F or C (case-insensitive on the F/C), with NO degree symbol
  // already between the number and the F/C. The space (if present) is
  // replaced by °; when no space is present, ° is inserted before the F/C.
  // The original case of the F/C is preserved.
  //
  // Examples:
  //   "325 F"      -> "325°F"
  //   "145F"       -> "145°F"
  //   "<40 F"      -> "<40°F"
  //   ">=165 F"    -> ">=165°F"
  //   "325 f"      -> "325°f"
  //   "Bake at 350 F for 10 min" -> "Bake at 350°F for 10 min"
  //
  // Already-fixed temperatures ("325°F", "325 °F") are left unchanged.
  // Unrelated F/C letters that are part of a longer word ("5 cups", "beef",
  // "chicken") are NOT altered — the F/C must be a standalone unit (not
  // immediately followed by another alphabetic character) and must be
  // preceded by a digit (with optional single space between the digit and
  // the F/C).
  //
  // Implementation: a regex-free single-pass scan over the input character
  // array. The output is built char-by-char. When a space is encountered, it
  // peeks ahead: if the next char is a standalone F/C preceded (in the
  // output so far) by a digit and not already by °, the space is replaced
  // by °. When an F/C is encountered directly after a digit (no space), °
  // is inserted before it. When an F/C is encountered directly after °
  // (already fixed), it passes through unchanged.
  func fixTemps(t : Text) : Text {
    let chars = t.toArray();
    let n = chars.size();
    var out : Text = "";
    // The last character appended to `out`. Initialized to a NUL sentinel
    // so the very first char of the input is never mistaken for "preceded
    // by a digit". NUL cannot appear in normal recipe text.
    var lastOut : Char = '\u{0000}';
    var i : Nat = 0;
    while (i < n) {
      let c = chars[i];
      if (c == ' ') {
        // Peek ahead: is the next char a standalone F/C unit preceded by
        // a digit (with no ° already)? If so, replace this space with °.
        let nextIsUnit = (i + 1 < n) and isTempUnit(chars[i + 1]);
        let nextNextIsAlpha = (i + 2 < n) and chars[i + 2].isAlphabetic();
        if (nextIsUnit and lastOut.isDigit() and not nextNextIsAlpha) {
          // Replace the space with °; the F/C at i+1 will be processed
          // next and will see lastOut == °, so it passes through.
          out := out # degree.toText();
          lastOut := degree;
        } else {
          out := out # c.toText();
          lastOut := c;
        };
      } else if (isTempUnit(c)) {
        // F/C encountered. Decide whether to insert ° before it.
        let nextIsAlpha = (i + 1 < n) and chars[i + 1].isAlphabetic();
        if (lastOut == degree) {
          // Already has a degree symbol immediately before — pass through.
          out := out # c.toText();
          lastOut := c;
        } else if (lastOut.isDigit() and not nextIsAlpha) {
          // Preceded directly by a digit (no space) and not part of a
          // longer word — insert ° before the F/C.
          out := out # degree.toText() # c.toText();
          lastOut := c;
        } else {
          // Not a temperature pattern (e.g. preceded by a non-digit, or
          // F/C is part of a longer word like "cups"). Pass through.
          out := out # c.toText();
          lastOut := c;
        };
      } else {
        out := out # c.toText();
        lastOut := c;
      };
      i += 1;
    };
    out;
  };

  // Apply fixTemps to every element of a text array, returning a new array.
  func fixTextArray(arr : [Text]) : [Text] {
    arr.map(func(t : Text) : Text { fixTemps(t) });
  };

  // Apply fixTemps to an optional text field, returning the fixed optional.
  func fixOptText(opt : ?Text) : ?Text {
    switch (opt) {
      case (?t) ?fixTemps(t);
      case null null;
    };
  };

  // Rebuild an OldRecipeSpec as a NewRecipeSpec with fixTemps applied to the
  // text fields (amount, ingredient). upsell (Bool) is carried forward
  // unchanged — never touched by fixTemps.
  func migrateRecipeSpec(s : RecipeSpec) : RecipeSpec {
    {
      amount = fixTemps(s.amount);
      ingredient = fixTemps(s.ingredient);
      upsell = s.upsell;
    };
  };

  // Rebuild an OldRecipeVariant as a NewRecipeVariant with fixTemps applied to
  // the text fields (variantLabel, every specs[].amount, every
  // specs[].ingredient, every assembly[] entry).
  func migrateRecipeVariant(v : RecipeVariant) : RecipeVariant {
    {
      variantLabel = fixTemps(v.variantLabel);
      specs = v.specs.map(func(s : RecipeSpec) : RecipeSpec { migrateRecipeSpec(s) });
      assembly = fixTextArray(v.assembly);
    };
  };

  // Rebuild an OldRecipe as a NewRecipe with fixTemps applied to every
  // free-text field. recapAudio and buildAudio are object-storage URLs (not
  // temperature text) — they are carried forward UNCHANGED per the spec
  // (which explicitly excludes them). All other text fields are fixed.
  func migrateRecipe(r : OldRecipe) : NewRecipe {
    {
      glassware = fixTemps(r.glassware);
      specs = r.specs.map(func(s : RecipeSpec) : RecipeSpec { migrateRecipeSpec(s) });
      assembly = fixTextArray(r.assembly);
      garnish = fixTextArray(r.garnish);
      variants = r.variants.map(func(v : RecipeVariant) : RecipeVariant { migrateRecipeVariant(v) });
      equipment = fixTextArray(r.equipment);
      yield = fixOptText(r.yield);
      shelfLife = fixOptText(r.shelfLife);
      qualityIdentifier = fixTextArray(r.qualityIdentifier);
      // recapAudio and buildAudio are playback-only object-storage URLs —
      // NOT temperature text. Carried forward verbatim per the spec.
      recapAudio = r.recapAudio;
      buildAudio = r.buildAudio;
    };
  };

  // Rebuild an OldFoodServiceware as a NewFoodServiceware with fixTemps
  // applied to the text fields (item, amount).
  func migrateFoodServiceware(sw : FoodServiceware) : FoodServiceware {
    {
      item = fixTemps(sw.item);
      amount = fixTemps(sw.amount);
    };
  };

  // Rebuild an OldFoodComponent as a NewFoodComponent with fixTemps applied
  // to the text fields (item, amount, note). group is a grouping label
  // ("Step 1", "Step 2") — NOT in the spec's fix list — carried forward
  // verbatim.
  func migrateFoodComponent(c : FoodComponent) : FoodComponent {
    {
      item = fixTemps(c.item);
      amount = fixTemps(c.amount);
      group = c.group;
      note = fixOptText(c.note);
    };
  };

  // Rebuild an OldFoodRecipe as a NewFoodRecipe with fixTemps applied to
  // every free-text field. kind (variant) is carried forward unchanged —
  // never touched by fixTemps.
  func migrateFoodRecipe(fr : OldFoodRecipe) : NewFoodRecipe {
    {
      station = fixTemps(fr.station);
      kind = fr.kind;
      menuSection = fixOptText(fr.menuSection);
      serviceware = fr.serviceware.map(func(sw : FoodServiceware) : FoodServiceware { migrateFoodServiceware(sw) });
      components = fr.components.map(func(c : FoodComponent) : FoodComponent { migrateFoodComponent(c) });
      steps = fixTextArray(fr.steps);
      expoSteps = fixTextArray(fr.expoSteps);
      allergenNote = fixOptText(fr.allergenNote);
      yieldText = fixOptText(fr.yieldText);
      shelfLife = fixOptText(fr.shelfLife);
      holdTemp = fixOptText(fr.holdTemp);
      storeTemp = fixOptText(fr.storeTemp);
      lineUtensil = fixOptText(fr.lineUtensil);
      equipment = fixOptText(fr.equipment);
      qualityIdentifiers = fixTextArray(fr.qualityIdentifiers);
    };
  };

  // Rebuild an OldLibraryItem as a NewLibraryItem with fixTemps applied to
  // every free-text field. id, categoryId, photo, seasonal, sortOrder are
  // NOT free-text temperature fields — carried forward unchanged per the
  // spec. The nested ?Recipe and ?FoodRecipe are migrated when present.
  func migrateItem(item : OldLibraryItem) : NewLibraryItem {
    let newRecipe : ?NewRecipe = switch (item.recipe) {
      case (?r) ?migrateRecipe(r);
      case null null;
    };
    let newFoodRecipe : ?NewFoodRecipe = switch (item.foodRecipe) {
      case (?fr) ?migrateFoodRecipe(fr);
      case null null;
    };
    {
      id = item.id;
      categoryId = item.categoryId;
      title = fixTemps(item.title);
      subtitle = fixOptText(item.subtitle);
      photo = item.photo;
      details = item.details.map(func(d : DetailField) : DetailField {
        {
          fieldLabel = fixTemps(d.fieldLabel);
          value = fixTemps(d.value);
        };
      });
      notes = fixOptText(item.notes);
      tags = fixTextArray(item.tags);
      seasonal = item.seasonal;
      sortOrder = item.sortOrder;
      recipe = newRecipe;
      foodRecipe = newFoodRecipe;
    };
  };

  public func migration(old : OldActor) : NewActor {
    // Rebuild the items list: each OldLibraryItem -> NewLibraryItem with
    // fixTemps applied to every free-text field (title, subtitle, notes,
    // tags, details, and every text field of the nested beverage Recipe and
    // food FoodRecipe when present). List is invariant in its element type,
    // so the list must be rebuilt even though the element type is unchanged.
    // No data is lost — every field is carried forward; only text content is
    // normalized to insert missing degree symbols in temperature values.
    let newItems = List.empty<NewLibraryItem>();
    old.items.forEach(func(item : OldLibraryItem) {
      newItems.add(migrateItem(item));
    });
    {
      var accessControlState = old.accessControlState;
      profiles = old.profiles;
      positions = old.positions;
      assignments = old.assignments;
      nextPositionId = old.nextPositionId;
      categories = old.categories;
      items = newItems;
      nextCategoryId = old.nextCategoryId;
      nextItemId = old.nextItemId;
      nsoPhases = old.nsoPhases;
      nsoTasks = old.nsoTasks;
      nextPhaseId = old.nextPhaseId;
      nextTaskId = old.nextTaskId;
      legendaryActivities = old.legendaryActivities;
      nextLegendaryActivityId = old.nextLegendaryActivityId;
      verifiedEmails = old.verifiedEmails;
    };
  };
};
