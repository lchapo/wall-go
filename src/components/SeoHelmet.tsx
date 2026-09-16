import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'

/**
 * Only the tags whose content changes with the active language.
 *
 * Everything static — robots, theme-color, viewport, og:url, og:image,
 * twitter:card, canonical and the icon links — lives in `index.html`. Helmet
 * only manages the tags it renders itself and never removes the ones already
 * in the document, so duplicating them here would emit each tag twice. The
 * static copy is also the only one that matters for social cards, since
 * scrapers do not execute JavaScript.
 */
export default function SeoHelmet() {
  const { t, i18n } = useTranslation()

  return (
    <Helmet>
      <html lang={i18n.language} />
      <title>
        {t('seo.title', "Wall Go | Online Strategy Board Game | Devil's Plan Inspired")}
      </title>
      <meta
        name="description"
        content={t(
          'seo.description',
          'Wall Go – Free online strategy board game inspired by Devil’s Plan. Play solo or with friends, territory scoring, undo/redo, and a modern UI. No signup needed, just play!',
        )}
      />
      <meta
        name="keywords"
        content={t(
          'seo.keywords',
          "Wall Go, Devil's Plan, board game, strategy game, undo redo, territory, open source, browser game, wallgo, devil's plan game, wall go single player",
        )}
      />
      <meta
        property="og:title"
        content={t('seo.title', "Wall Go | Online Strategy Board Game | Devil's Plan Inspired")}
      />
      <meta
        property="og:description"
        content={t(
          'seo.description',
          'Wall Go – Free online strategy board game inspired by Devil’s Plan. Play solo or with friends, territory scoring, undo/redo, and a modern UI. No signup needed, just play!',
        )}
      />
      <meta
        name="twitter:title"
        content={t('seo.title', "Wall Go | Online Strategy Board Game | Devil's Plan Inspired")}
      />
      <meta
        name="twitter:description"
        content={t(
          'seo.description',
          'Wall Go – Free online strategy board game inspired by Devil’s Plan. Play solo or with friends, territory scoring, undo/redo, and a modern UI. No signup needed, just play!',
        )}
      />
    </Helmet>
  )
}
