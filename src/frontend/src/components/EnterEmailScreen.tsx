import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import {
  useInitiateEmailVerification,
  useSetEmailForUser,
} from "@/hooks/useMyProfile";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  LogOut,
  Mail,
  MailCheck,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

/**
 * EnterEmailScreen — shown by AuthGate to plain-II users who have no
 * email on record (profile.email is null/undefined).
 *
 * Link-based verification flow:
 *   1. User types their email → useInitiateEmailVerification(email)
 *      sends a verification email containing a click-through link.
 *   2. UI shows "check your email and click the verification link".
 *   3. User clicks the link in their email (this records the address in
 *      verifiedEmails on the canister), then returns to the app and clicks
 *      "Confirm verification" → useSetEmailForUser(email) checks
 *      verifiedEmails.contains and saves the email.
 *
 * The screen is shown regardless of approval status (pending OR approved)
 * so plain-II users can enter their email while still pending admin
 * approval. On success, ['my-profile'] is invalidated so AuthGate
 * re-evaluates and falls through to the approval-status branches.
 *
 * Styled in the dark roadhouse theme: dark background, red/amber accents,
 * Barlow body + Oswald headings, matching SignInScreen/CreateProfileScreen.
 *
 * Feedback states: idle → sending → awaiting-confirmation → verifying →
 * success → error. A sign-out button is always available.
 */

