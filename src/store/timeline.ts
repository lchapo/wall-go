// Helpers for presenting `_history ++ _future` as a list of whole turns.
//
// History is stored at sub-turn granularity: a two-step move pushes two `moveTo`
// snapshots before the `buildWall` snapshot that ends the turn. A snapshot marks a
// completed turn iff nothing is mid-move — no stone selected and no steps taken.
import type { GameSnapshot } from '@/lib/types'

export function isTurnBoundary(s: GameSnapshot): boolean {
  return !s.selected && s.stepsTaken === 0
}

/** Indices into `timeline` that correspond to completed turns (index 0 is the start position). */
export function getTurnBoundaries(timeline: GameSnapshot[]): number[] {
  const boundaries: number[] = []
  for (let i = 0; i < timeline.length; i++) {
    if (isTurnBoundary(timeline[i])) boundaries.push(i)
  }
  return boundaries
}

/**
 * Slider value for a timeline index. Mid-turn the live index is not itself a
 * boundary, so this resolves to the last completed turn at or before it.
 */
export function sliderValueForIndex(boundaries: number[], timelineIndex: number): number {
  return Math.max(0, boundaries.filter((b) => b <= timelineIndex).length - 1)
}
