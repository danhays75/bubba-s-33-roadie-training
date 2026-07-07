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

  const createCategory = useCreateCategory();
  const createItem = useCreateItem();
  const updateItem = useUpdateItem();
  const queryClient = useQueryClient();

  // Reset state whenever the dialog opens. Closing discards pasted text and
  // resets the mode selector back to its default ("skip").
  useEffect(() => {
    if (open) {
      setText("");
      setImportMode("skip");
      setError(null);
      setSummary(null);
      setProgress(null);
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

    // --- Execute -----------------------------------------------------------
    let createdCategories = 0;
    let createdItems = 0;
    let updatedItems = 0;
    let skippedItems = 0;

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

          await createItem.mutateAsync({
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
            id: "",
            categoryId,
            title: item.title,
            subtitle: null,
            photo: null,
            details,
            notes: item.notes,
            tags: item.tags,
            seasonal: item.seasonal,
            sortOrder: 0,
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
   * cache and falling back to a direct fetch via the actor when the cache
   * is empty. Returns an empty array if nothing is available yet.
   *
   * Uses the queryClient's getQueryData / fetchQuery so we don't introduce a
   * new hook dependency and stay consistent with the existing
   * ['library-items', categoryId] query key.
   */
  async function loadItemsForCategory(
    categoryId: string,
  ): Promise<LibraryItem[]> {
    const queryKey = ["library-items", categoryId];
    const cached = queryClient.getQueryData<LibraryItem[]>(queryKey);
    if (cached) return cached;
    try {
      const fetched = await queryClient.fetchQuery<LibraryItem[]>({
        queryKey,
        staleTime: 0,
      });
      return fetched ?? [];
    } catch {
      return [];
    }
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
 * Builds the post-import summary line distinguishing all four outcomes:
 * created categories, updated items, created items, skipped items.
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
): string {
  const catWord = createdCategories === 1 ? "category" : "categories";
  const updatedWord = updatedItems === 1 ? "item" : "items";
  const createdWord = createdItems === 1 ? "item" : "items";
  const skippedWord = skippedItems === 1 ? "item" : "items";
  return `Created ${createdCategories} ${catWord}, updated ${updatedItems} ${updatedWord}, created ${createdItems} ${createdWord}, skipped ${skippedItems} ${skippedWord}.`;
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

  return { ok: true, categories };
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
