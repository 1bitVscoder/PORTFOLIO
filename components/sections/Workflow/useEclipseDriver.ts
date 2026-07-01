'use client';

/* ============================================================
   WORKFLOW · ECLIPSE renderer — GSAP driver hook
   A dark body slides off a light disc; the growing crescent of accent
   light sweeps a masked big name, ending on a corona bloom. The scene is
   built imperatively into the [data-schematic] SVG, then a single pinned
   ScrollTrigger scrubs a 0..1 progress through `render`. Scroll position
   is preserved when the pin is torn down (dev variant swap / unmount).
   ============================================================ */

import { useGSAP } from '@gsap/react';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import type { RefObject } from 'react';
import {
  splitTextIntoWords,
  groupWordsByLine,
  type SplitResult,
  type SplitWord,
} from '@/lib/splitTextIntoWords';
import stagger from '@/lib/staggerText.module.css';
import { getRandomDirection, getDirectionTransform } from '@/lib/portalAnimation';
import styles from './Eclipse.module.css';

const SVGNS = 'http://www.w3.org/2000/svg';
const PIN_VH = 7.5; // scroll runway (viewport-heights) while pinned
const CX = 600;
const CY = 350;
const R = 215; // light disc radius
const RMOON = 232; // dark body radius
const MASK_ID = 'wf-eclipse-mask';

// Step-detail content reveal — the same line-mask word stagger the
// case-study sections use (see useWordLineReveal): each line's words slide up
// from behind a clip line. Driven here by step activation rather than a
// one-shot ScrollTrigger, so it replays every time a step becomes active.
const WORD_YPERCENT = 110;
const LINE_STAGGER = 0.12;
const REVEAL_DURATION = 0.7;

// Step-name entrance — the hero name's portal: each letter is clipped to its
// own box and slides in from a random direction (110% of the box), staggered.
// Replayed each time a step becomes active. Matches HeroText's timing.
const NAME_STAGGER = 0.08;
const NAME_DURATION = 0.5;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function mk<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number>,
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVGNS, tag) as SVGElementTagNameMap[K];
  for (const k in attrs) el.setAttribute(k, String(attrs[k]));
  return el;
}

interface DriverOptions {
  /** One CSS color per step; its length is the step count. */
  accents: string[];
  reducedMotion: boolean;
}

