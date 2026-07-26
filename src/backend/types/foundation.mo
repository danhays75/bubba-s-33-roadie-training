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

  // Approval gate status for a user's access. New sign-ups start #pending and
  // are blocked from app access until an admin approves (#approved) or rejects
  // (#rejected) them. The first user (auto-admin) and pre-existing users are
  // #approved so the app is never locked out.
  public type ApprovalStatus = {
    #pending;
    #approved;
    #rejected;
  };

  // A user's profile. Created on first login.
  // email is the verified email captured from the identity-attributes
  // onVerified callback at SSO sign-in (null when the user signed in
  // without a verified email, e.g. plain II without an email claim). It
  // is the source of admin recipient addresses for the approval
  // notification email sent from createMyProfile, and the Roadie
  // recipient address for the approve/reject notification emails sent
  // from approveUser/rejectUser.
  // photo is an optional object-storage URL for the user's profile
  // photo. The frontend uploads the photo via the object-storage client
  // and persists the resulting URL here. When null the frontend falls
  // back to an initials avatar. Optional — never required to save a
  // profile. Set by the user themselves via setMyPhoto (or folded into
  // updateMyProfile); admins never edit a Roadie's photo.
  public type UserProfile = {
    id : Principal;
    name : Text;
    storeLocation : Text;
    role : Role;
    approvalStatus : ApprovalStatus;
    email : ?Text;
    photo : ?Text;
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
