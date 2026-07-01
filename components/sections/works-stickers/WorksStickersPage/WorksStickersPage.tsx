'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { gsap, ANIMATION_CONFIG } from '@/lib/gsap';
import { content, getCaseStudy, getCaseStudySlugs } from '@/data';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { useAccentColor } from '@/lib/AccentColorContext';
import { cssVars } from '@/lib/cssVars';
import { TransitionLink } from '@/components/transitions';
import { WorksStickerList } from '@/components/sections/works-stickers/WorksStickerList';
import { WorksPreview, type WorksPreviewEntry } from '@/components/sections/works-stickers/WorksPreview';
import { WorksCursor } from '@/components/sections/works-index/WorksCursor';
import { StarIcon } from '@/components/sections/Hero/StarIcon';
import { splitLede, ledeRevealIn } from '@/components/sections/ServicesV2/dialMotion';
import styles from './WorksStickersPage.module.css';

/**
 * /work2 — sticker-marquee variant.
 *
 * Same data as /work; different row layout (tilted pills with hover-flood).
 * Reuses WorksCursor + the layout-level <InteractiveBackground />. No header.
 */
export function WorksStickersPage() {
  const { worksIndex } = content;
  const caseStudySlugs = useMemo<ReadonlySet<string>>(
    () => new Set(getCaseStudySlugs()),
    []
  );

  const [cursorHovered, setCursorHovered] = useState(false);
  const [cursorAccent, setCursorAccent] = useState<string | null>(null);

  // Previewable projects — only those with a resolvable case-study hero
  // image. Mounted once; active card selected by index, not by re-mount.
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

  // Index lookup: project.id → slot in previewEntries.
  // undefined means "no preview for this project" (Map.get miss).
  // Latched: we don't reset on hover-end so the slider doesn't snap.
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewVisible, setPreviewVisible] = useState(false);

  const entryIndexById = useMemo(() => {
    const m = new Map<string, number>();
    previewEntries.forEach((entry, i) => m.set(entry.id, i));
    return m;
  }, [previewEntries]);

  const reduced = useReducedMotion();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const ledeRef = useRef<HTMLParagraphElement | null>(null);
  const { color: currentAccent } = useAccentColor();

  // Dismiss the preview immediately when the user presses down (click/touch).
  // The 60ms deferred hover-off in WorksStickerList may not fire before the
  // transition navigates away, leaving the preview attached. pointerdown fires
  // at the very start of the press — before navigation begins — so this is the
  // earliest reliable dismiss point and also covers touch events.
  useEffect(() => {
    const handlePointerDown = () => setPreviewVisible(false);
    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  // Intro reveal — runs once after mount, gated by reduced-motion.
  // Marquees + sticker wobble self-gate inside their own modules.
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
      // Lede load-up — identical to the ServicesV2 case-study lede: split into
      // per-word overflow masks (preserving the <b> lead), then slide each
      // word up from yPercent:110, staggered line by line. splitLede replaces
      // the server-rendered fallback HTML; ledeRevealIn's immediateRender hides
      // the words synchronously so there's no flash of the laid-out copy.
      const ledeEl = ledeRef.current;
      if (ledeEl) {
        splitLede(worksIndex.intro.lede, ledeEl, {
          ledeWord: styles.ledeWord,
          ledeWordInner: styles.ledeWordInner,
          ledeBold: styles.ledeBold,
        });
        ledeRevealIn(ledeEl, styles.ledeWordInner);
      }
    }, root);

    return () => ctx.revert();
  }, [reduced, worksIndex.intro.lede]);

  const rootStyle = cursorAccent ? cssVars({ '--accent': cursorAccent }) : undefined;

  const count = String(worksIndex.projects.length).padStart(2, '0');

  return (
    <div ref={rootRef} className={styles.root} style={rootStyle}>
      <main className={styles.main}>
        {/* Back-to-home — same circular pill pattern as case-study Hero's
            .backLink. No payload.title triggers the "back" branch in
            ColorCurtainStack which previews skills instead of a destination.
            Generic <div> (not <header>) — the layout-level Navbar already
            owns the page banner landmark; a second <header> would announce
            as a duplicate banner to screen readers. */}
        <div className={styles.topBar}>
          <TransitionLink
            href="/"
            className={styles.backLink}
            aria-label="Back to home"
            payload={{ accent: currentAccent }}
          >
            <span aria-hidden="true">←</span>
          </TransitionLink>
        </div>

        <section className={styles.intro}>
          <div className={styles.metaLabel}>
            <StarIcon variant="outline" baseClassName={styles.starIcon} />
            {worksIndex.intro.eyebrow}
          </div>
          <h1 className={styles.headline}>
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
          {/* Rendered server-side as the reduced-motion / no-JS fallback;
              splitLede replaces this with per-word masks on mount when motion
              is allowed. Content is trusted checked-in HTML (only <b>), and
              splitLede re-sanitises to a <b>/<strong> allowlist. */}
          <p
            ref={ledeRef}
            className={styles.lede}
            dangerouslySetInnerHTML={{ __html: worksIndex.intro.lede }}
          />
        </section>

        <WorksStickerList
          projects={worksIndex.projects}
          caseStudySlugs={caseStudySlugs}
          currentAccent={currentAccent}
          onStickerHoverChange={(hovered, project) => {
            setCursorHovered(hovered);
            setCursorAccent(hovered && project ? project.accent : null);
            if (hovered && project) {
              const idx = entryIndexById.get(project.id);
              if (idx !== undefined) {
                // Sticker has a previewable image — slide to it + show.
                setPreviewIndex(idx);
                setPreviewVisible(true);
              } else {
                // Sticker without a case-study image — hide the preview
                // but keep the slider position latched so it doesn't snap.
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
