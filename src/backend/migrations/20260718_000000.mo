import Map "mo:core/Map";
import List "mo:core/List";
import Principal "mo:core/Principal";

module {
  // Seventh migration: extend LibraryItem with an optional structured recipe
  // payload (`recipe : ?Recipe`). When the payload is present, the item is a
  // recipe; when absent, the item keeps the existing generic detail shape with
  // no regression. Existing items migrate cleanly by setting `recipe = null`.
  //
  // OldActor mirrors the NewActor of the preceding migration
  // (20260712_000000.mo) — the previously deployed stable signature. The
  // LibraryItem type is inlined here with the OLD shape (no `recipe` field);
  // the NewActor inlines the NEW LibraryItem shape (with `recipe : ?Recipe`).
  // All other fields are carried over unchanged. The migration maps each
  // existing item to `{ item with recipe = null }` so existing items remain
  // generic-detail items until an admin edits them.

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

  // OldLibraryItem mirrors the PRE-migration LibraryItem shape (no recipe field).
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

  // Recipe mirrors src/backend/types/library.mo Recipe
  type Recipe = {
    glassware : Text;
    specs : [RecipeSpec];
    assembly : [Text];
    garnish : [Text];
    variants : [RecipeVariant];
  };

  // NewLibraryItem mirrors the POST-migration LibraryItem shape (with recipe).
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
    // Map each existing item to the new shape by adding `recipe = null`.
    // Existing items remain generic-detail items until an admin edits them.
    let newItems = List.empty<NewLibraryItem>();
    old.items.forEach(func(item : OldLibraryItem) {
      let migrated : NewLibraryItem = {
        item with
        recipe = null;
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
