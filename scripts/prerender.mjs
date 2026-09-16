// Snapshot the built app once with a real browser and write the rendered menu
// screen back into dist/index.html, so crawlers that don't execute JavaScript
// (and social/AI scrapers) see the landing copy instead of an empty <div>.
//
// Run after `vite build`:  node scripts/prerender.mjs
// Needs a Chromium for Playwright:  npx playwright install --with-deps chromium
//
// React still mounts with `createRoot` on top of the snapshot and replaces it
// with identical markup, so nothing changes for real visitors.

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { preview } from 'vite'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = resolve(root, 'dist')

const server = await preview({
  root,
  logLevel: 'silent',
  preview: { port: 4173, strictPort: false, open: false },
})
const url = server.resolvedUrls?.local[0]
if (!url) throw new Error('vite preview did not report a local URL')

let browser
try {
  browser = await chromium.launch()
  const page = await browser.newPage({ locale: 'en-US', colorScheme: 'light' })
  const errors = []
  page.on('pageerror', (err) => errors.push(err))

  await page.goto(url, { waitUntil: 'networkidle' })
  // The menu <h1> and the landing section are both part of the snapshot.
  await page.waitForSelector('h1')
  await page.waitForSelector('#how-to-play h2')
  if (errors.length) throw new AggregateError(errors, 'page threw while rendering')

  await page.evaluate(() => {
    // react-helmet-async appends its own copies of the language-dependent tags
    // next to the static ones in index.html (see SeoHelmet.tsx). Drop the
    // copies so the snapshot has exactly one of each; Helmet re-adds them on
    // mount. It also stamps <title> and <html> with data-rh: keep those, just
    // strip the attribute.
    for (const el of document.head.querySelectorAll('meta[data-rh]')) el.remove()
    for (const el of document.querySelectorAll('[data-rh]')) el.removeAttribute('data-rh')
  })

  const html = await page.content()
  if (!html.includes('id="how-to-play"')) throw new Error('landing section missing from snapshot')
  writeFileSync(resolve(dist, 'index.html'), html)

  const today = new Date().toISOString().slice(0, 10)
  const sitemapPath = resolve(dist, 'sitemap.xml')
  const sitemap = readFileSync(sitemapPath, 'utf8')
  writeFileSync(sitemapPath, sitemap.replace(/<lastmod>[^<]*<\/lastmod>/, `<lastmod>${today}</lastmod>`))

  console.log(`prerendered ${url} -> dist/index.html (${html.length} bytes), sitemap lastmod ${today}`)
} finally {
  await browser?.close()
  await new Promise((done) => server.httpServer.close(done))
}
