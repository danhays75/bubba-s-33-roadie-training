import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCategoriesByPosition,
  useItemsByCategory,
} from "@/hooks/useLibrary";
import { cn } from "@/lib/utils";
import type { Category, LibraryItem } from "@/types/foundation";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Star } from "lucide-react";
import { useMemo } from "react";
import type { ReactElement } from "react";

/**
 * OrientationLayout — patriotic onboarding layout for a position.
 *
 * Presentation-only: reads existing Library categories/items and renders
 * them as a tasteful Americana onboarding page (red/cream/blue, stars &
 * stripes on the dark roadhouse base). Writes nothing.
 *
 * Categories are mapped by NAME to hero sections:
 *   - "Mission Statement"  → Mission band (giant gold headline + ★★★★★)
 *   - "Core Values"         → Our Core Values (tricolor value cards + capstone)
 *   - "Our Story"           → Our Story (copy + emoji chips + FOOD FOR ALL poster)
 *   - "Operational Goals"   → Operational Goals (glowing navy goal cards)
 *   - "Service Priorities"  → one big "10" teaser card (red-topped)
 *   - "Food Priorities"     → one big "10" teaser card (blue-topped)
 *
 * Every category NOT placed in a hero section appears in "The Rules of the
 * Road" — a compact 2-column grid of star-bulleted tiles. Any new/unmapped
 * category automatically appears there. Tapping any card/tile opens the
 * existing item/category detail route; navigation is unchanged.
 *
 * Sections hide gracefully when their category is absent.
 */

interface OrientationLayoutProps {
  positionId: string;
  positionName: string;
  positionDescription?: string;
}

/* Category name → hero section mapping. Names are matched case-insensitively
   and trimmed so admin-entered "mission statement" / "Mission Statement "
   both resolve. The first matching category wins. */
const MISSION_NAME = "Mission Statement";
const CORE_VALUES_NAME = "Core Values";
const OUR_STORY_NAME = "Our Story";
const OPERATIONAL_GOALS_NAME = "Operational Goals";
const SERVICE_PRIORITIES_NAME = "Service Priorities";
const FOOD_PRIORITIES_NAME = "Food Priorities";
const MARKETING_PRIORITIES_NAME = "Marketing / Community Priorities";

/** Field-label lookups used by hero sections. Case-insensitive contains. */
function findField(item: LibraryItem, needle: string): string | null {
  const lower = needle.toLowerCase();
  const hit = item.details.find((d) =>
    d.fieldLabel.toLowerCase().includes(lower),
  );
  return hit && hit.value.trim().length > 0 ? hit.value : null;
}

/**
 * Decodes common HTML entities that arrive double-encoded in Library item
 * field values (e.g. "Sauce &amp; Dressings" → "Sauce & Dressings").
 * React escapes the resulting "&" itself, so the rendered text is correct.
 */
function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/** The "…All With Purpose" capstone item in Core Values. */
function isCapstoneItem(item: LibraryItem): boolean {
  return item.title.toLowerCase().includes("all with purpose");
}

/** The "Our Core Values" overview item (intro line) — skipped in the card grid. */
function isOverviewItem(item: LibraryItem): boolean {
  const t = item.title.toLowerCase();
  return t === "our core values" || t === "core values";
}

/** First letter of each word → abbreviation (e.g. "Maximize Guest Satisfaction" → "MGS"). */
function abbreviate(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase())
    .join("")
    .slice(0, 4);
}

