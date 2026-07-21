import { LayoutStyle as BackendLayoutStyle } from "@/backend";
import type { LayoutStyle, Position } from "@/types/foundation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useBackend } from "./useBackend";

const QUERY_KEY = ["all-positions"] as const;

/** Translates a Candid Position (id: bigint, layoutStyle: LayoutStyle enum)
 * to the local string-id + string-union shape. */
function toPosition(p: {
  id: bigint;
  name: string;
  description?: string;
  coverPhoto?: string;
  sortOrder: bigint;
  layoutStyle: BackendLayoutStyle;
}): Position {
  return {
    id: p.id.toString(),
    name: p.name,
    description: p.description ?? "",
    coverPhoto: p.coverPhoto,
    sortOrder: Number(p.sortOrder),
    layoutStyle:
      p.layoutStyle === BackendLayoutStyle.orientation
        ? "orientation"
        : "library",
  };
}

/** Translates the ergonomic string union back to the backend LayoutStyle enum. */
function toBackendLayoutStyle(value: LayoutStyle): BackendLayoutStyle {
  return value === "orientation"
    ? BackendLayoutStyle.orientation
    : BackendLayoutStyle.library;
}

/** Reads every position, ordered by per-parent sortOrder. */
export function useAllPositions() {
  const { actor, isFetching } = useBackend();
  return useQuery<Position[]>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      if (!actor) return [];
      const result = await actor.getAllPositions();
      return result.map(toPosition);
    },
    enabled: !!actor && !isFetching,
  });
}

export interface CreatePositionInput {
  name: string;
  description: string;
  coverPhoto?: string;
  layoutStyle: LayoutStyle;
}

/** Creates a new position (admin only). */
export function useCreatePosition() {
  const queryClient = useQueryClient();
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (input: CreatePositionInput) => {
      if (!actor) throw new Error("Backend not ready");
      // Candid is positional: createPosition(name, description | null, coverPhoto | null, layoutStyle)
      const result = await actor.createPosition(
        input.name,
        input.description.length > 0 ? input.description : null,
        input.coverPhoto && input.coverPhoto.length > 0
          ? input.coverPhoto
          : null,
        toBackendLayoutStyle(input.layoutStyle),
      );
      return toPosition(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export interface UpdatePositionInput {
  id: string;
  name: string;
  description: string;
  coverPhoto?: string;
  layoutStyle: LayoutStyle;
}

/** Updates an existing position (admin only). */
export function useUpdatePosition() {
  const queryClient = useQueryClient();
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (input: UpdatePositionInput) => {
      if (!actor) throw new Error("Backend not ready");
      // Candid is positional: updatePosition(id: bigint, name, description | null, coverPhoto | null, layoutStyle)
      const result = await actor.updatePosition(
        BigInt(input.id),
        input.name,
        input.description.length > 0 ? input.description : null,
        input.coverPhoto && input.coverPhoto.length > 0
          ? input.coverPhoto
          : null,
        toBackendLayoutStyle(input.layoutStyle),
      );
      return toPosition(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

/** Deletes a position (admin only). */
export function useDeletePosition() {
  const queryClient = useQueryClient();
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error("Backend not ready");
      // Candid expects bigint
      await actor.deletePosition(BigInt(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

/** Reorders positions per-parent (admin only). Pass the new full order. */
export function useReorderPositions() {
  const queryClient = useQueryClient();
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      if (!actor) throw new Error("Backend not ready");
      // Candid expects Array<bigint>
      await actor.reorderPositions(orderedIds.map((id) => BigInt(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
