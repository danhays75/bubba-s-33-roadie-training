import type {
  FoodComponent,
  FoodRecipe,
  FoodServiceware,
  LibraryItem,
} from "@/types/foundation";
import { UtensilsCrossed } from "lucide-react";
import type { ReactElement } from "react";

/**
 * FoodRecipeCard — the food-recipe item detail view.
 *
 * RecipeCardPage dispatches to this component when `item.foodRecipe` is
 * present (not null), before the beverage recipe / generic card dispatch.
 * The full food recipe payload renders here as a sibling to the beverage
 * RecipeCardPage: same dark roadhouse base, Anton/Oswald/Barlow type, flat
 * fills (no gradients/glow), and the food-* CSS utilities already added to
 * index.css (station badge, EXPO callout, allergen callout, plating
 * divider, components table, build steps, prep meta badges, prep group
 * labels, quality checklist, equipment line).
 *
 * Two layouts based on `foodRecipe.kind`:
 *   - `'menuBuild'` — assembled-to-order menu item. Photo hero, header
 *     (title + station badge + menu-section badge), two-column Components
 *     → Amount table (serviceware first in a subtle 'Plating' group, then
 *     components), numbered Build Steps, EXPO finishing steps in a
 *     purple-red callout, allergen callout at the bottom.
 *   - `'prep'` — make-ahead prep recipe. Photo hero, header (title +
 *     station badge + PREP badge), compact meta row of badges (Yield,
 *     Shelf life, Line utensil, Hold temp, Store temp — only non-null
 *     fields), ingredient table grouped by group ('Step 1', 'Step 2'…),
 *     numbered procedure steps, Quality Identifiers checklist, optional
 *     Equipment line.
 *
 * The card is screen-styled (not the print card) and reuses the existing
 * PhotoButton pattern (window.open) from the beverage RecipeCardPage so
 * tapping the photo opens the full-size image in a new tab. When
 * `item.photo` is null the photo hero is omitted and the card falls back
 * to a no-photo layout.
 *
 * Props:
 *   - item: the LibraryItem with a non-null `foodRecipe`.
 */
export function FoodRecipeCard({ item }: { item: LibraryItem }): ReactElement {
  const food = item.foodRecipe;
  // RecipeCardPage only dispatches here when foodRecipe is non-null, but
  // keep a defensive fallback so the component never crashes on a null
  // payload (e.g. a future caller that bypasses the dispatch).
  if (!food) {
    return (
      <article
        className="mt-4 flex flex-col rounded-md border border-border bg-card px-5 py-6 sm:px-7 sm:py-8"
        data-ocid="library.item.food_recipe_card"
      >
        <h1
          className="font-display text-2xl uppercase tracking-wide text-foreground sm:text-3xl"
          data-ocid="library.item.food_recipe.title"
        >
          {item.title}
        </h1>
      </article>
    );
  }

  return food.kind === "prep" ? (
    <PrepFoodRecipeCard item={item} food={food} />
  ) : (
    <MenuBuildFoodRecipeCard item={item} food={food} />
  );
}

export default FoodRecipeCard;

/* ----------------------------- Station accent ----------------------------- */

/**
 * Maps a kitchen station name to its food-station-* CSS color utility
 * classes. The station accent drives the station badge fill and the
 * station-chip text color. Matching is case-insensitive on a trimmed
 * substring so "Grill", "grill station", and "GRILL" all resolve to the
 * grill accent. Falls back to the brand-primary default accent when the
 * station name does not match a known station.
 *
 * Returns the bg/text/border class triplet for the station accent.
 */
