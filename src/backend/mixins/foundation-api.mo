import Principal "mo:core/Principal";
import Map "mo:core/Map";
import List "mo:core/List";
import Runtime "mo:core/Runtime";
import AccessControl "mo:caffeineai-authorization/access-control";
import AccessControlAdminGuard "../lib/access-control-admin-guard";
import Foundation "../lib/foundation";
import Types "../types/foundation";

// Foundation domain API mixin. Exposes the public canister interface for
// user profiles, roles, positions, and position assignments.
//
// State slices are injected from main.mo:
//   - accessControlState : the existing authorization state (admin/user/guest)
//   - profiles           : stable Map of user profiles keyed by Principal
//   - positions          : stable List of positions
//   - assignments        : stable List of position assignments
//   - nextPositionId     : stable counter record for new position ids
//
// Authorization: admin-only endpoints check AccessControl.isAdmin. The first
// user becomes admin via the access-control mixin's initialize path.
mixin (
  accessControlState : AccessControl.AccessControlState,
  profiles : Map.Map<Principal, Foundation.UserProfile>,
  positions : List.List<Foundation.Position>,
  assignments : List.List<Foundation.PositionAssignment>,
  nextPositionId : { var value : Nat },
) {

  // --- Profile (self-service) ---

  // Sign-in read path. Also syncs the stored profile role with the
  // access-control admin status: if the caller is an admin but their stored
  // profile role is not #admin (e.g. the first user's profile was created
  // before _initialize_access_control ran), update the stored role to #admin.
  // Idempotent and safe to run on every sign-in.
  public shared ({ caller }) func getMyProfile() : async ?Foundation.UserProfile {
    // Admin-guard repair (additive, runs on every sign-in, before the
    // existing role-sync read below). Repairs a missing/corrupted #admin
    // grant in userRoles left by the frozen migration 20260703_000001: a
    // caller whose stored profile.role == #admin but whose userRoles entry
    // is missing/corrupted gets re-granted #admin instead of being silently
    // downgraded to #user. The existing role-sync below then sees a correct
    // isAdmin result. Signature and return shape are unchanged.
    AccessControlAdminGuard.initialize(accessControlState, profiles, caller);
    switch (Foundation.getProfile(profiles, caller)) {
      case (?profile) {
        // Promote the stored role to #admin if the caller is an admin but the
        // stored profile role is stale (e.g. the first user's profile was
        // created before _initialize_access_control ran). The mutation is
        // separated from the return so the read path cannot trap: if the
        // promotion succeeds we re-read the updated profile; on any failure we
        // fall back to the profile we already have. Idempotent and safe to run
        // on every sign-in.
        if (AccessControl.isAdmin(accessControlState, caller) and profile.role != #admin) {
          switch (Foundation.setRole(profiles, caller, #admin)) {
            case (?_) {
              // Re-read so we return the freshly-promoted profile.
              switch (Foundation.getProfile(profiles, caller)) {
                case (?updated) { ?updated };
                case null { ?profile };
              };
            };
            case null { ?profile };
          };
        } else {
          ?profile;
        };
      };
      case null null;
    };
  };

  public shared ({ caller }) func createMyProfile(name : Text, storeLocation : Text) : async Foundation.UserProfile {
    // The first user to sign up becomes Admin (handled by the access-control
    // mixin's initialize path). Reflect that in the profile's role.
    let role : Types.Role = if (AccessControl.isAdmin(accessControlState, caller)) {
      #admin;
    } else {
      #trainee;
    };
    // If a profile already exists for this caller, return it unchanged
    // (idempotent create-on-first-login).
    switch (Foundation.getProfile(profiles, caller)) {
      case (?existing) { existing };
      case null {
        Foundation.createProfile(profiles, caller, name, storeLocation, role);
      };
    };
  };

  public shared ({ caller }) func updateMyProfile(name : Text, storeLocation : Text) : async Foundation.UserProfile {
    switch (Foundation.updateProfile(profiles, caller, name, storeLocation)) {
      case (?updated) { updated };
      case null { Runtime.trap("Profile not found") };
    };
  };

  // --- Users & roles (admin only) ---

  public shared ({ caller }) func getAllUsers() : async [Foundation.UserProfile] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: admin only");
    };
    Foundation.listProfiles(profiles);
  };

  public shared ({ caller }) func getUserRole(userId : Principal) : async ?Types.Role {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: admin only");
    };
    switch (Foundation.getProfile(profiles, userId)) {
      case (?p) { ?p.role };
      case null null;
    };
  };

  public shared ({ caller }) func setUserRole(userId : Principal, role : Types.Role) : async Foundation.UserProfile {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: admin only");
    };
    switch (Foundation.setRole(profiles, userId, role)) {
      case (?updated) {
        // Keep the access-control role in sync with the app-domain profile
        // role. #admin maps to #admin; any other role (#trainee/#trainer/
        // #manager) maps to #user so a demoted admin loses the #admin grant.
        // The caller has already passed the admin guard above, so
        // AccessControl.assignRole's internal admin check passes too.
        let mappedRole : AccessControl.UserRole = switch (role) {
          case (#admin) { #admin };
          case (_) { #user };
        };
        AccessControl.assignRole(accessControlState, caller, userId, mappedRole);
        updated;
      };
      case null { Runtime.trap("User not found") };
    };
  };

  // --- Positions ---

  public query func getAllPositions() : async [Foundation.Position] {
    Foundation.listPositions(positions);
  };

  public query func getPosition(id : Nat) : async ?Foundation.Position {
    Foundation.getPosition(positions, id);
  };

  public shared ({ caller }) func createPosition(name : Text, description : ?Text, coverPhoto : ?Text) : async Foundation.Position {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: admin only");
    };
    Foundation.createPosition(positions, nextPositionId, name, description, coverPhoto);
  };

  public shared ({ caller }) func updatePosition(id : Nat, name : Text, description : ?Text, coverPhoto : ?Text) : async Foundation.Position {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: admin only");
    };
    switch (Foundation.updatePosition(positions, id, name, description, coverPhoto)) {
      case (?updated) { updated };
      case null { Runtime.trap("Position not found") };
    };
  };

  public shared ({ caller }) func deletePosition(id : Nat) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: admin only");
    };
    switch (Foundation.deletePosition(positions, id)) {
      case (?_) {};
      case null { Runtime.trap("Position not found") };
    };
  };

  public shared ({ caller }) func reorderPositions(orderedIds : [Nat]) : async [Foundation.Position] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: admin only");
    };
    Foundation.reorderPositions(positions, orderedIds);
  };

  // --- Position assignments ---

  public query ({ caller }) func getMyAssignments() : async [Foundation.PositionAssignment] {
    Foundation.getAssignmentsForUser(assignments, caller);
  };

  public shared ({ caller }) func getUserAssignments(userId : Principal) : async [Foundation.PositionAssignment] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: admin only");
    };
    Foundation.getAssignmentsForUser(assignments, userId);
  };

  public shared ({ caller }) func assignPosition(userId : Principal, positionId : Nat) : async Foundation.PositionAssignment {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: admin only");
    };
    // Verify the position exists.
    switch (Foundation.getPosition(positions, positionId)) {
      case (?_) {};
      case null { Runtime.trap("Position not found") };
    };
    Foundation.assignPosition(assignments, userId, positionId);
  };

  public shared ({ caller }) func unassignPosition(userId : Principal, positionId : Nat) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: admin only");
    };
    switch (Foundation.unassignPosition(assignments, userId, positionId)) {
      case (?_) {};
      case null { Runtime.trap("Assignment not found") };
    };
  };

  public shared ({ caller }) func setAssignmentStatus(userId : Principal, positionId : Nat, status : Types.AssignmentStatus) : async Foundation.PositionAssignment {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: admin only");
    };
    switch (Foundation.setAssignmentStatus(assignments, userId, positionId, status)) {
      case (?updated) { updated };
      case null { Runtime.trap("Assignment not found") };
    };
  };
};
