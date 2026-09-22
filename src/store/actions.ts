import { playerHasMove } from '@/utils/player'
import { getTerritoryMap } from '@/utils/territory'
import type { Player, Cell } from '@/lib/types'

export function placingTurnIndex(totalPlaced: number, playerCount: number) {
  const round = Math.floor(totalPlaced / playerCount)
  const idx = totalPlaced % playerCount
  return round % 2 === 0 ? idx : playerCount - 1 - idx
}

export function advanceTurn(board: Cell[][], current: Player, PLAYERS: Player[]) {
  // With two players, a side whose stones are all sealed implies the other
  // side's stones are sealed too (an unsealed stone shares its room with an
  // opposing stone, which is then unsealed as well), and `checkGameEnd` has
  // already finished the game. The skip loop below is therefore defensive.
  const territoryMap = getTerritoryMap(board)
  let idx = PLAYERS.indexOf(current)
  for (let i = 0; i < PLAYERS.length; i++) {
    idx = (idx + 1) % PLAYERS.length
    const p = PLAYERS[idx]
    if (playerHasMove(board, p, territoryMap)) {
      return { turn: p }
    }
  }
  return { turn: current, skipReason: 'allBlocked' as const }
}
