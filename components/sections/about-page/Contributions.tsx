"use client";

/* ABOUT PAGE · Contributions — GitHub heatmap with a snake that eats it.
   The last-year contribution grid (built at build time into
   data/github-contributions.json) rendered as an SVG heatmap of green cells,
   with a snake — in the page's live accent — that roams the grid and consumes
   every lit cell. It starts at a RANDOM contribution and always heads for the
   nearest remaining one (a greedy nearest-neighbour tour), so the eating order
   feels organic rather than a left-to-right sweep. Movement is continuous: the
   head glides along the route and the body trails it smoothly (the route IS the
   body's spine, sampled at a constant lag per segment). Each bite is a quick
   accent flash, then the cell drains to empty. Auto-plays once when scrolled
   into view, then loops forever: the grid regrows and a fresh random sweep
   begins. The loop is gated to when the section is on-screen (no off-screen
   CPU). Under reduced motion the grid is shown static and the snake omitted. */

import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { useTransition } from "@/components/transitions";
import { githubContributions, navigation } from "@/data";
import { SectionLabel } from "@/components/sections/case-study/SectionLabel";
import { playSweep } from "@/lib/audio";
import styles from "./Contributions.module.css";

// Cell geometry in SVG user units (the viewBox scales to fit the container).
const CELL = 13;
const GAP = 3;
const STEP = CELL + GAP;
const ROWS = 7;

// Snake tuning.
const TAIL = 8; // head + 7 trailing segments
const SEG_GAP = 1; // route-index spacing between body segments
// Constant pace: the snake always crosses one cell in this many seconds (1/8 s
// → 8 cells per second), so the total run scales with the route and is NOT
// capped to a fixed duration — it takes as long as it takes to eat everything.
const SECS_PER_CELL = 0.125;
const headOpacity = (k: number) => Math.max(0.18, 1 - k * 0.1);

// Loop rhythm: the grid sits empty this long after a sweep, then regrows and a
// fresh sweep begins; LEAD_IN holds the regrown grid before the snake re-enters.
const CYCLE_PAUSE = 1.1;
const LEAD_IN = 0.7;

const githubUrl =
  navigation.socialLinks.find((l) => l.id === "github")?.href ??
  `https://github.com/${githubContributions.username}`;

const LEVELS = [0, 1, 2, 3, 4] as const;

type Pt = { col: number; row: number };

