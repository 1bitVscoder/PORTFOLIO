'use client';

import { useContext } from 'react';
import { TransitionContext } from './TransitionProvider';
import type { TransitionContextValue } from './types';

/**
 * Programmatic access to the page transition system.
 * Returns `triggerTransition` (the same one TransitionLink uses) and the
 * current `isTransitioning` flag. Throws if used outside <TransitionProvider>.
 */
export function useTransition(): TransitionContextValue {
  const ctx = useContext(TransitionContext);
  if (!ctx) {
    throw new Error('useTransition must be used within <TransitionProvider>');
  }
  // Expose only the public surface; provider-internal fields (state,
  // onPhaseComplete) stay encapsulated.
  return {
    isTransitioning: ctx.isTransitioning,
    triggerTransition: ctx.triggerTransition,
    markPageReady: ctx.markPageReady,
    isPageReady: ctx.isPageReady,
    hasEntered: ctx.hasEntered,
  };
}
