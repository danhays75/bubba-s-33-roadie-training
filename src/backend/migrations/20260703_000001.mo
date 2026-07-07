import Map "mo:core/Map";
import List "mo:core/List";
import Principal "mo:core/Principal";

module {
  // Fourth migration: one-time admin grant for every currently-registered
  // user. Runs exactly once on the next deploy (the chain only replays
  // entries newer than the deployed tail), then never again.
  //
  // What this migration does:
  //   - Iterates every entry in accessControlState.userRoles and sets each
  //     value to #admin (the access-control UserRole).
  //   - Iterates every entry in profiles and sets each UserProfile.role to
  //     #admin (the app-domain Role).
  //   - Carries all other state (positions, assignments, nextPositionId,
  //     categories, items, nextCategoryId, nextItemId) through unchanged.
  //
  // What this migration deliberately does NOT do:
  //   - It does NOT touch the adminAssigned flag in accessControlState. The
  //     first-user-becomes-admin logic in _initialize_access_control stays
  //     intact for future sign-ins.
  //   - It does NOT add or remove any stable field — the actor state shape
  //     is unchanged, only field values are transformed.
  //
  // Idempotency: setting a value to #admin is naturally idempotent —
  // re-running this migration on already-admin users is a no-op. The chain
  // itself guarantees the migration runs at most once per canister.
  //
  // OldActor mirrors the NewActor of the preceding migration
  // (20260703_000000.mo) — the previously deployed stable signature.
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
  };

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

  // UserProfile mirrors src/backend/types/foundation.mo UserProfile
  type UserProfile = {
    id : Principal;
    name : Text;
    storeLocation : Text;
    role : Role;
  };

  // Position mirrors src/backend/types/foundation.mo Position
  type Position = {
    id : Nat;
    name : Text;
    description : ?Text;
    coverPhoto : ?Text;
    sortOrder : Nat;
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

  // LibraryItem mirrors src/backend/types/library.mo LibraryItem
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
  };

  public func migration(old : OldActor) : NewActor {
    // Grant the access-control admin UserRole to every currently-registered
    // user. Mutating userRoles in place via forEach + add (add overwrites the
    // existing value for a key). The adminAssigned flag is left untouched so
    // the first-user-becomes-admin logic stays intact for future sign-ins.
    old.accessControlState.userRoles.forEach(func(_principal, _role) {
      old.accessControlState.userRoles.add(_principal, #admin);
    });

    // Grant the app-domain #admin Role to every existing profile. Mutating
    // profiles in place via forEach + add (add overwrites the existing value
    // for a key). Record spread preserves id/name/storeLocation and only
    // updates role.
    old.profiles.forEach(func(_principal, profile) {
      old.profiles.add(_principal, { profile with role = #admin });
    });

    // Carry every other field through unchanged.
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
    };
  };
};
