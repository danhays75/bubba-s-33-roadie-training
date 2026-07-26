import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useRedirectAuth } from "@/hooks/useRedirectAuth";
import {
  ChevronDown,
  HelpCircle,
  Lightbulb,
  Loader2,
  Sparkles,
} from "lucide-react";

interface SignInScreenProps {
  onSignIn: () => void;
  isLoggingIn: boolean;
  error?: Error;
}

/**
 * Detects mobile/iOS user agents so the redirect sign-in flow can be offered
 * (and preferred) where the II popup is unreliable. Covers iPhone, iPad, iPod,
 * and iPadOS (which reports as Macintosh but has touch support).
 */
function isMobileUserAgent(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return true;
  // iPadOS 13+ reports as Macintosh with touch support.
  if (/macintosh/i.test(ua) && (navigator.maxTouchPoints ?? 0) > 1) return true;
  return /android/i.test(ua);
}

/**
 * Detects the iOS Safari "channel was closed before response was received"
 * failure that occurs when the Internet Identity popup is suspended or closed
 * before the delegation returns. Matched case-insensitively so minor wording
 * variants are still caught. Treated as a transient, retryable error —
 * distinct from a user-cancelled sign-in.
 */
function isChannelClosedError(err?: Error): boolean {
  if (!err || !err.message) return false;
  return err.message.toLowerCase().includes("channel was closed");
}

/**
 * Dark-themed Internet Identity sign-in screen.
 *
 * Bubba's 33 wordmark in Anton, a slim red-white-navy stripe accent, and a
 * friendly "Sign In / Get Started" button. No splash — this IS the entry
 * screen for unauthenticated users.
 *
 * A guidance card sits above the primary button to walk first-time Roadies
 * through the Google sign-in flow, and a collapsible "Trouble signing in?"
 * section below the button offers three quick steps plus a passkey tip.
 *
 * When the II popup fails with the iOS Safari "channel was closed" error, a
 * plain-language explanation and a prominent "Try again" button are shown.
 * Other errors get a friendly plain message too — raw error text is never
 * surfaced to the Roadie.
 */
