'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useTransition } from './useTransition';

/**
 * Notifies the TransitionProvider when the current page components have finished
 * mounting bottom-up in the client DOM.
 */
export function PageReadyNotifier({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { markPageReady } = useTransition();

  useEffect(() => {
    // Executed after all child components have mounted and rendered
    markPageReady(pathname);
  }, [pathname, markPageReady]);

  return <>{children}</>;
}