type Stage =
  | "idle"
  | "sending"
  | "awaiting-confirmation"
  | "verifying"
  | "success";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function EnterEmailScreen() {
  const { clear } = useAuth();
  const queryClient = useQueryClient();
  const initiateVerification = useInitiateEmailVerification();
  const setEmail = useSetEmailForUser();

  const [email, setEmailValue] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const trimmedEmail = email.trim();
  const emailValid = EMAIL_RE.test(trimmedEmail);

  function handleSignOut() {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      clear();
      queryClient.clear();
    } finally {
      setIsSigningOut(false);
    }
  }

  function handleSendLink(e: React.FormEvent) {
    e.preventDefault();
    if (!emailValid || stage === "sending") return;
    setErrorMessage(null);
    setStage("sending");
    initiateVerification.mutate(trimmedEmail, {
      onSuccess: (result) => {
        // Backend SendResult: { __kind__: 'ok' } | { __kind__: 'err', err: string }
        if (result && typeof result === "object" && "__kind__" in result) {
          if (result.__kind__ === "ok") {
            setStage("awaiting-confirmation");
            toast.success("Verification link sent. Check your inbox.");
          } else if (result.__kind__ === "err") {
            const errText =
              "err" in result ? String((result as { err: unknown }).err) : "";
            setStage("idle");
            setErrorMessage(
              errText || "Could not send verification link. Try again.",
            );
          } else {
            setStage("idle");
            setErrorMessage("Could not send verification link. Try again.");
          }
        } else {
          setStage("awaiting-confirmation");
          toast.success("Verification link sent. Check your inbox.");
        }
      },
      onError: (err) => {
        setStage("idle");
        setErrorMessage(err.message || "Could not send verification link.");
      },
    });
  }

  function handleConfirmVerification(e: React.FormEvent) {
    e.preventDefault();
    if (stage === "verifying") return;
    setErrorMessage(null);
    setStage("verifying");
    // Link-based flow: the user has already clicked the verification link in
    // their email, which recorded the address in verifiedEmails on the
    // canister. useSetEmailForUser(email) checks verifiedEmails.contains
    // and saves the email on the profile.
    setEmail.mutate(trimmedEmail, {
      onSuccess: () => {
        setStage("success");
        toast.success("Email verified and saved.");
        // Invalidate so AuthGate re-evaluates and falls through to the
        // approval-status branches (the email is now on record).
        queryClient.invalidateQueries({ queryKey: ["my-profile"] });
      },
      onError: (err) => {
        setStage("awaiting-confirmation");
        setErrorMessage(
          err.message ||
            "We couldn't verify that email yet. Click the link in your email, then try again.",
        );
      },
    });
  }

  function handleBackToEmail() {
    setStage("idle");
    setErrorMessage(null);
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <div
            className="mx-auto flex size-14 items-center justify-center rounded-full border border-border bg-card"
            data-ocid="enter_email.icon"
          >
            {stage === "success" ? (
              <CheckCircle2 className="size-7 text-primary" aria-hidden />
            ) : stage === "awaiting-confirmation" || stage === "verifying" ? (
              <MailCheck className="size-7 text-primary" aria-hidden />
            ) : (
              <Mail className="size-7 text-primary" aria-hidden />
            )}
          </div>

          <h1
            className="mt-6 font-display text-4xl uppercase leading-none tracking-wide text-foreground"
            data-ocid="enter_email.title"
          >
            {stage === "success" ? "All set" : "Enter your email"}
          </h1>

          <p
            className="mt-3 font-body text-sm leading-relaxed text-muted-foreground"
            data-ocid="enter_email.subtitle"
          >
            {stage === "success"
              ? "Your email is verified and saved. Taking you in…"
              : stage === "awaiting-confirmation" || stage === "verifying"
                ? "We sent a verification link to your email. Click the link in your email to verify your address, then come back and click Confirm below."
                : "Add an email so we can reach you. We'll send a verification link to confirm it's yours."}
          </p>
        </div>

        {stage === "success" ? (
          <div
            className="mt-8 flex flex-col items-center gap-4"
            data-ocid="enter_email.success_state"
          >
            <div className="flex items-center gap-2 rounded-md border border-border bg-card px-4 py-3">
              <CheckCircle2 className="size-5 text-primary" aria-hidden />
              <span className="font-heading text-sm uppercase tracking-wide text-foreground">
                {trimmedEmail}
              </span>
            </div>
            <div className="flex items-center gap-2 font-body text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Loading…
            </div>
          </div>
        ) : stage === "awaiting-confirmation" || stage === "verifying" ? (
          <form
            onSubmit={handleConfirmVerification}
            className="mt-8 flex flex-col gap-5"
            data-ocid="enter_email.confirm_form"
          >
            <div
              className="rounded-md border border-border bg-card px-4 py-3"
              data-ocid="enter_email.awaiting_message"
            >
              <p className="font-body text-sm leading-relaxed text-muted-foreground">
                We sent a verification link to{" "}
                <span className="font-heading text-sm uppercase tracking-wide text-foreground">
                  {trimmedEmail}
                </span>
                . Click the link in your email to verify your address, then come
                back and click Confirm below.
              </p>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full font-heading uppercase tracking-wide"
              disabled={stage === "verifying"}
              data-ocid="enter_email.confirm_button"
            >
              {stage === "verifying" ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Verifying…
                </>
              ) : (
                "Confirm verification"
              )}
            </Button>

            <button
              type="button"
              onClick={handleBackToEmail}
              className="inline-flex items-center justify-center gap-1.5 font-heading text-xs uppercase tracking-wide text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              data-ocid="enter_email.back_to_email_button"
            >
              <ArrowLeft className="size-4" aria-hidden />
              Use a different email
            </button>
          </form>
        ) : (
          <form
            onSubmit={handleSendLink}
            className="mt-8 flex flex-col gap-5"
            data-ocid="enter_email.email_form"
          >
            <div className="flex flex-col gap-2">
              <Label
                htmlFor="email"
                className="font-heading uppercase tracking-wide"
              >
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmailValue(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                autoFocus
                data-ocid="enter_email.email_input"
              />
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full font-heading uppercase tracking-wide"
              disabled={!emailValid || stage === "sending"}
              data-ocid="enter_email.send_link_button"
            >
              {stage === "sending" ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Sending…
                </>
              ) : (
                "Send verification link"
              )}
            </Button>
          </form>
        )}

        {errorMessage && (
          <p
            role="alert"
            className="mt-4 font-body text-sm text-primary"
            data-ocid="enter_email.error_state"
          >
            {errorMessage}
          </p>
        )}

        <Button
          type="button"
          variant="outline"
          size="lg"
          className="mt-8 w-full font-heading uppercase tracking-wide"
          onClick={handleSignOut}
          disabled={isSigningOut}
          data-ocid="enter_email.sign_out_button"
        >
          {isSigningOut ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Signing out…
            </>
          ) : (
            <>
              <LogOut className="size-4" aria-hidden />
              Sign out
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
