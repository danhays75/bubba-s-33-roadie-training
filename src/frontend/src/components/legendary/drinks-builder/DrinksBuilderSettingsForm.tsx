import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Plus, X } from "lucide-react";
import type { ReactElement } from "react";
import type { DrinksBuilderSettings } from "./types";

/**
 * DrinksBuilderSettingsForm — shared editor for the DrinksBuilderSettings
 * payload of a drinksBuilder Be Legendary activity.
 *
 * Used by both ActivityBuilderDialog (create) and ActivityEditorDialog (edit)
 * so the admin sees the exact same controls in both flows. The form is fully
 * controlled: the parent owns the `value` and merges changes via `onChange`.
 *
 * Dark roadhouse theme: bg #1E1E1B card surface, red #E4002B accents, gold
 * #F2A900 highlights. Mobile-first, tap-friendly targets.
 *
 * Fields:
 *   - includedCategories (checkbox list of position categories; empty = all)
 *   - excludedDrinkTitles (text input list with add/remove entries)
 *   - decoyCount (number 0-3, default 2)
 *   - requireExactAmounts (checkbox, default true)
 *   - enforceAssemblyOrder (checkbox, default true)
 *   - showScoring (checkbox, default true)
 *   - streakMultiplier (checkbox, default true)
 *   - pointsPerCorrect (number, default 50)
 *   - roundsPerSession (number, 0=endless, default 0)
 *   - soundDefault (checkbox, default true)
 */
export interface DrinksBuilderSettingsFormProps {
  value: DrinksBuilderSettings;
  onChange: (next: DrinksBuilderSettings) => void;
  categories: Array<{ id: string; name: string }>;
  /** Disable every control (e.g. while a mutation is pending). */
  disabled?: boolean;
}

