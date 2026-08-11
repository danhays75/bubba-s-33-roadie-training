import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, LogOut, ShieldCheck } from "lucide-react";
import { useState } from "react";

/**
 * Pending-approval screen. Shown by AuthGate when an authenticated user has
 * a profile whose `approvalStatus` is `pending`.
 *
 * The app is fully blocked — no routes or admin features are reachable. The
 * user sees a clear message that an admin is reviewing their access request
 * and a way to sign out. The gate re-checks approval status on each sign-in
 * (or session refresh), so once an admin approves them they will gain access
 * on next sign-in.
 */
export function PendingApprovalScreen() {
  const { clear } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  function handleSignOut() {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      clear();
    } finally {
      // The AuthGate flips to the SignInScreen once isAuthenticated becomes
      // false; the local spinner is just for the click feedback window.
      setIsSigningOut(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 py-10">
      <div className="flex w-full max-w-sm flex-col items-center text-center">
        <div
          className="flex size-14 items-center justify-center rounded-full border border-border bg-card"
          data-ocid="pending_approval.icon"
        >
          <ShieldCheck className="size-7 text-primary" aria-hidden />
        </div>

        <h1
          className="mt-6 font-display text-4xl uppercase leading-none tracking-wide text-foreground"
          data-ocid="pending_approval.title"
        >
          Access pending
        </h1>

        <p
          className="mt-3 font-body text-sm leading-relaxed text-muted-foreground"
          data-ocid="pending_approval.message"
        >
          An admin is reviewing your access request. You&rsquo;ll be able to
          sign in and use Lake Charles Quik Reference once your access is
          approved. Check back shortly, or sign out and try again later.
        </p>

        <Button
          type="button"
          variant="outline"
          size="lg"
          className="mt-8 w-full font-heading uppercase tracking-wide"
          onClick={handleSignOut}
          disabled={isSigningOut}
          data-ocid="pending_approval.sign_out_button"
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
