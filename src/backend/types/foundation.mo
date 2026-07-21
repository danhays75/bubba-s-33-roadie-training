import Principal "mo:core/Principal";

module {
  // Role = permission level. Every user has exactly one role.
  // Note: the existing caffeineai-authorization mixin already manages an
  // admin/user/guest UserRole for access control. This Role is the richer
  // trainee/trainer/manager/admin permission level used by the app domain.
  public type Role = {
    #trainee;
    #trainer;
    #manager;
    #admin;
  };

  // Status of a user's training for an assigned position.
  public type AssignmentStatus = {
    #inTraining;
    #certified;
  };

  // A user's profile. Created on first login.
  public type UserProfile = {
    id : Principal;
    name : Text;
    storeLocation : Text;
    role : Role;
  };

  // Per-position presentation hint for the "Legendary Starts Here" area.
  // #library (default) renders the generic library-tile list; #orientation
  // renders the patriotic Orientation layout. Additive and position-scoped —
  // no other data model change.
  public type LayoutStyle = {
    #library;
    #orientation;
  };

  // A job position that users can be trained and certified for.
  // sortOrder is per-parent (positions are a flat list, so each position's
  // own sequence starts at 1 and increments by 1 — NOT a global running count).
  // coverPhoto is optional — never required to save a position.
  // layoutStyle selects the Orientation presentation when set to
  // #orientation; defaults to #library.
  public type Position = {
    id : Nat;
    name : Text;
    description : ?Text;
    coverPhoto : ?Text;
    sortOrder : Nat;
    layoutStyle : LayoutStyle;
  };

  // A user's assignment to a position, with a training status.
  public type PositionAssignment = {
    userId : Principal;
    positionId : Nat;
    status : AssignmentStatus;
  };
};
