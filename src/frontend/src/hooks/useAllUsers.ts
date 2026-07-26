import type { ApprovalStatus, Role, UserProfile } from "@/types/foundation";
import { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useBackend } from "./useBackend";

const QUERY_KEY = ["all-users"] as const;

/** Translates a Candid UserProfile (id: Principal) to the local shape. */
function toUserProfile(p: {
  id: { toString(): string };
  name: string;
  storeLocation: string;
  role: string;
  approvalStatus: string;
  email?: string;
  photo?: string;
}): UserProfile {
  return {
    principal: p.id.toString(),
    name: p.name,
    storeLocation: p.storeLocation,
    role: p.role as Role,
    approvalStatus: p.approvalStatus as ApprovalStatus,
    email: p.email,
    photo: p.photo,
  };
}

/** Reads every user profile (admin only). */
export function useAllUsers() {
  const { actor, isFetching } = useBackend();
  return useQuery<UserProfile[]>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      if (!actor) return [];
      const result = await actor.getAllUsers();
      return result.map(toUserProfile);
    },
    enabled: !!actor && !isFetching,
  });
}

export interface SetUserRoleInput {
  userPrincipal: string;
  role: Role;
}

/** Sets a user's role (admin only). */
export function useSetUserRole() {
  const queryClient = useQueryClient();
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (input: SetUserRoleInput) => {
      if (!actor) throw new Error("Backend not ready");
      // Candid is positional: setUserRole(userId: Principal, role)
      await actor.setUserRole(
        Principal.fromText(input.userPrincipal),
        input.role as never,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
    },
  });
}

/** Reads a single user's role. */
export function useUserRole(userPrincipal: string | null) {
  const { actor, isFetching } = useBackend();
  return useQuery<Role | null>({
    queryKey: ["user-role", userPrincipal],
    queryFn: async () => {
      if (!actor || !userPrincipal) return null;
      // Candid expects Principal
      const result = await actor.getUserRole(Principal.fromText(userPrincipal));
      return result as string | null as Role | null;
    },
    enabled: !!actor && !isFetching && !!userPrincipal,
  });
}

export interface ApproveUserInput {
  userPrincipal: string;
}

/**
 * Approves a pending user (admin only). Sets their approvalStatus to
 * `approved`, granting app access. Translates the stringified principal to
 * a Principal at the boundary. Invalidates the all-users and my-profile
 * queries on success so admin lists and the acting admin's own profile
 * stay in sync.
 */
export function useApproveUser() {
  const queryClient = useQueryClient();
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (input: ApproveUserInput) => {
      if (!actor) throw new Error("Backend not ready");
      // Candid is positional: approveUser(userId: Principal)
      const result = await actor.approveUser(
        Principal.fromText(input.userPrincipal),
      );
      return toUserProfile(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
    },
  });
}

export interface RejectUserInput {
  userPrincipal: string;
}

/**
 * Rejects a pending user (admin only). Sets their approvalStatus to
 * `rejected`, blocking app access. Translates the stringified principal to
 * a Principal at the boundary. Invalidates the all-users and my-profile
 * queries on success so admin lists and the acting admin's own profile
 * stay in sync.
 */
export function useRejectUser() {
  const queryClient = useQueryClient();
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (input: RejectUserInput) => {
      if (!actor) throw new Error("Backend not ready");
      // Candid is positional: rejectUser(userId: Principal)
      const result = await actor.rejectUser(
        Principal.fromText(input.userPrincipal),
      );
      return toUserProfile(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
    },
  });
}

export interface SetUserEmailInput {
  userPrincipal: string;
  email: string;
}

/**
 * Sets a user's email (admin only). Replaces the email on record for the
 * given user with the provided address. Translates the stringified
 * principal to a Principal at the boundary. Invalidates the all-users and
 * my-profile queries on success so the admin Users list and the acting
 * admin's own profile stay in sync.
 */
export function useSetUserEmail() {
  const queryClient = useQueryClient();
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (input: SetUserEmailInput) => {
      if (!actor) throw new Error("Backend not ready");
      // Candid is positional: setUserEmail(userId: Principal, email: string)
      const result = await actor.setUserEmail(
        Principal.fromText(input.userPrincipal),
        input.email,
      );
      return toUserProfile(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
    },
  });
}

export interface SetUserPhotoInput {
  userPrincipal: string;
  /** Direct object-storage URL, or null to clear the photo. */
  photo: string | null;
}

/**
 * Sets a user's profile photo (admin only). Pass the durable object-storage
 * URL produced by the existing usePhotoUpload flow, or null to clear it.
 * Translates the stringified principal to a Principal at the boundary.
 * Invalidates the all-users and my-profile queries on success so the admin
 * Users list and the acting admin's own profile stay in sync.
 */
export function useSetUserPhoto() {
  const queryClient = useQueryClient();
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (input: SetUserPhotoInput) => {
      if (!actor) throw new Error("Backend not ready");
      // Candid is positional: setUserPhoto(userId: Principal, photo: string | null)
      const result = await actor.setUserPhoto(
        Principal.fromText(input.userPrincipal),
        input.photo,
      );
      return toUserProfile(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
    },
  });
}

export interface ResendApprovalEmailInput {
  userPrincipal: string;
}

/**
 * Resends the approval/invitation email to a user (admin only). Available
 * for all users regardless of their current approval status. Translates the
 * stringified principal to a Principal at the boundary. Invalidates the
 * all-users query on success so any status derived from the email send
 * stays fresh.
 */
export function useResendApprovalEmail() {
  const queryClient = useQueryClient();
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (input: ResendApprovalEmailInput) => {
      if (!actor) throw new Error("Backend not ready");
      // Candid is positional: resendApprovalEmail(userId: Principal)
      await actor.resendApprovalEmail(Principal.fromText(input.userPrincipal));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
