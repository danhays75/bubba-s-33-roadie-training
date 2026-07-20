import { ActivityType } from "@/backend";
import type {
  ActivityContent,
  DrinksBuilderSettings as CandidDrinksBuilderSettings,
} from "@/backend";
import type { DrinksBuilderSettings } from "@/components/legendary/drinks-builder/types";
import type {
  BuildLegendaryActivityInput,
  LegendaryActivity,
  LegendaryActivityContent,
  UpdateLegendaryActivityInput,
} from "@/types/legendary";
import { toFrontendActivity } from "@/types/legendary";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useBackend } from "./useBackend";

/**
 * Be Legendary hooks — admin-built practice activities (quiz / flashcards)
 * scoped to a position.
 *
 * Mirrors the useLibrary / useNso pattern: string ids on the frontend,
 * BigInt translation at the hook boundary. The ActivityType enum is
 * translated to/from the Candid ActivityType enum at the boundary.
 *
 * Query keys:
 *   - ["legendary-activities", positionId] — every activity for a position
 *   - ["legendary-activity", id]            — a single activity by id
 *
 * All hooks render inside the existing single QueryClientProvider
 * (main.tsx) and ErrorBoundary — no second provider is added here.
 *
 * Admin-only mutations (build / delete) rely on the backend to reject
 * non-admin callers; the frontend does not pre-check the role.
 */

// --- Reads -----------------------------------------------------------------

/**
 * Translates a frontend LegendaryActivityContent to the Candid ActivityContent
 * tagged-union shape expected by the backend. Only drinksBuilder content is
 * sent from the frontend (quiz / flashcard content is generated server-side
 * from the source categories, so it is passed through as-is when present).
 *
 * The frontend DrinksBuilderSettings keeps ergonomic number fields
 * (decoyCount, pointsPerCorrect, roundsPerSession); the Candid shape expects
 * bigint, so they are wrapped with BigInt() here at the boundary.
 */
function toCandidActivityContent(
  content: LegendaryActivityContent,
): ActivityContent {
  if (content.kind === "drinksBuilderContent") {
    return {
      __kind__: "drinksBuilderContent",
      drinksBuilderContent: {
        settings: toCandidDrinksBuilderSettings(content.settings),
      },
    };
  }
  if (content.kind === "quizContent") {
    return {
      __kind__: "quizContent",
      quizContent: [],
    };
  }
  return {
    __kind__: "flashcardContent",
    flashcardContent: [],
  };
}

/** Translates the frontend DrinksBuilderSettings to the Candid shape. */
function toCandidDrinksBuilderSettings(
  s: DrinksBuilderSettings,
): CandidDrinksBuilderSettings {
  return {
    includedCategories: s.includedCategories,
    excludedDrinkTitles: s.excludedDrinkTitles,
    decoyCount: BigInt(s.decoyCount),
    requireExactAmounts: s.requireExactAmounts,
    enforceAssemblyOrder: s.enforceAssemblyOrder,
    showScoring: s.showScoring,
    streakMultiplier: s.streakMultiplier,
    pointsPerCorrect: BigInt(s.pointsPerCorrect),
    roundsPerSession: BigInt(s.roundsPerSession),
    soundDefault: s.soundDefault,
  };
}

/**
 * Reads every Be Legendary activity built for a position. The backend
 * returns them in creation order; the page can sort as needed.
 */
export function useLegendaryActivitiesByPosition(positionId: string) {
  const { actor, isFetching } = useBackend();
  return useQuery<LegendaryActivity[]>({
    queryKey: ["legendary-activities", positionId],
    queryFn: async () => {
      if (!actor) return [];
      const result = await actor.getLegendaryActivitiesByPosition(
        BigInt(positionId),
      );
      return result.map(toFrontendActivity);
    },
    enabled: !!actor && !isFetching && !!positionId,
  });
}

/** Reads a single Be Legendary activity by id (or null if missing). */
export function useLegendaryActivity(id: string) {
  const { actor, isFetching } = useBackend();
  return useQuery<LegendaryActivity | null>({
    queryKey: ["legendary-activity", id],
    queryFn: async () => {
      if (!actor) return null;
      const result = await actor.getLegendaryActivity(BigInt(id));
      return result ? toFrontendActivity(result) : null;
    },
    enabled: !!actor && !isFetching && !!id,
  });
}