function stationAccentClasses(station: string): {
  bg: string;
  text: string;
  border: string;
} {
  const key = station.trim().toLowerCase();
  // EXPO is checked first because it is also a menu-section concept; the
  // station accent (purple-red) must win when the station is literally EXPO.
  if (key.includes("expo")) {
    return {
      bg: "bg-food-station-expo",
      text: "text-food-station-expo",
      border: "border-food-station-expo",
    };
  }
  if (key.includes("grill")) {
    return {
      bg: "bg-food-station-grill",
      text: "text-food-station-grill",
      border: "border-food-station-grill",
    };
  }
  if (key.includes("fry")) {
    return {
      bg: "bg-food-station-fry",
      text: "text-food-station-fry",
      border: "border-food-station-fry",
    };
  }
  if (key.includes("pizza")) {
    return {
      bg: "bg-food-station-pizza",
      text: "text-food-station-pizza",
      border: "border-food-station-pizza",
    };
  }
  if (key.includes("saute") || key.includes("sauté")) {
    return {
      bg: "bg-food-station-saute",
      text: "text-food-station-saute",
      border: "border-food-station-saute",
    };
  }
  if (key.includes("hot") && key.includes("prep")) {
    return {
      bg: "bg-food-station-hotprep",
      text: "text-food-station-hotprep",
      border: "border-food-station-hotprep",
    };
  }
  if (key.includes("cold") && key.includes("prep")) {
    return {
      bg: "bg-food-station-coldprep",
      text: "text-food-station-coldprep",
      border: "border-food-station-coldprep",
    };
  }
  return {
    bg: "bg-food-station-default",
    text: "text-food-station-default",
    border: "border-food-station-default",
  };
}

/* ------------------------------- Photo hero ------------------------------- */

/**
 * Photo hero — the item photo shown uncompressed/uncropped at the top of
 * the card. Tapping opens the full-size image in a new tab via the same
 * window.open pattern the beverage RecipeCardPage uses (PhotoButton).
 * Renders nothing when `item.photo` is null so the card falls back to a
 * no-photo layout (header directly under the top stripe).
 *
 * Mirrors the beverage card's framed photo treatment: a thin bordered
 * frame on the library-card surface, object-contain so the photo is never
 * cropped, and a focus-visible ring on the tap target.
 */
function FoodPhotoHero({
  photo,
  title,
}: {
  photo: string;
  title: string;
}): ReactElement {
  return (
    <div
      className="overflow-hidden rounded-md border border-border bg-card p-2"
      data-ocid="library.item.food_recipe.photo_hero"
    >
      <button
        type="button"
        onClick={() => window.open(photo, "_blank", "noopener,noreferrer")}
        className="block w-full rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Open full-size photo"
        title="Tap to view full size"
        data-ocid="library.item.food_recipe.photo_button"
      >
        <img
          src={photo}
          alt={title}
          className="block h-auto w-full object-contain"
          loading="lazy"
        />
      </button>
    </div>
  );
}

/* ------------------------------ Card header ------------------------------- */

/**
 * Card header — Anton title, station badge (station-accent fill), and
 * either a menu-section badge (navy, menuBuild) or a PREP badge (navy,
 * prep). The two badges read as different axes: the station badge says
 * where the recipe is made, the section/PREP badge says what kind of
 * recipe it is.
 *
 * The station badge uses the food-station-* accent classes derived from
 * the station name so each kitchen station gets its own color. The
 * menu-section / PREP badge uses the food-section-badge utility (navy
 * fill, cream text) so it stays distinct from the station accent.
 */
function FoodCardHeader({
  title,
  station,
  accent,
  sectionBadge,
  sectionBadgeLabel,
}: {
  title: string;
  station: string;
  accent: { bg: string; text: string; border: string };
  sectionBadge: "menuSection" | "prep";
  sectionBadgeLabel: string;
}): ReactElement {
  return (
    <header
      className="flex flex-wrap items-center gap-3"
      data-ocid="library.item.food_recipe.header"
    >
      <h1
        className="font-display text-2xl uppercase tracking-wide text-foreground sm:text-3xl"
        data-ocid="library.item.food_recipe.title"
      >
        {title}
      </h1>

      {station.length > 0 ? (
        <span
          className={`food-station-badge ${accent.bg} ${
            // fry + coldprep have dark foregrounds per their -fg tokens; the
            // remaining stations use cream. We approximate by using the
            // station's own text utility for the badge text color so the
            // badge stays readable on its accent fill.
            accent.text
          }`}
          data-ocid="library.item.food_recipe.station_badge"
        >
          <UtensilsCrossed className="size-3.5" aria-hidden />
          {station}
        </span>
      ) : null}

      <span
        className="food-section-badge"
        data-ocid={
          sectionBadge === "prep"
            ? "library.item.food_recipe.prep_badge"
            : "library.item.food_recipe.section_badge"
        }
      >
        {sectionBadgeLabel}
      </span>
    </header>
  );
}

/* --------------------------- menuBuild layout ----------------------------- */

