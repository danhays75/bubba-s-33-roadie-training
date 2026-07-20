import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useBackend } from "@/hooks/useBackend";
import {
  makeDetailFieldId,
  useCreateCategory,
  useCreateItem,
  useUpdateItem,
} from "@/hooks/useLibrary";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import type {
  Category,
  DetailField,
  LibraryItem,
  Recipe,
  RecipeSpec,
  RecipeVariant,
} from "@/types/foundation";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

/**
 * Bulk Import dialog — paste a JSON blob of categories + items and create
 * them in the currently-managed position's Library.
 *
 * Reuses the existing useCreateCategory / useCreateItem / useUpdateItem hooks
 * (no new backend endpoints). The JSON `position` field is ignored — import
 * always targets the position whose Library is currently being managed.
 *
 * Import mode (persists for the duration of the dialog session):
 *   - "skip"   (default): items whose title already exists in the category
 *               are left untouched and counted as skipped.
 *   - "update": items whose title already exists are updated in place via
 *               useUpdateItem — their detail fields, notes, tags, and seasonal
 *               flag are replaced. The existing item's photo and subtitle are
 *               passed through unchanged (backend updateItem overwrites photo,
 *               so existing.photo must be supplied). sortOrder is preserved
 *               automatically by the backend (not in the with-spread).
 *
 * Matching rules:
 *   - category: matched by name against the loaded categories for this
 *     position. Existing category ids are reused; new ones are created with
 *     coverPhoto: null (sort order assigned by the backend).
 *   - item: matched by title against the loaded items for that category.
 *     New items are created with subtitle: null and photo: null (sort order
 *     assigned by the backend).
 *
 * Creation/update runs sequentially per category so returned ids are available
 * before that category's items are processed. If any single call fails, the
 * import stops and reports how many categories/items were created/updated
 * before the failure.
 *
 * On success: invalidates ['library-categories', positionId] and every
 * affected ['library-items', categoryId], shows a sonner toast + inline
 * summary distinguishing all four outcomes (created categories, updated items,
 * created items, skipped items), then closes the dialog and clears the
 * textarea.
 *
 * Styling mirrors CategoryFormDialog (Radix Dialog, dark Bubba's 33 theme,
 * red primary button, sonner toasts).
 */
type ImportMode = "skip" | "update";

