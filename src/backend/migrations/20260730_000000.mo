import Map "mo:core/Map";
import List "mo:core/List";
import Principal "mo:core/Principal";
import Set "mo:core/Set";

module {
  // Eighteenth migration: add an optional `recapAudio : ?Text` field to the
  // Recipe type. It holds the durable object-storage URL of the drink's
  // recap voice clip — a full spoken walk-through played at the end of a
  // Drinks Builder round after a Roadie builds this drink. Playback-only —
  // NO pool, decoy, scoring, or round-flow logic reads it; it rides along
  // on the LibraryItem returned by getDrinksBuilderPlayablePool unchanged.
  // The audio URL is a durable object-storage URL (same kind as profile
  // photos and the Drinks Builder answer/celebration clips), stored as Text
  // with no validation at the type layer.
  //
  // This change is NOT stable-compatible at the top-level actor field level:
  // Recipe gains a required field, and Recipe is nested inside
  // LibraryItem.recipe : ?Recipe inside items : List.List<LibraryItem>. List
  // is invariant in its element type, so the items list must be rebuilt,
  // mapping each OldLibraryItem to a NewLibraryItem. For items with a
  // non-null recipe, the nested OldRecipe is migrated to a NewRecipe by
  // adding `recapAudio = null`. For items with a null recipe, the recipe
  // stays null (no recipe is invented). No field values are lost — every
  // existing Recipe field is carried forward verbatim; only the new
  // `recapAudio` field is added with its default of null.
  //
  // OldActor mirrors the NewActor of the preceding migration
  // (20260729_000000.mo) — the previously deployed stable signature, where
  // Recipe has the nine fields WITHOUT recapAudio. The NewActor inlines the
  // NEW Recipe shape (with `recapAudio : ?Text` added as the last field).

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

  // UserProfile mirrors src/backend/types/foundation.mo UserProfile (with
  // photo, unchanged by this migration). Carried forward verbatim.
  type UserProfile = {
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

  // OldRecipe mirrors the PRE-migration Recipe shape (the nine fields from
  // the preceding migration, WITHOUT recapAudio).
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
  };

  // NewRecipe mirrors the POST-migration Recipe shape (the nine prior fields
  // plus the new `recapAudio : ?Text` field added as the last field). The
  // recapAudio URL is a durable object-storage URL (same kind as profile
  // photos and the Drinks Builder answer/celebration clips), playback-only —
  // never read by pool/scoring logic.
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

  // DrinksBuilderPrompt mirrors src/backend/types/legendary.mo
  // DrinksBuilderPrompt = { text : Text; audioUrl : ?Text }. Carried forward
  // verbatim — unchanged by this migration.
  type DrinksBuilderPrompt = {
    text : Text;
    audioUrl : ?Text;
  };

  // DrinksBuilderAnswerClip mirrors src/backend/types/legendary.mo
  // DrinksBuilderAnswerClip = { answer : Text; audioUrl : Text }. Carried
  // forward verbatim — unchanged by this migration.
  type DrinksBuilderAnswerClip = {
    answer : Text;
    audioUrl : Text;
  };

  // DrinksBuilderSettings mirrors src/backend/types/legendary.mo
  // DrinksBuilderSettings (the 17-field shape from the preceding migration,
  // with the four prompt lists as [DrinksBuilderPrompt] and the three
  // display/playback-only fields correctAffirmations / answerClips /
  // celebrationClips). Carried forward verbatim — unchanged by this
  // migration.
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
  // Carried forward verbatim — unchanged by this migration (the
  // #drinksBuilderContent variant still uses DrinksBuilderContent with the
  // 17-field settings shape from the preceding migration).
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

  // Rebuild an OldRecipe as a NewRecipe by adding the new `recapAudio` field
  // with its default value of null. The nine prior fields are carried
  // forward verbatim. No data is lost or invented beyond the single new
  // field (recapAudio defaults to null so existing recipes have no recap
  // clip until an admin adds one). Playback-only — never read by
  // pool/scoring logic.
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
      recapAudio = null;
    };
  };

  // Rebuild an OldLibraryItem as a NewLibraryItem. For items with a non-null
  // recipe, the nested OldRecipe is migrated to a NewRecipe (recapAudio is
  // added with its default value of null). For items with a null recipe, the
  // recipe stays null (no recipe is invented). All other fields are carried
  // forward verbatim. No data is lost — existing items keep their exact
  // id/categoryId/title/subtitle/photo/details/notes/tags/seasonal/sortOrder
  // and their existing recipe fields; only the new `recapAudio` field is
  // added inside the recipe (so existing saved recipes keep their
  // glassware/specs/assembly/garnish/variants/equipment/yield/shelfLife/
  // qualityIdentifier verbatim and gain recapAudio = null — nothing breaks).
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
    };
  };

  public func migration(old : OldActor) : NewActor {
    // Rebuild the items list: each OldLibraryItem -> NewLibraryItem, migrating
    // the nested recipe (when present) to add the new `recapAudio` field with
    // its default value of null. List is invariant in its element type, so
    // the list must be rebuilt even though the change is additive at the
    // value level. No data is lost — existing items keep their exact fields;
    // only the new `recapAudio` field is added inside the recipe (so existing
    // saved recipes keep their glassware/specs/assembly/garnish/variants/
    // equipment/yield/shelfLife/qualityIdentifier verbatim and gain
    // recapAudio = null — nothing breaks). Items with a null recipe stay
    // null (no recipe is invented).
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