export function OrientationLayout({
  positionId,
  positionName,
  positionDescription,
}: OrientationLayoutProps): ReactElement {
  const categoriesQuery = useCategoriesByPosition(positionId);

  const categories = useMemo(
    () =>
      [...(categoriesQuery.data ?? [])].sort(
        (a, b) => a.sortOrder - b.sortOrder,
      ),
    [categoriesQuery.data],
  );

  const nameIndex = useMemo(() => {
    const idx = new Map<string, Category>();
    for (const c of categories) {
      const key = c.name.trim().toLowerCase();
      if (!idx.has(key)) idx.set(key, c);
    }
    return idx;
  }, [categories]);

  const findCategory = (name: string): Category | null =>
    nameIndex.get(name.trim().toLowerCase()) ?? null;

  /**
   * Tolerant lookup for the Community Priorities (gold) card. The user may
   * have named their Library category "Community Priorities",
   * "Marketing / Community Priorities", or a similar variant. Match the
   * first category whose trimmed, lowercased name CONTAINS "community"
   * (case-insensitive) OR whose trimmed, lowercased name exactly equals
   * "marketing / community priorities". First matching category wins.
   * Service and Food Priorities keep their exact-match bindings unchanged.
   */
  const findCommunityCategory = (): Category | null => {
    const exact = nameIndex.get(MARKETING_PRIORITIES_NAME.trim().toLowerCase());
    if (exact) return exact;
    for (const c of categories) {
      const key = c.name.trim().toLowerCase();
      if (key.includes("community")) return c;
    }
    return null;
  };

  const missionCategory = findCategory(MISSION_NAME);
  const coreValuesCategory = findCategory(CORE_VALUES_NAME);
  const ourStoryCategory = findCategory(OUR_STORY_NAME);
  const operationalGoalsCategory = findCategory(OPERATIONAL_GOALS_NAME);
  const servicePrioritiesCategory = findCategory(SERVICE_PRIORITIES_NAME);
  const foodPrioritiesCategory = findCategory(FOOD_PRIORITIES_NAME);
  const marketingPrioritiesCategory = findCommunityCategory();

  const heroCategoryIds = new Set(
    [
      missionCategory,
      coreValuesCategory,
      ourStoryCategory,
      operationalGoalsCategory,
      servicePrioritiesCategory,
      foodPrioritiesCategory,
      marketingPrioritiesCategory,
    ]
      .filter((c): c is Category => c !== null)
      .map((c) => c.id),
  );

  const rulesCategories = categories.filter((c) => !heroCategoryIds.has(c.id));

  if (categoriesQuery.isLoading) {
    return <OrientationSkeleton />;
  }

  return (
    <div className="flex flex-col gap-8" data-ocid="orientation.page">
      <BackLink />
      <BuntingStrip />
      <Hero
        positionName={positionName}
        positionDescription={positionDescription}
      />
      {missionCategory ? (
        <MissionBand positionId={positionId} category={missionCategory} />
      ) : null}
      {coreValuesCategory ? (
        <CoreValuesSection
          positionId={positionId}
          category={coreValuesCategory}
        />
      ) : null}
      {ourStoryCategory ? (
        <OurStorySection positionId={positionId} category={ourStoryCategory} />
      ) : null}
      {operationalGoalsCategory ? (
        <OperationalGoalsSection
          positionId={positionId}
          category={operationalGoalsCategory}
        />
      ) : null}
      {servicePrioritiesCategory ||
      foodPrioritiesCategory ||
      marketingPrioritiesCategory ? (
        <PrioritiesSection
          positionId={positionId}
          serviceCategory={servicePrioritiesCategory}
          foodCategory={foodPrioritiesCategory}
          marketingCategory={marketingPrioritiesCategory}
        />
      ) : null}
      <BeLegendaryCta positionId={positionId} />
      {rulesCategories.length > 0 ? (
        <RulesOfTheRoad positionId={positionId} categories={rulesCategories} />
      ) : null}
    </div>
  );
}

/* ------------------------------- Chrome -------------------------------- */

function BackLink(): ReactElement {
  return (
    <Button
      variant="ghost"
      size="sm"
      asChild
      data-ocid="orientation.back_button"
    >
      <Link to="/">
        <ArrowLeft className="size-4" />
        Back to positions
      </Link>
    </Button>
  );
}

function BuntingStrip(): ReactElement {
  return (
    <div
      className="orientation-bunting"
      role="presentation"
      aria-hidden
      data-ocid="orientation.bunting"
    />
  );
}

/* -------------------------------- Hero --------------------------------- */

function Hero({
  positionName,
  positionDescription,
}: {
  positionName: string;
  positionDescription?: string;
}): ReactElement {
  return (
    <section
      className="orientation-hero px-5 py-8 sm:px-8 sm:py-10"
      data-ocid="orientation.hero.section"
    >
      <p
        className="orientation-hero-kicker text-xs sm:text-sm"
        data-ocid="orientation.hero.kicker"
      >
        ★ Your First Stop · Roadie Nation ★
      </p>
      <h1
        className="orientation-hero-title mt-3 text-5xl sm:text-6xl md:text-7xl"
        data-ocid="orientation.hero.title"
      >
        {positionName}
      </h1>
      <div
        className="orientation-flag-bar mt-4 max-w-md"
        aria-hidden
        data-ocid="orientation.hero.flag_bar"
      >
        <span />
        <span />
        <span />
      </div>
      {positionDescription && positionDescription.trim().length > 0 ? (
        <p
          className="mt-4 max-w-2xl font-body text-base leading-relaxed text-patriotic-cream/90 sm:text-lg"
          data-ocid="orientation.hero.description"
        >
          {positionDescription}
        </p>
      ) : null}
    </section>
  );
}

