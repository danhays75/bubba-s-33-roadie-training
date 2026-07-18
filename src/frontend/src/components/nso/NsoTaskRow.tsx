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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  useDeleteNsoTask,
  useNsoAssignableUsers,
  useReorderNsoTasks,
  useSetNsoTaskAssignment,
  useSetNsoTaskCompletionDate,
  useToggleNsoTask,
  useUpdateNsoTask,
} from "@/hooks/useNso";
import { cn } from "@/lib/utils";
import type { UserProfile } from "@/types/foundation";
import type { NsoTask } from "@/types/nso";
import { ChevronDown, ChevronUp, Loader2, Pencil, Trash2 } from "lucide-react";
import { memo, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

/**
 * A single NSO task row — lightweight by default.
 *
 * Default (collapsed) row renders ONLY:
 *   - checkbox (toggles done via useToggleNsoTask, optimistic)
 *   - task text (strikethrough/muted when done)
 *   - small plain-text labels for assignee and completion date WHEN set
 *   - a single "Edit" button
 *
 * No Radix Select, date input, or AlertDialog is mounted in the default
 * state. Clicking Edit opens ONE dialog (mounted only while open) that
 * hosts the Assign dropdown, completion-date input, reorder up/down,
 * edit fields (text/section/notes), and delete-with-confirm — preserving
 * every control that used to be inline.
 *
 * Notes stay accessible two ways: a small expandable preview in the
 * collapsed row (no dialog), and the full notes textarea inside the Edit
 * dialog.
 */
export const NsoTaskRow = memo(function NsoTaskRow({
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
  const [editOpen, setEditOpen] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState(false);

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

  return (
    <li
      className="rounded-md border border-border bg-card transition-smooth hover:border-primary/40"
      data-ocid={`nso.task.row.${index + 1}`}
    >
      <div className="flex items-start gap-3 p-3">
        {/* Checkbox */}
        <Checkbox
          checked={task.done}
          onCheckedChange={handleToggle}
          disabled={toggleMutation.isPending}
          aria-label={`Mark "${task.text}" as ${task.done ? "not done" : "done"}`}
          data-ocid={`nso.task.checkbox.${index + 1}`}
          className="mt-0.5 size-5"
        />

        {/* Text + small plain-text labels + notes preview */}
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
          {toggleMutation.isPending && (
            <span
              className="mt-1 inline-flex items-center gap-1 font-body text-xs text-muted-foreground"
              data-ocid={`nso.task.loading_state.${index + 1}`}
              aria-live="polite"
            >
              <Loader2 className="size-3 animate-spin" />
              Saving…
            </span>
          )}

          {/* Small plain-text labels: assignee + completion date (only when set) */}
          {(task.assignedTo || task.completionDate) && (
            <p className="mt-1 font-body text-xs text-muted-foreground break-words">
              {task.assignedTo && (
                <span data-ocid={`nso.task.assignee_label.${index + 1}`}>
                  Assigned
                  {task.completionDate ? " " : ""}
                </span>
              )}
              {task.assignedTo && task.completionDate && (
                <span aria-hidden="true"> · </span>
              )}
              {task.completionDate && (
                <span data-ocid={`nso.task.date_label.${index + 1}`}>
                  Done {task.completionDate}
                </span>
              )}
            </p>
          )}

          {/* Notes preview (expandable for long content; collapsed = 2-line clamp) */}
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

        {/* Single per-row Edit button — opens the one combined dialog */}
        <Button
          variant="ghost"
          size="icon"
          className="size-7 shrink-0"
          onClick={() => setEditOpen(true)}
          aria-label={`Edit "${task.text}"`}
          data-ocid={`nso.task.edit_button.${index + 1}`}
        >
          <Pencil />
        </Button>
      </div>

      {/* One combined Edit dialog — mounted ONLY when open */}
      {editOpen && (
        <NsoTaskEditDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          task={task}
          index={index}
          total={total}
        />
      )}
    </li>
  );
});

/* -------------------------------------------------------------------------- */
/* Per-row Edit dialog                                                        */
/* -------------------------------------------------------------------------- */

/**
 * The single per-row Edit dialog. Hosts every control that used to be
 * inline: Assign dropdown (Radix Select via useNsoAssignableUsers — only
 * mounted when this dialog opens), completion-date input, reorder up/down,
 * edit fields (text/section/notes via useUpdateNsoTask), and delete with
 * AlertDialog confirm.
 *
 * Mounted only while `open` is true (the parent conditionally renders it),
 * so no Select, date input, or AlertDialog lives in the DOM for a collapsed
 * row. useNsoAssignableUsers() is called HERE, not in the default row.
 */
function NsoTaskEditDialog({
  open,
  onOpenChange,
  task,
  index,
  total,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: NsoTask;
  index: number;
  total: number;
}) {
  const assignMutation = useSetNsoTaskAssignment();
  const dateMutation = useSetNsoTaskCompletionDate();
  const reorderMutation = useReorderNsoTasks();
  const deleteMutation = useDeleteNsoTask();
  const updateMutation = useUpdateNsoTask();
  const { data: users } = useNsoAssignableUsers();

  const [text, setText] = useState("");
  const [section, setSection] = useState("");
  const [notes, setNotes] = useState("");
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [completionDate, setCompletionDate] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

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

  // Reset fields whenever the dialog opens or the target task changes.
  // Depends on `open` and `task.id` (stable) — NOT the whole `task` object —
  // so background refetches that produce a new task object with the SAME id
  // do NOT re-run this effect and clobber in-progress edits.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally seed only on open or task id change — re-running on field changes would clobber in-progress edits during background refetches
  useEffect(() => {
    if (open) {
      setText(task.text);
      setSection(task.section ?? "");
      setNotes(task.notes ?? "");
      setAssignedTo(task.assignedTo);
      setCompletionDate(task.completionDate);
      setTouched(false);
      setConfirmDelete(false);
    }
  }, [open, task.id]);

  const textError =
    touched && text.trim().length === 0 ? "Task text is required" : null;
  const canSubmit = text.trim().length > 0;
  const isSaving =
    assignMutation.isPending ||
    dateMutation.isPending ||
    updateMutation.isPending;

  async function handleAssign(value: string) {
    // "__none__" sentinel represents the Unassign option.
    const nextAssignedTo = value === "__none__" ? null : value;
    setAssignedTo(nextAssignedTo);
    try {
      await assignMutation.mutateAsync({
        id: task.id,
        phaseId: task.phaseId,
        assignedTo: nextAssignedTo,
      });
    } catch (err) {
      toast.error("Could not assign task", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  async function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    const nextCompletionDate = value.length > 0 ? value : null;
    setCompletionDate(nextCompletionDate);
    try {
      await dateMutation.mutateAsync({
        id: task.id,
        phaseId: task.phaseId,
        completionDate: nextCompletionDate,
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
      // After a successful reorder the list re-renders; close the dialog so
      // the user sees the new position rather than a stale dialog.
      onOpenChange(false);
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
      onOpenChange(false);
    } catch (err) {
      toast.error("Could not delete task", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!canSubmit) return;

    const trimmedText = text.trim();
    const trimmedSection = section.trim();
    const trimmedNotes = notes.trim();

    try {
      await updateMutation.mutateAsync({
        id: task.id,
        phaseId: task.phaseId,
        text: trimmedText,
        section: trimmedSection.length > 0 ? trimmedSection : null,
        done: task.done,
        assignedTo,
        completionDate,
        notes: trimmedNotes.length > 0 ? trimmedNotes : null,
      });
      toast.success("Task updated");
      onOpenChange(false);
    } catch (err) {
      toast.error("Could not update task", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-card border-border sm:max-w-xl"
        data-ocid={`nso.task.edit_dialog.${index + 1}`}
      >
        <DialogHeader>
          <DialogTitle className="font-heading uppercase tracking-wide text-foreground">
            Edit task
          </DialogTitle>
          <DialogDescription>
            Update assignment, completion date, task details, reorder, or delete
            this task.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          {/* Task text — required */}
          <div className="grid gap-2">
            <Label
              htmlFor="nso-task-edit-text"
              className="font-heading uppercase text-xs tracking-wider"
            >
              Task
            </Label>
            <Textarea
              id="nso-task-edit-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="e.g. Confirm final staff schedule"
              aria-invalid={!!textError}
              aria-describedby={
                textError ? "nso-task-edit-text-error" : undefined
              }
              data-ocid={`nso.task.edit.text_input.${index + 1}`}
              autoComplete="off"
              maxLength={400}
            />
            {textError && (
              <p
                id="nso-task-edit-text-error"
                className="text-xs text-primary font-body"
                data-ocid={`nso.task.edit.text_input.field_error.${index + 1}`}
              >
                {textError}
              </p>
            )}
          </div>

          {/* Section — optional */}
          <div className="grid gap-2">
            <Label
              htmlFor="nso-task-edit-section"
              className="font-heading uppercase text-xs tracking-wider"
            >
              Section <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="nso-task-edit-section"
              value={section}
              onChange={(e) => setSection(e.target.value)}
              placeholder="e.g. Staffing"
              data-ocid={`nso.task.edit.section_input.${index + 1}`}
              autoComplete="off"
              maxLength={60}
            />
          </div>

          {/* Notes — optional */}
          <div className="grid gap-2">
            <Label
              htmlFor="nso-task-edit-notes"
              className="font-heading uppercase text-xs tracking-wider"
            >
              Notes <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="nso-task-edit-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any extra context for whoever picks up this task."
              data-ocid={`nso.task.edit.notes_input.${index + 1}`}
              autoComplete="off"
              maxLength={1000}
            />
          </div>

          {/* Assign + completion date row */}
          <div className="grid gap-3 sm:grid-cols-2">
            {/* Assign */}
            <div className="grid gap-2">
              <Label
                htmlFor="nso-task-edit-assign"
                className="font-heading uppercase text-xs tracking-wider"
              >
                Assign
              </Label>
              <Select
                value={assignedTo ?? "__none__"}
                onValueChange={handleAssign}
                disabled={assignMutation.isPending}
              >
                <SelectTrigger
                  size="sm"
                  className="h-9 w-full min-w-0"
                  aria-label={`Assign "${task.text}"`}
                  data-ocid={`nso.task.edit.assign_select.${index + 1}`}
                >
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent
                  className="bg-popover text-popover-foreground"
                  data-ocid={`nso.task.edit.assign_menu.${index + 1}`}
                >
                  <SelectItem value="__none__">Unassigned</SelectItem>
                  {assignableUsers.map((u) => (
                    <SelectItem
                      key={u.principal}
                      value={u.principal}
                      data-ocid={`nso.task.edit.assign_option.${index + 1}`}
                    >
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Completion date */}
            <div className="grid gap-2">
              <Label
                htmlFor="nso-task-edit-date"
                className="font-heading uppercase text-xs tracking-wider"
              >
                Done
              </Label>
              <input
                id="nso-task-edit-date"
                type="date"
                value={completionDate ?? ""}
                onChange={handleDateChange}
                disabled={dateMutation.isPending}
                aria-label={`Completion date for "${task.text}"`}
                data-ocid={`nso.task.edit.date_input.${index + 1}`}
                className={cn(
                  "h-9 rounded-md border border-input bg-transparent px-3 py-1 font-body text-sm text-foreground",
                  "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                )}
              />
            </div>
          </div>

          {/* Reorder + delete row */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleReorder("up")}
                disabled={isFirst || reorderMutation.isPending}
                aria-label={`Move "${task.text}" up`}
                data-ocid={`nso.task.edit.move_up_button.${index + 1}`}
              >
                <ChevronUp className="size-4" />
                Up
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleReorder("down")}
                disabled={isLast || reorderMutation.isPending}
                aria-label={`Move "${task.text}" down`}
                data-ocid={`nso.task.edit.move_down_button.${index + 1}`}
              >
                <ChevronDown className="size-4" />
                Down
              </Button>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-primary hover:bg-primary/10 hover:text-primary"
              onClick={() => setConfirmDelete(true)}
              aria-label={`Delete "${task.text}"`}
              data-ocid={`nso.task.edit.delete_button.${index + 1}`}
            >
              <Trash2 className="size-4" />
              Delete
            </Button>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
              data-ocid={`nso.task.edit.cancel_button.${index + 1}`}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit || isSaving}
              data-ocid={`nso.task.edit.save_button.${index + 1}`}
            >
              {isSaving && <Loader2 className="animate-spin" />}
              Save changes
            </Button>
          </DialogFooter>
        </form>

        {/* Delete confirm — mounted only when requested */}
        {confirmDelete && (
          <AlertDialog
            open={confirmDelete}
            onOpenChange={(o) => !o && setConfirmDelete(false)}
          >
            <AlertDialogContent
              className="bg-card border-border"
              data-ocid={`nso.task.edit.delete_dialog.${index + 1}`}
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
                  data-ocid={`nso.task.edit.delete_dialog.cancel_button.${index + 1}`}
                >
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="bg-primary text-primary-foreground hover:bg-primary-hover"
                  data-ocid={`nso.task.edit.delete_dialog.confirm_button.${index + 1}`}
                >
                  {deleteMutation.isPending && (
                    <Loader2 className="animate-spin" />
                  )}
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </DialogContent>
    </Dialog>
  );
}
