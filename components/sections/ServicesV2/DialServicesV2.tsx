'use client';

import { useRef, type CSSProperties } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import { content } from '@/data';
import { MetaLabel } from '@/components/ui/MetaLabel';
import { Star } from '@/components/ui/Star';
import {
  BAR_MAX_FRACTION,
  BAR_MIN_SCALE,
  BAR_OPACITY_MIN,
  BAR_OPACITY_RANGE,
  DIAL_WEIGHT_MAX,
  DIAL_WEIGHT_MIN,
  GAP_PX,
  HEADING_ID,
  LABEL_RIDE_GAP_PX,
  LABEL_SCALE_MAX,
  LABEL_SCALE_MIN,
  NEEDLE_FALLOFF,
  PIN_RUNWAY_REF_PX,
  PIN_RUNWAY_TALL_REF_PX,
  PIN_RUNWAY_VH,
  PIN_SCRUB,
  TOOL_OPACITY_MIN,
  TOOL_OPACITY_RANGE,
  ZONES,
  formatZoneIndex,
  zoneRail,
} from './constants';
import {
  buildCells,
  countRealCells,
  indexAtNeedle,
  isZoneBoundary,
  tunedAt,
} from './dialBuild';
import {
  computeSwapTiming,
  ledeRevealIn,
  ledeRevealOut,
  portalBigWordIn,
  portalBigWordOut,
  splitBigWord,
  splitLede,
} from './dialMotion';
import styles from './ServicesV2.module.css';

/* Inline-style width for the zone indicator. Computed from ZONES.length so
   the indicator always spans exactly one zone cell, regardless of how many
   zones the content file declares. translateX(zoneIdx * 100%) then slides
   it cell-by-cell across the row. */
const ZONE_INDICATOR_WIDTH = `${100 / Math.max(1, ZONES.length)}%`;

/* Pinned, scrub-driven tuning-dial implementation of the Services section.
   Scroll progress (0..1) → strip translateX + needle highlight + zone change.

   Architectural deltas vs. Services V1 (DrumServices):
     - No wheel/touch hijack. Native scroll drives a ScrollTrigger.scrub,
       and the dial pans continuously rather than snapping per gesture.
     - No `boundary release` machinery — the scrub naturally hands off to
       the next pinned section once it reaches `progress = 1`.
     - The bigword + lede swap only fires on zone boundary crossings, not
       per scroll tick. We compare `bigword.dataset.zone` against the
       newly-tuned cell's zone before triggering the portal/mask animation. */
