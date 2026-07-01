'use client';

import { type ReactNode, useState } from 'react';
import { TransitionLink } from '@/components/transitions';
import type { WorksIndexProject } from '@/data';
import { WorksStickerMarquee } from '@/components/sections/works-stickers/WorksStickerMarquee';
import { cssVars } from '@/lib/cssVars';
import styles from './WorksSticker.module.css';

export interface WorksStickerProps {
  /** Zero-based index — drives badge number, tilt, offset, wobble parity. */
  index: number;
  project: WorksIndexProject;
  /** True when a matching case-study slug exists; gates link vs static div. */
  hasCaseStudy: boolean;
  /** Decal glyph for the corner badge — small visual rhythm only. */
  decal: string;
  /** Bubbled hover state — page-level cursor + preview coordination.
   *  Bubbles the whole project so the page can look up the case-study
   *  hero image for the preview card. */
  onHoverChange: (hovered: boolean, project: WorksIndexProject) => void;
  /** Persisted site accent — used as `payload.accent` in the TransitionLink so
   *  the transition preserves the global accent rather than overriding it with
   *  the project's palette color. Hover/cursor visuals still use project.accent. */
  currentAccent: string;
}

/** Cyclic visual rhythm — first 10 entries match the v5 prototype, then wraps. */
// TILT_SEQ: initial rotation of each sticker in degrees; alternates sign for variety.
const TILT_SEQ = [-2.4, 1.6, -1.2, 2.8, -3, 1.2, -2, 2.2, -1.6, 2.6];
// OFFSET_SEQ: horizontal nudge as viewport-width %; keeps stickers from aligning.
const OFFSET_SEQ = [0, 6, -4, 3, 0, 7, -5, 0, 4, -3];
// WOBBLE_DUR_SEQ: CSS keyframe duration in seconds; de-syncs the idle float animation.
const WOBBLE_DUR_SEQ = [5, 6, 4.5, 5.5, 4, 6, 5, 4.5, 5.5, 4];

export function WorksSticker({
  index,
  project,
  hasCaseStudy,
  decal,
  onHoverChange,
  currentAccent,
}: WorksStickerProps) {
  const [hovered, setHovered] = useState(false);
  const num = String(index + 1).padStart(2, '0');

  const tilt = TILT_SEQ[index % TILT_SEQ.length];
  const offset = OFFSET_SEQ[index % OFFSET_SEQ.length];
  const wobbleDur = WOBBLE_DUR_SEQ[index % WOBBLE_DUR_SEQ.length];
  const wobbleSign = index % 2 === 0 ? 1 : -1;

  const className = `${styles.sticker}${hovered ? ` ${styles.isHover}` : ''}`;
  const style = cssVars({
    '--sticker-accent': project.accent,
    '--tilt': `${tilt}deg`,
    '--offset': `${offset}%`,
    '--wobble-dur': `${wobbleDur}s`,
    '--wobble-amp': `${wobbleSign * 0.6}deg`,
    // animation-delay staggers the wobbles so stickers don't move in lockstep.
    '--wobble-delay': `${(index % 4) * -0.7}s`,
  });

  const handleEnter = () => {
    setHovered(true);
    onHoverChange(true, project);
  };
  const handleLeave = () => {
    setHovered(false);
    onHoverChange(false, project);
  };

  const inner: ReactNode = (
    <>
      <div className={styles.num}>{num}</div>
      <div className={styles.marquee}>
        <WorksStickerMarquee
          title={project.title}
          durationSec={project.marqueeDurationSec}
          outline={index % 2 === 1}
          paused={hovered}
          inverted={hovered}
        />
      </div>
      <div className={styles.meta}>
        <span className={styles.discipline}>{project.discipline}</span>
        <span className={styles.year}>{project.year}</span>
      </div>
      <div className={styles.decal} aria-hidden="true">{decal}</div>
    </>
  );

  if (hasCaseStudy) {
    return (
      <TransitionLink
        href={`/work/${project.id}`}
        className={className}
        style={style}
        // Must stay derived from project.title — visible title lives only inside
        // the aria-hidden marquee, so this label is the sole AT-visible name.
        aria-label={`Open ${project.title} case study`}
        payload={{
          // Use the persisted site accent, not project.accent. project.accent
          // is a palette member on /work2 (#62b6cb, #da3036) — feeding it to
          // the TransitionProvider accent gate would override --color-accent-purple.
          // The curtain's forward branch (has title) reads --color-accent-purple
          // directly for panel color; it does not use payload.accent.
          accent: currentAccent,
          title: project.title,
          slug: project.id,
          year: String(project.year),
          category: project.discipline,
        }}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
      >
        {inner}
      </TransitionLink>
    );
  }

  // No case study yet — render as an inert div (not a fake link).
  // The sr-only span provides an accessible name since project.title
  // is otherwise only present inside the aria-hidden marquee.
  return (
    <div
      className={className}
      style={style}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {/* Provides an accessible name: project.title lives only inside the
          aria-hidden marquee, so keyboard/AT users would otherwise get nothing. */}
      <span className="sr-only">
        {project.title} — case study coming soon
      </span>
      {inner}
    </div>
  );
}
