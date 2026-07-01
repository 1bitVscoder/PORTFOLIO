# Animation Baseline — Pre-Tune Values

This file archives the animation timing values that were in place **before** the 60Hz Firefox/Linux smoothness audit. Restore these values if the new tuning ever feels too snappy or if a future design direction calls for the previous "luxurious lerp" character.

- **Date archived:** 2026-05-13
- **Commit at archive time:** `9268f15` (feat(hero): promote WebGL interactive background as sole implementation)
- **Reason for change:** Landing-page animations felt sluggish on 60Hz screens in Firefox on Linux. The stacked lerp of Lenis `duration: 3` × ScrollTrigger `scrub: 2.5` produced up to ~5s of trailing scroll input. Tuning to industry-premium defaults (Lenis docs default + typical Awwwards-tier scrub) restores responsiveness while preserving every animation's behavior and easing.

---

## 1. Lenis smooth scroll — `lib/LenisProvider.tsx`

**Original (line 36):**
```ts
const lenis = new Lenis({
  duration: 3,                                              // <-- ARCHIVED VALUE
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // easeOutExpo
  orientation: 'vertical',
  gestureOrientation: 'vertical',
  smoothWheel: true,
  touchMultiplier: 1.5,
});
```

**New value:** `duration: 1.2` (Lenis docs default).

**Notes:** `easing`, `touchMultiplier`, and all other Lenis options remain untouched. Only `duration` is changed.

---

## 2. Hero ScrollTrigger scrub — `components/sections/Hero/Hero.tsx`

**Original (lines 150–161):**
```ts
ScrollTrigger.create({
  trigger: spacer,
  start: 'top top',
  end: () => `+=${window.innerHeight * 1.0}`,
  scrub: 2.5,                       // <-- ARCHIVED VALUE
  animation: tl,
  invalidateOnRefresh: true,
  onRefresh: () => {
    spacer.style.height = `${hero.offsetHeight + window.innerHeight * 1.0}px`;
  },
});
```

**New value:** `scrub: 1.0`.

**Notes:** `start`, `end`, `invalidateOnRefresh`, and the `onRefresh` callback structure remain unchanged (the `onRefresh` body is extended to re-seed the flying-letter font-size on resize per the FLIP fix in Track 2).

---

## 3. Hero FLIP — fontSize → scale (Track 2)

**Original (Hero.tsx lines 80–91, 124–139):** The flying letters animated their `fontSize` property on every scrub frame using functional getters. This caused per-frame layout invalidation. Original tween shape:

```ts
// Phase 0 — snap to source size
tl.to(flyingM, {
  x: () => getRelPos(targetM).x,
  y: () => getRelPos(targetM).y,
  fontSize: () => parseFloat(getComputedStyle(targetM).fontSize),  // <-- ARCHIVED
  duration: 0.001,
}, 0);

// Phase 5 — fly + shrink to navbar via fontSize
tl.to(flyingM, {
  x: () => getRelPos(navBrandM).x,
  y: () => getRelPos(navBrandM).y,
  fontSize: () => parseFloat(getComputedStyle(navBrandM).fontSize),  // <-- ARCHIVED
  scale: 1,
  duration: 0.65,
  ease: 'power2.inOut',
}, 0.06);
```

**Replacement strategy:** Set source `fontSize` once via `gsap.set` (one-time layout cost on setup, not on every scrub frame); animate the `scale` property toward `navFontSize / sourceFontSize` ratio. Visually identical end state, zero per-frame layout invalidation.

---

## 4. WelcomeScreen initials reveal — filter blur

**Original (WelcomeScreen.tsx lines 115–155):**
```ts
gsap.set(initialsRef.current, {
  scale: 1.5,
  opacity: 0,
  filter: 'blur(0px)'           // <-- ARCHIVED
});

// 3. Initials Reveal
tl.fromTo(initialsRef.current,
  {
    scale: 1.2,
    opacity: 0,
    filter: 'blur(5px)'         // <-- ARCHIVED
  },
  {
    scale: 1,
    opacity: 1,
    filter: 'blur(0px)',        // <-- ARCHIVED
    duration: 0.5,
    ease: "power2.out"
  }
);
```

**Replacement:** Drop the `filter` properties entirely. Reveal becomes `scale: 1.2 → 1` + `opacity: 0 → 1`. The blur was a subtle 0.5s ramp; visual difference is minimal but Firefox-Linux paint cost was high.

---

## 5. WelcomeScreen background fade — backgroundColor tween

**Original (WelcomeScreen.tsx lines 226–238):**
```ts
if (containerRef.current) {
  const startBg = getComputedStyle(containerRef.current).backgroundColor;
  const transparentBg = startBg.startsWith("rgba")
    ? startBg.replace(/[\d.]+\s*\)$/, "0)")
    : startBg.replace("rgb(", "rgba(").replace(")", ", 0)");
  gsap.to(containerRef.current, {
    backgroundColor: transparentBg,         // <-- ARCHIVED (paint property)
    duration: 0.8,
    ease: "power2.inOut",
    delay: 0.4
  });
}
```

**Replacement:** Tween `opacity: 0` on the container itself (composite-only). Visually equivalent because the container's children (greetings + initials) have already been hidden by their own tweens by the time this delay starts.

---

## Restoration

To restore any of the original values, copy the archived snippet back into the source file at the specified line. No other files depend on the new values — `useGSAP` dependencies, ScrollTrigger refresh, and the welcome-handoff event sequencing all work with either set of values.