export function BulkImportDialog({
  open,
  onOpenChange,
  positionId,
  existingCategories,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  positionId: string;
  /** Currently-loaded categories for this position (name → id lookup). */
  existingCategories: Category[];
}) {
  const [text, setText] = useState("");
  const [importMode, setImportMode] = useState<ImportMode>("skip");
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  // Non-blocking validation warnings (e.g. within-blob duplicate titles per
  // category). Surfaced to the admin before import runs so they know the
  // later duplicates will be skipped deterministically in update mode.
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);

  const createCategory = useCreateCategory();
  const createItem = useCreateItem();
  const updateItem = useUpdateItem();
  const queryClient = useQueryClient();
  const { actor } = useBackend();

  // Reset state whenever the dialog opens. Closing discards pasted text and
  // resets the mode selector back to its default ("skip").
  useEffect(() => {
    if (open) {
      setText("");
      setImportMode("skip");
      setError(null);
      setSummary(null);
      setProgress(null);
      setValidationWarnings([]);
    }
  }, [open]);

  const trimmed = text.trim();
  const importing =
    createCategory.isPending ||
    createItem.isPending ||
    updateItem.isPending ||
    progress !== null;
  const canSubmit = trimmed.length > 0 && !importing;

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (trimmed.length === 0) return;

    setError(null);
    setSummary(null);

    // --- Parse -------------------------------------------------------------
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      setError("Invalid JSON — could not parse the pasted text.");
      return;
    }

    // --- Validate shape (auto-detect categories vs recipes) ---------------
    const detection = detectImportShape(parsed);
    if (!detection.ok) {
      setError(detection.error ?? "Invalid JSON structure.");
      return;
    }

    if (detection.shape === "categories") {
      await runCategoriesImport(detection.categories, detection.warnings ?? []);
      return;
    }

    await runRecipesImport(detection.recipes, detection.warnings ?? []);
  }

  /**
   * Existing categories-import code path. Unchanged from the original
   * implementation — see validateImportBlob + the per-category loop below.
   * Extracted into its own async function so handleImport can dispatch on the
   * detected shape without entangling the two paths.
   */
  async function runCategoriesImport(
    categories: ImportCategory[],
    warnings: string[],
  ) {
    setValidationWarnings(warnings);

    // --- Execute -----------------------------------------------------------
    let createdCategories = 0;
    let createdItems = 0;
    let updatedItems = 0;
    let skippedItems = 0;
    // Within-blob duplicate titles: items whose title was already created
    // earlier in THIS blob (so existingByTitle already has an entry). In
    // update mode these are skipped deterministically rather than issued
    // updateItem with an empty/placeholder id; in skip mode they are folded
    // into skippedItems. Tracked separately so the summary can call them out.
    let skippedDuplicates = 0;

    // Seed the name → id map from the currently-loaded categories so we
    // reuse existing categories instead of duplicating them.
    const categoryIdByName = new Map<string, string>();
    for (const c of existingCategories) {
      categoryIdByName.set(c.name, c.id);
    }
    const touchedCategoryIds = new Set<string>();

    try {
      for (const cat of categories) {
        setProgress(`Importing category: ${cat.name}`);

        // Resolve or create the category.
        let categoryId = categoryIdByName.get(cat.name);
        if (!categoryId) {
          const created = await createCategory.mutateAsync({
            positionId,
            name: cat.name,
            coverPhoto: null,
          });
          categoryId = created.id;
          categoryIdByName.set(cat.name, categoryId);
          createdCategories += 1;
        }
        touchedCategoryIds.add(categoryId);

        // Load existing items for this category (from cache or fetch).
        const existingItems = await loadItemsForCategory(categoryId);
        const existingByTitle = new Map<string, LibraryItem>(
          existingItems.map((i) => [i.title, i]),
        );

        for (const item of cat.items) {
          const existing = existingByTitle.get(item.title);

          if (existing) {
            if (importMode === "skip") {
              skippedItems += 1;
              continue;
            }

            // Update mode guard: if existing.id is empty, this entry is a
            // placeholder pushed earlier in THIS blob (the create branch
            // pushed it after creating the item). The real id was either
            // captured into the placeholder (preferred path) or unavailable
            // (fallback path). Either way we must NOT call updateItem with
            // an empty id — BigInt('') === 0n would mutate item id 0, which
            // is an unrelated item. Skip the within-blob duplicate
            // deterministically and count it so the summary can report it.
            if (existing.id === "") {
              skippedDuplicates += 1;
              continue;
            }

            // Update mode: replace detail fields, notes, tags, and seasonal
            // flag. Pass existing.photo and existing.subtitle through so the
            // backend (which overwrites both) preserves them unchanged.
            // sortOrder is preserved automatically by the backend.
            setProgress(`Updating item: ${item.title} (${cat.name})`);

            const details: DetailField[] = item.fields.map((f) => ({
              id: makeDetailFieldId(),
              fieldLabel: f.label,
              // Sanitize at write time as defense in depth — the read path
              // (RecipeCardPage / FlashcardActivity) also sanitizes before
              // rendering, but storing clean HTML means a future read surface
              // that forgets to sanitize is still safe.
              value: sanitizeHtml(f.value),
            }));

            await updateItem.mutateAsync({
              itemId: existing.id,
              categoryId,
              title: existing.title,
              subtitle: existing.subtitle,
              photo: existing.photo,
              details,
              notes: item.notes,
              tags: item.tags,
              seasonal: item.seasonal,
            });
            updatedItems += 1;
            continue;
          }

          // New item — create as usual with subtitle: null and photo: null.
          setProgress(`Importing item: ${item.title} (${cat.name})`);

          const details: DetailField[] = item.fields.map((f) => ({
            id: makeDetailFieldId(),
            fieldLabel: f.label,
            // Sanitize at write time as defense in depth — mirrors the
            // update-mode branch above. The read path also sanitizes before
            // rendering, but storing clean HTML means a future read surface
            // that forgets to sanitize is still safe.
            value: sanitizeHtml(f.value),
          }));

          // useCreateItem returns toItem(result) — a LibraryItem with a real
          // string id assigned by the backend. Capture that id and push it
          // into existingByTitle so a later same-title item in THIS blob
          // resolves to the real id (and the update branch can safely issue
          // updateItem with it). Only fall back to the id: '' placeholder if
          // the create return is unavailable; in that fallback case the
          // update-branch guard above still skips the duplicate rather than
          // calling updateItem with ''.
          const created = await createItem.mutateAsync({
            categoryId,
            title: item.title,
            subtitle: null,
            photo: null,
            details,
            notes: item.notes,
            tags: item.tags,
            seasonal: item.seasonal,
          });
          existingByTitle.set(item.title, {
            id: created?.id ?? "",
            categoryId,
            title: item.title,
            subtitle: created?.subtitle ?? null,
            photo: created?.photo ?? null,
            details: created?.details ?? details,
            notes: item.notes,
            tags: item.tags,
            seasonal: item.seasonal,
            sortOrder: created?.sortOrder ?? 0,
            recipe: created?.recipe ?? null,
          });
          createdItems += 1;
        }
      }

      // --- Refresh --------------------------------------------------------
      await queryClient.invalidateQueries({
        queryKey: ["library-categories", positionId],
      });
      for (const cid of touchedCategoryIds) {
        await queryClient.invalidateQueries({
          queryKey: ["library-items", cid],
        });
      }

      const message = formatSummary(
        createdCategories,
        updatedItems,
        createdItems,
        skippedItems,
        skippedDuplicates,
      );

      setSummary(message);
      toast.success("Import complete", { description: message });

      // Close the dialog after a brief beat so the inline summary is visible.
      setTimeout(() => {
        onOpenChange(false);
      }, 900);
    } catch (err) {
      const partial = `Created ${createdCategories} ${
        createdCategories === 1 ? "category" : "categories"
      }, updated ${updatedItems} ${
        updatedItems === 1 ? "item" : "items"
      }, created ${createdItems} ${
        createdItems === 1 ? "item" : "items"
      } before the failure.`;
      const description = err instanceof Error ? err.message : undefined;
      setError(`Import stopped: ${description ?? "a call failed"}. ${partial}`);
      toast.error("Import stopped", { description: `${partial}` });

      // Still refresh whatever was created/updated before the failure.
      await queryClient.invalidateQueries({
        queryKey: ["library-categories", positionId],
      });
      for (const cid of touchedCategoryIds) {
        await queryClient.invalidateQueries({
          queryKey: ["library-items", cid],
        });
      }
    } finally {
      setProgress(null);
    }
  }

  /**
   * Recipes-import code path. Auto-detected when the parsed JSON has a
   * top-level `recipes` array. Reuses the same skip/update semantics as the
   * categories path: group recipes by category, look up existing categories
   * by name (creating missing ones with coverPhoto: null), look up existing
   * items by title within the category, and create / update / skip per the
   * import mode.
   *
   * Per-recipe validation runs first; recipes that fail validation are
   * recorded as row-level errors and skipped, but the rest of the blob is
   * still processed. Within-blob duplicate titles in the same category are
   * skipped deterministically (counted as skipped duplicates).
   *
   * Mapping rules:
   *   - lto: true  → seasonal: true plus an 'LTO' tag (added if not present)
   *   - photoUrl  → item photo field
   *   - variants[].label → variants[].variantLabel (label is a reserved
   *     Motoko keyword; the import JSON uses label, the backend uses
   *     variantLabel)
   *
   * The recipe payload is attached to the LibraryItem via createItem /
   * updateItem's optional recipe argument. The item's details array is left
   * empty (recipes carry their structured spec on .recipe, not on .details).
   */
  async function runRecipesImport(recipes: ImportRecipe[], warnings: string[]) {
    setValidationWarnings(warnings);

    let createdCategories = 0;
    let createdRecipes = 0;
    let updatedRecipes = 0;
    let skippedRecipes = 0;
    let skippedDuplicates = 0;
    // Row-level errors are surfaced via validationWarnings (set above from
    // the warnings returned by validateRecipesBlob). The summary appends a
    // row-errors clause when any warnings were recorded.
    const rowErrorCount = warnings.filter((w) => w.includes("Skipped.")).length;

    // Seed the name → id map from the currently-loaded categories so we
    // reuse existing categories instead of duplicating them.
    const categoryIdByName = new Map<string, string>();
    for (const c of existingCategories) {
      categoryIdByName.set(c.name, c.id);
    }
    const touchedCategoryIds = new Set<string>();

    // Group recipes by category so each category is resolved/created once.
    const byCategory = new Map<string, ImportRecipe[]>();
    for (const r of recipes) {
      const list = byCategory.get(r.category) ?? [];
      list.push(r);
      byCategory.set(r.category, list);
    }

    try {
      for (const [categoryName, group] of byCategory) {
        setProgress(`Importing category: ${categoryName}`);

        // Resolve or create the category.
        let categoryId = categoryIdByName.get(categoryName);
        if (!categoryId) {
          const created = await createCategory.mutateAsync({
            positionId,
            name: categoryName,
            coverPhoto: null,
          });
          categoryId = created.id;
          categoryIdByName.set(categoryName, categoryId);
          createdCategories += 1;
        }
        touchedCategoryIds.add(categoryId);

        // Load existing items for this category (from cache or fetch).
        const existingItems = await loadItemsForCategory(categoryId);
        const existingByTitle = new Map<string, LibraryItem>(
          existingItems.map((i) => [i.title, i]),
        );

        for (const recipe of group) {
          const existing = existingByTitle.get(recipe.title);

          if (existing) {
            if (importMode === "skip") {
              skippedRecipes += 1;
              continue;
            }

            // Update mode guard: placeholder id from an earlier create in
            // THIS blob — skip deterministically rather than mutating id 0.
            if (existing.id === "") {
              skippedDuplicates += 1;
              continue;
            }

            setProgress(`Updating recipe: ${recipe.title} (${categoryName})`);

            const payload = buildRecipePayload(recipe);
            const importedTags = buildRecipeTags(recipe);
            const subtitle =
              recipe.subtitle && recipe.subtitle.length > 0
                ? recipe.subtitle
                : existing.subtitle;
            const photo =
              recipe.photoUrl && recipe.photoUrl.length > 0
                ? recipe.photoUrl
                : existing.photo;
            // Preserve the existing recipe's notes and tags when the imported
            // blob omits them — mirrors the item-update branch's preservation
            // pattern (item.notes / item.tags). Only overwrite when the blob
            // explicitly provides them, so re-importing a recipe that lacks
            // notes/tags does not destroy existing notes or non-imported tags.
            const notes =
              recipe.notes === null || recipe.notes === undefined
                ? existing.notes
                : recipe.notes;
            const tags =
              importedTags.length === 0 ? existing.tags : importedTags;

            await updateItem.mutateAsync({
              itemId: existing.id,
              categoryId,
              title: existing.title,
              subtitle,
              photo,
              details: [],
              notes,
              tags,
              seasonal: recipe.lto === true,
              recipe: payload,
            });
            updatedRecipes += 1;
            continue;
          }

          // New recipe — create with the recipe payload attached.
          setProgress(`Importing recipe: ${recipe.title} (${categoryName})`);

          const payload = buildRecipePayload(recipe);
          const tags = buildRecipeTags(recipe);
          const subtitle =
            recipe.subtitle && recipe.subtitle.length > 0
              ? recipe.subtitle
              : null;
          const photo =
            recipe.photoUrl && recipe.photoUrl.length > 0
              ? recipe.photoUrl
              : null;

          const created = await createItem.mutateAsync({
            categoryId,
            title: recipe.title,
            subtitle,
            photo,
            details: [],
            notes: null,
            tags,
            seasonal: recipe.lto === true,
            recipe: payload,
          });
          existingByTitle.set(recipe.title, {
            id: created?.id ?? "",
            categoryId,
            title: recipe.title,
            subtitle: created?.subtitle ?? subtitle,
            photo: created?.photo ?? photo,
            details: created?.details ?? [],
            notes: created?.notes ?? null,
            tags: created?.tags ?? tags,
            seasonal: created?.seasonal ?? recipe.lto === true,
            sortOrder: created?.sortOrder ?? 0,
            recipe: created?.recipe ?? payload,
          });
          createdRecipes += 1;
        }
      }

      // --- Refresh --------------------------------------------------------
      await queryClient.invalidateQueries({
        queryKey: ["library-categories", positionId],
      });
      for (const cid of touchedCategoryIds) {
        await queryClient.invalidateQueries({
          queryKey: ["library-items", cid],
        });
      }

      const message = formatRecipeSummary(
        createdCategories,
        updatedRecipes,
        createdRecipes,
        skippedRecipes,
        skippedDuplicates,
        rowErrorCount,
      );

      setSummary(message);
      toast.success("Recipe import complete", { description: message });

      // Close the dialog after a brief beat so the inline summary is visible.
      setTimeout(() => {
        onOpenChange(false);
      }, 900);
    } catch (err) {
      const partial = `Created ${createdCategories} ${
        createdCategories === 1 ? "category" : "categories"
      }, updated ${updatedRecipes} ${
        updatedRecipes === 1 ? "recipe" : "recipes"
      }, created ${createdRecipes} ${
        createdRecipes === 1 ? "recipe" : "recipes"
      } before the failure.`;
      const description = err instanceof Error ? err.message : undefined;
      setError(`Import stopped: ${description ?? "a call failed"}. ${partial}`);
      toast.error("Recipe import stopped", { description: `${partial}` });

      await queryClient.invalidateQueries({
        queryKey: ["library-categories", positionId],
      });
      for (const cid of touchedCategoryIds) {
        await queryClient.invalidateQueries({
          queryKey: ["library-items", cid],
        });
      }
    } finally {
      setProgress(null);
    }
  }

  /**
   * Builds the frontend Recipe payload from a validated ImportRecipe. Maps
   * variants[].label → variants[].variantLabel (label is a reserved Motoko
   * keyword). Empty garnish / variants arrays are preserved as-is so a recipe
   * with no garnish renders no garnish section and a recipe with no variants
   * renders no variant section.
   *
   * Bulk-mix fields default to match the frontend Recipe type optionality:
   *   - equipment         → [] when absent
   *   - yield             → null when absent or empty string
   *   - shelfLife         → null when absent or empty string
   *   - qualityIdentifier → [] when absent
   */
  function buildRecipePayload(recipe: ImportRecipe): Recipe {
    const specs: RecipeSpec[] = recipe.specs.map((s) => ({
      amount: s.amount,
      ingredient: s.ingredient,
    }));
    const variants: RecipeVariant[] = (recipe.variants ?? []).map((v) => ({
      variantLabel: v.label,
      specs: v.specs.map((s) => ({
        amount: s.amount,
        ingredient: s.ingredient,
      })),
      assembly: v.assembly,
    }));
    const yieldValue =
      typeof recipe.yield === "string" && recipe.yield.length > 0
        ? recipe.yield
        : null;
    const shelfLifeValue =
      typeof recipe.shelfLife === "string" && recipe.shelfLife.length > 0
        ? recipe.shelfLife
        : null;
    return {
      glassware: recipe.glassware,
      specs,
      assembly: recipe.assembly,
      garnish: recipe.garnish ?? [],
      variants,
      equipment: recipe.equipment ?? [],
      yield: yieldValue,
      shelfLife: shelfLifeValue,
      qualityIdentifier: recipe.qualityIdentifier ?? [],
    };
  }

  /**
   * Builds the tags array for a recipe, adding the 'LTO' tag when lto: true
   * is set (if not already present in the recipe's tags).
   */
  function buildRecipeTags(recipe: ImportRecipe): string[] {
    const tags = Array.isArray(recipe.tags)
      ? recipe.tags.filter((t): t is string => typeof t === "string")
      : [];
    if (recipe.lto === true && !tags.includes("LTO")) {
      tags.push("LTO");
    }
    return tags;
  }

  /**
   * Loads the existing items for a category, preferring the React Query
   * cache (fast path) and falling back to a direct fetch via the backend
   * actor when the cache is empty.
   *
   * Mirrors useItemsByCategory in useLibrary.ts: calls
   * actor.getItemsByCategory(BigInt(categoryId)) and maps the result with
   * the same toItem field mapping. The fetched result is written back into
   * the ['library-items', categoryId] cache via setQueryData so subsequent
   * reads in the same session stay consistent with useItemsByCategory.
   *
   * On a load failure (actor is null or the actor call throws), surfaces an
   * error toast and rethrows so the import loop's catch treats it as a hard
   * stop for that category — it does NOT fall through to creating items as
   * if the category were empty (which would silently create duplicates).
   */
  async function loadItemsForCategory(
    categoryId: string,
  ): Promise<LibraryItem[]> {
    const queryKey = ["library-items", categoryId];
    const cached = queryClient.getQueryData<LibraryItem[]>(queryKey);
    if (cached) return cached;

    if (!actor) {
      toast.error("Could not load existing items", {
        description: "Import stopped to avoid duplicates. Please retry.",
      });
      throw new Error("Backend not ready");
    }

    let result: Awaited<ReturnType<typeof actor.getItemsByCategory>>;
    try {
      result = await actor.getItemsByCategory(BigInt(categoryId));
    } catch {
      toast.error("Could not load existing items", {
        description: "Import stopped to avoid duplicates. Please retry.",
      });
      throw new Error(
        `Failed to load existing items for category ${categoryId}`,
      );
    }

    const items = result.map(toItem);
    queryClient.setQueryData(queryKey, items);
    return items;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-card border-border sm:max-w-2xl"
        data-ocid="library.admin.import.dialog"
      >
        <DialogHeader>
          <DialogTitle
            className="font-heading uppercase tracking-wide text-foreground"
            data-ocid="library.admin.import.dialog.title"
          >
            <Upload className="inline size-5 align-text-bottom text-primary" />{" "}
            Import library
          </DialogTitle>
          <DialogDescription>
            Paste a JSON blob of categories and items, or recipes. The top-level
            key (<code className="font-mono text-foreground">categories</code>{" "}
            or <code className="font-mono text-foreground">recipes</code>) is
            auto-detected. The JSON{" "}
            <code className="font-mono text-foreground">position</code> field is
            ignored — import always targets this position&rsquo;s library.
            Existing categories (matched by name) are reused, not duplicated.
            Items or recipes matched by title are skipped or updated depending
            on the mode below.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleImport} className="grid gap-4">
          {/* Import mode selector — persists for the dialog session. */}
          <div className="grid gap-2">
            <Label className="font-heading uppercase text-xs tracking-wider">
              Import mode
            </Label>
            <RadioGroup
              value={importMode}
              onValueChange={(v) => setImportMode(v as ImportMode)}
              className="grid gap-2"
              data-ocid="library.admin.import.dialog.mode.toggle"
            >
              <label
                htmlFor="import-mode-skip"
                className="flex items-start gap-3 rounded-md border border-border bg-library-card px-3 py-2 cursor-pointer hover:bg-muted/40 transition-colors"
              >
                <RadioGroupItem
                  id="import-mode-skip"
                  value="skip"
                  className="mt-0.5"
                  data-ocid="library.admin.import.dialog.mode.skip.radio"
                />
                <span className="grid gap-0.5">
                  <span className="font-body text-sm text-foreground">
                    Skip existing
                  </span>
                  <span className="font-body text-xs text-muted-foreground">
                    Items whose title already exists are left untouched and
                    counted as skipped.
                  </span>
                </span>
              </label>
              <label
                htmlFor="import-mode-update"
                className="flex items-start gap-3 rounded-md border border-border bg-library-card px-3 py-2 cursor-pointer hover:bg-muted/40 transition-colors"
              >
                <RadioGroupItem
                  id="import-mode-update"
                  value="update"
                  className="mt-0.5"
                  data-ocid="library.admin.import.dialog.mode.update.radio"
                />
                <span className="grid gap-0.5">
                  <span className="font-body text-sm text-foreground">
                    Update existing
                  </span>
                  <span className="font-body text-xs text-muted-foreground">
                    Items whose title already exists are updated in place —
                    detail fields, notes, tags, and seasonal flag are replaced.
                    The existing photo and sort order are preserved.
                  </span>
                </span>
              </label>
            </RadioGroup>
          </div>

          {/* JSON textarea */}
          <div className="grid gap-2">
            <Label
              htmlFor="import-json"
              className="font-heading uppercase text-xs tracking-wider"
            >
              JSON
            </Label>
            <Textarea
              id="import-json"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={PLACEHOLDER}
              aria-invalid={!!error}
              aria-describedby={error ? "import-error" : undefined}
              data-ocid="library.admin.import.dialog.json_input"
              autoComplete="off"
              spellCheck={false}
              className="min-h-48 font-mono text-xs"
              disabled={importing}
            />
            <p className="font-body text-xs text-muted-foreground">
              Expected shape (auto-detected by the top-level key):{" "}
              <code className="font-mono">
                {
                  "{ position, categories: [{ name, items: [{ title, fields: [{ label, value }], tags?, seasonal?, notes? }] }] }"
                }
              </code>{" "}
              or{" "}
              <code className="font-mono">
                {
                  "{ position, recipes: [{ title, category, glassware, specs: [{ amount, ingredient }], assembly: [string], garnish?: [string], variants?: [{ label, specs: [{ amount, ingredient }], assembly: [string] }], equipment?: [string], yield?: string, shelfLife?: string, qualityIdentifier?: [string] }] }"
                }
              </code>
              . A recipe is a bulk mix when glassware is empty and either yield
              or equipment is set; bulk mixes omit glassware (or send an empty
              string) and the drink-only glassware requirement is waived.
            </p>
          </div>

          {/* Inline error */}
          {error && (
            <p
              id="import-error"
              className="text-xs text-primary font-body"
              data-ocid="library.admin.import.dialog.error_state"
              role="alert"
            >
              {error}
            </p>
          )}

          {/* Inline validation warnings (non-blocking, surfaced before import) */}
          {validationWarnings.length > 0 && (
            <output
              className="text-xs text-muted-foreground font-body rounded-md border border-border bg-muted/40 px-3 py-2"
              data-ocid="library.admin.import.dialog.warning_state"
            >
              <p className="text-foreground mb-1">
                Warnings — later duplicates will be skipped in update mode:
              </p>
              <ul className="list-disc pl-4 grid gap-0.5">
                {validationWarnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </output>
          )}

          {/* Inline summary (success) */}
          {summary && (
            <output
              className="text-xs text-foreground font-body rounded-md border border-border bg-library-card px-3 py-2"
              data-ocid="library.admin.import.dialog.success_state"
            >
              {summary}
            </output>
          )}

          {/* Progress indicator */}
          {progress && (
            <output
              className="text-xs text-muted-foreground font-body flex items-center gap-2"
              data-ocid="library.admin.import.dialog.loading_state"
              aria-live="polite"
            >
              <Loader2 className="size-3 animate-spin" />
              {progress}
            </output>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={importing}
              data-ocid="library.admin.import.dialog.cancel_button"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit}
              data-ocid="library.admin.import.dialog.submit_button"
            >
              {importing && <Loader2 className="animate-spin" />}
              Import
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------- Summary -------------------------------- */

/**
 * Translates a Candid LibraryItem (bigint ids) to the local string-id shape.
 *
 * Replicates the toItem mapper from useLibrary.ts exactly — same backend
 * record shape, same field mapping, same makeDetailFieldId() call for the
 * frontend-only detail-field id. Kept local (rather than importing toItem)
 * because toItem is not exported from useLibrary.ts; the mapping must stay
 * in sync with that source of truth.
 */
function toItem(i: {
  id: bigint;
  categoryId: bigint;
  title: string;
  subtitle?: string;
  photo?: string;
  details: Array<{ fieldLabel: string; value: string }>;
  notes?: string;
  tags: Array<string>;
  seasonal: boolean;
  sortOrder: bigint;
  recipe?: {
    glassware: string;
    specs: Array<{ amount: string; ingredient: string }>;
    assembly: Array<string>;
    garnish: Array<string>;
    equipment: string[];
    yield?: string;
    shelfLife?: string;
    qualityIdentifier: string[];
    variants: Array<{
      variantLabel: string;
      specs: Array<{ amount: string; ingredient: string }>;
      assembly: Array<string>;
    }>;
  };
}): LibraryItem {
  const details: DetailField[] = (i.details ?? []).map((d) => ({
    id: makeDetailFieldId(),
    fieldLabel: d.fieldLabel,
    value: d.value,
  }));
  return {
    id: i.id.toString(),
    categoryId: i.categoryId.toString(),
    title: i.title,
    subtitle: i.subtitle ?? null,
    photo: i.photo ?? null,
    details,
    notes: i.notes ?? null,
    tags: i.tags ?? [],
    seasonal: i.seasonal,
    sortOrder: Number(i.sortOrder),
    recipe: i.recipe
      ? {
          glassware: i.recipe.glassware,
          specs: i.recipe.specs.map((s) => ({
            amount: s.amount,
            ingredient: s.ingredient,
          })),
          assembly: i.recipe.assembly,
          garnish: i.recipe.garnish,
          equipment: i.recipe.equipment ?? [],
          yield: i.recipe.yield ?? null,
          shelfLife: i.recipe.shelfLife ?? null,
          qualityIdentifier: i.recipe.qualityIdentifier ?? [],
          variants: i.recipe.variants.map((v) => ({
            variantLabel: v.variantLabel,
            specs: v.specs.map((s) => ({
              amount: s.amount,
              ingredient: s.ingredient,
            })),
            assembly: v.assembly,
          })),
        }
      : null,
  };
}

/**
 * Builds the post-import summary line distinguishing all four outcomes:
 * created categories, updated items, created items, skipped items. When
 * within-blob duplicate titles were skipped in update mode, a fifth clause
 * calls them out so the admin knows they were dropped deterministically
 * rather than silently.
 *
 * In Skip mode the updated count is always 0; in Update mode the skipped
 * count is always 0 for matching titles. The summary is rendered the same
 * way regardless of mode — the counts themselves reflect the chosen mode.
 */
function formatSummary(
  createdCategories: number,
  updatedItems: number,
  createdItems: number,
  skippedItems: number,
  skippedDuplicates: number,
): string {
  const catWord = createdCategories === 1 ? "category" : "categories";
  const updatedWord = updatedItems === 1 ? "item" : "items";
  const createdWord = createdItems === 1 ? "item" : "items";
  const skippedWord = skippedItems === 1 ? "item" : "items";
  const dupWord = skippedDuplicates === 1 ? "item" : "items";
  const base = `Created ${createdCategories} ${catWord}, updated ${updatedItems} ${updatedWord}, created ${createdItems} ${createdWord}, skipped ${skippedItems} ${skippedWord}.`;
  if (skippedDuplicates > 0) {
    return `${base} Skipped ${skippedDuplicates} within-blob duplicate ${dupWord} (same title earlier in this import).`;
  }
  return base;
}

/* ------------------------------- Validation ------------------------------- */

interface ImportField {
  label: string;
  value: string;
}

interface ImportItem {
  title: string;
  fields: ImportField[];
  tags: string[];
  seasonal: boolean;
  notes: string;
}

interface ImportCategory {
  name: string;
  items: ImportItem[];
}

interface ValidationResult {
  ok: boolean;
  error?: string;
  categories?: ImportCategory[];
  /**
   * Non-blocking warnings surfaced to the admin before import runs. Currently
   * used to report within-blob duplicate titles per category: in update mode
   * the later duplicates are skipped deterministically (counted in the
   * summary), so the admin should know up-front rather than discover it in
   * the post-import summary.
   */
  warnings?: string[];
}

/**
 * Validates the parsed JSON blob has the expected shape:
 *   { categories: [{ name, items: [{ title, fields: [{ label, value }] }] }] }
 *
 * Defaults applied per the import spec:
 *   - item.tags      → [] when absent
 *   - item.seasonal  → false when absent
 *   - item.notes     → '' when absent
 *   - field.value    → '' when absent (empty-value fields are still created)
 *
 * The top-level `position` field is intentionally ignored.
 */
function validateImportBlob(parsed: unknown): ValidationResult {
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return {
      ok: false,
      error: "JSON must be an object with a 'categories' array.",
    };
  }
  const root = parsed as Record<string, unknown>;
  if (!Array.isArray(root.categories)) {
    return { ok: false, error: "Missing or invalid 'categories' array." };
  }

  const categories: ImportCategory[] = [];
  const warnings: string[] = [];
  for (let i = 0; i < root.categories.length; i += 1) {
    const rawCat = root.categories[i];
    if (
      typeof rawCat !== "object" ||
      rawCat === null ||
      Array.isArray(rawCat)
    ) {
      return { ok: false, error: `categories[${i}] must be an object.` };
    }
    const cat = rawCat as Record<string, unknown>;
    if (typeof cat.name !== "string" || cat.name.trim().length === 0) {
      return {
        ok: false,
        error: `categories[${i}].name must be a non-empty string.`,
      };
    }
    if (!Array.isArray(cat.items)) {
      return { ok: false, error: `categories[${i}].items must be an array.` };
    }

    const items: ImportItem[] = [];
    // Track titles seen earlier in THIS category's item list so within-blob
    // duplicates can be reported as warnings. The import loop skips later
    // duplicates deterministically (counted in the summary), so the admin
    // should know up-front.
    const seenTitles = new Set<string>();
    for (let j = 0; j < cat.items.length; j += 1) {
      const rawItem = cat.items[j];
      if (
        typeof rawItem !== "object" ||
        rawItem === null ||
        Array.isArray(rawItem)
      ) {
        return {
          ok: false,
          error: `categories[${i}].items[${j}] must be an object.`,
        };
      }
      const item = rawItem as Record<string, unknown>;
      if (typeof item.title !== "string" || item.title.trim().length === 0) {
        return {
          ok: false,
          error: `categories[${i}].items[${j}].title must be a non-empty string.`,
        };
      }
      if (seenTitles.has(item.title)) {
        warnings.push(
          `categories[${i}] ("${cat.name}"): duplicate title "${item.title}" at items[${j}] — the later occurrence will be skipped in update mode.`,
        );
      } else {
        seenTitles.add(item.title);
      }
      if (!Array.isArray(item.fields)) {
        return {
          ok: false,
          error: `categories[${i}].items[${j}].fields must be an array.`,
        };
      }

      const fields: ImportField[] = [];
      for (let k = 0; k < item.fields.length; k += 1) {
        const rawField = item.fields[k];
        if (
          typeof rawField !== "object" ||
          rawField === null ||
          Array.isArray(rawField)
        ) {
          return {
            ok: false,
            error: `categories[${i}].items[${j}].fields[${k}] must be an object.`,
          };
        }
        const field = rawField as Record<string, unknown>;
        if (
          typeof field.label !== "string" ||
          field.label.trim().length === 0
        ) {
          return {
            ok: false,
            error: `categories[${i}].items[${j}].fields[${k}].label must be a non-empty string.`,
          };
        }
        const value = typeof field.value === "string" ? field.value : "";
        fields.push({ label: field.label, value });
      }

      const tags = Array.isArray(item.tags)
        ? item.tags.filter((t): t is string => typeof t === "string")
        : [];
      const seasonal = item.seasonal === true;
      const notes = typeof item.notes === "string" ? item.notes : "";

      items.push({ title: item.title, fields, tags, seasonal, notes });
    }

    categories.push({ name: cat.name, items });
  }

  return { ok: true, categories, warnings };
}

/* --------------------------- Shape auto-detection ------------------------ */

/**
 * Discriminated result of shape auto-detection. The parsed JSON must have
 * either a top-level `categories` array (existing categories-import path) or
 * a top-level `recipes` array (new recipes-import path). If neither key is
 * present (or the value is not an array), the blob is rejected with a shape
 * error before any per-row validation runs.
 *
 * `categories` is set when the categories path is detected; `recipes` is set
 * when the recipes path is detected. The two are mutually exclusive — a blob
 * with both keys is rejected as ambiguous so the admin fixes the JSON
 * rather than silently picking one path.
 */
type DetectionResult =
  | { ok: false; error: string }
  | {
      ok: true;
      shape: "categories";
      categories: ImportCategory[];
      warnings: string[];
    }
  | {
      ok: true;
      shape: "recipes";
      recipes: ImportRecipe[];
      warnings: string[];
    };

/**
 * Auto-detects the import shape from the parsed JSON's top-level keys and
 * dispatches to the matching validator. The existing categories path is
 * unchanged; the recipes path is new.
 *
 * Detection rules:
 *   - has `recipes` array (and no `categories`) → recipes path
 *   - has `categories` array (and no `recipes`) → categories path
 *   - has both → ambiguous, rejected
 *   - has neither → shape error
 *
 * Unknown top-level keys are intentionally ignored. In particular a
 * `note` key is treated as a human comment and skipped — a blob like
 * `{ "note": "...", "recipes": [...] }` is valid and dispatches to the
 * recipes path. Only `categories` and `recipes` participate in shape
 * detection; everything else (including `note` and the legacy `position`
 * field) is silently dropped.
 */
function detectImportShape(parsed: unknown): DetectionResult {
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { ok: false, error: "JSON must be an object." };
  }
  const root = parsed as Record<string, unknown>;
  const hasCategories = Array.isArray(root.categories);
  const hasRecipes = Array.isArray(root.recipes);
  // `note` and any other unknown top-level keys are intentionally ignored —
  // only `categories` and `recipes` drive shape detection.

  if (hasCategories && hasRecipes) {
    return {
      ok: false,
      error:
        "Ambiguous JSON: provide either 'categories' or 'recipes', not both.",
    };
  }
  if (hasRecipes) {
    const recipesArray = root.recipes as unknown[];
    const result = validateRecipesBlob(recipesArray);
    if (!result.ok)
      return { ok: false, error: result.error ?? "Invalid recipes JSON." };
    return {
      ok: true,
      shape: "recipes",
      recipes: result.recipes ?? [],
      warnings: result.warnings ?? [],
    };
  }
  if (hasCategories) {
    const result = validateImportBlob(parsed);
    if (!result.ok || !result.categories) {
      return { ok: false, error: result.error ?? "Invalid JSON structure." };
    }
    return {
      ok: true,
      shape: "categories",
      categories: result.categories,
      warnings: result.warnings ?? [],
    };
  }
  return {
    ok: false,
    error: "JSON must have a top-level 'categories' or 'recipes' array.",
  };
}

