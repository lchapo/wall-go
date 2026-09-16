import { useTranslation } from 'react-i18next'
import GameButton from './GameButton'

interface FaqItem {
  q: string
  a: string
}

/**
 * Crawlable copy that sits below the menu: what the game is, how to play,
 * features and an FAQ. It only renders on the menu screen, so a game in
 * progress never has it underneath.
 *
 * The English FAQ is mirrored word for word by the `FAQPage` JSON-LD in
 * `index.html`; keep the two in sync when editing `landing.faq` in `en.json`.
 */
export default function LandingContent({ onShowRules }: { onShowRules: () => void }) {
  const { t } = useTranslation()
  const steps = t('landing.howTo.steps', { returnObjects: true }) as string[]
  const features = t('landing.features.items', { returnObjects: true }) as string[]
  const faq = t('landing.faq.items', { returnObjects: true }) as FaqItem[]

  const heading = 'text-2xl font-extrabold mb-3 text-zinc-800 dark:text-zinc-100'
  const body = 'leading-relaxed text-zinc-700 dark:text-zinc-300'

  return (
    <section
      id="how-to-play"
      className="w-full bg-white dark:bg-zinc-900 px-4 pt-12 pb-28 scroll-mt-4"
    >
      <div className="mx-auto max-w-2xl flex flex-col gap-10">
        <article>
          <h2 className={heading}>{t('landing.about.title')}</h2>
          <p className={`${body} mb-3`}>{t('landing.about.p1')}</p>
          <p className={body}>{t('landing.about.p2')}</p>
        </article>

        <article>
          <h2 className={heading}>{t('landing.howTo.title')}</h2>
          <ol className={`${body} list-decimal pl-6 flex flex-col gap-2`}>
            {steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <div className="mt-4">
            <GameButton onClick={onShowRules} text>
              {t('landing.howTo.fullRules')}
            </GameButton>
          </div>
        </article>

        <article>
          <h2 className={heading}>{t('landing.features.title')}</h2>
          <ul className={`${body} list-disc pl-6 flex flex-col gap-2`}>
            {features.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article>
          <h2 className={heading}>{t('landing.faq.title')}</h2>
          <div className="flex flex-col gap-4">
            {faq.map((item) => (
              <div key={item.q}>
                <h3 className="font-bold mb-1 text-zinc-800 dark:text-zinc-100">{item.q}</h3>
                <p className={body}>{item.a}</p>
              </div>
            ))}
          </div>
        </article>

        <div className="flex justify-center">
          <GameButton
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="text-lg py-3 px-8"
          >
            {t('landing.playNow')}
          </GameButton>
        </div>
      </div>
    </section>
  )
}
