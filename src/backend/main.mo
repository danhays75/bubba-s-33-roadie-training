import Map "mo:core/Map";
import List "mo:core/List";
import Principal "mo:core/Principal";
import Text "mo:core/Text";
import Iter "mo:core/Iter";
import Nat "mo:core/Nat";
import MixinViews "mo:caffeineai-data-viewer/MixinViews";
import AccessControl "mo:caffeineai-authorization/access-control";
import MixinAuthorization "mo:caffeineai-authorization/MixinAuthorization";
import Verify "mo:identity-attributes/Internal/Verify";
import OQL "mo:caffeineai-oql";
import Entity "mo:caffeineai-oql/Entity";
import Expose "mo:caffeineai-oql/Expose";
// Direct *Value module imports so the compiler resolves the implicit
// `_toRow : V -> Value` arguments of Entity.payload(...) calls. Motoko's
// implicit search walks directly-imported modules for a matching
// `public func _toRow`; the OQL re-export (`public let TextValue = ...`)
// does not surface the function as a top-level implicit candidate.
import TextValue "mo:caffeineai-oql/TextValue";
import NatValue "mo:caffeineai-oql/NatValue";
import BoolValue "mo:caffeineai-oql/BoolValue";
import MixinObjectStorage "mo:caffeineai-object-storage/Mixin";
import MixinEmailVerification "mo:caffeineai-email-verification/verificationMixin";
import VerifiedEmails "mo:caffeineai-email-verification/verifiedEmails";
import Foundation "lib/foundation";
import Library "lib/library";
import Nso "lib/nso";
import Legendary "lib/legendary";
import FoundationApi "mixins/foundation-api";
import LibraryApi "mixins/library-api";
import NsoApi "mixins/nso-api";
import LegendaryApi "mixins/legendary-api";

