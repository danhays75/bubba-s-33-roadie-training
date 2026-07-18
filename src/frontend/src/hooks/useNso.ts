import { Variant_up_down } from "@/backend";
import type { Role, UserProfile } from "@/types/foundation";
import type {
  NsoImportInput,
  NsoImportSummary,
  NsoOverallProgress,
  NsoPhase,
  NsoPhaseProgressCount,
  NsoReorderDirection,
  NsoTask,
} from "@/types/nso";
import {
  toFrontendPhase,
  toFrontendPhaseProgressCount,
  toFrontendProgress,
  toFrontendSummary,
  toFrontendTask,
} from "@/types/nso";
import { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useBackend } from "./useBackend";

/**
 * NSO (New Store Opening) hooks — phases, tasks, progress, and
 * manager/admin CRUD/reorder/import.
 *
 * Mirrors the useLibrary.ts pattern: string ids and number sortOrder on the
 * frontend, BigInt translation at the hook boundary. Optional ?Text fields
 * (section, notes, completionDate) and the optional ?Principal (assignedTo)
 * are translated null <-> null and string <-> string / Principal.
 *
 * Query keys:
 *   - ["nso-phases"]                       — every phase, ordered by sortOrder
 *   - ["nso-tasks", phaseId]               — tasks in a phase, ordered by sortOrder
 *   - ["nso-progress"]                      — overall done/total across all tasks
 *   - ["nso-phase-progress"]               — per-phase done/total counts (one call)
 *
 * All hooks render inside the existing single QueryClientProvider (main.tsx)
 * and ErrorBoundary — no second provider is added here.
 */

// --- Reads -----------------------------------------------------------------

/** Reads every NSO phase, ordered by per-parent sortOrder. */
export function useNsoPhases() {
  const { actor, isFetching } = useBackend();
  return useQuery<NsoPhase[]>({
    queryKey: ["nso-phases"],
    queryFn: async () => {
      if (!actor) return [];
      const result = await actor.getNsoPhases();
      return result.map(toFrontendPhase);
    },
    enabled: !!actor && !isFetching,
  });
}

/**
 * Reads every NSO task in a phase, ordered by per-parent sortOrder.
 *
 * Gated on `isOpen` (defaults to true for backward compatibility): the query
 * only runs when its phase is expanded, so the page fetches zero task rows on
 * load. Pass `isOpen` from the phase-section's expanded state to keep
 * collapsed phases from triggering a fetch.
 */
export function useNsoTasksByPhase(phaseId: string, isOpen = true) {
  const { actor, isFetching } = useBackend();
  return useQuery<NsoTask[]>({
    queryKey: ["nso-tasks", phaseId],
    queryFn: async () => {
      if (!actor) return [];
      const result = await actor.getNsoTasksByPhase(BigInt(phaseId));
      return result.map(toFrontendTask);
    },
    enabled: !!actor && !isFetching && !!phaseId && isOpen,
  });
}

/** Reads the overall NSO progress (done/total across every task). */
export function useNsoOverallProgress() {
  const { actor, isFetching } = useBackend();
  return useQuery<NsoOverallProgress>({
    queryKey: ["nso-progress"],
    queryFn: async () => {
      if (!actor) return { doneCount: 0, totalCount: 0 };
      const result = await actor.getNsoOverallProgress();
      return toFrontendProgress(result);
    },
    enabled: !!actor && !isFetching,
  });
}

/**
 * Reads per-phase done/total counts in a single backend call. Supplies each
 * collapsed phase header's "N of M done" without loading the phase's full
 * task list — the page fetches zero task rows on load because
 * useNsoTasksByPhase is gated on the phase being expanded.
 *
 * Query key: ["nso-phase-progress"].
 */
export function useNsoPhaseProgressCounts() {
  const { actor, isFetching } = useBackend();
  return useQuery<NsoPhaseProgressCount[]>({
    queryKey: ["nso-phase-progress"],
    queryFn: async () => {
      if (!actor) return [];
      const result = await actor.getNsoPhaseProgressCounts();
      return result.map(toFrontendPhaseProgressCount);
    },
    enabled: !!actor && !isFetching,
  });
}

