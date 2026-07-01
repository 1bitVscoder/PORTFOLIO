import { getServicesFaces } from '@/data';
import type { ServiceFace } from '@/data';

/* Each service face maps 1:1 to a zone on the tuning dial. The v3 mockup
   carried its own ZONES[] hardcoded inline; we derive directly from
   `content.services.faces` so the two Services variants stay in lockstep. */
export const ZONES: ReadonlyArray<ServiceFace> = getServicesFaces();

/* Width of one tool cell on the dial strip, in CSS pixels. Doubles as the
   notch spacing. Kept as a JS constant (not a CSS var) because applyDial()
   multiplies it by a fractional cell index to position the strip; a single
   source of truth avoids drift between layout and the scroll-driven
   translateX. */
export const GAP_PX = 220;

/* Padding cells at each end of the dial strip so the first and last real
   tools can pass the centred needle without the strip running out of runway.
   Three is enough for the natural eased ease-in/ease-out at the boundaries. */
export const PAD_CELLS = 3;

/* Pin runway, in viewport heights — how far you scroll (past the pin start)
   to pan the dial from progress 0 to 1. 10vh is long enough that a single
   1vh wheel burst pans only a fraction of a cell, so no individual gesture
   can skip a zone.

   Derivation: the trigger end is `+=window.innerHeight * PIN_RUNWAY_VH`, so
   the full progress sweep costs 10 viewport heights of scroll. With ~28 real
   cells spread across that sweep, one cell ≈ 10/28 ≈ 0.36vh of travel, i.e.
   a 1vh burst advances ~1/0.36 ≈ 2.8 cells worth of progress before the
   PIN_SCRUB lerp — comfortably under a zone width, which is several cells.
   Note: this end is viewport-relative BY DESIGN (it scales with screen
   height); see the matching note in DialServicesV2 before switching it to a
   content-relative value. */
export const PIN_RUNWAY_VH = 10;

/* Height threshold (px) above which a screen counts as "tall/large". At or below
   this, the runway scales with the actual viewport height (innerHeight * PIN_RUNWAY_VH);
   above it, the reduced PIN_RUNWAY_TALL_REF_PX reference kicks in. 900px is the laptop
   reference. */
export const PIN_RUNWAY_REF_PX = 900;

/* Reduced reference height (px) used for tall screens (innerHeight >
   PIN_RUNWAY_REF_PX). Gives those screens a shorter ~6,000px runway
   (600 * PIN_RUNWAY_VH) for a snappier sweep on large displays. */
export const PIN_RUNWAY_TALL_REF_PX = 600;

/* ScrollTrigger `scrub` value. With the longer pin runway above, a sharper
   scroll has more travel headroom, so lerp the dial toward its target a bit
   more lazily. Controls *response*, not distance. */
export const PIN_SCRUB = 1.0;

/* Per-letter portal stagger durations for the bigword OUT/IN swap. Matches
   the Hero portal animation vocabulary (see HeroText.tsx) so the two
   sections feel like one motion system. */
export const BW_OUT_DUR = 0.28;
export const BW_OUT_STAGGER = 0.022;
export const BW_IN_DUR = 0.45;
export const BW_IN_STAGGER = 0.04;

/* Word-mask reveal vocabulary for the lede swap. Matches the case-study
   Hero lede in components/sections/case-study/Hero (yPercent 110→0, power2.out,
   0.12s/line). The OUT phase is intentionally faster than IN so the new
   lede has clear runway. */
export const LEDE_IN_DUR = 0.7;
export const LEDE_IN_LINE_STAGGER = 0.12;
export const LEDE_OUT_DUR = 0.35;
export const LEDE_OUT_LINE_STAGGER = 0.06;

/* OUT→SWAP overlap. The swap to the new zone's content fires this many
   seconds before the slower of the two OUT animations finishes, so the IN
   begins slightly before the OUT clears. Gives a continuous motion feel
   rather than a hard cut. */
export const SWAP_OVERLAP = 0.08;

