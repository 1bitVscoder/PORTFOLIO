import { gsap } from '@/lib/gsap';
import {
  BW_IN_DUR,
  BW_IN_STAGGER,
  BW_OUT_DUR,
  BW_OUT_STAGGER,
  LEDE_IN_DUR,
  LEDE_IN_LINE_STAGGER,
  LEDE_OUT_DUR,
  LEDE_OUT_LINE_STAGGER,
  SWAP_OVERLAP,
} from './constants';

/* Hero-style portal directions for the bigword letter stagger. Each letter
   independently picks a direction so the swap looks like the word has been
   shattered and recomposed, not slid as a block. */
const DIRECTIONS = ['up', 'down', 'left', 'right'] as const;
type Direction = (typeof DIRECTIONS)[number];

const randomDirection = (): Direction =>
  DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];

/* Off-stage portal travel for each bigword letter, in percent of its own
   box. Sole source of truth — the two portal helpers below rely on this as
   the `directionOffset` default rather than re-passing the literal. */
const PORTAL_DIST = 110;

const directionOffset = (dir: Direction, distance = PORTAL_DIST) => {
  switch (dir) {
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

type SplitClassNames = {
  /** Class applied to each per-letter overflow:hidden mask. */
  readonly letterMask: string;
  /** Class applied to the inner span that GSAP translates. */
  readonly letterInner: string;
  /** Class applied to inner spans that should render in the accent colour. */
  readonly accent: string;
};

/* Split a bigword string (e.g. "INTERFACES.") into per-letter masks inside
   `container`. The trailing period gets the accent class so it renders in
   `--color-accent-purple` to match the v3 mockup.

   Imperative DOM mutation (rather than rendering through React) keeps the
   letter elements stable across zone swaps: GSAP holds references to the
   inner spans, and React re-renders would replace those nodes mid-tween.
   Same pattern as Services/drumPaint.ts. */
export function splitBigWord(
  word: string,
  container: HTMLElement,
  cls: SplitClassNames,
): HTMLSpanElement[] {
  container.innerHTML = '';
  const letters: HTMLSpanElement[] = [];

  /* The accent character in our content is the trailing "." — match it
     case-insensitively so future words with internal punctuation still work.
     Whitespace becomes a non-breaking-space-bearing mask so the bigword,
     which uses `white-space: nowrap`, doesn't collapse spaces. */
  for (const ch of word) {
    const mask = document.createElement('span');
    mask.className = cls.letterMask;
    if (ch === ' ') {
      mask.innerHTML = '&nbsp;';
      container.appendChild(mask);
      continue;
    }
    const inner = document.createElement('span');
    inner.className = ch === '.' ? `${cls.letterInner} ${cls.accent}` : cls.letterInner;
    inner.textContent = ch;
    mask.appendChild(inner);
    container.appendChild(mask);
    letters.push(inner);
  }
  return letters;
}

type LedeClassNames = {
  readonly ledeWord: string;
  readonly ledeWordInner: string;
  /** Class applied to inners that were inside a <b> in the source HTML. */
  readonly ledeBold: string;
};

/* Allowlist sanitizer for lede HTML. The `lede` content in our data is
   trusted-checked-in HTML and the only emphasis tag we use is <b>, but
   `scratch.innerHTML = html` below would happily materialise any tag the
   browser knows about. Strip everything that isn't a <b>/<strong> open or
   close tag so a content-typo (or a future contributor pasting markup) can't
   accidentally inject an <img>/<script>/<iframe> into the page. */
const LEDE_TAG_ALLOWLIST = /<\/?(?!(?:b|strong)\b)[a-z][^>]*>/gi;
function sanitizeLedeHtml(html: string): string {
  return html.replace(LEDE_TAG_ALLOWLIST, '');
}

/* Split a lede HTML string into per-word masks inside `container`,
   preserving <b> inline emphasis. Input is sanitised via `sanitizeLedeHtml`
   so only <b>/<strong> survive. Whitespace is preserved as raw text nodes
   so words wrap naturally onto multiple lines (we group revealed words by
   their post-layout line offset later). */
export function splitLede(
  html: string,
  container: HTMLElement,
  cls: LedeClassNames,
): HTMLSpanElement[] {
  container.innerHTML = '';
  const inners: HTMLSpanElement[] = [];
  const scratch = document.createElement('div');
  scratch.innerHTML = sanitizeLedeHtml(html);

  const walk = (src: Node, target: HTMLElement, bold: boolean) => {
    if (src.nodeType === Node.TEXT_NODE) {
      const parts = (src.textContent ?? '').split(/(\s+)/);
      for (const part of parts) {
        if (!part) continue;
        if (/^\s+$/.test(part)) {
          target.appendChild(document.createTextNode(part));
          continue;
        }
        const mask = document.createElement('span');
        mask.className = cls.ledeWord;
        const inner = document.createElement('span');
        inner.className = bold ? `${cls.ledeWordInner} ${cls.ledeBold}` : cls.ledeWordInner;
        inner.textContent = part;
        mask.appendChild(inner);
        target.appendChild(mask);
        inners.push(inner);
      }
      return;
    }
    if (src.nodeType === Node.ELEMENT_NODE) {
      const el = src as HTMLElement;
      const isBold = el.tagName === 'B' || el.tagName === 'STRONG';
      el.childNodes.forEach((child) => walk(child, target, bold || isBold));
    }
  };
  scratch.childNodes.forEach((n) => walk(n, container, false));
  return inners;
}

/* Group word inners by `offsetTop` so each wrapped visual line animates as
   a batch. Returns groups in top-to-bottom order.

   Hot-path note: read every parent's offsetTop into a flat array FIRST,
   then bucket. The browser can satisfy all reads from a single forced
   layout — there are no writes interleaved, but doing the reads in one
   pass also keeps the access pattern obvious and prevents a future edit
   from accidentally sliding a style write between two reads. */
function groupByLine(inners: HTMLSpanElement[]): HTMLSpanElement[][] {
  const tops: Array<number | null> = inners.map((inner) => {
    const parent = inner.parentElement;
    return parent ? Math.round(parent.offsetTop) : null;
  });
  const map = new Map<number, HTMLSpanElement[]>();
  inners.forEach((inner, i) => {
    const key = tops[i];
    if (key === null) return;
    let bucket = map.get(key);
    if (!bucket) {
      bucket = [];
      map.set(key, bucket);
    }
    bucket.push(inner);
  });
  return [...map.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, group]) => group);
}

