// useConfetti — client-side confetti burst for the Drinks Builder game.
// No asset files; particles are drawn on a <canvas> overlay.
//
// Usage:
//   const { burst, ConfettiCanvas } = useConfetti();
//   <ConfettiCanvas />   // render once, fixed full-screen overlay
//   burst();             // fire a burst from the center
//
// The canvas is pointer-events-none and aria-hidden; it sits above all
// content (z-50) and fades particles out over ~1.1s. Colors come from the
// Drinks Builder confetti tokens (red/gold/navy/green/cream) defined in
// index.css, read at burst time so theme changes pick up.
//
// Reduced motion: when prefers-reduced-motion is set, burst() is a no-op
// (the celebration is conveyed by the LEGENDARY! banner instead).

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vrot: number;
  size: number;
  color: string;
  life: number; // 0..1, 1 = full life
  decay: number; // life decrease per frame
  shape: "rect" | "circle";
}

interface UseConfettiResult {
  burst: (opts?: { x?: number; y?: number; count?: number }) => void;
  ConfettiCanvas: () => ReactElement;
}

const CONFETTI_COLORS = [
  "oklch(var(--drinks-confetti-red))",
  "oklch(var(--drinks-confetti-gold))",
  "oklch(var(--drinks-confetti-navy))",
  "oklch(var(--drinks-confetti-green))",
  "oklch(var(--drinks-confetti-cream))",
];

const PARTICLE_LIFETIME_MS = 1100;

/**
 * Reads the prefers-reduced-motion media query. Returns true when the user
 * has requested reduced motion (confetti is then suppressed).
 */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

export function useConfetti(): UseConfettiResult {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  // Resize the canvas to match the device pixel ratio + viewport so
  // particles render crisply and travel the full screen.
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, []);

  useEffect(() => {
    resizeCanvas();
    if (typeof window === "undefined") return;
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [resizeCanvas]);

  // The animation loop. Draws each particle as a rotated rect or circle,
  // applies gravity, and removes dead particles. Stops the RAF when the
  // particle list empties to avoid a busy loop.
  const tick = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) {
      rafRef.current = null;
      return;
    }
    const w = window.innerWidth;
    const h = window.innerHeight;
    ctx.clearRect(0, 0, w, h);
    const particles = particlesRef.current;
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      // physics
      p.vy += 0.18; // gravity
      p.vx *= 0.99; // air drag
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vrot;
      p.life -= p.decay;
      if (p.life <= 0 || p.y > h + 40) {
        particles.splice(i, 1);
        continue;
      }
      // draw
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.shape === "circle") {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      }
      ctx.restore();
    }
    if (particles.length > 0) {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      rafRef.current = null;
      ctx.clearRect(0, 0, w, h);
    }
  }, []);

  const burst = useCallback(
    (opts?: { x?: number; y?: number; count?: number }) => {
      if (reducedMotion) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const cx = opts?.x ?? w / 2;
      const cy = opts?.y ?? h / 2;
      const count = opts?.count ?? 80;
      const newParticles: Particle[] = [];
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        // upward bias so the burst rises before falling
        const speed = 4 + Math.random() * 7;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed - 3;
        const size = 6 + Math.random() * 8;
        const color =
          CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
        const decay = 1 / (PARTICLE_LIFETIME_MS / 16.7); // ~frames
        newParticles.push({
          x: cx,
          y: cy,
          vx,
          vy,
          rot: Math.random() * Math.PI,
          vrot: (Math.random() - 0.5) * 0.3,
          size,
          color,
          life: 1,
          decay,
          shape: Math.random() > 0.5 ? "rect" : "circle",
        });
      }
      particlesRef.current.push(...newParticles);
      if (rafRef.current == null) {
        rafRef.current = requestAnimationFrame(tick);
      }
    },
    [reducedMotion, tick],
  );

  // Clean up the RAF on unmount.
  useEffect(() => {
    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  const ConfettiCanvas = useCallback((): ReactElement => {
    return (
      <canvas
        ref={canvasRef}
        aria-hidden
        className="pointer-events-none fixed inset-0 z-50"
        data-ocid="drinks.confetti.canvas"
      />
    );
  }, []);

  return { burst, ConfettiCanvas };
}
