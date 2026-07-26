import { useAuth } from "@/hooks/useAuth";
import { useMyProfile } from "@/hooks/useMyProfile";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { Link, Outlet } from "@tanstack/react-router";
import { LogOut } from "lucide-react";

/**
 * Shared layout for all authenticated pages.
 *
 * Black top nav bar with a thin red bottom border. Bubba's 33 wordmark in
 * Anton on the left; the signed-in user's avatar/initials on the right.
 * The main content area uses the dark `bg-background` token.
 */
export function Layout() {
  const { principal, clear } = useAuth();
  const { data: profile } = useMyProfile();
  const queryClient = useQueryClient();

  const handleLogout = () => {
    clear();
    queryClient.clear();
  };

  const initials = getInitials(profile?.name, principal);
  const isAdmin = profile?.role === "admin";
  const isManager = profile?.role === "manager";
  const canOpenNewStore = isAdmin || isManager;

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header
        className={cn(
          "sticky top-0 z-40 bg-nav border-b border-primary",
          "shadow-roadie",
        )}
      >
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-4">
          <Link
            to="/"
            aria-label="Bubba's 33 — home"
            className="flex items-center transition-colors duration-200 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-nav"
            data-ocid="layout.brand_link"
          >
            {/*
              Brand wordmark — horizontal Bubba's 33 logo with a transparent
              background, so it reads as an integrated nav wordmark with no
              frame. Height-clamped to 2.25rem (36px) so it fits the 56px
              sticky header with vertical breathing room; width auto preserves
              the aspect ratio. Intrinsic width/height reserve layout space to
              avoid CLS.
            */}
            <img
              src="/assets/brand/logo-horizontal.webp"
              alt="Bubba's 33"
              width={640}
              height={240}
              className="h-9 w-auto"
            />
          </Link>
          <div className="flex items-center gap-3">
            {canOpenNewStore && (
              <Link
                to="/new-store-opening"
                className={cn(
                  "rounded-md border border-primary/60 px-3 py-1.5",
                  "font-heading text-xs uppercase tracking-wide text-foreground",
                  "transition-colors duration-200 hover:bg-primary hover:text-primary-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-nav",
                )}
                activeProps={{
                  className: "bg-primary text-primary-foreground",
                }}
                data-ocid="layout.new_store_opening_link"
              >
                New Store Opening
              </Link>
            )}
            {isAdmin && (
              <Link
                to="/admin"
                className={cn(
                  "rounded-md border border-primary/60 px-3 py-1.5",
                  "font-heading text-xs uppercase tracking-wide text-foreground",
                  "transition-colors duration-200 hover:bg-primary hover:text-primary-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-nav",
                )}
                data-ocid="layout.admin_link"
              >
                Admin
              </Link>
            )}
            <Link
              to="/profile"
              className={cn(
                "rounded-md border border-primary/60 px-3 py-1.5",
                "font-heading text-xs uppercase tracking-wide text-foreground",
                "transition-colors duration-200 hover:bg-primary hover:text-primary-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-nav",
              )}
              activeProps={{
                className: "bg-primary text-primary-foreground",
              }}
              data-ocid="layout.profile_link"
            >
              Profile
            </Link>
            <Link
              to="/profile"
              aria-label="View your profile"
              data-ocid="layout.user_avatar"
              className="profile-avatar size-8 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-nav"
            >
              {profile?.photo ? (
                <img
                  src={profile.photo}
                  alt=""
                  className="size-8 rounded-full object-cover"
                />
              ) : (
                <span className="profile-avatar-initials text-xs">
                  {initials}
                </span>
              )}
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Sign out"
              data-ocid="layout.logout_button"
              className={cn(
                "flex size-8 items-center justify-center rounded-md border border-primary/60",
                "font-heading text-foreground",
                "transition-colors duration-200 hover:bg-primary hover:text-primary-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-nav",
              )}
            >
              <LogOut className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 bg-background">
        <Outlet />
      </main>
    </div>
  );
}

function getInitials(
  name: string | undefined,
  principal: string | null,
): string {
  if (name && name.trim().length > 0) {
    const parts = name.trim().split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
  }
  if (principal) {
    return principal.slice(0, 2).toUpperCase();
  }
  return "?";
}
