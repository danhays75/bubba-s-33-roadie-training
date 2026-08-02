import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useBackend } from "@/hooks/useBackend";
import { useCategoriesByPosition, useUpdateItem } from "@/hooks/useLibrary";
import { usePhotoUpload } from "@/hooks/usePhotoUpload";
import type { LibraryItem } from "@/types/foundation";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Download,
  ImagePlus,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, DragEvent, ReactElement } from "react";
import { toast } from "sonner";

/**
 * RecipePhotosDialog — bulk photo-attach tool for a position's Library.
 *
 * Opened from AdminLibraryManager via the "Recipe Photos" button next to
 * Import. The admin drops or selects multiple image files; each is uploaded
 * to object storage via the existing usePhotoUpload / StorageClient flow,
 * then matched to a LibraryItem by filename → title (case-insensitive,
 * ignoring punctuation and spaces). Matched items without an existing photo
 * are attached immediately; matched items that already have a photo are
 * held behind a batch confirm so existing photos are never overwritten
 * without explicit confirmation. Unmatched files are listed as
 * downloadable + retryable so the admin can rename and re-drop them.
 *
 * Mirrors the beverage-recipe BulkImportDialog patterns: Radix Dialog, dark
 * Bubba's 33 theme, sonner toasts, sequential per-file processing, React
 * Query cache invalidation on success.
 *
 * Props:
 *   - positionId: the position whose library the photos tool targets.
 *   - onClose: dismiss the dialog.
 *
 * The dialog is rendered conditionally by the parent (only when open), so
 * this component is always mounted in an open state — there is no `open`
 * prop to toggle.
 */

/** Per-file upload + match status. */
type FileStatus =
  | "pending"
  | "uploading"
  | "matched"
  | "needs-confirm"
  | "unmatched"
  | "attached"
  | "error";

interface FileEntry {
  /** Stable frontend-only id for React keys. */
  id: string;
  file: File;
  /** Object URL for the in-browser preview / download link. Revoked on unmount. */
  objectUrl: string;
  status: FileStatus;
  /** Durable gateway URL returned by usePhotoUpload once uploaded. */
  uploadedUrl: string | null;
  /** Matched LibraryItem (when status is matched / needs-confirm / attached). */
  item: LibraryItem | null;
  /** Status message (error detail, match target title, etc.). */
  message: string | null;
}

/**
 * Normalizes a string for filename → title matching: lowercase, strip the
 * file extension, remove all punctuation and whitespace. E.g.
 *   "bubba_s_nachos.jpeg" → "bubbasnachos"
 *   "Bubba's Nachos"     → "bubbasnachos"
 */
function normalizeForMatch(s: string): string {
  // Strip extension only when the string looks like a filename (last dot).
  const noExt = s.replace(/\.[^.]+$/, "");
  return noExt.toLowerCase().replace(/[^a-z0-9]/g, "");
}

let fileEntryCounter = 0;
function makeFileEntryId(): string {
  fileEntryCounter += 1;
  return `photo-${Date.now().toString(36)}-${fileEntryCounter}`;
}

