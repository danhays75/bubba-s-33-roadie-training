import Map "mo:core/Map";
import List "mo:core/List";
import Principal "mo:core/Principal";

module {
  // Tenth migration: extend the Legendary Flashcard type with an optional
  // recipe field (glassware/specs/assembly/garnish) so flashcards generated
  // from Library items that carry a Recipe can surface the structured recipe
  // on the flashcard back. The recipe field is optional (?), appended after
  // detailFields — existing serialized flashcards (non-recipe items)
  // deserialize with recipe = null, so this is a stable-compatible change at
  // the value level. However, List is invariant in its element type, so the
  // legendaryActivities list must be rebuilt, mapping each OldFlashcard to a
  // NewFlashcard by adding recipe = null. No data is lost or invented —
  // existing #quiz/#flashcards/#drinksBuilder activities keep their exact
  // payloads; only the flashcards inside #flashcardContent gain a null recipe.
  //
  // OldActor mirrors the NewActor of the preceding migration
  // (20260720_000000.mo) — the previously deployed stable signature, which
  // already includes #drinksBuilder but Flashcard has no recipe field. The
  // NewActor inlines the NEW Flashcard shape (with recipe : ?FlashcardRecipe).
  // All other fields are carried over unchanged.

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

  // FlashcardRecipe mirrors src/backend/types/legendary.mo FlashcardRecipe
  // (new in this migration). Only the four user-facing sections the flashcard
  // back needs (glassware, specs, assembly, garnish) are carried.
  type FlashcardRecipe = {
    glassware : Text;
    specs : [{ amount : Text; ingredient : Text }];
    assembly : [Text];
    garnish : [Text];
  };

  // OldFlashcard mirrors the PRE-migration Flashcard shape (no recipe field).
  type OldFlashcard = {
    itemTitle : Text;
    itemPhoto : ?Text;
    detailFields : [{ fieldLabel : Text; value : Text }];
  };

  // NewFlashcard mirrors the POST-migration Flashcard shape (with the
  // optional recipe field appended after detailFields).
  type NewFlashcard = {
    itemTitle : Text;
    itemPhoto : ?Text;
    detailFields : [{ fieldLabel : Text; value : Text }];
    recipe : ?FlashcardRecipe;
  };

  // OldFlashcardContent mirrors the PRE-migration FlashcardContent shape.
  type OldFlashcardContent = [OldFlashcard];

  // NewFlashcardContent mirrors the POST-migration FlashcardContent shape.
  type NewFlashcardContent = [NewFlashcard];

  // ActivityType mirrors src/backend/types/legendary.mo ActivityType
  // (post-20260720 shape, with #drinksBuilder). Unchanged by this migration.
  type ActivityType = {
    #quiz;
    #flashcards;
    #drinksBuilder;
  };

  // DrinksBuilderSettings mirrors src/backend/types/legendary.mo
  // DrinksBuilderSettings. Unchanged by this migration.
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
  // DrinksBuilderContent. Unchanged by this migration.
  type DrinksBuilderContent = {
    settings : DrinksBuilderSettings;
  };

  // OldActivityContent mirrors the PRE-migration ActivityContent shape
  // (FlashcardContent uses OldFlashcardContent — no recipe field).
  type OldActivityContent = {
    #quizContent : QuizContent;
    #flashcardContent : OldFlashcardContent;
    #drinksBuilderContent : DrinksBuilderContent;
  };

  // NewActivityContent mirrors the POST-migration ActivityContent shape
  // (FlashcardContent uses NewFlashcardContent — with recipe field).
  type NewActivityContent = {
    #quizContent : QuizContent;
    #flashcardContent : NewFlashcardContent;
    #drinksBuilderContent : DrinksBuilderContent;
  };

  // OldActivity mirrors the PRE-migration Activity shape.
  type OldActivity = {
    id : Nat;
    positionId : Nat;
    activityType : ActivityType;
    name : Text;
    sourceCategoryIds : [Nat];
    content : OldActivityContent;
    createdAt : Nat;
    createdBy : Principal;
  };

  // NewActivity mirrors the POST-migration Activity shape.
  type NewActivity = {
    id : Nat;
    positionId : Nat;
    activityType : ActivityType;
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

  // Rebuild an OldFlashcard as a NewFlashcard by adding recipe = null. No
  // data is invented beyond the absent recipe — existing flashcards keep
  // their exact itemTitle/itemPhoto/detailFields.
  func migrateFlashcard(f : OldFlashcard) : NewFlashcard {
    {
      itemTitle = f.itemTitle;
      itemPhoto = f.itemPhoto;
      detailFields = f.detailFields;
      recipe = null;
    };
  };

  // Rebuild an OldActivityContent as a NewActivityContent. Only the
  // #flashcardContent branch needs transformation — quiz and drinksBuilder
  // content pass through unchanged.
  func migrateActivityContent(c : OldActivityContent) : NewActivityContent {
    switch (c) {
      case (#quizContent q) #quizContent(q);
      case (#flashcardContent f) #flashcardContent(f.map(migrateFlashcard));
      case (#drinksBuilderContent d) #drinksBuilderContent(d);
    };
  };

  public func migration(old : OldActor) : NewActor {
    // Adding the optional recipe field to Flashcard is a stable-compatible
    // change at the value level, but List is invariant in its element type,
    // so we rebuild the activities list, mapping each OldActivity to a
    // NewActivity by widening its content's flashcards (adding recipe = null).
    // No data is lost or invented — existing activities keep their exact
    // payloads; only flashcards gain a null recipe.
    let newActivities = List.empty<NewActivity>();
    old.legendaryActivities.forEach(func(a : OldActivity) {
      newActivities.add({
        id = a.id;
        positionId = a.positionId;
        activityType = a.activityType;
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
