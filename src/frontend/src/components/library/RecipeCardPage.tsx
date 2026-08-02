import { QueryErrorState } from "@/components/QueryErrorState";
import { FoodRecipeCard } from "@/components/library/FoodRecipeCard";
import { SeasonalBadge } from "@/components/library/SeasonalBadge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCategory, useItem } from "@/hooks/useLibrary";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import type {
  LibraryItem,
  Recipe,
  RecipeSpec,
  RecipeVariant,
} from "@/types/foundation";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Star } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";

/**
 * Recipe card detail page — the full item view.
 *
 * Rendered by the /position/$id/library/$categoryId/item/$itemId route. Uses
 * useItem(itemId) to fetch the item and renders it in the patriotic roadhouse
 * treatment that already dresses the sibling priorities detail screens
 * (CategoryDetailPage + ItemListItem): dark theme, red/blue/gold accents,
 * Anton + Pacifico brand fonts, a tone top-stripe card, and a tri-stripe +
 * flag-bar header.
 *
 * The category's tone (red / blue / gold) is derived from the category name
 * using the same toneForCategoryName() convention as CategoryDetailPage
 * (Service → red, Food → blue, Community → gold). The Service Priorities page
 * (item 243) therefore renders in the red tone.
 *
 * The page preserves every data-binding path of the previous flat-list
 * implementation: recipe vs. bulk-mix vs. plain item, photo hero vs.
 * two-column, recap audio, seasonal badge, tags, notes, and labeled detail
 * fields. Only the chrome is restyled — the route file is unchanged and the
 * "Back to category" navigation is kept intact.
 */

/* Category name → tone mapping. Mirrors CategoryDetailPage so the item
   detail screen's tone matches the category list the user came from. */
const SERVICE_PRIORITIES_NAME = "Service Priorities";
const FOOD_PRIORITIES_NAME = "Food Priorities";
const MARKETING_PRIORITIES_NAME = "Marketing / Community Priorities";

type PriorityTone = "red" | "blue" | "gold";

/**
 * Derives the patriotic tone for a category from its name. Service
 * Priorities → red, Food Priorities → blue, Community Priorities → gold.
 * Mirrors CategoryDetailPage.toneForCategoryName exactly so the item
 * detail screen's tone matches the category list the user tapped through
 * from. Defaults to red when the name does not match.
 */
function toneForCategoryName(name: string): PriorityTone {
  const key = name.trim().toLowerCase();
  if (key === SERVICE_PRIORITIES_NAME.trim().toLowerCase()) return "red";
  if (key === FOOD_PRIORITIES_NAME.trim().toLowerCase()) return "blue";
  if (key === MARKETING_PRIORITIES_NAME.trim().toLowerCase()) return "gold";
  if (key.includes("community")) return "gold";
  return "red";
}

export function RecipeCardPage({
  positionId,
  categoryId,
  itemId,
}: {
  positionId: string;
  categoryId: string;
  itemId: string;
}): ReactElement {
  const itemQuery = useItem(itemId);
  const categoryQuery = useCategory(categoryId);
  const item = itemQuery.data ?? null;
  const categoryName = categoryQuery.data?.name ?? "";
  const isLoading = itemQuery.isLoading;
  const isError = itemQuery.isError;
  // Only treat as "not found" when the read succeeded and returned null — a
  // transient fetch error must surface as a retryable error state, not a
  // terminal "this item doesn't exist" message.
  const notFound = !isLoading && !isError && !item;

  // Tone follows the category the user tapped through from, defaulting to
  // red so a still-loading category never flashes the wrong tone.
  const tone: PriorityTone = categoryName
    ? toneForCategoryName(categoryName)
    : "red";

  return (
    <div
      className="orientation-detail-page mx-auto w-full max-w-3xl px-4 py-6"
      data-ocid="library.item.detail.page"
    >
      <BackToCategory positionId={positionId} categoryId={categoryId} />

      {isLoading ? (
        <RecipeCardSkeleton />
      ) : isError ? (
        <QueryErrorState
          title="Couldn't load this item"
          description="We couldn't load this recipe right now. Please try again."
          error={itemQuery.error}
          onRetry={() => itemQuery.refetch()}
        />
      ) : notFound ? (
        <ItemNotFound positionId={positionId} categoryId={categoryId} />
      ) : item!.foodRecipe ? (
        <FoodRecipeCard item={item!} />
      ) : (
        <div className="mt-4" data-ocid="library.item.detail.body">
          <PatrioticItemHeader
            title={item!.title}
            subtitle={item!.subtitle}
            tone={tone}
            seasonal={item!.seasonal}
            photo={item!.photo}
          />

          {item!.recipe ? (
            isBulkMix(item!.recipe) ? (
              <BulkMixRecipeCard item={item!} tone={tone} />
            ) : (
              <PrintRecipeCard item={item!} tone={tone} />
            )
          ) : (
            <RecipeCard item={item!} tone={tone} />
          )}
        </div>
      )}
    </div>
  );
}

