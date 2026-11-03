// Browser tests of the pregnancy pages (Playwright + the built site in src/, served with the production headers).
// Run: npm run e2e (from source/). CHROMIUM_PATH can point at a local Chromium; otherwise Playwright's own is used.
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

// the visitor's local date `days` ago, as YYYY-MM-DD
const ago = days => { const d = new Date(); d.setDate(d.getDate() - days); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const KEY = 'bnil_pregnancy';
// expected noise: the AdSense loader is blocked by the CSP on purpose (no ads yet), and Vercel Insights exists only on Vercel
const NOISE = /googlesyndication|adsbygoogle|_vercel\/insights/;

/* a new page (phone width by default) with the saved value set before any script runs; problems collects console
   errors, page errors and CSP violations */
async function open(path, { saved, width = 375, js = true } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: 800 }, javaScriptEnabled: js, locale: 'he-IL' });
  // init scripts run again on every reload: seed the storage once per tab, so a reload sees what the page saved
  if (saved !== undefined) await ctx.addInitScript(([k, v]) => {
    if (!sessionStorage.getItem('seeded')) { localStorage.setItem(k, v); sessionStorage.setItem('seeded', '1'); }
  }, [KEY, JSON.stringify(saved)]);
  const page = await ctx.newPage();
  const problems = [];
  page.on('console', m => { if (m.type() === 'error' && !NOISE.test(m.text() + (m.location().url || ''))) problems.push(m.text()); });
  page.on('pageerror', e => problems.push(String(e)));
  await page.goto(server.url + path);
  page.problems = problems;
  page.done = async () => { assert.deepEqual(problems, [], 'console errors or CSP violations'); await ctx.close(); };
  return page;
}
const stored = page => page.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);
const noSideScroll = async page => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'horizontal scroll');

test('calculator: each method gives a result, and the input is saved', async () => {
  const page = await open('/pregnancy/calculator');
  await page.fill('input[name=date]', ago(12 * 7 + 3));
  await page.click('.pgo');
  assert.equal(await page.textContent('.pr-w'), '12+3');
  assert.match(await page.textContent('.pr-next'), /הבדיקה הבאה|עכשיו הזמן/);
  assert.equal((await stored(page)).seen, 12);
  await noSideScroll(page);
  await page.check('input[value=conception]', { force: true });
  await page.fill('input[name=date]', ago(10 * 7 - 14));
  await page.click('.pgo');
  assert.equal(await page.textContent('.pr-w'), '10+0');
  await page.check('input[value=ivf]', { force: true });
  assert.ok(await page.isVisible('select[name=embryo]'));
  await page.fill('input[name=date]', ago(20 * 7 - 19));
  await page.click('.pgo');
  assert.equal(await page.textContent('.pr-w'), '20+0');
  await page.done();
});

test('calculator: a future date shows an error and no result', async () => {
  const page = await open('/pregnancy/calculator');
  await page.evaluate(() => { document.querySelector('input[name=date]').removeAttribute('max'); });
  await page.fill('input[name=date]', ago(-3));
  await page.click('.pgo');
  assert.equal(await page.textContent('#perr'), 'התאריך שבחרתם עוד לא הגיע.');
  assert.ok(await page.isHidden('#pres'));
  await page.done();
});

test('return visit: the current week at once, with what changed since last time', async () => {
  const page = await open('/pregnancy/calculator', { saved: { m: 'lmp', d: ago(15 * 7), c: 28, e: 5, seen: 13, done: [] } });
  assert.equal(await page.textContent('.pr-w'), '15+0');
  assert.equal(await page.inputValue('input[name=date]'), ago(15 * 7));
  assert.equal(await page.textContent('.pr-since'), 'מאז הביקור הקודם עברתם לשבוע 15.');
  assert.equal((await stored(page)).seen, 15);
  await page.reload();
  assert.equal(await page.locator('.pr-since').count(), 0, 'no line once the week was seen');
  await page.done();
});