export function DrinksBuilderSettingsForm({
  value,
  onChange,
  categories,
  disabled = false,
}: DrinksBuilderSettingsFormProps): ReactElement {
  function patch<K extends keyof DrinksBuilderSettings>(
    key: K,
    next: DrinksBuilderSettings[K],
  ): void {
    onChange({ ...value, [key]: next });
  }

  function toggleIncludedCategory(categoryId: string): void {
    const next = value.includedCategories.includes(categoryId)
      ? value.includedCategories.filter((id) => id !== categoryId)
      : [...value.includedCategories, categoryId];
    patch("includedCategories", next);
  }

  function addExcludedTitle(): void {
    patch("excludedDrinkTitles", [...value.excludedDrinkTitles, ""]);
  }

  function updateExcludedTitle(index: number, text: string): void {
    const next = value.excludedDrinkTitles.map((t, i) =>
      i === index ? text : t,
    );
    patch("excludedDrinkTitles", next);
  }

  function removeExcludedTitle(index: number): void {
    patch(
      "excludedDrinkTitles",
      value.excludedDrinkTitles.filter((_, i) => i !== index),
    );
  }

  function clampNumber(raw: string, min: number, max: number): number {
    if (raw === "") return min;
    const n = Number.parseInt(raw, 10);
    if (Number.isNaN(n)) return min;
    return Math.max(min, Math.min(max, n));
  }

  return (
    <div
      className="grid gap-5 rounded-md border border-border bg-library-card p-4"
      data-ocid="legendary.drinks_builder.settings_form"
    >
      {/* Included categories */}
      <fieldset className="grid gap-2" disabled={disabled}>
        <legend className="font-heading uppercase text-xs tracking-wider text-foreground">
          Included categories
        </legend>
        <p className="font-body text-xs text-muted-foreground">
          Pick which categories the game draws drinks from. Leave all unchecked
          to use every category.
        </p>
        {categories.length === 0 ? (
          <p
            className="rounded-md border border-dashed border-border px-3 py-3 text-center font-body text-xs text-muted-foreground"
            data-ocid="legendary.drinks_builder.settings_form.included_categories.empty_state"
          >
            No categories available — all will be used.
          </p>
        ) : (
          <ul
            className="max-h-44 grid gap-1.5 overflow-y-auto pr-1"
            data-ocid="legendary.drinks_builder.settings_form.included_categories.list"
          >
            {categories.map((category, index) => {
              const checked = value.includedCategories.includes(category.id);
              return (
                <li key={category.id}>
                  <label
                    htmlFor={`db-included-${category.id}`}
                    className={cn(
                      "flex items-center gap-3 rounded-md border px-3 py-2 cursor-pointer transition-colors",
                      checked
                        ? "border-primary/60 bg-primary/10"
                        : "border-border bg-card hover:bg-muted/40",
                    )}
                  >
                    <Checkbox
                      id={`db-included-${category.id}`}
                      checked={checked}
                      onCheckedChange={() =>
                        toggleIncludedCategory(category.id)
                      }
                      disabled={disabled}
                      data-ocid={`legendary.drinks_builder.settings_form.included_categories.item.${index + 1}`}
                    />
                    <span className="truncate font-heading text-sm uppercase tracking-wide text-foreground">
                      {category.name}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
        {value.includedCategories.length === 0 && categories.length > 0 && (
          <p className="font-body text-xs text-primary">
            None checked — all categories will be used.
          </p>
        )}
      </fieldset>

      {/* Excluded drink titles */}
      <fieldset className="grid gap-2" disabled={disabled}>
        <legend className="font-heading uppercase text-xs tracking-wider text-foreground">
          Excluded drink titles
        </legend>
        <p className="font-body text-xs text-muted-foreground">
          Hide specific drinks by exact title. Leave empty to include every
          drink from the included categories.
        </p>
        <ul
          className="grid gap-1.5"
          data-ocid="legendary.drinks_builder.settings_form.excluded_titles.list"
        >
          {value.excludedDrinkTitles.map((title, index) => (
            <li
              key={`db-excluded-${title}`}
              className="flex items-center gap-2"
            >
              <Input
                value={title}
                onChange={(e) => updateExcludedTitle(index, e.target.value)}
                placeholder="e.g. Long Island Iced Tea"
                autoComplete="off"
                maxLength={80}
                disabled={disabled}
                data-ocid={`legendary.drinks_builder.settings_form.excluded_titles.input.${index + 1}`}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => removeExcludedTitle(index)}
                disabled={disabled}
                aria-label={`Remove excluded title ${index + 1}`}
                data-ocid={`legendary.drinks_builder.settings_form.excluded_titles.remove_button.${index + 1}`}
              >
                <X className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
        <Button
          type="button"
          variant="outline"
          onClick={addExcludedTitle}
          disabled={disabled}
          data-ocid="legendary.drinks_builder.settings_form.excluded_titles.add_button"
        >
          <Plus className="size-4" /> Add excluded title
        </Button>
      </fieldset>

      {/* Numeric settings */}
      <div className="grid gap-4 sm:grid-cols-3">
        <NumberField
          id="db-decoy-count"
          label="Decoy count"
          hint="Wrong chips per section (0-3)."
          value={value.decoyCount}
          min={0}
          max={3}
          disabled={disabled}
          onChange={(raw) => patch("decoyCount", clampNumber(raw, 0, 3))}
          ocid="legendary.drinks_builder.settings_form.decoy_count"
        />
        <NumberField
          id="db-points-per-correct"
          label="Points per correct"
          hint="Score awarded per correct tap."
          value={value.pointsPerCorrect}
          min={0}
          max={10000}
          disabled={disabled}
          onChange={(raw) =>
            patch("pointsPerCorrect", clampNumber(raw, 0, 10000))
          }
          ocid="legendary.drinks_builder.settings_form.points_per_correct"
        />
        <NumberField
          id="db-rounds-per-session"
          label="Rounds per session"
          hint="0 = endless practice."
          value={value.roundsPerSession}
          min={0}
          max={1000}
          disabled={disabled}
          onChange={(raw) =>
            patch("roundsPerSession", clampNumber(raw, 0, 1000))
          }
          ocid="legendary.drinks_builder.settings_form.rounds_per_session"
        />
      </div>

      {/* Toggle grid */}
      <fieldset className="grid gap-2 sm:grid-cols-2" disabled={disabled}>
        <legend className="font-heading uppercase text-xs tracking-wider text-foreground sm:col-span-2">
          Behavior toggles
        </legend>
        <ToggleRow
          id="db-require-exact"
          label="Require exact amounts"
          hint="Player must tap the exact spec amount."
          checked={value.requireExactAmounts}
          onChange={(v) => patch("requireExactAmounts", v)}
          disabled={disabled}
          ocid="legendary.drinks_builder.settings_form.require_exact_amounts"
        />
        <ToggleRow
          id="db-enforce-order"
          label="Enforce assembly order"
          hint="Assembly steps must be tapped in order."
          checked={value.enforceAssemblyOrder}
          onChange={(v) => patch("enforceAssemblyOrder", v)}
          disabled={disabled}
          ocid="legendary.drinks_builder.settings_form.enforce_assembly_order"
        />
        <ToggleRow
          id="db-show-scoring"
          label="Show scoring"
          hint="Display the running score during play."
          checked={value.showScoring}
          onChange={(v) => patch("showScoring", v)}
          disabled={disabled}
          ocid="legendary.drinks_builder.settings_form.show_scoring"
        />
        <ToggleRow
          id="db-streak-multiplier"
          label="Streak multiplier"
          hint="Streaks multiply points per correct tap."
          checked={value.streakMultiplier}
          onChange={(v) => patch("streakMultiplier", v)}
          disabled={disabled}
          ocid="legendary.drinks_builder.settings_form.streak_multiplier"
        />
        <ToggleRow
          id="db-sound-default"
          label="Sound on by default"
          hint="Plays feedback sounds until muted."
          checked={value.soundDefault}
          onChange={(v) => patch("soundDefault", v)}
          disabled={disabled}
          ocid="legendary.drinks_builder.settings_form.sound_default"
        />
      </fieldset>
    </div>
  );
}

/* --------------------------- Sub-components ------------------------------ */

function NumberField({
  id,
  label,
  hint,
  value,
  min,
  max,
  disabled,
  onChange,
  ocid,
}: {
  id: string;
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  disabled: boolean;
  onChange: (raw: string) => void;
  ocid: string;
}): ReactElement {
  return (
    <div className="grid gap-1.5">
      <Label
        htmlFor={id}
        className="font-heading uppercase text-xs tracking-wider text-foreground"
      >
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        data-ocid={ocid}
      />
      <p className="font-body text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function ToggleRow({
  id,
  label,
  hint,
  checked,
  onChange,
  disabled,
  ocid,
}: {
  id: string;
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled: boolean;
  ocid: string;
}): ReactElement {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex items-start gap-3 rounded-md border px-3 py-2.5 transition-colors",
        checked
          ? "border-primary/60 bg-primary/10"
          : "border-border bg-card hover:bg-muted/40",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(v) => onChange(v === true)}
        disabled={disabled}
        data-ocid={ocid}
      />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-heading text-sm uppercase tracking-wide text-foreground">
          {label}
        </span>
        <span className="font-body text-xs text-muted-foreground">{hint}</span>
      </span>
    </label>
  );
}

/** Default settings used by ActivityBuilderDialog when initializing a new form. */
export const DEFAULT_DRINKS_BUILDER_SETTINGS: DrinksBuilderSettings = {
  includedCategories: [],
  excludedDrinkTitles: [],
  decoyCount: 2,
  requireExactAmounts: true,
  enforceAssemblyOrder: true,
  showScoring: true,
  streakMultiplier: true,
  pointsPerCorrect: 50,
  roundsPerSession: 0,
  soundDefault: true,
};

export default DrinksBuilderSettingsForm;
