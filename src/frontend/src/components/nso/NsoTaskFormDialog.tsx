import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { useCreateNsoTask, useUpdateNsoTask } from "@/hooks/useNso";
import type { NsoTask } from "@/types/nso";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

/**
 * Add / edit dialog for an NSO task.
 *
 * Fields: text (required), section (optional), notes (optional).
 * On submit:
 *   - edit mode  → useUpdateNsoTask({ id, phaseId, text, section, done,
 *                                     assignedTo, completionDate, notes })
 *   - create mode → useCreateNsoTask({ phaseId, text, section, assignedTo: null })
 *
 * Mirrors CategoryFormDialog: Radix Dialog, dark Bubba's 33 theme, red
 * primary button, inline validation on blur. The hooks translate string
 * ids to bigint internally, so this component stays in string-land.
 */
export function NsoTaskFormDialog({
  open,
  onOpenChange,
  phaseId,
  task,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phaseId: string;
  /** When provided, the dialog runs in edit mode for this task. */
  task?: NsoTask | null;
}) {
  const isEdit = !!task;

  const [text, setText] = useState("");
  const [section, setSection] = useState("");
  const [notes, setNotes] = useState("");
  const [touched, setTouched] = useState(false);

  const createMutation = useCreateNsoTask();
  const updateMutation = useUpdateNsoTask();

  // Reset fields whenever the dialog opens or the target task changes.
  useEffect(() => {
    if (open) {
      setText(task?.text ?? "");
      setSection(task?.section ?? "");
      setNotes(task?.notes ?? "");
      setTouched(false);
    }
  }, [open, task]);

  const textError =
    touched && text.trim().length === 0 ? "Task text is required" : null;
  const canSubmit = text.trim().length > 0;
  const isPending = createMutation.isPending || updateMutation.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!canSubmit) return;

    const trimmedText = text.trim();
    const trimmedSection = section.trim();
    const trimmedNotes = notes.trim();

    try {
      if (isEdit && task) {
        await updateMutation.mutateAsync({
          id: task.id,
          phaseId: task.phaseId,
          text: trimmedText,
          section: trimmedSection.length > 0 ? trimmedSection : null,
          done: task.done,
          assignedTo: task.assignedTo,
          completionDate: task.completionDate,
          notes: trimmedNotes.length > 0 ? trimmedNotes : null,
        });
        toast.success("Task updated");
      } else {
        await createMutation.mutateAsync({
          phaseId,
          text: trimmedText,
          section: trimmedSection.length > 0 ? trimmedSection : null,
          assignedTo: null,
        });
        toast.success("Task added");
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(isEdit ? "Could not update task" : "Could not add task", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-card border-border sm:max-w-xl"
        data-ocid="nso.task.form.dialog"
      >
        <DialogHeader>
          <DialogTitle className="font-heading uppercase tracking-wide text-foreground">
            {isEdit ? "Edit task" : "New task"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the task text, section grouping, or notes."
              : "Add a task to this phase. Section and notes are optional."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          {/* Task text — required */}
          <div className="grid gap-2">
            <Label
              htmlFor="nso-task-text"
              className="font-heading uppercase text-xs tracking-wider"
            >
              Task
            </Label>
            <Textarea
              id="nso-task-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="e.g. Confirm final staff schedule"
              aria-invalid={!!textError}
              aria-describedby={textError ? "nso-task-text-error" : undefined}
              data-ocid="nso.task.form.text_input"
              autoComplete="off"
              maxLength={400}
            />
            {textError && (
              <p
                id="nso-task-text-error"
                className="text-xs text-primary font-body"
                data-ocid="nso.task.form.text_input.field_error"
              >
                {textError}
              </p>
            )}
          </div>

          {/* Section — optional */}
          <div className="grid gap-2">
            <Label
              htmlFor="nso-task-section"
              className="font-heading uppercase text-xs tracking-wider"
            >
              Section <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="nso-task-section"
              value={section}
              onChange={(e) => setSection(e.target.value)}
              placeholder="e.g. Staffing"
              data-ocid="nso.task.form.section_input"
              autoComplete="off"
              maxLength={60}
            />
            <p className="font-body text-xs text-muted-foreground">
              Tasks sharing a section name are grouped together under that
              header. Leave blank for an unlabeled group.
            </p>
          </div>

          {/* Notes — optional */}
          <div className="grid gap-2">
            <Label
              htmlFor="nso-task-notes"
              className="font-heading uppercase text-xs tracking-wider"
            >
              Notes <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="nso-task-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any extra context for whoever picks up this task."
              data-ocid="nso.task.form.notes_input"
              autoComplete="off"
              maxLength={1000}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              data-ocid="nso.task.form.cancel_button"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit || isPending}
              data-ocid="nso.task.form.save_button"
            >
              {isPending && <Loader2 className="animate-spin" />}
              {isEdit ? "Save changes" : "Add task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
