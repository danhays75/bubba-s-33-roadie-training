import { SeasonalBadge } from "@/components/library/SeasonalBadge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCategory, useItem } from "@/hooks/useLibrary";
import type { Recipe, RecipeSpec, RecipeVariant } from "@/types/foundation";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { ReactElement } from "react";

/**
 * Recipe card detail page — the full item view.
 *
 * Rendered by the /position/$id/library/$categoryId/item/$itemId route. Uses
 * useItem(itemId) to fetch the item and renders on a .bg-library-card surface
 * (one step lighter than the page): title in Anton, photo if present, each
 * labeled detail field as a label (Oswald, uppercase, BLUE) + value (Barlow)
 * pair, the notes section (if present), tags as outlined chips, and the
 * SeasonalBadge if seasonal. Breadcrumb links back to the category page.
 *
 * LAYOUT: two-column on desktop (text left, framed photo right). On mobile the
 * columns stack: title + photo first, then the text sections below in a
 * readable single column. Section headers (Glassware, Specs, Assembly,
 * Garnish, Notes) render in BLUE via the existing --secondary token.
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
  const notFound = !isLoading && !item;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <BackToCategory positionId={positionId} categoryId={categoryId} />

      {isLoading ? (
        <RecipeCardSkeleton />
      ) : notFound ? (
        <ItemNotFound positionId={positionId} categoryId={categoryId} />
      ) : item!.recipe ? (
        isBulkMix(item!.recipe) ? (
          <BulkMixRecipeCard item={item!} />
        ) : (
          <PrintRecipeCard item={item!} />
        )
      ) : (
        <RecipeCard item={item!} />
      )}
    </div>
  );
}

/* --------------------------- Print recipe card -------------------------- */

/**
 * Print-faithful LIGHT island recipe card. Rendered when the loaded item has
 * a recipe payload. This is an intentional light-blue card centered in the
 * dark app — it does NOT use the app's dark tokens. All chrome comes from the
 * .recipe-print-card* utilities + --rpc-* tokens in index.css.
 *
 * Structure: white panel → title block (slab small-caps + 2px black rule) →
 * optional subtitle → two-column body (content left, framed photo right; photo
 * stacks on top on mobile; no photo → content spans full width) → footer
 * brand lockup → 3-col legal row (category left/blue, confidential center,
 * page+LTO marker right/blue).
 */
