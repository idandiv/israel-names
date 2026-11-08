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
async function open(path, { saved, width = 375, js = true, motion = 'no-preference' } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: 800 }, javaScriptEnabled: js, locale: 'he-IL', reducedMotion: motion });
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

test('home: NameMatch comes first, then pregnancy, guides and collections tiles', async () => {
  for (const width of [375, 1200]) {
    const page = await open('/', { width });
    await page.waitForSelector('.tiles3 a');
    const order = await page.$$eval('.ctapair > button', (els) => els.map((e) => e.id));
    assert.deepEqual(order, ['matchcta', 'gencta']);
    const hrefs = await page.$$eval('.tiles3 > *', (els) => els.map((e) => e.getAttribute('href') || [...e.querySelectorAll('a')].map((a) => a.getAttribute('href')).join(' ')));
    assert.deepEqual(hrefs, ['/pregnancy/calculator', '/guides', '/names/boys /names/girls /names#colls']);
    // the two core pages get plain links with their exact search phrase as the anchor text
    assert.equal(await page.textContent('.tiles3 a[href="/names/boys"]'), 'שמות לבנים');
    assert.equal(await page.textContent('.tiles3 a[href="/names/girls"]'), 'שמות לבנות');
    assert.equal(await page.$('.tiles3 [data-go]'), null);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    assert.ok(over <= 0, `side scroll ${over}px at ${width}`);
    await page.done();
  }
});

test('calculator: the calendar file has the coming weeks and the checkups, and the options work', async () => {
  const { readFileSync } = await import('node:fs');
  const page = await open('/pregnancy/calculator', { saved: { m: 'lmp', d: ago(20 * 7 + 2), c: 28, e: 5 }, width: 1200 });
  await page.waitForSelector('#pics');
  const get = async () => {
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#pics')]);
    assert.equal(dl.suggestedFilename(), 'shemotil-pregnancy.ics');
    return readFileSync(await dl.path(), 'utf-8');
  };
  let text = await get();
  assert.ok(text.startsWith('BEGIN:VCALENDAR\r\n') && text.endsWith('END:VCALENDAR\r\n'));
  const flat = text.replace(/\r\n /g, '');
  assert.match(flat, /SUMMARY:שבוע 21 להריון\r\n/);
  assert.match(flat, /SUMMARY:בדיקה: /);
  assert.match(flat, /SUMMARY:תאריך הלידה המשוער\r\n/);
  assert.match(await page.textContent('#pmsg'), /הקובץ ירד/);
  await page.uncheck('#pics-c');
  text = (await get()).replace(/\r\n /g, '');
  assert.doesNotMatch(text, /SUMMARY:בדיקה: /);
  assert.match(text, /SUMMARY:שבוע 21 להריון/);
  await page.uncheck('#pics-w');
  assert.equal(await page.isDisabled('#pics'), true);
  await page.done();
});

test('calculator: the share card is a PNG made on the device, with the month only when asked', async () => {
  const page = await open('/pregnancy/calculator', { saved: { m: 'lmp', d: ago(20 * 7 + 2), c: 28, e: 5 } });
  await page.waitForSelector('#pcard');
  assert.equal(await page.isHidden('#pcardbox'), true);
  await page.click('#pcard');
  await page.waitForSelector('#pcardbox:not([hidden]) img[src^="blob:"]');
  // the PNG through the download link (the page itself may not fetch blob: URLs: connect-src is 'self')
  const info = async () => {
    const { readFileSync } = await import('node:fs');
    const dims = await page.$eval('#pcardbox img', async img => { await img.decode(); return [img.naturalWidth, img.naturalHeight, img.src]; });
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#pcardbox a')]);
    const buf = readFileSync(await dl.path());
    return { png: buf.subarray(1, 4).toString() === 'PNG', size: buf.length, w: dims[0], h: dims[1], src: dims[2] };
  };
  const a = await info();
  assert.equal(a.png, true);
  assert.deepEqual([a.w, a.h], [1080, 1350]);
  assert.ok(a.size > 20000, `card is ${a.size} bytes`);
  assert.equal(await page.getAttribute('#pcardbox a', 'download'), 'shemotil-week-20.png');
  await page.check('#pcard-m');
  await page.waitForFunction(src => document.querySelector('#pcardbox img').src !== src, a.src);
  const b = await info();
  assert.notEqual(b.size, a.size, 'the month line changes the card');
  // a general link to the week page, no personal data
  await page.click('#plink');
  await page.waitForFunction(() => /\/pregnancy\/week-20$/.test(document.querySelector('#pmsg').textContent));
  await noSideScroll(page);
  await page.done();
});

