/* ============================================================
   WORKFLOW — variant registry
   The section ships two scroll-driven treatments of the same five
   process steps (content.workflow). Eclipse is the production default;
   Ecliptic is kept as an alternate, reachable in dev via ?wf=ecliptic.
   Both renderers share the 1200×700 viewBox and a 0..1 scrubbed pin.
   ============================================================ */

export type WorkflowVariant = 'eclipse' | 'ecliptic';

/** Rendered in production (the dev-only `?wf=` deep link overrides in dev). */
export const DEFAULT_VARIANT: WorkflowVariant = 'eclipse';

/** Shared SVG coordinate space for both renderers. */
export const VIEWBOX = '0 0 1200 700';

export function isVariant(value: string | null | undefined): value is WorkflowVariant {
  return value === 'eclipse' || value === 'ecliptic';
}

/**
 * Resolve a step's accent to a CSS color. Every step uses its fixed brand
 * palette colour (`--wf-<accent>`) EXCEPT the final step, which always tracks
 * the live site accent (`--color-accent-purple`) so the workflow lands on
 * whatever colour the page is currently cycling. Shared by both renderers and
 * applied to both the scene accent and the per-step detail `--accent`.
 */
export function workflowAccent(accent: string, index: number, count: number): string {
  return index === count - 1 ? 'var(--color-accent-purple)' : `var(--wf-${accent})`;
}
