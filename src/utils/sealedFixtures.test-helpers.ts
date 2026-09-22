// Shared 7×7 board fixtures for the "sealed stone" rule tests.
// Coordinates are {x, y}; a cell is board[y][x]. A wall to the right of (x, y)
// is board[y][x + 1].wallLeft, a wall below it is board[y + 1][x].wallTop.
import { BOARD_SIZE, type Cell } from '@/lib/types'

export function makeEmptyBoard(): Cell[][] {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => ({
      stone: null,
      wallTop: null,
      wallLeft: null,
    })),
  )
}

/** Red at (0,0) alone in a one-cell room. */
export function sealedSingle(board = makeEmptyBoard()): Cell[][] {
  board[0][0].stone = 'R'
  board[1][0].wallTop = 'R'
  board[0][1].wallLeft = 'R'
  return board
}

/**
 * Red at (0,0) alone in the two-cell room {(0,0), (1,0)}. The stone could still
 * step to (1,0) and still has open sides, which is exactly what the old rule
 * allowed and the new rule forbids.
 */
export function sealedWithRoom(board = makeEmptyBoard()): Cell[][] {
  board[0][0].stone = 'R'
  board[1][0].wallTop = 'R'
  board[1][1].wallTop = 'R'
  board[0][2].wallLeft = 'R'
  return board
}

/** Same room as `sealedWithRoom`, but Blue shares it at (1,0): nobody is sealed. */
export function mixedRoom(board = makeEmptyBoard()): Cell[][] {
  sealedWithRoom(board)
  board[0][1].stone = 'B'
  return board
}

/** One free stone per side in the open part of the board, keeping the game live. */
export function addOpenStones(board: Cell[][]): Cell[][] {
  board[3][3].stone = 'R'
  board[4][3].stone = 'B'
  return board
}

/** Blue at (6,6) alone in a one-cell room. */
export function addSealedBlueCorner(board: Cell[][]): Cell[][] {
  board[6][6].stone = 'B'
  board[6][6].wallTop = 'B'
  board[6][6].wallLeft = 'B'
  return board
}
