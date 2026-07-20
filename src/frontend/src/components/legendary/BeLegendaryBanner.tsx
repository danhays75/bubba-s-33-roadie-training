import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { ChevronRight, Sparkles } from "lucide-react";
import type { ReactElement } from "react";

/**
 * BeLegendaryBanner — the cinematic "prove your mastery" entry point.
 *
 * Rendered ABOVE the Library section on every position page, this is the
 * first thing staff see after the position header. Redesigned as a full-width
 * roadhouse hero:
 *   - Near-black roadhouse stage (.legendary-hero-backdrop) with a warm
 *     spotlight radial + bottle-glass reflection streaks.
 *   - Bartender illustration layered on top as the background image.
 *   - Legibility scrim (.legendary-hero-overlay) so the wordmark reads.
 *   - Anton "BE LEGENDARY" wordmark with a metallic-gold mirror-finish
 *     gradient clipped to the glyphs (.legendary-hero-wordmark).
 *   - BOLD light-sweep (.legendary-hero-sweep) flashing a bright beam across
 *     the banner surface, plus a mirror-finish flash (.legendary-hero-flash)
 *     glinting across the gold — high-energy roadhouse vibe.
 *   - Ambient gold glow halo (legendary-glow-layer) + box-shadow pulse
 *     (animate-legendary-pulse), refined to harmonize with the sweep.
 *   - "Prove your mastery" tagline + Enter + ChevronRight affordance,
 *     restyled to complement the hero treatment.
 *
 * Tapping navigates to the per-position Be Legendary practice page via
 * TanStack Router's typed Link: to="/position/$id/legendary" with the
 * positionId param. Mobile-first, full-width, eye-catching.
 *
 * Additive — does not alter any existing component or token.
 */
interface BeLegendaryBannerProps {
  /** The position id, used to build the /position/$id/legendary route. */
  positionId: string;
}

export function BeLegendaryBanner({
  positionId,
}: BeLegendaryBannerProps): ReactElement {
  return (
    <Link
      to="/position/$id/legendary"
      params={{ id: positionId }}
      className={cn(
        "group relative mt-4 flex w-full items-center gap-3 overflow-hidden",
        "rounded-md px-4 py-5 sm:px-6 sm:py-6",
        "legendary-hero-backdrop legendary-hero-sweep legendary-hero-flash",
        "animate-legendary-pulse",
        "transition-smooth hover:brightness-110 active:brightness-95",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      )}
      data-ocid="legendary.banner"
      aria-label="Open Be Legendary practice area"
    >
      {/* Bartender hero image — background layer over the roadhouse stage. */}
      <img
        src="/assets/generated/bartender-hero.webp"
        alt=""
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 z-0 h-full w-full",
          "object-cover object-center select-none",
        )}
        loading="eager"
      />

      {/* Legibility scrim over the hero image — keeps the wordmark readable. */}
      <span className="legendary-hero-overlay" aria-hidden />

      {/* Ambient gold glow halo — pulses, sits behind content, never blocks clicks. */}
      <span className="legendary-glow-layer" aria-hidden />

      {/* Left accent — sparkle icon in a gold-tinted chip so it pops on the
          dark roadhouse stage. Uses the registered in-training gold token. */}
      <span
        className={cn(
          "relative z-10 flex size-10 shrink-0 items-center justify-center rounded-md",
          "bg-in-training/15 ring-1 ring-in-training/45 backdrop-blur-sm",
        )}
        aria-hidden
      >
        <Sparkles className="size-5 text-in-training" />
      </span>

      {/* Wordmark + tagline */}
      <span className="relative z-10 flex min-w-0 flex-1 flex-col">
        <span
          className={cn(
            "legendary-hero-wordmark",
            "text-3xl uppercase leading-none tracking-wide sm:text-4xl md:text-5xl",
          )}
          data-ocid="legendary.banner.wordmark"
        >
          Be Legendary
        </span>
        <span
          className={cn(
            "mt-2 font-heading text-xs font-semibold uppercase tracking-[0.2em] sm:text-sm",
            "text-in-training/90",
          )}
        >
          Prove your mastery
        </span>
      </span>

      {/* Right affordance — Enter + chevron, nudges on hover. */}
      <span
        className={cn(
          "relative z-10 flex shrink-0 items-center gap-1",
          "font-heading text-xs font-semibold uppercase tracking-[0.18em]",
          "text-in-training/90",
        )}
        aria-hidden
      >
        <span>Enter</span>
        <ChevronRight
          className={cn(
            "size-4 transition-transform duration-200",
            "group-hover:translate-x-0.5",
          )}
        />
      </span>
    </Link>
  );
}

export default BeLegendaryBanner;
