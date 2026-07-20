import {
  DEFAULT_DRINKS_BUILDER_SETTINGS,
  DrinksBuilderSettingsForm,
} from "@/components/legendary/drinks-builder/DrinksBuilderSettingsForm";
import type { DrinksBuilderSettings } from "@/components/legendary/drinks-builder/types";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useUpdateLegendaryActivity } from "@/hooks/useLegendary";
import { useCategoriesByPosition } from "@/hooks/useLibrary";
import { cn } from "@/lib/utils";
import type {
  LegendaryActivity,
  LegendaryActivityType,
} from "@/types/legendary";
import { Brain, Layers, Loader2, Pencil, Save, Wine } from "lucide-react";
import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import { toast } from "sonner";

/**
 * ActivityEditorDialog — admin-only modal for EDITING an existing Be Legendary
 * activity's name and source categories.
 *
 * Reuses the ActivityBuilderDialog shape (name input + category checkboxes)
 * but is prefilled with the activity's current values. The activity type
 * selector is rendered as a DISABLED/readonly indicator — type is fixed at
 * build time and cannot change. On save it calls useUpdateLegendaryActivity
 * with { id, name, sourceCategoryIds } (plus positionId for cache
 * invalidation).
 *
 * Validation: name non-empty, >=1 category selected before Save is enabled.
 *
 * Styled with the dark roadhouse theme + gold accents (the Be Legendary
 * gradient/glow zone). Mobile-first.
 */
interface ActivityEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  positionId: string;
  /** The activity to edit. When null (closed), state is held but unused. */
  activity: LegendaryActivity | null;
}

