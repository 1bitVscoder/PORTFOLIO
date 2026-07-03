'use client';

import React from 'react';
import ScrollReveal from '@/components/ui/ScrollReveal/ScrollReveal';
import styles from './QuoteReveal.module.css';

export function QuoteReveal() {
  return (
    <section className={styles.section}>
      <div className={styles.glow} />
      <div className={styles.container}>
        <ScrollReveal
          baseOpacity={0.1}
          enableBlur
          baseRotation={3}
          blurStrength={4}
          containerClassName={styles.revealContainer}
          textClassName={styles.revealText}
        >
          Every developer learns this eventually. The loudest bug is rarely the worst one. It's the silent bug... The one hiding deep inside the system... That costs you the most. The same is true for unspoken pain...
        </ScrollReveal>
      </div>
    </section>
  );
}
