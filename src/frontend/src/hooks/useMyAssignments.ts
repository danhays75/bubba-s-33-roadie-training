import type { AssignmentStatus, PositionAssignment } from "@/types/foundation";
import { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useBackend } from "./useBackend";

const QUERY_KEY = ["my-assignments"] as const;

/** Translates a Candid PositionAssignment to the local string-keyed shape. */
function toAssignment(a: {
  userId: { toString(): string };
  positionId: bigint;
  status: string;
}): PositionAssignment {
  return {
    userPrincipal: a.userId.toString(),
    positionId: a.positionId.toString(),
    status: a.status as AssignmentStatus,
  };
}

/** Reads the signed-in user's position assignments (with status). */
export function useMyAssignments() {
  const { actor, isFetching } = useBackend();
  return useQuery<PositionAssignment[]>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      if (!actor) return [];
      const result = await actor.getMyAssignments();
      return result.map(toAssignment);
    },
    enabled: !!actor && !isFetching,
  });
}

export interface AssignPositionInput {
  /** Position id as a string (translated to bigint by the hook). */
  positionId: string;
  /** User principal as a string (translated to Principal by the hook). */
  userPrincipal: string;
}

/** Assigns a position to a user (admin/trainer only). No status arg. */
export function useAssignPosition() {
  const queryClient = useQueryClient();
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (input: AssignPositionInput) => {
      if (!actor) throw new Error("Backend not ready");
      // Candid is positional: assignPosition(userId: Principal, positionId: bigint)
      const result = await actor.assignPosition(
        Principal.fromText(input.userPrincipal),
        BigInt(input.positionId),
      );
      return toAssignment(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["user-assignments"] });
    },
  });
}

export interface UnassignPositionInput {
  userPrincipal: string;
  positionId: string;
}

/** Removes a position assignment (admin/trainer only). Keyed by user+position. */
export function useUnassignPosition() {
  const queryClient = useQueryClient();
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (input: UnassignPositionInput) => {
      if (!actor) throw new Error("Backend not ready");
      // Candid is positional: unassignPosition(userId: Principal, positionId: bigint)
      await actor.unassignPosition(
        Principal.fromText(input.userPrincipal),
        BigInt(input.positionId),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["user-assignments"] });
    },
  });
}

export interface SetAssignmentStatusInput {
  userPrincipal: string;
  positionId: string;
  status: AssignmentStatus;
}

/** Sets an assignment's status (inTraining <-> certified). Keyed by user+position. */
export function useSetAssignmentStatus() {
  const queryClient = useQueryClient();
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (input: SetAssignmentStatusInput) => {
      if (!actor) throw new Error("Backend not ready");
      // Candid is positional: setAssignmentStatus(userId: Principal, positionId: bigint, status)
      const result = await actor.setAssignmentStatus(
        Principal.fromText(input.userPrincipal),
        BigInt(input.positionId),
        input.status as never,
      );
      return toAssignment(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["user-assignments"] });
    },
  });
}

/** Reads a specific user's assignments (admin/trainer view). */
export function useUserAssignments(userPrincipal: string | null) {
  const { actor, isFetching } = useBackend();
  return useQuery<PositionAssignment[]>({
    queryKey: ["user-assignments", userPrincipal],
    queryFn: async () => {
      if (!actor || !userPrincipal) return [];
      // Candid expects Principal
      const result = await actor.getUserAssignments(
        Principal.fromText(userPrincipal),
      );
      return result.map(toAssignment);
    },
    enabled: !!actor && !isFetching && !!userPrincipal,
  });
}
