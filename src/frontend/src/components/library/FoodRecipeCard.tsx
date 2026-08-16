import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCategory } from "@/hooks/useLibrary";
import { renderInlineMarkdown } from "@/lib/inlineMarkdown";
import type {
  FoodComponent,
  FoodRecipe,
  FoodServiceware,
  LibraryItem,
} from "@/types/foundation";
import { Hand, X } from "lucide-react";
import { useState } from "react";
import type { CSSProperties, ReactElement } from "react";

/**
 * Resolves the per-card accent CSS custom properties from the item's
 * category accentColor.
 *
 * Looks up the category via useCategory(item.categoryId). While the
 * category is still loading (undefined) or missing (null), no inline
 * override is returned — the CSS defaults (navy band) apply so the card
 * still renders. When the category carries a non-null accentColor (a hex
 * string like "#8C5421"), the inline vars set --category-accent to that
 * hex and --category-accent-tint to a color-mix tint (22% over white).
 *
 * Returns a React.CSSProperties object (cast because custom properties
 * are not in the type) or undefined when no override should apply.
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

/**
 * FoodRecipeCard — the food-recipe item detail view.
 *
 * RecipeCardPage dispatches to this component when `item.foodRecipe` is
 * present (not null), before the beverage recipe / generic card dispatch.
 *
 * This is a PRESENTATION-ONLY redesign that visually replicates the
 * official Lake Charles Quik Reference recipe book pages. The foodRecipe
 * data model and the { item: LibraryItem } prop signature are unchanged
 * — only the visual presentation changes.
 *
 * Shared structure (both menuBuild and prep): a single document-style
 * card on a light/cream paper-like surface (not the dark library card).
 * A solid deep-purple (#4B1D74) title band across the very top, full
 * width, square-cornered to the card edges, with the recipe title
 * centered, white, Anton uppercase. A footer strip at the very bottom
 * carries the confidential notice (bottom-left) and the station name
 * (bottom-right). Screen-only styling (not print).
 *
 * Two layouts based on `foodRecipe.kind`:
 *   - `'menuBuild'` — assembled-to-order menu item. Purple title band →
 *     full-width plating photo (edge to edge, object-contain; tap opens
 *     the photo in a new tab via the existing window.open behavior) →
 *     purple ASSEMBLY | AMOUNT | PROCEDURE column-header band →
 *     two-column body (Assembly/Amount on the left with serviceware
 *     first then components as ■-bullet rows with right-aligned amounts;
 *     Procedure on the right with a hand-wash note at the top then
 *     build steps as • bullets) → light-purple EXPO callout with a
 *     vertical rotated EXPO label down its left edge → allergen callout.
 *   - `'prep'` — make-ahead prep recipe. Purple title band → intro line
 *     + optional equipment line → right-aligned Yield/Shelf life/Holding
 *     meta stack → Ingredient | Amount table (tinted purple header row,
 *     rows grouped by 'Step 1', 'Step 2'… subheadings) → WASH YOUR HANDS
 *     procedure (• bullets) → Quality Identifiers ✓ checklist → Line
 *     utensil / Storage / Hold temp badges.
 *
 * The card reuses the existing window.open photo-tap behavior (no new
 * lightbox). When `item.photo` is null the photo block is omitted
 * entirely. Desktop shows the true two-column layout; on mobile the
 * columns stack — never horizontal scroll.
 *
 * Props:
 *   - item: the LibraryItem with a non-null `foodRecipe`.
 */
export function FoodRecipeCard({ item }: { item: LibraryItem }): ReactElement {
  const food = item.foodRecipe;
  // Resolve the per-card accent CSS vars from the item's category. The hook
  // returns undefined while loading or when the category has no accentColor,
  // so the CSS defaults (navy band) apply and the card still renders.
  const accentStyle = useCategoryAccentStyle(item.categoryId);
  // RecipeCardPage only dispatches here when foodRecipe is non-null, but
  // keep a defensive fallback so the component never crashes on a null
  // payload (e.g. a future caller that bypasses the dispatch).
  if (!food) {
    return (
      <article
        className="food-recipe-card mt-4 flex flex-col"
        style={accentStyle}
        data-ocid="library.item.food_recipe_card"
      >
        <header className="food-recipe-title-band">
          <h1
            className="food-recipe-title"
            data-ocid="library.item.food_recipe.title"
          >
            {item.title}
          </h1>
        </header>
      </article>
    );
  }

  // Build Card — a presentation-only leader-line layout that replaces the
  // normal menuBuild/prep card ONLY when the recipe carries a non-empty
  // buildHeader AND the LibraryItem has a photo. The trigger is intentionally
  // kind-agnostic and does NOT require every component.anchorY to be non-null
  // — a recipe with buildHeader + photo renders the Build Card regardless of
  // kind, and any null anchorY falls back to an even vertical distribution
  // inside the Build Card. When either prerequisite fails the existing
  // MenuBuildFoodRecipeCard / PrepFoodRecipeCard render unchanged.
  //
  // Display-only fallback: when buildHeader is null/empty BUT the recipe kind
  // is a burger/plate kind (a `menuBuild` recipe — burgers and plates are both
  // assembled-to-order menu items in this data model) AND item.photo is truthy,
  // the Build Card still renders with an inferred kicker ("Build Your Burger"
  // when menuSection mentions burgers, otherwise "Build Your Plate"). The
  // stored buildHeader remains null — the inference happens at render time
  // only and never touches the data layer. Recipes without a photo still
  // render the generic ASSEMBLY | AMOUNT | PROCEDURE card.
  const hasBuildHeader =
    food.buildHeader != null && food.buildHeader.trim().length > 0;
  const isBuildCard =
    !!item.photo && (hasBuildHeader || food.kind === "menuBuild");

  return food.kind === "prep" && !isBuildCard ? (
    <PrepFoodRecipeCard item={item} food={food} accentStyle={accentStyle} />
  ) : isBuildCard ? (
    <BuildCardFoodRecipeCard
      item={item}
      food={food}
      accentStyle={accentStyle}
    />
  ) : (
    <MenuBuildFoodRecipeCard
      item={item}
      food={food}
      accentStyle={accentStyle}
    />
  );
}

export default FoodRecipeCard;

/* --------------------------- Shared sub-blocks --------------------------- */

/**
 * Title band — solid deep-purple strip across the very top of the card,
 * full width, square to the card edges. Anton uppercase white title,
 * centered.
 */
function RecipeTitleBand({ title }: { title: string }): ReactElement {
  return (
    <header
      className="food-recipe-title-band"
      data-ocid="library.item.food_recipe.title_band"
    >
      <h1
        className="food-recipe-title"
        data-ocid="library.item.food_recipe.title"
      >
        {title}
      </h1>
    </header>
  );
}

/**
 * PrepTitleBand — the prep card title band, with an optional multi-batch
 * size selector.
 *
 * When `multiBatch` is false (single-batch prep), this renders the plain
 * centered title band IDENTICAL to RecipeTitleBand — so single-batch prep
 * recipes are unchanged. It delegates to RecipeTitleBand directly so the
 * non-multiBatch path shares the exact same markup and styling (no
 * duplication).
 *
 * When `multiBatch` is true, the band gains the `is-multibatch` modifier
 * (desktop flex row: title left, picker right; phone: title band as today
 * PLUS a full-width picker pinned under it). The picker reuses the EXACT
 * build-card classes so prep and build cards feel identical:
 *   - Desktop: `.build-card-size-picker` (role=tablist) with one
 *     `.build-card-size-btn` per size label; the active button gets `.on`;
 *     onClick calls onSelectSize.
 *   - Phone: `.build-card-phone-size-picker` (full-width segmented control)
 *     with the same buttons, pinned UNDER the band via the existing phone
 *     class.
 *
 * The size selector is only rendered when there is more than one distinct
 * size label (a single distinct size has no functional selector — the
 * build card renders a static label in that case, but for prep we simply
 * omit the selector and let the scalar amounts/yield render, matching the
 * "additive only" rule).
 *
 * Props:
 *   - title: the recipe title (item.title).
 *   - multiBatch: whether the recipe carries per-size amounts/yields.
 *   - sizeLabels: the ordered distinct size labels (e.g. ["1x", "½x"]).
 *     Empty when not multiBatch.
 *   - selectedSize: the currently active size, or null.
 *   - onSelectSize: setter that updates selectedSize.
 *   - phone: when true, renders the phone variant (full-width picker under
 *     the band instead of an inline right-side picker).
 */
