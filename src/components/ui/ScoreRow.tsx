import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import { PLAYER_LIST, type Phase, type Player } from '@/lib/types'
import GameButton from './GameButton'

interface ScoreRowProps {
  phase: Phase
  /** Territory score for the position currently on screen. */
  score: Partial<Record<Player, number>>
  /** Display name per colour (PvP names, or You/AI). */
  names: Record<Player, string>
  /** Series wins per colour, already resolved from the name-keyed tally. */
  wins: Record<Player, number>
  draws: number
  onResetSeries: () => void
  children?: React.ReactNode
}

/**
 * Score pills read left-to-right in action-phase turn order, matching the colour
 * order the setup screen offers. That phase opens with the player *after* the one
 * who places first (see `placeStone`), so this is `PLAYER_LIST` rotated by one.
 */
const DISPLAY_ORDER = PLAYER_LIST.map((_, i) => PLAYER_LIST[(i + 1) % PLAYER_LIST.length])

const DOT: Record<Player, string> = {
  R: 'bg-rose-500 dark:bg-rose-400 border-rose-300 dark:border-rose-500',
  B: 'bg-indigo-500 dark:bg-indigo-400 border-indigo-300 dark:border-indigo-500',
}

export default function ScoreRow({
  phase,
  score,
  names,
  wins,
  draws,
  onResetSeries,
  children,
}: ScoreRowProps) {
  const { t } = useTranslation()
  const hasSeries = draws > 0 || PLAYER_LIST.some((p) => wins[p] > 0)

  return (
    <div className="flex flex-wrap gap-3 animate-fade-in items-center justify-center">
      {DISPLAY_ORDER.map((p) => (
        <span
          key={p}
          className="flex items-center gap-2 font-mono text-lg px-2 py-1 rounded bg-white/70 dark:bg-zinc-800/80 shadow-sm border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 transition-all duration-300"
        >
          <span
            className={clsx('inline-block w-5 h-5 rounded-full border-2 shadow-sm', DOT[p])}
            aria-label={p === 'R' ? t('game.red', 'Red') : t('game.blue', 'Blue')}
          />
          <span className="font-sans font-semibold max-w-[8rem] truncate">{names[p]}</span>
          {phase === 'placing' ? 0 : (score[p] ?? 0)}
          <span className="font-sans text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
            {t('game.wins', { defaultValue: '{{count}} wins', count: wins[p] })}
          </span>
        </span>
      ))}
      {draws > 0 && (
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {t('game.draws', { defaultValue: '{{count}} draws', count: draws })}
        </span>
      )}
      {children}
      {hasSeries && (
        <GameButton onClick={onResetSeries} text ariaLabel={t('game.resetSeries', 'Reset series')}>
          {t('game.resetSeries', 'Reset series')}
        </GameButton>
      )}
    </div>
  )
}
