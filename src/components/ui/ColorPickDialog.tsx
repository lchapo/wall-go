import { useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import GameButton from './GameButton'

interface ColorPickDialogProps {
  open: boolean
  names: [string, string]
  /** Called with the name that plays Red (Red always moves first). */
  onPick: (redName: string) => void
  onCancel: () => void
}

export default function ColorPickDialog({ open, names, onPick, onCancel }: ColorPickDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    else if (!open && dialog.open) dialog.close()
  }, [open])

  // Esc dismisses the native dialog without telling React. Without this the
  // parent would keep `open` true while the dialog is closed, and Play Again
  // would then silently do nothing. Both events are handled because browsers
  // differ over which one an Esc dismissal produces.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const handleDismiss = () => {
      if (open) onCancel()
    }
    dialog.addEventListener('close', handleDismiss)
    dialog.addEventListener('cancel', handleDismiss)
    return () => {
      dialog.removeEventListener('close', handleDismiss)
      dialog.removeEventListener('cancel', handleDismiss)
    }
  }, [open, onCancel])

  const { t } = useTranslation()
  if (!open) return null

  const [first, second] = names

  return (
    <dialog
      ref={dialogRef}
      className="fixed left-0 top-0 w-full h-full z-[100] p-0 border-0 bg-transparent flex items-center justify-center"
      style={{ padding: 0 }}
    >
      <div className="fixed inset-0 bg-black/40 z-0" />
      <div className="relative max-w-xs w-[90vw] rounded-2xl shadow-2xl bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 animate-fade-in">
        <div className="flex flex-col gap-4 p-6">
          <div className="text-lg font-extrabold text-center tracking-tight">
            {t('menu.pvp.playsRed', 'Who plays Red (moves first)?')}
          </div>
          <div className="flex flex-col gap-3">
            <GameButton onClick={() => onPick(first)} ariaLabel={first}>
              🔴 {first} · 🔵 {second}
            </GameButton>
            <GameButton onClick={() => onPick(second)} ariaLabel={second}>
              🔴 {second} · 🔵 {first}
            </GameButton>
          </div>
          <GameButton onClick={onCancel} text ariaLabel={t('common.cancel', 'Cancel')}>
            {t('common.cancel', 'Cancel')}
          </GameButton>
        </div>
      </div>
    </dialog>
  )
}
