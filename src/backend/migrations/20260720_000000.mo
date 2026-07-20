import Map "mo:core/Map";
import List "mo:core/List";
import Principal "mo:core/Principal";

module {
  // Ninth migration: extend the Legendary ActivityType with #drinksBuilder and
  // ActivityContent with #drinksBuilderContent (carrying DrinksBuilderContent =
  // { settings : DrinksBuilderSettings }). The Drinks Builder game is
  // practice-only with session-only scores (no server persistence, no
  // leaderboard); the backend persists only the admin-configured
  // DrinksBuilderSettings and the playable pool is derived at play time from
  // the Library. Existing #quiz/#flashcards activities are unaffected — their
  // activityType and content variants are a stable subtype of the new open
  // variants, so the activities list is carried over unchanged.
  //
  // OldActor mirrors the NewActor of the preceding migration
  // (20260719_000000.mo) — the previously deployed stable signature. The
  // ActivityType/ActivityContent types are inlined here with the OLD shape
  // (no #drinksBuilder / #drinksBuilderContent); the NewActor inlines the
  // NEW shape (with the new constructors). All other fields are carried over
  // unchanged. No record transformation is needed — adding variant
  // constructors is a stable-subtype-compatible change, so
  // legendaryActivities passes through as-is.

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

  // UserProfile mirrors src/backend/types/foundation.mo UserProfile
  type UserProfile = {
    id : Principal;
    name : Text;
    storeLocation : Text;
    role : Role;
  };

  // Position mirrors src/backend/types/foundation.mo Position
  type Position = {
    id : Nat;
    name : Text;
    description : ?Text;
    coverPhoto : ?Text;
    sortOrder : Nat;
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

  // RecipeSpec mirrors src/backend/types/library.mo RecipeSpec
  type RecipeSpec = {
    amount : Text;
    ingredient : Text;
  };

  // RecipeVariant mirrors src/backend/types/library.mo RecipeVariant
  // (variantLabel, not label, because `label` is a reserved Motoko keyword.)
  type RecipeVariant = {
    variantLabel : Text;
    specs : [RecipeSpec];
    assembly : [Text];
  };

  // Recipe mirrors src/backend/types/library.mo Recipe (post-20260719 shape,
  // with the four bulk-mix fields). Unchanged by this migration.
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

  // LibraryItem mirrors src/backend/types/library.mo LibraryItem (post-20260719
  // shape). Unchanged by this migration.
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

  // Flashcard mirrors src/backend/types/legendary.mo Flashcard
  type Flashcard = {
    itemTitle : Text;
    itemPhoto : ?Text;
    detailFields : [{ fieldLabel : Text; value : Text }];
  };

  // FlashcardContent mirrors src/backend/types/legendary.mo FlashcardContent
  type FlashcardContent = [Flashcard];

  // OldActivityType mirrors the PRE-migration ActivityType shape
  // (no #drinksBuilder).
  type OldActivityType = {
    #quiz;
    #flashcards;
  };

  // OldActivityContent mirrors the PRE-migration ActivityContent shape
  // (no #drinksBuilderContent).
  type OldActivityContent = {
    #quizContent : QuizContent;
    #flashcardContent : FlashcardContent;
  };

  // OldActivity mirrors the PRE-migration Activity shape.
  type OldActivity = {
    id : Nat;
    positionId : Nat;
    activityType : OldActivityType;
    name : Text;
    sourceCategoryIds : [Nat];
    content : OldActivityContent;
    createdAt : Nat;
    createdBy : Principal;
  };

  // DrinksBuilderSettings mirrors src/backend/types/legendary.mo
  // DrinksBuilderSettings (new in this migration).
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
  };

  // DrinksBuilderContent mirrors src/backend/types/legendary.mo
  // DrinksBuilderContent (new in this migration).
  type DrinksBuilderContent = {
    settings : DrinksBuilderSettings;
  };

  // NewActivityType mirrors the POST-migration ActivityType shape
  // (with #drinksBuilder).
  type NewActivityType = {
    #quiz;
    #flashcards;
    #drinksBuilder;
  };

  // NewActivityContent mirrors the POST-migration ActivityContent shape
  // (with #drinksBuilderContent).
  type NewActivityContent = {
    #quizContent : QuizContent;
    #flashcardContent : FlashcardContent;
    #drinksBuilderContent : DrinksBuilderContent;
  };

  // NewActivity mirrors the POST-migration Activity shape.
  type NewActivity = {
    id : Nat;
    positionId : Nat;
    activityType : NewActivityType;
    name : Text;
    sourceCategoryIds : [Nat];
    content : NewActivityContent;
    createdAt : Nat;
    createdBy : Principal;
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
  };

  // Rebuild an OldActivityType as a NewActivityType. The new variant adds
  // #drinksBuilder; existing #quiz/#flashcards values map straight across.
  func migrateActivityType(t : OldActivityType) : NewActivityType {
    switch (t) {
      case (#quiz) #quiz;
      case (#flashcards) #flashcards;
    };
  };

  // Rebuild an OldActivityContent as a NewActivityContent. The new variant
  // adds #drinksBuilderContent; existing #quizContent/#flashcardContent
  // values map straight across.
  func migrateActivityContent(c : OldActivityContent) : NewActivityContent {
    switch (c) {
      case (#quizContent q) #quizContent(q);
      case (#flashcardContent f) #flashcardContent(f);
    };
  };

  public func migration(old : OldActor) : NewActor {
    // Adding variant constructors to ActivityType and ActivityContent is a
    // stable-subtype-compatible change at the value level, but List is
    // invariant in its element type, so we rebuild the activities list,
    // mapping each OldActivity to a NewActivity by widening its
    // activityType and content variants. No data is lost or invented —
    // existing #quiz/#flashcards activities keep their exact payloads.
    let newActivities = List.empty<NewActivity>();
    old.legendaryActivities.forEach(func(a : OldActivity) {
      newActivities.add({
        id = a.id;
        positionId = a.positionId;
        activityType = migrateActivityType(a.activityType);
        name = a.name;
        sourceCategoryIds = a.sourceCategoryIds;
        content = migrateActivityContent(a.content);
        createdAt = a.createdAt;
        createdBy = a.createdBy;
      });
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
    };
  };
};