/* --------------------------- Recipes validation -------------------------- */

interface ImportRecipeSpec {
  amount: string;
  ingredient: string;
}

interface ImportRecipeVariant {
  label: string;
  specs: ImportRecipeSpec[];
  assembly: string[];
}

interface ImportRecipe {
  category: string;
  title: string;
  subtitle?: string;
  photoUrl?: string;
  lto?: boolean;
  tags?: string[];
  /**
   * Optional notes for the recipe item. When absent (or null/undefined) the
   * update path preserves the existing recipe's notes — mirroring the
   * item-update branch's preservation pattern. Only overwrite when the blob
   * explicitly provides a value.
   */
  notes?: string;
  /**
   * Glassware. Required for drinks; optional for bulk mixes (a recipe is a
   * bulk mix when its `yield` is non-empty OR its `equipment` array is
   * non-empty). For bulk mixes without glassware, send an empty string —
   * buildRecipePayload passes it straight through and the backend accepts
   * empty Text. The field type stays `string` (not optional) so the empty
   * string default is preserved.
   */
  glassware: string;
  specs: ImportRecipeSpec[];
  assembly: string[];
  garnish?: string[];
  variants?: ImportRecipeVariant[];
  /**
   * Bulk-mix metadata. All optional in the import JSON — a recipe without them
   * is still valid. Mirrors the backend Recipe fields; buildRecipePayload
   * applies the matching defaults (equipment/qualityIdentifier → [],
   * yield/shelfLife → null) when absent or empty.
   */
  equipment?: string[];
  yield?: string;
  shelfLife?: string;
  qualityIdentifier?: string[];
}