test('checkups: a mark is kept after a reload, and a new date clears the marks', async () => {
  const page = await open('/pregnancy/calculator', { saved: { m: 'lmp', d: ago(12 * 7), c: 28, e: 5 } });
  assert.equal(await page.textContent('.pr-next b'), 'עכשיו הזמן: אולטרסאונד ראשון');
  await page.check('[data-check=dating]');
  await page.check('[data-check=first]');
  assert.deepEqual((await stored(page)).done.sort(), ['dating', 'first']);
  await page.reload();
  assert.ok(await page.isChecked('[data-check=dating]'));
  assert.match(await page.textContent('.pchk .is-done'), /בוצעה/);
  assert.equal(await page.textContent('.pr-next b'), 'עכשיו הזמן: שקיפות עורפית וסקר שליש ראשון');
  await page.uncheck('[data-check=dating]');
  assert.deepEqual((await stored(page)).done, ['first']);
  await page.fill('input[name=date]', ago(20 * 7));
  await page.click('.pgo');
  assert.deepEqual((await stored(page)).done, []);
  await page.done();
});

test('forget: the saved date is removed', async () => {
  const page = await open('/pregnancy/calculator', { saved: { m: 'lmp', d: ago(12 * 7), c: 28, e: 5 } });
  await page.click('#pforget');
  assert.equal(await stored(page), null);
  assert.ok(await page.isHidden('#pres'));
  await page.done();
});

test('week pages: "your week" from the saved date', async () => {
  const saved = { m: 'lmp', d: ago(18 * 7 + 2), c: 28, e: 5 };
  let page = await open('/pregnancy/week-18', { saved });
  assert.match(await page.textContent('.pmine'), /זה השבוע שלכם/);
  await noSideScroll(page);
  await page.done();
  page = await open('/pregnancy/week-20', { saved });
  assert.match(await page.textContent('.pmine'), /אתם בשבוע 18 .*בעוד שבועיים/);
  assert.equal(await page.getAttribute('.pmine a', 'href'), '/pregnancy/week-18');
  assert.ok(await page.isVisible('#checkups'), 'the late scan is in week 20');
  await page.done();
  page = await open('/pregnancy/week-10', { saved });
  assert.match(await page.textContent('.pmine'), /כבר בשבוע 18/);
  await page.done();
});

test('week page and hub: nothing personal without a saved date', async () => {
  for (const path of ['/pregnancy/week-12', '/pregnancy']) {
    const page = await open(path);
    assert.ok(await page.isHidden('.pmine'));
    await page.done();
  }
});

test('hub: the current week is marked', async () => {
  const page = await open('/pregnancy', { saved: { m: 'lmp', d: ago(25 * 7), c: 28, e: 5 } });
  assert.match(await page.textContent('.pmine'), /אתם בשבוע 25/);
  assert.equal(await page.getAttribute('.pwk a.pcur', 'data-w'), '25');
  assert.equal(await page.getAttribute('.pwk a.pcur', 'aria-current'), 'true');
  assert.equal(await page.locator('.pwk a.pcur').count(), 1);
  await noSideScroll(page);
  await page.done();
});

test('without JavaScript the pages still read in full', async () => {
  for (const path of ['/pregnancy/week-12', '/pregnancy', '/pregnancy/calculator']) {
    const page = await open(path, { js: false, saved: undefined });
    assert.equal(await page.locator('h1').count(), 1, path);
    assert.ok(await page.locator('table.pchks tbody tr').count() > 0, path + ': the checkups table');
    await page.close();
  }
});

test('home: the pregnancy tile opens the saved week', async () => {
  let page = await open('/', { saved: { m: 'lmp', d: ago(23 * 7 + 1), c: 28, e: 5 }, width: 1200 });
  await page.waitForSelector('.tiles3 a[href^="/pregnancy"]');
  assert.equal(await page.getAttribute('.tiles3 a[href^="/pregnancy"]', 'href'), '/pregnancy/week-23');
  assert.match(await page.textContent('.tiles3 a[href^="/pregnancy"] b'), /שבוע 23 להריון/);
  await page.done();
  page = await open('/', { width: 1200 });
  await page.waitForSelector('.tiles3 a[href^="/pregnancy"]');
  assert.equal(await page.getAttribute('.tiles3 a[href^="/pregnancy"]', 'href'), '/pregnancy/calculator');
  await page.done();
});
