import Map "mo:core/Map";
import List "mo:core/List";
import Principal "mo:core/Principal";
import Set "mo:core/Set";

module {
  // Fourteenth migration: add a required `upsell : Bool` field to RecipeSpec
  // (marks an ingredient as a premium upsell option; defaults false), AND add
  // an optional `quizSettings : ?QuizSettings` field to the legendary
  // Activity record (carries the admin's per-quiz question-type selection:
  // which of #multipleChoice / #trueFalse / #matching the generator emits;
  // null means all-three-on, the backward-compatible default).
  //
  // Neither change is stable-compatible at the top-level actor field level:
  //   - RecipeSpec gains a required field, and RecipeSpec is nested inside
  //     Recipe.specs / RecipeVariant.specs inside LibraryItem.recipe inside
  //     items : List.List<LibraryItem>. List is invariant in its element
  //     type, so the items list must be rebuilt, mapping each OldRecipeSpec
  //     to a NewRecipeSpec by adding upsell = false. No data is lost or
  //     invented — existing specs keep their exact amount/ingredient; only
  //     the new upsell field is defaulted to false (no existing ingredient
  //     is tagged as an upsell until the admin marks it).
  //   - Activity gains a new field, and Activity is the element type of
  //     legendaryActivities : List.List<Activity>. List is invariant, so the
  //     legendaryActivities list must be rebuilt, mapping each OldActivity to
  //     a NewActivity by adding quizSettings = null. No data is lost —
  //     existing activities keep their exact id/positionId/activityType/name/
  //     sourceCategoryIds/content/createdAt/createdBy; only the new
  //     quizSettings field is defaulted to null (all-three-on, so existing
  //     quizzes regenerate exactly as before).
  //
  // OldActor mirrors the NewActor of the preceding migration
  // (20260723_000000.mo) — the previously deployed stable signature, where
  // RecipeSpec has no upsell field and Activity has no quizSettings field.
  // The NewActor inlines the NEW RecipeSpec shape (with upsell : Bool) and
  // the NEW Activity shape (with quizSettings : ?QuizSettings).

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

  // OldUserProfile mirrors the PRE-migration UserProfile shape (with photo,
  // unchanged by this migration). Carried forward verbatim.
  type OldUserProfile = {
    id : Principal;
    name : Text;
    storeLocation : Text;
    role : Role;
    approvalStatus : ApprovalStatus;
    email : ?Text;
    photo : ?Text;
  };

  // NewUserProfile is identical to OldUserProfile — photo was added in the
  // preceding migration. Aliased here so the profiles map type is consistent
  // on both sides (no rebuild needed for profiles this migration).
  type NewUserProfile = OldUserProfile;

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

  // OldRecipeSpec mirrors the PRE-migration RecipeSpec shape (no upsell).
  type OldRecipeSpec = {
    amount : Text;
    ingredient : Text;
  };

  // NewRecipeSpec mirrors the POST-migration RecipeSpec shape (with upsell).
  type NewRecipeSpec = {
    amount : Text;
    ingredient : Text;
    upsell : Bool;
  };

  // OldRecipeVariant mirrors the PRE-migration RecipeVariant shape (its
  // specs use OldRecipeSpec).
  type OldRecipeVariant = {
    variantLabel : Text;
    specs : [OldRecipeSpec];
    assembly : [Text];
  };

  // NewRecipeVariant mirrors the POST-migration RecipeVariant shape (its
  // specs use NewRecipeSpec).
  type NewRecipeVariant = {
    variantLabel : Text;
    specs : [NewRecipeSpec];
    assembly : [Text];
  };

  // OldRecipe mirrors the PRE-migration Recipe shape (specs/variants use
  // OldRecipeSpec / OldRecipeVariant).
  type OldRecipe = {
    glassware : Text;
    specs : [OldRecipeSpec];
    assembly : [Text];
    garnish : [Text];
    variants : [OldRecipeVariant];
    equipment : [Text];
    yield : ?Text;
    shelfLife : ?Text;
    qualityIdentifier : [Text];
  };

  // NewRecipe mirrors the POST-migration Recipe shape (specs/variants use
  // NewRecipeSpec / NewRecipeVariant).
  type NewRecipe = {
    glassware : Text;
    specs : [NewRecipeSpec];
    assembly : [Text];
    garnish : [Text];
    variants : [NewRecipeVariant];
    equipment : [Text];
    yield : ?Text;
    shelfLife : ?Text;
    qualityIdentifier : [Text];
  };

  // OldLibraryItem mirrors the PRE-migration LibraryItem shape (recipe uses
  // OldRecipe).
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

  // NewLibraryItem mirrors the POST-migration LibraryItem shape (recipe uses
  // NewRecipe).
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

  // DrinksBuilderSettings mirrors src/backend/types/legendary.mo
  // DrinksBuilderSettings (unchanged by this migration).
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

  // QuizSettings mirrors src/backend/types/legendary.mo QuizSettings (the
  // new type introduced by this build wave).
  type QuizSettings = {
    includeMultipleChoice : Bool;
    includeTrueFalse : Bool;
    includeMatching : Bool;
  };

  // OldActivity mirrors the PRE-migration Activity shape (no quizSettings).
  type OldActivity = {
    id : Nat;
    positionId : Nat;
    activityType : ActivityType;
    name : Text;
    sourceCategoryIds : [Nat];
    content : ActivityContent;
    createdAt : Nat;
    createdBy : Principal;
  };

  // NewActivity mirrors the POST-migration Activity shape (with quizSettings).
  type NewActivity = {
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

  type OldActor = {
    var accessControlState : AccessControlState;
    profiles : Map.Map<Principal, OldUserProfile>;
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
    legendaryActivities : List.List<OldActivity>;
    nextLegendaryActivityId : { var value : Nat };
    verifiedEmails : VerifiedEmailsState;
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

  type NewActor = {
    var accessControlState : AccessControlState;
    profiles : Map.Map<Principal, NewUserProfile>;
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
    legendaryActivities : List.List<NewActivity>;
    nextLegendaryActivityId : { var value : Nat };
    verifiedEmails : VerifiedEmailsState;
  };

  // Rebuild an OldRecipeSpec as a NewRecipeSpec by adding upsell = false.
  // Existing specs keep their exact amount/ingredient; only the new upsell
  // field is defaulted to false (no existing ingredient is tagged as an
  // upsell until the admin marks it).
  func migrateRecipeSpec(s : OldRecipeSpec) : NewRecipeSpec {
    {
      amount = s.amount;
      ingredient = s.ingredient;
      upsell = false;
    };
  };

  // Rebuild an OldRecipeVariant as a NewRecipeVariant by migrating its
  // specs array (each OldRecipeSpec -> NewRecipeSpec with upsell = false).
  // variantLabel and assembly are carried forward verbatim.
  func migrateRecipeVariant(v : OldRecipeVariant) : NewRecipeVariant {
    {
      variantLabel = v.variantLabel;
      specs = v.specs.map(func(s : OldRecipeSpec) : NewRecipeSpec = migrateRecipeSpec(s));
      assembly = v.assembly;
    };
  };

  // Rebuild an OldRecipe as a NewRecipe by migrating its specs and variants.
  // glassware/assembly/garnish/equipment/yield/shelfLife/qualityIdentifier
  // are carried forward verbatim.
  func migrateRecipe(r : OldRecipe) : NewRecipe {
    {
      glassware = r.glassware;
      specs = r.specs.map(func(s : OldRecipeSpec) : NewRecipeSpec = migrateRecipeSpec(s));
      assembly = r.assembly;
      garnish = r.garnish;
      variants = r.variants.map(func(v : OldRecipeVariant) : NewRecipeVariant = migrateRecipeVariant(v));
      equipment = r.equipment;
      yield = r.yield;
      shelfLife = r.shelfLife;
      qualityIdentifier = r.qualityIdentifier;
    };
  };

  // Rebuild an OldLibraryItem as a NewLibraryItem by migrating its optional
  // recipe (OldRecipe -> NewRecipe when present; null stays null). All other
  // fields are carried forward verbatim.
  func migrateLibraryItem(i : OldLibraryItem) : NewLibraryItem {
    let newRecipe : ?NewRecipe = switch (i.recipe) {
      case (?r) ?migrateRecipe(r);
      case null null;
    };
    {
      id = i.id;
      categoryId = i.categoryId;
      title = i.title;
      subtitle = i.subtitle;
      photo = i.photo;
      details = i.details;
      notes = i.notes;
      tags = i.tags;
      seasonal = i.seasonal;
      sortOrder = i.sortOrder;
      recipe = newRecipe;
    };
  };

  // Rebuild an OldActivity as a NewActivity by adding quizSettings = null.
  // Existing activities keep their exact id/positionId/activityType/name/
  // sourceCategoryIds/content/createdAt/createdBy; only the new quizSettings
  // field is defaulted to null (all-three-on, so existing quizzes regenerate
  // exactly as before this build wave).
  func migrateActivity(a : OldActivity) : NewActivity {
    {
      id = a.id;
      positionId = a.positionId;
      activityType = a.activityType;
      name = a.name;
      sourceCategoryIds = a.sourceCategoryIds;
      content = a.content;
      quizSettings = null;
      createdAt = a.createdAt;
      createdBy = a.createdBy;
    };
  };

  public func migration(old : OldActor) : NewActor {
    // Rebuild the items list: each OldLibraryItem -> NewLibraryItem, adding
    // upsell = false to every RecipeSpec in every Recipe.specs and every
    // RecipeVariant.specs inside each item's optional recipe. List is
    // invariant in its element type, so the list must be rebuilt even though
    // the change is additive at the value level. No data is lost or
    // invented — existing specs keep their exact amount/ingredient; only
    // the new upsell field is defaulted to false.
    let newItems = List.empty<NewLibraryItem>();
    old.items.forEach(func(i : OldLibraryItem) {
      newItems.add(migrateLibraryItem(i));
    });
    // Rebuild the legendaryActivities list: each OldActivity -> NewActivity,
    // adding quizSettings = null. List is invariant, so the list must be
    // rebuilt. No data is lost — existing activities keep their exact
    // fields; only the new quizSettings field is defaulted to null
    // (all-three-on, backward compatible).
    let newActivities = List.empty<NewActivity>();
    old.legendaryActivities.forEach(func(a : OldActivity) {
      newActivities.add(migrateActivity(a));
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
      legendaryActivities = newActivities;
      nextLegendaryActivityId = old.nextLegendaryActivityId;
      verifiedEmails = old.verifiedEmails;
    };
  };
};
