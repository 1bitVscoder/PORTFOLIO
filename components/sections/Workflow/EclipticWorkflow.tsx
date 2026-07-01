'use client';

/* ============================================================
   WORKFLOW · ECLIPTIC renderer — markup shell
   A ✦ eyebrow + step readout, a full-bleed edge-on orbit schematic
   (built imperatively by useEclipticDriver), and a centred detail stack
   over the sun showing the active step's name as big type, its title and
   copy.
   ============================================================ */

import { useRef } from 'react';
import { content } from '@/data';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { MetaLabel } from '@/components/ui/MetaLabel';
import { VIEWBOX, workflowAccent } from './variants';
import { useEclipticDriver } from './useEclipticDriver';
import { renderCopy } from './renderCopy';
import styles from './Ecliptic.module.css';

export function EclipticWorkflow() {
  const { label, stops } = content.workflow;
  const reducedMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);

  const accents = stops.map((s, i) => workflowAccent(s.accent, i, stops.length));

  useEclipticDriver(sectionRef, { accents, reducedMotion });

  const className = [styles.ecliptic, reducedMotion ? styles.isStatic : '']
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
              <span className={styles.detailKicker}>
                Step {String(i + 1).padStart(2, '0')}&nbsp;/&nbsp;{String(stops.length).padStart(2, '0')}
              </span>
              <h3 className={styles.detailName}>{stop.name}</h3>
              <p className={styles.detailTitle}>{stop.title}</p>
              <p className={styles.detailCopy}>{renderCopy(stop, styles.em)}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
