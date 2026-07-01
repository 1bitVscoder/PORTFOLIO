// "Work" reveals the FIRST project's split, which is scrub-tied to that card's
// pinned range and fully CLOSED at progress 0 (the split trigger starts at
// "top top"). A plain scrollTo('#projects') lands exactly there — on the closed
// card, with no animation. So the nav jump scrolls in two phases, mirroring
// scrollToContactReveal:
//
//   1. a quick glide to the card's split start (pinStart; card still closed)
//   2. a steady, LINEAR traverse of the split's scroll range up to the point the
//      card is open — so the scrubbed split plays at the same pace as scrolling
//      through it by hand, then parks on the OPEN (clickable) card without
//      spilling into the next project.

// Seconds. APPROACH = how long to reach the split start; REVEAL = how long the
// scrubbed split takes to open. Raise REVEAL for a slower open.
export const PROJECTS_APPROACH_DURATION = 1.2;
export const PROJECTS_REVEAL_DURATION = 2.5;

// Start the reveal traverse as the approach settles (0.8×) so there's no visible
// pause between the two phases.
const REVEAL_HANDOFF_RATIO = 0.8;

// Land the first card at this fraction of its split scroll range: comfortably
// past OPEN_THRESHOLD (0.6 in Projects.tsx) so it parks unambiguously open and
// clickable, but short of 1.0 so it never scrolls into the second project.
const OPEN_LAND_FRACTION = 0.85;

// Mirror of SPLIT_RUNWAY_VH in Projects.tsx — only used in the single-featured-
// project edge case, where the first card IS the last/handoff card and its split
// runs on a fixed innerHeight*1.4 runway instead of "top top → bottom bottom".
const SPLIT_RUNWAY_VH = 1.4;

type ScrollToOptions = { duration?: number; easing?: (t: number) => number };
type ScrollToFn = (target: number, options?: ScrollToOptions) => void;

// Linear easing keeps the reveal traverse at constant velocity. Lenis's default
// easeOutExpo would front-load the split then crawl as the card finishes opening.
const linear = (t: number) => t;

/**
 * Scroll to the first project so its scrubbed split reveal plays at a
 * manual-scroll pace and parks on the open card. Returns the pending phase-2
 * timeout (if scheduled) so the caller can cancel it on unmount / re-invocation.
 */
export function scrollToProjectsReveal(
  scrollTo: ScrollToFn
): ReturnType<typeof setTimeout> | undefined {
  if (typeof document === 'undefined') return;
  const container = document.getElementById('projects');
  const firstSection = container?.querySelector<HTMLElement>('[data-first="true"]');
  if (!firstSection) return;

  const pinStart = firstSection.getBoundingClientRect().top + window.scrollY;

  // Split scroll range. Normal (non-last) first card: the split scrubs across
  // "top top → bottom bottom" = offsetHeight − viewport. When the first card is
  // the ACTIVE handoff card (only one featured project + overlap live) the split
  // runs on the fixed SPLIT_RUNWAY_VH runway, so offsetHeight would overshoot —
  // use the runway instead. (W1 in PLAN.md.)
  const isHandoffCard =
    firstSection.dataset.last === 'true' && container?.dataset.overlapActive === 'true';
  const splitRange = isHandoffCard
    ? window.innerHeight * SPLIT_RUNWAY_VH
    : firstSection.offsetHeight - window.innerHeight;

  const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // No traversable split range, or reduced motion: a single glide to the split
  // start is enough — there's no scrubbed reveal we want to pace.
  if (splitRange <= 0 || prefersReduced) {
    scrollTo(Math.max(pinStart, 0), { duration: PROJECTS_APPROACH_DURATION });
    return;
  }

  const revealTarget = pinStart + OPEN_LAND_FRACTION * splitRange;

  // Already mid-open (genuinely INSIDE the split's scroll range) — pace the
  // remaining open from here in a single short traverse. We must NOT treat the
  // whole lower page as "within range": Projects sits upper-middle (unlike
  // Contact, which is the last section), so from anywhere past the open point we
  // fall through to the two-phase glide instead of a single fast scroll up.
  if (window.scrollY >= pinStart - 2 && window.scrollY <= revealTarget) {
    scrollTo(revealTarget, { duration: PROJECTS_REVEAL_DURATION, easing: linear });
    return;
  }

  // Phase 1: glide to the split start (card closed at progress 0). Works whether
  // we're above the card or returning to it from further down the page — either
  // way the reveal then plays at the same controlled pace below.
  scrollTo(pinStart, { duration: PROJECTS_APPROACH_DURATION });
  // Phase 2: steady, linear traverse of the split range → scrubbed open at
  // reading pace, parking on the open card. Calling scrollTo again mid-flight
  // redirects Lenis smoothly.
  return setTimeout(() => {
    scrollTo(revealTarget, { duration: PROJECTS_REVEAL_DURATION, easing: linear });
  }, PROJECTS_APPROACH_DURATION * REVEAL_HANDOFF_RATIO * 1000);
}