export function RecipePhotosDialog({
  positionId,
  onClose,
}: {
  positionId: string;
  onClose: () => void;
}): ReactElement {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  /** Items awaiting overwrite confirmation (already uploaded + matched). */
  const [_pendingOverwrites, setPendingOverwrites] = useState<LibraryItem[]>(
    [],
  );
  const [attachedCount, setAttachedCount] = useState(0);
  const [matchedCount, setMatchedCount] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  /** Track object URLs so we can revoke them on unmount / clear. */
  const objectUrlsRef = useRef<string[]>([]);

  const { actor } = useBackend();
  const { data: categories } = useCategoriesByPosition(positionId);
  const updateItem = useUpdateItem();
  const { uploadPhoto } = usePhotoUpload();
  const queryClient = useQueryClient();

  // Revoke all object URLs on unmount.
  useEffect(() => {
    return () => {
      for (const url of objectUrlsRef.current) {
        URL.revokeObjectURL(url);
      }
      objectUrlsRef.current = [];
    };
  }, []);

  const orderedCategories = useMemo(
    () =>
      [...(categories ?? [])].sort(
        (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
      ),
    [categories],
  );

  /**
   * Loads every LibraryItem for this position by fetching items per category
   * (preferring the React Query cache, falling back to a direct actor call).
   * Mirrors BulkImportDialog.loadItemsForCategory. Returns a flat list.
   */
  const loadAllItems = useCallback(async (): Promise<LibraryItem[]> => {
    if (orderedCategories.length === 0) return [];
    const all: LibraryItem[] = [];
    for (const cat of orderedCategories) {
      const queryKey = ["library-items", cat.id];
      const cached = queryClient.getQueryData<LibraryItem[]>(queryKey);
      if (cached) {
        all.push(...cached);
        continue;
      }
      if (!actor) continue;
      try {
        const result = await actor.getItemsByCategory(BigInt(cat.id));
        // Map minimally — we only need id, categoryId, title, photo, and the
        // fields updateItem requires. Reuse the cache shape by writing back.
        const mapped = result.map((i) => ({
          id: i.id.toString(),
          categoryId: i.categoryId.toString(),
          title: i.title,
          subtitle: i.subtitle ?? null,
          photo: i.photo ?? null,
          details: (i.details ?? []).map((d) => ({
            id: `${i.id}-${d.fieldLabel}`,
            fieldLabel: d.fieldLabel,
            value: d.value,
          })),
          notes: i.notes ?? null,
          tags: i.tags ?? [],
          seasonal: i.seasonal,
          sortOrder: Number(i.sortOrder),
          recipe: null,
          foodRecipe: null,
        })) as LibraryItem[];
        queryClient.setQueryData(queryKey, mapped);
        all.push(...mapped);
      } catch {
        // Skip a category we can't load — better to attempt matches against
        // the categories we have than to block the whole tool.
      }
    }
    return all;
  }, [orderedCategories, actor, queryClient]);

  const addFiles = useCallback((fileList: FileList | File[]) => {
    const incoming: FileEntry[] = [];
    for (const file of Array.from(fileList)) {
      // Only accept image files; non-images are recorded as errors so the
      // admin sees them in the unmatched list rather than silently dropping.
      const isImage = file.type.startsWith("image/");
      const objectUrl = URL.createObjectURL(file);
      objectUrlsRef.current.push(objectUrl);
      incoming.push({
        id: makeFileEntryId(),
        file,
        objectUrl,
        status: isImage ? "pending" : "error",
        uploadedUrl: null,
        item: null,
        message: isImage ? null : "Not an image file.",
      });
    }
    setEntries((prev) => [...prev, ...incoming]);
  }, []);

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
    }
    // Reset so selecting the same file again still fires onChange.
    e.target.value = "";
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const removeEntry = (id: string) => {
    setEntries((prev) => {
      const removed = prev.find((e) => e.id === id);
      if (removed) {
        URL.revokeObjectURL(removed.objectUrl);
        objectUrlsRef.current = objectUrlsRef.current.filter(
          (u) => u !== removed.objectUrl,
        );
      }
      return prev.filter((e) => e.id !== id);
    });
  };

  const clearAll = () => {
    for (const url of objectUrlsRef.current) {
      URL.revokeObjectURL(url);
    }
    objectUrlsRef.current = [];
    setEntries([]);
    setPendingOverwrites([]);
    setAttachedCount(0);
    setMatchedCount(0);
  };

  /**
   * Uploads every pending image file, matches each to a LibraryItem by
   * normalized filename → title, and attaches photos for items without an
   * existing photo. Items that already have a photo are staged in
   * pendingOverwrites for batch confirmation — they are NEVER overwritten
   * without the admin clicking "Confirm overwrites".
   */
  const processFiles = async () => {
    const pending = entries.filter((e) => e.status === "pending");
    if (pending.length === 0) return;
    setIsProcessing(true);
    let attached = attachedCount;
    let matchedTotal = matchedCount;
    const touchedCategoryIds = new Set<string>();
    const stagedOverwrites: LibraryItem[] = [];

    try {
      const allItems = await loadAllItems();
      const byNormTitle = new Map<string, LibraryItem>();
      for (const it of allItems) {
        byNormTitle.set(normalizeForMatch(it.title), it);
      }

      for (const entry of pending) {
        // Mark uploading.
        setEntries((prev) =>
          prev.map((e) =>
            e.id === entry.id ? { ...e, status: "uploading" } : e,
          ),
        );

        let url: string;
        try {
          url = await uploadPhoto(entry.file);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Upload failed.";
          setEntries((prev) =>
            prev.map((e) =>
              e.id === entry.id ? { ...e, status: "error", message: msg } : e,
            ),
          );
          continue;
        }

        const norm = normalizeForMatch(entry.file.name);
        const matchedItem = byNormTitle.get(norm) ?? null;

        if (!matchedItem) {
          setEntries((prev) =>
            prev.map((e) =>
              e.id === entry.id
                ? {
                    ...e,
                    status: "unmatched",
                    uploadedUrl: url,
                    message:
                      "No library item matches this filename. Rename the file to match an item title and re-drop it.",
                  }
                : e,
            ),
          );
          continue;
        }

        matchedTotal += 1;

        if (matchedItem.photo) {
          // Stage for confirmation — do NOT overwrite yet.
          stagedOverwrites.push(matchedItem);
          setEntries((prev) =>
            prev.map((e) =>
              e.id === entry.id
                ? {
                    ...e,
                    status: "needs-confirm",
                    uploadedUrl: url,
                    item: matchedItem,
                    message: `Matches "${matchedItem.title}" — already has a photo. Confirm to overwrite.`,
                  }
                : e,
            ),
          );
          continue;
        }

        // No existing photo — attach immediately.
        try {
          await updateItem.mutateAsync({
            itemId: matchedItem.id,
            categoryId: matchedItem.categoryId,
            title: matchedItem.title,
            subtitle: matchedItem.subtitle,
            photo: url,
            details: matchedItem.details,
            notes: matchedItem.notes,
            tags: matchedItem.tags,
            seasonal: matchedItem.seasonal,
            recipe: matchedItem.recipe,
            foodRecipe: matchedItem.foodRecipe,
          });
          touchedCategoryIds.add(matchedItem.categoryId);
          attached += 1;
          setEntries((prev) =>
            prev.map((e) =>
              e.id === entry.id
                ? {
                    ...e,
                    status: "attached",
                    uploadedUrl: url,
                    item: matchedItem,
                    message: `Attached to "${matchedItem.title}".`,
                  }
                : e,
            ),
          );
        } catch (err) {
          const msg =
            err instanceof Error ? err.message : "Failed to attach photo.";
          setEntries((prev) =>
            prev.map((e) =>
              e.id === entry.id
                ? { ...e, status: "error", uploadedUrl: url, message: msg }
                : e,
            ),
          );
        }
      }

      // Invalidate touched category item caches so the library reflects new
      // photos immediately.
      for (const cid of touchedCategoryIds) {
        await queryClient.invalidateQueries({
          queryKey: ["library-items", cid],
        });
      }

      setAttachedCount(attached);
      setMatchedCount(matchedTotal);
      setPendingOverwrites((prev) => [...prev, ...stagedOverwrites]);

      if (stagedOverwrites.length > 0) {
        toast(
          `${stagedOverwrites.length} photo${stagedOverwrites.length === 1 ? "" : "s"} waiting for confirmation`,
          {
            description:
              "Some items already have photos. Review and confirm to overwrite.",
          },
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Processing failed.";
      toast.error("Recipe photos processing stopped", { description: msg });
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Overwrites the photo on every staged item with the uploaded URL from its
   * matching entry. Runs only after the admin clicks "Confirm overwrites".
   */
  const confirmOverwrites = async () => {
    const staged = entries.filter((e) => e.status === "needs-confirm");
    if (staged.length === 0) return;
    setIsProcessing(true);
    let attached = attachedCount;
    const touchedCategoryIds = new Set<string>();
    try {
      for (const entry of staged) {
        if (!entry.uploadedUrl || !entry.item) continue;
        const item = entry.item;
        try {
          await updateItem.mutateAsync({
            itemId: item.id,
            categoryId: item.categoryId,
            title: item.title,
            subtitle: item.subtitle,
            photo: entry.uploadedUrl,
            details: item.details,
            notes: item.notes,
            tags: item.tags,
            seasonal: item.seasonal,
            recipe: item.recipe,
            foodRecipe: item.foodRecipe,
          });
          touchedCategoryIds.add(item.categoryId);
          attached += 1;
          setEntries((prev) =>
            prev.map((e) =>
              e.id === entry.id
                ? {
                    ...e,
                    status: "attached",
                    message: `Overwrote photo on "${item.title}".`,
                  }
                : e,
            ),
          );
        } catch (err) {
          const msg =
            err instanceof Error ? err.message : "Failed to overwrite photo.";
          setEntries((prev) =>
            prev.map((e) =>
              e.id === entry.id ? { ...e, status: "error", message: msg } : e,
            ),
          );
        }
      }
      for (const cid of touchedCategoryIds) {
        await queryClient.invalidateQueries({
          queryKey: ["library-items", cid],
        });
      }
      setAttachedCount(attached);
      setPendingOverwrites([]);
      toast.success("Overwrites applied");
    } finally {
      setIsProcessing(false);
    }
  };

  const pendingCount = entries.filter((e) => e.status === "pending").length;
  const unmatchedCount = entries.filter((e) => e.status === "unmatched").length;
  const needsConfirmCount = entries.filter(
    (e) => e.status === "needs-confirm",
  ).length;
  const hasPending = pendingCount > 0;
  const hasEntries = entries.length > 0;

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent
        className="bg-card border-border sm:max-w-2xl"
        data-ocid="library.admin.recipe_photos.dialog"
      >
        <DialogHeader>
          <DialogTitle
            className="font-heading uppercase tracking-wide text-foreground"
            data-ocid="library.admin.recipe_photos.dialog.title"
          >
            <Camera className="inline size-5 align-text-bottom text-primary" />{" "}
            Recipe Photos
          </DialogTitle>
          <DialogDescription>
            Drop or select image files. Each photo is matched to a library item
            by filename (e.g.{" "}
            <code className="font-mono text-foreground">
              bubba_s_nachos.jpeg
            </code>{" "}
            matches &ldquo;Bubba&rsquo;s Nachos&rdquo;). Existing photos are
            never overwritten without confirmation.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {/* Drop zone */}
          <div
            className={`flex flex-col items-center justify-center gap-2 rounded-md border border-dashed px-6 py-8 text-center transition-colors ${
              isDragOver
                ? "border-primary bg-primary/10"
                : "border-border bg-background"
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            data-ocid="library.admin.recipe_photos.dropzone"
          >
            <ImagePlus className="size-8 text-muted-foreground" aria-hidden />
            <p className="font-body text-sm text-foreground">
              Drag image files here, or
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              data-ocid="library.admin.recipe_photos.select_button"
            >
              <ImagePlus />
              Select files
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileInputChange}
              className="sr-only"
              data-ocid="library.admin.recipe_photos.file_input"
              aria-label="Select image files"
            />
            <p className="font-body text-xs text-muted-foreground">
              PNG, JPG, WEBP — multiple files allowed.
            </p>
          </div>

          {/* Summary line */}
          {hasEntries && (
            <div
              className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-border bg-library-card px-3 py-2 font-body text-xs text-muted-foreground"
              data-ocid="library.admin.recipe_photos.summary"
            >
              <span>
                <span className="text-foreground font-semibold">
                  {entries.length}
                </span>{" "}
                file{entries.length === 1 ? "" : "s"}
              </span>
              <span>
                Matched:{" "}
                <span className="text-foreground font-semibold">
                  {matchedCount}
                </span>
              </span>
              <span>
                Attached:{" "}
                <span className="text-foreground font-semibold">
                  {attachedCount}
                </span>
              </span>
              {needsConfirmCount > 0 && (
                <span className="text-primary font-semibold">
                  {needsConfirmCount} waiting for confirmation
                </span>
              )}
              {unmatchedCount > 0 && (
                <span>
                  Unmatched:{" "}
                  <span className="text-foreground font-semibold">
                    {unmatchedCount}
                  </span>
                </span>
              )}
            </div>
          )}

          {/* File list */}
          {hasEntries && (
            <ul
              className="grid gap-2 max-h-72 overflow-y-auto pr-1"
              data-ocid="library.admin.recipe_photos.list"
            >
              {entries.map((entry, idx) => (
                <li
                  key={entry.id}
                  className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2"
                  data-ocid={`library.admin.recipe_photos.row.${idx + 1}`}
                >
                  <img
                    src={entry.objectUrl}
                    alt={entry.file.name}
                    className="size-10 shrink-0 rounded object-cover border border-border"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-body text-sm text-foreground">
                      {entry.file.name}
                    </p>
                    <StatusLine entry={entry} />
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {entry.status === "unmatched" && (
                      <a
                        href={entry.objectUrl}
                        download={entry.file.name}
                        className="inline-flex size-8 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                        aria-label={`Download ${entry.file.name}`}
                        data-ocid={`library.admin.recipe_photos.download_button.${idx + 1}`}
                      >
                        <Download className="size-4" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => removeEntry(entry.id)}
                      disabled={isProcessing}
                      className="inline-flex size-8 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors disabled:opacity-50"
                      aria-label={`Remove ${entry.file.name}`}
                      data-ocid={`library.admin.recipe_photos.remove_button.${idx + 1}`}
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Unmatched hint */}
          {unmatchedCount > 0 && (
            <p
              className="font-body text-xs text-muted-foreground"
              data-ocid="library.admin.recipe_photos.unmatched_hint"
            >
              Unmatched files are downloadable above. Rename a file to match an
              item title (e.g.{" "}
              <code className="font-mono">bubbas_nachos.jpeg</code> for
              &ldquo;Bubba&rsquo;s Nachos&rdquo;) and re-drop it.
            </p>
          )}
        </div>

        <DialogFooter className="pt-2 flex-wrap sm:flex-nowrap gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearAll}
            disabled={isProcessing || !hasEntries}
            data-ocid="library.admin.recipe_photos.clear_button"
          >
            Clear
          </Button>
          <div className="flex-1" />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isProcessing}
            data-ocid="library.admin.recipe_photos.close_button"
          >
            <X />
            Close
          </Button>
          {needsConfirmCount > 0 && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={confirmOverwrites}
              disabled={isProcessing}
              data-ocid="library.admin.recipe_photos.confirm_overwrite_button"
            >
              {isProcessing && <Loader2 className="animate-spin" />}
              <AlertTriangle />
              Confirm {needsConfirmCount} overwrite
              {needsConfirmCount === 1 ? "" : "s"}
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            onClick={processFiles}
            disabled={!hasPending || isProcessing}
            data-ocid="library.admin.recipe_photos.upload_button"
          >
            {isProcessing && <Loader2 className="animate-spin" />}
            <RefreshCw />
            Upload {pendingCount > 0 ? `(${pendingCount})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------- Status line ----------------------------- */

function StatusLine({ entry }: { entry: FileEntry }): ReactElement {
  switch (entry.status) {
    case "pending":
      return (
        <p className="font-body text-xs text-muted-foreground">
          Waiting to upload.
        </p>
      );
    case "uploading":
      return (
        <p
          className="font-body text-xs text-muted-foreground flex items-center gap-1"
          aria-live="polite"
          data-ocid="library.admin.recipe_photos.row.loading_state"
        >
          <Loader2 className="size-3 animate-spin" />
          Uploading…
        </p>
      );
    case "matched":
      return (
        <p className="font-body text-xs text-muted-foreground">
          Matched — ready to attach.
        </p>
      );
    case "needs-confirm":
      return (
        <p className="font-body text-xs text-primary flex items-center gap-1">
          <AlertTriangle className="size-3" />
          {entry.message}
        </p>
      );
    case "attached":
      return (
        <p
          className="font-body text-xs text-foreground flex items-center gap-1"
          data-ocid="library.admin.recipe_photos.row.success_state"
        >
          <CheckCircle2 className="size-3 text-foreground" />
          {entry.message}
        </p>
      );
    case "unmatched":
      return (
        <p className="font-body text-xs text-muted-foreground">
          {entry.message}
        </p>
      );
    case "error":
      return (
        <p
          className="font-body text-xs text-primary"
          role="alert"
          data-ocid="library.admin.recipe_photos.row.error_state"
        >
          {entry.message}
        </p>
      );
    default:
      return <p className="font-body text-xs text-muted-foreground" />;
  }
}

export default RecipePhotosDialog;
