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
        {t('seo.title', "Wall Go – Play Free Online, 2 Players or vs AI | Devil's Plan Board Game")}
      </title>
      <meta
        name="description"
        content={t(
          'seo.description',
          "Play Wall Go free in your browser: the 7×7 wall-building territory game from Netflix's The Devil's Plan. Two players on one screen or against an AI, named players, series scoreboard, undo and move history. No signup.",
        )}
      />
      <meta
        name="keywords"
        content={t(
          'seo.keywords',
          "Wall Go, Wall Go game, Wall Go online, play Wall Go, Devil's Plan, Devil's Plan game, Devil's Plan season 2, strategy board game, territory game, 2 player game, browser game, free board game, 牆壁圍棋, wallgo",
        )}
      />
      <meta
        property="og:title"
        content={t(
          'seo.title',
          "Wall Go – Play Free Online, 2 Players or vs AI | Devil's Plan Board Game",
        )}
      />
      <meta
        property="og:description"
        content={t(
          'seo.description',
          "Play Wall Go free in your browser: the 7×7 wall-building territory game from Netflix's The Devil's Plan. Two players on one screen or against an AI, named players, series scoreboard, undo and move history. No signup.",
        )}
      />
      <meta
        name="twitter:title"
        content={t(
          'seo.title',
          "Wall Go – Play Free Online, 2 Players or vs AI | Devil's Plan Board Game",
        )}
      />
      <meta
        name="twitter:description"
        content={t(
          'seo.description',
          "Play Wall Go free in your browser: the 7×7 wall-building territory game from Netflix's The Devil's Plan. Two players on one screen or against an AI, named players, series scoreboard, undo and move history. No signup.",
        )}
      />
    </Helmet>
  )
}
