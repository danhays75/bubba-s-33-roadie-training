import { QueryErrorState } from "@/components/QueryErrorState";
import { DetailFieldEditor } from "@/components/admin/library/DetailFieldEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  makeDetailFieldId,
  useCreateItem,
  useItem,
  useUpdateItem,
} from "@/hooks/useLibrary";
import { useMyProfile } from "@/hooks/useMyProfile";
import { cn } from "@/lib/utils";
import type { DetailField, Recipe } from "@/types/foundation";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Loader2,
  Lock,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import { toast } from "sonner";
import { PhotoField } from "../PhotoField";

/**
 * Editor-only row types for recipe sub-records. The backend Recipe shape has
 * no ids (RecipeSpec / RecipeVariant are value records), but biome's
 * noArrayIndexKey rule requires stable React keys. We mirror the
 * makeDetailFieldId() pattern: each editor row carries a frontend-only `id`
 * minted when the row is created (or prefill), used as the React key, and
 * stripped before persist in buildRecipe() below.
 */
interface EditorSpec {
  id: string;
  amount: string;
  ingredient: string;
}

interface EditorVariant {
  id: string;
  variantLabel: string;
  specs: EditorSpec[];
  assembly: EditorTextRow[];
}

/**
 * Editor-only wrapper for a plain text row (assembly steps, garnish items).
 * Same id-for-stable-key rationale as EditorSpec.
 */
interface EditorTextRow {
  id: string;
  value: string;
}

/**
 * Mints a stable, unique id for a recipe editor row (spec / text row /
 * variant). Mirrors makeDetailFieldId() from useLibrary.ts. Frontend-only —
 * never sent to the backend (stripped in buildRecipe()).
 */
function makeRecipeRowId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Convenience factories — keep the prefix intent next to the call site. */
const newSpecId = () => makeRecipeRowId("spec");
const newTextId = () => makeRecipeRowId("txt");
const newVariantId = () => makeRecipeRowId("var");

/** Empty editor spec row with a fresh id. */
function emptySpec(): EditorSpec {
  return { id: newSpecId(), amount: "", ingredient: "" };
}

/** Empty editor text row with a fresh id. */
function emptyText(): EditorTextRow {
  return { id: newTextId(), value: "" };
}

/** Empty editor variant with fresh ids for itself + its nested rows. */
function emptyVariant(): EditorVariant {
  return {
    id: newVariantId(),
    variantLabel: "",
    specs: [emptySpec()],
    assembly: [emptyText()],
  };
}

/**
 * Admin item editor — a dedicated edit PAGE (not a dialog) for creating and
 * editing Library items with their variable labeled detail fields.
 *
 * Modes:
 *   - itemId === 'new'  → create mode. Empty form, one empty detail field,
 *     seasonal=false, empty tags. Calls useCreateItem on save.
 *   - itemId !== 'new'  → edit mode. Loads the item via useItem, prefills
 *     the form. Calls useUpdateItem on save.
 *
 * On success the editor navigates back to the per-position Library manager
 * (/admin/positions/$positionId/library) and shows a sonner toast.
 *
 * Gated on profile?.role === 'admin' with an AdminsOnly fallback, consistent
 * with admin.positions.tsx and admin.users.tsx. The wordmark in Layout still
 * links home from anywhere — this page only adds a breadcrumb back to the
 * Library manager.
 *
 * Photos are optional everywhere — save is never blocked on a missing photo.
 * Only the title is required.
 */
