'use client';

import { useContext } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { TransitionContext } from './TransitionProvider';
import { TRANSITION_EFFECTS } from './registry';
import styles from './TransitionStage.module.css';
import type { TransitionPhase } from './types';

/**
 * Renders the currently-active transition effect into a fixed portal on <body>.
 *
 * The portal sits above Navbar (--z-transition: 300). Pointer events are
 * disabled at the portal root via CSS; effects opt in only where they need
 * clicks (today: none — effects are purely visual).
 *
 * Phase is *derived* from (provider state, current pathname). This avoids a
 * setState-in-effect to advance routing→enter; instead, the moment pathname
 * matches the target route, we just render a different `phase` prop and
 * IrisBloom's useGSAP picks it up via dependency change.
 *
 * Mount once near the root layout, inside the providers it depends on.
 */
export function TransitionStage() {
  const ctx = useContext(TransitionContext);
  const pathname = usePathname();

  if (!ctx || ctx.state.kind === 'idle') return null;
  // On the server-rendered pass (or any environment without document) just
  // render nothing — the portal will appear on the client when needed.
  if (typeof document === 'undefined') return null;

  const { effect, origin, payload, kind, target } = ctx.state;

  // Phase derivation:
  //  - 'exit' state: render exit
  //  - 'pending' state: render exit until pathname catches up AND page is ready, then enter
  const phase: TransitionPhase =
    kind === 'pending' && pathname === target && ctx.isPageReady ? 'enter' : 'exit';

  const Effect = TRANSITION_EFFECTS[effect];
  if (!Effect) return null;

  // Delegate completion to the provider's state machine.
  const onComplete = () => ctx.onPhaseComplete(phase);

  return createPortal(
    <div className={styles.stage} aria-hidden>
      <Effect
        phase={phase}
        origin={origin}
        payload={payload}
        onComplete={onComplete}
      />
    </div>,
    document.body
  );
}
