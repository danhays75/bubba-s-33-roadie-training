import { QueryErrorState } from "@/components/QueryErrorState";
import { FoodRecipeCard } from "@/components/library/FoodRecipeCard";
import { SeasonalBadge } from "@/components/library/SeasonalBadge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCategory, useItem } from "@/hooks/useLibrary";
import type {
  LibraryItem,
  Recipe,
  RecipeSpec,
  RecipeVariant,
} from "@/types/foundation";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactElement } from "react";

/**
 * Recipe card detail page — the full item view.
 *
 * Rendered by the /position/$id/library/$categoryId/item/$itemId route.
 * Dispatches on the item payload:
 *   - item.foodRecipe non-null → FoodRecipeCard (food recipe book page).
 *   - item.recipe non-null      → DrinkRecipeCard (beverage recipe book page,
 *                                 drink-recipe-* family). Bulk-mix recipes
 *                                 render a bulk-mix layout inside the same
 *                                 component via the isBulkMix discriminator.
 *   - otherwise                 → DrinkRecipeCard in its plain-item mode
 *                                 (no recipe sections, just the title band,
 *                                 photo, and labeled detail fields).
 *
 * The beverage path was previously a patriotic-roadhouse treatment
 * (PatrioticItemHeader + PrintRecipeCard / BulkMixRecipeCard / RecipeCard).
 * It is now a polished recipe-book look that mirrors FoodRecipeCard: cream
 * paper surface, per-category accent title band, hero photo, accent
 * column-header band, two-column body on desktop / stacked on phone, and a
 * confidential footer strip. The beverage data model is unchanged — this is
 * a presentation/styling fix only.
 *
 * The "Back to category" breadcrumb, RecapAudioButton, SeasonalBadge,
 * loading skeleton, error state, and not-found state are all preserved.
 */

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
  const item = itemQuery.data ?? null;
  const isLoading = itemQuery.isLoading;
  const isError = itemQuery.isError;
  // Only treat as "not found" when the read succeeded and returned null — a
  // transient fetch error must surface as a retryable error state, not a
  // terminal "this item doesn't exist" message.
  const notFound = !isLoading && !isError && !item;

  return (
    <div
      className="mx-auto w-full max-w-3xl px-4 py-6"
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
        <DrinkRecipeCard item={item!} categoryId={categoryId} />
      )}
    </div>
  );
}

/* --------------------------- Accent helper --------------------------- */

/**
 * Resolves the per-card accent CSS custom properties from the item's
 * category accentColor. Mirrors FoodRecipeCard.useCategoryAccentStyle so
 * the beverage card's title band, column-header band, glassware callout,
 * and variant underlines all pick up the category's brand accent.
 *
 * Looks up the category via useCategory(categoryId). While the category is
 * still loading (undefined) or missing (null), no inline override is
 * returned — the CSS defaults (navy band) apply so the card still renders.
 * When the category carries a non-null accentColor (a hex string like
 * "#8C5421"), the inline vars set --category-accent to that hex and
 * --category-accent-tint to a color-mix tint (22% over white).
 *
 * Returns a React.CSSProperties object (cast because custom properties are
 * not in the type) or undefined when no override should apply.
 */
function useCategoryAccentStyle(categoryId: string): CSSProperties | undefined {
  const { data: category } = useCategory(categoryId);
  // Loading (undefined) or missing (null) — let CSS defaults apply.
  if (!category) return undefined;
  const accent = category.accentColor;
  if (accent == null || accent.trim().length === 0) return undefined;
  return {
    "--category-accent": accent,
    "--category-accent-tint": `color-mix(in srgb, ${accent} 22%, white)`,
  } as CSSProperties;
}

/* --------------------------- DrinkRecipeCard --------------------------- */

/**
 * DrinkRecipeCard — the beverage recipe book page.
 *
 * RecipeCardPage dispatches to this component for every non-foodRecipe
 * item (beverage recipe, bulk-mix recipe, or plain item). It renders a
 * polished recipe-book look on a cream paper surface using the
 * drink-recipe-* CSS family, mirroring the visual quality of
 * FoodRecipeCard.
 *
 * Layout (top to bottom):
 *   1. Accent title band — per-category --category-accent (navy default),
 *      Anton uppercase white drink name, centered. Optional SeasonalBadge
 *      rides the band's right edge.
 *   2. Optional subtitle line (Zilla Slab italic, muted).
 *   3. Recap audio pill row ("Play recap") when recapAudio is present.
 *   4. Hero photo — full width, edge to edge, object-contain; tap opens
 *      full-size in a new tab. When item.photo is null, an intentional
 *      accent-tinted placeholder band renders instead (never a blank gap).
 *   5. Accent column-header band — SPECS | AMOUNT | METHOD for the
 *      standard drink; EQUIPMENT | METHOD | BATCH for the bulk mix; omitted
 *      for plain items with no recipe.
 *   6. Two-column body on desktop (Specs left, Glassware/Assembly/Garnish
 *      right), stacked on phone. Bulk-mix renders Equipment + Bulk Mix +
 *      Shelf Life on the left and Method (Assembly) on the right.
 *   7. Variants — each variant gets its own divider + Specs/Assembly,
 *      spanning full width below the two-column body.
 *   8. Quality Identifier checklist (✓ bullets) when present.
 *   9. Footer strip — confidential notice bottom-left, category name
 *      bottom-right.
 *
 * Desktop shows the true two-column layout (>=1024px); on phone (<1024px)
 * the columns stack — never horizontal scroll. The drink-recipe-desktop
 * and drink-recipe-phone markup blocks are separate, mirroring the
 * food-recipe-desktop / food-recipe-phone pattern.
 *
 * Props:
 *   - item: the LibraryItem (recipe may be null for plain items).
 *   - categoryId: used to resolve the per-category accent.
 */
