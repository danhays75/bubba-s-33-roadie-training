import { useInternetIdentity } from "@caffeineai/core-infrastructure";

/**
 * Wraps the existing InternetIdentityProvider context to expose the signed-in
 * principal (as a string), the raw Identity, and login/clear helpers.
 *
 * Use `isAuthenticated` for gating authenticated UI — it is true for both
 * interactive logins AND restored sessions on page reload.
 */
export function useAuth() {
  const {
    identity,
    login,
    clear,
    loginStatus,
    isInitializing,
    isLoggingIn,
    isLoginError,
    isAuthenticated,
    loginError,
  } = useInternetIdentity();

  const principal = identity?.getPrincipal()?.toText() ?? null;

  return {
    identity,
    principal,
    login,
    clear,
    loginStatus,
    isInitializing,
    isLoggingIn,
    isLoginError,
    isAuthenticated,
    loginError,
  };
}
