'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { WorksIndexProject } from '@/data';
import { WorksSticker } from '@/components/sections/works-stickers/WorksSticker';
import styles from './WorksStickerList.module.css';

export interface WorksStickerListProps {
  projects: WorksIndexProject[];
  /** Set of slugs with a matching case study. Gates link rendering. */
  caseStudySlugs: ReadonlySet<string>;
  /** Bubbled to the page for cursor + preview coordination. Bubbles the
   *  full project (or null) so the page can resolve the preview image. */
  onStickerHoverChange: (hovered: boolean, project: WorksIndexProject | null) => void;
  /** Persisted site accent — threaded to each sticker's TransitionLink payload
   *  so the transition keeps the global accent rather than the project's color. */
  currentAccent: string;
}

/** Decal glyphs cycle visual rhythm — first ten match the v5 prototype. */
const DECAL_SEQ = ['01', '★', '▲', '✦', '✱', '◐', '■', '⟢', '◇', '✚'];

/** Grace period (ms) before bubbling a "no sticker hovered" signal up. */
const LEAVE_DEFER_MS = 60;

export function WorksStickerList({
  projects,
  caseStudySlugs,
  onStickerHoverChange,
  currentAccent,
}: WorksStickerListProps) {
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (leaveTimerRef.current !== null) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
  }, []);

  const handleHover = useCallback(
    (hovered: boolean, project: WorksIndexProject) => {
      if (hovered) {
        if (leaveTimerRef.current !== null) {
          clearTimeout(leaveTimerRef.current);
          leaveTimerRef.current = null;
        }
        onStickerHoverChange(true, project);
      } else {
        if (leaveTimerRef.current !== null) clearTimeout(leaveTimerRef.current);
        leaveTimerRef.current = setTimeout(() => {
          leaveTimerRef.current = null;
          onStickerHoverChange(false, null);
        }, LEAVE_DEFER_MS);
      }
    },
    [onStickerHoverChange]
  );

  return (
    <section className={styles.stack}>
      {projects.map((project, i) => (
        <WorksSticker
          key={project.id}
          index={i}
          project={project}
          hasCaseStudy={caseStudySlugs.has(project.id)}
          decal={DECAL_SEQ[i % DECAL_SEQ.length]}
          onHoverChange={handleHover}
          currentAccent={currentAccent}
        />
      ))}
    </section>
  );
}
