import type { TransitionEffect } from './types';
import { IrisBloom } from './effects/IrisBloom';
import { ColorCurtainStack } from './effects/ColorCurtainStack';

/**
 * Registry of available page-transition effects.
 *
 * Each entry maps a stable key (used in `data/transitions.json` and
 * `<TransitionLink effect="...">`) to the component that implements it.
 *
 * To add a new effect:
 *   import { PetalFan } from './effects/PetalFan';
 *   ...
 *   'petal-fan': PetalFan,
 *
 * Effects MUST satisfy the `TransitionEffect` contract from `./types.ts`.
 */
export const TRANSITION_EFFECTS = {
  'iris-bloom': IrisBloom,
  'color-curtain-stack': ColorCurtainStack,
} as const satisfies Record<string, TransitionEffect>;

export type TransitionEffectName = keyof typeof TRANSITION_EFFECTS;

export const TRANSITION_EFFECT_NAMES = Object.keys(
  TRANSITION_EFFECTS
) as TransitionEffectName[];

export const isKnownEffect = (name: string): name is TransitionEffectName =>
  Object.prototype.hasOwnProperty.call(TRANSITION_EFFECTS, name);
