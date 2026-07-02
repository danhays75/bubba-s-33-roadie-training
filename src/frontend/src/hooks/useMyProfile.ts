import type { UserProfile } from "@/types/foundation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useBackend } from "./useBackend";

const QUERY_KEY = ["my-profile"] as const;

/** Translates a Candid UserProfile (id: Principal) to the local shape. */
function toUserProfile(p: {
  id: { toString(): string };
  name: string;
  storeLocation: string;
  role: string;
}): UserProfile {
  return {
    principal: p.id.toString(),
    name: p.name,
    storeLocation: p.storeLocation,
    role: p.role as UserProfile["role"],
  };
}

/**
 * Reads the signed-in user's profile. Returns `null` when no profile exists
 * yet (first-time sign-in) — the AuthGate uses this to show the
 * CreateProfileScreen.
 */
export function useMyProfile() {
  const { actor, isFetching } = useBackend();
  return useQuery<UserProfile | null>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      if (!actor) return null;
      const result = await actor.getMyProfile();
      return result ? toUserProfile(result) : null;
    },
    enabled: !!actor && !isFetching,
  });
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
