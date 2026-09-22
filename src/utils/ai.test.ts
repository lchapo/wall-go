import { describe, it, expect } from 'vitest'
import { getLegalActions, getRandomWallActionForPlayer } from './ai'
import type { Cell, GameSnapshot, Pos } from '@/lib/types'
import {
  sealedWithRoom,
  mixedRoom,
  addOpenStones,
  addSealedBlueCorner,
} from './sealedFixtures.test-helpers'

function playingState(board: Cell[][]): GameSnapshot {
  return {
    board,
    turn: 'R',
    phase: 'playing',
    legal: new Set(),
    stepsTaken: 0,
    players: ['R', 'B'],
    stonesLimit: 4,
    stonesPlaced: { R: 4, B: 4 },
  }
}

const isFrom = (pos: Pos) => (a: { from?: Pos }) => a.from?.x === pos.x && a.from?.y === pos.y

describe('getLegalActions with sealed stones', () => {
  it('never proposes an action for a sealed stone', () => {
    const state = playingState(addOpenStones(sealedWithRoom()))
    const actions = getLegalActions(state)
    expect(actions.length).toBeGreaterThan(0)
    expect(actions.some(isFrom({ x: 0, y: 0 }))).toBe(false)
    expect(actions.filter(isFrom({ x: 3, y: 3 })).some((a) => a.type === 'move')).toBe(true)
    expect(actions.filter(isFrom({ x: 3, y: 3 })).some((a) => a.type === 'wall')).toBe(true)
  })

  it('still lets a stone that shares its room with the opponent build a wall', () => {
    const state = playingState(addOpenStones(mixedRoom()))
    const fromCorner = getLegalActions(state).filter(isFrom({ x: 0, y: 0 }))
    expect(fromCorner.length).toBeGreaterThan(0)
    // Its only neighbour is occupied, so nothing but a stand-still wall is possible.
    expect(fromCorner.every((a) => a.type === 'wall')).toBe(true)
  })

  it('returns no actions once every stone of the side to move is sealed', () => {
    const state = playingState(addSealedBlueCorner(sealedWithRoom()))
    expect(getLegalActions(state)).toEqual([])
  })
})

describe('getRandomWallActionForPlayer with sealed stones', () => {
  it('only ever builds from a free stone', () => {
    const state = playingState(addOpenStones(sealedWithRoom()))
    for (let i = 0; i < 20; i++) {
      const action = getRandomWallActionForPlayer(state, 'R')
      expect(action).not.toBeNull()
      expect(action!.from).toEqual({ x: 3, y: 3 })
    }
  })

  it('returns null when every stone is sealed', () => {
    const state = playingState(addSealedBlueCorner(sealedWithRoom()))
    expect(getRandomWallActionForPlayer(state, 'R')).toBeNull()
  })
})
