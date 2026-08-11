# Design Brief — Bubba's 33 Roadie Training

> Dark, high-energy, red-black-and-navy roadhouse identity for a mobile-first employee training and certification app. Flat styling, no gradients. Red dominates, navy supports, gold is reserved exclusively for the In-training state.

## Direction
Dark patriotic roadhouse — flat, bold, industrial. Restaurant-floor energy, not editorial calm. Mobile-first; opens directly on home with no splash.

## Tone
Confident, utilitarian, slightly aggressive. Big condensed type, hard edges, sharp red accents on near-black surfaces. Feels like a backstage pass, not a corporate LMS.

## Differentiation
Anton wordmark + Oswald condensed headings give a poster/print identity rare in training apps. Gold is forbidden everywhere except the In-training state, making that single color carry enormous semantic weight.

## Color Palette
| Token | OKLCH (L C H) | Hex | Use |
|---|---|---|---|
| background | 0.244 0.005 95 | #141412 | page bg |
| card | 0.273 0.005 95 | #1E1E1B | cards, panels |
| nav | 0 0 0 | #000000 | top nav, sidebar |
| primary | 0.595 0.232 27 | #E4002B | red — CTAs, active, highlights |
| primary-hover | 0.437 0.197 27 | #B00020 | red hover/pressed |
| secondary | 0.285 0.094 254 | #0A2A5E | navy — secondary buttons, Certified badges |
| in-training | 0.801 0.171 75 | #F2A900 | gold — ONLY In-training state |
| foreground | 0.948 0.012 90 | #F5F1E8 | headings/body text |
| muted-foreground | 0.644 0.011 95 | #9A9A92 | secondary text |
| border | 0.34 0.006 95 | — | subtle dividers |
| destructive | 0.595 0.232 27 | #E4002B | same as primary |

## Typography
- Display: Anton (logo, hero, big numerals) — uppercase, tight tracking.
- Heading: Oswald 600/700 — section titles, card titles, nav labels. Uppercase via base layer.
- Body: Barlow 400/500/600 — all body copy, labels, form text.
- No Inter/Roboto/Arial/system fonts anywhere. Mobile-first scale: body 16px, headings step up via clamp.

## Elevation & Depth
Flat. No gradients, no glow, no neon shadows. Depth comes from solid surface contrast: black nav over #141412 bg over #1E1E1B cards. One hard shadow token `shadow-roadie` (0 2px 0 0 black/60) for pressed/elevated cards. Borders are 1px low-chroma dividers, not shadows.

## Structural Zones
| Zone | Surface | Treatment |
|---|---|---|
| Top nav | #000000 (nav) | solid black, bottom border, Oswald labels |
| Main content | #141412 (background) | flat, edge-to-edge, mobile padding |
| Cards | #1E1E1B (card) | 1px border, sharp 4px radius, optional shadow-roadie |
| Sidebar/drawer | #000000 (sidebar) | solid black, right border on mobile |
| Footer/status | #141412 | border-top, muted text |

## Spacing & Rhythm
Mobile-first 4px base. Card padding 16px, section gaps 24px, screen edge padding 16px. Tight heading leading (1.05) for Anton/Oswald, relaxed 1.5 for Barlow body. Numbered position sort uses per-parent numbering, displayed as Oswald numerals.

## Component Patterns
- Buttons: primary red bg / cream text, hover primary-hover; secondary navy bg; ghost = transparent + border. Square-ish 4px radius, Oswald uppercase labels.
- Badges: Certified = navy fill / cream text; In-training = gold fill / dark text + `animate-in-training` pulse; Not started = muted outline.
- Cards: #1E1E1B, 1px border, 4px radius, title in Oswald, body in Barlow.
- Inputs: border-only, focus ring red, no fills.
- Lists: numbered per-parent, position rows with status badge right-aligned.

