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
import { Check, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PhotoField } from "../PhotoField";

/**
 * The neutral brand default shown when a category has no accentColor. Mirrors
 * the `--category-accent` CSS default in index.css (navy #0A2A5E). Used as the
 * visual baseline for the native color input and the live preview swatch when
 * accentColor is null — picking a value from the native input sets accentColor
 * to the chosen hex, but the baseline itself never auto-sets accentColor.
 */
const DEFAULT_ACCENT = "#0A2A5E";

/**
 * The seven preset brand swatches. Clicking a swatch sets accentColor to that
 * hex. Order matches the brand-board reading order (purple → teal).
 */
const PRESET_SWATCHES: ReadonlyArray<{ name: string; hex: string }> = [
  { name: "Purple", hex: "#521A5E" },
  { name: "Brown", hex: "#8C5421" },
  { name: "Navy", hex: "#0A2A5E" },
  { name: "Red", hex: "#E4002B" },
  { name: "Gold", hex: "#F2A900" },
  { name: "Green", hex: "#2E6B3E" },
  { name: "Teal", hex: "#146C7A" },
];

/**
 * Shared create/edit dialog for a Library Category.
 *
 * Fields: name (required), cover photo URL (optional), accent color (optional).
 * The cover photo and accent color are OPTIONAL — the save button is enabled as
 * soon as a name is entered. Never block saving on a missing photo or accent.
 *
 * On submit:
 *   - create mode → useCreateCategory({ positionId, name, coverPhoto, accentColor })
 *   - edit mode   → useUpdateCategory({ categoryId, positionId, name, coverPhoto, accentColor })
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
  // accentColor is a hex string like "#8C5421", or null for the navy default.
  // Initialized from the existing category in edit mode; null in create mode.
  const [accentColor, setAccentColor] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();

  // Reset fields whenever the dialog opens or the target category changes.
  useEffect(() => {
    if (open) {
      setName(category?.name ?? "");
      setCoverPhoto(category?.coverPhoto ?? "");
      setAccentColor(category?.accentColor ?? null);
      setTouched(false);
    }
  }, [open, category]);

  const nameError =
    touched && name.trim().length === 0 ? "Name is required" : null;
  const canSubmit = name.trim().length > 0;
  const isPending = createMutation.isPending || updateMutation.isPending;

  // The native color input cannot represent null. When accentColor is null we
  // show the navy default as a visual baseline WITHOUT setting accentColor —
  // the user must actively pick a color for accentColor to become non-null.
  const nativeColorValue = accentColor ?? DEFAULT_ACCENT;
  // The live preview swatch reflects the current accentColor, or the navy
  // default when accentColor is null (labeled to indicate it is the default).
  const previewColor = accentColor ?? DEFAULT_ACCENT;
  const isDefault = accentColor === null;

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
          accentColor,
        });
        toast.success("Category updated");
      } else {
        await createMutation.mutateAsync({
          positionId,
          name: trimmedName,
          coverPhoto: trimmedPhoto.length > 0 ? trimmedPhoto : null,
          accentColor,
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

          {/* Accent color — optional. Preset swatches + native picker + live
              preview + Default/clear option. Placed after the cover photo and
              before the save button. */}
          <div
            className="grid gap-2"
            data-ocid="library.admin.category.form.accent.section"
          >
            <div className="flex items-baseline justify-between">
              <Label
                htmlFor="category-accent-custom"
                className="font-heading uppercase text-xs tracking-wider"
              >
                Accent color
              </Label>
              <span className="font-body text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Optional
              </span>
            </div>

            {/* (a) Row of seven preset brand swatches. Clicking a swatch sets
                accentColor to that hex. The selected swatch shows a ring +
                check indicator. */}
            <fieldset
              aria-label="Preset brand accent colors"
              className="flex flex-wrap gap-2 border-0 p-0 m-0"
              data-ocid="library.admin.category.form.accent.swatches"
            >
              {PRESET_SWATCHES.map((swatch) => {
                const selected =
                  accentColor !== null &&
                  accentColor.toLowerCase() === swatch.hex.toLowerCase();
                return (
                  <button
                    key={swatch.hex}
                    type="button"
                    onClick={() => setAccentColor(swatch.hex)}
                    aria-pressed={selected}
                    aria-label={`${swatch.name} accent${selected ? " (selected)" : ""}`}
                    data-ocid={`library.admin.category.form.accent.swatch.${swatch.name.toLowerCase()}`}
                    className={[
                      "relative h-9 w-9 rounded-[4px] border transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                      selected
                        ? "border-foreground ring-2 ring-foreground ring-offset-2 ring-offset-card"
                        : "border-border hover:border-foreground/40",
                    ].join(" ")}
                    style={{ backgroundColor: swatch.hex }}
                  >
                    {selected && (
                      <Check
                        className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                );
              })}
            </fieldset>

            {/* (b) Native custom color input. Synced with accentColor — when
                accentColor is null the input shows the navy default as a
                visual baseline but does NOT set accentColor until the user
                picks. Changing the input sets accentColor to the chosen hex. */}
            <div className="flex items-center gap-3">
              <Input
                id="category-accent-custom"
                type="color"
                value={nativeColorValue}
                onChange={(e) => setAccentColor(e.target.value)}
                aria-label="Custom accent color"
                data-ocid="library.admin.category.form.accent.custom_input"
                className="h-9 w-14 cursor-pointer border-border bg-card p-1"
              />
              <span className="font-body text-xs text-muted-foreground">
                Pick a custom color
              </span>
            </div>

            {/* (c) Live preview swatch + (d) Default/clear option. The preview
                reflects accentColor, or the navy default when null (labeled to
                indicate it is the default). The Default button clears
                accentColor back to null. */}
            <div className="flex items-center gap-3">
              <div
                className="h-9 w-9 rounded-[4px] border border-border"
                style={{ backgroundColor: previewColor }}
                aria-hidden="true"
                data-ocid="library.admin.category.form.accent.preview"
              />
              <div className="flex flex-col gap-0.5">
                <span className="font-body text-xs text-foreground">
                  {isDefault ? "Default" : "Custom"}
                </span>
                <span className="font-body text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  {isDefault
                    ? "Navy brand default"
                    : previewColor.toUpperCase()}
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAccentColor(null)}
                disabled={isDefault || isPending}
                aria-label="Reset accent color to default"
                data-ocid="library.admin.category.form.accent.default_button"
                className="ml-auto font-display text-[11px] uppercase tracking-[0.16em]"
              >
                Default
              </Button>
            </div>
          </div>

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
