'use client';

import { useRef, useMemo, useCallback, useEffect, Fragment } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap, ScrollTrigger, ANIMATION_CONFIG } from '@/lib/gsap';
import { hexToRgb } from '@/lib/colorUtils';
import styles from './RevealText.module.css';
import { useAccentColor } from '@/lib/AccentColorContext';
import { useReducedMotion } from '@/lib/useReducedMotion';
import {
  getRandomDirection,
  getDirectionTransform,
  triggerPortalLoop,
} from '@/lib/portalAnimation';

interface RevealTextProps {
  text: string;
  highlights: string[];
}

// ============================================
// COLOR INTERPOLATION
// ============================================

const readPrimaryTextColor = (): string => {
  if (typeof window === 'undefined') return '#1b2028';
  return getComputedStyle(document.documentElement)
    .getPropertyValue('--color-primary-text')
    .trim() || '#1b2028';
};

// Pre-parsed [r, g, b] tuple to skip parseInt-per-frame in the scrub onUpdate.
type Rgb = readonly [number, number, number];

const colorToRgb = (color: string): Rgb => {
  const { r, g, b } = hexToRgb(color);
  return [r, g, b] as const;
};

const interpolateRgb = (c1: Rgb, c2: Rgb, progress: number): string => {
  const r = Math.round(c1[0] + (c2[0] - c1[0]) * progress);
  const g = Math.round(c1[1] + (c2[1] - c1[1]) * progress);
  const b = Math.round(c1[2] + (c2[2] - c1[2]) * progress);
  return `rgb(${r}, ${g}, ${b})`;
};

// ============================================
// COMPONENT
// ============================================

