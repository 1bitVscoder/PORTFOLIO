'use client';

import { useRef, useEffect, useState } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { content } from '@/data';
import { HeroText } from './HeroText';
import { SkillsBar } from './SkillsBar';
import styles from './Hero.module.css';

const INITIALS = content.welcomeScreen.initials;

// Scroll range for the initials-to-navbar handoff, expressed in viewport heights.
const SCROLL_RANGE_VH = 1;
// Timeline progress at which Philosophy starts entering the viewport.
// Phase 6's cross-dissolve ends at 0.81, but starting Philosophy slightly
// earlier (0.25) overlaps its top edge with the dissolve — softens the
// handoff. If you add keyframes past 0.81, raise this constant or compute
// it from `tl.duration()` after the timeline is built.
const DOCKING_PROGRESS = 0.25;
// Timeline tuning constants.
const SCRUB_SMOOTHING = 1.75;
const SKILLS_EXIT_YPERCENT = 300;

export function Hero() {
  const heroRef = useRef<HTMLElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const flyingMRef = useRef<HTMLSpanElement>(null);
  const flyingARef = useRef<HTMLSpanElement>(null);
  // Idempotent: if welcome already completed before this mounted (HMR, route
  // re-entry, StrictMode/Suspense remount), the one-shot event has already
  // fired. Read the durable flag at init so we never call setState
  // synchronously inside the effect. SSR-safe (window-guarded) and never used
  // in render, so no hydration mismatch.
  const [welcomeDone, setWelcomeDone] = useState(
    () => typeof window !== 'undefined' && window.__welcomeComplete === true
  );
  const reducedMotion = useReducedMotion();

  // Listen for welcome animation completion before enabling scroll animation
  useEffect(() => {
    if (welcomeDone) return;

    // Covers the flag flipping between this component's render and its effect.
    // Deferred so the setState is never synchronous in the effect body.
    if (window.__welcomeComplete) {
      queueMicrotask(() => setWelcomeDone(true));
      return;
    }

    const onComplete = () => setWelcomeDone(true);
    window.addEventListener('welcome-complete', onComplete, { once: true });

    // Fallback: if welcome already completed (e.g., component remounted).
    // CSS-module substring selectors break under Next 16 + Turbopack hashed
    // class names, so we key on a stable data attribute instead.
    const wrapper = document.querySelector('[data-welcome-wrapper]');
    if (wrapper && (wrapper as HTMLElement).style.display === 'none') {
      queueMicrotask(() => setWelcomeDone(true));
    }

    return () => window.removeEventListener('welcome-complete', onComplete);
  }, [welcomeDone]);

  // Scroll-driven initials-to-navbar animation
  useGSAP(() => {
    if (!welcomeDone || !heroRef.current || !spacerRef.current || !flyingMRef.current || !flyingARef.current) return;

    const hero = heroRef.current;
    const spacer = spacerRef.current;
    const flyingM = flyingMRef.current;
    const flyingA = flyingARef.current;

    // Spacer height = (scroll-distance to docking) + one viewport.
    //
    // Hero is position: fixed (Hero.module.css), so it consumes zero
    // document-flow height — this spacer is the sole runway for both
    // the scrubbed initials-to-navbar timeline AND the document-flow
    // gap that keeps Philosophy below the viewport until the docking
    // moment.
    //
    // Geometry:
    //   docking happens at scroll = scrollRange × DOCKING_PROGRESS = 25vh
    //   we want Philosophy.top to reach viewport-bottom (= 100vh) at
    //   exactly that scroll position, then rise one viewport into view
    //   before its own pin engages.
    //   => spacer.height = 25vh + 100vh = 125vh
    //
    // Earlier formulas:
    //   - hero.offsetHeight + scrollRange (≈ 200vh + 60px) left a
    //     ~120vh empty stretch between docking and Philosophy entry.
    //   - scrollRange (= 100vh) put Philosophy in the viewport from
    //     scroll 0, so it rose during the animation — also wrong.
    const scrollRange = window.innerHeight * SCROLL_RANGE_VH;
    spacer.style.height = `${scrollRange * DOCKING_PROGRESS + window.innerHeight}px`;

    // Query target elements (navbar is at page level, query from document)
    const targetM = document.getElementById('target-m');
    const targetA = document.getElementById('target-a');
    const navBrand = document.getElementById('navbar-brand');
    const navBrandM = document.getElementById('navbar-brand-m');
    const navBrandA = document.getElementById('navbar-brand-a');

    if (!targetM || !targetA || !navBrand || !navBrandM || !navBrandA) return;

    // Query hero content to fade out. Keyed on stable data attributes — CSS-module
    // substring selectors break under Next 16 + Turbopack hashed class names.
    const mohedExps = hero.querySelectorAll('[data-hero-mohed] .portal-expansion');
    const abbasExps = hero.querySelectorAll('[data-hero-abbas] .portal-expansion');
    const taglineContainer = hero.querySelector('[data-tagline]');
    const skillsBar = hero.querySelector('[data-skills]');

    // Reduced motion: build the final resting state with no animated FLIP.
    // Spacer height is still set above so scroll length/layout stay correct.
    if (reducedMotion) {
      gsap.set([flyingM, flyingA], { opacity: 0 });
      gsap.set(navBrand, { opacity: 1 });
      gsap.set([targetM, targetA], { opacity: 0 });
      if (mohedExps.length > 0) gsap.set(mohedExps, { opacity: 0 });
      if (abbasExps.length > 0) gsap.set(abbasExps, { opacity: 0 });
      if (taglineContainer) gsap.set(taglineContainer, { opacity: 0 });
      if (skillsBar) gsap.set(skillsBar, { yPercent: SKILLS_EXIT_YPERCENT });
      return;
    }

    // Helper: element offset relative to hero container
    // Since hero is position:fixed at (0,0), this returns viewport coordinates
    const getRelPos = (el: Element) => {
      const r = el.getBoundingClientRect();
      const h = hero.getBoundingClientRect();
      return { x: r.left - h.left, y: r.top - h.top };
    };

    // PERF: read fontSize once and animate via `scale` (transform-only).
    // Animating fontSize in the timeline triggered layout invalidation on every
    // scrub frame — the dominant cause of 60Hz jank in the FLIP. transform-origin
    // is set to top-left so the letter shrinks toward its anchored (x, y), which
    // is the navbar target's top-left from getRelPos.
    const seedFlyingLetterTypography = () => {
      gsap.set(flyingM, {
        fontSize: parseFloat(getComputedStyle(targetM).fontSize),
        transformOrigin: '0% 0%',
      });
      gsap.set(flyingA, {
        fontSize: parseFloat(getComputedStyle(targetA).fontSize),
        transformOrigin: '0% 0%',
      });
    };
    seedFlyingLetterTypography();

    // PERF: cache the scale ratios used by Phase 5 so each ScrollTrigger
    // invalidation reads fontSize twice (in onRefresh below), not four times
    // per ratio per refresh inside the functional getters. Reading fontSize
    // forces a layout flush; caching collapses 8N reads to 2N per refresh.
    let scaleRatioM = 1;
    let scaleRatioA = 1;
    const recomputeScaleRatios = () => {
      scaleRatioM = parseFloat(getComputedStyle(navBrandM).fontSize)
        / parseFloat(getComputedStyle(targetM).fontSize);
      scaleRatioA = parseFloat(getComputedStyle(navBrandA).fontSize)
        / parseFloat(getComputedStyle(targetA).fontSize);
    };
    recomputeScaleRatios();

    // ============================================
    // BUILD MASTER TIMELINE
    // Timeline durations are proportional (0-1 range),
    // scrubbed to scroll progress by ScrollTrigger
    // ============================================
    const tl = gsap.timeline();

    // --- PHASE 0: Snap flying letters to hero letter positions (instant) ---
    // Functional getters keep x/y in sync with viewport resize via invalidateOnRefresh
    tl.to(flyingM, {
      x: () => getRelPos(targetM).x,
      y: () => getRelPos(targetM).y,
      duration: 0.001,
    }, 0)
    .to(flyingA, {
      x: () => getRelPos(targetA).x,
      y: () => getRelPos(targetA).y,
      duration: 0.001,
    }, 0);

    // --- PHASE 1: Visibility swap (near-instant) ---
    tl.to(flyingM, { opacity: 1, duration: 0.02 }, 0.002)
      .to(flyingA, { opacity: 1, duration: 0.02 }, 0.002)
      .to(targetM, { opacity: 0, duration: 0.02 }, 0.002)
      .to(targetA, { opacity: 0, duration: 0.02 }, 0.002);

    // --- PHASE 2: Pop burst (scale 1 → 1.05) ---
    tl.to(flyingM, { scale: 1.05, duration: 0.04, ease: 'back.out(2)' }, 0.02)
      .to(flyingA, { scale: 1.05, duration: 0.04, ease: 'back.out(2)' }, 0.02);

    // --- PHASE 3: Fade remaining hero letters (staggered) ---
    if (mohedExps.length > 0) {
      tl.to(mohedExps, {
        opacity: 0, stagger: 0.025, duration: 0.12, ease: 'power2.in',
      }, 0.01);
    }
    if (abbasExps.length > 0) {
      tl.to(abbasExps, {
        opacity: 0, stagger: 0.025, duration: 0.12, ease: 'power2.in',
      }, 0.03);
    }

    // --- PHASE 4: Fade tagline + skills bar ---
    if (taglineContainer) {
      tl.to(taglineContainer, { opacity: 0, duration: 0.2, ease: 'power2.in' }, 0.08);
    }
    if (skillsBar) {
      // Scaled with DOCKING_PROGRESS (0.25) to preserve the original
      // "SkillsBar exits just as Philosophy crests the viewport bottom"
      // handoff. Original was (start 0.385, duration 0.30) tuned for
      // DOCKING_PROGRESS = 0.65; scale factor = 0.25/0.65 ≈ 0.385.
      tl.to(skillsBar, { yPercent: SKILLS_EXIT_YPERCENT, duration: 0.12, ease: 'power2.in' }, 0.15);
    }

    // --- PHASE 5: Fly + shrink to navbar center (via SCALE, not fontSize) ---
    // PERF: scale shrink is GPU-composited; fontSize would trigger reflow per frame.
    // Ratio is computed at tween-time via functional getter so resize stays correct
    // (invalidateOnRefresh re-evaluates these on ScrollTrigger.refresh).
    tl.to(flyingM, {
      x: () => getRelPos(navBrandM).x,
      y: () => getRelPos(navBrandM).y,
      scale: () => scaleRatioM,
      duration: 0.65,
      ease: 'power2.inOut',
    }, 0.06)
    .to(flyingA, {
      x: () => getRelPos(navBrandA).x,
      y: () => getRelPos(navBrandA).y,
      scale: () => scaleRatioA,
      duration: 0.65,
      ease: 'power2.inOut',
    }, 0.06);

    // --- PHASE 6: Cross-dissolve to navbar brand mark ---
    tl.to(navBrand, { opacity: 1, duration: 0.1, ease: 'power1.inOut' }, 0.71)
      .to([flyingM, flyingA], { opacity: 0, duration: 0.1, ease: 'power1.in' }, 0.71);

    // ============================================
    // SCROLL TRIGGER
    // Drives timeline via spacer scroll, no pin needed.
    // Hero stays fixed; content scrolls over it.
    // ============================================
    ScrollTrigger.create({
      trigger: spacer,
      start: 'top top',
      end: () => `+=${window.innerHeight * SCROLL_RANGE_VH}`,
      scrub: SCRUB_SMOOTHING,
      animation: tl,
      invalidateOnRefresh: true,
      onRefresh: () => {
        // Recalculate spacer height on resize/refresh (matches initial calc above).
        spacer.style.height = `${window.innerHeight * SCROLL_RANGE_VH * DOCKING_PROGRESS + window.innerHeight}px`;
        // Re-seed source fontSize + cached scale ratios so Phase 5 resolves
        // against the post-resize target sizes (clamp() CSS may change values).
        seedFlyingLetterTypography();
        recomputeScaleRatios();
      },
    });

    // PERF: Defer refresh to avoid blocking main thread
    requestAnimationFrame(() => ScrollTrigger.refresh());

  }, { dependencies: [welcomeDone, reducedMotion] });

  return (
    <>
      <main ref={heroRef} className={styles.hero}>
        <HeroText />
        <SkillsBar />

        {/* Flying letter clones for scroll animation */}
        <span ref={flyingMRef} className={styles.flyingLetter} aria-hidden="true">
          {INITIALS.first}
        </span>
        <span ref={flyingARef} className={styles.flyingLetter} aria-hidden="true">
          {INITIALS.last}
        </span>
      </main>

      {/* Scroll spacer: provides document flow height for the fixed hero + animation range */}
      <div ref={spacerRef} className={styles.heroScrollSpacer} />
    </>
  );
}
