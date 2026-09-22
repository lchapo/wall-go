import { beforeAll } from 'vitest'
import { JSDOM } from 'jsdom'

beforeAll(() => {
  if (typeof window === 'undefined') {
    const dom = new JSDOM('<!doctype html><html><body></body></html>')
    globalThis.window = dom.window as DOMWindow & typeof globalThis
    globalThis.document = dom.window.document
    globalThis.navigator = dom.window.navigator
  }
})

import { act, renderHook } from '@testing-library/react'
import { useGame } from './index'
import { PLAYER_LIST, STONES_PER_PLAYER, type Cell, type Pos, type State } from '@/lib/types'
import { describe, it, expect, beforeEach } from 'vitest'
import type { DOMWindow } from 'jsdom'
import { getTerritoryMap } from '@/utils/territory'
import { snapshotFromState } from './gameState'
import {
  makeEmptyBoard,
  sealedSingle,
  sealedWithRoom,
  addOpenStones,
} from '@/utils/sealedFixtures.test-helpers'

type GameHook = { current: State }

/**
 * Finish the placing phase along the empty top row.
 *
 * The board starts with two stones per player already down, so exactly four
 * placements remain and they alternate Red, Blue, Blue, Red. Afterwards:
 * (0,0)=R (1,0)=B (2,0)=B (3,0)=R, phase is 'playing' and it is Red's turn.
 */
function finishPlacing(result: GameHook) {
  for (const x of [0, 1, 2, 3]) {
    act(() => {
      result.current.placeStone({ x, y: 0 })
    })
  }
}

/**
 * Drop straight into the action phase on a hand-built board, Red to move. The
 * board becomes the root of the timeline so undo can rewind to it.
 */
function startPlayingOn(board: Cell[][]) {
  act(() => {
    useGame.setState({
      board,
      phase: 'playing',
      turn: 'R',
      selected: undefined,
      legal: new Set(),
      stepsTaken: 0,
      skipReason: undefined,
      result: undefined,
    })
    useGame.setState({ _history: [snapshotFromState(useGame.getState())], _future: [] })
  })
}

