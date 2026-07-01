import { gsap } from '@/lib/gsap';

// ============================================
// PORTAL ANIMATION UTILITIES
// ============================================
//
// Shared by HeroText (hero name letters) and RevealText (Philosophy
// highlight letters). The "portal loop" slides a letter out in a random
// direction, teleports it to the opposite side, then snaps it back in —
// giving the impression it traveled through a portal.

export type Direction = 'up' | 'down' | 'left' | 'right';

export const DIRECTIONS: Direction[] = ['up', 'down', 'left', 'right'];

export const getRandomDirection = (): Direction => {
  return DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
};

export const getDirectionTransform = (
  direction: Direction,
  distance: number = 100
) => {
  switch (direction) {
    case 'up':
      return { x: 0, y: -distance };
    case 'down':
      return { x: 0, y: distance };
    case 'left':
      return { x: -distance, y: 0 };
    case 'right':
      return { x: distance, y: 0 };
  }
};

export const getOppositeDirection = (direction: Direction): Direction => {
  switch (direction) {
    case 'up':
      return 'down';
    case 'down':
      return 'up';
    case 'left':
      return 'right';
    case 'right':
      return 'left';
  }
};

// Distance (in %) a letter travels to fully exit the viewport box.
const PORTAL_DIST = 110;

/**
 * Triggers the infinite portal loop animation on a letter element:
 * 1. Slide out in a random direction (power2.in — accelerating).
 * 2. Instantly teleport to the opposite side.
 * 3. Slide back in (power2.out — decelerating snap).
 *
 * No-ops while the element is already tweening to prevent overlap.
 */
export const triggerPortalLoop = (letterElement: HTMLElement) => {
  if (gsap.isTweening(letterElement)) return;

  const direction = getRandomDirection();
  const exitTransform = getDirectionTransform(direction, PORTAL_DIST);
  const entryTransform = getDirectionTransform(
    getOppositeDirection(direction),
    PORTAL_DIST
  );

  gsap
    .timeline()
    .to(letterElement, {
      x: exitTransform.x + '%',
      y: exitTransform.y + '%',
      duration: 0.25,
      ease: 'power2.in',
    })
    .set(letterElement, {
      x: entryTransform.x + '%',
      y: entryTransform.y + '%',
    })
    .to(letterElement, {
      x: '0%',
      y: '0%',
      duration: 0.35,
      ease: 'power2.out',
    });
};