interface RecipesValidationResult {
  ok: boolean;
  error?: string;
  recipes?: ImportRecipe[];
  warnings?: string[];
}

/**
 * Validates the parsed `recipes` array. Per-recipe validation collects
 * row-level errors WITHOUT aborting the whole blob — invalid recipes are
 * dropped from the returned array but the rest are still imported. The
 * caller (runRecipesImport) processes only the valid recipes.
 *
 * Required per recipe: title, category, specs (non-empty, each row needs both
 * amount and ingredient), assembly (non-empty array). Glassware is required for
 * drinks but optional for bulk mixes — a recipe is a bulk mix when its `yield`
 * is non-empty OR its `equipment` array is non-empty (matching the isBulkMix
 * rule in RecipeCardPage.tsx, computed locally here to avoid a cross-module
 * dependency). For bulk mixes the required fields are only title, category, and
 * specs; an empty glassware string is sent through unchanged.
 * Optional: subtitle, photoUrl, tags, variants, garnish, equipment, yield,
 * shelfLife, qualityIdentifier. The bulk-mix fields are all optional — a
 * recipe without them is still valid; buildRecipePayload applies the
 * matching defaults ([] / null) when absent or empty.
 *
 * Within-blob duplicate titles in the same category are reported as
 * warnings (the import loop skips later duplicates deterministically).
 */
