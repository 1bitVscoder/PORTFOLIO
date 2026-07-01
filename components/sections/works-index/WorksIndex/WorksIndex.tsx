'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { WorksIndexContent, WorksIndexProject } from '@/data';
import { WorksRow } from '@/components/sections/works-index/WorksRow';
import styles from './WorksIndex.module.css';

export interface WorksIndexProps {
  projects: WorksIndexProject[];
  legend: WorksIndexContent['legend'];
  /** Set of slugs that have a matching case study. Gates link rendering. */
  caseStudySlugs: ReadonlySet<string>;
  /** Bubbled to the page for cursor + preview coordination. Bubbles the
   *  full project (or null on leave) so the page can resolve the
   *  case-study hero image for the preview slider. */
  onRowHoverChange: (hovered: boolean, project: WorksIndexProject | null) => void;
}

/** Grace period (ms) before bubbling a "no row hovered" signal up. Long
 *  enough that a same-tick sibling enter can cancel the off-signal — short
 *  enough that a real exit feels immediate. */
const LEAVE_DEFER_MS = 60;

export function WorksIndex({
  projects,
  legend,
  caseStudySlugs,
  onRowHoverChange,
}: WorksIndexProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear any pending leave-defer on unmount so a stale "off" doesn't fire
  // after the component has gone.
  useEffect(() => () => {
    if (leaveTimerRef.current !== null) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
  }, []);

  const handleHover = useCallback(
    (project: WorksIndexProject, hovered: boolean) => {
      if (hovered) {
        // Cancel any deferred leave from the previous row — the cursor stays
        // grown and just swaps colour.
        if (leaveTimerRef.current !== null) {
          clearTimeout(leaveTimerRef.current);
          leaveTimerRef.current = null;
        }
        setHoveredId(project.id);
        onRowHoverChange(true, project);
      } else {
        // Local state clears immediately when this row was the active one.
        setHoveredId((current) => (current === project.id ? null : current));
        // Defer the page-level "off" so a sibling enter (which fires AFTER
        // this leave in DOM order) can cancel it before the cursor flickers.
        if (leaveTimerRef.current !== null) clearTimeout(leaveTimerRef.current);
        leaveTimerRef.current = setTimeout(() => {
          leaveTimerRef.current = null;
          onRowHoverChange(false, null);
        }, LEAVE_DEFER_MS);
      }
    },
    [onRowHoverChange]
  );

  return (
    <section className={styles.root}>
      <div className={styles.legend}>
        <div>{legend.number}</div>
        <div>{legend.project}</div>
        <div>{legend.meta}</div>
      </div>

      {projects.map((project, i) => (
        <WorksRow
          key={project.id}
          index={i}
          project={project}
          hasCaseStudy={caseStudySlugs.has(project.id)}
          dimmed={hoveredId !== null && hoveredId !== project.id}
          onHoverChange={(hovered) => handleHover(project, hovered)}
        />
      ))}
    </section>
  );
}
