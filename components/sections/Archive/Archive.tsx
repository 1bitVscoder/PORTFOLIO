'use client';

import { Fragment, useCallback, useMemo, useRef, type MouseEvent } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap, ScrollTrigger, ANIMATION_CONFIG } from '@/lib/gsap';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { useAccentColor } from '@/lib/AccentColorContext';
import { TransitionLink } from '@/components/transitions';
import { MetaLabel } from '@/components/ui/MetaLabel';
import { content } from '@/data';
import styles from './Archive.module.css';

// ============================================
// PORTAL ANIMATION UTILITIES — copied from RevealText.tsx
// so the two sections share identical motion behavior.
// ============================================

type Direction = 'up' | 'down' | 'left' | 'right';
const DIRECTIONS: Direction[] = ['up', 'down', 'left', 'right'];
const PORTAL_DISTANCE = 110;
// Minimum and maximum additional jitter (ms) for the continuous letter-loop scheduler.
const PORTAL_LOOP_MIN_MS = 3000;
const PORTAL_LOOP_JITTER_MS = 3000;

// Archive hold: once the section fills the viewport, pin it for this many
// viewport-heights of scroll, then release toward Contact. The statement and
// foot stay PUT during the hold (no scroll-linked drift) — the only motion is
// the portal-letter loops, which run on their own timers. Smoothness on
// entry/exit comes from anticipatePin + this runway, not a scrubbed tween.
// Tunable. See .planning/projects-archive-handoff/PLAN-v5-stacked.md.
const ARCHIVE_PIN_VH = 1.0;

const getRandomDirection = (): Direction =>
  DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];

const getDirectionTransform = (direction: Direction, distance: number = PORTAL_DISTANCE) => {
  switch (direction) {
    case 'up':    return { x: 0, y: -distance };
    case 'down':  return { x: 0, y: distance };
    case 'left':  return { x: -distance, y: 0 };
    case 'right': return { x: distance, y: 0 };
    default: {
      const _exhaustive: never = direction;
      return _exhaustive;
    }
  }
};

const getOppositeDirection = (direction: Direction): Direction => {
  switch (direction) {
    case 'up':    return 'down';
    case 'down':  return 'up';
    case 'left':  return 'right';
    case 'right': return 'left';
    default: {
      const _exhaustive: never = direction;
      return _exhaustive;
    }
  }
};

// Single portal loop — letter exits one direction and re-enters from the
// opposite. Used for both the initial reveal and the continuous async loops.
const triggerPortalLoop = (letterElement: HTMLElement) => {
  if (gsap.isTweening(letterElement)) return;
  const direction = getRandomDirection();
  const exitTransform = getDirectionTransform(direction);
  const entryTransform = getDirectionTransform(getOppositeDirection(direction));

  gsap.timeline()
    .to(letterElement, {
      x: exitTransform.x + '%',
      y: exitTransform.y + '%',
      duration: 0.25,
      ease: 'power2.in',
    })
    .set(letterElement, {
      x: entryTransform.x + '%',
      y: entryTransform.y + '%',
    })
    .to(letterElement, {
      x: '0%',
      y: '0%',
      duration: 0.35,
      ease: 'power2.out',
    });
};

// ============================================

