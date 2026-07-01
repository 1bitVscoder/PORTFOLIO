'use client';

import { type ReactNode, useState } from 'react';
import { TransitionLink } from '@/components/transitions';
import type { WorksIndexProject } from '@/data';
import { WorksRowMarquee } from '@/components/sections/works-index/WorksRowMarquee';
import { cssVars } from '@/lib/cssVars';
import styles from './WorksRow.module.css';

export interface WorksRowProps {
  /** Zero-based index in the index list — drives № display and outline parity. */
  index: number;
  project: WorksIndexProject;
  /** True when a matching case-study slug exists; gates whether the row is a link. */
  hasCaseStudy: boolean;
  /** True when another row is the active-hovered one — drops opacity. */
  dimmed?: boolean;
  /** Bubbled hover state — page-level cursor + dim-other-rows + preview
   *  coordination. Bubbles the full project so the page can look up the
   *  case-study hero image for the preview slider. */
  onHoverChange: (hovered: boolean, project: WorksIndexProject) => void;
}

export function WorksRow({
  index,
  project,
  hasCaseStudy,
  dimmed = false,
  onHoverChange,
}: WorksRowProps) {
  const [hovered, setHovered] = useState(false);
  const num = String(index + 1).padStart(2, '0');
  const className = `${styles.row}${hovered ? ` ${styles.isHover}` : ''}`;
  const style = cssVars({ '--row-accent': project.accent });

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
      <div className={styles.num}>№ {num}</div>
      <WorksRowMarquee
        title={project.title}
        discipline={project.discipline}
        year={project.year}
        durationSec={project.marqueeDurationSec}
        outline={index % 2 === 1}
        paused={hovered}
        inverted={hovered}
      />
      <div className={styles.meta}>
        <span className={styles.discipline}>{project.discipline}</span>
        <span className={styles.year}>{project.year}</span>
        <span className={styles.arrow}>View case →</span>
      </div>
    </>
  );

  // `data-dim` is a string boolean — present + "true" when the row should
  // dim. CSS selector matches `[data-dim='true']`.
  const dataDim = dimmed && !hovered ? 'true' : undefined;

  if (hasCaseStudy) {
    return (
      <TransitionLink
        href={`/work/${project.id}`}
        className={className}
        style={style}
        data-dim={dataDim}
        // The visible title lives only inside the aria-hidden marquee, so this
        // aria-label is the sole accessible name for the link. It must stay
        // derived from project.title to stay in sync with what the user sees.
        aria-label={`Open ${project.title} case study`}
        payload={{
          accent: project.accent,
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

  // Non-link branch: a plain div. No aria-disabled (semantically inert on
  // non-interactive elements — it would only confuse assistive tech). The
  // sr-only span below provides an accessible name and signals to screen
  // reader users that this project is not yet navigable.
  return (
    <div
      className={className}
      style={style}
      data-dim={dataDim}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {/* The visible title is aria-hidden inside the marquee; this span gives
       *  screen readers the project name and a "coming soon" cue without
       *  rendering a fake interactive element. */}
      <span className="sr-only">{project.title} — case study coming soon</span>
      {inner}
    </div>
  );
}