actor {
  include MixinViews();
  include MixinObjectStorage();
  // --- Email-verification extension state ---
  // Tracks which manually-typed email addresses have been verified via a
  // click-through challenge. The MixinEmailVerification callback (included
  // below) records verified addresses here; setEmailForUser checks
  // VerifiedEmails.contains before replacing the stored email. SSO-verified
  // emails are captured separately via the identity-attributes
  // onAttributesVerified callback and are NEVER re-verified through this
  // flow. Initial value comes from the migration chain.
  // Declared BEFORE the MixinEmailVerification include so the binding is in
  // scope at the include site (Motoko requires a binding to be defined before
  // it is referenced, even for actor-field includes).
  let verifiedEmails : VerifiedEmails.State;
  // Email-verification callback handler. Records a manually-typed email
  // address into verifiedEmails when the user clicks the verification link.
  // The challenge is initiated by initiateEmailVerification in the
  // foundation API mixin; the click lands here and marks the address
  // verified. setEmailForUser then checks verifiedEmails.contains before
  // replacing the stored email.
  include MixinEmailVerification(verifiedEmails);

  let accessControlState : AccessControl.AccessControlState;

  // --- Foundation domain state ---
  // Declared WITHOUT initializers per enhanced-migration mode; initial values
  // come from the migration chain in src/backend/migrations/.
  let profiles : Map.Map<Principal, Foundation.UserProfile>;
  let positions : List.List<Foundation.Position>;
  let assignments : List.List<Foundation.PositionAssignment>;
  // Wrapped in a record so mutations from the mixin propagate back to the
  // actor (var fields are passed by value).
  let nextPositionId : { var value : Nat };

  // --- Library domain state ---
  // Additive to the foundation state. Same enhanced-migration pattern: types
  // only, no initializers; the new migration supplies the initial values.
  let categories : List.List<Library.Category>;
  let items : List.List<Library.LibraryItem>;
  let nextCategoryId : { var value : Nat };
  let nextItemId : { var value : Nat };

  // --- NSO (New Store Opening) domain state ---
  // Additive to the foundation + library state. Same enhanced-migration
  // pattern: types only, no initializers; the new migration supplies the
  // initial values. Manager/admin-only writes; reads are public query.
  let nsoPhases : List.List<Nso.Phase>;
  let nsoTasks : List.List<Nso.Task>;
  let nextPhaseId : { var value : Nat };
  let nextTaskId : { var value : Nat };

  // --- Legendary (Be Legendary practice activities) domain state ---
  // Additive to the foundation + library + NSO state. Same enhanced-migration
  // pattern: types only, no initializers; the new migration supplies the
  // initial values. Admin-only generation; reads are public query. Practice
  // only — no scores, no tracking.
  let legendaryActivities : List.List<Legendary.Activity>;
  let nextLegendaryActivityId : { var value : Nat };

  // Access-control sign-in mixin. The unsuppressable contract rule from
  // the caffeineai-authorization package requires this exact include.
  // The onAttributesVerified callback captures the verified email from the
  // identity-attributes package into the caller's UserProfile so admin
  // notification emails (and any per-user correspondence) have an address
  // to send to. Idempotent — re-runs on every SSO sign-in; Foundation.setEmail
  // is a no-op when the profile does not yet exist (the createMyProfile path
  // captures the email from the caller's arguments in that case).
  // The admin-guard repair for the B-tree corruption left by the frozen
  // migration 20260703_000001 is applied additively inside getMyProfile
  // (see mixins/foundation-api.mo) via AccessControlAdminGuard.initialize,
  // which runs before the existing role-sync read and re-grants #admin to
  // a caller whose stored profile.role == #admin but whose userRoles entry
  // is missing/corrupted.
  include MixinAuthorization(
    accessControlState,
    ?(func(caller : Principal, attrs : Verify.IdentityAttributes) : () {
      ignore Foundation.setEmail(profiles, caller, attrs.email);
    }),
  );

  include FoundationApi(accessControlState, profiles, positions, assignments, nextPositionId, verifiedEmails);
  include LibraryApi(accessControlState, profiles, positions, categories, items, nextCategoryId, nextItemId);
  include NsoApi(accessControlState, profiles, nsoPhases, nsoTasks, nextPhaseId, nextTaskId);
  include LegendaryApi(accessControlState, profiles, positions, categories, items, legendaryActivities, nextLegendaryActivityId);

  // --- OQL (Data Intelligence) ---
  // Expose every persisted queryable collection to the Caffeine Data
  // Intelligence agent. Per-table authorization mirrors the existing public
  // API: positions are public-read, profiles are controller-only (admin PII),
  // assignments are scoped per-user (a caller sees only their own rows;
  // controllers see all). End users keep browsing via the explicit query
  // methods above; OQL is the agent's read path.
  include Expose({
    entities = [
      // UserProfile: keyed by Principal. Contains user PII (name,
      // storeLocation, role) so it stays #controllerOnly — the agent reads
      // everything; end users read their own profile via getMyProfile.
      // id is the Principal rendered as text (canonical form).
      Entity.manual<Foundation.UserProfile>(
        "userProfile",
        func () = profiles.values(),
        "UserProfile",
        "id",
      )
        .payload("id", func (p) = p.id.toText())
        .payload("name", func (p) = p.name)
        .payload("storeLocation", func (p) = p.storeLocation)
        .payload("role", func (p) = switch (p.role) {
          case (#trainee) "trainee";
          case (#trainer) "trainer";
          case (#manager) "manager";
          case (#admin) "admin";
        })
        .payload("approvalStatus", func (p) = switch (p.approvalStatus) {
          case (#pending) "pending";
          case (#approved) "approved";
          case (#rejected) "rejected";
        })
        .payload("email", func (p) = switch (p.email) { case null ""; case (?t) t })
        .payload("photo", func (p) = switch (p.photo) { case null ""; case (?t) t })
        .sample({
          id = Principal.fromText("aaaaa-aa");
          name = "";
          storeLocation = "";
          role = #trainee;
          approvalStatus = #pending;
          email = null;
          photo = null;
        })
        .build(),
      // Position: public-read (matches getAllPositions / getPosition query
        // methods). layoutStyle is the LayoutStyle variant exposed as text
        // ("library" / "orientation"). description and coverPhoto are
        // optional ?Text exposed as empty text when null (mirrors the
        // coverPhoto/photo handling on category/libraryItem).
      Entity.manual<Foundation.Position>(
        "position",
        func () = positions.values(),
        "Position",
        "id",
      )
        .public_()
        .payload("id", func (p) = p.id)
        .payload("name", func (p) = p.name)
        .payload("description", func (p) = switch (p.description) { case null ""; case (?t) t })
        .payload("coverPhoto", func (p) = switch (p.coverPhoto) { case null ""; case (?t) t })
        .payload("sortOrder", func (p) = p.sortOrder)
        .payload("layoutStyle", func (p) = switch (p.layoutStyle) {
          case (#library) "library";
          case (#orientation) "orientation";
          case (#kitchen) "kitchen";
        })
        .sample({
          id = 0;
          name = "";
          description = null;
          coverPhoto = null;
          sortOrder = 0;
          layoutStyle = #library;
        })
        .build(),
      // PositionAssignment: scoped per-user. A non-anonymous caller sees only
        // rows whose userId equals their own principal (mirrors
        // getMyAssignments); controllers see every row (mirrors
        // getUserAssignments admin endpoint). userId is the owner column,
        // rendered as text and tagged #owner in schema(). status is the
        // AssignmentStatus variant exposed as text ("inTraining" /
        // "certified").
      Entity.manual<Foundation.PositionAssignment>(
        "positionAssignment",
        func () = assignments.values(),
        "PositionAssignment",
        "userId",
      )
        .controllerOrScoped()
        .ownedBy("userId")
        .payload("userId", func (a) = a.userId.toText())
        .payload("positionId", func (a) = a.positionId)
        .payload("status", func (a) = switch (a.status) {
          case (#inTraining) "inTraining";
          case (#certified) "certified";
        })
        .sample({
          userId = Principal.fromText("aaaaa-aa");
          positionId = 0;
          status = #inTraining;
        })
        .build(),
      // Category: belongs to a position. positionId is an edge to the
      // foundation "position" entity (declared elsewhere); kept as a plain
      // payload here since the foundation entity is outside this domain's
      // OQL scope.
      Entity.manual<Library.Category>(
        "category",
        func () = categories.values(),
        "Category",
        "id",
      )
        .payload("id", func (c) = c.id)
        .payload("positionId", func (c) = c.positionId)
        .payload("name", func (c) = c.name)
        .payload("coverPhoto", func (c) = switch (c.coverPhoto) { case null ""; case (?t) t })
        .payload("sortOrder", func (c) = c.sortOrder)
        .sample({
          id = 0;
          positionId = 0;
          name = "";
          coverPhoto = null;
          sortOrder = 0;
        })
        .build(),
      // LibraryItem: belongs to a category. details and tags are collection
      // fields — exposed as a count and a joined text column respectively so
      // they remain queryable without a nested-record _toRow.
      Entity.manual<Library.LibraryItem>(
        "libraryItem",
        func () = items.values(),
        "LibraryItem",
        "id",
      )
        .payload("id", func (i) = i.id)
        .payload("categoryId", func (i) = i.categoryId)
        .payload("title", func (i) = i.title)
        .payload("subtitle", func (i) = switch (i.subtitle) { case null ""; case (?t) t })
        .payload("photo", func (i) = switch (i.photo) { case null ""; case (?t) t })
        .payload("notes", func (i) = switch (i.notes) { case null ""; case (?t) t })
        .payload("tags", func (i) = i.tags.vals().join(", "))
        .payload("seasonal", func (i) = i.seasonal)
        .payload("sortOrder", func (i) = i.sortOrder)
        .payload("detailCount", func (i) = i.details.size())
        .payload("hasRecipe", func (i) = switch (i.recipe) { case null false; case (?_) true })
        .payload("recipeGlassware", func (i) = switch (i.recipe) { case null ""; case (?r) r.glassware })
        .payload("recipeSpecCount", func (i) = switch (i.recipe) { case null 0; case (?r) r.specs.size() })
        .payload("recipeVariantCount", func (i) = switch (i.recipe) { case null 0; case (?r) r.variants.size() })
        .payload("recipeEquipmentCount", func (i) = switch (i.recipe) { case null 0; case (?r) r.equipment.size() })
        .payload("recipeHasBulkMix", func (i) = switch (i.recipe) { case null false; case (?r) switch (r.yield) { case null r.equipment.size() > 0; case (?_) true } })
        // recipeHasUpsell: true when the recipe has at least one spec tagged
        // upsell=true (the new RecipeSpec.upsell flag added in the contract
        // wave). Exposed so the upsell flag is queryable through OQL on the
        // libraryItem entity, consistent with the recipeHasBulkMix pattern.
        // False when the item has no recipe or no upsell-tagged specs.
        .payload("recipeHasUpsell", func (i) = switch (i.recipe) {
          case null false;
          case (?r) r.specs.vals().find(func (s) = s.upsell) != null;
        })
        .sample({
          id = 0;
          categoryId = 0;
          title = "";
          subtitle = null;
          photo = null;
          details = [];
          notes = null;
          tags = [];
          seasonal = false;
          sortOrder = 0;
          recipe = null;
          foodRecipe = null;
        })
        .build(),
      // NsoPhase: an ordered stage of a new store opening. Manager/admin-only
      // domain; authorization is the default #controllerOnly — the agent reads
      // everything, end users browse via the explicit getNsoPhases query method.
      Entity.manual<Nso.Phase>(
        "nsoPhase",
        func () = nsoPhases.values(),
        "Phase",
        "id",
      )
        .payload("id", func (p) = p.id)
        .payload("name", func (p) = p.name)
        .payload("sortOrder", func (p) = p.sortOrder)
        .sample({
          id = 0;
          name = "";
          sortOrder = 0;
        })
        .build(),
      // NsoTask: belongs to a phase. phaseId is an edge to the nsoPhase entity
      // above; kept as a plain payload here for consistency with the
      // category/libraryItem pattern. assignedTo is a ?Principal exposed as
      // empty text when null (mirrors the coverPhoto/photo handling above).
      Entity.manual<Nso.Task>(
        "nsoTask",
        func () = nsoTasks.values(),
        "Task",
        "id",
      )
        .payload("id", func (t) = t.id)
        .payload("phaseId", func (t) = t.phaseId)
        .payload("text", func (t) = t.text)
        .payload("section", func (t) = switch (t.section) { case null ""; case (?s) s })
        .payload("done", func (t) = t.done)
        .payload("assignedTo", func (t) = switch (t.assignedTo) { case null ""; case (?p) p.toText() })
        .payload("completionDate", func (t) = switch (t.completionDate) { case null ""; case (?d) d })
        .payload("notes", func (t) = switch (t.notes) { case null ""; case (?n) n })
        .payload("sortOrder", func (t) = t.sortOrder)
        .sample({
          id = 0;
          phaseId = 0;
          text = "";
          section = null;
          done = false;
          assignedTo = null;
          completionDate = null;
          notes = null;
          sortOrder = 0;
        })
        .build(),
      // LegendaryActivity: a generated practice activity (quiz or flashcards).
      // Belongs to a position. sourceCategoryIds is the list of Library
      // categories the items were drawn from — exposed as a joined text column
      // so it remains queryable. activityType is the ActivityType variant
      // exposed as text ("quiz" / "flashcards"). content is the generated
      // payload — exposed as a count of questions or flashcards so it stays
      // queryable without a nested-record _toRow. createdBy is the admin
      // Principal who triggered generation. Authorization is the default
      // #controllerOnly — the agent reads everything; end users browse via the
      // explicit getLegendaryActivitiesByPosition query method.
      Entity.manual<Legendary.Activity>(
        "legendaryActivity",
        func () = legendaryActivities.values(),
        "Activity",
        "id",
      )
        .payload("id", func (a) = a.id)
        .payload("positionId", func (a) = a.positionId)
        .payload("activityType", func (a) = switch (a.activityType) { case (#quiz) "quiz"; case (#flashcards) "flashcards"; case (#drinksBuilder) "drinksBuilder" })
        .payload("name", func (a) = a.name)
        .payload("sourceCategoryIds", func (a) = a.sourceCategoryIds.vals().map(Nat.toText).join(", "))
        .payload("contentCount", func (a) = switch (a.content) {
          case (#quizContent q) q.size();
          case (#flashcardContent f) f.size();
          case (#drinksBuilderContent _) 1;
        })
        // QuizSettings — the admin's per-quiz question-type selection (which
        // of #multipleChoice / #trueFalse / #matching the generator emits).
        // Exposed as three booleans on the legendaryActivity entity so the
        // new persisted QuizSettings fields are queryable through OQL. null
        // quizSettings means all-three-on (the default, and the value for
        // activities generated before this field existed) — exposed as true
        // for all three so the default is queryable as "all on". Ignored for
        // #flashcards and #drinksBuilder activities (quizSettings is always
        // null for those — exposed as the all-true default, which is
        // harmless since the fields are meaningless for those activity
        // types).
        .payload("includeMultipleChoice", func (a) = switch (a.quizSettings) {
          case null true;
          case (?s) s.includeMultipleChoice;
        })
        .payload("includeTrueFalse", func (a) = switch (a.quizSettings) {
          case null true;
          case (?s) s.includeTrueFalse;
        })
        .payload("includeMatching", func (a) = switch (a.quizSettings) {
          case null true;
          case (?s) s.includeMatching;
        })
        .payload("createdAt", func (a) = a.createdAt)
        .payload("createdBy", func (a) = a.createdBy.toText())
        .sample({
          id = 0;
          positionId = 0;
          activityType = #quiz;
          name = "";
          sourceCategoryIds = [];
          content = #quizContent([]);
          quizSettings = null;
          createdAt = 0;
          createdBy = Principal.fromText("aaaaa-aa");
        })
        .build(),
    ];
  });
};
