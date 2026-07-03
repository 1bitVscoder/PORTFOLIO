import { useEffect, type RefObject } from 'react';

/**
 * Dynamically applies the 'data-lenis-prevent' attribute only when the target
 * element is actually scrollable (scrollHeight > clientHeight).
 *
 * This prevents Lenis from freezing the main page scroll when the user hovers and wheels
 * over an empty/short container that doesn't need internal scrolling.
 */
export function useDynamicLenisPrevent(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const checkScroll = () => {
      const isScrollable = el.scrollHeight > el.clientHeight;
      if (isScrollable) {
        el.setAttribute('data-lenis-prevent', '');
      } else {
        el.removeAttribute('data-lenis-prevent');
      }
    };

    // Run initial check
    checkScroll();

    // Monitor children updates (e.g. logs being appended)
    const observer = new MutationObserver(checkScroll);
    observer.observe(el, { childList: true, subtree: true, characterData: true });

    // Handle viewport resizing
    window.addEventListener('resize', checkScroll);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', checkScroll);
    };
  }, [ref]);
}
