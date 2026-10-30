"""Step 5: check the built site in <repo>/src/ (run by `npm run site` after build_site.py, and on every PR in CI).

Fails (exit 1, with a list of problems) when:
- an internal link, script, stylesheet or icon points to a file that is not in src/
- a page has no title or description, or not exactly one <h1>
- an indexable page has no canonical, or a canonical that is not its own address
- a JSON-LD block is not valid JSON, or has a node without @type
- two indexable pages share a title
- scripts/paths.json (the sitemap list) and the indexable pages in src/ differ, or lastmod.json misses a path
- app.js is loaded on a page the app would take over by mistake: only the home page, the info pages, 404
  and the name pages (/names/<name>, with the name's DefinedTerm) may load it
Standard library only, so CI needs no install.
"""
import json, os, re, sys
from urllib.parse import unquote

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')) + '/'
SRC = ROOT + 'src/'
PH = '__BASE_URL__'
APP_PAGES = {'/', '/about', '/privacy', '/terms', '/accessibility', '/404'}
# served by Vercel or written by scripts/finalize.mjs at deploy time, so not in src/
EXTERNAL = ('/_vercel/', '/sitemap.xml', '/robots.txt', '/ads.txt')

ATTR = re.compile(r'\s(?:href|src)="([^"]*)"')
LD = re.compile(r'<script type="application/ld\+json">(.*?)</script>', re.S)
TITLE = re.compile(r'<title>(.*?)</title>', re.S)
DESC = re.compile(r'<meta name="description" content="([^"]*)"')
CANON = re.compile(r'<link rel="canonical" href="([^"]*)"')
APP_JS = re.compile(r'<script src="/assets/app\.[0-9a-f]+\.js">')


def page_path(fn):
    """src/names/נועה.html -> /names/נועה, src/index.html -> /, src/names/index.html -> /names"""
    p = '/' + fn[len(SRC):-len('.html')]
    p = re.sub(r'/index$', '', p)
    return p or '/'


def target_exists(url):
    p = unquote(url.split('#')[0].split('?')[0])
    if p.startswith(EXTERNAL):
        return True
    if p in ('', '/'):
        return os.path.isfile(SRC + 'index.html')
    f = SRC + p.lstrip('/')
    return os.path.isfile(f) or os.path.isfile(f + '.html') or os.path.isfile(f.rstrip('/') + '/index.html')


def ld_types(node, out):
    if isinstance(node, dict):
        if '@graph' in node:
            for n in node['@graph']:
                if not isinstance(n, dict) or '@type' not in n:
                    out.append(None)
                else:
                    out.append(n['@type'])
        elif '@type' in node:
            out.append(node['@type'])
        else:
            out.append(None)
    return out


def check():
    errs, titles = [], {}
    pages = sorted(os.path.join(d, f) for d, _, fs in os.walk(SRC) for f in fs if f.endswith('.html'))
    indexable = set()
    for fn in pages:
        path = page_path(fn)
        s = open(fn, encoding='utf-8').read()
        bad = lambda m: errs.append(f'{path}: {m}')
        noindex = '<meta name="robots" content="noindex">' in s
        t, d = TITLE.search(s), DESC.search(s)
        if not t or not t.group(1).strip():
            bad('no <title>')
        if not d or not d.group(1).strip():
            bad('no meta description')
        h1 = len(re.findall(r'<h1[\s>]', s))
        if h1 != 1:
            bad(f'{h1} <h1> elements')
        c = CANON.search(s)
        if not noindex:
            indexable.add(path)
            if not c:
                bad('no canonical')
            elif unquote(c.group(1)) != PH + (path if path != '/' else '/'):
                bad(f'canonical {unquote(c.group(1))} is not this page')
            if t:
                titles.setdefault(t.group(1).strip(), []).append(path)
        for u in ATTR.findall(s):
            if u.startswith(PH):
                u = u[len(PH):] or '/'
            if u.startswith('/') and not u.startswith('//') and not target_exists(u):
                bad(f'broken link {unquote(u)}')
        names = []
        for block in LD.findall(s):
            try:
                types = ld_types(json.loads(block), [])
            except ValueError as e:
                bad(f'JSON-LD is not valid JSON ({e})')
                continue
            if None in types:
                bad('JSON-LD node without @type')
            names += [n.get('name') for n in (json.loads(block).get('@graph') or []) if n.get('@type') == 'DefinedTerm']
        if APP_JS.search(s) and path not in APP_PAGES:
            m = re.fullmatch(r'/names/([^/]+)', path)
            if not (m and m.group(1) in names):
                bad('loads app.js, which would take this URL over (build it with page(..., app=False))')
    for t, ps in titles.items():
        if len(ps) > 1:
            errs.append(f'title shared by {len(ps)} pages: {t} ({", ".join(ps[:3])})')
    sitemap = [unquote(p) for p in json.load(open(ROOT + 'scripts/paths.json', encoding='utf-8'))]
    lastmod = json.load(open(ROOT + 'scripts/lastmod.json', encoding='utf-8'))
    for p in sorted(set(sitemap) - indexable):
        errs.append(f'sitemap path {p} has no indexable page in src/')
    for p in sorted(indexable - set(sitemap)):
        errs.append(f'indexable page {p} is missing from scripts/paths.json (the sitemap)')
    if len(sitemap) != len(set(sitemap)):
        errs.append('scripts/paths.json lists a path twice')
    for p in sitemap:
        if p not in lastmod:
            errs.append(f'scripts/lastmod.json has no date for {p}')
    return len(pages), errs


if __name__ == '__main__':
    n, errs = check()
    if errs:
        print(f'check_site: {len(errs)} problems in {n} pages', file=sys.stderr)
        for e in errs[:60]:
            print('  ' + e, file=sys.stderr)
        if len(errs) > 60:
            print(f'  ... and {len(errs) - 60} more', file=sys.stderr)
        sys.exit(1)
    print(f'check_site ok: {n} pages')
