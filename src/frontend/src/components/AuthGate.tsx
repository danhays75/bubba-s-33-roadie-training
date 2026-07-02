import { useAuth } from "@/hooks/useAuth";
import { useMyProfile } from "@/hooks/useMyProfile";
import { CreateProfileScreen } from "./CreateProfileScreen";
import { SignInScreen } from "./SignInScreen";

/**
 * Auth gate for the entire app.
 *
 * - Not signed in → Internet Identity sign-in screen.
 * - Signed in but no profile → profile-creation form.
 * - Signed in with a profile → render the router outlet (children).
 *
 * No splash/loading screen — we open directly on the appropriate screen.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isInitializing, isLoggingIn, login, loginError } =
    useAuth();
  const { data: profile, isLoading: profileLoading } = useMyProfile();

  // II is restoring a stored identity — keep the screen dark and quiet
  // without flashing a sign-in screen. This is a brief init, not a splash.
  if (isInitializing) {
    return <div className="min-h-dvh bg-background" aria-hidden />;
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

  // Authenticated but profile not loaded yet — keep dark screen briefly.
  if (profileLoading && profile === undefined) {
    return <div className="min-h-dvh bg-background" aria-hidden />;
  }

  if (!profile) {
    return <CreateProfileScreen />;
  }

  return <>{children}</>;
}
