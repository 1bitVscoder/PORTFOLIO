"use client";

import { useId, useRef } from "react";
import { useBlockFadeIn } from "@/lib/useBlockFadeIn";
import { useWordLineReveal } from "@/lib/useWordLineReveal";
import { animationConfig } from "@/data";
import type { ColophonContent } from "@/data";
import { renderInline } from "@/lib/renderInline";
import { MetaLabel } from "@/components/ui/MetaLabel";
import styles from "./Colophon.module.css";

const cs = animationConfig.caseStudy;

// Position-encoded action styling preserves the original 3-button visual
// (idx 0 = pillSolid, idx 1 = pill, idx 2 = pillGhost) without adding a
// variant field to ColophonAction. Data only carries label + optional href.
//
// The mapping is intentionally stable: the case-studies.json actions array
// always contains exactly three entries in the order [primary, secondary,
// ghost]. If that order ever changes, or a fourth variant is needed, add an
// explicit `variant?: 'solid' | 'default' | 'ghost'` field to ColophonAction
// in data/types.ts and replace this function with a direct lookup.
const actionClassFor = (index: number): string => {
  if (index === 0) return `${styles.pill} ${styles.pillSolid}`;
  if (index === 2) return `${styles.pill} ${styles.pillGhost}`;
  return styles.pill;
};

export const Colophon = ({ leftLabel, titleLine1, titleAccent, credits, rightLabel, bio, actions }: ColophonContent) => {
  const sectionRef = useRef<HTMLElement>(null);
  const leftEyebrowRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const creditsRef = useRef<HTMLDListElement>(null);
  const rightEyebrowRef = useRef<HTMLDivElement>(null);
  const bioRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const eyebrowId = useId();

  useBlockFadeIn(sectionRef, {
    start: cs.scrollTrigger.mid,
    groups: [
      {
        targets: [leftEyebrowRef, rightEyebrowRef],
        y: cs.blockFade.yShort,
        duration: cs.blockFade.durationShort,
        stagger: 0.06,
      },
      {
        targets: [creditsRef, actionsRef],
        y: cs.blockFade.yMedium,
        duration: cs.blockFade.durationLong,
        stagger: 0.1,
        delay: 0.4,
      },
    ],
  });

  useWordLineReveal(titleRef, { scope: sectionRef });
  useWordLineReveal(bioRef, { scope: sectionRef, delay: 0.15 });

  return (
    <section
      ref={sectionRef}
      className={styles.colophon}
      aria-labelledby={eyebrowId}
    >
      <div className={styles.inner}>
        <div>
          <MetaLabel
            ref={leftEyebrowRef}
            id={eyebrowId}
            className={styles.eyebrow}
          >
            {leftLabel}
          </MetaLabel>
          <h2 ref={titleRef} className={styles.title}>
            {titleLine1}{" "}
            <span className={styles.titleAccent}>{titleAccent}</span>
          </h2>
          <dl ref={creditsRef} className={styles.credits}>
            {credits.map((c) => (
              <div key={c.role} role="group" className={styles.credit}>
                <dt>{c.role}</dt>
                <dd>{c.primary}</dd>
                {c.secondary && <dd>{c.secondary}</dd>}
              </div>
            ))}
          </dl>
        </div>

        <div className={styles.bio}>
          <MetaLabel ref={rightEyebrowRef} className={styles.eyebrow}>
            {rightLabel}
          </MetaLabel>
          <div ref={bioRef}>
            {/* Index keys are acceptable here: bio paragraphs are static
                build-time content from case-studies.json and never reorder. */}
            {bio.map((paragraph, i) => (
              <p key={i}>{renderInline(paragraph)}</p>
            ))}
          </div>
          <div ref={actionsRef} className={styles.actions}>
            {actions.map((action, i) =>
              action.href ? (
                <a
                  key={action.label}
                  href={action.href}
                  className={actionClassFor(i)}
                  {...(/^https?:\/\//.test(action.href)
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                >
                  {action.label}
                </a>
              ) : (
                <button key={action.label} type="button" className={actionClassFor(i)}>
                  {action.label}
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