/* Lede IN reveal — slide each word's inner from yPercent:110 up to 0,
   line by line. Returns total animation duration so callers can chain.

   Uses `gsap.from(..., immediateRender: true)` rather than a separate
   `gsap.set(yPercent:110)` + `gsap.to(yPercent:0)` pair. With the explicit
   set, line 0 (delay 0) doesn't tick until the next frame, so the browser
   has time to paint one frame with the lede already laid out at default
   position before GSAP yanks it to yPercent:110 — a visible flash. `.from`
   with immediateRender writes the start state synchronously AND keeps it
   held during the (zero) delay, so line 0's first paint is already
   off-screen. Non-zero delays on later lines hold them at yPercent:110 for
   the same reason. */
export function ledeRevealIn(container: HTMLElement, ledeWordInner: string): number {
  const inners = [
    ...container.querySelectorAll<HTMLSpanElement>(`.${ledeWordInner}`),
  ];
  if (!inners.length) return 0;
  const groups = groupByLine(inners);
  groups.forEach((group, lineIdx) => {
    gsap.from(group, {
      yPercent: 110,
      duration: LEDE_IN_DUR,
      delay: lineIdx * LEDE_IN_LINE_STAGGER,
      ease: 'power2.out',
      immediateRender: true,
    });
  });
  return LEDE_IN_DUR + (groups.length - 1) * LEDE_IN_LINE_STAGGER;
}

/* Lede OUT — slide inners UP out of their masks before content swap. Faster
   + tighter than IN so the lede has cleared by the time the new copy arrives. */
export function ledeRevealOut(container: HTMLElement, ledeWordInner: string): number {
  const inners = [
    ...container.querySelectorAll<HTMLSpanElement>(`.${ledeWordInner}`),
  ];
  if (!inners.length) return 0;
  const groups = groupByLine(inners);
  groups.forEach((group, lineIdx) => {
    gsap.to(group, {
      yPercent: -110,
      duration: LEDE_OUT_DUR,
      delay: lineIdx * LEDE_OUT_LINE_STAGGER,
      ease: 'power2.in',
    });
  });
  return LEDE_OUT_DUR + (groups.length - 1) * LEDE_OUT_LINE_STAGGER;
}

/* Eased portal-IN for an already-split bigword: each letter snaps to a
   random off-stage position then tweens back to (0,0). Returns total duration. */
export function portalBigWordIn(letters: HTMLSpanElement[]): number {
  letters.forEach((el, i) => {
    const start = directionOffset(randomDirection());
    gsap.set(el, { x: `${start.x}%`, y: `${start.y}%` });
    gsap.to(el, {
      x: '0%',
      y: '0%',
      duration: BW_IN_DUR,
      delay: i * BW_IN_STAGGER,
      ease: 'power2.out',
    });
  });
  return letters.length ? (letters.length - 1) * BW_IN_STAGGER + BW_IN_DUR : 0;
}

/* Portal-OUT — fire-and-forget per-letter scatter. Returns total duration. */
export function portalBigWordOut(letters: HTMLSpanElement[]): number {
  letters.forEach((el, i) => {
    const off = directionOffset(randomDirection());
    gsap.to(el, {
      x: `${off.x}%`,
      y: `${off.y}%`,
      duration: BW_OUT_DUR,
      delay: i * BW_OUT_STAGGER,
      ease: 'power2.in',
    });
  });
  return letters.length ? (letters.length - 1) * BW_OUT_STAGGER + BW_OUT_DUR : 0;
}

/* Convenience: timing budget for when the SWAP (content replacement) should
   fire — `SWAP_OVERLAP` before the slower of the two OUT animations
   finishes. Returns total IN time so the caller knows when zoneAnimating
   can flip back to false. */
export function computeSwapTiming(bwOutEnd: number, ledeOutEnd: number) {
  return {
    swapAt: Math.max(0, Math.max(bwOutEnd, ledeOutEnd) - SWAP_OVERLAP),
  };
}
