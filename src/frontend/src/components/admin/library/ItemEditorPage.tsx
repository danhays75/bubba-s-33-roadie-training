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
import type { DetailField } from "@/types/foundation";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Lock, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import { toast } from "sonner";
import { PhotoField } from "../PhotoField";

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
  const { data: existing, isLoading } = useItem(isCreate ? "" : itemId);
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
      setHydrated(true);
    }
  }, [isCreate, hydrated, existing]);

  const isAdmin = profile?.role === "admin";

  const titleError =
    touched && title.trim().length === 0 ? "Title is required" : null;
  const canSubmit = title.trim().length > 0;
  const isPending = createMutation.isPending || updateMutation.isPending;

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
