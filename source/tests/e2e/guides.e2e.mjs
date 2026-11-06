// Browser tests of the guide pages: every guide reads at phone width (tables included) with no console errors or CSP violations.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { serve } from './server.mjs';

const GUIDES = JSON.parse(readFileSync(new URL('../../data/guides.json', import.meta.url), 'utf-8')).map(g => g.slug);
const NOISE = /googlesyndication|adsbygoogle|_vercel\/insights/;   // see pregnancy.e2e.mjs
let server, browser;
before(async () => {
  server = await serve();
  browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
});
after(async () => { await browser?.close(); await server?.close(); });

for (const width of [375, 1200]) {
  test(`guides at ${width}px: no horizontal scroll, no console errors`, async () => {
    const ctx = await browser.newContext({ viewport: { width, height: 800 } });
    const page = await ctx.newPage();
    const problems = [];
    page.on('console', m => { if (m.type() === 'error' && !NOISE.test(m.text() + (m.location().url || ''))) problems.push(m.text()); });
    page.on('pageerror', e => problems.push(String(e)));
    for (const slug of ['', ...GUIDES.map(s => '/' + s)]) {
      await page.goto(`${server.url}/guides${slug}`);
      assert.equal(await page.locator('h1').count(), 1, slug);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      assert.ok(over <= 1, `/guides${slug} scrolls sideways by ${over}px`);
    }
    assert.deepEqual(problems, []);
    await ctx.close();
  });
}

test('the hub: a cover on every card, the newest guide first, and filter buttons by badge', async () => {
  const G = JSON.parse(readFileSync(new URL('../../data/guides.json', import.meta.url), 'utf-8'));
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${server.url}/guides`);
  const cards = page.locator('.gcards > li');
  assert.equal(await cards.count(), G.length);
  assert.equal(await page.locator('.gcards > li svg.cover').count(), G.length);
  assert.equal(await page.locator('.gcards > li:first-child').getAttribute('class'), 'gfeat');
  assert.equal(await page.locator('.gcards > li:first-child a').getAttribute('href'), `/guides/${G[0].slug}`);
  assert.ok(await page.locator('.gfilt').isVisible());
  const badge = G[1].badge;
  await page.locator(`.gfilt button[data-t="${badge}"]`).click();
  assert.equal(await page.locator('.gcards > li:visible').count(), G.filter(g => g.badge === badge).length);
  assert.equal(await page.locator(`.gfilt button[data-t="${badge}"]`).getAttribute('aria-pressed'), 'true');
  await page.locator('.gfilt button[data-t=""]').click();
  assert.equal(await page.locator('.gcards > li:visible').count(), G.length);
  await ctx.close();
  const noJs = await browser.newContext({ javaScriptEnabled: false });
  const p2 = await noJs.newPage();
  await p2.goto(`${server.url}/guides`);
  assert.equal(await p2.locator('.gcards > li:visible').count(), G.length);   // without JavaScript: every guide, no buttons
  assert.equal(await p2.locator('.gfilt').isVisible(), false);
  await noJs.close();
});

test('an article: its cover, chips of the cover names, three cards and a link to every other guide, and the progress bar', async () => {
  const G = JSON.parse(readFileSync(new URL('../../data/guides.json', import.meta.url), 'utf-8'));
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  const page = await ctx.newPage();
  for (const g of G) {
    await page.goto(`${server.url}/guides/${g.slug}`);
    assert.equal(await page.locator('.ghero svg.cover').count(), 1, g.slug);
    assert.equal(await page.locator('.gchips a').count(), g.cover.names.length, g.slug);
    assert.equal(await page.locator('.grel > li').count(), 3, g.slug);
    for (const o of G.filter(o => o !== g)) assert.ok(await page.locator(`a[href="/guides/${o.slug}"]`).count() >= 1, `${g.slug} -> ${o.slug}`);
  }
  assert.ok(await page.locator('.gprog').isVisible());
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForFunction(() => document.querySelector('.gprog i').style.transform === 'scaleX(1)');
  await ctx.close();
});

test('the shared names cover shows Arabic in the Arabic font', async () => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${server.url}/guides/shared-names`);
  await page.evaluate(() => document.fonts.ready);
  assert.ok(await page.evaluate(() => [...document.fonts].some(f => f.family.includes('Noto Kufi Arabic') && f.status === 'loaded')));
  await ctx.close();
});

test('every guide shares its own image', async () => {
  const G = JSON.parse(readFileSync(new URL('../../data/guides.json', import.meta.url), 'utf-8'));
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  const page = await ctx.newPage();
  for (const g of G) {
    const res = await page.goto(`${server.url}/og/guides/${g.slug}.png`);
    assert.equal(res.status(), 200, g.slug);
    assert.equal(res.headers()['content-type'], 'image/png', g.slug);
    await page.goto(`${server.url}/guides/${g.slug}`);
    assert.match(await page.locator('meta[property="og:image"]').getAttribute('content'), new RegExp(`/og/guides/${g.slug}\\.png$`));
  }
  await ctx.close();
});

test('the new guides show their tables, with a link for every name', async () => {
  const page = await browser.newPage();
  for (const [slug, tables] of [['gender-switch-names', 4], ['vanished-names', 8], ['new-names', 4], ['shared-names', 2], ['sibling-names', 4]]) {
    await page.goto(`${server.url}/guides/${slug}`);
    assert.equal(await page.locator('table.gvals').count(), tables, slug);
    const rows = await page.locator('table.gvals tbody tr').count();
    assert.equal(await page.locator('table.gvals tbody tr td:first-child a[href^="/names/"]').count(), rows, slug);
  }
  await page.close();
});

test('the Hebrew months guide: a name list for every month and holiday, and the calculator link', async () => {
  const page = await browser.newPage();
  await page.goto(`${server.url}/guides/hebrew-month-names`);
  const P = JSON.parse(readFileSync(new URL('../../data/pregnancy.json', import.meta.url), 'utf-8'));
  assert.equal(await page.locator('.docbody ol.coll').count(), P.months.length + P.holidays.length);
  for (const h of P.holidays) assert.equal(await page.locator(`h3#${h.id}`).textContent(), h.name);
  assert.equal(await page.locator('a.pcta[href="/pregnancy/calculator"]').count(), 1);
  await page.close();
});
