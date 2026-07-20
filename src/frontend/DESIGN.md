# Bubba's 33 — Design System

Dark roadhouse theme. Dark is the only theme — no light mode is defined or
supported. All colors are OKLCH custom properties consumed via semantic
Tailwind classes (`bg-background`, `text-foreground`, `bg-card`, etc.).

- **Display / wordmark:** Anton (logo, big hero)
- **Headings:** Oswald 600/700, uppercase, tracked
- **Body:** Barlow 400/500/600
- **Mono:** JetBrains Mono
- **Radius:** `0.25rem` (sharp roadhouse hard-edge language)
- **Palette anchors:** near-black background (`0.244 0.005 95`), red primary
  (`0.595 0.232 27`), gold reserved exclusively for in-training + legendary.

## Be Legendary — Cinematic Patriotic Hero (additive)

A redesign layer stacked on top of the existing Be Legendary banner tokens.
It does **not** alter any prior token, utility, or flashcard class. Dark is
the only theme; the `:root` and `.dark` blocks mirror the same values. The
hero treatment is patriotic — a confident woman bartender's face with
"BUBBA'S 33" written in red under her eyes like football eye black, pouring
a drink against a red/white/blue American flag background. Patriotic
roadhouse energy, while the dark Bubba's 33 roadhouse base stays intact.

### Zones (stacking order, back → front)

1. **`legendary-hero-backdrop`** — deep navy roadhouse stage
   (`--legendary-hero-backdrop: 0.16 0.05 255`), darker than the page
   background so the hero reads as a distinct cinematic stage. A
   near-white spotlight radial glows from the upper-left
   (`--legendary-hero-spotlight: 0.92 0.03 90` at
   `--legendary-hero-spotlight-strength: 0.42`) — shifted off red so it
   does not double the flag's red; a strengthened cool blue rim-light
   streak cuts diagonally across the lower-right
   (`--legendary-hero-bottle-glint: 0.62 0.16 250` at
   `--legendary-hero-bottle-glint-strength: 0.26`) so the flag blue reads
   cleanly. `position: relative` + `isolation: isolate` so the sweep,
   flash, and glow pseudo-layers anchor to it.
2. **Hero image** — generated cinematic patriotic bartender portrait: a
   confident woman bartender's face with "BUBBA'S 33" written in red
   under her eyes like football eye black, pouring a drink against a
   red/white/blue American flag background. Added by the frontend
   component.
3. **`legendary-hero-overlay`** — legibility scrim
   (`--legendary-hero-overlay: 0.12 0.008 255` at
   `--legendary-hero-overlay-strength: 0.7`), retuned to a left-heavy
   gradient so the wordmark zone (left) reads darker and the face zone
   (right) stays lighter — the bartender's face and the red eye black
   stay visible while the wordmark stays readable regardless of flag
   brightness.
4. **`legendary-hero-wordmark`** — "BE LEGENDARY" Anton wordmark with a
   chrome/silver-to-red/white/blue metallic gradient clipped to the glyphs
   (`--legendary-metallic-highlight` white → `bright` silver-white → `mid`
   red → `deep` red → `shadow` navy), chiseled text-shadow for 3D depth,
   and a strengthened outer red glow. The static gradient remains visible
   even when motion is paused.
5. **`legendary-hero-sweep`** — diagonal semi-transparent white light beam
   sweeping across the banner surface.
6. **`legendary-hero-flash`** — periodic mirror-finish glint on the chrome
   surface.
7. Tagline + affordances on top.

### Motion (BOLD chrome shine)

Per user preference, the chrome shine is **BOLD** — frequent
mirror-finish flashes sweep across both the wordmark and the banner surface.

- **`legendary-sweep`** keyframe — `skewX(-18deg) translateX(0%)` →
  `translateX(420%)` (held at 60–100% for a rest beat). Registered in
  `tailwind.config.js` and referenced by `.legendary-hero-sweep::after` in
  `index.css`. Animation: `legendary-sweep 2.8s cubic-bezier(0.4,0,0.2,1)
  infinite` (duration mirrors `--legendary-sweep-duration`).
- **`legendary-flash`** keyframe — opacity `0` → `0` (40%) → `1` (55%) →
  `0` (70%) → `0`. Registered in `tailwind.config.js` and referenced by
  `.legendary-hero-flash::before` in `index.css`. Animation:
  `legendary-flash 3.5s ease-in-out infinite` (duration mirrors
  `--legendary-flash-duration`).