/* DOM ID — stable so the SR-only landmark can target the same node across
   re-renders. Suffixed with `-v2` to avoid collision with the existing
   Services section, which owns the unsuffixed ID. */
export const HEADING_ID = 'services-v2-heading';

/* Pads a zero-padded zone index for major notch labels: 1 → "01". */
export const formatZoneIndex = (i: number): string =>
  String(i + 1).padStart(2, '0');

/* Short rail label used on the zone footer cells. Falls back to `word`
   stripped of trailing punctuation when `rail` is empty. */
export const zoneRail = (z: ServiceFace): string =>
  z.rail || z.word.replace(/\.$/, '');

/* Meter-bar tuning constants. Each non-pad dial cell renders a thin vertical
   accent bar that scales toward the centre needle, drawing a signal peak. */

/* Tallest bar height as a fraction of the dialwrap/cell band height. Mirrors
   the CSS `.dialBar { height: 42% }` resting box; applyDial scales it via
   scaleY so the label can ride the scaled visual top. */
export const BAR_MAX_FRACTION = 0.42;

/* Minimum scaleY so far-from-needle bars still register as a faint tick
   rather than vanishing entirely. */
export const BAR_MIN_SCALE = 0.05;

/* Px gap between a bar's scaled visual top and its riding label. */
export const LABEL_RIDE_GAP_PX = 14;

/* Dial hot-path falloff/gain constants. These shape how each cell responds to
   its distance from the centred needle inside applyDial. Hoisted out of the
   per-frame loop so the magic numbers have names and live next to the meter
   constants they pair with. */

/* Needle proximity falloff divisor. A cell's normalised proximity is
   `1 - dist / NEEDLE_FALLOFF` (clamped at 0), where `dist` is the cell's
   distance from the needle in cell-index units. Larger = wider, softer peak;
   2.4 keeps the lit band ~2-3 cells wide on each side of the needle. */
export const NEEDLE_FALLOFF = 2.4;

/* Bar opacity ramp: opacity = BAR_OPACITY_MIN + eased * BAR_OPACITY_RANGE,
   so far bars rest at 0.22 and the on-needle bar reaches 1.0. */
export const BAR_OPACITY_MIN = 0.22;
export const BAR_OPACITY_RANGE = 0.78;

/* Tool-label opacity ramp: opacity = TOOL_OPACITY_MIN + t * TOOL_OPACITY_RANGE,
   so far labels rest at 0.3 and the on-needle label reaches 1.0. Uses the raw
   proximity `t` (not the smoothstepped `eased`) for a gentler text fade. */
export const TOOL_OPACITY_MIN = 0.3;
export const TOOL_OPACITY_RANGE = 0.7;

/* Dial-label zoom. The tool label scales from LABEL_SCALE_MIN at rest (far from the
   needle) up to LABEL_SCALE_MAX as it locks onto the centred needle, driven by the same
   smoothstepped `eased` proximity as the weight morph (DIAL_WEIGHT_MIN/MAX) so the zoom
   and bold lock on as a single crisp motion. transform-origin is `center bottom`, so the
   scale anchors at the baseline and doesn't shift neighbours. */
export const LABEL_SCALE_MIN = 0.9;
export const LABEL_SCALE_MAX = 1.28;

/* Dial-label weight morph (Switzer Variable wght axis). The tool label's
   font weight tracks the meter bar's growth toward the needle: at rest
   (bar minimal) it sits at MIN, on the needle (bar at full height) it
   reaches MAX. Driven by the same smoothstepped `eased` proximity that
   shapes the bar's scaleY, so weight and bar height move in lockstep.
   Weight is already an integer axis, so applyDial rounds to a whole wght
   and caches it — no separate quantisation scale needed. */
export const DIAL_WEIGHT_MIN = 400;
export const DIAL_WEIGHT_MAX = 700;

export interface ClassifiedChar {
  ch: string;
  accent: boolean;
}

export function classifyFaceWord(word: string): ClassifiedChar[] {
  return word.split('').map((ch) => ({
    ch: ch === ' ' ? '\u00a0' : ch,
    accent: ch === '.',
  }));
}

