import { describe, it, expect } from 'vitest'
import { getTerritoryMap, isStoneSealed } from './territory'
import type { Cell } from '@/lib/types'
import {
  sealedSingle,
  sealedWithRoom,
  mixedRoom,
  addOpenStones,
} from './sealedFixtures.test-helpers'

describe('getTerritoryMap', () => {
  it('one stone, fully walled, territory belongs to owner', () => {
    const N = 3
    const board: Cell[][] = Array.from({ length: N }, () =>
      Array.from({ length: N }, () => ({
        stone: null,
        wallTop: null,
        wallLeft: null,
      })),
    )
    board[1][1].stone = 'R'
    board[1][1].wallTop = 'R'
    board[1][1].wallLeft = 'R'
    board[1][2].wallLeft = 'R'
    board[2][1].wallTop = 'R'
    const territory = getTerritoryMap(board)
    expect(territory[1][1]).toBe('R')
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        if (x === 1 && y === 1) continue
        expect(territory[y][x]).toBe(null)
      }
    }
  })

  it('two stones, two regions, both fully walled', () => {
    const N = 4
    const board: Cell[][] = Array.from({ length: N }, () =>
      Array.from({ length: N }, () => ({
        stone: null,
        wallTop: null,
        wallLeft: null,
      })),
    )
    board[0][0].stone = 'R'
    board[0][0].wallTop = 'R'
    board[0][0].wallLeft = 'R'
    board[1][0].wallTop = 'R'
    board[0][1].wallLeft = 'R'
    board[3][3].stone = 'B'
    board[3][3].wallLeft = 'B'
    board[3][3].wallTop = 'B'
    board[2][3].wallLeft = 'B'
    board[3][2].wallTop = 'B'
    const territory = getTerritoryMap(board)
    expect(territory[0][0]).toBe('R')
    expect(territory[3][3]).toBe('B')
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        if ((x === 0 && y === 0) || (x === 3 && y === 3)) continue
        expect(territory[y][x]).toBe(null)
      }
    }
  })
})

describe('isStoneSealed', () => {
  it('is true for a stone alone in a walled room, whatever the room size', () => {
    expect(isStoneSealed(sealedSingle(), { x: 0, y: 0 })).toBe(true)
    expect(isStoneSealed(sealedWithRoom(), { x: 0, y: 0 })).toBe(true)
  })

  it('is false while an opposing stone shares the room', () => {
    const board = mixedRoom()
    expect(isStoneSealed(board, { x: 0, y: 0 })).toBe(false)
    expect(isStoneSealed(board, { x: 1, y: 0 })).toBe(false)
  })

  it('is false for stones in the open and for empty cells', () => {
    const board = addOpenStones(sealedSingle())
    expect(isStoneSealed(board, { x: 3, y: 3 })).toBe(false)
    expect(isStoneSealed(board, { x: 3, y: 4 })).toBe(false)
    expect(isStoneSealed(board, { x: 1, y: 0 })).toBe(false)
  })

  it('gives the same answer with a precomputed territory map', () => {
    const board = addOpenStones(sealedWithRoom())
    const map = getTerritoryMap(board)
    expect(isStoneSealed(board, { x: 0, y: 0 }, map)).toBe(true)
    expect(isStoneSealed(board, { x: 3, y: 3 }, map)).toBe(false)
  })
})