/**
 * Reads the users assignable to NSO tasks — managers and admins only.
 *
 * Uses the manager-accessible `getNsoAssignableUsers` endpoint (NOT the
 * admin-only `getAllUsers`), so the Assign dropdown populates correctly
 * for Manager-role users as well as Admins. The endpoint already filters
 * to managers/admins server-side, so no additional role filter is needed
 * here. Translation mirrors useAllUsers: Candid UserProfile (id: Principal)
 * → frontend UserProfile (principal: string).
 *
 * Query key: ["nso-assignable-users"].
 */
export function useNsoAssignableUsers() {
  const { actor, isFetching } = useBackend();
  return useQuery<UserProfile[]>({
    queryKey: ["nso-assignable-users"],
    queryFn: async () => {
      if (!actor) return [];
      const result = await actor.getNsoAssignableUsers();
      return result.map((p) => ({
        principal: p.id.toString(),
        name: p.name,
        storeLocation: p.storeLocation,
        role: p.role as Role,
      }));
    },
    enabled: !!actor && !isFetching,
  });
}

// --- Phase mutations -------------------------------------------------------

export interface CreateNsoPhaseInput {
  name: string;
}

/** Creates a new NSO phase (manager/admin only). */
export function useCreateNsoPhase() {
  const queryClient = useQueryClient();
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (input: CreateNsoPhaseInput) => {
      if (!actor) throw new Error("Backend not ready");
      // Candid: createNsoPhase(name: string) -> Phase
      const result = await actor.createNsoPhase(input.name);
      return toFrontendPhase(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nso-phases"] });
      queryClient.invalidateQueries({ queryKey: ["nso-progress"] });
      queryClient.invalidateQueries({ queryKey: ["nso-phase-progress"] });
    },
  });
}

export interface UpdateNsoPhaseInput {
  id: string;
  name: string;
}

/** Updates an existing NSO phase's name (manager/admin only). */
export function useUpdateNsoPhase() {
  const queryClient = useQueryClient();
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (input: UpdateNsoPhaseInput) => {
      if (!actor) throw new Error("Backend not ready");
      // Candid: updateNsoPhase(id: bigint, name: string) -> void
      await actor.updateNsoPhase(BigInt(input.id), input.name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nso-phases"] });
    },
  });
}

export interface DeleteNsoPhaseInput {
  id: string;
}

/**
 * Deletes an NSO phase (manager/admin only). Invalidates the phase list,
 * every task list (the phase's tasks are gone), and overall progress.
 */
export function useDeleteNsoPhase() {
  const queryClient = useQueryClient();
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (input: DeleteNsoPhaseInput) => {
      if (!actor) throw new Error("Backend not ready");
      // Candid: deleteNsoPhase(id: bigint) -> void
      await actor.deleteNsoPhase(BigInt(input.id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nso-phases"] });
      queryClient.invalidateQueries({ queryKey: ["nso-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["nso-progress"] });
      queryClient.invalidateQueries({ queryKey: ["nso-phase-progress"] });
    },
  });
}

export interface ReorderNsoPhasesInput {
  id: string;
  direction: NsoReorderDirection;
}

/** Reorders an NSO phase up or down within the phase list (manager/admin). */
export function useReorderNsoPhases() {
  const queryClient = useQueryClient();
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (input: ReorderNsoPhasesInput) => {
      if (!actor) throw new Error("Backend not ready");
      // Candid: reorderNsoPhases(id: bigint, direction: Variant_up_down) -> void
      await actor.reorderNsoPhases(
        BigInt(input.id),
        input.direction === "up" ? Variant_up_down.up : Variant_up_down.down,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nso-phases"] });
    },
  });
}

// --- Task mutations --------------------------------------------------------

export interface CreateNsoTaskInput {
  phaseId: string;
  text: string;
  section?: string | null;
  assignedTo?: string | null;
}

/** Creates a new NSO task under a phase (manager/admin only). */
export function useCreateNsoTask() {
  const queryClient = useQueryClient();
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (input: CreateNsoTaskInput) => {
      if (!actor) throw new Error("Backend not ready");
      // Candid: createNsoTask(phaseId, text, section: ?Text, assignedTo: ?Principal) -> Task
      const result = await actor.createNsoTask(
        BigInt(input.phaseId),
        input.text,
        input.section && input.section.length > 0 ? input.section : null,
        input.assignedTo ? Principal.fromText(input.assignedTo) : null,
      );
      return toFrontendTask(result);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["nso-tasks", variables.phaseId],
      });
      queryClient.invalidateQueries({ queryKey: ["nso-progress"] });
      queryClient.invalidateQueries({ queryKey: ["nso-phase-progress"] });
    },
  });
}

