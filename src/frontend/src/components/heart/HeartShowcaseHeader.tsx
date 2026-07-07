import type { ReactElement } from "react";

/**
 * HeartShowcaseHeader — the branded hero header for the per-position
 * "Service with HEART" showcase.
 *
 * Layout (top → bottom):
 *   1. "SERVICE WITH HEART" in Anton display font. The word "HEART" is
 *      rendered in red (text-primary) to anchor the brand accent.
 *   2. A slim horizontal three-segment stripe: red | white | navy. The
 *      white middle segment uses the foreground token (near-white on the
 *      dark theme) so it stays on-palette.
 *   3. The mission line in Barlow italic:
 *      "Legendary service is never having to ask — it's always there."
 *
 * Mobile-first: the heading scales down on small screens, the stripe is
 * full-width and thin, the mission line wraps gracefully.
 */
export function HeartShowcaseHeader(): ReactElement {
  return (
    <header className="flex flex-col items-center text-center">
      {/* Heading — Anton, big letters. "HEART" in red. */}
      <h1
        className="font-display text-4xl uppercase leading-[0.95] tracking-wide text-foreground sm:text-5xl md:text-6xl"
        data-ocid="heart.heading"
      >
        <span className="text-foreground">Service with </span>
        <span className="text-primary">HEART</span>
      </h1>

      {/* Slim three-segment stripe: red | white | navy */}
      <div
        className="mt-4 flex h-1.5 w-full max-w-md overflow-hidden rounded-full"
        data-ocid="heart.stripe"
        aria-hidden
      >
        <span className="flex-1 bg-primary" />
        <span className="flex-1 bg-foreground" />
        <span className="flex-1 bg-secondary" />
      </div>

      {/* Mission line — Barlow italic */}
      <p
        className="mt-4 max-w-xl font-body text-base italic leading-relaxed text-muted-foreground sm:text-lg"
        data-ocid="heart.mission"
      >
        Legendary service is never having to ask &mdash; it&rsquo;s always
        there.
      </p>
    </header>
  );
}

export default HeartShowcaseHeader;
