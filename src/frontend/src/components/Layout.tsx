import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useMyProfile } from "@/hooks/useMyProfile";
import { cn } from "@/lib/utils";
import { Link, Outlet } from "@tanstack/react-router";

/**
 * Shared layout for all authenticated pages.
 *
 * Black top nav bar with a thin red bottom border. Bubba's 33 wordmark in
 * Anton on the left; the signed-in user's avatar/initials on the right.
 * The main content area uses the dark `bg-background` token.
 */
export function Layout() {
  const { principal } = useAuth();
  const { data: profile } = useMyProfile();

  const initials = getInitials(profile?.name, principal);
  const isAdmin = profile?.role === "admin";

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
            className="font-display text-2xl uppercase leading-none tracking-wide text-foreground transition-colors duration-200 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-nav"
            data-ocid="layout.brand_link"
          >
            Bubba&rsquo;s 33
          </Link>
          <div className="flex items-center gap-3">
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
            <Avatar
              className="size-8 border border-border"
              data-ocid="layout.user_avatar"
            >
              <AvatarFallback className="bg-card font-heading text-xs uppercase text-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
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
