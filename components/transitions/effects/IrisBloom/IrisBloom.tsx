'use client';

import { useGSAP } from '@gsap/react';
import { useEffect, useRef } from 'react';
import { gsap, ANIMATION_CONFIG } from '@/lib/gsap';
import { getAccentColors, transitionsConfig } from '@/data';
import { useReducedMotion } from '@/lib/useReducedMotion';
import type { TransitionEffectProps } from '../../types';
import styles from './IrisBloom.module.css';

/**
 * Iris Bloom — concentric color discs bloom outward from the click origin,
 * collapse inward to viewport center to reveal the new page.
 *
 * Adapted from the 04c-iris-bloom prototype with these production changes:
 * - 4 rings (was 5) to fit the ~2.4s budget
 * - useGSAP for automatic cleanup on unmount
 * - Standard easings from ANIMATION_CONFIG (no CustomEase registration)
 * - Reduced-motion crossfade fallback
 * - Origin defaults to viewport center on back-nav (origin === null)
 * - Innermost ring color = destination accent (from payload.accent)
 */

// --- Tunable knobs ---
// Oversize factor applied to the corner-to-center diagonal so the discs
// comfortably cover any viewport corner even when blooming from an edge origin.
const DISC_OVERSIZE = 2.2;
// Per-layer diameter shrink (inner discs are slightly smaller) so the rings
// read as distinct concentric bands rather than one flat fill.
const LAYER_SHRINK = 0.04;
// Seconds between each disc's scale tween — gives the bloom/collapse its
// sequential, rippling cadence.
const DISC_STAGGER = 0.08;

// Per-effect phase timing (seconds). Each effect owns its timing under
// data/transitions.json `effects[name]` (mirrors ColorCurtainStack's
// getCurtainConfig); fallbacks keep the effect working if the config is absent.
function getIrisConfig() {
  const cfg = (transitionsConfig.effects?.['iris-bloom'] ?? {}) as Record<
    string,
    unknown
  >;
  const num = (k: string, d: number) =>
    typeof cfg[k] === 'number' ? (cfg[k] as number) : d;
  return {
    exitDuration: num('exitDuration', 0.8),
    enterDuration: num('enterDuration', 1.4),
  };
}

// Outer → inner. Innermost is overridden at runtime with payload.accent.
// Other rings rotate through the palette (skipping the chosen accent for visual contrast).
function buildRingColors(accent: string): string[] {
  const palette = getAccentColors();
  const others = palette.filter((c) => c.toLowerCase() !== accent.toLowerCase());
  // 4 rings, outer-most first
  return [
    '#1b2028', // ink (always outer)
    others[0] ?? palette[1] ?? '#93b99e',
    others[1] ?? palette[2] ?? '#ff990a',
    accent,    // innermost = destination accent
  ];
}

function diagDist(cx: number, cy: number): number {
  const w = window.innerWidth;
  const h = window.innerHeight;
  // Oversize so the rings comfortably cover any corner.
  return Math.sqrt(
    Math.max(cx, w - cx) ** 2 + Math.max(cy, h - cy) ** 2
  ) * DISC_OVERSIZE;
}

