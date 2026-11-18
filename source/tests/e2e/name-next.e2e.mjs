// Browser tests of the name page's next-step card (p5_tools.js drawNextStep, shown at the end of p3_name.js).
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
const NAME = '/names/' + encodeURIComponent('נועה');
/* a new page with localStorage seeded once (keys without the bnil_ prefix) */
async function open(path, { width = 375, seed = {} } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: 800 }, locale: 'he-IL' });
  await ctx.addInitScript(s => {
    if (sessionStorage.getItem('seeded')) return;
    for (const [k, v] of Object.entries(s)) localStorage.setItem('bnil_' + k, JSON.stringify(v));
    sessionStorage.setItem('seeded', '1');
  }, seed);
  const page = await ctx.newPage();
  const problems = [];
  page.on('console', m => { if (m.type() === 'error' && !NOISE.test(m.text() + (m.location().url || ''))) problems.push(m.text()); });
  page.on('pageerror', e => problems.push(String(e)));
  await page.goto(server.url + path);
  await page.waitForSelector('#nextstep .nextstep');
  page.done = async () => { assert.deepEqual(problems, [], 'console errors or CSP violations'); await ctx.close(); };
  return page;
}

test('a new visitor: the card offers the quiz, after every other card, with no side scroll', async () => {
  for (const width of [375, 1200]) {
    const page = await open(NAME, { width });
    assert.match(await page.textContent('.nextstep h2'), /מחפשים שם לתינוק/);
    assert.equal(await page.$$eval('.nextstep button.next', els => els.length), 1);
    // the last thing in the name view, after the related names card
    assert.ok(await page.evaluate(() => {
      const ns = document.querySelector('#nextstep'), rel = document.querySelector('#rel');
      return !!(rel.compareDocumentPosition(ns) & Node.DOCUMENT_POSITION_FOLLOWING);
    }));
    const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    assert.ok(over <= 0, `side scroll ${over}px at ${width}`);
    await page.done();
  }
});

test('the quiz button opens the first question; saving from the card switches it after two saves', async () => {
  let page = await open(NAME, { seed: { fav: ['תמר'] } });
  await page.click('.nextstep [data-fav]');
  await page.waitForSelector('.nextstep #nsquiz');
  assert.match(await page.textContent('.nextstep #nsgo'), /2 השמות/);
  await page.done();
  page = await open(NAME);
  await page.click('#nsgo');
  await page.waitForSelector('.wizard .wzopts');
  assert.match(page.url(), /#gen$/);
  assert.match(await page.textContent('.wzprog span'), /שאלה 1 מתוך/);
  await page.done();
});

test('two saved names: swipe them together', async () => {
  const page = await open(NAME, { seed: { fav: ['תמר', 'טליה'] } });
  assert.match(await page.textContent('#nsgo'), /2 השמות/);
  await page.click('#nsgo');
  await page.waitForSelector('#nmcreate');
  const pending = await page.evaluate(() => JSON.parse(localStorage.getItem('bnil_nm_pending')));
  assert.deepEqual(pending.n.sort(), ['טליה', 'תמר'].sort());
  await page.done();
});

test('a finished quiz: back to its list', async () => {
  const wz = { step: 5, themes: [], letter: '', nogut: false, shown: 5, hide: [], seed: 7, world: 'heb', sex: 'F', len: 'any', pop: 'any' };
  const page = await open(NAME, { seed: { wz } });
  assert.match(await page.textContent('#nsgo'), /חזרה לרשימה/);
  await page.click('#nsgo');
  await page.waitForSelector('.wizard.done');
  await page.done();
});