/* ----------------------------- Mission band ---------------------------- */

function MissionBand({
  positionId: _positionId,
  category,
}: {
  positionId: string;
  category: Category;
}): ReactElement | null {
  const itemsQuery = useItemsByCategory(category.id);
  const items = itemsQuery.data ?? [];

  // First item with a "Mission" field value drives the headline.
  const missionItem = items.find((i) => findField(i, "Mission")) ?? null;
  const missionText = missionItem ? findField(missionItem, "Mission") : null;
  const missionSubtitle = missionItem?.notes ?? null;

  if (!missionText) return null;

  return (
    <section
      className="orientation-mission"
      data-ocid="orientation.mission.section"
    >
      <div className="orientation-tri-stripe-top" aria-hidden>
        <span />
        <span />
        <span />
      </div>
      <p
        className="orientation-mission-label text-sm sm:text-base"
        data-ocid="orientation.mission.label"
      >
        ★ Our Mission ★
      </p>
      <div className="mt-4 block">
        <h2
          className="orientation-mission-headline text-4xl sm:text-5xl md:text-6xl"
          data-ocid="orientation.mission.headline"
        >
          {missionText}
        </h2>
      </div>
      <div
        className="orientation-star-row mt-4 text-xl"
        aria-hidden
        data-ocid="orientation.mission.stars"
      >
        <span>★</span>
        <span>★</span>
        <span>★</span>
        <span>★</span>
        <span>★</span>
      </div>
      {missionSubtitle ? (
        <p
          className="mx-auto mt-4 max-w-2xl font-body text-base leading-relaxed text-patriotic-cream/80 sm:text-lg"
          data-ocid="orientation.mission.subtitle"
        >
          {missionSubtitle}
        </p>
      ) : null}
    </section>
  );
}

/* ---------------------------- Core Values ------------------------------ */

function CoreValuesSection({
  positionId,
  category,
}: {
  positionId: string;
  category: Category;
}): ReactElement | null {
  const itemsQuery = useItemsByCategory(category.id);
  const items = itemsQuery.data ?? [];

  const overview = items.find(isOverviewItem) ?? null;
  const capstone = items.find(isCapstoneItem) ?? null;
  const valueItems = items.filter(
    (i) => !isOverviewItem(i) && !isCapstoneItem(i),
  );

  if (valueItems.length === 0 && !capstone) return null;

  return (
    <section data-ocid="orientation.core_values.section">
      <SectionDivider number="01" heading="Our Core Values" />
      {overview?.notes ? (
        <p
          className="mt-4 max-w-2xl font-body text-base text-patriotic-cream/80"
          data-ocid="orientation.core_values.intro"
        >
          {overview.notes}
        </p>
      ) : null}
      {valueItems.length > 0 ? (
        <div
          className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2"
          data-ocid="orientation.core_values.grid"
        >
          {valueItems.map((item, index) => (
            <ValueCard
              key={item.id}
              item={item}
              positionId={positionId}
              categoryId={category.id}
              index={index}
            />
          ))}
        </div>
      ) : null}
      {capstone ? (
        <CapstoneBar
          item={capstone}
          positionId={positionId}
          categoryId={category.id}
        />
      ) : null}
    </section>
  );
}

function ValueCard({
  item,
  positionId: _positionId,
  categoryId: _categoryId,
  index,
}: {
  item: LibraryItem;
  positionId: string;
  categoryId: string;
  index: number;
}): ReactElement {
  const meaning = findField(item, "Meaning") ?? item.notes ?? "";
  return (
    <div
      className={cn("orientation-value-card group block py-4 pr-4")}
      data-ocid={`orientation.core_values.card.${index + 1}`}
    >
      <div className="flex items-center gap-2">
        <Star
          className="orientation-value-star size-4"
          fill="currentColor"
          aria-hidden
        />
        <h3 className="orientation-value-name text-lg">{item.title}</h3>
      </div>
      {meaning ? (
        <p className="mt-2 font-body text-sm leading-relaxed text-patriotic-cream/80">
          {meaning}
        </p>
      ) : null}
    </div>
  );
}

function CapstoneBar({
  item,
  positionId: _positionId,
  categoryId: _categoryId,
}: {
  item: LibraryItem;
  positionId: string;
  categoryId: string;
}): ReactElement {
  return (
    <div
      className="orientation-capstone mt-4 block px-5 py-4 text-center"
      data-ocid="orientation.core_values.capstone"
    >
      {item.title}
    </div>
  );
}

