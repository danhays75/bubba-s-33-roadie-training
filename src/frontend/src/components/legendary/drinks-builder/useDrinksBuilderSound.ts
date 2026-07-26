// useDrinksBuilderSound — WebAudio-based sound effects for the Drinks
// Builder game. No asset files; all sounds are synthesized in-browser.
//
// Sounds:
//   - playCorrect: a bright "pour/ding" — two quick ascending sine pings
//     (a correct tap, like liquid hitting the glass).
//   - playWrong: a low "buzz" — a short sawtooth growl at ~110 Hz with a
//     fast decay (a wrong tap).
//   - playFinish: a "victory chime" — a three-note ascending arpeggio
//     (a completed drink, before confetti).
//
// Mute state is owned here and exposed via `muted` / `toggleMute`. The
// initial mute state is `!soundDefault` (muted when the activity's
// soundDefault is false). The hook is intentionally resilient: if the
// AudioContext cannot be created (e.g. older browser, autoplay policy),
// the play* functions are no-ops and mute still toggles.

import { useCallback, useEffect, useRef, useState } from "react";

interface UseDrinksBuilderSoundResult {
  muted: boolean;
  toggleMute: () => void;
  setMuted: (next: boolean) => void;
  playCorrect: () => void;
  playWrong: () => void;
  playFinish: () => void;
  /**
   * Play an audio clip from `url` using a single reused
   * HTMLAudioElement. No-op when muted. Stops + resets any in-flight
   * clip before starting the new one so clips never overlap. play() is
   * wrapped in a best-effort catch so autoplay-policy rejections never
   * throw.
   */
  playClip: (url: string) => void;
  /**
   * Prime the reused audio element on the game's Start gesture so
   * later play() calls are allowed by the browser autoplay policy.
   * Calls load() on the element (and a muted 0-volume play().catch) to
   * unlock playback. Safe to call repeatedly.
   */
  unlockAudio: () => void;
}

/**
 * @param soundDefault the activity's soundDefault setting. The hook starts
 *   unmuted when soundDefault is true, muted when false.
 */
