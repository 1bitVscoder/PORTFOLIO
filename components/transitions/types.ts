/**
 * Page transition contract.
 *
 * Adding a new transition effect is a 3-step process:
 *   1. Build a component that implements `TransitionEffect` (see effects/IrisBloom for a reference impl).
 *   2. Register it in `registry.ts` under a stable key.
 *   3. (Optional) Set it as the new default in `data/transitions.json`,
 *      or pass `effect="your-key"` on a `<TransitionLink />`.
 */

import type { TransitionEffectName } from './registry';

export type TransitionPhase = 'exit' | 'enter';

/** Data the destination route needs the transition to know about. */
export interface TransitionPayload {
  /** Hex color used as the destination's accent. Written to `--color-accent-purple`
   *  at the start of the exit phase so the case study has its color ready. */
  accent: string;
  /** Optional metadata. Effects may surface these in their overlay (title cards, etc). */
  title?: string;
  slug?: string;
  year?: string;
  category?: string;
}

/** Props every transition effect receives. */
export interface TransitionEffectProps {
  /** Which phase to play. The same component instance is asked for both
   *  phases sequentially — it should branch on this. */
  phase: TransitionPhase;
  /** Click coordinates if the transition was triggered by a click; null for
   *  back-nav / programmatic triggers. Effects that anchor to a point
   *  (iris bloom, petal fan) should default to viewport center when null. */
  origin: { x: number; y: number } | null;
  /** Destination metadata. */
  payload: TransitionPayload;
  /** Effects MUST call this exactly once when the current phase finishes
   *  so the provider can advance the state machine. */
  onComplete: () => void;
}

export type TransitionEffect = React.ComponentType<TransitionEffectProps>;

// ---------------------------------------------------------------------------
// Provider-internal types (exported so the hook can re-use them)
// ---------------------------------------------------------------------------

export interface TriggerTransitionArgs {
  href: string;
  origin?: { x: number; y: number } | null;
  payload: TransitionPayload;
  /** Override the default effect for this single transition. Deliberately
   *  wider than `TransitionEffectName`: the value is resolved/validated at
   *  runtime via `isKnownEffect` (so dev/localStorage overrides and other
   *  arbitrary strings are accepted, then ignored if unknown). The
   *  `(string & {})` keeps editor autocomplete for the known names. */
  effect?: TransitionEffectName | (string & {});
}

export interface TransitionContextValue {
  isTransitioning: boolean;
  triggerTransition: (args: TriggerTransitionArgs) => void;
}
