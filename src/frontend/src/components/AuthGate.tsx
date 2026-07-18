import { useAuth } from "@/hooks/useAuth";
import { useBackend } from "@/hooks/useBackend";
import { useMyProfile } from "@/hooks/useMyProfile";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { CreateProfileScreen } from "./CreateProfileScreen";
import { QueryErrorState } from "./QueryErrorState";
import { SignInScreen } from "./SignInScreen";

/**
 * Auth gate for the entire app.
 *
 * - Not signed in → Internet Identity sign-in screen.
 * - Signed in but no profile → profile-creation form.
 * - Signed in with a profile → render the router outlet (children).
 *
 * No splash/loading screen — we open directly on the appropriate screen.
 *
 * On every sign-in we call `_initialize_access_control()` before the profile
 * is read/created. It is idempotent and ensures the first user is registered
 * as admin before `createMyProfile` runs (the backend assigns the admin role
 * in its `getMyProfile`/`createMyProfile` path based on access-control state).
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isInitializing, isLoggingIn, login, loginError } =
    useAuth();
  const { actor } = useBackend();
  const {
    data: profile,
    isLoading: profileLoading,
    isError: profileIsError,
    error: profileError,
    refetch: refetchProfile,
  } = useMyProfile();
  const queryClient = useQueryClient();

  // Tracks whether access-control init has been kicked off for the current
  // authenticated session. Reset to false on sign-out so a fresh sign-in
  // re-runs it.
  const [accessInitStarted, setAccessInitStarted] = useState(false);
  const [accessInitDone, setAccessInitDone] = useState(false);

  // Ref guard guarantees the init call is made at most once per
  // authenticated session, even if the effect re-runs due to dependency
  // changes (e.g. isFetching flapping). State alone is not enough because
  // state updates are async and the effect could re-enter before the
  // `accessInitStarted` state commit is observed.
  const initAttemptedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) {
      // Reset both state and ref on sign-out so a fresh sign-in re-runs init.
      initAttemptedRef.current = false;
      setAccessInitStarted(false);
      setAccessInitDone(false);
      return;
    }
    // Gate the body on actor + auth; the ref prevents re-entry even if
    // isFetching flaps and re-triggers this effect.
    if (!actor || initAttemptedRef.current) return;

    initAttemptedRef.current = true;
    setAccessInitStarted(true);
    let cancelled = false;
    actor
      ._initialize_access_control()
      .then(() => {
        if (cancelled) return;
        // Refetch the profile so any role sync performed by the backend's
        // getMyProfile path is reflected before the profile-creation
        // decision below.
        return queryClient.invalidateQueries({ queryKey: ["my-profile"] });
      })
      .then(() => {
        if (!cancelled) setAccessInitDone(true);
      })
      .catch((err) => {
        // Even on failure, unblock the gate so the user is never stuck on
        // the blank div. Log for diagnostics but never rethrow.
        console.error("AuthGate: _initialize_access_control() failed", err);
        if (!cancelled) setAccessInitDone(true);
      });
    return () => {
      cancelled = true;
    };
    // Deliberately exclude isFetching and accessInitStarted to avoid
    // flapping re-triggers; the initAttemptedRef guard handles exactly-once
    // semantics without needing state in the dependency array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, actor, queryClient]);

  // Safety timeout fallback: if accessInitDone is still false 8s after we
  // started init for an authenticated session, force-unblock the gate so
  // the app can never get stuck on the blank loading div forever.
  useEffect(() => {
    if (!isAuthenticated || !accessInitStarted || accessInitDone) return;
    const timeout = setTimeout(() => {
      setAccessInitDone(true);
    }, 8000);
    return () => clearTimeout(timeout);
  }, [isAuthenticated, accessInitStarted, accessInitDone]);

  // II is restoring a stored identity — keep the screen dark and quiet
  // without flashing a sign-in screen. This is a brief init, not a splash.
  if (isInitializing) {
    return (
      <output className="min-h-dvh bg-background block" aria-busy="true">
        <span className="sr-only">Loading…</span>
      </output>
    );
  }

  if (!isAuthenticated) {
    return (
      <SignInScreen
        onSignIn={login}
        isLoggingIn={isLoggingIn}
        error={loginError}
      />
    );
  }

  // Authenticated — wait for access-control init to complete (and the
  // subsequent profile refetch to settle) before deciding which screen to
  // show. This guarantees the first user is registered as admin before
  // CreateProfileScreen calls createMyProfile.
  if (!accessInitDone || (profileLoading && profile === undefined)) {
    return (
      <output className="min-h-dvh bg-background block" aria-busy="true">
        <span className="sr-only">Loading…</span>
      </output>
    );
  }

  // Profile read failed — show a retryable inline error instead of falling
  // through to CreateProfileScreen. Without this guard, an errored read leaves
  // `profile` undefined→null with profileLoading false, which would otherwise
  // be indistinguishable from a confirmed-empty profile.
  if (profileIsError) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-4">
        <div className="w-full max-w-md">
          <QueryErrorState
            title="Couldn't load your profile"
            description="We couldn't load your profile right now. Please try again."
            error={profileError}
            onRetry={() => {
              void refetchProfile();
            }}
          />
        </div>
      </div>
    );
  }

  // Confirmed empty (query succeeded, no profile) — create one.
  if (!profile) {
    return <CreateProfileScreen />;
  }

  return <>{children}</>;
}