/* --------------------------- Patriotic header --------------------------- */

/**
 * Patriotic item header — tri-stripe top edge, Pacifico script flourish,
 * Anton item-title headline, flag-bar underline. Mirrors
 * CategoryDetailPage.PatrioticHeader so the item detail screen reads as
 * the same surface as the category list the user came from. The optional
 * SeasonalBadge rides the headline row so it stays visible without
 * fighting the title.
 */
function PatrioticItemHeader({
  title,
  subtitle,
  tone,
  seasonal,
  photo,
}: {
  title: string;
  subtitle: string | null;
  tone: PriorityTone;
  seasonal: boolean;
  photo: string | null;
}): ReactElement {
  return (
    <header
      className="orientation-detail-header"
      data-ocid="library.item.header"
    >
      {/* Optional photo banner above the tri-stripe — mirrors the
          category cover photo treatment. */}
      {photo ? (
        <div
          className="orientation-detail-cover"
          style={{ maxHeight: "16rem" }}
          data-ocid="library.item.header_photo"
        >
          <img
            src={photo}
            alt={title}
            className="h-48 w-full object-cover sm:h-64"
            loading="lazy"
          />
        </div>
      ) : null}

      <div
        className="orientation-detail-tri-stripe"
        aria-hidden
        data-ocid="library.item.tri_stripe"
      >
        <span />
        <span />
        <span />
      </div>

      <div className="px-5 py-6 sm:px-7 sm:py-8">
        <p
          className="orientation-detail-flourish text-xl sm:text-2xl"
          data-ocid="library.item.flourish"
        >
          {tone === "red"
            ? "Service"
            : tone === "blue"
              ? "Food"
              : tone === "gold"
                ? "Community"
                : "Priority"}
        </p>

        <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
          <h1
            className="orientation-detail-headline text-3xl sm:text-5xl"
            data-ocid="library.item.title"
          >
            {title}
          </h1>
          {seasonal ? (
            <SeasonalBadge
              className="shrink-0"
              // keep a header-scoped marker for deterministic coverage
            />
          ) : null}
        </div>

        {subtitle && subtitle.trim().length > 0 ? (
          <p
            className="mt-3 font-body text-base sm:text-lg text-muted-foreground"
            data-ocid="library.item.subtitle"
          >
            {subtitle}
          </p>
        ) : null}

        <div
          className="orientation-detail-flag-bar mt-4"
          aria-hidden
          data-ocid="library.item.flag_bar"
        >
          <span />
          <span />
          <span />
        </div>
      </div>
    </header>
  );
}

/* --------------------------- Print recipe card -------------------------- */

/**
 * Patriotic recipe card — the recipe payload rendered inside a tone
 * top-stripe card (.orientation-detail-item-card .is-red/.is-blue/.is-gold).
 * Reuses the existing patriotic roadhouse classes; section headings render
 * in the tone color via the .orientation-detail-item-card.is-* scope so
 * the card reads as the same surface as the numbered priority rows.
 *
 * Structure: tone-stripe card → optional recap audio pill → two-column
 * body (content left, framed photo right; photo stacks on top on mobile,
 * or dominates as a hero when the recipe has little/no text). Section
 * headers (Glassware, Specs, Assembly, Garnish, Notes) render in the
 * category tone.
 */
