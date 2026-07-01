'use client';

/* ============================================================
   WORKFLOW — section orchestrator
   Renders the active variant's renderer (Eclipse in production; Ecliptic
   kept as an alternate, reachable in dev via the ?wf=ecliptic deep link).
   Mounted in the home scroll just before Contact.
   ============================================================ */

import { useEffect, useRef, useSyncExternalStore } from 'react';
import { ScrollTrigger } from '@/lib/gsap';
import { DEFAULT_VARIANT, isVariant, type WorkflowVariant } from './variants';
import { EclipseWorkflow } from './EclipseWorkflow';
import { EclipticWorkflow } from './EclipticWorkflow';

// Dev-only: the ?wf= override exists only outside production, so production
// always renders DEFAULT_VARIANT (Eclipse).
const DEV = process.env.NODE_ENV !== 'production';

// ── Active variant store (dev-preview ?wf= deep link, read-only) ──
// useSyncExternalStore keeps SSR + first client render on DEFAULT (the server
// snapshot), then switches to the URL value after hydration. Hydration-safe:
// production has no ?wf param, so the snapshots always agree.
function subscribe(listener: () => void) {
  window.addEventListener('popstate', listener);
  return () => window.removeEventListener('popstate', listener);
}
function getSnapshot(): WorkflowVariant {
  if (!DEV) return DEFAULT_VARIANT;
  const param = new URLSearchParams(window.location.search).get('wf');
  return isVariant(param) ? param : DEFAULT_VARIANT;
}
function getServerSnapshot(): WorkflowVariant {
  return DEFAULT_VARIANT;
}

export function Workflow() {
  const variant = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const firstRun = useRef(true);

  // A dev ?wf= variant swap unmounts one renderer and mounts the other, so the
  // workflow pin is recreated AFTER the later Contact pin already exists. GSAP
  // refreshes equal-priority pins in *creation* order, so the out-of-order
  // workflow pin's spacing wouldn't be counted in Contact's start and Contact
  // would bleed over the workflow. ScrollTrigger.sort() re-orders pins by
  // document position; refresh() then recomputes every start/end correctly.
  // (refresh() alone does NOT re-sort.) Only needed AFTER a swap: on first
  // mount the pins are already created in document order, so skip it (avoids a
  // redundant page-wide refresh on initial load).
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const id = requestAnimationFrame(() => {
      ScrollTrigger.sort();
      ScrollTrigger.refresh();
    });
    return () => cancelAnimationFrame(id);
  }, [variant]);

  return variant === 'ecliptic' ? <EclipticWorkflow /> : <EclipseWorkflow />;
}
