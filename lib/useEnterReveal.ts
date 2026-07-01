import { useGSAP } from "@gsap/react";
import { type RefObject } from "react";
import { gsap } from "@/lib/gsap";

type RevealSpec = {
  /** Elements to observe and reveal (resolved within the scope). These must not
      be clipped by an ancestor at rest — IntersectionObserver respects overflow
      clipping, so a clipped element never intersects and never fires. */
  selector: string;
  /** Resting-state offset to animate the observed element *from* (e.g.
      { opacity: 0 } for a fade, { opacity: 0, scale: 0.8 } for a pop). */
  from: gsap.TweenVars;
  /** Optional masked child to slide in together with its parent. The child can
      start clipped outside the parent's `overflow: hidden` box (e.g.
      yPercent: 110) because we observe the *parent*, not the child. */
  innerSelector?: string;
  innerFrom?: gsap.TweenVars;
  duration?: number;
  /** Stagger applied across elements that share an entrance (e.g. pills in one
      row, or the two columns of a credential row). Vertically-stacked elements
      enter at their own scroll positions and already cascade naturally. */
  stagger?: number;
  ease?: string;
  /** IntersectionObserver rootMargin. Default fires when an element is ~10% up
      from the viewport bottom (equivalent to the old "top 90%" start). */
  rootMargin?: string;
};

// Natural resting value for every prop we let callers animate *from*. The
// reveal sets the from-state explicitly, then tweens back to these.
const REST: gsap.TweenVars = {
  opacity: 1,
  autoAlpha: 1,
  scale: 1,
  x: 0,
  y: 0,
  xPercent: 0,
  yPercent: 0,
  rotation: 0,
};

function restFor(from: gsap.TweenVars): gsap.TweenVars {
  const to: gsap.TweenVars = {};
  for (const key of Object.keys(from)) {
    if (key in REST) to[key] = REST[key as keyof gsap.TweenVars];
  }
  return to;
}

// Per-element entrance reveal: each matched element starts at `from` and tweens
// to rest as it scrolls into view, so content far down a tall list still
// animates when reached instead of playing off-screen.
//
// Driven by IntersectionObserver, NOT ScrollTrigger. This page pins the Echo
// hero above these lists; on a client-side route change the section remounts
// while the pin-spacer is still settling, so ScrollTrigger read stale start
// positions and left points stuck hidden on return navigation. IntersectionObserver
// observes real viewport geometry: immune to pin math, Lenis, and refresh-timing,
// and it fires immediately for anything already in view (including first load).
//
// Masked slides (the point text) start clipped outside their parent's
// `overflow: hidden`, which would give IntersectionObserver zero area to detect.
// So we observe the un-clipped parent (the point row) and, from that one
// intersection, animate both the parent and its masked child together.
export function useEnterReveal(
  scope: RefObject<HTMLElement | null>,
  specs: RevealSpec[],
) {
  useGSAP(
    () => {
      const root = scope.current;
      if (!root) return;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const observers: IntersectionObserver[] = [];
        const tweens: gsap.core.Tween[] = [];

        specs.forEach(
          ({
            selector,
            from,
            innerSelector,
            innerFrom,
            duration = 0.55,
            stagger = 0.06,
            ease = "power3.out",
            rootMargin = "0px 0px -10% 0px",
          }) => {
            const els = gsap.utils.toArray<HTMLElement>(selector, root);
            if (!els.length) return;

            const to = restFor(from);
            const innerOf = (el: HTMLElement) =>
              innerSelector
                ? el.querySelector<HTMLElement>(innerSelector)
                : null;
            const innerTo = innerFrom ? restFor(innerFrom) : null;

            // Hold the resting (hidden) state immediately so nothing flashes
            // before each element enters.
            gsap.set(els, from);
            if (innerFrom) {
              const inners = els.map(innerOf).filter(Boolean) as HTMLElement[];
              if (inners.length) gsap.set(inners, innerFrom);
            }

            // Group elements by vertical position so a row of pills (or the two
            // columns of a credential row) reveals together with a stagger,
            // while vertically-stacked items each enter at their own position.
            const groupByEl = new Map<Element, HTMLElement[]>();
            const rows = new Map<number, HTMLElement[]>();
            els.forEach((el) => {
              const key = Math.round(el.getBoundingClientRect().top);
              if (!rows.has(key)) rows.set(key, []);
              rows.get(key)!.push(el);
            });
            rows.forEach((group) =>
              group.forEach((el) => groupByEl.set(el, group)),
            );

            const played = new WeakSet<Element>();

            const io = new IntersectionObserver(
              (entries) => {
                entries.forEach((entry) => {
                  if (!entry.isIntersecting) return;
                  const group = groupByEl.get(entry.target) ?? [
                    entry.target as HTMLElement,
                  ];
                  const fresh = group.filter((el) => !played.has(el));
                  if (!fresh.length) return;
                  // Reveal the whole row at once (with stagger); stop observing
                  // every member so it never re-fires.
                  fresh.forEach((el) => {
                    played.add(el);
                    io.unobserve(el);
                  });
                  tweens.push(
                    gsap.to(fresh, { ...to, duration, ease, stagger }),
                  );
                  if (innerTo) {
                    const inners = fresh
                      .map(innerOf)
                      .filter(Boolean) as HTMLElement[];
                    if (inners.length) {
                      tweens.push(
                        gsap.to(inners, { ...innerTo, duration, ease, stagger }),
                      );
                    }
                  }
                });
              },
              { root: null, rootMargin, threshold: 0 },
            );

            els.forEach((el) => io.observe(el));
            observers.push(io);
          },
        );

        return () => {
          observers.forEach((o) => o.disconnect());
          tweens.forEach((t) => t.kill());
        };
      });

      return () => {
        mm.revert();
      };
    },
    { scope },
  );
}
