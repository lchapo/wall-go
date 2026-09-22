import { describe, it, expect } from 'vitest'
import { advanceTurn } from './actions'
import {
  sealedSingle,
  sealedWithRoom,
  addOpenStones,
  addSealedBlueCorner,
} from '@/utils/sealedFixtures.test-helpers'

describe('advanceTurn', () => {
  it('hands the turn to the opponent while they still have a free stone', () => {
    const board = addOpenStones(sealedSingle())
    expect(advanceTurn(board, 'R', ['R', 'B'])).toEqual({ turn: 'B' })
    expect(advanceTurn(board, 'B', ['R', 'B'])).toEqual({ turn: 'R' })
  })

  it('reports allBlocked when every stone on the board is sealed', () => {
    // Defensive branch only: `buildWall` runs `checkGameEnd` first, which
    // finishes the game before this state is ever handed to `advanceTurn`.
    const board = addSealedBlueCorner(sealedWithRoom())
    expect(advanceTurn(board, 'R', ['R', 'B'])).toEqual({ turn: 'R', skipReason: 'allBlocked' })
  })
})