export function ActivityEditorDialog({
  open,
  onOpenChange,
  positionId,
  activity,
}: ActivityEditorDialogProps): ReactElement {
  const categoriesQuery = useCategoriesByPosition(positionId);
  const updateMutation = useUpdateLegendaryActivity();

  const [name, setName] = useState("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [drinksBuilderSettings, setDrinksBuilderSettings] =
    useState<DrinksBuilderSettings>(DEFAULT_DRINKS_BUILDER_SETTINGS);
  const [error, setError] = useState<string | null>(null);

  // Prefill from the activity whenever the dialog opens (or the target
  // changes while open). The activity type is read-only and comes straight
  // from the activity — no local state for it. For drinksBuilder activities,
  // prefill the settings from the activity's content so the admin can edit
  // them in place.
  useEffect(() => {
    if (open && activity) {
      setName(activity.name);
      setSelectedCategoryIds([...activity.sourceCategoryIds]);
      setDrinksBuilderSettings(
        activity.activityType === "drinksBuilder" &&
          activity.content.kind === "drinksBuilderContent"
          ? activity.content.settings
          : DEFAULT_DRINKS_BUILDER_SETTINGS,
      );
      setError(null);
    }
  }, [open, activity]);

  const categories = categoriesQuery.data ?? [];
  const trimmedName = name.trim();
  const canSubmit =
    trimmedName.length > 0 &&
    selectedCategoryIds.length > 0 &&
    !updateMutation.isPending;

  function toggleCategory(categoryId: string) {
    setSelectedCategoryIds((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId],
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!activity) return;
    setError(null);

    try {
      await updateMutation.mutateAsync({
        id: activity.id,
        positionId,
        name: trimmedName,
        sourceCategoryIds: selectedCategoryIds,
        content:
          activity.activityType === "drinksBuilder"
            ? {
                kind: "drinksBuilderContent",
                settings: drinksBuilderSettings,
              }
            : undefined,
      });
      toast.success("Activity updated", {
        description: `"${trimmedName}" was saved.`,
      });
      onOpenChange(false);
    } catch (err) {
      const description = err instanceof Error ? err.message : undefined;
      setError(description ?? "Could not update the activity.");
      toast.error("Could not update activity", { description });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-card border-border sm:max-w-lg"
        data-ocid="legendary.editor.dialog"
      >
        <DialogHeader>
          <DialogTitle
            className="font-display text-2xl uppercase tracking-wide text-foreground"
            data-ocid="legendary.editor.dialog.title"
          >
            <Pencil className="inline size-6 align-text-bottom text-primary" />{" "}
            Edit Activity
          </DialogTitle>
          <DialogDescription>
            Update the name or source categories. The activity type is fixed at
            build time and cannot change.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="flex min-h-0 flex-col gap-5">
          <div className="min-h-0 -mr-2 overflow-y-auto pr-2">
            <div className="grid gap-5">
              {/* Activity name */}
              <div className="grid gap-2">
                <Label
                  htmlFor="legendary-activity-edit-name"
                  className="font-heading uppercase text-xs tracking-wider text-foreground"
                >
                  Activity name
                </Label>
                <Input
                  id="legendary-activity-edit-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Menu Knowledge Quiz"
                  autoComplete="off"
                  maxLength={80}
                  disabled={updateMutation.isPending}
                  data-ocid="legendary.editor.dialog.name_input"
                />
              </div>

              {/* Activity type — DISABLED/readonly indicator */}
              <div className="grid gap-2">
                <Label className="font-heading uppercase text-xs tracking-wider text-foreground">
                  Activity type
                </Label>
                <div
                  className="grid grid-cols-2 gap-2 sm:grid-cols-3"
                  role="radiogroup"
                  aria-label="Activity type (read-only)"
                  aria-readonly="true"
                  data-ocid="legendary.editor.dialog.type.toggle"
                >
                  <ReadOnlyActivityTypeOption
                    value="quiz"
                    label="Quiz"
                    description="Multiple choice questions"
                    icon={<Brain className="size-5" />}
                    selected={activity?.activityType === "quiz"}
                  />
                  <ReadOnlyActivityTypeOption
                    value="flashcards"
                    label="Flashcards"
                    description="Flip cards to study"
                    icon={<Layers className="size-5" />}
                    selected={activity?.activityType === "flashcards"}
                  />
                  <ReadOnlyActivityTypeOption
                    value="drinksBuilder"
                    label="Drinks Builder"
                    description="Build drinks by tapping glassware, specs, assembly, and garnish"
                    icon={<Wine className="size-5" />}
                    selected={activity?.activityType === "drinksBuilder"}
                  />
                </div>
              </div>

              {/* Drinks Builder settings — only when the activity is a
                  drinksBuilder. Prefilled from the activity's content so the
                  admin can edit the tap-based game settings in place. */}
              {activity?.activityType === "drinksBuilder" && (
                <div className="grid gap-2">
                  <Label className="font-heading uppercase text-xs tracking-wider text-foreground">
                    Drinks Builder settings
                  </Label>
                  <p className="font-body text-xs text-muted-foreground">
                    Configure the tap-based drink construction game. Source
                    categories above seed the global decoy pool.
                  </p>
                  <DrinksBuilderSettingsForm
                    value={drinksBuilderSettings}
                    onChange={setDrinksBuilderSettings}
                    categories={categories.map((c) => ({
                      id: c.id,
                      name: c.name,
                    }))}
                    disabled={updateMutation.isPending}
                  />
                </div>
              )}

              {/* Category selection */}
              <div className="grid gap-2">
                <Label className="font-heading uppercase text-xs tracking-wider text-foreground">
                  Source categories
                </Label>
                <p className="font-body text-xs text-muted-foreground">
                  Items from these categories generate the activity content.
                </p>
                {categoriesQuery.isLoading ? (
                  <CategoryListSkeleton />
                ) : categories.length === 0 ? (
                  <div
                    className="rounded-md border border-dashed border-border bg-library-card px-4 py-6 text-center"
                    data-ocid="legendary.editor.dialog.categories.empty_state"
                  >
                    <p className="font-body text-sm text-muted-foreground">
                      No categories exist for this position yet. Add library
                      categories first.
                    </p>
                  </div>
                ) : (
                  <ul
                    className="max-h-[40vh] grid gap-1.5 overflow-y-auto pr-1"
                    data-ocid="legendary.editor.dialog.categories.list"
                  >
                    {categories.map((category, index) => {
                      const checked = selectedCategoryIds.includes(category.id);
                      return (
                        <li key={category.id}>
                          <label
                            htmlFor={`legendary-edit-cat-${category.id}`}
                            className={cn(
                              "flex items-center gap-3 rounded-md border px-3 py-2.5 cursor-pointer transition-colors",
                              checked
                                ? "border-primary/60 bg-primary/10"
                                : "border-border bg-library-card hover:bg-muted/40",
                            )}
                          >
                            <Checkbox
                              id={`legendary-edit-cat-${category.id}`}
                              checked={checked}
                              onCheckedChange={() =>
                                toggleCategory(category.id)
                              }
                              disabled={updateMutation.isPending}
                              data-ocid={`legendary.editor.dialog.categories.item.${index + 1}`}
                            />
                            <span className="flex min-w-0 flex-1 flex-col">
                              <span className="truncate font-heading text-sm uppercase tracking-wide text-foreground">
                                {category.name}
                              </span>
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Inline error */}
              {error && (
                <p
                  className="text-xs text-primary font-body"
                  data-ocid="legendary.editor.dialog.error_state"
                  role="alert"
                >
                  {error}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateMutation.isPending}
              data-ocid="legendary.editor.dialog.cancel_button"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit}
              data-ocid="legendary.editor.dialog.submit_button"
            >
              {updateMutation.isPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------- Sub-components ------------------------------ */

/**
 * Read-only version of the ActivityTypeOption from the builder. Renders the
 * same visual shape but is non-interactive (no onClick, aria-readonly,
 * cursor-not-allowed) so the admin can see the locked-in type without being
 * able to change it.
 */
function ReadOnlyActivityTypeOption({
  value,
  label,
  description,
  icon,
  selected,
}: {
  value: LegendaryActivityType;
  label: string;
  description: string;
  icon: ReactElement;
  selected: boolean;
}): ReactElement {
  return (
    <div
      aria-label={`${label} — ${description}${selected ? " (selected)" : ""}`}
      data-ocid={`legendary.editor.dialog.type.${value}.radio`}
      className={cn(
        "flex flex-col items-start gap-1 rounded-md border px-3 py-3 text-left",
        selected
          ? "border-primary bg-primary/10 text-foreground"
          : "border-border bg-library-card text-foreground",
        "cursor-not-allowed opacity-70",
      )}
    >
      <span className="flex items-center gap-2 text-primary">
        {icon}
        <span className="font-heading text-sm uppercase tracking-wide">
          {label}
        </span>
      </span>
      <span className="font-body text-xs text-muted-foreground">
        {description}
      </span>
    </div>
  );
}

function CategoryListSkeleton(): ReactElement {
  return (
    <div
      className="grid gap-1.5"
      data-ocid="legendary.editor.dialog.categories.loading_state"
      aria-hidden
    >
      {["s1", "s2", "s3"].map((k) => (
        <Skeleton key={k} className="h-12 w-full rounded-md" />
      ))}
    </div>
  );
}

export default ActivityEditorDialog;