function validateRecipesBlob(rawRecipes: unknown[]): RecipesValidationResult {
  const recipes: ImportRecipe[] = [];
  const warnings: string[] = [];
  // Track (category, title) pairs seen earlier in THIS blob so within-blob
  // duplicates can be reported as warnings and skipped deterministically.
  const seenPairs = new Set<string>();

  for (let i = 0; i < rawRecipes.length; i += 1) {
    const raw = rawRecipes[i];
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      return { ok: false, error: `recipes[${i}] must be an object.` };
    }
    const r = raw as Record<string, unknown>;

    const title = typeof r.title === "string" ? r.title.trim() : "";
    const category = typeof r.category === "string" ? r.category.trim() : "";
    const glassware = typeof r.glassware === "string" ? r.glassware.trim() : "";

    // Bulk-mix detection (local, identical to RecipeCardPage.isBulkMix):
    // a real drink always has a glass; a bulk mix never does. So the
    // discriminator requires empty glassware AND (yield non-empty OR equipment
    // non-empty). Kept inline to avoid a cross-module dependency. A drink with
    // an equipment note still validates as a drink (glassware required).
    const yieldValue = typeof r.yield === "string" ? r.yield.trim() : "";
    const equipmentValue = Array.isArray(r.equipment) ? r.equipment : [];
    const isBulkMix =
      glassware.length === 0 &&
      (yieldValue.length > 0 || equipmentValue.length > 0);

    // Collect row-level errors for this recipe without aborting the blob.
    const rowErrors: string[] = [];
    if (title.length === 0) rowErrors.push("title is required");
    if (category.length === 0) rowErrors.push("category is required");
    if (!isBulkMix && glassware.length === 0) {
      rowErrors.push("glassware is required");
    }

    if (!Array.isArray(r.specs) || r.specs.length === 0) {
      rowErrors.push("specs must be a non-empty array");
    } else {
      for (let j = 0; j < r.specs.length; j += 1) {
        const s = r.specs[j];
        if (typeof s !== "object" || s === null || Array.isArray(s)) {
          rowErrors.push(`specs[${j}] must be an object`);
          continue;
        }
        const sr = s as Record<string, unknown>;
        const amount = typeof sr.amount === "string" ? sr.amount.trim() : "";
        const ingredient =
          typeof sr.ingredient === "string" ? sr.ingredient.trim() : "";
        if (amount.length === 0 || ingredient.length === 0) {
          rowErrors.push(`specs[${j}] needs both amount and ingredient`);
        }
      }
    }

    if (!Array.isArray(r.assembly) || r.assembly.length === 0) {
      rowErrors.push("assembly must be a non-empty array");
    }

    // If this recipe has row-level errors, record them and skip it but
    // continue validating the rest of the blob.
    if (rowErrors.length > 0) {
      const label = title.length > 0 ? `"${title}"` : `recipes[${i}]`;
      warnings.push(`${label}: ${rowErrors.join("; ")}. Skipped.`);
      continue;
    }

    // Re-collect validated specs (we know they're all valid here).
    const specs: ImportRecipeSpec[] = (
      r.specs as Array<Record<string, unknown>>
    ).map((s) => ({
      amount: (s.amount as string).trim(),
      ingredient: (s.ingredient as string).trim(),
    }));

    const assembly = (r.assembly as unknown[]).filter(
      (a): a is string => typeof a === "string",
    );

    const garnish = Array.isArray(r.garnish)
      ? r.garnish.filter((g): g is string => typeof g === "string")
      : undefined;

    let variants: ImportRecipeVariant[] | undefined;
    if (Array.isArray(r.variants)) {
      variants = [];
      for (let v = 0; v < r.variants.length; v += 1) {
        const rv = r.variants[v];
        if (typeof rv !== "object" || rv === null || Array.isArray(rv)) {
          warnings.push(
            `"${title}" variants[${v}] must be an object. Variant skipped.`,
          );
          continue;
        }
        const rvr = rv as Record<string, unknown>;
        const vLabel = typeof rvr.label === "string" ? rvr.label.trim() : "";
        if (vLabel.length === 0) {
          warnings.push(
            `"${title}" variants[${v}].label must be a non-empty string. Variant skipped.`,
          );
          continue;
        }
        if (!Array.isArray(rvr.specs)) {
          warnings.push(
            `"${title}" variants[${v}].specs must be an array. Variant skipped.`,
          );
          continue;
        }
        const vSpecs: ImportRecipeSpec[] = [];
        let vSpecsOk = true;
        for (let k = 0; k < rvr.specs.length; k += 1) {
          const vs = rvr.specs[k];
          if (typeof vs !== "object" || vs === null || Array.isArray(vs)) {
            vSpecsOk = false;
            warnings.push(
              `"${title}" variants[${v}].specs[${k}] must be an object. Variant skipped.`,
            );
            break;
          }
          const vsr = vs as Record<string, unknown>;
          const vAmount =
            typeof vsr.amount === "string" ? vsr.amount.trim() : "";
          const vIngredient =
            typeof vsr.ingredient === "string" ? vsr.ingredient.trim() : "";
          if (vAmount.length === 0 || vIngredient.length === 0) {
            vSpecsOk = false;
            warnings.push(
              `"${title}" variants[${v}].specs[${k}] needs both amount and ingredient. Variant skipped.`,
            );
            break;
          }
          vSpecs.push({ amount: vAmount, ingredient: vIngredient });
        }
        if (!vSpecsOk) continue;
        if (vSpecs.length === 0) {
          warnings.push(
            `"${title}" variants[${v}].specs must be non-empty. Variant skipped.`,
          );
          continue;
        }
        if (!Array.isArray(rvr.assembly)) {
          warnings.push(
            `"${title}" variants[${v}].assembly must be an array. Variant skipped.`,
          );
          continue;
        }
        const vAssembly = rvr.assembly.filter(
          (a): a is string => typeof a === "string",
        );
        variants.push({
          label: vLabel,
          specs: vSpecs,
          assembly: vAssembly,
        });
      }
    }

    // Within-blob duplicate detection (category + title).
    const pairKey = `${category}\u0000${title}`;
    if (seenPairs.has(pairKey)) {
      warnings.push(
        `Duplicate recipe "${title}" in category "${category}" at recipes[${i}] — the later occurrence will be skipped.`,
      );
      continue;
    }
    seenPairs.add(pairKey);

    recipes.push({
      category,
      title,
      subtitle:
        typeof r.subtitle === "string" && r.subtitle.length > 0
          ? r.subtitle
          : undefined,
      photoUrl:
        typeof r.photoUrl === "string" && r.photoUrl.length > 0
          ? r.photoUrl
          : undefined,
      lto: r.lto === true,
      tags: Array.isArray(r.tags)
        ? r.tags.filter((t): t is string => typeof t === "string")
        : undefined,
      notes: typeof r.notes === "string" ? r.notes : undefined,
      glassware,
      specs,
      assembly,
      garnish,
      variants,
      // Bulk-mix metadata — all optional. Non-string entries in the array
      // fields are filtered out; non-string scalars are dropped to undefined.
      // buildRecipePayload applies the final defaults ([] / null).
      equipment: Array.isArray(r.equipment)
        ? r.equipment.filter((e): e is string => typeof e === "string")
        : undefined,
      yield:
        typeof r.yield === "string" && r.yield.length > 0 ? r.yield : undefined,
      shelfLife:
        typeof r.shelfLife === "string" && r.shelfLife.length > 0
          ? r.shelfLife
          : undefined,
      qualityIdentifier: Array.isArray(r.qualityIdentifier)
        ? r.qualityIdentifier.filter((q): q is string => typeof q === "string")
        : undefined,
    });
  }

  return { ok: true, recipes, warnings };
}

