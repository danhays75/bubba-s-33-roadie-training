import { NsoTaskFormDialog } from "@/components/nso/NsoTaskFormDialog";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useDeleteNsoTask,
  useNsoAssignableUsers,
  useReorderNsoTasks,
  useSetNsoTaskAssignment,
  useSetNsoTaskCompletionDate,
  useToggleNsoTask,
} from "@/hooks/useNso";
import { cn } from "@/lib/utils";
import type { UserProfile } from "@/types/foundation";
import type { NsoTask } from "@/types/nso";
import { ChevronDown, ChevronUp, Loader2, Pencil, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

/**
 * A single NSO task row.
 *
 * Layout (mobile-first):
 *   - Line 1: checkbox + task text (strikethrough/muted when done).
 *   - Line 2: Assign select, completion date input, and the row controls
 *     (reorder up/down, edit, delete). On wider screens these sit on one
 *     row; on phones they wrap but stay tappable.
 *
 * Immediate save (no save button):
 *   - Checkbox toggle → useToggleNsoTask. Checking sets completionDate to
 *     today (ISO YYYY-MM-DD); unchecking clears it.
 *   - Assign select change → useSetNsoTaskAssignment.
 *   - Completion date change → useSetNsoTaskCompletionDate.
 *
 * The Assign control lists only users whose profile.role is 'manager' or
 * 'admin'. It uses useNsoAssignableUsers (the manager-accessible
 * getNsoAssignableUsers endpoint) so the dropdown populates for both
 * Manager and Admin roles; the endpoint already returns only
 * managers/admins, so the local role filter is a no-op safety.
 */
export function NsoTaskRow({
  task,
  index,
  total,
}: {
  task: NsoTask;
  /** 0-based position within the phase's task list. */
  index: number;
  /** Total tasks in the phase (for disabling first/last reorder). */
  total: number;
}) {
  const toggleMutation = useToggleNsoTask();
  const assignMutation = useSetNsoTaskAssignment();
  const dateMutation = useSetNsoTaskCompletionDate();
  const reorderMutation = useReorderNsoTasks();
  const deleteMutation = useDeleteNsoTask();
  const { data: users } = useNsoAssignableUsers();

  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState(false);

  const isFirst = index === 0;
  const isLast = index === total - 1;

  // Manager + Admin users only, sorted by name for a stable dropdown.
  const assignableUsers = useMemo<UserProfile[]>(
    () =>
      (users ?? [])
        .filter((u) => u.role === "manager" || u.role === "admin")
        .sort((a, b) => a.name.localeCompare(b.name)),
    [users],
  );

  const assigneeName = useMemo(() => {
    if (!task.assignedTo) return null;
    const u = assignableUsers.find((x) => x.principal === task.assignedTo);
    return u?.name ?? null;
  }, [task.assignedTo, assignableUsers]);

  // Notes are considered "long" when they overflow a 2-line clamp preview.
  // Heuristic: more than ~90 chars OR contains 3+ newline-separated lines
  // (equipment/smallware setup tasks keep full item lists in notes).
  const notesIsLong = useMemo(() => {
    if (!task.notes || task.notes.length === 0) return false;
    if (task.notes.includes("\n")) {
      return (
        task.notes.split("\n").filter((l) => l.trim().length > 0).length > 2
      );
    }
    return task.notes.length > 90;
  }, [task.notes]);

  function todayIso(): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  async function handleToggle(checked: boolean | string) {
    const done = checked === true;
    const completionDate = done ? todayIso() : null;
    try {
      await toggleMutation.mutateAsync({
        id: task.id,
        phaseId: task.phaseId,
        done,
        completionDate,
      });
    } catch (err) {
      toast.error("Could not update task", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  async function handleAssign(value: string) {
    // "__none__" sentinel represents the Unassign option.
    const assignedTo = value === "__none__" ? null : value;
    try {
      await assignMutation.mutateAsync({
        id: task.id,
        phaseId: task.phaseId,
        assignedTo,
      });
    } catch (err) {
      toast.error("Could not assign task", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  async function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    const completionDate = value.length > 0 ? value : null;
    try {
      await dateMutation.mutateAsync({
        id: task.id,
        phaseId: task.phaseId,
        completionDate,
      });
    } catch (err) {
      toast.error("Could not set completion date", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  async function handleReorder(direction: "up" | "down") {
    try {
      await reorderMutation.mutateAsync({
        id: task.id,
        phaseId: task.phaseId,
        direction,
      });
    } catch (err) {
      toast.error("Could not reorder task", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  async function handleDelete() {
    try {
      await deleteMutation.mutateAsync({
        id: task.id,
        phaseId: task.phaseId,
      });
      toast.success("Task deleted");
      setDeleting(false);
    } catch (err) {
      toast.error("Could not delete task", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  const saving =
    toggleMutation.isPending ||
    assignMutation.isPending ||
    dateMutation.isPending;

  return (
    <li
      className="rounded-md border border-border bg-card transition-smooth hover:border-primary/40"
      data-ocid={`nso.task.row.${index + 1}`}
    >
      <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-start sm:gap-3">
        {/* Line 1 (mobile) / left column (desktop): checkbox + text */}
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <Checkbox
            checked={task.done}
            onCheckedChange={handleToggle}
            disabled={toggleMutation.isPending}
            aria-label={`Mark "${task.text}" as ${task.done ? "not done" : "done"}`}
            data-ocid={`nso.task.checkbox.${index + 1}`}
            className="mt-0.5 size-5"
          />
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "font-body text-sm leading-snug break-words",
                task.done
                  ? "text-muted-foreground line-through"
                  : "text-foreground",
              )}
              data-ocid={`nso.task.text.${index + 1}`}
            >
              {task.text}
            </p>
            {/* Saving indicator */}
            {saving && (
              <span
                className="mt-1 inline-flex items-center gap-1 font-body text-xs text-muted-foreground"
                data-ocid={`nso.task.loading_state.${index + 1}`}
                aria-live="polite"
              >
                <Loader2 className="size-3 animate-spin" />
                Saving…
              </span>
            )}
            {/* Notes (expandable for long content; collapsed = 2-line clamp) */}
            {task.notes && task.notes.length > 0 && (
              <div className="mt-1 min-w-0">
                <p
                  className={cn(
                    "font-body text-xs text-muted-foreground break-words",
                    notesExpanded
                      ? "whitespace-pre-wrap leading-relaxed"
                      : "line-clamp-2",
                  )}
                  data-ocid={`nso.task.notes.${index + 1}`}
                >
                  {task.notes}
                </p>
                {notesIsLong && (
                  <button
                    type="button"
                    onClick={() => setNotesExpanded((v) => !v)}
                    aria-expanded={notesExpanded}
                    aria-controls={`nso-task-notes-${index + 1}`}
                    data-ocid={`nso.task.notes_toggle.${index + 1}`}
                    className={cn(
                      "mt-1 inline-flex min-w-0 items-center gap-1 font-heading text-xs uppercase tracking-wider",
                      "text-primary hover:text-primary-hover focus-visible:text-primary-hover",
                      "rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                      "min-h-6 px-0.5 py-0.5 transition-smooth",
                    )}
                  >
                    {notesExpanded ? (
                      <>
                        <ChevronUp className="size-3.5" />
                        Show less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="size-3.5" />
                        Show more
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Line 2 (mobile) / right column (desktop): assign + date + controls */}
        <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
          {/* Assign */}
          <div className="flex items-center gap-1.5">
            <span className="font-heading text-xs uppercase tracking-wider text-muted-foreground">
              Assign
            </span>
            <Select
              value={task.assignedTo ?? "__none__"}
              onValueChange={handleAssign}
              disabled={assignMutation.isPending}
            >
              <SelectTrigger
                size="sm"
                className="h-8 w-32 min-w-0 sm:w-40"
                aria-label={`Assign "${task.text}"`}
                data-ocid={`nso.task.assign_select.${index + 1}`}
              >
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent
                className="bg-popover text-popover-foreground"
                data-ocid={`nso.task.assign_menu.${index + 1}`}
              >
                <SelectItem value="__none__">Unassigned</SelectItem>
                {assignableUsers.map((u) => (
                  <SelectItem
                    key={u.principal}
                    value={u.principal}
                    data-ocid={`nso.task.assign_option.${index + 1}`}
                  >
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Completion date */}
          <div className="flex items-center gap-1.5">
            <span className="font-heading text-xs uppercase tracking-wider text-muted-foreground">
              Done
            </span>
            <input
              type="date"
              value={task.completionDate ?? ""}
              onChange={handleDateChange}
              disabled={dateMutation.isPending}
              aria-label={`Completion date for "${task.text}"`}
              data-ocid={`nso.task.date_input.${index + 1}`}
              className={cn(
                "h-8 rounded-md border border-input bg-transparent px-2 py-1 font-body text-xs text-foreground",
                "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none",
                "disabled:cursor-not-allowed disabled:opacity-50",
              )}
            />
          </div>

          {/* Reorder + edit + delete */}
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => handleReorder("up")}
              disabled={isFirst || reorderMutation.isPending}
              aria-label={`Move "${task.text}" up`}
              data-ocid={`nso.task.move_up_button.${index + 1}`}
            >
              <ChevronUp />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => handleReorder("down")}
              disabled={isLast || reorderMutation.isPending}
              aria-label={`Move "${task.text}" down`}
              data-ocid={`nso.task.move_down_button.${index + 1}`}
            >
              <ChevronDown />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => setFormOpen(true)}
              aria-label={`Edit "${task.text}"`}
              data-ocid={`nso.task.edit_button.${index + 1}`}
            >
              <Pencil />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-primary hover:bg-primary/10 hover:text-primary"
              onClick={() => setDeleting(true)}
              aria-label={`Delete "${task.text}"`}
              data-ocid={`nso.task.delete_button.${index + 1}`}
            >
              <Trash2 />
            </Button>
          </div>
        </div>
      </div>

      {/* Hidden but accessible assignee summary for screen readers */}
      {assigneeName && (
        <span className="sr-only">
          Assigned to {assigneeName}
          {task.completionDate ? `, completed ${task.completionDate}` : ""}
        </span>
      )}

      <NsoTaskFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        phaseId={task.phaseId}
        task={task}
      />

      <AlertDialog
        open={deleting}
        onOpenChange={(o) => !o && setDeleting(false)}
      >
        <AlertDialogContent
          className="bg-card border-border"
          data-ocid={`nso.task.delete_dialog.${index + 1}`}
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading uppercase tracking-wide text-foreground">
              Delete task?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This removes the task{" "}
              <strong className="text-foreground">
                &ldquo;{task.text}&rdquo;
              </strong>{" "}
              from this phase. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deleteMutation.isPending}
              data-ocid={`nso.task.delete_dialog.cancel_button.${index + 1}`}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary-hover"
              data-ocid={`nso.task.delete_dialog.confirm_button.${index + 1}`}
            >
              {deleteMutation.isPending && <Loader2 className="animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}
