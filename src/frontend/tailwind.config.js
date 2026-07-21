import typography from "@tailwindcss/typography";
import containerQueries from "@tailwindcss/container-queries";
import animate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["index.html", "src/**/*.{js,ts,jsx,tsx,html,css}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "oklch(var(--border))",
        input: "oklch(var(--input))",
        ring: "oklch(var(--ring) / <alpha-value>)",
        background: "oklch(var(--background))",
        foreground: "oklch(var(--foreground))",
        primary: {
          DEFAULT: "oklch(var(--primary) / <alpha-value>)",
          foreground: "oklch(var(--primary-foreground))",
          hover: "oklch(var(--primary-hover) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "oklch(var(--secondary) / <alpha-value>)",
          foreground: "oklch(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "oklch(var(--destructive) / <alpha-value>)",
          foreground: "oklch(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "oklch(var(--muted) / <alpha-value>)",
          foreground: "oklch(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "oklch(var(--accent) / <alpha-value>)",
          foreground: "oklch(var(--accent-foreground))",
        },
        "in-training": {
          DEFAULT: "oklch(var(--in-training) / <alpha-value>)",
          foreground: "oklch(var(--in-training-foreground))",
        },
        "library-card": {
          DEFAULT: "oklch(var(--library-card) / <alpha-value>)",
          foreground: "oklch(var(--library-card-foreground))",
        },
        "category-tile": {
          DEFAULT: "oklch(var(--category-tile) / <alpha-value>)",
          foreground: "oklch(var(--category-tile-foreground))",
        },
        seasonal: {
          DEFAULT: "oklch(var(--seasonal) / <alpha-value>)",
          foreground: "oklch(var(--seasonal-foreground))",
          border: "oklch(var(--seasonal-border))",
        },
        nav: {
          DEFAULT: "oklch(var(--nav))",
          foreground: "oklch(var(--nav-foreground))",
        },
        popover: {
          DEFAULT: "oklch(var(--popover))",
          foreground: "oklch(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "oklch(var(--card))",
          foreground: "oklch(var(--card-foreground))",
        },
        chart: {
          1: "oklch(var(--chart-1))",
          2: "oklch(var(--chart-2))",
          3: "oklch(var(--chart-3))",
          4: "oklch(var(--chart-4))",
          5: "oklch(var(--chart-5))",
        },
        sidebar: {
          DEFAULT: "oklch(var(--sidebar))",
          foreground: "oklch(var(--sidebar-foreground))",
          primary: "oklch(var(--sidebar-primary))",
          "primary-foreground": "oklch(var(--sidebar-primary-foreground))",
          accent: "oklch(var(--sidebar-accent))",
          "accent-foreground": "oklch(var(--sidebar-accent-foreground))",
          border: "oklch(var(--sidebar-border))",
          ring: "oklch(var(--sidebar-ring))",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        heading: ["var(--font-heading)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
        slab: ["Zilla Slab", "Roboto Slab", "serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgba(0,0,0,0.05)",
        roadie: "0 2px 0 0 rgba(0,0,0,0.6)",
        /* Patriotic Orientation — ADDITIVE glow for goal cards + mission
           headline. Tuned to the Orientation blue/gold tokens; does NOT
           alter existing shadows. */
        "orientation-goal": "0 0 0 1px oklch(0.42 0.16 264 / 0.15), 0 0 18px oklch(0.42 0.16 264 / 0.35)",
        "orientation-mission": "0 0 14px oklch(0.801 0.171 75 / 0.45), 0 0 28px oklch(0.801 0.171 75 / 0.27)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "in-training-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
        "seasonal-shimmer": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        "photo-shimmer": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        heartbeat: {
          "0%": { transform: "scale(1)" },
          "14%": { transform: "scale(1.25)" },
          "28%": { transform: "scale(1)" },
          "42%": { transform: "scale(1.25)" },
          "70%": { transform: "scale(1)" },
          "100%": { transform: "scale(1)" },
        },
        /* ── Be Legendary — ADDITIVE keyframes (do not alter existing) ── */
        "legendary-glow": {
          "0%, 100%": { opacity: "0.35" },
          "50%": { opacity: "0.7" },
        },
        "legendary-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 1px oklch(0.66 0.2 25 / 0.25), 0 0 20px oklch(0.66 0.2 25 / 0.30)" },
          "50%": { boxShadow: "0 0 0 1px oklch(0.66 0.2 25 / 0.45), 0 0 34px oklch(0.66 0.2 25 / 0.55)" },
        },
        /* Cinematic patriotic hero — light-sweep beam + mirror-finish flash.
           Referenced by name from .legendary-hero-sweep::after and
           .legendary-hero-flash::before in index.css. Transform-driven
           (translateX + skewX) so they stay GPU-composited. */
        "legendary-sweep": {
          "0%": { transform: "skewX(-18deg) translateX(0%)" },
          "60%": { transform: "skewX(-18deg) translateX(420%)" },
          "100%": { transform: "skewX(-18deg) translateX(420%)" },
        },
        "legendary-flash": {
          "0%, 100%": { opacity: "0" },
          "40%": { opacity: "0" },
          "55%": { opacity: "1" },
          "70%": { opacity: "0" },
        },
        "flashcard-flip": {
          "0%": { transform: "rotateY(0deg)" },
          "100%": { transform: "rotateY(180deg)" },
        },
        /* ── Reading-wave gold glow sweep (flashcard back face) ──
           ADDITIVE. The wave itself is driven by a requestAnimationFrame
           loop in useReadingWave (sets --wave-progress 0..1 over 12s);
           no keyframe is needed for the progress. This placeholder
           keyframe is kept for symmetry with the other additive blocks
           and in case a CSS-only fallback is added later. It is not
           referenced by any utility today. */
        "flashcard-wave": {
          "0%": { "--wave-progress": "0" },
          "100%": { "--wave-progress": "1" },
        },
        /* ── Drinks Builder — ADDITIVE game keyframes (do not alter existing).
            Mirrors the @keyframes blocks in index.css so the animations are
            usable as Tailwind utility classes (animate-drinks-*). The CSS
            versions remain the source of truth for the .animate-drinks-*
            utility classes used by the game screen. */
        "drinks-green-pop": {
          "0%": { transform: "scale(1)", opacity: "1" },
          "40%": { transform: "scale(1.18)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "drinks-red-shake": {
          "0%, 100%": { transform: "translateX(0)" },
          "15%": { transform: "translateX(-8px)" },
          "30%": { transform: "translateX(7px)" },
          "45%": { transform: "translateX(-6px)" },
          "60%": { transform: "translateX(5px)" },
          "75%": { transform: "translateX(-3px)" },
          "90%": { transform: "translateX(2px)" },
        },
        "drinks-rising-points": {
          "0%": { transform: "translateY(0) scale(0.8)", opacity: "0" },
          "20%": { transform: "translateY(-6px) scale(1.1)", opacity: "1" },
          "100%": { transform: "translateY(-44px) scale(1)", opacity: "0" },
        },
        "drinks-glass-fill": {
          "0%": { transform: "scaleY(0)" },
          "100%": { transform: "scaleY(1)" },
        },
        "drinks-foam-appear": {
          "0%": { opacity: "0", transform: "translateY(8px) scale(0.85)" },
          "60%": { opacity: "1", transform: "translateY(-2px) scale(1.05)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "drinks-confetti-burst": {
          "0%": { transform: "translate(0, 0) scale(0)", opacity: "1" },
          "100%": {
            transform: "translate(var(--drinks-confetti-x, 0), var(--drinks-confetti-y, -120px)) scale(1)",
            opacity: "0",
          },
        },
        "drinks-legendary-banner": {
          "0%": { transform: "scale(0.6) translateY(20px)", opacity: "0" },
          "60%": { transform: "scale(1.08) translateY(-4px)", opacity: "1" },
          "100%": { transform: "scale(1) translateY(0)", opacity: "1" },
        },
        "drinks-streak-flame": {
          "0%, 100%": { transform: "scale(1) rotate(-2deg)", opacity: "0.9" },
          "50%": { transform: "scale(1.15) rotate(2deg)", opacity: "1" },
        },
        "drinks-star-pop": {
          "0%": { transform: "scale(0) rotate(-30deg)", opacity: "0" },
          "60%": { transform: "scale(1.25) rotate(8deg)", opacity: "1" },
          "100%": { transform: "scale(1) rotate(0deg)", opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "in-training": "in-training-pulse 2s ease-in-out infinite",
        "seasonal-shimmer": "seasonal-shimmer 3s ease-in-out infinite",
        "photo-shimmer": "photo-shimmer 1.1s ease-in-out infinite",
        heartbeat: "heartbeat 1.4s ease-in-out infinite",
        /* ── Be Legendary — ADDITIVE animations ── */
        "legendary-glow": "legendary-glow 3s ease-in-out infinite",
        "legendary-pulse": "legendary-pulse 2.5s ease-in-out infinite",
        /* Cinematic patriotic hero — BOLD chrome shine. Sweep crosses the
           banner surface every 2.8s with a rest hold; flash glints the
           chrome every 3.5s. Both pause under prefers-reduced-motion
           (handled in index.css). Durations mirror
           --legendary-sweep/flash-duration. */
        "legendary-sweep": "legendary-sweep 2.8s cubic-bezier(0.4, 0, 0.2, 1) infinite",
        "legendary-flash": "legendary-flash 3.5s ease-in-out infinite",
        "flashcard-flip": "flashcard-flip 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
        /* ── Drinks Builder — ADDITIVE animations (one per keyframe above) ── */
        "drinks-green-pop": "drinks-green-pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "drinks-red-shake": "drinks-red-shake 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97)",
        "drinks-rising-points": "drinks-rising-points 0.9s ease-out forwards",
        "drinks-glass-fill": "drinks-glass-fill 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards",
        "drinks-foam-appear": "drinks-foam-appear 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        "drinks-confetti-burst": "drinks-confetti-burst 1.1s ease-out forwards",
        "drinks-legendary-banner": "drinks-legendary-banner 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        "drinks-streak-flame": "drinks-streak-flame 0.6s ease-in-out infinite",
        "drinks-star-pop": "drinks-star-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
      },
    },
  },
  plugins: [typography, containerQueries, animate],
};