export function AboutPageContributions() {
  const [tooltip, setTooltip] = useState<{
    count: number;
    date: string;
    x: number;
    y: number;
  } | null>(null);
  const reduced = useReducedMotion();
  const { total, weeks } = githubContributions;

  // Fixed locale so the thousands separator is identical on server and client
  // (the runtime default locale differs between Node and the browser → hydration
  // mismatch otherwise).
  const totalLabel = total.toLocaleString("en-US");

  const sectionRef = useRef<HTMLElement>(null);
  const { hasEntered } = useTransition();

  const cols = weeks.length;
  const width = cols * STEP - GAP;
  const height = ROWS * STEP - GAP;

  useGSAP(
    () => {
      const section = sectionRef.current;
      if (!section || reduced || !hasEntered) return;

      const segs = gsap.utils.toArray<SVGRectElement>("[data-seg]", section);
      const cells = gsap.utils.toArray<SVGRectElement>("[data-cell]", section);
      const cellByKey = new Map<string, SVGRectElement>();
      cells.forEach((c) => cellByKey.set(c.dataset.key as string, c));

      // The lit contributions are the snake's food.
      const targets: Pt[] = [];
      const litKeys = new Set<string>();
      cells.forEach((c) => {
        if (c.dataset.level !== "0") {
          const [col, row] = (c.dataset.key as string).split("-").map(Number);
          targets.push({ col, row });
          litKeys.add(c.dataset.key as string);
        }
      });

      const eaten = new Set<string>();

      const biteCell = (cell: SVGRectElement) => {
        // Pure colour bite: a hard accent flash, then a CSS transition drains the
        // cell to empty. (No scale pulse — GSAP scaling an SVG <rect> fights the
        // CSS transform-box and makes the cell lurch from the SVG origin.)
        cell.dataset.eaten = "true";
        cell.classList.add(styles.biting); // instant accent flash …
        gsap.delayedCall(0.12, () => cell.classList.remove(styles.biting)); // … then drains
      };

      const eatAt = (route: Pt[], i: number) => {
        const key = `${route[i].col}-${route[i].row}`;
        const cell = cellByKey.get(key);
        if (cell && cell.dataset.level !== "0" && !eaten.has(key)) {
          eaten.add(key);
          biteCell(cell);
        }
      };

      // Greedy nearest-neighbour tour: random start, then always walk to the
      // closest remaining lit cell (orthogonal staircase steps, alternating
      // axes so it reads diagonal/organic). Lit cells crossed en route are
      // consumed too, so the whole grid is eaten. Returns the cell-by-cell spine.
      const buildRoute = (): Pt[] => {
        if (!targets.length) return [];
        const visited = new Set<string>();
        const start = targets[Math.floor(Math.random() * targets.length)];
        let cur: Pt = { ...start };
        visited.add(`${cur.col}-${cur.row}`);
        const route: Pt[] = [{ ...cur }];

        while (visited.size < targets.length) {
          let best: Pt | null = null;
          let bestD = Infinity;
          for (const t of targets) {
            if (visited.has(`${t.col}-${t.row}`)) continue;
            const d = Math.abs(t.col - cur.col) + Math.abs(t.row - cur.row);
            if (d < bestD) {
              bestD = d;
              best = t;
            }
          }
          if (!best) break;

          let { col, row } = cur;
          let axis = 0;
          while (col !== best.col || row !== best.row) {
            const dc = best.col - col;
            const dr = best.row - row;
            const moveH = dc !== 0 && dr !== 0 ? axis++ % 2 === 0 : dc !== 0;
            if (moveH) col += Math.sign(dc);
            else row += Math.sign(dr);
            route.push({ col, row });
            const k = `${col}-${row}`;
            if (litKeys.has(k)) visited.add(k); // eat-as-you-pass
          }
          cur = best;
        }
        return route;
      };

      // Sample the route polyline at a continuous parameter and place the head +
      // tail. The body shares the head's path, each segment lagging by SEG_GAP,
      // so the snake bends smoothly through every turn.
      const positionSnake = (route: Pt[], t: number) => {
        for (let k = 0; k < TAIL; k += 1) {
          const seg = segs[k];
          if (!seg) continue;
          const tk = t - k * SEG_GAP;
          if (tk < 0) {
            gsap.set(seg, { autoAlpha: 0 });
            continue;
          }
          const i = Math.floor(tk);
          const f = tk - i;
          const a = route[i];
          const b = route[Math.min(i + 1, route.length - 1)];
          gsap.set(seg, {
            x: (a.col + (b.col - a.col) * f) * STEP,
            y: (a.row + (b.row - a.row) * f) * STEP,
            autoAlpha: headOpacity(k),
            force3D: true,
          });
        }
      };

      const reset = () => {
        eaten.clear();
        cells.forEach((c) => {
          delete c.dataset.eaten;
          c.classList.remove(styles.biting);
        });
        gsap.set(segs, { autoAlpha: 0 });
      };

      gsap.set(segs, { autoAlpha: 0 });

      let tl: gsap.core.Timeline | null = null;
      let pending: gsap.core.Tween | null = null;
      let running = false;

      // One sweep: regrow the grid, hold it, eat it, slither off — then (while
      // still on-screen) schedule the next cycle, so it loops forever.
      const runCycle = () => {
        if (!targets.length) return;
        if (tl) tl.kill();
        reset(); // remove data-eaten → cells transition back to green
        const route = buildRoute();
        const proxy = { p: 0 };
        let lastEaten = -1;
        tl = gsap.timeline({
          onComplete: () => {
            if (running) pending = gsap.delayedCall(CYCLE_PAUSE, runCycle);
          },
        });
        tl.to(proxy, {
          p: route.length - 1,
          duration: route.length * SECS_PER_CELL,
          ease: "none",
          delay: LEAD_IN, // hold the regrown grid before the snake re-enters
          onUpdate: () => {
            const t = proxy.p;
            const fi = Math.min(Math.floor(t), route.length - 1);
            for (let i = lastEaten + 1; i <= fi; i += 1) eatAt(route, i);
            lastEaten = fi;
            positionSnake(route, t);
          },
        });
        // Slither the tail off once the grid is consumed.
        tl.to(segs, { autoAlpha: 0, duration: 0.6, stagger: 0.05 }, ">-0.1");
      };

      const stop = () => {
        running = false;
        if (tl) tl.pause();
        if (pending) {
          pending.kill();
          pending = null;
        }
      };

      // Run the loop only while the section is on-screen.
      const trigger = ScrollTrigger.create({
        trigger: section,
        start: "top 85%",
        end: "bottom top",
        onToggle: (self) => {
          if (self.isActive) {
            if (!running) {
              running = true;
              runCycle();
            }
          } else {
            stop();
          }
        },
      });



      // 3D Tilt Hover effect on the grid wrap container
      const gridWrap = section.querySelector<HTMLElement>(`.${styles.gridWrap}`);
      const listeners: { element: HTMLElement; type: string; fn: EventListenerOrEventListenerObject }[] = [];
      
      if (gridWrap && !reduced) {
        gsap.set(gridWrap, { transformPerspective: 1000, transformStyle: "preserve-3d" });
        
        const handleMouseMove = (e: Event) => {
          const mouseEvent = e as unknown as MouseEvent;
          const rect = gridWrap.getBoundingClientRect();
          const x = mouseEvent.clientX - rect.left;
          const y = mouseEvent.clientY - rect.top;
          const normX = (x / rect.width) - 0.5;
          const normY = (y / rect.height) - 0.5;
          
          // Subtle tilt for a large grid container (max 6 degrees tilt)
          const rotateX = -normY * 6;
          const rotateY = normX * 6;
          
          gsap.to(gridWrap, {
            rotateX: rotateX,
            rotateY: rotateY,
            x: normX * 4,
            y: normY * 4,
            duration: 0.3,
            ease: "power2.out",
            overwrite: "auto",
          });
        };
        
        const handleMouseEnter = () => {
          playSweep();
        };
        
        const handleMouseLeave = () => {
          gsap.to(gridWrap, {
            rotateX: 0,
            rotateY: 0,
            x: 0,
            y: 0,
            duration: 0.5,
            ease: "power2.out",
            overwrite: "auto",
          });
        };
        
        gridWrap.addEventListener("mousemove", handleMouseMove);
        gridWrap.addEventListener("mouseenter", handleMouseEnter);
        gridWrap.addEventListener("mouseleave", handleMouseLeave);
        
        listeners.push(
          { element: gridWrap, type: "mousemove", fn: handleMouseMove },
          { element: gridWrap, type: "mouseenter", fn: handleMouseEnter },
          { element: gridWrap, type: "mouseleave", fn: handleMouseLeave }
        );
      }

      return () => {
        trigger.kill();
        if (tl) tl.kill();
        if (pending) pending.kill();
        listeners.forEach(({ element, type, fn }) => {
          element.removeEventListener(type, fn);
        });
      };
    },
    { scope: sectionRef, dependencies: [reduced, hasEntered] },
  );

  return (
    <section
      ref={sectionRef}
      className={styles.section}
      aria-labelledby="contrib-label"
    >
      <div className={styles.inner}>
        <div className={styles.head}>
          <SectionLabel id="contrib-label" className={styles.eyebrow}>
            Contributions
          </SectionLabel>
          <span className={styles.count}>{totalLabel} in the last year</span>
        </div>

        <div className={styles.gridWrap} style={{ position: 'relative' }}>
          <svg
            className={styles.grid}
            data-grid
            viewBox={`0 0 ${width} ${height}`}
            width={width}
            height={height}
            role="img"
            aria-label={`${totalLabel} GitHub contributions in the last year`}
            preserveAspectRatio="xMidYMid meet"
          >
            {weeks.map((week, col) =>
              week.map((cell, row) =>
                cell ? (
                  <rect
                    key={`${col}-${row}`}
                    className={styles.cell}
                    data-cell
                    data-key={`${col}-${row}`}
                    data-level={cell.level}
                    x={col * STEP}
                    y={row * STEP}
                    width={CELL}
                    height={CELL}
                    rx={3}
                    ry={3}
                    aria-label={`${cell.count} contribution${cell.count === 1 ? "" : "s"} on ${cell.date}`}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const wrapEl = e.currentTarget.ownerSVGElement?.parentElement;
                      const wrapRect = wrapEl?.getBoundingClientRect();
                      if (rect && wrapRect) {
                        setTooltip({
                          count: cell.count,
                          date: cell.date,
                          x: rect.left - wrapRect.left + rect.width / 2,
                          y: rect.top - wrapRect.top,
                        });
                      }
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                ) : null,
              ),
            )}

            {!reduced && (
              <g className={styles.snake} data-snake aria-hidden="true">
                {Array.from({ length: TAIL }, (_, k) => (
                  <rect
                    key={k}
                    className={styles.seg}
                    data-seg
                    x={0}
                    y={0}
                    width={CELL}
                    height={CELL}
                    rx={4}
                    ry={4}
                  />
                ))}
              </g>
            )}
          </svg>

          {tooltip && (
            <div
              className={styles.tooltip}
              style={{
                left: `${tooltip.x}px`,
                top: `${tooltip.y}px`,
              }}
            >
              <span className={styles.tooltipCount}>
                {tooltip.count} commit{tooltip.count === 1 ? "" : "s"}
              </span>
              <span className={styles.tooltipDate}>{tooltip.date}</span>
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <div className={styles.legend} aria-hidden="true">
            <span className={styles.legendLabel}>Less</span>
            {LEVELS.map((l) => (
              <span key={l} className={styles.legendCell} data-level={l} />
            ))}
            <span className={styles.legendLabel}>More</span>
          </div>

          <div className={styles.controls}>
            <a
              href={githubUrl}
              target="_blank"
              rel="noreferrer"
              className={styles.cta}
            >
              View on GitHub
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
