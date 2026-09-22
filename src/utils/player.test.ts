import { describe, it, expect } from 'vitest'
import { playerHasMove } from './player'
import { getTerritoryMap } from './territory'
import {
  sealedSingle,
  sealedWithRoom,
  mixedRoom,
  addOpenStones,
  addSealedBlueCorner,
} from './sealedFixtures.test-helpers'

describe('playerHasMove', () => {
  it('is false when every stone is sealed, even if a sealed stone could step or build', () => {
    const board = addSealedBlueCorner(sealedWithRoom())
    expect(playerHasMove(board, 'R')).toBe(false)
    expect(playerHasMove(board, 'B')).toBe(false)
  })

  it('is true for both sides sharing a room, even when only a wall build is possible', () => {
    const board = mixedRoom()
    expect(playerHasMove(board, 'R')).toBe(true)
    expect(playerHasMove(board, 'B')).toBe(true)
  })

  it('ignores a sealed stone but still counts a free one', () => {
    const board = addOpenStones(sealedSingle())
    expect(playerHasMove(board, 'R')).toBe(true)
    expect(playerHasMove(board, 'B')).toBe(true)
  })

  it('accepts a precomputed territory map', () => {
    const board = addSealedBlueCorner(sealedWithRoom())
    expect(playerHasMove(board, 'R', getTerritoryMap(board))).toBe(false)
  })
})
