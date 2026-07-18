"use client";

import Image from "next/image";
import { Fragment, useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { TransitionLink, useTransition } from "@/components/transitions";
import { useAccentColor } from "@/lib/AccentColorContext";
import type { CaseStudyHeroContent } from "@/data";
import styles from "./Hero.module.css";

// ── Animation tuning constants (file-local; do not export) ──
// Total scroll distance of the pinned grow phase, in viewport heights.
// 0.25 intro fade-out + 1.0 grow + 0.1 hold tail = 1.35 TL units ≈ 1.35 vh.
const HERO_PIN_VH = 1.35;
// Badge fade trigger ends at this fraction of vh (badge gone halfway through pin).
const HERO_BADGE_FADE_VH = 0.5;
// Exit phase: card travels from pin-end to this offset in vh (pin-end + 1 vh).
const HERO_EXIT_END_VH = 2.35;
// Max parallax offset for the image inner on mouse move (pixels, ±).
const HERO_PARALLAX_PX = 6;
// Per-letter stagger duration for the title portal entrance (seconds).
const HERO_LETTER_STAGGER = 0.08;
// yPercent used to hide lede word-inners before they reveal.
const HERO_LEDE_HIDE_YPCT = 110;

// Portal-entry directions (matches landing hero — letter slides in from
// outside its own mask along one of four cardinal axes).
const PORTAL_DIRECTIONS = [
  { x: 0, y: -110 },
  { x: 0, y: 110 },
  { x: -110, y: 0 },
  { x: 110, y: 0 },
] as const;

const randomPortalDirection = () =>
  PORTAL_DIRECTIONS[Math.floor(Math.random() * PORTAL_DIRECTIONS.length)];

export function Hero({
  title,
  lede,
  image,
  alt,
  pills,
  badge,
  backHref,
}: CaseStudyHeroContent) {
  const ledeWords = lede.split(" ");
  const { color: currentAccent } = useAccentColor();
  const sectionRef = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLSpanElement>(null);
  const backRef = useRef<HTMLAnchorElement>(null);
  const metaRef = useRef<HTMLDivElement>(null);
  const ledeRef = useRef<HTMLParagraphElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  const { hasEntered } = useTransition();

  // ── ON-LOAD entrance ──
  // (a) Title — each letter sits inside its own overflow:hidden
  //     mask; the inner span starts pushed 110% along a random cardinal
  //     direction and slides home with a staggered cascade. Mirrors the
  //     landing-hero portal pattern so the case-study reads as a
  //     continuation of the same motion language.
  // (b) Lede paragraph — each word is wrapped in its own mask; we group
  //     masks by their post-layout offsetTop to recover visual lines
  //     (since wrapping is responsive), then animate inner spans up
  //     from yPercent:110 → 0 with a per-line stagger so each row of
  //     text rises from its own baseline.
  useGSAP(
    () => {
      if (!hasEntered) return;
      const title = titleRef.current;
      const lede = ledeRef.current;
      if (!title) return;

      const innerLetters = title.querySelectorAll<HTMLElement>(
        `.${styles.titleLetterInner}`
      );
      const ledeMasks = lede
        ? lede.querySelectorAll<HTMLElement>(`.${styles.ledeWord}`)
        : null;
      const ledeInners = lede
        ? lede.querySelectorAll<HTMLElement>(`.${styles.ledeWordInner}`)
        : null;

      if (!innerLetters.length) return;

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Title — per-letter portal entrance.
        innerLetters.forEach((el) => {
          const dir = randomPortalDirection();
          gsap.set(el, { xPercent: dir.x, yPercent: dir.y });
        });

        const titleTween = gsap.to(innerLetters, {
          xPercent: 0,
          yPercent: 0,
          duration: 0.6,
          ease: "power2.out",
          stagger: HERO_LETTER_STAGGER,
          delay: 0.1,
        });

        // Back link — sits above the pills and shares their reading-order
        // entrance so the back-to-home affordance is visible from frame one.
        const backEl = backRef.current;
        let backTween: gsap.core.Tween | null = null;
        if (backEl) {
          gsap.set(backEl, { autoAlpha: 0, y: 8 });
          backTween = gsap.to(backEl, {
            autoAlpha: 1,
            y: 0,
            duration: 0.45,
            ease: "power2.out",
            delay: 0,
            clearProps: "transform",
          });
        }

        // Pills — top-of-cascade entrance (fires earliest so the eye
        // moves from pills → title → lede in reading order).
        const pillEls = metaRef.current
          ? metaRef.current.querySelectorAll<HTMLElement>(`.${styles.pill}`)
          : null;
        let pillsTween: gsap.core.Tween | null = null;
        if (pillEls && pillEls.length) {
          gsap.set(pillEls, { autoAlpha: 0, y: 12 });
          pillsTween = gsap.to(pillEls, {
            autoAlpha: 1,
            y: 0,
            duration: 0.5,
            ease: "power2.out",
            stagger: 0.07,
            delay: 0.05,
            clearProps: "transform",
          });
        }

        // Badge — late flourish; rests at the CSS-defined 8deg tilt so
        // the final rotation value is 8 (not 0). Initial rotation:-45
        // gives the pop room to swing into place.
        const badge = badgeRef.current;
        let badgeTween: gsap.core.Tween | null = null;
        if (badge) {
          gsap.set(badge, { autoAlpha: 0, scale: 0, rotation: -45 });
          badgeTween = gsap.to(badge, {
            autoAlpha: 1,
            scale: 1,
            rotation: 8,
            duration: 0.7,
            ease: "back.out(1.4)",
            delay: 0.6,
            // Hand transform back to the CSS rotate(8deg) baseline once the
            // pop completes, so the :hover rule can compose without GSAP's
            // inline transform shadowing it.
            clearProps: "transform",
          });
        }

        // Lede — line-grouped baseline reveal. Group word masks by
        // their offsetTop (rounded to absorb sub-pixel rounding) so
        // every word on the same wrapped line shares one tween.
        let ledeTL: gsap.core.Timeline | null = null;
        if (ledeMasks && ledeInners && ledeMasks.length) {
          const lineMap = new Map<number, HTMLElement[]>();
          ledeMasks.forEach((mask, i) => {
            const key = Math.round(mask.offsetTop);
            if (!lineMap.has(key)) lineMap.set(key, []);
            lineMap.get(key)!.push(ledeInners[i]);
          });
          const lineGroups = [...lineMap.entries()]
            .sort(([a], [b]) => a - b)
            .map(([, els]) => els);

          gsap.set(ledeInners, { yPercent: HERO_LEDE_HIDE_YPCT });

          ledeTL = gsap.timeline({ delay: 0.4 });
          lineGroups.forEach((group, lineIdx) => {
            ledeTL!.to(
              group,
              { yPercent: 0, duration: 0.7, ease: "power2.out" },
              lineIdx * 0.12
            );
          });
        }

        return () => {
          titleTween.kill();
          gsap.set(innerLetters, { clearProps: "transform" });
          if (backTween) backTween.kill();
          if (backEl) gsap.set(backEl, { clearProps: "all" });
          if (pillsTween) pillsTween.kill();
          if (pillEls) gsap.set(pillEls, { clearProps: "all" });
          if (badgeTween) badgeTween.kill();
          if (badge) gsap.set(badge, { clearProps: "all" });
          if (ledeTL) ledeTL.kill();
          if (ledeInners) gsap.set(ledeInners, { clearProps: "transform" });
        };
      });
    },
    { scope: sectionRef, dependencies: [hasEntered] }
  );

  // ── IDLE PARALLAX ── Subtle viewport-driven mouse follow on the
  // image inner so the framed photo feels alive at rest. ±6px max
  // translate is small enough not to fight the master scroll-grow's
  // scale fromTo, and quickTo lerps between targets so per-frame
  // updates stay cheap. Touch and reduced-motion users skip it.
  useGSAP(
    () => {
      const inner = innerRef.current;
      if (!inner) return;

      const mm = gsap.matchMedia();

      mm.add(
        "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
        () => {
          const xTo = gsap.quickTo(inner, "x", {
            duration: 0.7,
            ease: "power2.out",
          });
          const yTo = gsap.quickTo(inner, "y", {
            duration: 0.7,
            ease: "power2.out",
          });

          const handleMove = (e: MouseEvent) => {
            const nx = (e.clientX / window.innerWidth) * 2 - 1;
            const ny = (e.clientY / window.innerHeight) * 2 - 1;
            xTo(nx * HERO_PARALLAX_PX);
            yTo(ny * HERO_PARALLAX_PX);
          };

          window.addEventListener("mousemove", handleMove, { passive: true });

          return () => {
            window.removeEventListener("mousemove", handleMove);
            gsap.set(inner, { clearProps: "x,y" });
          };
        }
      );
    },
    { scope: sectionRef }
  );

  useGSAP(
    () => {
      const section = sectionRef.current;
      const card = cardRef.current;
      if (!section || !card) return;

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Re-parent card to <body> AND make it position: fixed from the
        // start. ScrollTrigger pin leaves a transform on the section to
        // maintain layout, and any ancestor with a transform becomes the
        // containing block for fixed descendants — breaking viewport-
        // relative fixing. Living on body with position:fixed means the
        // card is always anchored to the actual viewport, and we animate
        // from there to full-bleed. The card stays in place throughout
        // the intro phase (no scroll movement) and only moves/grows in P2.
        //
        // ── RESIZE-FIX: in-flow placeholder ──
        // Before re-parenting, we leave a hidden placeholder div at the
        // card's original DOM position with the SAME .imageCard class
        // (minus visual content). It preserves the natural layout slot
        // and lets us re-measure "where the card would sit at the
        // current viewport" on every ScrollTrigger refresh — which is
        // what we use to recover from window resizes.
        const originalParent = card.parentElement;
        // Resolve --card-radius to a concrete px value *before* the card
        // is re-parented. getComputedStyle on a custom property returns
        // the unresolved clamp() string, which GSAP can't tween or
        // reverse; borderRadius is the shorthand, which IS resolved to
        // px — but only after styles have applied against the current
        // ancestor chain. Read it now while the card is still in its
        // grid slot, fully styled. (If we read after appendChild(body),
        // the computed value can come back 0 in a race with the
        // re-parent, which silently squashes the rounded corners.)
        const initialRadiusPx =
          parseFloat(getComputedStyle(card).borderRadius) || 0;

        const placeholder = document.createElement("div");
        placeholder.className = card.className;
        // Placeholder carries the image semantics so screen-reader
        // reading order stays inside the section. The body-fixed card
        // below is marked aria-hidden as the decorative visual.
        placeholder.setAttribute("role", "img");
        placeholder.setAttribute("aria-label", alt);
        // The card visual now lives on <body> for ScrollTrigger reasons;
        // hide it from AT so the alt text isn't announced at the end of
        // the document, orphaned from the case-study context.
        card.setAttribute("aria-hidden", "true");
        card.setAttribute("role", "presentation");
        // Stamp inline rules so the placeholder mirrors the card's outer
        // box without rendering shadow / radius / children — invisible,
        // non-interactive, but layout-active.
        placeholder.style.visibility = "hidden";
        placeholder.style.boxShadow = "none";
        placeholder.style.borderRadius = "0";
        placeholder.style.pointerEvents = "none";
        // .imageCard sets will-change to 5 props; inheriting that on a
        // measurement-only div pins a permanent compositor layer for
        // nothing. The placeholder never animates, so opt out explicitly.
        placeholder.style.willChange = "auto";
        if (originalParent) {
          originalParent.insertBefore(placeholder, card);
        }
        document.body.appendChild(card);

        // Reads the placeholder's current rect (which always reflects
        // the live, post-resize layout slot) and re-applies the
        // fixed-position coordinates to the card.
        //
        // Defensive `y: 0`: the exit timeline animates `y` (transform)
        // independently of `top`. Without an explicit reset here, a
        // resize triggered while the user has scrolled past the exit
        // range would leave the previous translateY in place during
        // the brief window before the exit ScrollTrigger re-renders
        // its scrub. invalidateOnRefresh on the exit trigger immediately
        // re-writes the correct `y` for the new viewport, but starting
        // each placeCard pass from a deterministic transform state
        // avoids one-frame visual hiccups.
        const placeCard = () => {
          const r = placeholder.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) return;
          gsap.set(card, {
            left: r.left,
            top: r.top,
            width: r.width,
            height: r.height,
            y: 0,
          });
        };

        gsap.set(card, {
          position: "fixed",
          margin: 0,
          zIndex: 5,
          autoAlpha: 0,
          // The body-fixed card has no interactive children (the back link
          // lives in .metaCol, not inside the figure). After the exit
          // timeline translates the card to top:-vh its lower edge sits
          // flush with y=0 of the viewport — intercepting clicks on
          // downstream sections (e.g. Toggle's "List" button at scroll
          // ≈ 7560px). Drop pointer-events from the start so the figure is
          // purely decorative w.r.t. hit-testing.
          pointerEvents: "none",
          "--card-radius": initialRadiusPx + "px",
        });
        placeCard();

        // ── ON-LOAD card fade-in ── Card box is locked in place by the
        // gsap.set above, so a pure autoAlpha tween won't perturb the
        // measurements the master scroll-timeline relies on. Runs
        // independently of the scrubbed master TL.
        const cardEntranceTween = gsap.to(card, {
          autoAlpha: 1,
          duration: 0.8,
          delay: 0.2,
          ease: "power3.out",
        });

        // ── PINNED MASTER TIMELINE ── Two pin triggers on the same
        // element don't accumulate pin distance (they share one
        // pin-spacer sized for the first), so intro fade and grow are
        // sequenced in a single timeline under a single pin trigger.
        // Total normalised duration: 1.35 (0.25 fade-out + 1.0 grow +
        // 0.1 hold tail at full-bleed). Pin scroll range is mapped to
        // the same 1.35 × vh so 1 timeline-unit ≈ 1 vh of scroll.
        const masterTL = gsap
          .timeline()
          // Intro fade — plays in the first 0.5 units of the timeline.
          // Explicit fromTo (with immediateRender:false on the FROM
          // vars so the entrance tweens still own the initial paint).
          // Why explicit: the master ScrollTrigger has
          // invalidateOnRefresh:true, which on every resize calls
          // .invalidate() on these tweens. A lazy `to(...)` would then
          // re-record its FROM by reading the DOM at the *exact* frame
          // the pin is being rebuilt — capturing the un-pinned, mid-
          // reflow position — and render one bad frame at progress~0
          // before settling. fromTo's FROM is config, not DOM-derived,
          // so invalidate is a no-op for the start state and the text
          // stays put through pin-spacer churn.
          .fromTo(
            [metaRef.current, ledeRef.current],
            { autoAlpha: 1, y: 0, immediateRender: false },
            { autoAlpha: 0, y: -20, ease: "power2.in", duration: 0.5 },
            0
          )
          .fromTo(
            titleRef.current,
            { autoAlpha: 1, y: 0, immediateRender: false },
            { autoAlpha: 0, y: 60, ease: "power2.in", duration: 0.5 },
            0.05
          )
          // Grow — starts as the intro is finishing so the transition
          // feels continuous. Runs for 1 unit (≈ 1 vh of scroll).
          .to(
            card,
            {
              left: 0,
              top: 0,
              width: () => window.innerWidth,
              height: () => window.innerHeight,
              ease: "power2.inOut",
              duration: 1,
            },
            0.25
          )
          .fromTo(
            innerRef.current,
            { scale: 1.04 },
            { scale: 1, ease: "none", duration: 1 },
            0.25
          )
          // Fade box-shadow out as the card reaches full-bleed — at full
          // scale there's no surrounding canvas for a shadow to land on.
          .to(
            card,
            {
              boxShadow: "0 0 0 0 rgba(0, 0, 0, 0)",
              ease: "power2.inOut",
              duration: 1,
            },
            0.25
          )
          // Hold rounded corners until ~80% of the grow, then snap.
          // Explicit fromTo with immediateRender:false. Why: the master
          // ScrollTrigger has invalidateOnRefresh:true, which on every
          // refresh wipes recorded from/to and lookahead-renders each
          // tween to re-capture them. A lazy `to({--card-radius:'0px'})`
          // has no explicit FROM, so the lookahead pass writes TO ('0px')
          // to the DOM and never undoes it — leaving the card flat-
          // cornered at progress 0. fromTo's FROM is config, so the
          // lookahead can't override it, and immediateRender:false keeps
          // the value untouched until the tween's time-1.05 slot
          // actually plays during scrub.
          .fromTo(
            card,
            { "--card-radius": initialRadiusPx + "px", immediateRender: false },
            {
              "--card-radius": "0px",
              ease: "power2.out",
              duration: 0.22,
            },
            1.05
          );

        ScrollTrigger.create({
          trigger: section,
          start: "top top",
          end: () => "+=" + window.innerHeight * HERO_PIN_VH,
          pin: true,
          pinType: "fixed",
          scrub: 0.5,
          animation: masterTL,
          anticipatePin: 1,
          // Force function-based start/end values AND the tween end-values
          // (e.g. width: () => window.innerWidth) inside masterTL to
          // re-evaluate on every refresh. Refresh fires automatically on
          // window resize — exactly what the resize fix needs.
          invalidateOnRefresh: true,
        });

        // ── BADGE SCROLL-FADE ── Lives outside the master timeline so
        // the on-load pop tween (delay 0.6s) can't be clobbered by the
        // master TL's lazy fromState capture. Explicit fromTo values +
        // immediateRender:false guarantees the badge is read as
        // (autoAlpha:1, scale:1) the first time the user scrolls into
        // this trigger's range — no matter what state the entrance
        // tween is in at that moment.
        const badgeFadeTL = gsap.fromTo(
          badgeRef.current,
          { autoAlpha: 1, scale: 1, immediateRender: false },
          { autoAlpha: 0, scale: 0.6, ease: "power2.in" }
        );

        ScrollTrigger.create({
          trigger: section,
          start: "top top",
          end: () => "+=" + window.innerHeight * HERO_BADGE_FADE_VH,
          scrub: 0.5,
          animation: badgeFadeTL,
          invalidateOnRefresh: true,
        });

        // ── EXIT (unpinned, 1:1 scrub) ── As the page scrolls 1 vh
        // past the pin, the card translates 1 vh upward, linearly.
        // The ledger sits in document flow immediately after the
        // section, so it climbs into the viewport at the same rate —
        // bottom-of-card and top-of-ledger share one line throughout,
        // and the card is fully off-screen at the moment the ledger
        // lands at viewport top.
        //
        // Uses `y` (transform) instead of `top`: the master grow tween
        // owns the `top` property (animates it to 0 as part of the
        // full-bleed grow, then holds at 0 through its tail). If exit
        // wrote `top: -vh` too, a ScrollTrigger.refresh() triggered by
        // a downstream pin (e.g. Pull) re-applies both timelines to
        // their progress-1 states in registration order — master last,
        // overwriting exit's translation and stranding the card at
        // top:0 over downstream sections. Animating `y` keeps the two
        // timelines on disjoint properties so their final states
        // compose: card stays at top:0 with transform:translateY(-vh).
        const exitTL = gsap.timeline().to(
          card,
          {
            y: () => -window.innerHeight,
            ease: "none",
            duration: 1,
          },
          0
        );

        ScrollTrigger.create({
          trigger: section,
          start: () => window.innerHeight * HERO_PIN_VH,
          end: () => window.innerHeight * HERO_EXIT_END_VH,
          scrub: true,
          animation: exitTL,
          invalidateOnRefresh: true,
        });

        // ── RESIZE RECOVERY ── ScrollTrigger fires `refresh` on window
        // resize (after the browser has reflowed). At that moment the
        // placeholder's rect reflects the new layout slot, so re-running
        // `placeCard()` snaps the body-fixed card back to where it
        // would naturally sit. No progress guard — the previous
        // `progress <= 0` guard tripped on microscopic float noise (e.g.
        // 8e-7 from scrub lag / `anticipatePin: 1`) and silently skipped
        // recovery on every refresh after the first. The master
        // ScrollTrigger has `invalidateOnRefresh: true`, so the grow
        // tween will re-record its FROM values against the freshly
        // placed card the next time progress moves; mid-scrub, this
        // matches the new natural slot exactly. `refreshInit` fires
        // before the browser reflow and reads stale placeholder
        // coordinates, so it cannot be used here.
        const onRefresh = () => {
          placeCard();
        };
        ScrollTrigger.addEventListener("refresh", onRefresh);

        return () => {
          ScrollTrigger.removeEventListener("refresh", onRefresh);
          cardEntranceTween.kill();
          // st.kill() defaults to false and leaves masterTL, badgeFadeTL,
          // and exitTL (plus their nested tweens with refs into the card /
          // meta / title / lede DOM) in memory across mount/unmount cycles.
          // Pass true so the bound animations get killed alongside their triggers.
          ScrollTrigger.getAll().forEach((st) => {
            if (st.trigger === section || st.pin === card) st.kill(true);
          });
          gsap.set(card, { clearProps: "all" });
          // Drop the AT-hiding attributes we stamped on the card so the
          // next mount cycle starts from a clean slate.
          card.removeAttribute("aria-hidden");
          card.removeAttribute("role");
          if (placeholder.isConnected) {
            placeholder.remove();
          }
          if (originalParent?.isConnected && card.parentElement !== originalParent) {
            originalParent.appendChild(card);
          } else if (card.parentElement === document.body) {
            // Original slot is gone (section unmounted — route change,
            // hot reload, matchMedia revocation). Without this branch the
            // card stays parented to <body> for the rest of the page
            // lifetime as an orphan fixed-position figure.
            card.remove();
          }
        };
      });
    },
    { scope: sectionRef }
  );

  return (
    <section ref={sectionRef} className={styles.hero}>
      {/* Hidden width-only sizer — mirrors the wordmark's per-letter
          inline-block structure so its rendered width matches the
          visible title to the pixel. See .titleSizer in CSS. */}
      <span className={styles.titleSizer} aria-hidden="true">
        {/* key={i}: source is `title` — a static build-time prop, never reordered. */}
        {title.split("").map((letter, i) => (
          <span key={i} className={styles.titleLetter}>
            {letter}
          </span>
        ))}
      </span>
      <div className={styles.top}>
        <div ref={metaRef} className={styles.metaRow}>
          <TransitionLink
            ref={backRef}
            href={backHref ?? "/"}
            className={styles.backLink}
            aria-label="Back to home"
            payload={{ accent: currentAccent }}
          >
            <span aria-hidden="true">←</span>
          </TransitionLink>
          {pills?.map((pillText, i) => {
            const isLast = i === pills.length - 1;
            return (
              <span
                key={pillText}
                className={
                  isLast
                    ? `${styles.pill} ${styles.pillSolid}`
                    : styles.pill
                }
              >
                {pillText}
              </span>
            );
          })}
        </div>
        <p ref={ledeRef} className={styles.lede}>
          {/* key={i}: source is `lede` — a static build-time prop split at spaces, never reordered. */}
          {ledeWords.map((word, i) => (
            <Fragment key={i}>
              <span className={styles.ledeWord}>
                <span className={styles.ledeWordInner}>{word}</span>
              </span>
              {i < ledeWords.length - 1 ? " " : null}
            </Fragment>
          ))}
        </p>
      </div>

      <div className={styles.middle}>
        <figure ref={cardRef} className={styles.imageCard}>
          <div ref={innerRef} className={styles.imageInner}>
            <Image
              src={image}
              alt={alt}
              width={2400}
              height={1500}
              sizes="(min-width: 1512px) 1400px, 90vw"
              priority
              unoptimized
            />
          </div>
          {badge && (
            <span ref={badgeRef} className={styles.badge} aria-hidden="true">
              {badge.split("\n").map((line, i, arr) => (
                <Fragment key={i}>
                  {line}
                  {i < arr.length - 1 && <br />}
                </Fragment>
              ))}
            </span>
          )}
        </figure>
      </div>

      <h1 ref={titleRef} className={styles.titleText} aria-label={title}>
        {/* key={index}: source is `title` — a static build-time prop, never reordered. */}
        {title.split("").map((letter, index) => (
          <span
            key={index}
            className={styles.titleLetter}
            aria-hidden="true"
          >
            <span className={styles.titleLetterInner}>{letter}</span>
          </span>
        ))}
      </h1>
    </section>
  );
}
