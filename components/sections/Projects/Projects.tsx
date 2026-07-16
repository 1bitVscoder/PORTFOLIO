'use client';

import { Fragment, useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import Image from 'next/image';
import { TransitionLink } from '@/components/transitions';
import { MetaLabel } from '@/components/ui/MetaLabel';
import { useReducedMotion } from '@/lib/useReducedMotion';
import styles from './Projects.module.css';
import { content, getCaseStudySlugs, caseStudies } from '@/data';

const caseStudySlugs = new Set(getCaseStudySlugs());

// Last-card handoff tuning (see .planning/projects-archive-handoff/PLAN.md).
// The split runs on its OWN scrubbed trigger over a fixed scroll distance,
// DECOUPLED from the long handoff pin. The pin is a separate, animation-free
// ScrollTrigger that just holds the open card while the Archive rises over it.
// (The old approach appended an inert HOLD to the split timeline and let the
// whole thing scrub across the long pin — which compressed the split into the
// pin's early fraction and played it ~4x too fast.)
//
// SPLIT_RUNWAY_VH: viewport-heights the split plays across. 1.4 matches the
// other cards' feel (their 250vh sections split over ~1.5vh). It MUST stay
// under the pre-overlap runway (last-section height − 55vh overlap − 100vh
// viewport) so the card is fully open before the Archive overlaps. Tune with
// the last-section height in Projects.module.css.
const SPLIT_RUNWAY_VH = 1.4;

// Match the other cards' scrub (2.5) so the last split has identical smoothing.
const HANDOFF_SCRUB = 2.5;

// A card is only clickable once its split has opened past this TIMELINE progress
// (split done ~0.62, image-pop done ~0.69, meta ~0.75, badge ~1.0). 0.6 ≈ the
// image is visibly revealed. Gating is armed via `data-split-gated` on the
// container and read in CSS (a.projectSticky pointer-events); see Projects.module.css.
const OPEN_THRESHOLD = 0.6;

export const Projects = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const { projects } = content;
  const featuredProjects = projects.items.filter((project) => project.featured);

  useGSAP(() => {
    const container = containerRef.current;
    if (!container) return;

    // The Projects → Archive pinned-overlap handoff. The LAST card stays pinned
    // while the Archive section scrolls up over it and fades out as the Archive
    // covers the viewport (separate trigger below) — it never visibly unpins.
    // Requires the Archive mounted (same page) and motion allowed; otherwise the
    // last card keeps the default per-section behavior and the sections stack.
    // Target the wrapper by id, NOT archiveSection.parentElement: the Archive's
    // own pin (a layout effect) wraps the section in a GSAP .pin-spacer, so
    // parentElement would be that spacer — putting data-overlap and the
    // endTrigger on the wrong node.
    const archiveWrapper = document.getElementById('archive-wrapper');
    const overlapEnabled = !reducedMotion && !!archiveWrapper && featuredProjects.length > 0;

    // Apply the overlap layout toggles BEFORE creating any ScrollTrigger so the
    // pins here — AND the Archive's own pin, whose layout effect now runs right
    // after this one (Projects also uses useGSAP) — measure the FINAL geometry:
    // the -55vh Archive overlap, the last section grown to 320vh, and the
    // collapsed trailing spacer. A data-* change that alters layout via CSS does
    // not auto-refresh, so we also refresh once it settles (below); otherwise the
    // cold-load overlap timing is off by the margin/height delta until some
    // incidental refresh fires.
    if (overlapEnabled) {
      if (archiveWrapper) archiveWrapper.dataset.overlap = 'true';
      container.dataset.overlapActive = 'true';
    }

    // Arm the open-state click gate only when motion is allowed (CSS reads
    // `data-split-gated`). Under reduced motion / no-JS the gate stays off so the
    // cards remain clickable without depending on the scrubbed split playing.
    const gateClicks = !reducedMotion;
    if (gateClicks) container.dataset.splitGated = 'true';

    const ctx = gsap.context(() => {
        const sections = container.querySelectorAll<HTMLElement>(`.${styles.projectSection}`);

        sections.forEach((section) => {
            const topPart = section.querySelector(`.${styles.textTop}`);
            const botPart = section.querySelector(`.${styles.textBottom}`);
            const imgCard = section.querySelector(`.${styles.imageCard}`);
            const imgWrapper = section.querySelector(`.${styles.projectImgWrapper}`);
            const badge = section.querySelector(`.${styles.funkyBadge}`);
            const meta = section.querySelector(`.${styles.projectMeta}`);
            const metaLabel = section.querySelector(`.${styles.metaLabel}`); // null on non-first projects
            const stickyContainer = section.querySelector(`.${styles.projectSticky}`);

            const isLast = section.dataset.last === 'true';
            const handoff = isLast && overlapEnabled;

            // Set initial states to ensure badge starts hidden before scroll trigger activates
            gsap.set(badge, { scale: 0, rotation: 0 });

            // Open-state click gate: flip `data-open` on the sticky card from the
            // TIMELINE progress (visual truth — accounts for the scrub lag) so the
            // affordance matches what's on screen. CSS keys clickability off it.
            const setOpen = (open: boolean) => {
                if (stickyContainer) (stickyContainer as HTMLElement).dataset.open = open ? 'true' : 'false';
            };
            const openFromTimeline = (self: ScrollTrigger) =>
                setOpen((self.animation?.progress() ?? 0) >= OPEN_THRESHOLD);
            setOpen(false); // closed at rest — no clickable flash before first update

            // Last card: a dedicated, animation-free pin holds the (already
            // open) card fixed from its own top until the Archive fully covers
            // the viewport, so it never visibly unpins — it just fades out
            // (separate trigger below) as the Archive rises, and is hidden
            // behind the opaque Archive by full coverage. endTrigger is the
            // Archive WRAPPER (not the section) to stay decoupled from the
            // Archive's own pin. pinSpacing:true keeps the in-flow rest position
            // equal to the fixed position at release → no snap. Keeping this pin
            // ANIMATION-FREE (no scrub/tweens) is what lets the split below run
            // at its own controlled speed instead of being compressed into the
            // pin's early fraction.
            if (handoff && stickyContainer) {
                ScrollTrigger.create({
                    trigger: section,
                    start: "top top",
                    endTrigger: archiveWrapper,
                    end: "top top",
                    pin: stickyContainer,
                    pinSpacing: true,
                    pinType: "fixed",
                    anticipatePin: 1,
                    invalidateOnRefresh: true,
                });
            }

            const tl = gsap.timeline({
                scrollTrigger: handoff
                    ? {
                        // Split only — fixed scroll distance, NO pin (the pin
                        // above owns that). Same scrub as the other cards so the
                        // open animation reads at the same speed; ends before the
                        // Archive overlaps so the card is fully open first.
                        trigger: section,
                        start: "top top",
                        end: () => "+=" + window.innerHeight * SPLIT_RUNWAY_VH,
                        scrub: HANDOFF_SCRUB,
                        invalidateOnRefresh: true,
                        onUpdate: openFromTimeline,
                    }
                    : {
                        trigger: section,
                        start: "top top",
                        end: "bottom bottom",
                        scrub: 2.5,
                        pin: stickyContainer,
                        onUpdate: openFromTimeline,
                        // No background color changes - InteractiveBackground shows through entirely
                    }
            });

            // 0. META LABEL EXIT — slide up and fade as THE SNAP begins, so
            //    the "Selected Works" caption doesn't fight the split-title
            //    animation. Only the first project has a label; guard skips
            //    the others. Short duration (0.2 vs the default 0.5) so the
            //    label is gone by ~20% scroll — well before the dramatic
            //    image-pop. Symmetric inOut ease for the smoothest perceived
            //    motion.
            if (metaLabel) {
                tl.to(metaLabel, {
                    y: -60,
                    opacity: 0,
                    duration: 0.2,
                    force3D: true,
                    ease: "power2.inOut",
                }, "start");
            }

            // 1. THE SNAP (Rotate and Separate)
            // PERF: Added force3D for consistent GPU compositing
            tl.to(topPart, {
                yPercent: -45,
                rotation: -5, // Rotate Left
                force3D: true,
                ease: "power2.inOut",
            }, "start")
            .to(botPart, {
                yPercent: 45,
                rotation: 5, // Rotate Right
                force3D: true,
                ease: "power2.inOut",
            }, "start");

            // 2. IMAGE POP (Scale and Straighten)
            tl.to(imgCard, {
                scale: 1,
                rotation: 0, // Straighten out
                opacity: 1,
                force3D: true,
                ease: "back.out(1.2)" // Bouncy effect
            }, "start+=0.05");

            // 3. INNER PARALLAX
            tl.to(imgWrapper, {
                scale: 1.0,
                force3D: true,
                ease: "none"
            }, "start");

            // 4. BADGE SPIN IN
            tl.to(badge, {
                scale: 1,
                rotation: 360,
                force3D: true,
                ease: "elastic.out(1, 0.5)"
            }, "start+=0.3");

            // 5. META FADE
            tl.to(meta, {
                opacity: 1,
                y: 0,
                force3D: true,
                duration: 0.2
            }, "start+=0.4");

            // 6. SLOW FADE (last card only) — a SEPARATE scroll-linked tween:
            //    the card fades out gradually from when the Archive has covered
            //    65% of the viewport (`top 35%`) to full coverage (`top top`,
            //    where the pin also ends). By full coverage the card is both
            //    invisible and hidden behind the opaque Archive.
            if (handoff && stickyContainer) {
                gsap.to(stickyContainer, {
                    opacity: 0,
                    ease: "none",
                    scrollTrigger: {
                        trigger: archiveWrapper,
                        start: "top 35%", // Archive has covered 65% of the screen
                        end: "top top",   // Archive fully covers the viewport
                        scrub: true,
                        invalidateOnRefresh: true,
                        // Two-way: the card is inert while fading under the
                        // Archive (its split sits at progress 1, but the split
                        // trigger no longer updates in this range) and clickable
                        // again once scrolled back up to full visibility.
                        onUpdate: (self) => setOpen(self.progress <= 0.05),
                    },
                });
            }
        });
    }, containerRef);

    // The data-* toggles above changed layout via CSS after the pins measured;
    // refresh once the next frame's layout settles so the cross-component
    // endTrigger / Archive-pin start are correct on the cold first paint
    // (invalidateOnRefresh only helps once some refresh actually fires).
    let rafId = 0;
    if (overlapEnabled) {
        rafId = requestAnimationFrame(() => ScrollTrigger.refresh());
    }

    return () => {
        // Preserve scroll across teardown: reverting kills the pins and removes
        // their spacers, shortening the document; if we are scrolled past the new
        // max the browser clamps scrollY → a visible jump on route-change /
        // StrictMode remount. ctx is our OWN context (useGSAP's context only holds
        // this cleanup, not the triggers), so its pins are still alive here — we
        // capture scrollY first, then revert, then restore. Same guard Archive and
        // ServicesV2 use.
        const savedScrollY = window.scrollY;
        if (rafId) cancelAnimationFrame(rafId);
        ctx.revert();
        if (archiveWrapper) delete archiveWrapper.dataset.overlap;
        delete container.dataset.overlapActive;
        delete container.dataset.splitGated;
        if (window.scrollY !== savedScrollY) window.scrollTo(0, savedScrollY);
    };
  }, { scope: containerRef, dependencies: [projects, reducedMotion, featuredProjects.length], revertOnUpdate: true });

  return (
    <div ref={containerRef} className={styles.section} id='projects'>
       {featuredProjects.map((project, index) => {
           const isFirst = index === 0;
           const isLast = index === featuredProjects.length - 1;
           const cardInner = (
               <>
                   {isFirst && (
                     <MetaLabel className={styles.metaLabel} aria-hidden="true">
                       {projects.label}
                     </MetaLabel>
                   )}

                   {/* Image + corner badge share a frame. The frame is the badge's
                       positioning anchor so it sits on the IMAGE's top-right corner
                       at every viewport size (it used to be positioned against the
                       full-height sticky, which only lined up on desktop). The frame
                       carries no z-index/transform, so it creates no stacking context
                       and the image (z5) ↔ title (z10) ↔ badge (z20) order is kept. */}
                   <div className={styles.cardFrame}>
                       <div className={styles.imageCard}>
                            <div className={styles.projectImgWrapper}>
                                 <Image
                                    src={project.image}
                                    alt={project.title}
                                    fill
                                    style={{ objectFit: 'cover', objectPosition: 'top' }}
                                    sizes="(max-width: 768px) 100vw, 80vw"
                                    unoptimized
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
                            transform: 'scale(0)'
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
                       <div className={styles.pill}>{caseStudies[project.id]?.hero?.pills?.[1] ?? project.year}</div>
                       <div className={styles.pill}>{project.category}</div>
                   </div>
               </>
           );

           return (
               <div
                 key={project.id}
                 className={styles.projectSection}
                 data-last={isLast ? 'true' : undefined}
                 data-first={isFirst ? 'true' : undefined}
               >
                   {caseStudySlugs.has(project.id) ? (
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
                       <div className={styles.projectSticky}>
                           {cardInner}
                       </div>
                   )}
               </div>
           );
       })}

       <div className={styles.spacer}></div>
    </div>
  );
};
