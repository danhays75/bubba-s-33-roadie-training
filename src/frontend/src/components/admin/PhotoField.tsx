import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePhotoUpload } from "@/hooks/usePhotoUpload";
import { resizeImage } from "@/lib/resizeImage";
import { Link, RefreshCw, Upload, X } from "lucide-react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

export interface PhotoFieldProps {
  value: string | undefined | null;
  onChange: (v: string | undefined | null) => void;
  id?: string;
  label?: string;
}

export interface PhotoFieldHandle {
  focusUrlInput: () => void;
  openFilePicker: () => void;
}

type Mode = "upload" | "url";

/**
 * Either/or single photo slot.
 * - Upload clears any URL; pasting a URL clears any uploaded blob.
 * - Photo is OPTIONAL — empty value is always valid and never blocks save.
 * - Sub-components are declared OUTSIDE the main body to avoid focus loss.
 */
export const PhotoField = forwardRef<PhotoFieldHandle, PhotoFieldProps>(
  function PhotoField({ value, onChange, id, label }, ref) {
    const fieldId = id ?? "photo-field";
    const fileInputRef = useRef<HTMLInputElement>(null);
    const urlInputRef = useRef<HTMLInputElement>(null);

    // Implicit mode toggle: start in URL mode if a value is present, else upload.
    const [mode, setMode] = useState<Mode>(value ? "url" : "upload");
    const [processing, setProcessing] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);
    const [broken, setBroken] = useState(false);

    const {
      uploadPhoto,
      isUploading,
      error: uploadError,
      reset,
    } = usePhotoUpload();

    useImperativeHandle(ref, () => ({
      focusUrlInput: () => urlInputRef.current?.focus(),
      openFilePicker: () => fileInputRef.current?.click(),
    }));

    // Reset broken-image flag whenever the value changes.
    // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally reset broken-image flag when value changes
    useEffect(() => {
      setBroken(false);
    }, [value]);

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
      async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        // Always reset the input so re-selecting the same file fires change.
        e.target.value = "";
        if (!file) return;

        if (!file.type.startsWith("image/")) {
          setLocalError("Please choose an image file (JPEG, PNG, or WebP).");
          return;
        }
        setLocalError(null);
        setProcessing(true);
        try {
          const blob = await resizeImage(file, 1600, 0.8);
          const url = await uploadPhoto(blob);
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

    const handleUrlChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
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

    const handleReplace = useCallback(() => {
      openFilePicker();
    }, [openFilePicker]);

    const handleImgError = useCallback(() => {
      setBroken(true);
    }, []);

    const activeError = localError ?? uploadError;
    const hasValue = Boolean(value);
    const busy = processing || isUploading;

    return (
      <div className="space-y-2" data-ocid="photo.field">
        {label ? (
          <div className="flex items-baseline justify-between">
            <label
              htmlFor={`${fieldId}-url`}
              className="font-display text-xs uppercase tracking-[0.18em] text-foreground/80"
            >
              {label}
            </label>
            <span className="font-body text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Optional
            </span>
          </div>
        ) : null}

        {/* Segmented UPLOAD / URL toggle */}
        <SegmentedToggle
          mode={mode}
          disabled={busy}
          onUploadClick={openFilePicker}
          onUrlClick={focusUrlInput}
        />

        {/* URL input — always rendered so focus() works; visible while in URL mode */}
        <div className={mode === "url" ? "block" : "hidden"}>
          <Input
            id={`${fieldId}-url`}
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
            data-ocid="photo.input"
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
          data-ocid="photo.upload_button"
        />

        {/* Preview / processing / broken / empty states */}
        {busy ? (
          <div
            className="photo-field-processing flex items-center gap-2 px-3 py-2 h-24 w-24 animate-photo-shimmer"
            aria-live="polite"
            data-ocid="photo.loading_state"
          >
            <RefreshCw className="h-5 w-5 animate-spin" aria-hidden="true" />
            <span className="font-display text-xs uppercase tracking-[0.18em]">
              {processing ? "Resizing…" : "Uploading…"}
            </span>
          </div>
        ) : hasValue ? (
          <div className="flex items-center gap-3">
            <div className="photo-field-preview relative shrink-0 h-24 w-24">
              {broken ? (
                <div
                  className="photo-field-broken h-full w-full flex items-center justify-center"
                  data-ocid="photo.error_state"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                  <span className="font-display text-[10px] uppercase tracking-[0.16em]">
                    Couldn&apos;t load
                  </span>
                </div>
              ) : (
                <img
                  src={value ?? undefined}
                  alt="Preview"
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
                onClick={handleReplace}
                disabled={busy}
                data-ocid="photo.replace_button"
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
                data-ocid="photo.delete_button"
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
            className="photo-field-empty flex items-center justify-center gap-2 px-3 py-3 min-h-[44px] w-full text-left transition-colors hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Choose a photo to upload"
            data-ocid="photo.empty_state"
          >
            <Upload className="h-5 w-5" aria-hidden="true" />
            <span className="font-display text-xs uppercase tracking-[0.18em]">
              Choose a photo…
            </span>
            <span className="font-body text-[10px] text-muted-foreground">
              JPEG, PNG, or WebP — resized to 1600px max
            </span>
          </button>
        ) : null}

        {activeError ? (
          <p
            className="photo-field-error"
            role="alert"
            data-ocid="photo.field_error"
          >
            {activeError}
          </p>
        ) : null}
      </div>
    );
  },
);

export default PhotoField;

/* -------------------------------------------------------------------------- */
/* Sub-components declared OUTSIDE the main body to avoid focus loss.        */
/* -------------------------------------------------------------------------- */

interface SegmentedToggleProps {
  mode: Mode;
  disabled?: boolean;
  onUploadClick: () => void;
  onUrlClick: () => void;
}

const SegmentedToggle = forwardRef<HTMLFieldSetElement, SegmentedToggleProps>(
  function SegmentedToggle({ mode, disabled, onUploadClick, onUrlClick }, ref) {
    return (
      <fieldset
        ref={ref}
        className="inline-flex overflow-hidden rounded-[4px] border border-border bg-card p-0 m-0"
        data-ocid="photo.toggle"
      >
        <legend className="sr-only">Photo input mode</legend>
        <ToggleButton
          active={mode === "upload"}
          disabled={disabled}
          onClick={onUploadClick}
          dataOcid="photo.toggle.upload"
        >
          <Upload className="h-3.5 w-3.5" aria-hidden="true" />
          Upload
        </ToggleButton>
        <ToggleButton
          active={mode === "url"}
          disabled={disabled}
          onClick={onUrlClick}
          dataOcid="photo.toggle.url"
        >
          <Link className="h-3.5 w-3.5" aria-hidden="true" />
          Paste URL
        </ToggleButton>
      </fieldset>
    );
  },
);

interface ToggleButtonProps {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  dataOcid: string;
}

const ToggleButton = forwardRef<HTMLButtonElement, ToggleButtonProps>(
  function ToggleButton(
    { active, disabled, onClick, children, dataOcid },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-pressed={active}
        data-ocid={dataOcid}
        className={[
          "flex items-center gap-1.5 px-3 py-1.5 font-display text-[11px] uppercase tracking-[0.16em] transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          active
            ? "bg-primary text-primary-foreground"
            : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40",
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
        ].join(" ")}
      >
        {children}
      </button>
    );
  },
);
