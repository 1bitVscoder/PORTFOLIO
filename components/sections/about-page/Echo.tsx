"use client";

/* ABOUT PAGE · Hero variant — "Echo".
   A stacked typographic masthead from Figma (node 53:31): one solid "ABOUT ME"
   set colossal in the centre — ABOUT in muted ink, ME in the live accent — with
   three outlined echo rows mirrored above and below. Each echo is the same word
   clipped to a thin band so only a slice of the glyphs shows, repeated in
   alternating ink/accent strokes, reading like a vertical reflection of the
   focal word. Geometry (band heights + offsets) is ported 1:1 from the Figma
   layers as em ratios of the masthead size, so the slices line up at any scale.
   The design's fixed coral/grey are mapped to the site's muted ink + dynamic
   accent to stay on-brand with the rest of /about. CSS-only layout; one on-load
   reveal gated to motion-allowed, holds visible under reduced motion. No photo. */

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap";
import { TransitionLink, useTransition } from "@/components/transitions";
import { useAccentColor } from "@/lib/AccentColorContext";
import styles from "./Echo.module.css";

const WORD = "ABOUT ME"; // The echo rows are all the same word, so we can centralize it here

// Outline strokes alternate outward from the solid centre: ink, accent, ink.
// Top rows render outer→inner (matching the Figma "third/second/first layer"
// order); bottom rows render inner→outer.
const TOP_ROWS = ["ink", "accent", "ink"] as const;
const BOTTOM_ROWS = ["ink", "accent", "ink"] as const;

