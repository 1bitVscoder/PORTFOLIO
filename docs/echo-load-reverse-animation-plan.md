# Plan — Echo Hero: "Expand-from-Solid" Load Animation

**File:** `components/sections/about-page/Echo.tsx` (+ `Echo.module.css`)
**Status:** APPROVED — implementing.

**Locked decisions:** (1) layers emerge **perfectly simultaneously** (no
stagger — exact mirror of the scroll); (2) **keep** the solid slide-up first;
(3) **full clip + slide** mirror (each cell does both `clip-path` unfurl and `y`
slide).

---

## 1. What you asked for (my understanding)

> On page load, auto-play the scroll animation **in reverse** — the echo text
> **expands outward from the solid `ABOUT ME` layer**. When the user then
> scrolls, the **normal** scroll animation runs (echoes retract back into the
> solid). This must **not** affect scrolling or the animations of the other
> sections on the About page.

So we are flipping the *entrance* of the echo rows so it mirrors the existing
scroll-merge, but played automatically on load and in the opposite direction.

---

## 2. How it works today

There are **two independent animations** in `Echo.tsx`, both gated to
`prefers-reduced-motion: no-preference`:

```
INTRO timeline (on load, no ScrollTrigger)
  • solid word slides up   (yPercent 115 -> 0)
  • echoes FADE in          (autoAlpha 0 -> 1, small y nudge -> 0)
  • chrome (back-arrow) reveals

MERGE timeline (ScrollTrigger: pin + scrub, end "+=120%")
  • echo rows RETRACT into the solid as you scroll
      clip-path inset opens -> closes toward the outer edge
      y: each row slides to the solid word's centre
  • owns the echo rows' clip-path + y. immediateRender:false so it does
    not paint until the user actually scrolls.
```

### Resting / boundary states (this is the key to the whole plan)

```
                      clip-path        y
INTRO end state   =   inset(0)         0      (echoes fully EXPANDED, visible)
MERGE "from" (scroll top) = inset(0)   0      (SAME — expanded)
MERGE "to" (scroll done)  = inset(...100%)  slide-to-centre  (COLLAPSED into solid)
```

The intro and the scroll-merge **meet at the same expanded state** at scroll
position 0. That is *why* they coexist without fighting today.

> ⚠️ Known hazard (from project memory `echo-hero-merge-scrolltrigger`):
> the merge's **scrub clobbers the echo rows' clip/transform on every
> ScrollTrigger refresh**. The rule established earlier is: **decouple the
> entrance onto wrapper elements; never change the merge's lifecycle.**

---

## 3. The new behaviour

Today's load = echoes fade in already-expanded.
New load = echoes start **collapsed inside the solid**, then **expand outward**
(the visual reverse of the scroll-merge). The scroll-merge itself is unchanged.

```
ON LOAD (new):                          ON SCROLL (unchanged):

   t=0  echoes hidden in solid            scroll 0%   echoes expanded
        ┌───────────────┐                            ╔═══════════════╗
        │   (collapsed)  │                            ║  echo  echo   ║
        │  ▓▓ ABOUT ME ▓▓│   ── expand ──▶            ║  ABOUT  ME    ║
        │   (collapsed)  │                            ║  echo  echo   ║
        └───────────────┘                            ╚═══════════════╝
                                                            │ scroll ▼
   t=1  echoes fully out                   scroll 100%  echoes retracted
        ╔═══════════════╗                            ┌───────────────┐
        ║  echo  echo   ║                            │   (collapsed)  │
        ║  ABOUT  ME    ║   ◀── retract ──           │  ▓▓ ABOUT ME ▓▓│
        ║  echo  echo   ║                            │   (collapsed)  │
        ╚═══════════════╝                            └───────────────┘

   LOAD = reverse of SCROLL.   They share the same expanded resting state,
   so scroll picks up exactly where load left off.
```

---

## 4. The design problem & the safe solution

The naive idea — "make the load tween the echo **rows** from collapsed→expanded"
— re-touches the exact properties (`clip-path`, `y`) the merge scrub owns. A
ScrollTrigger refresh mid-intro (font load, resize, image reflow from the other
sections) would snap the rows to the merge's `from` state and **clobber the load
animation**. This is the documented hazard.

### Solution: decouple onto a PER-ROW wrapper (layer-by-layer)

To mirror the scroll **layer-by-layer**, each echo row must emerge as its **own
layer** with its **own slide distance** — exactly the inverse of how the merge
slides each row its own distance into the solid. To do that without re-touching
the `clip-path`/`y` the merge owns on the rows, we wrap **each `.echoRow` in its
own wrapper** (`.echoCell`). The merge keeps animating the inner row; the load
animates the per-row wrapper. One wrapper per layer → layer-by-layer, and a
different element from the merge's target → no clobber.