// the entry animations are over (the endless ones keep going)
const settled = page => page.waitForFunction(() => document.getAnimations()
  .filter(a => a.effect.getTiming().iterations !== Infinity).every(a => a.playState === 'finished'));

test('hero: the ring draws to the share of the way, the week counts up, and a tap cycles the views', async () => {
  for (const width of [375, 1200]) {
    const page = await open('/pregnancy/calculator', { saved: { m: 'lmp', d: ago(20 * 7 + 4), c: 28, e: 5 }, width });
    await page.waitForSelector('.phero');
    await page.locator('.phero').scrollIntoViewIfNeeded();
    await settled(page);
    await page.waitForFunction(() => document.querySelector('.ph-n').textContent === '20');
    const pct = Math.round(((20 * 7 + 4) / 280) * 100);
    assert.equal(await page.$eval('.ph-arc', el => getComputedStyle(el).strokeDashoffset), `${100 - pct}px`);
    assert.equal(await page.textContent('.pr-w'), '20+4');
    assert.match(await page.textContent('.ph-size'), /התינוק שלכם בגודל של בננה/);
    assert.equal(await page.$$eval('.ph-tags li', li => li.length), 4);
    // the size is drawn (SVG, no emoji), and a tap on it makes it wiggle
    assert.equal(await page.$$eval('.ph-fruit svg path, .ph-fruit svg circle', e => e.length) > 3, true);
    await page.click('.ph-fruit');
    assert.equal(await page.$eval('.ph-fruit', el => el.classList.contains('is-wiggle')), true);
    // the water stands at the same level as the ring
    assert.equal(await page.$eval('.ph-lvl', el => getComputedStyle(el).transform), `matrix(1, 0, 0, 1, 0, ${100 - pct})`);
    assert.ok(await page.$eval('.phero', el => document.getAnimations().some(a => a.effect.target && el.contains(a.effect.target)
      && a.effect.getTiming().iterations === Infinity)), 'the pulse keeps going');
    await page.click('.ph-core');
    assert.equal(await page.textContent('.ph-n'), `${pct}%`);
    await page.click('.ph-core');
    assert.match(await page.textContent('.ph-val'), /עוד\s*136\s*ימים/);
    assert.equal(await page.$$eval('.ph-dots i.on', d => d.length), 1);
    await page.click('.ph-core');
    assert.equal(await page.textContent('.ph-n'), '20');
    await noSideScroll(page);
    await page.done();
  }
});

test('hero: with reduced motion nothing moves and the numbers are final at once', async () => {
  const page = await open('/pregnancy/calculator', { saved: { m: 'lmp', d: ago(20 * 7 + 4), c: 28, e: 5 }, motion: 'reduce' });
  await page.waitForSelector('.phero');
  assert.equal(await page.textContent('.ph-n'), '20');
  assert.equal(await page.evaluate(() => document.getAnimations().filter(a => document.querySelector('.phero').contains(a.effect.target)).length), 0);
  await page.click('.ph-core');
  assert.match(await page.textContent('.ph-n'), /%$/);
  await page.done();
});

test('hero: ticking a checkup does not replay the entry animation; a new calculation does', async () => {
  const page = await open('/pregnancy/calculator', { saved: { m: 'lmp', d: ago(20 * 7 + 4), c: 28, e: 5 } });
  await page.waitForSelector('.phero');
  assert.equal(await page.$eval('.phero', el => el.classList.contains('ph-still')), false);
  await page.check('.pchk input >> nth=0');
  await page.waitForSelector('.phero.ph-still');
  assert.equal(await page.textContent('.ph-n'), '20');
  await page.click('.pgo');
  await page.waitForSelector('.phero:not(.ph-still)');
  await page.done();
});

