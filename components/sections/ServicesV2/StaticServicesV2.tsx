'use client';

import { content } from '@/data';
import { MetaLabel } from '@/components/ui/MetaLabel';
import { classifyFaceWord } from './constants';
import { HEADING_ID, ZONES, formatZoneIndex, zoneRail } from './constants';
import styles from './ServicesV2.module.css';

/* Static fallback for the V2 tuning-dial. Rendered when `prefers-reduced-motion`
   is set OR the user is on a coarse-pointer / small-screen device. No scroll
   hijack, no GSAP — every zone is laid out in flow. Mirrors StaticServices.tsx
   in the V1 section so the V1/V2 a11y baseline matches. */
export function StaticServicesV2() {
  return (
    <section id="services" className={styles.wrapper} aria-labelledby={HEADING_ID}>
      <h2 id={HEADING_ID} className={styles.srOnly}>
        {content.services.headline.lead} {content.services.headline.accent}
      </h2>

      <MetaLabel className={styles.stackMetaLabel}>{content.services.label}</MetaLabel>

      <ol className={styles.stack}>
        {ZONES.map((zone, i) => (
          <li key={zone.word} className={styles.stackCard}>
            <div className={styles.stackHead}>
              <strong>{zoneRail(zone)}</strong>
              <span>{formatZoneIndex(i)}</span>
            </div>
            <span className={styles.stackWord}>
              {classifyFaceWord(zone.word).map(({ ch, accent }, j) => (
                <span key={j} className={accent ? styles.accent : undefined}>
                  {ch}
                </span>
              ))}
            </span>
            <p
              className={styles.stackCopy}
              dangerouslySetInnerHTML={{ __html: zone.copy }}
            />
            <div className={styles.stackTools}>
              {zone.tools.map((tool) => (
                <span key={tool} className={styles.stackTool}>
                  {tool}
                </span>
              ))}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