describe('Game Store', () => {
  // `useGame` is a module-level store shared by every test, so each block has to
  // start from a clean slate or it inherits the previous board.
  beforeEach(() => {
    act(() => {
      useGame.getState().setHumanSide(null)
      useGame.getState().resetGame()
    })
  })

  it('placeStone: 正確擺子與換手', () => {
    const { result } = renderHook(() => useGame())
    const pos: Pos = { x: 0, y: 0 }
    act(() => {
      result.current.placeStone(pos)
    })
    expect(result.current.board[0][0].stone).toBe(PLAYER_LIST[0])
    expect(result.current.turn).toBe(PLAYER_LIST[1])
    expect(result.current.phase).toBe('placing')
  })

  it('placeStone: 擺滿進入 playing', () => {
    const { result } = renderHook(() => useGame())
    // Two stones per player are pre-placed, so only four placements remain.
    for (const y of [0, 1, 2]) {
      act(() => {
        result.current.placeStone({ x: 0, y })
      })
      expect(result.current.phase).toBe('placing')
    }
    act(() => {
      result.current.placeStone({ x: 0, y: 3 })
    })
    expect(result.current.phase).toBe('playing')
    // Red places the last counter and opens the action phase.
    expect(result.current.turn).toBe(PLAYER_LIST[0])
    for (const p of PLAYER_LIST) {
      expect(result.current.stonesPlaced[p]).toBe(STONES_PER_PLAYER)
    }
  })

  it('moveTo: 棋子移動與步數', () => {
    const { result } = renderHook(() => useGame())
    finishPlacing(result)
    act(() => {
      result.current.selectStone({ x: 0, y: 0 })
    })
    act(() => {
      result.current.moveTo({ x: 0, y: 1 })
    })
    expect(result.current.board[0][0].stone).toBe(null)
    expect(result.current.board[1][0].stone).toBe(PLAYER_LIST[0])
    expect(result.current.stepsTaken).toBe(1)
    // Moving does not end the turn — a wall still has to be built.
    expect(result.current.turn).toBe(PLAYER_LIST[0])
  })

  it('buildWall: 能建牆', () => {
    const { result } = renderHook(() => useGame())
    finishPlacing(result)
    act(() => {
      result.current.selectStone({ x: 0, y: 0 })
    })
    // A wall to the right of (0,0) is stored as the left wall of (1,0).
    act(() => {
      result.current.buildWall({ x: 0, y: 0 }, 'right')
    })
    expect(result.current.board[0][1].wallLeft).toBe(PLAYER_LIST[0])
    // Building a wall ends the turn.
    expect(result.current.turn).toBe(PLAYER_LIST[1])
    expect(result.current.selected).toBeUndefined()
    expect(result.current.stepsTaken).toBe(0)
  })

  it('undo/redo: 歷史紀錄正確', () => {
    const { result } = renderHook(() => useGame())
    act(() => {
      result.current.placeStone({ x: 0, y: 0 })
    })
    act(() => {
      result.current.placeStone({ x: 1, y: 0 })
    })
    expect(result.current.canUndo).toBe(true)
    act(() => {
      result.current.undo()
    })
    expect(result.current.board[0][1].stone).toBe(null)
    act(() => {
      result.current.redo()
    })
    expect(result.current.board[0][1].stone).toBe(PLAYER_LIST[1])
  })

  it('resetGame: 清空歷史，無法 undo 回到前局', () => {
    const { result } = renderHook(() => useGame())
    act(() => {
      result.current.placeStone({ x: 0, y: 0 })
    })
    expect(result.current.canUndo).toBe(true)
    act(() => {
      result.current.resetGame()
    })
    expect(result.current.board[0][0].stone).toBe(null)
    // A new game starts a new timeline: undo must not reach across the reset.
    expect(result.current.canUndo).toBe(false)
    expect(result.current.canRedo).toBe(false)
    expect(result.current._history).toHaveLength(1)
    act(() => {
      result.current.undo()
    })
    expect(result.current.board[0][0].stone).toBe(null)
  })

  it('多步 undo/redo', () => {
    const { result } = renderHook(() => useGame())
    act(() => {
      result.current.placeStone({ x: 0, y: 0 })
    })
    act(() => {
      result.current.placeStone({ x: 1, y: 0 })
    })
    act(() => {
      result.current.placeStone({ x: 2, y: 0 })
    })
    act(() => {
      result.current.undo()
    })
    act(() => {
      result.current.undo()
    })
    expect(result.current.board[0][0].stone).toBe(PLAYER_LIST[0])
    expect(result.current.board[0][1].stone).toBe(null)
    act(() => {
      result.current.redo()
    })
    expect(result.current.board[0][1].stone).toBe(PLAYER_LIST[1])
  })

  it('placeStone: 不可重複下子', () => {
    const { result } = renderHook(() => useGame())
    act(() => {
      result.current.placeStone({ x: 0, y: 0 })
    })
    const historyLength = result.current._history.length
    act(() => {
      result.current.placeStone({ x: 0, y: 0 })
    })
    expect(result.current.board[0][0].stone).toBe(PLAYER_LIST[0])
    // The rejected placement must not consume a stone, a turn, or a history entry.
    expect(result.current.turn).toBe(PLAYER_LIST[1])
    expect(result.current.stonesPlaced[PLAYER_LIST[1]]).toBe(2)
    expect(result.current._history).toHaveLength(historyLength)
  })

  it('moveTo: 非法移動不會改變狀態', () => {
    const { result } = renderHook(() => useGame())
    finishPlacing(result)
    act(() => {
      result.current.selectStone({ x: 0, y: 0 })
    })
    act(() => {
      result.current.moveTo({ x: 6, y: 6 })
    })
    expect(result.current.board[0][0].stone).toBe(PLAYER_LIST[0])
    expect(result.current.board[6][6].stone).toBe(null)
    expect(result.current.stepsTaken).toBe(0)
  })

  it('buildWall: 非法建牆不會改變狀態', () => {
    const { result } = renderHook(() => useGame())
    finishPlacing(result)
    act(() => {
      result.current.selectStone({ x: 0, y: 0 })
    })
    const historyLength = result.current._history.length

    // The board edge already counts as a wall, so 'top'/'left' at (0,0) are illegal.
    act(() => {
      result.current.buildWall({ x: 0, y: 0 }, 'top')
    })
    expect(result.current.board[0][0].wallTop).toBe(null)
    act(() => {
      result.current.buildWall({ x: 0, y: 0 }, 'left')
    })
    expect(result.current.board[0][0].wallLeft).toBe(null)

    // A wall may only be built beside the stone that just acted.
    act(() => {
      result.current.buildWall({ x: 1, y: 1 }, 'right')
    })
    expect(result.current.board[1][2].wallLeft).toBe(null)

    // None of the rejected builds may end the turn or grow the history.
    expect(result.current.turn).toBe(PLAYER_LIST[0])
    expect(result.current.selected).toEqual({ x: 0, y: 0 })
    expect(result.current._history).toHaveLength(historyLength)
  })

  it('遊戲結束後操作無效', () => {
    const { result } = renderHook(() => useGame())
    finishPlacing(result)
    act(() => {
      result.current.selectStone({ x: 0, y: 0 })
    })
    act(() => {
      result.current.setPhase('finished')
    })
    const historyLength = result.current._history.length

    act(() => {
      result.current.placeStone({ x: 4, y: 0 })
    })
    expect(result.current.board[0][4].stone).toBe(null)
    act(() => {
      result.current.moveTo({ x: 0, y: 1 })
    })
    expect(result.current.board[0][0].stone).toBe(PLAYER_LIST[0])
    expect(result.current.board[1][0].stone).toBe(null)
    act(() => {
      result.current.buildWall({ x: 0, y: 0 }, 'right')
    })
    expect(result.current.board[0][1].wallLeft).toBe(null)
    expect(result.current._history).toHaveLength(historyLength)
  })

  it('undo/redo 邊界不可再操作', () => {
    const { result } = renderHook(() => useGame())
    expect(result.current.canUndo).toBe(false)
    act(() => {
      result.current.undo()
    })
    expect(result.current.canUndo).toBe(false)
    expect(result.current._history).toHaveLength(1)
    act(() => {
      result.current.placeStone({ x: 0, y: 0 })
    })
    act(() => {
      result.current.undo()
    })
    expect(result.current.canUndo).toBe(false)
    expect(result.current.board[0][0].stone).toBe(null)
    act(() => {
      result.current.redo()
    })
    expect(result.current.canRedo).toBe(false)
    expect(result.current.board[0][0].stone).toBe(PLAYER_LIST[0])
  })

  it('undo 時應跳過 AI 回合', () => {
    const { result } = renderHook(() => useGame())
    act(() => {
      result.current.setHumanSide('R')
    })
    act(() => {
      result.current.placeStone({ x: 0, y: 0 })
    })
    act(() => {
      result.current.placeStone({ x: 1, y: 0 })
    })
    act(() => {
      result.current.undo()
    })
    expect(result.current.turn).toBe('R')
  })

  describe('jumpTo', () => {
    function freshGame() {
      const { result } = renderHook(() => useGame())
      finishPlacing(result)
      return result
    }

    it('往回跳再往前跳可還原同一盤面', () => {
      const result = freshGame()
      const liveBoard = JSON.stringify(result.current.board)
      const liveIndex = result.current._history.length - 1
      act(() => result.current.jumpTo(1))
      expect(result.current.board[1][0].stone).toBe(null)
      act(() => result.current.jumpTo(liveIndex))
      expect(JSON.stringify(result.current.board)).toBe(liveBoard)
    })

    it('時間軸總長度在跳躍前後不變', () => {
      const result = freshGame()
      const total = result.current._history.length + result.current._future.length
      act(() => result.current.jumpTo(2))
      expect(result.current._history.length + result.current._future.length).toBe(total)
      act(() => result.current.jumpTo(0))
      expect(result.current._history.length + result.current._future.length).toBe(total)
    })

    it('超出範圍的索引會被夾住', () => {
      const result = freshGame()
      act(() => result.current.jumpTo(-5))
      expect(result.current._history.length).toBe(1)
      act(() => result.current.jumpTo(999))
      expect(result.current._future.length).toBe(0)
    })

    it('跳到目前位置為 no-op', () => {
      const result = freshGame()
      const history = result.current._history
      act(() => result.current.jumpTo(history.length - 1))
      expect(result.current._history).toBe(history)
    })

    it('jumpTo(0) 之後不可 undo、可 redo', () => {
      const result = freshGame()
      act(() => result.current.jumpTo(0))
      expect(result.current.canUndo).toBe(false)
      expect(result.current.canRedo).toBe(true)
    })

    it('jumpTo 不會跳過 AI 回合', () => {
      const result = freshGame()
      act(() => result.current.setHumanSide('R'))
      // Index 1 is the state after R's placement, i.e. B to move.
      act(() => result.current.jumpTo(1))
      expect(result.current.turn).toBe('B')
    })

    it('遊戲結束後仍可 undo', () => {
      const result = freshGame()
      act(() => result.current.setPhase('finished'))
      const before = result.current._history.length
      act(() => result.current.undo())
      expect(result.current._history.length).toBeLessThan(before)
      expect(result.current.phase).not.toBe('finished')
    })
  })

  describe('sealed stones', () => {
    it('a stone sealed inside claimed territory cannot be selected, moved, or build', () => {
      const { result } = renderHook(() => useGame())
      startPlayingOn(addOpenStones(sealedWithRoom()))
      const historyLength = result.current._history.length

      act(() => result.current.selectStone({ x: 0, y: 0 }))
      expect(result.current.selected).toBeUndefined()
      expect(result.current.legal.size).toBe(0)

      // (1,0) is empty and inside the room, so the old rule would have allowed this.
      act(() => result.current.moveTo({ x: 1, y: 0 }))
      expect(result.current.board[0][0].stone).toBe('R')
      expect(result.current.board[0][1].stone).toBe(null)

      act(() => result.current.buildWall({ x: 0, y: 0 }, 'right'))
      expect(result.current.board[0][1].wallLeft).toBe(null)
      expect(result.current.turn).toBe('R')
      expect(result.current._history).toHaveLength(historyLength)

      // The free stone still works.
      act(() => result.current.selectStone({ x: 3, y: 3 }))
      expect(result.current.selected).toEqual({ x: 3, y: 3 })
      expect(result.current.legal.size).toBeGreaterThan(0)
    })

    it('a stone becomes unselectable on the turn after it seals itself in', () => {
      const { result } = renderHook(() => useGame())
      const board = addOpenStones(makeEmptyBoard())
      board[0][1].stone = 'R'
      board[1][0].wallTop = 'R'
      board[1][1].wallTop = 'R'
      startPlayingOn(board)

      // Red closes the last gap of the room {(0,0), (1,0)}.
      act(() => result.current.selectStone({ x: 1, y: 0 }))
      act(() => result.current.buildWall({ x: 1, y: 0 }, 'right'))
      expect(result.current.board[0][2].wallLeft).toBe('R')
      // The room is now tinted and scored as Red's, the same test the rule uses.
      const territory = getTerritoryMap(result.current.board)
      expect(territory[0][0]).toBe('R')
      expect(territory[0][1]).toBe('R')
      expect(result.current.phase).toBe('playing')
      expect(result.current.turn).toBe('B')
      expect(result.current.skipReason).toBeUndefined()

      // Blue takes an ordinary turn.
      act(() => result.current.selectStone({ x: 3, y: 4 }))
      act(() => result.current.buildWall({ x: 3, y: 4 }, 'bottom'))
      expect(result.current.turn).toBe('R')

      act(() => result.current.selectStone({ x: 1, y: 0 }))
      expect(result.current.selected).toBeUndefined()
      act(() => result.current.selectStone({ x: 3, y: 3 }))
      expect(result.current.selected).toEqual({ x: 3, y: 3 })
    })

    it('sealing the last free stones ends the game through scoring, not a skip', () => {
      const { result } = renderHook(() => useGame())
      // Blue at (0,0) and Red at (1,0) share the open board; one wall between
      // them shuts Blue into a single cell and leaves Red alone with the rest.
      const board = makeEmptyBoard()
      board[0][0].stone = 'B'
      board[0][1].stone = 'R'
      board[1][0].wallTop = 'B'
      startPlayingOn(board)

      act(() => result.current.selectStone({ x: 1, y: 0 }))
      act(() => result.current.buildWall({ x: 1, y: 0 }, 'left'))
      expect(result.current.phase).toBe('finished')
      expect(result.current.result?.finished).toBe(true)
      expect(result.current.result?.winner).toBe('R')
      expect(result.current.skipReason).toBeUndefined()
      expect(result.current.selected).toBeUndefined()
    })

    it('undoing the sealing wall makes the stone selectable again', () => {
      const { result } = renderHook(() => useGame())
      const board = addOpenStones(makeEmptyBoard())
      board[0][0].stone = 'R'
      board[1][0].wallTop = 'R'
      startPlayingOn(board)

      act(() => result.current.selectStone({ x: 0, y: 0 }))
      act(() => result.current.buildWall({ x: 0, y: 0 }, 'right'))
      expect(getTerritoryMap(result.current.board)[0][0]).toBe('R')

      act(() => result.current.undo())
      expect(result.current.board[0][1].wallLeft).toBe(null)
      act(() => result.current.selectStone({ x: 0, y: 0 }))
      expect(result.current.selected).toEqual({ x: 0, y: 0 })
    })

    it('a sealed single stone stays put through a whole round', () => {
      const { result } = renderHook(() => useGame())
      startPlayingOn(addOpenStones(sealedSingle()))
      act(() => result.current.selectStone({ x: 0, y: 0 }))
      expect(result.current.selected).toBeUndefined()
    })
  })
})