test('growth charts: the axis labels stay left of each plot and do not overlap', async () => {
  for (const width of [375, 1200]) {
    const page = await open('/pregnancy/week-20', { width });
    const figs = await page.evaluate(() => {
      const box = e => { const b = e.getBoundingClientRect(); return { t: e.textContent, l: b.left, r: b.right, top: b.top, bottom: b.bottom }; };
      return [...document.querySelectorAll('figure.pgrow')].map(f => ({
        labels: [...f.querySelectorAll('.pg-t')].map(box), plot: box(f.querySelector('.pg-grid')), svg: box(f.querySelector('svg')) }));
    });
    assert.equal(figs.length, 2, 'a weight chart and a length chart');
    for (const r of figs) {
      assert.ok(r.labels.length > 8);
      for (const a of r.labels) {
        assert.ok(a.l >= r.svg.l - 1 && a.r <= r.svg.r + 1, `"${a.t}" leaves the chart at ${width}`);
        r.labels.filter(b => b !== a && a.l < b.r && b.l < a.r && a.top < b.bottom && b.top < a.bottom)
          .forEach(b => assert.fail(`"${a.t}" overlaps "${b.t}" at ${width}`));
      }
      for (const a of r.labels.filter(x => /^\d+$/.test(x.t) && x.r <= r.plot.l + 1)) assert.ok(a.r <= r.plot.l, `axis number ${a.t} is inside the plot at ${width}`);
    }
    await noSideScroll(page);
    await page.done();
  }
});

test('week page: breadcrumbs, the drawing, two charts with this week marked, a name for a girl and a boy', async () => {
  for (const [w, dot] of [[20, 2], [6, 0]]) {
    const page = await open(`/pregnancy/week-${w}`, { js: false });
    assert.equal(await page.textContent('nav.crumbs [aria-current="page"]'), `שבוע ${w} להריון`);
    assert.equal(await page.locator('nav.crumbs a').count(), 2);
    assert.equal(await page.locator('.pr-art svg path, .pr-art svg circle, .pr-art svg ellipse').count() > 0, true, 'the size drawing, without JS');
    assert.equal(await page.locator('figure.pgrow svg').count(), 2);
    assert.equal(await page.locator('figure.pgrow .pg-dot').count(), dot, `week ${w}`);
    assert.match(await page.textContent('figure.pgrow .pg-cap'), new RegExp(`שבוע ${w}`));
    assert.equal(await page.locator('figure.pgrow polyline.pg-line').count(), 3, 'the length line breaks at week 20');
    assert.equal(await page.locator('table.pnames td a[href^="/names/"]').count(), 2);
    assert.equal(await page.locator('.pfav:visible').count(), 0, 'no save buttons without JS');
    await noSideScroll(page);
    await page.done();
  }
  const hub = await open('/pregnancy', { js: false });
  assert.equal(await hub.locator('figure.pgrow .pg-dot').count(), 0);
  assert.equal(await hub.locator('a[href="/pregnancy/brit-mila"]').count(), 1);
  assert.equal(await hub.locator('#israel + p + table.pbars tbody tr').count(), 3);
  await hub.done();
});

test('week page: saving a name of the week puts it in the site\'s list, and a second click takes it out', async () => {
  const page = await open('/pregnancy/week-20');
  const btn = page.locator('.pfav').first(), name = await btn.getAttribute('data-fav');
  await btn.waitFor();
  assert.equal(await btn.getAttribute('aria-pressed'), 'false');
  await btn.click();
  assert.equal(await btn.getAttribute('aria-pressed'), 'true');
  assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('bnil_fav'))), [name]);
  assert.match(await page.textContent('.pfav-n'), /שמרתם שם אחד/);
  await btn.click();
  assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('bnil_fav'))), []);
  assert.equal(await page.locator('.pfav-n').isHidden(), true);
  await page.done();
});

test('fetal weight page: every week in the table, the charts, birth weights in Israel, no side scroll', async () => {
  for (const width of [375, 1200]) {
    const page = await open('/pregnancy/fetal-weight', { width });
    assert.equal(await page.locator('table.pfetal tbody th a[href^="/pregnancy/week-"]').count(), 39);
    assert.equal(await page.locator('figure.pgrow svg').count(), 2);
    assert.equal(await page.locator('#birth ~ table.pbars').first().locator('tbody tr').count(), 5);
    assert.match(await page.textContent('nav.crumbs'), /משקל העובר לפי שבועות/);
    await noSideScroll(page);
    await page.done();
  }
});