export function ItemEditorPage({
  positionId,
  categoryId,
  itemId,
}: {
  positionId: string;
  categoryId: string;
  itemId: string;
}) {
  const isCreate = itemId === "new";

  const { data: profile } = useMyProfile();
  const itemQuery = useItem(isCreate ? "" : itemId);
  const existing = itemQuery.data;
  const isLoading = itemQuery.isLoading;
  const createMutation = useCreateItem();
  const updateMutation = useUpdateItem();
  const navigate = useNavigate();

  // --- Form state ---------------------------------------------------------
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [photo, setPhoto] = useState("");
  // Each detail-field row carries a stable frontend-only id (generated once
  // here) so DetailFieldEditor rows are keyed by id, not by their changing
  // text — typing in a row no longer remounts it and steals focus.
  const [details, setDetails] = useState<DetailField[]>(() => [
    { id: makeDetailFieldId(), fieldLabel: "", value: "" },
  ]);
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [seasonal, setSeasonal] = useState(false);
  // Recipe sub-form. `isRecipe` is the 'This is a recipe' toggle. When OFF,
  // the recipe payload is omitted entirely (null) on persist so the item
  // stays a generic Library card. When ON, the recipe sub-form is revealed
  // below the toggle. Auto-reveals + populates when an existing item already
  // carries a recipe payload (loaded in the prefill effect below).
  const [isRecipe, setIsRecipe] = useState(false);
  const [recipeGlassware, setRecipeGlassware] = useState("");
  const [recipeSpecs, setRecipeSpecs] = useState<EditorSpec[]>([emptySpec()]);
  const [recipeAssembly, setRecipeAssembly] = useState<EditorTextRow[]>([
    emptyText(),
  ]);
  const [recipeGarnish, setRecipeGarnish] = useState<EditorTextRow[]>([
    emptyText(),
  ]);
  const [recipeVariants, setRecipeVariants] = useState<EditorVariant[]>([
    emptyVariant(),
  ]);
  // Bulk-mix fields — surfaced in a dedicated "Bulk Mix" section of the recipe
  // sub-form. Equipment and Quality Identifier are repeatable text rows (same
  // EditorTextRow wrapper as Assembly/Garnish); Yield and Shelf Life are
  // single text inputs (nullable on persist when blank). Detection of
  // bulk-mix vs drink is automatic from the data — no manual toggle.
  const [recipeEquipment, setRecipeEquipment] = useState<EditorTextRow[]>([
    emptyText(),
  ]);
  const [recipeYield, setRecipeYield] = useState("");
  const [recipeShelfLife, setRecipeShelfLife] = useState("");
  const [recipeQualityIdentifier, setRecipeQualityIdentifier] = useState<
    EditorTextRow[]
  >([emptyText()]);
  const [touched, setTouched] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Prefill in edit mode once the item arrives. Use a hydrated guard so a
  // later refetch (e.g. after invalidation) does not clobber in-flight edits.
  // existing.details already carry stable ids (generated in useLibrary.toItem);
  // the empty-row fallback mints a fresh id so its key is stable too.
  useEffect(() => {
    if (isCreate || hydrated) return;
    if (existing) {
      setTitle(existing.title);
      setSubtitle(existing.subtitle ?? "");
      setPhoto(existing.photo ?? "");
      setDetails(
        existing.details.length > 0
          ? existing.details.map((d) => ({ ...d }))
          : [{ id: makeDetailFieldId(), fieldLabel: "", value: "" }],
      );
      setNotes(existing.notes ?? "");
      setTags(existing.tags);
      setSeasonal(existing.seasonal);
      // Auto-reveal + populate the recipe sub-form when the item already
      // carries a recipe payload. When the backend omits ?Recipe (null), the
      // toggle stays OFF and the recipe sub-form stays hidden — the item is
      // a generic Library card.
      if (existing.recipe) {
        const r = existing.recipe;
        setIsRecipe(true);
        setRecipeGlassware(r.glassware);
        setRecipeSpecs(
          r.specs.length > 0
            ? r.specs.map((s) => ({ id: newSpecId(), ...s }))
            : [emptySpec()],
        );
        setRecipeAssembly(
          r.assembly.length > 0
            ? r.assembly.map((value) => ({ id: newTextId(), value }))
            : [emptyText()],
        );
        setRecipeGarnish(
          r.garnish.length > 0
            ? r.garnish.map((value) => ({ id: newTextId(), value }))
            : [emptyText()],
        );
        setRecipeVariants(
          r.variants.length > 0
            ? r.variants.map((v) => ({
                id: newVariantId(),
                variantLabel: v.variantLabel,
                specs:
                  v.specs.length > 0
                    ? v.specs.map((s) => ({ id: newSpecId(), ...s }))
                    : [emptySpec()],
                assembly:
                  v.assembly.length > 0
                    ? v.assembly.map((value) => ({ id: newTextId(), value }))
                    : [emptyText()],
              }))
            : [emptyVariant()],
        );
        // Bulk-mix fields — prefill equipment + qualityIdentifier rows from
        // the existing arrays (minting fresh frontend-only ids), and yield +
        // shelfLife from the nullable strings. Empty arrays fall back to a
        // single empty row so the editor reopens with a target.
        setRecipeEquipment(
          r.equipment.length > 0
            ? r.equipment.map((value) => ({ id: newTextId(), value }))
            : [emptyText()],
        );
        setRecipeYield(r.yield ?? "");
        setRecipeShelfLife(r.shelfLife ?? "");
        setRecipeQualityIdentifier(
          r.qualityIdentifier.length > 0
            ? r.qualityIdentifier.map((value) => ({
                id: newTextId(),
                value,
              }))
            : [emptyText()],
        );
      } else {
        setIsRecipe(false);
      }
      setHydrated(true);
    }
  }, [isCreate, hydrated, existing]);

  const isAdmin = profile?.role === "admin";

  const titleError =
    touched && title.trim().length === 0 ? "Title is required" : null;
  const canSubmit = title.trim().length > 0;
  const isPending = createMutation.isPending || updateMutation.isPending;

  // --- Recipe helpers -----------------------------------------------------
  // Recipe sub-records (RecipeSpec, RecipeVariant) are value records with no
  // ids — the editor wraps them in EditorSpec / EditorTextRow / EditorVariant
  // (each carrying a frontend-only id) so React keys are stable across edits.

  function isBlankSpec(s: EditorSpec): boolean {
    return s.amount.trim().length === 0 && s.ingredient.trim().length === 0;
  }

  /**
   * Builds the cleaned Recipe payload (or null) for persist. Mirrors the
   * blank-detail-row dropping above: fully-blank recipe rows are dropped
   * before persist so the backend never stores empty entries.
   *
   * Returns null when:
   *   - the 'This is a recipe' toggle is OFF (recipe omitted entirely so the
   *     item stays a generic Library card), OR
   *   - the toggle is ON but glassware is empty AND every row is blank
   *     (treated as "no real recipe" — falls back to null).
   *
   * When the toggle is ON and glassware is present but all rows are blank,
   * the recipe is still persisted (glassware-only recipe is valid). The
   * submit handler blocks save when the toggle is ON but glassware is empty
   * and there are no non-blank rows — see `recipeError` below.
   */
  function buildRecipe(): Recipe | null {
    if (!isRecipe) return null;
    const cleanedSpecs = recipeSpecs
      .filter((s) => !isBlankSpec(s))
      .map((s) => ({ amount: s.amount, ingredient: s.ingredient }));
    const cleanedAssembly = recipeAssembly
      .filter((r) => r.value.trim().length > 0)
      .map((r) => r.value);
    const cleanedGarnish = recipeGarnish
      .filter((r) => r.value.trim().length > 0)
      .map((r) => r.value);
    const cleanedVariants = recipeVariants
      .map((v) => ({
        variantLabel: v.variantLabel.trim(),
        specs: v.specs
          .filter((s) => !isBlankSpec(s))
          .map((s) => ({ amount: s.amount, ingredient: s.ingredient })),
        assembly: v.assembly
          .filter((r) => r.value.trim().length > 0)
          .map((r) => r.value),
      }))
      .filter(
        (v) =>
          v.variantLabel.length > 0 ||
          v.specs.length > 0 ||
          v.assembly.length > 0,
      );
    // Bulk-mix fields — drop blank equipment / qualityIdentifier rows, treat
    // empty yield / shelfLife as null (matches the frontend Recipe type).
    const cleanedEquipment = recipeEquipment
      .filter((r) => r.value.trim().length > 0)
      .map((r) => r.value);
    const trimmedYield = recipeYield.trim();
    const trimmedShelfLife = recipeShelfLife.trim();
    const cleanedQualityIdentifier = recipeQualityIdentifier
      .filter((r) => r.value.trim().length > 0)
      .map((r) => r.value);
    const trimmedGlassware = recipeGlassware.trim();
    if (
      trimmedGlassware.length === 0 &&
      cleanedSpecs.length === 0 &&
      cleanedAssembly.length === 0 &&
      cleanedGarnish.length === 0 &&
      cleanedVariants.length === 0 &&
      cleanedEquipment.length === 0 &&
      trimmedYield.length === 0 &&
      trimmedShelfLife.length === 0 &&
      cleanedQualityIdentifier.length === 0
    ) {
      return null;
    }
    return {
      glassware: trimmedGlassware,
      specs: cleanedSpecs,
      assembly: cleanedAssembly,
      garnish: cleanedGarnish,
      variants: cleanedVariants,
      equipment: cleanedEquipment,
      yield: trimmedYield.length > 0 ? trimmedYield : null,
      shelfLife: trimmedShelfLife.length > 0 ? trimmedShelfLife : null,
      qualityIdentifier: cleanedQualityIdentifier,
    };
  }

  // Block save when the toggle is ON but the recipe is effectively empty
  // (no glassware AND no non-blank rows). Prefer a clear message over a
  // silent null persist so the admin understands what is missing.
  const recipeError =
    touched && isRecipe && buildRecipe() === null
      ? "Add at least glassware or one spec/step to save as a recipe, or turn the toggle off."
      : null;

  // --- Tag input ----------------------------------------------------------
  function commitTag() {
    const trimmed = tagDraft.trim();
    if (trimmed.length === 0) return;
    if (tags.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      setTagDraft("");
      return;
    }
    setTags([...tags, trimmed]);
    setTagDraft("");
  }

  function handleTagKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commitTag();
    } else if (
      e.key === "Backspace" &&
      tagDraft.length === 0 &&
      tags.length > 0
    ) {
      setTags(tags.slice(0, -1));
    }
  }

  function removeTag(index: number) {
    setTags(tags.filter((_, i) => i !== index));
  }

  function handleTitleChange(e: ChangeEvent<HTMLInputElement>) {
    setTitle(e.target.value);
  }
  function handleSubtitleChange(e: ChangeEvent<HTMLInputElement>) {
    setSubtitle(e.target.value);
  }
  function handleNotesChange(e: ChangeEvent<HTMLTextAreaElement>) {
    setNotes(e.target.value);
  }

  // --- Recipe sub-form row controls --------------------------------------
  // Generic add/remove/move helpers for the repeatable recipe rows. Each
  // editor row carries a frontend-only `id` (minted on creation) used as the
  // React key — biome's noArrayIndexKey rule requires stable keys, and
  // content-based keys would remount rows on every keystroke.

  function addSpec(list: EditorSpec[], setList: (next: EditorSpec[]) => void) {
    setList([...list, emptySpec()]);
  }
  function updateSpec(
    list: EditorSpec[],
    setList: (next: EditorSpec[]) => void,
    index: number,
    patch: Partial<EditorSpec>,
  ) {
    setList(list.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }
  function removeSpec(
    list: EditorSpec[],
    setList: (next: EditorSpec[]) => void,
    index: number,
  ) {
    if (list.length <= 1) {
      setList([emptySpec()]);
      return;
    }
    setList(list.filter((_, i) => i !== index));
  }
  function moveSpec(
    list: EditorSpec[],
    setList: (next: EditorSpec[]) => void,
    index: number,
    direction: -1 | 1,
  ) {
    const target = index + direction;
    if (target < 0 || target >= list.length) return;
    const next = [...list];
    [next[index], next[target]] = [next[target], next[index]];
    setList(next);
  }

  function addTextRow(
    list: EditorTextRow[],
    setList: (next: EditorTextRow[]) => void,
  ) {
    setList([...list, emptyText()]);
  }
  function updateTextRow(
    list: EditorTextRow[],
    setList: (next: EditorTextRow[]) => void,
    index: number,
    value: string,
  ) {
    setList(list.map((r, i) => (i === index ? { ...r, value } : r)));
  }
  function removeTextRow(
    list: EditorTextRow[],
    setList: (next: EditorTextRow[]) => void,
    index: number,
  ) {
    if (list.length <= 1) {
      setList([emptyText()]);
      return;
    }
    setList(list.filter((_, i) => i !== index));
  }
  function moveTextRow(
    list: EditorTextRow[],
    setList: (next: EditorTextRow[]) => void,
    index: number,
    direction: -1 | 1,
  ) {
    const target = index + direction;
    if (target < 0 || target >= list.length) return;
    const next = [...list];
    [next[index], next[target]] = [next[target], next[index]];
    setList(next);
  }

  function addVariant() {
    setRecipeVariants([...recipeVariants, emptyVariant()]);
  }
  function updateVariant(index: number, patch: Partial<EditorVariant>) {
    setRecipeVariants(
      recipeVariants.map((v, i) => (i === index ? { ...v, ...patch } : v)),
    );
  }
  function removeVariant(index: number) {
    if (recipeVariants.length <= 1) {
      setRecipeVariants([emptyVariant()]);
      return;
    }
    setRecipeVariants(recipeVariants.filter((_, i) => i !== index));
  }
  function moveVariant(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= recipeVariants.length) return;
    const next = [...recipeVariants];
    [next[index], next[target]] = [next[target], next[index]];
    setRecipeVariants(next);
  }

  // --- Submit -------------------------------------------------------------
  const backTo = useMemo(
    () => ({
      to: "/admin/positions/$positionId/library",
      params: { positionId },
    }),
    [positionId],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!canSubmit) return;
    // Block save when the recipe toggle is ON but the recipe is effectively
    // empty. buildRecipe() returns null in that case; recipeError surfaces
    // the message. This avoids silently persisting a null recipe while the
    // admin believes they are saving a recipe.
    if (isRecipe && buildRecipe() === null) return;

    // Drop fully-blank detail rows before persisting so the backend never
    // stores empty {fieldLabel:'', value:''} entries. Keep at least one row
    // shape so the editor reopens with a target.
    const cleanedDetails = details.filter(
      (d) => d.fieldLabel.trim().length > 0 || d.value.trim().length > 0,
    );
    const finalDetails =
      cleanedDetails.length > 0
        ? cleanedDetails
        : [{ id: makeDetailFieldId(), fieldLabel: "", value: "" }];

    const trimmedTitle = title.trim();
    const trimmedSubtitle = subtitle.trim();
    const trimmedPhoto = photo.trim();
    const trimmedNotes = notes.trim();
    // Recipe payload: null when the toggle is OFF (omitted entirely) or when
    // buildRecipe() determined the recipe is effectively empty. The hook
    // layer (fromRecipe) maps null -> null at the Candid boundary.
    const recipePayload = buildRecipe();

    try {
      if (isCreate) {
        await createMutation.mutateAsync({
          categoryId,
          title: trimmedTitle,
          subtitle: trimmedSubtitle.length > 0 ? trimmedSubtitle : null,
          photo: trimmedPhoto.length > 0 ? trimmedPhoto : null,
          details: finalDetails,
          notes: trimmedNotes.length > 0 ? trimmedNotes : null,
          tags,
          seasonal,
          recipe: recipePayload,
        });
        toast.success("Item created");
      } else {
        await updateMutation.mutateAsync({
          itemId,
          categoryId,
          title: trimmedTitle,
          subtitle: trimmedSubtitle.length > 0 ? trimmedSubtitle : null,
          photo: trimmedPhoto.length > 0 ? trimmedPhoto : null,
          details: finalDetails,
          notes: trimmedNotes.length > 0 ? trimmedNotes : null,
          tags,
          seasonal,
          recipe: recipePayload,
        });
        toast.success("Item updated");
      }
      await navigate(backTo);
    } catch (err) {
      toast.error(
        isCreate ? "Could not create item" : "Could not update item",
        {
          description: err instanceof Error ? err.message : undefined,
        },
      );
    }
  }

  // --- Guards -------------------------------------------------------------
  if (!isAdmin) {
    return <AdminsOnly />;
  }

  if (!isCreate && isLoading) {
    return <ItemEditorSkeleton />;
  }

  // A transient fetch error must surface as a retryable error state, not a
  // blank form (the editor would otherwise render with empty state and let
  // the admin "edit" a missing record). Only show "Item not found" when the
  // read succeeded and returned null.
  if (!isCreate && itemQuery.isError) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <QueryErrorState
          title="Couldn't load this item"
          description="We couldn't load this item right now. Please try again."
          error={itemQuery.error}
          onRetry={() => itemQuery.refetch()}
        />
      </div>
    );
  }

  if (!isCreate && !isLoading && hydrated && !existing) {
    return <ItemNotFound positionId={positionId} />;
  }

  // --- Render -------------------------------------------------------------
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      {/* Breadcrumb back to the per-position Library manager */}
      <Link
        to="/admin/positions/$positionId/library"
        params={{ positionId }}
        className={cn(
          "inline-flex items-center gap-1.5 font-heading text-xs uppercase tracking-wide",
          "text-muted-foreground transition-colors duration-200 hover:text-primary",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        )}
        data-ocid="library.admin.item.editor.back_link"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to library
      </Link>

      <h2
        className="mt-3 font-display text-2xl uppercase leading-none tracking-wide text-foreground"
        data-ocid="library.admin.item.editor.title"
      >
        {isCreate ? "New item" : "Edit item"}
      </h2>
      <p className="mt-1.5 font-body text-sm text-muted-foreground">
        {isCreate
          ? "Add a recipe or training card to this category. Photo is optional."
          : "Update the item details. Photo is optional."}
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-6 grid gap-6"
        data-ocid="library.admin.item.editor.form"
      >
        {/* Title — required */}
        <div className="grid gap-2">
          <Label
            htmlFor="item-title"
            className="font-heading uppercase text-xs tracking-wider"
          >
            Title
          </Label>
          <Input
            id="item-title"
            value={title}
            onChange={handleTitleChange}
            onBlur={() => setTouched(true)}
            placeholder="e.g. Old Fashioned"
            aria-invalid={!!titleError}
            aria-describedby={titleError ? "item-title-error" : undefined}
            data-ocid="library.admin.item.editor.title_input"
            autoComplete="off"
            maxLength={120}
          />
          {titleError && (
            <p
              id="item-title-error"
              className="text-xs text-primary font-body"
              data-ocid="library.admin.item.editor.title_input.field_error"
            >
              {titleError}
            </p>
          )}
        </div>

        {/* Subtitle — optional */}
        <div className="grid gap-2">
          <Label
            htmlFor="item-subtitle"
            className="font-heading uppercase text-xs tracking-wider"
          >
            Subtitle{" "}
            <span className="text-muted-foreground normal-case">
              (optional)
            </span>
          </Label>
          <Input
            id="item-subtitle"
            value={subtitle}
            onChange={handleSubtitleChange}
            placeholder="e.g. A timeless whiskey classic"
            data-ocid="library.admin.item.editor.subtitle_input"
            autoComplete="off"
            maxLength={160}
          />
        </div>

        {/* Photo — optional, either/or upload or URL */}
        <div className="grid gap-2">
          <PhotoField
            id="item-photo"
            label="Photo"
            value={photo}
            onChange={(v) => setPhoto(v ?? "")}
          />
        </div>

        {/* Detail fields — variable list */}
        <fieldset className="grid gap-2">
          <legend className="font-heading uppercase text-xs tracking-wider">
            Detail fields
          </legend>
          <p className="text-xs text-muted-foreground font-body">
            Labeled specs like Spirit, Glass, Garnish. Add as many as you need.
          </p>
          <DetailFieldEditor
            value={details}
            onChange={setDetails}
            disabled={isPending}
          />
        </fieldset>

        {/* Notes — optional */}
        <div className="grid gap-2">
          <Label
            htmlFor="item-notes"
            className="font-heading uppercase text-xs tracking-wider"
          >
            Notes{" "}
            <span className="text-muted-foreground normal-case">
              (optional)
            </span>
          </Label>
          <Textarea
            id="item-notes"
            value={notes}
            onChange={handleNotesChange}
            placeholder="Prep notes, variations, history…"
            data-ocid="library.admin.item.editor.notes_input"
            maxLength={1000}
            rows={4}
          />
        </div>

        {/* Tags — chip input */}
        <div className="grid gap-2">
          <Label
            htmlFor="item-tag"
            className="font-heading uppercase text-xs tracking-wider"
          >
            Tags{" "}
            <span className="text-muted-foreground normal-case">
              (optional)
            </span>
          </Label>
          <div
            className="flex flex-wrap items-center gap-2 rounded-md border border-input bg-input/30 px-2 py-2"
            data-ocid="library.admin.item.editor.tags"
          >
            {tags.map((tag, index) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded border border-border bg-card px-2 py-0.5 font-body text-xs uppercase tracking-wide text-foreground"
                data-ocid={`library.admin.item.editor.tags.item.${index + 1}`}
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(index)}
                  disabled={isPending}
                  aria-label={`Remove tag ${tag}`}
                  data-ocid={`library.admin.item.editor.tags.remove.${index + 1}`}
                  className="text-muted-foreground transition-colors duration-200 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
            <input
              id="item-tag"
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={handleTagKeyDown}
              onBlur={commitTag}
              placeholder={
                tags.length === 0 ? "Add a tag, press Enter" : "Add another"
              }
              disabled={isPending}
              data-ocid="library.admin.item.editor.tags.input"
              className="flex-1 min-w-[8rem] bg-transparent font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              maxLength={40}
            />
          </div>
          <p className="text-xs text-muted-foreground font-body">
            Press Enter or comma to add. Backspace removes the last tag.
          </p>
        </div>

        {/* Seasonal — toggle */}
        <div className="flex items-center justify-between gap-4 rounded-md border border-border bg-card p-3">
          <div className="grid gap-0.5">
            <Label
              htmlFor="item-seasonal"
              className="font-heading uppercase text-xs tracking-wider"
            >
              Seasonal
            </Label>
            <p className="text-xs text-muted-foreground font-body">
              Marks the item with a seasonal badge on the recipe card.
            </p>
          </div>
          <Switch
            id="item-seasonal"
            checked={seasonal}
            onCheckedChange={setSeasonal}
            disabled={isPending}
            aria-label="Seasonal toggle"
            data-ocid="library.admin.item.editor.seasonal_toggle"
          />
        </div>

        {/* This is a recipe — toggle. Reveals the recipe sub-form below.
            Auto-reveals when an existing item already carries a recipe
            payload (handled in the prefill effect). When OFF, the recipe
            payload is omitted entirely (null) on persist. */}
        <div className="flex items-center justify-between gap-4 rounded-md border border-border bg-card p-3">
          <div className="grid gap-0.5">
            <Label
              htmlFor="item-recipe"
              className="font-heading uppercase text-xs tracking-wider"
            >
              This is a recipe
            </Label>
            <p className="text-xs text-muted-foreground font-body">
              Adds a cocktail spec (glassware, specs, assembly, garnish,
              variants) to this item.
            </p>
          </div>
          <Switch
            id="item-recipe"
            checked={isRecipe}
            onCheckedChange={setIsRecipe}
            disabled={isPending}
            aria-label="This is a recipe toggle"
            data-ocid="library.admin.item.editor.recipe_toggle"
          />
        </div>

        {/* Recipe sub-form — only visible when the toggle is ON. */}
        {isRecipe && (
          <fieldset
            className="grid gap-5 rounded-md border border-border bg-muted/20 p-4"
            data-ocid="library.admin.item.editor.recipe.section"
          >
            <legend className="px-2 font-heading uppercase text-xs tracking-wider">
              Recipe
            </legend>

            {/* Glassware — single text field, required when toggle is ON */}
            <div className="grid gap-2">
              <Label
                htmlFor="recipe-glassware"
                className="font-heading uppercase text-xs tracking-wider"
              >
                Glassware
              </Label>
              <Input
                id="recipe-glassware"
                value={recipeGlassware}
                onChange={(e) => setRecipeGlassware(e.target.value)}
                onBlur={() => setTouched(true)}
                placeholder="e.g. Rocks glass"
                disabled={isPending}
                data-ocid="library.admin.item.editor.recipe.glassware_input"
                autoComplete="off"
                maxLength={80}
              />
            </div>

            {/* Specs — repeatable amount + ingredient rows */}
            <div className="grid gap-2">
              <Label className="font-heading uppercase text-xs tracking-wider">
                Specs
              </Label>
              <p className="text-xs text-muted-foreground font-body">
                Measured ingredients (e.g. 2 oz / Bourbon).
              </p>
              <div
                className="grid gap-2"
                data-ocid="library.admin.item.editor.recipe.specs.list"
              >
                {recipeSpecs.map((spec, index) => {
                  const isFirst = index === 0;
                  const isLast = index === recipeSpecs.length - 1;
                  return (
                    <div
                      key={spec.id}
                      className="flex items-start gap-2 rounded-md border border-border bg-card p-2"
                      data-ocid={`library.admin.item.editor.recipe.specs.item.${index + 1}`}
                    >
                      <Input
                        value={spec.amount}
                        onChange={(e) =>
                          updateSpec(recipeSpecs, setRecipeSpecs, index, {
                            amount: e.target.value,
                          })
                        }
                        placeholder="Amount e.g. 2 oz"
                        aria-label={`Spec ${index + 1} amount`}
                        disabled={isPending}
                        data-ocid={`library.admin.item.editor.recipe.specs.item.${index + 1}.amount_input`}
                        autoComplete="off"
                        maxLength={40}
                        className="flex-1"
                      />
                      <Input
                        value={spec.ingredient}
                        onChange={(e) =>
                          updateSpec(recipeSpecs, setRecipeSpecs, index, {
                            ingredient: e.target.value,
                          })
                        }
                        placeholder="Ingredient e.g. Bourbon"
                        aria-label={`Spec ${index + 1} ingredient`}
                        disabled={isPending}
                        data-ocid={`library.admin.item.editor.recipe.specs.item.${index + 1}.ingredient_input`}
                        autoComplete="off"
                        maxLength={80}
                        className="flex-1"
                      />
                      <div className="flex shrink-0 gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            moveSpec(recipeSpecs, setRecipeSpecs, index, -1)
                          }
                          disabled={isPending || isFirst}
                          aria-label={`Move spec ${index + 1} up`}
                          data-ocid={`library.admin.item.editor.recipe.specs.item.${index + 1}.move_up`}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <ArrowUp />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            moveSpec(recipeSpecs, setRecipeSpecs, index, 1)
                          }
                          disabled={isPending || isLast}
                          aria-label={`Move spec ${index + 1} down`}
                          data-ocid={`library.admin.item.editor.recipe.specs.item.${index + 1}.move_down`}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <ArrowDown />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            removeSpec(recipeSpecs, setRecipeSpecs, index)
                          }
                          disabled={isPending}
                          aria-label={`Remove spec ${index + 1}`}
                          data-ocid={`library.admin.item.editor.recipe.specs.item.${index + 1}.remove`}
                          className="text-muted-foreground hover:text-primary"
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => addSpec(recipeSpecs, setRecipeSpecs)}
                  disabled={isPending}
                  data-ocid="library.admin.item.editor.recipe.specs.add"
                  className="w-full justify-center gap-2"
                >
                  <Plus />
                  Add spec
                </Button>
              </div>
            </div>

            {/* Assembly — repeatable text rows (prep steps) */}
            <div className="grid gap-2">
              <Label className="font-heading uppercase text-xs tracking-wider">
                Assembly
              </Label>
              <p className="text-xs text-muted-foreground font-body">
                Prep steps in order.
              </p>
              <div
                className="grid gap-2"
                data-ocid="library.admin.item.editor.recipe.assembly.list"
              >
                {recipeAssembly.map((row, index) => {
                  const isFirst = index === 0;
                  const isLast = index === recipeAssembly.length - 1;
                  return (
                    <div
                      key={row.id}
                      className="flex items-start gap-2 rounded-md border border-border bg-card p-2"
                      data-ocid={`library.admin.item.editor.recipe.assembly.item.${index + 1}`}
                    >
                      <Input
                        value={row.value}
                        onChange={(e) =>
                          updateTextRow(
                            recipeAssembly,
                            setRecipeAssembly,
                            index,
                            e.target.value,
                          )
                        }
                        placeholder={`Step ${index + 1} e.g. Stir over ice`}
                        aria-label={`Assembly step ${index + 1}`}
                        disabled={isPending}
                        data-ocid={`library.admin.item.editor.recipe.assembly.item.${index + 1}.input`}
                        autoComplete="off"
                        maxLength={200}
                        className="flex-1"
                      />
                      <div className="flex shrink-0 gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            moveTextRow(
                              recipeAssembly,
                              setRecipeAssembly,
                              index,
                              -1,
                            )
                          }
                          disabled={isPending || isFirst}
                          aria-label={`Move assembly step ${index + 1} up`}
                          data-ocid={`library.admin.item.editor.recipe.assembly.item.${index + 1}.move_up`}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <ArrowUp />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            moveTextRow(
                              recipeAssembly,
                              setRecipeAssembly,
                              index,
                              1,
                            )
                          }
                          disabled={isPending || isLast}
                          aria-label={`Move assembly step ${index + 1} down`}
                          data-ocid={`library.admin.item.editor.recipe.assembly.item.${index + 1}.move_down`}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <ArrowDown />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            removeTextRow(
                              recipeAssembly,
                              setRecipeAssembly,
                              index,
                            )
                          }
                          disabled={isPending}
                          aria-label={`Remove assembly step ${index + 1}`}
                          data-ocid={`library.admin.item.editor.recipe.assembly.item.${index + 1}.remove`}
                          className="text-muted-foreground hover:text-primary"
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => addTextRow(recipeAssembly, setRecipeAssembly)}
                  disabled={isPending}
                  data-ocid="library.admin.item.editor.recipe.assembly.add"
                  className="w-full justify-center gap-2"
                >
                  <Plus />
                  Add step
                </Button>
              </div>
            </div>

            {/* Garnish — repeatable text rows */}
            <div className="grid gap-2">
              <Label className="font-heading uppercase text-xs tracking-wider">
                Garnish
              </Label>
              <p className="text-xs text-muted-foreground font-body">
                Garnish items (e.g. Orange twist).
              </p>
              <div
                className="grid gap-2"
                data-ocid="library.admin.item.editor.recipe.garnish.list"
              >
                {recipeGarnish.map((row, index) => {
                  const isFirst = index === 0;
                  const isLast = index === recipeGarnish.length - 1;
                  return (
                    <div
                      key={row.id}
                      className="flex items-start gap-2 rounded-md border border-border bg-card p-2"
                      data-ocid={`library.admin.item.editor.recipe.garnish.item.${index + 1}`}
                    >
                      <Input
                        value={row.value}
                        onChange={(e) =>
                          updateTextRow(
                            recipeGarnish,
                            setRecipeGarnish,
                            index,
                            e.target.value,
                          )
                        }
                        placeholder={`Garnish ${index + 1} e.g. Orange twist`}
                        aria-label={`Garnish item ${index + 1}`}
                        disabled={isPending}
                        data-ocid={`library.admin.item.editor.recipe.garnish.item.${index + 1}.input`}
                        autoComplete="off"
                        maxLength={80}
                        className="flex-1"
                      />
                      <div className="flex shrink-0 gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            moveTextRow(
                              recipeGarnish,
                              setRecipeGarnish,
                              index,
                              -1,
                            )
                          }
                          disabled={isPending || isFirst}
                          aria-label={`Move garnish ${index + 1} up`}
                          data-ocid={`library.admin.item.editor.recipe.garnish.item.${index + 1}.move_up`}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <ArrowUp />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            moveTextRow(
                              recipeGarnish,
                              setRecipeGarnish,
                              index,
                              1,
                            )
                          }
                          disabled={isPending || isLast}
                          aria-label={`Move garnish ${index + 1} down`}
                          data-ocid={`library.admin.item.editor.recipe.garnish.item.${index + 1}.move_down`}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <ArrowDown />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            removeTextRow(
                              recipeGarnish,
                              setRecipeGarnish,
                              index,
                            )
                          }
                          disabled={isPending}
                          aria-label={`Remove garnish ${index + 1}`}
                          data-ocid={`library.admin.item.editor.recipe.garnish.item.${index + 1}.remove`}
                          className="text-muted-foreground hover:text-primary"
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => addTextRow(recipeGarnish, setRecipeGarnish)}
                  disabled={isPending}
                  data-ocid="library.admin.item.editor.recipe.garnish.add"
                  className="w-full justify-center gap-2"
                >
                  <Plus />
                  Add garnish
                </Button>
              </div>
            </div>

            {/* Variants — repeatable rows with nested specs + assembly */}
            <div className="grid gap-2">
              <Label className="font-heading uppercase text-xs tracking-wider">
                Variants
              </Label>
              <p className="text-xs text-muted-foreground font-body">
                Named variations (e.g. From Bulk) with their own specs and
                assembly.
              </p>
              <div
                className="grid gap-3"
                data-ocid="library.admin.item.editor.recipe.variants.list"
              >
                {recipeVariants.map((variant, vIndex) => {
                  const isFirst = vIndex === 0;
                  const isLast = vIndex === recipeVariants.length - 1;
                  return (
                    <div
                      key={variant.id}
                      className="grid gap-3 rounded-md border border-border bg-card p-3"
                      data-ocid={`library.admin.item.editor.recipe.variants.item.${vIndex + 1}`}
                    >
                      <div className="flex items-start gap-2">
                        <Input
                          value={variant.variantLabel}
                          onChange={(e) =>
                            updateVariant(vIndex, {
                              variantLabel: e.target.value,
                            })
                          }
                          placeholder="Variant name e.g. From Bulk"
                          aria-label={`Variant ${vIndex + 1} label`}
                          disabled={isPending}
                          data-ocid={`library.admin.item.editor.recipe.variants.item.${vIndex + 1}.label_input`}
                          autoComplete="off"
                          maxLength={80}
                          className="flex-1 font-heading text-xs uppercase tracking-wider"
                        />
                        <div className="flex shrink-0 gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => moveVariant(vIndex, -1)}
                            disabled={isPending || isFirst}
                            aria-label={`Move variant ${vIndex + 1} up`}
                            data-ocid={`library.admin.item.editor.recipe.variants.item.${vIndex + 1}.move_up`}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <ArrowUp />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => moveVariant(vIndex, 1)}
                            disabled={isPending || isLast}
                            aria-label={`Move variant ${vIndex + 1} down`}
                            data-ocid={`library.admin.item.editor.recipe.variants.item.${vIndex + 1}.move_down`}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <ArrowDown />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeVariant(vIndex)}
                            disabled={isPending}
                            aria-label={`Remove variant ${vIndex + 1}`}
                            data-ocid={`library.admin.item.editor.recipe.variants.item.${vIndex + 1}.remove`}
                            className="text-muted-foreground hover:text-primary"
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      </div>

                      {/* Nested specs */}
                      <div className="grid gap-2 pl-2 border-l border-border">
                        <span className="font-heading uppercase text-[10px] tracking-wider text-muted-foreground">
                          Specs
                        </span>
                        <div
                          className="grid gap-2"
                          data-ocid={`library.admin.item.editor.recipe.variants.item.${vIndex + 1}.specs.list`}
                        >
                          {variant.specs.map((spec, sIndex) => {
                            const sFirst = sIndex === 0;
                            const sLast = sIndex === variant.specs.length - 1;
                            return (
                              <div
                                key={spec.id}
                                className="flex items-start gap-2"
                                data-ocid={`library.admin.item.editor.recipe.variants.item.${vIndex + 1}.specs.item.${sIndex + 1}`}
                              >
                                <Input
                                  value={spec.amount}
                                  onChange={(e) =>
                                    updateVariant(vIndex, {
                                      specs: variant.specs.map((s, i) =>
                                        i === sIndex
                                          ? { ...s, amount: e.target.value }
                                          : s,
                                      ),
                                    })
                                  }
                                  placeholder="Amount"
                                  aria-label={`Variant ${vIndex + 1} spec ${sIndex + 1} amount`}
                                  disabled={isPending}
                                  data-ocid={`library.admin.item.editor.recipe.variants.item.${vIndex + 1}.specs.item.${sIndex + 1}.amount_input`}
                                  autoComplete="off"
                                  maxLength={40}
                                  className="flex-1"
                                />
                                <Input
                                  value={spec.ingredient}
                                  onChange={(e) =>
                                    updateVariant(vIndex, {
                                      specs: variant.specs.map((s, i) =>
                                        i === sIndex
                                          ? {
                                              ...s,
                                              ingredient: e.target.value,
                                            }
                                          : s,
                                      ),
                                    })
                                  }
                                  placeholder="Ingredient"
                                  aria-label={`Variant ${vIndex + 1} spec ${sIndex + 1} ingredient`}
                                  disabled={isPending}
                                  data-ocid={`library.admin.item.editor.recipe.variants.item.${vIndex + 1}.specs.item.${sIndex + 1}.ingredient_input`}
                                  autoComplete="off"
                                  maxLength={80}
                                  className="flex-1"
                                />
                                <div className="flex shrink-0 gap-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      moveSpec(
                                        variant.specs,
                                        (next) =>
                                          updateVariant(vIndex, {
                                            specs: next,
                                          }),
                                        sIndex,
                                        -1,
                                      )
                                    }
                                    disabled={isPending || sFirst}
                                    aria-label={`Move spec ${sIndex + 1} up`}
                                    data-ocid={`library.admin.item.editor.recipe.variants.item.${vIndex + 1}.specs.item.${sIndex + 1}.move_up`}
                                    className="text-muted-foreground hover:text-foreground"
                                  >
                                    <ArrowUp />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      moveSpec(
                                        variant.specs,
                                        (next) =>
                                          updateVariant(vIndex, {
                                            specs: next,
                                          }),
                                        sIndex,
                                        1,
                                      )
                                    }
                                    disabled={isPending || sLast}
                                    aria-label={`Move spec ${sIndex + 1} down`}
                                    data-ocid={`library.admin.item.editor.recipe.variants.item.${vIndex + 1}.specs.item.${sIndex + 1}.move_down`}
                                    className="text-muted-foreground hover:text-foreground"
                                  >
                                    <ArrowDown />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      removeSpec(
                                        variant.specs,
                                        (next) =>
                                          updateVariant(vIndex, {
                                            specs: next,
                                          }),
                                        sIndex,
                                      )
                                    }
                                    disabled={isPending}
                                    aria-label={`Remove spec ${sIndex + 1}`}
                                    data-ocid={`library.admin.item.editor.recipe.variants.item.${vIndex + 1}.specs.item.${sIndex + 1}.remove`}
                                    className="text-muted-foreground hover:text-primary"
                                  >
                                    <Trash2 />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              addSpec(variant.specs, (next) =>
                                updateVariant(vIndex, { specs: next }),
                              )
                            }
                            disabled={isPending}
                            data-ocid={`library.admin.item.editor.recipe.variants.item.${vIndex + 1}.specs.add`}
                            className="w-full justify-center gap-2"
                          >
                            <Plus />
                            Add spec
                          </Button>
                        </div>
                      </div>

                      {/* Nested assembly */}
                      <div className="grid gap-2 pl-2 border-l border-border">
                        <span className="font-heading uppercase text-[10px] tracking-wider text-muted-foreground">
                          Assembly
                        </span>
                        <div
                          className="grid gap-2"
                          data-ocid={`library.admin.item.editor.recipe.variants.item.${vIndex + 1}.assembly.list`}
                        >
                          {variant.assembly.map((row, aIndex) => {
                            const aFirst = aIndex === 0;
                            const aLast =
                              aIndex === variant.assembly.length - 1;
                            return (
                              <div
                                key={row.id}
                                className="flex items-start gap-2"
                                data-ocid={`library.admin.item.editor.recipe.variants.item.${vIndex + 1}.assembly.item.${aIndex + 1}`}
                              >
                                <Input
                                  value={row.value}
                                  onChange={(e) =>
                                    updateVariant(vIndex, {
                                      assembly: variant.assembly.map((s, i) =>
                                        i === aIndex
                                          ? { ...s, value: e.target.value }
                                          : s,
                                      ),
                                    })
                                  }
                                  placeholder={`Step ${aIndex + 1}`}
                                  aria-label={`Variant ${vIndex + 1} assembly step ${aIndex + 1}`}
                                  disabled={isPending}
                                  data-ocid={`library.admin.item.editor.recipe.variants.item.${vIndex + 1}.assembly.item.${aIndex + 1}.input`}
                                  autoComplete="off"
                                  maxLength={200}
                                  className="flex-1"
                                />
                                <div className="flex shrink-0 gap-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      moveTextRow(
                                        variant.assembly,
                                        (next) =>
                                          updateVariant(vIndex, {
                                            assembly: next,
                                          }),
                                        aIndex,
                                        -1,
                                      )
                                    }
                                    disabled={isPending || aFirst}
                                    aria-label={`Move assembly step ${aIndex + 1} up`}
                                    data-ocid={`library.admin.item.editor.recipe.variants.item.${vIndex + 1}.assembly.item.${aIndex + 1}.move_up`}
                                    className="text-muted-foreground hover:text-foreground"
                                  >
                                    <ArrowUp />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      moveTextRow(
                                        variant.assembly,
                                        (next) =>
                                          updateVariant(vIndex, {
                                            assembly: next,
                                          }),
                                        aIndex,
                                        1,
                                      )
                                    }
                                    disabled={isPending || aLast}
                                    aria-label={`Move assembly step ${aIndex + 1} down`}
                                    data-ocid={`library.admin.item.editor.recipe.variants.item.${vIndex + 1}.assembly.item.${aIndex + 1}.move_down`}
                                    className="text-muted-foreground hover:text-foreground"
                                  >
                                    <ArrowDown />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      removeTextRow(
                                        variant.assembly,
                                        (next) =>
                                          updateVariant(vIndex, {
                                            assembly: next,
                                          }),
                                        aIndex,
                                      )
                                    }
                                    disabled={isPending}
                                    aria-label={`Remove assembly step ${aIndex + 1}`}
                                    data-ocid={`library.admin.item.editor.recipe.variants.item.${vIndex + 1}.assembly.item.${aIndex + 1}.remove`}
                                    className="text-muted-foreground hover:text-primary"
                                  >
                                    <Trash2 />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              addTextRow(variant.assembly, (next) =>
                                updateVariant(vIndex, { assembly: next }),
                              )
                            }
                            disabled={isPending}
                            data-ocid={`library.admin.item.editor.recipe.variants.item.${vIndex + 1}.assembly.add`}
                            className="w-full justify-center gap-2"
                          >
                            <Plus />
                            Add step
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <Button
                  type="button"
                  variant="outline"
                  onClick={addVariant}
                  disabled={isPending}
                  data-ocid="library.admin.item.editor.recipe.variants.add"
                  className="w-full justify-center gap-2"
                >
                  <Plus />
                  Add variant
                </Button>
              </div>
            </div>

            {/* Bulk Mix — bulk-batch metadata. Equipment + Quality Identifier
                are repeatable text rows (same EditorTextRow wrapper as
                Assembly/Garnish); Yield + Shelf Life are single text inputs
                (nullable on persist when blank). Detection of bulk-mix vs
                drink is automatic from the data — no manual toggle. */}
            <div
              className="grid gap-4 rounded-md border border-dashed border-border bg-muted/30 p-3"
              data-ocid="library.admin.item.editor.recipe.bulk_mix.section"
            >
              <div className="grid gap-0.5">
                <span className="font-heading uppercase text-xs tracking-wider">
                  Bulk Mix
                </span>
                <p className="text-xs text-muted-foreground font-body">
                  Bulk-batch metadata for batch recipes (equipment, yield, shelf
                  life, quality checks). Optional for drink recipes.
                </p>
              </div>

              {/* Equipment — repeatable text rows */}
              <div className="grid gap-2">
                <Label className="font-heading uppercase text-xs tracking-wider">
                  Equipment
                </Label>
                <p className="text-xs text-muted-foreground font-body">
                  Tools needed for the batch (e.g. Cambro, measures, whisk).
                </p>
                <div
                  className="grid gap-2"
                  data-ocid="library.admin.item.editor.recipe.equipment.list"
                >
                  {recipeEquipment.map((row, index) => {
                    const isFirst = index === 0;
                    const isLast = index === recipeEquipment.length - 1;
                    return (
                      <div
                        key={row.id}
                        className="flex items-start gap-2 rounded-md border border-border bg-card p-2"
                        data-ocid={`library.admin.item.editor.recipe.equipment.item.${index + 1}`}
                      >
                        <Input
                          value={row.value}
                          onChange={(e) =>
                            updateTextRow(
                              recipeEquipment,
                              setRecipeEquipment,
                              index,
                              e.target.value,
                            )
                          }
                          placeholder={`Equipment ${index + 1} e.g. Cambro`}
                          aria-label={`Equipment item ${index + 1}`}
                          disabled={isPending}
                          data-ocid={`library.admin.item.editor.recipe.equipment.item.${index + 1}.input`}
                          autoComplete="off"
                          maxLength={80}
                          className="flex-1"
                        />
                        <div className="flex shrink-0 gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              moveTextRow(
                                recipeEquipment,
                                setRecipeEquipment,
                                index,
                                -1,
                              )
                            }
                            disabled={isPending || isFirst}
                            aria-label={`Move equipment ${index + 1} up`}
                            data-ocid={`library.admin.item.editor.recipe.equipment.item.${index + 1}.move_up`}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <ArrowUp />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              moveTextRow(
                                recipeEquipment,
                                setRecipeEquipment,
                                index,
                                1,
                              )
                            }
                            disabled={isPending || isLast}
                            aria-label={`Move equipment ${index + 1} down`}
                            data-ocid={`library.admin.item.editor.recipe.equipment.item.${index + 1}.move_down`}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <ArrowDown />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              removeTextRow(
                                recipeEquipment,
                                setRecipeEquipment,
                                index,
                              )
                            }
                            disabled={isPending}
                            aria-label={`Remove equipment ${index + 1}`}
                            data-ocid={`library.admin.item.editor.recipe.equipment.item.${index + 1}.remove`}
                            className="text-muted-foreground hover:text-primary"
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      addTextRow(recipeEquipment, setRecipeEquipment)
                    }
                    disabled={isPending}
                    data-ocid="library.admin.item.editor.recipe.equipment.add"
                    className="w-full justify-center gap-2"
                  >
                    <Plus />
                    Add equipment
                  </Button>
                </div>
              </div>

              {/* Yield — single text input (nullable) */}
              <div className="grid gap-2">
                <Label
                  htmlFor="recipe-yield"
                  className="font-heading uppercase text-xs tracking-wider"
                >
                  Yield{" "}
                  <span className="text-muted-foreground normal-case">
                    (optional)
                  </span>
                </Label>
                <Input
                  id="recipe-yield"
                  value={recipeYield}
                  onChange={(e) => setRecipeYield(e.target.value)}
                  placeholder="e.g. 2 Gallons + 1 Quart + 1½ cups (300 oz)"
                  disabled={isPending}
                  data-ocid="library.admin.item.editor.recipe.yield_input"
                  autoComplete="off"
                  maxLength={120}
                />
              </div>

              {/* Shelf Life — single text input (nullable) */}
              <div className="grid gap-2">
                <Label
                  htmlFor="recipe-shelf-life"
                  className="font-heading uppercase text-xs tracking-wider"
                >
                  Shelf Life{" "}
                  <span className="text-muted-foreground normal-case">
                    (optional)
                  </span>
                </Label>
                <Input
                  id="recipe-shelf-life"
                  value={recipeShelfLife}
                  onChange={(e) => setRecipeShelfLife(e.target.value)}
                  placeholder="e.g. 5 Days"
                  disabled={isPending}
                  data-ocid="library.admin.item.editor.recipe.shelf_life_input"
                  autoComplete="off"
                  maxLength={40}
                />
              </div>

              {/* Quality Identifier — repeatable text rows */}
              <div className="grid gap-2">
                <Label className="font-heading uppercase text-xs tracking-wider">
                  Quality Identifier
                </Label>
                <p className="text-xs text-muted-foreground font-body">
                  Quality checks to perform on the batch (e.g. Brix, pH, taste).
                </p>
                <div
                  className="grid gap-2"
                  data-ocid="library.admin.item.editor.recipe.quality_identifier.list"
                >
                  {recipeQualityIdentifier.map((row, index) => {
                    const isFirst = index === 0;
                    const isLast = index === recipeQualityIdentifier.length - 1;
                    return (
                      <div
                        key={row.id}
                        className="flex items-start gap-2 rounded-md border border-border bg-card p-2"
                        data-ocid={`library.admin.item.editor.recipe.quality_identifier.item.${index + 1}`}
                      >
                        <Input
                          value={row.value}
                          onChange={(e) =>
                            updateTextRow(
                              recipeQualityIdentifier,
                              setRecipeQualityIdentifier,
                              index,
                              e.target.value,
                            )
                          }
                          placeholder={`Check ${index + 1} e.g. Brix 18-20`}
                          aria-label={`Quality identifier ${index + 1}`}
                          disabled={isPending}
                          data-ocid={`library.admin.item.editor.recipe.quality_identifier.item.${index + 1}.input`}
                          autoComplete="off"
                          maxLength={80}
                          className="flex-1"
                        />
                        <div className="flex shrink-0 gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              moveTextRow(
                                recipeQualityIdentifier,
                                setRecipeQualityIdentifier,
                                index,
                                -1,
                              )
                            }
                            disabled={isPending || isFirst}
                            aria-label={`Move quality identifier ${index + 1} up`}
                            data-ocid={`library.admin.item.editor.recipe.quality_identifier.item.${index + 1}.move_up`}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <ArrowUp />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              moveTextRow(
                                recipeQualityIdentifier,
                                setRecipeQualityIdentifier,
                                index,
                                1,
                              )
                            }
                            disabled={isPending || isLast}
                            aria-label={`Move quality identifier ${index + 1} down`}
                            data-ocid={`library.admin.item.editor.recipe.quality_identifier.item.${index + 1}.move_down`}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <ArrowDown />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              removeTextRow(
                                recipeQualityIdentifier,
                                setRecipeQualityIdentifier,
                                index,
                              )
                            }
                            disabled={isPending}
                            aria-label={`Remove quality identifier ${index + 1}`}
                            data-ocid={`library.admin.item.editor.recipe.quality_identifier.item.${index + 1}.remove`}
                            className="text-muted-foreground hover:text-primary"
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      addTextRow(
                        recipeQualityIdentifier,
                        setRecipeQualityIdentifier,
                      )
                    }
                    disabled={isPending}
                    data-ocid="library.admin.item.editor.recipe.quality_identifier.add"
                    className="w-full justify-center gap-2"
                  >
                    <Plus />
                    Add check
                  </Button>
                </div>
              </div>
            </div>

            {recipeError && (
              <p
                className="text-xs text-primary font-body"
                data-ocid="library.admin.item.editor.recipe.field_error"
              >
                {recipeError}
              </p>
            )}
          </fieldset>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(backTo)}
            disabled={isPending}
            data-ocid="library.admin.item.cancel"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!canSubmit || isPending}
            data-ocid="library.admin.item.save"
          >
            {isPending && <Loader2 className="animate-spin" />}
            {isCreate ? "Create item" : "Save changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}

/* --------------------------- Local fallbacks ----------------------------- */

function AdminsOnly() {
  return (
    <div
      className="mx-auto flex w-full max-w-3xl flex-col items-center justify-center gap-4 px-4 py-20 text-center"
      data-ocid="library.admin.item.admins_only"
    >
      <div className="flex size-14 items-center justify-center rounded-full bg-nav text-primary">
        <Lock />
      </div>
      <div>
        <h2 className="font-display text-2xl uppercase tracking-wide text-foreground">
          Admins only
        </h2>
        <p className="mt-1.5 font-body text-sm text-muted-foreground">
          You need an admin role to manage library items.
        </p>
      </div>
    </div>
  );
}

function ItemNotFound({ positionId }: { positionId: string }) {
  return (
    <div
      className="mx-auto flex w-full max-w-3xl flex-col items-center justify-center gap-4 px-4 py-20 text-center"
      data-ocid="library.admin.item.empty_state"
    >
      <div>
        <h2 className="font-display text-2xl uppercase tracking-wide text-foreground">
          Item not found
        </h2>
        <p className="mt-1.5 font-body text-sm text-muted-foreground">
          This item may have been deleted.
        </p>
      </div>
      <Button
        asChild
        variant="outline"
        data-ocid="library.admin.item.empty_state.back_link"
      >
        <Link to="/admin/positions/$positionId/library" params={{ positionId }}>
          <ArrowLeft className="size-4" />
          Back to library
        </Link>
      </Button>
    </div>
  );
}

function ItemEditorSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-3xl px-4 py-6"
      data-ocid="library.admin.item.loading_state"
    >
      <div className="h-4 w-32 animate-pulse rounded bg-muted" />
      <div className="mt-3 h-8 w-40 animate-pulse rounded bg-muted" />
      <div className="mt-6 grid gap-6">
        <div className="grid gap-2">
          <div className="h-3 w-16 animate-pulse rounded bg-muted/70" />
          <div className="h-9 w-full animate-pulse rounded bg-muted/60" />
        </div>
        <div className="grid gap-2">
          <div className="h-3 w-24 animate-pulse rounded bg-muted/70" />
          <div className="h-9 w-full animate-pulse rounded bg-muted/60" />
        </div>
        <div className="grid gap-2">
          <div className="h-3 w-24 animate-pulse rounded bg-muted/70" />
          <div className="h-24 w-full animate-pulse rounded bg-muted/40" />
        </div>
        <div className="flex justify-end gap-3">
          <div className="h-9 w-20 animate-pulse rounded bg-muted/60" />
          <div className="h-9 w-28 animate-pulse rounded bg-muted/60" />
        </div>
      </div>
    </div>
  );
}