/* ----------------------------- Our Story ------------------------------- */

function OurStorySection({
  positionId: _positionId,
  category,
}: {
  positionId: string;
  category: Category;
}): ReactElement | null {
  const itemsQuery = useItemsByCategory(category.id);
  const items = itemsQuery.data ?? [];
  const item = items[0] ?? null;

  const knownFor = item ? findField(item, "Known for") : null;
  const thisMeans = item ? findField(item, "This means we have") : null;

  // Decode + split the 'This means we have' field into list items by
  // semicolons. Each non-empty trimmed segment becomes one row. Computed
  // before the early return so biome's rules-of-hooks check is satisfied
  // (useMemo above any guard).
  const thisMeansItems = useMemo(() => {
    if (!thisMeans) return [] as string[];
    return decodeHtmlEntities(thisMeans)
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }, [thisMeans]);

  if (!item) return null;

  const knownForText = knownFor ? decodeHtmlEntities(knownFor) : null;
  const hasPhoto =
    typeof item.photo === "string" && item.photo.trim().length > 0;

  return (
    <section data-ocid="orientation.our_story.section">
      <SectionDivider number="02" heading="Our Story" />

      {hasPhoto ? (
        <OurStoryPhoto
          src={item.photo as string}
          knownForText={knownForText}
          thisMeansItems={thisMeansItems}
          tags={item.tags}
        />
      ) : (
        <OurStoryTextFallback
          knownForText={knownForText}
          thisMeansItems={thisMeansItems}
          tags={item.tags}
        />
      )}
    </section>
  );
}

/**
 * Photo-dominant Our Story. Renders ONLY the uploaded poster photo as a
 * plain responsive image — no code-drawn poster placeholder, no Lake
 * Charles Quik Reference logo, no SCRATCH-MADE banner, no 'Food FOR All' headline, no gradient
 * hero/cluster slots, no card footer, and NO 'Back to category' link.
 *
 * The image is centered, max-width 560px on desktop / full width on mobile,
 * height auto, object-fit: contain (never cropped), rounded corners, subtle
 * shadow. No extra border or background — the poster already has its own
 * frame. The item's text fields and tags render as a small caption BELOW
 * the image as a screen-reader / search-engine fallback. The whole section
 * is display-only — it is NOT a link and does NOT navigate.
 */
function OurStoryPhoto({
  src,
  knownForText,
  thisMeansItems,
  tags,
}: {
  src: string;
  knownForText: string | null;
  thisMeansItems: string[];
  tags: string[];
}): ReactElement {
  return (
    <div
      className="mt-5 flex flex-col items-center"
      data-ocid="orientation.our_story.photo_wrap"
    >
      <img
        src={src}
        alt="Our Story — Scratch-Made, Food For All"
        className="orientation-our-story-photo"
        data-ocid="orientation.our_story.photo"
        loading="lazy"
      />
      <OurStoryCaption
        knownForText={knownForText}
        thisMeansItems={thisMeansItems}
        tags={tags}
      />
    </div>
  );
}

/**
 * Display-only text/chips fallback shown when the Our Story item has NO
 * photo. Renders the item's text fields and tags as a small, non-distracting
 * block — no code-drawn poster placeholder and NO 'Back to category' link.
 * The whole block is display-only.
 */
function OurStoryTextFallback({
  knownForText,
  thisMeansItems,
  tags,
}: {
  knownForText: string | null;
  thisMeansItems: string[];
  tags: string[];
}): ReactElement {
  return (
    <div
      className="mt-5 rounded-lg border border-border bg-card p-6 sm:p-8"
      data-ocid="orientation.our_story.fallback"
    >
      <OurStoryCaption
        knownForText={knownForText}
        thisMeansItems={thisMeansItems}
        tags={tags}
        prominent
      />
    </div>
  );
}

/**
 * Small caption block rendered below the photo (or as the fallback body).
 * Doubles as a screen-reader / search-engine fallback for the photo-dominant
 * view. Kept minimal and non-distracting: a 'Known for' line, a short
 * star-bulleted feature list, and the item's emoji tags as chips. All
 * optional pieces are omitted when their source field is empty.
 */