export function DialServicesV2() {
  const wrapperRef = useRef<HTMLElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const dialwrapRef = useRef<HTMLDivElement>(null);
  const dialStripRef = useRef<HTMLDivElement>(null);
  const notchesRef = useRef<HTMLDivElement>(null);
  const bigwordRef = useRef<HTMLHeadingElement>(null);
  const ledeRef = useRef<HTMLParagraphElement>(null);
  const zoneIndicatorRef = useRef<HTMLDivElement>(null);
  const zoneRefs = useRef<Array<HTMLDivElement | null>>(Array(ZONES.length).fill(null));
  const liveRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const shellEl = shellRef.current;
      const pinEl = pinRef.current;
      const dialwrapEl = dialwrapRef.current;
      const dialStripEl = dialStripRef.current;
      const notchesEl = notchesRef.current;
      const bigwordEl = bigwordRef.current;
      const ledeEl = ledeRef.current;
      const indicatorEl = zoneIndicatorRef.current;
      if (
        !shellEl ||
        !pinEl ||
        !dialwrapEl ||
        !dialStripEl ||
        !notchesEl ||
        !bigwordEl ||
        !ledeEl ||
        !indicatorEl
      ) {
        return;
      }

      const splitCls = {
        letterMask: styles.letterMask,
        letterInner: styles.letterInner,
        accent: styles.accent,
      };
      const ledeCls = {
        ledeWord: styles.ledeWord,
        ledeWordInner: styles.ledeWordInner,
        ledeBold: styles.ledeBold,
      };

      const cells = buildCells(ZONES);
      /* Snapshot once — `realCount` is data-derived and immutable for the
         lifetime of the section, so re-scanning per scroll tick is waste. */
      const realCount = countRealCells(cells);

      /* Build the dial strip and notches imperatively. Mutating the DOM
         once on mount (rather than rendering ~30+ React children that
         each need a stable ref for color/transform updates per scroll
         frame) keeps the per-frame work to direct style writes. */
      const toolEls: Array<HTMLSpanElement | null> = [];
      /* Parallel to `toolEls`/`cells` — one meter bar per non-pad cell, null
         for pads so the index stays aligned for the per-frame loop. */
      const barEls: Array<HTMLSpanElement | null> = [];
      cells.forEach((cell, i) => {
        const cellEl = document.createElement('div');
        cellEl.className = styles.dialCell;
        if (!cell.isPad) {
          const tool = document.createElement('span');
          tool.className = styles.dialTool;
          tool.textContent = cell.name;
          cellEl.appendChild(tool);
          toolEls.push(tool);

          const bar = document.createElement('span');
          bar.className = styles.dialBar;
          cellEl.appendChild(bar);
          barEls.push(bar);
        } else {
          toolEls.push(null);
          barEls.push(null);
        }
        dialStripEl.appendChild(cellEl);

        const notchEl = document.createElement('div');
        notchEl.className = styles.notch;
        if (isZoneBoundary(cells, i)) {
          notchEl.classList.add(styles.notchMajor);
        }
        notchesEl.appendChild(notchEl);
      });

      /* Per-cell last-written-value caches for the applyDial hot path. Each
         scroll tick the style strings only change visibly when their rounded
         value moves; we cache the rounded ints and skip the style write (and
         its string allocation) when nothing changed since the last frame.
         Quantised to integers via the *_Q scales below — sub-quantum changes
         are visually indistinguishable, so skipping them can't alter the
         rendered output. NaN initial values force a write on the first frame. */
      const lastBarScaleQ = new Array<number>(cells.length).fill(NaN);
      const lastBarOpacityQ = new Array<number>(cells.length).fill(NaN);
      const lastToolOpacityQ = new Array<number>(cells.length).fill(NaN);
      const lastToolTranslateQ = new Array<number>(cells.length).fill(NaN);
      const lastToolScaleQ = new Array<number>(cells.length).fill(NaN);
      /* Last-written wght axis per label. Integer weight, so no *_Q scale —
         we cache the rounded wght and skip the variation-settings write (and
         its string alloc) when it hasn't moved since last frame. */
      const lastToolWeight = new Array<number>(cells.length).fill(NaN);
      /* Quantisation scales. Opacity/scale to 1/1000 (3 decimals), the label
         translate to whole-px — finer than a pixel/0.001 is below perceptible
         and below sub-pixel raster precision, so rounding here is safe. */
      const OPACITY_Q = 1000;
      const SCALE_Q = 1000;

      /* Cache the dialwrap centre offset so the per-frame hot path can avoid
         getBoundingClientRect (which forces synchronous layout). Recomputed
         only when the wrap actually resizes — observed via ResizeObserver,
         not polled. */
      let centerOffset = dialwrapEl.getBoundingClientRect().width / 2;
      /* Cache the band height alongside centerOffset so the per-frame meter
         loop can scale bars + position riding labels without a layout read.
         Updated only on resize/refresh — never inside applyDial. */
      let bandHeight = dialwrapEl.getBoundingClientRect().height;
      const wrapObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;
        centerOffset = entry.contentRect.width / 2;
        bandHeight = entry.contentRect.height;
      });
      wrapObserver.observe(dialwrapEl);

      /* Single source of truth for the bar's resting height: the CSS rule
         `.dialBar { height: calc(var(--bar-max-fraction) * 100%) }` reads this,
         and the per-frame label-ride math below multiplies by the same
         BAR_MAX_FRACTION. Set once here (custom props inherit to the bars) so
         the two can't drift. */
      dialStripEl.style.setProperty('--bar-max-fraction', String(BAR_MAX_FRACTION));

      /* All in-flight gsap.delayedCall and tween handles created inside
         transitionZone. Tracking them lets the unmount cleanup kill any
         work that's queued past the natural end of the section's lifetime —
         without this, a route change mid-swap would mutate detached DOM
         and leak the closure that owns these refs. */
      const pendingDelays = new Set<gsap.core.Tween>();
      const trackDelay = (delay: gsap.core.Tween): gsap.core.Tween => {
        pendingDelays.add(delay);
        return delay;
      };

      /* Coalesce overlapping zone transitions. If a new zone boundary is
         crossed mid-OUT, latch the target and process when the current IN
         finishes — same shape as DrumServices' `swapping/pendingTarget`. */
      let zoneAnimating = false;
      let pendingZoneIdx: number | null = null;
      /* The zone whose IN is currently running (or whose OUT is running on the
         way to it) — i.e. the zone that WILL be displayed once the in-flight
         transition settles. null when idle. `bigwordEl.dataset.zone` is the
         zone CURRENTLY painted (written inside swapDelay the instant the new
         content lands in the DOM); it lags `inFlightZoneIdx` during the OUT
         phase because the swap hasn't fired yet.

         The applyDial gate compares the needle against the EFFECTIVE target
         `pendingZoneIdx ?? inFlightZoneIdx ?? displayed` so it never re-fires
         a transition that's already heading to the right zone, and always
         re-fires when the needle lands somewhere the dial isn't already going.
         The endDelay reconciliation closes the loop by re-checking the latched
         pending target against the now-displayed dataset.zone.

         Why this kills the A→B→A desync: needle A→B starts a B transition
         (inFlight=B, dataset still A). Needle snaps back to A mid-OUT; the gate
         sees effective=B≠A and latches pendingZoneIdx=A. B's swap paints
         dataset.zone=B; B's IN finishes and endDelay sees pending=A≠displayed=B
         and dispatches A. The dial converges on A instead of stranding B on
         screen while the needle/indicator/aria-live all read A. */
      let inFlightZoneIdx: number | null = null;

      /* aria-live debounce. Each scroll tick that crosses a zone boundary
         calls paintZoneAffordances which would otherwise mutate the live
         region; AT engines queue every change, so a fast scroll past three
         zones can produce three queued announcements. Coalesce to the
         latest target after a short quiet period so the announcement
         matches what the user actually parks on. */
      let liveTimeoutId: number | null = null;
      const ANNOUNCE_DEBOUNCE_MS = 350;
      const announceZone = (zoneIdx: number) => {
        if (liveTimeoutId !== null) window.clearTimeout(liveTimeoutId);
        liveTimeoutId = window.setTimeout(() => {
          liveTimeoutId = null;
          if (!liveRef.current) return;
          const zone = ZONES[zoneIdx];
          liveRef.current.textContent = `Showing zone ${zoneIdx + 1} of ${ZONES.length}: ${zoneRail(zone)}.`;
        }, ANNOUNCE_DEBOUNCE_MS);
      };

      const paintZoneAffordances = (zoneIdx: number) => {
        const refs = zoneRefs.current;
        for (let j = 0; j < refs.length; j++) {
          const el = refs[j];
          if (!el) continue;
          el.classList.toggle(styles.zoneActive, j === zoneIdx);
        }
        indicatorEl.style.transform = `translateX(${zoneIdx * 100}%)`;
        announceZone(zoneIdx);
      };

      const transitionZone = (zoneIdx: number) => {
        /* Paint affordances FIRST — before the animating gate. Even when a
           transition is coalesced (animation is in flight, we just latch
           the new target), we still want the indicator to slide, the active
           zone class to flip, and the live region to announce the zone the
           user is now parked on. Otherwise fast scrolls past intermediate
           zones produce a silent jump from N to N+2 in the AT timeline. */
        paintZoneAffordances(zoneIdx);

        if (zoneAnimating) {
          pendingZoneIdx = zoneIdx;
          return;
        }
        zoneAnimating = true;
        inFlightZoneIdx = zoneIdx;
        const zone = ZONES[zoneIdx];

        const bwOutEnd = portalBigWordOut(
          [...bigwordEl.querySelectorAll<HTMLSpanElement>(`.${styles.letterInner}`)],
        );
        const ledeOutEnd = ledeRevealOut(ledeEl, styles.ledeWordInner);
        const { swapAt } = computeSwapTiming(bwOutEnd, ledeOutEnd);

        const swapDelay = trackDelay(
          gsap.delayedCall(swapAt, () => {
            pendingDelays.delete(swapDelay);

            /* Snapshot the nodes that are about to be detached and kill any
               OUT/IN tweens still pointing at them. The earlier OUT tweens
               were scheduled in transitionZone above; if their finish ticks
               land after `swapAt` (because GSAP's tick is decoupled from
               our delayedCall), they'd keep writing yPercent/x/y to nodes
               we're about to drop on the floor — wasted work, and a leak
               of tween handles past their visual lifetime. */
            const prevLetters = [
              ...bigwordEl.querySelectorAll<HTMLSpanElement>(`.${styles.letterInner}`),
            ];
            const prevLedeInners = [
              ...ledeEl.querySelectorAll<HTMLSpanElement>(`.${styles.ledeWordInner}`),
            ];
            if (prevLetters.length || prevLedeInners.length) {
              gsap.killTweensOf([...prevLetters, ...prevLedeInners]);
            }

            const newLetters = splitBigWord(zone.word, bigwordEl, splitCls);
            /* Mark dataset.zone as the *displayed* zone right when the new
               content is in the DOM, not at applyDial-call-time. Honest
               state for AT/devtools/tests reading this attribute. */
            bigwordEl.dataset.zone = String(zoneIdx);
            const bwInEnd = portalBigWordIn(newLetters);

            splitLede(zone.copy, ledeEl, ledeCls);
            const ledeInEnd = ledeRevealIn(ledeEl, styles.ledeWordInner);

            const endDelay = trackDelay(
              gsap.delayedCall(Math.max(bwInEnd, ledeInEnd), () => {
                pendingDelays.delete(endDelay);
                zoneAnimating = false;
                inFlightZoneIdx = null;
                /* Reconcile against the ACTUALLY-DISPLAYED zone (dataset.zone,
                   set in swapDelay above), not the just-finished `zoneIdx` and
                   not an optimistic marker. If a newer target was latched
                   mid-IN, use it; otherwise fall back to the displayed zone
                   (self-compare → no-op). The compare is `next !== displayed`,
                   so a pending target is dispatched whenever it differs from
                   what's on screen — and is correctly dropped only when it
                   already matches the display. This is what self-corrects the
                   A→B→A case: displayed=B, pending=A ⇒ dispatch A. */
                const displayed = Number(bigwordEl.dataset.zone);
                const next = pendingZoneIdx ?? displayed;
                pendingZoneIdx = null;
                if (next !== displayed) transitionZone(next);
              }),
            );
          }),
        );
      };

      /* Single scroll-driven function. Per-frame work:
           - 1 transform write (strip + notches share the same x via gsap.set)
           - up to N opacity + N transform writes (N ≈ realCount, composited)
         Not allocation-free: each style write builds a string (the DOM API
         only takes strings). We DO minimise it — per cell we cache the last
         rounded value and skip the write (and its `String(...)`/template
         allocation) entirely when the rounded value is unchanged from the
         previous frame. At rest almost every cell short-circuits; during a
         scrub only the cells near the moving needle actually re-write.
         0 layout reads — `centerOffset`/`bandHeight` are cached via the
         ResizeObserver. The bigword/lede portal swap is gated on
         `dataset.zone` (the displayed zone) so it only fires when the nearest
         cell crosses into a zone different from what's on screen. */
      const applyDial = (progress: number) => {
        const idxFloat = indexAtNeedle(progress, realCount);
        const x = centerOffset - (idxFloat + 0.5) * GAP_PX;
        gsap.set([dialStripEl, notchesEl], { x });

        for (let i = 0; i < cells.length; i++) {
          const el = toolEls[i];
          if (!el) continue;
          const dist = Math.abs(i - idxFloat);
          const t = Math.max(0, 1 - dist / NEEDLE_FALLOFF);
          /* smoothstep — crisper peak than linear `t` so the bar locks onto
             the needle like a tuner rather than fading off in a wide hump. */
          const eased = t * t * (3 - 2 * t);
          const s = BAR_MIN_SCALE + (1 - BAR_MIN_SCALE) * eased;

          /* Bar: GPU-composited scaleY + opacity, no layout read. Skip the
             write when the rounded value matches last frame. */
          const bar = barEls[i];
          if (bar) {
            const barScaleQ = Math.round(s * SCALE_Q);
            if (barScaleQ !== lastBarScaleQ[i]) {
              lastBarScaleQ[i] = barScaleQ;
              bar.style.transform = `scaleY(${barScaleQ / SCALE_Q})`;
            }
            const barOpacityQ = Math.round((BAR_OPACITY_MIN + eased * BAR_OPACITY_RANGE) * OPACITY_Q);
            if (barOpacityQ !== lastBarOpacityQ[i]) {
              lastBarOpacityQ[i] = barOpacityQ;
              bar.style.opacity = String(barOpacityQ / OPACITY_Q);
            }
          }

          /* Opacity-only, not color: the dial-tool base color is set via
             CSS var (light + dark themes resolve independently). Writing
             `rgba(27,32,40,...)` here would lock the tool to the light
             palette and disappear under dark mode. */
          const toolOpacityQ = Math.round((TOOL_OPACITY_MIN + t * TOOL_OPACITY_RANGE) * OPACITY_Q);
          if (toolOpacityQ !== lastToolOpacityQ[i]) {
            lastToolOpacityQ[i] = toolOpacityQ;
            el.style.opacity = String(toolOpacityQ / OPACITY_Q);
          }
          /* Label rides the bar's scaled visual top: bandHeight (cached) ×
             the resting fraction × the live scale, plus a fixed gap, so the
             label tracks the crest as the bar grows toward the needle. The
             translate is quantised to whole px and the scale to 1/1000; we
             only rebuild the transform string when either component moves. */
          const barTopPx = bandHeight * BAR_MAX_FRACTION * s;
          const toolTranslateQ = Math.round(-(barTopPx + LABEL_RIDE_GAP_PX));
          const toolScaleQ = Math.round(
            (LABEL_SCALE_MIN + eased * (LABEL_SCALE_MAX - LABEL_SCALE_MIN)) * SCALE_Q,
          );
          if (toolTranslateQ !== lastToolTranslateQ[i] || toolScaleQ !== lastToolScaleQ[i]) {
            lastToolTranslateQ[i] = toolTranslateQ;
            lastToolScaleQ[i] = toolScaleQ;
            el.style.transform = `translateY(${toolTranslateQ}px) scale(${toolScaleQ / SCALE_Q})`;
          }
          /* Weight morph (Switzer Variable wght axis): track the bar's growth
             toward the needle. Uses the same smoothstepped `eased` that drives
             the bar scaleY, so the label thickens in lockstep with bar height —
             DIAL_WEIGHT_MIN at rest, DIAL_WEIGHT_MAX on the needle. Unlike the
             GPU-composited transform/opacity above, this reshapes glyphs (a
             paint), so the cache matters: only the 2-3 cells near the moving
             needle re-write per frame, the rest short-circuit. */
          const toolWeight = Math.round(
            DIAL_WEIGHT_MIN + eased * (DIAL_WEIGHT_MAX - DIAL_WEIGHT_MIN),
          );
          if (toolWeight !== lastToolWeight[i]) {
            lastToolWeight[i] = toolWeight;
            el.style.fontVariationSettings = `'wght' ${toolWeight}`;
          }
        }

        const nearest = tunedAt(idxFloat, cells);
        if (!nearest) return;
        /* Gate on the EFFECTIVE target zone, not an optimistic marker:
             pendingZoneIdx — a target already latched behind an in-flight swap
             inFlightZoneIdx — the zone the current swap is heading toward
             dataset.zone   — the zone actually painted (idle case)
           Firing whenever the needle differs from this composite means we
           never re-dispatch a transition that's already converging on the
           needle, and we always latch a new target when the needle moves
           somewhere the dial isn't already going. transitionZone routes the
           call to pendingZoneIdx when a swap is mid-flight; the endDelay
           reconciliation then closes the loop against dataset.zone. Together
           this self-corrects the A→B→A fast scroll (see the inFlightZoneIdx
           comment above) instead of stranding the displayed word out of sync
           with the needle/indicator/aria-live. */
        const effectiveZone =
          pendingZoneIdx ?? inFlightZoneIdx ?? Number(bigwordEl.dataset.zone);
        if (nearest.zoneIdx !== effectiveZone) {
          transitionZone(nearest.zoneIdx);
        }
      };

      /* Initial paint — pre-split bigword + lede so the first frame already
         shows masked content (avoids an unsplit-text flash). */
      const firstZone = ZONES[0];
      bigwordEl.dataset.zone = '0';
      splitBigWord(firstZone.word, bigwordEl, splitCls);
      splitLede(firstZone.copy, ledeEl, ledeCls);
      paintZoneAffordances(0);
      applyDial(0);

      const trigger = ScrollTrigger.create({
        trigger: shellEl,
        start: 'top top',
        /* Runway length is viewport-relative. Tall screens (innerHeight >
           PIN_RUNWAY_REF_PX, ~900px laptop) use the reduced PIN_RUNWAY_TALL_REF_PX
           reference for a shorter ~6,000px sweep (snappier feel on large displays);
           shorter screens keep scaling with their actual height. Without this, tall
           screens demand disproportionately more
           scroll to sweep the dial (felt worse under the longer global Lenis glide).
           Do NOT switch this to a content-relative value (e.g. a fixed px or an
           element's height) without keeping the ScrollTrigger.refresh() below — the
           imperative cell build and the sibling layout swap both depend on a
           post-create remeasure. */
        end: () => {
          const refPx =
            window.innerHeight > PIN_RUNWAY_REF_PX
              ? PIN_RUNWAY_TALL_REF_PX
              : window.innerHeight;
          return `+=${refPx * PIN_RUNWAY_VH}`;
        },
        pin: pinEl,
        pinSpacing: true,
        /* Match V1's pinType so two adjacent pinned ScrollTriggers under
           Lenis use the same positioning strategy — avoids inconsistent
           pin-spacer measurement on refresh. */
        pinType: 'fixed',
        scrub: PIN_SCRUB,
        /* Lenis-aware engagement (mirrors Archive.tsx). anticipatePin defaults
           to 1, which engages the pin early based on scroll velocity. Lenis's
           velocity is smoothed (LenisProvider drives Lenis off gsap.ticker,
           no normalizeScroll) so the prediction overshoots at the
           Philosophy → ServicesV2 seam, snapping the pin in a few frames
           before the scroll actually arrives. 0 = lock exactly at top top. */
        anticipatePin: 0,
        /* Required for a scrubbed pin under Lenis to fully reconcile its
           bounds on a live window.resize (DevTools open/close, mobile URL
           bar). Without this flag, the scrubbed dial's progress mapping
           keeps stale scroll-pixel coordinates after resize, so the pin's
           release point drifts and downstream sections (Projects) scroll
           into the same viewport area, painting over the pinned .pin.
           Matches Archive.tsx:257. */
        invalidateOnRefresh: true,
        onUpdate: (self) => applyDial(self.progress),
        /* Preserve user scroll position across refresh. Forcing progress
           back to 0 here would yank the dial to zone 0 on every resize,
           font-load, or downstream ScrollTrigger.refresh() — then the
           next onUpdate would race back to the real progress, producing
           a visible double-swap flicker.

           Refresh-time also synchronously re-reads centerOffset: the
           ResizeObserver fires async (microtask after layout) so on a
           refresh triggered by font-load or viewport resize, applyDial
           would otherwise use a stale offset for the strip transform —
           visible as a brief horizontal jump until the next observer
           callback. */
        onRefresh: (self) => {
          centerOffset = dialwrapEl.getBoundingClientRect().width / 2;
          bandHeight = dialwrapEl.getBoundingClientRect().height;
          applyDial(self.progress);
        },
      });

      /* One global refresh after the trigger exists and the first paint /
         applyDial(0) have run. This satisfies two findings at once:
           - The ~30+ cells + split bigword/lede were injected imperatively
             BEFORE create(), so the pin start/end were measured against the
             pre-build layout; refresh remeasures with the real strip in place.
           - When a reduced-motion / coarse-pointer change swaps
             StaticServicesV2 ⇄ DialServicesV2, this dial's new pin-spacer is
             inserted into the document flow. A global refresh reconciles the
             sibling triggers (Hero/Philosophy/Projects) whose start/end would
             otherwise hold stale measurements taken before the spacer existed.
         Global (not trigger.refresh()) on purpose — only the global form
         remeasures the other sections. */
      ScrollTrigger.refresh();

      return () => {
        /* Order matters: kill tweens FIRST so any delayedCall about to fire
           doesn't race the DOM teardown below. ScrollTrigger.kill removes
           the trigger + pin-spacer; clearing the imperative children
           guards against React Strict Mode (dev) which runs the effect
           twice — without this, the second run would append a duplicate
           set of cells/notches on top of the first.

           Snapshot the delays via spread before iterating: `delay.kill()`
           does not itself call back into pendingDelays.delete (the swapDelay
           callback that does the delete is what gets cancelled), so direct
           iteration is technically safe today — but the snapshot makes the
           intent unambiguous and survives future refactors where the kill
           handler might add a delete side effect. */
        [...pendingDelays].forEach((d) => d.kill());
        pendingDelays.clear();
        if (liveTimeoutId !== null) {
          window.clearTimeout(liveTimeoutId);
          liveTimeoutId = null;
        }
        gsap.killTweensOf([
          ...bigwordEl.querySelectorAll<HTMLSpanElement>(`.${styles.letterInner}`),
          ...ledeEl.querySelectorAll<HTMLSpanElement>(`.${styles.ledeWordInner}`),
          dialStripEl,
          notchesEl,
        ]);
        wrapObserver.disconnect();
        /* Preserve scroll position across trigger.kill. ScrollTrigger.kill
           removes the pin-spacer; if the page is scrolled past the spacer's
           contribution, the document shortens by ~100vh and the browser
           clamps window.scrollY to the new max, visually jumping the page
           up. Capture-then-restore so a route change / strict-mode re-mount
           feels seamless. */
        const savedScrollY = window.scrollY;
        trigger.kill();
        if (window.scrollY !== savedScrollY) {
          window.scrollTo(0, savedScrollY);
        }
        dialStripEl.replaceChildren();
        notchesEl.replaceChildren();
      };
    },
    { scope: wrapperRef },
  );

  return (
    <section
      ref={wrapperRef}
      id="services"
      className={styles.wrapper}
      aria-labelledby={HEADING_ID}
    >
      <h2 id={HEADING_ID} className={styles.srOnly}>
        {content.services.headline.lead} {content.services.headline.accent}
      </h2>

      <div ref={shellRef} className={styles.shell}>
        <div ref={pinRef} className={styles.pin}>
          <div className={styles.top}>
            <MetaLabel>{content.services.label}</MetaLabel>
            <div className={styles.topRow}>
              {/* bigword + lede content is rendered imperatively on mount
                  (see splitBigWord / splitLede). The empty initial children
                  here just reserve the DOM nodes for the refs. */}
              <h3 ref={bigwordRef} className={styles.word} />
              <p ref={ledeRef} className={styles.lede} />
            </div>
          </div>

          <div ref={dialwrapRef} className={styles.dialwrap}>
            <span className={styles.dialRuleTop} aria-hidden="true" />
            <span className={styles.dialRuleBot} aria-hidden="true" />
            <div ref={dialStripRef} className={styles.dialStrip} />
            <div ref={notchesRef} className={styles.notches} aria-hidden="true" />
            <div className={styles.needle} aria-hidden="true">
              <Star className={`${styles.needleStar} ${styles.needleStarTop}`} />
              <Star className={`${styles.needleStar} ${styles.needleStarBot}`} />
            </div>
          </div>

          <div
            className={styles.zones}
            style={{ '--zone-count': ZONES.length } as CSSProperties}
          >
            <div
              ref={zoneIndicatorRef}
              className={styles.zoneIndicator}
              style={{ width: ZONE_INDICATOR_WIDTH }}
            />
            {ZONES.map((zone, i) => (
              <div
                key={zone.word}
                ref={(el) => {
                  /* React 19 invokes the callback ref with `null` on unmount,
                     and the array was pre-sized to ZONES.length on mount —
                     so writes at index `i` are always in-bounds for the
                     lifetime of this component. The pre-sizing matters: it
                     guarantees `paintZoneAffordances` iterates exactly the
                     declared zone count even if a ref fires out of map order
                     under concurrent rendering. */
                  const refs = zoneRefs.current;
                  if (i < refs.length) refs[i] = el;
                }}
                className={styles.zone}
              >
                <span className={styles.zoneNum}>{formatZoneIndex(i)}</span>
                {zoneRail(zone)}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        ref={liveRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={styles.srOnly}
      />
    </section>
  );
}
