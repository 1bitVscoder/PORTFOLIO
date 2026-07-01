'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { gsap, ANIMATION_CONFIG } from '@/lib/gsap';
import { content, getCaseStudy, getCaseStudySlugs } from '@/data';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { cssVars } from '@/lib/cssVars';
import { WorksIndex } from '@/components/sections/works-index/WorksIndex';
import { WorksCursor } from '@/components/sections/works-index/WorksCursor';
import { WorksPreview, type WorksPreviewEntry } from '@/components/sections/works-stickers/WorksPreview';
import styles from './WorksPage.module.css';

export function WorksPage() {
  const { worksIndex } = content;
  const caseStudySlugs = useMemo<ReadonlySet<string>>(
    () => new Set(getCaseStudySlugs()),
    []
  );

  const [cursorHovered, setCursorHovered] = useState(false);
  const [cursorAccent, setCursorAccent] = useState<string | null>(null);

  // Preview slider — same Toggle-pattern as /work2. Filters projects to
  // those with a resolvable case-study hero image, then drives the slider by
  // index. Latched on hover-end so the slider doesn't snap back to slot 0
  // mid-hide. worksIndex.projects is a build-time JSON ref so this memo
  // runs once.
  const previewEntries = useMemo<WorksPreviewEntry[]>(() => {
    return worksIndex.projects.flatMap((project) => {
      const cs = getCaseStudy(project.id);
      if (!cs?.hero?.image) return [];
      return [{
        id: project.id,
        image: cs.hero.image,
        alt: cs.hero.alt ?? '',
        accent: project.accent,
      }];
    });
  }, [worksIndex.projects]);

  const entryIndexById = useMemo(() => {
    const m = new Map<string, number>();
    previewEntries.forEach((entry, i) => m.set(entry.id, i));
    return m;
  }, [previewEntries]);

  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewVisible, setPreviewVisible] = useState(false);

  const reduced = useReducedMotion();
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Intro reveal — runs once after mount, gated by reduced-motion.
  // Marquees self-gate reduced-motion inside WorksRowMarquee (own module).
  useEffect(() => {
    if (reduced) return undefined;
    const root = rootRef.current;
    if (!root) return undefined;

    const ctx = gsap.context(() => {
      gsap.from(`.${styles.headline} > span, .${styles.headline} em`, {
        yPercent: 110,
        duration: ANIMATION_CONFIG.duration.slower,
        ease: ANIMATION_CONFIG.ease.outExpo,
        stagger: ANIMATION_CONFIG.stagger.letters,
        delay: ANIMATION_CONFIG.delays.short,
      });
      gsap.from(`.${styles.lede}`, {
        opacity: 0,
        y: 16,
        duration: ANIMATION_CONFIG.duration.slow,
        delay: ANIMATION_CONFIG.delays.medium,
        ease: ANIMATION_CONFIG.ease.outQuart,
      });
    }, root);

    return () => ctx.revert();
  }, [reduced]);

  // Page-wide accent for the headline dot — kept in sync with the cursor.
  const rootStyle = cursorAccent ? cssVars({ '--accent': cursorAccent }) : undefined;

  const count = String(worksIndex.projects.length).padStart(2, '0');

  return (
    <div ref={rootRef} className={styles.root} style={rootStyle}>
      <main className={styles.main}>
        <section className={styles.intro}>
          <h1 className={styles.headline}>
            {/* Per-glyph spans for the reveal stagger. The final glyph wears
             *  <em> so the headline-dot ::after pseudo lands on it. */}
            {Array.from(worksIndex.intro.headline).map((char, i, arr) => {
              const isLast = i === arr.length - 1;
              const key = `${char}-${i}`;
              return isLast ? (
                <em key={key}>{char}</em>
              ) : (
                <span key={key}>{char}</span>
              );
            })}
          </h1>
          <p className={styles.lede}>{worksIndex.intro.lede}</p>
        </section>

        <WorksIndex
          projects={worksIndex.projects}
          legend={worksIndex.legend}
          caseStudySlugs={caseStudySlugs}
          onRowHoverChange={(hovered, project) => {
            setCursorHovered(hovered);
            setCursorAccent(hovered && project ? project.accent : null);
            if (hovered && project) {
              const idx = entryIndexById.get(project.id);
              if (idx !== undefined) {
                setPreviewIndex(idx);
                setPreviewVisible(true);
              } else {
                // Row without a case-study image — hide the preview but
                // keep slider position latched so it doesn't snap.
                setPreviewVisible(false);
              }
            } else {
              setPreviewVisible(false);
            }
          }}
        />

        <div className={styles.end}>
          <span>
            {worksIndex.end.left}{' '}
            <b>
              {count} of {count}
            </b>{' '}
            entries.
          </span>
          <span>
            {worksIndex.end.right} <b>{worksIndex.topBar.lastRevised}</b>
          </span>
        </div>
      </main>

      <WorksCursor hovered={cursorHovered} accent={cursorAccent} />
      <WorksPreview
        entries={previewEntries}
        activeIndex={previewIndex}
        visible={previewVisible}
      />
    </div>
  );
}
