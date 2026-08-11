import {
  inferBuildKicker,
  resolveAnchorY,
} from "@/components/library/FoodRecipeCard";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useUpdateItem } from "@/hooks/useLibrary";
import { cn } from "@/lib/utils";
import type { FoodComponent, LibraryItem } from "@/types/foundation";
import {
  AlertTriangle,
  Check,
  GripVertical,
  Loader2,
  RotateCcw,
  Save,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import type { ReactElement } from "react";

/**
 * AnchorEditorDialog — admin-only Build Card label-position editor.
 *
 * Overlays the published Build Card photo + leader-line labels inside a
 * shadcn Dialog so an admin can drag each ingredient label up/down to
 * fine-tune its vertical position (anchorY 0.0–1.0) and persist the new
 * values back to the recipe via the existing useUpdateItem hook.
 *
 * Visual treatment reuses the published Build Card geometry: the editor
 * stage mirrors `.build-card-stage` (photo left ~46%, labels right ~54%)
 * via the `.anchor-editor-*` classes, and the kicker / title band / footer
 * reuse the exact `build-card-*` classes from FoodRecipeCard.tsx so the
 * admin sees exactly what guests see. The helpers `resolveAnchorY` and
 * `inferBuildKicker` are imported from FoodRecipeCard.tsx (not duplicated).
 *
 * Dragging is supported via mouse on desktop and touch on phone/tablet
 * (unified Pointer Events). Phone (<720px) reflows to single-column with
 * touch-draggable stacked handle rows (the CSS handles the reflow; the
 * drag logic is identical — pointer Y inside the labels container maps to
 * anchorY 0..1).
 *
 * Constraints:
 *   - Vertical position is clamped to the photo's height (0.0 top → 1.0
 *     bottom); a label cannot be dragged outside the photo bounds.
 *   - A configurable minimum gap (MIN_GAP, 4% of the photo height) keeps
 *     labels from overlapping: dragging snaps to stop MIN_GAP before the
 *     nearest neighbor.
 *   - The active handle gets a red ring + raised shadow + pulsing halo
 *     (`.anchor-handle.is-active`); other handles dim (`.is-dimmed`).
 *   - Each handle shows its current anchorY as a percentage (`.anchor-readout`).
 *   - ArrowUp / ArrowDown nudge the selected handle by a small step for
 *     pixel-precise adjustment after dragging.
 *   - "Reset to even spacing" restores (i+1)/(total+1) for every label.
 *   - Per-handle reset restores that single label's even default.
 *   - "Save positions" persists the current anchorY values via
 *     useUpdateItem, preserving every other item + foodRecipe field.
 *   - Save is disabled (with a tooltip) until at least one anchorY differs
 *     from its loaded value.
 *   - On success the editor refreshes to the saved values as the new
 *     baseline; on failure the error is shown and edits stay intact.
 *   - Navigating away (closing the dialog) with unsaved changes prompts a
 *     confirm dialog (`.anchor-confirm` classes) to discard or stay.
 *   - The photo tap-to-zoom lightbox is disabled inside the editor so it
 *     never interferes with drag interactions.
 *
 * Props:
 *   - item: the LibraryItem with a non-null foodRecipe (caller gates this).
 *   - open: whether the editor Dialog is open (controlled).
 *   - onOpenChange: controlled open-state setter.
 *   - onSaved: optional callback fired after a successful save (e.g. to
 *     refresh the parent view).
 */
export function AnchorEditorDialog({
  item,
  open,
  onOpenChange,
  onSaved,
}: {
  item: LibraryItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}): ReactElement {
  const food = item.foodRecipe;
  const photo = item.photo ?? "";
  const components = food?.components ?? [];
  const componentCount = components.length;

  // Resolve the kicker exactly as the published Build Card does: real
  // buildHeader when present, else the render-time inferBuildKicker fallback.
  const realKicker =
    food?.buildHeader != null && food.buildHeader.trim().length > 0
      ? food.buildHeader
      : null;
  const kicker = food ? (realKicker ?? inferBuildKicker(food)) : "";

  // --- Editing state -------------------------------------------------------
  // anchors[i] is the current anchorY (0..1) for component i being edited.
  // loadedAnchors[i] is the saved baseline (the values the item arrived
  // with). Dirty detection compares the two; "Reset to even spacing" and
  // per-handle reset restore the even-distribution defaults.
  const evenAnchors = useMemo(
    () => components.map((c, i) => resolveAnchorY(c, i, componentCount)),
    [components, componentCount],
  );
  const [loadedAnchors, setLoadedAnchors] = useState<number[]>(evenAnchors);
  const [anchors, setAnchors] = useState<number[]>(evenAnchors);

  // activeIndex: the handle currently being dragged OR selected for keyboard
  // nudging. Null when no handle is active. dragging: true only while a
  // pointer drag is in progress (drives the is-active vs is-dimmed styling).
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);

  // Feedback banner (success / error) shown above the actions row.
  const [feedback, setFeedback] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);

  // Unsaved-changes confirm dialog (separate from the main editor Dialog).
  const [confirmOpen, setConfirmOpen] = useState(false);

  const updateMutation = useUpdateItem();

  // Refs for the labels container (measured for pointer→anchorY mapping)
  // and the active pointer drag session.
  const labelsRef = useRef<HTMLDivElement | null>(null);
  const dragSession = useRef<{
    pointerId: number;
    labelRectTop: number;
    labelRectHeight: number;
  } | null>(null);

  // --- (Re)initialize when the dialog opens or the item changes ------------
  // On open, seed both anchors and loadedAnchors from the item's current
  // values (resolveAnchorY honors stored anchorY, falls back to even). On
  // close, clear feedback + active state so the next open starts clean.
  useEffect(() => {
    if (open) {
      setAnchors(evenAnchors);
      setLoadedAnchors(evenAnchors);
      setFeedback(null);
      setActiveIndex(null);
      setDragging(false);
    }
  }, [open, evenAnchors]);

  // --- Dirty detection -----------------------------------------------------
  // Compare with a small epsilon so float drift from clamp/round-trip does
  // not falsely enable Save. The values we persist are rounded to 4 decimal
  // places (see saveAnchors), so 1e-4 is well below any real edit.
  const isDirty = useMemo(() => {
    if (anchors.length !== loadedAnchors.length) return true;
    for (let i = 0; i < anchors.length; i += 1) {
      if (Math.abs(anchors[i] - loadedAnchors[i]) > 1e-4) return true;
    }
    return false;
  }, [anchors, loadedAnchors]);

  // --- Gap enforcement -----------------------------------------------------
  // MIN_GAP is the minimum vertical separation (as a fraction of the photo
  // height) between two adjacent labels. Dragging/nudging a handle snaps to
  // stop MIN_GAP before its nearest neighbor so labels never overlap. 4%
  // keeps the readable gap the published card already aims for without
  // crowding; it is intentionally a single constant (not a per-label preset
  // — custom spacing presets are out of scope).
  const MIN_GAP = 0.04;

  /**
   * Clamps a candidate anchorY for handle `i` to [0, 1] and enforces the
   * minimum gap against its current neighbors (anchors[i-1], anchors[i+1]).
   * Neighbors are read from the live `anchors` array so multi-handle edits
   * compose. Returns the clamped value.
   */
  const clampWithGap = useCallback(
    (i: number, candidate: number, source: number[]): number => {
      let lo = 0;
      let hi = 1;
      if (i > 0) lo = source[i - 1] + MIN_GAP;
      if (i < source.length - 1) hi = source[i + 1] - MIN_GAP;
      // If neighbors are too close to satisfy MIN_GAP on both sides, fall
      // back to the midpoint between them so the handle lands equidistant
      // rather than violating the gap on one side.
      if (lo > hi) {
        const left = i > 0 ? source[i - 1] : 0;
        const right = i < source.length - 1 ? source[i + 1] : 1;
        return (left + right) / 2;
      }
      return Math.min(hi, Math.max(lo, candidate));
    },
    [],
  );

  // --- Pointer drag --------------------------------------------------------
  /**
   * Maps a pointer clientY to an anchorY (0..1) inside the labels container.
   * Uses the container's bounding rect captured at drag start so the math
   * stays stable across the drag (a live getBoundingClientRect on every
   * move would jitter if the layout shifted).
   */
  const pointerToAnchorY = useCallback((clientY: number): number => {
    const session = dragSession.current;
    if (!session) return 0.5;
    const { labelRectTop, labelRectHeight } = session;
    if (labelRectHeight <= 0) return 0.5;
    const y = (clientY - labelRectTop) / labelRectHeight;
    return Math.min(1, Math.max(0, y));
  }, []);

  const handlePointerDown = (
    i: number,
    e: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (!open || updateMutation.isPending) return;
    // Only react to primary pointer buttons / touch / pen.
    if (e.button !== 0 && e.pointerType === "mouse") return;
    const el = labelsRef.current;
    if (!el) return;
    e.preventDefault();
    const rect = el.getBoundingClientRect();
    dragSession.current = {
      pointerId: e.pointerId,
      labelRectTop: rect.top,
      labelRectHeight: rect.height,
    };
    setActiveIndex(i);
    setDragging(true);
    setFeedback(null);
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // setPointerCapture can throw if the pointer was already released;
      // the move/up handlers are still wired via window listeners below.
    }
  };

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      const session = dragSession.current;
      if (!session || session.pointerId !== e.pointerId) return;
      const i = activeIndex;
      if (i === null) return;
      const raw = pointerToAnchorY(e.clientY);
      setAnchors((prev) => {
        const next = prev.slice();
        next[i] = clampWithGap(i, raw, prev);
        return next;
      });
    },
    [activeIndex, clampWithGap, pointerToAnchorY],
  );

  const endDrag = useCallback((e: PointerEvent) => {
    const session = dragSession.current;
    if (!session || session.pointerId !== e.pointerId) return;
    dragSession.current = null;
    setDragging(false);
    // Keep activeIndex set so the handle stays selected for keyboard nudging
    // after the drag ends. The user can click elsewhere or press Escape to
    // deselect.
  }, []);

  // Wire pointer move/up to the window so a drag continues even if the
  // pointer leaves the handle (e.g. dragged past the container edge). This
  // is essential for touch drags where the finger moves faster than the
  // handle can track.
  useEffect(() => {
    if (!dragging) return;
    window.addEventListener("pointermove", handlePointerMove, {
      passive: false,
    });
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
    };
  }, [dragging, handlePointerMove, endDrag]);

  // --- Keyboard nudging ----------------------------------------------------
  // When a handle is selected (activeIndex !== null) and not being dragged,
  // ArrowUp / ArrowDown nudge it by NUDGE_STEP (0.5% of photo height),
  // enforcing the same gap constraints. Escape deselects. The handler is
  // attached to the labels container so it only fires while the editor has
  // focus inside the stage.
  const NUDGE_STEP = 0.005;

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (activeIndex === null || dragging) return;
    const i = activeIndex;
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setAnchors((prev) => {
        const next = prev.slice();
        next[i] = clampWithGap(i, prev[i] - NUDGE_STEP, prev);
        return next;
      });
      setFeedback(null);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setAnchors((prev) => {
        const next = prev.slice();
        next[i] = clampWithGap(i, prev[i] + NUDGE_STEP, prev);
        return next;
      });
      setFeedback(null);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setActiveIndex(null);
    }
  };

  // --- Reset actions -------------------------------------------------------
  const resetAllToEven = () => {
    setAnchors(evenAnchors);
    setFeedback(null);
  };

  const resetHandleToEven = (i: number) => {
    setAnchors((prev) => {
      const next = prev.slice();
      next[i] = clampWithGap(i, evenAnchors[i], prev);
      return next;
    });
    setFeedback(null);
  };

  // --- Close guard ---------------------------------------------------------
  // Intercept close attempts: if there are unsaved changes, open the confirm
  // dialog instead of closing. The confirm dialog's Discard action resets
  // anchors to the loaded baseline and closes; Stay keeps the editor open.
  const requestClose = (next: boolean) => {
    if (!next && isDirty) {
      setConfirmOpen(true);
      return;
    }
    onOpenChange(next);
  };

  const confirmDiscardAndClose = () => {
    setConfirmOpen(false);
    setAnchors(loadedAnchors);
    setActiveIndex(null);
    setFeedback(null);
    onOpenChange(false);
  };

  // --- Save ----------------------------------------------------------------
  const canSave = isDirty && !updateMutation.isPending;

  const handleSave = async () => {
    if (!food || !canSave) return;
    setFeedback(null);
    // Build the updated foodRecipe: only components' anchorY values change.
    // Every other foodRecipe field (station, kind, menuSection, buildHeader,
    // serviceware, steps, expoSteps, allergenNote, yieldText, shelfLife,
    // holdTemp, storeTemp, lineUtensil, equipment, qualityIdentifiers) and
    // every item field (title, subtitle, photo, details, notes, tags,
    // seasonal, recipe) is preserved exactly. anchorY is rounded to 4
    // decimal places to avoid float drift in the Candid round-trip.
    const updatedComponents: FoodComponent[] = components.map((c, i) => ({
      ...c,
      anchorY: Math.round(anchors[i] * 10000) / 10000,
    }));
    const updatedFoodRecipe = { ...food, components: updatedComponents };
    try {
      await updateMutation.mutateAsync({
        itemId: item.id,
        categoryId: item.categoryId,
        title: item.title,
        subtitle: item.subtitle,
        photo: item.photo,
        details: item.details,
        notes: item.notes,
        tags: item.tags,
        seasonal: item.seasonal,
        recipe: item.recipe,
        foodRecipe: updatedFoodRecipe,
      });
      // Success: the saved values become the new baseline so further edits
      // dirty-check against the just-saved positions.
      setLoadedAnchors(anchors.slice());
      setFeedback({
        kind: "success",
        message: "Positions saved. Guests now see the updated label layout.",
      });
      onSaved?.();
    } catch (err) {
      // Failure: keep the editor open with the admin's edits intact so they
      // can retry. The mutation's error is surfaced inline.
      const description = err instanceof Error ? err.message : undefined;
      setFeedback({
        kind: "error",
        message: `Could not save positions. ${description ?? "Please try again."} Your edits are kept — adjust and retry.`,
      });
    }
  };

  // --- Render --------------------------------------------------------------
  // Defensive: the caller gates this component on item.foodRecipe != null,
  // but if a null foodRecipe slips through we render a minimal empty state
  // inside the Dialog so the modal still opens/closes cleanly.
  const hasFood = food != null && componentCount > 0;

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          // Route close attempts through the dirty-guard.
          if (!next) {
            requestClose(false);
            return;
          }
          onOpenChange(next);
        }}
      >
        <DialogContent
          className="max-w-[min(960px,94vw)] max-h-[92vh] overflow-hidden border-border bg-card p-0 gap-0"
          data-ocid="library.admin.anchor_editor.dialog"
          onInteractOutside={(e) => {
            // Block outside-click close while dragging so a stray pointer
            // does not dismiss the editor mid-edit. Dirty-close is still
            // guarded by requestClose above.
            if (dragging) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            // Escape during a drag cancels the drag, not the dialog.
            if (dragging) {
              e.preventDefault();
              setDragging(false);
              dragSession.current = null;
              return;
            }
            // Escape with unsaved changes → confirm before closing.
            if (isDirty) {
              e.preventDefault();
              setConfirmOpen(true);
            }
          }}
        >
          <DialogTitle className="sr-only">
            Edit Build Card label positions — {item.title}
          </DialogTitle>

          {/* Editor header — navy admin chrome, distinct from the Bubba's
              blue title band of the card underneath. */}
          <div
            className="anchor-editor-header"
            data-ocid="library.admin.anchor_editor.header"
          >
            <div className="flex min-w-0 flex-col gap-0.5">
              <h2
                className="anchor-editor-title"
                data-ocid="library.admin.anchor_editor.title"
              >
                Edit label positions
              </h2>
              <span
                className="anchor-editor-subtitle truncate"
                data-ocid="library.admin.anchor_editor.subtitle"
              >
                {item.title}
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => requestClose(false)}
              disabled={updateMutation.isPending}
              aria-label="Close anchor editor"
              data-ocid="library.admin.anchor_editor.close_button"
              className="shrink-0 text-foreground hover:bg-foreground/10"
            >
              <X className="size-4" aria-hidden />
            </Button>
          </div>

          {/* Editor body — the Build Card preview + handle overlay. The
              stage reuses the published build-card-* classes for the
              kicker / title band / footer so the admin sees the real card,
              and the anchor-editor-* classes for the draggable handle
              layer that overlays the labels column. */}
          <div
            className="overflow-y-auto"
            data-ocid="library.admin.anchor_editor.body"
          >
            {hasFood ? (
              <div
                className="food-recipe-card mt-0 flex flex-col"
                data-ocid="library.admin.anchor_editor.preview_card"
              >
                {/* Kicker — fixed Bubba's red, same as published. */}
                <div
                  className="build-card-kicker"
                  data-ocid="library.admin.anchor_editor.kicker"
                >
                  {kicker}
                </div>
                {/* Title band — fixed Bubba's blue, same as published. */}
                <div
                  className="build-card-title-band"
                  data-ocid="library.admin.anchor_editor.title_band"
                >
                  <h3
                    className="build-card-title"
                    data-ocid="library.admin.anchor_editor.card_title"
                  >
                    {item.title}
                  </h3>
                </div>

                {/* Stage — photo left ~46%, draggable handles right ~54%.
                    The handle layer mirrors .build-card-labels geometry so
                    handles sit exactly where the published labels render.
                    Photo tap-to-zoom is intentionally disabled here (the
                    photo is a plain <img>, no button) so it never
                    interferes with drag interactions. */}
                <div
                  className="anchor-editor-stage"
                  data-ocid="library.admin.anchor_editor.stage"
                >
                  <div
                    className="anchor-editor-photo-col"
                    data-ocid="library.admin.anchor_editor.photo_col"
                  >
                    <img
                      className="anchor-editor-photo"
                      src={photo}
                      alt={item.title}
                      draggable={false}
                      data-ocid="library.admin.anchor_editor.photo"
                    />
                  </div>
                  <div
                    ref={labelsRef}
                    className="anchor-editor-labels"
                    // biome-ignore lint/a11y/noNoninteractiveTabindex: labels container needs focus for keyboard nudging (ArrowUp/Down/Escape); a non-interactive div is the only element that can host the drag-stage focus ring
                    // biome-ignore lint/a11y/useSemanticElements: handle group needs div + role=group for absolute-positioned overlay layout; fieldset styling would break the draggable handle layer
                    tabIndex={0}
                    role="group"
                    aria-label="Draggable label handles. Use arrow keys to nudge the selected handle."
                    onKeyDown={handleKeyDown}
                    data-ocid="library.admin.anchor_editor.labels"
                  >
                    {components.map((c, i) => {
                      const isActive = activeIndex === i;
                      const isDimmed =
                        dragging && activeIndex !== null && !isActive;
                      const y = anchors[i] ?? 0.5;
                      const pct = Math.round(y * 100);
                      return (
                        // biome-ignore lint/a11y/useKeyWithClickEvents: handle has role=slider with tabIndex=-1; keyboard nudging is handled by the parent labels container's onKeyDown (ArrowUp/Down/Escape)
                        <div
                          // biome-ignore lint/suspicious/noArrayIndexKey: ordered component list with no stable id; duplicate component strings can collide, index is the stable key
                          key={`ah-${i}`}
                          className={cn(
                            "anchor-handle",
                            isActive && "is-active",
                            isDimmed && "is-dimmed",
                          )}
                          style={{ top: `${y * 100}%` }}
                          onPointerDown={(e) => handlePointerDown(i, e)}
                          onClick={() => {
                            // A simple tap/click selects the handle for
                            // keyboard nudging without starting a drag.
                            if (!dragging) setActiveIndex(i);
                          }}
                          role="slider"
                          tabIndex={-1}
                          aria-label={`Label ${i + 1}: ${c.item} — ${c.amount}. Vertical position ${pct} percent.`}
                          aria-valuenow={pct}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-selected={isActive}
                          data-ocid={`library.admin.anchor_editor.handle.${i + 1}`}
                        >
                          <span
                            className="anchor-handle-grip"
                            aria-hidden
                            data-ocid={`library.admin.anchor_editor.handle.${i + 1}.grip`}
                          >
                            <span />
                          </span>
                          <span
                            className="anchor-handle-text"
                            data-ocid={`library.admin.anchor_editor.handle.${i + 1}.text`}
                          >
                            <strong>
                              {c.item} — {c.amount}
                            </strong>
                            {c.note != null && c.note.trim().length > 0
                              ? ` (${c.note})`
                              : ""}
                          </span>
                          <span
                            className="anchor-readout"
                            data-ocid={`library.admin.anchor_editor.handle.${i + 1}.readout`}
                          >
                            {pct}%
                          </span>
                          {/* Per-handle reset — restores this single label to
                              its even-distribution default. */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="ml-1 size-7 shrink-0 text-muted-foreground hover:text-foreground"
                            onPointerDown={(e) => {
                              // Stop propagation so the reset tap does not
                              // start a drag on the parent handle.
                              e.stopPropagation();
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              resetHandleToEven(i);
                            }}
                            disabled={updateMutation.isPending}
                            aria-label={`Reset label ${i + 1} to even spacing`}
                            data-ocid={`library.admin.anchor_editor.handle.${i + 1}.reset_button`}
                          >
                            <RotateCcw className="size-3.5" aria-hidden />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer — confidential + station, same as published. */}
                <div
                  className="build-card-footer"
                  data-ocid="library.admin.anchor_editor.footer"
                >
                  <span
                    className="build-card-footer-confidential"
                    data-ocid="library.admin.anchor_editor.footer_confidential"
                  >
                    CONFIDENTIAL AND PROPRIETARY &copy; Bubba&apos;s 33
                  </span>
                  {food && food.station.trim().length > 0 ? (
                    <span
                      className="build-card-footer-station"
                      data-ocid="library.admin.anchor_editor.footer_station"
                    >
                      {food.station}
                    </span>
                  ) : null}
                </div>
              </div>
            ) : (
              <div
                className="flex items-center justify-center gap-2 px-4 py-10 text-center font-body text-sm text-muted-foreground"
                data-ocid="library.admin.anchor_editor.empty_state"
              >
                <AlertTriangle className="size-4 text-primary" aria-hidden />
                This item has no Build Card components to position.
              </div>
            )}
          </div>

          {/* Feedback banner — success (green) or error (red). Auto-clears
              on the next edit / drag / reset; stays until then so the admin
              can read it. */}
          {feedback ? (
            <div
              className={cn(
                "anchor-editor-feedback mx-3 mt-3",
                feedback.kind === "success" ? "is-success" : "is-error",
              )}
              role={feedback.kind === "error" ? "alert" : "status"}
              data-ocid="library.admin.anchor_editor.feedback"
            >
              <span className="anchor-editor-feedback-label">
                {feedback.kind === "success" ? "Saved" : "Error"}
              </span>
              <span className="min-w-0 flex-1">{feedback.message}</span>
            </div>
          ) : null}

          {/* Actions row — Reset (navy), Cancel (ghost), Save (red). Save
              is disabled (with a tooltip) until at least one anchorY differs
              from its loaded value. */}
          <div
            className="anchor-editor-actions"
            data-ocid="library.admin.anchor_editor.actions"
          >
            <Button
              type="button"
              variant="secondary"
              onClick={resetAllToEven}
              disabled={updateMutation.isPending || !hasFood}
              className="mr-auto"
              data-ocid="library.admin.anchor_editor.reset_all_button"
            >
              <RotateCcw className="size-4" aria-hidden />
              Reset to even spacing
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => requestClose(false)}
              disabled={updateMutation.isPending}
              data-ocid="library.admin.anchor_editor.cancel_button"
            >
              Cancel
            </Button>
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  {/* shadcn Tooltip requires a single child that can hold
                      a ref; wrapping the Button in a span keeps the tooltip
                      working even when the button is disabled. */}
                  <span>
                    <Button
                      type="button"
                      onClick={handleSave}
                      disabled={
                        !canSave || updateMutation.isPending || !hasFood
                      }
                      data-ocid="library.admin.anchor_editor.save_button"
                    >
                      {updateMutation.isPending ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                      ) : (
                        <Save className="size-4" aria-hidden />
                      )}
                      Save positions
                    </Button>
                  </span>
                </TooltipTrigger>
                {!canSave ? (
                  <TooltipContent
                    side="top"
                    data-ocid="library.admin.anchor_editor.save_button.tooltip"
                  >
                    {updateMutation.isPending
                      ? "Saving…"
                      : "Drag a label to change its position before saving."}
                  </TooltipContent>
                ) : null}
              </Tooltip>
            </TooltipProvider>
          </div>
        </DialogContent>
      </Dialog>

      {/* Unsaved-changes confirm dialog — amber surface, distinct from the
          main editor. Shown when the admin tries to close the editor with
          pending changes. Discard resets to the loaded baseline and closes;
          Stay keeps the editor open with edits intact. */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent
          className="max-w-[min(420px,92vw)]"
          data-ocid="library.admin.anchor_editor.confirm"
        >
          <AlertDialogHeader>
            <AlertDialogTitle
              className="anchor-confirm-title"
              data-ocid="library.admin.anchor_editor.confirm.title"
            >
              Discard unsaved position changes?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <p
                className="anchor-confirm-body"
                data-ocid="library.admin.anchor_editor.confirm.body"
              >
                You have moved one or more labels but have not saved. Discarding
                resets every label to its last saved position. Stay keeps your
                edits so you can review and save.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div
            className="anchor-confirm mt-2"
            data-ocid="library.admin.anchor_editor.confirm.warning"
          >
            <p className="anchor-confirm-body">
              <AlertTriangle
                className="mr-1 inline size-3.5 align-text-bottom"
                aria-hidden
              />
              Unsaved changes will be lost if you discard.
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="library.admin.anchor_editor.confirm.stay_button">
              Stay
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDiscardAndClose}
              className="bg-primary text-primary-foreground hover:bg-primary-hover"
              data-ocid="library.admin.anchor_editor.confirm.discard_button"
            >
              Discard changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default AnchorEditorDialog;
