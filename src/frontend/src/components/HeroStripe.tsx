/**
 * Slim three-stripe accent: red, off-white, navy.
 * Flat bars, no gradients. Used beneath the hero line on the home page.
 * The red bar is the thickest to keep red dominant in the identity.
 */
export function HeroStripe({ className }: { className?: string }) {
  return (
    <div className={className} role="presentation" aria-hidden>
      <div className="h-1.5 w-full bg-primary" />
      <div className="h-0.5 w-full bg-foreground" />
      <div className="h-1 w-full bg-secondary" />
    </div>
  );
}