function PrintRecipeCard({
  item,
}: {
  item: NonNullable<ReturnType<typeof useItem>["data"]>;
}): ReactElement {
  const recipe = item.recipe as Recipe;
  const categoryQuery = useCategory(item.categoryId);
  const categoryName = categoryQuery.data?.name ?? "";
  const isLTO =
    item.seasonal || item.tags.some((t) => t.toUpperCase() === "LTO");

  return (
    <article
      className="recipe-print-card mx-auto mt-4 w-full max-w-3xl rounded-md p-6 shadow-lg sm:p-10"
      data-ocid="library.item.print_card"
    >
      {/* Title block */}
      <h1
        className="recipe-print-card-title text-3xl sm:text-4xl"
        data-ocid="library.item.print_title"
      >
        {item.title}
      </h1>

      {/* Optional subtitle */}
      {item.subtitle && item.subtitle.trim().length > 0 ? (
        <p
          className="recipe-print-card-subtitle mt-3 text-base sm:text-lg"
          data-ocid="library.item.print_subtitle"
        >
          {item.subtitle}
        </p>
      ) : null}

      {/* Two-column body: content left, photo right (stacks on mobile) */}
      <div className="mt-6 flex flex-col gap-8 sm:flex-row sm:items-start sm:gap-10">
        {/* Photo — stacks on top on mobile, right column on desktop. Omitted
            entirely when there is no photo (no empty blue frame). */}
        {item.photo ? (
          <div
            className="order-1 sm:order-2 sm:w-[320px] sm:shrink-0"
            data-ocid="library.item.print_photo"
          >
            <img
              src={item.photo}
              alt={item.title}
              className="recipe-print-card-photo block h-auto w-full object-contain"
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

      {/* Footer brand lockup */}
      <p
        className="mt-8 text-center text-sm font-semibold"
        data-ocid="library.item.print_brand"
      >
        Bubba&rsquo;s 33 &middot; Be Legendary / Serve Responsibly
      </p>

      {/* Legal row */}
      <div
        className="recipe-print-card-footer-legal mt-4 text-xs"
        data-ocid="library.item.print_legal"
      >
        <span className="left">{categoryName}</span>
        <span className="center">
          CONFIDENTIAL AND PROPRIETARY &copy; Bubba&rsquo;s 33
        </span>
        <span className="right">{isLTO ? "LTO" : ""}</span>
      </div>
    </article>
  );
}

/* --------------------------- Bulk mix recipe card ----------------------- */

/**
 * Detects whether a recipe should render as a Bulk Mix card. An item is a bulk
 * mix when it carries bulk-mix metadata: a non-empty `yield` OR a non-empty
 * `equipment` array. Drink recipes (no bulk-mix data) fall through to the
 * existing PrintRecipeCard path and render unchanged.
 */
function isBulkMix(recipe: Recipe): boolean {
  const hasYield = recipe.yield != null && recipe.yield.trim().length > 0;
  const hasEquipment = recipe.equipment.length > 0;
  return hasYield || hasEquipment;
}

/**
 * Bulk Mix recipe card — reuses the existing .recipe-print-card* utilities and
 * --rpc-* tokens so it shares the white panel, slab small-caps title + 2px
 * black rule, #1477BE blue headings, square bullets, right-aligned specs rows,
 * and the Bubba's 33 footer lockup with the drink card.
 *
 * Layout differs from the drink card: NO photo, NO glassware, NO garnish, NO
 * variants. Instead: title block → two-column top row (Equipment | Bulk Mix +
 * Shelf Life stacked) → full-width Specs, Assembly, optional Quality Identifier
 * → footer lockup with "BULK MIX" as the left category marker.
 */
function BulkMixRecipeCard({
  item,
}: {
  item: NonNullable<ReturnType<typeof useItem>["data"]>;
}): ReactElement {
  const recipe = item.recipe as Recipe;
  const isLTO =
    item.seasonal || item.tags.some((t) => t.toUpperCase() === "LTO");

  return (
    <article
      className="recipe-print-card mx-auto mt-4 w-full max-w-3xl rounded-md p-6 shadow-lg sm:p-10"
      data-ocid="library.item.bulk_mix_card"
    >
      {/* Title block — slab small-caps + 2px black rule, no subtitle */}
      <h1
        className="recipe-print-card-title text-3xl sm:text-4xl"
        data-ocid="library.item.bulk_mix_title"
      >
        {item.title}
      </h1>

      {/* Top row: two columns on desktop (Equipment | Bulk Mix + Shelf Life),
          stacks to one column on mobile in order: Equipment, Bulk Mix, Shelf
          Life. */}
      <div
        className="mt-6 grid grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-10"
        data-ocid="library.item.bulk_mix_top_row"
      >
        {/* Left column — Equipment */}
        {recipe.equipment.length > 0 ? (
          <section data-ocid="library.item.bulk_mix_equipment">
            <h2 className="recipe-print-card-heading">Equipment</h2>
            <ul className="recipe-print-card-square-bullet mt-1 pl-5">
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
              <h2 className="recipe-print-card-heading">Bulk Mix</h2>
              <ul className="recipe-print-card-square-bullet mt-1 pl-5">
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
              <h2 className="recipe-print-card-heading">Shelf Life</h2>
              <ul className="recipe-print-card-square-bullet mt-1 pl-5">
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
        data-ocid="library.item.bulk_mix_body"
      >
        {/* Specs — same styling as the drink card's specs rows */}
        {recipe.specs.length > 0 ? (
          <section data-ocid="library.item.bulk_mix_specs">
            <h2 className="recipe-print-card-heading">Specs</h2>
            <ul className="recipe-print-card-square-bullet mt-1 pl-5">
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
            <h2 className="recipe-print-card-heading">Assembly</h2>
            <ul className="recipe-print-card-square-bullet mt-1 pl-5">
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
            <h2 className="recipe-print-card-heading">Quality Identifier</h2>
            <ul className="recipe-print-card-square-bullet mt-1 pl-5">
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

      {/* Footer brand lockup */}
      <p
        className="mt-8 text-center text-sm font-semibold"
        data-ocid="library.item.bulk_mix_brand"
      >
        Bubba&rsquo;s 33 &middot; Be Legendary / Serve Responsibly
      </p>

      {/* Legal row — "BULK MIX" replaces the category name in the left column */}
      <div
        className="recipe-print-card-footer-legal mt-4 text-xs"
        data-ocid="library.item.bulk_mix_legal"
      >
        <span className="left">BULK MIX</span>
        <span className="center">
          CONFIDENTIAL AND PROPRIETARY &copy; Bubba&rsquo;s 33
        </span>
        <span className="right">{isLTO ? "LTO" : ""}</span>
      </div>
    </article>
  );
}

/**
 * A single bulk-mix assembly step. Steps that begin with a storage/labeling
 * directive ("Cover, label", "Label, date", "Store at") render that prefix in
 * bold, matching the print sheets. The remainder of the step renders normally.
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

/** Renders the recipe content sections (Glassware, Specs, Assembly, Garnish,
 *  then each variant). Shared between the base recipe and per-variant blocks
 *  so the styling stays consistent. */
function RecipeContent({ recipe }: { recipe: Recipe }): ReactElement {
  return (
    <div className="flex flex-col gap-6">
      {/* Glassware */}
      {recipe.glassware.trim().length > 0 ? (
        <section data-ocid="library.item.print_glassware">
          <h2 className="recipe-print-card-heading">Glassware</h2>
          <p className="mt-1">{recipe.glassware}</p>
        </section>
      ) : null}

      {/* Specs */}
      {recipe.specs.length > 0 ? (
        <section data-ocid="library.item.print_specs">
          <h2 className="recipe-print-card-heading">Specs</h2>
          <ul className="recipe-print-card-square-bullet mt-1 pl-5">
            {recipe.specs.map((spec, i) => (
              <SpecsRow
                key={`spec-${spec.amount}-${spec.ingredient}`}
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
          <h2 className="recipe-print-card-heading">Assembly</h2>
          <ul className="recipe-print-card-square-bullet mt-1 pl-5">
            {recipe.assembly.map((step, i) => (
              <li
                key={`asm-${step}`}
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
          <h2 className="recipe-print-card-heading">Garnish</h2>
          <ul className="recipe-print-card-square-bullet mt-1 pl-5">
            {recipe.garnish.map((g, i) => (
              <li
                key={`gar-${g}`}
                className="leading-relaxed"
                data-ocid={`library.item.print_garnish_step.${i + 1}`}
              >
                {g}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Variants — each gets its own slab small-caps divider + Specs/Assembly */}
      {recipe.variants.map((variant, i) => (
        <VariantBlock
          key={`var-${variant.variantLabel}`}
          variant={variant}
          index={i}
        />
      ))}
    </div>
  );
}

/** A single specs row: amount on the left (nowrap, one line), ingredient
 *  right-aligned to the column's right edge. Long ingredients wrap under the
 *  amount without breaking the two-column alignment (flex + margin-left:auto). */
function SpecsRow({
  spec,
  index,
}: { spec: RecipeSpec; index: number }): ReactElement {
  return (
    <li
      className="recipe-print-card-specs-row"
      data-ocid={`library.item.print_spec.${index + 1}`}
    >
      <span className="amount whitespace-nowrap pr-3">{spec.amount}</span>
      <span className="ingredient">{spec.ingredient}</span>
    </li>
  );
}

/** A variant block: slab small-caps divider (label uppercased + 2px black rule)
 *  followed by that variant's Specs and Assembly sections. */
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
        className="recipe-print-card-variant-divider text-xl"
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
          <h4 className="recipe-print-card-heading">Specs</h4>
          <ul className="recipe-print-card-square-bullet mt-1 pl-5">
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
          <h4 className="recipe-print-card-heading">Assembly</h4>
          <ul className="recipe-print-card-square-bullet mt-1 pl-5">
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

function RecipeCard({
  item,
}: {
  item: NonNullable<ReturnType<typeof useItem>["data"]>;
}): ReactElement {
  return (
    <article
      className="mt-4 bg-library-card border border-border p-5 sm:p-8"
      data-ocid="library.item.card"
    >
      {/* Title + seasonal badge — spans full width above the columns */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1
          className="font-display text-3xl uppercase leading-none tracking-wide text-library-card sm:text-4xl"
          data-ocid="library.item.title"
        >
          {item.title}
        </h1>
        {item.seasonal ? (
          <SeasonalBadge
            className="shrink-0"
            // keep a card-scoped marker for deterministic coverage
          />
        ) : null}
      </div>

      {/* Subtitle — optional, rendered below the title and visually subordinate */}
      {item.subtitle && item.subtitle.trim().length > 0 ? (
        <p
          className="mt-2 font-heading text-base sm:text-lg text-muted-foreground"
          data-ocid="library.item.subtitle"
        >
          {item.subtitle}
        </p>
      ) : null}

      {/* Two-column body: text left, framed photo right. Stacks on mobile
          (photo first, then text). */}
      <div className="mt-6 flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
        {/* LEFT — recipe text (detail fields, notes, tags) */}
        <div className="flex-1 min-w-0 order-2 lg:order-1">
          {/* Labeled detail fields */}
          {item.details.length > 0 ? (
            <dl className="flex flex-col gap-7" data-ocid="library.item.fields">
              {item.details.map((field, index) => (
                <div
                  key={`${field.fieldLabel}-${index}`}
                  className="flex flex-col gap-1.5"
                  data-ocid={`library.item.field.${index + 1}`}
                >
                  <dt
                    className="font-heading text-sm uppercase tracking-wider text-secondary"
                    data-ocid={`library.item.field_label.${index + 1}`}
                  >
                    {field.fieldLabel}
                  </dt>
                  <dd
                    className="font-body text-base leading-relaxed text-foreground prose prose-sm prose-invert max-w-none prose-headings:font-heading prose-headings:uppercase prose-headings:tracking-wide prose-headings:text-foreground prose-strong:text-foreground prose-em:text-foreground prose-u:text-foreground prose-li:text-foreground prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-ul:text-foreground prose-ol:text-foreground prose-strong:font-semibold prose-headings:font-semibold prose-p:leading-relaxed prose-li:leading-relaxed prose-headings:mt-0 prose-headings:mb-1 prose-p:my-0 prose-ul:my-0 prose-ol:my-0 prose-li:my-0"
                    data-ocid={`library.item.field_value.${index + 1}`}
                    // biome-ignore lint/security/noDangerouslySetInnerHtml: value is admin-authored HTML from a restricted Quill toolbar (bold/italic/underline/lists only — no links, images, or scripts), so XSS risk is not applicable.
                    dangerouslySetInnerHTML={{ __html: field.value }}
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
              <h2 className="font-heading text-sm uppercase tracking-wider text-secondary">
                Notes
              </h2>
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

        {/* RIGHT — full drink photo in a thin bordered frame, sticky on
            desktop so it stays visible while reading the text. Tap to open
            full-size. On mobile it stacks above the text (order-1). */}
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
      className="block w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
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
      className="flex flex-col items-start gap-4"
      data-ocid="library.item.not_found"
    >
      <div>
        <h1 className="font-heading text-2xl uppercase tracking-wide text-foreground">
          Item not found
        </h1>
        <p className="mt-2 font-body text-base text-muted-foreground">
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
    <article
      className="mt-4 bg-library-card border border-border p-5 sm:p-8"
      data-ocid="library.item.loading_state"
      aria-hidden
    >
      <Skeleton className="h-9 w-2/3" />
      <div className="mt-6 flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
        <div className="flex-1 order-2 lg:order-1">
          <div className="flex flex-col gap-7">
            {["s1", "s2", "s3"].map((k) => (
              <div key={k} className="flex flex-col gap-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-16 w-full" />
              </div>
            ))}
          </div>
        </div>
        <div className="order-1 lg:order-2 lg:w-[340px] lg:shrink-0">
          <Skeleton className="h-[360px] w-full rounded-md" />
        </div>
      </div>
    </article>
  );
}
