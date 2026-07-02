'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap, ScrollTrigger, ANIMATION_CONFIG } from '@/lib/gsap';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { content } from '@/data';
import { MetaLabel } from '@/components/ui/MetaLabel';
import { RevealText } from './RevealText';
import { DsaRaceTrack } from './DsaRaceTrack';
import styles from './Philosophy.module.css';

// Philosophy hold: once the section fills the viewport, pin it for this many
// viewport-heights of scroll, then release toward the next section. Mirrors
// Archive's pin idiom (see Archive.tsx `ARCHIVE_PIN_VH`).
const PHILOSOPHY_PIN_VH = 1.0;

export function Philosophy() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useGSAP(() => {
    if (reducedMotion) return;
    if (!wrapperRef.current || !sectionRef.current || !labelRef.current) return;

    // Meta-label entrance animation
    const labelTween = gsap.from(labelRef.current, {
      scrollTrigger: {
        trigger: sectionRef.current,
        start: 'top 80%',
      },
      x: -50,
      opacity: 0,
      duration: 1.5,
      ease: ANIMATION_CONFIG.ease.outQuart,
    });

    // Pin the section while user reads. Mirrors Archive's pin idiom:
    // functional `end` against live `window.innerHeight` so the runway
    // recomputes on resize, explicit `pin: <element>`, and `pinType: 'fixed'`
    // for resilience against transformed ancestors.
    const pinTrigger = ScrollTrigger.create({
      trigger: sectionRef.current,
      start: 'top top',
      end: () => '+=' + window.innerHeight * PHILOSOPHY_PIN_VH,
      pin: sectionRef.current,
      pinSpacing: true,
      pinType: 'fixed',
    });

    // PERF: Explicit cleanup to prevent memory leaks
    return () => {
      pinTrigger.kill();
      if (labelTween.scrollTrigger) labelTween.scrollTrigger.kill();
    };
  }, { scope: wrapperRef, dependencies: [reducedMotion] });

  return (
    <div ref={wrapperRef} className={styles.wrapper}>
      <section ref={sectionRef} className={styles.section} id="philosophy">
        <MetaLabel ref={labelRef}>{content.philosophy.label}</MetaLabel>
        <RevealText
          text={content.philosophy.statement}
          highlights={content.philosophy.highlights}
        />
      </section>
      <div className={styles.raceTrackContainer}>
        <DsaRaceTrack />
      </div>
    </div>
  );
}
