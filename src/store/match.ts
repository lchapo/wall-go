// Session-scoped match metadata: who is playing, which colour they drew this
// match, and the running win tally. Deliberately separate from `useGame` so that
// none of it ends up inside the board history snapshots.
import { create } from 'zustand'
import type { GameMode, Player } from '@/lib/types'
import type { GameResult } from '@/utils/game'

export interface AiTally {
  you: number
  ai: number
  draws: number
}

export interface MatchState {
  /** Bumped on every new match; used to make result recording idempotent. */
  matchId: number
  /** The two PvP player names, stable across a series. */
  pvpNames: [string, string]
  /** This match's colour assignment. Red always moves first. */
  colorToName: Record<Player, string>
  /** PvP win tally, keyed by player NAME so it survives colour swaps. */
  pvpWins: Record<string, number>
  pvpDraws: number
  aiWins: AiTally
  countedMatchId: number | null

  setPvpNames: (names: [string, string]) => void
  /** Begin a new match: bump `matchId`, and reassign colours when names are given. */
  startMatch: (redName?: string, blueName?: string) => void
  recordResult: (mode: GameMode, result: GameResult, humanSide: Player | null) => void
  resetSeries: () => void
}

export const DEFAULT_PVP_NAMES: [string, string] = ['Player 1', 'Player 2']

export const useMatch = create<MatchState>((set, get) => ({
  matchId: 1,
  pvpNames: [...DEFAULT_PVP_NAMES] as [string, string],
  colorToName: { R: DEFAULT_PVP_NAMES[0], B: DEFAULT_PVP_NAMES[1] },
  pvpWins: {},
  pvpDraws: 0,
  aiWins: { you: 0, ai: 0, draws: 0 },
  countedMatchId: null,

  setPvpNames(names) {
    set({ pvpNames: names })
  },

  startMatch(redName, blueName) {
    set((state) => ({
      matchId: state.matchId + 1,
      colorToName: redName && blueName ? { R: redName, B: blueName } : state.colorToName,
    }))
  },

  recordResult(mode, result, humanSide) {
    const { matchId, countedMatchId, colorToName } = get()
    // A match counts once. Rewinding out of a finished game and finishing it
    // again must not credit a second win.
    if (countedMatchId === matchId) return
    if (!result.finished) return

    if (mode === 'ai') {
      set((state) => {
        const next = { ...state.aiWins }
        if (result.tie || !result.winner) next.draws++
        else if (result.winner === humanSide) next.you++
        else next.ai++
        return { aiWins: next, countedMatchId: matchId }
      })
      return
    }

    set((state) => {
      if (result.tie || !result.winner) {
        return { pvpDraws: state.pvpDraws + 1, countedMatchId: matchId }
      }
      const name = colorToName[result.winner]
      return {
        pvpWins: { ...state.pvpWins, [name]: (state.pvpWins[name] ?? 0) + 1 },
        countedMatchId: matchId,
      }
    })
  },

  resetSeries() {
    // `countedMatchId` is deliberately left alone: clearing it would let the
    // already-finished current match be re-counted straight back in.
    set({
      pvpWins: {},
      pvpDraws: 0,
      aiWins: { you: 0, ai: 0, draws: 0 },
    })
  },
}))
