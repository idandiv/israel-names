// A small static server for the browser tests: serves the built site (src/) the way Vercel does (cleanUrls) and with
// the headers of vercel.json, including the Content Security Policy, so a CSP violation fails here as it would in production.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const ROOT = new URL('../../../', import.meta.url).pathname;
const SRC = join(ROOT, 'src');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain' };

async function headers() {
  const V = JSON.parse(await readFile(join(ROOT, 'vercel.json'), 'utf-8'));
  return (V.headers || []).filter(h => h.source === '/(.*)').flatMap(h => h.headers)
    .filter(h => h.key.toLowerCase() !== 'strict-transport-security')    // plain http on localhost:
    .map(h => ({ ...h, value: h.value.replace(/;\s*upgrade-insecure-requests/, '') }));   // no https to upgrade to
}

const isFile = p => stat(p).then(s => s.isFile(), () => false);

async function resolve(path) {
  const p = normalize(decodeURIComponent(path)).replace(/^(\.\.[/\\])+/, '');
  for (const c of [p, p + '.html', join(p, 'index.html')]) if (await isFile(join(SRC, c))) return join(SRC, c);
  return null;
}

/* starts the server on a free port; returns {url, close} */
export async function serve() {
  const H = await headers();
  const server = createServer(async (req, res) => {
    const file = await resolve(new URL(req.url, 'http://x').pathname);
    for (const h of H) res.setHeader(h.key, h.value);
    if (!file) { res.writeHead(404, { 'content-type': 'text/plain' }); res.end('not found'); return; }
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(await readFile(file));
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  return { url: `http://127.0.0.1:${server.address().port}`, close: () => new Promise(r => server.close(r)) };
}
