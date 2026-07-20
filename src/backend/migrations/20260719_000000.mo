import Map "mo:core/Map";
import List "mo:core/List";
import Principal "mo:core/Principal";

module {
  // Eighth migration: extend the Recipe payload on LibraryItem with four
  // optional bulk-mix fields (`equipment`, `yield`, `shelfLife`,
  // `qualityIdentifier`). A recipe is treated as a bulk mix when `yield` is
  // non-null or `equipment` is non-empty; otherwise it renders the existing
  // drink card. Existing recipes migrate cleanly by setting the new fields to
  // their empty/null defaults — existing drink recipes remain drink recipes.
  //
  // OldActor mirrors the NewActor of the preceding migration
  // (20260718_000000.mo) — the previously deployed stable signature. The
  // Recipe type is inlined here with the OLD shape (no bulk-mix fields); the
  // NewActor inlines the NEW Recipe shape (with the four new fields). All
  // other fields are carried over unchanged. The migration maps each existing
  // item's recipe via `{ r with equipment = []; yield = null; shelfLife = null;
  // qualityIdentifier = [] }` so existing recipes keep their drink-card data
  // and gain empty bulk-mix defaults.

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

  // OldRecipe mirrors the PRE-migration Recipe shape (no bulk-mix fields).
  type OldRecipe = {
    glassware : Text;
    specs : [RecipeSpec];
    assembly : [Text];
    garnish : [Text];
    variants : [RecipeVariant];
  };

  // OldLibraryItem mirrors the PRE-migration LibraryItem shape (recipe : ?OldRecipe).
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
  };

  // NewRecipe mirrors the POST-migration Recipe shape (with the four bulk-mix
  // fields added). `equipment` and `qualityIdentifier` are [Text] (default
  // empty array); `yield` and `shelfLife` are ?Text (default null).
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
  };

  // NewLibraryItem mirrors the POST-migration LibraryItem shape (recipe : ?NewRecipe).
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

  // ActivityType mirrors src/backend/types/legendary.mo ActivityType
  type ActivityType = {
    #quiz;
    #flashcards;
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

  // ActivityContent mirrors src/backend/types/legendary.mo ActivityContent
  type ActivityContent = {
    #quizContent : QuizContent;
    #flashcardContent : FlashcardContent;
  };

  // Activity mirrors src/backend/types/legendary.mo Activity
  type Activity = {
    id : Nat;
    positionId : Nat;
    activityType : ActivityType;
    name : Text;
    sourceCategoryIds : [Nat];
    content : ActivityContent;
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
    items : List.List<OldLibraryItem>;
    nextCategoryId : { var value : Nat };
    nextItemId : { var value : Nat };
    nsoPhases : List.List<Phase>;
    nsoTasks : List.List<Task>;
    nextPhaseId : { var value : Nat };
    nextTaskId : { var value : Nat };
    legendaryActivities : List.List<Activity>;
    nextLegendaryActivityId : { var value : Nat };
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
  };

  public func migration(old : OldActor) : NewActor {
    // Map each existing item to the new shape. Items with no recipe keep
    // `recipe = null`; items with a recipe upgrade the recipe by adding the
    // four bulk-mix fields with empty/null defaults so existing drink recipes
    // remain drink recipes (no bulk-mix data).
    let newItems = List.empty<NewLibraryItem>();
    old.items.forEach(func(item : OldLibraryItem) {
      let migratedRecipe : ?NewRecipe = switch (item.recipe) {
        case null null;
        case (?r) {
          ?{
            r with
            equipment = [];
            yield = null;
            shelfLife = null;
            qualityIdentifier = [];
          };
        };
      };
      let migrated : NewLibraryItem = {
        item with
        recipe = migratedRecipe;
      };
      newItems.add(migrated);
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
    };
  };
};
