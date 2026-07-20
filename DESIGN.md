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
