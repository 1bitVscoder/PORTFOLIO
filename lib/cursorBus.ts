/**
 * Shared cursor coordinate bus.
 *
 * Avoids round-tripping mouse position through inline CSS custom properties
 * (--cursor-x / --cursor-y). The previous coupling forced consumers to
 * parseFloat the inline-style attribute every frame, which is both slower than
 * a module mutable and brittle — it only works while CustomCursor is mounted
 * AND actively writing the vars (gated by spotlight state).
 *
 * Producers (CustomCursor): mutate `cursorBus.x` / `cursorBus.y` on every
 * mousemove / ticker tick.
 *
 * Consumers (HeroText spotlight, future highlighters): read `cursorBus.x`,
 * `cursorBus.y` synchronously when needed.
 */
export const cursorBus = { x: 0, y: 0 };

/**
 * Reset the bus to origin. The bus is module-level mutable state with no
 * inherent lifecycle, so the last cursor position persists across route
 * changes. Consumers re-read on the next mousemove, making this harmless in
 * practice — but call this if a consumer needs a deterministic starting point
 * (e.g. on mount before the first pointer event).
 */
export function resetCursorBus() {
  cursorBus.x = 0;
  cursorBus.y = 0;
}
