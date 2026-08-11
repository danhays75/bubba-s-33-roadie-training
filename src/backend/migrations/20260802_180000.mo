import Map "mo:core/Map";
import List "mo:core/List";
import Principal "mo:core/Principal";
import Set "mo:core/Set";

module {
  // Twentieth migration: add the optional `accentColor : ?Text` field to the
  // Library Category type (Part A of the per-category accent color build).
  //
  // accentColor is a hex string (e.g. "#8C5421") used to theme the Food Recipe
  // cards for the category; null means the neutral brand default. The field is
  // additive and optional — existing categories carry accentColor = null after
  // this migration (no data is lost or invented). Category is nested inside
  // `categories : List.List<Category>` and List is invariant in its element
  // type, so the categories list must be rebuilt, mapping each OldCategory to a
  // NewCategory by adding `accentColor = null`. No category data is lost —
  // every existing field (id / positionId / name / coverPhoto / sortOrder) is
  // carried forward verbatim; only the new `accentColor` field is added with
  // its default of null.
  //
  // OldActor mirrors the NewActor of the preceding migration
  // (20260802_174115.mo) — the previously deployed stable signature, where
  // Category has no `accentColor` field. The NewActor inlines the NEW Category
  // shape (with `accentColor : ?Text` added as the last field). Every other
  // stable field is carried forward verbatim — this migration touches only the
  // categories list.

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

  // OldCategory mirrors the PRE-migration Category shape (no accentColor field).
  type OldCategory = {
    id : Nat;
    positionId : Nat;
    name : Text;
    coverPhoto : ?Text;
    sortOrder : Nat;
  };

  // NewCategory mirrors the POST-migration Category shape (the five prior
  // fields plus the new `accentColor : ?Text` field added as the last field).
  type NewCategory = {
    id : Nat;
    positionId : Nat;
    name : Text;
    coverPhoto : ?Text;
    sortOrder : Nat;
    accentColor : ?Text;
  };

  // RecipeSpec mirrors src/backend/types/library.mo RecipeSpec (with upsell).
  // Carried forward verbatim.
  type RecipeSpec = {
    amount : Text;
    ingredient : Text;
    upsell : Bool;
  };

  // RecipeVariant mirrors src/backend/types/library.mo RecipeVariant. Carried
  // forward verbatim.
  type RecipeVariant = {
    variantLabel : Text;
    specs : [RecipeSpec];
    assembly : [Text];
  };

  // Recipe mirrors src/backend/types/library.mo Recipe (the ten-field shape
  // with recapAudio). Carried forward verbatim — unchanged by this migration.
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
    recapAudio : ?Text;
  };

  // FoodRecipeKind mirrors src/backend/types/library.mo FoodRecipeKind.
  // Carried forward verbatim.
  type FoodRecipeKind = {
    #menuBuild;
    #prep;
  };

  // FoodComponent mirrors src/backend/types/library.mo FoodComponent. Carried
  // forward verbatim.
  type FoodComponent = {
    item : Text;
    amount : Text;
    group : ?Text;
    note : ?Text;
  };

  // FoodServiceware mirrors src/backend/types/library.mo FoodServiceware.
  // Carried forward verbatim.
  type FoodServiceware = {
    item : Text;
    amount : Text;
  };

  // FoodRecipe mirrors src/backend/types/library.mo FoodRecipe. Carried
  // forward verbatim — unchanged by this migration.
  type FoodRecipe = {
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

  // LibraryItem mirrors src/backend/types/library.mo LibraryItem (the
  // eleven-field shape from the preceding migration, WITH foodRecipe). Carried
  // forward verbatim — unchanged by this migration.
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
    foodRecipe : ?FoodRecipe;
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
    categories : List.List<OldCategory>;
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

  type NewActor = {
    var accessControlState : AccessControlState;
    profiles : Map.Map<Principal, UserProfile>;
    positions : List.List<Position>;
    assignments : List.List<PositionAssignment>;
    nextPositionId : { var value : Nat };
    categories : List.List<NewCategory>;
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

  // Rebuild an OldCategory as a NewCategory by adding the new `accentColor`
  // field with its default value of null. All other fields are carried forward
  // verbatim. No data is lost — existing categories keep their exact
  // id/positionId/name/coverPhoto/sortOrder and gain accentColor = null (so
  // existing categories use the neutral brand default until an admin sets a
  // color — nothing breaks).
  func migrateCategory(c : OldCategory) : NewCategory {
    {
      id = c.id;
      positionId = c.positionId;
      name = c.name;
      coverPhoto = c.coverPhoto;
      sortOrder = c.sortOrder;
      accentColor = null;
    };
  };

  public func migration(old : OldActor) : NewActor {
    // Rebuild the categories list: each OldCategory -> NewCategory, adding the
    // new `accentColor` field with its default value of null. List is invariant
    // in its element type, so the list must be rebuilt even though the change
    // is additive at the value level. No data is lost — existing categories
    // keep their exact fields and gain accentColor = null (so existing
    // categories use the neutral brand default until an admin sets a color —
    // nothing breaks).
    let newCategories = List.empty<NewCategory>();
    old.categories.forEach(func(c : OldCategory) {
      newCategories.add(migrateCategory(c));
    });
    {
      var accessControlState = old.accessControlState;
      profiles = old.profiles;
      positions = old.positions;
      assignments = old.assignments;
      nextPositionId = old.nextPositionId;
      categories = newCategories;
      items = old.items;
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
