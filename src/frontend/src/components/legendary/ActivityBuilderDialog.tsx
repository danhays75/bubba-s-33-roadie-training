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
import { useBuildLegendaryActivity } from "@/hooks/useLegendary";
import { useCategoriesByPosition } from "@/hooks/useLibrary";
import { cn } from "@/lib/utils";
import type { LegendaryActivityType } from "@/types/legendary";
import { Brain, Layers, Loader2, Sparkles, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import { toast } from "sonner";

/**
 * ActivityBuilderDialog — admin-only modal for building a new Be Legendary
 * activity (quiz or flashcards) from a position's library categories.
 *
 * Fetches the position's categories via useCategoriesByPosition and shows
 * them as selectable checkboxes. The admin enters an activity name, picks
 * the activity type (quiz or flashcards) via a radio-style toggle, and
 * clicks Build. On success the dialog closes and the activity list
 * auto-refreshes (the build hook invalidates ["legendary-activities",
 * positionId]).
 *
 * Validation: at least 1 category selected, name not empty, type selected
 * before the Build button is enabled.
 *
 * Styled with the dark roadhouse theme + gold accents (the Be Legendary
 * gradient/glow zone). Mobile-first.
 */
interface ActivityBuilderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  positionId: string;
}

export function ActivityBuilderDialog({
  open,
  onOpenChange,
  positionId,
}: ActivityBuilderDialogProps): ReactElement {
  const categoriesQuery = useCategoriesByPosition(positionId);
  const buildMutation = useBuildLegendaryActivity();

  const [name, setName] = useState("");
  const [activityType, setActivityType] =
    useState<LegendaryActivityType | null>(null);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Reset all form state whenever the dialog opens.
  useEffect(() => {
    if (open) {
      setName("");
      setActivityType(null);
      setSelectedCategoryIds([]);
      setError(null);
    }
  }, [open]);

  const categories = categoriesQuery.data ?? [];
  const trimmedName = name.trim();
  const canSubmit =
    trimmedName.length > 0 &&
    activityType !== null &&
    selectedCategoryIds.length > 0 &&
    !buildMutation.isPending;

  function toggleCategory(categoryId: string) {
    setSelectedCategoryIds((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId],
    );
  }

  async function handleBuild(e: React.FormEvent) {
    e.preventDefault();
    if (activityType === null) return;
    setError(null);

    try {
      await buildMutation.mutateAsync({
        positionId,
        activityType,
        name: trimmedName,
        sourceCategoryIds: selectedCategoryIds,
      });
      toast.success("Activity built", {
        description: `"${trimmedName}" is now available for all staff.`,
      });
      onOpenChange(false);
    } catch (err) {
      const description = err instanceof Error ? err.message : undefined;
      setError(description ?? "Could not build the activity.");
      toast.error("Could not build activity", { description });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-card border-border sm:max-w-lg"
        data-ocid="legendary.builder.dialog"
      >
        <DialogHeader>
          <DialogTitle
            className="font-display text-2xl uppercase tracking-wide text-foreground"
            data-ocid="legendary.builder.dialog.title"
          >
            <Sparkles className="inline size-6 align-text-bottom text-primary" />{" "}
            Build Activity
          </DialogTitle>
          <DialogDescription>
            Pick library categories, choose a format, and generate a practice
            activity for this position. Available to all staff instantly.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleBuild} className="grid gap-5">
          {/* Activity name */}
          <div className="grid gap-2">
            <Label
              htmlFor="legendary-activity-name"
              className="font-heading uppercase text-xs tracking-wider text-foreground"
            >
              Activity name
            </Label>
            <Input
              id="legendary-activity-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Menu Knowledge Quiz"
              autoComplete="off"
              maxLength={80}
              disabled={buildMutation.isPending}
              data-ocid="legendary.builder.dialog.name_input"
            />
          </div>

          {/* Activity type selector */}
          <div className="grid gap-2">
            <Label className="font-heading uppercase text-xs tracking-wider text-foreground">
              Activity type
            </Label>
            <div
              className="grid grid-cols-2 gap-2"
              role="radiogroup"
              aria-label="Activity type"
              data-ocid="legendary.builder.dialog.type.toggle"
            >
              <ActivityTypeOption
                value="quiz"
                label="Quiz"
                description="Multiple choice questions"
                icon={<Brain className="size-5" />}
                selected={activityType === "quiz"}
                onSelect={() => setActivityType("quiz")}
                disabled={buildMutation.isPending}
              />
              <ActivityTypeOption
                value="flashcards"
                label="Flashcards"
                description="Flip cards to study"
                icon={<Layers className="size-5" />}
                selected={activityType === "flashcards"}
                onSelect={() => setActivityType("flashcards")}
                disabled={buildMutation.isPending}
              />
            </div>
          </div>

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
                data-ocid="legendary.builder.dialog.categories.empty_state"
              >
                <p className="font-body text-sm text-muted-foreground">
                  No categories exist for this position yet. Add library
                  categories first.
                </p>
              </div>
            ) : (
              <ul
                className="max-h-[40vh] grid gap-1.5 overflow-y-auto pr-1"
                data-ocid="legendary.builder.dialog.categories.list"
              >
                {categories.map((category, index) => {
                  const checked = selectedCategoryIds.includes(category.id);
                  return (
                    <li key={category.id}>
                      <label
                        htmlFor={`legendary-cat-${category.id}`}
                        className={cn(
                          "flex items-center gap-3 rounded-md border px-3 py-2.5 cursor-pointer transition-colors",
                          checked
                            ? "border-primary/60 bg-primary/10"
                            : "border-border bg-library-card hover:bg-muted/40",
                        )}
                      >
                        <Checkbox
                          id={`legendary-cat-${category.id}`}
                          checked={checked}
                          onCheckedChange={() => toggleCategory(category.id)}
                          disabled={buildMutation.isPending}
                          data-ocid={`legendary.builder.dialog.categories.item.${index + 1}`}
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
              data-ocid="legendary.builder.dialog.error_state"
              role="alert"
            >
              {error}
            </p>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={buildMutation.isPending}
              data-ocid="legendary.builder.dialog.cancel_button"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit}
              data-ocid="legendary.builder.dialog.submit_button"
            >
              {buildMutation.isPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Zap className="size-4" />
              )}
              Build
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------- Sub-components ------------------------------ */

function ActivityTypeOption({
  value,
  label,
  description,
  icon,
  selected,
  onSelect,
  disabled,
}: {
  value: string;
  label: string;
  description: string;
  icon: ReactElement;
  selected: boolean;
  onSelect: () => void;
  disabled: boolean;
}): ReactElement {
  return (
    <button
      type="button"
      // biome-ignore lint/a11y/useSemanticElements: custom radio toggle needs button styling/semantics for the Be Legendary activity-type selector
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      disabled={disabled}
      data-ocid={`legendary.builder.dialog.type.${value}.radio`}
      className={cn(
        "flex flex-col items-start gap-1 rounded-md border px-3 py-3 text-left transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        selected
          ? "border-primary bg-primary/10 text-foreground"
          : "border-border bg-library-card text-foreground hover:bg-muted/40",
        disabled && "cursor-not-allowed opacity-50",
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
    </button>
  );
}

function CategoryListSkeleton(): ReactElement {
  return (
    <div
      className="grid gap-1.5"
      data-ocid="legendary.builder.dialog.categories.loading_state"
      aria-hidden
    >
      {["s1", "s2", "s3"].map((k) => (
        <Skeleton key={k} className="h-12 w-full rounded-md" />
      ))}
    </div>
  );
}

export default ActivityBuilderDialog;
