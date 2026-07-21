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

  const missionCategory = findCategory(MISSION_NAME);
  const coreValuesCategory = findCategory(CORE_VALUES_NAME);
  const ourStoryCategory = findCategory(OUR_STORY_NAME);
  const operationalGoalsCategory = findCategory(OPERATIONAL_GOALS_NAME);
  const servicePrioritiesCategory = findCategory(SERVICE_PRIORITIES_NAME);
  const foodPrioritiesCategory = findCategory(FOOD_PRIORITIES_NAME);

  const heroCategoryIds = new Set(
    [
      missionCategory,
      coreValuesCategory,
      ourStoryCategory,
      operationalGoalsCategory,
      servicePrioritiesCategory,
      foodPrioritiesCategory,
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
      {servicePrioritiesCategory || foodPrioritiesCategory ? (
        <PrioritiesSection
          positionId={positionId}
          serviceCategory={servicePrioritiesCategory}
          foodCategory={foodPrioritiesCategory}
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
  positionId,
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

  const itemTo = missionItem
    ? `/position/${positionId}/library/${category.id}/item/${missionItem.id}`
    : `/position/${positionId}/library/${category.id}`;

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
      <Link
        to={itemTo}
        className="mt-4 block rounded-md transition-smooth hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        data-ocid="orientation.mission.headline_link"
        aria-label="Open mission item"
      >
        <h2
          className="orientation-mission-headline text-4xl sm:text-5xl md:text-6xl"
          data-ocid="orientation.mission.headline"
        >
          {missionText}
        </h2>
      </Link>
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
  positionId,
  categoryId,
  index,
}: {
  item: LibraryItem;
  positionId: string;
  categoryId: string;
  index: number;
}): ReactElement {
  const meaning = findField(item, "Meaning") ?? item.notes ?? "";
  const to = `/position/${positionId}/library/${categoryId}/item/${item.id}`;
  return (
    <Link
      to={to}
      className={cn(
        "orientation-value-card group block py-4 pr-4 transition-smooth",
        "hover:border-patriotic-blue/60",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      )}
      data-ocid={`orientation.core_values.card.${index + 1}`}
      aria-label={`Open ${item.title}`}
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
    </Link>
  );
}

function CapstoneBar({
  item,
  positionId,
  categoryId,
}: {
  item: LibraryItem;
  positionId: string;
  categoryId: string;
}): ReactElement {
  const to = `/position/${positionId}/library/${categoryId}/item/${item.id}`;
  return (
    <Link
      to={to}
      className="orientation-capstone mt-4 block px-5 py-4 text-center transition-smooth hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      data-ocid="orientation.core_values.capstone"
      aria-label={`Open ${item.title}`}
    >
      {item.title}
    </Link>
  );
}

/* ----------------------------- Our Story ------------------------------- */

function OurStorySection({
  positionId,
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

  // Decode + split the 'This means we have' field into poster list
  // items by semicolons. Each non-empty trimmed segment becomes one
  // cream star-bulleted list row. Computed before the early return so
  // biome's rules-of-hooks check is satisfied (useMemo above any guard).
  const thisMeansItems = useMemo(() => {
    if (!thisMeans) return [] as string[];
    return decodeHtmlEntities(thisMeans)
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }, [thisMeans]);

  if (!item) return null;

  const to = `/position/${positionId}/library/${category.id}/item/${item.id}`;
  const knownForText = knownFor ? decodeHtmlEntities(knownFor) : null;

  return (
    <section data-ocid="orientation.our_story.section">
      <SectionDivider number="02" heading="Our Story" />

      {/* Outer dark card wrapper stays so the section fits cleanly next
          to Mission, Core Values, Operational Goals, Priorities, CTA,
          and Rules. The Bubba's 33 'Food For All' poster look is the
          card's INTERIOR — the wrapper frames the poster. */}
      <div
        className="mt-5 rounded-lg border border-border bg-card p-6 sm:p-8"
        data-ocid="orientation.our_story.card"
      >
        {/* Poster interior: weathered blue wood-grain frame wrapping a
            red-to-orange radial field with the poster zones in order. */}
        <div
          className="bubba-poster-frame"
          data-ocid="orientation.our_story.frame"
        >
          <div
            className="bubba-poster-field"
            data-ocid="orientation.our_story.field"
          >
            {/* (1) Red Pacifico script 'Bubba's 33' wordmark */}
            <div data-ocid="orientation.our_story.logo">
              <span
                className="bubba-poster-logo text-4xl sm:text-5xl"
                aria-label="Bubba's 33"
              >
                Bubba&apos;s 33
              </span>
            </div>

            {/* (2) Hero food photo slot (burger + fries) — empty
                gradient placeholder; a real <img> drops in later. */}
            <div
              className="bubba-poster-hero"
              data-ocid="orientation.our_story.hero"
            >
              <span className="bubba-poster-hero-img" aria-hidden />
            </div>

            {/* (3) Navy SCRATCH-MADE banner — white block caps */}
            <div
              className="bubba-poster-banner text-sm sm:text-base"
              data-ocid="orientation.our_story.banner"
            >
              Scratch-Made
            </div>

            {/* (4) 'Food FOR All' headline — Pacifico 'Food'/'All' +
                Anton block 'FOR' */}
            <div
              className="bubba-poster-headline"
              data-ocid="orientation.our_story.headline"
            >
              <span className="bubba-poster-headline-script text-5xl sm:text-6xl">
                Food
              </span>
              <span className="bubba-poster-headline-block text-3xl sm:text-4xl">
                FOR
              </span>
              <span className="bubba-poster-headline-script text-5xl sm:text-6xl">
                All
              </span>
            </div>

            {/* (5) Known-for supporting copy — bound to the Library
                'Known for' field, decoded. Omitted when null. */}
            {knownForText ? (
              <div data-ocid="orientation.our_story.known_for">
                <p
                  className="bubba-poster-knownfor-kicker"
                  data-ocid="orientation.our_story.known_for.label"
                >
                  Known For
                </p>
                <p
                  className="bubba-poster-knownfor-body text-sm sm:text-base"
                  data-ocid="orientation.our_story.known_for.value"
                >
                  {knownForText}
                </p>
              </div>
            ) : null}

            {/* (6) Lower food cluster slot (pizza / beer / cocktails)
                — empty gradient placeholder; a real <img> drops in
                later. */}
            <div
              className="bubba-poster-cluster"
              data-ocid="orientation.our_story.cluster"
            >
              <span className="bubba-poster-cluster-img" aria-hidden />
            </div>

            {/* (7) + (8) 'This means we have:' Pacifico label + cream
                star-bulleted feature list. Both omitted when the field
                is null. List items come from splitting the decoded
                field value by semicolons. */}
            {thisMeansItems.length > 0 ? (
              <>
                <p
                  className="bubba-poster-list-label text-xl sm:text-2xl"
                  data-ocid="orientation.our_story.list_label"
                >
                  This means we have:
                </p>
                <ul
                  className="bubba-poster-list text-sm sm:text-base"
                  data-ocid="orientation.our_story.list"
                >
                  {thisMeansItems.map((line, index) => (
                    <li
                      key={line}
                      className="bubba-poster-list-item"
                      data-ocid={`orientation.our_story.list.item.${index + 1}`}
                    >
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}

            {/* (9) Card footer Back-to-category link — stays INSIDE the
                card footer (not floating above) so the section reads as
                one cohesive block matching the sibling sections. */}
            <div
              className="bubba-poster-footer"
              data-ocid="orientation.our_story.footer"
            >
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="text-patriotic-cream/80 hover:text-patriotic-cream"
                data-ocid="orientation.our_story.back_button"
              >
                <Link to={to}>
                  <ArrowLeft className="size-4" />
                  Back to category
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------- Operational Goals -------------------------- */

function OperationalGoalsSection({
  positionId,
  category,
}: {
  positionId: string;
  category: Category;
}): ReactElement | null {
  const itemsQuery = useItemsByCategory(category.id);
  const items = itemsQuery.data ?? [];
  const item = items[0] ?? null;

  if (!item || item.details.length === 0) return null;

  const to = `/position/${positionId}/library/${category.id}/item/${item.id}`;

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
            to={to}
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
  to,
  index,
}: {
  label: string;
  value: string;
  to: string;
  index: number;
}): ReactElement {
  const abbr = abbreviate(label);
  return (
    <Link
      to={to}
      className={cn(
        "orientation-goal-card group block p-4 transition-smooth hover:brightness-110",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      )}
      data-ocid={`orientation.operational_goals.card.${index + 1}`}
      aria-label={`Open ${label} goal`}
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
    </Link>
  );
}

/* ----------------------------- Priorities ------------------------------ */

function PrioritiesSection({
  positionId,
  serviceCategory,
  foodCategory,
}: {
  positionId: string;
  serviceCategory: Category | null;
  foodCategory: Category | null;
}): ReactElement {
  return (
    <section data-ocid="orientation.priorities.section">
      <SectionDivider number="04" heading="Service & Food Priorities" />
      <div
        className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2"
        data-ocid="orientation.priorities.grid"
      >
        {serviceCategory ? (
          <PriorityCard
            category={serviceCategory}
            positionId={positionId}
            tone="red"
            label="10 Steps to Service"
          />
        ) : null}
        {foodCategory ? (
          <PriorityCard
            category={foodCategory}
            positionId={positionId}
            tone="blue"
            label="10 Daily Essentials"
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
  label,
}: {
  category: Category;
  positionId: string;
  tone: "red" | "blue";
  label: string;
}): ReactElement {
  const to = `/position/${positionId}/library/${category.id}`;
  return (
    <Link
      to={to}
      className={cn(
        "orientation-priority-card group block p-5 transition-smooth hover:brightness-110",
        tone === "red" ? "is-red" : "is-blue",
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
          className="mt-2 font-heading text-lg uppercase tracking-wide text-patriotic-cream"
          data-ocid={`orientation.priorities.label.${tone}`}
        >
          {label}
        </h3>
        <p className="mt-1 font-body text-sm text-patriotic-cream/70">
          {category.name}
        </p>
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
