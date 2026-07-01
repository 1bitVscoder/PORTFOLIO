import type { LedgerContent } from "@/data";
import styles from "./Ledger.module.css";

export const Ledger = ({ entries }: LedgerContent) => {
  return (
    <section className={styles.ledger} aria-label="Project vitals">
      <dl className={styles.inner}>
        {entries.map((entry) => (
          <div key={entry.label} role="group" className={styles.cell}>
            <dt className={styles.label}>{entry.label}</dt>
            <dd className={styles.value}>
              {entry.primary}
              <small className={styles.descriptor}>{entry.secondary}</small>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
};