## Motion
One orchestrated motion: the gold In-training badge pulses (2s ease-in-out, opacity 1 → 0.55). Everything else uses `.transition-smooth` (0.2s cubic-bezier) for hover/press. No page transitions, no splash animation, no bouncy springs.

## Constraints
- Dark only — `.dark` class is applied on `<html>` at load; no light theme.
- No gradients anywhere (backgrounds, buttons, text, badges).
- Gold is forbidden outside the In-training state.
- No Inter/Roboto/Arial/system fonts.
- No splash/loading screen — open directly on home.
- Photos/images optional everywhere unless explicitly required.
- Mobile-first; do not design desktop-only layouts.

## Signature Detail
The Anton wordmark "BUBBA'S 33" sits heavy in the black top nav, red dot replacing the apostrophe, with "ROADIE TRAINING" beneath in Oswald 600 tracked wide — a roadhouse marquee condensed into 56px of vertical space.

## Photo Field Control (additive — either/or single slot)
Either/or single photo slot added to PositionFormDialog, CategoryFormDialog, ItemEditorPage. Upload from device OR paste URL — choosing one clears the other; never both stored. Photos remain OPTIONAL everywhere.
| Token | OKLCH (L C H) | Use |
|---|---|---|
| photo-frame | 0.273 0.005 95 | dark thumbnail frame (card surface) |
| photo-frame-border | 0.34 0.006 95 | 1px frame divider |
| photo-empty | 0.31 0.006 95 | empty-slot fill (library-card) |
| photo-empty-foreground | 0.644 0.011 95 | muted "No photo" helper |
| photo-processing | 0.437 0.197 27 | resize shimmer sweep (primary-hover) |
| photo-error | 0.595 0.232 27 | broken-image / non-image error |
- Frame: `.photo-field-preview` — card bg, 1px border, sharp 4px radius, object-cover img.
- Empty: `.photo-field-empty` — dashed outline, muted icon, "No photo" helper.
- Processing: `.photo-field-processing` overlay — red sweep, `photo-shimmer` 1.1s, shown while resizing (≤1600px / ~80% JPEG).
- Broken URL: `.photo-field-broken` — red-tinted border, broken icon, does not block save.
- Non-image file: `.photo-field-error` — red left-edge stripe + inline message (mirrors navy edge-stripe pattern).
- Replace / Remove controls: secondary navy + ghost-border buttons, Oswald uppercase, 4px radius — match existing button patterns.
- Resize cap: 1600px longest edge at ~80% JPEG quality, client-side only. No server re-encoding.

## Be Legendary Learning Hub (additive — premium gold/red layer)

> ADDITIVE only — no existing token altered. The single place where gradients, glow, and pulse are permitted. Be Legendary feels one tier more premium than the flat roadhouse chrome around it.

### Direction
Marquee spotlight — gold→red gradient banner with ambient gold glow, elevated warm-tinted activity cards, 3D flashcard flips. Practice-only: no scores, no tracking, no manager visibility.

### Tone
Premium, motivational, celebratory. Condensed Anton marquee type over a glowing gold-red gradient — a stage warming up, not a corporate quiz tool.

### Be Legendary Palette (additive)
| Token | OKLCH (L C H) | Use |
|---|---|---|
| legendary-banner-from | 0.82 0.17 75 | gold gradient start (brighter than in-training) |
| legendary-banner-via | 0.62 0.22 35 | warm red-orange mid stop |
| legendary-banner-to | 0.595 0.232 27 | red gradient end (existing primary) |
| legendary-glow | 0.82 0.17 75 | ambient gold glow halo |
| legendary-card | 0.30 0.012 75 | warm-tinted activity card surface |
| legendary-card-border | 0.42 0.05 75 | gold-tinted card border |
| legendary-correct | 0.72 0.16 145 | quiz correct (green, distinct from gold/seasonal) |
| legendary-incorrect | 0.595 0.232 27 | quiz incorrect (reuses destructive red) |
| legendary-flip-front | 0.30 0.012 75 | flashcard front face |
| legendary-flip-back | 0.273 0.018 35 | flashcard back face (warm red tint) |

