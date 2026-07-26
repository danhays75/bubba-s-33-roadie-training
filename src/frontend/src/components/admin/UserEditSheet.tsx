import { CropPhotoModal } from "@/components/CropPhotoModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useSetUserEmail, useSetUserPhoto } from "@/hooks/useAllUsers";
import { usePhotoUpload } from "@/hooks/usePhotoUpload";
import { resizeImage } from "@/lib/resizeImage";
import { cn } from "@/lib/utils";
import type { UserProfile } from "@/types/foundation";
import { Pencil, RefreshCw, Upload, X } from "lucide-react";
import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

/**
 * Admin per-user edit sheet. Mirrors the UserAssignmentEditor Sheet pattern
 * (same Sheet component, same dark roadhouse styling) but edits the user's
 * photo and email instead of position assignments.
 *
 * Photo field reuses the PhotoField pattern (upload or URL). When uploading
 * a file, the image goes through the CropPhotoModal crop step before being
 * resized and uploaded via the existing usePhotoUpload flow — the same crop
 * experience as the Profile page.
 *
 * Email is a simple text input. Saving calls useSetUserEmail (if email
 * changed) and useSetUserPhoto (if photo changed) via the hooks from
 * useAllUsers.ts. Save is disabled until at least one field has changed.
 * Cancel discards changes and closes the sheet.
 *
 * Email edited by an admin replaces the old email without any SSO-vs-manual
 * label distinction.
 */
export function UserEditSheet({
  user,
  index,
}: {
  user: UserProfile;
  index: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="font-heading text-xs uppercase tracking-wide"
          data-ocid={`user.edit_button.${index}`}
          aria-label={`Edit ${user.name}`}
        >
          <Pencil className="size-3.5" />
          Edit
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full gap-0 p-0 sm:max-w-md"
        data-ocid={`user.edit_dialog.${index}`}
      >
        <UserEditSheetBody
          user={user}
          index={index}
          onClose={() => setOpen(false)}
        />
      </SheetContent>
    </Sheet>
  );
}

/**
 * Body of the edit sheet. Kept as a separate component so the local state
 * (email draft, photo draft, crop modal) resets cleanly every time the
 * sheet opens for a different user — the Sheet keeps its trigger mounted,
 * but this body only mounts when the sheet is open.
 */
