import type { ServiceFace } from '@/data';
import { PAD_CELLS } from './constants';

/* One cell on the dial strip. Padding cells render empty content and are
   never reported by `tunedAt(); they exist purely to give the first and
   last real tools room to pass the centred needle. */
export type DialCell = {
  /** Index of the zone this cell belongs to. Padding cells clamp to the
      nearest real zone (0 for leading pad, last for trailing pad). */
  readonly zoneIdx: number;
  /** Display name of the tool, or empty string for padding cells. */
  readonly name: string;
  readonly isPad: boolean;
};

/* Build the full ordered list of dial cells across all zones, with padding
   at both ends. Pure — same input always yields the same output, no DOM. */
export function buildCells(zones: ReadonlyArray<ServiceFace>): DialCell[] {
  const cells: DialCell[] = [];
  for (let i = 0; i < PAD_CELLS; i++) {
    cells.push({ zoneIdx: 0, name: '', isPad: true });
  }
  zones.forEach((zone, zi) => {
    zone.tools.forEach((tool) => {
      cells.push({ zoneIdx: zi, name: tool, isPad: false });
    });
  });
  const lastZone = Math.max(0, zones.length - 1);
  for (let i = 0; i < PAD_CELLS; i++) {
    cells.push({ zoneIdx: lastZone, name: '', isPad: true });
  }
  return cells;
}

/* `true` if the cell at index `i` is the first real cell of a new zone —
   used by the strip builder to mark major notches. Returns `false` for
   padding cells and for the leading edge of the trailing pad. */
export function isZoneBoundary(cells: ReadonlyArray<DialCell>, i: number): boolean {
  const curr = cells[i];
  const prev = cells[i - 1];
  if (!curr || curr.isPad) return false;
  if (!prev) return true;
  return prev.isPad || prev.zoneIdx !== curr.zoneIdx;
}

/* Count of real (non-padding) cells. Called once on mount and cached for
   the lifetime of the section — `indexAtNeedle` runs on every scroll tick
   so we avoid re-scanning the array per frame. */
export function countRealCells(cells: ReadonlyArray<DialCell>): number {
  return cells.filter((c) => !c.isPad).length;
}

/* Convert scroll progress (0..1) to a fractional cell index across the
   dial, accounting for the leading padding. Progress 0 lands on the first
   real cell; progress 1 lands on the last real cell. `realCount` is
   accepted as a parameter so callers can cache it across calls (see
   `countRealCells`); the Math.max guards the degenerate single-cell case
   where `realCount - 1 = 0` would lose progress sensitivity gracefully. */
export function indexAtNeedle(progress: number, realCount: number): number {
  return progress * Math.max(0, realCount - 1) + PAD_CELLS;
}

/* Closest real cell to a fractional needle index. Rounds `idxFloat` to the
   nearest cell, then clamps that index into the real-cell range so a needle
   parked just past either edge (e.g. idxFloat < PAD_CELLS, which would
   otherwise round onto a leading-pad cell) snaps to the first/last real cell
   rather than dropping the swap.

   `realCount = cells.length - 2*PAD_CELLS`, so the inclusive real range is
   [PAD_CELLS, PAD_CELLS + realCount - 1] = [PAD_CELLS, cells.length - 1 - PAD_CELLS].
   The clamp therefore always lands on a real cell, so the trailing
   `!cell.isPad` check is a belt-and-suspenders guard, not a reachable path.
   Returns null only if the cells array hasn't been seeded yet (defensive —
   shouldn't happen post-mount). */
export function tunedAt(
  idxFloat: number,
  cells: ReadonlyArray<DialCell>,
): DialCell | null {
  if (cells.length <= 2 * PAD_CELLS) return null;
  const min = PAD_CELLS;
  const max = cells.length - 1 - PAD_CELLS;
  const i = Math.min(max, Math.max(min, Math.round(idxFloat)));
  const cell = cells[i];
  return cell && !cell.isPad ? cell : null;
}