### Be Legendary Zones
| Zone | Surface | Treatment |
|---|---|---|
| Banner | gold→red gradient | `.bg-legendary-banner`, Anton wordmark, `.legendary-glow-layer` halo, tappable |
| Activity card | legendary-card | `.bg-legendary-card`, gold-tinted border, Oswald title, Barlow body |
| Quiz feedback | correct/incorrect fills | green correct / red incorrect borders + fills, no pass-fail state |
| Flashcard | flip-front / flip-back | 3D `rotateY(180deg)`, backface hidden, 0.6s ease |

### Be Legendary Motion
- Banner glow: `legendary-glow` 3s ease-in-out, opacity 0.35↔0.7 ambient halo.
- Banner pulse: `legendary-pulse` 2.5s ease-in-out, gold box-shadow breathes.
- Flashcard flip: 0.6s cubic-bezier rotateY, `.flashcard-flipper.is-flipped` toggles.
- No scores, no progress bars, no completion animations — practice only.

### Be Legendary Constraints
- Additive only — never alter existing tokens, keyframes, or the flat roadhouse rules.
- Gradients and glow are permitted ONLY inside Be Legendary surfaces (banner, cards, flashcards).
- Gold gradient is distinct from the in-training gold fill — gradient vs flat, never confused.
- Quiz feedback shows correct/incorrect per-question only; no aggregate score, no pass/fail.
- No progress tracking, no manager visibility of practice activity.
- Admin-triggered generation only; nothing auto-generates.
- Mobile-first; activity cards stack single-column on phone.
- Built to easily add more activity types later (activity cards are generic).

## Recipe Print Card (additive — light island)

> ADDITIVE only — a LIGHT island scoped under `.recipe-print-card*`. The dark roadhouse theme is untouched. Uses literal hex `#1477BE` (not the dark `--secondary` token) for the recipe blue.

### Palette
| Token | Hex | Use |
|---|---|---|
| recipe-card-bg | #ffffff | card surface (light island) |
| recipe-blue | #1477BE | photo frame, section headings, variant rules |
| recipe-ink | #1a1a1a | body text, title |
| recipe-rule | #000000 | 2px title rule, square bullets |

### Zones
- **Title block**: 2px black rule beneath, slab small-caps (Zilla Slab 700 / Roboto Slab 800).
- **Body**: two-column on desktop; mobile-first photo stacks ON TOP. 3px blue photo frame.
- **Section headings**: blue bold 26px, body sans font for copy.
- **Lists**: square bullets; specs rows = amount-left / ingredient-right.
- **Variant dividers**: slab small-caps label + 2px rule.
- **Footer**: text-only brand lockup + 3-column legal row with LTO marker.

### Constraints
- Additive only — dark theme tokens and rules are NOT altered.
- Mobile-first: photo stacks on top, copy below; no-photo variant spans full width.
- Slab family used ONLY for title and variant dividers; everything else stays on the app body sans.
- No print/PDF export in this build; no logo brand assets in footer.

## Drinks Builder Game (additive — Be Legendary activity)

> ADDITIVE only — reuses roadhouse bg/card/nav + the Be Legendary additive layer. Gradients/glow permitted (Be Legendary rule). Mobile-first, tap-based, practice-only with session scores. Sound + confetti generated in-app (WebAudio / client-side), no asset files.

### Game Screen Layout
- **Header**: Anton "BE LEGENDARY" title left, mute toggle (WebAudio) right, live session score beneath in Oswald numerals.
- **Hero row**: SVG glass hero left, drink name (Oswald) + category badge (navy) + streak flame indicator right.
- **Body**: four sections — Glassware, Specs, Assembly, Garnish — each a stack of tappable chips with checkmark icons; completing a spec fills the glass proportionally.