export function SignInScreen({
  onSignIn,
  isLoggingIn,
  error,
}: SignInScreenProps) {
  const showRetry = !!error;
  const channelClosed = isChannelClosedError(error);
  const { loginWithRedirect, isRedirecting } = useRedirectAuth();
  const isMobile = isMobileUserAgent();
  // Show the redirect fallback when the popup failed with the channel-closed
  // error OR when the user is on mobile/iOS where the popup is unreliable.
  const showRedirect = channelClosed || isMobile;
  // On mobile, the redirect flow is the primary action; the popup "Try again"
  // button stays as a secondary fallback. On desktop, the popup remains
  // primary and the redirect button is a secondary option shown only after a
  // channel-closed failure.
  const redirectIsPrimary = isMobile;
  const busy = isLoggingIn || isRedirecting;

  // Friendly, non-technical error copy. Raw error.message is never shown.
  const friendlyErrorCopy = channelClosed
    ? "The sign-in window closed before it finished. Tap Try again, or use the redirect sign-in below."
    : "That didn't go through — this can happen if the window closed early. Tap Try again.";

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6">
      <div className="flex w-full max-w-sm flex-col items-center text-center">
        {/*
          Brand wordmark — horizontal Bubba's 33 logo with a transparent
          background, so no frame or card is needed. Sized large as the
          visual anchor of the entry screen; max-w-full keeps it responsive on
          narrow phones. Intrinsic width/height attributes reserve layout
          space to avoid CLS before the WebP loads.
        */}
        <img
          src="/assets/brand/logo-horizontal.webp"
          alt="Bubba's 33"
          width={640}
          height={240}
          className="mt-2 h-auto w-full max-w-[20rem]"
          data-ocid="signin.brand_logo"
        />
        <p className="mt-2 font-heading text-sm uppercase tracking-[0.2em] text-muted-foreground">
          Roadie Training
        </p>

        {/* slim red-white-navy stripe accent */}
        <div
          className="mt-6 flex h-1.5 w-40 overflow-hidden rounded-full"
          aria-hidden
        >
          <span className="flex-1 bg-primary" />
          <span className="flex-1 bg-foreground" />
          <span className="flex-1 bg-secondary" />
        </div>

        {/* First-time guidance card — visible by default, above the button */}
        <div
          className="mt-6 w-full rounded-md border border-border bg-card p-4 text-left"
          data-ocid="signin.guidance_card"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" aria-hidden />
            <h2 className="font-heading text-sm uppercase tracking-wide text-foreground">
              First time? Here&rsquo;s the easy way.
            </h2>
          </div>
          <p className="mt-2 font-body text-sm leading-relaxed text-muted-foreground">
            When the login window opens, choose{" "}
            <span className="font-semibold text-foreground">
              Continue with Google
            </span>{" "}
            and use your personal Google account. There&rsquo;s no password to
            remember, and it works on any device — your phone, a tablet, or the
            back-office computer.
          </p>
        </div>

        {redirectIsPrimary ? (
          // Mobile/iOS: redirect is the primary action (popup is unreliable).
          <Button
            variant="default"
            size="lg"
            className="mt-6 w-full font-heading uppercase tracking-wide"
            onClick={loginWithRedirect}
            disabled={busy}
            data-ocid="signin.redirect_primary_button"
          >
            {isRedirecting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Redirecting…
              </>
            ) : (
              <span className="flex flex-col items-center leading-tight">
                <span>Sign In / Get Started</span>
                <span className="font-body text-[11px] font-normal normal-case tracking-normal opacity-70">
                  Secured by Internet Identity.
                </span>
              </span>
            )}
          </Button>
        ) : (
          // Desktop: popup remains the primary action.
          <Button
            variant="default"
            size="lg"
            className="mt-6 w-full font-heading uppercase tracking-wide"
            onClick={onSignIn}
            disabled={busy}
            data-ocid="signin.primary_button"
          >
            {isLoggingIn ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Connecting…
              </>
            ) : (
              <span className="flex flex-col items-center leading-tight">
                <span>Sign In / Get Started</span>
                <span className="font-body text-[11px] font-normal normal-case tracking-normal opacity-70">
                  Secured by Internet Identity.
                </span>
              </span>
            )}
          </Button>
        )}

        {error && (
          <p
            role="alert"
            className="mt-4 font-body text-sm text-primary"
            data-ocid="signin.error_state"
          >
            {friendlyErrorCopy}
          </p>
        )}

        {showRetry && channelClosed && (
          <p
            className="mt-2 font-body text-sm text-muted-foreground"
            data-ocid="signin.channel_closed_message"
          >
            The sign-in window closed before it finished. Tap Try again, or use
            the redirect sign-in below.
          </p>
        )}

        {showRedirect && (
          <Button
            variant={redirectIsPrimary ? "outline" : "default"}
            size="lg"
            className="mt-4 w-full font-heading uppercase tracking-wide"
            onClick={loginWithRedirect}
            disabled={busy}
            data-ocid="signin.redirect_button"
          >
            {isRedirecting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Redirecting…
              </>
            ) : (
              "Sign in (redirect)"
            )}
          </Button>
        )}

        {showRetry && (
          <Button
            variant="outline"
            size="lg"
            className="mt-4 w-full font-heading uppercase tracking-wide"
            onClick={onSignIn}
            disabled={busy}
            data-ocid="signin.retry_button"
          >
            {isLoggingIn ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Connecting…
              </>
            ) : (
              "Try again"
            )}
          </Button>
        )}

        {/* Collapsible help — below the primary button and error/retry UI */}
        <Collapsible className="mt-6 w-full">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-card px-4 py-3 font-heading text-sm uppercase tracking-wide text-foreground transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              data-ocid="signin.help_toggle"
            >
              <HelpCircle className="size-4 text-primary" aria-hidden />
              <span>Trouble signing in?</span>
              <ChevronDown
                className="size-4 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180"
                aria-hidden
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent
            className="mt-2 w-full rounded-md border border-border bg-card p-4 text-left"
            data-ocid="signin.help_content"
          >
            <ol className="space-y-2 font-body text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="font-heading font-semibold text-primary">
                  1.
                </span>
                <span>Tap Sign In.</span>
              </li>
              <li className="flex gap-2">
                <span className="font-heading font-semibold text-primary">
                  2.
                </span>
                <span>
                  In the window that opens, choose{" "}
                  <span className="font-semibold text-foreground">
                    Continue with Google
                  </span>{" "}
                  (Apple or Microsoft also work).
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-heading font-semibold text-primary">
                  3.
                </span>
                <span>Pick your account and you&rsquo;re in.</span>
              </li>
            </ol>
            <div className="mt-3 flex items-start gap-2 border-t border-border pt-3">
              <Lightbulb
                className="mt-0.5 size-4 shrink-0 text-primary"
                aria-hidden
              />
              <p className="font-body text-sm leading-relaxed text-foreground">
                Avoid &ldquo;Create a passkey&rdquo; if you switch between
                devices — a passkey only works on the one device it was made on.
                Continue with Google follows you everywhere.
              </p>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}
