'use client';

import { DsaRaceTrack } from "@/components/sections/Philosophy/DsaRaceTrack";
import { AiVisualizer } from "@/components/sections/AiVisualizer";
import { Contact } from "@/components/sections/Contact";
import { MetaLabel } from "@/components/ui/MetaLabel";
import styles from "./ArcadePage.module.css";

export function ArcadePageView() {
  return (
    <main className={styles.main}>
      {/* Intro Header Section */}
      <section className={styles.heroSection}>
        <div className={styles.headerContent}>
          <MetaLabel>Interactive Systems</MetaLabel>
          <h1 className={styles.title}>Arcade</h1>
          <p className={styles.lede}>
            A testing ground for optimized algorithmic engines, autonomous prompt routing, 
            and telemetry visualization.
          </p>
        </div>
      </section>

      {/* Section 1: Complexity Race Arena */}
      <section className={styles.section} id="race-arena">
        <DsaRaceTrack />
      </section>

      {/* Section 2: Agentic AI Flow */}
      <AiVisualizer />

      {/* Contact Footer */}
      <Contact />
    </main>
  );
}
