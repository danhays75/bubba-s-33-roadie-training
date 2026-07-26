import Principal "mo:core/Principal";

module {
  // ActivityType — the kind of practice activity. Extensible: #quiz and
  // #flashcards are generated today; #drinksBuilder is the Drinks Builder
  // game (practice-only, session scores, no server persistence). The variant
  // is open so new activity types can be added later without reshaping
  // stored records.
  public type ActivityType = {
    #quiz;
    #flashcards;
    #drinksBuilder;
  };

  // Question — one question inside a quiz. Three shapes are mixed in one quiz:
  //   #multipleChoice : "What [detailField] does [itemTitle] use?" with 4
  //     choices (1 correct from the item, 3 distractors from other items'
  //     same field).
  //   #matching : pairs item titles to a specific detail field value, with
  //     shuffled options.
  //   #trueFalse : asserts an item's detail field value (true) or a swapped
  //     value (false).
  public type Question = {
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

  // QuizContent — the list of questions for a #quiz activity.
  public type QuizContent = [Question];

  // Flashcard — one card generated from a Library item. Front = title (plus
  // photo if the item has one); back = all of the item's detail fields, plus
  // the structured recipe (glassware/specs/assembly/garnish) when the item
  // carries one. The recipe field is optional so existing serialized
  // flashcards (non-recipe items) do not break — it is null when the item has
  // no recipe. Only the four user-facing sections the flashcard back needs
  // are carried (glassware, specs, assembly, garnish) — NOT
  // variants/equipment/yield/shelfLife/qualityIdentifier, which belong on the
  // full recipe card view, not the flashcard.
  public type FlashcardRecipe = {
    glassware : Text;
    specs : [{ amount : Text; ingredient : Text }];
    assembly : [Text];
    garnish : [Text];
  };

  public type Flashcard = {
    itemTitle : Text;
    itemPhoto : ?Text;
    detailFields : [{ fieldLabel : Text; value : Text }];
    recipe : ?FlashcardRecipe;
  };

  // FlashcardContent — the list of flashcards for a #flashcards activity.
  public type FlashcardContent = [Flashcard];

  // DrinksBuilderSettings — admin-configurable settings for a #drinksBuilder
  // activity. The Drinks Builder game is practice-only with session-only
  // scores (no server persistence, no leaderboard). Settings control which
  // drinks are in scope, how decoys are drawn, and how scoring behaves.
  //
  //   includedCategories    : category IDS (as text, e.g. "12") to draw drinks
  //                           from. Empty = all in-scope categories (bulk-mix
  //                           recipes excluded by the lib helper). The lib
  //                           helper matches each entry against
  //                           item.categoryId.toText(), so ids — not titles —
  //                           must be stored here.
  //   excludedDrinkTitles   : drink titles to exclude from the playable pool
  //                           (by title, since recipes are matched by title).
  //   decoyCount            : number of decoy ingredients/drinks drawn from
  //                           the global decoy pool (all other in-scope
  //                           recipes across all categories). 0-3, default 2.
  //   requireExactAmounts   : whether spec amounts must match exactly or just
  //                           ingredient presence. Default true.
  //   enforceAssemblyOrder  : whether assembly steps must be performed in the
  //                           recipe's listed order. Default true.
  //   showScoring           : whether to show the running score during play.
  //                           Default true.
  //   streakMultiplier      : whether consecutive correct builds multiply the
  //                           per-correct award. Default true.
  //   pointsPerCorrect      : base points awarded per correct build.
  //                           Default 50.
  //   roundsPerSession      : number of rounds per session. 0 = unlimited
  //                           (play until the learner stops). Default 0.
  //   soundDefault          : default on/off state for in-app WebAudio sound
  //                           effects. Default true.
  //   glasswarePrompts      : admin-editable, rotating step heading prompts
  //                           for the GLASSWARE step. 0-8 DrinksBuilderPrompt
  //                           entries, display-only (no pool/scoring/round
  //                           logic reads them). The game picks one per round
  //                           at random, seeded by the round index; falls back
  //                           to the default heading when the list is empty.
  //                           Defaults ship with the first entry being the
  //                           canonical "GLASSWARE" label. Each entry may carry
  //                           an optional audioUrl pointing at a durable
  //                           object-storage clip that plays when the prompt
  //                           becomes active — display/playback only, never
  //                           read by pool/scoring logic.
  //   specsPrompts          : same shape as glasswarePrompts, for the SPECS
  //                           step.
  //   assemblyPrompts       : same shape as glasswarePrompts, for the ASSEMBLY
  //                           step.
  //   garnishPrompts        : same shape as glasswarePrompts, for the GARNISH
  //                           step.
  //
  // DrinksBuilderPrompt — one admin-editable step-heading prompt entry. The
  // text is the heading shown when the step becomes active; the optional
  // audioUrl is a durable object-storage clip (same kind as profile photos)
  // that plays when the prompt appears in the game. The audio is
  // display/playback only — NO pool, decoy, scoring, or round-flow logic
  // reads audioUrl. Existing saved prompts (pre-audio) migrate to
  // { text = S; audioUrl = null }.
  public type DrinksBuilderPrompt = {
    text : Text;
    audioUrl : ?Text;
  };

  public type DrinksBuilderSettings = {
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
  };

  // DrinksBuilderContent — the persisted payload for a #drinksBuilder
  // activity. Holds only the admin-configured settings; the playable drink
  // pool and decoys are derived at play time from the Library (via the
  // settings) so the activity stays in sync as the Library changes. No
  // scores are stored here — practice is session-only.
  public type DrinksBuilderContent = {
    settings : DrinksBuilderSettings;
  };

  // QuizSettings — admin-configurable question-type selection for a #quiz
  // activity. Mirrors the DrinksBuilderSettings pattern: a record of
  // booleans the admin toggles per activity, persisted with the activity so
  // rebuilds and edits preserve the admin's choices. Each boolean controls
  // whether the corresponding Question variant is eligible for generation:
  //   includeMultipleChoice : emit #multipleChoice questions when true.
  //   includeTrueFalse      : emit #trueFalse questions when true.
  //   includeMatching       : emit #matching questions when true.
  // All three default to true so a quiz with no explicit QuizSettings (null
  // on the input) behaves as all-three-on — backward compatible with
  // existing quizzes generated before this field existed. The Question
  // variant union itself is unchanged; these booleans only gate which
  // variants the generator emits.
  public type QuizSettings = {
    includeMultipleChoice : Bool;
    includeTrueFalse : Bool;
    includeMatching : Bool;
  };

  // ActivityContent — the generated payload, keyed by activity type.
  public type ActivityContent = {
    #quizContent : QuizContent;
    #flashcardContent : FlashcardContent;
    #drinksBuilderContent : DrinksBuilderContent;
  };

  // Activity — a generated practice activity. Belongs to a position (the
  // position the admin was viewing when they triggered generation).
  // sourceCategoryIds records which Library categories the items were drawn
  // from. createdAt/createdBy are set by the backend on creation.
  //
  // quizSettings carries the admin's question-type selection for #quiz
  // activities (which of #multipleChoice / #trueFalse / #matching the
  // generator emits). Optional: null means all-three-on (the default, and
  // the value for activities generated before this field existed — backward
  // compatible). Persisted here so rebuildLegendaryActivity regenerates
  // content honoring the admin's choices, and updateLegendaryActivity can
  // replace it without regenerating. Ignored for #flashcards and
  // #drinksBuilder activities (always null for those).
  public type Activity = {
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

  // BuildActivityInput — the admin's request to generate an activity. The
  // backend fetches items from the selected sourceCategoryIds via the library
  // lib and generates quiz or flashcard content from those items and their
  // detail fields. For #drinksBuilder, the backend persists the supplied
  // DrinksBuilderSettings as the activity's content (no item-derived
  // generation — the playable pool is derived at play time).
  //
  // The `content` field carries the type-specific payload:
  //   #quiz              -> omit (content is generated from sourceCategoryIds)
  //   #flashcards        -> omit (content is generated from sourceCategoryIds)
  //   #drinksBuilder     -> ?#drinksBuilderContent(DrinksBuilderContent)
  //                        with the admin's chosen DrinksBuilderSettings
  //
  // `quizSettings` carries the admin's question-type selection for #quiz
  // activities (which of #multipleChoice / #trueFalse / #matching to emit).
  // Optional: null means all-three-on (backward compatible with existing
  // quizzes). Ignored for #flashcards and #drinksBuilder activities.
  public type BuildActivityInput = {
    positionId : Nat;
    activityType : ActivityType;
    name : Text;
    sourceCategoryIds : [Nat];
    content : ?ActivityContent;
    quizSettings : ?QuizSettings;
  };

  // ListActivitiesInput — filter for listing activities by position.
  public type ListActivitiesInput = {
    positionId : Nat;
  };

  // UpdateActivityInput — the admin's request to edit an existing activity's
  // metadata (name + sourceCategoryIds) WITHOUT regenerating content. The id
  // identifies the activity to update; name and sourceCategoryIds replace the
  // stored values. Content, positionId, activityType, createdAt, and createdBy
  // are preserved by the lib helper.
  //
  // For #drinksBuilder activities, the admin may also replace the
  // DrinksBuilderSettings via `content`. For #quiz/#flashcards, `content`
  // is ignored (use rebuildLegendaryActivity to regenerate).
  //
  // `quizSettings` carries the admin's question-type selection for #quiz
  // activities (which of #multipleChoice / #trueFalse / #matching to emit).
  // Optional: null means "leave the existing quiz settings unchanged" on
  // update (so an admin editing only the name does not silently reset the
  // question-type selection). When non-null, the supplied QuizSettings
  // replaces the stored selection and a subsequent rebuildLegendaryActivity
  // regenerates content honoring the new selection. Ignored for #flashcards
  // and #drinksBuilder activities.
  public type UpdateActivityInput = {
    id : Nat;
    name : Text;
    sourceCategoryIds : [Nat];
    content : ?ActivityContent;
    quizSettings : ?QuizSettings;
  };
};
