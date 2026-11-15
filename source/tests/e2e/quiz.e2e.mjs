// Browser tests of the finder quiz: the default for new visitors, and the next steps after the results (p5_tools.js).
// Run: npm run e2e (from source/).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { serve } from './server.mjs';

let server, browser;
before(async () => {
  server = await serve();
  browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
});
after(async () => { await browser?.close(); await server?.close(); });

const NOISE = /googlesyndication|adsbygoogle|_vercel\/insights/;
async function open(path, { width = 375 } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: 800 }, locale: 'he-IL' });
  const page = await ctx.newPage();
  const problems = [];
  page.on('console', m => { if (m.type() === 'error' && !NOISE.test(m.text() + (m.location().url || ''))) problems.push(m.text()); });
  page.on('pageerror', e => problems.push(String(e)));
  await page.goto(server.url + path);
  page.done = async () => { assert.deepEqual(problems, [], 'console errors or CSP violations'); await ctx.close(); };
  return page;
}

test('the finder card on home opens the quiz, and the result offers saving and swiping together', async () => {
  const page = await open('/');
  await page.click('#gencta');
  await page.waitForSelector('.wizard .wzopts');
  assert.match(page.url(), /#gen$/);
  assert.equal(await page.getAttribute('#gmode [data-m="wiz"]', 'aria-pressed'), 'true');
  await page.click('.wzopts [data-v="F"]');
  await page.waitForSelector('.wzopts [data-v="nature"]');
  await page.click('.wzopts [data-v="nature"]');
  await page.click('#wznext');
  for (let k = 0; k < 2; k++) { await page.waitForSelector(`.wzprog span:has-text("${k + 3} מתוך")`); await page.click('#wzany'); }
  await page.click('#wzskip');
  await page.waitForSelector('.wznext');
  assert.match(await page.textContent('.wznext'), /לחיצה על הלב/);
  assert.equal(await page.$('#wzcopy'), null);
  await page.click('#gcards [data-fav]');
  assert.match(await page.textContent('.wznext'), /1 שם שמור/);
  assert.ok(await page.$('#wzcopy'));
  await page.click('#wzmatch');
  await page.waitForSelector('#nmcreate');
  const pending = await page.evaluate(() => JSON.parse(localStorage.getItem('bnil_nm_pending')));
  assert.equal(pending.n.length, 1);
  await page.done();
});
