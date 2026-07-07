import { AuthClient } from "@icp-sdk/auth/client";
import { useCallback, useEffect, useState } from "react";

/**
 * Redirect-based Internet Identity sign-in fallback.
 *
 * The popup flow used by `@caffeineai/core-infrastructure`'s
 * `InternetIdentityProvider` fails on iOS Safari (the popup is suspended,
 * producing a "channel was closed before response was received" error) and on
 * browsers with aggressive popup blockers. This hook builds a separate
 * `AuthClient` configured WITHOUT `windowOpenerFeatures`, which makes the
 * `@icp-sdk/auth` SDK perform a same-tab redirect to Internet Identity instead
 * of opening a popup window.
 *
 * On return from II, the SDK restores the delegation into the same shared
 * IndexedDB store + `ic-delegation_expiration` localStorage key that the
 * `InternetIdentityProvider` reads during its own hydration. We then force a
 * `window.location.reload()` so the provider re-hydrates and the existing
 * `useAuth`/`isAuthenticated` flow picks up the session — no changes to the
 * provider tree, AuthGate, or admin logic are required.
 *
 * The existing popup login (`useAuth().login`) stays as the primary desktop
 * flow; this hook is only invoked from `SignInScreen` when the popup fails or
 * on mobile/iOS.
 */

// 8 hours in nanoseconds — matches the SDK default maxTimeToLive.
const EIGHT_HOURS_NS = BigInt(8 * 60 * 60 * 1000 * 1000 * 1000);

let redirectClient: AuthClient | null = null;

/**
 * Lazily creates the redirect-mode AuthClient. Created without
 * `windowOpenerFeatures` so the SDK navigates the current tab to Internet
 * Identity instead of opening a popup. No `identityProvider` or
 * `derivationOrigin` is set, mirroring the default configuration used by the
 * app's `InternetIdentityProvider` (see main.tsx).
 */
async function getRedirectClient(): Promise<AuthClient> {
  if (redirectClient) return redirectClient;
  redirectClient = new AuthClient({
    // No windowOpenerFeatures => same-tab redirect mode.
  });
  return redirectClient;
}

export function useRedirectAuth() {
  const [isRedirecting, setIsRedirecting] = useState(false);

  const loginWithRedirect = useCallback(async () => {
    setIsRedirecting(true);
    try {
      const client = await getRedirectClient();
      // signIn with no windowOpenerFeatures on the client triggers a same-tab
      // redirect to II. The promise resolves only if the redirect completes
      // in-tab (e.g. when the SDK falls back to popup); in the true redirect
      // case the page navigates away and this line never resolves — instead
      // the page reloads on return and the provider re-hydrates.
      await client.signIn({ maxTimeToLive: EIGHT_HOURS_NS });
      // If we reach here the session was restored into the shared store.
      // Force a reload so InternetIdentityProvider re-hydrates from storage.
      window.location.reload();
    } catch (e) {
      setIsRedirecting(false);
      throw e;
    }
  }, []);

  // Eagerly initialize the redirect client on mount so its automatic
  // hydration runs. If we are returning from an II redirect, the AuthClient's
  // constructor-time hydration has already restored the session into the
  // shared IndexedDB store; the existing useAuth/isAuthenticated flow picks
  // it up on the next render. This effect does not change UI state.
  useEffect(() => {
    getRedirectClient().catch(() => {
      // Initialization failure is non-fatal — the popup flow remains usable.
    });
  }, []);

  return { loginWithRedirect, isRedirecting };
}