export function Archive() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const statementRef = useRef<HTMLHeadingElement>(null);
  const footRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutsRef = useRef<number[]>([]);
  const reducedMotion = useReducedMotion();
  const { color: currentAccent } = useAccentColor();

  const { archive } = content;

  const words = useMemo(() => {
    const highlightSet = new Set(archive.highlights.map((h) => h.toLowerCase()));
    return archive.statement.split(' ').map((word, index) => {
      const clean = word.toLowerCase().replace(/[.,!?—]/g, '');
      return { word, index, isHighlight: highlightSet.has(clean) };
    });
  }, [archive.statement, archive.highlights]);

  // Hover any letter to fire its own portal loop on demand.
  const handleLetterHover = useCallback((e: MouseEvent<HTMLSpanElement>) => {
    const letter = e.currentTarget.querySelector(`.${styles.portalLetter}`) as HTMLElement | null;
    if (letter) triggerPortalLoop(letter);
  }, []);

  useGSAP(
    () => {
      if (reducedMotion) return;
      const section = sectionRef.current;
      const label = labelRef.current;
      const statement = statementRef.current;
      const foot = footRef.current;
      if (!section || !label || !statement || !foot) return;

      const highlightWords = statement.querySelectorAll<HTMLElement>(`.${styles.highlightWord}`);
      const portalLetters = statement.querySelectorAll<HTMLElement>(`.${styles.portalLetter}`);

      // ----- Initial states -----
      gsap.set(highlightWords, { opacity: 0 });
      portalLetters.forEach((letter) => {
        const dir = getRandomDirection();
        const start = getDirectionTransform(dir);
        gsap.set(letter, { x: start.x + '%', y: start.y + '%' });
      });

      let revealed = false;
      let asyncStarted = false;
      let mounted = true;
      // Tracked so cleanup can kill the post-reveal scheduler before it fires.
      let asyncStartDelayedCall: gsap.core.Tween | null = null;

      // After the initial reveal, each letter loops independently every 3–6s.
      const startAsyncLoops = () => {
        if (asyncStarted || !mounted) return;
        asyncStarted = true;
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        portalLetters.forEach((letter) => {
          const scheduleNext = () => {
            if (signal.aborted) return;
            const delay = PORTAL_LOOP_MIN_MS + Math.random() * PORTAL_LOOP_JITTER_MS;
            const id = window.setTimeout(() => {
              if (signal.aborted) return;
              triggerPortalLoop(letter);
              scheduleNext();
            }, delay);
            timeoutsRef.current.push(id);
          };

          const initialDelay = Math.random() * PORTAL_LOOP_JITTER_MS;
          const id = window.setTimeout(() => {
            if (signal.aborted) return;
            triggerPortalLoop(letter);
            scheduleNext();
          }, initialDelay);
          timeoutsRef.current.push(id);
        });
      };

      // Initial letter stagger reveal — flip the word container visible,
      // then animate each letter back to x:0/y:0 with random jitter.
      const revealLetters = () => {
        if (revealed) return;
        revealed = true;

        gsap.to(highlightWords, { opacity: 1, duration: 0.01 });

        const letterDuration = 0.4;
        const maxRandomDelay = 0.25;

        portalLetters.forEach((letter) => {
          const delay = Math.random() * maxRandomDelay;
          gsap.to(letter, {
            x: '0%',
            y: '0%',
            duration: letterDuration,
            delay,
            ease: 'power2.out',
          });
        });

        asyncStartDelayedCall = gsap.delayedCall(
          letterDuration + maxRandomDelay + 0.3,
          startAsyncLoops
        );
      };

      // Meta-label entrance — same as Philosophy's labelTween.
      const labelTween = gsap.from(label, {
        scrollTrigger: { trigger: section, start: 'top 80%' },
        x: -50,
        opacity: 0,
        duration: 1.5,
        ease: ANIMATION_CONFIG.ease.outQuart,
      });

      // Trigger the letter stagger once the statement enters view.
      const revealTrigger = ScrollTrigger.create({
        trigger: statement,
        start: 'top 80%',
        onEnter: revealLetters,
      });

      // Color shift — add .hlOn so highlight words transition to accent.
      const colorTrigger = ScrollTrigger.create({
        trigger: statement,
        start: 'top 55%',
        end: 'top 25%',
        onEnter: () => section.classList.add(styles.hlOn),
        onLeaveBack: () => section.classList.remove(styles.hlOn),
      });

      // Foot — quiet fade-up after the highlight bar lands.
      const footTween = gsap.from(foot.children, {
        scrollTrigger: { trigger: foot, start: 'top 85%' },
        y: 24,
        opacity: 0,
        duration: 0.9,
        stagger: 0.12,
        ease: 'power3.out',
      });

      // Pin the Archive once it fills the viewport, then release toward Contact.
      // Animation-free pin: the statement and foot stay exactly in place while
      // pinned (an earlier scrubbed parallax made the statement appear to float
      // with the scroll). pinType fixed + invalidateOnRefresh match the repo
      // convention.
      //
      // anticipatePin is intentionally 0. It engages the pin early scaled by
      // scroll velocity, but our velocity is Lenis-smoothed (LenisProvider drives
      // Lenis off gsap.ticker, no normalizeScroll) — so at the Projects→Archive
      // seam the prediction overshot and snapped the opaque section up to top:0 a
      // few frames before the scroll arrived (the "magnet pull"). With it off the
      // section locks exactly when its top reaches the viewport top; the overlap
      // runway alone carries the entry, so there is no early yank.
      const archivePin = ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: () => '+=' + window.innerHeight * ARCHIVE_PIN_VH,
        pin: section,
        pinSpacing: true,
        pinType: 'fixed',
        anticipatePin: 0,
        invalidateOnRefresh: true,
      });

      return () => {
        // Preserve scroll across teardown: killing the pin removes its spacer,
        // which shortens the document and makes the browser clamp scrollY —
        // visible as a page jump on route-change / StrictMode remount. Capture
        // once around the whole cleanup and restore at the end (same pattern as
        // ServicesV2's pin cleanup).
        const savedScrollY = window.scrollY;
        // Block any in-flight callbacks from re-arming after teardown.
        mounted = false;
        // Kill the post-reveal scheduler so it can't fire startAsyncLoops
        // after unmount and leak a fresh AbortController + timeouts.
        if (asyncStartDelayedCall) asyncStartDelayedCall.kill();
        // Abort pending continuous loops first, then clear any in-flight timeouts.
        if (abortControllerRef.current) abortControllerRef.current.abort();
        timeoutsRef.current.forEach((id) => window.clearTimeout(id));
        timeoutsRef.current = [];
        if (labelTween.scrollTrigger) labelTween.scrollTrigger.kill();
        if (footTween.scrollTrigger) footTween.scrollTrigger.kill();
        revealTrigger.kill();
        colorTrigger.kill();
        // Remove the highlight class that colorTrigger stamps; without this
        // Fast-Refresh / matchMedia revoke leaves hlOn in place and the
        // re-mounted trigger never re-fires the onEnter.
        section.classList.remove(styles.hlOn);
        archivePin.kill();
        if (window.scrollY !== savedScrollY) window.scrollTo(0, savedScrollY);
      };
    },
    { scope: wrapperRef, dependencies: [reducedMotion] }
  );

  return (
    <div ref={wrapperRef} id="archive-wrapper" className={styles.wrapper}>
      <section ref={sectionRef} className={styles.section} id="archive">
        <MetaLabel ref={labelRef} className={styles.metaLabel}>
          {archive.label}
        </MetaLabel>

        <h2
          ref={statementRef}
          className={styles.statement}
          aria-label={archive.statement}
        >
          {words.map(({ word, index, isHighlight }, i) => {
            if (isHighlight) {
              return (
                <Fragment key={index}>
                  {i > 0 && ' '}
                  <span
                    className={`${styles.word} ${styles.highlightWord} ${styles.highlight}`}
                    aria-hidden="true"
                  >
                    {word.split('').map((letter, li) => (
                      <span
                        key={li}
                        className={styles.portalMask}
                        onMouseEnter={handleLetterHover}
                      >
                        <span className={styles.portalLetter}>{letter}</span>
                      </span>
                    ))}
                  </span>
                </Fragment>
              );
            }
            return (
              <Fragment key={index}>
                {i > 0 && ' '}
                <span className={styles.word} aria-hidden="true">
                  {word}
                </span>
              </Fragment>
            );
          })}
        </h2>

        <div ref={footRef} className={styles.foot}>
          <div className={styles.footMeta}>
            <span>{archive.metaLeft}</span>
            <span>{archive.metaRight}</span>
          </div>

          <TransitionLink
            href={archive.ctaHref}
            className={styles.cta}
            aria-label={`${archive.cta} — full index of works`}
            payload={{
              // Use the LIVE current accent (same pattern as Menu and the
              // /work2 back-link). Hardcoding a palette value here would
              // force-write that color into --color-accent-purple at exit
              // and stick on the destination page until the user clicks
              // back, which is the bug we were seeing.
              accent: currentAccent,
              title: 'Works',
              slug: 'works',
              category: 'Index',
            }}
          >
            <span className={styles.ctaTextWrap}>
              {/* Base text — primary color, slides up on hover */}
              <span className={styles.ctaTextBase}>
                {archive.cta.split('').map((char, i) => (
                  <span
                    key={i}
                    className={styles.ctaChar}
                    style={{ transitionDelay: `${i * 0.025}s` }}
                  >
                    {char === ' ' ? ' ' : char}
                  </span>
                ))}
              </span>
              {/* Clone text — accent color, slides in from below on hover */}
              <span className={styles.ctaTextClone} aria-hidden="true">
                {archive.cta.split('').map((char, i) => (
                  <span
                    key={i}
                    className={styles.ctaChar}
                    style={{ transitionDelay: `${i * 0.025}s` }}
                  >
                    {char === ' ' ? ' ' : char}
                  </span>
                ))}
              </span>
            </span>
            <span className={styles.ctaArrow} aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square">
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </span>
          </TransitionLink>
        </div>
      </section>
    </div>
  );
}
