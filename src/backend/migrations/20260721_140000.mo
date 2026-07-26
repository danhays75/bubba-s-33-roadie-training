import Map "mo:core/Map";
import List "mo:core/List";
import Principal "mo:core/Principal";

module {
  // Twelfth migration (folded): add a required `approvalStatus : ApprovalStatus`
  // field AND an optional `email : ?Text` field to UserProfile in a single
  // step. Values for approvalStatus: #pending (new sign-ups, blocked from app
  // access until an admin decides), #approved (full access), #rejected (access
  // denied). The admin-approval gate is enforced in the develop wave; this
  // migration only shapes the data so existing users keep full access.
  //
  // Existing users are defaulted to #approved for approvalStatus and null for
  // email — NO retroactive lockout. The first user (auto-admin) and every
  // pre-existing profile retain full access. Only genuinely new sign-ups
  // created after this migration start #pending (handled by createProfile in
  // the develop wave). New sign-ups may supply an email at registration time;
  // pre-existing profiles have no email on file (null).
  //
  // Adding fields to a record inside Map.Map<Principal, UserProfile> is NOT a
  // stable-compatible change at the type level (Map is invariant in its value
  // type), so the profiles map must be rebuilt, mapping each OldUserProfile to
  // a NewUserProfile by adding approvalStatus = #approved and email = null. No
  // data is lost or invented — existing profiles keep their exact id/name/
  // storeLocation/role; only the two new fields are defaulted.
  //
  // OldActor mirrors the NewActor of the preceding migration
  // (20260720_030000.mo) — the previously deployed stable signature, where
  // UserProfile has neither approvalStatus nor email. The NewActor inlines the
  // NEW UserProfile shape (with both approvalStatus : ApprovalStatus and
  // email : ?Text). All other fields are carried over unchanged.

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

  // OldUserProfile mirrors the PRE-migration UserProfile shape (no
  // approvalStatus, no email).
  type OldUserProfile = {
    id : Principal;
    name : Text;
    storeLocation : Text;
    role : Role;
  };

  // NewUserProfile mirrors the POST-migration UserProfile shape (with both
  // approvalStatus and email).
  type NewUserProfile = {
    id : Principal;
    name : Text;
    storeLocation : Text;
    role : Role;
    approvalStatus : ApprovalStatus;
    email : ?Text;
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
    equipment : [Text];
    yield : ?Text;
    shelfLife : ?Text;
    qualityIdentifier : [Text];
  };

  // LibraryItem mirrors src/backend/types/library.mo LibraryItem
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

  // DrinksBuilderSettings mirrors src/backend/types/legendary.mo
  // DrinksBuilderSettings
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
  // DrinksBuilderContent
  type DrinksBuilderContent = {
    settings : DrinksBuilderSettings;
  };

  // ActivityContent mirrors src/backend/types/legendary.mo ActivityContent
  type ActivityContent = {
    #quizContent : QuizContent;
    #flashcardContent : FlashcardContent;
    #drinksBuilderContent : DrinksBuilderContent;
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
    profiles : Map.Map<Principal, OldUserProfile>;
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
    legendaryActivities : List.List<Activity>;
    nextLegendaryActivityId : { var value : Nat };
  };

  type NewActor = {
    var accessControlState : AccessControlState;
    profiles : Map.Map<Principal, NewUserProfile>;
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
    legendaryActivities : List.List<Activity>;
    nextLegendaryActivityId : { var value : Nat };
  };

  // Rebuild an OldUserProfile as a NewUserProfile by adding
  // approvalStatus = #approved and email = null. Existing users keep full
  // access — NO retroactive lockout. Only genuinely new sign-ups created after
  // this migration start #pending (handled by createProfile in the develop
  // wave). Pre-existing profiles have no email on file (null).
  func migrateProfile(p : OldUserProfile) : NewUserProfile {
    {
      id = p.id;
      name = p.name;
      storeLocation = p.storeLocation;
      role = p.role;
      approvalStatus = #approved;
      email = null;
    };
  };

  public func migration(old : OldActor) : NewActor {
    // Adding the required approvalStatus field and the optional email field to
    // UserProfile is a stable-compatible change at the value level, but Map is
    // invariant in its value type, so we rebuild the profiles map, mapping each
    // OldUserProfile to a NewUserProfile by adding approvalStatus = #approved
    // and email = null. No data is lost or invented — existing profiles keep
    // their exact id/name/storeLocation/role; only the two new fields are
    // defaulted so existing users retain full access with no email on file.
    let newProfiles = Map.empty<Principal, NewUserProfile>();
    old.profiles.forEach(func(id : Principal, p : OldUserProfile) {
      newProfiles.add(id, migrateProfile(p));
    });
    {
      var accessControlState = old.accessControlState;
      profiles = newProfiles;
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
      legendaryActivities = old.legendaryActivities;
      nextLegendaryActivityId = old.nextLegendaryActivityId;
    };
  };
};
