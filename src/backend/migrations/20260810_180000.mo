import Map "mo:core/Map";
import List "mo:core/List";
import Principal "mo:core/Principal";
import Set "mo:core/Set";

module {
  // Twenty-first migration: add the optional `buildAudio : ?Text` field to the
  // beverage Recipe type (parallel to the existing `recapAudio` field).
  //
  // buildAudio is the optional durable object-storage URL of the drink's
  // build voice clip — a spoken walk-through played while a Roadie builds
  // this drink (parallel to recapAudio, which plays after the round). Like
  // recapAudio it is playback-only — NO pool, decoy, scoring, or round-flow
  // logic reads it; it rides along on the LibraryItem returned by
  // getDrinksBuilderPlayablePool unchanged. Defaults to null — drinks
  // without a clip just show the visual build.
  //
  // The field is additive and optional — existing recipes carry buildAudio
  // = null after this migration (no data is lost or invented). Recipe is
  // nested inside `recipe : ?Recipe` on each LibraryItem, and LibraryItem is
  // nested inside `items : List.List<LibraryItem>`. List is invariant in its
  // element type, so the items list must be rebuilt, mapping each
  // OldLibraryItem to a NewLibraryItem by adding `buildAudio = null` to the
  // nested ?Recipe when present; items with a null recipe pass through
  // unchanged. No item data is lost — every existing field is carried
  // forward verbatim; only the new `buildAudio` field is added with its
  // default of null on recipes that already exist.
  //
  // OldActor mirrors the NewActor of the preceding migration
  // (20260802_180000.mo) — the previously deployed stable signature, where
  // Recipe has no `buildAudio` field. The NewActor inlines the NEW Recipe
  // shape (with `buildAudio : ?Text` added as the last field). Every other
  // stable field is carried forward verbatim — this migration touches only
  // the items list (to rebuild it with the new Recipe shape).

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

  // OldRecipe mirrors the PRE-migration Recipe shape (the ten-field shape
  // with recapAudio, but no buildAudio field).
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
  };

  // NewRecipe mirrors the POST-migration Recipe shape (the ten prior fields
  // plus the new `buildAudio : ?Text` field added as the last field).
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

  // OldLibraryItem mirrors src/backend/types/library.mo LibraryItem (the
  // eleven-field shape from the preceding migration, WITH foodRecipe), where
  // the nested ?Recipe uses the PRE-migration OldRecipe shape (no buildAudio).
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
    foodRecipe : ?FoodRecipe;
  };

  // NewLibraryItem mirrors src/backend/types/library.mo LibraryItem (the
  // eleven-field shape), where the nested ?Recipe uses the POST-migration
  // NewRecipe shape (with buildAudio added as the last field).
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

  // Rebuild an OldRecipe as a NewRecipe by adding the new `buildAudio` field
  // with its default value of null. All other fields are carried forward
  // verbatim. No data is lost — existing recipes keep their exact
  // glassware/specs/assembly/garnish/variants/equipment/yield/shelfLife/
  // qualityIdentifier/recapAudio and gain buildAudio = null (so existing
  // drinks have no build clip until an admin sets one — nothing breaks).
  func migrateRecipe(r : OldRecipe) : NewRecipe {
    {
      glassware = r.glassware;
      specs = r.specs;
      assembly = r.assembly;
      garnish = r.garnish;
      variants = r.variants;
      equipment = r.equipment;
      yield = r.yield;
      shelfLife = r.shelfLife;
      qualityIdentifier = r.qualityIdentifier;
      recapAudio = r.recapAudio;
      buildAudio = null;
    };
  };

  // Rebuild an OldLibraryItem as a NewLibraryItem. When the item has a
  // recipe, the nested OldRecipe is migrated to a NewRecipe (adding
  // buildAudio = null); when the item has no recipe (recipe = null), it
  // passes through unchanged. All other fields are carried forward verbatim.
  // No data is lost — existing items keep their exact fields and, if they
  // had a recipe, that recipe gains buildAudio = null.
  func migrateItem(item : OldLibraryItem) : NewLibraryItem {
    let newRecipe : ?NewRecipe = switch (item.recipe) {
      case (?r) ?migrateRecipe(r);
      case null null;
    };
    {
      id = item.id;
      categoryId = item.categoryId;
      title = item.title;
      subtitle = item.subtitle;
      photo = item.photo;
      details = item.details;
      notes = item.notes;
      tags = item.tags;
      seasonal = item.seasonal;
      sortOrder = item.sortOrder;
      recipe = newRecipe;
      foodRecipe = item.foodRecipe;
    };
  };

  public func migration(old : OldActor) : NewActor {
    // Rebuild the items list: each OldLibraryItem -> NewLibraryItem, adding
    // the new `buildAudio` field with its default value of null to the nested
    // ?Recipe when present. List is invariant in its element type, so the
    // list must be rebuilt even though the change is additive at the value
    // level. No data is lost — existing items keep their exact fields and,
    // if they had a recipe, that recipe gains buildAudio = null (so existing
    // drinks have no build clip until an admin sets one — nothing breaks).
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
