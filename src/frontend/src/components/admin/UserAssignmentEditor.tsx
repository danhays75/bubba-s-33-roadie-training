import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useAllPositions } from "@/hooks/useAllPositions";
import {
  useAssignPosition,
  useSetAssignmentStatus,
  useUnassignPosition,
  useUserAssignments,
} from "@/hooks/useMyAssignments";
import { cn } from "@/lib/utils";
import type {
  AssignmentStatus,
  Position,
  PositionAssignment,
  UserProfile,
} from "@/types/foundation";
import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

/**
 * Per-user assignment editor. Opens a right-side Sheet (full drawer on
 * mobile) listing the user's current position assignments with a status
 * toggle (In training / Certified) and an unassign button. An "Add position"
 * Select lets the admin pick from positions that exist in the Positions
 * manager but aren't yet assigned to this user — NO inline creation.
 *
 * Calls:
 *  - useAssignPosition({ positionId, userPrincipal })
 *  - useSetAssignmentStatus({ userPrincipal, positionId, status })
 *  - useUnassignPosition({ userPrincipal, positionId })
 */
export function UserAssignmentEditor({
  user,
  index,
}: {
  user: UserProfile;
  index: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="font-heading text-xs uppercase tracking-wide"
          data-ocid={`user.manage_button.${index}`}
        >
          Manage
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full gap-0 p-0 sm:max-w-md"
        data-ocid={`user.assignment_dialog.${index}`}
      >
        <SheetHeader className="border-b border-border bg-card">
          <SheetTitle className="font-heading text-lg uppercase tracking-wide text-foreground">
            {user.name}
          </SheetTitle>
          <SheetDescription className="font-body text-sm text-muted-foreground">
            Assign positions and set training status.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <CurrentAssignments user={user} index={index} />
          <AddPositionSection user={user} index={index} />
        </div>

        <SheetFooter className="border-t border-border bg-card">
          <SheetClose asChild>
            <Button
              variant="default"
              className="font-heading text-sm uppercase tracking-wide"
              data-ocid={`user.close_button.${index}`}
            >
              Done
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/** Lists the user's current assignments with status toggle + unassign. */
function CurrentAssignments({
  user,
  index,
}: {
  user: UserProfile;
  index: number;
}) {
  const { data: assignments, isLoading } = useUserAssignments(user.principal);

  if (isLoading) {
    return (
      <div
        className="flex flex-col gap-2"
        data-ocid={`user.loading_state.${index}`}
      >
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }

  const list = assignments ?? [];

  if (list.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-2 border border-dashed border-border bg-card px-4 py-10 text-center"
        data-ocid={`user.empty_state.${index}`}
      >
        <p className="font-heading text-sm uppercase tracking-wide text-foreground">
          No positions assigned
        </p>
        <p className="max-w-[16rem] font-body text-xs text-muted-foreground">
          Pick a position below to start this user&rsquo;s training.
        </p>
      </div>
    );
  }

  return (
    <ul
      className="flex flex-col gap-2"
      data-ocid={`user.assignment_list.${index}`}
    >
      {list.map((assignment, i) => (
        <AssignmentRow
          key={assignment.positionId}
          assignment={assignment}
          user={user}
          index={index}
          row={i + 1}
        />
      ))}
    </ul>
  );
}

/** A single assignment row: position name, status select, unassign button. */
function AssignmentRow({
  assignment,
  user,
  index,
  row,
}: {
  assignment: PositionAssignment;
  user: UserProfile;
  index: number;
  row: number;
}) {
  const { data: positions } = useAllPositions();
  const setStatus = useSetAssignmentStatus();
  const unassign = useUnassignPosition();

  const position = (positions ?? []).find(
    (p) => p.id === assignment.positionId,
  );
  const positionName = position?.name ?? "Unknown position";

  const handleStatus = (status: AssignmentStatus) => {
    setStatus.mutate(
      {
        userPrincipal: user.principal,
        positionId: assignment.positionId,
        status,
      },
      {
        onSuccess: () =>
          toast.success(`${positionName} marked ${statusLabel(status)}.`),
        onError: () => toast.error("Couldn't update status. Try again."),
      },
    );
  };

  const handleUnassign = () => {
    unassign.mutate(
      {
        userPrincipal: user.principal,
        positionId: assignment.positionId,
      },
      {
        onSuccess: () => toast.success(`${positionName} unassigned.`),
        onError: () => toast.error("Couldn't unassign. Try again."),
      },
    );
  };

  return (
    <li
      className="flex items-center gap-2 border border-border bg-card p-3"
      data-ocid={`user.assignment.item.${index}.${row}`}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-heading text-sm uppercase tracking-wide text-foreground">
          {positionName}
        </p>
      </div>

      <Select
        value={assignment.status}
        onValueChange={(v) => handleStatus(v as AssignmentStatus)}
      >
        <SelectTrigger
          size="sm"
          className={cn(
            "w-32 border-border bg-background font-heading text-[0.7rem] uppercase tracking-wide",
            assignment.status === "inTraining"
              ? "border-[oklch(0.801_0.171_75)] text-in-training"
              : "border-secondary text-[oklch(0.82_0.09_235)]",
          )}
          data-ocid={`user.status.select.${index}.${row}`}
          aria-label={`Set status for ${positionName}`}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem
            value="inTraining"
            className="font-heading text-xs uppercase tracking-wide"
          >
            In training
          </SelectItem>
          <SelectItem
            value="certified"
            className="font-heading text-xs uppercase tracking-wide"
          >
            Certified
          </SelectItem>
        </SelectContent>
      </Select>

      <Button
        variant="ghost"
        size="icon"
        className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={handleUnassign}
        disabled={unassign.isPending}
        aria-label={`Unassign ${positionName}`}
        data-ocid={`user.unassign_button.${index}.${row}`}
      >
        <Trash2 className="size-4" />
      </Button>
    </li>
  );
}

/** "Add position" picker — only positions not already assigned to this user. */
function AddPositionSection({
  user,
  index,
}: {
  user: UserProfile;
  index: number;
}) {
  const { data: positions, isLoading: positionsLoading } = useAllPositions();
  const { data: assignments } = useUserAssignments(user.principal);
  const assign = useAssignPosition();
  const [selected, setSelected] = useState<string>("");

  const available = useMemo<Position[]>(() => {
    const all = positions ?? [];
    const taken = new Set((assignments ?? []).map((a) => a.positionId));
    return all.filter((p) => !taken.has(p.id));
  }, [positions, assignments]);

  if (positionsLoading) {
    return (
      <div className="mt-6">
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }

  if (available.length === 0) {
    return (
      <div className="mt-6 border-t border-border pt-4">
        <p className="font-heading text-xs uppercase tracking-wide text-muted-foreground">
          Add position
        </p>
        <p className="mt-2 font-body text-xs text-muted-foreground">
          All existing positions are already assigned. Create new ones in the
          Positions manager.
        </p>
      </div>
    );
  }

  const handleAssign = () => {
    if (!selected) return;
    assign.mutate(
      {
        positionId: selected,
        userPrincipal: user.principal,
      },
      {
        onSuccess: () => {
          toast.success("Position assigned. Status: In training.");
          setSelected("");
        },
        onError: () => toast.error("Couldn't assign position. Try again."),
      },
    );
  };

  return (
    <div className="mt-6 border-t border-border pt-4">
      <p className="font-heading text-xs uppercase tracking-wide text-muted-foreground">
        Add position
      </p>
      <div className="mt-2 flex items-center gap-2">
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger
            size="sm"
            className="min-w-0 flex-1 border-border bg-card font-body text-sm"
            data-ocid={`user.add_position.select.${index}`}
            aria-label="Pick a position to assign"
          >
            <SelectValue placeholder="Pick a position" />
          </SelectTrigger>
          <SelectContent>
            {available.map((p) => (
              <SelectItem key={p.id} value={p.id} className="font-body text-sm">
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="default"
          size="sm"
          className="shrink-0 font-heading text-xs uppercase tracking-wide"
          onClick={handleAssign}
          disabled={!selected || assign.isPending}
          data-ocid={`user.assign_button.${index}`}
        >
          <Plus className="size-4" />
          Assign
        </Button>
      </div>
    </div>
  );
}

function statusLabel(status: AssignmentStatus): string {
  return status === "certified" ? "Certified" : "In training";
}
