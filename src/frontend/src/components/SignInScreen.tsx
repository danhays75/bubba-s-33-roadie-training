import { Button } from "@/components/ui/button";
import { useRedirectAuth } from "@/hooks/useRedirectAuth";
import { Loader2 } from "lucide-react";

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
 * single "Sign in with Internet Identity" button. No splash — this IS the
 * entry screen for unauthenticated users.
 *
 * When the II popup fails with the iOS Safari "channel was closed" error, a
 * human-readable explanation and a prominent "Try again" button are shown
 * alongside the existing error paragraph. Other errors keep the raw message
 * but still offer "Try again" so the user is never stuck on a dead screen.
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

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6">
      <div className="flex w-full max-w-sm flex-col items-center text-center">
        <h1 className="font-display text-5xl uppercase leading-none tracking-wide text-foreground">
          Bubba&rsquo;s 33
        </h1>
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

        {redirectIsPrimary ? (
          // Mobile/iOS: redirect is the primary action (popup is unreliable).
          <Button
            variant="default"
            size="lg"
            className="mt-10 w-full font-heading uppercase tracking-wide"
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
              "Sign in with Internet Identity"
            )}
          </Button>
        ) : (
          // Desktop: popup remains the primary action.
          <Button
            variant="default"
            size="lg"
            className="mt-10 w-full font-heading uppercase tracking-wide"
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
              "Sign in with Internet Identity"
            )}
          </Button>
        )}

        {error && (
          <p
            role="alert"
            className="mt-4 font-body text-sm text-primary"
            data-ocid="signin.error_state"
          >
            {error.message || "Sign-in failed. Try again."}
          </p>
        )}

        {showRetry && channelClosed && (
          <p
            className="mt-2 font-body text-sm text-muted-foreground"
            data-ocid="signin.channel_closed_message"
          >
            The sign-in window closed before it could finish. This can happen on
            iPhone Safari when the popup is suspended. Use the redirect sign-in
            below to continue in this tab, or tap Try again to re-open the
            popup.
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
      </div>
    </div>
  );
}
