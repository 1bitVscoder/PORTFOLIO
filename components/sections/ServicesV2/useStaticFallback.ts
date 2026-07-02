'use client';

import { useSyncExternalStore } from 'react';

/* Media query that gates the static (non-animated) Services layout.
   Matches coarse-pointer devices (phones/tablets) or narrow viewports. */
const STATIC_QUERY = '(pointer: coarse), (max-width: 767px)';

function subscribe(onChange: () => void) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mql = window.matchMedia(STATIC_QUERY);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
}

const getSnapshot = () =>
  typeof window !== 'undefined' && !!window.matchMedia &&
  window.matchMedia(STATIC_QUERY).matches;

/* SSR snapshot returns false so the server renders the full DialServicesV2
   (the animated variant). This avoids a hydration layout swap: the old
   useState(true) default caused SSR to render StaticServicesV2, then the
   client-side effect flipped to DialServicesV2, inserting a ~10,000px
   pin-spacer AFTER sibling ScrollTriggers (Projects) had already measured
   their start positions against the shorter static layout — causing them
   to fire at the wrong scroll offset and overlap the dial. */
const getServerSnapshot = () => false;

export function useStaticFallback(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
