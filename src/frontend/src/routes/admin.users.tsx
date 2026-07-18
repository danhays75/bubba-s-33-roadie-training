import { RoleSelect } from "@/components/admin/RoleSelect";
import { UserAssignmentEditor } from "@/components/admin/UserAssignmentEditor";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAllPositions } from "@/hooks/useAllPositions";
import { useAllUsers, useSetUserRole } from "@/hooks/useAllUsers";
import { useUserAssignments } from "@/hooks/useMyAssignments";
import { useMyProfile } from "@/hooks/useMyProfile";
import { cn } from "@/lib/utils";
import type { PositionAssignment, Role, UserProfile } from "@/types/foundation";
import { Link } from "@tanstack/react-router";
import { ShieldAlert, Users } from "lucide-react";
import { toast } from "sonner";

/**
 * Admin — Users & Roles.
 *
 * Lists every user in a table: name, store/location, current role (with an
 * inline RoleSelect to change it), and a summary of their position
 * assignments with status. A "Manage" button opens the UserAssignmentEditor
 * Sheet to assign/unassign positions and toggle In training / Certified.
 *
 * Gated on the signed-in user's role being admin. Non-admins see a clear
 * access-denied state with a link home — no dead end.
 *
 * Mobile-first: the table scrolls horizontally on small screens; the editor
 * is a full-width right drawer.
 */
export function AdminUsersPage() {
  const { data: myProfile } = useMyProfile();
  const { data: users, isLoading } = useAllUsers();

  // Gate on admin role. While profile is loading, myProfile is undefined —
  // render a quiet dark placeholder rather than flashing access-denied.
  if (myProfile === undefined) {
    return <div className="min-h-dvh bg-background" aria-hidden />;
  }

  if (myProfile && myProfile.role !== "admin") {
    return <AccessDenied />;
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6">
      <Header />

      {isLoading ? (
        <UsersSkeleton />
      ) : (users ?? []).length === 0 ? (
        <EmptyUsers />
      ) : (
        <UsersTable users={users ?? []} />
      )}
    </div>
  );
}

function Header() {
  return (
    <header className="pb-4" data-ocid="admin_users.header.section">
      <div className="flex items-center gap-2">
        <Users className="size-6 text-primary" />
        <h1
          className="font-display text-3xl uppercase leading-none tracking-wide text-foreground"
          data-ocid="admin_users.title"
        >
          Users &amp; roles
        </h1>
      </div>
      <p className="mt-2 font-body text-sm text-muted-foreground">
        Set each user&rsquo;s role and manage their position assignments.
      </p>
    </header>
  );
}

