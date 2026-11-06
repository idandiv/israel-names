// Browser tests of the main collection pages: they read at phone width with no console errors or CSP violations, the list comes first, the quick links work.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { serve } from './server.mjs';

const PAGES = ['boys', 'girls', 'unisex'];
const NOISE = /googlesyndication|adsbygoogle|_vercel\/insights/;   // see pregnancy.e2e.mjs
let server, browser;
before(async () => {
  server = await serve();
  browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
});
after(async () => { await browser?.close(); await server?.close(); });

for (const width of [375, 1200]) {
  test(`main collections at ${width}px: no horizontal scroll, no console errors`, async () => {
    const ctx = await browser.newContext({ viewport: { width, height: 800 } });
    const page = await ctx.newPage();
    const problems = [];
    page.on('console', m => { if (m.type() === 'error' && !NOISE.test(m.text() + (m.location().url || ''))) problems.push(m.text()); });
    page.on('pageerror', e => problems.push(String(e)));
    for (const k of PAGES) {
      await page.goto(`${server.url}/names/${k}`);
      assert.equal(await page.locator('h1').count(), 1, k);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      assert.ok(over <= 1, `/names/${k} scrolls sideways by ${over}px`);
      // the list is the first section under the lead and the quick links, and starts within a screen and a half
      assert.equal(await page.locator('.docbody h2').first().getAttribute('id'), 'list', k);
      const top = await page.locator('#list').evaluate(el => el.getBoundingClientRect().top);
      assert.ok(top < 1200, `/names/${k}: the list starts at ${top}px`);
    }
    assert.deepEqual(problems, []);
    await ctx.close();
  });
}

test('the quick links open their pages, and the rank marks have labels', async () => {
  const page = await browser.newPage();
  await page.goto(`${server.url}/names/boys`);
  const hrefs = await page.locator('nav.ctop a').evaluateAll(as => as.map(a => a.getAttribute('href')));
  assert.equal(hrefs.length, 8);
  for (const h of hrefs) {
    const r = await page.request.get(server.url + h.split('#')[0]);
    assert.equal(r.status(), 200, h);
  }
  const labels = await page.locator('.coll .mv').evaluateAll(els => els.map(e => e.getAttribute('aria-label')));
  assert.ok(labels.length > 50);
  assert.ok(labels.every(Boolean));
  await page.close();
});
