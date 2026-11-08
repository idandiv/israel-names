// Browser tests of the Arabic pages (/ar): they read at phone width with no console errors or CSP violations, load no web font
// but the heading font, and the language links go both ways between the Hebrew and the Arabic page.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { serve } from './server.mjs';

const PAGES = ['/ar', '/ar/names/boys', '/ar/names/girls', '/ar/names/popular'];
const NOISE = /googlesyndication|adsbygoogle|_vercel\/insights/;   // see pregnancy.e2e.mjs
let server, browser;
before(async () => {
  server = await serve();
  browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
});
after(async () => { await browser?.close(); await server?.close(); });

for (const width of [375, 1200]) {
  test(`Arabic pages at ${width}px: Arabic, no horizontal scroll, no console errors, only the heading font`, async () => {
    const ctx = await browser.newContext({ viewport: { width, height: 800 } });
    const page = await ctx.newPage();
    const problems = [];
    page.on('console', m => { if (m.type() === 'error' && !NOISE.test(m.text() + (m.location().url || ''))) problems.push(m.text()); });
    page.on('pageerror', e => problems.push(String(e)));
    for (const p of PAGES) {
      const fonts = [];
      const onReq = r => { if (r.url().endsWith('.woff2')) fonts.push(r.url().split('/').pop()); };
      page.on('request', onReq);
      await page.goto(server.url + p);
      await page.evaluate(() => document.fonts.ready);
      page.off('request', onReq);
      assert.equal(await page.getAttribute('html', 'lang'), 'ar', p);
      assert.equal(await page.locator('h1').count(), 1, p);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      assert.ok(over <= 1, `${p} scrolls sideways by ${over}px`);
      // Karantina draws the Latin brand name; the body text is the device's own Arabic font
      assert.deepEqual(fonts.filter(f => !/^noto-kufi-arabic|^karantina-latin/.test(f)), [], p);
    }
    assert.deepEqual(problems, []);
    await ctx.close();
  });
}

test('the language links go both ways, and every list link opens a page', async () => {
  const page = await browser.newPage();
  await page.goto(`${server.url}/names/girls`);
  await page.locator('a.doclang').click();
  await page.waitForURL(/\/ar\/names\/girls$/);
  await page.locator('a.doclang').click();
  await page.waitForURL(/\/names\/girls$/);
  await page.goto(`${server.url}/ar/names/popular`);
  const hrefs = [...new Set(await page.locator('.coll a').evaluateAll(as => as.map(a => a.getAttribute('href'))))];
  assert.ok(hrefs.length > 50);
  for (const h of hrefs) assert.equal((await page.request.get(server.url + h)).status(), 200, decodeURIComponent(h));
  await page.close();
});
