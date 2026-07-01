'use client';

import { useEffect, useRef, useState } from 'react';
import { useLenis } from '@/lib/LenisProvider';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { features } from '@/data';
import styles from './BackToTop.module.css';

export function BackToTop() {
  const { enabled, scrollThreshold, scrollDuration } = features.backToTop;
  const [visible, setVisible] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const { scrollTo } = useLenis();
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  if (!enabled) return null;

  const handleClick = () => {
    // If the menu is open, ask it to fold up first. The scroll itself would
    // otherwise be invisible (overlay covers the viewport, scroll is locked
    // by useScrollLock) — closing first releases the lock and lets Lenis run
    // its tween against a viewport the user can actually see.
    if (typeof document !== 'undefined') {
      document.dispatchEvent(new CustomEvent('menu:close'));
    }
    scrollTo(0, reducedMotion ? { duration: 0 } : { duration: scrollDuration });
  };

  return (
    <>
      <div
        ref={sentinelRef}
        aria-hidden="true"
        className={styles.sentinel}
        style={{ height: `${scrollThreshold}px` }}
        data-menu-passthrough=""
      />
      <button
        className={styles.button}
        onClick={handleClick}
        aria-label="Back to top"
        title="Back to top"
        aria-hidden={!visible}
        tabIndex={visible ? 0 : -1}
        data-visible={visible}
        // Opt out of the menu's `inert` sweep so this control stays clickable
        // on top of the menu overlay. See Menu.tsx body-children sweep.
        data-menu-passthrough=""
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="12" y1="19" x2="12" y2="5" />
          <polyline points="5 12 12 5 19 12" />
        </svg>
      </button>
    </>
  );
}
