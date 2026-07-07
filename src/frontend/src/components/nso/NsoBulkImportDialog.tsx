import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useImportNsoTasks } from "@/hooks/useNso";
import type {
  NsoImportInput,
  NsoImportPhaseInput,
  NsoImportSummary,
} from "@/types/nso";
import { Loader2, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

/**
 * Approximate maximum number of TASKS (counted across all phases) to send
 * in a single backend `importNsoTasks` message. A single message carrying
 * ~1,100 tasks risks hitting Internet Computer message/instruction limits,
 * so the validated import tree is split into chunks of roughly this size
 * and sent sequentially. Tune this single constant to adjust chunk size.
 */
const IMPORT_CHUNK_SIZE = 200;

/**
 * Bulk Import dialog for NSO phases + tasks — paste a JSON blob of a preset
 * template and import it in BATCHED chunks.
 *
 * Mirrors the library BulkImportDialog pattern: validate the JSON shape
 * BEFORE applying anything (so a malformed blob never mutates state), then
 * split the validated tree into chunks of ~IMPORT_CHUNK_SIZE tasks and call
 * the backend `importNsoTasks` endpoint once per chunk in a sequential loop,
 * aggregating the returned NsoImportSummary values. A progress indicator
 * shows which chunk is in flight; on a per-chunk failure the loop stops,
 * earlier chunks stay imported (no rollback), and the user can re-run for
 * the remaining tasks.
 *
 * Expected JSON shape:
 *   {
 *     module: string,
 *     phases: [
 *       { name: string, tasks: [ { text: string, section?: string, notes?: string } ] }
 *     ]
 *   }
 *
 * Chunking preserves phase grouping correctness: the backend reuses an
 * existing phase by name if it already exists (phasesReused), so calling it
 * multiple times with the same phase name across chunks is safe — the phase
 * is created on the first chunk that references it and reused on subsequent
 * chunks. Chunks are built by filling phases into the current chunk until
 * adding the next phase's tasks would exceed IMPORT_CHUNK_SIZE tasks, then
 * starting a new chunk. A single phase with more than IMPORT_CHUNK_SIZE
 * tasks is split across multiple chunks (same phase name, task list sliced).
 * A single task is never split.
 *
 * On success: invalidates ['nso-phases'], ['nso-tasks'], ['nso-progress']
 * (the hook does this after each chunk), shows a sonner toast summary with
 * totals aggregated across all chunks, then closes the dialog.
 */
export function NsoBulkImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [chunkIndex, setChunkIndex] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);

  const importMutation = useImportNsoTasks();

  // Reset state whenever the dialog opens.
  useEffect(() => {
    if (open) {
      setText("");
      setError(null);
      setChunkIndex(0);
      setTotalChunks(0);
    }
  }, [open]);

  const trimmed = text.trim();
  const importing = importMutation.isPending;
  const canSubmit = trimmed.length > 0 && !importing;

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (trimmed.length === 0) return;

    setError(null);

    // --- Parse -------------------------------------------------------------
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      setError("Invalid JSON — could not parse the pasted text.");
      return;
    }

    // --- Validate shape (before applying anything) -------------------------
    const validation = validateImportBlob(parsed);
    if (!validation.ok || !validation.input) {
      setError(validation.error ?? "Invalid JSON structure.");
      return;
    }

    // --- Split into chunks of ~IMPORT_CHUNK_SIZE tasks --------------------
    const chunks = chunkImportInput(validation.input, IMPORT_CHUNK_SIZE);
    setTotalChunks(chunks.length);
    setChunkIndex(0);

    // --- Execute sequentially, aggregating summaries -----------------------
    const aggregate: NsoImportSummary = {
      phasesCreated: 0,
      phasesReused: 0,
      tasksAdded: 0,
    };

    for (let i = 0; i < chunks.length; i += 1) {
      setChunkIndex(i + 1);
      try {
        const summary = await importMutation.mutateAsync(chunks[i]);
        aggregate.phasesCreated += summary.phasesCreated;
        aggregate.phasesReused += summary.phasesReused;
        aggregate.tasksAdded += summary.tasksAdded;
      } catch (err) {
        const description = err instanceof Error ? err.message : undefined;
        const chunkLabel = `chunk ${i + 1} of ${chunks.length}`;
        const message = `Import failed at ${chunkLabel}${
          description ? `: ${description}` : "."
        } Earlier chunks were imported successfully and were NOT rolled back. Re-run import for the remaining tasks.`;
        setError(message);
        toast.error("Import failed", {
          description: `Stopped at ${chunkLabel}${
            description ? ` — ${description}` : ""
          }. Earlier chunks kept.`,
        });
        return;
      }
    }

    // --- All chunks succeeded ---------------------------------------------
    const message = formatSummary(
      aggregate.phasesCreated,
      aggregate.phasesReused,
      aggregate.tasksAdded,
    );
    toast.success("Import complete", { description: message });
    onOpenChange(false);
  }

  const showProgress = importing && totalChunks > 0;
  const progressPct =
    totalChunks > 0 ? Math.round((chunkIndex / totalChunks) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={importing ? undefined : onOpenChange}>
      <DialogContent
        className="bg-card border-border sm:max-w-2xl"
        data-ocid="nso.import.dialog"
      >
        <DialogHeader>
          <DialogTitle
            className="font-heading uppercase tracking-wide text-foreground"
            data-ocid="nso.import.dialog.title"
          >
            <Upload className="inline size-5 align-text-bottom text-primary" />{" "}
            Import tasks
          </DialogTitle>
          <DialogDescription>
            Paste a JSON preset of phases and tasks. Existing phases (matched by
            name, case-sensitive) are reused, not duplicated. New phases are
            created with the next sort order. Imported tasks start not-done,
            unassigned, and without a completion date. Large imports are sent in
            batches of ~{IMPORT_CHUNK_SIZE} tasks.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleImport} className="grid gap-4">
          {/* JSON textarea */}
          <div className="grid gap-2">
            <Label
              htmlFor="nso-import-json"
              className="font-heading uppercase text-xs tracking-wider"
            >
              JSON
            </Label>
            <Textarea
              id="nso-import-json"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={PLACEHOLDER}
              aria-invalid={!!error}
              aria-describedby={error ? "nso-import-error" : undefined}
              data-ocid="nso.import.dialog.json_input"
              autoComplete="off"
              spellCheck={false}
              className="min-h-56 font-mono text-xs"
              disabled={importing}
            />
            <p className="font-body text-xs text-muted-foreground">
              Expected shape:{" "}
              <code className="font-mono">
                {
                  "{ module, phases: [{ name, tasks: [{ text, section?, notes? }] }] }"
                }
              </code>
            </p>
          </div>

          {/* Inline error */}
          {error && (
            <p
              id="nso-import-error"
              className="text-xs text-primary font-body"
              data-ocid="nso.import.dialog.error_state"
              role="alert"
            >
              {error}
            </p>
          )}

          {/* Progress indicator + bar */}
          {showProgress && (
            <div
              className="grid gap-2"
              data-ocid="nso.import.dialog.loading_state"
              aria-live="polite"
            >
              <output className="text-xs text-muted-foreground font-body flex items-center gap-2">
                <Loader2 className="size-3 animate-spin" />
                Importing chunk {chunkIndex} of {totalChunks}…
              </output>
              <div
                className="h-2 w-full overflow-hidden rounded-sm border border-border bg-background"
                role="progressbar"
                tabIndex={0}
                aria-valuenow={progressPct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Import progress: ${progressPct}%`}
              >
                <div
                  className="h-full bg-primary transition-all duration-200 ease-out"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={importing}
              data-ocid="nso.import.dialog.cancel_button"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit}
              data-ocid="nso.import.dialog.submit_button"
            >
              {importing && <Loader2 className="animate-spin" />}
              Import
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------- Chunking ------------------------------- */

/**
 * Splits a validated NsoImportInput into chunks of approximately
 * `chunkSize` TASKS (counted across all phases, not phases).
 *
 * Chunks are built by filling phases into the current chunk until adding
 * the next phase's tasks would exceed `chunkSize` tasks, then starting a
 * new chunk. A single phase with more than `chunkSize` tasks is split
 * across multiple chunks (same phase name, task list sliced). A single
 * task is never split. The backend reuses an existing phase by name, so
 * repeating a phase name across chunks is safe — the phase is created on
 * the first chunk that references it and reused on subsequent chunks.
 *
 * Each returned chunk is a complete NsoImportInput (same moduleName) with
 * its own slice of the phase/task tree, ready for a single
 * `importNsoTasks` call.
 */
function chunkImportInput(
  input: NsoImportInput,
  chunkSize: number,
): NsoImportInput[] {
  const chunks: NsoImportInput[] = [];
  let current: NsoImportPhaseInput[] = [];

  const flush = () => {
    if (current.length > 0) {
      chunks.push({ moduleName: input.moduleName, phases: current });
      current = [];
    }
  };

  for (const phase of input.phases) {
    let remaining = phase.tasks;

    while (remaining.length > 0) {
      const currentCount = current.reduce((sum, p) => sum + p.tasks.length, 0);
      const room = chunkSize - currentCount;

      if (room <= 0) {
        // Current chunk is full — start a new one.
        flush();
        continue;
      }

      const slice = remaining.slice(0, room);
      current.push({ name: phase.name, tasks: slice });
      remaining = remaining.slice(slice.length);
    }
  }

  flush();
  return chunks;
}

/* ------------------------------- Summary -------------------------------- */

function formatSummary(
  phasesCreated: number,
  phasesReused: number,
  tasksAdded: number,
): string {
  const createdWord = phasesCreated === 1 ? "phase" : "phases";
  const reusedWord = phasesReused === 1 ? "phase" : "phases";
  const tasksWord = tasksAdded === 1 ? "task" : "tasks";
  return `Created ${phasesCreated} ${createdWord}, reused ${phasesReused} ${reusedWord}, added ${tasksAdded} ${tasksWord}.`;
}

/* ------------------------------- Validation ----------------------------- */

interface ImportTask {
  text: string;
  section: string | null;
  notes: string | null;
}

interface ImportPhase {
  name: string;
  tasks: ImportTask[];
}

interface ValidationResult {
  ok: boolean;
  error?: string;
  input?: NsoImportInput;
}

/**
 * Validates the parsed JSON blob has the expected shape:
 *   { module: string, phases: [{ name: string, tasks: [{ text: string, section?: string, notes?: string }] }] }
 *
 * `section` is optional on each task and defaults to null when absent or
 * not a string. `notes` is optional on each task and defaults to null when
 * absent or not a string. The validated input is returned ready for the
 * import hook.
 */
function validateImportBlob(parsed: unknown): ValidationResult {
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return {
      ok: false,
      error:
        "JSON must be an object with a 'module' string and 'phases' array.",
    };
  }
  const root = parsed as Record<string, unknown>;

  if (typeof root.module !== "string" || root.module.trim().length === 0) {
    return {
      ok: false,
      error: "Missing or invalid 'module' string at the top level.",
    };
  }

  if (!Array.isArray(root.phases)) {
    return { ok: false, error: "Missing or invalid 'phases' array." };
  }

  const phases: ImportPhase[] = [];
  for (let i = 0; i < root.phases.length; i += 1) {
    const rawPhase = root.phases[i];
    if (
      typeof rawPhase !== "object" ||
      rawPhase === null ||
      Array.isArray(rawPhase)
    ) {
      return { ok: false, error: `phases[${i}] must be an object.` };
    }
    const phase = rawPhase as Record<string, unknown>;
    if (typeof phase.name !== "string" || phase.name.trim().length === 0) {
      return {
        ok: false,
        error: `phases[${i}].name must be a non-empty string.`,
      };
    }
    if (!Array.isArray(phase.tasks)) {
      return { ok: false, error: `phases[${i}].tasks must be an array.` };
    }

    const tasks: ImportTask[] = [];
    for (let j = 0; j < phase.tasks.length; j += 1) {
      const rawTask = phase.tasks[j];
      if (
        typeof rawTask !== "object" ||
        rawTask === null ||
        Array.isArray(rawTask)
      ) {
        return {
          ok: false,
          error: `phases[${i}].tasks[${j}] must be an object.`,
        };
      }
      const task = rawTask as Record<string, unknown>;
      if (typeof task.text !== "string" || task.text.trim().length === 0) {
        return {
          ok: false,
          error: `phases[${i}].tasks[${j}].text must be a non-empty string.`,
        };
      }
      const section =
        typeof task.section === "string" && task.section.trim().length > 0
          ? task.section.trim()
          : null;
      const notes =
        typeof task.notes === "string" && task.notes.trim().length > 0
          ? task.notes.trim()
          : null;
      tasks.push({ text: task.text.trim(), section, notes });
    }

    phases.push({ name: phase.name.trim(), tasks });
  }

  return {
    ok: true,
    input: { moduleName: root.module.trim(), phases },
  };
}

const PLACEHOLDER = `{
  "module": "Standard Opening",
  "phases": [
    {
      "name": "Pre-Opening",
      "tasks": [
        { "text": "Confirm final staff schedule", "section": "Staffing", "notes": "Cross-check with HR by EOW" },
        { "text": "Walk the line with the GM", "section": "Operations" }
      ]
    },
    {
      "name": "Soft Opening",
      "tasks": [
        { "text": "Run a full service rehearsal", "notes": "Invite-only friends & family" }
      ]
    }
  ]
}`;
