// Browser tests of the home "what brings you here?" row and the finder quiz's next steps (p2_home.js, p5_tools.js).
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

test('home: four intents in one row, no side scroll, before the couple card', async () => {
  for (const width of [375, 1200]) {
    const page = await open('/', { width });
    await page.waitForSelector('.intents [data-int]');
    assert.deepEqual(await page.$$eval('.intents [data-int]', els => els.map(e => e.dataset.int)), ['baby', 'couple', 'mine', 'preg']);
    assert.equal(await page.$$eval('.intents [aria-pressed="true"]', els => els.length), 0);
    // the couple card and the finder row keep their order under the intents
    assert.deepEqual(await page.$$eval('.ctapair > button', els => els.map(e => e.id)), ['matchcta', 'gencta']);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    assert.ok(over <= 0, `side scroll ${over}px at ${width}`);
    await page.done();
  }
});

test('baby: opens the quiz, and the result offers saving and swiping together', async () => {
  const page = await open('/');
  await page.click('[data-int="baby"]');
  await page.waitForSelector('.wizard .wzopts');
  assert.match(page.url(), /#gen$/);
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
  // the choice is kept: back home it shows as pressed
  await page.goto(server.url + '/');
  await page.waitForSelector('[data-int="baby"][aria-pressed="true"]');
  await page.done();
});

test('mine: stays on the home page and puts the cursor in the name search', async () => {
  const page = await open('/');
  await page.click('[data-int="mine"]');
  await page.waitForFunction(() => document.activeElement && document.activeElement.id === 'hq');
  assert.match(page.url(), /#home$|\/$/);
  await page.done();
});

test('couple and pregnancy go to their places', async () => {
  let page = await open('/');
  await page.click('[data-int="couple"]');
  await page.waitForSelector('#nmcreate');
  await page.done();
  page = await open('/');
  await page.click('[data-int="preg"]');
  await page.waitForURL(/\/pregnancy\/calculator$/);
  await page.done();
});