```
   .stack
   ├── .echoGroup [data-group="top"]   (overflow:hidden — clips at the solid edge)
   │     ├── .echoCell ◀ LOAD layer ①   →  wraps  .echoRow ◀ MERGE owns (scroll)
   │     ├── .echoCell ◀ LOAD layer ②   →  wraps  .echoRow ◀ MERGE owns
   │     └── .echoCell ◀ LOAD layer ③   →  wraps  .echoRow ◀ MERGE owns
   ├── .solid  (the anchor — does its own slide-up, untouched by both)
   └── .echoGroup [data-group="bottom"]
         ├── .echoCell ◀ LOAD layer ④   →  wraps  .echoRow ◀ MERGE owns
         ├── .echoCell ◀ LOAD layer ⑤   →  wraps  .echoRow ◀ MERGE owns
         └── .echoCell ◀ LOAD layer ⑥   →  wraps  .echoRow ◀ MERGE owns
```

Because the merge's row state at scroll-top is the **expanded** state, and each
cell's load animation ends at **identity (transform none / clip open)**, the
composite at rest is the normal expanded masthead — scroll then drives the rows
from there. The cells sit at identity for the whole scroll, so they never
interfere. Nothing fights.

### How each cell makes its layer "emerge from the solid"

Each cell is the **exact inverse** of that row's merge motion — it starts where
the merge *ends* (row pulled to the solid centre + clipped shut) and animates
out to rest:

```
  per row r, reuse the merge's own distance formula:
    dy(r) = solid.centreY − row.centreY     (same value the merge slides INTO)

  LOAD start (collapsed, = merge END):       LOAD end (expanded, = merge "from"):
    .echoCell  y      = dy(r)                  y      = 0
    .echoCell  clip   = closed toward          clip   = inset(0 0 0 0)
               solid edge (per dir):
                 top rows   inset(0 0 100% 0)
                 bottom rows inset(100% 0 0 0)
```

```
        ┌─ cell① y:dy→0  clip:open ─┐  each layer slides OUT from the
        ┌─ cell② y:dy→0  clip:open ─┐  solid centre to its own resting
        ┌─ cell③ y:dy→0  clip:open ─┐  band, unfurling as it goes
        ═════════ SOLID ════════════   ◀ anchor, stays put
        └─ cell④ y:dy→0  clip:open ─┘
        └─ cell⑤ y:dy→0  clip:open ─┘
        └─ cell⑥ y:dy→0  clip:open ─┘
   The group's existing overflow:hidden hides each layer until it clears the
   solid edge — the same clip mechanism the scroll already relies on.
```

clip-path (not `scaleY`) keeps the glyph slices **revealed, not stretched** — no
distortion of the stroked text. The per-row `clip-path` + `y` on the cell are the
literal reverse of the merge's per-row `clip-path` + `y` on the row.

---

## 5. Proposed load sequence (new INTRO timeline)

```
delay 0.1s
 ├─ [data-solid]   yPercent 115 -> 0     (solid rises first — the anchor)   ~1.0s, expo.out
 ├─ cells (×6)     y dy->0  +  clip closed->open   (each layer its own dy)  ~0.9s, power3.out
 │                  starts ~0.55s in (overlaps solid settling) — "layers bloom out of solid"
 │                  stagger: { each: 0.06, from: "center" }  → centre layers emerge first
 └─ [data-reveal]  back-arrow fades/settles                                 ~0.8s, expo.out
```

The scroll retracts all layers **simultaneously** (no stagger). The load can do
the same for a perfect mirror, or add a light `from:"center"` stagger so the
layers peel out of the solid one ring at a time — **tunable**. Durations, overlap
offsets, easing are all tunable; defaults keep the current intro's timing feel.

---

## 6. Exact code changes

**`Echo.tsx` — JSX (small, structural):**

1. Wrap each `.echoRow` in a per-row cell, keeping `data-echo`/`data-dir`/band on
   the **inner row** (so the merge still targets the rows unchanged):
   ```
   <div className={styles.echoCell} data-cell data-dir={dir}>
     <div className={styles.echoRow + tone} data-band data-echo data-dir={dir}>
       <span className={styles.echoText}>{WORD}</span>
     </div>
   </div>
   ```
   The cell is a static, un-positioned flex item, so the merge's
   `row.offsetTop` (measured against `.hero`) is unchanged → merge geometry is
   byte-identical.

**`Echo.tsx` — inside the `no-preference` matchMedia branch only:**

2. Grab the cells: `const cells = gsap.utils.toArray('[data-cell]', section)`.
3. Compute each cell's inverse distance with the **same formula the merge uses**
   (read from the inner row, transform-free, so it re-derives on resize):
   `dy(cell) = solidRow.offsetTop + solidRow.offsetHeight/2 − (row.offsetTop + row.offsetHeight/2)`
   where `row = cell.querySelector('[data-echo]')`.
