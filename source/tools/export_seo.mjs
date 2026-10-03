// Step 3: compute the per-name facts used by the static SEO pages (data/seo.json),
// by running the real app code in headless Chromium (same numbers as the site).
// Needs: npm i (in source/) and `npx playwright install chromium` once.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const S = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage();
await page.route('**/chart.umd.min.js', r => r.fulfill({ path: path.join(S, 'node_modules/chart.js/dist/chart.umd.js'), contentType: 'application/javascript' }));
page.on('pageerror', e => console.error('page error:', e.message));
await page.goto('file://' + path.join(S, 'dist', 'test.html') + '#home');
await page.waitForFunction(() => typeof window.__bnilExport === 'function', null, { timeout: 30000 });
const out = await page.evaluate(() => window.__bnilExport());
fs.writeFileSync(path.join(S, 'data', 'seo.json'), JSON.stringify(out));
console.log('seo.json:', out.names.length, 'names');
await browser.close();
