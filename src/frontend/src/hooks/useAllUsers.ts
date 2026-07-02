import type { Role, UserProfile } from "@/types/foundation";
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
}): UserProfile {
  return {
    principal: p.id.toString(),
    name: p.name,
    storeLocation: p.storeLocation,
    role: p.role as Role,
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
