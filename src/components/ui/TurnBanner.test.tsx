import { render, screen } from '@testing-library/react'
import { describe, it, expect, beforeAll } from 'vitest'
import i18n from '@/i18n'
import TurnBanner from './TurnBanner'

beforeAll(async () => {
  // The detector would otherwise pick up whatever the environment reports.
  await i18n.changeLanguage('en')
})

describe('TurnBanner', () => {
  it('names the phase and the player to act while placing', () => {
    render(<TurnBanner phase="placing" turn="R" name="Player 2" />)
    expect(screen.getByText('Placement Phase')).toBeTruthy()
    expect(screen.getByText("Player 2's turn")).toBeTruthy()
    expect(screen.getByLabelText('Red')).toBeTruthy()
  })

  it('names the phase and the player to act while playing', () => {
    render(<TurnBanner phase="playing" turn="B" name="Player 1" />)
    expect(screen.getByText('Action Phase')).toBeTruthy()
    expect(screen.getByText("Player 1's turn")).toBeTruthy()
    expect(screen.getByLabelText('Blue')).toBeTruthy()
  })

  it('addresses the human directly in an AI match', () => {
    render(<TurnBanner phase="playing" turn="B" name="You" isYou />)
    expect(screen.getByText('Your turn')).toBeTruthy()
    // "You's turn" is what the possessive template would have produced.
    expect(screen.queryByText("You's turn")).toBeNull()
  })

  it('drops the turn once the board is being scored', () => {
    render(<TurnBanner phase="finished" turn="B" name="Player 1" />)
    expect(screen.getByText('Scoring Phase')).toBeTruthy()
    expect(screen.queryByText("Player 1's turn")).toBeNull()
  })
})
