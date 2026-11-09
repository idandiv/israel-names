// Browser tests of the full name: /tools/full-name (with vercel.json's CSP), and the "your full name" card on an app name page.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { serve } from './server.mjs';

const NOISE = /googlesyndication|adsbygoogle|_vercel\/insights/;   // see pregnancy.e2e.mjs
let server, browser;
before(async () => {
  server = await serve();
  browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
});
after(async () => { await browser?.close(); await server?.close(); });

const watch = page => {
  const problems = [];
  page.on('console', m => { if (m.type() === 'error' && !NOISE.test(m.text() + (m.location().url || ''))) problems.push(m.text()); });
  page.on('pageerror', e => problems.push(String(e)));
  return problems;
};

for (const width of [375, 1200]) {
  test(`/tools/full-name at ${width}px: the check runs, no sideways scroll, no console errors`, async () => {
    const ctx = await browser.newContext({ viewport: { width, height: 800 } });
    const page = await ctx.newPage();
    const problems = watch(page);
    await page.goto(`${server.url}/tools/full-name?n=${encodeURIComponent('איתן')}`);
    assert.equal(await page.locator('[name=first]').inputValue(), 'איתן');
    assert.equal(await page.locator('#fres').isHidden(), true, 'no result before a surname');
    await page.fill('[name=last]', 'נחום');
    assert.equal(await page.locator('[name=lastEn]').inputValue(), 'Nahum');
    await page.click('#fform .pgo');
    const res = page.locator('#fres');
    await res.waitFor();
    const text = await res.innerText();
    for (const s of ['איתן נחום', 'Eitan Nahum', 'נחום איתן', 'NAHUM<<EITAN', 'א.נ.', 'E.N.', 'eitan.nahum@', 'כיתות'])
      assert.ok(text.includes(s), `missing ${s}`);
    assert.ok(await res.locator('.fn-notes .fn-warn').count() >= 1, 'the ן–נ note');
    // the suggestions are Jewish boys' names that pass the checks, and link to their pages
    const sugg = await res.locator('.cgc a').evaluateAll(as => as.map(a => [a.textContent, a.getAttribute('href')]));
    assert.ok(sugg.length >= 5);
    assert.ok(!sugg.some(([t]) => t.startsWith('מוחמד')));
    assert.ok(sugg.every(([t, h]) => h === '/names/' + encodeURIComponent(t.replace(/ נחום$/, ''))));
    const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    assert.ok(over <= 1, `scrolls sideways by ${over}px`);
    // the surname stays on the device and comes back on the next visit
    assert.equal(await page.evaluate(() => localStorage.getItem('bnil_surname')), '"נחום"');
    await page.goto(`${server.url}/tools/full-name?n=${encodeURIComponent('נועה')}`);
    await res.waitFor();
    assert.ok((await res.innerText()).includes('נועה נחום'));
    assert.equal(await page.locator('[name=sex]:checked').getAttribute('value'), '0', 'a girl’s name picks girls');
    assert.deepEqual(problems, []);
    await ctx.close();
  });
}

test('an empty form says what is missing', async () => {
  const page = await browser.newPage();
  await page.goto(`${server.url}/tools/full-name`);
  await page.click('#fform .pgo');
  assert.equal(await page.locator('#ferr').isVisible(), true);
  await page.close();
});

test('the name page card: English spellings and the full name with a surname', async () => {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 800 } });
  const page = await ctx.newPage();
  const problems = watch(page);
  await page.goto(`${server.url}/names/${encodeURIComponent('יצחק')}`);
  const box = page.locator('#fullbox');
  await box.waitFor();
  assert.ok((await box.innerText()).includes('Yitzhak'));
  assert.ok((await box.innerText()).includes('Yitzchak'));
  await page.fill('#fbs', 'כהן');
  await page.locator('#fbsout .qvfull').waitFor();
  const t = await box.innerText();
  assert.ok(t.includes('יצחק כהן') && t.includes('כהן יצחק') && t.includes('Yitzhak Cohen'));
  assert.equal(await box.locator('.fnlink').getAttribute('href'), `${server.url}/tools/full-name?n=${encodeURIComponent('יצחק')}`);
  assert.deepEqual(problems, []);
  await ctx.close();
});