/**
 * menuBuild food recipe card — assembled-to-order menu item.
 *
 * Layout: photo hero → header (title + station badge + menu-section badge)
 * → two-column Components → Amount table (serviceware first in a subtle
 * 'Plating' group with a dashed divider, then components) → numbered Build
 * Steps list (red Oswald numerals) → EXPO finishing steps in a highlighted
 * purple-red callout (left edge) → allergen callout at the bottom (muted
 * red).
 */
function MenuBuildFoodRecipeCard({
  item,
  food,
}: {
  item: LibraryItem;
  food: FoodRecipe;
}): ReactElement {
  const accent = stationAccentClasses(food.station);
  const hasServiceware = food.serviceware.length > 0;
  const hasComponents = food.components.length > 0;
  const hasSteps = food.steps.length > 0;
  const hasExpo = food.expoSteps.length > 0;
  const hasAllergen =
    food.allergenNote != null && food.allergenNote.trim().length > 0;
  const sectionLabel =
    food.menuSection != null && food.menuSection.trim().length > 0
      ? food.menuSection
      : "Menu";

  return (
    <article
      className="mt-4 flex flex-col rounded-md border border-border bg-library-card px-5 py-6 sm:px-7 sm:py-8"
      data-ocid="library.item.food_recipe_card.menu_build"
    >
      {item.photo ? (
        <FoodPhotoHero photo={item.photo} title={item.title} />
      ) : null}

      <div
        className="mt-4"
        data-ocid="library.item.food_recipe.menu_build_header"
      >
        <FoodCardHeader
          title={item.title}
          station={food.station}
          accent={accent}
          sectionBadge="menuSection"
          sectionBadgeLabel={sectionLabel}
        />
      </div>

      {/* Components → Amount table. Serviceware listed first in a subtle
          'Plating' group (dashed divider), then components. */}
      {hasServiceware || hasComponents ? (
        <section
          className="mt-6"
          data-ocid="library.item.food_recipe.components"
        >
          <h2
            className="font-heading text-sm uppercase tracking-wider text-muted-foreground"
            data-ocid="library.item.food_recipe.components.heading"
          >
            Components
          </h2>

          <div
            className="mt-2"
            data-ocid="library.item.food_recipe.components.table"
          >
            {hasServiceware ? (
              <div data-ocid="library.item.food_recipe.plating_group">
                <p
                  className="food-plating-label pt-2"
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

            {hasServiceware && hasComponents ? (
              <div
                className="food-plating-rule my-2"
                aria-hidden
                data-ocid="library.item.food_recipe.plating_divider"
              />
            ) : null}

            {hasComponents ? (
              <div data-ocid="library.item.food_recipe.components_group">
                {food.components.map((c, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: ordered recipe list with no stable id; duplicate step/component strings can collide, index is the stable key
                  <ComponentRow key={`c-${i}`} component={c} index={i} />
                ))}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* Numbered Build Steps list (red Oswald numerals). */}
      {hasSteps ? (
        <section
          className="mt-6"
          data-ocid="library.item.food_recipe.build_steps"
        >
          <h2
            className="font-heading text-sm uppercase tracking-wider text-muted-foreground"
            data-ocid="library.item.food_recipe.build_steps.heading"
          >
            Build Steps
          </h2>
          <ol
            className="food-build-steps mt-2"
            data-ocid="library.item.food_recipe.build_steps.list"
          >
            {food.steps.map((step, i) => (
              <li
                // biome-ignore lint/suspicious/noArrayIndexKey: ordered recipe list with no stable id; duplicate step/component strings can collide, index is the stable key
                key={`step-${i}`}
                data-ocid={`library.item.food_recipe.build_steps.step.${i + 1}`}
              >
                {step}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {/* EXPO finishing steps — highlighted purple-red callout, left edge. */}
      {hasExpo ? (
        <section
          className="food-expo-callout animate-food-expo-pop mt-6"
          data-ocid="library.item.food_recipe.expo"
        >
          <p
            className="food-expo-callout-label"
            data-ocid="library.item.food_recipe.expo.label"
          >
            EXPO Finishing
          </p>
          <ol
            className="food-build-steps mt-2"
            data-ocid="library.item.food_recipe.expo.list"
          >
            {food.expoSteps.map((step, i) => (
              <li
                // biome-ignore lint/suspicious/noArrayIndexKey: ordered recipe list with no stable id; duplicate step/component strings can collide, index is the stable key
                key={`expo-${i}`}
                data-ocid={`library.item.food_recipe.expo.step.${i + 1}`}
              >
                {step}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {/* Allergen callout — muted red, bottom of the card. */}
      {hasAllergen ? (
        <section
          className="food-allergen-callout mt-6"
          data-ocid="library.item.food_recipe.allergen"
        >
          <p
            className="food-allergen-callout-label"
            data-ocid="library.item.food_recipe.allergen.label"
          >
            Allergen Note
          </p>
          <p
            className="mt-1 font-body text-sm leading-relaxed"
            data-ocid="library.item.food_recipe.allergen.text"
          >
            {food.allergenNote}
          </p>
        </section>
      ) : null}
    </article>
  );
}

/* ------------------------------ prep layout ------------------------------- */

/**
 * prep food recipe card — make-ahead prep recipe.
 *
 * Layout: photo hero → header (title + station badge + PREP badge) →
 * compact meta row of badges (Yield, Shelf life, Line utensil, Hold temp,
 * Store temp — only non-null fields) → ingredient table grouped by group
 * ('Step 1', 'Step 2'…; components with null group go in an ungrouped
 * section) → numbered procedure steps → Quality Identifiers checklist
 * with check bullets → optional Equipment line (only if equipment non-null).
 */
function PrepFoodRecipeCard({
  item,
  food,
}: {
  item: LibraryItem;
  food: FoodRecipe;
}): ReactElement {
  const accent = stationAccentClasses(food.station);

  // Meta badges — only render badges for fields that are non-null and
  // non-empty (after trim). Order matches the dispatch: Yield, Shelf
  // life, Line utensil, Hold temp, Store temp.
  const metaBadges: { label: string; value: string }[] = [];
  if (food.yieldText != null && food.yieldText.trim().length > 0) {
    metaBadges.push({ label: "Yield", value: food.yieldText });
  }
  if (food.shelfLife != null && food.shelfLife.trim().length > 0) {
    metaBadges.push({ label: "Shelf Life", value: food.shelfLife });
  }
  if (food.lineUtensil != null && food.lineUtensil.trim().length > 0) {
    metaBadges.push({ label: "Line Utensil", value: food.lineUtensil });
  }
  if (food.holdTemp != null && food.holdTemp.trim().length > 0) {
    metaBadges.push({ label: "Hold Temp", value: food.holdTemp });
  }
  if (food.storeTemp != null && food.storeTemp.trim().length > 0) {
    metaBadges.push({ label: "Store Temp", value: food.storeTemp });
  }

  // Ingredient table — group components by `group`. Components with a
  // null group go in an ungrouped section (rendered first, no group
  // label). Grouped components render in insertion order under their
  // group label. Preserves the backend's array order within each group.
  const { ungrouped, grouped } = groupComponents(food.components);
  const hasIngredients = ungrouped.length > 0 || grouped.length > 0;
  const hasSteps = food.steps.length > 0;
  const hasQuality = food.qualityIdentifiers.length > 0;
  const hasEquipment =
    food.equipment != null && food.equipment.trim().length > 0;

  return (
    <article
      className="mt-4 flex flex-col rounded-md border border-border bg-library-card px-5 py-6 sm:px-7 sm:py-8"
      data-ocid="library.item.food_recipe_card.prep"
    >
      {item.photo ? (
        <FoodPhotoHero photo={item.photo} title={item.title} />
      ) : null}

      <div className="mt-4" data-ocid="library.item.food_recipe.prep_header">
        <FoodCardHeader
          title={item.title}
          station={food.station}
          accent={accent}
          sectionBadge="prep"
          sectionBadgeLabel="Prep"
        />
      </div>

      {/* Compact meta row of badges. */}
      {metaBadges.length > 0 ? (
        <div
          className="mt-4 flex flex-wrap gap-2"
          data-ocid="library.item.food_recipe.prep_meta"
        >
          {metaBadges.map((badge, i) => (
            <span
              key={`meta-${badge.label}-${i}`}
              className="food-meta-badge"
              data-ocid={`library.item.food_recipe.prep_meta.badge.${i + 1}`}
            >
              <span className="label">{badge.label}</span>
              <span className="value">{badge.value}</span>
            </span>
          ))}
        </div>
      ) : null}

      {/* Ingredient table grouped by group. */}
      {hasIngredients ? (
        <section
          className="mt-6"
          data-ocid="library.item.food_recipe.ingredients"
        >
          <h2
            className="font-heading text-sm uppercase tracking-wider text-muted-foreground"
            data-ocid="library.item.food_recipe.ingredients.heading"
          >
            Ingredients
          </h2>

          <div
            className="mt-2"
            data-ocid="library.item.food_recipe.ingredients.table"
          >
            {ungrouped.length > 0 ? (
              <div data-ocid="library.item.food_recipe.ingredients.ungrouped">
                {ungrouped.map((c, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: ordered recipe list with no stable id; duplicate step/component strings can collide, index is the stable key
                  <ComponentRow key={`u-${i}`} component={c} index={i} />
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
                  className="food-prep-group-label"
                  data-ocid={`library.item.food_recipe.ingredients.group_label.${gi + 1}`}
                >
                  {group.label}
                </p>
                {group.components.map((c, i) => (
                  <ComponentRow
                    // biome-ignore lint/suspicious/noArrayIndexKey: ordered recipe list with no stable id; duplicate step/component strings can collide, index is the stable key
                    key={`g-${gi}-c-${i}`}
                    component={c}
                    index={i}
                  />
                ))}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Numbered procedure steps. */}
      {hasSteps ? (
        <section
          className="mt-6"
          data-ocid="library.item.food_recipe.procedure"
        >
          <h2
            className="font-heading text-sm uppercase tracking-wider text-muted-foreground"
            data-ocid="library.item.food_recipe.procedure.heading"
          >
            Procedure
          </h2>
          <ol
            className="food-build-steps mt-2"
            data-ocid="library.item.food_recipe.procedure.list"
          >
            {food.steps.map((step, i) => (
              <li
                // biome-ignore lint/suspicious/noArrayIndexKey: ordered recipe list with no stable id; duplicate step/component strings can collide, index is the stable key
                key={`proc-${i}`}
                data-ocid={`library.item.food_recipe.procedure.step.${i + 1}`}
              >
                {step}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {/* Quality Identifiers checklist with check bullets. */}
      {hasQuality ? (
        <section className="mt-6" data-ocid="library.item.food_recipe.quality">
          <h2
            className="font-heading text-sm uppercase tracking-wider text-muted-foreground"
            data-ocid="library.item.food_recipe.quality.heading"
          >
            Quality Identifiers
          </h2>
          <ul
            className="food-quality-list mt-2"
            data-ocid="library.item.food_recipe.quality.list"
          >
            {food.qualityIdentifiers.map((qi, i) => (
              <li
                // biome-ignore lint/suspicious/noArrayIndexKey: ordered recipe list with no stable id; duplicate step/component strings can collide, index is the stable key
                key={`qi-${i}`}
                data-ocid={`library.item.food_recipe.quality.item.${i + 1}`}
              >
                {qi}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Optional Equipment line — only if equipment is non-null. */}
      {hasEquipment ? (
        <p
          className="food-equipment-line mt-6"
          data-ocid="library.item.food_recipe.equipment"
        >
          <span className="label">Equipment: </span>
          {food.equipment}
        </p>
      ) : null}
    </article>
  );
}

/* ------------------------------ Table rows ------------------------------- */

/**
 * A single serviceware row in the Plating group of the Components table.
 * Reuses the .food-components-row utility (component left, amount
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
      className="food-components-row"
      data-ocid={`library.item.food_recipe.plating.row.${index + 1}`}
    >
      <span className="component">{sw.item}</span>
      <span className="amount">{sw.amount}</span>
    </div>
  );
}

/**
 * A single component row in the Components / Ingredients table. Reuses
 * the .food-components-row utility. When the component carries a non-null
 * `note`, the note renders as a muted sub-line under the component name
 * so it does not break the two-column amount alignment.
 */
function ComponentRow({
  component,
  index,
}: {
  component: FoodComponent;
  index: number;
}): ReactElement {
  const hasNote = component.note != null && component.note.trim().length > 0;
  return (
    <div
      className="food-components-row"
      data-ocid={`library.item.food_recipe.component.row.${index + 1}`}
    >
      <span className="component flex flex-col">
        <span>{component.item}</span>
        {hasNote ? (
          <span className="font-body text-xs text-muted-foreground">
            {component.note}
          </span>
        ) : null}
      </span>
      <span className="amount">{component.amount}</span>
    </div>
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
