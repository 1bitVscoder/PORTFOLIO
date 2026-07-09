'use client';

import { useRef, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { gsap } from '@/lib/gsap';
import { navigation, content } from '@/data';
import { useLenis } from '@/lib/LenisProvider';
import { scrollToContactReveal } from '@/lib/scrollToContactReveal';
import { scrollToProjectsReveal } from '@/lib/scrollToProjectsReveal';
import { useAccentColor } from '@/lib/AccentColorContext';
import { useTransition } from '@/components/transitions';
import { useScrollLock } from '@/lib/useScrollLock';
import styles from './Menu.module.css';

interface MenuProps {
  isOpen: boolean;
  onClose: () => void;
  onCloseComplete?: () => void;
  onRevealStart?: () => void;
}

// Map navigation data to component format
const menuLinks = navigation.mainLinks.map(link => ({
  label: link.label,
  href: link.href,
  desc: link.description,
}));

const socialLinks = navigation.socialLinks.map(link => ({
  label: link.label,
  href: link.href,
}));



// Custom easing matching Framer Motion [0.76, 0, 0.24, 1]
const MENU_EASE = 'power4.inOut';

export function Menu({ isOpen, onClose, onCloseComplete, onRevealStart }: MenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const linksContainerRef = useRef<HTMLUListElement>(null);
  const socialSectionRef = useRef<HTMLDivElement>(null);
  const isAnimating = useRef(false);
  const { scrollTo } = useLenis();
  const pathname = usePathname();
  const { triggerTransition } = useTransition();
  const { color: currentAccent } = useAccentColor();

  // Lock body scroll when menu is open. Shared ref-counted lock so Menu,
  // WelcomeScreen and TransitionProvider can't race each other for
  // document.body.style.overflow.
  useScrollLock(isOpen);

  // Tracks the deferred post-close scroll so it can be cancelled on unmount
  // or before a new schedule (prevents scrolling a stale DOM after the menu
  // is gone or reopened).
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
    };
  }, []);

  // A11y: inert background, focus trap, focus restoration.
  //
  // - Apply `inert` to every direct child of <body> that isn't the menu so
  //   Tab/AT can't reach background content behind the curtain.
  // - On open, capture the previously-focused element (typically the hamburger)
  //   and move focus to the first link inside the menu.
  // - On close, restore focus to the captured element.
  // - While open, Tab/Shift+Tab cycle focus inside the menu.
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;

    if (isOpen) {
      previouslyFocusedRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;

      // Mark every body sibling other than the menu as inert. The Menu node
      // lives somewhere in the tree under <body>; walk up to find which
      // direct-child ancestor it belongs to and skip that one.
      const menuAncestor = (() => {
        let n: Node | null = menu;
        while (n && n.parentNode && n.parentNode !== document.body) n = n.parentNode;
        return n as HTMLElement | null;
      })();
      const inertedSiblings: HTMLElement[] = [];
      Array.from(document.body.children).forEach((child) => {
        if (!(child instanceof HTMLElement)) return;
        if (child === menuAncestor) return;
        if (child.hasAttribute('inert')) return;
        // Keep the menu trigger's host (e.g. the navbar) interactive — its
        // toggle button doubles as the close affordance while the menu is open.
        if (child.querySelector('[aria-controls="main-menu"]')) return;
        // Floating controls (ThemeToggle, BackToTop) opt out via this attribute
        // so they remain clickable on top of the menu overlay. `matches` covers
        // the case where the body child IS the control (current shape);
        // `querySelector` survives a future wrapper around the control.
        if (child.matches('[data-menu-passthrough]')) return;
        if (child.querySelector('[data-menu-passthrough]')) return;
        child.setAttribute('inert', '');
        inertedSiblings.push(child);
      });

      // Move focus into the menu after the open animation starts so the
      // first focusable element receives focus. RAF defers past the initial
      // GSAP set() so the link is interactive.
      const focusFrame = requestAnimationFrame(() => {
        const firstLink = menu.querySelector<HTMLElement>(
          `.${styles.link}, .${styles.backButton}`,
        );
        firstLink?.focus({ preventScroll: true });
      });

      // Focus trap.
      const FOCUSABLE_SELECTOR =
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"]), input:not([disabled]), textarea:not([disabled]), select:not([disabled])';
      const handleTrapKey = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return;
        const focusable = Array.from(
          menu.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
        ).filter((el) => !el.hasAttribute('disabled') && el.tabIndex !== -1);
        if (focusable.length === 0) {
          e.preventDefault();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;
        if (e.shiftKey) {
          if (active === first || !menu.contains(active)) {
            e.preventDefault();
            last.focus({ preventScroll: true });
          }
        } else {
          if (active === last || !menu.contains(active)) {
            e.preventDefault();
            first.focus({ preventScroll: true });
          }
        }
      };
      document.addEventListener('keydown', handleTrapKey);

      return () => {
        cancelAnimationFrame(focusFrame);
        document.removeEventListener('keydown', handleTrapKey);
        inertedSiblings.forEach((el) => el.removeAttribute('inert'));
        // Restore focus to whatever element opened the menu.
        previouslyFocusedRef.current?.focus({ preventScroll: true });
        previouslyFocusedRef.current = null;
      };
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isAnimating.current) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // External close requests: passthrough floating controls (e.g. BackToTop)
  // dispatch `menu:close` to request the menu fold up before their own action
  // runs. Same in-flight guard as Escape so a request mid-animation is dropped
  // rather than re-entering the open/close pipeline.
  useEffect(() => {
    const handleExternalClose = () => {
      if (isOpen && !isAnimating.current) onClose();
    };
    document.addEventListener('menu:close', handleExternalClose);
    return () => document.removeEventListener('menu:close', handleExternalClose);
  }, [isOpen, onClose]);

  // Animation effect
  useEffect(() => {
    if (!menuRef.current || !overlayRef.current || !linksContainerRef.current || !socialSectionRef.current) return;

    // Left side elements
    const links = linksContainerRef.current.querySelectorAll(`.${styles.linkInner}`);
    const linkNumbers = linksContainerRef.current.querySelectorAll(`.${styles.linkNumber}`);
    if (links.length === 0) return;

    // Right side elements (social section)
    const socialLabels = socialSectionRef.current.querySelectorAll(`.${styles.socialLabel}`);
    const socialLinks = socialSectionRef.current.querySelectorAll(`.${styles.socialLink}`);
    const locationText = socialSectionRef.current.querySelector(`.${styles.locationText}`);
    // Kill any running animations
    gsap.killTweensOf([
      menuRef.current, overlayRef.current, links, linkNumbers,
      socialLabels, socialLinks, locationText
    ]);

    isAnimating.current = true;

    if (isOpen) {
      // === OPEN ANIMATION ===

      // Show container
      gsap.set(menuRef.current, { visibility: 'visible' });

      // Set initial states - Left side
      gsap.set(overlayRef.current, { clipPath: 'inset(0% 0% 100% 0%)' });
      gsap.set(links, { y: '110%' });
      gsap.set(linkNumbers, { opacity: 0, x: -20 });

      // Set initial states - Right side (social section)
      gsap.set(socialLabels, { opacity: 0, x: 20 });
      gsap.set(socialLinks, { opacity: 0, y: 30 });
      gsap.set(locationText, { opacity: 0 });
      // Create timeline
      const tl = gsap.timeline({
        onComplete: () => {
          isAnimating.current = false;
        }
      });

      // 1. Overlay clips in from top
      tl.to(overlayRef.current, {
        clipPath: 'inset(0% 0% 0% 0%)',
        duration: 0.7,
        ease: MENU_EASE,
      })
      // 2. Links stagger up (starts 0.3s after overlay begins)
      .to(links, {
        y: '0%',
        duration: 0.8,
        stagger: 0.1,
        ease: MENU_EASE,
      }, 0.3)
      // 3. Numbers fade in
      .to(linkNumbers, {
        opacity: 1,
        x: 0,
        duration: 0.5,
        stagger: 0.1,
        ease: 'power2.out',
      }, 0.5)
      // 4. Social labels slide in from right
      .to(socialLabels, {
        opacity: 1,
        x: 0,
        duration: 0.5,
        stagger: 0.15,
        ease: 'power2.out',
      }, 0.4)
      // 5. Social links stagger up
      .to(socialLinks, {
        opacity: 1,
        y: 0,
        duration: 0.5,
        stagger: 0.08,
        ease: MENU_EASE,
      }, 0.5)
      // 6. Location text fades in
      .to(locationText, {
        opacity: 1,
        duration: 0.4,
        ease: 'power2.out',
      }, 0.7);

    } else {
      // === CLOSE ANIMATION ===

      // Freeze the current accent color on the overlay before changing CSS variable
      // This ensures the curtain keeps its color while hero text gets the new color
      const currentColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--color-accent-purple').trim();
      overlayRef.current.style.backgroundColor = currentColor;

      // Trigger color change NOW - hero text will have new color when revealed
      // But curtain keeps old color via inline style above
      onRevealStart?.();

      const tl = gsap.timeline({
        onComplete: () => {
          if (menuRef.current) {
            gsap.set(menuRef.current, { visibility: 'hidden' });
          }
          // Clear the inline style so it uses CSS variable again on next open
          if (overlayRef.current) {
            overlayRef.current.style.backgroundColor = '';
          }
          isAnimating.current = false;
          // Trigger callback after close animation completes
          onCloseComplete?.();
        }
      });

      // 2. Location text fades out
      tl.to(locationText, {
        opacity: 0,
        duration: 0.2,
        ease: 'power2.in',
      }, 0.05)
      // 3. Social links stagger out
      .to(socialLinks, {
        opacity: 0,
        y: 30,
        duration: 0.3,
        stagger: { each: 0.04, from: 'end' },
        ease: 'power2.in',
      }, 0.1)
      // 4. Social labels slide out
      .to(socialLabels, {
        opacity: 0,
        x: 20,
        duration: 0.3,
        stagger: { each: 0.05, from: 'end' },
        ease: 'power2.in',
      }, 0.15)
      // 5. Numbers fade out
      .to(linkNumbers, {
        opacity: 0,
        x: -20,
        duration: 0.3,
        stagger: { each: 0.03, from: 'end' },
        ease: 'power2.in',
      }, 0.1)
      // 6. Links stagger down (reverse order)
      .to(links, {
        y: '110%',
        duration: 0.5,
        stagger: { each: 0.05, from: 'end' },
        ease: MENU_EASE,
      }, 0.2)
      // 7. Overlay clips out (delayed until content exits)
      .to(overlayRef.current, {
        clipPath: 'inset(0% 0% 100% 0%)',
        duration: 0.7,
        ease: MENU_EASE,
      }, 0.5);
    }
  }, [isOpen, onCloseComplete, onRevealStart]);

  const handleLinkClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (isAnimating.current) {
      e.preventDefault();
      return;
    }

    // Route links (e.g. /about) navigate to a different page rather than
    // scrolling within the current one. Hand them to the page-transition
    // system so the curtain plays, mirroring TransitionLink. A click while
    // already on that route just folds the menu up (no same-page transition).
    if (!href.startsWith('#')) {
      e.preventDefault();
      onClose();
      if (href !== pathname) {
        triggerTransition({
          href,
          origin: { x: e.clientX, y: e.clientY },
          payload: { accent: currentAccent },
        });
      }
      return;
    }

    // CR-01: the hash nav targets (#projects, #services, #contact)
    // only exist on the home page. When the menu is opened from a
    // case-study route (e.g. /work/tasktrox), Lenis can't resolve the
    // selector against a DOM that doesn't contain those sections, so
    // the unconditional preventDefault + scrollTo silently no-ops and
    // the menu becomes dead. Detect cross-route and trigger the page
    // transition to `/#hash` so the curtain plays on the way home; the
    // anchor scroll then resolves naturally once the home page mounts.
    if (href.startsWith('#') && pathname !== '/') {
      e.preventDefault();
      onClose();
      triggerTransition({
        href: '/' + href,
        origin: { x: e.clientX, y: e.clientY },
        payload: { accent: currentAccent },
      });
      return;
    }

    // On-home: preserve smooth-scroll behaviour.
    e.preventDefault();
    onClose();
    // Delay scroll to allow menu close animation. Track the timer so a
    // second open/close or an unmount cancels it — otherwise it fires
    // against a stale DOM. Clear any pending one before scheduling anew.
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      scrollTimeoutRef.current = null;
      if (href === '#contact') {
        // Contact's form reveals across a scrub-pinned range and is hidden at
        // the panel top (progress 0). Pace the scroll in two phases so the form
        // types in at the same speed as a manual scroll instead of racing past
        // (see scrollToContactReveal). Track the phase-2 timeout for cleanup.
        scrollTimeoutRef.current = scrollToContactReveal(scrollTo) ?? null;
      } else if (href === '#projects') {
        // Same problem as Contact: the first project's split is scrub-tied and
        // closed at progress 0. Two-phase scroll plays it open at reading pace
        // and parks on the open card (see scrollToProjectsReveal). Track the
        // phase-2 timeout for cleanup.
        scrollTimeoutRef.current = scrollToProjectsReveal(scrollTo) ?? null;
      } else {
        scrollTo(href, { duration: 1.8 }); // Lenis smooth scroll with custom duration
      }
    }, 800);
  }, [onClose, scrollTo, pathname, triggerTransition, currentAccent]);

  return (
    <div ref={menuRef} id="main-menu" className={`${styles.menu} ${isOpen ? styles.isOpen : ''}`}>
      <div ref={overlayRef} className={styles.overlay} />

      <div className={styles.menuContent}>
        <nav className={styles.nav} role="navigation" aria-label="Main menu">
          <ul ref={linksContainerRef} className={styles.linkList}>
            {menuLinks.map((link, index) => (
              <li key={link.href} className={styles.linkItem}>
                <div className={styles.linkMask}>
                  <a
                    href={link.href}
                    className={styles.link}
                    onClick={(e) => handleLinkClick(e, link.href)}
                    tabIndex={isOpen ? 0 : -1}
                  >
                    <span className={styles.linkNumber}>0{index + 1}</span>
                    <span className={styles.linkInner}>
                      <span className={styles.linkText}>{link.label}</span>
                      <span className={styles.linkFill} aria-hidden="true">{link.label}</span>
                    </span>
                  </a>
                </div>
                <p className={styles.linkDesc}>{link.desc}</p>
              </li>
            ))}
          </ul>
        </nav>

        <aside ref={socialSectionRef} className={styles.socialSection}>
          <div className={styles.socialGroup}>
            <span className={styles.socialLabel}>
              Social Presence
              <span className={styles.socialSubLabel}>[currently in a deprecated situation]</span>
            </span>
            <ul className={styles.socialList}>
              {socialLinks.map((social) => (
                <li key={social.label} className={styles.socialItem}>
                  <a
                    href={social.href}
                    className={styles.socialLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    tabIndex={isOpen ? 0 : -1}
                  >
                    {/* Base text - white, moves up on hover */}
                    <span className={styles.socialTextBase}>
                      {social.label.split('').map((char, index) => (
                        <span
                          key={`${char}-${index}`}
                          className={styles.socialChar}
                          style={{ transitionDelay: `${index * 0.025}s` }}
                        >
                          {char}
                        </span>
                      ))}
                    </span>
                    {/* Clone text - teal, reveals from below on hover */}
                    <span className={styles.socialTextClone} aria-hidden="true">
                      {social.label.split('').map((char, index) => (
                        <span
                          key={`${char}-${index}`}
                          className={styles.socialChar}
                          style={{ transitionDelay: `${index * 0.025}s` }}
                        >
                          {char}
                        </span>
                      ))}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.locationGroup}>
            <span className={styles.socialLabel}>Location</span>
            <p className={styles.locationText}>
              {navigation.location.split(',').map((part, i) => (
                <span key={i}>{part.trim()}{i === 0 && <br />}</span>
              ))}
              <span className={styles.flirtyLine}>
                basically in your heart baby...
                <span className={styles.flirtyEmoji}>
                  <svg viewBox="0 0 100 100" fill="none">
                    <ellipse className={styles.emojiBlush} cx="26" cy="58" rx="10" ry="5" fill="#ff7597" />
                    <ellipse className={styles.emojiBlush} cx="74" cy="58" rx="10" ry="5" fill="#ff7597" />
                    <circle className={styles.emojiLeftEyeOpen} cx="30" cy="45" r="7" fill="currentColor" />
                    <path className={styles.emojiLeftEyeWink} d="M 20 48 Q 30 40 40 48" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
                    <circle className={styles.emojiRightEye} cx="70" cy="45" r="7" fill="currentColor" />
                    <path className={styles.emojiMouthSmile} d="M 38 65 Q 50 78 62 65" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
                    <path className={styles.emojiMouthKiss} d="M 44 67 Q 50 61 56 67" stroke="currentColor" strokeWidth="5" strokeLinecap="round" fill="none" />
                    <path className={styles.emojiHeart} d="M 50 60 C 47.5 56.5, 41 56.5, 41 61.5 C 41 66, 50 71.5, 50 71.5 C 50 71.5, 59 66, 59 61.5 C 59 56.5, 52.5 56.5, 50 60" fill="#ff3b30" />
                  </svg>
                </span>
              </span>
            </p>
          </div>


        </aside>
      </div>
    </div>
  );
}
