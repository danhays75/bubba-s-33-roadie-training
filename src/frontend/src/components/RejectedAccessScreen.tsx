import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, LogOut, ShieldX } from "lucide-react";
import { useState } from "react";

/**
 * Access-denied screen. Shown by AuthGate when an authenticated user has a
 * profile whose `approvalStatus` is `rejected`.
 *
 * The app is fully blocked — no routes or admin features are reachable. The
 * user sees a clear message that their access request was not approved and a
 * way to sign out.
 */
export function RejectedAccessScreen() {
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
          data-ocid="rejected_access.icon"
        >
          <ShieldX className="size-7 text-primary" aria-hidden />
        </div>

        <h1
          className="mt-6 font-display text-4xl uppercase leading-none tracking-wide text-foreground"
          data-ocid="rejected_access.title"
        >
          Access denied
        </h1>

        <p
          className="mt-3 font-body text-sm leading-relaxed text-muted-foreground"
          data-ocid="rejected_access.message"
        >
          Your access request was not approved. You can&rsquo;t use
          Bubba&rsquo;s 33 Roadie Training with this account. If you think this
          is a mistake, please contact an admin.
        </p>

        <Button
          type="button"
          variant="outline"
          size="lg"
          className="mt-8 w-full font-heading uppercase tracking-wide"
          onClick={handleSignOut}
          disabled={isSigningOut}
          data-ocid="rejected_access.sign_out_button"
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
