import {
  type FoodRecipe as BackendFoodRecipe,
  FoodRecipeKind as BackendFoodRecipeKind,
} from "@/backend";
import type {
  Category,
  DetailField,
  FoodComponent,
  FoodRecipe,
  FoodServiceware,
  LibraryItem,
  Recipe,
  RecipeSpec,
  RecipeVariant,
} from "@/types/foundation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useBackend } from "./useBackend";

/**
 * Library hooks — categories, items, search, and admin CRUD/reorder.
 *
 * Mirrors the useAllPositions / useMyAssignments pattern: string ids and
 * number sortOrder on the frontend, BigInt translation at the hook boundary.
 * Optional ?Text fields are translated null <-> null and string <-> string.
 *
 * All hooks render inside the existing single QueryClientProvider (main.tsx)
 * and ErrorBoundary — no second provider is added here.
 */

// --- Translators -----------------------------------------------------------

/**
 * Generates a stable, unique id for a frontend DetailField row. Used as the
 * React key in DetailFieldEditor so inputs do not remount (and lose focus)
 * on every keystroke. The id is frontend-only — never sent to the backend.
 *
 * Uses crypto.randomUUID when available (modern browsers, secure contexts);
 * falls back to a counter + timestamp + random for older environments.
 *
 * Exported so DetailFieldEditor.add() and ItemEditorPage initial/prefill
 * state can mint ids for new rows without duplicating the generator.
 */
