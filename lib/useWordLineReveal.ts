import { useGSAP } from "@gsap/react";
import { type RefObject } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import {
  splitTextIntoWords,
  groupWordsByLine,
  type SplitResult,
} from "@/lib/splitTextIntoWords";
import { useTransition } from "@/components/transitions";
import staggerStyles from "./staggerText.module.css";

// Default word/line reveal tuning (overridable via RevealOptions).
const WORD_REVEAL_YPERCENT = 110;
const LINE_STAGGER = 0.12;
const REVEAL_DURATION = 0.7;
const REVEAL_START = "top 85%";

type RevealOptions = {
  lineStagger?: number;
  duration?: number;
  delay?: number;
  start?: string;
  scope?: RefObject<HTMLElement | null>;
  /** CSS selector for subtrees to leave out of the word split (they get their
      own entrance animation instead). */
  exclude?: string;
};

// Awaits document.fonts.ready before grouping words by offsetTop (the
// fallback-font wrap doesn't match the rendered layout) and re-buckets on
// resize since the trigger fires only once.
export function useWordLineReveal(
  target: RefObject<HTMLElement | null>,
  options: RevealOptions = {}
) {
  const {
    lineStagger = LINE_STAGGER,
    duration = REVEAL_DURATION,
    delay = 0,
    start = REVEAL_START,
    scope,
    exclude,
  } = options;

  const { hasEntered } = useTransition();

  useGSAP(
    () => {
      if (!hasEntered) return;
      const root = target.current;
      if (!root) return;

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        let split: SplitResult | null = null;
        let tl: gsap.core.Timeline | null = null;
        let trigger: ScrollTrigger | null = null;
        let resizeObserver: ResizeObserver | null = null;
        let cancelled = false;

        const buildTimeline = () => {
          if (!split || cancelled) return;
          const wasPlaying = tl ? tl.isActive() : false;
          const wasCompleted = tl ? (tl.progress() === 1 || tl.totalProgress() === 1) : false;
          if (tl) tl.kill();
          const lineGroups = groupWordsByLine(split.words);
          tl = gsap.timeline({ paused: true, delay });
          lineGroups.forEach((group, i) => {
            tl!.to(
              group,
              { yPercent: 0, duration, ease: "power2.out" },
              i * lineStagger
            );
          });
          if (wasCompleted || (trigger && (trigger.progress > 0 || trigger.isActive))) {
            tl.progress(1, false);
          } else if (wasPlaying) {
            tl.play();
          }
        };

        // Wait for the real font to load before measuring offsetTop —
        // fallback-font wrap positions don't match the rendered layout.
        // Renamed from `start` so it doesn't shadow the `start` option
        // destructured above (which would silently ignore caller overrides).
        const setupReveal = () => {
          if (cancelled || !root.isConnected) return;
          split = splitTextIntoWords(
            root,
            staggerStyles.word,
            staggerStyles.wordInner,
            exclude
          );
          if (!split.inners.length) {
            split.revert();
            split = null;
            return;
          }

          gsap.set(split.inners, { yPercent: WORD_REVEAL_YPERCENT });
          buildTimeline();

          // document.fonts.ready can resolve after unmount; bail if the
          // root detached (or the inner cleanup ran) before we wire up
          // the trigger against a now-orphaned node.
          if (cancelled || !root.isConnected) {
            split?.revert();
            split = null;
            return;
          }

          trigger = ScrollTrigger.create({
            trigger: root,
            start,
            once: true,
            onEnter: () => tl?.play(),
            onRefresh: (self) => {
              if (self.isActive || self.progress > 0) {
                tl?.play();
              }
            },
          });

          // If the element is ALREADY in view or past `start` when async font setup completes,
          // `onEnter` won't fire. Play the timeline immediately so words are never stuck hidden.
          if (trigger.progress > 0 || trigger.isActive) {
            tl?.play();
          }

          // The async font load shifted layout after other triggers cached
          // their positions; re-measure start/end against the new layout.
          ScrollTrigger.refresh();

          // Recompute groups on resize. ResizeObserver fires for every
          // layout change of the root — exactly when wrap behaviour can
          // shift. Wrapped in rAF so we read after the new layout settles.
          if (typeof ResizeObserver !== "undefined") {
            let frame = 0;
            resizeObserver = new ResizeObserver(() => {
              cancelAnimationFrame(frame);
              frame = requestAnimationFrame(() => {
                if (split) buildTimeline();
              });
            });
            resizeObserver.observe(root);
          }
        };

        const ready =
          typeof document !== "undefined" && document.fonts?.ready
            ? document.fonts.ready
            : Promise.resolve();
        ready.then(setupReveal);

        return () => {
          cancelled = true;
          if (resizeObserver) resizeObserver.disconnect();
          if (trigger) trigger.kill();
          if (tl) tl.kill();
          if (split) {
            gsap.set(split.inners, { clearProps: "transform" });
            split.revert();
          }
        };
      });

      // mm.revert() invokes the mm.add() inner cleanup above (which sets
      // cancelled = true); useGSAP does not own the matchMedia registry,
      // so tear it down on unmount.
      return () => {
        mm.revert();
      };
    },
    scope
      ? { scope, dependencies: [hasEntered] }
      : { scope: target, dependencies: [hasEntered] }
  );
}

