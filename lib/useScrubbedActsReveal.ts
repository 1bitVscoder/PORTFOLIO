import { useGSAP } from "@gsap/react";
import { type RefObject } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { splitTextIntoWords, type SplitResult } from "@/lib/splitTextIntoWords";
import staggerStyles from "./staggerText.module.css";

// Scrubbed three-act reveal tuning.
const REVEAL_YPERCENT = 110; // initial offset of each word's inner span
const ACT_SCRUB = 0.6; // scrub smoothing for both stage timelines
const PIN_END = "+=180%"; // pin scrub range (% of viewport)
const ACT1_START = "top 80%"; // Stage 1 pre-pin trigger start
const ACT1_END = "top 10%"; // Stage 1 pre-pin trigger end
const PIN_START = "top top"; // Stage 2 pin start
const ACT_OFFSET = 0.55; // Act 3 entry on the pin timeline (0 → 1)
const ACT1_STAGGER = 0.6; // total stagger window for Act 1 words
const ACT2_STAGGER = 0.45; // total stagger window for Act 2 words
const ACT3_STAGGER = 0.4; // total stagger window for Act 3 words

interface UseScrubbedActsRevealOptions {
  scope: RefObject<HTMLElement | null>;
  sticky: RefObject<HTMLElement | null>;
  act1: RefObject<HTMLElement | null>;
  act2: RefObject<HTMLElement | null>;
  act3: RefObject<HTMLElement | null>;
}

// Three-stage scroll-driven reveal for the Pull testimonial.
//
//   Stage 1 — pre-pin: Act 1 (avatar + attribution) reveals as the
//     section enters the viewport. By the time the section's top edge
//     hits the viewport's top edge (pin start), Act 1 is fully shown.
//
//   Stage 2 — pinned: the sticky shell pins to the viewport.
//     Act 2 (top-right quote build-up, closes on accented RESPECTS)
//     rises word-by-word across the first ~half of the pin range,
//     then Act 3 (bottom-left resolution) rises across the second
//     half. Pin releases as Act 3 completes — no dead "empty pin" tail.
//
// pinType: "fixed" is required because this project uses Lenis on html
// (the body has overflow-x: hidden which would otherwise hijack the
// sticky scroll-ancestor). Same rationale as the case-study Dashboard.
//
// Triggers are created synchronously (no `document.fonts.ready` wait):
// deferring would push the pin-spacer DOM insertion past the moment
// other case-study ScrollTriggers (Hero, Dashboard) cached their
// start/end positions, causing them to engage at the wrong scroll
// positions. ScrollTrigger.refresh() is called after creation so any
// triggers below Pull re-measure against the new document layout.
export function useScrubbedActsReveal({
  scope,
  sticky,
  act1,
  act2,
  act3,
}: UseScrubbedActsRevealOptions) {
  useGSAP(
    () => {
      const sectionEl = scope.current;
      const stickyEl = sticky.current;
      const act1El = act1.current;
      const act2El = act2.current;
      const act3El = act3.current;
      if (!sectionEl || !stickyEl || !act1El || !act2El || !act3El) return;

      const mm = gsap.matchMedia();

      mm.add(
        "(prefers-reduced-motion: no-preference) and (min-width: 769px)",
        () => {
          const split1: SplitResult = splitTextIntoWords(
            act1El,
            staggerStyles.word,
            staggerStyles.wordInner
          );
          const split2: SplitResult = splitTextIntoWords(
            act2El,
            staggerStyles.word,
            staggerStyles.wordInner
          );
          const split3: SplitResult = splitTextIntoWords(
            act3El,
            staggerStyles.word,
            staggerStyles.wordInner
          );

          const inners1 = split1.inners;
          const inners2 = split2.inners;
          const inners3 = split3.inners;
          const triggers: ScrollTrigger[] = [];

          if (!inners1.length && !inners2.length && !inners3.length) {
            split1.revert();
            split2.revert();
            split3.revert();
            return;
          }

          gsap.set([...inners1, ...inners2, ...inners3], {
            yPercent: REVEAL_YPERCENT,
            opacity: 0,
          });

          // ── Stage 1: Act 1 reveal (pre-pin) ──
          if (inners1.length) {
            const tl1 = gsap.timeline({
              scrollTrigger: {
                trigger: sectionEl,
                start: ACT1_START,
                end: ACT1_END,
                scrub: ACT_SCRUB,
                invalidateOnRefresh: true,
              },
            });
            if (tl1.scrollTrigger) triggers.push(tl1.scrollTrigger);
            tl1.to(inners1, {
              yPercent: 0,
              opacity: 1,
              duration: 1,
              ease: "power2.out",
              stagger: ACT1_STAGGER / Math.max(inners1.length, 1),
            });
          }

          // ── Stage 2: pin + Act 2 → Act 3 reveal ──
          // Timeline runs 0 → 1 across the pin scrub range. Act 2
          // occupies the first half (0 → 0.5), Act 3 the second
          // (0.55 → 1). The small gap lets Act 2's accented "RESPECTS"
          // breathe before Act 3 picks up the resolution.
          if (inners2.length || inners3.length) {
            const tl2 = gsap.timeline({
              scrollTrigger: {
                trigger: sectionEl,
                start: PIN_START,
                end: PIN_END,
                scrub: ACT_SCRUB,
                pin: stickyEl,
                pinType: "fixed",
                anticipatePin: 1,
                invalidateOnRefresh: true,
              },
            });
            if (tl2.scrollTrigger) triggers.push(tl2.scrollTrigger);

            if (inners2.length) {
              tl2.to(
                inners2,
                {
                  yPercent: 0,
                  opacity: 1,
                  duration: 1,
                  ease: "power2.out",
                  stagger: ACT2_STAGGER / Math.max(inners2.length, 1),
                },
                0
              );
            }

            if (inners3.length) {
              tl2.to(
                inners3,
                {
                  yPercent: 0,
                  opacity: 1,
                  duration: 1,
                  ease: "power2.out",
                  stagger: ACT3_STAGGER / Math.max(inners3.length, 1),
                },
                ACT_OFFSET
              );
            }
          }

          // Pin-spacer insertion shifts every section below Pull down
          // by ~180% of the viewport. Refresh forces other case-study
          // ScrollTriggers (Hero, Dashboard, Toggle) to re-measure so
          // they engage at the correct scroll positions. Deferred to
          // the next frame so Hero's own setup (pin + exit timelines,
          // card body-reparenting) has fully settled before refresh
          // re-invalidates them — otherwise the exit timeline can
          // leave the Hero card stuck at top:0 covering Pull.
          const refreshFrame = requestAnimationFrame(() => {
            ScrollTrigger.refresh();
          });

          return () => {
            cancelAnimationFrame(refreshFrame);
            triggers.forEach((t) => t.kill());
            split1.revert();
            split2.revert();
            split3.revert();
            // No ScrollTrigger.refresh() here: triggers.kill() releases pin
            // spacers on its own. A synchronous refresh during route-change
            // unmount forces every other trigger on the page to re-measure
            // mid-teardown — visible as transition stutter on slow devices.
          };
        }
      );

      // mm.revert() invokes the mm.add() inner cleanup above (killing
      // triggers and releasing pin-spacers); useGSAP does not own the
      // matchMedia registry, so tear it down on unmount.
      return () => {
        mm.revert();
      };
    },
    { scope }
  );
}
