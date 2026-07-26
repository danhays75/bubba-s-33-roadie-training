import Map "mo:core/Map";
import List "mo:core/List";
import Principal "mo:core/Principal";
import Set "mo:core/Set";

module {
  // Sixteenth migration: upgrade the four Drinks Builder prompt-list fields
  // on DrinksBuilderSettings (glasswarePrompts / specsPrompts /
  // assemblyPrompts / garnishPrompts) from [Text] to [DrinksBuilderPrompt],
  // where DrinksBuilderPrompt = { text : Text; audioUrl : ?Text }. Each
  // existing prompt string S becomes { text = S; audioUrl = null }, so
  // existing saved #drinksBuilder activities keep their prompts verbatim
  // with no audio attached. The audioUrl is display/playback only — NO
  // pool, decoy, scoring, or round-flow logic reads it.
  //
  // This change is NOT stable-compatible at the top-level actor field
  // level: DrinksBuilderSettings changes the element type of four nested
  // arrays, and DrinksBuilderSettings is nested inside
  // ActivityContent.#drinksBuilderContent.settings inside Activity inside
  // legendaryActivities : List.List<Activity>. List is invariant in its
  // element type, so the legendaryActivities list must be rebuilt, mapping
  // each OldActivity to a NewActivity. For #drinksBuilder activities, the
  // nested OldDrinksBuilderSettings is migrated to a NewDrinksBuilderSettings
  // by mapping each of the four [Text] prompt lists to [DrinksBuilderPrompt]
  // (each string S -> { text = S; audioUrl = null }). For #quiz / #flashcards
  // activities the content is carried forward verbatim (their content
  // variant does not embed DrinksBuilderSettings).
  //
  // OldActor mirrors the NewActor of the preceding migration
  // (20260727_000000.mo) — the previously deployed stable signature, where
  // DrinksBuilderSettings has the 14 fields with the four prompt lists as
  // [Text]. The NewActor inlines the NEW DrinksBuilderSettings shape (with
  // the four prompt lists as [DrinksBuilderPrompt]).

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

  // Recipe mirrors src/backend/types/library.mo Recipe. Carried forward
  // verbatim — the items list is NOT rebuilt by this migration (no change
  // to LibraryItem or Recipe this wave).
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

  // LibraryItem mirrors src/backend/types/library.mo LibraryItem. Carried
  // forward verbatim.
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

  // OldDrinksBuilderPrompt — the PRE-migration prompt element shape (a plain
  // Text string). The four prompt lists on OldDrinksBuilderSettings are
  // [OldDrinksBuilderPrompt] = [Text].
  type OldDrinksBuilderPrompt = Text;

  // NewDrinksBuilderPrompt mirrors the POST-migration DrinksBuilderPrompt
  // shape: { text : Text; audioUrl : ?Text }. The audioUrl is
  // display/playback only — never read by pool/scoring logic.
  type NewDrinksBuilderPrompt = {
    text : Text;
    audioUrl : ?Text;
  };

  // OldDrinksBuilderSettings mirrors the PRE-migration DrinksBuilderSettings
  // shape (the 14 fields from the preceding migration, with the four prompt
  // lists as [Text]).
  type OldDrinksBuilderSettings = {
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
    glasswarePrompts : [OldDrinksBuilderPrompt];
    specsPrompts : [OldDrinksBuilderPrompt];
    assemblyPrompts : [OldDrinksBuilderPrompt];
    garnishPrompts : [OldDrinksBuilderPrompt];
  };

  // NewDrinksBuilderSettings mirrors the POST-migration DrinksBuilderSettings
  // shape (the 14 fields, with the four prompt lists as
  // [NewDrinksBuilderPrompt]).
  type NewDrinksBuilderSettings = {
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
    glasswarePrompts : [NewDrinksBuilderPrompt];
    specsPrompts : [NewDrinksBuilderPrompt];
    assemblyPrompts : [NewDrinksBuilderPrompt];
    garnishPrompts : [NewDrinksBuilderPrompt];
  };

  // OldDrinksBuilderContent mirrors the PRE-migration DrinksBuilderContent
  // shape (settings uses OldDrinksBuilderSettings).
  type OldDrinksBuilderContent = {
    settings : OldDrinksBuilderSettings;
  };

  // NewDrinksBuilderContent mirrors the POST-migration DrinksBuilderContent
  // shape (settings uses NewDrinksBuilderSettings).
  type NewDrinksBuilderContent = {
    settings : NewDrinksBuilderSettings;
  };

  // OldActivityContent mirrors the PRE-migration ActivityContent shape (its
  // #drinksBuilderContent variant uses OldDrinksBuilderContent).
  type OldActivityContent = {
    #quizContent : QuizContent;
    #flashcardContent : FlashcardContent;
    #drinksBuilderContent : OldDrinksBuilderContent;
  };

  // NewActivityContent mirrors the POST-migration ActivityContent shape (its
  // #drinksBuilderContent variant uses NewDrinksBuilderContent).
  type NewActivityContent = {
    #quizContent : QuizContent;
    #flashcardContent : FlashcardContent;
    #drinksBuilderContent : NewDrinksBuilderContent;
  };

  // QuizSettings mirrors src/backend/types/legendary.mo QuizSettings. Carried
  // forward verbatim.
  type QuizSettings = {
    includeMultipleChoice : Bool;
    includeTrueFalse : Bool;
    includeMatching : Bool;
  };

  // OldActivity mirrors the PRE-migration Activity shape (content uses
  // OldActivityContent).
  type OldActivity = {
    id : Nat;
    positionId : Nat;
    activityType : ActivityType;
    name : Text;
    sourceCategoryIds : [Nat];
    content : OldActivityContent;
    quizSettings : ?QuizSettings;
    createdAt : Nat;
    createdBy : Principal;
  };

  // NewActivity mirrors the POST-migration Activity shape (content uses
  // NewActivityContent).
  type NewActivity = {
    id : Nat;
    positionId : Nat;
    activityType : ActivityType;
    name : Text;
    sourceCategoryIds : [Nat];
    content : NewActivityContent;
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
    items : List.List<LibraryItem>;
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

  type NewActor = {
    var accessControlState : AccessControlState;
    profiles : Map.Map<Principal, UserProfile>;
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
    legendaryActivities : List.List<NewActivity>;
    nextLegendaryActivityId : { var value : Nat };
    verifiedEmails : VerifiedEmailsState;
  };

  // Convert a PRE-migration prompt string into a POST-migration
  // DrinksBuilderPrompt with no audio attached. Each existing prompt string
  // S becomes { text = S; audioUrl = null } — the prompt text is preserved
  // verbatim and no audio is invented. The audioUrl is display/playback
  // only and is never read by pool/scoring logic.
  func migratePrompt(p : OldDrinksBuilderPrompt) : NewDrinksBuilderPrompt {
    { text = p; audioUrl = null };
  };

  // Convert a PRE-migration prompt list ([Text]) into a POST-migration
  // prompt list ([DrinksBuilderPrompt]) by mapping each string S to
  // { text = S; audioUrl = null }. The list order and length are preserved
  // (the 8-per-step cap is enforced separately by capDrinksBuilderPrompts
  // at write time, not by this migration).
  func migratePromptList(prompts : [OldDrinksBuilderPrompt]) : [NewDrinksBuilderPrompt] {
    prompts.map(func(p) = migratePrompt(p));
  };

  // Rebuild an OldDrinksBuilderSettings as a NewDrinksBuilderSettings by
  // migrating each of the four prompt lists from [Text] to
  // [DrinksBuilderPrompt] (each string S -> { text = S; audioUrl = null }).
  // The other 10 fields are carried forward verbatim. No data is lost or
  // invented beyond the new display-only audioUrl field (defaulted to null).
  func migrateDrinksBuilderSettings(s : OldDrinksBuilderSettings) : NewDrinksBuilderSettings {
    {
      includedCategories = s.includedCategories;
      excludedDrinkTitles = s.excludedDrinkTitles;
      decoyCount = s.decoyCount;
      requireExactAmounts = s.requireExactAmounts;
      enforceAssemblyOrder = s.enforceAssemblyOrder;
      showScoring = s.showScoring;
      streakMultiplier = s.streakMultiplier;
      pointsPerCorrect = s.pointsPerCorrect;
      roundsPerSession = s.roundsPerSession;
      soundDefault = s.soundDefault;
      glasswarePrompts = migratePromptList(s.glasswarePrompts);
      specsPrompts = migratePromptList(s.specsPrompts);
      assemblyPrompts = migratePromptList(s.assemblyPrompts);
      garnishPrompts = migratePromptList(s.garnishPrompts);
    };
  };

  // Rebuild an OldActivityContent as a NewActivityContent. For
  // #drinksBuilderContent, the nested OldDrinksBuilderSettings is migrated
  // to a NewDrinksBuilderSettings (the four prompt lists are upgraded from
  // [Text] to [DrinksBuilderPrompt]). For #quizContent and
  // #flashcardContent, the content is carried forward verbatim (those
  // variants do not embed DrinksBuilderSettings).
  func migrateActivityContent(c : OldActivityContent) : NewActivityContent {
    switch (c) {
      case (#quizContent q) #quizContent q;
      case (#flashcardContent f) #flashcardContent f;
      case (#drinksBuilderContent db) {
        #drinksBuilderContent({ settings = migrateDrinksBuilderSettings(db.settings) });
      };
    };
  };

  // Rebuild an OldActivity as a NewActivity by migrating its content (for
  // #drinksBuilder activities, the nested DrinksBuilderSettings's four
  // prompt lists are upgraded from [Text] to [DrinksBuilderPrompt]). All
  // other fields are carried forward verbatim. No data is lost — existing
  // activities keep their exact id/positionId/activityType/name/
  // sourceCategoryIds/quizSettings/createdAt/createdBy; only the four
  // prompt lists change element shape (each string S -> { text = S;
  // audioUrl = null }) inside #drinksBuilderContent.settings.
  func migrateActivity(a : OldActivity) : NewActivity {
    {
      id = a.id;
      positionId = a.positionId;
      activityType = a.activityType;
      name = a.name;
      sourceCategoryIds = a.sourceCategoryIds;
      content = migrateActivityContent(a.content);
      quizSettings = a.quizSettings;
      createdAt = a.createdAt;
      createdBy = a.createdBy;
    };
  };

  public func migration(old : OldActor) : NewActor {
    // Rebuild the legendaryActivities list: each OldActivity -> NewActivity,
    // migrating #drinksBuilderContent.settings to upgrade the four prompt
    // lists from [Text] to [DrinksBuilderPrompt] (each string S ->
    // { text = S; audioUrl = null }). List is invariant in its element
    // type, so the list must be rebuilt even though the change is additive
    // at the value level. No data is lost — existing activities keep their
    // exact fields; only the four prompt lists change element shape inside
    // #drinksBuilderContent.settings (so existing saved #drinksBuilder
    // activities keep their prompts verbatim with no audio attached —
    // nothing breaks). #quiz / #flashcards activities are carried forward
    // verbatim (their content variant does not embed DrinksBuilderSettings).
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
      items = old.items;
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
