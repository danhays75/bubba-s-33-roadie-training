import { QueryErrorState } from "@/components/QueryErrorState";
import { ResendEmailButton } from "@/components/admin/ResendEmailButton";
import { RoleSelect } from "@/components/admin/RoleSelect";
import { UserAssignmentEditor } from "@/components/admin/UserAssignmentEditor";
import { UserEditSheet } from "@/components/admin/UserEditSheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
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
import {
  useAllUsers,
  useApproveUser,
  useRejectUser,
  useSetUserRole,
} from "@/hooks/useAllUsers";
import { useUserAssignments } from "@/hooks/useMyAssignments";
import { useMyProfile } from "@/hooks/useMyProfile";
import { cn } from "@/lib/utils";
import type {
  ApprovalStatus,
  PositionAssignment,
  Role,
  UserProfile,
} from "@/types/foundation";
import { Link } from "@tanstack/react-router";
import { Check, Loader2, ShieldAlert, UserCheck, Users, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

/**
 * Admin — Users & Roles.
 *
 * Lists every user in a table: name, store/location, current role (with an
 * inline RoleSelect to change it), and a summary of their position
 * assignments with status. A "Manage" button opens the UserAssignmentEditor
 * Sheet to assign/unassign positions and toggle In training / Certified.
 *
 * Above the approved-users table, a pending-approval section surfaces users
 * awaiting access. Admins can approve (grants access) or reject (denies
 * access) each pending request. A pending count badge in the header keeps
 * awaiting requests visible at a glance.
 *
 * Gated on the signed-in user's role being admin. Non-admins see a clear
 * access-denied state with a link home — no dead end.
 *
 * Mobile-first: the tables scroll horizontally on small screens; the editor
 * is a full-width right drawer.
 */
export function AdminUsersPage() {
  const { data: myProfile } = useMyProfile();
  const { data: users, isLoading, isError, refetch } = useAllUsers();

  // Gate on admin role. While profile is loading, myProfile is undefined —
  // render a quiet dark placeholder rather than flashing access-denied.
  if (myProfile === undefined) {
    return <div className="min-h-dvh bg-background" aria-hidden />;
  }

  if (myProfile && myProfile.role !== "admin") {
    return <AccessDenied />;
  }

  const all = users ?? [];
  const pending = all.filter((u) => u.approvalStatus === "pending");
  const approved = all.filter((u) => u.approvalStatus === "approved");

  // Self-lockout protection: the acting admin's own principal (stringified)
  // and the count of admins among approved users. Passed down to UserRow so
  // it can disable the RoleSelect on the admin's own row AND on the last
  // remaining admin row (prevents the admin from locking themselves or the
  // org out of admin access).
  const myPrincipal = myProfile?.principal;
  const adminCount = approved.filter((u) => u.role === "admin").length;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6">
      <Header pendingCount={pending.length} />

      {isLoading ? (
        <UsersSkeleton />
      ) : isError ? (
        <QueryErrorState
          title="Couldn't load users."
          description="We couldn't load the users list right now. Please try again."
          onRetry={() => void refetch()}
        />
      ) : all.length === 0 ? (
        <EmptyUsers />
      ) : (
        <div className="flex flex-col gap-8">
          <PendingApprovalSection users={pending} />
          <ApprovedUsersSection
            users={approved}
            myPrincipal={myPrincipal}
            adminCount={adminCount}
          />
        </div>
      )}
    </div>
  );
}

function Header({ pendingCount }: { pendingCount: number }) {
  return (
    <header className="pb-4" data-ocid="admin_users.header.section">
      <div className="flex flex-wrap items-center gap-2">
        <Users className="size-6 text-primary" />
        <h1
          className="font-display text-3xl uppercase leading-none tracking-wide text-foreground"
          data-ocid="admin_users.title"
        >
          Users &amp; roles
        </h1>
        {pendingCount > 0 && (
          <Badge
            variant="default"
            className="ml-1 bg-primary font-heading text-xs uppercase tracking-wide"
            data-ocid="admin_users.pending_count_badge"
          >
            {pendingCount} pending
          </Badge>
        )}
      </div>
      <p className="mt-2 font-body text-sm text-muted-foreground">
        Set each user&rsquo;s role and manage their position assignments.
      </p>
    </header>
  );
}

/**
 * Pending-approval section. Surfaces users awaiting access at the top of
 * the page so admins notice them before the approved-users table. Each
 * row shows the user's name, store/location, and Approve / Reject actions.
 * Hidden entirely when there are no pending users — no empty state needed
 * here (the absence is the desired signal).
 */
