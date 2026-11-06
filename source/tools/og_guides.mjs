// Draws each guide's cover as a picture: the share image (assets/og/guides/<slug>.png, 1200x630) and a small one for the home page
// (assets/og/guides/thumb/<slug>.png, 320x180), and notes in assets/og/guides/hashes.json which drawing each was made from.
// Run after a cover changes, when check_site.py asks for it: npm run og (it reads the built src/, and rebuilds the site with the new pictures).
// Needs: npm i (in source/) and `npx playwright install chromium` once.
import { chromium } from 'playwright';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../tests/e2e/server.mjs';

const S = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(S, 'assets/og/guides');
const GUIDES = JSON.parse(fs.readFileSync(path.join(S, 'data/guides.json'), 'utf-8'));
fs.mkdirSync(path.join(OUT, 'thumb'), { recursive: true });

const server = await serve();
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const ctx = await browser.newContext({ colorScheme: 'dark' });
const page = await ctx.newPage();
await page.route('**/*', r => (r.request().url().startsWith(server.url) ? r.continue() : r.abort()));   // no ads in the picture

const hashes = {};
for (const { slug } of GUIDES) {
  const html = fs.readFileSync(path.join(S, '../src/guides', slug + '.html'), 'utf-8');
  const svg = html.match(/<div class="ghero">(<svg.*?<\/svg>)<\/div>/s)?.[1];
  if (!svg) throw new Error(`${slug}: no cover in src/guides/${slug}.html: run npm run site first`);
  hashes[slug] = createHash('sha1').update(svg).digest('hex');
  await page.goto(`${server.url}/guides/${slug}`);
  await page.evaluate(() => {
    const svg = document.querySelector('.ghero svg');
    document.body.replaceChildren(svg);
    document.body.style.margin = 0;
    svg.style.cssText += ';position:fixed;inset:0;width:100vw;height:100vh;aspect-ratio:auto';
    return document.fonts.ready;
  });
  for (const [width, height, file] of [[1200, 630, slug + '.png'], [320, 180, `thumb/${slug}.png`]]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(OUT, file) });
  }
  console.log(slug, Math.round(fs.statSync(path.join(OUT, slug + '.png')).size / 1024) + ' KB');
}
fs.writeFileSync(path.join(OUT, 'hashes.json'), JSON.stringify(hashes, null, 1) + '\n');
await browser.close();
await server.close();
