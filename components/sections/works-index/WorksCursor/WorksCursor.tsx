'use client';

import { useEffect, useRef } from 'react';
import { gsap } from '@/lib/gsap';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { cssVars } from '@/lib/cssVars';
import styles from './WorksCursor.module.css';

export interface WorksCursorProps {
  /** True when any row is hovered — grows the cursor + shows "Open" label. */
  hovered: boolean;
  /** Accent hex of the hovered row. Used as the cursor fill when active. */
  accent: string | null;
  /** Label shown on row hover. */
  label?: string;
}

export function WorksCursor({ hovered, accent, label = 'Open' }: WorksCursorProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  // Persist quickTo instances across renders so we don't recreate them.
  const quickXRef = useRef<ReturnType<typeof gsap.quickTo> | null>(null);
  const quickYRef = useRef<ReturnType<typeof gsap.quickTo> | null>(null);

  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    // Only attach the cursor spring on devices that support hover with a fine
    // pointer (mouse / trackpad), matching the (hover: hover) and (pointer:
    // fine) gate used by the case-study Hero parallax. On coarse-pointer or
    // touch devices the cursor element is invisible anyway; on reduced-motion
    // we skip the quickTo spring entirely. Both cases return a no-op cleanup.
    if (reduced || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      return undefined;
    }

    quickXRef.current = gsap.quickTo(el, 'x', { duration: 0.25, ease: 'power3' });
    quickYRef.current = gsap.quickTo(el, 'y', { duration: 0.25, ease: 'power3' });

    const onMove = (e: MouseEvent) => {
      quickXRef.current?.(e.clientX);
      quickYRef.current?.(e.clientY);
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, [reduced]);

  const className = `${styles.cursor}${hovered ? ` ${styles.onRow}` : ''}`;
  const style = accent ? cssVars({ '--cursor-accent': accent }) : undefined;

  return (
    <div ref={ref} className={className} style={style} aria-hidden="true">
      <span className={styles.label}>{label}</span>
    </div>
  );
}
