// Vercel build step: copies src/ to public/ and fills in the site address.
// Address priority: NEXT_PUBLIC_BASE_URL (set it once you have your own domain)
//   -> VERCEL_PROJECT_PRODUCTION_URL (set automatically by Vercel: the production domain)
//   -> VERCEL_URL (this deployment) -> empty (links fall back to the visitor's current origin).
// In the browser, share links use NEXT_PUBLIC_BASE_URL when set, otherwise window.location.origin.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'src'), out = path.join(root, 'public');
const clean = u => (u || '').trim().replace(/\/+$/, '');
const withProto = u => (u && !/^https?:\/\//.test(u) ? 'https://' + u : u);
const explicit = clean(withProto(process.env.NEXT_PUBLIC_BASE_URL));
const base = explicit || clean(withProto(process.env.VERCEL_PROJECT_PRODUCTION_URL)) || clean(withProto(process.env.VERCEL_URL));

fs.rmSync(out, { recursive: true, force: true });
const walk = (from, to) => {
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    const a = path.join(from, e.name), b = path.join(to, e.name);
    if (e.isDirectory()) { walk(a, b); continue; }
    if (e.name.endsWith('.html')) {
      const s = fs.readFileSync(a, 'utf8').split('__BASE_URL__').join(base).split('__RUNTIME_BASE_URL__').join(explicit);
      fs.writeFileSync(b, s);
    } else fs.copyFileSync(a, b);
  }
};
walk(src, out);

const paths = JSON.parse(fs.readFileSync(path.join(root, 'scripts', 'paths.json'), 'utf8'));
if (base) {
  const today = new Date().toISOString().slice(0, 10);
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    paths.map(p => `<url><loc>${base}${p}</loc><lastmod>${today}</lastmod></url>`).join('\n') + '\n</urlset>\n';
  fs.writeFileSync(path.join(out, 'sitemap.xml'), xml);
}
fs.writeFileSync(path.join(out, 'robots.txt'), `User-agent: *\nAllow: /\n${base ? `Sitemap: ${base}/sitemap.xml\n` : ''}`);
console.log(`finalize: base="${base || '(current origin)'}" pages=${paths.length}`);
