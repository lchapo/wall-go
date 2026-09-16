// src/components/ui/Navbar.tsx
import GameButton from './GameButton'
import LanguageThemeSwitcher from './LanguageThemeSwitcher'
import { useTranslation } from 'react-i18next'

export default function Navbar({
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onHome,
  paused,
  canPause,
  onTogglePause,
  dark,
  setDark,
}: {
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
  onHome: () => void
  paused: boolean
  canPause: boolean
  onTogglePause: () => void
  dark: boolean
  setDark: (d: boolean | ((d: boolean) => boolean)) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="w-full flex justify-between gap-1 transition-all duration-500">
      {/* Labels collapse to their icons on narrow screens; the aria-label carries the meaning. */}
      <div className="flex gap-1 sm:gap-2 items-center">
        <GameButton onClick={onUndo} disabled={!canUndo} ariaLabel={t('nav.undoAria', 'Undo')}>
          ↶<span className="hidden sm:inline"> {t('nav.undo', 'Undo')}</span>
        </GameButton>
        <GameButton onClick={onRedo} disabled={!canRedo} ariaLabel={t('nav.redoAria', 'Redo')}>
          ↷<span className="hidden sm:inline"> {t('nav.redo', 'Redo')}</span>
        </GameButton>
        <GameButton
          onClick={onTogglePause}
          disabled={!canPause}
          active={paused}
          ariaLabel={paused ? t('nav.resume', 'Resume') : t('nav.pause', 'Pause')}
        >
          {paused ? '▶' : '⏸'}
          <span className="hidden sm:inline">
            {' '}
            {paused ? t('nav.resume', 'Resume') : t('nav.pause', 'Pause')}
          </span>
        </GameButton>
      </div>
      <div className="flex gap-1 sm:gap-2 items-center">
        <GameButton onClick={onHome} ariaLabel={t('nav.menu', 'Menu')}>
          <span role="img" aria-label={t('nav.menu', 'Menu')} className="text-xl">
            🏠
          </span>
        </GameButton>
        <LanguageThemeSwitcher dark={dark} setDark={setDark} />
      </div>
    </div>
  )
}
