"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useBlockFadeIn } from "@/lib/useBlockFadeIn";
import { useWordLineReveal } from "@/lib/useWordLineReveal";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { animationConfig } from "@/data";
import type { ToggleContent, ToggleScreen } from "@/data";
import { MetaLabel } from "@/components/ui/MetaLabel";
import styles from "./Toggle.module.css";

const cs = animationConfig.caseStudy;

type Mode = "gallery" | "list";

export const Toggle = ({ label, titleLine1, titleAccent, screens }: ToggleContent) => {
  const totalPad = String(screens.length).padStart(2, "0");
  const galleryEntries: { screen: ToggleScreen; indexInAll: number }[] = screens.flatMap(
    (s, i) => (s.hasGalleryCaption ? [{ screen: s, indexInAll: i }] : [])
  );

  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const modesRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const modeButtonsRef = useRef<Record<Mode, HTMLButtonElement | null>>({
    gallery: null,
    list: null,
  });

  const [mode, setMode] = useState<Mode>("list");
  const eyebrowId = useId();

  // NOTE (F-IN-08): The rAF focus call assumes both mode buttons are always
  // mounted. Roving-tabindex focus management breaks if either button is
  // conditionally unmounted — keep both rendered at all times.
  const selectMode = (target: Mode) => {
    setMode(target);
    requestAnimationFrame(() => modeButtonsRef.current[target]?.focus());
  };

  // 2-radio group: prev/next collapse to "the other one"; arrow handlers are
  // intentionally symmetric. Kept as one case so the WAI-ARIA contract is
  // explicit and trivially extends if a third mode is added.
  const handleModeKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    switch (e.key) {
      case "ArrowLeft":
      case "ArrowUp":
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        selectMode(mode === "gallery" ? "list" : "gallery");
        break;
      case "Home":
        e.preventDefault();
        selectMode("gallery");
        break;
      case "End":
        e.preventDefault();
        selectMode("list");
        break;
    }
  };
  // Preview position is driven by gsap.quickTo (spring-like follow) on
  // every mousemove. Pumping setState here would re-render the list on
  // every mouse tick. visible + active index stay in state because they
  // flip on enter/leave only — at most once per row.
  const [preview, setPreview] = useState<{ visible: boolean; index: number }>(
    { visible: false, index: 0 }
  );
  const xToRef = useRef<ReturnType<typeof gsap.quickTo> | null>(null);
  const yToRef = useRef<ReturnType<typeof gsap.quickTo> | null>(null);
  // useSyncExternalStore — correct at render time; no one-frame lag on first hover.
  const reducedMotion = useReducedMotion();

  useBlockFadeIn(sectionRef, {
    start: cs.scrollTrigger.early,
    groups: [
      {
        targets: [modesRef, viewRef],
        y: cs.blockFade.yTall,
        duration: cs.blockFade.durationLong,
        stagger: 0.08,
      },
    ],
  });

  useWordLineReveal(titleRef, { scope: sectionRef });

  // Toggling between gallery and list rewrites a large chunk of the
  // section's height, which shifts every downstream section (Outcomes,
  // Colophon, NextCase) up or down the page. Those sections register
  // their reveal triggers with `once: true` against positions measured
  // at mount; React state flips don't fire a window `resize`, so
  // ScrollTrigger never recomputes and pending triggers stay anchored
  // to stale scroll positions — the user toggles to List, scrolls
  // down, and the sections appear blank until they cross the *old*
  // (gallery-height) trigger line. A single refresh after layout
  // settles re-aligns every trigger to the new document height.
  useEffect(() => {
    let id2 = 0;
    const id1 = requestAnimationFrame(() => {
      id2 = requestAnimationFrame(() => ScrollTrigger.refresh());
    });
    return () => {
      cancelAnimationFrame(id1);
      if (id2) cancelAnimationFrame(id2);
    };
  }, [mode]);

  // Cleanup quickTo tweens on unmount. Instances are created lazily on first
  // hover (see ensureQuickTo) so this handles the case where hover occurred.
  useEffect(() => {
    const el = previewRef.current;
    return () => {
      if (el) gsap.killTweensOf(el);
      xToRef.current = null;
      yToRef.current = null;
    };
  }, []);

  // Create quickTo instances on first hover so they're never used before
  // the previewRef element is available (avoids a race with useEffect([])).
  const ensureQuickTo = () => {
    if (!xToRef.current && previewRef.current) {
      xToRef.current = gsap.quickTo(previewRef.current, "left", { duration: 0.55, ease: "power3" });
      yToRef.current = gsap.quickTo(previewRef.current, "top",  { duration: 0.55, ease: "power3" });
    }
  };

  // `snap` short-circuits the spring by passing quickTo's optional
  // startValue equal to the target — collapses the tween to zero
  // duration so the first appearance doesn't swoosh in from origin.
  const movePreview = (clientX: number, clientY: number, snap = false) => {
    ensureQuickTo();
    if (snap || reducedMotion) {
      xToRef.current?.(clientX, clientX);
      yToRef.current?.(clientY, clientY);
    } else {
      xToRef.current?.(clientX);
      yToRef.current?.(clientY);
    }
  };
  const handleRowEnter = (index: number) => (e: React.MouseEvent) => {
    movePreview(e.clientX, e.clientY, !preview.visible);
    setPreview({ visible: true, index });
  };
  const handleRowLeave = () => setPreview((p) => ({ ...p, visible: false }));
  const handleRowMove = (e: React.MouseEvent) => {
    movePreview(e.clientX, e.clientY);
  };

  return (
    <section
      ref={sectionRef}
      className={styles.toggle}
      aria-labelledby={eyebrowId}
    >
      <div className={styles.controls}>
        <div>
          <MetaLabel id={eyebrowId}>{label}</MetaLabel>
          <h2 ref={titleRef} className={styles.title}>
            {titleLine1}{" "}
            <span className={styles.titleAccent}>{screens.length}</span>{" "}
            {titleAccent}
          </h2>
        </div>

        {/*
          NOTE (F-IN-08): Both buttons must remain mounted unconditionally.
          selectMode() uses modeButtonsRef to programmatically focus the
          newly-active radio; conditional rendering would leave one ref null
          and break roving-tabindex keyboard navigation.
        */}
        <div
          ref={modesRef}
          className={styles.modes}
          role="radiogroup"
          aria-label="View mode"
        >
          <button
            type="button"
            ref={(el) => { modeButtonsRef.current.gallery = el; }}
            className={styles.modeBtn}
            role="radio"
            aria-checked={mode === "gallery"}
            tabIndex={mode === "gallery" ? 0 : -1}
            onClick={() => selectMode("gallery")}
            onKeyDown={handleModeKey}
          >
            Gallery
          </button>
          <button
            type="button"
            ref={(el) => { modeButtonsRef.current.list = el; }}
            className={styles.modeBtn}
            role="radio"
            aria-checked={mode === "list"}
            tabIndex={mode === "list" ? 0 : -1}
            onClick={() => selectMode("list")}
            onKeyDown={handleModeKey}
          >
            List
          </button>
        </div>
      </div>

      <div ref={viewRef}>
        {mode === "gallery" ? (
          <div className={styles.gallery}>
            {galleryEntries.map(({ screen: s, indexInAll }) => (
              <figure key={s.image}>
                <div className={styles.frame}>
                  <Image
                    src={s.image}
                    alt={s.name}
                    width={2400}
                    height={1500}
                    sizes="(min-width: 1024px) 33vw, 100vw"
                    unoptimized
                  />
                </div>
                <figcaption className={styles.caption}>
                  <span>{`${s.num} · ${s.name}`}</span>
                  <span>
                    {String(indexInAll + 1).padStart(2, "0")} / {totalPad}
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <div className={styles.list}>
            {screens.map((s, idx) => (
              <div
                key={s.image}
                className={styles.row}
                onMouseEnter={handleRowEnter(idx)}
                onMouseLeave={handleRowLeave}
                onMouseMove={handleRowMove}
              >
                <span className={styles.rowN}>{s.num}</span>
                <span className={styles.rowName}>{s.name}</span>
                <span className={styles.rowDesc}>{s.description}</span>
                <span className={styles.rowMeta}>{s.meta}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/*
        Cursor-following hover preview (list mode only).
        All 7 cards are mounted once and stacked vertically inside an
        overflow-hidden window; the inner slider translateY's to expose
        the active card. This avoids per-hover <img> swaps and gives a
        slide-between-projects motion when the cursor moves row→row
        without leaving the list.
      */}
      <div
        ref={previewRef}
        className={`${styles.preview} ${preview.visible ? styles.previewVisible : ""}`}
        aria-hidden
      >
        <div
          className={styles.previewSlider}
          style={{ transform: `translateY(-${preview.index * 100}%)` }}
        >
          {screens.map((s) => (
            <div
              key={s.image}
              className={styles.previewCard}
              style={{ background: s.color }}
            >
              <Image src={s.image} alt="" width={560} height={400} sizes="360px" unoptimized />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