function PendingApprovalSection({ users }: { users: UserProfile[] }) {
  if (users.length === 0) return null;

  return (
    <section
      className="flex flex-col gap-3"
      data-ocid="admin_users.pending.section"
    >
      <div className="flex items-center gap-2">
        <UserCheck className="size-5 text-primary" />
        <h2
          className="font-display text-xl uppercase leading-none tracking-wide text-foreground"
          data-ocid="admin_users.pending.title"
        >
          Awaiting approval
        </h2>
        <Badge
          variant="default"
          className="bg-primary font-heading text-xs uppercase tracking-wide"
          data-ocid="admin_users.pending.section_badge"
        >
          {users.length}
        </Badge>
      </div>
      <p className="font-body text-sm text-muted-foreground">
        New sign-ups are blocked until you approve them. Rejecting denies access
        to the app.
      </p>
      <div
        className="overflow-hidden border border-primary/40 bg-card"
        data-ocid="admin_users.pending.table.section"
      >
        <Table>
          <TableHeader>
            <TableRow className="border-border bg-primary/10 hover:bg-primary/10">
              <TableHead className="font-heading text-xs uppercase tracking-wide text-muted-foreground">
                Name
              </TableHead>
              <TableHead className="font-heading text-xs uppercase tracking-wide text-muted-foreground">
                Store / location
              </TableHead>
              <TableHead className="text-right font-heading text-xs uppercase tracking-wide text-muted-foreground">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user, i) => (
              <PendingUserRow key={user.principal} user={user} index={i + 1} />
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

function PendingUserRow({ user, index }: { user: UserProfile; index: number }) {
  const approve = useApproveUser();
  const reject = useRejectUser();

  // Confirm-before-reject: rejecting denies the user access, so we surface
  // an AlertDialog before firing the mutation. Approve stays one click.
  const [rejectOpen, setRejectOpen] = useState(false);

  const handleApprove = () => {
    approve.mutate(
      { userPrincipal: user.principal },
      {
        onSuccess: () =>
          toast.success(
            `${user.name || "User"} approved. They can now sign in.`,
          ),
        onError: () => toast.error("Couldn't approve. Try again."),
      },
    );
  };

  const handleReject = () => {
    reject.mutate(
      { userPrincipal: user.principal },
      {
        onSuccess: () => {
          toast.success(`${user.name || "User"} rejected. Access denied.`);
          setRejectOpen(false);
        },
        onError: () => toast.error("Couldn't reject. Try again."),
      },
    );
  };

  const busy = approve.isPending || reject.isPending;

  return (
    <TableRow className="border-border" data-ocid={`pending_user.row.${index}`}>
      <TableCell className="align-top">
        <div className="flex items-start gap-2.5">
          <UserAvatar user={user} index={index} variant="pending" />
          <div className="min-w-0">
            <p
              className="font-heading text-sm uppercase tracking-wide text-foreground"
              data-ocid={`pending_user.name.${index}`}
            >
              {user.name}
            </p>
            {user.email ? (
              <p
                className="mt-0.5 max-w-[14rem] truncate font-body text-xs text-muted-foreground"
                data-ocid={`pending_user.email.${index}`}
                title={user.email}
              >
                {user.email}
              </p>
            ) : null}
            <p className="mt-0.5 max-w-[12rem] truncate font-mono text-[0.65rem] text-muted-foreground">
              {user.principal}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell className="align-top">
        <p
          className="font-body text-sm text-foreground"
          data-ocid={`pending_user.store.${index}`}
        >
          {user.storeLocation || "—"}
        </p>
      </TableCell>
      <TableCell className="align-top text-right">
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="default"
            disabled={busy}
            onClick={handleApprove}
            data-ocid={`pending_user.approve_button.${index}`}
            aria-label={`Approve ${user.name}`}
          >
            <Check className="size-4" />
            {approve.isPending ? "Approving…" : "Approve"}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={busy}
            onClick={() => setRejectOpen(true)}
            data-ocid={`pending_user.reject_button.${index}`}
            aria-label={`Reject ${user.name}`}
          >
            <X className="size-4" />
            {reject.isPending ? "Rejecting…" : "Reject"}
          </Button>
          <ResendEmailButton user={user} index={index} variant="secondary" />
        </div>
      </TableCell>
      <AlertDialog
        open={rejectOpen}
        onOpenChange={(o) => !o && setRejectOpen(false)}
      >
        <AlertDialogContent
          className="bg-card border-border"
          data-ocid={`pending_user.reject_dialog.${index}`}
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading uppercase tracking-wide text-foreground">
              Reject {user.name || "user"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              They will be denied access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={reject.isPending}
              data-ocid={`pending_user.reject_dialog.cancel_button.${index}`}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={reject.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary-hover"
              data-ocid={`pending_user.reject_dialog.confirm_button.${index}`}
            >
              {reject.isPending && <Loader2 className="animate-spin" />}
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TableRow>
  );
}

/**
 * Approved-users section. The existing users table, now scoped to approved
 * users only (pending users live in their own section above). Adds an
 * approval-status column so admins can see each user's current status at a
 * glance.
 */
function ApprovedUsersSection({
  users,
  myPrincipal,
  adminCount,
}: {
  users: UserProfile[];
  myPrincipal: string | undefined;
  adminCount: number;
}) {
  return (
    <section
      className="flex flex-col gap-3"
      data-ocid="admin_users.approved.section"
    >
      <div className="flex items-center gap-2">
        <Users className="size-5 text-secondary" />
        <h2
          className="font-display text-xl uppercase leading-none tracking-wide text-foreground"
          data-ocid="admin_users.approved.title"
        >
          Approved users
        </h2>
      </div>
      {users.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center gap-2 border border-dashed border-border bg-card px-6 py-10 text-center"
          data-ocid="admin_users.approved.empty_state"
        >
          <p className="font-heading text-sm uppercase tracking-wide text-foreground">
            No approved users yet
          </p>
          <p className="max-w-xs font-body text-xs text-muted-foreground">
            Approve pending requests above to populate this list.
          </p>
        </div>
      ) : (
        <UsersTable
          users={users}
          myPrincipal={myPrincipal}
          adminCount={adminCount}
        />
      )}
    </section>
  );
}

function UsersTable({
  users,
  myPrincipal,
  adminCount,
}: {
  users: UserProfile[];
  myPrincipal: string | undefined;
  adminCount: number;
}) {
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
              Status
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
            <UserRow
              key={user.principal}
              user={user}
              index={i + 1}
              myPrincipal={myPrincipal}
              adminCount={adminCount}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function UserRow({
  user,
  index,
  myPrincipal,
  adminCount,
}: {
  user: UserProfile;
  index: number;
  myPrincipal: string | undefined;
  adminCount: number;
}) {
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

  // Self-lockout + last-admin protection (B1). The acting admin cannot
  // change their own role, and no one can demote the last remaining admin.
  // The RoleSelect is disabled in either case with a short muted hint
  // explaining why.
  const isSelf = !!myPrincipal && user.principal === myPrincipal;
  const isLastAdmin = user.role === "admin" && adminCount <= 1;
  const roleLocked = isSelf || isLastAdmin;
  const roleDisabledHint = isSelf
    ? "You can't change your own role"
    : isLastAdmin
      ? "At least one admin is required"
      : undefined;

  // Confirm-before-lower-privilege role change (B3). Demoting a user (moving
  // to a lower-privilege role per trainee < trainer < manager < admin) opens
  // an AlertDialog before firing. Equal-or-higher privilege changes stay
  // one click. The candidate role is held in local state while the dialog is
  // open.
  const [pendingRole, setPendingRole] = useState<Role | null>(null);

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

  const onRoleSelect = (role: Role) => {
    if (role === user.role) return;
    if (isLowerPrivilege(role, user.role)) {
      setPendingRole(role);
      return;
    }
    handleRoleChange(role);
  };

  const confirmRoleChange = () => {
    if (!pendingRole) return;
    handleRoleChange(pendingRole);
    setPendingRole(null);
  };

  return (
    <TableRow className="border-border" data-ocid={`user.row.${index}`}>
      <TableCell className="align-top">
        <div className="flex items-start gap-2.5">
          <UserAvatar user={user} index={index} variant="approved" />
          <div className="min-w-0">
            <p
              className="font-heading text-sm uppercase tracking-wide text-foreground"
              data-ocid={`user.name.${index}`}
            >
              {user.name}
            </p>
            {user.email ? (
              <p
                className="mt-0.5 max-w-[14rem] truncate font-body text-xs text-muted-foreground"
                data-ocid={`user.email.${index}`}
                title={user.email}
              >
                {user.email}
              </p>
            ) : null}
            <p className="mt-0.5 max-w-[12rem] truncate font-mono text-[0.65rem] text-muted-foreground">
              {user.principal}
            </p>
          </div>
        </div>
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
          onValueChange={onRoleSelect}
          disabled={roleLocked || setRole.isPending}
          disabledHint={roleLocked ? roleDisabledHint : undefined}
          index={index}
          userLabel={userLabel}
        />
      </TableCell>
      <TableCell className="align-top">
        <ApprovalStatusBadge status={user.approvalStatus} index={index} />
      </TableCell>
      <TableCell className="align-top">
        <AssignmentSummary
          assignments={assignments ?? []}
          positions={positions ?? []}
          index={index}
        />
      </TableCell>
      <TableCell className="align-top text-right">
        <div className="flex justify-end gap-2">
          <ResendEmailButton user={user} index={index} variant="outline" />
          <UserEditSheet user={user} index={index} />
          <UserAssignmentEditor user={user} index={index} />
        </div>
      </TableCell>
      <AlertDialog
        open={pendingRole !== null}
        onOpenChange={(o) => !o && setPendingRole(null)}
      >
        <AlertDialogContent
          className="bg-card border-border"
          data-ocid={`user.role_change_dialog.${index}`}
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading uppercase tracking-wide text-foreground">
              Change {user.name}&rsquo;s role to{" "}
              {pendingRole ? roleLabel(pendingRole) : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This lowers their access level. They may lose permissions they
              currently use.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={setRole.isPending}
              data-ocid={`user.role_change_dialog.cancel_button.${index}`}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRoleChange}
              disabled={setRole.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary-hover"
              data-ocid={`user.role_change_dialog.confirm_button.${index}`}
            >
              {setRole.isPending && <Loader2 className="animate-spin" />}
              Change role
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TableRow>
  );
}

/** Approval-status badge shown in the approved-users table. */
function ApprovalStatusBadge({
  status,
  index,
}: {
  status: ApprovalStatus;
  index: number;
}) {
  const label = approvalLabel(status);
  return (
    <Badge
      variant="outline"
      className={cn(
        "border-border font-heading text-[0.65rem] uppercase tracking-wide",
        status === "approved" && "border-secondary/50 text-secondary",
        status === "pending" && "border-primary/50 text-primary",
        status === "rejected" && "border-destructive/50 text-destructive",
      )}
      data-ocid={`user.status.badge.${index}`}
    >
      {label}
    </Badge>
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

/**
 * Privilege order per the role contract: trainee < trainer < manager < admin.
 * Returns true when `next` is LOWER privilege than `current` (a demotion),
 * which is the case that requires a confirmation dialog before applying.
 */
const ROLE_PRIVILEGE: Record<Role, number> = {
  trainee: 0,
  trainer: 1,
  manager: 2,
  admin: 3,
};

function isLowerPrivilege(next: Role, current: Role): boolean {
  return ROLE_PRIVILEGE[next] < ROLE_PRIVILEGE[current];
}

function approvalLabel(status: ApprovalStatus): string {
  switch (status) {
    case "approved":
      return "Approved";
    case "pending":
      return "Pending";
    case "rejected":
      return "Rejected";
  }
}

/**
 * Builds up-to-two-character initials from a name for the avatar fallback.
 * Returns "?" when the name is empty/whitespace so the avatar is never blank.
 */
function initialsFor(name: string): string {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

/**
 * Small circular avatar for an admin Users row. Shows the user's profile
 * photo when set, otherwise the Oswald-uppercase initials fallback. Uses
 * the shared `.profile-avatar` / `.profile-avatar-initials` classes so the
 * look matches the Profile page. View-only — admins cannot edit the photo
 * or email from this page.
 */
function UserAvatar({
  user,
  size = "size-9",
  index,
  variant,
}: {
  user: UserProfile;
  size?: string;
  index: number;
  variant: "pending" | "approved";
}) {
  const alt = `${user.name || "User"} profile photo`;
  return (
    <div
      className={cn("profile-avatar shrink-0", size)}
      data-ocid={`${variant}_user.avatar.${index}`}
      aria-label={alt}
    >
      {user.photo ? (
        <img src={user.photo} alt={alt} loading="lazy" />
      ) : (
        <span className="profile-avatar-initials text-xs">
          {initialsFor(user.name)}
        </span>
      )}
    </div>
  );
}

export default AdminUsersPage;