// --- Mutations -------------------------------------------------------------

/**
 * Builds a new Be Legendary activity for a position (admin only).
 *
 * Translates the frontend string ids to bigint at the boundary and the
 * frontend ActivityType literal to the Candid ActivityType enum. On
 * success, invalidates the position's activities list so the new card
 * appears immediately.
 */
export function useBuildLegendaryActivity() {
  const queryClient = useQueryClient();
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (input: BuildLegendaryActivityInput) => {
      if (!actor) throw new Error("Backend not ready");
      // Candid: buildLegendaryActivity(input: BuildActivityInput) -> Activity
      // BuildActivityInput = { positionId: bigint, activityType: ActivityType,
      //   name: string, sourceCategoryIds: Array<bigint>, content?: ActivityContent }
      const result = await actor.buildLegendaryActivity({
        positionId: BigInt(input.positionId),
        activityType:
          input.activityType === "quiz"
            ? ActivityType.quiz
            : input.activityType === "drinksBuilder"
              ? ActivityType.drinksBuilder
              : ActivityType.flashcards,
        name: input.name,
        sourceCategoryIds: input.sourceCategoryIds.map((id) => BigInt(id)),
        content: input.content
          ? toCandidActivityContent(input.content)
          : undefined,
      });
      return toFrontendActivity(result);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["legendary-activities", variables.positionId],
      });
    },
  });
}

export interface DeleteLegendaryActivityInput {
  id: string;
  positionId: string;
}

/**
 * Deletes a Be Legendary activity (admin only). Invalidates the position's
 * activities list and removes the deleted activity's single-read cache so
 * stale caches don't linger.
 */
export function useDeleteLegendaryActivity() {
  const queryClient = useQueryClient();
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (input: DeleteLegendaryActivityInput) => {
      if (!actor) throw new Error("Backend not ready");
      // Candid: deleteLegendaryActivity(id: bigint) -> void
      await actor.deleteLegendaryActivity(BigInt(input.id));
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["legendary-activities", variables.positionId],
      });
      queryClient.removeQueries({
        queryKey: ["legendary-activity", variables.id],
      });
    },
  });
}

/**
 * Updates a Be Legendary activity's name and source categories (admin only).
 *
 * Translates the frontend string ids to bigint at the boundary. The activity
 * type is NOT part of the update — it is fixed at build time. On success,
 * invalidates the position's activities list and the single-activity read so
 * the edited card and any open detail refresh immediately.
 */
export function useUpdateLegendaryActivity() {
  const queryClient = useQueryClient();
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (input: UpdateLegendaryActivityInput) => {
      if (!actor) throw new Error("Backend not ready");
      // Candid: updateLegendaryActivity(input: UpdateActivityInput) -> Activity
      // UpdateActivityInput = { id: bigint, name: string,
      //   sourceCategoryIds: Array<bigint>, content?: ActivityContent }
      const result = await actor.updateLegendaryActivity({
        id: BigInt(input.id),
        name: input.name,
        sourceCategoryIds: input.sourceCategoryIds.map((id) => BigInt(id)),
        content: input.content
          ? toCandidActivityContent(input.content)
          : undefined,
      });
      return toFrontendActivity(result);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["legendary-activities", variables.positionId],
      });
      queryClient.invalidateQueries({
        queryKey: ["legendary-activity", variables.id],
      });
    },
  });
}

export interface RebuildLegendaryActivityInput {
  id: string;
  positionId: string;
}

/**
 * Rebuilds a Be Legendary activity's generated content from its current
 * source categories (admin only). Overwrites the existing quiz questions /
 * flashcards. The activity's name, type, and source categories are unchanged.
 *
 * On success, invalidates the position's activities list and the
 * single-activity read so the rebuilt content shows immediately.
 */
export function useRebuildLegendaryActivity() {
  const queryClient = useQueryClient();
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (input: RebuildLegendaryActivityInput) => {
      if (!actor) throw new Error("Backend not ready");
      // Candid: rebuildLegendaryActivity(id: bigint) -> Activity
      const result = await actor.rebuildLegendaryActivity(BigInt(input.id));
      return toFrontendActivity(result);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["legendary-activities", variables.positionId],
      });
      queryClient.invalidateQueries({
        queryKey: ["legendary-activity", variables.id],
      });
    },
  });
}
