import Principal "mo:core/Principal";

module {
  // ActivityType — the kind of practice activity. Extensible: only #quiz and
  // #flashcards are generated today, but the variant is open so new activity
  // types can be added later without reshaping stored records.
  public type ActivityType = {
    #quiz;
    #flashcards;
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
  // photo if the item has one); back = all of the item's detail fields.
  public type Flashcard = {
    itemTitle : Text;
    itemPhoto : ?Text;
    detailFields : [{ fieldLabel : Text; value : Text }];
  };

  // FlashcardContent — the list of flashcards for a #flashcards activity.
  public type FlashcardContent = [Flashcard];

  // ActivityContent — the generated payload, keyed by activity type.
  public type ActivityContent = {
    #quizContent : QuizContent;
    #flashcardContent : FlashcardContent;
  };

  // Activity — a generated practice activity. Belongs to a position (the
  // position the admin was viewing when they triggered generation).
  // sourceCategoryIds records which Library categories the items were drawn
  // from. createdAt/createdBy are set by the backend on creation.
  public type Activity = {
    id : Nat;
    positionId : Nat;
    activityType : ActivityType;
    name : Text;
    sourceCategoryIds : [Nat];
    content : ActivityContent;
    createdAt : Nat;
    createdBy : Principal;
  };

  // BuildActivityInput — the admin's request to generate an activity. The
  // backend fetches items from the selected sourceCategoryIds via the library
  // lib and generates quiz or flashcard content from those items and their
  // detail fields.
  public type BuildActivityInput = {
    positionId : Nat;
    activityType : ActivityType;
    name : Text;
    sourceCategoryIds : [Nat];
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
  public type UpdateActivityInput = {
    id : Nat;
    name : Text;
    sourceCategoryIds : [Nat];
  };
};