/* --------------------------- Recipe summary ------------------------------ */

/**
 * Builds the post-recipe-import summary line. Mirrors formatSummary but
 * counts recipes (not items) and appends a row-level errors clause when any
 * recipes were dropped during validation.
 */
function formatRecipeSummary(
  createdCategories: number,
  updatedRecipes: number,
  createdRecipes: number,
  skippedRecipes: number,
  skippedDuplicates: number,
  rowErrorCount: number,
): string {
  const catWord = createdCategories === 1 ? "category" : "categories";
  const updatedWord = updatedRecipes === 1 ? "recipe" : "recipes";
  const createdWord = createdRecipes === 1 ? "recipe" : "recipes";
  const skippedWord = skippedRecipes === 1 ? "recipe" : "recipes";
  const dupWord = skippedDuplicates === 1 ? "recipe" : "recipes";
  let base = `Created ${createdCategories} ${catWord}, updated ${updatedRecipes} ${updatedWord}, created ${createdRecipes} ${createdWord}, skipped ${skippedRecipes} ${skippedWord}.`;
  if (skippedDuplicates > 0) {
    base += ` Skipped ${skippedDuplicates} within-blob duplicate ${dupWord} (same title earlier in this import).`;
  }
  if (rowErrorCount > 0) {
    base += ` ${rowErrorCount} ${
      rowErrorCount === 1 ? "recipe was" : "recipes were"
    } skipped due to validation errors.`;
  }
  return base;
}

