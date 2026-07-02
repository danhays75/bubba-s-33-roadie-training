import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface SignInScreenProps {
  onSignIn: () => void;
  isLoggingIn: boolean;
  error?: Error;
}

/**
 * Dark-themed Internet Identity sign-in screen.
 *
 * Bubba's 33 wordmark in Anton, a slim red-white-navy stripe accent, and a
 * single "Sign in with Internet Identity" button. No splash — this IS the
 * entry screen for unauthenticated users.
 */
export function SignInScreen({
  onSignIn,
  isLoggingIn,
  error,
}: SignInScreenProps) {
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

        <Button
          variant="default"
          size="lg"
          className="mt-10 w-full font-heading uppercase tracking-wide"
          onClick={onSignIn}
          disabled={isLoggingIn}
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

        {error && (
          <p
            role="alert"
            className="mt-4 font-body text-sm text-primary"
            data-ocid="signin.error_state"
          >
            {error.message || "Sign-in failed. Try again."}
          </p>
        )}
      </div>
    </div>
  );
}
