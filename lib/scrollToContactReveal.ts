// Contact's form reveal is scrub-tied to the section's pinned range (see
// components/sections/Contact/Contact.tsx: pin + scrub, end '+=150%'). A single
// fast scroll-to-bottom races the scrub and types the whole form in within ~1s
// — much quicker than reading it while scrolling by hand. To match the
// manual-scroll pace, a nav jump to Contact scrolls in two phases:
//
//   1. a quick glide to the pin start (the form is still hidden at progress 0)
//   2. a steady, linear traverse of the pinned range so the scrubbed reveal
//      unfolds at reading speed — the same feel as scrolling through it by hand.
//
// Splitting the two means the reveal phase is always the same length regardless
// of how far the click started from (a fixed total duration would crawl when
// clicking near Contact and race when clicking from the top).

// Seconds. APPROACH = how long to reach the section; REVEAL = how long the
// scrubbed form takes to type itself in. Raise REVEAL for a slower reveal.
export const CONTACT_APPROACH_DURATION = 1.2;
export const CONTACT_REVEAL_DURATION = 4;

// Start the reveal traverse as the approach settles (0.8×) so there's no
// visible pause on the empty gradient between the two phases.
const REVEAL_HANDOFF_RATIO = 0.8;

type ScrollToOptions = { duration?: number; easing?: (t: number) => number };
type ScrollToFn = (target: number, options?: ScrollToOptions) => void;

// Linear easing keeps the reveal traverse at constant velocity. Lenis's default
// easeOutExpo would front-load the reveal then crawl on the last rows/submit.
const linear = (t: number) => t;

/**
 * Scroll to the Contact section so its scrubbed form reveal plays at a
 * manual-scroll pace. Returns the pending phase-2 timeout (if scheduled) so the
 * caller can cancel it on unmount / re-invocation.
 */
export function scrollToContactReveal(
  scrollTo: ScrollToFn
): ReturnType<typeof setTimeout> | undefined {
  if (typeof document === 'undefined') return;
  const el = document.getElementById('contact');
  if (!el) return;

  const pinStart = el.getBoundingClientRect().top + window.scrollY;
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;

  // No pinned range to traverse (e.g. reduced motion builds no pin, so the form
  // is already visible) — a single glide to the section is enough.
  if (maxScroll <= pinStart + 2) {
    scrollTo(maxScroll, { duration: CONTACT_APPROACH_DURATION });
    return;
  }

  // Already at/within the pinned range — pace the remaining reveal from here.
  if (window.scrollY >= pinStart - 2) {
    scrollTo(maxScroll, { duration: CONTACT_REVEAL_DURATION, easing: linear });
    return;
  }

  // Phase 1: glide to the pin start (form hidden at progress 0).
  scrollTo(pinStart, { duration: CONTACT_APPROACH_DURATION });
  // Phase 2: steady, linear traverse of the pinned range → scrubbed reveal at
  // reading pace. Calling scrollTo again mid-flight redirects Lenis smoothly.
  return setTimeout(() => {
    scrollTo(maxScroll, { duration: CONTACT_REVEAL_DURATION, easing: linear });
  }, CONTACT_APPROACH_DURATION * REVEAL_HANDOFF_RATIO * 1000);
}