export function RevealText({ text, highlights }: RevealTextProps) {
  const containerRef = useRef<HTMLHeadingElement>(null);
  const hasAnimated = useRef(false);
  const animationIntervals = useRef<number[]>([]);
  // PERF: AbortController for cleaner async animation cancellation
  const abortControllerRef = useRef<AbortController | null>(null);
  // Tracks the delayedCall that kicks off startAsyncAnimations so it can be
  // killed on unmount before it escapes the useGSAP context.
  const staggerCall = useRef<gsap.core.Tween | null>(null);
  const reducedMotion = useReducedMotion();
  const { color: accentColor } = useAccentColor();
  const phase2TriggerRef = useRef<ScrollTrigger | null>(null);
  const highlightWordsRef = useRef<NodeListOf<Element> | null>(null);
  // PERF: Cache letter elements per highlight word to avoid querySelectorAll on every scroll frame
  const cachedLettersRef = useRef<Map<Element, HTMLElement[]>>(new Map());
  // PERF: Pre-parsed [r,g,b] tuples for the two interpolation endpoints.
  // Refreshed only when the accent context changes (or on first mount),
  // avoiding getComputedStyle + parseInt per scrub frame.
  const primaryRgbRef = useRef<Rgb>([27, 32, 40]);
  const accentRgbRef = useRef<Rgb>([98, 182, 203]);

  // Split text into words and determine which should be highlighted
  const words = useMemo(() => {
    return text.split(' ').map((word, index) => {
      const cleanWord = word.toLowerCase().replace(/[.,!?]/g, '');
      const isHighlight = highlights.some(h => h.toLowerCase() === cleanWord);
      return { word, index, isHighlight };
    });
  }, [text, highlights]);

  // Handle hover on highlight letters
  const handleLetterHover = useCallback((e: React.MouseEvent<HTMLSpanElement>) => {
    const portalLetter = e.currentTarget.querySelector(`.${styles.portalLetter}`) as HTMLElement;
    if (portalLetter) {
      triggerPortalLoop(portalLetter);
    }
  }, []);

  useGSAP(() => {
    if (!containerRef.current) return;

    const normalWords = containerRef.current.querySelectorAll(`.${styles.word}:not(.${styles.highlightWord})`);
    const highlightWords = containerRef.current.querySelectorAll(`.${styles.highlightWord}`);
    const highlightLetters = containerRef.current.querySelectorAll(`.${styles.portalLetter}`);

    // ============================================
    // INITIAL STATES
    // ============================================
    // Reduced motion: show everything legibly up front and skip all
    // scrubbed reveals, the letter stagger, and the indefinite portal churn.
    if (reducedMotion) {
      gsap.set(normalWords, { opacity: 1, clearProps: 'transform' });
      gsap.set(highlightWords, { opacity: 1 });
      gsap.set(highlightLetters, { x: '0%', y: '0%' });
      (normalWords as NodeListOf<HTMLElement>).forEach((word) => {
        word.style.opacity = '1';
      });
      return;
    }

    gsap.set(highlightWords, { opacity: 0 });

    highlightLetters.forEach((letter) => {
      const direction = getRandomDirection();
      const startTransform = getDirectionTransform(direction, 110);
      gsap.set(letter, {
        x: startTransform.x + '%',
        y: startTransform.y + '%',
      });
    });

    // ============================================
    // FUNCTION: Start async continuous animations
    // Each letter animates independently at random intervals
    // PERF: Uses AbortController for clean cancellation
    // ============================================
    const startAsyncAnimations = () => {
      // Create new abort controller for this animation cycle
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      const letters = Array.from(highlightLetters) as HTMLElement[];

      letters.forEach((letter) => {
        // Random interval between 3-6 seconds for each letter
        const scheduleNext = () => {
          // PERF: Check if aborted before scheduling
          if (signal.aborted) return;

          const randomDelay = 3000 + Math.random() * 3000;
          const intervalId = window.setTimeout(() => {
            // PERF: Check if aborted before triggering animation
            if (signal.aborted) return;
            triggerPortalLoop(letter);
            scheduleNext();
          }, randomDelay);
          animationIntervals.current.push(intervalId);
        };

        // Start with a random initial delay (0-3 seconds)
        const initialDelay = Math.random() * 3000;
        const initialId = window.setTimeout(() => {
          // PERF: Check if aborted before triggering
          if (signal.aborted) return;
          triggerPortalLoop(letter);
          scheduleNext();
        }, initialDelay);
        animationIntervals.current.push(initialId);
      });
    };

    // ============================================
    // FUNCTION: Trigger letter stagger animation
    // ============================================
    const triggerLetterStagger = () => {
      if (hasAnimated.current) return;
      hasAnimated.current = true;

      // Reveal highlight word containers
      gsap.to(highlightWords, {
        opacity: 1,
        duration: 0.01,
      });

      // Async stagger - all letters animate with random delays
      const letterDuration = 0.4;
      const maxRandomDelay = 0.25; // Random delay spread (0-250ms)

      // Animate all letters with random delays (async, not sequential)
      highlightLetters.forEach((letter) => {
        const randomDelay = Math.random() * maxRandomDelay;
        gsap.to(letter, {
          x: '0%',
          y: '0%',
          duration: letterDuration,
          delay: randomDelay,
          ease: 'power2.out',
        });
      });

      // Start async continuous animations after initial reveal.
      // Tracked so unmount during this window can kill it before it fires
      // startAsyncAnimations on detached nodes (its fresh AbortController
      // would otherwise escape the pre-unmount abort).
      staggerCall.current = gsap.delayedCall(
        letterDuration + maxRandomDelay + 0.3,
        startAsyncAnimations
      );
    };

    // ============================================
    // PHASE 1: Normal words opacity reveal (scroll-scrubbed)
    // When complete, trigger letter stagger
    // ============================================
    let revealTriggered = false;

    // Cap the cumulative per-word stagger so the LAST word keeps a positive
    // reveal window. With a raw `index * stagger.words` offset, any statement
    // with more than ~1/stagger normal words drives the offset to >= 1, making
    // the `(1 - offset)` denominator zero or negative: that stranded the word
    // at offset == 1 on min opacity (divide-by-zero) and sign-flipped every
    // word after it straight to full. Spreading the stagger keeps each word
    // revealing in order and finishing by the time progress reaches 1.
    const MAX_STAGGER_OFFSET = 0.85;
    const normalCount = normalWords.length;
    const wordStep = normalCount > 1
      ? Math.min(ANIMATION_CONFIG.stagger.words, MAX_STAGGER_OFFSET / (normalCount - 1))
      : 0;

    ScrollTrigger.create({
      trigger: containerRef.current,
      start: 'top 95%',
      end: 'top 35%',
      scrub: 2.5,
      onUpdate: (self) => {
        // Update normal words opacity
        const progress = self.progress;
        normalWords.forEach((word, index) => {
          const offset = index * wordStep;
          const wordProgress = Math.max(0, Math.min(1,
            (progress - offset) / (1 - offset)
          ));
          (word as HTMLElement).style.opacity = String(0.15 + wordProgress * 0.85);
        });

        // Trigger letter stagger when reveal is mostly complete (90%)
        if (progress >= 0.9 && !revealTriggered) {
          revealTriggered = true;
          triggerLetterStagger();
        }
      },
    });

    // ============================================
    // PHASE 2: Highlight color interpolation (scroll-scrubbed)
    // ============================================
    // Endpoints are cached at the module level (not re-read per frame).
    // The accent endpoint also refreshes via the useEffect below when the
    // AccentColorContext cycles.
    primaryRgbRef.current = colorToRgb(readPrimaryTextColor());
    accentRgbRef.current = colorToRgb(accentColor);

    highlightWordsRef.current = highlightWords;

    // PERF: Pre-cache letter elements once. Per-letter inline-style writes
    // have been replaced by a single CSS variable write per word
    // (--highlight-color); .portalLetter consumes it via CSS. Letter cache
    // kept for the accent-change useEffect, which still walks letters when
    // re-applying mid-scroll without a scrub event.
    cachedLettersRef.current.clear();
    highlightWords.forEach((wordEl) => {
      const letters = Array.from(wordEl.querySelectorAll(`.${styles.portalLetter}`)) as HTMLElement[];
      cachedLettersRef.current.set(wordEl, letters);
    });

    phase2TriggerRef.current = ScrollTrigger.create({
      trigger: containerRef.current,
      start: 'top 50%',
      end: 'top 20%',
      scrub: 2.5,
      onUpdate: (self) => {
        const progress = self.progress;
        const totalHighlights = highlightWords.length;
        const primaryRgb = primaryRgbRef.current;
        const accentRgb = accentRgbRef.current;
        highlightWords.forEach((wordEl, index) => {
          const staggerDelay = totalHighlights > 1 ? (index / (totalHighlights - 1)) * 0.3 : 0;
          const adjustedProgress = Math.max(0, Math.min(1, (progress - staggerDelay) / (1 - staggerDelay)));
          const easedProgress = adjustedProgress < 0.5
            ? 2 * adjustedProgress * adjustedProgress
            : 1 - Math.pow(-2 * adjustedProgress + 2, 2) / 2;
          const color = interpolateRgb(primaryRgb, accentRgb, easedProgress);
          // One CSS-var write per word instead of N inline-style writes per letter.
          (wordEl as HTMLElement).style.setProperty('--highlight-color', color);
        });
      },
    });

    // Cleanup
    return () => {
      // Kill the pending stagger->startAsyncAnimations handoff first. If we
      // unmount in the window after the stagger but before this fires, it
      // would otherwise run post-unmount and schedule timeouts/tweens against
      // detached letters via a fresh AbortController that escapes the abort.
      staggerCall.current?.kill();
      staggerCall.current = null;
      // PERF: Abort all pending animations
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      // Then clear timeouts
      animationIntervals.current.forEach((id) => window.clearTimeout(id));
      animationIntervals.current = [];
      // Kill any in-flight letter tweens. AbortController only guards
      // scheduling — without this, portal-loop tweens can keep running for
      // up to 600ms after unmount.
      gsap.killTweensOf(highlightLetters);
      // Reset the reveal latch so a StrictMode/HMR remount can cleanly
      // re-reveal instead of being suppressed by a stale latch.
      // (revealTriggered is a fresh closure local per effect run, so it does
      // not need resetting here.)
      hasAnimated.current = false;
    };

  }, { scope: containerRef, dependencies: [words, reducedMotion] });

  // Refresh cached endpoints + re-apply highlight colors when accent changes
  // (e.g. menu close cycles color). Phase-2 onUpdate then keeps writing the
  // CSS var using the new accentRgb on the next scrub event.
  useEffect(() => {
    primaryRgbRef.current = colorToRgb(readPrimaryTextColor());
    accentRgbRef.current = colorToRgb(accentColor);
    if (!phase2TriggerRef.current || !highlightWordsRef.current) return;

    const progress = phase2TriggerRef.current.progress;
    const totalHighlights = highlightWordsRef.current.length;
    const primaryRgb = primaryRgbRef.current;
    const accentRgb = accentRgbRef.current;

    highlightWordsRef.current.forEach((wordEl, index) => {
      const staggerDelay = totalHighlights > 1 ? (index / (totalHighlights - 1)) * 0.3 : 0;
      const adjustedProgress = Math.max(0, Math.min(1, (progress - staggerDelay) / (1 - staggerDelay)));
      const easedProgress = adjustedProgress < 0.5
        ? 2 * adjustedProgress * adjustedProgress
        : 1 - Math.pow(-2 * adjustedProgress + 2, 2) / 2;
      const color = interpolateRgb(primaryRgb, accentRgb, easedProgress);
      (wordEl as HTMLElement).style.setProperty('--highlight-color', color);
    });
  }, [accentColor]);

  return (
    <h2 ref={containerRef} className={styles.statementText} aria-label={text}>
      {/* Robust, always-present text source for AT — the animated spans below
          are purely decorative (aria-hidden). Backstops aria-label so the
          heading is never silent even if older AT falls back to text content. */}
      <span className="sr-only">{text}</span>
      {words.map(({ word, index, isHighlight }, i) => {
        const wordEl = isHighlight ? (
          <span
            className={`${styles.word} ${styles.highlightWord} ${styles.highlight}`}
            aria-hidden="true"
          >
            {word.split('').map((letter, letterIdx) => (
              <span
                key={letterIdx}
                className={styles.portalMask}
                onMouseEnter={handleLetterHover}
              >
                <span className={styles.portalLetter}>{letter}</span>
              </span>
            ))}
          </span>
        ) : (
          <span className={styles.word} aria-hidden="true">
            {word}
          </span>
        );

        return (
          <Fragment key={index}>
            {i > 0 && ' '}
            {wordEl}
          </Fragment>
        );
      })}
    </h2>
  );
}
