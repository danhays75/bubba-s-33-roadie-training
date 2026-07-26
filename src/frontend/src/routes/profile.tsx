import { CropPhotoModal } from "@/components/CropPhotoModal";
/**
 * Profile route — full Profile page.
 *
 * Sections:
 *  1. Large circular avatar (.profile-avatar) with photo or initials fallback,
 *     .profile-avatar-upload overlay on hover, .animate-profile-avatar-ring
 *     while uploading. Hidden file input → CropPhotoModal (square crop) →
 *     resizeImage(1600, 0.8) → usePhotoUpload.uploadPhoto(blob) →
 *     useSetMyPhoto({ photo: url }).
 *  2. Editable name + store location fields with Save button →
 *     useUpdateMyProfile with toast success.
 *  3. Current email display with verified/pending badge + "Change email"
 *     toggle revealing an email-change form mirroring EnterEmailScreen's
 *     link-based stage machine: idle → sending → awaiting-confirmation →
 *     verifying → success.
 *  4. Read-only role display.
 *
 * Dark roadhouse theme: Anton/Oswald/Barlow fonts, red/amber accents,
 * dark bg. Full feedback states throughout.
 */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import {
  useInitiateEmailVerification,
  useMyProfile,
  useSetEmailForUser,
  useSetMyPhoto,
  useUpdateMyProfile,
} from "@/hooks/useMyProfile";
import { usePhotoUpload } from "@/hooks/usePhotoUpload";
import { resizeImage } from "@/lib/resizeImage";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Camera,
  Check,
  CheckCircle2,
  Loader2,
  Mail,
  MailCheck,
  RefreshCw,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type EmailStage =
  | "idle"
  | "sending"
  | "awaiting-confirmation"
  | "verifying"
  | "success";

const ROLE_LABELS: Record<string, string> = {
  trainee: "Trainee",
  trainer: "Trainer",
  manager: "Manager",
  admin: "Admin",
};

function getInitials(
  name: string | undefined,
  principal: string | null,
): string {
  if (name && name.trim().length > 0) {
    const parts = name.trim().split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
  }
  if (principal) {
    return principal.slice(0, 2).toUpperCase();
  }
  return "?";
}

