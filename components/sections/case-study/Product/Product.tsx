"use client";

import { useId, useRef } from "react";
import { useBlockFadeIn } from "@/lib/useBlockFadeIn";
import { useWordLineReveal } from "@/lib/useWordLineReveal";
import { animationConfig } from "@/data";
import type { ProductContent } from "@/data";
import { renderInline } from "@/lib/renderInline";
import { MetaLabel } from "@/components/ui/MetaLabel";
import styles from "./Product.module.css";

const cs = animationConfig.caseStudy;

export const Product = ({
  label,
  titleLine1,
  titleLine2,
  titleAccent,
  body,
}: ProductContent) => {
  const sectionRef = useRef<HTMLElement>(null);
  const eyebrowRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const colRef = useRef<HTMLDivElement>(null);
  const eyebrowId = useId();

  useBlockFadeIn(sectionRef, {
    start: cs.scrollTrigger.early,
    groups: [
      {
        targets: [eyebrowRef],
        y: cs.blockFade.yShort,
        duration: cs.blockFade.durationShort,
      },
    ],
  });

  useWordLineReveal(titleRef, { scope: sectionRef });
  useWordLineReveal(colRef, { scope: sectionRef, delay: 0.15 });

  return (
    <section
      ref={sectionRef}
      className={styles.product}
      aria-labelledby={eyebrowId}
    >
      <div className={styles.head}>
        <div className={styles.row}>
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
      </div>

      <div ref={colRef} className={styles.col}>
        {/* Index keys are acceptable here: body paragraphs are static
            build-time content from case-studies.json and never reorder. */}
        {body.map((paragraph, i) => (
          <p key={i}>{renderInline(paragraph)}</p>
        ))}
      </div>
    </section>
  );
};
