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
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgba(0,0,0,0.05)",
        roadie: "0 2px 0 0 rgba(0,0,0,0.6)",
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
      },
    },
  },
  plugins: [typography, containerQueries, animate],
};
