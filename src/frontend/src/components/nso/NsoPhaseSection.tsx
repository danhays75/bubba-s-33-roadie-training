import { NsoPhaseFormDialog } from "@/components/nso/NsoPhaseFormDialog";
import { NsoTaskFormDialog } from "@/components/nso/NsoTaskFormDialog";
import { NsoTaskRow } from "@/components/nso/NsoTaskRow";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  useDeleteNsoPhase,
  useNsoTasksByPhase,
  useReorderNsoPhases,
} from "@/hooks/useNso";
import { cn } from "@/lib/utils";
import type { NsoPhase, NsoTask } from "@/types/nso";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

/**
 * A collapsible NSO phase section.
 *
 * Header (always visible):
 *   - Sort number block (bg-nav, Oswald numeral) — 1-based phase index.
 *   - Phase name in font-heading (Oswald) uppercase.
 *   - Progress indicator "N of M done" + red-filled progress bar.
 *   - Reorder up/down, edit, delete (with confirm + cascade warning), and an
 *     "Add task" button.
 *
 * Body (when expanded):
 *   - Tasks grouped by their `section` field. Tasks with no section are
 *     grouped under an unlabeled group (rendered first to keep a stable
 *     order). Each section gets a font-heading muted header, then the
 *     task rows via <NsoTaskRow />.
 *
 * Progress is computed from the loaded tasks (doneCount / totalCount).
 * The phase list itself is sorted by sortOrder in the parent page; this
 * component receives its 0-based index for the sort-number block and the
 * reorder first/last disabled state.
 */
