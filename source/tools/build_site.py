"""Step 4: build the deployable static site into the repo root.

Reads:  source/dist/js_bundle.js + css_bundle.css (build_bundle.py), source/data/data.b64,
        source/data/seo.json (export_seo.mjs), source/assets/, source/node_modules (chart.js, supabase-js)
Writes: <repo>/src/   (pages with the __BASE_URL__ placeholder, filled at deploy time by scripts/finalize.mjs)
        <repo>/scripts/paths.json (sitemap list)
Only src/ is replaced; the other repo-root files (vercel.json, finalize.mjs, supabase/...) are kept as they are.
"""
import gzip, base64, json, hashlib, os, shutil, html as H

S = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..') + '/'
D = S
OUT = os.path.abspath(os.path.join(S, '..')) + '/'
SRC = OUT + 'src/'
PH = '__BASE_URL__'

shutil.rmtree(SRC, ignore_errors=True)
os.makedirs(SRC + 'assets', exist_ok=True)
os.makedirs(SRC + 'names', exist_ok=True)
os.makedirs(OUT + 'scripts', exist_ok=True)

css = open(D + 'dist/css_bundle.css').read()
js = open(D + 'dist/js_bundle.js').read()
data = gzip.decompress(base64.b64decode(open(D + 'data/data.b64').read())).decode()
chart = open(D + 'node_modules/chart.js/dist/chart.umd.js').read()
seo = json.load(open(D + 'data/seo.json'))
import re
Y0, Y1, NAMES = seo['y0'], seo['y1'], [x for x in seo['names'] if re.fullmatch(r"[א-ת' \-]+", x['n'])]

css += """
/* static fallback content (visible until the app boots, and to crawlers) */
.seo{max-width:760px;margin:0 auto;padding:24px 16px 48px;color:var(--ink);font-family:'IBM Plex Sans Hebrew',system-ui,sans-serif;line-height:1.7}
.seo h1{font-family:'Karantina',system-ui;font-size:56px;line-height:1;margin:8px 0 12px}
.seo .k{color:var(--muted);font-size:14px}.seo ul{padding-inline-start:18px}
.seo a{color:var(--accent,#a78bfa)}.seo .rel{display:flex;flex-wrap:wrap;gap:8px;list-style:none;padding:0}
.seo .rel a{display:inline-block;border:1px solid var(--line);border-radius:999px;padding:4px 12px;text-decoration:none;color:var(--ink)}
.seo .az a{display:inline-block;margin:2px 6px}
"""


def hashed(name, ext, content):
    h = hashlib.sha1(content.encode()).hexdigest()[:10]
    fn = f'{name}.{h}.{ext}'
    open(SRC + 'assets/' + fn, 'w').write(content)
    return '/assets/' + fn


os.makedirs(SRC + 'assets/fonts', exist_ok=True)
FF = ''
for fn in sorted(os.listdir(D + 'assets/fonts')):
    shutil.copy(D + 'assets/fonts/' + fn, SRC + 'assets/fonts/' + fn)
    fam = 'Karantina' if fn.startswith('karantina') else 'IBM Plex Sans Hebrew'
    w = fn.split('-')[-2]
    rng = 'U+0590-05FF,U+200C-2010,U+20AA,U+25CC,U+FB1D-FB4F' if '-hebrew-' + w in fn else 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'
    FF += f"@font-face{{font-family:'{fam}';font-style:normal;font-weight:{w};font-display:swap;src:url(/assets/fonts/{fn}) format('woff2');unicode-range:{rng}}}\n"
css = FF + css
A_CSS = hashed('app', 'css', css)
shutil.copy(D + 'assets/og.png', SRC + 'og.png')
A_CHART = hashed('chart', 'js', chart)
A_DATA = hashed('data', 'js', 'const DATA=' + data + ';')
A_APP = hashed('app', 'js', '(()=>{\n' + js + '\n})();')
A_SB = hashed('supabase', 'js', open(D + 'node_modules/@supabase/supabase-js/dist/umd/supabase.js').read())

FAVICON = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#151320"/><path d="M18 46V18h6l16 18V18h6v28h-6L24 28v18z" fill="#a78bfa"/></svg>'''
open(SRC + 'favicon.svg', 'w').write(FAVICON)

