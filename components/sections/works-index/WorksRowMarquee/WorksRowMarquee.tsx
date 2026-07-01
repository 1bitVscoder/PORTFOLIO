'use client';

import { StarIcon } from '@/components/sections/Hero/StarIcon';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { cssVars } from '@/lib/cssVars';
import styles from './WorksRowMarquee.module.css';

export interface WorksRowMarqueeProps {
  title: string;
  discipline: string;
  year: number;
  /** Per-row animation duration in seconds — drives `--marquee-dur`. */
  durationSec: number;
  /** When true, render the title as an outline (stroke) instead of fill. */
  outline?: boolean;
  /** Parent row signals hover → pauses the track. Also paused when
   *  prefers-reduced-motion is on (self-gated, see body). */
  paused?: boolean;
  /** Parent row signals "use white ink" — used during hover flood. */
  inverted?: boolean;
  /** Repeats per copy. Each copy holds N chunks; track holds two copies for
   *  a seamless -50% loop. */
  repeats?: number;
}

/**
 * Renders the infinite horizontal title ticker for one row of the Works Index.
 *
 * The track is a single CSS keyframe animation; pause is owned by this module
 * via the `paused` prop. This avoids any cross-module class-name coupling
 * (CSS-module name format is not a stable contract).
 */
export function WorksRowMarquee({
  title,
  discipline,
  year,
  durationSec,
  outline = false,
  paused = false,
  inverted = false,
  repeats = 4,
}: WorksRowMarqueeProps) {
  const reduced = useReducedMotion();
  const trackStyle = cssVars({ '--marquee-dur': `${durationSec}s` });

  const chunkClass = `${styles.chunk}${outline ? ` ${styles.outline}` : ''}`;
  const isPaused = paused || reduced;
  const trackClass = `${styles.track}${isPaused ? ` ${styles.paused}` : ''}`;
  const viewportClass = `${styles.viewport}${inverted ? ` ${styles.inverted}` : ''}`;

  // One copy of the chunk sequence — repeated twice inside the track for
  // a seamless `0 → -50%` loop, with `.copy { flex: 0 0 50% }` so the
  // browser's layout — not glyph rounding — sets the wrap distance.
  const renderCopy = (copyKey: string) => (
    <div key={copyKey} className={styles.copy} aria-hidden="true">
      {Array.from({ length: repeats }, (_, i) => (
        <span key={i} className={chunkClass}>
          {title}
          <span className={styles.star}>
            <StarIcon variant="outline" />
          </span>
          <span className={styles.tag}>{discipline}</span>
          <span className={styles.star}>
            <StarIcon variant="filled" />
          </span>
          <span className={styles.tag}>{year}</span>
          <span className={styles.star}>
            <StarIcon variant="outline" />
          </span>
        </span>
      ))}
    </div>
  );

  return (
    <div className={viewportClass} aria-hidden="true">
      <div className={trackClass} style={trackStyle}>
        {renderCopy('a')}
        {renderCopy('b')}
      </div>
    </div>
  );
}
