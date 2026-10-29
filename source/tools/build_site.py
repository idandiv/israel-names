"""Step 4: build the deployable static site into the repo root.

Reads:  source/dist/js_bundle.js + css_bundle.css (build_bundle.py), source/data/data.b64,
        source/data/seo.json (export_seo.mjs), source/data/meanings.json (meanings and stories, see meanings.py), source/assets/, source/node_modules (chart.js, supabase-js)
Writes: <repo>/src/   (pages with the __BASE_URL__ placeholder, filled at deploy time by scripts/finalize.mjs)
        <repo>/scripts/paths.json (sitemap list), <repo>/scripts/lastmod.json (date each page's content last changed)
Only src/ is replaced; the other repo-root files (vercel.json, finalize.mjs, supabase/...) are kept as they are.
"""
import gzip, base64, json, hashlib, os, shutil, html as H
import meanings

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
# meanings and stories come from data/meanings.json (not seo.json), so new content needs no seo.json export
MEANINGS = meanings.load()
for x in NAMES:
    x['mean'] = meanings.meaning(MEANINGS, x['n'])
    x['story'] = (MEANINGS.get(x['n']) or {}).get('story', '')

css += """
/* static fallback content (visible until the app boots, and to crawlers) */
.seo{max-width:760px;margin:0 auto;padding:24px 16px 48px;color:var(--ink);font-family:'IBM Plex Sans Hebrew',system-ui,sans-serif;line-height:1.7}
.seo h1{font-family:'Karantina',system-ui;font-size:56px;line-height:1;margin:8px 0 12px}
.seo .k{color:var(--muted);font-size:14px}.seo ul{padding-inline-start:18px}
.seo a{color:var(--accent,#a78bfa)}.seo .rel{display:flex;flex-wrap:wrap;gap:8px;list-style:none;padding:0}
.seo .rel a{display:inline-block;border:1px solid var(--line);border-radius:999px;padding:4px 12px;text-decoration:none;color:var(--ink)}
.seo .az a{display:inline-block;margin:2px 6px}
/* app-less static pages: collections and the all-names hub (same look as the info pages) */
.docin>.docbody .k{color:var(--muted);font-size:13px;margin:0}
.docbody .coll{list-style:none;padding:0;margin:8px 0 8px;columns:2 260px;column-gap:24px}
.docbody .coll li{margin:0;padding:8px 2px;border-bottom:1px solid var(--line);min-width:0;break-inside:avoid}
.docbody .coll a{display:flex;align-items:baseline;gap:10px;border:0;color:var(--ink);font-weight:400;min-height:28px}
.docbody .coll a:hover b{color:var(--accent)}
.docbody .coll .cr{color:var(--muted);font-size:13px;min-width:24px;font-variant-numeric:tabular-nums}
.docbody .coll b{font-size:17px;font-weight:700}
.docbody .coll .cn{margin-inline-start:auto;color:var(--muted);font-size:13px;white-space:nowrap;font-variant-numeric:tabular-nums}
.docbody .coll .cm{display:block;padding-inline-start:34px;color:var(--muted);font-size:13px;line-height:1.5;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.docbody .coll .sx{font-size:11.5px;border:1px solid var(--line);border-radius:999px;padding:0 7px;margin-inline-end:6px}
.docbody .coll .sx0{color:var(--girl,var(--muted))}.docbody .coll .sx1{color:var(--boy,var(--muted))}
.collcta{margin-top:28px}
.docbody .azjump{display:flex;flex-wrap:wrap;gap:4px;margin:18px 0 0}
.docbody .azjump a{border:1px solid var(--line);border-radius:10px;min-width:36px;min-height:36px;display:inline-grid;place-items:center;color:var(--ink)}
.docbody .seo-az h2{scroll-margin-top:80px}
.docbody .seo-az .az a{display:inline-block;margin:2px 6px;border:0;font-weight:400}
.docfoot p{margin:6px 0}.docfoot p a{color:var(--muted);font-weight:400}
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
A_MEAN = hashed('meanings', 'js', 'const MEANINGS=' + json.dumps(meanings.compact(MEANINGS), ensure_ascii=False, separators=(',', ':')) + ';')
A_APP = hashed('app', 'js', '(()=>{\n' + js + '\n})();')
A_SB = hashed('supabase', 'js', open(D + 'node_modules/@supabase/supabase-js/dist/umd/supabase.js').read())

# site icons (Google results, tabs, home screens): ico + png + svg, plus a small web manifest
for fn in os.listdir(D + 'assets/icons'):
    shutil.copy(D + 'assets/icons/' + fn, SRC + fn)
json.dump({'name': 'השמות של ישראל', 'short_name': 'השמות של ישראל', 'lang': 'he', 'dir': 'rtl', 'start_url': '/', 'display': 'standalone',
           'background_color': '#101119', 'theme_color': '#101119',
           'icons': [{'src': '/icon-192.png', 'sizes': '192x192', 'type': 'image/png'}, {'src': '/icon-512.png', 'sizes': '512x512', 'type': 'image/png'}]},
          open(SRC + 'site.webmanifest', 'w'), ensure_ascii=False)

SITE_T = 'השמות של ישראל | מאגר שמות לתינוקות ומשחק בחירת שם ביחד'
SITE_D = 'מחפשים שם לתינוק? מאגר השמות המלא בישראל עם משמעויות, פופולריות לאורך השנים, ומשחק זוגי חדשני למציאת מאץ\' על השם המושלם. חינם לגמרי!'
fmt = lambda n: f'{n:,}'
enc = lambda n: __import__('urllib.parse').parse.quote(n, safe="'")
LINKEDIN = 'https://www.linkedin.com/in/idan-diva/'
# shared JSON-LD nodes: the site and its author (referenced by @id from every page)
LD_SITE = {"@type": "WebSite", "@id": PH + "/#website", "name": "השמות של ישראל", "url": PH + "/", "inLanguage": "he",
           "description": SITE_D, "publisher": {"@id": PH + "/#author"}}
LD_AUTHOR = {"@type": "Person", "@id": PH + "/#author", "name": "עידן דיוה", "alternateName": "Idan Diva", "url": LINKEDIN, "sameAs": [LINKEDIN]}
LD_DATA = {"@type": "CreativeWork", "name": f"שמות התינוקות שנולדו בישראל {Y0}–{Y1}",
           "creator": {"@type": "Organization", "name": "הלשכה המרכזית לסטטיסטיקה", "url": "https://www.cbs.gov.il"}}

# sitemap <lastmod>: a page's date changes only when its content does (hash kept in scripts/lastmod.json)
LASTMOD_F = OUT + 'scripts/lastmod.json'
try:
    LASTMOD_OLD = json.load(open(LASTMOD_F, encoding='utf-8'))
except (OSError, ValueError):
    LASTMOD_OLD = {}
LASTMOD = {}
TODAY = __import__('datetime').date.today().isoformat()


def modified(path, content):
    path = __import__('urllib.parse').parse.unquote(path)   # readable keys: /names/נועה
    h = hashlib.sha1(content.encode()).hexdigest()[:10]
    old = LASTMOD_OLD.get(path)
    LASTMOD[path] = [h, old[1] if old and old[0] == h else TODAY]
    return LASTMOD[path][1]


def page(title, desc, path, body, noindex=False, jsonld=None, app=True):
    """app=False: a plain static page (collections, the all-names hub) that the app does not take over.
    jsonld may hold "__MODIFIED__", which becomes the date the page content last changed."""
    canon = PH + path
    e = H.escape
    ld = json.dumps(jsonld, ensure_ascii=False) if jsonld else ''
    if not noindex:
        ld = ld.replace('__MODIFIED__', modified(path, title + desc + body + ld))
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
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="השמות של ישראל – מאגר שמות לתינוקות ומשחק בחירת שם ביחד">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{e(title)}">
<meta name="twitter:description" content="{e(desc)}">
<meta name="twitter:image" content="{PH}/og.png">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="preload" href="/assets/fonts/ibm-plex-sans-hebrew-hebrew-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="{A_CSS}">
<meta name="google-adsense-account" content="ca-pub-8412399730348585">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8412399730348585" crossorigin="anonymous"></script>
{f'<script type="application/ld+json">{ld}</script>' if ld else ''}
</head>
<body>
{f"""<div id="app" dir="rtl">{body}</div>
<div class="toast" id="toast" hidden></div>
<div class="modal" id="modal" hidden></div>
<script src="/site-config.js"></script>
<script src="{A_CHART}"></script>
<script src="{A_DATA}"></script>
<script src="{A_MEAN}"></script>
<script src="{A_APP}"></script>""" if app else body}
<script defer src="/_vercel/insights/script.js"></script>
</body>
</html>
'''


COLLS = [('boys', 'שמות לבנים'), ('girls', 'שמות לבנות'), ('unisex', 'שמות יוניסקס'), ('popular', 'השמות הנפוצים בישראל')]


def nav_links():
    return ('<p><a href="/">לדף הבית</a> · <a href="/names">כל השמות</a> · <a href="/about">אודות</a> · <a href="/privacy">מדיניות פרטיות</a> · <a href="/terms">תנאי שימוש</a> · <a href="/accessibility">הצהרת נגישות</a></p>'
            '<p>' + ' · '.join(f'<a href="/names/{k}">{v}</a>' for k, v in COLLS) + '</p>')


# ---- name pages ----
# title, description and FAQ texts: the app builds the same ones (nameMeta / nameFAQ in app/p0f_url.js), keep them in sync
GEM = dict(zip('אבגדהוזחטיכךלמםנןסעפףצץקרשת', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 20, 30, 40, 40, 50, 50, 60, 70, 80, 80, 90, 90, 100, 200, 300, 400]))
gem = lambda n: sum(GEM.get(c, 0) for c in n)
dot = lambda s: s if s[-1:] in '.!?' else s + '.'


def fit(parts, cap=155):
    """whole sentences while they fit in cap characters; a first sentence that is too long is cut at a word"""
    s = parts[0] if len(parts[0]) <= cap else parts[0][:cap - 1].rsplit(' ', 1)[0] + '…'
    for p in parts[1:]:
        if len(s) + 1 + len(p) > cap:
            break
        s += ' ' + p
    return s


def sex_answer(n, g):
    b = 100 - g
    if g >= 85: return f'{n} הוא שם של בנות: {g}% מהתינוקות שנקראו כך הם בנות.'
    if g <= 15: return f'{n} הוא שם של בנים: {b}% מהתינוקות שנקראו כך הם בנים.'
    if g >= 60: return f'{n} ניתן בעיקר לבנות: {g}% בנות ו-{b}% בנים.'
    if g <= 40: return f'{n} ניתן בעיקר לבנים: {b}% בנים ו-{g}% בנות.'
    return f'{n} הוא שם יוניסקס: {g}% בנות ו-{b}% בנים.'


def name_meta(x):
    n = x['n']
    peak = f'השם היה הכי נפוץ כבר בתחילת הרישום, ב-{Y0}.' if x['start'] else f'שנת השיא: {x["pk"]}, כשאחד מכל {fmt(x["oneIn"])} תינוקות נקרא כך.'
    rest = [f'{fmt(x["tot"])} תינוקות נקראו {n} בישראל מאז {Y0}.', peak, f'בנות {x["g"]}% · בנים {100 - x["g"]}%.', f'גימטריה: {gem(n)}.']
    if x['mean']:
        return f'משמעות השם {n} – מקור, פופולריות וגימטריה | השמות של ישראל', fit([f'משמעות השם {n}: {dot(x["mean"])}'] + rest)
    return f'השם {n} – פופולריות בישראל, סטטיסטיקה וגימטריה | השמות של ישראל', fit(rest)


def name_faq(x):
    n = x['n']
    q = [(f'מה המשמעות של השם {n}?', dot(x['mean']))] if x['mean'] else []
    last = ((f'ב-{Y1} נקראו כך {fmt(x["last"])} תינוקות' + (f', מקום {x["rk"]} {"בבנות" if x["x"] == 0 else "בבנים"}.' if x['rk'] else '.'))
            if x['last'] else f'ב-{Y1} השם לא ניתן, או שניתן לפחות מ-5 תינוקות.')
    q.append((f'כמה תינוקות נקראו {n} בישראל?', f'מאז {Y0} קיבלו את השם {n} {fmt(x["tot"])} תינוקות בישראל. {last}'))
    q.append((f'האם {n} הוא שם לבן או לבת?', sex_answer(n, x['g'])))
    q.append((f'מתי השם {n} היה הכי פופולרי?', f'השם היה הכי נפוץ כבר בתחילת הרישום, ב-{Y0}.' if x['start']
              else f'שנת השיא של השם הייתה {x["pk"]}, כשאחד מכל {fmt(x["oneIn"])} תינוקות נקרא {n}.'))
    q.append((f'מה הגימטריה של השם {n}?', f'הגימטריה של השם {n} היא {gem(n)}.'))
    return q


def sex_kind(g):
    return 'שם של בנות' if g >= 85 else 'שם של בנים' if g <= 15 else 'שם שניתן בעיקר לבנות' if g >= 60 else 'שם שניתן בעיקר לבנים' if g <= 40 else 'שם יוניסקס'


by_name = {x['n']: x for x in NAMES}
for x in NAMES:
    n = x['n']
    sexw = 'בנות' if x['x'] == 0 else 'בנים'
    title, desc = name_meta(x)
    faq = name_faq(x)
    url = f'{PH}/names/{enc(n)}'
    lead = (f'{n} הוא {sex_kind(x["g"])}. מאז {Y0} קיבלו את השם {fmt(x["tot"])} תינוקות בישראל, '
            + (f'והוא היה הכי נפוץ כבר בתחילת הרישום.' if x['start'] else f'ושנת השיא של השם הייתה {x["pk"]}.'))
    facts = [
        f"{fmt(x['tot'])} תינוקות נקראו {n} בישראל מאז {Y0}.",
        (f"השם היה הכי נפוץ כבר בתחילת הרישום, ב-{Y0}." if x['start'] else f"שנת השיא: {x['pk']}, כשאחד מכל {fmt(x['oneIn'])} תינוקות נקרא כך."),
        f"הכי הרבה תינוקות בשם הזה נולדו ב-{x['my']}: {fmt(x['myc'])}.",
        (f"ב-{Y1} נקראו כך {fmt(x['last'])} תינוקות" + (f", מקום {x['rk']} ב{sexw}." if x['rk'] else '.')) if x['last'] else f"ב-{Y1} כמעט לא ניתן השם.",
        f"שנת הלידה הטיפוסית: {x['med']}. הופעה ראשונה ברשימות: {x['first']}.",
        f"בנות {x['g']}% · בנים {100 - x['g']}%." + (f" מגזר: {x['sec']}." if x['sec'] else ''),
        f"גימטריה: {gem(n)}.",
    ]
    rel = ''.join(f'<li><a href="/names/{enc(r)}">{H.escape(r)}</a></li>' for r in x['rel'] if r in by_name)
    e = H.escape
    body = f'''<article class="seo">
<p class="k">השמות של ישראל · תיק שם</p>
<h1>{e(n)}</h1>
<p>{e(lead)}</p>
{f'<h2>משמעות השם {e(n)}</h2><p>{e(x["mean"])}</p>' if x['mean'] else ''}
{f'<p>{e(x["story"])}</p>' if x['story'] and x['story'] != x['mean'] else ''}
<h2>{e(n)} במספרים</h2>
<ul>{''.join(f'<li>{e(f)}</li>' for f in facts)}</ul>
<h2>שאלות נפוצות על השם {e(n)}</h2>
{''.join(f'<h3>{e(a)}</h3><p>{e(b)}</p>' for a, b in faq)}
{f'<h2>שמות מאותה תקופה</h2><ul class="rel">{rel}</ul>' if rel else ''}
{nav_links()}
<p class="k">מקור: נתוני הלשכה המרכזית לסטטיסטיקה, {Y0}–{Y1}. נוצר ע״י <a href="{LINKEDIN}">עידן דיוה</a>.</p>
</article>'''
    term = {"@type": "DefinedTerm", "@id": url + "#name", "name": n, "alternateName": x['en'], "inLanguage": "he",
            "inDefinedTermSet": {"@type": "DefinedTermSet", "name": "שמות פרטיים בישראל", "url": PH + "/names"}}
    if x['mean']:
        term["description"] = x['mean']
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": ["WebPage", "FAQPage"], "@id": url, "url": url, "name": title, "description": desc, "inLanguage": "he",
         "dateModified": "__MODIFIED__", "isPartOf": {"@id": PH + "/#website"}, "about": {"@id": url + "#name"},
         "author": {"@id": PH + "/#author"}, "isBasedOn": LD_DATA, "breadcrumb": {"@id": url + "#breadcrumb"},
         "mainEntity": [{"@type": "Question", "name": a, "acceptedAnswer": {"@type": "Answer", "text": b}} for a, b in faq]},
        term,
        {"@type": "BreadcrumbList", "@id": url + "#breadcrumb", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "השמות של ישראל", "item": PH + "/"},
            {"@type": "ListItem", "position": 2, "name": "כל השמות", "item": PH + "/names"},
            {"@type": "ListItem", "position": 3, "name": n}]},
        LD_SITE, LD_AUTHOR]}
    open(SRC + 'names/' + n + '.html', 'w').write(page(title, desc, '/names/' + enc(n), body, jsonld=ld))

# ---- all-names directory (crawl hub) ----
groups = {}
for x in sorted(NAMES, key=lambda x: -x['tot']):
    groups.setdefault(x['n'][0], []).append(x['n'])
az = ''.join(
    f'<h2 id="l{i}">{H.escape(k)}</h2><p class="az">' + ''.join(f'<a href="/names/{enc(n)}">{H.escape(n)}</a>' for n in groups[k]) + '</p>'
    for i, k in enumerate(sorted(groups)))
letters = '<p class="azjump">' + ''.join(f'<a href="#l{i}">{H.escape(k)}</a>' for i, k in enumerate(sorted(groups))) + '</p>'


# ---- static pages without the app (the app's router would take these URLs over) ----
def ic(paths):
    return f'<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">{paths}</svg>'


IC_BACK = '<path d="M9 6l6 6-6 6"/>'
IC_ARROW = '<path d="M15 6l-6 6 6 6"/>'
IC_USERS = '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.2a4.5 4.5 0 0 1 5 4.8"/>'


def coll_nav(cur):
    items = [('/names', 'כל השמות', cur == '')] + [(f'/names/{k}', v, k == cur) for k, v in COLLS]
    return '<nav class="docnav" aria-label="אוספי שמות">' + ''.join(
        '<a href="' + h + '"' + (' aria-current="page"' if on else '') + '>' + v + '</a>' for h, v, on in items) + '</nav>'


MATCH_CTA = (f'<a class="matchcta collcta" href="/#match"><span class="gl1">{ic(IC_USERS)}</span>'
             '<span><b>בוחרים שם ביחד</b><span>מחליקים שמות בנפרד – רואים רק מה ששניכם אהבתם</span></span>'
             f'<span class="go">להתחיל {ic(IC_ARROW)}</span></a>')


def static_shell(cur, inner):
    return f'''<div class="docin" dir="rtl">
<div class="doctop"><a class="docback" href="/">{ic(IC_BACK)}<span>לדף הבית</span></a><span class="docbrand">השמות של ישראל</span></div>
<article class="docbody">{inner}</article>
{MATCH_CTA}
{coll_nav(cur)}
<div class="docfoot">{nav_links()}<p>מקור: הלשכה המרכזית לסטטיסטיקה. נוצר ע״י <a href="https://www.linkedin.com/in/idan-diva/">עידן דיוה</a>.</p></div>
</div>'''


def coll_ld(path, title, desc, lists):
    """CollectionPage + one ItemList per list of names (lists: [(name, rows)])"""
    url = PH + path
    return {"@context": "https://schema.org", "@graph": [
        {"@type": "CollectionPage", "@id": url, "url": url, "name": title, "description": desc, "inLanguage": "he",
         "dateModified": "__MODIFIED__", "isPartOf": {"@id": PH + "/#website"}, "author": {"@id": PH + "/#author"}, "isBasedOn": LD_DATA,
         **({"mainEntity": [{"@type": "ItemList", "name": ln, "numberOfItems": len(rows), "itemListOrder": "https://schema.org/ItemListOrderDescending",
                             "itemListElement": [{"@type": "ListItem", "position": i, "name": x['n'], "url": f"{PH}/names/{enc(x['n'])}"}
                                                 for i, x in enumerate(rows, 1)]} for ln, rows in lists]} if lists else {})},
        LD_SITE, LD_AUTHOR]}


HUB_T = 'כל שמות התינוקות בישראל לפי א״ב | השמות של ישראל'
HUB_D = f'רשימת כל {fmt(len(NAMES))} השמות שניתנו לתינוקות בישראל מאז {Y0}, לפי אותיות, עם משמעות וסטטיסטיקה לכל שם.'
open(SRC + 'names/index.html', 'w').write(page(
    HUB_T, HUB_D,
    '/names', static_shell('', f'<h1>כל השמות</h1><p class="dlead">{fmt(len(NAMES))} שמות, מסודרים לפי אות ראשונה ולפי פופולריות.</p>{coll_nav("")}{letters}<div class="seo-az">{az}</div>'),
    jsonld=coll_ld('/names', HUB_T, HUB_D, []), app=False))


# ---- collection pages: /names/boys, /names/girls, /names/unisex, /names/popular ----
def short_mean(x):
    m = (x['mean'] or '').strip()
    return m.split('. ')[0].rstrip('.') if m else ''


def coll_list(rows, stat):
    """rows: name records in order; stat(x) -> the small figure shown beside the name."""
    return '<ol class="coll">' + ''.join(
        f'<li><a href="/names/{enc(x["n"])}"><span class="cr">{i}</span><b>{H.escape(x["n"])}</b><span class="cn">{stat(x)}</span></a>'
        + (f'<span class="cm">{H.escape(short_mean(x))}</span>' if short_mean(x) else '') + '</li>'
        for i, x in enumerate(rows, 1)) + '</ol>'


boys = sorted([x for x in NAMES if x['x'] == 1 and x['last']], key=lambda x: -x['last'])[:100]
girls = sorted([x for x in NAMES if x['x'] == 0 and x['last']], key=lambda x: -x['last'])[:100]
unisex = sorted([x for x in NAMES if 20 <= x['g'] <= 80 and x['tot'] >= 300], key=lambda x: (-x['last'], -x['tot']))[:100]
top_now = sorted([x for x in NAMES if x['last']], key=lambda x: -x['last'])[:50]
top_ever = sorted(NAMES, key=lambda x: -x['tot'])[:50]
born = lambda x: f'{fmt(x["last"])} תינוקות'
split = lambda x: f'{x["g"]}% בנות · {100 - x["g"]}% בנים'
mark = lambda x: f'<span class="sx sx{x["x"]}">{"בן" if x["x"] else "בת"}</span>'

COLL_PAGES = {
    'boys': ('שמות לבנים', f'שמות לבנים – 100 השמות הנפוצים בישראל ב-{Y1}',
             f'רשימת 100 שמות הבנים הנפוצים בישראל ב-{Y1} לפי הלמ״ס, עם מספר התינוקות, משמעות כל שם וקישור לתיק השם המלא.',
             f'<p class="dlead">מחפשים שם לבן? אלה 100 השמות שניתנו הכי הרבה לבנים בישראל ב-{Y1}, לפי נתוני הלשכה המרכזית לסטטיסטיקה. '
             'לכל שם יש תיק מלא עם משמעות, מקור ופופולריות לאורך השנים.</p>',
             f'<h2>100 שמות הבנים המובילים ב-{Y1}</h2>' + coll_list(boys, born)),
    'girls': ('שמות לבנות', f'שמות לבנות – 100 השמות הנפוצים בישראל ב-{Y1}',
              f'רשימת 100 שמות הבנות הנפוצים בישראל ב-{Y1} לפי הלמ״ס, עם מספר התינוקות, משמעות כל שם וקישור לתיק השם המלא.',
              f'<p class="dlead">מחפשים שם לבת? אלה 100 השמות שניתנו הכי הרבה לבנות בישראל ב-{Y1}, לפי נתוני הלשכה המרכזית לסטטיסטיקה. '
              'לכל שם יש תיק מלא עם משמעות, מקור ופופולריות לאורך השנים.</p>',
              f'<h2>100 שמות הבנות המובילים ב-{Y1}</h2>' + coll_list(girls, born)),
    'unisex': ('שמות יוניסקס', 'שמות יוניסקס – שמות שמתאימים לבנים ולבנות',
               f'{len(unisex)} שמות יוניסקס ישראליים שניתנים גם לבנים וגם לבנות, עם החלוקה המדויקת בין בנות לבנים לפי נתוני הלמ״ס.',
               '<p class="dlead">שמות יוניסקס הם שמות שניתנים בישראל גם לבנות וגם לבנים. '
               f'ברשימה {len(unisex)} שמות שבין 20% ל-80% מהתינוקות שנקראו בהם הם בנות, מסודרים לפי הפופולריות שלהם ב-{Y1}, '
               'עם החלוקה המדויקת לפי נתוני הלמ״ס.</p>',
               '<h2>שמות לבנים ולבנות</h2>' + coll_list(unisex, split)),
    'popular': ('השמות הנפוצים בישראל', f'השמות הנפוצים בישראל – המובילים ב-{Y1} ובכל הזמנים',
                f'השמות הנפוצים ביותר בישראל לפי הלמ״ס: 50 השמות המובילים ב-{Y1} ו-50 השמות שניתנו הכי הרבה מאז {Y0}.',
                f'<p class="dlead">אילו שמות הכי נפוצים בישראל? כאן שתי רשימות לפי נתוני הלשכה המרכזית לסטטיסטיקה: '
                f'השמות שניתנו הכי הרבה ב-{Y1}, בבנים ובבנות יחד, והשמות שניתנו הכי הרבה מאז {Y0}.</p>',
                f'<h2>50 השמות המובילים ב-{Y1}</h2>' + coll_list(top_now, lambda x: mark(x) + born(x))
                + f'<h2>50 השמות הנפוצים מאז {Y0}</h2>' + coll_list(top_ever, lambda x: mark(x) + f'{fmt(x["tot"])} תינוקות')),
}
COLL_ROWS = {'boys': [(f'100 שמות הבנים המובילים ב-{Y1}', boys)], 'girls': [(f'100 שמות הבנות המובילים ב-{Y1}', girls)],
             'unisex': [('שמות לבנים ולבנות', unisex)],
             'popular': [(f'50 השמות המובילים ב-{Y1}', top_now), (f'50 השמות הנפוצים מאז {Y0}', top_ever)]}
for k, (name, h1, desc, lead, lists) in COLL_PAGES.items():
    path = '/names/' + k
    title = h1 + ' | השמות של ישראל'
    open(SRC + f'names/{k}.html', 'w').write(page(
        title, desc, path, static_shell(k, f'<p class="k">השמות של ישראל · אוספי שמות</p><h1>{name}</h1>{lead}{lists}'),
        jsonld=coll_ld(path, title, desc, COLL_ROWS[k]), app=False))

# ---- home + 404 ----
top = [x['n'] for x in sorted(NAMES, key=lambda x: -x['last'])[:40]]
home_body = f'''<article class="seo"><h1>השמות של ישראל</h1><p>{H.escape(SITE_D)}</p>
<h2>השמות הפופולריים ב-{Y1}</h2><ul class="rel">{''.join(f'<li><a href="/names/{enc(n)}">{H.escape(n)}</a></li>' for n in top)}</ul>
<p><a href="/names">לכל {fmt(len(NAMES))} השמות</a></p></article>'''
open(SRC + 'index.html', 'w').write(page(SITE_T, SITE_D, '/', home_body,
    jsonld={"@context": "https://schema.org", "@graph": [LD_SITE, LD_AUTHOR]}))
# ---- info pages (same content the app shows at /about, /privacy, /terms) ----
PAGES = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data', 'pages.json'), encoding='utf-8'))
for k, P in PAGES.items():
    body_html = P['html'].replace('<div class="dwipe" data-wipe></div>', '')
    open(SRC + k + '.html', 'w').write(page(P['title'] + ' | השמות של ישראל', P['desc'], '/' + k,
        '<article class="seo"><p class="k">השמות של ישראל</p><h1>' + H.escape(P['title']) + '</h1>' + body_html + nav_links() + '</article>'))
open(SRC + '404.html', 'w').write(page('הדף לא נמצא | השמות של ישראל', SITE_D, '/', '<article class="seo"><h1>הדף לא נמצא</h1>' + nav_links() + '</article>', noindex=True))

# list of indexable paths for the sitemap (finalize.mjs adds the base URL)
paths = ['/', '/names'] + [f'/names/{k}' for k, _ in COLLS] + ['/about', '/privacy', '/terms', '/accessibility'] + ['/names/' + enc(x['n']) for x in sorted(NAMES, key=lambda x: -x['tot'])]
json.dump(paths, open(OUT + 'scripts/paths.json', 'w'), ensure_ascii=False)
# one page per line, so a rebuild's git diff shows exactly which pages changed
with open(LASTMOD_F, 'w', encoding='utf-8') as f:
    f.write('{\n' + ',\n'.join(f'{json.dumps(p, ensure_ascii=False)}:{json.dumps(LASTMOD[p])}'
                         for p in map(__import__('urllib.parse').parse.unquote, paths)) + '\n}\n')
# runtime config as an external file (filled by finalize.mjs) so the CSP needs no inline scripts
open(SRC + 'site-config.js', 'w').write('window.SITE_CONFIG={baseUrl:"__RUNTIME_BASE_URL__",routing:"path",supabase:{url:"__SUPABASE_URL__",key:"__SUPABASE_KEY__",lib:"' + A_SB + '"}};\n')
print('pages', len(NAMES) + 3, 'assets', A_APP, A_DATA)
