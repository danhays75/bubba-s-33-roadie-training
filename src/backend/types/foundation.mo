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

  // A job position that users can be trained and certified for.
  // sortOrder is per-parent (positions are a flat list, so each position's
  // own sequence starts at 1 and increments by 1 — NOT a global running count).
  // coverPhoto is optional — never required to save a position.
  public type Position = {
    id : Nat;
    name : Text;
    description : ?Text;
    coverPhoto : ?Text;
    sortOrder : Nat;
  };

  // A user's assignment to a position, with a training status.
  public type PositionAssignment = {
    userId : Principal;
    positionId : Nat;
    status : AssignmentStatus;
  };
};
