'use client';

import { useRef, useCallback } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from '@/lib/gsap';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { content, getHeroLetters } from '@/data';
import { cursorBus } from '@/lib/cursorBus';
import {
  getRandomDirection,
  getDirectionTransform,
  triggerPortalLoop,
} from '@/lib/portalAnimation';
import styles from './HeroText.module.css';

// ============================================
// CONSTANTS (from data)
// ============================================

const { firstName, lastName } = getHeroLetters();
const MOHED_LETTERS = firstName;
const ABBAS_LETTERS_CONFIG = lastName.map((letter, index) => ({
  letter,
  color: index % 2 === 1 ? 'purple' : 'dark',
}));
const TAGLINE_WORDS = content.hero.tagline;
const TAGLINE_HIDDEN_WORDS = content.hero.taglineHidden;

// Spotlight cursor size (radius in px)
const SPOTLIGHT_SIZE = 80;

// ============================================
// COMPONENT
// ============================================

export function HeroText() {
  const sectionRef = useRef<HTMLElement>(null);
  const mohedRef = useRef<HTMLHeadingElement>(null);
  const abbasRef = useRef<HTMLHeadingElement>(null);
  const taglineRef = useRef<HTMLDivElement>(null);
  const taglineContainerRef = useRef<HTMLDivElement>(null);
  const taglineHiddenRef = useRef<HTMLParagraphElement>(null);
  const reducedMotion = useReducedMotion();

  // Handle hover on portal letters
  const handleLetterHover = useCallback((e: React.MouseEvent<HTMLSpanElement>) => {
    // Reduced motion: no portal loop on hover.
    if (reducedMotion) return;
    const portalLetter = e.currentTarget.querySelector(`.${styles.portalLetter}`) as HTMLElement;
    if (portalLetter) {
      triggerPortalLoop(portalLetter);
    }
  }, [reducedMotion]);

  const cachedRect = useRef<DOMRect | null>(null);
  // PERF: Track spotlight ticker state - only run when hovering tagline
  const spotlightTickerRef = useRef<(() => void) | null>(null);
  const spotlightTickerActiveRef = useRef(false);
  // Refresh cached rect during hover — registered on enter, removed on leave
  // so we don't pay per-scroll cost when the spotlight isn't active.
  const updateRectRef = useRef<(() => void) | null>(null);

  useGSAP(() => {
    const container = taglineContainerRef.current;
    if (!container) return;

    const updateRect = () => {
      cachedRect.current = container.getBoundingClientRect();
    };
    updateRect();
    updateRectRef.current = updateRect;

    // Resize is always relevant; scroll listener is attached on hover only
    // (see handleTaglineMouseEnter / Leave).
    window.addEventListener('resize', updateRect);

    const updateSpotlight = () => {
      if (!cachedRect.current) return;

      // Read shared cursor coordinate directly from the bus instead of
      // parseFloat-ing the inline style of <html>. Faster, and decouples this
      // consumer from CustomCursor's CSS-var write gate.
      const x = cursorBus.x - cachedRect.current.left;
      const y = cursorBus.y - cachedRect.current.top;

      // Update CSS variables on the CONTAINER so all layers share them
      container.style.setProperty('--spotlight-x', `${x}px`);
      container.style.setProperty('--spotlight-y', `${y}px`);
    };

    // PERF: Store reference but DON'T add to ticker yet - wait for hover
    spotlightTickerRef.current = updateSpotlight;

    return () => {
      // PERF: Clean up ticker if active
      if (spotlightTickerActiveRef.current && spotlightTickerRef.current) {
        gsap.ticker.remove(spotlightTickerRef.current);
        spotlightTickerActiveRef.current = false;
      }
      // Defensive: clear stale spotlight class on unmount/HMR
      if (taglineContainerRef.current) {
        taglineContainerRef.current.classList.remove(styles.spotlightActive);
      }
      window.removeEventListener('resize', updateRect);
      // If we unmount mid-hover, the scroll listener registered by
      // handleTaglineMouseEnter would otherwise leak.
      window.removeEventListener('scroll', updateRect);
      updateRectRef.current = null;
    };
  }, []); // Run once on mount

  // Spotlight hover enter - expand the mask
  const handleTaglineMouseEnter = useCallback(() => {
    const container = taglineContainerRef.current;
    if (!container) return;

    container.style.setProperty('--spotlight-size', `${SPOTLIGHT_SIZE}px`);
    // PERF: promote spotlight layers only while hovering
    container.classList.add(styles.spotlightActive);

    // Refresh rect on scroll only while the spotlight is being tracked.
    if (updateRectRef.current) {
      updateRectRef.current();
      window.addEventListener('scroll', updateRectRef.current, { passive: true });
    }

    // PERF: Start spotlight ticker only on hover
    if (!spotlightTickerActiveRef.current && spotlightTickerRef.current) {
      gsap.ticker.add(spotlightTickerRef.current);
      spotlightTickerActiveRef.current = true;
    }

    // Notify cursor to scale up
    window.dispatchEvent(new CustomEvent('tagline-spotlight-enter', {
      detail: { size: SPOTLIGHT_SIZE * 2 }
    }));
  }, []);

  // Spotlight hover leave - shrink the mask
  const handleTaglineMouseLeave = useCallback(() => {
    const container = taglineContainerRef.current;
    if (!container) return;

    container.style.setProperty('--spotlight-size', '0px');
    container.classList.remove(styles.spotlightActive);

    // PERF: Stop spotlight ticker when not hovering
    if (spotlightTickerActiveRef.current && spotlightTickerRef.current) {
      gsap.ticker.remove(spotlightTickerRef.current);
      spotlightTickerActiveRef.current = false;
    }

    if (updateRectRef.current) {
      window.removeEventListener('scroll', updateRectRef.current);
    }

    // Notify cursor to reset
    window.dispatchEvent(new CustomEvent('tagline-spotlight-leave'));
  }, []);

  useGSAP(() => {
    if (!sectionRef.current || !mohedRef.current || !abbasRef.current || !taglineRef.current || !taglineHiddenRef.current) return;

    // 1. Select Elements
    // Target initials (M and A) - these fade in during handoff
    const targetM = mohedRef.current.querySelector('#target-m');
    const targetA = abbasRef.current.querySelector('#target-a');

    // Expansion letters (OHED and BBAS) - these use portal animation
    const mohedExpansionMasks = mohedRef.current.querySelectorAll('.portal-expansion');
    const abbasExpansionMasks = abbasRef.current.querySelectorAll('.portal-expansion');

    // Get the inner portal letters for animation
    const mohedExpansionLetters = Array.from(mohedExpansionMasks).map(
      mask => mask.querySelector(`.${styles.portalLetter}`)
    ).filter(Boolean) as HTMLElement[];

    const abbasExpansionLetters = Array.from(abbasExpansionMasks).map(
      mask => mask.querySelector(`.${styles.portalLetter}`)
    ).filter(Boolean) as HTMLElement[];

    const taglineWords = taglineRef.current.querySelectorAll(`.${styles.taglineWord}`);
    const taglineHiddenWords = taglineHiddenRef.current.querySelectorAll(`.${styles.taglineWord}`);

    // 2. Initial States
    // Hide expansion masks initially
    gsap.set([mohedExpansionMasks, abbasExpansionMasks], {
      opacity: 0,
    });

    // Position expansion letters outside their masks (for portal entry)
    mohedExpansionLetters.forEach(letter => {
      const direction = getRandomDirection();
      const startTransform = getDirectionTransform(direction, 110);
      gsap.set(letter, {
        x: startTransform.x + '%',
        y: startTransform.y + '%',
      });
    });

    abbasExpansionLetters.forEach(letter => {
      const direction = getRandomDirection();
      const startTransform = getDirectionTransform(direction, 110);
      gsap.set(letter, {
        x: startTransform.x + '%',
        y: startTransform.y + '%',
      });
    });

    // Hide Taglines
    gsap.set([taglineWords, taglineHiddenWords], { opacity: 0 });

    // HIDE TARGETS INITIALLY for Soft Handoff
    gsap.set([targetM, targetA], { opacity: 0 });

    const startAnimation = () => {
      // Reduced motion: jump every target straight to its final visible state,
      // skipping the cross-dissolve, portal slide-ins, and tagline tweens.
      if (reducedMotion) {
        gsap.set([targetM, targetA], { opacity: 1 });
        gsap.set([mohedExpansionMasks, abbasExpansionMasks], { opacity: 1 });
        gsap.set([...mohedExpansionLetters, ...abbasExpansionLetters], { x: '0%', y: '0%' });
        gsap.set([taglineWords, taglineHiddenWords], { opacity: 1, y: 0, rotateX: 0, scale: 1 });
        return;
      }

      const tl = gsap.timeline({
        defaults: { ease: 'power3.out' },
      });

      // 1. Soft Handoff (Cross-Dissolve)
      // Fade IN the static targets as the flying ones fade OUT
      tl.to([targetM, targetA], {
        opacity: 1,
        duration: 0.3,
        ease: "power1.inOut"
      })

      // 2. Reveal expansion masks
      .to([mohedExpansionMasks, abbasExpansionMasks], {
        opacity: 1,
        duration: 0.01,
      }, ">-0.1")

      // 3. Portal Slide-In Animation for OHED
      .add(() => {
        mohedExpansionLetters.forEach((letter, index) => {
          gsap.to(letter, {
            x: '0%',
            y: '0%',
            duration: 0.5,
            delay: index * 0.08,
            ease: 'power2.out',
          });
        });
      }, "<")

      // 4. Portal Slide-In Animation for BBAS (slight offset)
      .add(() => {
        abbasExpansionLetters.forEach((letter, index) => {
          gsap.to(letter, {
            x: '0%',
            y: '0%',
            duration: 0.5,
            delay: index * 0.08 + 0.1,
            ease: 'power2.out',
          });
        });
      }, "<+0.05")

      // 5. Tagline Animation
      // PERF: Removed filter: blur() animation - very expensive in Chrome
      // Using opacity + scale + transform for similar visual effect
      .fromTo(
        taglineWords,
        {
          opacity: 0,
          y: 40,
          rotateX: -60,
          scale: 0.85,
        },
        {
          opacity: 1,
          y: 0,
          rotateX: 0,
          scale: 1,
          duration: 0.6,
          stagger: {
            each: 0.06,
            ease: 'power2.out',
          },
          ease: 'back.out(1.2)',
        },
        "-=0.3"
      )
      .fromTo(
        taglineHiddenWords,
        {
          opacity: 0,
          y: 40,
          rotateX: -60,
          scale: 0.85,
        },
        {
          opacity: 1,
          y: 0,
          rotateX: 0,
          scale: 1,
          duration: 0.6,
          stagger: {
            each: 0.06,
            ease: 'power2.out',
          },
          ease: 'back.out(1.2)',
        },
        "<"
      );
    };

    // Start the entrance animation. Idempotent: if the one-shot handoff already
    // fired before this mounted (HMR, route re-entry, StrictMode/Suspense
    // remount), run immediately off the durable flag so the hero name + tagline
    // never get stranded at opacity:0; otherwise wait for the event.
    if (window.__welcomeHandoff) {
      startAnimation();
    } else {
      window.addEventListener('welcome-handoff', startAnimation, { once: true });
    }
    return () => window.removeEventListener('welcome-handoff', startAnimation);
  }, { scope: sectionRef, dependencies: [reducedMotion] });

  return (
    <section ref={sectionRef} className={styles.textAndArm}>
      {/* MOHED Text */}
      <h1 ref={mohedRef} data-hero-mohed className={`${styles.heroText} ${styles.heroTextMohed}`}>
        {MOHED_LETTERS.map((letter, index) => {
          const isTarget = index === 0;

          if (isTarget) {
            // M - Target letter (just fades in, also has portal on hover)
            return (
              <span
                key={index}
                className={`${styles.letter} ${styles.portalMask}`}
                id="target-m"
                onMouseEnter={handleLetterHover}
              >
                <span className={styles.portalLetter}>{letter}</span>
              </span>
            );
          }

          // O, H, E, D - Expansion letters with portal animation
          return (
            <span
              key={index}
              className={`${styles.letter} ${styles.portalMask} portal-expansion`}
              onMouseEnter={handleLetterHover}
            >
              <span className={styles.portalLetter}>{letter}</span>
            </span>
          );
        })}
      </h1>

      {/* ABBAS Text */}
      <h1 ref={abbasRef} data-hero-abbas className={`${styles.heroText} ${styles.heroTextAbbas}`}>
        {ABBAS_LETTERS_CONFIG.map((item, index) => {
          const isTarget = index === 0;
          const colorClass = item.color === 'purple' ? styles.textPurple : styles.textDark;

          if (isTarget) {
            // A - Target letter
            return (
              <span
                key={index}
                id="target-a"
                className={`${styles.abbasLetter} ${styles.portalMask} ${colorClass}`}
                onMouseEnter={handleLetterHover}
              >
                <span className={styles.portalLetter}>{item.letter}</span>
              </span>
            );
          }

          // B, B, A, S - Expansion letters with portal animation
          return (
            <span
              key={index}
              className={`${styles.abbasLetter} ${styles.portalMask} ${colorClass} portal-expansion`}
              onMouseEnter={handleLetterHover}
            >
              <span className={styles.portalLetter}>{item.letter}</span>
            </span>
          );
        })}
      </h1>

      {/* Tagline with Spotlight Effect */}
      <div
        ref={taglineContainerRef}
        data-tagline
        className={styles.taglineContainer}
        onMouseEnter={handleTaglineMouseEnter}
        onMouseLeave={handleTaglineMouseLeave}
      >
        {/* LAYER 0: BACKGROUND SPOTLIGHT (Unbounded) */}
        <div className={styles.spotlightBg} />

        {/* LAYER 1: BOTTOM - Default visible tagline */}
        <p ref={taglineRef} className={styles.tagline}>
          {TAGLINE_WORDS.map((word, index) =>
            word === '<br>' ? (
              <span key={index} className={styles.lineBreak} aria-hidden="true" />
            ) : (
              <span key={index} className={styles.taglineWord}>
                {word}
              </span>
            )
          )}
        </p>

        {/* LAYER 2: TOP - Hidden tagline revealed by spotlight */}
        <p ref={taglineHiddenRef} className={styles.taglineHidden}>
          {TAGLINE_HIDDEN_WORDS.map((word, index) =>
            word === '<br>' ? (
              <span key={index} className={styles.lineBreak} aria-hidden="true" />
            ) : (
              <span key={index} className={styles.taglineWord}>
                {word}
              </span>
            )
          )}
        </p>
      </div>
    </section>
  );
}