export function useDrinksBuilderSound(
  soundDefault: boolean,
): UseDrinksBuilderSoundResult {
  const [muted, setMutedState] = useState(!soundDefault);
  const ctxRef = useRef<AudioContext | null>(null);
  // A single reused HTMLAudioElement for clip playback. Created lazily
  // on first playClip / unlockAudio call so the hook does not trigger
  // autoplay-policy warnings before the user interacts. Reused across
  // all plays — stop+reset before setting a new src so clips never
  // overlap. Obeys the SAME mute state as the SFX (checked inside
  // playClip).
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  const getAudioEl = useCallback((): HTMLAudioElement | null => {
    if (typeof window === "undefined") return null;
    if (audioElRef.current) return audioElRef.current;
    try {
      const el = new Audio();
      // Preload metadata so the first play() is responsive once
      // unlocked. We do NOT set autoplay — play() is called explicitly.
      el.preload = "auto";
      audioElRef.current = el;
      return el;
    } catch {
      return null;
    }
  }, []);

  // Lazily create the AudioContext on first use (not on mount) so the hook
  // does not trigger autoplay-policy warnings before the user interacts.
  const getCtx = useCallback((): AudioContext | null => {
    if (typeof window === "undefined") return null;
    if (ctxRef.current) return ctxRef.current;
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    try {
      ctxRef.current = new Ctor();
      return ctxRef.current;
    } catch {
      return null;
    }
  }, []);

  // Resume the context on first user gesture if it was suspended by the
  // browser autoplay policy. Safe to call repeatedly.
  const resumeCtx = useCallback(async () => {
    const ctx = getCtx();
    if (ctx && ctx.state === "suspended") {
      try {
        await ctx.resume();
      } catch {
        // ignore — sound is best-effort
      }
    }
  }, [getCtx]);

  // Play a single tone with the given frequency, duration, type, and gain.
  const playTone = useCallback(
    (
      freq: number,
      duration: number,
      type: OscillatorType,
      gain: number,
      startOffset = 0,
    ) => {
      const ctx = getCtx();
      if (!ctx) return;
      const now = ctx.currentTime + startOffset;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      // Quick attack, exponential decay — percussive feel.
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(gain, now + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + duration + 0.02);
    },
    [getCtx],
  );

  const playCorrect = useCallback(() => {
    if (muted) return;
    void resumeCtx();
    // Two quick ascending sine pings — bright "ding".
    playTone(880, 0.12, "sine", 0.18, 0);
    playTone(1320, 0.16, "sine", 0.16, 0.08);
  }, [muted, playTone, resumeCtx]);

  const playWrong = useCallback(() => {
    if (muted) return;
    void resumeCtx();
    // Low sawtooth growl — short buzz.
    playTone(110, 0.22, "sawtooth", 0.16, 0);
    playTone(82, 0.18, "square", 0.08, 0.04);
  }, [muted, playTone, resumeCtx]);

  const playFinish = useCallback(() => {
    if (muted) return;
    void resumeCtx();
    // Three-note ascending arpeggio — victory chime.
    playTone(523.25, 0.18, "triangle", 0.18, 0); // C5
    playTone(659.25, 0.18, "triangle", 0.18, 0.12); // E5
    playTone(783.99, 0.32, "triangle", 0.2, 0.24); // G5
  }, [muted, playTone, resumeCtx]);

  const toggleMute = useCallback(() => {
    setMutedState((m) => !m);
  }, []);

  const setMuted = useCallback((next: boolean) => {
    setMutedState(next);
  }, []);

  // Play an audio clip from `url`. No-op when muted. Stops + resets any
  // in-flight clip (pause + currentTime=0 + clear src) before setting
  // the new src and calling play() so clips never overlap. play() is
  // wrapped in a best-effort .catch(() => {}) so autoplay-policy
  // rejections never throw. The clip player obeys the SAME mute state
  // as the SFX (checked here, against the `muted` state).
  const playClip = useCallback(
    (url: string) => {
      if (muted) return;
      if (!url) return;
      const el = getAudioEl();
      if (!el) return;
      // Stop + reset any in-flight clip before starting a new one.
      try {
        el.pause();
        el.currentTime = 0;
        el.removeAttribute("src");
        el.load();
      } catch {
        // ignore — best-effort reset
      }
      el.src = url;
      // Best-effort play — autoplay-policy rejections are swallowed.
      void el.play().catch(() => {});
    },
    [muted, getAudioEl],
  );

  // Prime the reused audio element on the game's Start gesture so later
  // play() calls are allowed by the browser autoplay policy. Calls
  // load() on the element (and a muted 0-volume play().catch) to unlock
  // playback. Safe to call repeatedly.
  const unlockAudio = useCallback(() => {
    const el = getAudioEl();
    if (!el) return;
    try {
      el.muted = true;
      el.volume = 0;
      el.play()
        .then(() => {
          // Once unlocked, restore audible playback for real clips.
          el.pause();
          el.currentTime = 0;
          el.muted = false;
          el.volume = 1;
        })
        .catch(() => {
          // Autoplay still blocked — restore audible state for the next
          // user-gesture-triggered play().
          el.muted = false;
          el.volume = 1;
        });
    } catch {
      // ignore — best-effort unlock
    }
  }, [getAudioEl]);

  // Close the AudioContext on unmount to free the audio thread. Also
  // pause + clear the reused HTMLAudioElement so no clip keeps playing
  // after the component unmounts.
  useEffect(() => {
    return () => {
      const ctx = ctxRef.current;
      if (ctx) {
        try {
          void ctx.close();
        } catch {
          // ignore
        }
      }
      ctxRef.current = null;
      const el = audioElRef.current;
      if (el) {
        try {
          el.pause();
          el.currentTime = 0;
          el.removeAttribute("src");
          el.load();
        } catch {
          // ignore
        }
      }
      audioElRef.current = null;
    };
  }, []);

  return {
    muted,
    toggleMute,
    setMuted,
    playCorrect,
    playWrong,
    playFinish,
    playClip,
    unlockAudio,
  };
}