function UsersTable({ users }: { users: UserProfile[] }) {
  return (
    <div
      className="overflow-hidden border border-border bg-card"
      data-ocid="admin_users.table.section"
    >
      <Table>
        <TableHeader>
          <TableRow className="border-border bg-muted/40 hover:bg-muted/40">
            <TableHead className="font-heading text-xs uppercase tracking-wide text-muted-foreground">
              Name
            </TableHead>
            <TableHead className="font-heading text-xs uppercase tracking-wide text-muted-foreground">
              Store / location
            </TableHead>
            <TableHead className="font-heading text-xs uppercase tracking-wide text-muted-foreground">
              Role
            </TableHead>
            <TableHead className="font-heading text-xs uppercase tracking-wide text-muted-foreground">
              Positions
            </TableHead>
            <TableHead className="text-right font-heading text-xs uppercase tracking-wide text-muted-foreground">
              Manage
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user, i) => (
            <UserRow key={user.principal} user={user} index={i + 1} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function UserRow({ user, index }: { user: UserProfile; index: number }) {
  const setRole = useSetUserRole();
  const { data: assignments } = useUserAssignments(user.principal);
  const { data: positions } = useAllPositions();

  // Prefer a human-readable name; fall back to a shortened principal so the
  // RoleSelect's aria-label always names the actual user being edited.
  const userLabel =
    user.name ||
    (user.principal
      ? `${user.principal.slice(0, 6)}…${user.principal.slice(-4)}`
      : "user");

  const handleRoleChange = (role: Role) => {
    setRole.mutate(
      { userPrincipal: user.principal, role },
      {
        onSuccess: () =>
          toast.success(`${user.name} is now ${roleLabel(role)}.`),
        onError: () => toast.error("Couldn't update role. Try again."),
      },
    );
  };

  return (
    <TableRow className="border-border" data-ocid={`user.row.${index}`}>
      <TableCell className="align-top">
        <p
          className="font-heading text-sm uppercase tracking-wide text-foreground"
          data-ocid={`user.name.${index}`}
        >
          {user.name}
        </p>
        <p className="mt-0.5 max-w-[12rem] truncate font-mono text-[0.65rem] text-muted-foreground">
          {user.principal}
        </p>
      </TableCell>
      <TableCell className="align-top">
        <p
          className="font-body text-sm text-foreground"
          data-ocid={`user.store.${index}`}
        >
          {user.storeLocation || "—"}
        </p>
      </TableCell>
      <TableCell className="align-top">
        <RoleSelect
          value={user.role}
          onValueChange={handleRoleChange}
          disabled={setRole.isPending}
          index={index}
          userLabel={userLabel}
        />
      </TableCell>
      <TableCell className="align-top">
        <AssignmentSummary
          assignments={assignments ?? []}
          positions={positions ?? []}
          index={index}
        />
      </TableCell>
      <TableCell className="align-top text-right">
        <UserAssignmentEditor user={user} index={index} />
      </TableCell>
    </TableRow>
  );
}

/** Compact summary of a user's assignments shown in the table cell. */
function AssignmentSummary({
  assignments,
  positions,
  index,
}: {
  assignments: PositionAssignment[];
  positions: { id: string; name: string }[];
  index: number;
}) {
  if (assignments.length === 0) {
    return (
      <span
        className="font-body text-xs text-muted-foreground"
        data-ocid={`user.positions.empty_state.${index}`}
      >
        None
      </span>
    );
  }

  const byName = new Map(positions.map((p) => [p.id, p.name]));

  return (
    <ul
      className="flex flex-col gap-1"
      data-ocid={`user.positions.list.${index}`}
    >
      {assignments.map((a, i) => {
        const name = byName.get(a.positionId) ?? "Unknown";
        const certified = a.status === "certified";
        return (
          <li
            key={a.positionId}
            className="flex items-center gap-1.5"
            data-ocid={`user.positions.item.${index}.${i + 1}`}
          >
            <span
              className={cn(
                "size-1.5 shrink-0 rounded-full",
                certified
                  ? "bg-secondary"
                  : "bg-in-training animate-in-training",
              )}
              aria-hidden
            />
            <span className="font-body text-xs text-foreground">{name}</span>
          </li>
        );
      })}
    </ul>
  );
}

function UsersSkeleton() {
  return (
    <div
      className="flex flex-col gap-2 border border-border bg-card p-2"
      data-ocid="admin_users.loading_state"
    >
      {["skeleton-1", "skeleton-2", "skeleton-3", "skeleton-4"].map((k) => (
        <Skeleton key={k} className="h-14 w-full" />
      ))}
    </div>
  );
}

function EmptyUsers() {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 border border-dashed border-border bg-card px-6 py-16 text-center"
      data-ocid="admin_users.empty_state"
    >
      <p className="font-heading text-lg uppercase tracking-wide text-foreground">
        No users yet
      </p>
      <p className="max-w-xs font-body text-sm text-muted-foreground">
        Users appear here once they sign in and create a profile.
      </p>
    </div>
  );
}

function AccessDenied() {
  return (
    <div
      className="mx-auto flex w-full max-w-md flex-col items-center justify-center gap-4 px-4 py-20 text-center"
      data-ocid="admin_users.access_denied"
    >
      <ShieldAlert className="size-10 text-primary" />
      <h1 className="font-display text-3xl uppercase leading-none tracking-wide text-foreground">
        Admins only
      </h1>
      <p className="max-w-xs font-body text-sm text-muted-foreground">
        You need an Admin role to manage users and roles. Ask an admin to
        upgrade your account.
      </p>
      <Button asChild variant="default" data-ocid="admin_users.go_home_button">
        <Link to="/admin/positions">Back to positions</Link>
      </Button>
    </div>
  );
}

function roleLabel(role: Role): string {
  switch (role) {
    case "admin":
      return "Admin";
    case "manager":
      return "Manager";
    case "trainer":
      return "Trainer";
    default:
      return "Trainee";
  }
}

export default AdminUsersPage;
