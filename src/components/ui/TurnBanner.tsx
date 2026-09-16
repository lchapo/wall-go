import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import { playerDotClass, playerTintClass } from '@/lib/color'
import type { Phase, Player } from '@/lib/types'

interface TurnBannerProps {
  phase: Phase
  /** Player to act in the position currently on screen. */
  turn: Player
  /** Display name for that player (PvP name, or You/AI). */
  name: string
  /** True when that player is the human in an AI match — "Your turn" reads better than "You's turn". */
  isYou?: boolean
}

/**
 * States the phase and whose turn it is in one line. The pill takes the active
 * player's colour, so the turn reads at a glance and the name confirms it — the
 * board glow alone was easy to miss.
 */
export default function TurnBanner({ phase, turn, name, isYou }: TurnBannerProps) {
  const { t } = useTranslation()

  const phaseLabel =
    phase === 'placing'
      ? t('game.phase.placing', 'Placement Phase')
      : phase === 'playing'
        ? t('game.phase.playing', 'Action Phase')
        : t('game.phase.finished', 'Scoring Phase')

  // Nobody is to move once the board is being scored.
  const showTurn = phase === 'placing' || phase === 'playing'

  return (
    <div
      aria-live="polite"
      className={clsx(
        'flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-full border px-4 py-1.5',
        'shadow-sm animate-fade-in transition-colors duration-300',
        showTurn
          ? playerTintClass(turn)
          : 'bg-white/70 dark:bg-zinc-800/80 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200',
      )}
    >
      <span className="text-[0.7rem] font-semibold uppercase tracking-wider opacity-70">
        {phaseLabel}
      </span>
      {showTurn && (
        <>
          <span aria-hidden className="opacity-40">
            ·
          </span>
          <span
            role="img"
            aria-label={turn === 'R' ? t('game.red', 'Red') : t('game.blue', 'Blue')}
            className={clsx(
              'inline-block w-3.5 h-3.5 rounded-full border-2 shadow-sm',
              playerDotClass(turn),
            )}
          />
          <span className="font-semibold">
            {isYou
              ? t('game.turnYours', 'Your turn')
              : t('game.turnOf', { defaultValue: "{{name}}'s turn", name })}
          </span>
        </>
      )}
    </div>
  )
}