export function AboutPageHeroEcho() {
  const { color: currentAccent } = useAccentColor();
  const { hasEntered } = useTransition();
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (!hasEntered) return;
      const section = sectionRef.current;
      if (!section) return;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const echoes = gsap.utils.toArray<HTMLElement>("[data-echo]", section);
        const cells = gsap.utils.toArray<HTMLElement>("[data-echo-cell]", section);
        const solidRow = section.querySelector<HTMLElement>(
          '[data-band="solid"]',
        );

        // Distance to pull a cell so its echo row sits at the solid word's
        // centre — the SAME value the scroll-merge slides the row INTO (read
        // from transform-free layout offsets). The load is its exact inverse.
        const cellDy = (cell: HTMLElement) => {
          const row = cell.querySelector<HTMLElement>("[data-echo]");
          if (!row || !solidRow) return 0;
          return (
            solidRow.offsetTop +
            solidRow.offsetHeight / 2 -
            (row.offsetTop + row.offsetHeight / 2)
          );
        };

        // On-load reveal: the solid word slides up first (the anchor), then each
        // echo layer slides OUT of the solid centre to its own band while its
        // clip unfurls — the perfect reverse of the scroll-merge — then the
        // chrome settles. The merge keeps owning the inner rows; the load only
        // touches the per-row CELL wrappers, so the two never fight.
        gsap.set("[data-reveal]", { autoAlpha: 0, y: 24 });
        gsap.set("[data-solid]", { yPercent: 115 });
        // Each cell starts collapsed INTO the solid: pulled to the centre and
        // clipped shut on its solid-facing edge (up rows close from the bottom,
        // down rows from the top) — exactly where the merge leaves the row.
        gsap.set(cells, {
          y: (_i: number, el: HTMLElement) => cellDy(el),
          clipPath: (_i: number, el: HTMLElement) =>
            el.dataset.dir === "up"
              ? "inset(0% 0% 100% 0%)"
              : "inset(100% 0% 0% 0%)",
        });

        const intro = gsap.timeline({ delay: 0.1 });
        intro
          .to("[data-solid]", { yPercent: 0, duration: 1, ease: "expo.out" })
          .to(
            cells,
            {
              y: 0,
              clipPath: "inset(0% 0% 0% 0%)",
              duration: 0.9,
              ease: "power3.out",
              // No stagger — every layer emerges at once, mirroring the merge,
              // which retracts every row simultaneously.
              // Once expanded, strip the inline clip + transform so the cell is
              // fully inert: with no transform it stops being the row's
              // offsetParent, so the merge measures row.offsetTop against .hero
              // again. Refresh the merge so its slide distance recomputes from
              // the now-clean DOM (covers a scroll that happened mid-intro).
              onComplete: () => {
                gsap.set(cells, { clearProps: "clipPath,transform" });
                merge.scrollTrigger?.refresh();
              },
            },
            "-=0.65",
          )
          .to(
            "[data-reveal]",
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.8,
              ease: "expo.out",
              stagger: 0.12,
            },
            "-=0.8",
          );

        // Scroll merge: pin the hero and, as the user scrolls, retract every
        // echo row with a `clip-path` inset (top rows close from the bottom edge
        // so they recede upward, bottom rows from the top edge) WHILE sliding the
        // row toward the solid word. Every row retracts and merges at the same
        // speed, finishing together as the pin releases. Each echo's group
        // wrapper has `overflow: hidden`, so the moment a row crosses the solid
        // word's edge it is clipped — the echoes dissolve INTO the masthead and
        // are never drawn over the solid text. The slide distance is read from
        // transform-free layout offsets so it re-derives on resize, and the solid
        // word never moves. `immediateRender: false` keeps the scrub from
        // clobbering the intro before the user scrolls.
        const merge = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: "+=120%",
            pin: true,
            scrub: 0.6,
            invalidateOnRefresh: true,
          },
        });
        merge.fromTo(
          echoes,
          { clipPath: "inset(0% 0% 0% 0%)", y: 0 },
          {
            // Retract toward the outer edge: top rows close from the bottom up,
            // bottom rows close from the top down.
            clipPath: (_i: number, el: HTMLElement) =>
              el.dataset.dir === "up"
                ? "inset(0% 0% 100% 0%)"
                : "inset(100% 0% 0% 0%)",
            // Slide each row to the solid word's centre as it retracts; the
            // group's overflow clips it well before it gets there.
            y: (_i: number, el: HTMLElement) =>
              solidRow
                ? solidRow.offsetTop +
                  solidRow.offsetHeight / 2 -
                  (el.offsetTop + el.offsetHeight / 2)
                : 0,
            ease: "power1.in",
            duration: 1,
            immediateRender: false,
          },
          0,
        );

        return () => {
          intro.kill();
          merge.scrollTrigger?.kill();
          merge.kill();
          gsap.set("[data-reveal]", { clearProps: "all" });
          gsap.set("[data-solid]", { clearProps: "all" });
          gsap.set(cells, { clearProps: "all" });
        };
      });
    },
    { scope: sectionRef, dependencies: [hasEntered] },
  );

  return (
    <section ref={sectionRef} className={styles.hero}>
      <h1 className={styles.srOnly}>About — Zenith Soumya</h1>

      <div className={styles.top} data-reveal>
        <TransitionLink
          href="/"
          className={styles.backLink}
          aria-label="Back to home"
          payload={{ accent: currentAccent }}
        >
          <span aria-hidden="true">←</span>
        </TransitionLink>
      </div>

      <div className={styles.stage} aria-hidden="true">
        <div className={styles.stack}>
          <div className={styles.echoGroup} data-group="top">
            {TOP_ROWS.map((tone, i) => (
              <div
                key={`t${i}`}
                className={styles.echoCell}
                data-echo-cell
                data-dir="up"
              >
                <div
                  className={`${styles.echoRow} ${styles[tone]}`}
                  data-band="top"
                  data-echo
                  data-dir="up"
                >
                  <span className={styles.echoText}>{WORD}</span>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.solid} data-band="solid">
            <span className={styles.solidText} data-solid>
              <span className={styles.solidInk}>ABOUT</span>{" "}
              <span className={styles.solidAccent}>ME</span>
            </span>
          </div>

          <div className={styles.echoGroup} data-group="bottom">
            {BOTTOM_ROWS.map((tone, i) => (
              <div
                key={`b${i}`}
                className={styles.echoCell}
                data-echo-cell
                data-dir="down"
              >
                <div
                  className={`${styles.echoRow} ${styles[tone]}`}
                  data-band="bottom"
                  data-echo
                  data-dir="down"
                >
                  <span className={styles.echoText}>{WORD}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
