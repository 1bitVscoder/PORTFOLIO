import React from 'react';
import styles from './MobileBlockOverlay.module.css';

export function MobileBlockOverlay() {
  return (
    <div className={styles.mobileBlockOverlay} aria-hidden="false">
      <div className={styles.warningBadge}>
        [ SYSTEM BLOCK: MOBILE VIEWPORT ]
      </div>
      <p className={styles.message}>
        "the lord Artificer is fu*ked up making the site responsive for mobile, please open the site on a desktop -thank you"
      </p>
      <div className={styles.separator} />
      <p className={styles.secondaryMessage}>
        if you dont have any desktop yet please consider this
      </p>
      <div className={styles.arrowContainer}>
        <svg className={styles.arrowSvg} viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <polyline points="19 12 12 19 5 12"></polyline>
        </svg>
      </div>
      <a 
        href="https://www.google.com/search?q=budget+friendly+laptops" 
        target="_blank" 
        rel="noopener noreferrer"
        className={styles.shopButton}
      >
        Shop Budget-Friendly Laptops
      </a>
    </div>
  );
}