function PrintRecipeCard({
  item,
  tone,
}: {
  item: NonNullable<ReturnType<typeof useItem>["data"]>;
  tone: PriorityTone;
}): ReactElement {
  const recipe = item.recipe as Recipe;

  return (
    <article
      className={`orientation-detail-item-card mt-4 flex-col ${
        tone === "red" ? "is-red" : tone === "blue" ? "is-blue" : "is-gold"
      }`}
      data-ocid="library.item.print_card"
    >
      <div
        className="flex w-full flex-col gap-6 px-5 py-6 sm:px-7 sm:py-8"
        style={{ paddingTop: "calc(1.5rem + 6px)" }}
        data-ocid="library.item.print_body"
      >
        {/* Recap audio button — screen-only, shown only when the recipe
            carries a non-empty recapAudio clip. */}
        <RecapAudioButton
          recapAudio={recipe.recapAudio}
          className="self-start"
        />

        {/* Photo placement: when the recipe has little or no text content,
            the photo dominates as a large centered hero. When there is
            substantial recipe text, keep the two-column layout (content
            left, framed photo right). */}
        {item.photo && !hasSubstantialRecipeText(recipe) ? (
          <div data-ocid="library.item.print_photo_hero">
            <img
              src={item.photo}
              alt={item.title}
              className="mx-auto block h-auto w-full rounded-md border border-border object-contain"
              style={{ maxWidth: "640px" }}
              loading="lazy"
            />
          </div>
        ) : (
          <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:gap-10">
            {/* Photo — stacks on top on mobile, right column on desktop.
                Omitted entirely when there is no photo. */}
            {item.photo ? (
              <div
                className="order-1 sm:order-2 sm:w-[320px] sm:shrink-0"
                data-ocid="library.item.print_photo"
              >
                <img
                  src={item.photo}
                  alt={item.title}
                  className="block h-auto w-full rounded-md border border-border object-contain"
                  loading="lazy"
                />
              </div>
            ) : null}

            {/* Content — spans full width when there is no photo */}
            <div
              className="order-2 min-w-0 sm:order-1 sm:flex-1"
              data-ocid="library.item.print_content"
            >
              <RecipeContent recipe={recipe} />
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

/* --------------------------- Recap audio button ------------------------- */

/**
 * RecapAudioButton — a small, screen-only "Play recap" / "Stop" toggle that
 * plays the recipe's optional recap audio clip via a dedicated local
 * HTMLAudioElement.
 *
 * Rendered ONLY when `recapAudio` is a non-empty string. When the clip is
 * null/absent/empty, this component renders nothing — no disabled button, no
 * placeholder.
 *
 * Mirrors the LegendaryBanner recap-audio pattern (DrinksBuilderActivity):
 * a useRef<HTMLAudioElement | null>(null) lazily created via `new Audio()`
 * with preload='auto', 'ended' and 'error' events wired to
 * setPlaying(false), play() wrapped in a best-effort .catch (user click, so
 * no autoplay-policy issue), stop+reset discipline before setting src, and
 * cleanup on unmount so the clip never keeps playing after leaving the card.
 */
function RecapAudioButton({
  recapAudio,
  className,
}: {
  recapAudio: string | null;
  className?: string;
}): ReactElement | null {
  // No clip → render nothing. No disabled button, no placeholder.
  if (typeof recapAudio !== "string" || recapAudio.length === 0) {
    return null;
  }

  return (
    <RecapAudioButtonInner recapAudio={recapAudio} className={className} />
  );
}

/**
 * Inner implementation — always has a non-empty recapAudio string. Split from
 * RecapAudioButton so the hooks run unconditionally (Rules of Hooks) and the
 * null-guard lives in the parent.
 */
function RecapAudioButtonInner({
  recapAudio,
  className,
}: {
  recapAudio: string;
  className?: string;
}): ReactElement {
  const [playing, setPlaying] = useState(false);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  // Cleanup on unmount: stop + release the audio element so the clip never
  // keeps playing after leaving the card (route change or unmount).
  useEffect(() => {
    return () => {
      const el = audioElRef.current;
      if (el) {
        try {
          el.pause();
          el.currentTime = 0;
          el.removeAttribute("src");
          el.load();
        } catch {
          // ignore — best-effort reset
        }
      }
      audioElRef.current = null;
    };
  }, []);

  // Wire 'ended' and 'error' events to flip playing back to false so the
  // toggle state never gets stuck on "Stop" after the clip ends or fails.
  useEffect(() => {
    const el = audioElRef.current;
    if (!el) return;
    const handleEnded = () => {
      setPlaying(false);
      try {
        el.pause();
        el.currentTime = 0;
        el.removeAttribute("src");
        el.load();
      } catch {
        // ignore — best-effort reset
      }
    };
    const handleError = () => {
      setPlaying(false);
      try {
        el.pause();
        el.currentTime = 0;
        el.removeAttribute("src");
        el.load();
      } catch {
        // ignore — best-effort reset
      }
    };
    el.addEventListener("ended", handleEnded);
    el.addEventListener("error", handleError);
    return () => {
      el.removeEventListener("ended", handleEnded);
      el.removeEventListener("error", handleError);
    };
  }, []);

  const handleToggle = () => {
    if (playing) {
      // Stop and reset to idle.
      const el = audioElRef.current;
      if (el) {
        try {
          el.pause();
          el.currentTime = 0;
          el.removeAttribute("src");
          el.load();
        } catch {
          // ignore — best-effort reset
        }
      }
      setPlaying(false);
      return;
    }
    // Start playback. Lazily create the local audio element on first play
    // (user gesture, so no autoplay-policy issue).
    let el = audioElRef.current;
    if (!el) {
      try {
        el = new Audio();
        el.preload = "auto";
        audioElRef.current = el;
      } catch {
        // Could not create an audio element — never trap the user.
        setPlaying(false);
        return;
      }
    }
    const audioEl = el;
    // Stop + reset before setting src so a re-trigger never overlaps a
    // previous clip.
    try {
      audioEl.pause();
      audioEl.currentTime = 0;
      audioEl.removeAttribute("src");
      audioEl.load();
    } catch {
      // ignore — best-effort reset
    }
    audioEl.src = recapAudio;
    // Mark playing now so the label flips to "Stop"; the ended/error/reject
    // handlers below will flip it back if playback can't proceed.
    setPlaying(true);
    // Best-effort play — user click, so no autoplay-policy issue, but a
    // rejection (e.g. corrupt clip) still reveals idle so the user is
    // never trapped on "Stop".
    audioEl.play().catch(() => {
      try {
        audioEl.pause();
        audioEl.currentTime = 0;
        audioEl.removeAttribute("src");
        audioEl.load();
      } catch {
        // ignore — best-effort reset
      }
      setPlaying(false);
    });
  };

  const label = playing ? "⏸ Stop" : "▶ Play recap";
  const ariaLabel = playing ? "Stop recipe recap" : "Play recipe recap";

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={ariaLabel}
      aria-pressed={playing}
      data-ocid="library.item.print_recap_button"
      className={`inline-flex items-center gap-1.5 rounded-full border border-patriotic-blue/40 bg-patriotic-blue/5 px-3 py-1 font-body text-xs font-medium leading-none text-patriotic-blue transition-smooth hover:bg-patriotic-blue/10 hover:border-patriotic-blue/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-patriotic-blue/50 focus-visible:ring-offset-1 focus-visible:ring-offset-background print:hidden ${className ?? ""}`}
    >
      {label}
    </button>
  );
}

/* --------------------------- Bulk mix recipe card ----------------------- */

/**
 * Detects whether a non-recipe Library item carries enough text content to
 * justify the side-by-side text/photo two-column layout. "Substantial text"
 * means: more than one short detail field, OR any detail field with
 * paragraph-length content (>80 chars), OR non-empty notes. When none of
 * these hold the item is photo-dominant and the photo should render as a
 * large centered hero instead of being pinned to a narrow right column.
 */
function hasSubstantialItemText(item: LibraryItem): boolean {
  if (item.notes && item.notes.trim().length > 0) return true;
  if (item.details.length >= 2) return true;
  if (item.details.some((field) => field.value.trim().length > 80)) {
    return true;
  }
  return false;
}

/**
 * Detects whether a recipe carries enough text content to justify the
 * side-by-side text/photo two-column layout. "Substantial text" means the
 * recipe has any of: glassware, specs, assembly steps, garnish, or at least
 * one non-blank variant. When none of these are present the item is
 * photo-dominant and the photo should render as a large centered hero
 * instead of being pinned to a narrow right column.
 */
function hasSubstantialRecipeText(recipe: Recipe): boolean {
  if (recipe.glassware.trim().length > 0) return true;
  if (recipe.specs.length > 0) return true;
  if (recipe.assembly.length > 0) return true;
  if (recipe.garnish.length > 0) return true;
  if (recipe.variants.some((v) => v.variantLabel.trim().length > 0)) {
    return true;
  }
  return false;
}

/**
 * Detects whether a recipe should render as a Bulk Mix card. A real drink
 * always has a glass; a bulk mix never does. So the discriminator requires
 * the ABSENCE of glassware together with bulk-mix metadata (a non-empty
 * `yield` OR a non-empty `equipment` array). A drink that happens to carry
 * an equipment note still renders as a drink card. Kept in sync with
 * BulkImportDialog's validator.
 */
function isBulkMix(recipe: Recipe): boolean {
  const hasGlassware = recipe.glassware.trim().length > 0;
  if (hasGlassware) return false;
  const hasYield = recipe.yield != null && recipe.yield.trim().length > 0;
  const hasEquipment = recipe.equipment.length > 0;
  return hasYield || hasEquipment;
}

/**
 * Bulk Mix recipe card — patriotic roadhouse treatment. Renders the bulk-mix
 * payload inside a tone top-stripe card (.orientation-detail-item-card
 * .is-*), mirroring the drink card's chrome. Layout differs from the drink
 * card: NO photo, NO glassware, NO garnish, NO variants. Instead: two-column
 * top row (Equipment | Bulk Mix + Shelf Life stacked) → full-width Specs,
 * Assembly, optional Quality Identifier.
 */
function BulkMixRecipeCard({
  item,
  tone,
}: {
  item: NonNullable<ReturnType<typeof useItem>["data"]>;
  tone: PriorityTone;
}): ReactElement {
  const recipe = item.recipe as Recipe;

  return (
    <article
      className={`orientation-detail-item-card mt-4 flex-col ${
        tone === "red" ? "is-red" : tone === "blue" ? "is-blue" : "is-gold"
      }`}
      data-ocid="library.item.bulk_mix_card"
    >
      <div
        className="flex w-full flex-col px-5 py-6 sm:px-7 sm:py-8"
        style={{ paddingTop: "calc(1.5rem + 6px)" }}
        data-ocid="library.item.bulk_mix_body"
      >
        {/* Top row: two columns on desktop (Equipment | Bulk Mix + Shelf
            Life), stacks to one column on mobile in order: Equipment, Bulk
            Mix, Shelf Life. */}
        <div
          className="grid grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-10"
          data-ocid="library.item.bulk_mix_top_row"
        >
          {/* Left column — Equipment */}
          {recipe.equipment.length > 0 ? (
            <section data-ocid="library.item.bulk_mix_equipment">
              <h2 className="recipe-section-heading">Equipment</h2>
              <ul className="recipe-square-bullet mt-2 pl-5">
                {recipe.equipment.map((tool, i) => (
                  <li
                    key={`eq-${tool}`}
                    className="leading-relaxed"
                    data-ocid={`library.item.bulk_mix_equipment_item.${i + 1}`}
                  >
                    {tool}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* Right column — Bulk Mix + Shelf Life stacked */}
          <div
            className="flex flex-col gap-6"
            data-ocid="library.item.bulk_mix_meta"
          >
            {recipe.yield != null && recipe.yield.trim().length > 0 ? (
              <section data-ocid="library.item.bulk_mix_yield">
                <h2 className="recipe-section-heading">Bulk Mix</h2>
                <ul className="recipe-square-bullet mt-2 pl-5">
                  <li
                    className="leading-relaxed"
                    data-ocid="library.item.bulk_mix_yield_item.1"
                  >
                    {recipe.yield}
                  </li>
                </ul>
              </section>
            ) : null}

            {recipe.shelfLife != null && recipe.shelfLife.trim().length > 0 ? (
              <section data-ocid="library.item.bulk_mix_shelf_life">
                <h2 className="recipe-section-heading">Shelf Life</h2>
                <ul className="recipe-square-bullet mt-2 pl-5">
                  <li
                    className="leading-relaxed"
                    data-ocid="library.item.bulk_mix_shelf_life_item.1"
                  >
                    {recipe.shelfLife}
                  </li>
                </ul>
              </section>
            ) : null}
          </div>
        </div>

        {/* Full-width sections below the top row */}
        <div
          className="mt-8 flex flex-col gap-6"
          data-ocid="library.item.bulk_mix_sections"
        >
          {/* Specs */}
          {recipe.specs.length > 0 ? (
            <section data-ocid="library.item.bulk_mix_specs">
              <h2 className="recipe-section-heading">Specs</h2>
              <ul className="recipe-square-bullet mt-2 pl-5">
                {recipe.specs.map((spec, i) => (
                  <SpecsRow
                    key={`bmspec-${spec.amount}-${spec.ingredient}`}
                    spec={spec}
                    index={i}
                  />
                ))}
              </ul>
            </section>
          ) : null}

          {/* Assembly — bulleted steps, with bold-prefix nicety */}
          {recipe.assembly.length > 0 ? (
            <section data-ocid="library.item.bulk_mix_assembly">
              <h2 className="recipe-section-heading">Assembly</h2>
              <ul className="recipe-square-bullet mt-2 pl-5">
                {recipe.assembly.map((step, i) => (
                  <BulkMixAssemblyStep
                    key={`bmasm-${step}`}
                    step={step}
                    index={i}
                  />
                ))}
              </ul>
            </section>
          ) : null}

          {/* Quality Identifier — only if non-empty */}
          {recipe.qualityIdentifier.length > 0 ? (
            <section data-ocid="library.item.bulk_mix_quality">
              <h2 className="recipe-section-heading">Quality Identifier</h2>
              <ul className="recipe-square-bullet mt-2 pl-5">
                {recipe.qualityIdentifier.map((qi, i) => (
                  <li
                    key={`qi-${qi}`}
                    className="leading-relaxed"
                    data-ocid={`library.item.bulk_mix_quality_item.${i + 1}`}
                  >
                    {qi}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>
    </article>
  );
}

/**
 * A single bulk-mix assembly step. Steps that begin with a storage/labeling
 * directive ("Cover, label", "Label, date", "Store at") render that prefix in
 * bold, matching the print sheets. The remainder of the step renders
 * normally.
 */
function BulkMixAssemblyStep({
  step,
  index,
}: {
  step: string;
  index: number;
}): ReactElement {
  const boldPrefixes = ["Cover, label", "Label, date", "Store at"];
  const matched = boldPrefixes.find((p) => step.startsWith(p));

  return (
    <li
      className="leading-relaxed"
      data-ocid={`library.item.bulk_mix_assembly_step.${index + 1}`}
    >
      {matched ? (
        <>
          <strong>{matched}</strong>
          {step.slice(matched.length)}
        </>
      ) : (
        step
      )}
    </li>
  );
}

/** Renders the recipe content sections (Glassware, Specs, Assembly,
 *  Garnish, then each variant). Shared between the base recipe and
 *  per-variant blocks so the styling stays consistent. */
function RecipeContent({ recipe }: { recipe: Recipe }): ReactElement {
  return (
    <div className="flex flex-col gap-6">
      {/* Glassware */}
      {recipe.glassware.trim().length > 0 ? (
        <section data-ocid="library.item.print_glassware">
          <h2 className="recipe-section-heading">Glassware</h2>
          <p className="mt-2 font-body leading-relaxed text-foreground">
            {recipe.glassware}
          </p>
        </section>
      ) : null}

      {/* Specs */}
      {recipe.specs.length > 0 ? (
        <section data-ocid="library.item.print_specs">
          <h2 className="recipe-section-heading">Specs</h2>
          <ul className="recipe-square-bullet mt-2 pl-5">
            {recipe.specs.map((spec, i) => (
              <SpecsRow
                key={`spec-${i}-${spec.amount}-${spec.ingredient}`}
                spec={spec}
                index={i}
              />
            ))}
          </ul>
        </section>
      ) : null}

      {/* Assembly */}
      {recipe.assembly.length > 0 ? (
        <section data-ocid="library.item.print_assembly">
          <h2 className="recipe-section-heading">Assembly</h2>
          <ul className="recipe-square-bullet mt-2 pl-5">
            {recipe.assembly.map((step, i) => (
              <li
                key={`asm-${i}-${step}`}
                className="leading-relaxed"
                data-ocid={`library.item.print_assembly_step.${i + 1}`}
              >
                {step}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Garnish — only if non-empty */}
      {recipe.garnish.length > 0 ? (
        <section data-ocid="library.item.print_garnish">
          <h2 className="recipe-section-heading">Garnish</h2>
          <ul className="recipe-square-bullet mt-2 pl-5">
            {recipe.garnish.map((g, i) => (
              <li
                key={`gar-${i}-${g}`}
                className="leading-relaxed"
                data-ocid={`library.item.print_garnish_step.${i + 1}`}
              >
                {g}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Variants — each gets its own divider + Specs/Assembly. Blank/empty
          variantLabel variants are skipped so an empty heading is never
          rendered. */}
      {recipe.variants.map((variant, i) =>
        variant.variantLabel.trim().length > 0 ? (
          <VariantBlock
            key={`var-${i}-${variant.variantLabel}`}
            variant={variant}
            index={i}
          />
        ) : null,
      )}
    </div>
  );
}

/** A single specs row: amount on the left (nowrap, one line), ingredient
 *  right-aligned to the column's right edge. Long ingredients wrap under
 *  the amount without breaking the two-column alignment. */
function SpecsRow({
  spec,
  index,
}: { spec: RecipeSpec; index: number }): ReactElement {
  return (
    <li
      className="recipe-specs-row"
      data-ocid={`library.item.print_spec.${index + 1}`}
    >
      <span className="amount whitespace-nowrap pr-3 font-body">
        {spec.amount}
      </span>
      <span className="ingredient font-body">{spec.ingredient}</span>
    </li>
  );
}

/** A variant block: divider (label uppercased) followed by that variant's
 *  Specs and Assembly sections. */
function VariantBlock({
  variant,
  index,
}: {
  variant: RecipeVariant;
  index: number;
}): ReactElement {
  return (
    <section data-ocid={`library.item.print_variant.${index + 1}`}>
      <h3
        className="recipe-variant-divider text-xl"
        data-ocid={`library.item.print_variant_label.${index + 1}`}
      >
        {variant.variantLabel.toUpperCase()}
      </h3>

      {/* Variant Specs */}
      {variant.specs.length > 0 ? (
        <div
          className="mt-3"
          data-ocid={`library.item.print_variant_specs.${index + 1}`}
        >
          <h4 className="recipe-section-heading">Specs</h4>
          <ul className="recipe-square-bullet mt-2 pl-5">
            {variant.specs.map((spec, i) => (
              <SpecsRow
                key={`vspec-${variant.variantLabel}-${spec.amount}-${spec.ingredient}`}
                spec={spec}
                index={i}
              />
            ))}
          </ul>
        </div>
      ) : null}

      {/* Variant Assembly */}
      {variant.assembly.length > 0 ? (
        <div
          className="mt-3"
          data-ocid={`library.item.print_variant_assembly.${index + 1}`}
        >
          <h4 className="recipe-section-heading">Assembly</h4>
          <ul className="recipe-square-bullet mt-2 pl-5">
            {variant.assembly.map((step, i) => (
              <li
                key={`vasm-${variant.variantLabel}-${step}`}
                className="leading-relaxed"
                data-ocid={`library.item.print_variant_assembly_step.${index + 1}.${i + 1}`}
              >
                {step}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

/* ------------------------------ Recipe card ------------------------------ */

/**
 * Plain (non-recipe) item card — patriotic roadhouse treatment. Renders the
 * item's labeled detail fields, notes, and tags inside a tone top-stripe
 * card (.orientation-detail-item-card .is-*). Photo placement mirrors the
 * previous implementation: hero when the item is photo-dominant, otherwise
 * a two-column text/photo layout.
 */
function RecipeCard({
  item,
  tone,
}: {
  item: NonNullable<ReturnType<typeof useItem>["data"]>;
  tone: PriorityTone;
}): ReactElement {
  return (
    <article
      className={`orientation-detail-item-card mt-4 flex-col ${
        tone === "red" ? "is-red" : tone === "blue" ? "is-blue" : "is-gold"
      }`}
      data-ocid="library.item.card"
    >
      <div
        className="flex w-full flex-col px-5 py-6 sm:px-7 sm:py-8"
        style={{ paddingTop: "calc(1.5rem + 6px)" }}
        data-ocid="library.item.card_body"
      >
        {/* Photo placement: when the item has a photo AND little or no
            text content, the photo dominates as a large centered hero.
            When there is substantial text, keep the two-column layout. */}
        {item.photo && !hasSubstantialItemText(item) ? (
          <div data-ocid="library.item.photo_hero">
            <div className="overflow-hidden rounded-md border border-border bg-card p-2">
              <PhotoButton photo={item.photo} title={item.title} />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
            {/* LEFT — item text (detail fields, notes, tags) */}
            <div className="order-2 min-w-0 flex-1 lg:order-1">
              {/* Labeled detail fields */}
              {item.details.length > 0 ? (
                <dl
                  className="flex flex-col gap-7"
                  data-ocid="library.item.fields"
                >
                  {item.details.map((field, index) => (
                    <div
                      key={`${field.fieldLabel}-${index}`}
                      className="flex flex-col gap-1.5"
                      data-ocid={`library.item.field.${index + 1}`}
                    >
                      <dt
                        className="recipe-section-heading"
                        data-ocid={`library.item.field_label.${index + 1}`}
                      >
                        {field.fieldLabel}
                      </dt>
                      <dd
                        className="font-body text-base leading-relaxed text-foreground prose prose-sm prose-invert max-w-none prose-headings:font-heading prose-headings:uppercase prose-headings:tracking-wide prose-headings:text-foreground prose-strong:text-foreground prose-em:text-foreground prose-u:text-foreground prose-li:text-foreground prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-ul:text-foreground prose-ol:text-foreground prose-strong:font-semibold prose-headings:font-semibold prose-p:leading-relaxed prose-li:leading-relaxed prose-headings:mt-0 prose-headings:mb-1 prose-p:my-0 prose-ul:my-0 prose-ol:my-0 prose-li:my-0"
                        data-ocid={`library.item.field_value.${index + 1}`}
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: value is sanitized at render time via sanitizeHtml, which strips every tag outside the minimal safe set (b, i, u, strong, em, ul, ol, li, p, br) and every on* handler / javascript: URL / style attribute. Defense in depth — the bulk importer also sanitizes at write time.
                        dangerouslySetInnerHTML={{
                          __html: sanitizeHtml(field.value),
                        }}
                      />
                    </div>
                  ))}
                </dl>
              ) : null}

              {/* Notes */}
              {item.notes ? (
                <section
                  className={item.details.length > 0 ? "mt-8" : "mt-0"}
                  data-ocid="library.item.notes"
                >
                  <h2 className="recipe-section-heading">Notes</h2>
                  <p className="mt-2 whitespace-pre-line font-body text-base leading-relaxed text-foreground">
                    {item.notes}
                  </p>
                </section>
              ) : null}

              {/* Tags as outlined chips */}
              {item.tags.length > 0 ? (
                <section
                  className={
                    item.details.length > 0 || item.notes ? "mt-8" : "mt-0"
                  }
                  data-ocid="library.item.tags"
                >
                  <ul className="flex flex-wrap gap-2">
                    {item.tags.map((tag, index) => (
                      <li
                        key={tag}
                        className="rounded-full border border-border px-3 py-1 font-body text-xs uppercase tracking-wide text-muted-foreground"
                        data-ocid={`library.item.tag.${index + 1}`}
                      >
                        {tag}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>

            {/* RIGHT — full item photo in a thin bordered frame, sticky on
                desktop so it stays visible while reading the text. Tap to
                open full-size. On mobile it stacks above the text. */}
            {item.photo ? (
              <div
                className="order-1 lg:order-2 lg:sticky lg:top-6 lg:w-[340px] lg:shrink-0"
                data-ocid="library.item.photo"
              >
                <div className="overflow-hidden rounded-md border border-border bg-card p-2">
                  <PhotoButton photo={item.photo} title={item.title} />
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </article>
  );
}

/* -------------------------------- Chrome -------------------------------- */

/** Photo button that opens the full-size image in a new tab. */
function PhotoButton({
  photo,
  title,
}: {
  photo: string;
  title: string;
}): ReactElement {
  return (
    <button
      type="button"
      onClick={() => window.open(photo, "_blank", "noopener,noreferrer")}
      className="block w-full rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label="Open full-size photo"
      title="Tap to view full size"
      data-ocid="library.item.photo_button"
    >
      <img
        src={photo}
        alt={title}
        className="block h-auto w-full object-contain"
        loading="lazy"
      />
    </button>
  );
}

function BackToCategory({
  positionId,
  categoryId,
}: {
  positionId: string;
  categoryId: string;
}): ReactElement {
  const to = `/position/${positionId}/library/${categoryId}`;
  return (
    <Button variant="ghost" size="sm" asChild data-ocid="library.item.back">
      <Link to={to}>
        <ArrowLeft className="size-4" />
        Back to category
      </Link>
    </Button>
  );
}

function ItemNotFound({
  positionId,
  categoryId,
}: {
  positionId: string;
  categoryId: string;
}): ReactElement {
  const to = `/position/${positionId}/library/${categoryId}`;
  return (
    <div
      className="orientation-detail-not-found mt-4"
      data-ocid="library.item.not_found"
    >
      <div>
        <h1 className="orientation-detail-not-found-title text-2xl">
          Item not found
        </h1>
        <p className="orientation-detail-not-found-body mt-2 text-base">
          This item doesn&rsquo;t exist or may have been removed.
        </p>
      </div>
      <Button asChild variant="default" data-ocid="library.item.go_back_button">
        <Link to={to}>Back to category</Link>
      </Button>
    </div>
  );
}

function RecipeCardSkeleton(): ReactElement {
  return (
    <div className="mt-4" data-ocid="library.item.loading_state" aria-hidden>
      {/* Header skeleton — tri-stripe + flourish + headline + flag-bar */}
      <div className="orientation-detail-header-skeleton">
        <div className="orientation-detail-tri-stripe">
          <span />
          <span />
          <span />
        </div>
        <div className="px-5 py-6 sm:px-7 sm:py-8">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="mt-2 h-10 w-2/3" />
          <Skeleton className="mt-4 h-1 w-40" />
        </div>
      </div>

      {/* Body skeleton — tone-stripe card filling in */}
      <div className="orientation-detail-item-skeleton mt-4 flex-col">
        <div className="orientation-detail-item-skeleton-num" />
        <div className="flex-1 p-5">
          <div className="flex flex-col gap-7">
            {["s1", "s2", "s3"].map((k) => (
              <div key={k} className="flex flex-col gap-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-16 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
