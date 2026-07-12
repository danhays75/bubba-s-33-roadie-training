import List "mo:core/List";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Runtime "mo:core/Runtime";
import Text "mo:core/Text";
import Types "../types/nso";

// NSO (New Store Opening) domain logic. Pure helpers operating on List state
// passed in by reference — no caller awareness, no actor state.
//
// Ordering is PER PARENT: each phase's sortOrder is its own sequence (phases
// are a flat list); each task's sortOrder is within its phase. Never a single
// global running count. The pattern mirrors lib/library.mo exactly: filter,
// clear, renumber 1-based contiguous, re-add.
module {
  public type Phase = Types.Phase;
  public type Task = Types.Task;
  public type NsoPhaseProgressCount = Types.NsoPhaseProgressCount;
  public type NsoImportInput = Types.NsoImportInput;
  public type NsoImportPhase = Types.NsoImportPhase;
  public type NsoImportTask = Types.NsoImportTask;
  public type NsoImportSummary = Types.NsoImportSummary;

  // --- Phase helpers ---

  public func getPhase(phases : List.List<Phase>, id : Nat) : ?Phase {
    phases.find(func(p) { p.id == id });
  };

  public func listPhases(phases : List.List<Phase>) : [Phase] {
    phases.toArray().sort(func(a, b) { Nat.compare(a.sortOrder, b.sortOrder) });
  };

  // Returns the new phase. Mutates `phases` (adds the phase) and `nextPhaseId`
  // (increments). sortOrder = current phase count + 1 (appends to the end).
  public func createPhase(
    phases : List.List<Phase>,
    nextPhaseId : { var value : Nat },
    name : Text,
  ) : Phase {
    let id = nextPhaseId.value;
    nextPhaseId.value := nextPhaseId.value + 1;
    let sortOrder = phases.size() + 1;
    let phase : Phase = {
      id;
      name;
      sortOrder;
    };
    phases.add(phase);
    phase;
  };

  public func updatePhase(phases : List.List<Phase>, id : Nat, name : Text) : ?Phase {
    let found = phases.find(func(p) { p.id == id });
    switch (found) {
      case (?existing) {
        let updated : Phase = { existing with name };
        phases.mapInPlace(
          func(p) {
            if (p.id == id) { updated } else { p };
          }
        );
        ?updated;
      };
      case null null;
    };
  };

  // Remove the phase AND cascade-delete its tasks. Renumber the remaining
  // phases' sortOrder (1-based, contiguous).
  public func deletePhase(phases : List.List<Phase>, tasks : List.List<Task>, id : Nat) : ?Phase {
    let found = phases.find(func(p) { p.id == id });
    switch (found) {
      case (?existing) {
        // Cascade-delete tasks belonging to this phase.
        let keptTasks = tasks.filter(func(t) { t.phaseId != id });
        tasks.clear();
        keptTasks.forEach(func(t) { tasks.add(t) });
        // Remove the phase and renumber the remaining phases (1-based, contiguous).
        let keptPhases = phases.filter(func(p) { p.id != id });
        phases.clear();
        var order = 1;
        keptPhases.forEach(func(p) {
          let renumbered : Phase = { p with sortOrder = order };
          phases.add(renumbered);
          order := order + 1;
        });
        ?existing;
      };
      case null null;
    };
  };

  // Reorder phases by moving the phase with the given id one step in the given
  // direction (#up / #down), then renumber 1-based contiguous. Mirrors the
  // rebuild pattern from lib/library.mo (filter, clear, renumber, re-add) — no
  // Array.indexOf / Array.thaw / Array.freeze (those APIs do not exist in
  // core 2.6.0).
  public func reorderPhases(phases : List.List<Phase>, id : Nat, direction : { #up; #down }) : [Phase] {
    let all = phases.toArray().sort(func(a, b) { Nat.compare(a.sortOrder, b.sortOrder) });
    // Find the index of the target phase by id (manual loop — no Array.indexOf).
    var targetIdx : ?Nat = null;
    var i = 0;
    for (p in all.values()) {
      if (p.id == id) { targetIdx := ?i };
      i := i + 1;
    };
    switch (targetIdx) {
      case null { all };
      case (?idx) {
        // Compute the neighbour index for the given direction.
        let neighbourIdx : ?Nat = switch (direction) {
          case (#up) if (idx == 0) { null } else { ?(idx - 1) };
          case (#down) if (idx + 1 >= all.size()) { null } else { ?(idx + 1) };
        };
        switch (neighbourIdx) {
          case null { all };
          case (?j) {
            // Build the swapped id order, then rebuild the list 1-based contiguous.
            var orderedIds : [Nat] = [];
            var k = 0;
            for (p in all.values()) {
              if (k == idx) {
                orderedIds := orderedIds.concat([all[j].id]);
              } else if (k == j) {
                orderedIds := orderedIds.concat([all[idx].id]);
              } else {
                orderedIds := orderedIds.concat([p.id]);
              };
              k := k + 1;
            };
            // Rebuild: listed ids in order, renumbered 1-based contiguous.
            phases.clear();
            var order = 1;
            var reordered : [Phase] = [];
            for (oid in orderedIds.values()) {
              switch (all.find(func(p) { p.id == oid })) {
                case (?p) {
                  let renumbered : Phase = { p with sortOrder = order };
                  phases.add(renumbered);
                  reordered := reordered.concat([renumbered]);
                  order := order + 1;
                };
                case null {};
              };
            };
            reordered;
          };
        };
      };
    };
  };

  // --- Task helpers ---

  public func getTask(tasks : List.List<Task>, id : Nat) : ?Task {
    tasks.find(func(t) { t.id == id });
  };

  public func listTasksByPhase(tasks : List.List<Task>, phaseId : Nat) : [Task] {
    tasks
      .filter(func(t) { t.phaseId == phaseId })
      .toArray()
      .sort(func(a, b) { Nat.compare(a.sortOrder, b.sortOrder) });
  };

  // Returns the new task. Mutates `tasks` (adds the task) and `nextTaskId`
  // (increments). done=false, completionDate=null, notes=the given notes (or
  // null when omitted), sortOrder = next per-phase order (current count of
  // tasks in this phase + 1).
  public func createTask(
    tasks : List.List<Task>,
    nextTaskId : { var value : Nat },
    phaseId : Nat,
    text : Text,
    section : ?Text,
    assignedTo : ?Principal,
    notes : ?Text,
  ) : Task {
    let id = nextTaskId.value;
    nextTaskId.value := nextTaskId.value + 1;
    let samePhaseCount = tasks.filter(func(t) { t.phaseId == phaseId }).size();
    let sortOrder = samePhaseCount + 1;
    let task : Task = {
      id;
      phaseId;
      text;
      section;
      done = false;
      assignedTo;
      completionDate = null;
      notes;
      sortOrder;
    };
    tasks.add(task);
    task;
  };

  public func updateTask(
    tasks : List.List<Task>,
    id : Nat,
    text : Text,
    section : ?Text,
    done : Bool,
    assignedTo : ?Principal,
    completionDate : ?Text,
    notes : ?Text,
  ) : ?Task {
    let found = tasks.find(func(t) { t.id == id });
    switch (found) {
      case (?existing) {
        let updated : Task = {
          existing with
          text;
          section;
          done;
          assignedTo;
          completionDate;
          notes;
        };
        tasks.mapInPlace(
          func(t) {
            if (t.id == id) { updated } else { t };
          }
        );
        ?updated;
      };
      case null null;
    };
  };

  // Remove the task and renumber the remaining tasks' sortOrder within the
  // affected phase (1-based, contiguous).
  public func deleteTask(tasks : List.List<Task>, id : Nat) : ?Task {
    let found = tasks.find(func(t) { t.id == id });
    switch (found) {
      case (?existing) {
        let phaseId = existing.phaseId;
        let kept = tasks.filter(func(t) { t.id != id });
        tasks.clear();
        var order = 1;
        kept.forEach(func(t) {
          let renumbered : Task = if (t.phaseId == phaseId) {
            { t with sortOrder = order };
          } else {
            t;
          };
          tasks.add(renumbered);
          if (t.phaseId == phaseId) { order := order + 1 };
        });
        ?existing;
      };
      case null null;
    };
  };

  // Reorder tasks within their phase by moving the task with the given id one
  // step in the given direction (#up / #down), then renumber per-phase
  // 1-based contiguous. Only tasks within the same phaseId are renumbered.
  // Mirrors the rebuild pattern from lib/library.mo (filter, clear, renumber,
  // re-add) — no Array.indexOf / Array.thaw / Array.freeze (those APIs do not
  // exist in core 2.6.0).
  public func reorderTasks(tasks : List.List<Task>, id : Nat, direction : { #up; #down }) : [Task] {
    let found = tasks.find(func(t) { t.id == id });
    switch (found) {
      case null { [] };
      case (?target) {
        let phaseId = target.phaseId;
        let all = tasks.toArray();
        let inPhase = all.filter(func(t) { t.phaseId == phaseId }).sort(func(a, b) { Nat.compare(a.sortOrder, b.sortOrder) });
        let others = all.filter(func(t) { t.phaseId != phaseId });
        // Find the index of the target task within its phase (manual loop — no
        // Array.indexOf).
        var targetIdx : ?Nat = null;
        var i = 0;
        for (t in inPhase.values()) {
          if (t.id == id) { targetIdx := ?i };
          i := i + 1;
        };
        switch (targetIdx) {
          case null { inPhase };
          case (?idx) {
            let neighbourIdx : ?Nat = switch (direction) {
              case (#up) if (idx == 0) { null } else { ?(idx - 1) };
              case (#down) if (idx + 1 >= inPhase.size()) { null } else { ?(idx + 1) };
            };
            let reordered : [Task] = switch (neighbourIdx) {
              case null { inPhase };
              case (?j) {
                // Build the swapped id order within the phase.
                var orderedIds : [Nat] = [];
                var k = 0;
                for (t in inPhase.values()) {
                  if (k == idx) {
                    orderedIds := orderedIds.concat([inPhase[j].id]);
                  } else if (k == j) {
                    orderedIds := orderedIds.concat([inPhase[idx].id]);
                  } else {
                    orderedIds := orderedIds.concat([t.id]);
                  };
                  k := k + 1;
                };
                // Renumber 1-based contiguous within the phase.
                var order = 1;
                var acc : [Task] = [];
                for (oid in orderedIds.values()) {
                  switch (inPhase.find(func(t) { t.id == oid })) {
                    case (?t) {
                      let renumbered : Task = { t with sortOrder = order };
                      acc := acc.concat([renumbered]);
                      order := order + 1;
                    };
                    case null {};
                  };
                };
                acc;
              };
            };
            // Rewrite the tasks list: others unchanged, then reordered in-phase.
            tasks.clear();
            others.forEach(func(t) { tasks.add(t) });
            reordered.forEach(func(t) { tasks.add(t) });
            reordered;
          };
        };
      };
    };
  };

  // --- Progress ---

  public func phaseProgress(tasks : List.List<Task>, phaseId : Nat) : (Nat, Nat) {
    var doneCount = 0;
    var totalCount = 0;
    tasks.forEach(func(t) {
      if (t.phaseId == phaseId) {
        totalCount := totalCount + 1;
        if (t.done) { doneCount := doneCount + 1 };
      };
    });
    (doneCount, totalCount);
  };

  public func overallProgress(tasks : List.List<Task>) : (Nat, Nat) {
    var doneCount = 0;
    var totalCount = 0;
    tasks.forEach(func(t) {
      totalCount := totalCount + 1;
      if (t.done) { doneCount := doneCount + 1 };
    });
    (doneCount, totalCount);
  };

  // Compute per-phase progress counts for ALL phases in a single pass over
  // the tasks list. Returns one NsoPhaseProgressCount per phase (in phase
  // sortOrder), with doneCount/totalCount aggregated from the tasks belonging
  // to that phase. Phases with no tasks report 0/0. This is the lightweight
  // alternative to calling getNsoTasksByPhase for every phase header — it
  // touches each task exactly once and returns only counts, not rows.
  public func phaseProgressCounts(
    phases : List.List<Phase>,
    tasks : List.List<Task>,
  ) : [NsoPhaseProgressCount] {
    // Seed a mutable count pair per phase id (phaseId -> (done, total)).
    // Use a Map so we can look up by phaseId in O(log n) while iterating
    // tasks once.
    let counts = Map.empty<Nat, { var done : Nat; var total : Nat }>();
    phases.forEach(func(p) {
      counts.add(p.id, { var done = 0; var total = 0 });
    });
    // Single pass over tasks: increment the matching phase's counters.
    tasks.forEach(func(t) {
      switch (counts.get(t.phaseId)) {
        case (?c) {
          c.total := c.total + 1;
          if (t.done) { c.done := c.done + 1 };
        };
        case null {
          // Task references a phase that no longer exists (orphaned). Skip
          // it — it contributes to no phase header's count.
        };
      };
    });
    // Emit one count per phase, in phase sortOrder.
    listPhases(phases).map(func(p) {
      switch (counts.get(p.id)) {
        case (?c) { { phaseId = p.id; doneCount = c.done; totalCount = c.total } };
        case null { { phaseId = p.id; doneCount = 0; totalCount = 0 } };
      };
    });
  };

  // --- Bulk import ---

  // Validate the import input shape. Traps with a clear message if a phase
  // has no name or a task has no text. Returns () on success.
  private func validateInput(input : NsoImportInput) : () {
    for (phase in input.phases.values()) {
      if (phase.name == "") {
        Runtime.trap("Invalid NSO import: phase name is empty");
      };
      for (task in phase.tasks.values()) {
        if (task.text == "") {
          Runtime.trap("Invalid NSO import: task text is empty");
        };
      };
    };
  };

  // Import phases and tasks from the documented JSON shape. For each input
  // phase: find an existing phase by name (case-sensitive); if found reuse its
  // id, else create a new phase (next sortOrder). For each input task: append
  // with next per-phase order, done=false, assignedTo=null,
  // completionDate=null, notes=inputTask.notes (absent maps to null). Mutates
  // `phases`, `tasks`, `nextPhaseId`, and `nextTaskId` in place. Returns a
  // summary.
  public func importNso(
    phases : List.List<Phase>,
    tasks : List.List<Task>,
    nextPhaseId : { var value : Nat },
    nextTaskId : { var value : Nat },
    input : NsoImportInput,
  ) : NsoImportSummary {
    validateInput(input);
    var phasesCreated = 0;
    var phasesReused = 0;
    var tasksAdded = 0;
    for (inputPhase in input.phases.values()) {
      // Find an existing phase by name (case-sensitive).
      let existing = phases.find(func(p) { p.name == inputPhase.name });
      let phaseId = switch (existing) {
        case (?p) {
          phasesReused := phasesReused + 1;
          p.id;
        };
        case null {
          phasesCreated := phasesCreated + 1;
          let created = createPhase(phases, nextPhaseId, inputPhase.name);
          created.id;
        };
      };
      // Append each task to this phase (next per-phase order). Pass the
      // input task's notes through (absent/missing maps to null via ?Text).
      for (inputTask in inputPhase.tasks.values()) {
        let _ = createTask(tasks, nextTaskId, phaseId, inputTask.text, inputTask.section, null, inputTask.notes);
        tasksAdded := tasksAdded + 1;
      };
    };
    {
      phasesCreated;
      phasesReused;
      tasksAdded;
    };
  };
};
