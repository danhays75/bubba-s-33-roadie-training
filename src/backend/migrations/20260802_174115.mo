import Map "mo:core/Map";
import List "mo:core/List";
import Principal "mo:core/Principal";
import Set "mo:core/Set";

module {
  // Nineteenth migration: add the Food Recipe data model (Part A of the Food
  // Recipes build). Two additive, stable-incompatible changes:
  //
  //   1. LayoutStyle gains a new `#kitchen` variant tag (the station-filtered,
  //      searchable food-recipe browser position layout, alongside the
  //      existing `#library` and `#orientation`). Adding a variant tag is
  //      stable-compatible at the variant type itself, but Position is nested
  //      inside `positions : List.List<Position>` and List is invariant in its
  //      element type, so the positions list must be rebuilt, casting each
  //      position's `layoutStyle` to the new variant type. No position data is
  //      lost or invented — every existing field is carried forward verbatim;
  //      only the variant type widens (existing `#library` / `#orientation`
  //      values stay exactly as they were).
  //
  //   2. LibraryItem gains a new optional `foodRecipe : ?FoodRecipe` field
  //      (parallel to the existing beverage `recipe` field). When present, the
  //      item is a food recipe and the Food Recipe card renders from this
  //      payload; when null, the item keeps the existing generic /
  //      beverage-recipe shape with no regression. LibraryItem is nested
  //      inside `items : List.List<LibraryItem>` and List is invariant, so the
  //      items list must be rebuilt, mapping each OldLibraryItem to a
  //      NewLibraryItem by adding `foodRecipe = null`. No item data is lost —
  //      every existing field (including the beverage `recipe` with its
  //      `recapAudio` sub-field added by the preceding migration) is carried
  //      forward verbatim; only the new `foodRecipe` field is added with its
  //      default of null (so existing items are not food recipes until an
  //      admin adds one).
  //
  // OldActor mirrors the NewActor of the preceding migration
  // (20260730_000000.mo) — the previously deployed stable signature, where
  // LayoutStyle has only `#library` / `#orientation` and LibraryItem has no
  // `foodRecipe` field. The NewActor inlines the NEW LayoutStyle (with
  // `#kitchen` added) and the NEW LibraryItem shape (with
  // `foodRecipe : ?FoodRecipe` added as the last field), plus the full
  // FoodRecipe / FoodRecipeKind / FoodComponent / FoodServiceware type
  // definitions the new field references.

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

  // OldLayoutStyle mirrors the PRE-migration LayoutStyle shape (the two tags
  // from the preceding migration, WITHOUT #kitchen).
  type OldLayoutStyle = {
    #library;
    #orientation;
  };

  // NewLayoutStyle mirrors the POST-migration LayoutStyle shape (the two prior
  // tags plus the new `#kitchen` tag added as the last constructor).
  type NewLayoutStyle = {
    #library;
    #orientation;
    #kitchen;
  };

  // OldPosition mirrors the PRE-migration Position shape (layoutStyle uses
  // OldLayoutStyle).
  type OldPosition = {
    id : Nat;
    name : Text;
    description : ?Text;
    coverPhoto : ?Text;
    sortOrder : Nat;
    layoutStyle : OldLayoutStyle;
  };

  // NewPosition mirrors the POST-migration Position shape (layoutStyle uses
  // NewLayoutStyle).
  type NewPosition = {
    id : Nat;
    name : Text;
    description : ?Text;
    coverPhoto : ?Text;
    sortOrder : Nat;
    layoutStyle : NewLayoutStyle;
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

  // Category mirrors src/backend/types/library.mo Category. Carried forward
  // verbatim — unchanged by this migration.
  type Category = {
    id : Nat;
    positionId : Nat;
    name : Text;
    coverPhoto : ?Text;
    sortOrder : Nat;
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
  // from the preceding migration, WITH recapAudio). Carried forward verbatim —
  // unchanged by this migration (the beverage recipe sub-object is not
  // modified; only the sibling `foodRecipe` field is added to LibraryItem).
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

  // FoodRecipeKind mirrors src/backend/types/library.mo FoodRecipeKind. New
  // type introduced by this migration — selects the food-recipe layout
  // (#menuBuild = plated dish; #prep = batch/prep recipe).
  type FoodRecipeKind = {
    #menuBuild;
    #prep;
  };

  // FoodComponent mirrors src/backend/types/library.mo FoodComponent. New
  // type introduced by this migration — a single component/ingredient line in
  // a food recipe's component list.
  type FoodComponent = {
    item : Text;
    amount : Text;
    group : ?Text;
    note : ?Text;
  };

  // FoodServiceware mirrors src/backend/types/library.mo FoodServiceware. New
  // type introduced by this migration — a plating-vessel line for a menuBuild
  // food recipe.
  type FoodServiceware = {
    item : Text;
    amount : Text;
  };

  // FoodRecipe mirrors src/backend/types/library.mo FoodRecipe. New type
  // introduced by this migration — the structured food-recipe payload, parallel
  // to the beverage Recipe. Stored as `foodRecipe : ?FoodRecipe` on
  // LibraryItem; null means the item is not a food recipe.
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

  // OldLibraryItem mirrors the PRE-migration LibraryItem shape (no foodRecipe
  // field; recipe uses the ten-field Recipe with recapAudio).
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
  };

  // NewLibraryItem mirrors the POST-migration LibraryItem shape (the eleven
  // prior fields plus the new `foodRecipe : ?FoodRecipe` field added as the
  // last field). The beverage `recipe` sub-object is carried forward verbatim.
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

  // Question mirrors src/backend/types/legendary.mo Question (unchanged by
  // this migration — the variant union is NOT modified).
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
  // DrinksBuilderSettings (the 17-field shape from the preceding migration).
  // Carried forward verbatim — unchanged by this migration.
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
  // Carried forward verbatim — unchanged by this migration.
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
  // VerifiedEmails.State — a wrapper record around a Set.Set<Text>. The
  // installed package declares the `verifiedEmails` field as IMMUTABLE (the
  // Set itself is the mutable B-tree), so the migration's
  // NewActor.verifiedEmails must mirror that exact shape (no `var` on the
  // field) for the stable-compatibility check (M0170) to pass. Carried
  // forward verbatim from the preceding migration.
  type VerifiedEmailsState = {
    verifiedEmails : Set.Set<Text>;
  };

  type OldActor = {
    var accessControlState : AccessControlState;
    profiles : Map.Map<Principal, UserProfile>;
    positions : List.List<OldPosition>;
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
    positions : List.List<NewPosition>;
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

  // Rebuild an OldPosition as a NewPosition. The only change is widening the
  // `layoutStyle` variant type from OldLayoutStyle (two tags) to NewLayoutStyle
  // (three tags). The variant value itself is unchanged — an existing
  // `#library` stays `#library`, an existing `#orientation` stays
  // `#orientation`; no position is reclassified to `#kitchen` (the new tag is
  // only selected by an admin setting it on a position going forward). All
  // other fields are carried forward verbatim. No data is lost or invented.
  func migratePosition(p : OldPosition) : NewPosition {
    let newLayoutStyle : NewLayoutStyle = p.layoutStyle;
    {
      id = p.id;
      name = p.name;
      description = p.description;
      coverPhoto = p.coverPhoto;
      sortOrder = p.sortOrder;
      layoutStyle = newLayoutStyle;
    };
  };

  // Rebuild an OldLibraryItem as a NewLibraryItem by adding the new
  // `foodRecipe` field with its default value of null. The beverage `recipe`
  // sub-object (with its `recapAudio` sub-field from the preceding migration)
  // is carried forward verbatim — the beverage recipe path is not modified.
  // All other fields are carried forward verbatim. No data is lost — existing
  // items keep their exact id/categoryId/title/subtitle/photo/details/notes/
  // tags/seasonal/sortOrder/recipe and gain foodRecipe = null (so existing
  // items are not food recipes until an admin adds one — nothing breaks).
  func migrateItem(item : OldLibraryItem) : NewLibraryItem {
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
      foodRecipe = null;
    };
  };

  public func migration(old : OldActor) : NewActor {
    // Rebuild the positions list: each OldPosition -> NewPosition, widening
    // the nested `layoutStyle` variant type to include the new `#kitchen` tag.
    // List is invariant in its element type, so the list must be rebuilt even
    // though the change is a pure variant widening at the value level. No
    // position data is lost or invented — existing layoutStyle values stay
    // exactly as they were; only the variant type widens.
    let newPositions = List.empty<NewPosition>();
    old.positions.forEach(func(p : OldPosition) {
      newPositions.add(migratePosition(p));
    });
    // Rebuild the items list: each OldLibraryItem -> NewLibraryItem, adding
    // the new `foodRecipe` field with its default value of null. List is
    // invariant in its element type, so the list must be rebuilt even though
    // the change is additive at the value level. No data is lost — existing
    // items keep their exact fields (including the beverage `recipe` with its
    // `recapAudio` sub-field) and gain foodRecipe = null (so existing items
    // are not food recipes until an admin adds one — nothing breaks).
    let newItems = List.empty<NewLibraryItem>();
    old.items.forEach(func(item : OldLibraryItem) {
      newItems.add(migrateItem(item));
    });
    {
      var accessControlState = old.accessControlState;
      profiles = old.profiles;
      positions = newPositions;
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