function OurStoryCaption({
  knownForText,
  thisMeansItems,
  tags,
  prominent = false,
}: {
  knownForText: string | null;
  thisMeansItems: string[];
  tags: string[];
  prominent?: boolean;
}): ReactElement | null {
  const hasCaption =
    !!knownForText || thisMeansItems.length > 0 || tags.length > 0;
  if (!hasCaption) return null;

  return (
    <div
      className={cn(
        "mt-4 flex flex-col gap-3 text-center",
        prominent ? "" : "max-w-2xl",
      )}
      data-ocid="orientation.our_story.caption"
    >
      {knownForText ? (
        <p
          className={cn(
            "font-body leading-relaxed text-patriotic-cream/80",
            prominent ? "text-base sm:text-lg" : "text-xs sm:text-sm",
          )}
          data-ocid="orientation.our_story.caption.known_for"
        >
          {knownForText}
        </p>
      ) : null}

      {thisMeansItems.length > 0 ? (
        <ul
          className={cn(
            "mx-auto flex flex-col gap-1 text-left",
            prominent ? "text-sm sm:text-base" : "text-xs sm:text-sm",
          )}
          data-ocid="orientation.our_story.caption.list"
        >
          {thisMeansItems.map((line, index) => (
            <li
              key={line}
              className="flex items-baseline gap-2 font-body text-patriotic-cream/70"
              data-ocid={`orientation.our_story.caption.list.item.${index + 1}`}
            >
              <span aria-hidden className="text-patriotic-gold">
                ★
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {tags.length > 0 ? (
        <div
          className="flex flex-wrap justify-center gap-2"
          data-ocid="orientation.our_story.caption.tags"
        >
          {tags.map((tag, index) => (
            <span
              key={tag}
              className="orientation-chip text-xs"
              data-ocid={`orientation.our_story.caption.tag.${index + 1}`}
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------- Operational Goals -------------------------- */

function OperationalGoalsSection({
  positionId: _positionId,
  category,
}: {
  positionId: string;
  category: Category;
}): ReactElement | null {
  const itemsQuery = useItemsByCategory(category.id);
  const items = itemsQuery.data ?? [];
  const item = items[0] ?? null;

  if (!item || item.details.length === 0) return null;

  return (
    <section data-ocid="orientation.operational_goals.section">
      <SectionDivider number="03" heading="Operational Goals" />
      <div
        className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2"
        data-ocid="orientation.operational_goals.grid"
      >
        {item.details.map((field, index) => (
          <GoalCard
            key={field.id}
            label={field.fieldLabel}
            value={field.value}
            index={index}
          />
        ))}
      </div>
    </section>
  );
}

function GoalCard({
  label,
  value,
  index,
}: {
  label: string;
  value: string;
  index: number;
}): ReactElement {
  const abbr = abbreviate(label);
  return (
    <div
      className={cn("orientation-goal-card group block p-4")}
      data-ocid={`orientation.operational_goals.card.${index + 1}`}
    >
      <Star
        className="orientation-goal-star size-4"
        fill="currentColor"
        aria-hidden
      />
      <span
        className="orientation-goal-tag"
        data-ocid={`orientation.operational_goals.tag.${index + 1}`}
      >
        {abbr}
      </span>
      <h3 className="orientation-goal-name mt-3 text-lg">{label}</h3>
      {value ? (
        <p className="mt-1 font-body text-sm leading-relaxed text-patriotic-cream/75">
          {value}
        </p>
      ) : null}
    </div>
  );
}

/* ----------------------------- Priorities ------------------------------ */

function PrioritiesSection({
  positionId,
  serviceCategory,
  foodCategory,
  marketingCategory,
}: {
  positionId: string;
  serviceCategory: Category | null;
  foodCategory: Category | null;
  marketingCategory: Category | null;
}): ReactElement {
  return (
    <section data-ocid="orientation.priorities.section">
      <SectionDivider
        number="04"
        heading="Service, Food & Community Priorities"
      />
      <div
        className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3"
        data-ocid="orientation.priorities.grid"
      >
        {serviceCategory ? (
          <PriorityCard
            category={serviceCategory}
            positionId={positionId}
            tone="red"
          />
        ) : null}
        {foodCategory ? (
          <PriorityCard
            category={foodCategory}
            positionId={positionId}
            tone="blue"
          />
        ) : null}
        {marketingCategory ? (
          <PriorityCard
            category={marketingCategory}
            positionId={positionId}
            tone="gold"
          />
        ) : null}
      </div>
    </section>
  );
}

function PriorityCard({
  category,
  positionId,
  tone,
}: {
  category: Category;
  positionId: string;
  tone: "red" | "blue" | "gold";
}): ReactElement {
  const to = `/position/${positionId}/library/${category.id}`;
  return (
    <Link
      to={to}
      className={cn(
        "orientation-priority-card group block p-5 transition-smooth hover:brightness-110",
        tone === "red" ? "is-red" : tone === "blue" ? "is-blue" : "is-gold",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      )}
      data-ocid={`orientation.priorities.card.${tone}`}
      aria-label={`Open ${category.name}`}
    >
      <div className="pt-2">
        <span
          className="orientation-priority-number text-7xl sm:text-8xl"
          data-ocid={`orientation.priorities.number.${tone}`}
        >
          10
        </span>
        <h3
          className="mt-2 font-heading text-xl font-semibold uppercase tracking-wide text-patriotic-cream sm:text-2xl"
          data-ocid={`orientation.priorities.label.${tone}`}
        >
          {category.name}
        </h3>
      </div>
    </Link>
  );
}

/* --------------------------- Be Legendary CTA -------------------------- */

function BeLegendaryCta({ positionId }: { positionId: string }): ReactElement {
  return (
    <section
      className="orientation-cta px-5 py-8 sm:px-8"
      data-ocid="orientation.cta.section"
    >
      <div className="orientation-tri-stripe-top" aria-hidden>
        <span />
        <span />
        <span />
      </div>
      <p
        className="orientation-cta-label mt-4 text-sm sm:text-base"
        data-ocid="orientation.cta.label"
      >
        ★ Be Legendary
      </p>
      <h2
        className="mt-2 font-display text-4xl uppercase text-patriotic-cream sm:text-5xl"
        data-ocid="orientation.cta.title"
      >
        Prove Your Mastery
      </h2>
      <Link
        to="/position/$id/legendary"
        params={{ id: positionId }}
        className="orientation-cta-enter mt-5 inline-block text-sm sm:text-base"
        data-ocid="orientation.cta.enter_button"
        aria-label="Enter Be Legendary practice area"
      >
        Enter
      </Link>
    </section>
  );
}

/* -------------------------- Rules of the Road -------------------------- */

function RulesOfTheRoad({
  positionId,
  categories,
}: {
  positionId: string;
  categories: Category[];
}): ReactElement {
  return (
    <section data-ocid="orientation.rules.section">
      <SectionDivider number="05" heading="The Rules of the Road" />
      <div
        className="orientation-rules-grid mt-5"
        data-ocid="orientation.rules.grid"
      >
        {categories.map((category, index) => (
          <RuleTile
            key={category.id}
            category={category}
            positionId={positionId}
            index={index}
          />
        ))}
      </div>
    </section>
  );
}

function RuleTile({
  category,
  positionId,
  index,
}: {
  category: Category;
  positionId: string;
  index: number;
}): ReactElement {
  const to = `/position/${positionId}/library/${category.id}`;
  return (
    <Link
      to={to}
      className={cn(
        "orientation-rule-tile group block transition-smooth hover:border-patriotic-blue/60",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      )}
      data-ocid={`orientation.rules.tile.${index + 1}`}
      aria-label={`Open ${category.name} category`}
    >
      <span className="font-heading text-sm uppercase tracking-wide text-patriotic-cream">
        {category.name}
      </span>
    </Link>
  );
}

/* --------------------------- Section divider --------------------------- */

function SectionDivider({
  number,
  heading,
}: {
  number: string;
  heading: string;
}): ReactElement {
  return (
    <div
      className="orientation-divider"
      data-ocid={`orientation.divider.${number}`}
    >
      <div className="flex items-baseline gap-3">
        <span className="orientation-divider-number text-3xl" aria-hidden>
          {number}
        </span>
        <h2
          className="orientation-divider-heading text-xl sm:text-2xl"
          data-ocid={`orientation.divider.${number}.heading`}
        >
          {heading}
        </h2>
        <Star
          className="orientation-value-star size-4"
          fill="currentColor"
          aria-hidden
        />
      </div>
      <div className="orientation-divider-rule" aria-hidden />
    </div>
  );
}

/* ------------------------------ Skeleton ------------------------------- */

function OrientationSkeleton(): ReactElement {
  return (
    <div className="flex flex-col gap-6" data-ocid="orientation.loading_state">
      <Skeleton className="h-8 w-36" />
      <div className="orientation-bunting" aria-hidden />
      <Skeleton className="h-64 w-full rounded-md" />
      <Skeleton className="h-40 w-full rounded-md" />
      <Skeleton className="h-32 w-full rounded-md" />
    </div>
  );
}

export default OrientationLayout;
