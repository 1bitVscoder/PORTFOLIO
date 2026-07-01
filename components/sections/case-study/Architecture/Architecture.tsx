"use client";

import { useId, useRef } from "react";
import { useBlockFadeIn } from "@/lib/useBlockFadeIn";
import { useWordLineReveal } from "@/lib/useWordLineReveal";
import { animationConfig } from "@/data";
import type { ArchitectureContent } from "@/data";
import { renderInline } from "@/lib/renderInline";
import { MetaLabel } from "@/components/ui/MetaLabel";
import styles from "./Architecture.module.css";

const cs = animationConfig.caseStudy;

export const Architecture = ({
  label,
  titleLine1,
  titleAccent,
  intro,
  layers,
  facts,
}: ArchitectureContent) => {
  const sectionRef = useRef<HTMLElement>(null);
  const eyebrowRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const introRef = useRef<HTMLParagraphElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const factsRef = useRef<HTMLDivElement>(null);
  const eyebrowId = useId();

  useBlockFadeIn(sectionRef, {
    start: cs.scrollTrigger.early,
    groups: [
      {
        targets: [eyebrowRef, introRef],
        y: cs.blockFade.yShort,
        duration: cs.blockFade.durationShort,
        stagger: 0.08,
      },
      {
        targets: [stackRef, factsRef],
        y: cs.blockFade.yMedium,
        duration: cs.blockFade.durationLong,
        stagger: 0.12,
        delay: 0.3,
      },
    ],
  });

  useWordLineReveal(titleRef, { scope: sectionRef });

  return (
    <section
      ref={sectionRef}
      className={styles.architecture}
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
          <span className={styles.titleAccent}>{titleAccent}</span>
        </h2>
        <p ref={introRef} className={styles.intro}>
          {renderInline(intro)}
        </p>
      </div>

      <div ref={stackRef} className={styles.stack}>
        {layers.map((layer) => (
          <div key={layer.name} className={styles.layer}>
            <div className={styles.layerHead}>
              <span className={styles.layerName}>{layer.name}</span>
              <ul className={styles.chips}>
                {layer.tech.map((t) => (
                  <li key={t} className={styles.chip}>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <p className={styles.detail}>{renderInline(layer.detail)}</p>
          </div>
        ))}
      </div>

      <div ref={factsRef} className={styles.facts}>
        {facts.map((f) => (
          <div key={f.title} className={styles.fact}>
            <span className={styles.value}>
              {f.value}
              {f.unit && <sup>{f.unit}</sup>}
            </span>
            <span className={styles.factLabel}>
              <b>{f.title}</b>
              {f.caption}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
};