function UserEditSheetBody({
  user,
  index,
  onClose,
}: {
  user: UserProfile;
  index: number;
  onClose: () => void;
}) {
  const setEmail = useSetUserEmail();
  const setPhoto = useSetUserPhoto();

  // Drafts — initialized from the user on mount. The sheet is short-lived
  // (mounted only while open), so we don't need to resync if the user prop
  // changes underneath us; the all-users query invalidation will close the
  // loop on the next render cycle.
  const [emailDraft, setEmailDraft] = useState<string>(user.email ?? "");
  const [photoDraft, setPhotoDraft] = useState<string | undefined | null>(
    user.photo,
  );

  const trimmedEmail = emailDraft.trim();
  const emailChanged = trimmedEmail !== (user.email ?? "");
  const photoChanged = photoDraft !== (user.photo ?? undefined);
  const hasChanges = emailChanged || photoChanged;

  const busy = setEmail.isPending || setPhoto.isPending;

  const handleSave = () => {
    if (!hasChanges || busy) return;

    // Run the two mutations sequentially so a failure on the first stops the
    // second. Each hook invalidates the all-users query on success, so the
    // table refreshes after the final one resolves.
    const run = async () => {
      try {
        if (emailChanged) {
          await setEmail.mutateAsync({
            userPrincipal: user.principal,
            email: trimmedEmail,
          });
        }
        if (photoChanged) {
          await setPhoto.mutateAsync({
            userPrincipal: user.principal,
            photo: photoDraft ?? null,
          });
        }
        toast.success(`${user.name || "User"} updated.`);
        onClose();
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Couldn't save changes.";
        toast.error(msg);
      }
    };
    void run();
  };

  return (
    <>
      <SheetHeader className="border-b border-border bg-card">
        <SheetTitle className="font-heading text-lg uppercase tracking-wide text-foreground">
          {user.name}
        </SheetTitle>
        <SheetDescription className="font-body text-sm text-muted-foreground">
          Edit this user&rsquo;s photo and email.
        </SheetDescription>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex flex-col gap-6">
          <PhotoEditor
            user={user}
            index={index}
            value={photoDraft}
            onChange={setPhotoDraft}
          />
          <EmailEditor
            user={user}
            index={index}
            value={emailDraft}
            onChange={setEmailDraft}
          />
        </div>
      </div>

      <SheetFooter className="border-t border-border bg-card">
        <SheetClose asChild>
          <Button
            type="button"
            variant="outline"
            className="font-heading text-sm uppercase tracking-wide"
            disabled={busy}
            data-ocid={`user.cancel_button.${index}`}
          >
            Cancel
          </Button>
        </SheetClose>
        <Button
          type="button"
          variant="default"
          className="font-heading text-sm uppercase tracking-wide"
          disabled={!hasChanges || busy}
          onClick={handleSave}
          data-ocid={`user.save_button.${index}`}
        >
          {busy ? (
            <>
              <RefreshCw className="size-4 animate-spin" />
              Saving…
            </>
          ) : (
            "Save"
          )}
        </Button>
      </SheetFooter>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Photo editor — reuses the PhotoField pattern (upload or URL) with a crop   */
/* step before upload, matching the Profile page experience.                  */
/* -------------------------------------------------------------------------- */

type PhotoMode = "upload" | "url";

function PhotoEditor({
  user,
  index,
  value,
  onChange,
}: {
  user: UserProfile;
  index: number;
  value: string | undefined | null;
  onChange: (v: string | undefined | null) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  // Implicit mode toggle: start in URL mode if a value is present, else upload.
  const [mode, setMode] = useState<PhotoMode>(value ? "url" : "upload");
  const [processing, setProcessing] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [broken, setBroken] = useState(false);

  // Crop modal state — when set, the CropPhotoModal is shown over the sheet.
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  // Track the object URL for the crop source so we can revoke it after.
  const cropUrlRef = useRef<string | null>(null);

  const {
    uploadPhoto,
    isUploading,
    error: uploadError,
    reset,
  } = usePhotoUpload();

  // Reset broken-image flag whenever the value changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally reset broken-image flag when value changes
  useEffect(() => {
    setBroken(false);
  }, [value]);

  // Revoke any crop-source object URL when the editor unmounts.
  useEffect(() => {
    return () => {
      if (cropUrlRef.current) {
        URL.revokeObjectURL(cropUrlRef.current);
        cropUrlRef.current = null;
      }
    };
  }, []);

  const openFilePicker = useCallback(() => {
    setLocalError(null);
    fileInputRef.current?.click();
  }, []);

  const focusUrlInput = useCallback(() => {
    setMode("url");
    urlInputRef.current?.focus();
    urlInputRef.current?.select();
  }, []);

  const handleFileChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      // Always reset the input so re-selecting the same file fires change.
      e.target.value = "";
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        setLocalError("Please choose an image file (JPEG, PNG, or WebP).");
        return;
      }

      setLocalError(null);
      // Open the crop modal with an object URL for the selected file. The
      // actual resize + upload happens after the user confirms the crop.
      if (cropUrlRef.current) {
        URL.revokeObjectURL(cropUrlRef.current);
      }
      const url = URL.createObjectURL(file);
      cropUrlRef.current = url;
      setCropSrc(url);
    },
    [],
  );

  const handleCropConfirm = useCallback(
    async (croppedBlob: Blob) => {
      // Revoke the crop-source URL now that we have the cropped blob.
      if (cropUrlRef.current) {
        URL.revokeObjectURL(cropUrlRef.current);
        cropUrlRef.current = null;
      }
      setCropSrc(null);
      setProcessing(true);
      try {
        const resized = await resizeImage(
          new File([croppedBlob], "crop.jpg", { type: "image/jpeg" }),
          1600,
          0.8,
        );
        const url = await uploadPhoto(resized);
        // Upload mode wins — clear any URL.
        onChange(url);
        setMode("upload");
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Could not upload the photo.";
        setLocalError(msg);
      } finally {
        setProcessing(false);
      }
    },
    [onChange, uploadPhoto],
  );

  const handleCropCancel = useCallback(() => {
    if (cropUrlRef.current) {
      URL.revokeObjectURL(cropUrlRef.current);
      cropUrlRef.current = null;
    }
    setCropSrc(null);
  }, []);

  const handleUrlChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value.trim();
      setLocalError(null);
      // URL mode wins — clear any uploaded blob.
      onChange(v.length ? v : undefined);
      setMode("url");
    },
    [onChange],
  );

  const handleRemove = useCallback(() => {
    setLocalError(null);
    reset();
    onChange(undefined);
    setBroken(false);
  }, [onChange, reset]);

  const handleImgError = useCallback(() => {
    setBroken(true);
  }, []);

  const activeError = localError ?? uploadError;
  const hasValue = Boolean(value);
  const busy = processing || isUploading;

  return (
    <section
      className="flex flex-col gap-2"
      data-ocid={`user.photo.section.${index}`}
    >
      <div className="flex items-baseline justify-between">
        <label
          htmlFor={`user-photo-url-${index}`}
          className="font-display text-xs uppercase tracking-[0.18em] text-foreground/80"
        >
          Photo
        </label>
        <span className="font-body text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          Optional
        </span>
      </div>

      {/* Segmented UPLOAD / URL toggle */}
      <PhotoSegmentedToggle
        mode={mode}
        disabled={busy}
        onUploadClick={openFilePicker}
        onUrlClick={focusUrlInput}
        index={index}
      />

      {/* URL input — always rendered so focus() works; visible while in URL mode */}
      <div className={mode === "url" ? "block" : "hidden"}>
        <Input
          id={`user-photo-url-${index}`}
          ref={urlInputRef}
          type="url"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          placeholder="https://…"
          value={mode === "url" ? (value ?? "") : ""}
          onChange={handleUrlChange}
          disabled={busy}
          aria-label="Paste image URL"
          data-ocid={`user.photo.input.${index}`}
          className="font-body placeholder:text-muted-foreground/60"
        />
        <p className="mt-1 font-body text-[11px] text-muted-foreground">
          Paste an image URL. You can save without a photo.
        </p>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
        aria-label="Upload photo"
        data-ocid={`user.photo.upload_button.${index}`}
      />

      {/* Preview / processing / broken / empty states */}
      {busy ? (
        <div
          className="photo-field-processing flex h-24 w-24 animate-photo-shimmer items-center gap-2 px-3 py-2"
          aria-live="polite"
          data-ocid={`user.photo.loading_state.${index}`}
        >
          <RefreshCw className="h-5 w-5 animate-spin" aria-hidden="true" />
          <span className="font-display text-xs uppercase tracking-[0.18em]">
            {processing ? "Resizing…" : "Uploading…"}
          </span>
        </div>
      ) : hasValue ? (
        <div className="flex items-center gap-3">
          <div className="photo-field-preview relative h-24 w-24 shrink-0">
            {broken ? (
              <div
                className="photo-field-broken flex h-full w-full items-center justify-center"
                data-ocid={`user.photo.error_state.${index}`}
              >
                <X className="h-5 w-5" aria-hidden="true" />
                <span className="font-display text-[10px] uppercase tracking-[0.16em]">
                  Couldn&apos;t load
                </span>
              </div>
            ) : (
              <img
                src={value ?? undefined}
                alt={`${user.name || "User"} preview`}
                className="h-full w-full object-cover"
                onError={handleImgError}
              />
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={openFilePicker}
              disabled={busy}
              data-ocid={`user.photo.replace_button.${index}`}
              className="font-display text-[11px] uppercase tracking-[0.16em]"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Replace
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              disabled={busy}
              data-ocid={`user.photo.delete_button.${index}`}
              className="font-display text-[11px] uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Remove
            </Button>
          </div>
        </div>
      ) : mode === "upload" ? (
        <button
          type="button"
          onClick={openFilePicker}
          disabled={busy}
          className="photo-field-empty flex min-h-[44px] w-full items-center justify-center gap-2 px-3 py-3 text-left transition-colors hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Choose a photo to upload"
          data-ocid={`user.photo.empty_state.${index}`}
        >
          <Upload className="h-5 w-5" aria-hidden="true" />
          <span className="font-display text-xs uppercase tracking-[0.18em]">
            Choose a photo…
          </span>
          <span className="font-body text-[10px] text-muted-foreground">
            JPEG, PNG, or WebP — square crop, resized to 1600px max
          </span>
        </button>
      ) : null}

      {activeError ? (
        <p
          className="photo-field-error"
          role="alert"
          data-ocid={`user.photo.field_error.${index}`}
        >
          {activeError}
        </p>
      ) : null}

      {cropSrc ? (
        <CropPhotoModal
          imageSrc={cropSrc}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      ) : null}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Email editor — simple text input. No SSO-vs-manual label distinction.      */
/* -------------------------------------------------------------------------- */

function EmailEditor({
  user,
  index,
  value,
  onChange,
}: {
  user: UserProfile;
  index: number;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <section
      className="flex flex-col gap-2"
      data-ocid={`user.email.section.${index}`}
    >
      <label
        htmlFor={`user-email-${index}`}
        className="font-display text-xs uppercase tracking-[0.18em] text-foreground/80"
      >
        Email
      </label>
      <Input
        id={`user-email-${index}`}
        type="email"
        inputMode="email"
        autoComplete="off"
        spellCheck={false}
        placeholder={`${user.name || "User"}'s email`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={`Email for ${user.name || "user"}`}
        data-ocid={`user.email.input.${index}`}
        className="font-body placeholder:text-muted-foreground/60"
      />
      <p className="font-body text-[11px] text-muted-foreground">
        Replaces the email on record. Leave blank to clear it.
      </p>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Sub-components declared OUTSIDE the main body to avoid focus loss.         */
/* -------------------------------------------------------------------------- */

interface PhotoSegmentedToggleProps {
  mode: PhotoMode;
  disabled?: boolean;
  onUploadClick: () => void;
  onUrlClick: () => void;
  index: number;
}

const PhotoSegmentedToggle = ({
  mode,
  disabled,
  onUploadClick,
  onUrlClick,
  index,
}: PhotoSegmentedToggleProps) => {
  return (
    <fieldset
      className="m-0 inline-flex overflow-hidden rounded-[4px] border border-border bg-card p-0"
      data-ocid={`user.photo.toggle.${index}`}
    >
      <legend className="sr-only">Photo input mode</legend>
      <PhotoToggleButton
        active={mode === "upload"}
        disabled={disabled}
        onClick={onUploadClick}
        dataOcid={`user.photo.toggle.upload.${index}`}
      >
        <Upload className="h-3.5 w-3.5" aria-hidden="true" />
        Upload
      </PhotoToggleButton>
      <PhotoToggleButton
        active={mode === "url"}
        disabled={disabled}
        onClick={onUrlClick}
        dataOcid={`user.photo.toggle.url.${index}`}
      >
        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
        Paste URL
      </PhotoToggleButton>
    </fieldset>
  );
};

interface PhotoToggleButtonProps {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  dataOcid: string;
}

const PhotoToggleButton = ({
  active,
  disabled,
  onClick,
  children,
  dataOcid,
}: PhotoToggleButtonProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      data-ocid={dataOcid}
      className={cn(
        "flex cursor-pointer items-center gap-1.5 px-3 py-1.5 font-display text-[11px] uppercase tracking-[0.16em] transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      {children}
    </button>
  );
};

export default UserEditSheet;
