import type { ApprovalStatus, UserProfile } from "@/types/foundation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useBackend } from "./useBackend";

const QUERY_KEY = ["my-profile"] as const;

/**
 * Translates a Candid UserProfile (id: Principal, photo: ?Text) to the
 * local shape. Passes the optional `photo` field through unchanged so the
 * Profile page and nav avatar can render it (or fall back to initials).
 */
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
    role: p.role as UserProfile["role"],
    approvalStatus: p.approvalStatus as ApprovalStatus,
    email: p.email,
    photo: p.photo,
  };
}

/**
 * Reads the signed-in user's profile. Returns `null` when no profile exists
 * yet (first-time sign-in) — the AuthGate uses this to show the
 * CreateProfileScreen.
 */
export function useMyProfile() {
  const { actor, isFetching } = useBackend();
  const query = useQuery<UserProfile | null>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      if (!actor) return null;
      const result = await actor.getMyProfile();
      return result ? toUserProfile(result) : null;
    },
    enabled: !!actor && !isFetching,
  });
  // Surface the read-error state as first-class so consumers can distinguish
  // a genuine null profile (no profile yet) from a failed read. The underlying
  // UseQueryResult already carries these; re-exposing them keeps the contract
  // explicit without altering queryKey/queryFn/enabled.
  return {
    ...query,
    isError: query.isError,
    error: query.error,
  };
}

export interface CreateProfileInput {
  name: string;
  storeLocation: string;
}

/** Creates the signed-in user's profile on first sign-in. */
export function useCreateMyProfile() {
  const queryClient = useQueryClient();
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (input: CreateProfileInput) => {
      if (!actor) throw new Error("Backend not ready");
      // Candid is positional: createMyProfile(name, storeLocation)
      const result = await actor.createMyProfile(
        input.name,
        input.storeLocation,
      );
      return toUserProfile(result);
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(QUERY_KEY, profile);
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
    },
  });
}

export interface UpdateProfileInput {
  name: string;
  storeLocation: string;
}

/** Updates the signed-in user's profile. */
export function useUpdateMyProfile() {
  const queryClient = useQueryClient();
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (input: UpdateProfileInput) => {
      if (!actor) throw new Error("Backend not ready");
      // Candid is positional: updateMyProfile(name, storeLocation)
      const result = await actor.updateMyProfile(
        input.name,
        input.storeLocation,
      );
      return toUserProfile(result);
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(QUERY_KEY, profile);
    },
  });
}

export interface UpdateProfileWithPhotoInput {
  name: string;
  storeLocation: string;
  photo: string | null;
}

/**
 * Updates the signed-in user's profile including the photo field.
 * Use this from the Profile page when the user uploads/removes a profile
 * photo alongside name/store edits. Pass `null` for `photo` to clear it.
 * Invalidates ['my-profile'] and ['all-users'] on success so the nav
 * avatar and admin Users page stay in sync.
 */
export function useUpdateMyProfileWithPhoto() {
  const queryClient = useQueryClient();
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (input: UpdateProfileWithPhotoInput) => {
      if (!actor) throw new Error("Backend not ready");
      // Candid is positional: updateMyProfileWithPhoto(name, storeLocation, photo)
      const result = await actor.updateMyProfileWithPhoto(
        input.name,
        input.storeLocation,
        input.photo,
      );
      return toUserProfile(result);
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(QUERY_KEY, profile);
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
    },
  });
}

export interface SetMyPhotoInput {
  photo: string | null;
}

/**
 * Sets only the signed-in user's profile photo. Pass `null` to clear it.
 * Use this from the Profile page when the user uploads/removes a photo
 * without changing name/store. Invalidates ['my-profile'] and ['all-users']
 * on success so the nav avatar and admin Users page stay in sync.
 */
export function useSetMyPhoto() {
  const queryClient = useQueryClient();
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (input: SetMyPhotoInput) => {
      if (!actor) throw new Error("Backend not ready");
      // Candid is positional: setMyPhoto(photo)
      const result = await actor.setMyPhoto(input.photo);
      return toUserProfile(result);
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(QUERY_KEY, profile);
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
    },
  });
}

/**
 * Initiates email verification for a manually-typed email address. Sends a
 * verification challenge to the given address. The user then enters the
 * code and calls `useSetEmailForUser` to confirm and save.
 *
 * Returns the backend `SendResult` ({ __kind__: 'ok' } | { __kind__: 'err',
 * err: string }) so the EnterEmailScreen can show a precise error message.
 *
 * This is for plain-II users with no SSO-verified email only — SSO users
 * already have a verified email and skip the EnterEmailScreen entirely.
 */
export function useInitiateEmailVerification() {
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (email: string) => {
      if (!actor) throw new Error("Backend not ready");
      // Candid is positional: initiateEmailVerification(email)
      return actor.initiateEmailVerification(email);
    },
  });
}

/**
 * Confirms and saves the user's email after they enter the verification
 * code. Replaces the old email on record with the new (now-verified) one.
 * Use this from the EnterEmailScreen after the user submits the code from
 * their inbox. Invalidates ['my-profile'] and ['all-users'] on success so
 * the AuthGate email-check, nav, and admin Users page all reflect the new
 * email immediately.
 */
export function useSetEmailForUser() {
  const queryClient = useQueryClient();
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (newEmail: string) => {
      if (!actor) throw new Error("Backend not ready");
      // Candid is positional: setEmailForUser(newEmail)
      const result = await actor.setEmailForUser(newEmail);
      return toUserProfile(result);
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(QUERY_KEY, profile);
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
    },
  });
}