SITE_T = 'השמות של ישראל – כל שמות התינוקות בישראל מאז 1949'
SITE_D = 'מה הסיפור מאחורי השם שלך? משמעות, מקור, שנת שיא וגרפים לכל שם שניתן בישראל מאז 1949, מחולל שמות לתינוק ומשחקים. לפי נתוני הלמ״ס.'
fmt = lambda n: f'{n:,}'
enc = lambda n: __import__('urllib.parse').parse.quote(n, safe="'")


def page(title, desc, path, body, noindex=False, jsonld=None):
    canon = PH + path
    e = H.escape
    return f'''<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
{'<meta name="robots" content="noindex">' if noindex else f'<link rel="canonical" href="{canon}">'}
<meta name="theme-color" content="#0f0e17">
<meta name="color-scheme" content="dark">
<meta property="og:type" content="website">
<meta property="og:locale" content="he_IL">
<meta property="og:site_name" content="השמות של ישראל">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:url" content="{canon}">
<meta property="og:image" content="{PH}/og.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/assets/fonts/ibm-plex-sans-hebrew-hebrew-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="{A_CSS}">
{f'<script type="application/ld+json">{json.dumps(jsonld, ensure_ascii=False)}</script>' if jsonld else ''}
</head>
<body>
<div id="app" dir="rtl">{body}</div>
<div class="toast" id="toast" hidden></div>
<div class="modal" id="modal" hidden></div>
<script src="/site-config.js"></script>
<script src="{A_CHART}"></script>
<script src="{A_DATA}"></script>
<script src="{A_APP}"></script>
</body>
</html>
'''


def nav_links():
    return '<p><a href="/">לדף הבית</a> · <a href="/names">כל השמות</a> · <a href="/about">אודות</a> · <a href="/privacy">מדיניות פרטיות</a> · <a href="/terms">תנאי שימוש</a></p>'


# ---- name pages ----
by_name = {x['n']: x for x in NAMES}
for x in NAMES:
    n = x['n']
    sexw = 'בנות' if x['x'] == 0 else 'בנים'
    desc = x['desc'][:300]
    title = f'השם {n} – משמעות, מקור וסטטיסטיקה | השמות של ישראל'
    facts = [
        f"{fmt(x['tot'])} תינוקות נקראו {n} בישראל מאז {Y0}.",
        (f"השם היה הכי נפוץ כבר בתחילת הרישום, ב-{Y0}." if x['start'] else f"שנת השיא: {x['pk']}, כשאחד מכל {fmt(x['oneIn'])} תינוקות נקרא כך."),
        f"הכי הרבה תינוקות בשם הזה נולדו ב-{x['my']}: {fmt(x['myc'])}.",
        (f"ב-{Y1} נקראו כך {fmt(x['last'])} תינוקות" + (f", מקום {x['rk']} ב{sexw}." if x['rk'] else '.')) if x['last'] else f"ב-{Y1} כמעט לא ניתן השם.",
        f"שנת הלידה הטיפוסית: {x['med']}. הופעה ראשונה ברשימות: {x['first']}.",
        f"בנות {x['g']}% · בנים {100 - x['g']}%." + (f" מגזר: {x['sec']}." if x['sec'] else ''),
    ]
    rel = ''.join(f'<li><a href="/names/{enc(r)}">{H.escape(r)}</a></li>' for r in x['rel'] if r in by_name)
    body = f'''<article class="seo">
<p class="k">השמות של ישראל · תיק שם</p>
<h1>{H.escape(n)}</h1>
{f'<p><b>משמעות:</b> {H.escape(x["mean"])}</p>' if x['mean'] else ''}
{f'<p>{H.escape(x["story"])}</p>' if x['story'] and x['story'] != x['mean'] else ''}
<ul>{''.join(f'<li>{H.escape(f)}</li>' for f in facts)}</ul>
{f'<h2>שמות מאותה תקופה</h2><ul class="rel">{rel}</ul>' if rel else ''}
{nav_links()}
<p class="k">מקור: הלשכה המרכזית לסטטיסטיקה. נוצר ע״י <a href="https://www.linkedin.com/in/idan-diva/">עידן דיוה</a>.</p>
</article>'''
    ld = {"@context": "https://schema.org", "@type": "WebPage", "name": title, "description": desc, "inLanguage": "he",
          "url": f"{PH}/names/{enc(n)}",
          "breadcrumb": {"@type": "BreadcrumbList", "itemListElement": [
              {"@type": "ListItem", "position": 1, "name": "השמות של ישראל", "item": PH + "/"},
              {"@type": "ListItem", "position": 2, "name": "כל השמות", "item": PH + "/names"},
              {"@type": "ListItem", "position": 3, "name": n}]}}
    open(SRC + 'names/' + n + '.html', 'w').write(page(title, desc, '/names/' + enc(n), body, jsonld=ld))