- **`legendary-pulse`** keyframe — box-shadow oscillates a cooler red
  glow (`oklch(0.66 0.2 25)`, shifted from the prior `0.62 0.22 27` to
  harmonize with the flag's red) so the banner's
  `animate-legendary-pulse` reads patriotic. Opacity stops and timing
  are unchanged from the prior pulse; only the box-shadow color shifted.

Both sweep and flash animations are transform/opacity-only
(GPU-composited, no layout thrash) and use `mix-blend-mode: screen` so
they read as light hitting a polished surface, not as opaque overlays.

### Reduced motion

Under `@media (prefers-reduced-motion: reduce)` both the sweep and flash
pseudo-elements are disabled (`animation: none`; sweep hidden, flash
opacity `0`). The static chrome/silver-to-red/white/blue gradient,
chiseled text-shadow, deep navy backdrop, near-white spotlight, and
strengthened blue rim-light reflections all remain — the banner still
reads as a cinematic patriotic marquee with the bartender's face and red
eye black visible, just without motion.

### Constraints

- Additive only — no existing legendary token, utility, or flashcard class
  is altered.
- Gold stays exclusive to in-training + legendary; it does not bleed into
  the neutral roadhouse palette.
- No floating sparkle particles, no mouse-parallax tilt on the hero
  image (excluded from this build).
- Dark is the only theme; `:root` and `.dark` carry identical values.
- The patriotic red/white/blue treatment is confined to the hero tokens
  (`--legendary-hero-*`, `--legendary-metallic-*`) and the
  `legendary-pulse` keyframe. The base roadhouse palette tokens
  (`--background`, `--primary`, `--in-training`) and the non-hero legendary
  tokens (`.bg-legendary-banner`, `.legendary-glow-layer`,
  `.bg-legendary-card`, `.bg-legendary-correct/incorrect`, `flashcard-*`)
  are unchanged.

## Home Hero & Position Tile Photos (additive)

Generated placeholder Roadie photos in the dark roadhouse photographic style
(cinematic, low-key, warm amber key light, shallow depth of field, smiling
subjects having fun at work), matching the existing
`bartender-hero.png` baseline. All paths are absolute `/assets/...` references
in `<img src>`, the established pattern.

### Home hero banner

- **Intent:** a smiling bartender behind the bar, having fun working, with
  "BUBBA'S 33" written in eye-black style under the eyes (the roadhouse brand
  look, like sports eye-black). Wide/landscape framing for a cinematic hero
  banner.
- **File:** `public/assets/generated/bartender-hero-eyeblack.png`
- **Wiring:** `src/frontend/src/routes/index.tsx` `HeroSection` — the image
  is layered as `absolute inset-0 z-0 object-cover object-center` with a
  bottom-up `from-background via-background/85 to-background/55` legibility
  scrim on top (z-0), and the "Pick your position" heading + `HeroStripe`
  sit at z-10. The red/white/navy `HeroStripe` accent line is preserved
  beneath the heading. The nav, the 2x2 grid, the `max-w-3xl` container, and
  the `StatusBadge` are unchanged.

### Position tile headshots

Four headshot-style photos of smiling Roadies having fun working in their
environment, framed to crop cleanly into the 16/9 tile with the existing
`bg-black/30` overlay. Wired into `src/frontend/src/components/PositionTile.tsx`
as a static-asset fallback map keyed by a slug derived from the position
name (lowercase, hyphenated; "Server Support" -> "server-support"). The
admin-uploaded `position.coverPhoto` branch is unchanged and still wins;
the headshot fallback only renders when `coverPhoto` is undefined. The
single-letter placeholder remains as the final fallback when no headshot
matches.

- **Bartender** — bartender behind the bar, smiling, pouring or holding a
  drink. `public/assets/positions/bartender.png`
- **Server** — server holding a tray of food/drinks, smiling, in the dining
  room. `public/assets/positions/server.png`
- **Host** — host at the host stand/door, smiling, welcoming.
  `public/assets/positions/host.png`
- **Server Support** — server support in the back/server area, smiling,
  carrying supplies or bussing a table.
  `public/assets/positions/server-support.png`

### Swap convention

These are placeholder photos. To swap in real Roadie photos later:

- **Hero:** replace `public/assets/generated/bartender-hero-eyeblack.png`
  (keep the same filename).
- **Tiles:** replace the matching file in `public/assets/positions/`
  (`bartender.png`, `server.png`, `host.png`, `server-support.png`). No code
  changes are needed — the slug map resolves by position name.

Admin-uploaded `position.coverPhoto` (managed in the admin position editor)
always takes precedence over the static fallback for an individual position.