export function makeDetailFieldId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `df-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Translates a Candid Category (bigint ids) to the local string-id shape. */
function toCategory(c: {
  id: bigint;
  positionId: bigint;
  name: string;
  coverPhoto?: string;
  accentColor?: string;
  sortOrder: bigint;
}): Category {
  return {
    id: c.id.toString(),
    positionId: c.positionId.toString(),
    name: c.name,
    coverPhoto: c.coverPhoto ?? null,
    // Candid sends accentColor as string | null already (it is a non-optional
    // text on the backend record, but the hook stays defensive for the
    // undefined case). Map directly — no normalization needed.
    accentColor: c.accentColor ?? null,
    sortOrder: Number(c.sortOrder),
  };
}

/**
 * Translates a Candid Recipe to the frontend Recipe type. Mirrors the backend
 * shape 1:1 — recipe sub-records are value records with no ids, so there is
 * no bigint translation. The only thing to preserve is `variantLabel` (not
 * `label`) on variants, which the type system already enforces.
 *
 * Returns null when the backend omits the optional ?Recipe field (plain
 * Library card, not a cocktail spec).
 */
function toRecipe(
  r:
    | {
        glassware: string;
        specs: Array<{
          amount: string;
          ingredient: string;
          upsell: boolean;
        }>;
        assembly: Array<string>;
        garnish: Array<string>;
        variants: Array<{
          variantLabel: string;
          specs: Array<{
            amount: string;
            ingredient: string;
            upsell: boolean;
          }>;
          assembly: Array<string>;
        }>;
        equipment?: Array<string>;
        yield?: string;
        shelfLife?: string;
        qualityIdentifier?: Array<string>;
        recapAudio?: string;
        buildAudio?: string;
      }
    | undefined,
): Recipe | null {
  if (!r) return null;
  return {
    glassware: r.glassware,
    specs: r.specs.map((s) => ({
      amount: s.amount,
      ingredient: s.ingredient,
      upsell: s.upsell,
    })),
    assembly: r.assembly,
    garnish: r.garnish,
    variants: r.variants.map((v) => ({
      variantLabel: v.variantLabel,
      specs: v.specs.map((s) => ({
        amount: s.amount,
        ingredient: s.ingredient,
        upsell: s.upsell,
      })),
      assembly: v.assembly,
    })),
    equipment: r.equipment ?? [],
    // Backend optional ?Text comes through as undefined or empty string when
    // absent; normalize both to null so the frontend treats them uniformly.
    yield: r.yield && r.yield.length > 0 ? r.yield : null,
    shelfLife: r.shelfLife && r.shelfLife.length > 0 ? r.shelfLife : null,
    qualityIdentifier: r.qualityIdentifier ?? [],
    recapAudio: r.recapAudio && r.recapAudio.length > 0 ? r.recapAudio : null,
    buildAudio: r.buildAudio && r.buildAudio.length > 0 ? r.buildAudio : null,
  };
}

/**
 * Maps a frontend Recipe (or null) to the backend Candid Recipe shape for
 * createItem/updateItem. Strips nothing (recipe has no frontend-only fields
 * like DetailField.id) — it is a 1:1 structural copy that exists mainly to
 * satisfy the Candid type at the actor boundary and to normalize null/undefined
 * to null so items without a recipe pass through unchanged.
 */
function fromRecipe(r: Recipe | null | undefined): {
  glassware: string;
  specs: Array<{
    amount: string;
    ingredient: string;
    upsell: boolean;
  }>;
  assembly: Array<string>;
  garnish: Array<string>;
  variants: Array<{
    variantLabel: string;
    specs: Array<{
      amount: string;
      ingredient: string;
      upsell: boolean;
    }>;
    assembly: Array<string>;
  }>;
  equipment: Array<string>;
  yield: string | undefined;
  shelfLife: string | undefined;
  qualityIdentifier: Array<string>;
  recapAudio: string | undefined;
  buildAudio: string | undefined;
} | null {
  if (!r) return null;
  return {
    glassware: r.glassware,
    specs: r.specs.map((s) => ({
      amount: s.amount,
      ingredient: s.ingredient,
      upsell: s.upsell,
    })),
    assembly: r.assembly,
    garnish: r.garnish,
    variants: r.variants.map((v) => ({
      variantLabel: v.variantLabel,
      specs: v.specs.map((s) => ({
        amount: s.amount,
        ingredient: s.ingredient,
        upsell: s.upsell,
      })),
      assembly: v.assembly,
    })),
    equipment: r.equipment ?? [],
    // Frontend stores null; the Candid ?Text boundary expects undefined for
    // absent optionals. Translate null/empty -> undefined here.
    yield: r.yield && r.yield.length > 0 ? r.yield : undefined,
    shelfLife: r.shelfLife && r.shelfLife.length > 0 ? r.shelfLife : undefined,
    qualityIdentifier: r.qualityIdentifier ?? [],
    recapAudio:
      r.recapAudio && r.recapAudio.length > 0 ? r.recapAudio : undefined,
    buildAudio:
      r.buildAudio && r.buildAudio.length > 0 ? r.buildAudio : undefined,
  };
}

/**
 * Translates a Candid FoodRecipe to the frontend FoodRecipe type. Mirrors
 * the toRecipe pattern: food sub-records are value records with no ids, so
 * there is no bigint translation. The only normalization is optional ?Text
 * fields — the backend surfaces them as undefined or empty string when
 * absent; both normalize to null so the frontend treats them uniformly.
 *
 * Returns null when the backend omits the optional ?FoodRecipe field (plain
 * beverage/plain card, not a food recipe).
 */
function toFoodRecipe(
  r:
    | {
        station: string;
        kind: "prep" | "menuBuild";
        menuSection?: string;
        buildHeader?: string;
        serviceware: Array<{ item: string; amount: string }>;
        components: Array<{
          item: string;
          amount: string;
          group?: string;
          note?: string;
          anchorY?: number;
          amounts?: Array<{ size: string; value: string }>;
        }>;
        steps: Array<string>;
        expoSteps: Array<string>;
        allergenNote?: string;
        yieldText?: string;
        shelfLife?: string;
        holdTemp?: string;
        storeTemp?: string;
        lineUtensil?: string;
        equipment?: string;
        qualityIdentifiers: Array<string>;
      }
    | undefined,
): FoodRecipe | null {
  if (!r) return null;
  return {
    station: r.station,
    kind: r.kind === "menuBuild" ? "menuBuild" : "prep",
    menuSection:
      r.menuSection && r.menuSection.length > 0 ? r.menuSection : null,
    buildHeader:
      r.buildHeader && r.buildHeader.length > 0 ? r.buildHeader : null,
    serviceware: r.serviceware.map((s) => ({ item: s.item, amount: s.amount })),
    components: r.components.map((c) => ({
      item: c.item,
      amount: c.amount,
      group: c.group && c.group.length > 0 ? c.group : null,
      note: c.note && c.note.length > 0 ? c.note : null,
      anchorY:
        typeof c.anchorY === "number" && Number.isFinite(c.anchorY)
          ? c.anchorY
          : null,
      // Backend amounts is a non-optional Array<FoodComponentSize>; default
      // to [] when absent so the frontend treats components without per-size
      // amounts uniformly (empty array = scalar `amount` fallback).
      amounts: (c.amounts ?? []).map((a) => ({
        size: a.size,
        value: a.value,
      })),
    })),
    steps: r.steps,
    expoSteps: r.expoSteps,
    allergenNote:
      r.allergenNote && r.allergenNote.length > 0 ? r.allergenNote : null,
    yieldText: r.yieldText && r.yieldText.length > 0 ? r.yieldText : null,
    shelfLife: r.shelfLife && r.shelfLife.length > 0 ? r.shelfLife : null,
    holdTemp: r.holdTemp && r.holdTemp.length > 0 ? r.holdTemp : null,
    storeTemp: r.storeTemp && r.storeTemp.length > 0 ? r.storeTemp : null,
    lineUtensil:
      r.lineUtensil && r.lineUtensil.length > 0 ? r.lineUtensil : null,
    equipment: r.equipment && r.equipment.length > 0 ? r.equipment : null,
    qualityIdentifiers: r.qualityIdentifiers ?? [],
  };
}

/**
 * Maps a frontend FoodRecipe (or null) to the backend Candid FoodRecipe shape
 * for createItem/updateItem. Mirrors fromRecipe: a 1:1 structural copy that
 * exists mainly to satisfy the Candid type at the actor boundary and to
 * normalize null/empty -> undefined so items without a food recipe pass
 * through unchanged. The Candid ?Text boundary expects undefined for absent
 * optionals. The backend actor expects the nominal FoodRecipeKind enum from
 * @/backend (not the foundation string union), so r.kind is mapped to the
 * backend enum here — mirroring the LayoutStyle mapping in useAllPositions.
 */
function fromFoodRecipe(
  r: FoodRecipe | null | undefined,
): BackendFoodRecipe | null {
  if (!r) return null;
  return {
    station: r.station,
    kind:
      r.kind === "menuBuild"
        ? BackendFoodRecipeKind.menuBuild
        : BackendFoodRecipeKind.prep,
    // Frontend stores null; the Candid ?Text boundary expects undefined for
    // absent optionals. Translate null/empty -> undefined here.
    menuSection:
      r.menuSection && r.menuSection.length > 0 ? r.menuSection : undefined,
    buildHeader:
      r.buildHeader && r.buildHeader.length > 0 ? r.buildHeader : undefined,
    serviceware: r.serviceware.map((s) => ({
      item: s.item,
      amount: s.amount,
    })),
    components: r.components.map((c) => ({
      item: c.item,
      amount: c.amount,
      group: c.group && c.group.length > 0 ? c.group : undefined,
      note: c.note && c.note.length > 0 ? c.note : undefined,
      anchorY: c.anchorY !== null ? c.anchorY : undefined,
      // amounts is a non-optional array on the backend; pass through as-is.
      amounts: c.amounts.map((a) => ({ size: a.size, value: a.value })),
    })),
    steps: r.steps,
    expoSteps: r.expoSteps,
    allergenNote:
      r.allergenNote && r.allergenNote.length > 0 ? r.allergenNote : undefined,
    yieldText: r.yieldText && r.yieldText.length > 0 ? r.yieldText : undefined,
    shelfLife: r.shelfLife && r.shelfLife.length > 0 ? r.shelfLife : undefined,
    holdTemp: r.holdTemp && r.holdTemp.length > 0 ? r.holdTemp : undefined,
    storeTemp: r.storeTemp && r.storeTemp.length > 0 ? r.storeTemp : undefined,
    lineUtensil:
      r.lineUtensil && r.lineUtensil.length > 0 ? r.lineUtensil : undefined,
    equipment: r.equipment && r.equipment.length > 0 ? r.equipment : undefined,
    qualityIdentifiers: r.qualityIdentifiers ?? [],
  };
}

/** Translates a Candid LibraryItem (bigint ids) to the local string-id shape. */
function toItem(i: {
  id: bigint;
  categoryId: bigint;
  title: string;
  subtitle?: string;
  photo?: string;
  details: Array<{ fieldLabel: string; value: string }>;
  notes?: string;
  tags: Array<string>;
  seasonal: boolean;
  sortOrder: bigint;
  recipe?: {
    glassware: string;
    specs: Array<{
      amount: string;
      ingredient: string;
      upsell: boolean;
    }>;
    assembly: Array<string>;
    garnish: Array<string>;
    variants: Array<{
      variantLabel: string;
      specs: Array<{
        amount: string;
        ingredient: string;
        upsell: boolean;
      }>;
      assembly: Array<string>;
    }>;
    equipment?: Array<string>;
    yield?: string;
    shelfLife?: string;
    qualityIdentifier?: Array<string>;
    recapAudio?: string;
  };
  foodRecipe?: {
    station: string;
    kind: "prep" | "menuBuild";
    menuSection?: string;
    buildHeader?: string;
    serviceware: Array<{ item: string; amount: string }>;
    components: Array<{
      item: string;
      amount: string;
      group?: string;
      note?: string;
      anchorY?: number;
      amounts?: Array<{ size: string; value: string }>;
    }>;
    steps: Array<string>;
    expoSteps: Array<string>;
    allergenNote?: string;
    yieldText?: string;
    shelfLife?: string;
    holdTemp?: string;
    storeTemp?: string;
    lineUtensil?: string;
    equipment?: string;
    qualityIdentifiers: Array<string>;
  };
}): LibraryItem {
  const details: DetailField[] = (i.details ?? []).map((d) => ({
    // id is frontend-only (not in the backend record). Generated here so each
    // detail-field row has a stable React key for the lifetime of this read.
    // Stripped before persisting in createItem/updateItem below.
    id: makeDetailFieldId(),
    fieldLabel: d.fieldLabel,
    value: d.value,
  }));
  return {
    id: i.id.toString(),
    categoryId: i.categoryId.toString(),
    title: i.title,
    subtitle: i.subtitle ?? null,
    photo: i.photo ?? null,
    details,
    notes: i.notes ?? null,
    tags: i.tags ?? [],
    seasonal: i.seasonal,
    sortOrder: Number(i.sortOrder),
    recipe: toRecipe(i.recipe),
    foodRecipe: toFoodRecipe(i.foodRecipe),
  };
}

// --- Reads -----------------------------------------------------------------

/** Reads every category for a position, ordered by per-parent sortOrder. */
export function useCategoriesByPosition(positionId: string) {
  const { actor, isFetching } = useBackend();
  return useQuery<Category[]>({
    queryKey: ["library-categories", positionId],
    queryFn: async () => {
      if (!actor) return [];
      const result = await actor.getCategoriesByPosition(BigInt(positionId));
      return result.map(toCategory);
    },
    enabled: !!actor && !isFetching && !!positionId,
  });
}

/** Reads a single category by id (or null if missing). */
export function useCategory(categoryId: string) {
  const { actor, isFetching } = useBackend();
  return useQuery<Category | null>({
    queryKey: ["library-category", categoryId],
    queryFn: async () => {
      if (!actor) return null;
      const result = await actor.getCategory(BigInt(categoryId));
      return result ? toCategory(result) : null;
    },
    enabled: !!actor && !isFetching && !!categoryId,
  });
}

/** Reads every item in a category, ordered by per-parent sortOrder. */
export function useItemsByCategory(categoryId: string) {
  const { actor, isFetching } = useBackend();
  return useQuery<LibraryItem[]>({
    queryKey: ["library-items", categoryId],
    queryFn: async () => {
      if (!actor) return [];
      const result = await actor.getItemsByCategory(BigInt(categoryId));
      return result.map(toItem);
    },
    enabled: !!actor && !isFetching && !!categoryId,
  });
}

/** Reads a single item by id (or null if missing). */
export function useItem(itemId: string) {
  const { actor, isFetching } = useBackend();
  return useQuery<LibraryItem | null>({
    queryKey: ["library-item", itemId],
    queryFn: async () => {
      if (!actor) return null;
      const result = await actor.getItem(BigInt(itemId));
      return result ? toItem(result) : null;
    },
    enabled: !!actor && !isFetching && !!itemId,
  });
}

/**
 * Position-scoped library search. Only enabled when searchText is non-empty.
 * Returns matching items across all categories in the position.
 */
export function useSearchLibrary(positionId: string, searchText: string) {
  const { actor, isFetching } = useBackend();
  const trimmed = searchText.trim();
  return useQuery<LibraryItem[]>({
    queryKey: ["library-search", positionId, trimmed],
    queryFn: async () => {
      if (!actor) return [];
      const result = await actor.searchLibrary(BigInt(positionId), trimmed);
      return result.map(toItem);
    },
    enabled: !!actor && !isFetching && !!positionId && trimmed.length > 0,
  });
}

// --- Category mutations ----------------------------------------------------

export interface CreateCategoryInput {
  positionId: string;
  name: string;
  coverPhoto?: string | null;
  accentColor?: string | null;
}

/** Creates a new category under a position (admin only). */
export function useCreateCategory() {
  const queryClient = useQueryClient();
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (input: CreateCategoryInput) => {
      if (!actor) throw new Error("Backend not ready");
      // Candid: createCategory(positionId: bigint, name, coverPhoto: ?Text, accentColor: ?Text)
      const result = await actor.createCategory(
        BigInt(input.positionId),
        input.name,
        input.coverPhoto && input.coverPhoto.length > 0
          ? input.coverPhoto
          : null,
        // Pass accentColor (or null) through. undefined becomes null so the
        // actor's ?Text boundary always receives an explicit value.
        input.accentColor ?? null,
      );
      return toCategory(result);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["library-categories", variables.positionId],
      });
    },
  });
}

export interface UpdateCategoryInput {
  categoryId: string;
  positionId: string;
  name: string;
  coverPhoto?: string | null;
  accentColor?: string | null;
}

/** Updates an existing category (admin only). */
export function useUpdateCategory() {
  const queryClient = useQueryClient();
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (input: UpdateCategoryInput) => {
      if (!actor) throw new Error("Backend not ready");
      // Candid: updateCategory(categoryId: bigint, name, coverPhoto: ?Text, accentColor: ?Text)
      const result = await actor.updateCategory(
        BigInt(input.categoryId),
        input.name,
        input.coverPhoto && input.coverPhoto.length > 0
          ? input.coverPhoto
          : null,
        // Pass accentColor (or null) through. undefined becomes null so the
        // actor's ?Text boundary always receives an explicit value.
        input.accentColor ?? null,
      );
      return toCategory(result);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["library-categories", variables.positionId],
      });
      queryClient.invalidateQueries({
        queryKey: ["library-category", variables.categoryId],
      });
    },
  });
}

export interface DeleteCategoryInput {
  categoryId: string;
  positionId: string;
}

/** Deletes a category (admin only). Invalidates the position's category list
 *  and the deleted category's item list so stale caches don't linger. */
export function useDeleteCategory() {
  const queryClient = useQueryClient();
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (input: DeleteCategoryInput) => {
      if (!actor) throw new Error("Backend not ready");
      await actor.deleteCategory(BigInt(input.categoryId));
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["library-categories", variables.positionId],
      });
      queryClient.invalidateQueries({
        queryKey: ["library-items", variables.categoryId],
      });
      queryClient.removeQueries({
        queryKey: ["library-category", variables.categoryId],
      });
    },
  });
}

export interface ReorderCategoriesInput {
  positionId: string;
  orderedCategoryIds: string[];
}

/** Reorders categories within a position (admin only). Pass the new full order. */
export function useReorderCategories() {
  const queryClient = useQueryClient();
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (input: ReorderCategoriesInput) => {
      if (!actor) throw new Error("Backend not ready");
      // Candid: reorderCategories(positionId: bigint, orderedCategoryIds: [Nat])
      const result = await actor.reorderCategories(
        BigInt(input.positionId),
        input.orderedCategoryIds.map((id) => BigInt(id)),
      );
      return result.map(toCategory);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["library-categories", variables.positionId],
      });
    },
  });
}

// --- Item mutations --------------------------------------------------------

export interface CreateItemInput {
  categoryId: string;
  title: string;
  subtitle?: string | null;
  photo?: string | null;
  details: DetailField[];
  notes?: string | null;
  tags: string[];
  seasonal: boolean;
  recipe?: Recipe | null;
  foodRecipe?: FoodRecipe | null;
}

/** Creates a new item under a category (admin only). */
export function useCreateItem() {
  const queryClient = useQueryClient();
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (input: CreateItemInput) => {
      if (!actor) throw new Error("Backend not ready");
      // Candid: createItem(categoryId, title, subtitle: ?Text, photo: ?Text, details, notes: ?Text, tags, seasonal, recipe: ?Recipe, foodRecipe: ?FoodRecipe)
      const result = await actor.createItem(
        BigInt(input.categoryId),
        input.title,
        input.subtitle && input.subtitle.length > 0 ? input.subtitle : null,
        input.photo && input.photo.length > 0 ? input.photo : null,
        input.details.map((d) => ({
          fieldLabel: d.fieldLabel,
          value: d.value,
        })),
        input.notes && input.notes.length > 0 ? input.notes : null,
        input.tags,
        input.seasonal,
        fromRecipe(input.recipe),
        fromFoodRecipe(input.foodRecipe),
      );
      return toItem(result);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["library-items", variables.categoryId],
      });
    },
  });
}

export interface UpdateItemInput {
  itemId: string;
  categoryId: string;
  title: string;
  subtitle?: string | null;
  photo?: string | null;
  details: DetailField[];
  notes?: string | null;
  tags: string[];
  seasonal: boolean;
  recipe?: Recipe | null;
  foodRecipe?: FoodRecipe | null;
}

/** Updates an existing item (admin only). */
export function useUpdateItem() {
  const queryClient = useQueryClient();
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (input: UpdateItemInput) => {
      if (!actor) throw new Error("Backend not ready");
      // Refuse empty/whitespace item ids so a placeholder id never silently
      // mutates the real item with id 0 (BigInt('') === 0n without throwing).
      if (input.itemId == null || input.itemId.trim() === "") {
        throw new Error("updateItem requires a non-empty item id");
      }
      // Candid: updateItem(itemId, title, subtitle: ?Text, photo: ?Text, details, notes: ?Text, tags, seasonal, recipe: ?Recipe, foodRecipe: ?FoodRecipe)
      const result = await actor.updateItem(
        BigInt(input.itemId),
        input.title,
        input.subtitle && input.subtitle.length > 0 ? input.subtitle : null,
        input.photo && input.photo.length > 0 ? input.photo : null,
        input.details.map((d) => ({
          fieldLabel: d.fieldLabel,
          value: d.value,
        })),
        input.notes && input.notes.length > 0 ? input.notes : null,
        input.tags,
        input.seasonal,
        fromRecipe(input.recipe),
        fromFoodRecipe(input.foodRecipe),
      );
      return toItem(result);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["library-items", variables.categoryId],
      });
      queryClient.invalidateQueries({
        queryKey: ["library-item", variables.itemId],
      });
    },
  });
}

export interface DeleteItemInput {
  itemId: string;
  categoryId: string;
}

/** Deletes an item (admin only). */
export function useDeleteItem() {
  const queryClient = useQueryClient();
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (input: DeleteItemInput) => {
      if (!actor) throw new Error("Backend not ready");
      await actor.deleteItem(BigInt(input.itemId));
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["library-items", variables.categoryId],
      });
      queryClient.removeQueries({
        queryKey: ["library-item", variables.itemId],
      });
    },
  });
}

export interface ReorderItemsInput {
  categoryId: string;
  orderedItemIds: string[];
}

/** Reorders items within a category (admin only). Pass the new full order. */
export function useReorderItems() {
  const queryClient = useQueryClient();
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (input: ReorderItemsInput) => {
      if (!actor) throw new Error("Backend not ready");
      // Candid: reorderItems(categoryId: bigint, orderedItemIds: [Nat])
      const result = await actor.reorderItems(
        BigInt(input.categoryId),
        input.orderedItemIds.map((id) => BigInt(id)),
      );
      return result.map(toItem);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["library-items", variables.categoryId],
      });
    },
  });
}
