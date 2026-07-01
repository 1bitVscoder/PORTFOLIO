"use client";

/* ABOUT PAGE · Intro
   The first reading moment, mirroring the case-study Context section: a
   sticky marginalia column of facts beside a single editorial reading
   column of profile narrative. From content.about.bio. */

import { useId, useRef } from "react";
import { useBlockFadeIn } from "@/lib/useBlockFadeIn";
import { useWordLineReveal } from "@/lib/useWordLineReveal";
import { renderInline } from "@/lib/renderInline";
import { animationConfig, content, navigation } from "@/data";
import { SectionLabel } from "@/components/sections/case-study/SectionLabel";
import styles from "./Intro.module.css";

const cs = animationConfig.caseStudy;
const basedIn = navigation.location.replace(/^based in\s*/i, "");

const FACTS = [
  { k: "Role", v: content.hero.title },
  { k: "Mode", v: "Builds independently" },
  { k: "Based in", v: basedIn },
];

export function AboutPageIntro() {
  const sectionRef = useRef<HTMLElement>(null);
  const marginRef = useRef<HTMLDivElement>(null);
  const colRef = useRef<HTMLDivElement>(null);
  const eyebrowId = useId();

  useBlockFadeIn(sectionRef, {
    start: cs.scrollTrigger.early,
    groups: [
      { targets: [marginRef], y: cs.blockFade.yTall, duration: cs.blockFade.durationLong },
    ],
  });
  useWordLineReveal(colRef, { scope: sectionRef });

  return (
    <section ref={sectionRef} className={styles.intro} aria-labelledby={eyebrowId}>
      <aside className={styles.margin}>
        <div ref={marginRef} className={styles.marginInner}>
          <SectionLabel id={eyebrowId} className={styles.eyebrow}>
            Profile
          </SectionLabel>
          {FACTS.map((f) => (
            <div key={f.k} className={styles.fact}>
              <b>{f.k}</b>
              {f.v}
            </div>
          ))}
        </div>
      </aside>

      <div ref={colRef} className={styles.col}>
        {content.about.bio.map((paragraph, i) => (
          <p key={i} className={i === 0 ? styles.lede : undefined}>
            {renderInline(paragraph)}
          </p>
        ))}
      </div>
    </section>
  );
}