const PLACEHOLDER = `{
  "position": "Bartender",
  "categories": [
    {
      "name": "Cocktails",
      "items": [
        {
          "title": "Old Fashioned",
          "fields": [
            { "label": "SPIRIT", "value": "Bourbon" },
            { "label": "GLASS", "value": "Rocks" }
          ],
          "tags": ["classic"],
          "seasonal": false,
          "notes": "Stirred, never shaken."
        }
      ]
    }
  ]
}

// Or import recipes directly (auto-detected by the "recipes" key):
{
  "position": "Bartender",
  "recipes": [
    {
      "title": "Old Fashioned",
      "category": "Cocktails",
      "glassware": "Rocks",
      "specs": [
        { "amount": "2 oz", "ingredient": "Bourbon" },
        { "amount": "0.25 oz", "ingredient": "Simple Syrup" },
        { "amount": "2 dashes", "ingredient": "Angostura Bitters" }
      ],
      "assembly": [
        "Stir all ingredients over ice.",
        "Express orange peel over the glass."
      ],
      "garnish": ["Orange peel"],
      "variants": [
        {
          "label": "Oaxacan",
          "specs": [
            { "amount": "1.5 oz", "ingredient": "Mezcal" },
            { "amount": "0.5 oz", "ingredient": "Reposado Tequila" },
            { "amount": "0.25 oz", "ingredient": "Agave Syrup" },
            { "amount": "2 dashes", "ingredient": "Angostura Bitters" }
          ],
          "assembly": ["Stir over ice and strain into a rocks glass."]
        }
      ]
    },
    {
      "title": "House Sour Mix",
      "category": "Bulk Mixes",
      "glassware": "",
      "specs": [
        { "amount": "750 ml", "ingredient": "Fresh Lemon Juice" },
        { "amount": "750 ml", "ingredient": "Simple Syrup" },
        { "amount": "375 ml", "ingredient": "Egg White" }
      ],
      "assembly": [
        "Combine all ingredients in a sealed container.",
        "Refrigerate and shake before use."
      ],
      "equipment": ["Cambro", "Whisk"],
      "yield": "1.875 L",
      "shelfLife": "48 hours refrigerated",
      "qualityIdentifier": ["batch-number"]
    }
  ]
}`;