export function ProfileRoute() {
  const { principal } = useAuth();
  const { data: profile, isError, error, refetch } = useMyProfile();
  const queryClient = useQueryClient();

  // --- Profile (name + store) edits ---
  const updateProfile = useUpdateMyProfile();
  const [name, setName] = useState("");
  const [storeLocation, setStoreLocation] = useState("");
  const [profileTouched, setProfileTouched] = useState(false);

  // Sync local form state when the profile loads.
  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setStoreLocation(profile.storeLocation);
      setProfileTouched(false);
    }
  }, [profile]);

  // --- Photo upload ---
  const setMyPhoto = useSetMyPhoto();
  const {
    uploadPhoto,
    isUploading,
    error: uploadError,
    reset,
  } = usePhotoUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoProcessing, setPhotoProcessing] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  // Crop step state — when set, CropPhotoModal is open with this image URL.
  // The URL is a short-lived object URL owned by this component and revoked
  // on confirm or cancel.
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);

  // --- Email change flow ---
  const initiateVerification = useInitiateEmailVerification();
  const setEmail = useSetEmailForUser();
  const [emailFormOpen, setEmailFormOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailStage, setEmailStage] = useState<EmailStage>("idle");
  const [emailError, setEmailError] = useState<string | null>(null);

  const initials = getInitials(profile?.name, principal);
  const photoBusy = photoProcessing || isUploading;

  const trimmedNewEmail = newEmail.trim();
  const newEmailValid = EMAIL_RE.test(trimmedNewEmail);

  const nameValid = name.trim().length > 0;
  const storeValid = storeLocation.trim().length > 0;
  const profileChanged =
    profileTouched &&
    (name.trim() !== (profile?.name ?? "") ||
      storeLocation.trim() !== (profile?.storeLocation ?? ""));
  const canSaveProfile = nameValid && storeValid && profileChanged;

  // --- Read-error guard ---
  if (isError) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-12">
        <div className="rounded-md border border-border bg-card p-6 text-center">
          <h1 className="font-display text-2xl uppercase text-foreground">
            Couldn&apos;t load your profile
          </h1>
          <p className="mt-2 font-body text-sm text-muted-foreground">
            We couldn&apos;t load your profile right now. Please try again.
          </p>
          {error ? (
            <p className="mt-2 font-body text-xs text-primary">
              {error.message}
            </p>
          ) : null}
          <Button
            type="button"
            className="mt-4 font-heading uppercase tracking-wide"
            onClick={() => void refetch()}
            data-ocid="profile.error.retry_button"
          >
            <RefreshCw className="size-4" aria-hidden />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // --- Loading / actor-not-ready ---
  if (profile === undefined) {
    return (
      <div
        className="mx-auto w-full max-w-3xl px-4 py-12"
        aria-busy="true"
        data-ocid="profile.loading_state"
      >
        <div className="flex items-center gap-3 font-body text-sm text-muted-foreground">
          <Loader2 className="size-5 animate-spin" aria-hidden />
          Loading your profile…
        </div>
      </div>
    );
  }

  // --- No profile yet (AuthGate normally intercepts, but guard anyway) ---
  if (profile === null) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-12 text-center">
        <h1 className="font-display text-3xl uppercase text-foreground">
          No profile yet
        </h1>
        <p className="mt-3 font-body text-sm text-muted-foreground">
          We couldn&apos;t find a profile for your account. Please sign in
          again.
        </p>
      </div>
    );
  }

  // --- Handlers ---

  async function handlePhotoChange(
    e: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    const file = e.target.files?.[0];
    // Always reset the input so re-selecting the same file fires change.
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setPhotoError("Please choose an image file (JPEG, PNG, or WebP).");
      return;
    }
    setPhotoError(null);
    // Open the crop modal with the selected image. The actual resize + upload
    // happens in handleCropConfirm once the user frames and confirms the crop.
    setCropImageSrc(URL.createObjectURL(file));
  }

  async function handleCropConfirm(croppedBlob: Blob): Promise<void> {
    if (!cropImageSrc) return;
    setPhotoProcessing(true);
    try {
      // Wrap the cropped Blob as a File so it flows through the existing
      // resizeImage() signature (which expects a File) unchanged.
      const croppedFile = new File([croppedBlob], "cropped-photo.jpg", {
        type: "image/jpeg",
      });
      const resized = await resizeImage(croppedFile, 1600, 0.8);
      const url = await uploadPhoto(resized);
      await new Promise<void>((resolve, reject) => {
        setMyPhoto.mutate(
          { photo: url },
          {
            onSuccess: () => resolve(),
            onError: (err) => reject(err),
          },
        );
      });
      toast.success("Profile photo updated.");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Could not upload the photo.";
      setPhotoError(msg);
      toast.error("Photo upload failed. Please try again.");
    } finally {
      setPhotoProcessing(false);
      // Revoke the object URL and close the modal regardless of outcome.
      URL.revokeObjectURL(cropImageSrc);
      setCropImageSrc(null);
    }
  }

  function handleCropCancel(): void {
    if (cropImageSrc) {
      URL.revokeObjectURL(cropImageSrc);
    }
    setCropImageSrc(null);
  }

  function handleRemovePhoto(): void {
    setPhotoError(null);
    reset();
    setMyPhoto.mutate(
      { photo: null },
      {
        onSuccess: () => toast.success("Profile photo removed."),
        onError: () => toast.error("Could not remove the photo."),
      },
    );
  }

  function handleSaveProfile(e: React.FormEvent): void {
    e.preventDefault();
    if (!canSaveProfile || updateProfile.isPending) return;
    updateProfile.mutate(
      { name: name.trim(), storeLocation: storeLocation.trim() },
      {
        onSuccess: () => {
          toast.success("Profile saved.");
          setProfileTouched(false);
        },
        onError: (err) =>
          toast.error(err.message || "Could not save your profile."),
      },
    );
  }

  function handleOpenEmailForm(): void {
    setEmailFormOpen(true);
    setNewEmail("");
    setEmailStage("idle");
    setEmailError(null);
  }

  function handleCloseEmailForm(): void {
    setEmailFormOpen(false);
    setNewEmail("");
    setEmailStage("idle");
    setEmailError(null);
  }

  function handleSendLink(e: React.FormEvent): void {
    e.preventDefault();
    if (!newEmailValid || emailStage === "sending") return;
    setEmailError(null);
    setEmailStage("sending");
    initiateVerification.mutate(trimmedNewEmail, {
      onSuccess: (result) => {
        if (result && typeof result === "object" && "__kind__" in result) {
          if (result.__kind__ === "ok") {
            setEmailStage("awaiting-confirmation");
            toast.success("Verification link sent. Check your inbox.");
          } else if (result.__kind__ === "err") {
            const errText =
              "err" in result ? String((result as { err: unknown }).err) : "";
            setEmailStage("idle");
            setEmailError(
              errText || "Could not send verification link. Try again.",
            );
          } else {
            setEmailStage("idle");
            setEmailError("Could not send verification link. Try again.");
          }
        } else {
          setEmailStage("awaiting-confirmation");
          toast.success("Verification link sent. Check your inbox.");
        }
      },
      onError: (err) => {
        setEmailStage("idle");
        setEmailError(err.message || "Could not send verification link.");
      },
    });
  }

  function handleConfirmVerification(e: React.FormEvent): void {
    e.preventDefault();
    if (emailStage === "verifying") return;
    setEmailError(null);
    setEmailStage("verifying");
    // Link-based flow: the user has already clicked the verification link in
    // their email, which recorded the address in verifiedEmails on the
    // canister. useSetEmailForUser(newEmail) checks verifiedEmails.contains
    // and saves the email, replacing the old one on record.
    setEmail.mutate(trimmedNewEmail, {
      onSuccess: () => {
        setEmailStage("success");
        toast.success("Email verified and saved.");
        queryClient.invalidateQueries({ queryKey: ["my-profile"] });
        // Close the form after a short success pause.
        setTimeout(() => {
          handleCloseEmailForm();
        }, 1200);
      },
      onError: (err) => {
        setEmailStage("awaiting-confirmation");
        setEmailError(
          err.message ||
            "We couldn't verify that email yet. Click the link in your email, then try again.",
        );
      },
    });
  }

  function handleBackToEmail(): void {
    setEmailStage("idle");
    setEmailError(null);
  }

  const emailVerified = Boolean(profile.email);
  const roleLabel = ROLE_LABELS[profile.role] ?? profile.role;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1
        className="font-display text-4xl uppercase leading-none tracking-wide text-foreground"
        data-ocid="profile.page.title"
      >
        Profile
      </h1>
      <p
        className="mt-2 font-body text-sm text-muted-foreground"
        data-ocid="profile.page.subtitle"
      >
        Your photo, contact email, and store details.
      </p>

      {/* ── Avatar + identity header ───────────────────────────────────── */}
      <section
        className="mt-6 flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6"
        data-ocid="profile.avatar_section"
      >
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={photoBusy}
            aria-label={
              profile.photo ? "Change profile photo" : "Upload profile photo"
            }
            data-ocid="profile.avatar.upload_button"
            className={cn(
              "profile-avatar size-28 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              photoBusy && "animate-profile-avatar-ring",
              photoBusy && "cursor-progress",
            )}
          >
            {profile.photo ? (
              <img src={profile.photo} alt="" />
            ) : (
              <span className="profile-avatar-initials text-3xl">
                {initials}
              </span>
            )}
            {!photoBusy ? (
              <span className="profile-avatar-upload">
                <Camera className="size-6" aria-hidden />
              </span>
            ) : null}
          </button>
          {photoBusy ? (
            <div
              className="absolute inset-0 flex items-center justify-center rounded-full bg-background/60"
              aria-live="polite"
              data-ocid="profile.avatar.loading_state"
            >
              <Loader2
                className="size-7 animate-spin text-primary"
                aria-hidden
              />
            </div>
          ) : null}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => void handlePhotoChange(e)}
            aria-label="Upload profile photo"
            data-ocid="profile.avatar.file_input"
          />
        </div>

        <div className="flex flex-col items-center gap-2 sm:items-start">
          <div className="flex items-center gap-2">
            <span
              className="font-heading text-xl uppercase tracking-wide text-foreground"
              data-ocid="profile.avatar.name"
            >
              {profile.name || "Unnamed Roadie"}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {profile.photo ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemovePhoto}
                disabled={photoBusy}
                data-ocid="profile.avatar.remove_button"
                className="font-heading text-xs uppercase tracking-wide text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" aria-hidden />
                Remove photo
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={photoBusy}
                data-ocid="profile.avatar.choose_button"
                className="font-heading text-xs uppercase tracking-wide text-muted-foreground hover:text-foreground"
              >
                <Upload className="size-3.5" aria-hidden />
                Upload photo
              </Button>
            )}
            <span
              className="font-body text-[11px] uppercase tracking-[0.14em] text-muted-foreground"
              data-ocid="profile.avatar.hint"
            >
              Optional · resized to 1600px
            </span>
          </div>
          {photoError ? (
            <p
              role="alert"
              className="font-body text-sm text-primary"
              data-ocid="profile.avatar.error_state"
            >
              {photoError}
            </p>
          ) : uploadError ? (
            <p
              role="alert"
              className="font-body text-sm text-primary"
              data-ocid="profile.avatar.upload_error_state"
            >
              {uploadError}
            </p>
          ) : null}
        </div>
      </section>

      {/* ── Profile details card (name + store) ───────────────────────── */}
      <section
        className="mt-8 rounded-md border border-border bg-card p-5"
        data-ocid="profile.details_section"
      >
        <h2 className="font-heading text-sm uppercase tracking-[0.18em] text-foreground/80">
          Your details
        </h2>
        <form
          onSubmit={handleSaveProfile}
          className="mt-4 flex flex-col gap-4"
          data-ocid="profile.details_form"
        >
          <div className="flex flex-col gap-2">
            <Label
              htmlFor="profile-name"
              className="font-heading uppercase tracking-wide"
            >
              Name
            </Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setProfileTouched(true);
              }}
              autoComplete="name"
              required
              disabled={updateProfile.isPending}
              data-ocid="profile.details.name_input"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label
              htmlFor="profile-store"
              className="font-heading uppercase tracking-wide"
            >
              Store location
            </Label>
            <Input
              id="profile-store"
              value={storeLocation}
              onChange={(e) => {
                setStoreLocation(e.target.value);
                setProfileTouched(true);
              }}
              autoComplete="organization"
              required
              disabled={updateProfile.isPending}
              data-ocid="profile.details.store_input"
            />
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="submit"
              disabled={!canSaveProfile || updateProfile.isPending}
              className="font-heading uppercase tracking-wide"
              data-ocid="profile.details.save_button"
            >
              {updateProfile.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Check className="size-4" aria-hidden />
                  Save changes
                </>
              )}
            </Button>
            {profileChanged && !updateProfile.isPending ? (
              <button
                type="button"
                onClick={() => {
                  setName(profile.name);
                  setStoreLocation(profile.storeLocation);
                  setProfileTouched(false);
                }}
                className="font-heading text-xs uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                data-ocid="profile.details.cancel_button"
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </section>

      {/* ── Email section ─────────────────────────────────────────────── */}
      <section
        className="mt-6 rounded-md border border-border bg-card p-5"
        data-ocid="profile.email_section"
      >
        <h2 className="font-heading text-sm uppercase tracking-[0.18em] text-foreground/80">
          Contact email
        </h2>

        {!emailFormOpen ? (
          <div
            className="mt-4 flex flex-col gap-3"
            data-ocid="profile.email.display"
          >
            <div className="flex flex-wrap items-center gap-2">
              {profile.email ? (
                <>
                  <Mail className="size-4 text-muted-foreground" aria-hidden />
                  <span
                    className="font-body text-sm text-foreground"
                    data-ocid="profile.email.value"
                  >
                    {profile.email}
                  </span>
                  {emailVerified ? (
                    <span
                      className="inline-flex items-center gap-1 rounded-full bg-profile-email-verified px-2.5 py-0.5 text-profile-email-verified-fg font-heading text-[10px] uppercase tracking-[0.14em]"
                      data-ocid="profile.email.verified_badge"
                    >
                      <ShieldCheck className="size-3" aria-hidden />
                      Verified
                    </span>
                  ) : (
                    <span
                      className="inline-flex items-center gap-1 rounded-full bg-profile-email-pending px-2.5 py-0.5 text-profile-email-pending-fg font-heading text-[10px] uppercase tracking-[0.14em]"
                      data-ocid="profile.email.pending_badge"
                    >
                      Pending
                    </span>
                  )}
                </>
              ) : (
                <span
                  className="font-body text-sm text-muted-foreground"
                  data-ocid="profile.email.empty_state"
                >
                  No email on file.
                </span>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenEmailForm}
              className="w-fit font-heading uppercase tracking-wide"
              data-ocid="profile.email.change_button"
            >
              {profile.email ? "Change email" : "Add email"}
            </Button>
          </div>
        ) : emailStage === "success" ? (
          <div
            className="mt-4 flex flex-col gap-3"
            data-ocid="profile.email.success_state"
          >
            <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2">
              <CheckCircle2 className="size-5 text-primary" aria-hidden />
              <span className="font-heading text-sm uppercase tracking-wide text-foreground">
                {trimmedNewEmail}
              </span>
            </div>
            <div className="flex items-center gap-2 font-body text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Saving…
            </div>
          </div>
        ) : emailStage === "awaiting-confirmation" ||
          emailStage === "verifying" ? (
          <div
            className="mt-4 flex flex-col gap-4"
            data-ocid="profile.email.confirm_form"
          >
            <div className="flex flex-col gap-2 rounded-md border border-border bg-background px-4 py-3">
              <div className="flex items-center gap-2">
                <MailCheck className="size-4 text-primary" aria-hidden />
                <span className="font-heading text-xs uppercase tracking-[0.14em] text-foreground/80">
                  Check your inbox
                </span>
              </div>
              <p className="font-body text-sm text-muted-foreground">
                We sent a verification link to{" "}
                <span className="text-foreground">{trimmedNewEmail}</span>.
                Click the link in your email, then come back and click Confirm.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                onClick={handleConfirmVerification}
                disabled={emailStage === "verifying"}
                className="font-heading uppercase tracking-wide"
                data-ocid="profile.email.confirm_button"
              >
                {emailStage === "verifying" ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Verifying…
                  </>
                ) : (
                  <>
                    <MailCheck className="size-4" aria-hidden />
                    Confirm verification
                  </>
                )}
              </Button>
              <button
                type="button"
                onClick={handleBackToEmail}
                className="inline-flex items-center gap-1.5 font-heading text-xs uppercase tracking-wide text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                data-ocid="profile.email.back_to_email_button"
              >
                <ArrowLeft className="size-4" aria-hidden />
                Use a different email
              </button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSendLink}
            className="mt-4 flex flex-col gap-4"
            data-ocid="profile.email.email_form"
          >
            <div className="flex flex-col gap-2">
              <Label
                htmlFor="profile-new-email"
                className="font-heading uppercase tracking-wide"
              >
                {profile.email ? "New email address" : "Email address"}
              </Label>
              {profile.email ? (
                <p className="font-body text-xs text-muted-foreground">
                  Current:{" "}
                  <span className="text-foreground">{profile.email}</span>.
                  We&apos;ll verify the new address before replacing it.
                </p>
              ) : null}
              <Input
                id="profile-new-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                autoFocus
                disabled={emailStage === "sending"}
                data-ocid="profile.email.new_email_input"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="submit"
                disabled={!newEmailValid || emailStage === "sending"}
                className="font-heading uppercase tracking-wide"
                data-ocid="profile.email.send_link_button"
              >
                {emailStage === "sending" ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    <Mail className="size-4" aria-hidden />
                    Send verification link
                  </>
                )}
              </Button>
              <button
                type="button"
                onClick={handleCloseEmailForm}
                className="inline-flex items-center gap-1.5 font-heading text-xs uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                data-ocid="profile.email.cancel_button"
              >
                <X className="size-4" aria-hidden />
                Cancel
              </button>
            </div>
          </form>
        )}

        {emailError ? (
          <p
            role="alert"
            className="mt-3 font-body text-sm text-primary"
            data-ocid="profile.email.error_state"
          >
            {emailError}
          </p>
        ) : null}
      </section>

      {/* ── Role (read-only) ─────────────────────────────────────────── */}
      <section
        className="mt-6 rounded-md border border-border bg-card p-5"
        data-ocid="profile.role_section"
      >
        <h2 className="font-heading text-sm uppercase tracking-[0.18em] text-foreground/80">
          Role
        </h2>
        <div className="mt-3 flex items-center gap-2">
          <ShieldCheck className="size-4 text-muted-foreground" aria-hidden />
          <span
            className="font-body text-sm text-foreground"
            data-ocid="profile.role.value"
          >
            {roleLabel}
          </span>
          <span className="font-body text-xs text-muted-foreground">
            · set by an admin
          </span>
        </div>
      </section>

      {/* ── Photo crop modal ─────────────────────────────────────────── */}
      {cropImageSrc ? (
        <CropPhotoModal
          imageSrc={cropImageSrc}
          onConfirm={(blob) => void handleCropConfirm(blob)}
          onCancel={handleCropCancel}
        />
      ) : null}
    </div>
  );
}
