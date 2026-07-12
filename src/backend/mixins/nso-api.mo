import List "mo:core/List";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import AccessControl "mo:caffeineai-authorization/access-control";
import Nso "../lib/nso";
import Foundation "../lib/foundation";
import Types "../types/nso";

// NSO (New Store Opening) domain API mixin. Exposes the public canister
// interface for the manager-only NSO tracker: phases and tasks.
//
// State slices are injected from main.mo:
//   - accessControlState : the existing authorization state (admin/user/guest)
//   - profiles           : stable Map of user profiles keyed by Principal
//                          (used for the manager/admin role check)
//   - nsoPhases          : stable List of NSO phases
//   - nsoTasks           : stable List of NSO tasks
//   - nextPhaseId        : stable counter record for new phase ids
//   - nextTaskId         : stable counter record for new task ids
//
// Authorization: read methods are public query with NO role guard (any signed-
// in user can read). Write methods require the caller's UserProfile.role to be
// #manager or #admin — checked against the profiles map (NOT
// AccessControl.isAdmin, which only checks the access-control UserRole).
mixin (
  accessControlState : AccessControl.AccessControlState,
  profiles : Map.Map<Principal, Foundation.UserProfile>,
  nsoPhases : List.List<Nso.Phase>,
  nsoTasks : List.List<Nso.Task>,
  nextPhaseId : { var value : Nat },
  nextTaskId : { var value : Nat },
) {

  // Role guard: the caller's app-domain role (from the profiles map) must be
  // #manager or #admin. AccessControl.isAdmin only checks the access-control
  // UserRole, not the app-domain Role, so it is intentionally NOT used here.
  private func assertManagerOrAdmin(caller : Principal) : () {
    let allowed = switch (profiles.get(caller)) {
      case (?p) p.role == #manager or p.role == #admin;
      case null false;
    };
    if (not allowed) {
      Runtime.trap("Unauthorized: manager or admin only");
    };
  };

  // --- Browsing (public query, no role guard) ---

  public query func getNsoPhases() : async [Nso.Phase] {
    Nso.listPhases(nsoPhases);
  };

  public query func getNsoPhase(id : Nat) : async ?Nso.Phase {
    Nso.getPhase(nsoPhases, id);
  };

  public query func getNsoTasksByPhase(phaseId : Nat) : async [Nso.Task] {
    Nso.listTasksByPhase(nsoTasks, phaseId);
  };

  public query func getNsoTask(id : Nat) : async ?Nso.Task {
    Nso.getTask(nsoTasks, id);
  };

  public query func getNsoOverallProgress() : async { doneCount : Nat; totalCount : Nat } {
    let (doneCount, totalCount) = Nso.overallProgress(nsoTasks);
    { doneCount; totalCount };
  };

  // Lightweight per-phase progress counts for ALL phases in ONE call. Returns
  // a list of { phaseId, doneCount, totalCount } computed by iterating the
  // tasks list once and grouping by phaseId. Use this for collapsed phase
  // headers' "N of M done" — it does NOT load any task rows. Full task rows
  // for a phase are only fetched via getNsoTasksByPhase when the phase is
  // expanded.
  public query func getNsoPhaseProgressCounts() : async [Types.NsoPhaseProgressCount] {
    Nso.phaseProgressCounts(nsoPhases, nsoTasks);
  };

  // Returns the users assignable to an NSO task — i.e. those whose app-domain
  // role is #manager or #admin. This is a READ (public query, no role guard):
  // it only returns manager/admin profiles (no trainee/trainer data leaks) and
  // the NSO page is already frontend-gated to manager/admin. Used by the Assign
  // control so managers (not just admins) can populate the dropdown — the
  // foundation getAllUsers endpoint is admin-only and would return an empty
  // list for managers.
  public query func getNsoAssignableUsers() : async [Foundation.UserProfile] {
    Foundation.listProfiles(profiles).filter(func(p) {
      p.role == #manager or p.role == #admin;
    });
  };

  // --- Phase management (manager or admin only) ---

  public shared ({ caller }) func createNsoPhase(name : Text) : async Nso.Phase {
    assertManagerOrAdmin(caller);
    Nso.createPhase(nsoPhases, nextPhaseId, name);
  };

  public shared ({ caller }) func updateNsoPhase(id : Nat, name : Text) : async () {
    assertManagerOrAdmin(caller);
    switch (Nso.updatePhase(nsoPhases, id, name)) {
      case (?_) {};
      case null { Runtime.trap("Phase not found") };
    };
  };

  // Deleting a phase also deletes its tasks (cascade).
  public shared ({ caller }) func deleteNsoPhase(id : Nat) : async () {
    assertManagerOrAdmin(caller);
    switch (Nso.deletePhase(nsoPhases, nsoTasks, id)) {
      case (?_) {};
      case null { Runtime.trap("Phase not found") };
    };
  };

  public shared ({ caller }) func reorderNsoPhases(id : Nat, direction : { #up; #down }) : async () {
    assertManagerOrAdmin(caller);
    let _ = Nso.reorderPhases(nsoPhases, id, direction);
  };

  // --- Task management (manager or admin only) ---

  public shared ({ caller }) func createNsoTask(phaseId : Nat, text : Text, section : ?Text, assignedTo : ?Principal) : async Nso.Task {
    assertManagerOrAdmin(caller);
    // Verify the parent phase exists before creating a task under it.
    switch (Nso.getPhase(nsoPhases, phaseId)) {
      case (?_) {};
      case null { Runtime.trap("Phase not found") };
    };
    Nso.createTask(nsoTasks, nextTaskId, phaseId, text, section, assignedTo, null);
  };

  public shared ({ caller }) func updateNsoTask(id : Nat, text : Text, section : ?Text, done : Bool, assignedTo : ?Principal, completionDate : ?Text, notes : ?Text) : async () {
    assertManagerOrAdmin(caller);
    switch (Nso.updateTask(nsoTasks, id, text, section, done, assignedTo, completionDate, notes)) {
      case (?_) {};
      case null { Runtime.trap("Task not found") };
    };
  };

  // Convenience for immediate save on checkbox toggle. Updates only `done`
  // and `completionDate` on the task with the given id.
  public shared ({ caller }) func toggleNsoTask(id : Nat, done : Bool, completionDate : ?Text) : async () {
    assertManagerOrAdmin(caller);
    let found = Nso.getTask(nsoTasks, id);
    switch (found) {
      case (?existing) {
        let updated : Nso.Task = { existing with done; completionDate };
        nsoTasks.mapInPlace(
          func(t) {
            if (t.id == id) { updated } else { t };
          }
        );
      };
      case null { Runtime.trap("Task not found") };
    };
  };

  public shared ({ caller }) func setNsoTaskAssignment(id : Nat, assignedTo : ?Principal) : async () {
    assertManagerOrAdmin(caller);
    let found = Nso.getTask(nsoTasks, id);
    switch (found) {
      case (?existing) {
        let updated : Nso.Task = { existing with assignedTo };
        nsoTasks.mapInPlace(
          func(t) {
            if (t.id == id) { updated } else { t };
          }
        );
      };
      case null { Runtime.trap("Task not found") };
    };
  };

  public shared ({ caller }) func setNsoTaskCompletionDate(id : Nat, completionDate : ?Text) : async () {
    assertManagerOrAdmin(caller);
    let found = Nso.getTask(nsoTasks, id);
    switch (found) {
      case (?existing) {
        let updated : Nso.Task = { existing with completionDate };
        nsoTasks.mapInPlace(
          func(t) {
            if (t.id == id) { updated } else { t };
          }
        );
      };
      case null { Runtime.trap("Task not found") };
    };
  };

  public shared ({ caller }) func deleteNsoTask(id : Nat) : async () {
    assertManagerOrAdmin(caller);
    switch (Nso.deleteTask(nsoTasks, id)) {
      case (?_) {};
      case null { Runtime.trap("Task not found") };
    };
  };

  public shared ({ caller }) func reorderNsoTasks(id : Nat, direction : { #up; #down }) : async () {
    assertManagerOrAdmin(caller);
    let _ = Nso.reorderTasks(nsoTasks, id, direction);
  };

  // --- Bulk import (manager or admin only) ---

  public shared ({ caller }) func importNsoTasks(input : Types.NsoImportInput) : async Types.NsoImportSummary {
    assertManagerOrAdmin(caller);
    Nso.importNso(nsoPhases, nsoTasks, nextPhaseId, nextTaskId, input);
  };
};