test('calculator: the names journey by stage, the saved names, and the holidays around the due date', async () => {
  // due date around Hanukkah: 280 days from the last period, so pick the last period from a due date ~3 weeks ahead
  const page = await open('/pregnancy/calculator', { saved: { m: 'lmp', d: ago(36 * 7), c: 28, e: 5 } });
  await page.evaluate(() => { localStorage.setItem('bnil_fav', JSON.stringify(['נועה', 'תמר', '<b>x</b>'])); location.reload(); });
  await page.waitForSelector('.pr-journey');
  assert.match(await page.textContent('.pr-journey h3'), /זמן להחליט/);
  assert.equal(await page.locator('.pr-journey a[href="/pregnancy/brit-mila"]').count(), 1);
  assert.match(await page.textContent('.pj-fav'), /3 שמות/);
  assert.equal(await page.locator('.pj-fav b').count(), 0, 'a saved name is text, not HTML');
  await noSideScroll(page);
  await page.done();
  const early = await open('/pregnancy/calculator', { saved: { m: 'lmp', d: ago(10 * 7), c: 28, e: 5 } });
  assert.match(await early.textContent('.pr-journey h3'), /זמן לחלום/);
  assert.equal(await early.locator('.pj-fav').count(), 0);
  await early.done();
});

test('brit mila: day 8 and day 31, after sunset one day later, a pidyon on Shabbat moves to Sunday', async () => {
  const page = await open('/pregnancy/brit-mila');
  await page.fill('input[name=date]', '2026-11-05');   // a Thursday: day 31 is Shabbat 5.12.2026
  await page.check('input[name=first]');
  await page.click('.pgo');
  const text = await page.textContent('#bres');
  assert.match(text, /יום חמישי, 12 בנובמבר 2026/);
  assert.match(text, /יום ראשון, 6 בדצמבר 2026/);
  assert.match(text, /חל בשבת/);
  assert.equal(await page.locator('#bres a[href*="305.11"]').count(), 1, 'the source of the moved pidyon');
  await page.check('input[name=time][value=night]');
  await page.click('.pgo');
  const late = await page.textContent('#bres');
  assert.match(late, /יום חמישי, 5 בנובמבר 2026, אחרי השקיעה/);
  assert.match(late, /יום שישי, 13 בנובמבר 2026/);
  await noSideScroll(page);
  await page.done();
});

test('brit mila: a birth time near sunset ticks "near sunset"; Friday near sunset moves the brit to Sunday', async () => {
  const page = await open('/pregnancy/brit-mila');
  await page.fill('input[name=date]', '2026-11-06');   // a Friday; sunset in Tel Aviv about 16:48
  await page.click('.pr-sun summary');
  await page.selectOption('select[name=city]', 'tel-aviv');
  await page.fill('input[name=clock]', '16:55');
  await page.locator('input[name=clock]').dispatchEvent('change');
  assert.equal(await page.isChecked('input[name=time][value=twilight]'), true);
  assert.match(await page.textContent('#bsun'), /השקיעה בתל אביב ביום הזה: בערך 16:4\d/);
  await page.click('.pgo');
  const t = await page.textContent('#bres');
  assert.match(t, /יום ראשון, 15 בנובמבר 2026/);
  assert.match(t, /רס״ו, ח/);
  assert.match(t, /רק לבן שהוא הלידה הראשונה/, 'not marked firstborn: no pidyon date');
  await page.done();
});

test('brit mila: a caesarean birth is not circumcised on Shabbat and is exempt from the pidyon', async () => {
  const page = await open('/pregnancy/brit-mila');
  await page.fill('input[name=date]', '2026-10-31');   // a Shabbat: day 8 is Shabbat 7.11.2026
  await page.check('input[name=caesar]');
  await page.check('input[name=first]');
  await page.click('.pgo');
  const t = await page.textContent('#bres');
  assert.match(t, /יום ראשון, 8 בנובמבר 2026/);
  assert.match(t, /רס״ו, י\)/);
  assert.match(t, /פטור מפדיון הבן/);
  assert.doesNotMatch(t, /פדיון הבן\s*יום/);
  await page.done();
});
