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

  // --- UserProfile helpers ---

  public func getProfile(profiles : Map.Map<Principal, UserProfile>, userId : Principal) : ?UserProfile {
    profiles.get(userId);
  };

  public func createProfile(profiles : Map.Map<Principal, UserProfile>, id : Principal, name : Text, storeLocation : Text, role : Role) : UserProfile {
    let profile : UserProfile = {
      id;
      name;
      storeLocation;
      role;
    };
    profiles.add(id, profile);
    profile;
  };

  public func updateProfile(profiles : Map.Map<Principal, UserProfile>, id : Principal, name : Text, storeLocation : Text) : ?UserProfile {
    switch (profiles.get(id)) {
      case (?existing) {
        let updated : UserProfile = { existing with name; storeLocation };
        profiles.add(id, updated);
        ?updated;
      };
      case null null;
    };
  };

  public func listProfiles(profiles : Map.Map<Principal, UserProfile>) : [UserProfile] {
    profiles.toArray().map(func(_, p) { p });
  };

  public func setRole(profiles : Map.Map<Principal, UserProfile>, id : Principal, role : Role) : ?UserProfile {
    switch (profiles.get(id)) {
      case (?existing) {
        let updated : UserProfile = { existing with role };
        profiles.add(id, updated);
        ?updated;
      };
      case null null;
    };
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

  public func createPosition(positions : List.List<Position>, nextId : { var value : Nat }, name : Text, description : ?Text, coverPhoto : ?Text) : Position {
    let id = nextId.value;
    nextId.value := nextId.value + 1;
    // sortOrder = current size + 1, so the new position appends to the end of
    // the per-parent sequence starting at 1.
    let sortOrder = positions.size() + 1;
    let position : Position = {
      id;
      name;
      description;
      coverPhoto;
      sortOrder;
    };
    positions.add(position);
    position;
  };

  public func updatePosition(positions : List.List<Position>, id : Nat, name : Text, description : ?Text, coverPhoto : ?Text) : ?Position {
    let found = positions.find(func(p) { p.id == id });
    switch (found) {
      case (?existing) {
        let updated : Position = { existing with name; description; coverPhoto };
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
    let found = positions.find(func(p) { p.id == id });
    switch (found) {
      case (?existing) {
        // Remove the position by filtering it out, then renumber the
        // remaining positions' sortOrder per-parent starting at 1.
        positions.mapInPlace(
          func(p) {
            if (p.id == id) { p } else { p };
          }
        );
        // Rebuild the list without the deleted position and renumber.
        let kept = positions.filter(func(p) { p.id != id });
        positions.clear();
        var order = 1;
        kept.forEach(func(p) {
          let renumbered : Position = { p with sortOrder = order };
          positions.add(renumbered);
          order := order + 1;
        });
        ?existing;
      };
      case null null;
    };
  };

  // Reorder positions by an explicit ordered list of ids. Reassigns sortOrder
  // per-parent starting at 1 in the given order. Positions not listed keep
  // their relative order after the listed ones.
  public func reorderPositions(positions : List.List<Position>, orderedIds : [Nat]) : [Position] {
    // Build a lookup of id -> position from the current list.
    let all = positions.toArray();
    // Apply new sortOrder to listed ids in order, then append unlisted ones.
    positions.clear();
    var order = 1;
    // Track which ids have been placed.
    let placed : Map.Map<Nat, Bool> = Map.empty();
    for (id in orderedIds.values()) {
      switch (all.find(func(p) { p.id == id })) {
        case (?p) {
          let renumbered : Position = { p with sortOrder = order };
          positions.add(renumbered);
          placed.add(id, true);
          order := order + 1;
        };
        case null {};
      };
    };
    // Append any positions not in orderedIds, preserving their existing order.
    for (p in all.values()) {
      switch (placed.get(p.id)) {
        case (?_) {};
        case null {
          let renumbered : Position = { p with sortOrder = order };
          positions.add(renumbered);
          order := order + 1;
        };
      };
    };
    positions.toArray();
  };

  // --- PositionAssignment helpers ---

  public func getAssignmentsForUser(assignments : List.List<PositionAssignment>, userId : Principal) : [PositionAssignment] {
    assignments.filter(func(a) { a.userId == userId }).toArray();
  };

  public func assignPosition(assignments : List.List<PositionAssignment>, userId : Principal, positionId : Nat) : PositionAssignment {
    // If an assignment already exists, return it unchanged.
    let existing = assignments.find(func(a) { a.userId == userId and a.positionId == positionId });
    switch (existing) {
      case (?a) { a };
      case null {
        let assignment : PositionAssignment = {
          userId;
          positionId;
          status = #inTraining;
        };
        assignments.add(assignment);
        assignment;
      };
    };
  };

  public func unassignPosition(assignments : List.List<PositionAssignment>, userId : Principal, positionId : Nat) : ?PositionAssignment {
    let found = assignments.find(func(a) { a.userId == userId and a.positionId == positionId });
    switch (found) {
      case (?existing) {
        let kept = assignments.filter(func(a) { not (a.userId == userId and a.positionId == positionId) });
        assignments.clear();
        kept.forEach(func(a) { assignments.add(a) });
        ?existing;
      };
      case null null;
    };
  };

  public func setAssignmentStatus(assignments : List.List<PositionAssignment>, userId : Principal, positionId : Nat, status : AssignmentStatus) : ?PositionAssignment {
    let found = assignments.find(func(a) { a.userId == userId and a.positionId == positionId });
    switch (found) {
      case (?existing) {
        let updated : PositionAssignment = { existing with status };
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
