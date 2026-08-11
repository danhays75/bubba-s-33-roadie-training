import Map "mo:core/Map";
import List "mo:core/List";
import Principal "mo:core/Principal";
import Set "mo:core/Set";

module {
  // Twenty-third migration: add two optional fields to the food recipe types
  // to support the Build Card layout (an in-app recreation of the Bubba's
  // "Build Your Burger" plate-presentation card).
  //
  //   1. FoodComponent.anchorY : ?Float — a value 0.0–1.0 giving that
  //      ingredient's vertical position on the build photo (0 = top of the
  //      image, 1 = bottom). Lets the Build Card place each label beside its
  //      layer. Defaults to null — components without it render exactly as
  //      they do today.
  //   2. FoodRecipe.buildHeader : ?Text — the small kicker line above the
  //      title on the Build Card (e.g. "Build Your Burger"). Defaults to
  //      null — recipes without it render exactly as they do today (no
  //      kicker).
  //
  // Both fields are optional and additive. Existing data migrates cleanly:
  // every FoodComponent gets anchorY = null and every FoodRecipe gets
  // buildHeader = null. Recipes and components without these fields render
  // exactly as they do today. createItem/updateItem pass foodRecipe through
  // unchanged — the new optional fields default to null on the Candid
  // boundary.
  //
  // The items List is invariant in its element type, so it must be rebuilt
  // even though only the nested FoodComponent/FoodRecipe shapes change. No
  // data is lost — every field is carried forward; only the two new optional
  // fields are added as null. Categories and all other stable state are
  // carried forward UNCHANGED (this migration touches only the items list,
  // and only the foodRecipe-bearing items within it).
  //
  // OldActor mirrors the NewActor of the preceding migration
  // (20260810_190000.mo) — the previously deployed stable signature, where
  // FoodComponent has no anchorY and FoodRecipe has no buildHeader. The
  // NewActor inlines the same shape plus the two new optional fields.

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
  // Build Card additions).
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

  // OldFoodComponent mirrors the PRE-migration FoodComponent shape (the
  // four-field shape WITHOUT anchorY). Carried forward from the preceding
  // migration's NewFoodComponent.
  type OldFoodComponent = {
    item : Text;
    amount : Text;
    group : ?Text;
    note : ?Text;
  };

  // NewFoodComponent mirrors the POST-migration FoodComponent shape — the
  // four old fields PLUS the new optional `anchorY : ?Float`. anchorY
  // defaults to null for every existing component.
  type NewFoodComponent = {
    item : Text;
    amount : Text;
    group : ?Text;
    note : ?Text;
    anchorY : ?Float;
  };

  // FoodServiceware mirrors src/backend/types/library.mo FoodServiceware.
  // Carried forward verbatim — unchanged by this migration.
  type FoodServiceware = {
    item : Text;
    amount : Text;
  };

  // OldFoodRecipe mirrors the PRE-migration FoodRecipe shape (the
  // fifteen-field shape WITHOUT buildHeader). Carried forward from the
  // preceding migration's NewFoodRecipe.
  type OldFoodRecipe = {
    station : Text;
    kind : FoodRecipeKind;
    menuSection : ?Text;
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

  // NewFoodRecipe mirrors the POST-migration FoodRecipe shape — the fifteen
  // old fields PLUS the new optional `buildHeader : ?Text` (placed after
  // menuSection, matching the type definition). buildHeader defaults to null
  // for every existing recipe. The nested components use NewFoodComponent
  // (with anchorY = null).
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
  // eleven-field shape), where the nested ?FoodRecipe uses OldFoodRecipe (no
  // buildHeader, components without anchorY). The nested ?Recipe uses the
  // unchanged Recipe type.
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
  // (with buildHeader = null and components with anchorY = null). The nested
  // ?Recipe uses the unchanged Recipe type.
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
  // forward verbatim and adding the new optional `anchorY = null`. Existing
  // components have no anchorY; null means "render exactly as today".
  func migrateFoodComponent(c : OldFoodComponent) : NewFoodComponent {
    {
      item = c.item;
      amount = c.amount;
      group = c.group;
      note = c.note;
      anchorY = null;
    };
  };

  // Rebuild an OldFoodRecipe as a NewFoodRecipe, carrying every field
  // forward verbatim, migrating each component to add anchorY = null, and
  // adding the new optional `buildHeader = null`. Existing recipes have no
  // buildHeader; null means "no kicker line — render exactly as today".
  func migrateFoodRecipe(fr : OldFoodRecipe) : NewFoodRecipe {
    {
      station = fr.station;
      kind = fr.kind;
      menuSection = fr.menuSection;
      buildHeader = null;
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
  // to add buildHeader = null and anchorY = null on each component. The
  // nested ?Recipe (beverage) is carried forward unchanged — the Build Card
  // additions do not touch beverage recipes.
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
    // though only the nested FoodComponent/FoodRecipe shapes change. No data
    // is lost — every field is carried forward; only the two new optional
    // fields (anchorY, buildHeader) are added as null. Items without a
    // foodRecipe are carried forward verbatim (only the foodRecipe-bearing
    // items get the new null fields on their nested components/recipe).
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
