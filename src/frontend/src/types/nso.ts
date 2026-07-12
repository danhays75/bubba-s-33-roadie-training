// Frontend NSO (New Store Opening) types mirroring the backend Candid
// bindings in backend.d.ts.
//
// The backend returns bigint ids and Principal; the frontend keeps ergonomic
// string versions (stringified bigint ids, principal text) for routing,
// display, and React keys. The hooks in src/hooks/useNso.ts translate at the
// boundary: string -> bigint (BigInt(...)) and string -> Principal
// (Principal.fromText(...)) on the way in, and the reverse on the way out.
//
// Optional ?Text fields (section, notes, completionDate) and the optional
// ?Principal (assignedTo) are translated to `T | null` on the frontend —
// `null` represents the absent optional, matching the foundation.ts pattern.

/**
 * An NSO phase (e.g. "Pre-Opening", "Soft Opening", "Grand Opening").
 * Phases are ordered per-parent (the phase list) using sortOrder.
 *
 * `id` is the stringified bigint (`phase.id.toString()`) — set by the hook
 * layer when translating the Candid Phase (which has `id: bigint`).
 * `sortOrder` is the number form of the bigint sortOrder.
 */
export type NsoPhase = {
  id: string;
  name: string;
  sortOrder: number;
};

/**
 * An NSO task scoped to a single phase. Tasks are ordered per-parent
 * (within their phase) using sortOrder.
 *
 * `id` and `phaseId` are stringified bigints — set by the hook layer when
 * translating the Candid Task (which has `id: bigint`, `phaseId: bigint`).
 * `sortOrder` is the number form of the bigint sortOrder. `section`,
 * `assignedTo`, `completionDate`, and `notes` are null when the backend omits
 * the optional fields. `assignedTo` is the stringified Principal text.
 */
export type NsoTask = {
  id: string;
  phaseId: string;
  text: string;
  section: string | null;
  done: boolean;
  assignedTo: string | null;
  completionDate: string | null;
  notes: string | null;
  sortOrder: number;
};

/**
 * A single task input for the bulk import. `section` is null when the task
 * has no section grouping. `notes` is null when the task has no notes.
 */
export type NsoImportTaskInput = {
  section: string | null;
  text: string;
  notes: string | null;
};

/**
 * A single phase input for the bulk import: a phase name plus the tasks that
 * belong to it.
 */
export type NsoImportPhaseInput = {
  name: string;
  tasks: NsoImportTaskInput[];
};

/**
 * Top-level bulk-import input. `moduleName` is the preset/template name
 * (informational); `phases` is the full phase+task tree to import.
 */
export type NsoImportInput = {
  moduleName: string;
  phases: NsoImportPhaseInput[];
};

/**
 * Summary returned by the bulk import. Counts are number forms of the
 * backend's bigint counters.
 */
export type NsoImportSummary = {
  phasesCreated: number;
  phasesReused: number;
  tasksAdded: number;
};

/**
 * Overall NSO progress across every phase and task. `doneCount` / `totalCount`
 * are number forms of the backend's bigint counters.
 */
export type NsoOverallProgress = {
  doneCount: number;
  totalCount: number;
};

/**
 * Per-phase progress count for a single phase. `phaseId` is the stringified
 * bigint; `doneCount` / `totalCount` are number forms of the backend's bigint
 * counters. Used to render collapsed phase headers ("N of M done") without
 * loading the phase's full task list.
 */
export type NsoPhaseProgressCount = {
  phaseId: string;
  doneCount: number;
  totalCount: number;
};

/** Direction for the per-parent reorder mutations. */
export type NsoReorderDirection = "up" | "down";

// --- Translators -----------------------------------------------------------

/** Candid Phase shape from backend.d.ts (id and sortOrder are bigint). */
type CandidPhase = {
  id: bigint;
  name: string;
  sortOrder: bigint;
};

/** Candid Task shape from backend.d.ts (optionals are `T | undefined`). */
type CandidTask = {
  id: bigint;
  phaseId: bigint;
  text: string;
  section?: string;
  done: boolean;
  assignedTo?: { toString(): string };
  completionDate?: string;
  notes?: string;
  sortOrder: bigint;
};

/** Candid NsoImportSummary shape from backend.d.ts (bigint counters). */
type CandidSummary = {
  phasesCreated: bigint;
  phasesReused: bigint;
  tasksAdded: bigint;
};

/** Candid overall-progress shape from backend.d.ts (inline record). */
type CandidProgress = {
  doneCount: bigint;
  totalCount: bigint;
};

/** Candid per-phase progress-count shape from backend.d.ts (bigint fields). */
type CandidPhaseProgressCount = {
  phaseId: bigint;
  doneCount: bigint;
  totalCount: bigint;
};

/** Translates a Candid Phase (bigint ids) to the local string-id shape. */
export function toFrontendPhase(c: CandidPhase): NsoPhase {
  return {
    id: c.id.toString(),
    name: c.name,
    sortOrder: Number(c.sortOrder),
  };
}

/** Translates a Candid Task (bigint ids, optional fields) to the local shape. */
export function toFrontendTask(t: CandidTask): NsoTask {
  return {
    id: t.id.toString(),
    phaseId: t.phaseId.toString(),
    text: t.text,
    section: t.section ?? null,
    done: t.done,
    assignedTo: t.assignedTo ? t.assignedTo.toString() : null,
    completionDate: t.completionDate ?? null,
    notes: t.notes ?? null,
    sortOrder: Number(t.sortOrder),
  };
}

/** Translates a Candid NsoImportSummary (bigint counters) to the local shape. */
export function toFrontendSummary(s: CandidSummary): NsoImportSummary {
  return {
    phasesCreated: Number(s.phasesCreated),
    phasesReused: Number(s.phasesReused),
    tasksAdded: Number(s.tasksAdded),
  };
}

/** Translates a Candid overall-progress record (bigint counters) to local. */
export function toFrontendProgress(p: CandidProgress): NsoOverallProgress {
  return {
    doneCount: Number(p.doneCount),
    totalCount: Number(p.totalCount),
  };
}

/** Translates a Candid per-phase progress-count record (bigint) to local. */
export function toFrontendPhaseProgressCount(
  c: CandidPhaseProgressCount,
): NsoPhaseProgressCount {
  return {
    phaseId: c.phaseId.toString(),
    doneCount: Number(c.doneCount),
    totalCount: Number(c.totalCount),
  };
}
