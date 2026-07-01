"use client";

import { useId, useRef } from "react";
import { useBlockFadeIn } from "@/lib/useBlockFadeIn";
import { useWordLineReveal } from "@/lib/useWordLineReveal";
import { animationConfig } from "@/data";
import type { VisionContent } from "@/data";
import { renderInline } from "@/lib/renderInline";
import { MetaLabel } from "@/components/ui/MetaLabel";
import styles from "./Vision.module.css";

const cs = animationConfig.caseStudy;

// titleLine1 carries the word that originally lived inside a
// <span className={styles.titleUnderline}>. The data layer is flat strings,
// so the underline is re-applied here by wrapping a specific word in the
// underline span.
//
// When `titleUnderlineWord` is supplied in the data, that exact word (first
// occurrence) is wrapped — allowing the emphasised word to be any word in the
// string. When it is absent, we fall back to the last word of titleLine1 to
// preserve the visual for all existing case studies without requiring a data
// migration.
function renderUnderlinedTitleLine1(line: string, underlineWord?: string) {
  if (underlineWord) {
    // Explicit override: find the first occurrence of the target word and wrap it.
    const idx = line.indexOf(underlineWord);
    if (idx !== -1) {
      const head = line.slice(0, idx);
      const tail = line.slice(idx + underlineWord.length);
      return (
        <>
          {head}
          <span className={styles.titleUnderline}>{underlineWord}</span>
          {tail}
        </>
      );
    }
    // Word not found in string (data mismatch) — fall through to lastIndexOf.
  }
  // Fallback: underline the trailing word (position-based, legacy behaviour).
  const lastSpace = line.lastIndexOf(" ");
  if (lastSpace === -1) {
    return <span className={styles.titleUnderline}>{line}</span>;
  }
  const head = line.slice(0, lastSpace + 1);
  const tail = line.slice(lastSpace + 1);
  return (
    <>
      {head}
      <span className={styles.titleUnderline}>{tail}</span>
    </>
  );
}

export const Vision = ({
  label,
  titleLine1,
  titleLine2,
  titleAccent,
  body,
  titleUnderlineWord,
}: VisionContent) => {
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
      className={styles.vision}
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
          {renderUnderlinedTitleLine1(titleLine1, titleUnderlineWord)}
          <br />
          {titleLine2}{" "}
          <span className={styles.titleAccent}>{titleAccent}</span>
        </h2>
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