function PrepTitleBand({
  title,
  multiBatch,
  sizeLabels,
  selectedSize,
  onSelectSize,
  phone,
}: {
  title: string;
  multiBatch: boolean;
  sizeLabels: string[];
  selectedSize: string | null;
  onSelectSize: (size: string | null) => void;
  phone?: boolean;
}): ReactElement {
  // Single-batch prep — render the plain centered title band unchanged.
  // Delegating to RecipeTitleBand keeps the non-multiBatch path byte-for-byte
  // identical to the original (no selector, no modifier class).
  if (!multiBatch || sizeLabels.length === 0) {
    return <RecipeTitleBand title={title} />;
  }

  // Multi-batch with a single distinct size has no functional selector —
  // omit the picker and render the plain title band so the scalar
  // amounts/yield render without a non-functional control. (The build card
  // renders a static label here; prep keeps it simple per "additive only".)
  if (sizeLabels.length === 1) {
    return <RecipeTitleBand title={title} />;
  }

  // Multi-batch with 2+ distinct sizes — render the title band with the
  // size selector. Desktop places the picker inline on the right (the
  // is-multibatch modifier flips the band to a flex row); phone renders
  // the band as today PLUS a full-width picker pinned under it.
  const ocidStem = phone
    ? "library.item.food_recipe.phone.prep"
    : "library.item.food_recipe.prep";

  return (
    <>
      <header
        className={`food-recipe-title-band is-multibatch${phone ? " is-phone" : ""}`}
        data-ocid={`${ocidStem}.title_band`}
      >
        <h1 className="food-recipe-title" data-ocid={`${ocidStem}.title`}>
          {title}
        </h1>
        {/* Desktop picker — inline on the right of the title band. The
            is-multibatch modifier (without is-phone) makes the band a flex
            row so this picker sits on the right. Hidden on phone via the
            CSS @media block (phone renders the full-width picker below). */}
        {!phone ? (
          <div
            className="build-card-size-picker"
            role="tablist"
            aria-label="Select size"
            data-ocid={`${ocidStem}.size_picker`}
          >
            {sizeLabels.map((label) => {
              const active = selectedSize === label;
              return (
                <button
                  type="button"
                  key={label}
                  role="tab"
                  aria-selected={active}
                  className={`build-card-size-btn${active ? " on" : ""}`}
                  onClick={() => onSelectSize(label)}
                  data-ocid={`${ocidStem}.size_btn.${label}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        ) : null}
      </header>
      {/* Phone picker — full-width segmented control pinned UNDER the
          title band. Reuses .build-card-phone-size-picker so it matches
          the build card's phone picker exactly. Rendered as a sibling
          block so it can span full width. */}
      {phone ? (
        <div
          className="build-card-phone-size-picker"
          role="tablist"
          aria-label="Select size"
          data-ocid={`${ocidStem}.size_picker`}
        >
          {sizeLabels.map((label) => {
            const active = selectedSize === label;
            return (
              <button
                type="button"
                key={label}
                role="tab"
                aria-selected={active}
                className={`build-card-size-btn${active ? " on" : ""}`}
                onClick={() => onSelectSize(label)}
                data-ocid={`${ocidStem}.size_btn.${label}`}
              >
                {label}
              </button>
            );
          })}
        </div>
      ) : null}
    </>
  );
}

/**
 * Footer strip — confidential notice bottom-left, station name
 * bottom-right. Sits flush to the card's bottom edge.
 */
function RecipeFooter({ station }: { station: string }): ReactElement {
  const year = new Date().getFullYear();
  return (
    <footer
      className="food-recipe-footer"
      data-ocid="library.item.food_recipe.footer"
    >
      <span
        className="food-recipe-footer-confidential"
        data-ocid="library.item.food_recipe.footer_confidential"
      >
        Confidential and proprietary &copy; {year} Lake Charles Quik Reference
      </span>
      {station.trim().length > 0 ? (
        <span
          className="food-recipe-footer-station"
          data-ocid="library.item.food_recipe.footer_station"
        >
          {station}
        </span>
      ) : null}
    </footer>
  );
}

/**
 * Photo block — full width, edge to edge, no side padding. Natural
 * aspect (object-contain) on its own neutral background. Tapping opens
 * the full-size image in a new tab via the existing window.open pattern
 * (preserved exactly — no new lightbox).
 */
function RecipePhoto({
  photo,
  title,
}: {
  photo: string;
  title: string;
}): ReactElement {
  return (
    <div
      className="food-recipe-photo"
      data-ocid="library.item.food_recipe.photo_hero"
    >
      <button
        type="button"
        onClick={() => window.open(photo, "_blank", "noopener,noreferrer")}
        className="block w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Open full-size photo"
        title="Tap to view full size"
        data-ocid="library.item.food_recipe.photo_button"
      >
        <img
          src={photo}
          alt={title}
          className="food-recipe-photo-img"
          loading="lazy"
        />
      </button>
    </div>
  );
}

/**
 * RecipeNote — compact highlighted callout surfacing `item.notes`.
 *
 * Renders a small uppercase 'NOTE' label (brand purple) followed by the
 * note text on a lightly tinted purple surface with a purple left edge.
 * The note text runs through renderInlineMarkdown so **bold** / *italic*
 * emphasize consistently with the steps. Shows nothing when `notes` is
 * null/empty. The `phone` flag swaps to the phone-tuned variant
 * (.food-recipe-note.is-phone) which aligns to the phone content padding.
 */
function RecipeNote({
  notes,
  phone,
}: {
  notes: string | null;
  phone?: boolean;
}): ReactElement | null {
  if (notes == null || notes.trim().length === 0) return null;
  const ocidStem = phone
    ? "library.item.food_recipe.phone.note"
    : "library.item.food_recipe.note";
  return (
    <div
      className={`food-recipe-note${phone ? " is-phone" : ""}`}
      data-ocid={ocidStem}
    >
      <span className="label" data-ocid={`${ocidStem}.label`}>
        Note
      </span>
      <span data-ocid={`${ocidStem}.text`}>{renderInlineMarkdown(notes)}</span>
    </div>
  );
}

/**
 * RecipeDiagram — a labeled 'Diagram' figure for prep recipes.
 *
 * Renders a small uppercase 'Diagram' label (same styling family as the
 * other section headers like 'Ingredients' / 'Quality Identifiers') above
 * the item's photo on a white/very-light card background with a thin
 * border and small rounded corners. The image is capped at ~380px wide,
 * centered, and object-fit: contain so line-art never crops and never
 * causes horizontal scroll. Shows nothing when `photo` is null/empty.
 * The `phone` flag swaps to the phone-tuned variant
 * (.food-recipe-diagram.is-phone) which stacks full-width under the steps.
 */
function RecipeDiagram({
  photo,
  title,
  phone,
}: {
  photo: string | null;
  title: string;
  phone?: boolean;
}): ReactElement | null {
  if (photo == null || photo.trim().length === 0) return null;
  const ocidStem = phone
    ? "library.item.food_recipe.phone.diagram"
    : "library.item.food_recipe.diagram";
  return (
    <figure
      className={`food-recipe-diagram${phone ? " is-phone" : ""}`}
      data-ocid={ocidStem}
    >
      <figcaption data-ocid={`${ocidStem}.label`}>Diagram</figcaption>
      <img
        src={photo}
        alt={`${title} diagram`}
        loading="lazy"
        data-ocid={`${ocidStem}.image`}
      />
    </figure>
  );
}

/* --------------------------- menuBuild layout ----------------------------- */

/**
 * menuBuild food recipe card — assembled-to-order menu item.
 *
 * Layout (top to bottom):
 *   1. Purple title band — title centered, white, Anton uppercase.
 *   2. Plating photo directly under the band — full width, edge to edge,
 *      object-contain; tap opens in a new tab. Omitted if no photo.
 *   3. Purple column-header band — ASSEMBLY (left), AMOUNT (centered over
 *      the amounts column), PROCEDURE (right). White, uppercase, Oswald.
 *   4. Two-column body:
 *      LEFT (~55%) = Assembly / Amount. Serviceware first (under a small
 *      'Plating' sub-label), then each component as a ■-bullet row with
 *      the amount right-aligned in its own column. Subtle row separators.
 *      RIGHT (~45%) = Procedure. Hand-wash/glove note at the top, then
 *      build steps as • bullets.
 *   5. EXPO finishing callout — light-purple highlighted box at the
 *      bottom of the Procedure column, with a vertical 'EXPO' label
 *      (rotated 90°, purple) down its left edge. If expoSteps is empty,
 *      the procedure list stands alone (no separate box).
 *   6. Allergen callout — muted line at the bottom of the Assembly column.
 *   7. Footer strip — confidential notice + station name.
 *
 * Desktop shows the true two-column layout; on mobile the columns stack
 * (photo + title, then Assembly/Amount, then Procedure, then EXPO box)
 * — never horizontal scroll.
 */
function MenuBuildFoodRecipeCard({
  item,
  food,
  accentStyle,
}: {
  item: LibraryItem;
  food: FoodRecipe;
  accentStyle?: CSSProperties;
}): ReactElement {
  const hasServiceware = food.serviceware.length > 0;
  const hasComponents = food.components.length > 0;
  const hasSteps = food.steps.length > 0;
  const hasExpo = food.expoSteps.length > 0;
  const hasAllergen =
    food.allergenNote != null && food.allergenNote.trim().length > 0;
  const hasAssembly = hasServiceware || hasComponents;
  // The two-column split only applies when there is a procedure column to
  // sit beside the assembly column. When there is no procedure at all the
  // assembly column spans full width.
  const isSplit = hasSteps || hasExpo;

  return (
    <article
      className="food-recipe-card mt-4 flex flex-col"
      style={accentStyle}
      data-ocid="library.item.food_recipe_card.menu_build"
    >
      {/* ── Desktop layout (>=1024px) — preserved byte-for-byte. ── */}
      <div
        className="food-recipe-desktop"
        data-ocid="library.item.food_recipe.desktop.menu_build"
      >
        <RecipeTitleBand title={item.title} />

        <RecipeNote notes={item.notes} />

        {item.photo ? (
          <RecipePhoto photo={item.photo} title={item.title} />
        ) : null}

        {hasAssembly || hasSteps || hasExpo ? (
          <div
            className="food-recipe-column-band is-3"
            data-ocid="library.item.food_recipe.column_band"
          >
            <span data-ocid="library.item.food_recipe.column_label.assembly">
              Assembly
            </span>
            <span
              className="label-center"
              data-ocid="library.item.food_recipe.column_label.amount"
            >
              Amount
            </span>
            <span
              className="label-right"
              data-ocid="library.item.food_recipe.column_label.procedure"
            >
              Procedure
            </span>
          </div>
        ) : null}

        <div
          className={`food-recipe-body ${isSplit ? "is-split" : ""}`}
          data-ocid="library.item.food_recipe.body"
        >
          {/* LEFT — Assembly / Amount. Serviceware first under a 'Plating'
              sub-label, then components. Each row is a ■ bullet + item on
              the left, amount right-aligned in its own column. */}
          {hasAssembly ? (
            <section
              className="food-recipe-column"
              data-ocid="library.item.food_recipe.assembly"
            >
              {hasServiceware ? (
                <div data-ocid="library.item.food_recipe.plating_group">
                  <p
                    className="food-recipe-plating-label"
                    data-ocid="library.item.food_recipe.plating.label"
                  >
                    Plating
                  </p>
                  {food.serviceware.map((sw, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: ordered recipe list with no stable id; duplicate step/component strings can collide, index is the stable key
                    <ServicewareRow key={`sw-${i}`} sw={sw} index={i} />
                  ))}
                </div>
              ) : null}

              {hasComponents ? (
                <div data-ocid="library.item.food_recipe.components_group">
                  {food.components.map((c, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: ordered recipe list with no stable id; duplicate step/component strings can collide, index is the stable key
                    <ComponentRow key={`c-${i}`} component={c} index={i} />
                  ))}
                </div>
              ) : null}

              {hasAllergen ? (
                <div
                  className="food-recipe-allergen"
                  data-ocid="library.item.food_recipe.allergen"
                >
                  <span
                    className="label"
                    data-ocid="library.item.food_recipe.allergen.label"
                  >
                    Allergen Note
                  </span>
                  <span data-ocid="library.item.food_recipe.allergen.text">
                    {food.allergenNote}
                  </span>
                </div>
              ) : null}
            </section>
          ) : null}

          {/* RIGHT — Procedure. Hand-wash/glove note at the top, then build
              steps as • bullets, then the EXPO callout at the bottom. */}
          {hasSteps || hasExpo ? (
            <section
              className="food-recipe-column"
              data-ocid="library.item.food_recipe.procedure"
            >
              <HandWashNote />

              {hasSteps ? (
                <ol
                  className="food-recipe-steps"
                  data-ocid="library.item.food_recipe.build_steps.list"
                >
                  {food.steps.map((step, i) => (
                    <li
                      // biome-ignore lint/suspicious/noArrayIndexKey: ordered recipe list with no stable id; duplicate step/component strings can collide, index is the stable key
                      key={`step-${i}`}
                      data-ocid={`library.item.food_recipe.build_steps.step.${i + 1}`}
                    >
                      {renderInlineMarkdown(step)}
                    </li>
                  ))}
                </ol>
              ) : null}

              {hasExpo ? (
                <div
                  className="food-recipe-expo"
                  data-ocid="library.item.food_recipe.expo"
                >
                  <span
                    className="food-recipe-expo-label"
                    data-ocid="library.item.food_recipe.expo.label"
                  >
                    EXPO
                  </span>
                  <div
                    className="food-recipe-expo-body"
                    data-ocid="library.item.food_recipe.expo.body"
                  >
                    <ol
                      className="food-recipe-steps"
                      data-ocid="library.item.food_recipe.expo.list"
                    >
                      {food.expoSteps.map((step, i) => (
                        <li
                          // biome-ignore lint/suspicious/noArrayIndexKey: ordered recipe list with no stable id; duplicate step/component strings can collide, index is the stable key
                          key={`expo-${i}`}
                          data-ocid={`library.item.food_recipe.expo.step.${i + 1}`}
                        >
                          {renderInlineMarkdown(step)}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}
        </div>

        <RecipeFooter station={food.station} />
      </div>

      {/* ── Phone layout (<1024px, tuned for ~375px) — single-column
            stack: title band → photo → Plating serviceware group →
            components stacked list (item left, amount as bold chip right)
            → numbered procedure → hand-wash note → EXPO callout with a
            small purple EXPO tag at the top → footer. ── */}
      <div
        className="food-recipe-phone"
        data-ocid="library.item.food_recipe.phone.menu_build"
      >
        <RecipeTitleBand title={item.title} />

        <RecipeNote notes={item.notes} phone />

        {item.photo ? (
          <RecipePhoto photo={item.photo} title={item.title} />
        ) : null}

        {hasAssembly ? (
          <section
            className="food-recipe-phone-build"
            data-ocid="library.item.food_recipe.phone.build"
          >
            {hasServiceware ? (
              <div
                className="food-recipe-phone-plating"
                data-ocid="library.item.food_recipe.phone.plating_group"
              >
                <p
                  className="food-recipe-phone-section-label"
                  data-ocid="library.item.food_recipe.phone.plating.label"
                >
                  Plating
                </p>
                {food.serviceware.map((sw, i) => (
                  <PhoneAmountRow
                    // biome-ignore lint/suspicious/noArrayIndexKey: ordered recipe list with no stable id; duplicate step/component strings can collide, index is the stable key
                    key={`p-sw-${i}`}
                    item={sw.item}
                    amount={sw.amount}
                    index={i}
                    ocidPrefix="library.item.food_recipe.phone.plating.row"
                  />
                ))}
              </div>
            ) : null}

            {hasComponents ? (
              <div
                className="food-recipe-phone-components"
                data-ocid="library.item.food_recipe.phone.components_group"
              >
                {hasServiceware ? (
                  <p
                    className="food-recipe-phone-section-label"
                    data-ocid="library.item.food_recipe.phone.components.label"
                  >
                    Build
                  </p>
                ) : null}
                {food.components.map((c, i) => (
                  <PhoneAmountRow
                    // biome-ignore lint/suspicious/noArrayIndexKey: ordered recipe list with no stable id; duplicate step/component strings can collide, index is the stable key
                    key={`p-c-${i}`}
                    item={c.item}
                    amount={c.amount}
                    note={c.note ?? ""}
                    index={i}
                    ocidPrefix="library.item.food_recipe.phone.component.row"
                  />
                ))}
              </div>
            ) : null}

            {hasAllergen ? (
              <div
                className="food-recipe-phone-allergen"
                data-ocid="library.item.food_recipe.phone.allergen"
              >
                <span
                  className="label"
                  data-ocid="library.item.food_recipe.phone.allergen.label"
                >
                  Allergen Note
                </span>
                <span data-ocid="library.item.food_recipe.phone.allergen.text">
                  {food.allergenNote}
                </span>
              </div>
            ) : null}
          </section>
        ) : null}

        {hasSteps || hasExpo ? (
          <section
            className="food-recipe-phone-procedure"
            data-ocid="library.item.food_recipe.phone.procedure"
          >
            <HandWashNote />

            {hasSteps ? (
              <ol
                className="food-recipe-phone-steps"
                data-ocid="library.item.food_recipe.phone.build_steps.list"
              >
                {food.steps.map((step, i) => (
                  <li
                    // biome-ignore lint/suspicious/noArrayIndexKey: ordered recipe list with no stable id; duplicate step/component strings can collide, index is the stable key
                    key={`p-step-${i}`}
                    data-ocid={`library.item.food_recipe.phone.build_steps.step.${i + 1}`}
                  >
                    {renderInlineMarkdown(step)}
                  </li>
                ))}
              </ol>
            ) : null}

            {hasExpo ? (
              <div
                className="food-recipe-phone-expo"
                data-ocid="library.item.food_recipe.phone.expo"
              >
                <span
                  className="food-recipe-phone-expo-tag"
                  data-ocid="library.item.food_recipe.phone.expo.label"
                >
                  EXPO
                </span>
                <ol
                  className="food-recipe-phone-steps"
                  data-ocid="library.item.food_recipe.phone.expo.list"
                >
                  {food.expoSteps.map((step, i) => (
                    <li
                      // biome-ignore lint/suspicious/noArrayIndexKey: ordered recipe list with no stable id; duplicate step/component strings can collide, index is the stable key
                      key={`p-expo-${i}`}
                      data-ocid={`library.item.food_recipe.phone.expo.step.${i + 1}`}
                    >
                      {renderInlineMarkdown(step)}
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
          </section>
        ) : null}

        <RecipeFooter station={food.station} />
      </div>
    </article>
  );
}

/* --------------------------- build-card layout --------------------------- */

/**
 * BuildCardFoodRecipeCard — presentation-only leader-line Build Card.
 *
 * Renders instead of the normal MenuBuildFoodRecipeCard / PrepFoodRecipeCard
 * whenever the dispatcher's `isBuildCard` predicate is true: a non-empty
 * `buildHeader` AND a truthy `item.photo`. The recipe's `kind` and the
 * presence of component.anchorY values do NOT gate the trigger — a recipe
 * with buildHeader + photo renders the Build Card regardless of kind, and
 * any component whose anchorY is null falls back to an even vertical
 * distribution across the label column (see `resolveAnchorY`).
 *
 * The Build Card is a visual replica of the official Bubba's 33 build card:
 * a red kicker (buildHeader) → a deep Bubba's blue (#1F3A8A, or the
 * per-category accent when one exists) square title band with a white
 * uppercase title → a two-column stage with the build photo on the left
 * (~46%) and anchorY-positioned leader-line labels on the right (~54%) → a
 * confidential footer strip. Build steps render below the card.
 *
 * Two layouts, mirroring the existing dual-markup pattern
 * (.food-recipe-desktop / .food-recipe-phone):
 *   - Desktop (>= ~720px) — `.build-card-desktop`: red kicker → blue title
 *     band → two-column stage (photo left ~46%, labels right ~54% with each
 *     label at top: anchorY*100% translateY(-50%)) → footer → build steps.
 *   - Phone (< ~720px) — `.build-card-phone`: red kicker → blue title band
 *     → full-width photo → plain vertical ingredient list (■ item left,
 *     amount chip right, note in red beneath) → build steps. No leader
 *     lines, no absolute positioning.
 *
 * The photo tap opens a shadcn Dialog lightbox (reusing the
 * DrinksBuilderActivity pattern) over a dark backdrop instead of
 * window.open, so the full-size photo stays inside the app. anchorY is
 * honored exactly when present; null anchorY falls back to even
 * distribution. The component group header (c.group) is ignored on this
 * layout.
 *
 * Props:
 *   - item: the LibraryItem (item.photo is guaranteed non-null by the
 *     dispatcher's isBuildCard predicate).
 *   - food: the FoodRecipe (buildHeader is guaranteed non-empty by the
 *     dispatcher's isBuildCard predicate).
 *   - accentStyle: optional inline CSS vars (--category-accent /
 *     --category-accent-tint) sourced from the item's category.
 */
/**
 * resolveAnchorY — returns the vertical position (0..1) a Build Card label
 * should sit at inside the right-hand label column.
 *
 * When the component carries a non-null numeric `anchorY`, that value is
 * honored exactly (the importer preserves it from the source recipe). When
 * `anchorY` is null (or not a finite number), the label is distributed
 * evenly across the column using (index + 1) / (total + 1) — so a single
 * null label lands at 50%, two at 33% / 66%, three at 25/50/75%, etc. This
 * keeps the Build Card readable when anchorY is missing instead of
 * collapsing every null label to the top (the old `?? 0` behavior).
 *
 * Exported so the admin AnchorEditorDialog can reuse the exact same
 * resolution logic when rendering its label handles and computing the
 * "Reset to even spacing" defaults.
 */
export function resolveAnchorY(
  component: FoodComponent,
  index: number,
  total: number,
): number {
  const y = component.anchorY;
  if (typeof y === "number" && Number.isFinite(y)) return y;
  return total > 0 ? (index + 1) / (total + 1) : 0.5;
}

/**
 * inferBuildKicker — the display-only fallback kicker used by the Build Card
 * when the recipe's stored `buildHeader` is null/empty.
 *
 * The dispatcher's `isBuildCard` predicate now routes a `menuBuild` recipe
 * with a photo to the Build Card even when `buildHeader` is blank (migration
 * 20260810_204000 set buildHeader=null on all pre-existing recipes, so the
 * Bacon Guacamole burger and every other burger/plate recipe with a photo
 * would otherwise fall back to the generic ASSEMBLY | AMOUNT | PROCEDURE
 * card). The Build Card needs a red kicker to match the Bubba's mock, so this
 * helper infers one from the recipe's `menuSection`:
 *   - "Build Your Burger" when menuSection mentions "burger" (case-insensitive)
 *     — matches the Bubba's mock exactly.
 *   - "Build Your Plate" otherwise (plates and any other assembled-to-order
 *     menuBuild item).
 *
 * This is a render-time display fallback only — the stored buildHeader stays
 * null and the data layer is untouched. When the recipe carries a real
 * non-empty buildHeader, the caller uses that instead and this helper is
 * never consulted.
 *
 * Exported so the admin AnchorEditorDialog can render the same kicker
 * preview the published Build Card shows.
 */
export function inferBuildKicker(food: FoodRecipe): string {
  const section = food.menuSection ?? "";
  return /burger/i.test(section) ? "Build Your Burger" : "Build Your Plate";
}

/**
 * isMultiSizeRecipe — a Build Card is "multi-size" when at least one of
 * its components carries a non-empty `amounts` array (per-size amounts).
 *
 * All components are assumed to share the same ordered size labels (e.g.
 * 12", 16") — the importer guarantees this — so a single component with
 * amounts is enough to flag the recipe as multi-size. Components without
 * amounts fall back to their scalar `amount` regardless of the selection
 * (see `resolveAmountForSize`).
 *
 * Exported so the admin AnchorEditorDialog can decide whether to render
 * its size-picker preview.
 */
export function isMultiSizeRecipe(food: FoodRecipe): boolean {
  return food.components.some(
    (c) => Array.isArray(c.amounts) && c.amounts.length > 0,
  );
}

/**
 * getSizeLabels — collects the distinct ordered size labels from a
 * recipe's components' `amounts` arrays, preserving first-seen order.
 *
 * Iterates components in array order and each component's amounts in
 * array order, pushing a size label the first time it is seen. So a
 * recipe whose first component has [{size:'12"'},{size:'16"'}] and
 * whose second component has [{size:'12"'},{size:'16"'}] yields
 * ['12"', '16"'] (the duplicates are dropped). Returns [] when no
 * component carries amounts (single-size / burgers).
 *
 * Exported so the admin AnchorEditorDialog can render the same ordered
 * size list the published Build Card shows.
 */
export function getSizeLabels(food: FoodRecipe): string[] {
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const c of food.components) {
    if (!Array.isArray(c.amounts)) continue;
    for (const a of c.amounts) {
      const label = a.size;
      if (label.length === 0 || seen.has(label)) continue;
      seen.add(label);
      labels.push(label);
    }
  }
  return labels;
}

/**
 * resolveAmountForSize — returns the amount string a component should
 * display for a given selected size.
 *
 * When the component carries a non-empty `amounts` array, finds the
 * entry whose `size` === `selectedSize` and returns its `value`. When
 * the component has no amounts, or no entry matches the selected size,
 * falls back to the scalar `c.amount` (the back-compat sentinel —
 * empty amounts = [] means "use the scalar"). This keeps burgers and
 * single-amount components rendering exactly as today.
 *
 * Exported so the admin AnchorEditorDialog can preview the same amount
 * the published Build Card shows for a given size.
 */
export function resolveAmountForSize(
  component: FoodComponent,
  selectedSize: string | null | undefined,
): string {
  if (
    Array.isArray(component.amounts) &&
    component.amounts.length > 0 &&
    selectedSize != null &&
    selectedSize.length > 0
  ) {
    const match = component.amounts.find((a) => a.size === selectedSize);
    if (match != null) return match.value;
  }
  return component.amount;
}

/**
 * resolveYieldForSize — returns the yield string a prep recipe should
 * display for a given selected size.
 *
 * When the recipe carries a non-empty `yields` array, finds the entry
 * whose `size` === `selectedSize` and returns its `value`. When `yields`
 * is empty, or no entry matches the selected size, or `selectedSize` is
 * null, falls back to the scalar `food.yieldText` (the single-batch /
 * fallback yield). This keeps single-batch prep recipes rendering exactly
 * as today (no selector, one Yield badge from yieldText) while multi-batch
 * prep recipes show the per-size yield that matches the active size.
 *
 * Exported so the admin editor (and any future caller) can preview the
 * same yield the published prep card shows for a given size.
 */
export function resolveYieldForSize(
  food: FoodRecipe,
  selectedSize: string | null | undefined,
): string | null {
  if (
    Array.isArray(food.yields) &&
    food.yields.length > 0 &&
    selectedSize != null &&
    selectedSize.length > 0
  ) {
    const match = food.yields.find((y) => y.size === selectedSize);
    if (match != null && match.value.length > 0) return match.value;
  }
  return food.yieldText;
}

function BuildCardFoodRecipeCard({
  item,
  food,
  accentStyle,
}: {
  item: LibraryItem;
  food: FoodRecipe;
  accentStyle?: CSSProperties;
}): ReactElement {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  // Phone step-circle popout — index of the component whose label is
  // currently shown in the popout Dialog, or null when closed. Only one
  // popout is open at a time; tapping a different circle re-points this
  // index, tapping close/backdrop sets it back to null.
  const [popoutIndex, setPopoutIndex] = useState<number | null>(null);
  // The Build Card always renders a red kicker. When the recipe carries a
  // real non-empty buildHeader it is used as-is; otherwise (buildHeader null/
  // empty on a menuBuild recipe with a photo — the migration 20260810_204000
  // case) an inferred kicker ("Build Your Burger" / "Build Your Plate") is
  // substituted at render time so the card still matches the Bubba's mock.
  // The stored buildHeader remains null — this is a display fallback only.
  const realKicker =
    food.buildHeader != null && food.buildHeader.trim().length > 0
      ? food.buildHeader
      : null;
  const kicker = realKicker ?? inferBuildKicker(food);
  const hasSteps = food.steps.length > 0;
  // item.photo is guaranteed non-null by the dispatcher's isBuildCard
  // predicate; assert it once so the JSX stays null-safe and the type
  // narrows for the photo <img> src.
  const photo = item.photo ?? "";
  const componentCount = food.components.length;
  // The component currently shown in the phone popout (if any). Resolved
  // here so the Dialog JSX below can render its item/amount/note without
  // re-indexing the array in multiple places.
  const popoutComponent =
    popoutIndex != null ? (food.components[popoutIndex] ?? null) : null;

  // Multi-size support — a Build Card is "multi-size" when at least one
  // component carries a non-empty `amounts` array (per-size amounts).
  // All components are assumed to share the same ordered size labels
  // (e.g. 12", 16"). The size picker is rendered in the title band
  // (desktop right side, phone full-width under the band) and drives
  // every label's amount chip via React state. Single-size recipes
  // (burgers, components without amounts) render unchanged — no picker,
  // no caption, no chips; the existing `<strong>{c.item} - {c.amount}</strong>`
  // label is preserved exactly.
  const multiSize = isMultiSizeRecipe(food);
  const sizeLabels = multiSize ? getSizeLabels(food) : [];
  // selectedSize is initialized to the first size label when multi-size,
  // or null when single-size. useState so changing it re-renders every
  // label's amount chip at once.
  const [selectedSize, setSelectedSize] = useState<string | null>(
    multiSize && sizeLabels.length > 0 ? sizeLabels[0] : null,
  );
  // Single distinct size (e.g. Kids 10"): all components have amounts but
  // there is only one size. The picker is non-functional in this case —
  // we render the size as a static label, no buttons. The amount chips
  // still render with that single size's value.
  const isSingleDistinctSize = multiSize && sizeLabels.length === 1;

  return (
    <article
      className="food-recipe-card mt-4 flex flex-col"
      style={accentStyle}
      data-ocid="library.item.food_recipe_card.build"
    >
      {/* ── Desktop / tablet layout (>= ~720px) — leader-line stage. ── */}
      <div
        className="build-card-desktop"
        data-ocid="library.item.food_recipe.desktop.build"
      >
        <div
          className="build-card-kicker"
          data-ocid="library.item.food_recipe.build.kicker"
        >
          {kicker}
        </div>

        <div
          className="build-card-title-band"
          data-ocid="library.item.food_recipe.build.title_band"
        >
          <h2
            className="build-card-title"
            data-ocid="library.item.food_recipe.build.title"
          >
            {item.title}
          </h2>
          {/* Multi-size selector — pill-shaped segmented control on the
              right side of the title band. One button per distinct size;
              the active button (.on) has a white background with brand-blue
              text, inactive buttons have a translucent blue background with
              white text. Clicking a button sets selectedSize, which drives
              every label's amount chip via React state. Rendered only when
              multi-size with more than one distinct size. Single distinct
              size renders a static label (.build-card-size-static) instead. */}
          {multiSize && sizeLabels.length > 1 ? (
            <div
              className="build-card-size-picker"
              role="tablist"
              aria-label="Select size"
              data-ocid="library.item.food_recipe.build.size_picker"
            >
              {sizeLabels.map((label) => {
                const active = selectedSize === label;
                return (
                  <button
                    type="button"
                    key={label}
                    role="tab"
                    aria-selected={active}
                    className={`build-card-size-btn${active ? " on" : ""}`}
                    onClick={() => setSelectedSize(label)}
                    data-ocid={`library.item.food_recipe.build.size_btn.${label}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          ) : null}
          {isSingleDistinctSize ? (
            <span
              className="build-card-size-static"
              data-ocid="library.item.food_recipe.build.size_static"
            >
              {sizeLabels[0]}
            </span>
          ) : null}
        </div>

        <RecipeNote notes={item.notes} />

        {/* Caption — "Showing <size> amounts" under the title band.
            Updates with the selection. Rendered only when multi-size
            with more than one distinct size (single distinct size has
            no functional selector, so the caption is redundant). */}
        {multiSize && sizeLabels.length > 1 && selectedSize != null ? (
          <p
            className="build-card-size-caption"
            data-ocid="library.item.food_recipe.build.size_caption"
          >
            Showing {selectedSize} amounts
          </p>
        ) : null}

        <div
          className="build-card-stage"
          data-ocid="library.item.food_recipe.build.stage"
        >
          {/* Left ~46% — build photo at natural aspect, top-aligned on
              white. Tap opens the photo in an in-app shadcn Dialog
              lightbox (replaces the old window.open new-tab behavior so
              the full-size photo stays inside the app). */}
          <div
            className="build-card-photo-col"
            data-ocid="library.item.food_recipe.build.photo_col"
          >
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              className="build-card-photo-button"
              aria-label="Open full-size build photo"
              title="Tap to view full size"
              data-ocid="library.item.food_recipe.build.photo_button"
            >
              <img
                className="build-card-photo"
                src={photo}
                alt={item.title}
                loading="lazy"
              />
            </button>
          </div>

          {/* Right ~54% — positioned label layer, same height as the
              photo. Each label sits at top: anchorY*100% with
              translateY(-50%) so it is vertically centered on that
              point. anchorY is honored exactly — no position math. */}
          <div
            className="build-card-labels"
            data-ocid="library.item.food_recipe.build.labels"
          >
            {food.components.map((c, i) => {
              // Step number = build order, bottom layer first. With N
              // components stored top-to-bottom (matching photo/anchorY
              // order), index i from the top gets stepNumber = N - i.
              // So the bottom bun = Step 1 and the top bun = Step N.
              const stepNumber = componentCount - i;
              return (
                <div
                  // biome-ignore lint/suspicious/noArrayIndexKey: ordered recipe list with no stable id; duplicate component strings can collide, index is the stable key
                  key={`bc-${i}`}
                  className="build-card-label"
                  style={{
                    top: `${resolveAnchorY(c, i, componentCount) * 100}%`,
                  }}
                  data-ocid={`library.item.food_recipe.build.label.${i + 1}`}
                >
                  <span
                    className="build-card-step-connector"
                    aria-hidden="true"
                    data-ocid={`library.item.food_recipe.build.leader.${i + 1}`}
                  />
                  <span
                    className="build-card-step-badge"
                    aria-label={`Step ${stepNumber}`}
                    data-ocid={`library.item.food_recipe.build.step_badge.${i + 1}`}
                  >
                    <span className="build-card-step-badge-label">STEP</span>
                    <span className="build-card-step-badge-number">
                      {stepNumber}
                    </span>
                  </span>
                  <span
                    className="build-card-label-text"
                    data-ocid={`library.item.food_recipe.build.label_text.${i + 1}`}
                  >
                    {multiSize ? (
                      <>
                        <span className="build-card-label-item">
                          {renderInlineMarkdown(c.item)}
                        </span>
                        <span
                          className="build-card-amount-chip"
                          data-ocid={`library.item.food_recipe.build.amount_chip.${i + 1}`}
                        >
                          {renderInlineMarkdown(
                            resolveAmountForSize(c, selectedSize),
                          )}
                        </span>
                      </>
                    ) : (
                      <strong>
                        {renderInlineMarkdown(c.item)} -{" "}
                        {renderInlineMarkdown(c.amount)}
                      </strong>
                    )}
                    {c.note != null && c.note.trim().length > 0 ? (
                      <span
                        className="build-card-label-note"
                        data-ocid={`library.item.food_recipe.build.label_note.${i + 1}`}
                      >
                        {" "}
                        ({c.note})
                      </span>
                    ) : null}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div
          className="build-card-footer"
          data-ocid="library.item.food_recipe.build.footer"
        >
          <span
            className="build-card-footer-confidential"
            data-ocid="library.item.food_recipe.build.footer_confidential"
          >
            CONFIDENTIAL AND PROPRIETARY &copy; Bubba&apos;s 33
          </span>
          {food.station.trim().length > 0 ? (
            <span
              className="build-card-footer-station"
              data-ocid="library.item.food_recipe.build.footer_station"
            >
              {food.station}
            </span>
          ) : null}
        </div>

        {hasSteps ? <BuildSteps steps={food.steps} /> : null}
      </div>

      {/* ── Phone layout (< ~720px) — single-column reflow. ── */}
      <div
        className="build-card-phone"
        data-ocid="library.item.food_recipe.phone.build"
      >
        <div
          className="build-card-kicker"
          data-ocid="library.item.food_recipe.phone.build.kicker"
        >
          {kicker}
        </div>

        <div
          className="build-card-title-band"
          data-ocid="library.item.food_recipe.phone.build.title_band"
        >
          <h2
            className="build-card-title"
            data-ocid="library.item.food_recipe.phone.build.title"
          >
            {item.title}
          </h2>
          {/* Multi-size selector — on phone this renders as a full-width
              segmented control pinned UNDER the title band (see
              .build-card-phone-size-picker below the band). The inline
              slot here is left empty on phone; the picker is rendered
              as a sibling block so it can span full width. Single
              distinct size renders a static label inline. */}
          {isSingleDistinctSize ? (
            <span
              className="build-card-size-static"
              data-ocid="library.item.food_recipe.phone.build.size_static"
            >
              {sizeLabels[0]}
            </span>
          ) : null}
        </div>

        <RecipeNote notes={item.notes} phone />

        {/* Phone size picker — full-width segmented control pinned under
            the title band. Each button is a size label; the active
            button (.on) has a white background with brand-blue text,
            inactive buttons have a translucent blue background with
            white text. Clicking a button sets selectedSize, which
            drives every phone popout's amount chip via React state.
            Rendered only when multi-size with more than one distinct
            size. No horizontal scroll. */}
        {multiSize && sizeLabels.length > 1 ? (
          <div
            className="build-card-phone-size-picker"
            role="tablist"
            aria-label="Select size"
            data-ocid="library.item.food_recipe.phone.build.size_picker"
          >
            {sizeLabels.map((label) => {
              const active = selectedSize === label;
              return (
                <button
                  type="button"
                  key={label}
                  role="tab"
                  aria-selected={active}
                  className={`build-card-size-btn${active ? " on" : ""}`}
                  onClick={() => setSelectedSize(label)}
                  data-ocid={`library.item.food_recipe.phone.build.size_btn.${label}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        ) : null}

        {/* Phone caption — "Showing <size> amounts" under the size
            picker. Updates with the selection. */}
        {multiSize && sizeLabels.length > 1 && selectedSize != null ? (
          <p
            className="build-card-size-caption is-phone"
            data-ocid="library.item.food_recipe.phone.build.size_caption"
          >
            Showing {selectedSize} amounts
          </p>
        ) : null}

        {/* Photo stage — the full-width photo remains the visual anchor.
            The photo button (tap-to-zoom lightbox) sits underneath an
            overlay layer of step circles positioned at each component's
            anchorY on the LEFT edge of the photo. Tapping a circle opens
            a label popout (and stops propagation so the photo lightbox
            does not also fire); tapping the photo itself still opens the
            lightbox. The old stacked ingredient list is gone — labels now
            live in the popout. */}
        <div
          className="build-card-phone-photo-stage"
          data-ocid="library.item.food_recipe.phone.build.photo_stage"
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            className="build-card-photo-button"
            aria-label="Open full-size build photo"
            title="Tap to view full size"
            data-ocid="library.item.food_recipe.phone.build.photo_button"
          >
            <img
              className="build-card-photo"
              src={photo}
              alt={item.title}
              loading="lazy"
            />
          </button>
          {componentCount > 0 ? (
            <div
              className="build-card-phone-circles"
              data-ocid="library.item.food_recipe.phone.build.circles"
            >
              {food.components.map((c, i) => {
                // Step number = build order, bottom layer first (same as
                // desktop). Index i from the top gets stepNumber = N - i.
                const stepNumber = componentCount - i;
                return (
                  <button
                    type="button"
                    key={`pbc-${c.item}-${c.amount}-${i}`}
                    className="build-card-phone-circle"
                    style={{
                      top: `${resolveAnchorY(c, i, componentCount) * 100}%`,
                    }}
                    aria-label={`Step ${stepNumber}: ${c.item}${c.amount.trim().length > 0 ? ` — ${c.amount}` : ""}`}
                    data-ocid={`library.item.food_recipe.phone.build.circle.${i + 1}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setPopoutIndex(i);
                    }}
                  >
                    <span className="build-card-step-badge" aria-hidden="true">
                      <span className="build-card-step-badge-label">STEP</span>
                      <span className="build-card-step-badge-number">
                        {stepNumber}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        {hasSteps ? <BuildSteps steps={food.steps} phone /> : null}
      </div>

      {/* Lightbox Dialog — full uncropped build photo over a dark
          backdrop. Tapping the backdrop or the close button dismisses
          it. Reuses the DrinksBuilderActivity lightbox pattern. The
          photo is guaranteed non-null by the dispatcher's isBuildCard
          predicate, so the Dialog renders unconditionally here. */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent
          className="max-w-[90vw] max-h-[90vh] border-primary/40 bg-black/90 p-0 overflow-hidden"
          data-ocid="library.item.food_recipe.build.lightbox"
        >
          <DialogTitle className="sr-only">{item.title}</DialogTitle>
          <DialogClose
            asChild
            data-ocid="library.item.food_recipe.build.lightbox.close_button"
          >
            <button
              type="button"
              aria-label="Close lightbox"
              className="absolute right-2 top-2 z-10 inline-flex size-10 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <X className="size-5" aria-hidden />
            </button>
          </DialogClose>
          <div className="flex items-center justify-center p-3">
            <img
              src={photo}
              alt={item.title}
              className="block h-auto max-h-[90vh] w-auto max-w-[90vw] object-contain"
              data-ocid="library.item.food_recipe.build.lightbox.photo"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Phone step-label popout — opens when a step circle on the photo
          is tapped. Shows that step's component label (item name, amount
          as the existing purple pill, and the note in Bubba's red when
          present). Only one popout is open at a time; tapping a different
          circle re-points popoutIndex to that step, tapping close/backdrop
          sets popoutIndex back to null. Reuses the same shadcn Dialog
          pattern as the lightbox above. Constrained to max-w-[90vw] so it
          never causes horizontal scroll on phone. */}
      <Dialog
        open={popoutIndex != null}
        onOpenChange={(open) => {
          if (!open) setPopoutIndex(null);
        }}
      >
        <DialogContent
          className="max-w-[90vw] border-primary/40 p-0 overflow-hidden build-card-phone-popout"
          data-ocid="library.item.food_recipe.phone.build.popout"
        >
          <DialogTitle className="sr-only">
            {popoutComponent
              ? `Step ${componentCount - (popoutIndex ?? 0)}: ${popoutComponent.item}`
              : "Step label"}
          </DialogTitle>
          <DialogClose
            asChild
            data-ocid="library.item.food_recipe.phone.build.popout.close_button"
          >
            <button
              type="button"
              aria-label="Close step label"
              className="absolute right-2 top-2 z-10 inline-flex size-10 items-center justify-center rounded-full bg-black/10 text-foreground transition-colors hover:bg-black/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-5" aria-hidden />
            </button>
          </DialogClose>
          {popoutComponent ? (
            <div
              className="build-card-phone-popout-body"
              data-ocid="library.item.food_recipe.phone.build.popout.body"
            >
              <div
                className="build-card-phone-popout-step"
                data-ocid="library.item.food_recipe.phone.build.popout.step_badge"
              >
                <span className="build-card-step-badge" aria-hidden="true">
                  <span className="build-card-step-badge-label">STEP</span>
                  <span className="build-card-step-badge-number">
                    {componentCount - (popoutIndex ?? 0)}
                  </span>
                </span>
              </div>
              <div
                className="build-card-phone-popout-text"
                data-ocid="library.item.food_recipe.phone.build.popout.text"
              >
                <p
                  className="build-card-phone-popout-item"
                  data-ocid="library.item.food_recipe.phone.build.popout.item"
                >
                  {renderInlineMarkdown(popoutComponent.item)}
                </p>
                {(() => {
                  // When multi-size, the displayed amount is the selected
                  // size's value (which may be non-empty even when the
                  // scalar `amount` is the empty back-compat sentinel).
                  // When single-size, the scalar `amount` is used as-is.
                  const resolvedAmount = multiSize
                    ? resolveAmountForSize(popoutComponent, selectedSize)
                    : popoutComponent.amount;
                  return resolvedAmount.trim().length > 0 ? (
                    <span
                      className="build-card-phone-amount"
                      data-ocid="library.item.food_recipe.phone.build.popout.amount"
                    >
                      {renderInlineMarkdown(resolvedAmount)}
                    </span>
                  ) : null;
                })()}
                {popoutComponent.note != null &&
                popoutComponent.note.trim().length > 0 ? (
                  <p
                    className="build-card-phone-popout-note"
                    data-ocid="library.item.food_recipe.phone.build.popout.note"
                  >
                    {popoutComponent.note}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </article>
  );
}

/**
 * Build steps — the existing food.steps list rendered below the Build
 * Card (desktop) or at the bottom of the phone stack. Presentation only;
 * reuses the .build-card-steps styling. The `phone` flag swaps to the
 * phone-tuned variant.
 */
function BuildSteps({
  steps,
  phone,
}: {
  steps: string[];
  phone?: boolean;
}): ReactElement {
  return (
    <section
      className={`build-card-steps${phone ? " is-phone" : ""}`}
      data-ocid={
        phone
          ? "library.item.food_recipe.phone.build.steps"
          : "library.item.food_recipe.build.steps"
      }
    >
      <h3
        className="build-card-steps-heading"
        data-ocid={
          phone
            ? "library.item.food_recipe.phone.build.steps.heading"
            : "library.item.food_recipe.build.steps.heading"
        }
      >
        Build steps
      </h3>
      <ol
        className="build-card-steps-list"
        data-ocid={
          phone
            ? "library.item.food_recipe.phone.build.steps.list"
            : "library.item.food_recipe.build.steps.list"
        }
      >
        {steps.map((step, i) => (
          <li
            // biome-ignore lint/suspicious/noArrayIndexKey: ordered recipe list with no stable id; duplicate step strings can collide, index is the stable key
            key={`bs-${i}`}
            data-ocid={`library.item.food_recipe.build.steps.step.${i + 1}`}
          >
            {renderInlineMarkdown(step)}
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ------------------------------ prep layout ------------------------------ */

/**
 * prep food recipe card — make-ahead prep recipe.
 *
 * Layout (top to bottom):
 *   1. Purple title band with the product name.
 *   2. A short intro line ('Gather all ingredients before beginning
 *      recipe.') and, if present, an Equipment line (muted).
 *   3. A right-aligned meta stack: Yield (bold), Shelf life, Holding —
 *      as they appear top-right on the page.
 *   4. Ingredient table: two columns Ingredient | Amount with a
 *      purple/tinted header row, rows grouped by component.group with a
 *      small 'Step 1', 'Step 2'… subheading before each group.
 *   5. Procedure: the 'WASH YOUR HANDS…' line, then the steps as •
 *      bullets in a right-hand column (mirrors the page's two-column
 *      ingredients-left / procedure-right layout when space allows;
 *      stacks on mobile).
 *   6. Quality Identifiers as a ✓ checklist, plus Line utensil,
 *      Storage/Hold temps as small labeled badges.
 *   7. Footer strip — confidential notice + station name.
 */
function PrepFoodRecipeCard({
  item,
  food,
  accentStyle,
}: {
  item: LibraryItem;
  food: FoodRecipe;
  accentStyle?: CSSProperties;
}): ReactElement {
  const { ungrouped, grouped } = groupComponents(food.components);
  const hasIngredients = ungrouped.length > 0 || grouped.length > 0;
  const hasSteps = food.steps.length > 0;
  const hasQualityGroups =
    food.qualityGroups != null && food.qualityGroups.length > 0;
  const hasQuality = hasQualityGroups || food.qualityIdentifiers.length > 0;
  const hasEquipment =
    food.equipment != null && food.equipment.trim().length > 0;

  // Multi-batch detection — a prep recipe is multi-batch when any
  // component carries a non-empty `amounts` array (all components share
  // the same ordered size labels, e.g. 1x, ½x). Reuses the existing
  // isMultiSizeRecipe helper (already used by the Build Card). When
  // multi-batch, a segmented size selector renders in the title band
  // (desktop right side, phone full-width under the band) reusing the
  // EXACT build-card .build-card-size-picker / .build-card-size-btn /
  // .build-card-size-btn.on / .build-card-phone-size-picker CSS classes
  // so the two cards feel identical. Single-batch prep (no amounts)
  // renders EXACTLY as today — no selector, one amount per ingredient,
  // single Yield badge from yieldText.
  const multiBatch = isMultiSizeRecipe(food);
  const sizeLabels = multiBatch ? getSizeLabels(food) : [];
  const [selectedSize, setSelectedSize] = useState<string | null>(
    multiBatch && sizeLabels.length > 0 ? sizeLabels[0] : null,
  );
  // The yield value for the active size. resolveYieldForSize falls back
  // to food.yieldText when yields is empty or no entry matches, so
  // single-batch prep keeps its existing yieldText badge unchanged.
  const activeYield = resolveYieldForSize(food, selectedSize);

  // Meta stack — Yield (bold), Shelf life, Holding. Only render rows for
  // fields that are non-null and non-empty (after trim). The Yield row
  // uses the size-resolved activeYield so it updates together with the
  // selector (multi-batch); single-batch activeYield === food.yieldText.
  const metaRows: { label: string; value: string; yield?: boolean }[] = [];
  if (activeYield != null && activeYield.trim().length > 0) {
    metaRows.push({ label: "Yield", value: activeYield, yield: true });
  }
  if (food.shelfLife != null && food.shelfLife.trim().length > 0) {
    metaRows.push({ label: "Shelf life", value: food.shelfLife });
  }
  if (food.holdTemp != null && food.holdTemp.trim().length > 0) {
    metaRows.push({ label: "Holding", value: food.holdTemp });
  }

  // Footer badges — Line utensil, Storage, Hold temp. Only render badges
  // for fields that are non-null and non-empty (after trim). Yield/Shelf
  // life are already in the meta stack, so the badges carry the
  // operational details (utensil + temps).
  const badges: { label: string; value: string }[] = [];
  if (food.lineUtensil != null && food.lineUtensil.trim().length > 0) {
    badges.push({ label: "Line utensil", value: food.lineUtensil });
  }
  if (food.storeTemp != null && food.storeTemp.trim().length > 0) {
    badges.push({ label: "Storage", value: food.storeTemp });
  }
  if (food.holdTemp != null && food.holdTemp.trim().length > 0) {
    badges.push({ label: "Hold temp", value: food.holdTemp });
  }

  // The two-column split only applies when there is a procedure column
  // to sit beside the ingredient table. When there is no procedure the
  // ingredient table spans full width.
  const isSplit = hasSteps && hasIngredients;

  return (
    <article
      className="food-recipe-card mt-4 flex flex-col"
      style={accentStyle}
      data-ocid="library.item.food_recipe_card.prep"
    >
      {/* ── Desktop layout (>=1024px) — preserved byte-for-byte. ── */}
      <div
        className="food-recipe-desktop"
        data-ocid="library.item.food_recipe.desktop.prep"
      >
        <PrepTitleBand
          title={item.title}
          multiBatch={multiBatch}
          sizeLabels={sizeLabels}
          selectedSize={selectedSize}
          onSelectSize={setSelectedSize}
        />

        {/* Intro line + optional equipment line. */}
        <p
          className="food-recipe-intro"
          data-ocid="library.item.food_recipe.intro"
        >
          Gather all ingredients before beginning recipe.
        </p>
        {hasEquipment ? (
          <p
            className="food-recipe-equipment"
            data-ocid="library.item.food_recipe.equipment"
          >
            <span className="label">Equipment: </span>
            {food.equipment}
          </p>
        ) : null}

        {/* Right-aligned meta stack — Yield (bold), Shelf life, Holding. */}
        {metaRows.length > 0 ? (
          <div
            className="food-recipe-meta"
            data-ocid="library.item.food_recipe.prep_meta"
          >
            {metaRows.map((row, i) => (
              <div
                key={`meta-${row.label}-${i}`}
                className={`row ${row.yield ? "is-yield" : ""}`}
                data-ocid={`library.item.food_recipe.prep_meta.row.${i + 1}`}
              >
                <span className="label">{row.label}</span>
                <span className="value">{row.value}</span>
              </div>
            ))}
          </div>
        ) : null}

        <RecipeNote notes={item.notes} />

        {/* Ingredient table + Procedure two-column body. */}
        {hasIngredients || hasSteps ? (
          <div
            className={`food-recipe-body ${isSplit ? "is-split" : ""}`}
            data-ocid="library.item.food_recipe.prep_body"
          >
            {/* LEFT — Ingredient | Amount table. */}
            {hasIngredients ? (
              <section
                className="food-recipe-column"
                data-ocid="library.item.food_recipe.ingredients"
              >
                <div
                  className="food-recipe-ingredient-header"
                  data-ocid="library.item.food_recipe.ingredients.header"
                >
                  <span data-ocid="library.item.food_recipe.ingredients.header.ingredient">
                    Ingredient
                  </span>
                  <span
                    className="amount"
                    data-ocid="library.item.food_recipe.ingredients.header.amount"
                  >
                    Amount
                  </span>
                </div>

                {ungrouped.length > 0 ? (
                  <div
                    className="food-recipe-ingredient-rows"
                    data-ocid="library.item.food_recipe.ingredients.ungrouped"
                  >
                    {ungrouped.map((c, i) => (
                      <ComponentRow
                        // biome-ignore lint/suspicious/noArrayIndexKey: ordered recipe list with no stable id; duplicate step/component strings can collide, index is the stable key
                        key={`u-${i}`}
                        component={c}
                        index={i}
                        amount={
                          multiBatch
                            ? resolveAmountForSize(c, selectedSize)
                            : undefined
                        }
                      />
                    ))}
                  </div>
                ) : null}

                {grouped.map((group, gi) => (
                  <div
                    // biome-ignore lint/suspicious/noArrayIndexKey: ordered recipe list with no stable id; duplicate step/component strings can collide, index is the stable key
                    key={`g-${gi}`}
                    data-ocid={`library.item.food_recipe.ingredients.group.${gi + 1}`}
                  >
                    <p
                      className="food-recipe-step-label"
                      data-ocid={`library.item.food_recipe.ingredients.group_label.${gi + 1}`}
                    >
                      {group.label}
                    </p>
                    <div
                      className="food-recipe-ingredient-rows"
                      data-ocid={`library.item.food_recipe.ingredients.group_rows.${gi + 1}`}
                    >
                      {group.components.map((c, i) => (
                        <ComponentRow
                          // biome-ignore lint/suspicious/noArrayIndexKey: ordered recipe list with no stable id; duplicate step/component strings can collide, index is the stable key
                          key={`g-${gi}-c-${i}`}
                          component={c}
                          index={i}
                          amount={
                            multiBatch
                              ? resolveAmountForSize(c, selectedSize)
                              : undefined
                          }
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </section>
            ) : null}

            {/* RIGHT — Procedure. WASH YOUR HANDS heading, then steps as
                • bullets. */}
            {hasSteps ? (
              <section
                className="food-recipe-column"
                data-ocid="library.item.food_recipe.procedure"
              >
                <h2
                  className="food-recipe-procedure-heading"
                  data-ocid="library.item.food_recipe.procedure.heading"
                >
                  Wash your hands and put on new gloves before beginning
                </h2>
                {food.stepGroups != null && food.stepGroups.length > 0 ? (
                  <div data-ocid="library.item.food_recipe.procedure.groups">
                    {food.stepGroups.map((group, gi) => (
                      <div
                        // biome-ignore lint/suspicious/noArrayIndexKey: ordered recipe list with no stable id; duplicate step/component strings can collide, index is the stable key
                        key={`sg-${gi}`}
                        data-ocid={`library.item.food_recipe.procedure.group.${gi + 1}`}
                      >
                        {group.title != null &&
                        group.title.trim().length > 0 ? (
                          <div
                            className="food-recipe-step-group-header"
                            data-ocid={`library.item.food_recipe.procedure.group.${gi + 1}.heading`}
                          >
                            {group.title}
                          </div>
                        ) : null}
                        <ol
                          className="food-recipe-steps"
                          data-ocid={`library.item.food_recipe.procedure.group.${gi + 1}.list`}
                        >
                          {group.steps.map((step, si) => (
                            <li
                              // biome-ignore lint/suspicious/noArrayIndexKey: ordered recipe list with no stable id; duplicate step/component strings can collide, index is the stable key
                              key={`sg-${gi}-step-${si}`}
                              data-ocid={`library.item.food_recipe.procedure.group.${gi + 1}.step.${si + 1}`}
                            >
                              {renderInlineMarkdown(step)}
                            </li>
                          ))}
                        </ol>
                      </div>
                    ))}
                  </div>
                ) : (
                  <ol
                    className="food-recipe-steps"
                    data-ocid="library.item.food_recipe.procedure.list"
                  >
                    {food.steps.map((step, i) => (
                      <li
                        // biome-ignore lint/suspicious/noArrayIndexKey: ordered recipe list with no stable id; duplicate step/component strings can collide, index is the stable key
                        key={`proc-${i}`}
                        data-ocid={`library.item.food_recipe.procedure.step.${i + 1}`}
                      >
                        {renderInlineMarkdown(step)}
                      </li>
                    ))}
                  </ol>
                )}

                {/* Diagram — the reference the Roadie checks while cutting.
                    Rendered in the right/procedure column after the step
                    sections; shows nothing when item.photo is null/empty. */}
                <RecipeDiagram photo={item.photo} title={item.title} />
              </section>
            ) : null}
          </div>
        ) : null}

        {/* Quality Identifiers checklist. */}
        {hasQuality ? (
          <section
            className="food-recipe-column"
            data-ocid="library.item.food_recipe.quality"
          >
            <h2
              className="food-recipe-procedure-heading"
              data-ocid="library.item.food_recipe.quality.heading"
            >
              Quality Identifiers
            </h2>
            {hasQualityGroups ? (
              <div data-ocid="library.item.food_recipe.quality.groups">
                {food.qualityGroups!.map((group, gi) => (
                  <div
                    // biome-ignore lint/suspicious/noArrayIndexKey: ordered recipe list with no stable id; duplicate group/quality strings can collide, index is the stable key
                    key={`qg-${gi}`}
                    data-ocid={`library.item.food_recipe.quality.group.${gi + 1}`}
                  >
                    {group.title != null && group.title.trim().length > 0 ? (
                      <div
                        className="food-recipe-step-group-header"
                        data-ocid={`library.item.food_recipe.quality.group.${gi + 1}.heading`}
                      >
                        {group.title}
                      </div>
                    ) : null}
                    <ul
                      className="food-recipe-quality"
                      data-ocid={`library.item.food_recipe.quality.group.${gi + 1}.list`}
                    >
                      {group.items.map((qi, ii) => (
                        <li
                          // biome-ignore lint/suspicious/noArrayIndexKey: ordered recipe list with no stable id; duplicate quality strings can collide, index is the stable key
                          key={`qg-${gi}-item-${ii}`}
                          data-ocid={`library.item.food_recipe.quality.group.${gi + 1}.item.${ii + 1}`}
                        >
                          {renderInlineMarkdown(qi)}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <ul
                className="food-recipe-quality"
                data-ocid="library.item.food_recipe.quality.list"
              >
                {food.qualityIdentifiers.map((qi, i) => (
                  <li
                    // biome-ignore lint/suspicious/noArrayIndexKey: ordered recipe list with no stable id; duplicate step/component strings can collide, index is the stable key
                    key={`qi-${i}`}
                    data-ocid={`library.item.food_recipe.quality.item.${i + 1}`}
                  >
                    {renderInlineMarkdown(qi)}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        {/* Bubba's Why's Q&A panel — after quality identifiers, before
            the footer badges. Omitted entirely when whys is empty. */}
        {food.whys != null && food.whys.length > 0 ? (
          <section
            className="food-recipe-whys"
            data-ocid="library.item.food_recipe.whys"
          >
            <h2
              className="food-recipe-whys-heading"
              data-ocid="library.item.food_recipe.whys.heading"
            >
              Bubba's Why's
            </h2>
            {food.whys.map((why, i) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: ordered recipe list with no stable id; duplicate step/component strings can collide, index is the stable key
                key={`why-${i}`}
                className="food-recipe-whys-entry"
                data-ocid={`library.item.food_recipe.whys.entry.${i + 1}`}
              >
                <span
                  className="food-recipe-whys-question"
                  data-ocid={`library.item.food_recipe.whys.entry.${i + 1}.question`}
                >
                  {why.question}
                </span>
                <span
                  className="food-recipe-whys-answer"
                  data-ocid={`library.item.food_recipe.whys.entry.${i + 1}.answer`}
                >
                  {why.answer}
                </span>
              </div>
            ))}
          </section>
        ) : null}

        {/* Line utensil / Storage / Hold temp badges. */}
        {badges.length > 0 ? (
          <div
            className="food-recipe-badges"
            data-ocid="library.item.food_recipe.prep_badges"
          >
            {badges.map((badge, i) => (
              <span
                key={`badge-${badge.label}-${i}`}
                className="food-recipe-badge"
                data-ocid={`library.item.food_recipe.prep_badge.${i + 1}`}
              >
                <span className="label">{badge.label}</span>
                <span className="value">{badge.value}</span>
              </span>
            ))}
          </div>
        ) : null}

        <RecipeFooter station={food.station} />
      </div>

      {/* ── Phone layout (<1024px, tuned for ~375px) — single-column
            stack: title band → yield/shelf meta as stacked badges →
            step-grouped Ingredient/Amount stacked list (amount as chip)
            → procedure steps → quality-ID checklist → badges → footer. ── */}
      <div
        className="food-recipe-phone"
        data-ocid="library.item.food_recipe.phone.prep"
      >
        <PrepTitleBand
          title={item.title}
          multiBatch={multiBatch}
          sizeLabels={sizeLabels}
          selectedSize={selectedSize}
          onSelectSize={setSelectedSize}
          phone
        />

        <p
          className="food-recipe-phone-intro"
          data-ocid="library.item.food_recipe.phone.intro"
        >
          Gather all ingredients before beginning recipe.
        </p>
        {hasEquipment ? (
          <p
            className="food-recipe-phone-equipment"
            data-ocid="library.item.food_recipe.phone.equipment"
          >
            <span className="label">Equipment: </span>
            {food.equipment}
          </p>
        ) : null}

        {/* Yield / Shelf life / Holding as stacked badges. */}
        {metaRows.length > 0 ? (
          <div
            className="food-recipe-phone-meta"
            data-ocid="library.item.food_recipe.phone.prep_meta"
          >
            {metaRows.map((row, i) => (
              <span
                key={`p-meta-${row.label}-${i}`}
                className={`food-recipe-phone-meta-badge ${row.yield ? "is-yield" : ""}`}
                data-ocid={`library.item.food_recipe.phone.prep_meta.row.${i + 1}`}
              >
                <span className="label">{row.label}</span>
                <span className="value">{row.value}</span>
              </span>
            ))}
          </div>
        ) : null}

        <RecipeNote notes={item.notes} phone />

        {/* Step-grouped Ingredient | Amount stacked list. */}
        {hasIngredients ? (
          <section
            className="food-recipe-phone-ingredients"
            data-ocid="library.item.food_recipe.phone.ingredients"
          >
            <p
              className="food-recipe-phone-section-label"
              data-ocid="library.item.food_recipe.phone.ingredients.heading"
            >
              Ingredients
            </p>

            {ungrouped.length > 0 ? (
              <div
                className="food-recipe-phone-ingredient-group"
                data-ocid="library.item.food_recipe.phone.ingredients.ungrouped"
              >
                {ungrouped.map((c, i) => (
                  <PhoneAmountRow
                    // biome-ignore lint/suspicious/noArrayIndexKey: ordered recipe list with no stable id; duplicate step/component strings can collide, index is the stable key
                    key={`p-u-${i}`}
                    item={c.item}
                    amount={
                      multiBatch
                        ? resolveAmountForSize(c, selectedSize)
                        : c.amount
                    }
                    note={c.note ?? ""}
                    index={i}
                    ocidPrefix="library.item.food_recipe.phone.ingredients.ungrouped.row"
                  />
                ))}
              </div>
            ) : null}

            {grouped.map((group, gi) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: ordered recipe list with no stable id; duplicate step/component strings can collide, index is the stable key
                key={`p-g-${gi}`}
                className="food-recipe-phone-ingredient-group"
                data-ocid={`library.item.food_recipe.phone.ingredients.group.${gi + 1}`}
              >
                <p
                  className="food-recipe-phone-step-label"
                  data-ocid={`library.item.food_recipe.phone.ingredients.group_label.${gi + 1}`}
                >
                  {group.label}
                </p>
                {group.components.map((c, i) => (
                  <PhoneAmountRow
                    // biome-ignore lint/suspicious/noArrayIndexKey: ordered recipe list with no stable id; duplicate step/component strings can collide, index is the stable key
                    key={`p-g-${gi}-c-${i}`}
                    item={c.item}
                    amount={
                      multiBatch
                        ? resolveAmountForSize(c, selectedSize)
                        : c.amount
                    }
                    note={c.note ?? ""}
                    index={i}
                    ocidPrefix={`library.item.food_recipe.phone.ingredients.group_rows.${gi + 1}.row`}
                  />
                ))}
              </div>
            ))}
          </section>
        ) : null}

        {/* Procedure steps. */}
        {hasSteps ? (
          <section
            className="food-recipe-phone-procedure"
            data-ocid="library.item.food_recipe.phone.procedure"
          >
            <h2
              className="food-recipe-phone-procedure-heading"
              data-ocid="library.item.food_recipe.phone.procedure.heading"
            >
              Wash your hands and put on new gloves before beginning
            </h2>
            {food.stepGroups != null && food.stepGroups.length > 0 ? (
              <div data-ocid="library.item.food_recipe.phone.procedure.groups">
                {food.stepGroups.map((group, gi) => (
                  <div
                    // biome-ignore lint/suspicious/noArrayIndexKey: ordered recipe list with no stable id; duplicate step/component strings can collide, index is the stable key
                    key={`p-sg-${gi}`}
                    data-ocid={`library.item.food_recipe.phone.procedure.group.${gi + 1}`}
                  >
                    {group.title != null && group.title.trim().length > 0 ? (
                      <div
                        className="food-recipe-phone-step-group-header"
                        data-ocid={`library.item.food_recipe.phone.procedure.group.${gi + 1}.heading`}
                      >
                        {group.title}
                      </div>
                    ) : null}
                    <ol
                      className="food-recipe-phone-steps"
                      data-ocid={`library.item.food_recipe.phone.procedure.group.${gi + 1}.list`}
                    >
                      {group.steps.map((step, si) => (
                        <li
                          // biome-ignore lint/suspicious/noArrayIndexKey: ordered recipe list with no stable id; duplicate step/component strings can collide, index is the stable key
                          key={`p-sg-${gi}-step-${si}`}
                          data-ocid={`library.item.food_recipe.phone.procedure.group.${gi + 1}.step.${si + 1}`}
                        >
                          {renderInlineMarkdown(step)}
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            ) : (
              <ol
                className="food-recipe-phone-steps"
                data-ocid="library.item.food_recipe.phone.procedure.list"
              >
                {food.steps.map((step, i) => (
                  <li
                    // biome-ignore lint/suspicious/noArrayIndexKey: ordered recipe list with no stable id; duplicate step/component strings can collide, index is the stable key
                    key={`p-proc-${i}`}
                    data-ocid={`library.item.food_recipe.phone.procedure.step.${i + 1}`}
                  >
                    {renderInlineMarkdown(step)}
                  </li>
                ))}
              </ol>
            )}

            {/* Diagram — the reference the Roadie checks while cutting.
                Stacks full-width under the phone steps; shows nothing when
                item.photo is null/empty. */}
            <RecipeDiagram photo={item.photo} title={item.title} phone />
          </section>
        ) : null}

        {/* Quality Identifiers checklist. */}
        {hasQuality ? (
          <section
            className="food-recipe-phone-quality"
            data-ocid="library.item.food_recipe.phone.quality"
          >
            <h2
              className="food-recipe-phone-procedure-heading"
              data-ocid="library.item.food_recipe.phone.quality.heading"
            >
              Quality Identifiers
            </h2>
            {hasQualityGroups ? (
              <div data-ocid="library.item.food_recipe.phone.quality.groups">
                {food.qualityGroups!.map((group, gi) => (
                  <div
                    // biome-ignore lint/suspicious/noArrayIndexKey: ordered recipe list with no stable id; duplicate group/quality strings can collide, index is the stable key
                    key={`p-qg-${gi}`}
                    data-ocid={`library.item.food_recipe.phone.quality.group.${gi + 1}`}
                  >
                    {group.title != null && group.title.trim().length > 0 ? (
                      <div
                        className="food-recipe-phone-step-group-header"
                        data-ocid={`library.item.food_recipe.phone.quality.group.${gi + 1}.heading`}
                      >
                        {group.title}
                      </div>
                    ) : null}
                    <ul
                      className="food-recipe-phone-quality-list"
                      data-ocid={`library.item.food_recipe.phone.quality.group.${gi + 1}.list`}
                    >
                      {group.items.map((qi, ii) => (
                        <li
                          // biome-ignore lint/suspicious/noArrayIndexKey: ordered recipe list with no stable id; duplicate quality strings can collide, index is the stable key
                          key={`p-qg-${gi}-item-${ii}`}
                          data-ocid={`library.item.food_recipe.phone.quality.group.${gi + 1}.item.${ii + 1}`}
                        >
                          {renderInlineMarkdown(qi)}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <ul
                className="food-recipe-phone-quality-list"
                data-ocid="library.item.food_recipe.phone.quality.list"
              >
                {food.qualityIdentifiers.map((qi, i) => (
                  <li
                    // biome-ignore lint/suspicious/noArrayIndexKey: ordered recipe list with no stable id; duplicate step/component strings can collide, index is the stable key
                    key={`p-qi-${i}`}
                    data-ocid={`library.item.food_recipe.phone.quality.item.${i + 1}`}
                  >
                    {renderInlineMarkdown(qi)}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        {/* Bubba's Why's Q&A panel — phone variant, after phone quality
            identifiers, before phone footer badges. Omitted when empty. */}
        {food.whys != null && food.whys.length > 0 ? (
          <section
            className="food-recipe-phone-whys"
            data-ocid="library.item.food_recipe.phone.whys"
          >
            <h2
              className="food-recipe-phone-whys-heading"
              data-ocid="library.item.food_recipe.phone.whys.heading"
            >
              Bubba's Why's
            </h2>
            {food.whys.map((why, i) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: ordered recipe list with no stable id; duplicate step/component strings can collide, index is the stable key
                key={`p-why-${i}`}
                className="food-recipe-phone-whys-entry"
                data-ocid={`library.item.food_recipe.phone.whys.entry.${i + 1}`}
              >
                <span
                  className="food-recipe-phone-whys-question"
                  data-ocid={`library.item.food_recipe.phone.whys.entry.${i + 1}.question`}
                >
                  {why.question}
                </span>
                <span
                  className="food-recipe-phone-whys-answer"
                  data-ocid={`library.item.food_recipe.phone.whys.entry.${i + 1}.answer`}
                >
                  {why.answer}
                </span>
              </div>
            ))}
          </section>
        ) : null}

        {/* Line utensil / Storage / Hold temp badges. */}
        {badges.length > 0 ? (
          <div
            className="food-recipe-phone-badges"
            data-ocid="library.item.food_recipe.phone.prep_badges"
          >
            {badges.map((badge, i) => (
              <span
                key={`p-badge-${badge.label}-${i}`}
                className="food-recipe-phone-badge"
                data-ocid={`library.item.food_recipe.phone.prep_badge.${i + 1}`}
              >
                <span className="label">{badge.label}</span>
                <span className="value">{badge.value}</span>
              </span>
            ))}
          </div>
        ) : null}

        <RecipeFooter station={food.station} />
      </div>
    </article>
  );
}

/* ------------------------------ Table rows ------------------------------- */

/**
 * A single serviceware row in the Plating group of the Assembly column.
 * Reuses the .food-recipe-row utility (item left with a ■ bullet, amount
 * right-aligned). Serviceware has no `note` field, so the row is just
 * item + amount.
 */
function ServicewareRow({
  sw,
  index,
}: {
  sw: FoodServiceware;
  index: number;
}): ReactElement {
  return (
    <div
      className="food-recipe-row"
      data-ocid={`library.item.food_recipe.plating.row.${index + 1}`}
    >
      <span className="item">{sw.item}</span>
      <span className="amount">{sw.amount}</span>
    </div>
  );
}

/**
 * A single component row in the Assembly / Ingredients table. Reuses
 * the .food-recipe-row utility. When the component carries a non-null
 * `note`, the note renders as a muted sub-line under the component name
 * so it does not break the two-column amount alignment.
 *
 * Multi-batch amount override: when `amount` is provided (non-undefined),
 * the row renders that amount as a build-card amount chip
 * (.build-card-amount-chip — the pale blue pill the Build Card uses) in
 * the amount column instead of the scalar `component.amount`. This keeps
 * multi-batch prep ingredient amounts visually identical to the Build
 * Card's per-size amount chips. When `amount` is undefined (single-batch
 * prep, or any caller that does not pass an override), the row falls back
 * to `component.amount` rendered as the existing right-aligned text — so
 * single-batch prep is unchanged.
 */
function ComponentRow({
  component,
  index,
  amount,
}: {
  component: FoodComponent;
  index: number;
  amount?: string;
}): ReactElement {
  const hasNote = component.note != null && component.note.trim().length > 0;
  // When an explicit amount override is passed (multi-batch), use it;
  // otherwise fall back to the scalar component.amount (single-batch).
  const displayAmount = amount ?? component.amount;
  const useChip = amount !== undefined;
  return (
    <div
      className="food-recipe-row"
      data-ocid={`library.item.food_recipe.component.row.${index + 1}`}
    >
      <span className="item">
        <span>{renderInlineMarkdown(component.item)}</span>
        {hasNote ? <span className="item-note">{component.note}</span> : null}
      </span>
      {useChip ? (
        <span
          className="build-card-amount-chip"
          data-ocid={`library.item.food_recipe.component.row.${index + 1}.amount`}
        >
          {renderInlineMarkdown(displayAmount)}
        </span>
      ) : (
        <span className="amount">{renderInlineMarkdown(displayAmount)}</span>
      )}
    </div>
  );
}

/* ------------------------------ Phone rows ------------------------------- */

/**
 * Phone amount row — item name on the left with its amount as a bold
 * chip/pill on the right. The amount pill wraps to its own line if it
 * is long, so amounts stay scannable and never truncate. Used by both
 * the menuBuild build list (serviceware + components) and the prep
 * ingredient list. Tap target >=44px.
 */
function PhoneAmountRow({
  item,
  amount,
  note,
  index,
  ocidPrefix,
}: {
  item: string;
  amount: string;
  note?: string;
  index: number;
  ocidPrefix: string;
}): ReactElement {
  const hasNote = note != null && note.trim().length > 0;
  return (
    <div
      className="food-recipe-phone-row"
      data-ocid={`${ocidPrefix}.${index + 1}`}
    >
      <span className="item">
        <span>{renderInlineMarkdown(item)}</span>
        {hasNote ? <span className="item-note">{note}</span> : null}
      </span>
      {amount.trim().length > 0 ? (
        <span className="amount-pill">{renderInlineMarkdown(amount)}</span>
      ) : null}
    </div>
  );
}

/* ------------------------------ Hand-wash note --------------------------- */

/**
 * Hand-wash / glove note — small muted line at the top of the Procedure
 * column with a hand-wash icon. Mirrors the Lake Charles Quik Reference
 * recipe book 'Wash hands and put on new gloves before: • Starting work
 * • Handling food for guests with food allergies • Returning from
 * another station' line.
 */
function HandWashNote(): ReactElement {
  return (
    <p
      className="food-recipe-handwash"
      data-ocid="library.item.food_recipe.handwash"
    >
      <Hand className="size-4" aria-hidden />
      <span>
        Wash hands and put on new gloves before:&nbsp;Starting
        work&nbsp;&bull;&nbsp;Handling food for guests with food
        allergies&nbsp;&bull;&nbsp;Returning from another station
      </span>
    </p>
  );
}

/* --------------------------- Component grouping -------------------------- */

/**
 * Splits a food recipe's components into an ungrouped list (components
 * with a null or blank `group`) and a list of named groups (preserving
 * insertion order). Each grouped entry carries the trimmed group label
 * and the components in that group, in their original array order.
 *
 * Used by the prep layout to render the ingredient table grouped by
 * 'Step 1', 'Step 2'… Components with a null group render first in an
 * ungrouped section (no group label).
 */
function groupComponents(components: FoodComponent[]): {
  ungrouped: FoodComponent[];
  grouped: { label: string; components: FoodComponent[] }[];
} {
  const ungrouped: FoodComponent[] = [];
  const grouped: { label: string; components: FoodComponent[] }[] = [];
  const groupIndex = new Map<string, number>();

  for (const c of components) {
    const rawGroup = c.group;
    if (rawGroup == null || rawGroup.trim().length === 0) {
      ungrouped.push(c);
      continue;
    }
    const label = rawGroup.trim();
    let idx = groupIndex.get(label);
    if (idx === undefined) {
      idx = grouped.length;
      groupIndex.set(label, idx);
      grouped.push({ label, components: [] });
    }
    grouped[idx].components.push(c);
  }

  return { ungrouped, grouped };
}
