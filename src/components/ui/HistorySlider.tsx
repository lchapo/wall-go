import { useTranslation } from 'react-i18next'
import GameButton from './GameButton'

interface HistorySliderProps {
  /** Highest selectable move number (slider values run 0..total). */
  total: number
  /** Currently shown move number — the preview position, or the live one. */
  value: number
  previewing: boolean
  onChange: (v: number) => void
  onCommit: () => void
  onCancel: () => void
}

export default function HistorySlider({
  total,
  value,
  previewing,
  onChange,
  onCommit,
  onCancel,
}: HistorySliderProps) {
  const { t } = useTranslation()
  if (total < 1) return null

  const counter = t('history.moveCounter', {
    defaultValue: 'Move {{current}} / {{total}}',
    current: value,
    total,
  })

  return (
    <div className="w-full flex flex-col items-center gap-2 animate-fade-in">
      <input
        type="range"
        min={0}
        max={total}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 cursor-pointer accent-indigo-500 dark:accent-indigo-400"
        aria-label={t('history.sliderAria', 'Rewind to a previous move')}
        aria-valuetext={counter}
      />
      <div className="flex items-center gap-3 min-h-[2.25rem]">
        <span
          className="font-mono tabular-nums text-sm text-zinc-600 dark:text-zinc-300"
          aria-live="polite"
        >
          {counter}
          {previewing && (
            <span className="ml-2 text-amber-600 dark:text-amber-400">
              {t('history.previewing', '(preview)')}
            </span>
          )}
        </span>
        {previewing && (
          <>
            <GameButton
              onClick={onCommit}
              variant="success"
              ariaLabel={t('history.jumpTo', { defaultValue: 'Jump to move {{n}}', n: value })}
            >
              {t('history.jumpTo', { defaultValue: 'Jump to move {{n}}', n: value })}
            </GameButton>
            <GameButton onClick={onCancel} ariaLabel={t('common.cancel', 'Cancel')}>
              {t('common.cancel', 'Cancel')}
            </GameButton>
          </>
        )}
      </div>
    </div>
  )
}
