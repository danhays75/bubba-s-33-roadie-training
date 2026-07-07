import Principal "mo:core/Principal";

module {
  // A phase is an ordered stage of a new store opening (e.g. "01 Trailer
  // Time"). sortOrder is 1-based, contiguous, renumbered on delete/reorder.
  public type Phase = {
    id : Nat;
    name : Text;
    sortOrder : Nat;
  };

  // A task belongs to a phase. sortOrder is PER PHASE (1-based, contiguous,
  // renumbered on delete/reorder) — NOT a global running count.
  //   - section     : optional sub-section label to group tasks within a phase
  //   - assignedTo  : optional user (the manager responsible)
  //   - completionDate : optional ISO date string (YYYY-MM-DD)
  //   - notes       : optional free-text notes
  public type Task = {
    id : Nat;
    phaseId : Nat;
    text : Text;
    section : ?Text;
    done : Bool;
    assignedTo : ?Principal;
    completionDate : ?Text;
    notes : ?Text;
    sortOrder : Nat;
  };

  // Summary returned by the bulk import endpoint.
  public type NsoImportSummary = {
    phasesCreated : Nat;
    phasesReused : Nat;
    tasksAdded : Nat;
  };

  // Bulk import input shape. The `moduleName` field is informational (the
  // manual name); the engine processes `phases`.
  public type NsoImportInput = {
    moduleName : Text;
    phases : [NsoImportPhase];
  };

  public type NsoImportPhase = {
    name : Text;
    tasks : [NsoImportTask];
  };

  public type NsoImportTask = {
    section : ?Text;
    text : Text;
    notes : ?Text;
  };
};
