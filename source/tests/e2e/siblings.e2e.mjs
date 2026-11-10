// Browser tests of the siblings matching: /tools/siblings (with vercel.json's CSP), and the sibling card on an app name page.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { serve } from './server.mjs';

const NOISE = /googlesyndication|adsbygoogle|_vercel\/insights/;   // see pregnancy.e2e.mjs
const SEO = JSON.parse(readFileSync(new URL('../../data/seo.json', import.meta.url), 'utf-8'));
const BY = new Map(SEO.names.map(x => [x.n, x]));
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
  test(`/tools/siblings at ${width}px: 12 suggestions with reasons, saving, no sideways scroll, no console errors`, async () => {
    const ctx = await browser.newContext({ viewport: { width, height: 800 } });
    const page = await ctx.newPage();
    const problems = watch(page);
    await page.goto(`${server.url}/tools/siblings`);
    assert.equal(await page.locator('#sres').isHidden(), true);
    await page.fill('[name=n1]', 'נועה');
    await page.fill('[name=n2]', 'איתן');
    await page.click('#sform .pgo');
    const res = page.locator('#sres');
    await res.waitFor();
    assert.match(await res.locator('.sib-style b').innerText(), /^משפחה של שמות/);
    const cards = res.locator('.sib-list > li');
    assert.equal(await cards.count(), 12);
    const sugg = await res.locator('.sib-top a').evaluateAll(as => as.map(a => [a.textContent, a.getAttribute('href')]));
    for (const [n, h] of sugg) {
      assert.equal(h, '/names/' + encodeURIComponent(n));
      assert.ok(BY.get(n).dna[6][1] >= 15, `${n}: a boy's name given now`);   // the default: a boy
      assert.ok(!['נועה', 'איתן'].includes(n));
    }
    assert.ok(await res.locator('.sib-why li').count() >= 12);
    // a girl, and both: 6 + 6
    await page.check('[name=sex][value="0"]');
    await page.waitForFunction(() => document.querySelectorAll('#sres .sib-list').length === 1);
    await page.check('[name=sex][value="2"]');
    await page.waitForFunction(() => document.querySelectorAll('#sres .sib-list').length === 2);
    assert.equal(await cards.count(), 12);
    // the heart saves to the site's list
    const first = await res.locator('.sib-top a').first().textContent();
    await res.locator('.sib-fav').first().click();
    assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('bnil_fav'))), [first]);
    assert.equal(await res.locator('.sib-fav').first().getAttribute('aria-pressed'), 'true');
    const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    assert.ok(over <= 1, `scrolls sideways by ${over}px`);
    assert.deepEqual(problems, []);
    await ctx.close();
  });
}

test('a link fills the names and the choices; a name not in the data says so', async () => {
  const page = await browser.newPage();
  const q = new URLSearchParams({ n: 'מוחמד', s: '0', r: 'common' });
  await page.goto(`${server.url}/tools/siblings?${q}`);
  await page.locator('#sres .sib-list').waitFor();
  assert.equal(await page.locator('[name=n1]').inputValue(), 'מוחמד');
  assert.equal(await page.locator('[name=rarity]').inputValue(), 'common');
  for (const n of await page.locator('#sres .sib-top a').allTextContents()) {
    const d = BY.get(n).dna;
    assert.ok(d[6][0] >= 100 && d[3][0] < 30, n);   // girls' names, 100 or more in the last year, not of the Jewish sector
  }
  await page.fill('[name=n1]', 'זזזזז');
  await page.click('#sform .pgo');
  assert.equal(await page.locator('#serr').isVisible(), true);
  assert.match(await page.locator('#serr').innerText(), /לא מופיע בנתוני הלמ״ס/);
  await page.close();
});

test('the name page card: names for a brother and a sister, and the link to the tool', async () => {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 800 } });
  const page = await ctx.newPage();
  const problems = watch(page);
  await page.goto(`${server.url}/names/${encodeURIComponent('איתן')}`);
  const box = page.locator('#sibbox');
  await box.locator('.sibrow').first().waitFor();
  const [b, g] = BY.get('איתן').sib;
  assert.deepEqual(await box.locator('.sibrow').nth(0).locator('a').allTextContents(), b);
  assert.deepEqual(await box.locator('.sibrow').nth(1).locator('a').allTextContents(), g);
  assert.equal(await box.locator('.fnlink').getAttribute('href'), `${server.url}/tools/siblings?n=${encodeURIComponent('איתן')}`);
  assert.ok((await page.locator('body').innerText()).includes('אילו שמות מתאימים לאח או לאחות של איתן?'));
  assert.deepEqual(problems, []);
  await ctx.close();
});
