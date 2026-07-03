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
import { useCreateCategory, useUpdateCategory } from "@/hooks/useLibrary";
import type { Category } from "@/types/foundation";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PhotoField } from "../PhotoField";

/**
 * Shared create/edit dialog for a Library Category.
 *
 * Fields: name (required), cover photo URL (optional). The cover photo is
 * OPTIONAL — the save button is enabled as soon as a name is entered. Never
 * block saving on a missing photo.
 *
 * On submit:
 *   - create mode → useCreateCategory({ positionId, name, coverPhoto })
 *   - edit mode   → useUpdateCategory({ categoryId, positionId, name, coverPhoto })
 *
 * Mirrors the PositionFormDialog pattern: radix-ui Dialog, react state,
 * dark theme, red primary button. The hooks translate string ids to bigint
 * internally, so this component stays in string-land.
 */
export function CategoryFormDialog({
  open,
  onOpenChange,
  positionId,
  category,
  mode,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  positionId: string;
  category?: Category | null;
  mode: "create" | "edit";
}) {
  const isEdit = mode === "edit";

  const [name, setName] = useState("");
  const [coverPhoto, setCoverPhoto] = useState("");
  const [touched, setTouched] = useState(false);

  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();

  // Reset fields whenever the dialog opens or the target category changes.
  useEffect(() => {
    if (open) {
      setName(category?.name ?? "");
      setCoverPhoto(category?.coverPhoto ?? "");
      setTouched(false);
    }
  }, [open, category]);

  const nameError =
    touched && name.trim().length === 0 ? "Name is required" : null;
  const canSubmit = name.trim().length > 0;
  const isPending = createMutation.isPending || updateMutation.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!canSubmit) return;

    const trimmedName = name.trim();
    const trimmedPhoto = coverPhoto.trim();

    try {
      if (isEdit && category) {
        await updateMutation.mutateAsync({
          categoryId: category.id,
          positionId,
          name: trimmedName,
          coverPhoto: trimmedPhoto.length > 0 ? trimmedPhoto : null,
        });
        toast.success("Category updated");
      } else {
        await createMutation.mutateAsync({
          positionId,
          name: trimmedName,
          coverPhoto: trimmedPhoto.length > 0 ? trimmedPhoto : null,
        });
        toast.success("Category created");
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(
        isEdit ? "Could not update category" : "Could not create category",
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
        data-ocid="library.admin.category.form.dialog"
      >
        <DialogHeader>
          <DialogTitle className="font-heading uppercase tracking-wide text-foreground">
            {isEdit ? "Edit category" : "New category"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the category details. Cover photo is optional."
              : "Add a category to this position's library. Cover photo is optional."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          {/* Name — required */}
          <div className="grid gap-2">
            <Label
              htmlFor="category-name"
              className="font-heading uppercase text-xs tracking-wider"
            >
              Name
            </Label>
            <Input
              id="category-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="e.g. Cocktails"
              aria-invalid={!!nameError}
              aria-describedby={nameError ? "category-name-error" : undefined}
              data-ocid="library.admin.category.form.name_input"
              autoComplete="off"
              maxLength={80}
            />
            {nameError && (
              <p
                id="category-name-error"
                className="text-xs text-primary font-body"
                data-ocid="library.admin.category.form.name_input.field_error"
              >
                {nameError}
              </p>
            )}
          </div>

          {/* Cover photo — optional, either/or upload or URL */}
          <PhotoField
            id="category-cover"
            label="Cover photo"
            value={coverPhoto}
            onChange={(v) => setCoverPhoto(v ?? "")}
          />

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              data-ocid="library.admin.category.form.cancel_button"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit || isPending}
              data-ocid="library.admin.category.form.save_button"
            >
              {isPending && <Loader2 className="animate-spin" />}
              {isEdit ? "Save changes" : "Create category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
