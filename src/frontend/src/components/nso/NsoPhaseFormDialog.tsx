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
import { useCreateNsoPhase, useUpdateNsoPhase } from "@/hooks/useNso";
import type { NsoPhase } from "@/types/nso";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

/**
 * Add / edit dialog for an NSO phase.
 *
 * Single required field: phase name. On submit:
 *   - edit mode  → useUpdateNsoPhase({ id, name })
 *   - create mode → useCreateNsoPhase({ name })
 *
 * Mirrors CategoryFormDialog: Radix Dialog, dark Bubba's 33 theme, red
 * primary button, inline validation on blur. The hooks translate string
 * ids to bigint internally, so this component stays in string-land.
 */
export function NsoPhaseFormDialog({
  open,
  onOpenChange,
  phase,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided, the dialog runs in edit mode for this phase. */
  phase?: NsoPhase | null;
}) {
  const isEdit = !!phase;

  const [name, setName] = useState("");
  const [touched, setTouched] = useState(false);

  const createMutation = useCreateNsoPhase();
  const updateMutation = useUpdateNsoPhase();

  // Reset fields whenever the dialog opens or the target phase changes.
  useEffect(() => {
    if (open) {
      setName(phase?.name ?? "");
      setTouched(false);
    }
  }, [open, phase]);

  const nameError =
    touched && name.trim().length === 0 ? "Name is required" : null;
  const canSubmit = name.trim().length > 0;
  const isPending = createMutation.isPending || updateMutation.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!canSubmit) return;

    const trimmedName = name.trim();

    try {
      if (isEdit && phase) {
        await updateMutation.mutateAsync({ id: phase.id, name: trimmedName });
        toast.success("Phase updated");
      } else {
        await createMutation.mutateAsync({ name: trimmedName });
        toast.success("Phase created");
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(
        isEdit ? "Could not update phase" : "Could not create phase",
        {
          description: err instanceof Error ? err.message : undefined,
        },
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-card border-border"
        data-ocid="nso.phase.form.dialog"
      >
        <DialogHeader>
          <DialogTitle className="font-heading uppercase tracking-wide text-foreground">
            {isEdit ? "Edit phase" : "New phase"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Rename this opening phase."
              : "Add a phase to the New Store Opening tracker (e.g. Pre-Opening, Soft Opening)."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label
              htmlFor="nso-phase-name"
              className="font-heading uppercase text-xs tracking-wider"
            >
              Phase name
            </Label>
            <Input
              id="nso-phase-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="e.g. Pre-Opening"
              aria-invalid={!!nameError}
              aria-describedby={nameError ? "nso-phase-name-error" : undefined}
              data-ocid="nso.phase.form.name_input"
              autoComplete="off"
              maxLength={80}
            />
            {nameError && (
              <p
                id="nso-phase-name-error"
                className="text-xs text-primary font-body"
                data-ocid="nso.phase.form.name_input.field_error"
              >
                {nameError}
              </p>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              data-ocid="nso.phase.form.cancel_button"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit || isPending}
              data-ocid="nso.phase.form.save_button"
            >
              {isPending && <Loader2 className="animate-spin" />}
              {isEdit ? "Save changes" : "Create phase"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
