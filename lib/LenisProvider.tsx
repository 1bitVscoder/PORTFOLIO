'use client';

import { useEffect, useRef, useCallback, createContext, useContext, ReactNode, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import Lenis from 'lenis';
import { gsap, ScrollTrigger } from '@/lib/gsap';

// Snapshot GSAP's lagSmoothing threshold ONCE per page lifetime so that under
// React StrictMode (dev) (mount→unmount→remount) the second mount doesn't
// capture the already-zeroed value and restore `0` on final unmount. Module
// scope is the only place where StrictMode can't double-run us.
let originalLagSmoothing: number | null = null;
function snapshotLagSmoothing(): number {
  if (originalLagSmoothing === null && typeof window !== 'undefined') {
    const fn = gsap.ticker.lagSmoothing as (threshold?: number, adjustedLag?: number) => number;
    originalLagSmoothing = fn();
  }
  return originalLagSmoothing ?? 500;
}

// ============================================
// LENIS CONTEXT - Allows child components to scroll programmatically
// ============================================
interface LenisContextValue {
  scrollTo: (target: string | number | HTMLElement, options?: { offset?: number; duration?: number; easing?: (t: number) => number }) => void;
}

const LenisContext = createContext<LenisContextValue>({
  scrollTo: () => {},
});

export const useLenis = () => useContext(LenisContext);

// ============================================
// PROVIDER
// ============================================
interface LenisProviderProps {
  children: ReactNode;
}

export function LenisProvider({ children }: LenisProviderProps) {
  const lenisRef = useRef<Lenis | null>(null);
  const pathname = usePathname();
  const initialPathRef = useRef<string | null>(null);

  useEffect(() => {
    // Initialize Lenis
    // duration: 1.8 — deliberately slower than the Lenis 1.2 default for a
    // heavier, more cinematic glide. Kept below the old 3.0 value, which
    // produced ~5s of trailing lerp against Hero's ScrollTrigger scrub; 1.8
    // stays clear of that. See docs/perf/animation-baseline.md for history.
    const lenis = new Lenis({
      duration: 1.8,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // easeOutExpo
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 0.28, // Set to 0.28 to make scrolling much denser, requiring significantly more scroll turns to navigate contents
      touchMultiplier: 0.45,  // Adjusted Touch/Trackpad multiplier to match the much denser scroll feel
    });

    lenisRef.current = lenis;

    // Sync Lenis scroll with ScrollTrigger
    lenis.on('scroll', ScrollTrigger.update);

    // PERF: Drive Lenis from gsap.ticker so all RAF-driven animations
    // (Lenis, CustomCursor, GSAP tweens) share a single frame loop.
    // gsap.ticker passes time in seconds; lenis.raf expects ms.
    const tick = (time: number) => {
      if (!document.hidden) {
        lenis.raf(time * 1000);
      }
    };
    const prevLagSmoothing = snapshotLagSmoothing();
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0); // Required by Lenis to keep scroll timing accurate

    // PERF: Handle visibility change - sync when tab becomes visible.
    // The tick loop already gates lenis.raf on !document.hidden, so Lenis
    // resumes on the next visible frame; we only nudge ScrollTrigger here.
    const handleVisibilityChange = () => {
      if (!document.hidden) ScrollTrigger.update();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(prevLagSmoothing);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // Defensive: some lenis versions don't release scroll emitter
      // subscribers on destroy(), leaking ScrollTrigger.update references.
      lenis.off('scroll', ScrollTrigger.update);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  // Reset scroll + ScrollTrigger world on client-side route changes.
  // Cold load is handled by the inline scrollTo(0,0) in layout.tsx, so the
  // very first run of this effect must be a no-op — otherwise Lenis fights
  // the inline reset and ScrollTrigger.refresh() runs before any page-level
  // triggers exist.
  useEffect(() => {
    if (initialPathRef.current === null) {
      // Cold load: record the initial path and do nothing (layout.tsx owns it).
      initialPathRef.current = pathname;
      return;
    }
    if (initialPathRef.current === pathname) {
      // StrictMode remount on the same path — keep the first run a no-op.
      return;
    }
    const lenis = lenisRef.current;
    if (lenis) {
      lenis.scrollTo(0, { immediate: true });
    } else {
      window.scrollTo(0, 0);
    }
    ScrollTrigger.refresh();
    ScrollTrigger.update();
  }, [pathname]);

  const scrollTo = useCallback((target: string | number | HTMLElement, options?: { offset?: number; duration?: number; easing?: (t: number) => number }) => {
    lenisRef.current?.scrollTo(target, options);
  }, []);

  const contextValue = useMemo<LenisContextValue>(() => ({
    scrollTo,
  }), [scrollTo]);

  return (
    <LenisContext.Provider value={contextValue}>
      {children}
    </LenisContext.Provider>
  );
}
