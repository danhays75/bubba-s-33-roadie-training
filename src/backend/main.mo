import Map "mo:core/Map";
import List "mo:core/List";
import Principal "mo:core/Principal";
import MixinViews "mo:caffeineai-data-viewer/MixinViews";
import AccessControl "mo:caffeineai-authorization/access-control";
import MixinAuthorization "mo:caffeineai-authorization/MixinAuthorization";
import Foundation "lib/foundation";
import FoundationApi "mixins/foundation-api";

actor {
  include MixinViews();

  let accessControlState : AccessControl.AccessControlState;
  include MixinAuthorization(accessControlState, null);

  // --- Foundation domain state ---
  // Declared WITHOUT initializers per enhanced-migration mode; initial values
  // come from the migration chain in src/backend/migrations/.
  let profiles : Map.Map<Principal, Foundation.UserProfile>;
  let positions : List.List<Foundation.Position>;
  let assignments : List.List<Foundation.PositionAssignment>;
  // Wrapped in a record so mutations from the mixin propagate back to the
  // actor (var fields are passed by value).
  let nextPositionId : { var value : Nat };

  include FoundationApi(accessControlState, profiles, positions, assignments, nextPositionId);
};
