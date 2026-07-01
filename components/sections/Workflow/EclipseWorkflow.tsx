'use client';

/* ============================================================
   WORKFLOW · ECLIPSE renderer — markup shell
   A ✦ eyebrow + step readout, a near-fullscreen eclipse scene (disc,
   moon, crescent-masked names — all built imperatively by
   useEclipseDriver), and a bottom-centred detail placard that crossfades
   per active step.
   ============================================================ */

import { useRef } from 'react';
import { content } from '@/data';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { MetaLabel } from '@/components/ui/MetaLabel';
import { VIEWBOX, workflowAccent } from './variants';
import { useEclipseDriver } from './useEclipseDriver';
import { renderCopy } from './renderCopy';
import styles from './Eclipse.module.css';

export function EclipseWorkflow() {
  const { label, stops } = content.workflow;
  const reducedMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);

  const accents = stops.map((s, i) => workflowAccent(s.accent, i, stops.length));

  useEclipseDriver(sectionRef, { accents, reducedMotion });

  const className = [styles.eclipse, reducedMotion ? styles.isStatic : '']
    .filter(Boolean)
    .join(' ');

  return (
    <section ref={sectionRef} className={className} id="workflow" data-wf>
      <div className={styles.viewport} data-viewport>
        <header className={styles.head}>
          <MetaLabel>{label}</MetaLabel>
          <span className={styles.readout} data-readout aria-hidden="true">
            01 / {String(stops.length).padStart(2, '0')}
          </span>
        </header>

        {/* carries the step names to the imperative SVG-text names */}
        <span data-stepname data-names={stops.map((s) => s.name).join('|')} hidden />

        <svg
          className={styles.schematic}
          data-schematic
          viewBox={VIEWBOX}
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        />

        <div className={styles.detailWrap} data-detail>
          {stops.map((stop, i) => (
            <article
              key={stop.name}
              className={styles.detail}
              data-step
              data-name={stop.name}
              style={{ '--accent': workflowAccent(stop.accent, i, stops.length) } as React.CSSProperties}
            >
              <h3 className={styles.detailTitle}>
                {stop.title.endsWith('.') ? stop.title.slice(0, -1) : stop.title}
                {stop.title.endsWith('.') && (
                  <span className={styles.detailTitleStop}>.</span>
                )}
              </h3>
              <p className={styles.detailCopy}>{renderCopy(stop, styles.em)}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
