'use client';

import { useRef, useEffect, useState } from 'react';
import { gsap } from '@/lib/gsap';
import { features } from '@/data';
import { cursorBus } from '@/lib/cursorBus';
import styles from './CustomCursor.module.css';

// Trail sphere configuration from features data
const cursorConfig = features.customCursor;
const TRAIL_CONFIG = {
  count: cursorConfig.trail.count,
  colors: [
    cursorConfig.trail.colors.primary,
    'var(--color-accent-purple)', // Uses CSS variable for dynamic accent
    cursorConfig.trail.colors.secondary,
    cursorConfig.trail.colors.tertiary,
  ],
  sizes: cursorConfig.trail.sizes,
  lerpFactors: cursorConfig.trail.lerpFactors,
};

interface TrailSphere {
  element: HTMLDivElement | null;
  pos: { x: number; y: number };
  lerpFactor: number;
}

export function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const trailContainerRef = useRef<HTMLDivElement>(null);
  const trailSpheresRef = useRef<TrailSphere[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  // Store mouse position
  const mousePos = useRef({ x: 0, y: 0 });
  const cursorPos = useRef({ x: 0, y: 0 });
  const hasMovedMouse = useRef(false);

  // Movement detection for burst effect
  const lastMousePos = useRef({ x: 0, y: 0 });
  const isMoving = useRef(false);
  const isSpotlightActive = useRef(false);
  const movementTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasBurst = useRef(false);

  // PERF: Track ticker state to avoid unnecessary 60fps updates
  const tickerActiveRef = useRef(false);
  const animateFnRef = useRef<(() => void) | null>(null);
  const idleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // PERF: gate the show-trails fan-out to one tween per visibility transition
  // instead of firing 4 redundant gsap.to() calls on every mousemove > 2px.
  const trailVisibleRef = useRef(false);

  // Smooth lerp factor for main cursor
  const lerpFactor = 0.15;

  useEffect(() => {
    const cursor = cursorRef.current;
    const trailContainer = trailContainerRef.current;

    if (!cursor || !trailContainer) return;

    // Skip cursor entirely on touch devices — CSS hides it, but JS would still
    // mount listeners, run the ticker, and create trail DOM otherwise.
    if (typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches) {
      return;
    }

    // Burst animation - spheres collapse into main cursor
    const triggerBurst = () => {
      if (hasBurst.current || isSpotlightActive.current) return;
      hasBurst.current = true;
      // Trails are about to fade out (opacity:0, scale:0). Drop the gate so
      // the next mousemove fires the show-trails fan-out exactly once.
      trailVisibleRef.current = false;

      // Animate each trail sphere to burst into the main cursor
      trailSpheresRef.current.forEach((sphere, index) => {
        if (sphere.element) {
          const delay = index * 0.03;

          // Animate to cursor position and shrink
          gsap.to(sphere.element, {
            x: cursorPos.current.x,
            y: cursorPos.current.y,
            scale: 0,
            opacity: 0,
            duration: 0.3,
            delay,
            ease: 'power3.in',
          });
        }
      });

      // Pulse the main cursor when spheres merge
      gsap.timeline()
        .to(cursor, {
          scale: 1.5,
          duration: 0.15,
          delay: 0.1,
          ease: 'power2.out',
        })
        .to(cursor, {
          scale: 1,
          duration: 0.3,
          ease: 'elastic.out(1, 0.5)',
        });
    };

    // Mouse move handler
    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
      cursorBus.x = e.clientX;
      cursorBus.y = e.clientY;

      // Show cursor on first mouse move
      if (!hasMovedMouse.current) {
        hasMovedMouse.current = true;
        cursorPos.current = { x: e.clientX, y: e.clientY };

        // Initialize trail positions
        trailSpheresRef.current.forEach(sphere => {
          sphere.pos = { x: e.clientX, y: e.clientY };
        });

        setIsVisible(true);
      }

      // Detect movement
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 2) {
        isMoving.current = true;
        hasBurst.current = false;

        // Show trail spheres when moving (ONLY if spotlight is NOT active AND
        // trails are currently hidden). trailVisibleRef gates the fan-out to
        // one tween per visibility transition instead of firing 4 redundant
        // gsap.to() per mousemove tick. Reset by triggerBurst and
        // handleSpotlightEnter when trails are faded out.
        if (!isSpotlightActive.current && !trailVisibleRef.current) {
          trailVisibleRef.current = true;
          trailSpheresRef.current.forEach(sphere => {
            if (sphere.element) {
              // Kill any in-flight burst tween's opacity/scale on this sphere
              // (including ones still in their stagger delay). Without this,
              // the burst keeps writing opacity:0 after this show tween
              // completes its 0.2s — and the trail invisibly disappears
              // mid-movement. x/y stay on the GSAP cache and continue to be
              // overridden per frame by animate(), so they're safe to leave.
              gsap.killTweensOf(sphere.element, 'opacity,scale');
              gsap.to(sphere.element, {
                opacity: 1,
                scale: 1,
                duration: 0.2,
                ease: 'power2.out',
              });
            }
          });
        }

        // Clear existing timeout
        if (movementTimeout.current) {
          clearTimeout(movementTimeout.current);
        }

        // Set timeout to detect when movement stops
        movementTimeout.current = setTimeout(() => {
          isMoving.current = false;
          triggerBurst();
        }, 100);
      }

      lastMousePos.current = { x: e.clientX, y: e.clientY };

      // PERF: Ensure ticker is running when mouse moves
      startTicker();
    };

    // Create trail sphere elements
    trailSpheresRef.current = TRAIL_CONFIG.colors.map((color, index) => {
      const element = document.createElement('div');
      element.className = styles.trailSphere;
      element.style.backgroundColor = color;
      element.style.width = `${TRAIL_CONFIG.sizes[index]}px`;
      element.style.height = `${TRAIL_CONFIG.sizes[index]}px`;
      element.style.opacity = '0';
      trailContainer.appendChild(element);

      return {
        element,
        pos: { x: 0, y: 0 },
        lerpFactor: TRAIL_CONFIG.lerpFactors[index],
      };
    });

    // PERF: xPercent/yPercent never change at runtime — set once so the
    // per-frame animate() only updates x/y via quickSetter. quickSetter is
    // GSAP's optimized hot-path writer (~3–5× faster than gsap.set on warm
    // cache) while preserving the _gsap matrix tracking that burst, hover-
    // scale, and spotlight tweens rely on.
    gsap.set(cursor, { xPercent: -50, yPercent: -50 });
    trailSpheresRef.current.forEach(sphere => {
      if (sphere.element) gsap.set(sphere.element, { xPercent: -50, yPercent: -50 });
    });

    type QuickSetter = (value: number) => void;
    const setCursorX = gsap.quickSetter(cursor, 'x', 'px') as QuickSetter;
    const setCursorY = gsap.quickSetter(cursor, 'y', 'px') as QuickSetter;
    const trailSetters = trailSpheresRef.current.map(sphere => ({
      setX: sphere.element ? (gsap.quickSetter(sphere.element, 'x', 'px') as QuickSetter) : null,
      setY: sphere.element ? (gsap.quickSetter(sphere.element, 'y', 'px') as QuickSetter) : null,
    }));

    // Track mouse movement
    window.addEventListener('mousemove', handleMouseMove);

    // PERF: Start ticker only when needed
    const startTicker = () => {
      if (!tickerActiveRef.current && animateFnRef.current) {
        gsap.ticker.add(animateFnRef.current);
        tickerActiveRef.current = true;
      }
    };

    // PERF: Stop ticker when cursor is idle
    const stopTicker = () => {
      if (tickerActiveRef.current && animateFnRef.current) {
        gsap.ticker.remove(animateFnRef.current);
        tickerActiveRef.current = false;
      }
    };

    // PERF: Schedule idle check - stop ticker after 150ms of no movement
    const scheduleIdleCheck = () => {
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }
      idleTimeoutRef.current = setTimeout(() => {
        // Check if cursor has settled (lerp nearly complete).
        // 1px threshold avoids ticker restarts on sub-pixel jitter.
        const dx = Math.abs(mousePos.current.x - cursorPos.current.x);
        const dy = Math.abs(mousePos.current.y - cursorPos.current.y);
        if (dx < 1 && dy < 1) {
          stopTicker();
        }
      }, 150);
    };

    // Animate with GSAP ticker for smooth 60fps updates.
    // PERF: hot path — uses quickSetter (Track A), gates DOM writes on a
    // 0.1px sub-pixel threshold (Track C). Each element settles independently,
    // so the slow trail-tail (lerp 0.04) stops writing the moment it converges
    // instead of writing the same value for ~20 frames while the head settles.
    const SUBPIXEL = 0.1;
    const animate = () => {
      if (!hasMovedMouse.current) return;

      // Lerp main cursor
      const newCx = cursorPos.current.x + (mousePos.current.x - cursorPos.current.x) * lerpFactor;
      const newCy = cursorPos.current.y + (mousePos.current.y - cursorPos.current.y) * lerpFactor;
      if (Math.abs(newCx - cursorPos.current.x) > SUBPIXEL || Math.abs(newCy - cursorPos.current.y) > SUBPIXEL) {
        cursorPos.current.x = newCx;
        cursorPos.current.y = newCy;
        setCursorX(newCx);
        setCursorY(newCy);

        // --cursor-x / --cursor-y are only consumed by the spotlight reveal mask.
        // Skip the per-frame style recalculation when spotlight is inactive.
        if (isSpotlightActive.current) {
          document.documentElement.style.setProperty('--cursor-x', `${newCx}px`);
          document.documentElement.style.setProperty('--cursor-y', `${newCy}px`);
        }
      }

      // Update trail spheres — each follows the one ahead
      trailSpheresRef.current.forEach((sphere, index) => {
        const setters = trailSetters[index];
        if (!sphere.element || !setters?.setX || !setters?.setY) return;

        // First sphere follows cursor, others follow the sphere ahead
        const target = index === 0
          ? cursorPos.current
          : trailSpheresRef.current[index - 1].pos;

        const newX = sphere.pos.x + (target.x - sphere.pos.x) * sphere.lerpFactor;
        const newY = sphere.pos.y + (target.y - sphere.pos.y) * sphere.lerpFactor;
        if (Math.abs(newX - sphere.pos.x) > SUBPIXEL || Math.abs(newY - sphere.pos.y) > SUBPIXEL) {
          sphere.pos.x = newX;
          sphere.pos.y = newY;
          setters.setX(newX);
          setters.setY(newY);
        }
      });

      // Idle-timer gate stays at 1px (coarser than the sub-pixel write skip)
      // so the ticker stops once the head converges, not when individual
      // sub-pixel writes are skipped.
      const dx = Math.abs(mousePos.current.x - cursorPos.current.x);
      const dy = Math.abs(mousePos.current.y - cursorPos.current.y);
      if (dx < 1 && dy < 1) {
        scheduleIdleCheck();
      }
    };

    // Store reference for cleanup and control
    animateFnRef.current = animate;

    // PERF: Don't start ticker immediately - wait for mouse move
    // gsap.ticker.add(animate); // REMOVED - ticker starts on demand

    // Handle cursor visibility when leaving/entering window
    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    const handleMouseEnter = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
      cursorPos.current = { x: e.clientX, y: e.clientY };
      trailSpheresRef.current.forEach(sphere => {
        sphere.pos = { x: e.clientX, y: e.clientY };
      });
      setIsVisible(true);
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    // Handle hover states on interactive elements
    const handleLinkHover = () => {
      gsap.to(cursor, {
        scale: 2,
        duration: 0.3,
        ease: 'power2.out',
      });

      // Expand trail on hover
      trailSpheresRef.current.forEach((sphere, index) => {
        if (sphere.element) {
          gsap.to(sphere.element, {
            scale: 1.5,
            duration: 0.3,
            delay: index * 0.02,
            ease: 'power2.out',
          });
        }
      });
    };

    const handleLinkLeave = () => {
      gsap.to(cursor, {
        scale: 1,
        duration: 0.3,
        ease: 'power2.out',
      });

      // Reset trail scale
      trailSpheresRef.current.forEach((sphere) => {
        if (sphere.element) {
          gsap.to(sphere.element, {
            scale: 1,
            duration: 0.3,
            ease: 'power2.out',
          });
        }
      });
    };

    // Handle tagline spotlight - cursor becomes the spotlight
    const handleSpotlightEnter = (e: Event) => {
      const customEvent = e as CustomEvent<{ size: number }>;
      const spotlightSize = customEvent.detail?.size || 100;

      isSpotlightActive.current = true;

      // Set CSS variable for spotlight state
      document.documentElement.style.setProperty('--spotlight-active', '1');
      document.documentElement.style.setProperty('--spotlight-size', `${spotlightSize / 2}px`);
      // Seed cursor position vars so the spotlight is correctly placed on the
      // first paint. Use mousePos (most recent raw input) rather than
      // cursorPos (last *settled* eased position) — when the ticker is idle
      // because the cursor sat still, cursorPos is the previous hover origin
      // and the spotlight pops in at the wrong place until the next mousemove.
      cursorPos.current.x = mousePos.current.x;
      cursorPos.current.y = mousePos.current.y;
      document.documentElement.style.setProperty('--cursor-x', `${mousePos.current.x}px`);
      document.documentElement.style.setProperty('--cursor-y', `${mousePos.current.y}px`);
      // Resume the ticker so per-frame writes start immediately.
      startTicker();

      // Hide the main cursor so the spotlight (reveal mask) takes over completely
      // This prevents color clashing (difference mode vs purple background)
      gsap.to(cursor, {
        scale: 1.5, // Slight scale up before disappearing for effect
        opacity: 0,
        duration: 0.2,
        ease: 'power2.out',
      });

      // Fade out trail during spotlight mode
      trailSpheresRef.current.forEach((sphere) => {
        if (sphere.element) {
          gsap.to(sphere.element, {
            opacity: 0,
            scale: 0.5,
            duration: 0.2,
            ease: 'power2.out',
          });
        }
      });
      // Trails are hidden during spotlight; drop the gate so the show-trails
      // fan-out fires once when the user moves again after spotlight leaves.
      trailVisibleRef.current = false;
    };

    const handleSpotlightLeave = () => {
      isSpotlightActive.current = false;

      // Reset CSS variables for spotlight state. Clear --spotlight-size too:
      // the tagline reveal layers read `var(--spotlight-size, 0px)` and inherit
      // this <html> value whenever their own container hasn't set one yet (e.g.
      // a freshly remounted Hero after a back-navigation). Leaving it non-zero
      // here strands the hidden tagline visible until the next hover writes 0px
      // onto the container.
      document.documentElement.style.setProperty('--spotlight-active', '0');
      document.documentElement.style.setProperty('--spotlight-size', '0px');

      // Bring back the main cursor
      gsap.to(cursor, {
        scale: 1,
        opacity: 1,
        duration: 0.3,
        ease: 'power2.out',
      });

      // Trail will reappear naturally on next movement
    };

    const handleScratchcardEnter = () => {
      gsap.to(cursor, {
        opacity: 0,
        duration: 0.2,
        ease: 'power2.out',
      });

      trailSpheresRef.current.forEach((sphere) => {
        if (sphere.element) {
          gsap.to(sphere.element, {
            opacity: 0,
            duration: 0.2,
            ease: 'power2.out',
          });
        }
      });
    };

    const handleScratchcardLeave = () => {
      gsap.to(cursor, {
        opacity: 1,
        duration: 0.3,
        ease: 'power2.out',
      });
      trailVisibleRef.current = false;
    };

    // Listen for spotlight events
    window.addEventListener('tagline-spotlight-enter', handleSpotlightEnter);
    window.addEventListener('tagline-spotlight-leave', handleSpotlightLeave);
    window.addEventListener('scratchcard-hover-enter', handleScratchcardEnter);
    window.addEventListener('scratchcard-hover-leave', handleScratchcardLeave);

    // Event delegation via bubbling pointerover / pointerout instead of
    // capture-phase mouseenter / mouseleave. The capture-phase pair fires for
    // every node entry/leave across the entire document tree on every cursor
    // movement; pointerover/out bubble, so a single handler at the document
    // root fires once per actual element crossing.
    const INTERACTIVE_SELECTOR = 'a, button, [role="button"], input, textarea, select';

    const handleInteractiveEnter = (e: PointerEvent) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      const entered = target.closest(INTERACTIVE_SELECTOR);
      if (!entered) return;
      // Suppress when moving within the same interactive element.
      const related = e.relatedTarget;
      if (related instanceof Element && related.closest(INTERACTIVE_SELECTOR) === entered) return;
      handleLinkHover();
    };

    const handleInteractiveLeave = (e: PointerEvent) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      const left = target.closest(INTERACTIVE_SELECTOR);
      if (!left) return;
      // Suppress when moving to a child of the same interactive element, or
      // sliding onto another interactive element (handleLinkHover will fire
      // for the new one via pointerover and overwrite the scale tween).
      const related = e.relatedTarget;
      if (related instanceof Element) {
        const relatedInteractive = related.closest(INTERACTIVE_SELECTOR);
        if (relatedInteractive === left) return;
        if (relatedInteractive) return;
      }
      handleLinkLeave();
    };

    document.addEventListener('pointerover', handleInteractiveEnter);
    document.addEventListener('pointerout', handleInteractiveLeave);

    // Cleanup
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
      window.removeEventListener('tagline-spotlight-enter', handleSpotlightEnter);
      window.removeEventListener('tagline-spotlight-leave', handleSpotlightLeave);
      window.removeEventListener('scratchcard-hover-enter', handleScratchcardEnter);
      window.removeEventListener('scratchcard-hover-leave', handleScratchcardLeave);

      // PERF: Clean up ticker properly
      if (animateFnRef.current) {
        gsap.ticker.remove(animateFnRef.current);
      }
      tickerActiveRef.current = false;

      if (movementTimeout.current) {
        clearTimeout(movementTimeout.current);
      }

      // PERF: Clean up idle timeout
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }

      // PERF: Remove delegated event listeners
      document.removeEventListener('pointerover', handleInteractiveEnter);
      document.removeEventListener('pointerout', handleInteractiveLeave);

      // Remove trail elements
      trailSpheresRef.current.forEach(sphere => {
        if (sphere.element && sphere.element.parentNode) {
          sphere.element.parentNode.removeChild(sphere.element);
        }
      });
    };
  }, []);

  return (
    <>
      {/* Trail container - outside blend wrapper so colors stay vibrant */}
      <div
        ref={trailContainerRef}
        className={styles.trailContainer}
        style={{ visibility: isVisible ? 'visible' : 'hidden' }}
        aria-hidden="true"
      />
      {/* Cursor wrapper with mix-blend-mode for inversion effect */}
      <div
        className={styles.cursorWrapper}
        style={{ visibility: isVisible ? 'visible' : 'hidden' }}
        aria-hidden="true"
      >
        <div ref={cursorRef} className={styles.cursor} />
      </div>
    </>
  );
}
