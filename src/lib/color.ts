// src/lib/color.ts
// Helper for player color classes (for stones and walls)
import type { Player } from './types'

export function playerColorClass(p: Player) {
  return p === 'R' ? 'bg-rose-500 dark:bg-rose-400' : 'bg-indigo-500 dark:bg-indigo-400'
}

/** Filled dot that identifies a player by colour (score row, turn banner, winner badge). */
export function playerDotClass(p: Player) {
  return p === 'R'
    ? 'bg-rose-500 dark:bg-rose-400 border-rose-300 dark:border-rose-500'
    : 'bg-indigo-500 dark:bg-indigo-400 border-indigo-300 dark:border-indigo-500'
}

/** Ring used to mark the player whose turn it is. */
export function playerRingClass(p: Player) {
  return p === 'R' ? 'ring-rose-400 dark:ring-rose-400' : 'ring-indigo-400 dark:ring-indigo-400'
}

/** Soft tinted surface for a panel that belongs to one player, e.g. the turn banner. */
export function playerTintClass(p: Player) {
  return p === 'R'
    ? 'bg-rose-100/90 dark:bg-rose-500/20 border-rose-300 dark:border-rose-400/50 text-rose-900 dark:text-rose-50'
    : 'bg-indigo-100/90 dark:bg-indigo-500/20 border-indigo-300 dark:border-indigo-400/50 text-indigo-900 dark:text-indigo-50'
}
