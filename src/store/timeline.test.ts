import { describe, it, expect } from 'vitest'
import { getTurnBoundaries, isTurnBoundary, sliderValueForIndex } from './timeline'
import { makeInitialState, snapshotFromState } from './gameState'
import type { GameSnapshot } from '@/lib/types'

/** A snapshot as it looks partway through a turn (stone picked up, steps spent). */
function midTurn(steps: number): GameSnapshot {
  const s = snapshotFromState(makeInitialState())
  s.selected = { x: 1, y: 1 }
  s.stepsTaken = steps
  return s
}

/** A snapshot as it looks at the end of a turn. */
function turnEnd(): GameSnapshot {
  return snapshotFromState(makeInitialState())
}

describe('timeline', () => {
  it('回合結束的 snapshot 才算 boundary', () => {
    expect(isTurnBoundary(turnEnd())).toBe(true)
    expect(isTurnBoundary(midTurn(1))).toBe(false)
    expect(isTurnBoundary(midTurn(2))).toBe(false)
  })

  it('兩步移動加建牆只算一手', () => {
    // 0: start, 1-4: placements, 5/6: the two move steps, 7: the wall
    const timeline: GameSnapshot[] = [
      turnEnd(),
      turnEnd(),
      turnEnd(),
      turnEnd(),
      turnEnd(),
      midTurn(1),
      midTurn(2),
      turnEnd(),
    ]
    expect(getTurnBoundaries(timeline)).toEqual([0, 1, 2, 3, 4, 7])
  })

  it('回合進行中會對應到最後一個完成的回合', () => {
    const boundaries = [0, 1, 2, 3, 4, 7]
    expect(sliderValueForIndex(boundaries, 0)).toBe(0)
    expect(sliderValueForIndex(boundaries, 4)).toBe(4)
    // Mid-turn indices 5 and 6 still read as move 4.
    expect(sliderValueForIndex(boundaries, 5)).toBe(4)
    expect(sliderValueForIndex(boundaries, 6)).toBe(4)
    expect(sliderValueForIndex(boundaries, 7)).toBe(5)
  })

  it('空的 boundaries 不會回傳負值', () => {
    expect(sliderValueForIndex([], 3)).toBe(0)
  })
})
