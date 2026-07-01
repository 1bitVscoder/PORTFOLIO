"use client";

import { useId, useRef } from "react";
import { useBlockFadeIn } from "@/lib/useBlockFadeIn";
import { useWordLineReveal } from "@/lib/useWordLineReveal";
import { animationConfig } from "@/data";
import type { OutcomesContent } from "@/data";
import { MetaLabel } from "@/components/ui/MetaLabel";
import styles from "./Outcomes.module.css";

const cs = animationConfig.caseStudy;

export const Outcomes = ({ label, titleLine1, titleLine2, titleAccent, metrics }: OutcomesContent) => {
  const sectionRef = useRef<HTMLElement>(null);
  const eyebrowRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const eyebrowId = useId();

  useBlockFadeIn(sectionRef, {
    start: cs.scrollTrigger.early,
    groups: [
      {
        targets: [eyebrowRef],
        y: cs.blockFade.yMedium,
        duration: cs.blockFade.durationShort,
      },
      {
        targets: [gridRef],
        y: cs.blockFade.yMedium,
        duration: cs.blockFade.durationLong,
        delay: 0.35,
      },
    ],
  });

  useWordLineReveal(titleRef, { scope: sectionRef });

  return (
    <section
      ref={sectionRef}
      className={styles.outcomes}
      aria-labelledby={eyebrowId}
    >
      <div className={styles.head}>
        <MetaLabel
          ref={eyebrowRef}
          id={eyebrowId}
          className={styles.eyebrow}
        >
          {label}
        </MetaLabel>
        <h2 ref={titleRef} className={styles.title}>
          {titleLine1}
          <br />
          {titleLine2}{" "}
          <span className={styles.titleAccent}>{titleAccent}</span>
        </h2>
      </div>

      <div ref={gridRef} className={styles.grid}>
        {metrics.map((m) => (
          <div key={m.title} className={styles.metric}>
            <span className={styles.value}>
              {m.value}
              {m.unit && <sup>{m.unit}</sup>}
            </span>
            <span className={styles.label}>
              <b>{m.title}</b>
              {m.caption}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
};
