import { fireEvent, render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import Cell from './Cell'
import type { Cell as CellType, Player } from '@/lib/types'

function renderStone(territoryOwner: Player | null) {
  const board: CellType[][] = [[{ stone: 'R', wallTop: null, wallLeft: null }]]
  const selectStone = vi.fn()
  const { container } = render(
    <Cell
      x={0}
      y={0}
      cell={board[0][0]}
      isSel={false}
      phase="playing"
      turn="R"
      legal={new Set()}
      selectStone={selectStone}
      board={board}
      boardSize={1}
      territoryOwner={territoryOwner}
    />,
  )
  const stone = container.querySelector('button')!
  return { stone, selectStone }
}

describe('Cell stone affordance', () => {
  it('lets the player to move pick a free stone', () => {
    const { stone, selectStone } = renderStone(null)
    expect(stone.className).toContain('cursor-pointer')
    fireEvent.click(stone)
    expect(selectStone).toHaveBeenCalledWith({ x: 0, y: 0 })
  })

  it('ignores clicks on a stone sealed inside claimed territory', () => {
    const { stone, selectStone } = renderStone('R')
    expect(stone.className).toContain('cursor-default')
    expect(stone.className).not.toContain('cursor-pointer')
    fireEvent.click(stone)
    expect(selectStone).not.toHaveBeenCalled()
  })
})