### SVG Glass Hero
- Inline SVG glass; liquid (default amber/gold) rises proportionally to specs completed via `drinks-glass-fill` (scaleY origin bottom).
- Foam cap appears on full completion via `drinks-foam-appear`. No per-recipe custom liquid color (default amber/gold only).

### Feedback Animations
| Animation | Trigger |
|---|---|
| `drinks-green-pop` | correct chip tap |
| `drinks-red-shake` | incorrect chip tap |
| `drinks-rising-points` | +points float-up on correct |
| `drinks-glass-fill` | liquid rise per spec completed |
| `drinks-foam-appear` | foam cap on full completion |
| `drinks-confetti-burst` | client-side confetti on completion |
| `drinks-legendary-banner` | gold→red LEGENDARY! banner on perfect run |
| `drinks-streak-flame` | streak flame flicker (infinite) |
| `drinks-star-pop` | star burst on streak milestone |

### Additive Tokens (drinks-*)
| Token | Use |
|---|---|
| drinks-glass-stroke / drinks-liquid / drinks-foam | SVG glass line, amber fill, cream foam |
| drinks-correct / drinks-incorrect | green / red chip feedback fills |
| drinks-streak | streak flame tint |
| drinks-confetti-* | confetti particle colors |
| drinks-banner-* | LEGENDARY! banner gradient stops |