export interface UpdateNsoTaskInput {
  id: string;
  phaseId: string;
  text: string;
  section?: string | null;
  done: boolean;
  assignedTo?: string | null;
  completionDate?: string | null;
  notes?: string | null;
}

/** Updates an existing NSO task (manager/admin only). */
export function useUpdateNsoTask() {
  const queryClient = useQueryClient();
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (input: UpdateNsoTaskInput) => {
      if (!actor) throw new Error("Backend not ready");
      // Candid: updateNsoTask(id, text, section: ?Text, done, assignedTo: ?Principal,
      //                       completionDate: ?Text, notes: ?Text) -> void
      await actor.updateNsoTask(
        BigInt(input.id),
        input.text,
        input.section && input.section.length > 0 ? input.section : null,
        input.done,
        input.assignedTo ? Principal.fromText(input.assignedTo) : null,
        input.completionDate && input.completionDate.length > 0
          ? input.completionDate
          : null,
        input.notes && input.notes.length > 0 ? input.notes : null,
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["nso-tasks", variables.phaseId],
      });
      queryClient.invalidateQueries({ queryKey: ["nso-progress"] });
      queryClient.invalidateQueries({ queryKey: ["nso-phase-progress"] });
    },
  });
}

export interface ToggleNsoTaskInput {
  id: string;
  phaseId: string;
  done: boolean;
  completionDate?: string | null;
}

/**
 * Toggles an NSO task's done flag (manager/admin only). This is the
 * immediate-save hook for checkbox toggles — there is no separate save
 * button; the checkbox fires this mutation on every change.
 *
 * Optimistic: onMutate flips the toggled task's `done` flag and
 * completionDate in the ["nso-tasks", phaseId] cache and adjusts the
 * ["nso-progress"] doneCount, snapshots both for rollback. onError restores
 * the snapshots. onSuccess does NOT invalidate the task list (the optimistic
 * value already holds); it only invalidates ["nso-progress"] to reconcile
 * server truth. No full phase task-list refetch on every checkbox toggle.
 */
export function useToggleNsoTask() {
  const queryClient = useQueryClient();
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (input: ToggleNsoTaskInput) => {
      if (!actor) throw new Error("Backend not ready");
      // Candid: toggleNsoTask(id, done, completionDate: ?Text) -> void
      await actor.toggleNsoTask(
        BigInt(input.id),
        input.done,
        input.completionDate && input.completionDate.length > 0
          ? input.completionDate
          : null,
      );
    },
    onMutate: async (input) => {
      const tasksKey = ["nso-tasks", input.phaseId] as const;
      const progressKey = ["nso-progress"] as const;

      // Snapshot current caches for rollback. Cancel in-flight queries so
      // they don't clobber the optimistic value.
      await queryClient.cancelQueries({ queryKey: tasksKey });
      const previousTasks = queryClient.getQueryData<NsoTask[]>(tasksKey);
      const previousProgress =
        queryClient.getQueryData<NsoOverallProgress>(progressKey);

      // Optimistically patch the toggled task in the phase's task list.
      if (previousTasks) {
        const todayIso = new Date().toISOString();
        const updatedTasks = previousTasks.map((task) =>
          task.id === input.id
            ? {
                ...task,
                done: input.done,
                completionDate: input.done ? todayIso : null,
              }
            : task,
        );
        queryClient.setQueryData(tasksKey, updatedTasks);
      }

      // Optimistically adjust the overall done count.
      if (previousProgress) {
        const delta = input.done ? 1 : -1;
        queryClient.setQueryData(progressKey, {
          ...previousProgress,
          doneCount: Math.max(0, previousProgress.doneCount + delta),
        });
      }

      return { previousTasks, previousProgress };
    },
    onError: (_error, input, context) => {
      if (!context) return;
      queryClient.setQueryData(
        ["nso-tasks", input.phaseId],
        context.previousTasks,
      );
      queryClient.setQueryData(["nso-progress"], context.previousProgress);
    },
    onSuccess: (_data, _variables) => {
      // Reconcile server truth for progress only; the task list already
      // holds the correct optimistic value, so do NOT invalidate it.
      queryClient.invalidateQueries({ queryKey: ["nso-progress"] });
      queryClient.invalidateQueries({ queryKey: ["nso-phase-progress"] });
    },
  });
}

