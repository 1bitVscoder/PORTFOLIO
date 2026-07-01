'use client';

import { useReducedMotion } from '@/lib/useReducedMotion';
import { useStaticFallback } from './useStaticFallback';
import { StaticServicesV2 } from './StaticServicesV2';
import { DialServicesV2 } from './DialServicesV2';

/* Tuning-dial Services variant. Sibling to the existing <Services /> drum.
   Both share `content.services.faces` as data, the global InteractiveBackground
   as canvas, and the same reduced-motion / coarse-pointer fallback gate so
   their a11y baselines are identical. */
export function ServicesV2() {
  const reducedMotion = useReducedMotion();
  const isCoarseOrSmall = useStaticFallback();
  const useStaticLayout = reducedMotion || isCoarseOrSmall;
  return useStaticLayout ? <StaticServicesV2 /> : <DialServicesV2 />;
}