export function NsoPhaseSection({
  phase,
  index,
  total,
}: {
  phase: NsoPhase;
  /** 0-based position in the phase list. */
  index: number;
  /** Total phases (for disabling first/last reorder). */
  total: number;
}) {
  const { data: tasks, isLoading } = useNsoTasksByPhase(phase.id);
  const reorderMutation = useReorderNsoPhases();
  const deleteMutation = useDeleteNsoPhase();

  const [open, setOpen] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isFirst = index === 0;
  const isLast = index === total - 1;

  // Sort client-side by sortOrder so the UI stays stable during refetches.
  const orderedTasks = useMemo<NsoTask[]>(
    () => [...(tasks ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
    [tasks],
  );

  const doneCount = orderedTasks.filter((t) => t.done).length;
  const totalCount = orderedTasks.length;
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  // Group tasks by section. Tasks with null/empty section go into an
  // unlabeled group keyed by "" and rendered first for a stable order.
  const grouped = useMemo(() => {
    const map = new Map<string, NsoTask[]>();
    for (const t of orderedTasks) {
      const key = t.section && t.section.length > 0 ? t.section : "";
      const arr = map.get(key);
      if (arr) arr.push(t);
      else map.set(key, [t]);
    }
    // Stable order: unlabeled group first, then sections alphabetically.
    return Array.from(map.entries()).sort((a, b) => {
      if (a[0] === "") return -1;
      if (b[0] === "") return 1;
      return a[0].localeCompare(b[0]);
    });
  }, [orderedTasks]);

  async function handleReorder(direction: "up" | "down") {
    try {
      await reorderMutation.mutateAsync({ id: phase.id, direction });
    } catch (err) {
      toast.error("Could not reorder phase", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  async function handleDelete() {
    try {
      await deleteMutation.mutateAsync({ id: phase.id });
      toast.success("Phase deleted");
      setDeleting(false);
    } catch (err) {
      toast.error("Could not delete phase", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  function openEdit() {
    setFormMode("edit");
    setFormOpen(true);
  }

  return (
    <section
      className="rounded-md border border-border bg-card"
      data-ocid={`nso.phase.section.${index + 1}`}
    >
      {/* Header */}
      <div
        className="flex items-stretch gap-0"
        data-ocid={`nso.phase.header.${index + 1}`}
      >
        {/* Sort number — per-parent, 1-based, black nav block */}
        <div
          className="flex w-10 shrink-0 items-center justify-center rounded-l-md border-r border-border bg-nav font-heading text-lg text-foreground"
          aria-label={`Phase ${index + 1} of ${total}`}
          data-ocid={`nso.phase.sort_number.${index + 1}`}
        >
          {index + 1}
        </div>

        {/* Collapsible trigger: name + progress */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={`nso-phase-body-${phase.id}`}
          className="flex min-w-0 flex-1 flex-col gap-1 px-3 py-2.5 text-left transition-colors duration-200 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
          data-ocid={`nso.phase.toggle.${index + 1}`}
        >
          <div className="flex items-center gap-2">
            <ChevronDown
              className={cn(
                "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
                open ? "" : "-rotate-90",
              )}
            />
            <h3 className="truncate font-heading text-base uppercase leading-tight tracking-wide text-foreground">
              {phase.name}
            </h3>
          </div>
          <div className="flex items-center gap-2 pl-6">
            <Progress
              value={pct}
              className="h-1.5 max-w-32"
              data-ocid={`nso.phase.progress.${index + 1}`}
            />
            <span className="font-body text-xs text-muted-foreground whitespace-nowrap">
              {doneCount} of {totalCount} done
            </span>
          </div>
        </button>

        {/* Reorder + edit + delete + add task */}
        <div className="flex shrink-0 items-center gap-0.5 pr-2">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => handleReorder("up")}
            disabled={isFirst || reorderMutation.isPending}
            aria-label={`Move ${phase.name} phase up`}
            data-ocid={`nso.phase.move_up_button.${index + 1}`}
          >
            <ChevronUp />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => handleReorder("down")}
            disabled={isLast || reorderMutation.isPending}
            aria-label={`Move ${phase.name} phase down`}
            data-ocid={`nso.phase.move_down_button.${index + 1}`}
          >
            <ChevronDown />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={openEdit}
            aria-label={`Edit ${phase.name} phase`}
            data-ocid={`nso.phase.edit_button.${index + 1}`}
          >
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-primary hover:bg-primary/10 hover:text-primary"
            onClick={() => setDeleting(true)}
            aria-label={`Delete ${phase.name} phase`}
            data-ocid={`nso.phase.delete_button.${index + 1}`}
          >
            <Trash2 />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setTaskFormOpen(true)}
            className="ml-1"
            data-ocid={`nso.phase.add_task_button.${index + 1}`}
          >
            <Plus />
            <span className="hidden sm:inline">Add task</span>
          </Button>
        </div>
      </div>

      {/* Body — grouped tasks */}
      {open && (
        <div
          id={`nso-phase-body-${phase.id}`}
          className="border-t border-border px-3 py-3"
          data-ocid={`nso.phase.body.${index + 1}`}
        >
          {isLoading ? (
            <PhaseTasksSkeleton />
          ) : orderedTasks.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-background px-4 py-8 text-center"
              data-ocid={`nso.phase.empty_state.${index + 1}`}
            >
              <div className="flex size-8 items-center justify-center rounded-full bg-nav text-primary">
                <Plus />
              </div>
              <p className="font-heading text-xs uppercase tracking-wide text-foreground">
                No tasks yet
              </p>
              <p className="font-body text-xs text-muted-foreground">
                Add a task or import a preset to start this phase.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTaskFormOpen(true)}
                data-ocid={`nso.phase.empty_state.add_task_button.${index + 1}`}
              >
                <Plus />
                Add task
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {grouped.map(([sectionName, sectionTasks]) => (
                <div
                  key={sectionName || "__unlabeled__"}
                  className="flex flex-col gap-2"
                  data-ocid={`nso.phase.section_group.${index + 1}`}
                >
                  {sectionName.length > 0 && (
                    <h4 className="font-heading text-xs uppercase tracking-wider text-muted-foreground pl-1">
                      {sectionName}
                    </h4>
                  )}
                  <ul className="flex flex-col gap-2">
                    {sectionTasks.map((task) => (
                      <NsoTaskRow
                        key={task.id}
                        task={task}
                        index={orderedTasks.indexOf(task)}
                        total={totalCount}
                      />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <NsoPhaseFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        phase={formMode === "edit" ? phase : null}
      />

      <NsoTaskFormDialog
        open={taskFormOpen}
        onOpenChange={setTaskFormOpen}
        phaseId={phase.id}
      />

      <AlertDialog
        open={deleting}
        onOpenChange={(o) => !o && setDeleting(false)}
      >
        <AlertDialogContent
          className="bg-card border-border"
          data-ocid={`nso.phase.delete_dialog.${index + 1}`}
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading uppercase tracking-wide text-foreground">
              Delete phase?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This removes the phase{" "}
              <strong className="text-foreground">
                &ldquo;{phase.name}&rdquo;
              </strong>{" "}
              and{" "}
              <strong className="text-foreground">
                all {totalCount} {totalCount === 1 ? "task" : "tasks"}
              </strong>{" "}
              inside it. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deleteMutation.isPending}
              data-ocid={`nso.phase.delete_dialog.cancel_button.${index + 1}`}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary-hover"
              data-ocid={`nso.phase.delete_dialog.confirm_button.${index + 1}`}
            >
              {deleteMutation.isPending && <Loader2 className="animate-spin" />}
              Delete phase
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function PhaseTasksSkeleton() {
  return (
    <ul
      className="flex flex-col gap-2"
      data-ocid="nso.phase.loading_state"
      aria-hidden
    >
      {["s1", "s2", "s3"].map((k) => (
        <li
          key={k}
          className="flex items-center gap-3 rounded-md border border-border bg-card p-3"
        >
          <div className="size-5 shrink-0 animate-pulse rounded bg-muted" />
          <div className="h-4 flex-1 animate-pulse rounded bg-muted" />
          <div className="h-8 w-24 animate-pulse rounded bg-muted/60" />
        </li>
      ))}
    </ul>
  );
}
