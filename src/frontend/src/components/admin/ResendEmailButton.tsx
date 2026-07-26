import { Button } from "@/components/ui/button";
import { useResendApprovalEmail } from "@/hooks/useAllUsers";
import type { UserProfile } from "@/types/foundation";
import { Mail } from "lucide-react";
import { toast } from "sonner";

/**
 * Resend-approval-email action for the admin Users page.
 *
 * Re-sends the notification email appropriate to the user's CURRENT approval
 * status (pending / approved / rejected) — it does NOT change the status.
 * Available for users in any approval status, per the user preference that
 * the Resend action is available to all users regardless of approval state.
 *
 * Calls useResendApprovalEmail (from useAllUsers.ts) with the user's
 * stringified Principal. Reports success/failure via a sonner toast, matching
 * the existing Approve/Reject/RoleChange feedback pattern on the page.
 *
 * Styled as a subtle secondary/ghost button with a Mail icon so it reads as a
 * secondary action alongside the primary Approve/Reject (pending) or Manage
 * (approved) actions. The `variant` prop lets the caller pick the visual
 * weight — `outline` for the dense approved-users table, `secondary` for the
 * pending-users row where it sits next to solid Approve/Reject buttons.
 */
export function ResendEmailButton({
  user,
  index,
  variant = "outline",
}: {
  user: UserProfile;
  index: number;
  /** Visual weight. `outline` blends into the approved table; `secondary`
   *  reads as a clear tertiary action next to solid Approve/Reject. */
  variant?: "outline" | "secondary";
}) {
  const resend = useResendApprovalEmail();

  const handleResend = () => {
    resend.mutate(
      { userPrincipal: user.principal },
      {
        onSuccess: () =>
          toast.success(
            `Notification email re-sent to ${user.name || "user"}.`,
          ),
        onError: () => toast.error("Couldn't send the email. Try again."),
      },
    );
  };

  const label = user.name || "user";

  return (
    <Button
      type="button"
      variant={variant}
      size="sm"
      disabled={resend.isPending}
      onClick={handleResend}
      className="font-heading text-xs uppercase tracking-wide"
      data-ocid={`user.resend_email_button.${index}`}
      aria-label={`Resend notification email to ${label}`}
    >
      <Mail className="size-4" aria-hidden="true" />
      {resend.isPending ? "Sending…" : "Resend"}
    </Button>
  );
}

export default ResendEmailButton;
