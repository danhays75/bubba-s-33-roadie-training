import Map "mo:core/Map";
import List "mo:core/List";
import Principal "mo:core/Principal";
import Set "mo:core/Set";

module {
  // Thirteenth migration: add an optional `photo : ?Text` field to
  // UserProfile (holds the object-storage URL of the user's profile photo;
  // null means no photo, frontend falls back to an initials avatar), AND
  // introduce the stable `verifiedEmails` state for the
  // caffeineai-email-verification extension (a Set.Set<Text> tracking which
  // manually-typed email addresses have been verified via a click-through
  // challenge).
  //
  // Existing profiles are carried forward with photo = null — no data is
  // lost or invented; existing users simply have no photo on file until
  // they upload one. The verifiedEmails set starts empty on upgrade (no
  // manually-typed address has been verified yet); on fresh install it is
  // also empty.
  //
  // Adding a field to a record inside Map.Map<Principal, UserProfile> is NOT
  // a stable-compatible change at the type level (Map is invariant in its
  // value type), so the profiles map must be rebuilt, mapping each
  // OldUserProfile to a NewUserProfile by adding photo = null. No data is
  // lost — existing profiles keep their exact id/name/storeLocation/role/
  // approvalStatus/email; only the new photo field is defaulted.
  //
  // OldActor mirrors the NewActor of the preceding migration
  // (20260721_140000.mo) — the previously deployed stable signature, where
  // UserProfile has no photo field and there is no verifiedEmails state.
  // The NewActor inlines the NEW UserProfile shape (with photo : ?Text) and
  // adds the verifiedEmails stable field.

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

  // OldUserProfile mirrors the PRE-migration UserProfile shape (no photo).
  type OldUserProfile = {
    id : Principal;
    name : Text;
    storeLocation : Text;
    role : Role;
    approvalStatus : ApprovalStatus;
    email : ?Text;
  };

  // NewUserProfile mirrors the POST-migration UserProfile shape (with photo).
  type NewUserProfile = {
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

  // VerifiedEmailsState mirrors mo:caffeineai-email-verification/verifiedEmails.mo
  // VerifiedEmails.State — a wrapper record around a Set.Set<Text>. The
  // installed package (caffeineai-email-verification@0.1.1) declares the
  // `verifiedEmails` field as IMMUTABLE (the Set itself is the mutable B-tree),
  // so the migration's NewActor.verifiedEmails must mirror that exact shape
  // (no `var` on the field) for the stable-compatibility check (M0170) to pass.
  type VerifiedEmailsState = {
    verifiedEmails : Set.Set<Text>;
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
    verifiedEmails : VerifiedEmailsState;
  };

  // Rebuild an OldUserProfile as a NewUserProfile by adding photo = null.
  // Existing users keep their exact id/name/storeLocation/role/
  // approvalStatus/email; only the new photo field is defaulted so existing
  // users have no photo on file until they upload one.
  func migrateProfile(p : OldUserProfile) : NewUserProfile {
    {
      id = p.id;
      name = p.name;
      storeLocation = p.storeLocation;
      role = p.role;
      approvalStatus = p.approvalStatus;
      email = p.email;
      photo = null;
    };
  };

  public func migration(old : OldActor) : NewActor {
    // Adding the optional photo field to UserProfile is a stable-compatible
    // change at the value level, but Map is invariant in its value type, so
    // we rebuild the profiles map, mapping each OldUserProfile to a
    // NewUserProfile by adding photo = null. No data is lost or invented —
    // existing profiles keep their exact id/name/storeLocation/role/
    // approvalStatus/email; only the new photo field is defaulted.
    let newProfiles = Map.empty<Principal, NewUserProfile>();
    old.profiles.forEach(func(id : Principal, p : OldUserProfile) {
      newProfiles.add(id, migrateProfile(p));
    });
    // The verifiedEmails state starts empty on upgrade — no manually-typed
    // address has been verified yet. On fresh install it is also empty.
    // Construct the VerifiedEmails.State wrapper record (a Set.Set<Text>
    // inside a record) so the NewActor.verifiedEmails type matches the actor
    // body's `verifiedEmails : VerifiedEmails.State` declaration.
    let newVerifiedEmails : VerifiedEmailsState = {
      verifiedEmails = Set.empty();
    };
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
      verifiedEmails = newVerifiedEmails;
    };
  };
};