export function IrisBloom({ phase, origin, payload, onComplete }: TransitionEffectProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const colors = buildRingColors(payload.accent);

  // The provider hands us a fresh `onComplete` arrow on every render. Park the
  // latest in a ref so the GSAP timeline always calls the current one without
  // including `onComplete` in the effect deps — an unrelated parent re-render
  // during the exit phase would otherwise re-run the effect body and fire
  // `onComplete` (→ a second `router.push`) a second time.
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Snapshot the motion mode at transition START (the exit phase) so one
  // transition plays ONE consistent mode across both phases. `useReducedMotion`
  // is live (useSyncExternalStore); reading it independently in exit and enter
  // would let an OS-setting toggle mid-transition mismatch the two branches
  // (e.g. reduced-motion exit hides the discs, then a non-reduced enter runs
  // against hidden discs and reveals the page instantly).
  const reduceMotionRef = useRef(reduceMotion);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;

      const discs = root.querySelectorAll<HTMLDivElement>(`.${styles.disc}`);
      if (discs.length === 0) return;

      // Take the snapshot in the effect (not during render) at transition
      // start; the enter phase reuses the value the exit phase captured.
      if (phase === 'exit') reduceMotionRef.current = reduceMotion;

      const fireComplete = () => onCompleteRef.current();
      const reduce = reduceMotionRef.current;

      // --- Reduced-motion path: simple crossfade panel ---
      if (reduce) {
        if (phase === 'exit') {
          gsap.set(discs, { display: 'none' });
          gsap.fromTo(
            root,
            { opacity: 0 },
            {
              opacity: 1,
              duration: transitionsConfig.reducedMotionDuration,
              ease: 'power2.out',
              onComplete: fireComplete,
            }
          );
        } else {
          gsap.to(root, {
            opacity: 0,
            duration: transitionsConfig.reducedMotionDuration,
            ease: 'power2.in',
            onComplete: fireComplete,
          });
        }
        return;
      }

      // A stale `display:none` (left over if a prior phase ran the
      // reduced-motion branch) would make the collapse invisible and reveal
      // the page instantly — always restore the discs before animating.
      gsap.set(discs, { clearProps: 'display' });

      // --- Geometry: where to anchor the bloom ---
      const w = window.innerWidth;
      const h = window.innerHeight;
      const cx = origin?.x ?? w / 2;
      const cy = origin?.y ?? h / 2;
      const D = diagDist(cx, cy);

      // Size each disc to the same diameter D (with a tiny per-layer shrink for
      // separation). We scale them in sequence from 0 → 1 for entry, and
      // 1 → 0 for exit. `anchorX`/`anchorY` let the enter branch re-center to
      // the current viewport mid before collapsing.
      const sizeFor = (i: number) => D * (1 - i * LAYER_SHRINK);
      const sizeDiscs = (anchorX: number, anchorY: number) => {
        discs.forEach((d, i) => {
          gsap.set(d, {
            left: `${anchorX}px`,
            top: `${anchorY}px`,
            width: `${sizeFor(i)}px`,
            height: `${sizeFor(i)}px`,
            xPercent: -50,
            yPercent: -50,
            background: colors[i],
          });
        });
      };

      sizeDiscs(cx, cy);

      const exitEase = ANIMATION_CONFIG.ease.outExpo;     // 'expo.out'
      const enterEase = ANIMATION_CONFIG.ease.inOutQuart; // 'power4.inOut'
      const irisCfg = getIrisConfig();

      if (phase === 'exit') {
        // Bloom outward — outermost (largest, behind) first, innermost last.
        gsap.set(discs, { scale: 0 });
        gsap.to(discs, {
          scale: 1,
          duration: irisCfg.exitDuration,
          ease: exitEase,
          stagger: DISC_STAGGER,
          onComplete: fireComplete,
        });
      } else {
        // Enter: rings start at scale 1 (covering screen from exit phase),
        // collapse inward to viewport center. Re-size the discs against the
        // CURRENT viewport (D above was just recomputed) and re-anchor to the
        // current center, so an orientation change / resize during the pending
        // hold can't leave the discs sized to the old diagonal and reveal the
        // outgoing page edge. Then collapse innermost → outer so the
        // destination accent is the last to leave.
        sizeDiscs(w / 2, h / 2);
        gsap.set(discs, { scale: 1 });
        gsap.to([...discs].reverse(), {
          scale: 0,
          duration: irisCfg.enterDuration,
          ease: enterEase,
          stagger: DISC_STAGGER,
          onComplete: fireComplete,
        });
      }
    },
    { scope: rootRef, dependencies: [phase] }
  );

  return (
    <div ref={rootRef} className={styles.root}>
      {/* 4 discs — outermost first */}
      <div className={styles.disc} />
      <div className={styles.disc} />
      <div className={styles.disc} />
      <div className={styles.disc} />
    </div>
  );
}
