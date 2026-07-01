'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { designTokens, features } from '@/data';

/**
 * Accent Color Cycling System
 *
 * Behavior:
 * - First load (new tab/session) → Default color (#62b6cb)
 * - Page refresh (same tab) → Random color from array
 * - Menu open → Next color in sequence
 * - Close tab & reopen → Reset to default
 */

// Color palette from design tokens
const ACCENT_COLORS = designTokens.colors.accentPalette;

const DEFAULT_INDEX = Math.min(
  features.accentColorRotation.defaultColorIndex,
  ACCENT_COLORS.length - 1
);
const STORAGE_KEY = features.welcomeScreen.storageKey;
const CSS_VAR_NAME = features.accentColorRotation.cssVariableName;

// Context type
interface AccentColorContextType {
  color: string;
  colorIndex: number;
  cycleColor: () => void;
}

// Create context with null default
const AccentColorContext = createContext<AccentColorContextType | null>(null);

// Provider component
export function AccentColorProvider({ children }: { children: ReactNode }) {
  // Initialize with a function to compute initial state. Reads only — the
  // sessionStorage WRITE that marks "has loaded" happens in an effect below
  // so that React StrictMode (dev)'s double-invocation of the initializer
  // doesn't make first load look like a refresh in dev.
  const [colorIndex, setColorIndex] = useState(() => {
    if (typeof window === 'undefined') {
      return DEFAULT_INDEX;
    }
    try {
      const hasLoaded = sessionStorage.getItem(STORAGE_KEY);
      if (!hasLoaded) return DEFAULT_INDEX;
      return Math.floor(Math.random() * ACCENT_COLORS.length);
    } catch {
      return DEFAULT_INDEX;
    }
  });

  // Mark the session as loaded exactly once, on mount. Side effect lives in
  // an effect so it survives React StrictMode (dev) double-render.
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      /* storage unavailable — treat as in-memory fallback */
    }
  }, []);

  // Update CSS variable on mount and when color changes
  useEffect(() => {
    const root = document.documentElement;
    const prev = root.style.getPropertyValue(CSS_VAR_NAME);
    const next = ACCENT_COLORS[colorIndex];
    if (next) {
      root.style.setProperty(CSS_VAR_NAME, next);
    }
    return () => {
      if (prev) {
        root.style.setProperty(CSS_VAR_NAME, prev);
      } else {
        root.style.removeProperty(CSS_VAR_NAME);
      }
    };
  }, [colorIndex]);

  // Cycle to next color (for menu open)
  const cycleColor = useCallback(() => {
    setColorIndex((prev) => (prev + 1) % ACCENT_COLORS.length);
  }, []);

  const value = useMemo<AccentColorContextType>(() => ({
    color: ACCENT_COLORS[colorIndex],
    colorIndex,
    cycleColor,
  }), [colorIndex, cycleColor]);

  return (
    <AccentColorContext.Provider value={value}>
      {children}
    </AccentColorContext.Provider>
  );
}

// Custom hook for consuming context
export function useAccentColor(): AccentColorContextType {
  const context = useContext(AccentColorContext);

  if (!context) {
    throw new Error('useAccentColor must be used within AccentColorProvider');
  }

  return context;
}

// Export colors for direct access if needed
export { ACCENT_COLORS };
