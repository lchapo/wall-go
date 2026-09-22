// src/utils/territory.ts
import type { Player, Cell, Pos } from '@/lib/types'
import { floodRegions } from './region'

// 回傳每格領地歸屬（純淨區域才標記，否則為 null）
export function getTerritoryMap(board: Cell[][]): (Player | null)[][] {
  const BOARD_SIZE = board.length
  const territory = Array.from({ length: BOARD_SIZE }, () =>
    Array<Player | null>(BOARD_SIZE).fill(null),
  )
  const regions = floodRegions(board)
  regions.forEach(({ borderingCounts: bc, cells }) => {
    const numPlayers = (bc['R'] > 0 ? 1 : 0) + (bc['B'] > 0 ? 1 : 0)
    if (numPlayers === 1) {
      const owner = bc['R'] > 0 ? 'R' : 'B'
      cells.forEach(({ x, y }) => {
        territory[y][x] = owner
      })
    }
  })
  return territory
}

/**
 * A stone is sealed once its wall-bounded room holds stones of one colour only.
 * This is exactly the test `getTerritoryMap` uses to tint a cell and score it,
 * so "the piece can no longer act" and "the room is claimed" always agree.
 *
 * Callers that loop over many stones should compute the map once and pass it in.
 */
export function isStoneSealed(
  board: Cell[][],
  pos: Pos,
  territoryMap: (Player | null)[][] = getTerritoryMap(board),
): boolean {
  return board[pos.y][pos.x].stone !== null && territoryMap[pos.y][pos.x] !== null
}