export interface SetNsoTaskAssignmentInput {
  id: string;
  phaseId: string;
  assignedTo: string | null;
}

/** Sets an NSO task's assigned user (manager/admin only). */
export function useSetNsoTaskAssignment() {
  const queryClient = useQueryClient();
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (input: SetNsoTaskAssignmentInput) => {
      if (!actor) throw new Error("Backend not ready");
      // Candid: setNsoTaskAssignment(id, assignedTo: ?Principal) -> void
      await actor.setNsoTaskAssignment(
        BigInt(input.id),
        input.assignedTo ? Principal.fromText(input.assignedTo) : null,
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["nso-tasks", variables.phaseId],
      });
    },
  });
}

export interface SetNsoTaskCompletionDateInput {
  id: string;
  phaseId: string;
  completionDate: string | null;
}

/** Sets an NSO task's completion date (manager/admin only). */
export function useSetNsoTaskCompletionDate() {
  const queryClient = useQueryClient();
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (input: SetNsoTaskCompletionDateInput) => {
      if (!actor) throw new Error("Backend not ready");
      // Candid: setNsoTaskCompletionDate(id, completionDate: ?Text) -> void
      await actor.setNsoTaskCompletionDate(
        BigInt(input.id),
        input.completionDate && input.completionDate.length > 0
          ? input.completionDate
          : null,
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["nso-tasks", variables.phaseId],
      });
    },
  });
}

export interface DeleteNsoTaskInput {
  id: string;
  phaseId: string;
}

/** Deletes an NSO task (manager/admin only). */
export function useDeleteNsoTask() {
  const queryClient = useQueryClient();
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (input: DeleteNsoTaskInput) => {
      if (!actor) throw new Error("Backend not ready");
      // Candid: deleteNsoTask(id: bigint) -> void
      await actor.deleteNsoTask(BigInt(input.id));
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["nso-tasks", variables.phaseId],
      });
      queryClient.invalidateQueries({ queryKey: ["nso-progress"] });
      queryClient.invalidateQueries({ queryKey: ["nso-phase-progress"] });
    },
  });
}

export interface ReorderNsoTasksInput {
  id: string;
  phaseId: string;
  direction: NsoReorderDirection;
}

/** Reorders an NSO task up or down within its phase (manager/admin). */
export function useReorderNsoTasks() {
  const queryClient = useQueryClient();
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (input: ReorderNsoTasksInput) => {
      if (!actor) throw new Error("Backend not ready");
      // Candid: reorderNsoTasks(id: bigint, direction: Variant_up_down) -> void
      await actor.reorderNsoTasks(
        BigInt(input.id),
        input.direction === "up" ? Variant_up_down.up : Variant_up_down.down,
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["nso-tasks", variables.phaseId],
      });
    },
  });
}

// --- Bulk import -----------------------------------------------------------

/**
 * Bulk-imports a preset/template of NSO phases and tasks (manager/admin).
 * Returns the import summary (counts of created/reused phases and added
 * tasks). Invalidates every NSO query on success so the UI re-fetches the
 * full tree.
 */
export function useImportNsoTasks() {
  const queryClient = useQueryClient();
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (input: NsoImportInput): Promise<NsoImportSummary> => {
      if (!actor) throw new Error("Backend not ready");
      // Candid: importNsoTasks(input: NsoImportInput) -> NsoImportSummary
      // NsoImportInput = { moduleName: string, phases: [{ name, tasks: [{ text, section: ?Text, notes: ?Text }] }] }
      const result = await actor.importNsoTasks({
        moduleName: input.moduleName,
        phases: input.phases.map((p) => ({
          name: p.name,
          tasks: p.tasks.map((t) => ({
            text: t.text,
            // NsoImportTask declares section?: string and notes?: string as optional
            // (not string | null). The runtime encoder uses a truthiness check
            // (value.section ? candid_some(...) : candid_none()), so undefined
            // maps to candid_none() and round-trips correctly. Keep `undefined`
            // here — a literal null would be a TS error on a ?: string field.
            section: t.section && t.section.length > 0 ? t.section : undefined,
            notes: t.notes && t.notes.length > 0 ? t.notes : undefined,
          })),
        })),
      });
      return toFrontendSummary(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nso-phases"] });
      queryClient.invalidateQueries({ queryKey: ["nso-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["nso-progress"] });
      queryClient.invalidateQueries({ queryKey: ["nso-phase-progress"] });
    },
  });
}
