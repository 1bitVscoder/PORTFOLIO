'use client';

import { useEffect } from 'react';

/**
 * Ref-counted body scroll lock.
 *
 * Multiple independent components (TransitionProvider, Menu, WelcomeScreen)
 * all want to freeze page scroll at overlapping times. Letting each write
 * `document.body.style.overflow` directly races: whichever unlocks last wins,
 * so closing a menu mid-transition (or a welcome+menu overlap) can release a
 * lock another owner still needs, and blindly clearing `paddingRight` drops
 * another owner's scrollbar-gutter compensation.
 *
 * This hook funnels every locker through one shared counter. The body is only
 * locked when the count goes 0 -> 1 and only restored to its *original* inline
 * values when the count returns to 0. Acquire/release is tied to the boolean
 * `active` so the lock is derived from state and can never get out of sync
 * (e.g. an effect that throws still releases on cleanup).
 */

let lockCount = 0;
let saved: { overflow: string; paddingRight: string } | null = null;

function acquire(compensateScrollbar: boolean) {
  if (lockCount === 0) {
    const body = document.body;
    saved = {
      overflow: body.style.overflow,
      paddingRight: body.style.paddingRight,
    };
    // Compensate for the disappearing scrollbar so the page doesn't shift.
    if (compensateScrollbar) {
      const gutter = window.innerWidth - document.documentElement.clientWidth;
      if (gutter > 0) body.style.paddingRight = `${gutter}px`;
    }
    body.style.overflow = 'hidden';
  }
  lockCount += 1;
}

function release() {
  if (lockCount === 0) return;
  lockCount -= 1;
  if (lockCount === 0 && saved) {
    document.body.style.overflow = saved.overflow;
    document.body.style.paddingRight = saved.paddingRight;
    saved = null;
  }
}

/**
 * Locks body scroll while `active` is true. Releases on `active` going false
 * or on unmount. Set `compensateScrollbar` when the locked region would
 * otherwise reflow as the scrollbar disappears (e.g. a full-screen overlay).
 */
export function useScrollLock(
  active: boolean,
  options?: { compensateScrollbar?: boolean }
) {
  const compensateScrollbar = options?.compensateScrollbar ?? false;
  useEffect(() => {
    if (!active) return;
    acquire(compensateScrollbar);
    return release;
  }, [active, compensateScrollbar]);
}