export function useEclipseDriver(
  sectionRef: RefObject<HTMLElement | null>,
  { accents, reducedMotion }: DriverOptions,
) {
  useGSAP(
    () => {
      const section = sectionRef.current;
      const svg = section?.querySelector<SVGSVGElement>('[data-schematic]');
      const viewport = section?.querySelector<HTMLElement>('[data-viewport]');
      if (!section || !svg || !viewport) return;

      const details = gsap.utils.toArray<HTMLElement>('[data-step]', section);
      const readout = section.querySelector<HTMLElement>('[data-readout]');
      const nameHost = section.querySelector<HTMLElement>('[data-stepname]');
      const stepNames = nameHost?.dataset.names?.split('|') ?? [];
      const N = accents.length;
      if (!N) return;
      const totalLabel = String(N).padStart(2, '0');

      svg.replaceChildren();

      // ── mask: the lit disc minus the sliding dark body ──
      const defs = mk('defs', {});
      const mask = mk('mask', { id: MASK_ID, maskUnits: 'userSpaceOnUse' });
      mask.appendChild(mk('circle', { cx: CX, cy: CY, r: R, fill: '#fff' }));
      const maskMoon = mk('circle', { cx: CX, cy: CY, r: RMOON, fill: '#000' });
      mask.appendChild(maskMoon);
      defs.appendChild(mask);
      svg.appendChild(defs);

      // ── lit glow disc (masked to the revealed crescent), rim, corona, moon ──
      svg.appendChild(mk('circle', { class: styles.glow, cx: CX, cy: CY, r: R, mask: `url(#${MASK_ID})` }));
      svg.appendChild(mk('circle', { class: styles.discEdge, cx: CX, cy: CY, r: R }));
      const corona = mk('circle', { class: styles.corona, cx: CX, cy: CY, r: R + 6 });
      svg.appendChild(corona);
      const moon = mk('circle', { class: styles.moon, cx: CX, cy: CY, r: RMOON });
      svg.appendChild(moon);

      // ── names: muted base + accent-lit copy masked to the crescent.
      //    Each name is split into one <text> per letter so it can rise into
      //    view letter-by-letter on activation (hero name entrance). Letters
      //    are measured (per-glyph x) once fonts are ready — see buildNames. ──
      const baseGroup = mk('g', {});
      const litGroup = mk('g', { mask: `url(#${MASK_ID})` });
      svg.appendChild(baseGroup);
      svg.appendChild(litGroup);

      let activeIndex = -1;
      let cancelled = false;
      let namesBuilt = false;
      let clipUid = 0;
      type PortalLetter = { el: SVGTextElement; offX: number; offY: number };
      const nameLetters: Array<{ base: PortalLetter[]; lit: PortalLetter[] }> = [];

      // Build one name as per-letter, per-glyph-clipped <text> matching the hero
      // name's portal: each letter sits in its own clip box and slides in from a
      // random direction (110% of its box) when shown. The base + lit layers
      // share one measured geometry (and direction) so they stay aligned.
      const buildName = (name: string): { base: PortalLetter[]; lit: PortalLetter[] } => {
        const measure = mk('text', {
          class: styles.nameBase, x: CX, y: CY,
          'text-anchor': 'middle', 'dominant-baseline': 'middle',
        });
        measure.textContent = name;
        baseGroup.appendChild(measure);

        const geom: Array<{
          ch: string; cx: number;
          box: { x: number; y: number; w: number; h: number };
          offX: number; offY: number;
        }> = [];
        for (let c = 0; c < name.length; c++) {
          const fallbackSpacing = 46;
          const totalWidth = (name.length - 1) * fallbackSpacing;
          const startX = CX - totalWidth / 2;
          let cx = startX + c * fallbackSpacing;
          let box = { x: cx - 23, y: CY - 60, w: 46, h: 120 };
          try {
            const s = measure.getStartPositionOfChar(c);
            const e = measure.getEndPositionOfChar(c);
            cx = (s.x + e.x) / 2;
            const ext = measure.getExtentOfChar(c);
            box = { x: ext.x, y: ext.y, w: ext.width, h: ext.height };
          } catch {
            /* measurement unavailable (font not ready / detached) */
          }
          const d = getDirectionTransform(getRandomDirection(), 1.1);
          geom.push({ ch: name[c], cx, box, offX: d.x * box.w, offY: d.y * box.h });
        }
        measure.remove();

        const makeLayer = (group: SVGGElement, cls: string): PortalLetter[] =>
          geom.map((g) => {
            const clipId = `${MASK_ID}-c${clipUid++}`;
            const clip = mk('clipPath', { id: clipId, clipPathUnits: 'userSpaceOnUse' });
            clip.appendChild(mk('rect', {
              x: g.box.x - 2, y: g.box.y - 2, width: g.box.w + 4, height: g.box.h + 4,
            }));
            defs.appendChild(clip);
            const wrap = mk('g', { 'clip-path': `url(#${clipId})` });
            const t = mk('text', {
              class: cls, x: g.cx, y: CY,
              'text-anchor': 'middle', 'dominant-baseline': 'middle',
            });
            t.textContent = g.ch;
            wrap.appendChild(t);
            group.appendChild(wrap);
            return { el: t, offX: g.offX, offY: g.offY };
          });

        return {
          base: makeLayer(baseGroup, styles.nameBase),
          lit: makeLayer(litGroup, styles.nameLit),
        };
      };

      // Portal entrance: each letter slides from its random offset to rest,
      // clipped to its own box, staggered left-to-right.
      const showName = (i: number) => {
        const g = nameLetters[i];
        if (!g) return;
        g.base.forEach((bl, c) => {
          const pair = [bl.el, g.lit[c].el];
          gsap.killTweensOf(pair);
          gsap.set(pair, { x: bl.offX, y: bl.offY });
          gsap.to(pair, { x: 0, y: 0, duration: NAME_DURATION, ease: 'power2.out', delay: c * NAME_STAGGER });
        });
      };
      const hideName = (i: number) => {
        const g = nameLetters[i];
        if (!g) return;
        g.base.forEach((bl, c) => {
          const pair = [bl.el, g.lit[c].el];
          gsap.killTweensOf(pair);
          gsap.set(pair, { x: bl.offX, y: bl.offY });
        });
      };
      const buildNames = (staticAll = false) => {
        if (cancelled) return;
        for (let i = 0; i < N; i++) nameLetters[i] = buildName(stepNames[i] ?? '');
        namesBuilt = true;
        if (staticAll) {
          nameLetters.forEach((g) => g.base.forEach((bl, c) => gsap.set([bl.el, g.lit[c].el], { x: 0, y: 0 })));
          return;
        }
        nameLetters.forEach((g) => g.base.forEach((bl, c) => gsap.set([bl.el, g.lit[c].el], { x: bl.offX, y: bl.offY })));
        if (activeIndex >= 0) showName(activeIndex);
      };

      // Per-step content reveals (title + copy), populated once fonts are
      // ready (see buildReveals below). Null until then; setActive no-ops
      // against missing entries and buildReveals plays the active step.
      const reveals: Array<{ play: () => void; reset: () => void } | null> =
        details.map(() => null);
      const setActive = (i: number) => {
        if (i === activeIndex) return;
        if (activeIndex >= 0) {
          reveals[activeIndex]?.reset();
          if (namesBuilt) hideName(activeIndex);
        }
        activeIndex = i;
        details.forEach((el, n) => el.classList.toggle(styles.isActive, n === i));
        section.style.setProperty('--wf-live-accent', accents[i] ?? accents[0]);
        if (readout) readout.innerHTML = `<em>${String(i + 1).padStart(2, '0')}</em> / ${totalLabel}`;
        if (namesBuilt) showName(i);
        reveals[i]?.play();
      };

      const render = (progress: number) => {
        const mx = lerp(582, 224, progress);
        const my = lerp(364, 68, progress);
        maskMoon.setAttribute('cx', String(mx));
        maskMoon.setAttribute('cy', String(my));
        moon.setAttribute('cx', String(mx));
        moon.setAttribute('cy', String(my));
        corona.style.opacity = String(Math.max(0, (progress - 0.82) / 0.18) * 0.9);
        setActive(Math.max(0, Math.min(N - 1, Math.floor(progress * N - 1e-6))));
      };

      // ── reduced motion: full reveal, every name shown, no pin/animation ──
      if (reducedMotion) {
        maskMoon.setAttribute('cx', '-400');
        maskMoon.setAttribute('cy', '-400');
        moon.style.opacity = '0';
        corona.style.opacity = '0.9';
        details.forEach((el) => el.classList.add(styles.isActive));
        section.style.setProperty('--wf-live-accent', accents[N - 1] ?? accents[0]);
        if (readout) readout.innerHTML = `<em>${totalLabel}</em> / ${totalLabel}`;
        const ready = document.fonts?.ready ?? Promise.resolve();
        ready.then(() => buildNames(true));
        return () => {
          cancelled = true;
          svg.replaceChildren();
        };
      }

      const trigger = ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: () => '+=' + window.innerHeight * PIN_VH,
        pin: viewport,
        pinType: 'fixed',
        scrub: 1,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => render(self.progress),
        onRefresh: (self) => render(self.progress),
      });
      render(trigger.progress);

      // Split each step's title + copy into masked words and build a paused
      // line-stagger timeline — the case-study content reveal, replayed per
      // step. Wait for fonts so offsetTop line-grouping matches the real wrap,
      // then reveal whichever step is already active.
      const splits: SplitResult[] = [];
      const buildReveals = () => {
        if (cancelled) return;
        details.forEach((el, idx) => {
          const roots = [
            el.querySelector<HTMLElement>(`.${styles.detailTitle}`),
            el.querySelector<HTMLElement>(`.${styles.detailCopy}`),
          ].filter(Boolean) as HTMLElement[];
          const words: SplitWord[] = [];
          roots.forEach((root) => {
            const split = splitTextIntoWords(root, stagger.word, stagger.wordInner);
            splits.push(split);
            words.push(...split.words);
          });
          if (!words.length) return;
          gsap.set(words.map((w) => w.inner), { yPercent: WORD_YPERCENT });
          const tl = gsap.timeline({ paused: true });
          groupWordsByLine(words).forEach((line, li) => {
            tl.to(line, { yPercent: 0, duration: REVEAL_DURATION, ease: 'power2.out' }, li * LINE_STAGGER);
          });
          reveals[idx] = { play: () => tl.restart(), reset: () => tl.pause(0) };
        });
        if (activeIndex >= 0) reveals[activeIndex]?.play();
      };
      const fontsReady = document.fonts?.ready ?? Promise.resolve();
      fontsReady.then(() => {
        buildNames();
        buildReveals();
      });

      return () => {
        cancelled = true;
        const y = window.scrollY;
        trigger.kill();
        window.scrollTo(0, y);
        splits.forEach((s) => s.revert());
        svg.replaceChildren();
      };
    },
    { scope: sectionRef, dependencies: [reducedMotion] },
  );
}
