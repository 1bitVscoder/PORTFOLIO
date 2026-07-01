import type { CSSProperties } from 'react';

/**
 * Build a style object carrying CSS custom properties.
 *
 * React's `CSSProperties` type has no index signature for `--*` names, so
 * inline custom properties otherwise require a per-call `{ ['--x' as string]:
 * v } as CSSProperties` cast. This helper centralizes that one cast behind a
 * key type that still enforces the `--` prefix, so call sites stay typed and
 * the unsafe widening lives in exactly one place.
 *
 * @example
 *   style={cssVars({ '--row-accent': project.accent })}
 *   style={{ ...cssVars({ '--x': `${x}px` }), opacity }}
 */
export function cssVars(
  vars: Record<`--${string}`, string | number>
): CSSProperties {
  return vars as CSSProperties;
}
