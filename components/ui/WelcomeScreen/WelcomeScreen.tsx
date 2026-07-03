'use client';

import { useRef, useState } from 'react';
import { gsap } from '@/lib/gsap';
import { useGSAP } from '@gsap/react';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { useScrollLock } from '@/lib/useScrollLock';
import { content, features } from '@/data';
import styles from './WelcomeScreen.module.css';

const GREETINGS = content.welcomeScreen.greetings;
const INITIALS = content.welcomeScreen.initials;

export const WelcomeScreen = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const initialsRef = useRef<HTMLDivElement>(null);
  const mRef = useRef<HTMLSpanElement>(null);
  const aRef = useRef<HTMLSpanElement>(null);
  const reducedMotion = useReducedMotion();

  // "Welcome is showing" — the single source of truth for the body scroll
  // lock. Starts locked (the overlay covers the screen from first paint, as
  // the old synchronous lockScroll() did) and is released the moment the
  // welcome ends through ANY path: skip-on-return, reduced-motion, normal
  // timeline completion, bailOut(), or unmount. Routing the lock through the
  // shared ref-counted hook keeps Menu / WelcomeScreen / TransitionProvider
  // from racing each other for document.body.style.overflow, and the gutter
  // compensation (full-screen overlay) is preserved via compensateScrollbar.
  const [welcomeActive, setWelcomeActive] = useState(true);
  useScrollLock(welcomeActive, { compensateScrollbar: true });

  useGSAP(() => {
    // Skip greeting on Next.js client-side navigation. The inline script in
    // app/layout.tsx sets window.__freshLoad on every full document load
    // (cold visit + F5 refresh) — it never re-runs on Link clicks, so its
    // absence here means we got here via in-app navigation.
    if (features.welcomeScreen.skipOnReturn && !window.__freshLoad) {
      // Return visit: no greeting, so release the scroll lock immediately.
      setWelcomeActive(false);
      if (containerRef.current) {
        containerRef.current.setAttribute('aria-hidden', 'true');
        containerRef.current.style.display = 'none';
      }
      const handoffTimer = setTimeout(() => {
        window.__welcomeHandoff = true;
        window.dispatchEvent(new CustomEvent('welcome-handoff'));
        window.__welcomeComplete = true;
        window.dispatchEvent(new CustomEvent('welcome-complete'));
      }, 0);
      return () => clearTimeout(handoffTimer);
    }
    // Consume the flag so a same-tab client-nav back here is treated as a
    // return visit (no re-greeting).
    delete window.__freshLoad;

    // Reduced-motion path: skip flash + flight; hide welcome and dispatch
    // handoff/complete events so Hero & HeroText proceed normally.
    if (reducedMotion) {
      // No animation runs, so release the scroll lock immediately.
      setWelcomeActive(false);
      if (containerRef.current) {
        containerRef.current.setAttribute('aria-hidden', 'true');
        containerRef.current.style.display = 'none';
      }
      // Defer to next tick so sibling components have attached their listeners.
      const handoffTimer = setTimeout(() => {
        window.__welcomeHandoff = true;
        window.dispatchEvent(new CustomEvent('welcome-handoff'));
        window.__welcomeComplete = true;
        window.dispatchEvent(new CustomEvent('welcome-complete'));
      }, 0);
      return () => clearTimeout(handoffTimer);
    }

    // Context for flight tweens to ensure proper cleanup
    const flightCtx = gsap.context(() => {});
    // Handoff delayedCall is created later inside tl.call; track it so the
    // cleanup return can kill it. Without this, an unmount mid-flight (HMR,
    // dev navigation) lets the call fire after the DOM is gone.
    let handoffCall: gsap.core.Tween | null = null;

    // Failure handler — guarantees we don't leave scroll locked or the rest
    // of the app waiting on handoff/complete events if timeline setup throws.
    const bailOut = (err: unknown) => {
      // Genuine production error worth surfacing: setup failure leaves the
      // greeting broken, so this stays ungated (the warns below are gated).
      console.error('[WelcomeScreen] Animation setup failed, bailing out:', err);
      // Releasing the lock via state still works on the bail path: the hook's
      // effect runs the release on the next commit, and the unmount-cleanup
      // release is also guaranteed — so scroll is never left locked.
      setWelcomeActive(false);
      if (containerRef.current) {
        containerRef.current.setAttribute('aria-hidden', 'true');
        containerRef.current.style.display = 'none';
      }
      window.__welcomeHandoff = true;
      window.dispatchEvent(new CustomEvent('welcome-handoff'));
      window.__welcomeComplete = true;
      window.dispatchEvent(new CustomEvent('welcome-complete'));
    };

    const tl = gsap.timeline({
      onComplete: () => {
        setWelcomeActive(false);
        // Note: Don't call flightCtx.revert() here - animations are done
        // revert() would reset elements to pre-animation state causing visual glitch
        if (containerRef.current) {
          containerRef.current.style.display = 'none';
        }
        window.__welcomeComplete = true;
        window.dispatchEvent(new CustomEvent('welcome-complete'));
      }
    });

    // Scroll is already locked via the welcomeActive state (initialised true).

    try {

    const greetingElements = containerRef.current?.querySelectorAll(`.${styles.greeting}`);

    if (greetingElements && greetingElements.length > 0) {
        // 1. Initial Setup: Stack all greetings in the center with initial y and scale
        gsap.set(greetingElements, { 
            x: 0, 
            y: 15, 
            opacity: 0, 
            scale: 0.95,
            position: 'absolute',
            left: '50%',
            top: '50%',
            xPercent: -50,
            yPercent: -50
        });

        // 2. The Smooth Sequential Transition (No Overlap)
        // Dynamically scale durations so the total animation time remains responsive
        const totalGreetings = greetingElements.length;
        const targetTotalTime = totalGreetings > 10 ? 3.6 : 2.5; 
        const totalWordDuration = targetTotalTime / totalGreetings;

        const animDuration = totalWordDuration * 0.38;
        const fadeOutDuration = totalWordDuration * 0.38;
        const displayDuration = totalWordDuration * 0.24;

        greetingElements.forEach((el, index) => {
            const startTime = index * totalWordDuration;

            tl.to(el, {
                opacity: 1,
                y: 0,
                scale: 1,
                duration: animDuration,
                ease: "power2.out"
            }, startTime)
            .to(el, {
                opacity: 0,
                y: -15,
                scale: 1.05,
                duration: fadeOutDuration,
                ease: "power2.in",
                delay: displayDuration
            }, startTime + animDuration);
        });

        // 3. Initials Reveal
        // PERF: dropped filter:blur — paint-heavy on Firefox/Linux. scale+opacity
        // alone provide the same perceptual reveal at compositor-only cost.
        tl.fromTo(initialsRef.current,
            {
                scale: 1.2,
                opacity: 0,
            },
            {
                scale: 1,
                opacity: 1,
                duration: 0.5,
                ease: "power2.out"
            }
        );

        tl.addLabel("initialsRevealed");

        // 3.5. Filmy glitching class trigger right before flight
        tl.call(() => {
          initialsRef.current?.classList.add(styles.glitching);
        }, undefined, "initialsRevealed+=0.2");

        // Remove the glitching class right when the travel/flight transition starts
        tl.call(() => {
          initialsRef.current?.classList.remove(styles.glitching);
        }, undefined, "initialsRevealed+=0.65");
    }

      // 4. The Travel Transition
      // Using a label to properly sequence the flight animation
      tl.addLabel("flightStart", "initialsRevealed+=0.65");

      // Calculate positions at the right moment, then animate
      tl.call(() => {
        const targetM = document.getElementById('target-m');
        const targetA = document.getElementById('target-a');

        // Validate targets exist with helpful error message
        if (!targetM || !targetA) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn('[WelcomeScreen] Target elements not found:', {
              targetM: !!targetM,
              targetA: !!targetA
            });
          }
          // Dispatch handoff anyway to prevent UI from being stuck
          window.__welcomeHandoff = true;
          window.dispatchEvent(new CustomEvent('welcome-handoff'));
          return;
        }

        if (!mRef.current || !aRef.current) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn('[WelcomeScreen] Letter refs not available');
          }
          window.__welcomeHandoff = true;
          window.dispatchEvent(new CustomEvent('welcome-handoff'));
          return;
        }

        // Batch all getBoundingClientRect calls together to minimize reflow
        const rects = {
          targetM: targetM.getBoundingClientRect(),
          targetA: targetA.getBoundingClientRect(),
          currentM: mRef.current.getBoundingClientRect(),
          currentA: aRef.current.getBoundingClientRect()
        };

        const deltaMx = rects.targetM.left - rects.currentM.left;
        const deltaMy = rects.targetM.top - rects.currentM.top;
        const deltaAx = rects.targetA.left - rects.currentA.left;
        const deltaAy = rects.targetA.top - rects.currentA.top;

        const flightDuration = 1.2;
        const handoffDuration = 0.3;

        // Add flight tweens to context for proper cleanup
        flightCtx.add(() => {
          // A. Fly both letters to destination (parallel)
          gsap.to(mRef.current, {
            x: deltaMx,
            y: deltaMy,
            duration: flightDuration,
            ease: "power4.inOut"
          });

          gsap.to(aRef.current, {
            x: deltaAx,
            y: deltaAy,
            duration: flightDuration,
            ease: "power4.inOut"
          });

          // B. Cross-Dissolve: Fade OUT flying letters as they arrive
          gsap.to([mRef.current, aRef.current], {
            opacity: 0,
            duration: handoffDuration,
            ease: "power1.in",
            delay: flightDuration - handoffDuration
          });

          // D. Fade out container — opacity is compositor-only, whereas the
          // previous backgroundColor tween triggered paint every frame. By the
          // time this delay fires, all children (greetings, initials) have
          // already faded, so opacity on the container is visually equivalent.
          if (containerRef.current) {
            gsap.to(containerRef.current, {
              opacity: 0,
              duration: 0.8,
              ease: "power2.inOut",
              delay: 0.4
            });
          }
        });

        // C. Trigger HeroText Fade IN when cross-fade starts
        // Kept OUTSIDE flightCtx (revert() would kill it) but captured in
        // handoffCall so the cleanup path can kill it on unmount.
        handoffCall = gsap.delayedCall(flightDuration - handoffDuration, () => {
          window.__welcomeHandoff = true;
          window.dispatchEvent(new CustomEvent('welcome-handoff'));
        });
      }, [], "flightStart");

      // Wait for flight animation to complete (matches flightDuration + buffer)
      tl.to({}, { duration: 1.3 }, "flightStart");
    } catch (err) {
      bailOut(err);
    }

    // Cleanup on unmount. The scroll lock itself is released by useScrollLock's
    // own effect cleanup (ref-counted), so we don't touch body styles here.
    return () => {
      handoffCall?.kill();
      tl.kill();
      flightCtx.revert();
    };
  }, { scope: containerRef, dependencies: [reducedMotion] });

  return (
    <div
      ref={containerRef}
      data-welcome-wrapper
      className={styles.welcomeWrapper}
    >
      <div className={styles.textContainer}>
        {/* Centered Greetings (Stacked) */}
        {GREETINGS.map((text, i) => (
          <div key={i} className={styles.greeting}>
            {text}
          </div>
        ))}

        {/* Initials (Center Target) */}
        <div ref={initialsRef} className={styles.initialsContainer}>
          <span ref={mRef} className={styles.letterM} data-text={INITIALS.first}>{INITIALS.first}</span>
          <span style={{ width: '0.1em' }}></span> {/* Spacer */}
          <span ref={aRef} className={styles.letterA} data-text={INITIALS.last}>{INITIALS.last}</span>
        </div>
      </div>
    </div>
  );
};
