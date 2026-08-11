import Map "mo:core/Map";
import List "mo:core/List";
import Principal "mo:core/Principal";
import Set "mo:core/Set";

module {
  // Twenty-fourth migration: add an `amounts : [FoodComponentSize]` field
  // to FoodComponent to support per-size amounts on the Build Card layout
  // (pizzas: 12"/16"; Kids uses one size, 10").
  //
  //   FoodComponent.amounts : [FoodComponentSize]
  //     FoodComponentSize = { size : Text; value : Text }
  //
  // The field is additive and defaults to an empty list for every existing
  // component. Back-compat: components without `amounts` (empty list) behave
  // exactly as today — the Build Card falls back to the scalar `amount` and
  // burgers / other single-amount recipes are unchanged. The scalar
  // `amount` field is kept as the fallback; only the new `amounts` array is
  // added.
  //
  // The items List is invariant in its element type, so it must be rebuilt
  // even though only the nested FoodComponent shape changes. No data is
  // lost — every field is carried forward; only the new `amounts` field is
  // added as an empty list. Categories and all other stable state are
  // carried forward UNCHANGED (this migration touches only the items list,
  // and only the foodRecipe-bearing items within it).
  //
  // OldActor mirrors the NewActor of the preceding migration
  // (20260810_204000.mo) — the previously deployed stable signature, where
  // FoodComponent has no `amounts`. The NewActor inlines the same shape plus
  // the new `amounts` field.

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
  // three-tag shape with #kitchen). Carried forward verbatim — unchanged by
  // this migration.
  type LayoutStyle = {
    #library;
    #orientation;
    #kitchen;
  };

  // Position mirrors src/backend/types/foundation.mo Position. Carried
  // forward verbatim — unchanged by this migration.
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

  // DetailField mirrors src/backend/types/library.mo DetailField. Carried
  // forward verbatim — unchanged by this migration.
  type DetailField = {
    fieldLabel : Text;
    value : Text;
  };

  // Category mirrors src/backend/types/library.mo Category (the six-field
  // shape with accentColor). Carried forward verbatim — unchanged by this
  // migration.
  type Category = {
    id : Nat;
    positionId : Nat;
    name : Text;
    coverPhoto : ?Text;
    sortOrder : Nat;
    accentColor : ?Text;
  };

  // RecipeSpec mirrors src/backend/types/library.mo RecipeSpec (with upsell).
  // Carried forward verbatim — unchanged by this migration.
  type RecipeSpec = {
    amount : Text;
    ingredient : Text;
    upsell : Bool;
  };

  // RecipeVariant mirrors src/backend/types/library.mo RecipeVariant. Carried
  // forward verbatim — unchanged by this migration.
  type RecipeVariant = {
    variantLabel : Text;
    specs : [RecipeSpec];
    assembly : [Text];
  };

  // Recipe mirrors src/backend/types/library.mo Recipe (the eleven-field
  // shape with recapAudio and buildAudio). Carried forward verbatim —
  // unchanged by this migration (the beverage Recipe is not touched by the
  // per-size amounts addition).
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
    buildAudio : ?Text;
  };

  // FoodRecipeKind mirrors src/backend/types/library.mo FoodRecipeKind.
  // Carried forward verbatim — unchanged by this migration.
  type FoodRecipeKind = {
    #menuBuild;
    #prep;
  };

  // FoodComponentSize mirrors src/backend/types/library.mo FoodComponentSize
  // (the new per-size amount entry type introduced by this migration).
  type FoodComponentSize = {
    size : Text;
    value : Text;
  };

  // OldFoodComponent mirrors the PRE-migration FoodComponent shape (the
  // five-field shape WITHOUT amounts). Carried forward from the preceding
  // migration's NewFoodComponent.
  type OldFoodComponent = {
    item : Text;
    amount : Text;
    group : ?Text;
    note : ?Text;
    anchorY : ?Float;
  };

  // NewFoodComponent mirrors the POST-migration FoodComponent shape — the
  // five old fields PLUS the new `amounts : [FoodComponentSize]`. amounts
  // defaults to an empty list for every existing component (back-compat:
  // empty amounts = today's behavior, falling back to the scalar `amount`).
  type NewFoodComponent = {
    item : Text;
    amount : Text;
    group : ?Text;
    note : ?Text;
    anchorY : ?Float;
    amounts : [FoodComponentSize];
  };

  // FoodServiceware mirrors src/backend/types/library.mo FoodServiceware.
  // Carried forward verbatim — unchanged by this migration.
  type FoodServiceware = {
    item : Text;
    amount : Text;
  };

  // OldFoodRecipe mirrors the PRE-migration FoodRecipe shape (the
  // sixteen-field shape with buildHeader, components without amounts).
  // Carried forward from the preceding migration's NewFoodRecipe.
  type OldFoodRecipe = {
    station : Text;
    kind : FoodRecipeKind;
    menuSection : ?Text;
    buildHeader : ?Text;
    serviceware : [FoodServiceware];
    components : [OldFoodComponent];
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

  // NewFoodRecipe mirrors the POST-migration FoodRecipe shape — the sixteen
  // old fields unchanged; only the nested components use NewFoodComponent
  // (with amounts = []). The FoodRecipe shape itself is unchanged by this
  // migration; only the nested FoodComponent gains the `amounts` field.
  type NewFoodRecipe = {
    station : Text;
    kind : FoodRecipeKind;
    menuSection : ?Text;
    buildHeader : ?Text;
    serviceware : [FoodServiceware];
    components : [NewFoodComponent];
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
  // eleven-field shape), where the nested ?FoodRecipe uses OldFoodRecipe
  // (components without amounts). The nested ?Recipe uses the unchanged
  // Recipe type.
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
    recipe : ?Recipe;
    foodRecipe : ?OldFoodRecipe;
  };

  // NewLibraryItem mirrors src/backend/types/library.mo LibraryItem (the
  // eleven-field shape), where the nested ?FoodRecipe uses NewFoodRecipe
  // (components with amounts = []). The nested ?Recipe uses the unchanged
  // Recipe type.
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
    foodRecipe : ?NewFoodRecipe;
  };

  // Phase mirrors src/backend/types/nso.mo Phase. Carried forward verbatim.
  type Phase = {
    id : Nat;
    name : Text;
    sortOrder : Nat;
  };

  // Task mirrors src/backend/types/nso.mo Task. Carried forward verbatim.
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

  // Question mirrors src/backend/types/legendary.mo Question. Carried
  // forward verbatim.
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

  // QuizContent mirrors src/backend/types/legendary.mo QuizContent. Carried
  // forward verbatim.
  type QuizContent = [Question];

  // FlashcardRecipe mirrors src/backend/types/legendary.mo FlashcardRecipe.
  // Carried forward verbatim.
  type FlashcardRecipe = {
    glassware : Text;
    specs : [{ amount : Text; ingredient : Text }];
    assembly : [Text];
    garnish : [Text];
  };

  // Flashcard mirrors src/backend/types/legendary.mo Flashcard. Carried
  // forward verbatim.
  type Flashcard = {
    itemTitle : Text;
    itemPhoto : ?Text;
    detailFields : [{ fieldLabel : Text; value : Text }];
    recipe : ?FlashcardRecipe;
  };

  // FlashcardContent mirrors src/backend/types/legendary.mo FlashcardContent.
  // Carried forward verbatim.
  type FlashcardContent = [Flashcard];

  // ActivityType mirrors src/backend/types/legendary.mo ActivityType. Carried
  // forward verbatim.
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

  // Activity mirrors src/backend/types/legendary.mo Activity. Carried
  // forward verbatim — unchanged by this migration.
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

  // Rebuild an OldFoodComponent as a NewFoodComponent, carrying every field
  // forward verbatim and adding the new `amounts = []`. Existing components
  // have no per-size amounts; an empty list means "fall back to the scalar
  // `amount` — render exactly as today" (back-compat for burgers and other
  // single-amount recipes).
  func migrateFoodComponent(c : OldFoodComponent) : NewFoodComponent {
    {
      item = c.item;
      amount = c.amount;
      group = c.group;
      note = c.note;
      anchorY = c.anchorY;
      amounts = [];
    };
  };

  // Rebuild an OldFoodRecipe as a NewFoodRecipe, carrying every field
  // forward verbatim and migrating each component to add amounts = []. The
  // FoodRecipe shape itself is unchanged by this migration; only the nested
  // FoodComponent gains the `amounts` field.
  func migrateFoodRecipe(fr : OldFoodRecipe) : NewFoodRecipe {
    {
      station = fr.station;
      kind = fr.kind;
      menuSection = fr.menuSection;
      buildHeader = fr.buildHeader;
      serviceware = fr.serviceware;
      components = fr.components.map(func(c : OldFoodComponent) : NewFoodComponent { migrateFoodComponent(c) });
      steps = fr.steps;
      expoSteps = fr.expoSteps;
      allergenNote = fr.allergenNote;
      yieldText = fr.yieldText;
      shelfLife = fr.shelfLife;
      holdTemp = fr.holdTemp;
      storeTemp = fr.storeTemp;
      lineUtensil = fr.lineUtensil;
      equipment = fr.equipment;
      qualityIdentifiers = fr.qualityIdentifiers;
    };
  };

  // Rebuild an OldLibraryItem as a NewLibraryItem. Every field is carried
  // forward verbatim; only the nested ?FoodRecipe (when present) is migrated
  // to add amounts = [] on each component. The nested ?Recipe (beverage) is
  // carried forward unchanged — the per-size amounts addition does not touch
  // beverage recipes.
  func migrateItem(item : OldLibraryItem) : NewLibraryItem {
    let newFoodRecipe : ?NewFoodRecipe = switch (item.foodRecipe) {
      case (?fr) ?migrateFoodRecipe(fr);
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
      recipe = item.recipe;
      foodRecipe = newFoodRecipe;
    };
  };

  public func migration(old : OldActor) : NewActor {
    // Rebuild the items list: each OldLibraryItem -> NewLibraryItem. The
    // List is invariant in its element type, so it must be rebuilt even
    // though only the nested FoodComponent shape changes. No data is lost —
    // every field is carried forward; only the new `amounts` field is added
    // as an empty list. Items without a foodRecipe are carried forward
    // verbatim (only the foodRecipe-bearing items get the new empty amounts
    // on their nested components).
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
