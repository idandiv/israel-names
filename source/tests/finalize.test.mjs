// The Vercel build step (scripts/finalize.mjs) on the committed src/: every placeholder is filled,
// the sitemap lists every page of scripts/paths.json, and robots.txt stays open to every crawler.
// Writes public/, the same output as `npm run build`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const out = path.join(root, 'public');
const BASE = 'https://www.example.test';
execFileSync(process.execPath, [path.join(root, 'scripts', 'finalize.mjs')], {
  env: { ...process.env, NEXT_PUBLIC_BASE_URL: BASE, VERCEL_PROJECT_PRODUCTION_URL: '', VERCEL_URL: '' }, stdio: 'pipe' });
const read = p => fs.readFileSync(path.join(out, p), 'utf8');
const files = (d = out) => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? files(path.join(d, e.name)) : [path.join(d, e.name)]);

test('no placeholder is left in pages, site-config.js or llms.txt', () => {
  const left = files().filter(f => /\.html$|site-config\.js$|llms\.txt$/.test(f))
    .filter(f => /__(BASE_URL|RUNTIME_BASE_URL|SUPABASE_URL|SUPABASE_KEY)__/.test(fs.readFileSync(f, 'utf8')));
  assert.deepEqual(left.map(f => path.relative(out, f)), []);
});

test('canonical of a page is the base address plus its path', () => {
  assert.match(read('names/boys.html'), new RegExp(`<link rel="canonical" href="${BASE}/names/boys">`));
  assert.match(read('index.html'), new RegExp(`<link rel="canonical" href="${BASE}/">`));
});

test('the home page links straight to the boys and girls pages, by their search phrase, without JavaScript', () => {
  const home = read('index.html');
  assert.match(home, /<a href="\/names\/boys">שמות לבנים<\/a>/);
  assert.match(home, /<a href="\/names\/girls">שמות לבנות<\/a>/);
});

test('the sitemaps list every path once, with a lastmod: the Hebrew pages in sitemap-he.xml and the /ar pages in sitemap-ar.xml', () => {
  const paths = JSON.parse(fs.readFileSync(path.join(root, 'scripts', 'paths.json'), 'utf8'));
  const isAr = p => p === '/ar' || p.startsWith('/ar/');
  const locs = f => [...read(f).matchAll(/<url><loc>([^<]+)<\/loc><lastmod>\d{4}-\d\d-\d\d<\/lastmod><\/url>/g)].map(m => m[1]);
  assert.deepEqual(locs('sitemap-he.xml'), paths.filter(p => !isAr(p)).map(p => BASE + p));
  assert.deepEqual(locs('sitemap-ar.xml'), paths.filter(isAr).map(p => BASE + p));
  assert.ok(paths.some(isAr), 'there are Arabic pages');
});

test('sitemap.xml is an index of the two language sitemaps', () => {
  const s = read('sitemap.xml');
  assert.match(s, /<sitemapindex xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
  const locs = [...s.matchAll(/<sitemap><loc>([^<]+)<\/loc><lastmod>\d{4}-\d\d-\d\d<\/lastmod><\/sitemap>/g)].map(m => m[1]);
  assert.deepEqual(locs, [`${BASE}/sitemap-he.xml`, `${BASE}/sitemap-ar.xml`]);
  assert.ok(!/<url>/.test(s));
});

test('a Hebrew page and its Arabic counterpart point to each other with full addresses', () => {
  for (const [he, ar] of [['names/boys.html', 'ar/names/boys.html'], ['ar/index.html', null]]) {
    const s = read(he);
    if (!ar) { assert.ok(!/hreflang="he" href/.test(s), `${he} has no counterpart`); continue; }
    for (const f of [he, ar]) {
      const t = read(f);
      assert.match(t, new RegExp(`<link rel="alternate" hreflang="he" href="${BASE}/names/boys">`), f);
      assert.match(t, new RegExp(`<link rel="alternate" hreflang="ar" href="${BASE}/ar/names/boys">`), f);
      assert.match(t, new RegExp(`<link rel="alternate" hreflang="x-default" href="${BASE}/names/boys">`), f);
    }
  }
});

test('robots.txt allows every crawler and points to the sitemap', () => {
  const r = read('robots.txt');
  assert.ok(!/Disallow/.test(r));
  for (const bot of ['*', 'Googlebot', 'GPTBot', 'ClaudeBot', 'PerplexityBot']) assert.match(r, new RegExp(`User-agent: ${bot.replace('*', '\\*')}\\nAllow: /\\n`));
  assert.match(r, new RegExp(`Sitemap: ${BASE}/sitemap.xml`));
});