function DrinkRecipeCard({
  item,
  categoryId,
}: {
  item: LibraryItem;
  categoryId: string;
}): ReactElement {
  const accentStyle = useCategoryAccentStyle(categoryId);
  const recipe = item.recipe;
  const bulkMix = recipe != null ? isBulkMix(recipe) : false;

  return (
    <article
      className="drink-recipe-doc mt-4"
      style={accentStyle}
      data-ocid="library.item.drink_recipe_card"
    >
      {/* ── Desktop layout (>=1024px) ── */}
      <div
        className="drink-recipe-desktop"
        data-ocid="library.item.drink_recipe.desktop"
      >
        {bulkMix ? (
          // Bulk-mix drinks keep their own EQUIPMENT|METHOD|BATCH layout —
          // the doc redesign targets the standard drink only.
          <>
            <DrinkDocTitle title={item.title} subtitle={item.subtitle} />
            <DrinkDocPhoto photo={item.photo} title={item.title} />
            <BulkMixDesktopBody recipe={recipe!} />
            <DrinkDocFooter categoryId={categoryId} />
          </>
        ) : recipe ? (
          <DrinkDocStandard
            recipe={recipe}
            item={item}
            categoryId={categoryId}
          />
        ) : (
          <>
            <DrinkDocTitle title={item.title} subtitle={item.subtitle} />
            <DrinkDocPhoto photo={item.photo} title={item.title} />
            <PlainItemDesktopBody item={item} />
            <DrinkDocFooter categoryId={categoryId} />
          </>
        )}
      </div>

      {/* ── Phone layout (<1024px) ── */}
      <div
        className="drink-recipe-doc-phone drink-recipe-phone"
        data-ocid="library.item.drink_recipe.phone"
      >
        {bulkMix ? (
          <>
            <DrinkDocTitle title={item.title} subtitle={item.subtitle} />
            <DrinkDocPhoto photo={item.photo} title={item.title} />
            <BulkMixPhoneBody recipe={recipe!} />
            <DrinkDocFooter categoryId={categoryId} />
          </>
        ) : recipe ? (
          <DrinkDocStandardPhone
            recipe={recipe}
            item={item}
            categoryId={categoryId}
          />
        ) : (
          <>
            <DrinkDocTitle title={item.title} subtitle={item.subtitle} />
            <DrinkDocPhoto photo={item.photo} title={item.title} />
            <PlainItemPhoneBody item={item} />
            <DrinkDocFooter categoryId={categoryId} />
          </>
        )}
      </div>
    </article>
  );
}

/* --------------------------- Title + subtitle --------------------------- */

/**
 * DrinkDocTitle — centered, bold, black, ALL-CAPS, underlined drink title,
 * matching the Bubba's 33 recipe-book reference. The optional subtitle
 * (e.g. "(Does Not Contain Alcohol)") renders centered in smaller text
 * directly under the title. The SeasonalBadge, when present, rides the
 * title row's right edge.
 */
function DrinkDocTitle({
  title,
  subtitle,
  seasonal,
}: {
  title: string;
  subtitle: string | null;
  seasonal?: boolean;
}): ReactElement {
  const hasSubtitle = subtitle != null && subtitle.trim().length > 0;
  return (
    <header
      className="drink-recipe-doc-title-block"
      data-ocid="library.item.drink_recipe.title_band"
    >
      <h1
        className="drink-recipe-doc-title"
        data-ocid="library.item.drink_recipe.title"
      >
        {title}
      </h1>
      {seasonal ? (
        <SeasonalBadge className="drink-recipe-doc-title-seasonal" />
      ) : null}
      {hasSubtitle ? (
        <p
          className="drink-recipe-doc-subtitle"
          data-ocid="library.item.drink_recipe.subtitle"
        >
          {subtitle}
        </p>
      ) : null}
    </header>
  );
}

/* --------------------------- Photo (framed, right column) --------------------------- */

/**
 * DrinkDocPhoto — the drink photograph in a thick accent-colored border,
 * object-contain at natural aspect, matching the Bubba's 33 reference's
 * right-column framed photo. Tapping opens the full-size image in a new
 * tab via the existing window.open pattern (preserved exactly — no new
 * lightbox).
 *
 * Returns null when `photo` is null so the caller can collapse the grid
 * to a single full-width text column (no empty right gap, no placeholder).
 */
function DrinkDocPhoto({
  photo,
  title,
}: {
  photo: string | null;
  title: string;
}): ReactElement | null {
  if (!photo) return null;
  return (
    <div
      className="drink-recipe-doc-photo"
      data-ocid="library.item.drink_recipe.photo_hero"
    >
      <button
        type="button"
        onClick={() => window.open(photo, "_blank", "noopener,noreferrer")}
        className="block w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Open full-size photo"
        title="Tap to view full size"
        data-ocid="library.item.drink_recipe.photo_button"
      >
        <img
          src={photo}
          alt={title}
          className="drink-recipe-doc-photo-img"
          loading="lazy"
        />
      </button>
    </div>
  );
}

/* --------------------------- Footer strip --------------------------- */

/**
 * DrinkDocFooter — the Bubba's 33 footer strip at the bottom of the card:
 * the "Bubba's 33" wordmark centered, the "THE LEGENDARY SERVE
 * RESPONSIBLY" tagline, a small "CONFIDENTIAL AND PROPRIETARY © …
 * Bubba's 33" line, and the category name (e.g. "MOCKTAILS") at the
 * bottom-left. The category name resolves from useCategory(categoryId)
 * and falls back to the category id. The year is the current year.
 */
function DrinkDocFooter({ categoryId }: { categoryId: string }): ReactElement {
  const { data: category } = useCategory(categoryId);
  const categoryName =
    category && category.name.trim().length > 0 ? category.name : categoryId;
  const year = new Date().getFullYear();
  return (
    <footer
      className="drink-recipe-doc-footer"
      data-ocid="library.item.drink_recipe.footer"
    >
      <div
        className="drink-recipe-doc-footer-brand"
        data-ocid="library.item.drink_recipe.footer_brand"
      >
        Bubba&rsquo;s 33
      </div>
      <div
        className="drink-recipe-doc-footer-tagline"
        data-ocid="library.item.drink_recipe.footer_tagline"
      >
        THE LEGENDARY SERVE RESPONSIBLY
      </div>
      <div
        className="drink-recipe-doc-footer-copy"
        data-ocid="library.item.drink_recipe.footer_confidential"
      >
        CONFIDENTIAL AND PROPRIETARY &copy; {year} Bubba&rsquo;s 33
      </div>
      <div
        className="drink-recipe-doc-footer-category"
        data-ocid="library.item.drink_recipe.footer_category"
      >
        {categoryName}
      </div>
    </footer>
  );
}

