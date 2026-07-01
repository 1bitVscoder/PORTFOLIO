'use client';

import { StarIcon } from '@/components/sections/Hero/StarIcon';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { cssVars } from '@/lib/cssVars';
import styles from './WorksStickerMarquee.module.css';

export interface WorksStickerMarqueeProps {
  title: string;
  /** Per-row animation duration in seconds — drives `--marquee-dur`. */
  durationSec: number;
  /** When true, render title as outline (stroke) instead of fill. */
  outline?: boolean;
  /** Parent sticker signals hover → pause the track at its current offset. */
  paused?: boolean;
  /** Parent signals "use white ink" — used during the accent flood. */
  inverted?: boolean;
  /** Repeats per copy. The track holds two copies for a seamless -50% loop. */
  repeats?: number;
}

/**
 * Title-only ticker for a sticker row.
 *
 * Differs from WorksRowMarquee in two ways:
 *   1. Chunk is just the title (no discipline/year inline) — the sticker meta
 *      block carries those.
 *   2. Star separator alternates outline / filled across repeats, matching the
 *      v5 prototype's SkillsBar-style cadence.
 */
export function WorksStickerMarquee({
  title,
  durationSec,
  outline = false,
  paused = false,
  inverted = false,
  repeats = 6,
}: WorksStickerMarqueeProps) {
  const reduced = useReducedMotion();
  // reduced is folded into isPaused below — both hover-pause and reduced-motion
  // result in the same CSS paused class; no separate gate is needed.
  const trackStyle = cssVars({ '--marquee-dur': `${durationSec}s` });

  const chunkClass = `${styles.chunk}${outline ? ` ${styles.outline}` : ''}`;
  const isPaused = paused || reduced;
  const trackClass = `${styles.track}${isPaused ? ` ${styles.paused}` : ''}`;
  const viewportClass = `${styles.viewport}${inverted ? ` ${styles.inverted}` : ''}`;

  const renderCopy = (copyKey: string) => (
    <div key={copyKey} className={styles.copy} aria-hidden="true">
      {Array.from({ length: repeats }, (_, i) => (
        <span key={i} className={styles.unit}>
          <span className={chunkClass}>{title}</span>
          <span className={styles.star}>
            <StarIcon variant={i % 2 === 0 ? 'outline' : 'filled'} />
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
