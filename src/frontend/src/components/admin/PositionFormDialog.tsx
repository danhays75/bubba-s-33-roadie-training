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
import { cn } from "@/lib/utils";
import type { LayoutStyle, Position } from "@/types/foundation";
import { Compass, LayoutGrid, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PhotoField } from "./PhotoField";

/**
 * Shared create/edit dialog for a Position.
 *
 * Fields: name (required), description (optional), cover photo URL (optional),
 * and layoutStyle (Library / Orientation, defaults to Library).
 * The cover photo is OPTIONAL — the save button is enabled as soon as a name
 * is entered. Never block saving on a missing photo.
 *
 * On submit:
 *   - create mode → useCreatePosition({ name, description, coverPhoto, layoutStyle })
 *   - edit mode   → useUpdatePosition({ id, name, description, coverPhoto, layoutStyle })
 *
 * The hooks translate ergonomic inputs to the backend's positional args +
 * bigint IDs + LayoutStyle enum internally, so this component stays in
 * string-land.
 */
const LAYOUT_OPTIONS: ReadonlyArray<{
  value: LayoutStyle;
  label: string;
  description: string;
  icon: typeof LayoutGrid;
}> = [
  {
    value: "library",
    label: "Library",
    description: "Search box + category tile grid",
    icon: LayoutGrid,
  },
  {
    value: "orientation",
    label: "Orientation",
    description: "Patriotic onboarding layout",
    icon: Compass,
  },
];

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
  const [layoutStyle, setLayoutStyle] = useState<LayoutStyle>("library");
  const [touched, setTouched] = useState(false);

  const createMutation = useCreatePosition();
  const updateMutation = useUpdatePosition();

  // Reset fields whenever the dialog opens or the target position changes.
  useEffect(() => {
    if (open) {
      setName(position?.name ?? "");
      setDescription(position?.description ?? "");
      setCoverPhoto(position?.coverPhoto ?? "");
      setLayoutStyle(position?.layoutStyle ?? "library");
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
          layoutStyle,
        });
        toast.success("Position updated");
      } else {
        await createMutation.mutateAsync({
          name: trimmedName,
          description: trimmedDesc,
          coverPhoto: trimmedPhoto.length > 0 ? trimmedPhoto : undefined,
          layoutStyle,
        });
        toast.success("Position created");
      }
      onOpenChange(false);
    } catch (err) {
      console.error(
        isEdit ? "Failed to update position" : "Failed to create position",
        err,
      );
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

          {/* Cover photo — optional (upload or URL) */}
          <div className="grid gap-2">
            <PhotoField
              id="position-cover"
              label="Cover photo"
              value={coverPhoto}
              onChange={(v) => setCoverPhoto(v ?? "")}
            />
          </div>

          {/* Layout style — Library (default) / Orientation */}
          <div className="grid gap-2">
            <Label
              className="font-heading uppercase text-xs tracking-wider"
              data-ocid="position.layout_style.label"
            >
              Layout
            </Label>
            <div
              aria-label="Position layout"
              className="grid grid-cols-2 gap-2"
              data-ocid="position.layout_style.toggle"
            >
              {LAYOUT_OPTIONS.map((opt) => {
                const selected = layoutStyle === opt.value;
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setLayoutStyle(opt.value)}
                    data-ocid={`position.layout_style.${opt.value}.toggle`}
                    className={cn(
                      "flex items-start gap-2.5 rounded-md border p-3 text-left transition-smooth",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      selected
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground",
                    )}
                  >
                    <Icon
                      className={cn(
                        "mt-0.5 size-4 shrink-0",
                        selected ? "text-primary" : "text-muted-foreground",
                      )}
                      aria-hidden="true"
                    />
                    <span className="grid gap-0.5">
                      <span className="font-heading text-xs uppercase tracking-wider">
                        {opt.label}
                      </span>
                      <span className="font-body text-xs normal-case text-muted-foreground">
                        {opt.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
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