/* --------------------------- Standard drink — desktop (doc redesign) --------------------------- */

/**
 * DrinkDocStandard — the standard (non-bulk-mix) drink rendered as the
 * Bubba's 33 recipe-book page on desktop (>=1024px).
 *
 * Layout:
 *   1. Centered underlined ALL-CAPS title + optional non-alcoholic subtitle.
 *   2. Two-column grid (drink-recipe-doc-grid): left text column ~40%
 *      (Glassware → Specs → Assembly → Garnish → audio buttons), right
 *      photo column ~60% (thick accent-bordered framed photo). When the
 *      item has no photo, the grid collapses to a single full-width text
 *      column (no empty right gap).
 *   3. Variants — full-width below the grid, UNRESTYLED (existing
 *      drink-recipe-variant / drink-variant-* classes — doNotBuild).
 *   4. Quality Identifier checklist — full-width below, existing classes.
 *   5. Footer strip.
 *
 * Section headers (Glassware, Specs, Assembly, Garnish) render in the
 * accent color, bold, uppercase. List items use small square bullets.
 * Specs uses two-column alignment: amount left, ingredient right.
 */
function DrinkDocStandard({
  recipe,
  item,
  categoryId,
}: {
  recipe: Recipe;
  item: LibraryItem;
  categoryId: string;
}): ReactElement {
  const hasGlassware = recipe.glassware.trim().length > 0;
  const hasSpecs = recipe.specs.length > 0;
  const hasAssembly = recipe.assembly.length > 0;
  const hasGarnish = recipe.garnish.length > 0;
  const hasVariants = recipe.variants.some(
    (v) => v.variantLabel.trim().length > 0,
  );
  const hasQuality = recipe.qualityIdentifier.length > 0;
  const hasAudio =
    (recipe.recapAudio != null && recipe.recapAudio.length > 0) ||
    (recipe.buildAudio != null && recipe.buildAudio.length > 0);
  const hasPhoto = item.photo != null && item.photo.length > 0;

  return (
    <>
      <DrinkDocTitle
        title={item.title}
        subtitle={item.subtitle}
        seasonal={item.seasonal}
      />

      <div
        className={`drink-recipe-doc-grid ${hasPhoto ? "is-split" : "is-single"}`}
        data-ocid="library.item.drink_recipe.body"
      >
        {/* LEFT — text column (~40%) */}
        <div
          className="drink-recipe-doc-text"
          data-ocid="library.item.drink_recipe.text_column"
        >
          {hasGlassware ? (
            <section
              className="drink-recipe-doc-section"
              data-ocid="library.item.drink_recipe.glassware"
            >
              <h2
                className="drink-recipe-doc-section-header"
                data-ocid="library.item.drink_recipe.glassware.heading"
              >
                Glassware
              </h2>
              <ul
                className="drink-recipe-doc-list"
                data-ocid="library.item.drink_recipe.glassware.list"
              >
                <li data-ocid="library.item.drink_recipe.glassware.item.1">
                  {recipe.glassware}
                </li>
              </ul>
            </section>
          ) : null}

          {hasSpecs ? (
            <section
              className="drink-recipe-doc-section"
              data-ocid="library.item.drink_recipe.specs"
            >
              <h2
                className="drink-recipe-doc-section-header"
                data-ocid="library.item.drink_recipe.specs.heading"
              >
                Specs
              </h2>
              <ul
                className="drink-recipe-doc-specs"
                data-ocid="library.item.drink_recipe.specs.list"
              >
                {recipe.specs.map((spec, i) => (
                  <li
                    key={`spec-${i}-${spec.amount}-${spec.ingredient}`}
                    className="drink-recipe-doc-spec-row"
                    data-ocid={`library.item.drink_recipe.spec.${i + 1}`}
                  >
                    <span
                      className="drink-recipe-doc-spec-amount"
                      data-ocid={`library.item.drink_recipe.spec.amount.${i + 1}`}
                    >
                      {spec.amount}
                    </span>
                    <span
                      className="drink-recipe-doc-spec-ingredient"
                      data-ocid={`library.item.drink_recipe.spec.ingredient.${i + 1}`}
                    >
                      {spec.ingredient}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {hasAssembly ? (
            <section
              className="drink-recipe-doc-section"
              data-ocid="library.item.drink_recipe.assembly"
            >
              <h2
                className="drink-recipe-doc-section-header"
                data-ocid="library.item.drink_recipe.assembly.heading"
              >
                Assembly
              </h2>
              <ul
                className="drink-recipe-doc-list"
                data-ocid="library.item.drink_recipe.assembly.list"
              >
                {recipe.assembly.map((step, i) => (
                  <li
                    key={`asm-${i}-${step}`}
                    data-ocid={`library.item.drink_recipe.assembly.step.${i + 1}`}
                  >
                    {step}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {hasGarnish ? (
            <section
              className="drink-recipe-doc-section"
              data-ocid="library.item.drink_recipe.garnish"
            >
              <h2
                className="drink-recipe-doc-section-header"
                data-ocid="library.item.drink_recipe.garnish.heading"
              >
                Garnish
              </h2>
              <ul
                className="drink-recipe-doc-list"
                data-ocid="library.item.drink_recipe.garnish.list"
              >
                {recipe.garnish.map((g, i) => (
                  <li
                    key={`gar-${i}-${g}`}
                    data-ocid={`library.item.drink_recipe.garnish.item.${i + 1}`}
                  >
                    {g}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {hasAudio ? (
            <div
              className="drink-recipe-doc-audio"
              data-ocid="library.item.drink_recipe.recap_row"
            >
              <RecapAudioButton recapAudio={recipe.recapAudio} />
              <BuildAudioButton buildAudio={recipe.buildAudio} />
            </div>
          ) : null}
        </div>

        {/* RIGHT — framed photo (~60%), omitted when no photo */}
        {hasPhoto ? (
          <DrinkDocPhoto photo={item.photo} title={item.title} />
        ) : null}
      </div>

      {/* Variants — full-width below the grid, UNRESTYLED (doNotBuild) */}
      {hasVariants
        ? recipe.variants.map((variant, i) =>
            variant.variantLabel.trim().length > 0 ? (
              <DrinkVariantBlock
                key={`var-${i}-${variant.variantLabel}`}
                variant={variant}
                index={i}
              />
            ) : null,
          )
        : null}

      {/* Quality Identifier checklist — existing classes */}
      {hasQuality ? (
        <section
          className="drink-recipe-variant"
          data-ocid="library.item.drink_recipe.quality"
        >
          <h2
            className="drink-recipe-section-heading"
            data-ocid="library.item.drink_recipe.quality.heading"
          >
            Quality Identifier
          </h2>
          <ul
            className="drink-recipe-quality"
            data-ocid="library.item.drink_recipe.quality.list"
          >
            {recipe.qualityIdentifier.map((qi, i) => (
              <li
                key={`qi-${i}-${qi}`}
                data-ocid={`library.item.drink_recipe.quality.item.${i + 1}`}
              >
                {qi}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <DrinkDocFooter categoryId={categoryId} />
    </>
  );
}

/**
 * A single specs row in the desktop Specs table — ■-bullet ingredient on
 * the left, amount right-aligned in its own column. Subtle row
 * separators via .drink-recipe-row.
 */
function DrinkSpecsRow({
  spec,
  index,
}: {
  spec: RecipeSpec;
  index: number;
}): ReactElement {
  return (
    <div
      className="drink-recipe-row"
      data-ocid={`library.item.drink_recipe.spec.${index + 1}`}
    >
      <span className="item">{spec.ingredient}</span>
      <span className="amount">{spec.amount}</span>
    </div>
  );
}

/**
 * A variant block on desktop — full-width section below the two-column
 * body. Uppercased Zilla Slab label with an accent underline rule, then
 * that variant's Specs + Assembly in a two-column split (Specs left,
 * Assembly right) when both are present.
 */
function DrinkVariantBlock({
  variant,
  index,
}: {
  variant: RecipeVariant;
  index: number;
}): ReactElement {
  const hasSpecs = variant.specs.length > 0;
  const hasAssembly = variant.assembly.length > 0;
  const isSplit = hasSpecs && hasAssembly;

  return (
    <section
      className="drink-recipe-variant"
      data-ocid={`library.item.drink_recipe.variant.${index + 1}`}
    >
      <h2
        className="drink-recipe-variant-label"
        data-ocid={`library.item.drink_recipe.variant_label.${index + 1}`}
      >
        {variant.variantLabel.toUpperCase()}
      </h2>
      <div
        className={`drink-variant-body ${isSplit ? "is-split" : ""}`}
        data-ocid={`library.item.drink_recipe.variant_body.${index + 1}`}
      >
        {hasSpecs ? (
          <div
            className="drink-variant-column"
            data-ocid={`library.item.drink_recipe.variant_specs.${index + 1}`}
          >
            <h3
              className="drink-recipe-section-heading"
              data-ocid={`library.item.drink_recipe.variant_specs.heading.${index + 1}`}
            >
              Specs
            </h3>
            {variant.specs.map((spec, i) => (
              <DrinkSpecsRow
                key={`vspec-${variant.variantLabel}-${spec.amount}-${spec.ingredient}`}
                spec={spec}
                index={i}
              />
            ))}
          </div>
        ) : null}
        {hasAssembly ? (
          <div
            className="drink-variant-column"
            data-ocid={`library.item.drink_recipe.variant_assembly.${index + 1}`}
          >
            <h3
              className="drink-recipe-section-heading"
              data-ocid={`library.item.drink_recipe.variant_assembly.heading.${index + 1}`}
            >
              Assembly
            </h3>
            <ol
              className="drink-recipe-steps"
              data-ocid={`library.item.drink_recipe.variant_assembly.list.${index + 1}`}
            >
              {variant.assembly.map((step, i) => (
                <li
                  key={`vasm-${variant.variantLabel}-${step}`}
                  data-ocid={`library.item.drink_recipe.variant_assembly.step.${index + 1}.${i + 1}`}
                >
                  {step}
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </div>
    </section>
  );
}

/* --------------------------- Standard drink — phone (doc redesign) --------------------------- */

/**
 * DrinkDocStandardPhone — the standard (non-bulk-mix) drink on phone
 * (<1024px), single-column stack with no horizontal scroll, in the
 * reference order: title → photo → Glassware → Specs → Assembly →
 * Garnish → audio buttons → variants → quality → footer. Reuses the
 * same drink-recipe-doc-* classes inside the drink-recipe-doc-phone
 * container so the document look carries through.
 */
function DrinkDocStandardPhone({
  recipe,
  item,
  categoryId,
}: {
  recipe: Recipe;
  item: LibraryItem;
  categoryId: string;
}): ReactElement {
  const hasGlassware = recipe.glassware.trim().length > 0;
  const hasSpecs = recipe.specs.length > 0;
  const hasAssembly = recipe.assembly.length > 0;
  const hasGarnish = recipe.garnish.length > 0;
  const hasVariants = recipe.variants.some(
    (v) => v.variantLabel.trim().length > 0,
  );
  const hasQuality = recipe.qualityIdentifier.length > 0;
  const hasAudio =
    (recipe.recapAudio != null && recipe.recapAudio.length > 0) ||
    (recipe.buildAudio != null && recipe.buildAudio.length > 0);
  const hasPhoto = item.photo != null && item.photo.length > 0;

  return (
    <>
      <DrinkDocTitle
        title={item.title}
        subtitle={item.subtitle}
        seasonal={item.seasonal}
      />

      {hasPhoto ? (
        <DrinkDocPhoto photo={item.photo} title={item.title} />
      ) : null}

      {hasGlassware ? (
        <section
          className="drink-recipe-doc-section"
          data-ocid="library.item.drink_recipe.phone.glassware"
        >
          <h2
            className="drink-recipe-doc-section-header"
            data-ocid="library.item.drink_recipe.phone.glassware.heading"
          >
            Glassware
          </h2>
          <ul
            className="drink-recipe-doc-list"
            data-ocid="library.item.drink_recipe.phone.glassware.list"
          >
            <li data-ocid="library.item.drink_recipe.phone.glassware.item.1">
              {recipe.glassware}
            </li>
          </ul>
        </section>
      ) : null}

      {hasSpecs ? (
        <section
          className="drink-recipe-doc-section"
          data-ocid="library.item.drink_recipe.phone.specs"
        >
          <h2
            className="drink-recipe-doc-section-header"
            data-ocid="library.item.drink_recipe.phone.specs.heading"
          >
            Specs
          </h2>
          <ul
            className="drink-recipe-doc-specs"
            data-ocid="library.item.drink_recipe.phone.specs.list"
          >
            {recipe.specs.map((spec, i) => (
              <li
                key={`pspec-${i}-${spec.amount}-${spec.ingredient}`}
                className="drink-recipe-doc-spec-row"
                data-ocid={`library.item.drink_recipe.phone.spec.${i + 1}`}
              >
                <span
                  className="drink-recipe-doc-spec-amount"
                  data-ocid={`library.item.drink_recipe.phone.spec.amount.${i + 1}`}
                >
                  {spec.amount}
                </span>
                <span
                  className="drink-recipe-doc-spec-ingredient"
                  data-ocid={`library.item.drink_recipe.phone.spec.ingredient.${i + 1}`}
                >
                  {spec.ingredient}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {hasAssembly ? (
        <section
          className="drink-recipe-doc-section"
          data-ocid="library.item.drink_recipe.phone.assembly"
        >
          <h2
            className="drink-recipe-doc-section-header"
            data-ocid="library.item.drink_recipe.phone.assembly.heading"
          >
            Assembly
          </h2>
          <ul
            className="drink-recipe-doc-list"
            data-ocid="library.item.drink_recipe.phone.assembly.list"
          >
            {recipe.assembly.map((step, i) => (
              <li
                key={`pasm-${i}-${step}`}
                data-ocid={`library.item.drink_recipe.phone.assembly.step.${i + 1}`}
              >
                {step}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {hasGarnish ? (
        <section
          className="drink-recipe-doc-section"
          data-ocid="library.item.drink_recipe.phone.garnish"
        >
          <h2
            className="drink-recipe-doc-section-header"
            data-ocid="library.item.drink_recipe.phone.garnish.heading"
          >
            Garnish
          </h2>
          <ul
            className="drink-recipe-doc-list"
            data-ocid="library.item.drink_recipe.phone.garnish.list"
          >
            {recipe.garnish.map((g, i) => (
              <li
                key={`pgar-${i}-${g}`}
                data-ocid={`library.item.drink_recipe.phone.garnish.item.${i + 1}`}
              >
                {g}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {hasAudio ? (
        <div
          className="drink-recipe-doc-audio"
          data-ocid="library.item.drink_recipe.phone.recap_row"
        >
          <RecapAudioButton recapAudio={recipe.recapAudio} />
          <BuildAudioButton buildAudio={recipe.buildAudio} />
        </div>
      ) : null}

      {/* Variants — UNRESTYLED (doNotBuild) */}
      {hasVariants
        ? recipe.variants.map((variant, i) =>
            variant.variantLabel.trim().length > 0 ? (
              <DrinkPhoneVariantBlock
                key={`pvar-${i}-${variant.variantLabel}`}
                variant={variant}
                index={i}
              />
            ) : null,
          )
        : null}

      {/* Quality Identifier checklist — existing classes */}
      {hasQuality ? (
        <section data-ocid="library.item.drink_recipe.phone.quality">
          <p
            className="drink-recipe-phone-section-label"
            data-ocid="library.item.drink_recipe.phone.quality.label"
          >
            Quality Identifier
          </p>
          <ul
            className="drink-recipe-phone-quality"
            data-ocid="library.item.drink_recipe.phone.quality.list"
          >
            {recipe.qualityIdentifier.map((qi, i) => (
              <li
                key={`pqi-${i}-${qi}`}
                data-ocid={`library.item.drink_recipe.phone.quality.item.${i + 1}`}
              >
                {qi}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <DrinkDocFooter categoryId={categoryId} />
    </>
  );
}

/**
 * A single specs row on phone — item name on the left with its amount as
 * a bold purple pill on the right. The pill wraps to its own line if it
 * is long. Tap target >=44px via .drink-recipe-phone-row.
 */
function DrinkPhoneSpecsRow({
  spec,
  index,
}: {
  spec: RecipeSpec;
  index: number;
}): ReactElement {
  return (
    <div
      className="drink-recipe-phone-row"
      data-ocid={`library.item.drink_recipe.phone.spec.${index + 1}`}
    >
      <span className="item">{spec.ingredient}</span>
      {spec.amount.trim().length > 0 ? (
        <span className="amount-pill">{spec.amount}</span>
      ) : null}
    </div>
  );
}

/**
 * A variant block on phone — full-width, accent label, then that
 * variant's Specs (item + amount pill rows) and Assembly (numbered
 * steps) stacked.
 */
function DrinkPhoneVariantBlock({
  variant,
  index,
}: {
  variant: RecipeVariant;
  index: number;
}): ReactElement {
  const hasSpecs = variant.specs.length > 0;
  const hasAssembly = variant.assembly.length > 0;

  return (
    <section
      className="drink-recipe-phone-variant"
      data-ocid={`library.item.drink_recipe.phone.variant.${index + 1}`}
    >
      <h2
        className="drink-recipe-phone-variant-label"
        data-ocid={`library.item.drink_recipe.phone.variant_label.${index + 1}`}
      >
        {variant.variantLabel.toUpperCase()}
      </h2>
      {hasSpecs ? (
        <div
          data-ocid={`library.item.drink_recipe.phone.variant_specs.${index + 1}`}
        >
          {variant.specs.map((spec, i) => (
            <DrinkPhoneSpecsRow
              key={`pvspec-${variant.variantLabel}-${spec.amount}-${spec.ingredient}`}
              spec={spec}
              index={i}
            />
          ))}
        </div>
      ) : null}
      {hasAssembly ? (
        <div
          className="drink-recipe-phone-procedure"
          data-ocid={`library.item.drink_recipe.phone.variant_assembly.${index + 1}`}
        >
          <ol
            className="drink-recipe-phone-steps"
            data-ocid={`library.item.drink_recipe.phone.variant_assembly.list.${index + 1}`}
          >
            {variant.assembly.map((step, i) => (
              <li
                key={`pvasm-${variant.variantLabel}-${step}`}
                data-ocid={`library.item.drink_recipe.phone.variant_assembly.step.${index + 1}.${i + 1}`}
              >
                {step}
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </section>
  );
}

/* --------------------------- Bulk mix — desktop --------------------------- */

/**
 * Bulk-mix desktop body — accent column-header band (EQUIPMENT |
 * METHOD | BATCH) then a two-column body: Equipment + Bulk Mix + Shelf
 * Life on the left, Method (Assembly) on the right. Specs render
 * full-width below the two-column body when present. Quality Identifier
 * checklist renders full-width at the bottom. NO glassware, NO garnish,
 * NO variants.
 */
function BulkMixDesktopBody({ recipe }: { recipe: Recipe }): ReactElement {
  const hasEquipment = recipe.equipment.length > 0;
  const hasBatch =
    (recipe.yield != null && recipe.yield.trim().length > 0) ||
    (recipe.shelfLife != null && recipe.shelfLife.trim().length > 0);
  const hasAssembly = recipe.assembly.length > 0;
  const hasSpecs = recipe.specs.length > 0;
  const hasQuality = recipe.qualityIdentifier.length > 0;
  const isSplit = (hasEquipment || hasBatch) && hasAssembly;

  return (
    <>
      {hasEquipment || hasBatch || hasAssembly ? (
        <div
          className="drink-recipe-column-band"
          data-ocid="library.item.drink_recipe.bulk.column_band"
        >
          <span data-ocid="library.item.drink_recipe.bulk.column_label.equipment">
            Equipment
          </span>
          <span
            className="label-center"
            data-ocid="library.item.drink_recipe.bulk.column_label.method"
          >
            Method
          </span>
          <span
            className="label-right"
            data-ocid="library.item.drink_recipe.bulk.column_label.batch"
          >
            Batch
          </span>
        </div>
      ) : null}

      {hasEquipment || hasBatch || hasAssembly ? (
        <div
          className={`drink-recipe-body ${isSplit ? "is-split" : ""}`}
          data-ocid="library.item.drink_recipe.bulk.body"
        >
          {/* LEFT — Equipment + Bulk Mix + Shelf Life */}
          {hasEquipment || hasBatch ? (
            <section
              className="drink-recipe-column"
              data-ocid="library.item.drink_recipe.bulk.left"
            >
              {hasEquipment ? (
                <div data-ocid="library.item.drink_recipe.bulk.equipment">
                  <h2
                    className="drink-recipe-section-heading"
                    data-ocid="library.item.drink_recipe.bulk.equipment.heading"
                  >
                    Equipment
                  </h2>
                  <ul
                    className="drink-recipe-equipment"
                    data-ocid="library.item.drink_recipe.bulk.equipment.list"
                  >
                    {recipe.equipment.map((tool, i) => (
                      <li
                        key={`eq-${i}-${tool}`}
                        data-ocid={`library.item.drink_recipe.bulk.equipment.item.${i + 1}`}
                      >
                        {tool}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {hasBatch ? (
                <div
                  className="drink-recipe-meta"
                  data-ocid="library.item.drink_recipe.bulk.meta"
                >
                  {recipe.yield != null && recipe.yield.trim().length > 0 ? (
                    <div
                      className="drink-recipe-meta-row"
                      data-ocid="library.item.drink_recipe.bulk.yield"
                    >
                      <span className="label">Bulk Mix</span>
                      <span className="value">{recipe.yield}</span>
                    </div>
                  ) : null}
                  {recipe.shelfLife != null &&
                  recipe.shelfLife.trim().length > 0 ? (
                    <div
                      className="drink-recipe-meta-row"
                      data-ocid="library.item.drink_recipe.bulk.shelf_life"
                    >
                      <span className="label">Shelf Life</span>
                      <span className="value">{recipe.shelfLife}</span>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </section>
          ) : null}

          {/* RIGHT — Method (Assembly) */}
          {hasAssembly ? (
            <section
              className="drink-recipe-column"
              data-ocid="library.item.drink_recipe.bulk.method"
            >
              <h2
                className="drink-recipe-section-heading"
                data-ocid="library.item.drink_recipe.bulk.method.heading"
              >
                Assembly
              </h2>
              <ol
                className="drink-recipe-steps"
                data-ocid="library.item.drink_recipe.bulk.method.list"
              >
                {recipe.assembly.map((step, i) => (
                  <BulkMixAssemblyStep
                    key={`bmasm-${i}-${step}`}
                    step={step}
                    index={i}
                    ocid={`library.item.drink_recipe.bulk.method.step.${i + 1}`}
                  />
                ))}
              </ol>
            </section>
          ) : null}
        </div>
      ) : null}

      {/* Specs — full-width below the two-column body */}
      {hasSpecs ? (
        <section
          className="drink-recipe-variant"
          data-ocid="library.item.drink_recipe.bulk.specs"
        >
          <h2
            className="drink-recipe-section-heading"
            data-ocid="library.item.drink_recipe.bulk.specs.heading"
          >
            Specs
          </h2>
          {recipe.specs.map((spec, i) => (
            <DrinkSpecsRow
              key={`bmspec-${spec.amount}-${spec.ingredient}`}
              spec={spec}
              index={i}
            />
          ))}
        </section>
      ) : null}

      {/* Quality Identifier checklist */}
      {hasQuality ? (
        <section
          className="drink-recipe-variant"
          data-ocid="library.item.drink_recipe.bulk.quality"
        >
          <h2
            className="drink-recipe-section-heading"
            data-ocid="library.item.drink_recipe.bulk.quality.heading"
          >
            Quality Identifier
          </h2>
          <ul
            className="drink-recipe-quality"
            data-ocid="library.item.drink_recipe.bulk.quality.list"
          >
            {recipe.qualityIdentifier.map((qi, i) => (
              <li
                key={`bqi-${i}-${qi}`}
                data-ocid={`library.item.drink_recipe.bulk.quality.item.${i + 1}`}
              >
                {qi}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}

/* --------------------------- Bulk mix — phone --------------------------- */

/**
 * Bulk-mix phone body — single-column stack: Equipment square-bullet
 * list → Bulk Mix / Shelf Life as stacked badges → Assembly numbered
 * steps → Specs (item + amount pill rows) → Quality Identifier checklist.
 * NO glassware, NO garnish, NO variants.
 */
function BulkMixPhoneBody({ recipe }: { recipe: Recipe }): ReactElement {
  const hasEquipment = recipe.equipment.length > 0;
  const hasBatch =
    (recipe.yield != null && recipe.yield.trim().length > 0) ||
    (recipe.shelfLife != null && recipe.shelfLife.trim().length > 0);
  const hasAssembly = recipe.assembly.length > 0;
  const hasSpecs = recipe.specs.length > 0;
  const hasQuality = recipe.qualityIdentifier.length > 0;

  return (
    <>
      {hasEquipment ? (
        <section data-ocid="library.item.drink_recipe.phone.bulk.equipment">
          <p
            className="drink-recipe-phone-section-label"
            data-ocid="library.item.drink_recipe.phone.bulk.equipment.label"
          >
            Equipment
          </p>
          <ul
            className="drink-recipe-phone-list"
            data-ocid="library.item.drink_recipe.phone.bulk.equipment.list"
          >
            {recipe.equipment.map((tool, i) => (
              <li
                key={`peq-${i}-${tool}`}
                data-ocid={`library.item.drink_recipe.phone.bulk.equipment.item.${i + 1}`}
              >
                {tool}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {hasBatch ? (
        <div
          className="drink-recipe-phone-meta"
          data-ocid="library.item.drink_recipe.phone.bulk.meta"
        >
          {recipe.yield != null && recipe.yield.trim().length > 0 ? (
            <span
              className="drink-recipe-phone-meta-badge"
              data-ocid="library.item.drink_recipe.phone.bulk.yield"
            >
              <span className="label">Bulk Mix</span>
              <span className="value">{recipe.yield}</span>
            </span>
          ) : null}
          {recipe.shelfLife != null && recipe.shelfLife.trim().length > 0 ? (
            <span
              className="drink-recipe-phone-meta-badge"
              data-ocid="library.item.drink_recipe.phone.bulk.shelf_life"
            >
              <span className="label">Shelf Life</span>
              <span className="value">{recipe.shelfLife}</span>
            </span>
          ) : null}
        </div>
      ) : null}

      {hasAssembly ? (
        <section
          className="drink-recipe-phone-procedure"
          data-ocid="library.item.drink_recipe.phone.bulk.assembly"
        >
          <p
            className="drink-recipe-phone-section-label"
            data-ocid="library.item.drink_recipe.phone.bulk.assembly.label"
          >
            Assembly
          </p>
          <ol
            className="drink-recipe-phone-steps"
            data-ocid="library.item.drink_recipe.phone.bulk.assembly.list"
          >
            {recipe.assembly.map((step, i) => (
              <BulkMixAssemblyStep
                key={`pbmasm-${i}-${step}`}
                step={step}
                index={i}
                ocid={`library.item.drink_recipe.phone.bulk.assembly.step.${i + 1}`}
              />
            ))}
          </ol>
        </section>
      ) : null}

      {hasSpecs ? (
        <section data-ocid="library.item.drink_recipe.phone.bulk.specs">
          <p
            className="drink-recipe-phone-section-label"
            data-ocid="library.item.drink_recipe.phone.bulk.specs.label"
          >
            Specs
          </p>
          {recipe.specs.map((spec, i) => (
            <DrinkPhoneSpecsRow
              key={`pbmspec-${spec.amount}-${spec.ingredient}`}
              spec={spec}
              index={i}
            />
          ))}
        </section>
      ) : null}

      {hasQuality ? (
        <section data-ocid="library.item.drink_recipe.phone.bulk.quality">
          <p
            className="drink-recipe-phone-section-label"
            data-ocid="library.item.drink_recipe.phone.bulk.quality.label"
          >
            Quality Identifier
          </p>
          <ul
            className="drink-recipe-phone-quality"
            data-ocid="library.item.drink_recipe.phone.bulk.quality.list"
          >
            {recipe.qualityIdentifier.map((qi, i) => (
              <li
                key={`pbqi-${i}-${qi}`}
                data-ocid={`library.item.drink_recipe.phone.bulk.quality.item.${i + 1}`}
              >
                {qi}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}

/**
 * A single bulk-mix assembly step. Steps that begin with a
 * storage/labeling directive ("Cover, label", "Label, date", "Store at")
 * render that prefix in bold, matching the print sheets. The remainder
 * of the step renders normally.
 */
function BulkMixAssemblyStep({
  step,
  index,
  ocid,
}: {
  step: string;
  index: number;
  ocid: string;
}): ReactElement {
  const boldPrefixes = ["Cover, label", "Label, date", "Store at"];
  const matched = boldPrefixes.find((p) => step.startsWith(p));

  return (
    <li data-ocid={ocid} key={`step-${index}`}>
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

/* --------------------------- Plain item (no recipe) --------------------------- */

/**
 * Plain item desktop body — for items with no recipe payload. Renders
 * the item's labeled detail fields, notes, and tags inside the cream
 * paper card body. No column-header band (no Specs/Method split).
 */
function PlainItemDesktopBody({ item }: { item: LibraryItem }): ReactElement {
  const hasDetails = item.details.length > 0;
  const hasNotes = item.notes != null && item.notes.trim().length > 0;
  const hasTags = item.tags.length > 0;

  if (!hasDetails && !hasNotes && !hasTags) return <></>;

  return (
    <div
      className="drink-recipe-body"
      data-ocid="library.item.drink_recipe.plain_body"
    >
      <section
        className="drink-recipe-column"
        data-ocid="library.item.drink_recipe.plain.fields"
      >
        {hasDetails ? (
          <dl
            className="flex flex-col gap-6"
            data-ocid="library.item.drink_recipe.plain.fields_list"
          >
            {item.details.map((field, index) => (
              <div
                key={`${field.fieldLabel}-${index}`}
                className="flex flex-col gap-1.5"
                data-ocid={`library.item.drink_recipe.plain.field.${index + 1}`}
              >
                <dt
                  className="drink-recipe-section-heading"
                  data-ocid={`library.item.drink_recipe.plain.field_label.${index + 1}`}
                >
                  {field.fieldLabel}
                </dt>
                <dd
                  className="font-body text-base leading-relaxed text-foreground"
                  data-ocid={`library.item.drink_recipe.plain.field_value.${index + 1}`}
                >
                  {field.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}

        {hasNotes ? (
          <section
            className={hasDetails ? "mt-6" : ""}
            data-ocid="library.item.drink_recipe.plain.notes"
          >
            <h2
              className="drink-recipe-section-heading"
              data-ocid="library.item.drink_recipe.plain.notes.heading"
            >
              Notes
            </h2>
            <p className="mt-1 whitespace-pre-line font-body text-base leading-relaxed text-foreground">
              {item.notes}
            </p>
          </section>
        ) : null}

        {hasTags ? (
          <section
            className={hasDetails || hasNotes ? "mt-6" : ""}
            data-ocid="library.item.drink_recipe.plain.tags"
          >
            <h2
              className="drink-recipe-section-heading"
              data-ocid="library.item.drink_recipe.plain.tags.heading"
            >
              Tags
            </h2>
            <ul className="mt-1 flex flex-wrap gap-2">
              {item.tags.map((tag, index) => (
                <li
                  key={tag}
                  className="rounded-full border border-border px-3 py-1 font-body text-xs uppercase tracking-wide text-muted-foreground"
                  data-ocid={`library.item.drink_recipe.plain.tag.${index + 1}`}
                >
                  {tag}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </section>
    </div>
  );
}

/**
 * Plain item phone body — same content as the desktop body, stacked.
 */
function PlainItemPhoneBody({ item }: { item: LibraryItem }): ReactElement {
  const hasDetails = item.details.length > 0;
  const hasNotes = item.notes != null && item.notes.trim().length > 0;
  const hasTags = item.tags.length > 0;

  if (!hasDetails && !hasNotes && !hasTags) return <></>;

  return (
    <>
      {hasDetails ? (
        <section data-ocid="library.item.drink_recipe.phone.plain.fields">
          {item.details.map((field, index) => (
            <div key={`${field.fieldLabel}-${index}`}>
              <p
                className="drink-recipe-phone-section-label"
                data-ocid={`library.item.drink_recipe.phone.plain.field_label.${index + 1}`}
              >
                {field.fieldLabel}
              </p>
              <p
                className="px-4 pb-2 font-body text-base leading-relaxed text-foreground"
                data-ocid={`library.item.drink_recipe.phone.plain.field_value.${index + 1}`}
              >
                {field.value}
              </p>
            </div>
          ))}
        </section>
      ) : null}

      {hasNotes ? (
        <section data-ocid="library.item.drink_recipe.phone.plain.notes">
          <p
            className="drink-recipe-phone-section-label"
            data-ocid="library.item.drink_recipe.phone.plain.notes.label"
          >
            Notes
          </p>
          <p className="px-4 pb-2 whitespace-pre-line font-body text-base leading-relaxed text-foreground">
            {item.notes}
          </p>
        </section>
      ) : null}

      {hasTags ? (
        <section data-ocid="library.item.drink_recipe.phone.plain.tags">
          <p
            className="drink-recipe-phone-section-label"
            data-ocid="library.item.drink_recipe.phone.plain.tags.label"
          >
            Tags
          </p>
          <ul className="px-4 pb-2 flex flex-wrap gap-2">
            {item.tags.map((tag, index) => (
              <li
                key={tag}
                className="rounded-full border border-border px-3 py-1 font-body text-xs uppercase tracking-wide text-muted-foreground"
                data-ocid={`library.item.drink_recipe.phone.plain.tag.${index + 1}`}
              >
                {tag}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
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
      data-ocid="library.item.drink_recipe.recap_button"
      className={`inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 font-body text-xs font-medium leading-none text-foreground transition-smooth hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background ${className ?? ""}`}
    >
      {label}
    </button>
  );
}

/* --------------------------- Build audio button ------------------------- */

/**
 * BuildAudioButton — a small, screen-only "Play build" / "Stop" toggle that
 * plays the recipe's optional build audio clip via a dedicated local
 * HTMLAudioElement. Mirrors RecapAudioButton exactly (same structure, same
 * logic, same lifecycle), but reads recipe.buildAudio as its src and uses
 * the label "Play build" ↔ "Stop".
 *
 * Rendered ONLY when `buildAudio` is a non-empty string. When the clip is
 * null/absent/empty, this component renders nothing — no disabled button, no
 * placeholder.
 *
 * Independent of RecapAudioButton: each holds its own useRef audio element
 * and its own playing state, so playing one does not affect the other.
 */
function BuildAudioButton({
  buildAudio,
  className,
}: {
  buildAudio: string | null | undefined;
  className?: string;
}): ReactElement | null {
  // No clip → render nothing. No disabled button, no placeholder.
  if (typeof buildAudio !== "string" || buildAudio.length === 0) {
    return null;
  }

  return (
    <BuildAudioButtonInner buildAudio={buildAudio} className={className} />
  );
}

/**
 * Inner implementation — always has a non-empty buildAudio string. Split from
 * BuildAudioButton so the hooks run unconditionally (Rules of Hooks) and the
 * null-guard lives in the parent. Mirrors RecapAudioButtonInner exactly.
 */
function BuildAudioButtonInner({
  buildAudio,
  className,
}: {
  buildAudio: string;
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
    audioEl.src = buildAudio;
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

  const label = playing ? "⏸ Stop" : "▶ Play build";
  const ariaLabel = playing ? "Stop recipe build" : "Play recipe build";

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={ariaLabel}
      aria-pressed={playing}
      data-ocid="library.item.drink_recipe.build_button"
      className={`inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 font-body text-xs font-medium leading-none text-foreground transition-smooth hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background ${className ?? ""}`}
    >
      {label}
    </button>
  );
}

/* --------------------------- Bulk-mix discriminator --------------------------- */

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

/* ------------------------------ Chrome -------------------------------- */

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
      className="mt-4 rounded-md border border-border bg-card p-6"
      data-ocid="library.item.not_found"
    >
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">
          Item not found
        </h1>
        <p className="mt-2 text-base text-muted-foreground">
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
      <div className="drink-recipe-doc">
        <header className="drink-recipe-doc-title-block">
          <Skeleton className="drink-recipe-doc-title h-8 w-2/3" />
        </header>
        <div className="drink-recipe-doc-grid">
          <div className="drink-recipe-doc-text">
            <div className="flex flex-col gap-7">
              {["s1", "s2", "s3"].map((k) => (
                <div
                  key={k}
                  className="drink-recipe-doc-section flex flex-col gap-2"
                >
                  <Skeleton className="drink-recipe-doc-section-header h-4 w-28" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
