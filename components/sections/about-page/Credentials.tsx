"use client";

/* ABOUT PAGE · Credentials — "Under the hood" bordered-row layout.
   One de-duplicated, newest-first list of every credential, rendered in the
   case-study Architecture language: a bordered, rounded container of stacked
   rows. Each row has a header column (period + kind chip, credential name,
   institution) and a readable detail column. The RNCP state titles a degree
   confers live on the degree as "certified as" lines (↳), so they are never
   duplicated as their own rows. This merges what used to be two columns
   (Education + Certifications). From content.about.credentials. */

import { useRef } from "react";
import { useBlockFadeIn } from "@/lib/useBlockFadeIn";
import { useWordLineReveal } from "@/lib/useWordLineReveal";
import { useEnterReveal } from "@/lib/useEnterReveal";
import { animationConfig, content } from "@/data";
import { SectionLabel } from "@/components/sections/case-study/SectionLabel";
import styles from "./Credentials.module.css";

const cs = animationConfig.caseStudy;

export function AboutPageCredentials() {
  const sectionRef = useRef<HTMLElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<HTMLOListElement>(null);
  const { credentials } = content.about;

  useBlockFadeIn(sectionRef, {
    start: cs.scrollTrigger.early,
    groups: [
      { targets: [headRef], y: cs.blockFade.yShort, duration: cs.blockFade.durationShort },
    ],
  });
  // Reveal the credential text with the exact same animation as the Profile
  // section: a per-word, per-line masked slide-up. No block fade on this
  // content (profile's reading column has none either) so the word reveal
  // reads on its own rather than dissolving into an opacity fade. Points and
  // pills opt out of the word split — they get their own entrance below.
  useWordLineReveal(stackRef, {
    scope: sectionRef,
    exclude: "[data-point], [data-pill]",
  });
  // Coursework points reveal with the same masked slide-up as the Profile/word
  // text: the inner span rises from behind its clipping li (yPercent 110 → 0)
  // while the li fades (so the diamond bullet doesn't show before its text
  // arrives). Kind pills pop. Each fires per-element as it scrolls in, so points
  // deep in this tall list still animate when reached instead of off-screen.
  useEnterReveal(sectionRef, [
    {
      selector: "[data-point]",
      from: { opacity: 0 },
      innerSelector: "[data-point-inner]",
      innerFrom: { yPercent: 110 },
      duration: 0.7,
      stagger: 0.07,
    },
    {
      selector: "[data-pill]",
      from: { opacity: 0, scale: 0.8 },
      ease: "back.out(1.7)",
      duration: 0.45,
      stagger: 0.05,
    },
  ]);

  return (
    <section ref={sectionRef} className={styles.section}>
      <div className={styles.inner}>
        <div ref={headRef} className={styles.head}>
          <SectionLabel className={styles.eyebrow}>Credentials</SectionLabel>
          <span className={styles.count}>{String(credentials.length).padStart(2, "0")}</span>
        </div>

        <ol ref={stackRef} className={styles.stack}>
          {credentials.map((c) => (
            <li
              key={c.credential + c.period}
              className={styles.entry}
              data-kind={c.kind.toLowerCase()}
            >
              <div className={styles.rowHead}>
                <div className={styles.rowTop}>
                  <span className={styles.year}>{c.period}</span>
                  <span className={styles.chip} data-pill>{c.kind}</span>
                </div>
                <h3 className={styles.credential}>{c.credential}</h3>
                <p className={styles.inst}>
                  <span>{c.institution}</span>
                  {c.institution.includes("ITER College") && (
                    <a
                      href="https://www.google.com/maps/place/ITER+college+Bhubaneswar/@20.2487897,85.7980818,17z/data=!3m1!4b1!4m6!3m5!1s0x3a19a74ac6d4e26d:0xb680a5c41d496a3d!8m2!3d20.2487847!4d85.8006567!16s%2Fg%2F11kr7rhvnq?entry=ttu&g_ep=EgoyMDI2MDcwOC4wIKXMDSoASAFQAw%3D%3D"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.miniMapLink}
                    >
                      [ 20.2487° N, 85.8007° E ]
                    </a>
                  )}
                  {c.status && <span className={styles.status}>{c.status}</span>}
                </p>
              </div>

              <div className={styles.rowBody}>
                {c.titles && (
                  <ul className={styles.titles}>
                    {c.titles.map((t) => (
                      <li key={t.label} className={styles.title}>
                        <span className={styles.titleArrow} aria-hidden="true">↳</span>
                        <span className={styles.titleLabel}>{t.label}</span>
                        <span className={styles.titleRef}>{t.ref}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {c.points && (
                  <ul className={styles.points}>
                    {c.points.map((pt) => (
                      <li key={pt} className={styles.point} data-point>
                        <span className={styles.pointInner} data-point-inner>{pt}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
