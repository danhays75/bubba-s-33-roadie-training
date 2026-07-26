import Map "mo:core/Map";
import List "mo:core/List";
import Principal "mo:core/Principal";
import Set "mo:core/Set";

module {
  // Fifteenth migration: add four display-only prompt-list fields to
  // DrinksBuilderSettings — glasswarePrompts / specsPrompts /
  // assemblyPrompts / garnishPrompts, each a [Text] of 0-8 strings. These
  // are admin-editable, rotating step-heading prompts for the Drinks Builder
  // game (the admin can replace each step's hardcoded heading with fun
  // catchy prompts; the game picks one per step per round at random, seeded
  // by the round index). They are PURELY display metadata — NO pool, scoring,
  // or round-flow logic reads them.
  //
  // This change is NOT stable-compatible at the top-level actor field level:
  // DrinksBuilderSettings gains four required fields, and
  // DrinksBuilderSettings is nested inside
  // ActivityContent.#drinksBuilderContent.settings inside Activity inside
  // legendaryActivities : List.List<Activity>. List is invariant in its
  // element type, so the legendaryActivities list must be rebuilt, mapping
  // each OldActivity to a NewActivity. For #drinksBuilder activities, the
  // nested OldDrinksBuilderSettings is migrated to a NewDrinksBuilderSettings
  // by adding the four new prompt fields defaulted to the canonical default
  // prompt arrays below (so existing saved #drinksBuilder activities load
  // with the same defaults new activities get — nothing breaks). For
  // #quiz / #flashcards activities the content is carried forward verbatim
  // (their content variant does not embed DrinksBuilderSettings).
  //
  // OldActor mirrors the NewActor of the preceding migration
  // (20260726_000000.mo) — the previously deployed stable signature, where
  // DrinksBuilderSettings has the 10 existing fields and no prompt fields.
  // The NewActor inlines the NEW DrinksBuilderSettings shape (with the four
  // prompt fields).

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

  // UserProfile mirrors src/backend/types/foundation.mo UserProfile (with
  // photo, unchanged by this migration). Carried forward verbatim.
  type UserProfile = {
    id : Principal;
    name : Text;
    storeLocation : Text;
    role : Role;
    approvalStatus : ApprovalStatus;
    email : ?Text;
    photo : ?Text;
  };

  // LayoutStyle mirrors src/backend/types/foundation.mo LayoutStyle
  type LayoutStyle = {
    #library;
    #orientation;
  };

  // Position mirrors src/backend/types/foundation.mo Position
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

  // Category mirrors src/backend/types/library.mo Category
  type Category = {
    id : Nat;
    positionId : Nat;
    name : Text;
    coverPhoto : ?Text;
    sortOrder : Nat;
  };

  // RecipeSpec mirrors src/backend/types/library.mo RecipeSpec (with upsell,
  // as added by the preceding migration). Carried forward verbatim.
  type RecipeSpec = {
    amount : Text;
    ingredient : Text;
    upsell : Bool;
  };

  // RecipeVariant mirrors src/backend/types/library.mo RecipeVariant (its
  // specs use RecipeSpec with upsell). Carried forward verbatim.
  type RecipeVariant = {
    variantLabel : Text;
    specs : [RecipeSpec];
    assembly : [Text];
  };

  // Recipe mirrors src/backend/types/library.mo Recipe (specs/variants use
  // RecipeSpec / RecipeVariant with upsell). Carried forward verbatim.
  type Recipe = {
    glassware : Text;
    specs : [RecipeSpec];
    assembly : [Text];
    garnish : [Text];
    variants : [RecipeVariant];
    equipment : [Text];
    yield : ?Text;
    shelfLife : ?Text;
    qualityIdentifier : [Text];
  };

  // LibraryItem mirrors src/backend/types/library.mo LibraryItem (recipe uses
  // Recipe with upsell). Carried forward verbatim — the items list is NOT
  // rebuilt by this migration (no change to LibraryItem or Recipe this wave).
  type LibraryItem = {
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
    recipe : ?Recipe;
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

  // Question mirrors src/backend/types/legendary.mo Question (unchanged by
  // this migration — the variant union is NOT modified).
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

  // OldDrinksBuilderSettings mirrors the PRE-migration DrinksBuilderSettings
  // shape (the 10 existing fields, no prompt fields).
  type OldDrinksBuilderSettings = {
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
  };

  // NewDrinksBuilderSettings mirrors the POST-migration DrinksBuilderSettings
  // shape (the 10 existing fields plus the four new prompt-list fields).
  type NewDrinksBuilderSettings = {
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
    glasswarePrompts : [Text];
    specsPrompts : [Text];
    assemblyPrompts : [Text];
    garnishPrompts : [Text];
  };

  // OldDrinksBuilderContent mirrors the PRE-migration DrinksBuilderContent
  // shape (settings uses OldDrinksBuilderSettings).
  type OldDrinksBuilderContent = {
    settings : OldDrinksBuilderSettings;
  };

  // NewDrinksBuilderContent mirrors the POST-migration DrinksBuilderContent
  // shape (settings uses NewDrinksBuilderSettings).
  type NewDrinksBuilderContent = {
    settings : NewDrinksBuilderSettings;
  };

  // OldActivityContent mirrors the PRE-migration ActivityContent shape (its
  // #drinksBuilderContent variant uses OldDrinksBuilderContent).
  type OldActivityContent = {
    #quizContent : QuizContent;
    #flashcardContent : FlashcardContent;
    #drinksBuilderContent : OldDrinksBuilderContent;
  };

  // NewActivityContent mirrors the POST-migration ActivityContent shape (its
  // #drinksBuilderContent variant uses NewDrinksBuilderContent).
  type NewActivityContent = {
    #quizContent : QuizContent;
    #flashcardContent : FlashcardContent;
    #drinksBuilderContent : NewDrinksBuilderContent;
  };

  // QuizSettings mirrors src/backend/types/legendary.mo QuizSettings (added
  // by the preceding migration). Carried forward verbatim.
  type QuizSettings = {
    includeMultipleChoice : Bool;
    includeTrueFalse : Bool;
    includeMatching : Bool;
  };

  // OldActivity mirrors the PRE-migration Activity shape (content uses
  // OldActivityContent).
  type OldActivity = {
    id : Nat;
    positionId : Nat;
    activityType : ActivityType;
    name : Text;
    sourceCategoryIds : [Nat];
    content : OldActivityContent;
    quizSettings : ?QuizSettings;
    createdAt : Nat;
    createdBy : Principal;
  };

  // NewActivity mirrors the POST-migration Activity shape (content uses
  // NewActivityContent).
  type NewActivity = {
    id : Nat;
    positionId : Nat;
    activityType : ActivityType;
    name : Text;
    sourceCategoryIds : [Nat];
    content : NewActivityContent;
    quizSettings : ?QuizSettings;
    createdAt : Nat;
    createdBy : Principal;
  };

  // VerifiedEmailsState mirrors mo:caffeineai-email-verification/verifiedEmails.mo
  // VerifiedEmails.State — a wrapper record around a Set.Set<Text>. The
  // installed package declares the `verifiedEmails` field as IMMUTABLE (the
  // Set itself is the mutable B-tree), so the migration's
  // NewActor.verifiedEmails must mirror that exact shape (no `var` on the
  // field) for the stable-compatibility check (M0170) to pass. Carried
  // forward verbatim from the preceding migration.
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
    items : List.List<LibraryItem>;
    nextCategoryId : { var value : Nat };
    nextItemId : { var value : Nat };
    nsoPhases : List.List<Phase>;
    nsoTasks : List.List<Task>;
    nextPhaseId : { var value : Nat };
    nextTaskId : { var value : Nat };
    legendaryActivities : List.List<OldActivity>;
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
    items : List.List<LibraryItem>;
    nextCategoryId : { var value : Nat };
    nextItemId : { var value : Nat };
    nsoPhases : List.List<Phase>;
    nsoTasks : List.List<Task>;
    nextPhaseId : { var value : Nat };
    nextTaskId : { var value : Nat };
    legendaryActivities : List.List<NewActivity>;
    nextLegendaryActivityId : { var value : Nat };
    verifiedEmails : VerifiedEmailsState;
  };

  // Canonical default prompt arrays for the four Drinks Builder steps. Used
  // both by this migration (to default existing saved #drinksBuilder
  // activities) AND by new-activity construction in lib/legendary.mo (the
  // develop agent wires the same defaults there). Verbatim, in this exact
  // order — the first entry of each list is the canonical step label
  // ("GLASSWARE" / "SPECS" / "ASSEMBLY" / "GARNISH") so an admin who clears
  // the list falls back to the canonical heading.
  let defaultGlasswarePrompts : [Text] = [
    "GLASSWARE",
    "What glass are you reaching for?",
    "Surprise me with your wisdom — what glass?",
    "Be legendary — pick the glass.",
    "Which glass makes this one shine?",
    "Glass check! What's it going in?",
    "Grab the right glass, Roadie.",
    "First things first — the glass?",
  ];

  let defaultSpecsPrompts : [Text] = [
    "SPECS",
    "Build the pour — what goes in?",
    "Tap every spec that belongs.",
    "Show me the recipe, Roadie.",
    "What's in this legend?",
    "Load it up — every correct spec.",
    "Nail the pour. What's in it?",
    "Ingredients, please — all of 'em.",
  ];

  let defaultAssemblyPrompts : [Text] = [
    "ASSEMBLY",
    "How do we build it? In order!",
    "Walk me through the steps.",
    "Put it together, step by step.",
    "What's the play — in order?",
    "Assemble like a legend.",
    "Order matters — build it right.",
    "Steps in sequence, Roadie.",
  ];

  let defaultGarnishPrompts : [Text] = [
    "GARNISH",
    "Finish strong — what's the garnish?",
    "Top it off like a legend.",
    "The final touch — garnish?",
    "What makes it pop?",
    "Dress it up — pick the garnish.",
    "Last step — garnish it.",
    "Make it picture-perfect — garnish?",
  ];

  // Rebuild an OldDrinksBuilderSettings as a NewDrinksBuilderSettings by
  // adding the four new prompt fields defaulted to the canonical default
  // prompt arrays. Existing settings keep their exact 10 fields; only the
  // four new prompt fields are defaulted (so existing saved #drinksBuilder
  // activities load with the same defaults new activities get — nothing
  // breaks). No data is lost or invented beyond the new display-only
  // metadata.
  func migrateDrinksBuilderSettings(s : OldDrinksBuilderSettings) : NewDrinksBuilderSettings {
    {
      includedCategories = s.includedCategories;
      excludedDrinkTitles = s.excludedDrinkTitles;
      decoyCount = s.decoyCount;
      requireExactAmounts = s.requireExactAmounts;
      enforceAssemblyOrder = s.enforceAssemblyOrder;
      showScoring = s.showScoring;
      streakMultiplier = s.streakMultiplier;
      pointsPerCorrect = s.pointsPerCorrect;
      roundsPerSession = s.roundsPerSession;
      soundDefault = s.soundDefault;
      glasswarePrompts = defaultGlasswarePrompts;
      specsPrompts = defaultSpecsPrompts;
      assemblyPrompts = defaultAssemblyPrompts;
      garnishPrompts = defaultGarnishPrompts;
    };
  };

  // Rebuild an OldActivityContent as a NewActivityContent. For
  // #drinksBuilderContent, the nested OldDrinksBuilderSettings is migrated
  // to a NewDrinksBuilderSettings (adding the four prompt fields defaulted).
  // For #quizContent and #flashcardContent, the content is carried forward
  // verbatim (those variants do not embed DrinksBuilderSettings).
  func migrateActivityContent(c : OldActivityContent) : NewActivityContent {
    switch (c) {
      case (#quizContent q) #quizContent q;
      case (#flashcardContent f) #flashcardContent f;
      case (#drinksBuilderContent db) {
        #drinksBuilderContent({ settings = migrateDrinksBuilderSettings(db.settings) });
      };
    };
  };

  // Rebuild an OldActivity as a NewActivity by migrating its content (for
  // #drinksBuilder activities, the nested DrinksBuilderSettings gains the
  // four prompt fields defaulted). All other fields are carried forward
  // verbatim. No data is lost — existing activities keep their exact
  // id/positionId/activityType/name/sourceCategoryIds/quizSettings/
  // createdAt/createdBy; only the four new prompt fields are defaulted
  // inside #drinksBuilderContent.settings.
  func migrateActivity(a : OldActivity) : NewActivity {
    {
      id = a.id;
      positionId = a.positionId;
      activityType = a.activityType;
      name = a.name;
      sourceCategoryIds = a.sourceCategoryIds;
      content = migrateActivityContent(a.content);
      quizSettings = a.quizSettings;
      createdAt = a.createdAt;
      createdBy = a.createdBy;
    };
  };

  public func migration(old : OldActor) : NewActor {
    // Rebuild the legendaryActivities list: each OldActivity -> NewActivity,
    // migrating #drinksBuilderContent.settings to add the four prompt fields
    // defaulted to the canonical default prompt arrays. List is invariant
    // in its element type, so the list must be rebuilt even though the
    // change is additive at the value level. No data is lost — existing
    // activities keep their exact fields; only the four new prompt fields
    // are defaulted inside #drinksBuilderContent.settings (so existing
    // saved #drinksBuilder activities load with the same defaults new
    // activities get — nothing breaks). #quiz / #flashcards activities are
    // carried forward verbatim (their content variant does not embed
    // DrinksBuilderSettings).
    let newActivities = List.empty<NewActivity>();
    old.legendaryActivities.forEach(func(a : OldActivity) {
      newActivities.add(migrateActivity(a));
    });
    {
      var accessControlState = old.accessControlState;
      profiles = old.profiles;
      positions = old.positions;
      assignments = old.assignments;
      nextPositionId = old.nextPositionId;
      categories = old.categories;
      items = old.items;
      nextCategoryId = old.nextCategoryId;
      nextItemId = old.nextItemId;
      nsoPhases = old.nsoPhases;
      nsoTasks = old.nsoTasks;
      nextPhaseId = old.nextPhaseId;
      nextTaskId = old.nextTaskId;
      legendaryActivities = newActivities;
      nextLegendaryActivityId = old.nextLegendaryActivityId;
      verifiedEmails = old.verifiedEmails;
    };
  };
};
