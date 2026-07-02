import { createActor } from "@/backend";
import type { backendInterface } from "@/backend";
import { useActor } from "@caffeineai/core-infrastructure";

/**
 * Returns the Backend actor from backend.ts, ready to call any backend method.
 *
 * The actor is typed as the real `backendInterface` from backend.d.ts, so
 * every hook gets full type checking against the Candid signatures
 * (positional args, Principal, bigint, AssignmentStatus enum, etc.).
 */
export type BackendActor = backendInterface;

export function useBackend() {
  const { actor, isFetching } = useActor(createActor);
  return {
    actor: actor as BackendActor | null,
    isFetching,
  };
}