# ---- all-names directory (crawl hub) ----
groups = {}
for x in sorted(NAMES, key=lambda x: -x['tot']):
    groups.setdefault(x['n'][0], []).append(x['n'])
az = ''.join(
    f'<h2 id="l{i}">{H.escape(k)}</h2><p class="az">' + ''.join(f'<a href="/names/{enc(n)}">{H.escape(n)}</a>' for n in groups[k]) + '</p>'
    for i, k in enumerate(sorted(groups)))
open(SRC + 'names/index.html', 'w').write(page(
    'כל שמות התינוקות בישראל לפי א״ב | השמות של ישראל',
    f'רשימת כל {fmt(len(NAMES))} השמות שניתנו לתינוקות בישראל מאז {Y0}, לפי אותיות, עם משמעות וסטטיסטיקה לכל שם.',
    '/names', f'<article class="seo"><h1>כל השמות</h1><p>{fmt(len(NAMES))} שמות, מסודרים לפי אות ראשונה ולפי פופולריות.</p>{az}{nav_links()}</article>'))

# ---- home + 404 ----
top = [x['n'] for x in sorted(NAMES, key=lambda x: -x['last'])[:40]]
home_body = f'''<article class="seo"><h1>השמות של ישראל</h1><p>{H.escape(SITE_D)}</p>
<h2>השמות הפופולריים ב-{Y1}</h2><ul class="rel">{''.join(f'<li><a href="/names/{enc(n)}">{H.escape(n)}</a></li>' for n in top)}</ul>
<p><a href="/names">לכל {fmt(len(NAMES))} השמות</a></p></article>'''
open(SRC + 'index.html', 'w').write(page(SITE_T, SITE_D, '/', home_body,
    jsonld={"@context": "https://schema.org", "@type": "WebSite", "name": "השמות של ישראל", "url": PH + "/", "inLanguage": "he"}))
# ---- info pages (same content the app shows at /about, /privacy, /terms) ----
PAGES = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data', 'pages.json'), encoding='utf-8'))
for k, P in PAGES.items():
    body_html = P['html'].replace('<div class="dwipe" data-wipe></div>', '')
    open(SRC + k + '.html', 'w').write(page(P['title'] + ' | השמות של ישראל', P['desc'], '/' + k,
        '<article class="seo"><p class="k">השמות של ישראל</p><h1>' + H.escape(P['title']) + '</h1>' + body_html + nav_links() + '</article>'))
open(SRC + '404.html', 'w').write(page('הדף לא נמצא | השמות של ישראל', SITE_D, '/', '<article class="seo"><h1>הדף לא נמצא</h1>' + nav_links() + '</article>', noindex=True))

# list of indexable paths for the sitemap (finalize.mjs adds the base URL)
paths = ['/', '/names', '/about', '/privacy', '/terms'] + ['/names/' + enc(x['n']) for x in sorted(NAMES, key=lambda x: -x['tot'])]
json.dump(paths, open(OUT + 'scripts/paths.json', 'w'), ensure_ascii=False)
# runtime config as an external file (filled by finalize.mjs) so the CSP needs no inline scripts
open(SRC + 'site-config.js', 'w').write('window.SITE_CONFIG={baseUrl:"__RUNTIME_BASE_URL__",routing:"path",supabase:{url:"__SUPABASE_URL__",key:"__SUPABASE_KEY__",lib:"' + A_SB + '"}};\n')
print('pages', len(NAMES) + 3, 'assets', A_APP, A_DATA)
