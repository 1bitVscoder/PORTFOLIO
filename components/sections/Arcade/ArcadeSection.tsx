'use client';

import { useState, useEffect, useRef } from 'react';
import { useScrollLock } from '@/lib/useScrollLock';
import { useGSAP } from '@gsap/react';
import { gsap } from '@/lib/gsap';
import { DsaRaceTrack } from '@/components/sections/Philosophy/DsaRaceTrack';
import { AiVisualizer } from '@/components/sections/AiVisualizer';
import styles from './ArcadeSection.module.css';

export function ArcadeSection() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Lock body scroll when Arcade is open to prevent background scrolling
  useScrollLock(isOpen, { compensateScrollbar: true });

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    const handleClose = () => setIsOpen(false);

    document.addEventListener('arcade:open', handleOpen);
    document.addEventListener('arcade:close', handleClose);

    return () => {
      document.removeEventListener('arcade:open', handleOpen);
      document.removeEventListener('arcade:close', handleClose);
    };
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleClose = () => {
    setIsOpen(false);
  };

  useGSAP(() => {
    if (!containerRef.current || !overlayRef.current || !drawerRef.current) return;

    if (isOpen) {
      // Open animation
      gsap.killTweensOf([overlayRef.current, drawerRef.current]);
      
      gsap.set(containerRef.current, { visibility: 'visible' });
      gsap.set(overlayRef.current, { opacity: 0 });
      gsap.set(drawerRef.current, { x: '100%' });

      gsap.to(overlayRef.current, {
        opacity: 1,
        duration: 0.5,
        ease: 'power2.out',
      });

      gsap.to(drawerRef.current, {
        x: '0%',
        duration: 0.6,
        ease: 'power3.out',
      });
    } else {
      // Close animation
      gsap.killTweensOf([overlayRef.current, drawerRef.current]);

      gsap.to(overlayRef.current, {
        opacity: 0,
        duration: 0.4,
        ease: 'power2.in',
      });

      gsap.to(drawerRef.current, {
        x: '100%',
        duration: 0.5,
        ease: 'power3.in',
        onComplete: () => {
          gsap.set(containerRef.current, { visibility: 'hidden' });
        },
      });
    }
  }, { dependencies: [isOpen] });

  return (
    <div
      ref={containerRef}
      className={styles.arcadeContainer}
      style={{ visibility: 'hidden' }}
    >
      <div ref={overlayRef} className={styles.overlay} onClick={handleClose} />
      
      <div ref={drawerRef} className={styles.drawer}>
        <header className={styles.header}>
          <div className={styles.titleGroup}>
            <span className={styles.dot} />
            <h2 className={styles.title}>ARCADE_CORE</h2>
          </div>
          <button className={styles.closeButton} onClick={handleClose} aria-label="Close Arcade">
            [ CLOSE_SYSTEM ]
          </button>
        </header>

        <div className={styles.content}>
          <section className={styles.arenaColumn}>
            <div className={styles.columnHeader}>
              <span className={styles.columnEyebrow}>SIMULATION_01</span>
              <h3 className={styles.columnTitle}>Complexity Race Arena</h3>
            </div>
            <div className={styles.columnBody}>
              <DsaRaceTrack />
            </div>
          </section>

          <section className={styles.visualizerColumn}>
            <div className={styles.columnHeader}>
              <span className={styles.columnEyebrow}>AGENT_01</span>
              <h3 className={styles.columnTitle}>Agentic AI Flow</h3>
            </div>
            <div className={styles.columnBody}>
              <AiVisualizer />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
