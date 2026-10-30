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

test('sitemap lists every path once, with a lastmod', () => {
  const paths = JSON.parse(fs.readFileSync(path.join(root, 'scripts', 'paths.json'), 'utf8'));
  const locs = [...read('sitemap.xml').matchAll(/<url><loc>([^<]+)<\/loc><lastmod>\d{4}-\d\d-\d\d<\/lastmod><\/url>/g)].map(m => m[1]);
  assert.equal(locs.length, paths.length);
  assert.deepEqual(locs, paths.map(p => BASE + p));
});

test('robots.txt allows every crawler and points to the sitemap', () => {
  const r = read('robots.txt');
  assert.ok(!/Disallow/.test(r));
  for (const bot of ['*', 'Googlebot', 'GPTBot', 'ClaudeBot', 'PerplexityBot']) assert.match(r, new RegExp(`User-agent: ${bot.replace('*', '\\*')}\\nAllow: /\\n`));
  assert.match(r, new RegExp(`Sitemap: ${BASE}/sitemap.xml`));
});
