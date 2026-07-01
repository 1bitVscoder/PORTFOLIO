'use client';

/* ============================================================
   WORKFLOW · ECLIPTIC renderer — GSAP driver hook
   The solar system seen near edge-on: nested flattened oval orbits with a
   ✦ sun at the centre. Bodies revolve on scroll with front/back depth; the
   active step swings to the front (bottom) meridian and locks. The scene is
   built imperatively into the [data-schematic] SVG, then a single pinned
   ScrollTrigger scrubs a 0..1 progress through `render`. Scroll position is
   preserved when the pin is torn down (dev variant swap / unmount).
   ============================================================ */

import { useGSAP } from '@gsap/react';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import { STAR_PATH } from '@/components/ui/Star';
import type { RefObject } from 'react';
import styles from './Ecliptic.module.css';

const SVGNS = 'http://www.w3.org/2000/svg';
const PIN_VH = 3.8;
const TAU = Math.PI * 2;
const CX = 600;
const CY = 350;
const SUN_SCALE = 2.9; // ✦ scaled from the 24×24 STAR_PATH
const BODY_R = 11;

interface Orbit {
  a: number;
  b: number;
}

function mk<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number>,
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVGNS, tag) as SVGElementTagNameMap[K];
  for (const k in attrs) el.setAttribute(k, String(attrs[k]));
  return el;
}

function ellipsePoint(o: Orbit, phi: number) {
  return { x: CX + o.a * Math.cos(phi), y: CY + o.b * Math.sin(phi) };
}

function ellipsePath(o: Orbit) {
  let d = '';
  const steps = 72;
  for (let s = 0; s <= steps; s++) {
    const p = ellipsePoint(o, (s / steps) * TAU);
    d += `${s === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)} `;
  }
  return d + 'Z';
}

interface DriverOptions {
  /** One CSS color per step; its length is the step count. */
  accents: string[];
  reducedMotion: boolean;
}

export function useEclipticDriver(
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
      const N = accents.length;
      if (!N) return;
      const totalLabel = String(N).padStart(2, '0');

      // flattened nested ovals (edge-on); outermost last
      const orbits: Orbit[] = [];
      for (let i = 0; i < N; i++) {
        const a = 220 + i * 58;
        orbits.push({ a, b: a * 0.5 });
      }

      // active step locks at the front (bottom, nearest the viewer)
      const lockAngle = Math.PI / 2;
      const phi = (i: number, progress: number) => lockAngle + (progress * (N - 1) - i) * (TAU / N);

      svg.replaceChildren();

      // ── orbit paths ──
      orbits.forEach((o) => {
        svg.appendChild(mk('path', { class: styles.ring, d: ellipsePath(o) }));
      });

      // ── meridian pointer at the front (bottom) ──
      const botY = CY + orbits[N - 1].b;
      svg.appendChild(mk('line', { class: styles.meridian, x1: CX, y1: botY + 6, x2: CX, y2: botY + 30 }));
      svg.appendChild(
        mk('path', {
          class: styles.pointer,
          d: `M${CX - 9} ${botY + 34} L${CX + 9} ${botY + 34} L${CX} ${botY + 20} Z`,
        }),
      );

      // ── central ✦ sun ──
      svg.appendChild(mk('circle', { class: styles.sunGlow, cx: CX, cy: CY, r: 56 }));
      svg.appendChild(
        mk('path', {
          class: styles.sun,
          d: STAR_PATH,
          transform: `translate(${CX - 12 * SUN_SCALE} ${CY - 12 * SUN_SCALE}) scale(${SUN_SCALE})`,
        }),
      );

      // ── orbiting bodies (one per step) ──
      const planets: SVGGElement[] = [];
      for (let i = 0; i < N; i++) {
        const g = mk('g', { class: styles.planet });
        g.style.setProperty('--p-accent', accents[i] ?? accents[0]);
        g.appendChild(mk('circle', { class: styles.planetHalo, cx: 0, cy: 0, r: BODY_R * 2 }));
        g.appendChild(mk('circle', { class: styles.planetBody, cx: 0, cy: 0, r: BODY_R }));
        svg.appendChild(g);
        planets.push(g);
      }

      const placeAt = (i: number, ph: number) => {
        const p = ellipsePoint(orbits[i], ph);
        const depth = 0.82 + 0.4 * ((Math.sin(ph) + 1) / 2); // front (lower) = larger
        planets[i].setAttribute('transform', `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)}) scale(${depth.toFixed(3)})`);
      };
      const place = (i: number, progress: number) => placeAt(i, phi(i, progress));

      let activeIndex = -1;
      const setActive = (i: number) => {
        if (i === activeIndex) return;
        activeIndex = i;
        planets.forEach((p, n) => p.classList.toggle(styles.pActive, n === i));
        details.forEach((el, n) => el.classList.toggle(styles.isActive, n === i));
        section.style.setProperty('--wf-live-accent', accents[i] ?? accents[0]);
        if (readout) readout.innerHTML = `<em>${String(i + 1).padStart(2, '0')}</em> / ${totalLabel}`;
      };

      const render = (progress: number) => {
        for (let i = 0; i < N; i++) place(i, progress);
        setActive(Math.max(0, Math.min(N - 1, Math.round(progress * (N - 1)))));
      };

      // ── reduced motion: rest the bodies spread evenly around the orbits,
      //    full detail stack ──
      if (reducedMotion) {
        for (let i = 0; i < N; i++) {
          placeAt(i, lockAngle + i * (TAU / N));
          planets[i].classList.add(styles.pActive);
        }
        details.forEach((el) => el.classList.add(styles.isActive));
        section.style.setProperty('--wf-live-accent', accents[N - 1] ?? accents[0]);
        if (readout) readout.innerHTML = `<em>${totalLabel}</em> / ${totalLabel}`;
        return () => {
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

      return () => {
        const y = window.scrollY;
        trigger.kill();
        window.scrollTo(0, y);
        svg.replaceChildren();
      };
    },
    { scope: sectionRef, dependencies: [reducedMotion] },
  );
}