### Dark Theme Application
- Reuses roadhouse `--background` (#141412), `--card` (#1E1E1B), `--nav` (#000) and Be Legendary additive layer (legendary-card, legendary-banner gradient).
- Gradients/glow permitted ONLY on Drinks Builder surfaces (glass hero glow, LEGENDARY! banner) per Be Legendary rule.

### Reduced Motion
- All `drinks-*` animations pause under `prefers-reduced-motion`; glass fills instantly, confetti/banner/star/flame disabled.

## Patriotic Orientation Layout (additive — Legendary Starts Here)

> ADDITIVE only — no existing token altered. Rendered when a position's `layoutStyle === 'orientation'`. A presentation layer that reads existing Library content; sits on the dark roadhouse base (#121218 page, #191922 card) and adds tasteful patriotic accents (red/cream/blue, stars & stripes) — NOT a full flag wallpaper. All tokens + classes prefixed `orientation-` / `patriotic-` so they never collide with existing classes (incl. `legendary-hero-*`).

### Direction
Americana roadhouse onboarding — bold condensed poster type, tricolor stripes, gold ★ accents, scalloped bunting. Tasteful patriotic accents on the dark base, never a flag wallpaper. Mobile-first; sections stack single-column on phone.

### Patriotic Palette (additive)
| Token | OKLCH (L C H) | Hex | Use |
|---|---|---|---|
| patriotic-red | 0.595 0.232 27 | #E4002B | red — reuses primary |
| patriotic-blue | 0.42 0.16 264 | #123A8A | brighter than brand navy, for pop |
| patriotic-cream | 0.948 0.012 90 | #F5F1E8 | reuses foreground |
| patriotic-gold | 0.801 0.171 75 | #F2A900 | reuses in-training gold |
| orientation-hero-from/to | 0.46 0.21 25 / 0.32 0.11 264 | — | hero red→navy gradient |
| orientation-goal-card | 0.30 0.06 264 | — | glowing navy goal card |

### Orientation Zones
| Zone | Class | Treatment |
|---|---|---|
| Bunting strip | `.orientation-bunting` | red/cream/blue scalloped half-rounds under nav |
| Hero | `.orientation-hero` | rounded panel, red→navy gradient, faint diagonal flag-light stripes + star field |
| Mission band | `.orientation-mission` + `.orientation-tri-stripe-top` | tri-stripe top, gold headline + glow, ★★★★★ row |
| Section divider | `.orientation-divider` + `.orientation-divider-rule` | number + Oswald heading + gold ★ + tri-stripe rule |
| Value cards | `.orientation-value-card` + `.orientation-capstone` | tricolor left edge, gold ★, red capstone bar |
| Our Story | `.orientation-chip` + `.orientation-poster` | emoji chips, red "FOOD FOR ALL" poster, cream border |
| Goal cards | `.orientation-goal-card` + `.orientation-goal-star` | glowing navy, gold ★ corner, name + abbreviation tag |
| Priorities | `.orientation-priority-card.is-red/.is-blue` | two big "10" teaser cards, red/blue top edge |
| CTA | `.orientation-cta` + `.orientation-cta-enter` | tri-stripe top, gold "★ Be Legendary", red ENTER button |
| Rules grid | `.orientation-rules-grid` + `.orientation-rule-tile` | 2-col (1-col mobile) star-bulleted tiles |

### Orientation Constraints
- Additive only — never alter existing tokens, keyframes, or the flat roadhouse rules.
- Gradients/glow permitted ONLY inside Orientation surfaces (hero gradient, mission headline glow, goal-card glow, CTA).
- No star-twinkle or waving-flag animation (doNotBuild); only the ENTER hover transition moves.
- No photographic patriotic hero image (doNotBuild); hero is pure CSS gradient + stripes + star field.
- No store-specific fill-in fields (doNotBuild); reads existing Library content only.
- Mobile-first: hero stacks single-column, rules grid collapses to 1-col on phone.
- Reuses Anton (display), Oswald (uppercase headings), Barlow (body) — no new fonts.

## Bubba 'Food For All' Poster — Our Story Interior (additive)

> ADDITIVE only — no existing token altered. The poster look is the INTERIOR of the existing dark Orientation card (bg-card + border-border + '02 / Our Story' divider stay). Dark card wrapper frames the poster; poster styles the card's inner content. All classes prefixed `bubba-poster-*`. Gradients/textures permitted (poster is a print-style surface, like the recipe print card and Be Legendary banner).

### Direction
Faithful Bubba's 33 'Food For All' poster restyle — weathered blue wood-grain frame, red-to-orange radial field, red Pacifico script logo, navy SCRATCH-MADE banner, mixed-script 'Food FOR All' headline, warm gradient photo slots, Pacifico 'This means we have:' label. Mobile-first vertical stack, no horizontal overflow.

### Poster Palette (additive)
| Token | OKLCH (L C H) | Use |
|---|---|---|
| bubba-frame-blue | 0.42 0.16 264 | wood-grain frame base (patriotic blue) |
| bubba-frame-blue-light | 0.52 0.14 264 | lighter grain streak |
| bubba-frame-blue-dark | 0.32 0.12 264 | darker plank shadow |
| bubba-frame-distress | 0.78 0.02 264 | distressed near-white edge |
| bubba-field-red | 0.595 0.232 27 | radial field center (patriotic red) |
| bubba-field-orange | 0.68 0.19 50 | warm orange field edge |
| bubba-field-deep | 0.46 0.21 25 | deep red corner vignette |
| bubba-logo-red | 0.595 0.232 27 | Pacifico script logo |
| bubba-banner-blue | 0.32 0.11 264 | navy SCRATCH-MADE bar |
| bubba-banner-cream | 0.948 0.012 90 | white block caps on banner |
| bubba-headline-script | 0.46 0.21 25 | 'Food'/'All' script words |
| bubba-headline-block | 0.948 0.012 90 | 'FOR' block caps |
| bubba-photo-hero-from/to | 0.55 0.12 55 / 0.42 0.14 35 | burger+fries slot gradient |
| bubba-photo-cluster-from/to | 0.6 0.13 70 / 0.45 0.12 45 | pizza/beer/cocktails slot gradient |
| bubba-photo-frame | 0.948 0.012 90 | cream inner border on photo slots |
| bubba-list-cream | 0.948 0.012 90 | feature list body text |
| bubba-list-star | 0.948 0.012 90 | ★ bullet |

### Poster Zones (interior of dark card, top→bottom)
| Zone | Class | Treatment |
|---|---|---|
| Wood-grain frame | `.bubba-poster-frame` | patriotic-blue base, vertical plank seams + horizontal grain streaks (layered repeating-linear-gradients), distressed inset cream edge |
| Red-orange field | `.bubba-poster-field` | radial red→orange + corner vignette, cream text, centered |
| Script logo | `.bubba-poster-logo` | red Pacifico, -2° tilt, dark drop shadow |
| SCRATCH-MADE banner | `.bubba-poster-banner` | navy bar, white Oswald block caps, bleeds to field edges |
| 'Food FOR All' headline | `.bubba-poster-headline` + `-script` / `-block` | flex row: red Pacifico 'Food' + cream Anton 'FOR' + red Pacifico 'All' |
| Hero photo slot | `.bubba-poster-hero` + `.bubba-poster-hero-img` | 16:10 golden-brown gradient placeholder, cream border, empty `<img>` slot |
| 'This means we have:' label | `.bubba-poster-list-label` | red Pacifico script, left-aligned |
| Feature list | `.bubba-poster-list` + `.bubba-poster-list-item` | cream ★ bullets, cream Oswald semibold (bound to Library 'This means we have') |
| Known-for copy | `.bubba-poster-knownfor-kicker` + `-body` | Oswald uppercase kicker + Barlow body (bound to Library 'Known for') |
| Cluster photo slot | `.bubba-poster-cluster` + `.bubba-poster-cluster-img` | 21:9 amber gradient placeholder, cream border, empty `<img>` slot |
| Card footer | `.bubba-poster-footer` | thin cream rule + Back-to-category ghost link (inside card) |

### Poster Constraints
- Additive only — never alter existing tokens, keyframes, or the flat roadhouse rules.
- Poster is the INTERIOR of the existing dark card; bg-card + border-border + '02 / Our Story' divider stay unchanged.
- Gradients/textures permitted ONLY inside `.bubba-poster-*` surfaces (frame, field, photo slots).
- No real food photography in slots (doNotBuild) — warm CSS/gradient placeholders with empty `<img>` slots for future drop-in.
- No distressed-texture overlay animation (doNotBuild) — frame is static.
- Mobile-first: all zones width:100%, field padding 1rem on phone, banner bleeds to edges; stacks single-column, no horizontal overflow.
- Reuses Anton (display), Oswald (headings), Barlow (body) + Pacifico via `--font-script` (`.font-script` utility); no new fonts.
- Data binding intact: useItemsByCategory + findField 'Known for' / 'This means we have' + decodeHtmlEntities.
- Back-to-category link stays inside the card footer (`.bubba-poster-footer`), routes to /position/${positionId}/library/${category.id}/item/${item.id}.

## Food Recipe (additive — Library food-recipe surfaces)

> ADDITIVE only — no existing token altered. Mirrors the beverage-recipe Library patterns (recipe sub-object, recipe card, photo viewer, layoutStyle) instead of inventing new ones. Sits on the dark roadhouse base (#141412 bg, #1E1E1B card). All tokens/classes prefixed `food-`. Flat fills only — no gradients, no glow. Gold stays exclusive to in-training; EXPO uses purple-red.

### Station Accent Palette (additive)
| Token | OKLCH (L C H) | Use |
|---|---|---|
| food-station-grill | 0.595 0.232 27 | grill station (reuses primary red) |
| food-station-fry | 0.72 0.15 75 | fry station (amber, NOT in-training gold) |
| food-station-saute | 0.62 0.14 145 | sauté station (green) |
| food-station-expo | 0.50 0.22 12 | EXPO station (purple-red, distinct from primary) |
| food-station-prep | 0.285 0.094 254 | prep station (reuses navy) |

### EXPO / Allergen Callout Tokens (additive)
| Token | Use |
|---|---|
| food-expo-fill / food-expo-edge | purple-red callout fill + 4px left edge stripe |
| food-allergen-fill / food-allergen-edge | red allergen callout fill + left edge stripe |
| food-plating-divider | dashed Plating divider rule |
| food-quality-check | quality-check tick accent |
| food-tile-placeholder | station-colored placeholder fill for tiles without photos |

### Structural Zones
| Zone | Surface | Treatment |
|---|---|---|
| menuBuild card | #1E1E1B (card) | photo hero top, Anton title, station badge + navy menu-section badge, Components→Amount two-column table, dashed Plating divider, numbered Build Steps (red Oswald numerals), purple-red EXPO finishing callout (left edge), red allergen callout at bottom |
| prep card | #1E1E1B (card) | same recipe sub-object, condensed for prep view (Menu/Prep toggle swaps layout) |
| kitchen browser | #141412 (background) | station filter chips across top (flat station-colored fills, 6px top stripe on active), Menu/Prep toggle, search input (border-only, red focus ring), responsive tile grid |
| admin dropzone | #1E1E1B (card) | Recipe Photos bulk-attach dialog — dropzone, attach summary, unmatched-files retryable row; confirm-before-overwrite preserved |

### Component Patterns
- Station chips: flat station-colored fills, cream Oswald uppercase labels, 6px station-accent top stripe on active; derive from `foodRecipe.station`, fall back to position category names.
- Tiles: #1E1E1B card, 1px border, sharp 4px radius, `shadow-food-tile`, 6px station-accent top stripe; photo tiles show plating photo + Oswald title; placeholder tiles show large Anton initials on station-colored fill.
- EXPO callout: purple-red fill + 4px left edge stripe, "EXPO" Oswald label + one-line finishing instruction; `animate-food-expo-pop` one-shot on mount.
- Allergen callout: red-tinted border + red left edge stripe, "ALLERGENS" Oswald label + Barlow allergen list.
- Build Steps: red Oswald numerals in left gutter, Barlow step copy right.
- Menu/Prep toggle: two pill buttons, Menu active in red; swaps card layout without leaving the recipe.

### Motion
- None beyond the one-shot `food-expo-pop` (0.35s, no infinite loop). Everything else uses `.transition-smooth` for hover/press. Flat — no shimmer, no pulse, no glow.

### Constraints
- Additive only — never alter existing tokens, keyframes, or the flat roadhouse rules.
- No gradients, no glow, no neon shadows anywhere in food-recipe surfaces.
- Gold stays forbidden outside the In-training state; station accents are flat fills, not gradients.
- EXPO uses purple-red (food-station-expo), distinct from primary red and from in-training gold.
- Mirror existing beverage-recipe patterns (recipe sub-object, recipe card, photo viewer, layoutStyle, object-storage upload, bulk import) — do not invent new ones.
- Recipe Photos is a new button inside the existing Library admin next to Import, not a separate page.
- Unmatched files shown as a downloadable/retryable list; confirm-before-overwrite preserved.
- Station chips derive from `foodRecipe.station`, falling back to position category names when no food recipes exist yet.
- No inline card editing, no print/PDF export, no per-station printable prep sheets, no allergen filtering across the browser (doNotBuild).

## Anchor Editor (additive — admin Build Card label-position overlay)

> ADDITIVE only — no existing Build Card class or token altered. Admin-only drag-to-adjust overlay that sits inside a shadcn Dialog on top of the Build Card photo+labels. An admin drags each leader-line label to fine-tune its vertical position (anchorY) and saves the new values back to the recipe. All classes prefixed `anchor-` so they never collide with the `build-card-*` family. Reuses `var(--anchor-*)` tokens (already in `:root` + `.dark`). Phone-first: reflows to single-column with touch-draggable handles and no horizontal scroll.

### Direction
Admin tool chrome over a brand card — the editor's navy/red accents read as an admin surface distinct from the Bubba's blue (#1F3A8A) title band and red (#c0201f) notes of the card underneath. Flat fills, no gradients, no glow (matches the roadhouse rule).

### Anchor Editor Tokens (additive)
| Token | Value | Use |
|---|---|---|
| anchor-handle-bg | #ffffff | handle fill (light paper surface, matches build-card) |
| anchor-handle-border | 0.34 0.006 95 | idle handle outline (border family) |
| anchor-handle-border-active | 0.595 0.232 27 | active handle ring (primary red) |
| anchor-handle-dim | 0.644 0.011 95 | dimmed handle grip (muted grey) |
| anchor-handle-shadow-active | 0 4px 14px 0 rgba(0,0,0,0.28) | raised shadow while dragging |
| anchor-readout-bg | 0.285 0.094 254 | percentage pill fill (navy) |
| anchor-readout-fg | 0.948 0.012 90 | percentage pill text (cream) |
| anchor-readout-bg-active | 0.595 0.232 27 | pill fill while dragging (red) |
| anchor-editor-header | 0.285 0.094 254 | editor header band (navy) |
| anchor-editor-header-fg | 0.948 0.012 90 | header band text (cream) |
| anchor-editor-success | 0.62 0.09 145 | success feedback (seasonal green) |
| anchor-editor-error | 0.595 0.232 27 | error feedback (destructive red) |
| anchor-confirm | 0.72 0.11 65 | unsaved-changes warning (amber) |

### Anchor Editor Zones
| Zone | Class | Treatment |
|---|---|---|
| Header band | `.anchor-editor-header` + `-title` / `-subtitle` | navy fill, cream Oswald uppercase, sits at top of Dialog |
| Stage | `.anchor-editor-stage` + `-photo-col` / `-photo` / `-labels` | mirrors `.build-card-stage` geometry (photo 46% / labels 54%) so handles sit where published labels render |
| Handle (idle) | `.anchor-handle` + `-grip` / `-text` | white fill, navy outline, grab cursor, grip dots + label preview |
| Handle (active) | `.anchor-handle.is-active` | red ring + raised shadow, `anchor-handle-pulse` 1.2s breath, z-index 2 |
| Handle (dimmed) | `.anchor-handle.is-dimmed` | greyscale 0.6, opacity 0.45 while another handle drags |
| Readout badge | `.anchor-readout` | navy pill, cream mono percentage; turns red while its handle drags |
| Actions row | `.anchor-editor-actions` | Save (primary red) / Cancel (ghost) / Reset (navy), card surface, top border |
| Feedback | `.anchor-editor-feedback.is-success` / `.is-error` + `-label` | flat green/red inline banner, auto-dismiss (JS) |
| Confirm dialog | `.anchor-confirm` + `-title` / `-body` | amber unsaved-changes warning inside shadcn AlertDialog |

### Motion
- Active handle: `anchor-handle-pulse` 1.2s ease-in-out infinite — box-shadow ring breathes (0 → 3px red halo → 0). Pauses under `prefers-reduced-motion` (static red ring + shadow).
- Handle hover/active transitions: 0.15s cubic-bezier border-color + box-shadow only.
- No other motion; drag is pointer-event driven (no CSS transition on the drag transform).

### Constraints
- Additive only — never alter existing `build-card-*` classes, tokens, or the fixed Bubba's hex values.
- Admin-only surface; never shown to non-admin users.
- Editor chrome (navy header, red active ring) is intentionally distinct from the Bubba's brand hex of the card underneath.
- Reuses the existing shadcn Dialog/AlertDialog containers; only styles the overlay content inside them.
- Phone (<720px): stage stacks single-column (photo full-width on top, handles list below as static touch-draggable rows, no absolute positioning, no horizontal scroll, >=44px tap targets).
- No custom spacing presets for even redistribution (doNotBuild); null anchorY still falls back to `(index + 1) / (total + 1)` via `resolveAnchorY`.
- No undo/redo history for label edits (doNotBuild).
