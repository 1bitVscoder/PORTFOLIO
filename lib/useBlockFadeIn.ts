import { useGSAP } from "@gsap/react";
import { type RefObject } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useTransition } from "@/components/transitions";

// Default block-fade tuning (overridable per-group via BlockFadeGroup).
const FADE_Y = 24;
const FADE_DURATION = 0.9;
const FADE_START = "top 88%";

export interface BlockFadeGroup {
  targets: Array<RefObject<HTMLElement | null>>;
  y?: number;
  duration?: number;
  delay?: number;
  stagger?: number;
  ease?: string;
}

export interface UseBlockFadeInOptions {
  start?: string;
  groups: BlockFadeGroup[];
}

export function useBlockFadeIn(
  scopeRef: RefObject<HTMLElement | null>,
  { start = FADE_START, groups }: UseBlockFadeInOptions
) {
  const { hasEntered } = useTransition();

  useGSAP(
    () => {
      if (!hasEntered) return;
      const section = scopeRef.current;
      if (!section) return;

      const resolved = groups.map((g) => ({
        ...g,
        els: g.targets
          .map((r) => r.current)
          .filter((el): el is HTMLElement => !!el),
      }));
      if (resolved.every((g) => g.els.length === 0)) return;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        resolved.forEach((g) => {
          if (g.els.length) gsap.set(g.els, { autoAlpha: 0, y: g.y ?? FADE_Y });
        });

        // WR-02: the fade-in tweens are created lazily inside onEnter,
        // *after* useGSAP's gsap-context capture window has closed, so
        // context cleanup never reaches them. Track each tween so we
        // can kill it from the cleanup branch if the section unmounts
        // mid-flight.
        const activeTweens: gsap.core.Tween[] = [];
        let played = false;
        const playFadeIn = () => {
          if (played) return;
          played = true;
          resolved.forEach((g) => {
            if (!g.els.length) return;
            const tween = gsap.to(g.els, {
              autoAlpha: 1,
              y: 0,
              duration: g.duration ?? FADE_DURATION,
              ease: g.ease ?? "expo.out",
              delay: g.delay ?? 0,
              stagger: g.stagger ?? 0,
              clearProps: "transform",
            });
            activeTweens.push(tween);
          });
        };

        const trigger = ScrollTrigger.create({
          trigger: section,
          start,
          once: true,
          onEnter: playFadeIn,
          onRefresh: (self) => {
            if (self.isActive || self.progress > 0) {
              playFadeIn();
            }
          },
        });

        if (trigger.isActive || trigger.progress > 0) {
          playFadeIn();
        }

        return () => {
          trigger.kill();
          activeTweens.forEach((t) => t.kill());
          const allEls = resolved.flatMap((g) => g.els);
          if (allEls.length) gsap.set(allEls, { clearProps: "all" });
        };
      });

      // mm.revert() invokes the mm.add() inner cleanup above; useGSAP does
      // not own the matchMedia registry, so tear it down on unmount.
      return () => {
        mm.revert();
      };
    },
    { scope: scopeRef, dependencies: [hasEntered] }
  );
}
