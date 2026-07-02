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
import { useCreatePosition, useUpdatePosition } from "@/hooks/useAllPositions";
import type { Position } from "@/types/foundation";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

/**
 * Shared create/edit dialog for a Position.
 *
 * Fields: name (required), description (optional), cover photo URL (optional).
 * The cover photo is OPTIONAL — the save button is enabled as soon as a name
 * is entered. Never block saving on a missing photo.
 *
 * On submit:
 *   - create mode → useCreatePosition({ name, description, coverPhoto })
 *   - edit mode   → useUpdatePosition({ id, name, description, coverPhoto })
 *
 * The hooks translate ergonomic inputs to the backend's positional args +
 * bigint IDs internally, so this component stays in string-land.
 */
export function PositionFormDialog({
  open,
  onOpenChange,
  position,
  mode,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  position?: Position | null;
  mode: "create" | "edit";
}) {
  const isEdit = mode === "edit";

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [coverPhoto, setCoverPhoto] = useState("");
  const [touched, setTouched] = useState(false);

  const createMutation = useCreatePosition();
  const updateMutation = useUpdatePosition();

  // Reset fields whenever the dialog opens or the target position changes.
  useEffect(() => {
    if (open) {
      setName(position?.name ?? "");
      setDescription(position?.description ?? "");
      setCoverPhoto(position?.coverPhoto ?? "");
      setTouched(false);
    }
  }, [open, position]);

  const nameError =
    touched && name.trim().length === 0 ? "Name is required" : null;
  const canSubmit = name.trim().length > 0;
  const isPending = createMutation.isPending || updateMutation.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!canSubmit) return;

    const trimmedName = name.trim();
    const trimmedDesc = description.trim();
    const trimmedPhoto = coverPhoto.trim();

    try {
      if (isEdit && position) {
        await updateMutation.mutateAsync({
          id: position.id,
          name: trimmedName,
          description: trimmedDesc,
          coverPhoto: trimmedPhoto.length > 0 ? trimmedPhoto : undefined,
        });
        toast.success("Position updated");
      } else {
        await createMutation.mutateAsync({
          name: trimmedName,
          description: trimmedDesc,
          coverPhoto: trimmedPhoto.length > 0 ? trimmedPhoto : undefined,
        });
        toast.success("Position created");
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(
        isEdit ? "Could not update position" : "Could not create position",
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
        data-ocid="position.form_dialog"
      >
        <DialogHeader>
          <DialogTitle className="font-heading uppercase tracking-wide text-foreground">
            {isEdit ? "Edit position" : "New position"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the position details. Cover photo is optional."
              : "Add a training position to the floor. Cover photo is optional."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          {/* Name — required */}
          <div className="grid gap-2">
            <Label
              htmlFor="position-name"
              className="font-heading uppercase text-xs tracking-wider"
            >
              Name
            </Label>
            <Input
              id="position-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="e.g. Line Cook"
              aria-invalid={!!nameError}
              aria-describedby={nameError ? "position-name-error" : undefined}
              data-ocid="position.name_input"
              autoComplete="off"
              maxLength={80}
            />
            {nameError && (
              <p
                id="position-name-error"
                className="text-xs text-primary font-body"
                data-ocid="position.name_input.field_error"
              >
                {nameError}
              </p>
            )}
          </div>

          {/* Description — optional */}
          <div className="grid gap-2">
            <Label
              htmlFor="position-description"
              className="font-heading uppercase text-xs tracking-wider"
            >
              Description{" "}
              <span className="text-muted-foreground normal-case">
                (optional)
              </span>
            </Label>
            <Textarea
              id="position-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this role covers on the floor…"
              data-ocid="position.description_input"
              maxLength={500}
              rows={4}
            />
          </div>

          {/* Cover photo — optional URL */}
          <div className="grid gap-2">
            <Label
              htmlFor="position-cover"
              className="font-heading uppercase text-xs tracking-wider"
            >
              Cover photo URL{" "}
              <span className="text-muted-foreground normal-case">
                (optional)
              </span>
            </Label>
            <Input
              id="position-cover"
              value={coverPhoto}
              onChange={(e) => setCoverPhoto(e.target.value)}
              placeholder="https://…"
              data-ocid="position.cover_photo_input"
              autoComplete="off"
              type="url"
            />
            <p className="text-xs text-muted-foreground font-body">
              Paste an image URL. You can save without a photo.
            </p>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              data-ocid="position.cancel_button"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit || isPending}
              data-ocid="position.save_button"
            >
              {isPending && <Loader2 className="animate-spin" />}
              {isEdit ? "Save changes" : "Create position"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
