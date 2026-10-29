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
// Supabase (NameMatch realtime). The publishable key is public by design: access is enforced by RLS.
// Env vars win; otherwise the committed supabase.config.json is used.
let sbCfg = {};
try { sbCfg = JSON.parse(fs.readFileSync(path.join(root, 'supabase.config.json'), 'utf8')); } catch {}
const sbUrl = clean(process.env.NEXT_PUBLIC_SUPABASE_URL || sbCfg.url || '');
const sbKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || sbCfg.publishableKey || '').trim();
const base = explicit || clean(withProto(process.env.VERCEL_PROJECT_PRODUCTION_URL)) || clean(withProto(process.env.VERCEL_URL));

fs.rmSync(out, { recursive: true, force: true });
const walk = (from, to) => {
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    const a = path.join(from, e.name), b = path.join(to, e.name);
    if (e.isDirectory()) { walk(a, b); continue; }
    if (e.name.endsWith('.html') || e.name === 'site-config.js') {
      const s = fs.readFileSync(a, 'utf8').split('__BASE_URL__').join(base).split('__RUNTIME_BASE_URL__').join(explicit).split('__SUPABASE_URL__').join(JSON.stringify(sbUrl).slice(1,-1)).split('__SUPABASE_KEY__').join(JSON.stringify(sbKey).slice(1,-1));
      fs.writeFileSync(b, s);
    } else fs.copyFileSync(a, b);
  }
};
walk(src, out);

const paths = JSON.parse(fs.readFileSync(path.join(root, 'scripts', 'paths.json'), 'utf8'));
// <lastmod>: the date each page's content last changed (kept by build_site.py), not the build date
let lastmod = {};
try { lastmod = JSON.parse(fs.readFileSync(path.join(root, 'scripts', 'lastmod.json'), 'utf8')); } catch {}
if (base) {
  const mod = p => (lastmod[decodeURIComponent(p)] || [])[1];
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    paths.map(p => `<url><loc>${base}${p}</loc>${mod(p) ? `<lastmod>${mod(p)}</lastmod>` : ''}</url>`).join('\n') + '\n</urlset>\n';
  fs.writeFileSync(path.join(out, 'sitemap.xml'), xml);
}
// ads.txt (AdSense): the committed ads.txt at the repo root is served as /ads.txt.
// If it is still empty and ADSENSE_PUBLISHER_ID is set in Vercel (e.g. pub-1234567890123456), the standard Google line is written.
let ads = '';
try { ads = fs.readFileSync(path.join(root, 'ads.txt'), 'utf8'); } catch {}
const pub = (process.env.ADSENSE_PUBLISHER_ID || '').trim().replace(/^ca-/, '');
if (!ads.trim() && /^pub-\d{10,20}$/.test(pub)) ads = `google.com, ${pub}, DIRECT, f08c47fec0942fa0\n`;
fs.writeFileSync(path.join(out, 'ads.txt'), ads);
// robots.txt: everything is open to everyone. The named groups (search engines, AI search and assistants, AdSense) only make that explicit;
// a crawler that matches a named group reads that group alone, so each one must stay "Allow: /".
const BOTS = ['Googlebot', 'Google-Extended', 'Mediapartners-Google', 'AdsBot-Google', 'Bingbot', 'GPTBot', 'OAI-SearchBot', 'ChatGPT-User',
  'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User', 'Applebot', 'Applebot-Extended'];
fs.writeFileSync(path.join(out, 'robots.txt'), ['*', ...BOTS].map(b => `User-agent: ${b}\nAllow: /\n`).join('\n') + (base ? `\nSitemap: ${base}/sitemap.xml\n` : ''));
// llms.txt: a short plain-text guide to the site for AI assistants (llmstxt.org)
const at = base || '';
fs.writeFileSync(path.join(out, 'llms.txt'), `# השמות של ישראל (ShemotIL)

> מאגר שמות התינוקות של ישראל: עמוד לכל שם שניתן בישראל מאז 1949 (כ-5,700 שמות), לפי נתוני הלשכה המרכזית לסטטיסטיקה (הלמ״ס), עם משמעות השם (כשידועה), פופולריות לאורך השנים, שנת שיא, חלוקה בין בנות לבנים, מגזר וגימטריה.

כל המספרים באתר מחושבים מנתוני הלמ״ס, שכוללים כל שם שניתן לפחות ל-5 תינוקות באותה שנה. האתר בעברית ונוצר על ידי עידן דיוה.

## עמודי שמות
- כתובת של שם: ${at}/names/<השם בעברית>, למשל [נועה](${at}/names/${encodeURIComponent('נועה')}) או [דוד](${at}/names/${encodeURIComponent('דוד')})
- [כל השמות לפי א״ב](${at}/names)

## אוספים
- [שמות לבנים: 100 המובילים](${at}/names/boys)
- [שמות לבנות: 100 המובילים](${at}/names/girls)
- [שמות יוניסקס](${at}/names/unisex)
- [השמות הנפוצים בישראל](${at}/names/popular)

## מידע
- [אודות](${at}/about)
- [Sitemap](${at}/sitemap.xml)
`);
console.log(`finalize: base="${base || '(current origin)'}" pages=${paths.length} realtime=${sbUrl && sbKey ? 'on' : 'off'}`);
