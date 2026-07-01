"use client";

import { useId, useRef } from "react";
import { useBlockFadeIn } from "@/lib/useBlockFadeIn";
import { useWordLineReveal } from "@/lib/useWordLineReveal";
import { animationConfig } from "@/data";
import type { ContextContent } from "@/data";
import { renderInline } from "@/lib/renderInline";
import { MetaLabel } from "@/components/ui/MetaLabel";
import styles from "./Context.module.css";

const cs = animationConfig.caseStudy;

export const Context = ({ label, facts, body }: ContextContent) => {
  const sectionRef = useRef<HTMLElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const colRef = useRef<HTMLDivElement>(null);
  const eyebrowId = useId();

  useBlockFadeIn(sectionRef, {
    start: cs.scrollTrigger.early,
    groups: [
      {
        targets: [innerRef],
        y: cs.blockFade.yTall,
        duration: cs.blockFade.durationLong,
      },
    ],
  });

  useWordLineReveal(colRef, { scope: sectionRef });

  return (
    <section
      ref={sectionRef}
      className={styles.context}
      aria-labelledby={eyebrowId}
    >
      <aside className={styles.margin}>
        <div ref={innerRef} className={styles.marginInner}>
          <MetaLabel id={eyebrowId} className={styles.eyebrow}>
            {label}
          </MetaLabel>
          {facts.map((fact) => (
            <div key={fact} className={styles.fact}>
              {renderInline(fact)}
            </div>
          ))}
        </div>
      </aside>

      <div ref={colRef} className={styles.col}>
        {/* Index keys are acceptable here: body paragraphs are static
            build-time content from case-studies.json and never reorder. */}
        {body.map((paragraph, i) => (
          <p key={i} className={i === 0 ? styles.lede : undefined}>
            {renderInline(paragraph)}
          </p>
        ))}
      </div>
    </section>
  );
};