4. Replace the **echo portion** of the intro:
   - Remove `gsap.set(echoes, {autoAlpha:0, y:±16})` and the
     `intro.to(echoes, {autoAlpha:1, y:0, ...})` step.
   - Set each cell's collapsed start (JS only, **not CSS** — so reduced-motion
     stays expanded):
     `clipPath` = `up`→`inset(0% 0% 100% 0%)`, `down`→`inset(100% 0% 0% 0%)`;
     `y` = `dy(cell)`.
   - Add `intro.to(cells, { clipPath: "inset(0% 0% 0% 0%)", y: 0, stagger, ... })`
     timed to overlap the solid's rise.
5. Keep `[data-solid]` slide-up and `[data-reveal]` reveal as-is.
6. **Do not touch** the `merge` timeline, its `echoes` target, ScrollTrigger
   config, `pin`, `scrub`, `end`, or `immediateRender: false`. Lifecycle
   unchanged.
7. Cleanup: existing `return () => { intro.kill(); merge... }` already covers the
   intro; no new teardown (no new ScrollTrigger added).

**`Echo.module.css`:** add a minimal cell that adds no layout:
```
.echoCell { width: 100%; }          /* static flex item; gap stays on .echoGroup */
```
`.echoGroup` keeps its `overflow: hidden` (the per-layer emergence clip). Band
heights / `gap` stay on `.echoRow` / `.echoGroup` exactly as now. Optional:
`will-change: clip-path, transform` on `.echoCell` for smoother compositing.

---

## 7. Why this can't affect other sections

```
  ┌─ AboutPageHeroEcho ─┐  ← only this section changes
  │  INTRO  (no ScrollTrigger — pure timeline, touches nothing on scroll)
  │  MERGE  (pin+scrub — UNCHANGED, same pin spacing as before)
  ├─ Ledger
  ├─ Intro / Experience
  ├─ CurrentProject  (own ScrollTrigger)
  ├─ Contributions   (own ScrollTrigger)
  └─ Contact
```

- The load animation adds **no ScrollTrigger and no pin** → scroll length and
  every downstream section's pin/offset are byte-for-byte identical to today.
- It only animates `clip-path` + `transform` (compositor properties, **no
  layout/reflow**), so sibling sections never get pushed or re-measured.
- Initial collapsed state is set in **JS inside the `no-preference` branch**, so
  `prefers-reduced-motion` users still get the static, fully-expanded masthead
  (no hidden echoes). FOUC is avoided because `useGSAP` sets state in a
  layout-effect (pre-paint).
- The merge's lifecycle, `immediateRender:false`, and "meet-at-expanded-state"
  invariant are preserved → the documented refresh-clobber hazard is not
  reopened.

---

## 8. Risks / open decisions for you

1. **Layer-by-layer is the chosen model** (per your question). Each echo emerges
   as its own layer using the merge's own per-row distance — the exact reverse of
   the scroll. The fidelity/safety tension is resolved by the **per-row wrapper
   cell**: full per-layer fidelity *and* the merge lifecycle stays untouched.
2. **Stagger?** Default = a light `from:"center"` stagger (centre layers bloom
   first). Set stagger to 0 for a perfect simultaneous mirror of the scroll.
   Your call — easy to flip.
3. **Keep the solid slide-up?** Default = keep it (solid lands first, then the
   layers bloom out of it). Could instead have the solid simply present.
4. **clip vs. slide-only.** The cell does both `clip-path` (unfurl) + `y` (slide),
   matching the scroll. If you prefer a softer look we can drop the per-cell clip
   and rely on the group's `overflow:hidden` for the emergence (slide-only).

---

## 9. Verification (DONE — checked live via Playwright)

- [x] Load start state exact: all 6 layers collapsed precisely on the solid
      centre (delta 0–1px), clipped shut, each with its own slide distance.
- [x] Load end state: cells fully cleared (clip + transform), masthead expanded.
- [x] Scroll-merge converges exactly: every row lands on the solid centre at full
      pin (delta 0–1px), clip → `inset(…100%)`.
- [x] Pin intact: `.pin-spacer` ~1980px present → downstream sections shift as
      before; no new ScrollTrigger added; only clip-path/transform animated.
- [x] `prefers-reduced-motion`: whole effect gated inside the no-preference
      matchMedia branch → static full masthead, no hidden rows (CSS has no
      collapsed state; collapse is JS-only).

### Two bugs found & fixed during implementation
1. **`gsap.set` whole-vars function silently no-ops.** The original code passed
   the entire `vars` as a function; GSAP only honors **per-property** functions.
   Fixed by moving the function onto each property (`y`, `clipPath`).
2. **Cell wrapper broke the merge's slide formula.** `will-change: transform`
   (and the active transform) made each `.echoCell` a containing block, so the
   inner row's `offsetParent` became the cell and `row.offsetTop` collapsed to 0
   — corrupting the merge's `solidRow.offsetTop − row.offsetTop` distance (all
   rows → 495 instead of their true 333/237/141…). Fixed by removing
   `will-change: transform`, clearing the cell transform on intro complete, and
   refreshing the merge so it re-measures against `.hero`.

### Renamed attribute
`data-cell` → `data-echo-cell` to avoid colliding with the Contributions grid,
which also uses `[data-cell]`.
```
