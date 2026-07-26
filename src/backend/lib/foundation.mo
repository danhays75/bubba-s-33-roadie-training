import Principal "mo:core/Principal";
import Map "mo:core/Map";
import List "mo:core/List";
import Runtime "mo:core/Runtime";
import Types "../types/foundation";

module {
  public type UserProfile = Types.UserProfile;
  public type Position = Types.Position;
  public type PositionAssignment = Types.PositionAssignment;
  public type Role = Types.Role;
  public type AssignmentStatus = Types.AssignmentStatus;
  public type LayoutStyle = Types.LayoutStyle;
  public type ApprovalStatus = Types.ApprovalStatus;

  // --- UserProfile helpers ---

  public func getProfile(profiles : Map.Map<Principal, UserProfile>, userId : Principal) : ?UserProfile {
    profiles.get(userId);
  };

  // Create a new profile. The first user is auto-#approved (Version 95
  // behavior preserved); subsequent users are #pending until an admin
  // approves them. email is captured from the caller's arguments (the
  // identity-attributes onVerified callback may fire before this on a
  // first login, in which case setEmail is a no-op until the profile
  // exists; this path captures the email directly).
  public func createProfile(profiles : Map.Map<Principal, UserProfile>, id : Principal, name : Text, storeLocation : Text, role : Role, email : ?Text) : UserProfile {
    let approvalStatus : ApprovalStatus = if (profiles.size() == 0) {
      #approved;
    } else {
      #pending;
    };
    let profile : UserProfile = {
      id;
      name;
      storeLocation;
      role;
      approvalStatus;
      email;
      photo = null;
    };
    profiles.add(id, profile);
    profile;
  };

  // Update a profile's name and storeLocation. The photo field is left
  // unchanged here — use setPhoto to update it. Email is never mutated by
  // this function (email changes go through setEmailForUser after manual
  // verification).
  public func updateProfile(profiles : Map.Map<Principal, UserProfile>, id : Principal, name : Text, storeLocation : Text) : ?UserProfile {
    switch (profiles.get(id)) {
      case (?profile) {
        let updated : UserProfile = { profile with name; storeLocation };
        profiles.add(id, updated);
        ?updated;
      };
      case null null;
    };
  };

  // Update a profile's name, storeLocation, AND photo. Email is never
  // mutated by this function. The photo is an optional object-storage URL;
  // passing null clears the photo (frontend falls back to initials avatar).
  public func updateProfileWithPhoto(profiles : Map.Map<Principal, UserProfile>, id : Principal, name : Text, storeLocation : Text, photo : ?Text) : ?UserProfile {
    switch (profiles.get(id)) {
      case (?profile) {
        let updated : UserProfile = { profile with name; storeLocation; photo };
        profiles.add(id, updated);
        ?updated;
      };
      case null null;
    };
  };

  // Set the profile photo URL on a profile. Called from setMyPhoto so the
  // frontend can persist an uploaded photo's object-storage URL on the
  // user's own record. Optional — null clears the photo. Returns null when
  // the profile does not exist.
  public func setPhoto(profiles : Map.Map<Principal, UserProfile>, id : Principal, photo : ?Text) : ?UserProfile {
    switch (profiles.get(id)) {
      case (?profile) {
        let updated : UserProfile = { profile with photo };
        profiles.add(id, updated);
        ?updated;
      };
      case null null;
    };
  };

  public func listProfiles(profiles : Map.Map<Principal, UserProfile>) : [UserProfile] {
    profiles.values().toArray();
  };

  public func setRole(profiles : Map.Map<Principal, UserProfile>, id : Principal, role : Role) : ?UserProfile {
    switch (profiles.get(id)) {
      case (?profile) {
        let updated : UserProfile = { profile with role };
        profiles.add(id, updated);
        ?updated;
      };
      case null null;
    };
  };

  // Set the verified email on a profile. Called from the
  // identity-attributes onVerified callback in main.mo to capture the
  // verified email delivered at SSO sign-in. Idempotent — re-runs on
  // every sign-in, so a user who later signs in with a different
  // verified email gets the new value. Returns null when the profile
  // does not yet exist (the callback may fire before createMyProfile on
  // a first login; createProfile will capture the email from the
  // caller's arguments in that path).
  public func setEmail(profiles : Map.Map<Principal, UserProfile>, id : Principal, email : ?Text) : ?UserProfile {
    switch (profiles.get(id)) {
      case (?profile) {
        let updated : UserProfile = { profile with email };
        profiles.add(id, updated);
        ?updated;
      };
      case null null;
    };
  };

  // Replace the stored email on a profile after manual verification.
  // Called from setEmailForUser when a user has completed an
  // email-verification challenge for a manually-typed address. This is
  // the user-self-service path — no admin label distinguishing SSO-verified
  // vs manually-verified emails; the new email simply replaces the old one.
  // Returns null when the profile does not exist.
  public func setEmailForUser(profiles : Map.Map<Principal, UserProfile>, id : Principal, newEmail : Text) : ?UserProfile {
    switch (profiles.get(id)) {
      case (?profile) {
        let updated : UserProfile = { profile with email = ?newEmail };
        profiles.add(id, updated);
        ?updated;
      };
      case null null;
    };
  };

  // --- Approval-status helpers ---

  public func setApprovalStatus(profiles : Map.Map<Principal, UserProfile>, id : Principal, status : ApprovalStatus) : ?UserProfile {
    switch (profiles.get(id)) {
      case (?profile) {
        let updated : UserProfile = { profile with approvalStatus = status };
        profiles.add(id, updated);
        ?updated;
      };
      case null null;
    };
  };

  public func approveUser(profiles : Map.Map<Principal, UserProfile>, id : Principal) : ?UserProfile {
    setApprovalStatus(profiles, id, #approved);
  };

  public func rejectUser(profiles : Map.Map<Principal, UserProfile>, id : Principal) : ?UserProfile {
    setApprovalStatus(profiles, id, #rejected);
  };

  // --- Position helpers ---
  // sortOrder is per-parent: positions form a single list, so each position's
  // own sequence starts at 1 and increments by 1.

  public func getPosition(positions : List.List<Position>, id : Nat) : ?Position {
    positions.find(func(p) { p.id == id });
  };

  public func listPositions(positions : List.List<Position>) : [Position] {
    positions.toArray();
  };

  public func createPosition(positions : List.List<Position>, nextId : { var value : Nat }, name : Text, description : ?Text, coverPhoto : ?Text, layoutStyle : LayoutStyle) : Position {
    let id = nextId.value;
    nextId.value += 1;
    let sortOrder = positions.size() + 1;
    let position : Position = {
      id;
      name;
      description;
      coverPhoto;
      sortOrder;
      layoutStyle;
    };
    positions.add(position);
    position;
  };

  public func updatePosition(positions : List.List<Position>, id : Nat, name : Text, description : ?Text, coverPhoto : ?Text, layoutStyle : LayoutStyle) : ?Position {
    switch (positions.find(func(p) { p.id == id })) {
      case (?position) {
        let updated : Position = { position with name; description; coverPhoto; layoutStyle };
        positions.mapInPlace(
          func(p) {
            if (p.id == id) { updated } else { p };
          }
        );
        ?updated;
      };
      case null null;
    };
  };

  public func deletePosition(positions : List.List<Position>, id : Nat) : ?Position {
    let existing = positions.find(func(p) { p.id == id });
    switch (existing) {
      case (?_) {
        positions.clear();
        positions.addAll(positions.filter(func(p) { p.id != id }).values());
        existing;
      };
      case null null;
    };
  };

  // Reorder positions by an explicit ordered list of ids. Reassigns sortOrder
  // per-parent starting at 1 in the given order. Positions not listed keep
  // their relative order after the listed ones.
  public func reorderPositions(positions : List.List<Position>, orderedIds : [Nat]) : [Position] {
    let idArray = orderedIds.vals();
    let idIndex = Map.empty<Nat, Nat>();
    var idx = 0;
    for (id in idArray) {
      idIndex.add(id, idx);
      idx += 1;
    };
    let listedCount = orderedIds.size();
    positions.mapInPlace(
      func(p) {
        switch (idIndex.get(p.id)) {
          case (?order) { { p with sortOrder = order + 1 } };
          case null {
            // Unlisted positions keep their relative order after the listed
            // ones. Use a stable offset based on their current position in
            // the list so they sort after the listed block.
            { p with sortOrder = listedCount + p.sortOrder };
          };
        };
      }
    );
    positions.toArray();
  };

  // --- PositionAssignment helpers ---

  public func getAssignmentsForUser(assignments : List.List<PositionAssignment>, userId : Principal) : [PositionAssignment] {
    assignments.filter(func(a) { a.userId == userId }).toArray();
  };

  public func assignPosition(assignments : List.List<PositionAssignment>, userId : Principal, positionId : Nat) : PositionAssignment {
    let assignment : PositionAssignment = {
      userId;
      positionId;
      status = #inTraining;
    };
    assignments.add(assignment);
    assignment;
  };

  public func unassignPosition(assignments : List.List<PositionAssignment>, userId : Principal, positionId : Nat) : ?PositionAssignment {
    let existing = assignments.find(func(a) { a.userId == userId and a.positionId == positionId });
    switch (existing) {
      case (?_) {
        assignments.clear();
        assignments.addAll(assignments.filter(func(a) { not (a.userId == userId and a.positionId == positionId) }).values());
        existing;
      };
      case null null;
    };
  };

  public func setAssignmentStatus(assignments : List.List<PositionAssignment>, userId : Principal, positionId : Nat, status : AssignmentStatus) : ?PositionAssignment {
    let existing = assignments.find(func(a) { a.userId == userId and a.positionId == positionId });
    switch (existing) {
      case (?assignment) {
        let updated : PositionAssignment = { assignment with status };
        assignments.mapInPlace(
          func(a) {
            if (a.userId == userId and a.positionId == positionId) { updated } else { a };
          }
        );
        ?updated;
      };
      case null null;
    };
  };
};
