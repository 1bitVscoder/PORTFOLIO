'use client';

import { type CSSProperties, useEffect, useRef } from 'react';
import Image from 'next/image';
import { gsap } from '@/lib/gsap';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { cssVars } from '@/lib/cssVars';
import styles from './WorksPreview.module.css';

export interface WorksPreviewEntry {
  id: string;
  image: string;
  alt: string;
  accent: string;
}

export interface WorksPreviewProps {
  /** All previewable projects, in stable document order. Mounted once,
   *  never reordered — `activeIndex` selects which one is exposed. */
  entries: WorksPreviewEntry[];
  /** Which entry is currently exposed by the slider. Ignored when `visible`
   *  is false, but kept around so the slider doesn't snap on hide. */
  activeIndex: number;
  /** True when a sticker with a previewable image is hovered. */
  visible: boolean;
}

/**
 * Cursor-following hero-image preview — port of the case-study Toggle
 * list-mode preview pattern.
 *
 * Why this shape rather than re-mounting an `<img>` per project:
 *   • All cards are mounted once inside an overflow-hidden window.
 *   • `.slider` translates Y by `activeIndex * 100%` to expose one card.
 *   • The outgoing card and incoming card slide together — that motion
 *     IS the project-swap transition. No fade, no re-mount, no flash.
 *   • GSAP `quickTo` tweens `left` / `top` (CSS positional props), so the
 *     outer element's `transform: translate(-50%, -50%) scale(...)` is
 *     free to own the show / hide animation.
 *   • First-show `snap`: when going from hidden → visible, `quickTo` is
 *     called with `startValue === value`, collapsing the tween to zero
 *     duration so the card pops in *at* the cursor instead of swooshing
 *     in from origin (0,0).
 */
export function WorksPreview({ entries, activeIndex, visible }: WorksPreviewProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const xToRef = useRef<ReturnType<typeof gsap.quickTo> | null>(null);
  const yToRef = useRef<ReturnType<typeof gsap.quickTo> | null>(null);
  const reduced = useReducedMotion();
  // Mirrors `visible` for the mousemove handler — without it, the listener
  // captures the boolean at attach time and can't tell rising-edge from
  // steady-state. The handler reads the ref each tick. The sync runs in an
  // effect (not during render) so it doesn't violate React's rules and
  // survives Strict Mode's double-invocation.
  const visibleRef = useRef(visible);
  useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return undefined;

    // Gate: only fine-pointer, hover-capable devices get the spring. On touch /
    // coarse-pointer devices this component is visually irrelevant (no mouse to
    // follow), and on reduced-motion the quickTo spring violates the user pref.
    // Matches the InteractiveBackground coarse-pointer precedent in CLAUDE.md.
    const canHover =
      typeof window !== 'undefined' &&
      window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!canHover || reduced) return undefined;

    xToRef.current = gsap.quickTo(el, 'left', { duration: 0.55, ease: 'power3' });
    yToRef.current = gsap.quickTo(el, 'top', { duration: 0.55, ease: 'power3' });

    const onMove = (e: MouseEvent) => {
      // While hidden, the preview is offscreen anyway — but we still snap
      // its position on every tick so that when `visible` flips true on
      // the next enter, the first paint lands right at the cursor.
      const snap = !visibleRef.current;
      if (snap) {
        xToRef.current?.(e.clientX, e.clientX);
        yToRef.current?.(e.clientY, e.clientY);
      } else {
        xToRef.current?.(e.clientX);
        yToRef.current?.(e.clientY);
      }
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMove);
      gsap.killTweensOf(el);
    };
  }, [reduced]);

  const rootClass = `${styles.preview}${visible ? ` ${styles.visible}` : ''}`;
  // The accent border + badge colour follow the active card so they
  // crossfade alongside the slide.
  const activeAccent = entries[activeIndex]?.accent;
  const rootStyle = activeAccent ? cssVars({ '--preview-accent': activeAccent }) : undefined;
  const sliderStyle: CSSProperties = {
    transform: `translateY(-${activeIndex * 100}%)`,
  };

  return (
    <div ref={rootRef} className={rootClass} style={rootStyle} aria-hidden="true">
      <div className={styles.slider} style={sliderStyle}>
        {entries.map((entry) => (
          <div key={entry.id} className={styles.card}>
            <Image
              className={styles.image}
              src={entry.image}
              alt={entry.alt}
              width={1600}
              height={1000}
              sizes="(min-width: 1024px) 360px, 280px"
              priority={false}
            />
          </div>
        ))}
      </div>
      <span className={styles.badge}>View<br />Case</span>
    </div>
  );
}
