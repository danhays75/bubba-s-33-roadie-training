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
import type { Category, DetailField, LibraryItem } from "@/types/foundation";
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

    // --- Validate shape ----------------------------------------------------
    const validation = validateImportBlob(parsed);
    if (!validation.ok || !validation.categories) {
      setError(validation.error ?? "Invalid JSON structure.");
      return;
    }
    const categories = validation.categories;
    const warnings = validation.warnings ?? [];
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
              value: f.value,
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
            value: f.value,
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
            Paste a JSON blob of categories and items. The JSON{" "}
            <code className="font-mono text-foreground">position</code> field is
            ignored — import always targets this position&rsquo;s library.
            Existing categories (matched by name) are reused, not duplicated.
            Items matched by title are skipped or updated depending on the mode
            below.
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
              Expected shape:{" "}
              <code className="font-mono">
                {
                  "{ position, categories: [{ name, items: [{ title, fields: [{ label, value }], tags?, seasonal?, notes? }] }] }"
                }
              </code>
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
}`;
