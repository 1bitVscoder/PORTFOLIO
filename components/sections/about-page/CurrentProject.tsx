'use client';

/* ABOUT PAGE Â· Current Project
   A single-project spotlight for the work in progress (TASKTROX), rendered with
   the EXACT same reveal as the home-page Projects card: a duplicated split
   title whose halves rotate apart on a pinned, scrubbed timeline to reveal the
   image card popping in, the funky badge spinning, and the meta pills fading.
   This is a standalone single card â€” none of the Projects â†’ Archive handoff
   that only the last home-page card needs. Data from content.projects (the same
   item the home grid uses) + the case-study pills. */

import { Fragment, useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import Image from 'next/image';
import { TransitionLink } from '@/components/transitions';
import { MetaLabel } from '@/components/ui/MetaLabel';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { content, caseStudies, getCaseStudySlugs } from '@/data';
import styles from './CurrentProject.module.css';

const SLUG = 'tasktrox';
const hasCaseStudy = new Set(getCaseStudySlugs()).has(SLUG);

// A card is only clickable once its split has opened past this TIMELINE progress
// (mirrors the home-page Projects gate). 0.6 â‰ˆ the image is visibly revealed.
const OPEN_THRESHOLD = 0.6;

export function AboutPageCurrentProject() {
  const containerRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const project = content.projects.items.find((p) => p.id === SLUG);

  useGSAP(
    () => {
      const container = containerRef.current;
      if (!container || !project) return;

      // Arm the open-state click gate only when motion is allowed (CSS reads
      // `data-split-gated`). Under reduced motion / no-JS the gate stays off so
      // the card stays clickable without depending on the scrubbed split.
      const gateClicks = !reducedMotion;
      if (gateClicks) container.dataset.splitGated = 'true';

      const ctx = gsap.context(() => {
        const section = container.querySelector<HTMLElement>(`.${styles.projectSection}`);
        if (!section) return;

        const topPart = section.querySelector(`.${styles.textTop}`);
        const botPart = section.querySelector(`.${styles.textBottom}`);
        const imgCard = section.querySelector(`.${styles.imageCard}`);
        const imgWrapper = section.querySelector(`.${styles.projectImgWrapper}`);
        const badge = section.querySelector(`.${styles.funkyBadge}`);
        const meta = section.querySelector(`.${styles.projectMeta}`);
        const metaLabel = section.querySelector(`.${styles.metaLabel}`);
        const stickyContainer = section.querySelector(`.${styles.projectSticky}`);

        // Open-state click gate: flip `data-open` from the TIMELINE progress
        // (visual truth â€” accounts for the scrub lag) so the affordance matches
        // what's on screen. CSS keys clickability off it.
        const setOpen = (open: boolean) => {
          if (stickyContainer)
            (stickyContainer as HTMLElement).dataset.open = open ? 'true' : 'false';
        };
        const openFromTimeline = (self: ScrollTrigger) =>
          setOpen((self.animation?.progress() ?? 0) >= OPEN_THRESHOLD);
        setOpen(false); // closed at rest â€” no clickable flash before first update

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: 'bottom bottom',
            scrub: 2.5,
            pin: stickyContainer,
            onUpdate: openFromTimeline,
          },
        });

        // 0. META LABEL EXIT â€” slide up and fade as the snap begins so the
        //    caption doesn't fight the split-title animation.
        if (metaLabel) {
          tl.to(
            metaLabel,
            { y: -60, opacity: 0, duration: 0.2, force3D: true, ease: 'power2.inOut' },
            'start',
          );
        }

        // 1. THE SNAP (Rotate and Separate)
        tl.to(
          topPart,
          { yPercent: -45, rotation: -5, force3D: true, ease: 'power2.inOut' },
          'start',
        ).to(
          botPart,
          { yPercent: 45, rotation: 5, force3D: true, ease: 'power2.inOut' },
          'start',
        );

        // 2. IMAGE POP (Scale and Straighten)
        tl.to(
          imgCard,
          { scale: 1, rotation: 0, opacity: 1, force3D: true, ease: 'back.out(1.2)' },
          'start+=0.05',
        );

        // 3. INNER PARALLAX
        tl.to(imgWrapper, { scale: 1.0, force3D: true, ease: 'none' }, 'start');

        // 4. BADGE SPIN IN
        tl.to(
          badge,
          { scale: 1, rotation: 360, force3D: true, ease: 'elastic.out(1, 0.5)' },
          'start+=0.3',
        );

        // 5. META FADE
        tl.to(meta, { opacity: 1, y: 0, force3D: true, duration: 0.2 }, 'start+=0.4');
      }, containerRef);

      return () => {
        // Preserve scroll across teardown: reverting kills the pin and removes
        // its spacer, shortening the document; if we are scrolled past the new
        // max the browser clamps scrollY â†’ a visible jump on route-change /
        // StrictMode remount. Capture scrollY first, revert, then restore.
        const savedScrollY = window.scrollY;
        ctx.revert();
        delete container.dataset.splitGated;
        if (window.scrollY !== savedScrollY) window.scrollTo(0, savedScrollY);
      };
    },
    { scope: containerRef, dependencies: [reducedMotion], revertOnUpdate: true },
  );

  if (!project) return null;

  const cardInner = (
    <>
      <MetaLabel className={styles.metaLabel} aria-hidden="true">
        Current Project
      </MetaLabel>

      {/* Image */}
      <div className={styles.imageCard}>
        <div className={styles.projectImgWrapper}>
          <Image
            src={project.image}
            alt={project.title}
            fill
            style={{ objectFit: 'cover', objectPosition: 'top' }}
            sizes="(max-width: 768px) 100vw, 80vw"
          />
        </div>
      </div>

      {/* Funky Badge */}
      <div
        className={styles.funkyBadge}
        style={{
          backgroundColor: project.badgeColor,
          color: project.badgeTextColor,
          boxShadow: `5px 5px 0px ${project.badgeShadowColor || 'black'}`,
        }}
      >
        <span>
          {project.badge.split(/<br\s*\/?>/i).map((line, i, arr) => (
            <Fragment key={i}>
              {line}
              {i < arr.length - 1 && <br />}
            </Fragment>
          ))}
        </span>
      </div>

      {/* Text Splitter */}
      <div className={styles.titleWrapper}>
        <div className={styles.textTop}>
          <div className={styles.textBacking}></div>
          <div className={styles.textContent}>{project.title}</div>
        </div>
        <div className={styles.textBottom}>
          <div className={styles.textBacking}></div>
          <div className={styles.textContent}>{project.title}</div>
        </div>
      </div>

      {/* Meta */}
      <div className={styles.projectMeta}>
        <div className={styles.pill}>
          {caseStudies[project.id]?.hero?.pills?.[1] ?? project.year}
        </div>
        <div className={styles.pill}>{project.category}</div>
      </div>
    </>
  );

  return (
    <div ref={containerRef} className={styles.section}>
      <div className={styles.projectSection}>
        {hasCaseStudy ? (
          <TransitionLink
            href={`/work/${project.id}`}
            className={styles.projectSticky}
            aria-label={`Open ${project.title} case study`}
            payload={{
              accent: project.themeColor,
              title: project.title,
              slug: project.id,
              year: project.year,
              category: project.category,
            }}
          >
            {cardInner}
          </TransitionLink>
        ) : (
          <div className={styles.projectSticky}>{cardInner}</div>
        )}
      </div>
    </div>
  );
}

