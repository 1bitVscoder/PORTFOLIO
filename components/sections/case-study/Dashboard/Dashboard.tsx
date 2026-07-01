"use client";

import Image from "next/image";
import { Fragment, useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import type { DashboardContent } from "@/data";
import styles from "./Dashboard.module.css";

// ── Animation tuning constants (file-local; do not export) ──
// Scroll range for the pinned shrink: 0.85 shrink + 0.05 gap + 0.15
// overlay fade-in (1.05 TL units) + ~0.15 vh hold tail ≈ 1.2 vh total.
const DASHBOARD_PIN_VH = 1.2;

export const Dashboard = ({ badge, figcaption, image, alt }: DashboardContent) => {
  const sectionRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLSpanElement>(null);
  const cornerRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const section = sectionRef.current;
      const frame = frameRef.current;
      const image = imageRef.current;
      const slot = slotRef.current;
      if (!section || !frame || !image || !slot) return;

      // useGSAP scope auto-reverts mm on unmount; no explicit
      // mm.revert() needed in the cleanup return.
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Hidden placeholder defines the parked rect — same width /
        // aspect-ratio rule as the case-study Hero's `imageCard`
        // (clamp(420px, 54%, 920px) / 16:10) so the two animations
        // bookend at matching sizes. Coordinates are returned
        // relative to the section, since the frame is absolutely
        // positioned inside it. Zero-rect guard mirrors Hero's
        // placeCard(): if the slot is briefly mid-reflow the rect
        // can return 0×0, which would otherwise tween the frame to
        // a zero-size collapse — fall back to full-bleed so the
        // visible state stays at the FROM until the next valid
        // measurement.
        const computeTarget = () => {
          const t = slot.getBoundingClientRect();
          if (t.width === 0 || t.height === 0) {
            return {
              left: 0,
              top: 0,
              width: window.innerWidth,
              height: window.innerHeight,
            };
          }
          const s = section.getBoundingClientRect();
          return {
            left: t.left - s.left,
            top: t.top - s.top,
            width: t.width,
            height: t.height,
          };
        };

        // Read the slot's resolved corner radius from a per-corner
        // property — `borderRadius` (shorthand) can serialize as an
        // empty string or a 4-value string depending on the browser
        // when the value originates from a clamp()-resolved variable,
        // which then parseFloats to 0 and silently kills the radius
        // tween. `borderTopLeftRadius` always returns a single
        // resolved length. Called inline from the tween function-based
        // vars so each `invalidateOnRefresh` re-evaluation re-reads
        // the post-resize value — no staleness window from listener
        // ordering of the `refresh` event.
        const readRadius = () =>
          parseFloat(getComputedStyle(slot).borderTopLeftRadius) || 0;

        // ── PINNED SHRINK TIMELINE ──
        // Frame starts at full-bleed of the pinned section
        // (inset:0, radius:0, no shadow) and tweens to the placeholder
        // slot rect. Inner image keeps the subtle parallax that lived
        // on the previous Dashboard animation. Badge + corner fade in
        // only after the card has parked, so the overlays never crowd
        // the full-bleed phase.
        const masterTL = gsap
          .timeline()
          .fromTo(
            frame,
            {
              left: 0,
              top: 0,
              width: () => window.innerWidth,
              height: () => window.innerHeight,
              "--card-radius": "0px",
              boxShadow: "0 0 0 0 rgba(0, 0, 0, 0)",
              immediateRender: false,
            },
            {
              left: () => computeTarget().left,
              top: () => computeTarget().top,
              width: () => computeTarget().width,
              height: () => computeTarget().height,
              "--card-radius": () => readRadius() + "px",
              boxShadow:
                "0 30px 80px -20px rgba(27, 32, 40, 0.18)",
              ease: "power2.inOut",
              duration: 0.85,
            },
            0
          )
          .fromTo(
            image,
            { scale: 1.06, yPercent: -3 },
            {
              scale: 1,
              yPercent: 0,
              ease: "none",
              duration: 0.85,
            },
            0
          )
          .fromTo(
            [badgeRef.current, cornerRef.current],
            { autoAlpha: 0, immediateRender: false },
            {
              autoAlpha: 1,
              duration: 0.15,
              ease: "power2.out",
              stagger: 0.04,
            },
            0.9
          );

        const pin = ScrollTrigger.create({
          trigger: section,
          start: "top top",
          end: () => "+=" + window.innerHeight * DASHBOARD_PIN_VH,
          pin: true,
          pinType: "fixed",
          scrub: 0.5,
          animation: masterTL,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        });

        return () => {
          // Capture scrollY before kill() removes the pin-spacer; restoring
          // it afterward prevents the document-height collapse from clamping
          // the scroll position and jumping the page on route-change or
          // StrictMode remount. Matches the Archive / Contact pattern.
          const savedScrollY = window.scrollY;
          // Pass true so the bound timeline (and its nested tweens with refs
          // into frame / image / badge / corner) is killed alongside the trigger.
          pin.kill(true);
          gsap.set(frame, { clearProps: "all" });
          // Scoped clearProps so cleanup doesn't strip next/image's
          // inline placeholder styles in dev StrictMode double-mount.
          gsap.set(image, { clearProps: "scale,yPercent,transform" });
          gsap.set([badgeRef.current, cornerRef.current], {
            clearProps: "all",
          });
          // Restore scroll position if the pin-spacer removal shortened the
          // document and caused the browser to clamp scrollY.
          if (window.scrollY !== savedScrollY) window.scrollTo(0, savedScrollY);
        };
      });
    },
    { scope: sectionRef }
  );

  // A11y: only the <figure> below is announced to assistive tech. The
  // `slotWrap` div is a measurement-only spacer that preserves the
  // section's layout height while the figure is body-fixed (position:
  // fixed in styles.frame). It is aria-hidden + role="presentation" so
  // screen readers skip it entirely and announce the figure's
  // figcaption exactly once.
  return (
    <section ref={sectionRef} className={styles.dashboard}>
      <div className={styles.slotWrap} aria-hidden="true">
        <div className={styles.slotContainer}>
          <div
            ref={slotRef}
            className={styles.slot}
            role="presentation"
          />
        </div>
      </div>
      <figure ref={frameRef} className={styles.frame}>
        <Image
          ref={imageRef}
          className={styles.image}
          src={image}
          alt={alt}
          width={2400}
          height={1500}
          sizes="(min-width: 1512px) 1440px, 100vw"
        />
        {badge && (
          <span ref={badgeRef} className={styles.badge} aria-hidden>
            {badge.split("\n").map((line, i, arr) => (
              <Fragment key={i}>
                {line}
                {i < arr.length - 1 && <br />}
              </Fragment>
            ))}
          </span>
        )}
        {figcaption && (
          <figcaption ref={cornerRef} className={styles.corner}>
            {figcaption}
          </figcaption>
        )}
      </figure>
    </section>
  );
};
