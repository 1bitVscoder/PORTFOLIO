'use client';

import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

let mql: MediaQueryList | null = null;
const getMql = () =>
  typeof window !== 'undefined' && window.matchMedia
    ? (mql ??= window.matchMedia(QUERY))
    : null;

const subscribe = (onChange: () => void) => {
  const m = getMql();
  if (!m) return () => {};
  m.addEventListener('change', onChange);
  return () => m.removeEventListener('change', onChange);
};

const getSnapshot = () => getMql()?.matches ?? false;
const getServerSnapshot = () => false;

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
