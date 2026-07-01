/**
 * Color utility functions for accent color system
 */

/**
 * Convert hex color to RGB object
 * @param hex - Hex color string (e.g., "#62b6cb" or "62b6cb")
 * @returns RGB object { r, g, b }
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  // Expand 3-char shorthand (e.g. "#fff" → "ffffff"). CSS minifiers
  // (Turbopack, cssnano) collapse #ffffff to #fff, and getComputedStyle
  // returns whatever the cascade resolved to — so callers can receive either.
  let cleanHex = hex.trim().replace(/^#/, '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map((c) => c + c).join('');
  }

  // Reject anything that isn't a clean 6-char hex (e.g. "rgb(...)", named
  // colors, or empty strings from getComputedStyle). Returning NaN channels
  // would render an invalid "rgba(NaN, NaN, NaN, …)" that silently draws nothing.
  if (!/^[0-9a-fA-F]{6}$/.test(cleanHex)) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`hexToRgb: invalid hex color "${hex}" — falling back to black`);
    }
    return { r: 0, g: 0, b: 0 };
  }

  return {
    r: parseInt(cleanHex.substring(0, 2), 16),
    g: parseInt(cleanHex.substring(2, 4), 16),
    b: parseInt(cleanHex.substring(4, 6), 16),
  };
}

/**
 * Convert hex to rgba string for canvas operations
 * @param hex - Hex color string
 * @param alpha - Opacity value (0-1)
 * @returns rgba string
 */
export function hexToRgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
