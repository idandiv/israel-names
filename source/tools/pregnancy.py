"""The pregnancy pages, built by build_site.py (static pages without the app):
  /pregnancy/calculator   the calculator
  /pregnancy/week-<n>     one page per week, 4 to 42 ("week 12" is 12+0 to 12+6, as in the calculator)
  /pregnancy              the hub: the calculator and every week, by trimester, and when babies are born in Israel
  /pregnancy/fetal-weight the weight and length of every week in one table, and birth weights in Israel
  /pregnancy/brit-mila    when the brit mila and the pidyon haben fall
Every page shows its breadcrumbs (nav.crumbs), built from the same trail as its BreadcrumbList.

Sources:
  data/pregnancy.json   weeks 4-42 (size comparison, length in cm, weight in g from week 8, one sentence on the baby),
                        the three trimesters (weeks and a paragraph), names for each Hebrew month (with the reason), FAQ, sources and the date the content was reviewed,
                        and the checkups (the Ministry of Health's schedule: weeks from-to, what each one is, its own source and review date),
                        the four stages of the names journey (stages), and births in Israel (israel: the Ministry of Health's report)
  app/pregnancy.mjs     the calculator (date math, the result card, the checkups with personal dates) and "your week" on the week pages
                        and the hub; one hashed module for every pregnancy page. Its size drawings (ART) are read with node at build,
                        so the week pages show them without JS
The page works without JS for reading: how the date is calculated (with an example computed here by the same rules as
the calculator), the trimesters, every week, and the names by month. The calculator reads the weeks and the month
names from a JSON data block in the page. Every month name must be in the data, or the build stops.
"""
import json, os, re, datetime, subprocess, html as H
from urllib.parse import urlparse

S = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..') + '/'
PATH = '/pregnancy/calculator'
HUB, HUB_NAME = '/pregnancy', 'הריון שבוע אחרי שבוע'
week_url = lambda w: f'/pregnancy/week-{w}'
BRIT, BRIT_NAME = '/pregnancy/brit-mila', 'מחשבון ברית מילה ופדיון הבן'
BRIT_H1 = 'חישוב תאריך ברית מילה ופדיון הבן'
FETAL, FETAL_NAME = '/pregnancy/fetal-weight', 'משקל העובר לפי שבועות'
# the cities of the sunset in the brit calculator: the keys of CITIES in app/pregnancy.mjs (tests/pregnancy-journey.test.mjs)
BRIT_CITIES = [('jerusalem', 'ירושלים'), ('tel-aviv', 'תל אביב'), ('haifa', 'חיפה'), ('beer-sheva', 'באר שבע'), ('tiberias', 'טבריה'), ('eilat', 'אילת')]
SA = "https://www.sefaria.org/Shulchan_Arukh%2C_Yoreh_De'ah."   # + siman.seif
# "12+3" inside Hebrew text: isolated left to right, or a neighbouring "מ-" shows it as "3+12"
ltr = lambda s: re.sub(r'\d+\+\d+', lambda m: f'<bdi dir="ltr">{m.group(0)}</bdi>', s)
in_tri = lambda name: 'ב' + name[1:]  # "השליש הראשון" -> "בשליש הראשון"
TITLE = 'מחשבון הריון – חישוב שבוע הריון ותאריך לידה משוער'
DESC = ('מחשבון הריון: הזינו את היום הראשון של הווסת האחרונה, את תאריך ההפריה או את החזרת העובר ב-IVF, '
        'וקבלו את שבוע ההריון, השליש ותאריך הלידה המשוער, בלועזי ובעברי.')
MONTHS = ['תשרי', 'חשוון', 'כסלו', 'טבת', 'שבט', 'אדר', 'ניסן', 'אייר', 'סיוון', 'תמוז', 'אב', 'אלול']
TRUSTED = ('gov.il', 'nhs.uk', 'acog.org')
dmy = lambda iso: '.'.join(str(int(p)) for p in reversed(iso.split('-')))  # 2026-10-30 -> 30.10.2026
EARLY = ('בשבועות הראשונים עוד אין מה לראות בבדיקה. ההריון נספר מהיום הראשון של הווסת האחרונה, '
         'וההפריה מתרחשת בדרך כלל כשבועיים אחריו, בשבוע השני או השלישי.')


def load():
    return check(json.load(open(S + 'data/pregnancy.json', encoding='utf-8')))


def check(P):
    """stops the build (AssertionError) when pregnancy.json is incomplete or out of order; returns P"""
    assert sorted(map(int, P['weeks'])) == list(range(4, 43)), 'pregnancy.json: weeks must be 4 to 42'
    for w, x in P['weeks'].items():
        assert x.get('size') and x.get('cm') and x.get('baby'), f'pregnancy.json: week {w} misses size, cm or baby'
        # the drawing of the size (a key of ART in app/pregnancy.mjs; tests/pregnancy-hero.test.mjs checks it exists)
        assert re.fullmatch(r'[a-z]+', x.get('art') or ''), f'pregnancy.json: week {w} needs art (a drawing key)'
        # the names of the week: a name for a girl and a name for a boy (checked against the data in build)
        assert len(x.get('names') or []) == 2, f'pregnancy.json: week {w} needs names: [a girl, a boy]'
    week_names = [n for x in P['weeks'].values() for n in x['names']]
    assert len(set(week_names)) == len(week_names), 'pregnancy.json: a name in two weeks'
    # weight from week 8, growing every week
    g = [P['weeks'][str(w)].get('g') for w in range(GROW_FROM, 43)]
    assert all(g) and g == sorted(g) and not any(P['weeks'][str(w)].get('g') for w in range(4, GROW_FROM)), \
        f'pregnancy.json: g (grams) for every week from {GROW_FROM}, never going down'
    assert [m['month'] for m in P['months']] == MONTHS, 'pregnancy.json: the 12 Hebrew months, from תשרי'
    # the holidays (also for the names journey): a unique id, a date in the year's order from תשרי, a note and names
    ids = [x['id'] for x in P['holidays']]
    assert len(set(ids)) == len(ids), 'pregnancy.json: a holiday id twice'
    for x in P['holidays']:
        assert re.fullmatch(r'[a-z]+(-[a-z]+)*', x['id']) and x.get('name') and x.get('note') and x.get('names'), f'pregnancy.json: holiday {x.get("id")} misses a field'
        assert x['month'] in MONTHS and 1 <= x['day'] <= 30 and 1 <= x['len'] <= 8, f'pregnancy.json: holiday {x["id"]}: month, day or len'
        assert len(set(x['names'])) == len(x['names']), f'pregnancy.json: a name twice in holiday {x["id"]}'
    when = [(MONTHS.index(x['month']), x['day']) for x in P['holidays']]
    assert when == sorted(when), 'pregnancy.json: holidays in the order of the year, from תשרי'
    assert [w for t in P['trimesters'] for w in range(t['weeks'][0], t['weeks'][1] + 1)] == list(range(1, 43)), \
        'pregnancy.json: the trimesters must cover weeks 1 to 42 in order'
    ids = [x['id'] for x in P['checkups']]
    assert len(set(ids)) == len(ids), 'pregnancy.json: a checkup id twice'
    for x in P['checkups']:
        assert all(x.get(k) for k in ('id', 'name', 'when', 'what', 'kind')), f'pregnancy.json: checkup {x.get("id")} misses a field'
        assert 4 <= x['from'] <= x['to'] <= 42, f'pregnancy.json: checkup {x["id"]} weeks must be 4 to 42, from <= to'
    assert [x['from'] for x in P['checkups']] == sorted(x['from'] for x in P['checkups']), 'pregnancy.json: checkups in order of their first week'
    assert urlparse(P['checkups_source'][1]).hostname.endswith(TRUSTED), 'pregnancy.json: the checkups source must be gov.il, nhs.uk or acog.org'
    assert re.fullmatch(r'\d{4}-\d{2}-\d{2}', P['checkups_reviewed']), 'pregnancy.json: checkups_reviewed is YYYY-MM-DD'
    # the names journey: four stages by week, the same weeks as journeyStage in app/pregnancy.mjs
    assert [(x['id'], x['until']) for x in P['stages']] == STAGES, f'pregnancy.json: stages must be {STAGES}'
    for x in P['stages']:
        assert x.get('step') and x.get('title') and x.get('text') and len(x.get('links') or []) == 3, f'pregnancy.json: stage {x["id"]} misses a field'
    # births in Israel (the Ministry of Health): the groups add up to 100% (rounded), the source is gov.il
    I = P['israel']
    h = urlparse(I['source'][1]).hostname or ''
    assert h == 'gov.il' or h.endswith('.gov.il'), 'pregnancy.json: israel.source must be gov.il'
    for k in ('ga', 'bw'):
        assert 99 <= sum(p for _, p in I[k]['groups']) <= 100.5, f'pregnancy.json: israel.{k}.groups must add up to 100%'
    assert I['bw']['low'] == I['bw']['groups'][0][1], 'pregnancy.json: israel.bw.low is the first group'
    return P


STAGES = [('dream', 13), ('sex', 22), ('narrow', 33), ('decide', 42)]
stage_of = lambda P, w: next(x for x in P['stages'] if w <= x['until'])
# the month of the pregnancy by week, the common split (by trimester: 1-3, 4-6, 7-9); sources differ by a week or so
MONTH_WEEKS = [(1, 4), (5, 8), (9, 13), (14, 17), (18, 22), (23, 27), (28, 31), (32, 35), (36, 40)]
ORD = ['הראשון', 'השני', 'השלישי', 'הרביעי', 'החמישי', 'השישי', 'השביעי', 'השמיני', 'התשיעי']
month_of = lambda w: next((i for i, (a, b) in enumerate(MONTH_WEEKS) if a <= w <= b), None)


def crumbs(PH, trail):
    """the breadcrumbs as shown (nav.crumbs, the style of the main collections) and as a BreadcrumbList, from one trail:
    [(name, path)], the current page last with path None. Returns (html, ld node without @id)"""
    html = ('<nav class="crumbs" aria-label="ניווט באתר">' + ' › '.join(
        f'<a href="{p}">{H.escape(n)}</a>' if p else f'<span aria-current="page">{H.escape(n)}</span>' for n, p in trail) + '</nav>')
    return html, {"@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i, "name": n, **({"item": PH + p} if p else {})} for i, (n, p) in enumerate(trail, 1)]}


def art_svgs():
    """the size drawings (ART in app/pregnancy.mjs, one source for the calculator and the week pages), read with node"""
    js = "import { ART } from './app/pregnancy.mjs'; process.stdout.write(JSON.stringify(ART));"
    out = subprocess.run(['node', '--input-type=module', '-e', js], cwd=S, capture_output=True, text=True, check=True)
    return json.loads(out.stdout)


GROW_FROM = 8   # the first week with a weight


MEASURE_FROM = 20   # the length: crown to rump to week 19, crown to heel from week 20 (the line breaks there)


def growth_svg(W, cur=None, key='g'):
    """the average weight (key 'g', kg) or length (key 'cm') by week (weeks GROW_FROM-42) as an inline SVG line chart;
    cur: the week to mark. The length jumps at MEASURE_FROM because it starts to be measured to the heel, not because the
    baby grew: its line stops at week 19 and starts again at 20, with a note, never one line across"""
    x0, x1, y0, y1 = 40, 312, 158, 18
    top, step, unit, lab = (4000, 1000, 'ק״ג', lambda k: k // 1000) if key == 'g' else (60, 10, 'ס״מ', lambda k: k)
    X = lambda w: x0 + (w - GROW_FROM) / (42 - GROW_FROM) * (x1 - x0)
    Y = lambda v: y0 - v / top * (y0 - y1)
    parts = [range(GROW_FROM, 43)] if key == 'g' else [range(GROW_FROM, MEASURE_FROM), range(MEASURE_FROM, 43)]
    lines = [' '.join(f'{X(w):.1f},{Y(W[w][key]):.1f}' for w in r) for r in parts]
    grid = ''.join(f'<line class="pg-grid" x1="{x0}" x2="{x1}" y1="{Y(k):.1f}" y2="{Y(k):.1f}"/>'
                   f'<text class="pg-t" x="{x0 - 6}" y="{Y(k) + 3.5:.1f}" text-anchor="end">{lab(k)}</text>' for k in range(0, top + 1, step))
    grid += f'<text class="pg-t" x="{x0}" y="{y1 - 6}" text-anchor="start">{unit}</text><text class="pg-t" x="{x0 - 6}" y="{y0 + 18}" text-anchor="end">שבוע</text>'
    ticks = ''.join(f'<text class="pg-t" x="{X(w):.1f}" y="{y0 + 18}" text-anchor="middle">{w}</text>' for w in (8, 14, 20, 28, 34, 40))
    tri = ''.join(f'<line class="pg-tri" x1="{X(w):.1f}" x2="{X(w):.1f}" y1="{y1}" y2="{y0}"/>' for w in (14, 28))
    area = ''.join(f'<path class="pg-area" d="M{X(r[0]):.1f},{y0} L{ln} L{X(r[-1]):.1f},{y0} Z"/>' for r, ln in zip(parts, lines))
    path = ''.join(f'<polyline class="pg-line" points="{ln}"/>' for ln in lines)
    note = ''
    if key == 'cm':   # under the start of the new line: the measurement changed here
        note = f'<text class="pg-t pg-note" x="{X(MEASURE_FROM) + 12:.1f}" y="{Y(W[MEASURE_FROM]["cm"]) + 22:.1f}" text-anchor="start">מהראש עד העקב</text>'
    mark = ''
    if cur is not None and cur >= GROW_FROM:
        x, y = X(cur), Y(W[cur][key])
        mark = (f'<line class="pg-now" x1="{x:.1f}" x2="{x:.1f}" y1="{y:.1f}" y2="{y0}"/><circle class="pg-halo" cx="{x:.1f}" cy="{y:.1f}" r="9"/>'
                f'<circle class="pg-dot" cx="{x:.1f}" cy="{y:.1f}" r="5"/>')
    # direction, not dir: dir does not reach SVG text, and in the page's RTL text-anchor="end" means the left edge of the text
    return (f'<svg viewBox="0 0 320 180" role="img" aria-hidden="true" direction="ltr">{grid}{tri}'
            f'{area}{path}{note}{ticks}{mark}</svg>')


def growth(W, cur=None):
    """the weight and the length charts, each in a figure with a caption that says the same in words (the SVGs are
    hidden from screen readers)"""
    if cur is None:
        cg = f'משקל משוער של העובר לפי שבוע ההריון: כ-{W[20]["g"]:,} גרם בשבוע 20, כ-{W[28]["g"]:,} גרם בשבוע 28 וכ-{W[40]["g"]:,} גרם בשבוע 40.'
        cl = f'אורך משוער: כ-{W[12]["cm"]} ס״מ בשבוע 12, כ-{W[28]["cm"]} ס״מ בשבוע 28 וכ-{W[40]["cm"]} ס״מ בשבוע 40.'
    elif cur >= GROW_FROM:
        cg = f'משקל משוער לפי שבוע ההריון. בשבוע {cur}: כ-{W[cur]["g"]:,} גרם. בשבוע 40: כ-{W[40]["g"]:,} גרם.'
        cl = f'אורך משוער. בשבוע {cur}: כ-{W[cur]["cm"]} ס״מ. בשבוע 40: כ-{W[40]["cm"]} ס״מ.'
    else:
        cg = f'משקל משוער לפי שבוע ההריון. בשבוע {cur} העובר שוקל עוד פחות מגרם, ולכן הגרף מתחיל בשבוע {GROW_FROM}.'
        cl = f'אורך משוער. בשבוע {cur}: כ-{W[cur]["cm"]} ס״מ, ולכן גם הגרף הזה מתחיל בשבוע {GROW_FROM}.'
    cl += f' עד שבוע {MEASURE_FROM - 1} מודדים מהראש עד העכוז, ומשבוע {MEASURE_FROM} מהראש עד העקב, ולכן הקו נקטע: זו מדידה אחרת, לא קפיצה בגדילה.'
    fig = lambda svg, cap, h: f'<figure class="pgrow"><figcaption class="pg-h">{h}</figcaption>{svg}<p class="pg-cap">{cap} ממוצעים משוערים, וכל עובר שונה.</p></figure>'
    return (f'<div class="pgrows">{fig(growth_svg(W, cur), cg, "משקל")}'
            f'{fig(growth_svg(W, cur, "cm"), cl, "אורך")}</div>')


def checks_table(items, src, reviewed):
    """the checkups as a table (name and coverage, when, what), with the source and the review date under it"""
    e = H.escape
    return ('<table class="gtbl pchks"><thead><tr><th>בדיקה</th><th>מתי</th><th>מה זה</th></tr></thead><tbody>'
            + ''.join(f'<tr><td><b>{e(x["name"])}</b><span class="cn">{e(x["kind"])}</span></td><td>{e(x["when"])}</td><td><span class="cm">{e(x["what"])}</span></td></tr>' for x in items)
            + f'</tbody></table><p class="k">לוח כללי לפי <a href="{e(src[1])}" target="_blank" rel="noopener">{e(src[0].split(":")[0])}</a>. '
            f'המועדים והבדיקות נקבעים מול הרופא או הרופאה והקופה. נבדק לאחרונה: {dmy(reviewed)}.</p>')


def build(c):
    """c: page, static_shell, hashed, by_name, ny, short_mean, fmt, Y1, enc, fit, SRC, PH, LD_SITE, LD_ORG. Writes src/pregnancy/;
    returns (paths for the sitemap, [(name, path, description)] for llms.txt)."""
    P = load()
    e, enc, PH = H.escape, c['enc'], c['PH']
    for m in P['months']:
        for n in m['names']:
            assert n in c['by_name'], f'pregnancy.json: {n} ({m["month"]}) is not in the data'
        assert len(set(m['names'])) == len(m['names']), f'pregnancy.json: a name twice in {m["month"]}'
    for x in P['holidays']:
        for n in x['names']:
            assert n in c['by_name'], f'pregnancy.json: {n} ({x["name"]}) is not in the data'
    # the names of the week: in the data, with a meaning, and given in Y1 to at least 20 babies of that sex, most of them of that sex
    for w, x in P['weeks'].items():
        for s, n in enumerate(x['names']):
            r = c['by_name'].get(n)
            assert r and c['short_mean'](r), f'pregnancy.json: week {w}: {n} is not in the data or has no meaning'
            assert c['ny'](r, s) >= 20 and c['ny'](r, s) > c['ny'](r, 1 - s), f'pregnancy.json: week {w}: {n} is not a name for a {"girl" if s == 0 else "boy"}'
    js = c['hashed']('pregnancy', 'js', open(S + 'app/pregnancy.mjs', encoding='utf-8').read())
    data = {'weeks': P['weeks'], 'early': EARLY, 'checkups': [{k: x[k] for k in ('id', 'name', 'from', 'to', 'what')} for x in P['checkups']],
            'months': {m['month']: {'note': m['note'], 'names': [[n, f'/names/{enc(n)}'] for n in m['names']]} for m in P['months']},
            'holidays': [{**{k: x[k] for k in ('id', 'name', 'month', 'day', 'len')}, 'names': [[n, f'/names/{enc(n)}'] for n in x['names']]}
                         for x in P['holidays']],
            'stages': {x['id']: [x['step'], x['title'], x['text'], x['links']] for x in P['stages']},
            'israel': {'year': P['israel']['year'], 'groups': P['israel']['ga']['groups'], 'median': P['israel']['ga']['median']}}
    # inside <script type="application/json">: only "</" could end the block early
    data_json = json.dumps(data, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')

    # the worked example in "how it is calculated", by the calculator's rules
    d0 = datetime.date(2026, 1, 1)
    ex = lambda days: (d0 + datetime.timedelta(days=days))
    he_date = lambda d: f'{d.day} ב{["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"][d.month - 1]} {d.year}'

    radio = lambda v, label, on=False: (f'<label class="pm"><input type="radio" name="method" value="{v}"{" checked" if on else ""}>'
                                       f'<span>{label}</span></label>')
    form = f'''<form id="pform" class="pform" novalidate>
<fieldset class="pmethods"><legend>לפי מה לחשב?</legend>
{radio('lmp', 'וסת אחרונה', True)}{radio('conception', 'תאריך הפריה')}{radio('ivf', 'החזרת עובר (IVF)')}</fieldset>
<label class="pfield"><span data-for="lmp">היום הראשון של הווסת האחרונה</span><span data-for="conception" hidden>תאריך ההפריה</span><span data-for="ivf" hidden>תאריך החזרת העובר</span>
<input type="date" name="date" required></label>
<label class="pfield" data-for="lmp"><span>אורך המחזור</span><select name="cycle">{''.join(f'<option value="{n}"{" selected" if n == 28 else ""}>{n} ימים</option>' for n in range(21, 46))}</select></label>
<label class="pfield" data-for="ivf" hidden><span>גיל העובר בהחזרה</span><select name="embryo"><option value="5" selected>5 ימים (בלסטוציסט)</option><option value="3">3 ימים</option></select></label>
<button type="submit" class="pgo">חישוב</button>
<p id="perr" class="perr" role="alert" hidden></p>
</form>
<noscript><p class="perr">המחשבון צריך JavaScript. אפשר לחשב גם לבד: מוסיפים 280 ימים ליום הראשון של הווסת האחרונה.</p></noscript>
<div id="pres" class="pres" aria-live="polite" hidden></div>'''

    weeks = '<ol class="pweeks">' + ''.join(
        f'<li><a href="{week_url(w)}"><b>שבוע {w}</b></a> <span>בגודל של {e(x["size"])} · כ-{x["cm"]} ס״מ' + (f' · כ-{x["g"]:,} גרם' if x.get('g') else '') + f'</span><p>{e(x["baby"])}</p></li>'
        for w, x in sorted(P['weeks'].items(), key=lambda t: int(t[0]))) + '</ol>'
    months = ''.join(
        f'<h3>{m["month"]}</h3><p class="k">{e(m["note"])}</p><p class="cgc">'
        + ''.join(f'<a href="/names/{enc(n)}">{e(n)}</a>' for n in m['names']) + '</p>' for m in P['months'])
    faq = P['faq']
    reviewed = dmy(P['reviewed'])
    nav, crumbs_ld = crumbs(PH, [('השמות של ישראל', '/'), (HUB_NAME, HUB), ('מחשבון הריון', None)])
    inner = f'''{nav}<h1>מחשבון הריון</h1>
<p class="dlead">באיזה שבוע אתם, באיזה שליש, ומתי התאריך המשוער? בחרו לפי מה לחשב והזינו תאריך. התאריך נשמר רק במכשיר שלכם.</p>
{form}
<h2 id="how">איך מחושב תאריך הלידה המשוער?</h2>
<p>התאריך המשוער הוא 280 ימים (40 שבועות) אחרי היום הראשון של הווסת האחרונה. למשל, אם הווסת האחרונה התחילה ב-{he_date(d0)}, התאריך המשוער הוא {he_date(ex(280))}.</p>
<p>החישוב מניח מחזור של 28 ימים. כשהמחזור ארוך או קצר יותר, ההפריה מתרחשת בדרך כלל מאוחר או מוקדם יותר, ולכן מזיזים את התאריך בהפרש: במחזור של 32 ימים התאריך באותה דוגמה הוא {he_date(ex(284))}.</p>
<p>כשיודעים את תאריך ההפריה מוסיפים לו 266 ימים. בהחזרת עובר ב-IVF מוסיפים 266 ימים פחות גיל העובר: 261 ימים לעובר בן 5 ימים, ו-263 לעובר בן 3 ימים.</p>
<p>שבוע ההריון נספר מהווסת האחרונה. ״12+3״ פירושו 12 שבועות שלמים ו-3 ימים, כלומר השבוע ה-13 של ההריון.</p>
<h2 id="trimesters">שלושת השלישים</h2>
<ul><li><b>השליש הראשון:</b> מתחילת ההריון ועד סוף שבוע 13 (13+6).</li><li><b>השליש השני:</b> משבוע 14 ועד סוף שבוע 27.</li><li><b>השליש השלישי:</b> משבוע 28 ועד הלידה. הריון נחשב במועד משבוע 37, ובמועד מלא משבוע 39.</li></ul>
<h2 id="weeks">ההריון שבוע אחרי שבוע</h2>
<p>הגודל והמשקל הם ממוצעים משוערים, וכל עובר שונה. עד שבוע 19 האורך נמדד מהראש עד העכוז, ומשבוע 20 מהראש עד העקב.</p>
<details class="pdetails"><summary>כל השבועות, 4 עד 42</summary>{weeks}</details>
<h2 id="months">שמות לפי חודש הלידה</h2>
<p>המחשבון מראה גם את התאריך העברי, ולצידו שמות שקשורים לחודש: לחג שבו, לעונה או לסיפור שלו. כל השמות כאן ניתנו בישראל, ולכל אחד יש תיק עם הפירוש והפופולריות.</p>
{months}
<h2 id="checkups">לוח הבדיקות בהריון</h2>
<p>הבדיקות שמשרד הבריאות ממליץ עליהן, לפי שבועות. אחרי החישוב המחשבון מראה לכל בדיקה את התאריכים שלכם, ואפשר לסמן מה כבר עשיתם.</p>
{checks_table(P['checkups'], P['checkups_source'], P['checkups_reviewed'])}
<h2 id="faq">שאלות נפוצות</h2>
{''.join(f'<h3>{e(q)}</h3><p>{e(a)}</p>' for q, a in faq)}
<h2 id="sources">מקורות</h2>
<p>המידע כללי ואינו תחליף לייעוץ רפואי. בכל שאלה על ההריון פנו לרופא או לאחות המטפלים, ובמצב חירום למד״א (101). נבדק לאחרונה: {reviewed}. ראו גם <a href="/terms">תנאי השימוש</a>.</p>
<ul>{''.join(f'<li><a href="{e(u)}" target="_blank" rel="noopener" dir="ltr">{e(t)}</a></li>' for t, u in P['sources'])}</ul>
<script type="application/json" id="pdata">{data_json}</script>
<script type="module" src="{js}"></script>'''

    url, title = PH + PATH, TITLE + ' | השמות של ישראל'
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "WebPage", "@id": url, "url": url, "name": title, "description": DESC, "inLanguage": "he",
         "dateModified": "__MODIFIED__", "lastReviewed": P['reviewed'], "isPartOf": {"@id": PH + "/#website"},
         "breadcrumb": {"@id": url + "#breadcrumb"}, "mainEntity": {"@id": url + "#app"}},
        {"@type": "WebApplication", "@id": url + "#app", "name": "מחשבון הריון", "url": url, "description": DESC, "inLanguage": "he",
         "applicationCategory": "HealthApplication", "operatingSystem": "Any", "isAccessibleForFree": True,
         "offers": {"@type": "Offer", "price": "0", "priceCurrency": "ILS"}, "publisher": {"@id": PH + "/#organization"}},
        {"@type": "FAQPage", "@id": url + "#faq", "isPartOf": {"@id": url}, "inLanguage": "he",
         "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq]},
        {**crumbs_ld, "@id": url + "#breadcrumb"}, c['LD_SITE'], c['LD_ORG']]}
    os.makedirs(c['SRC'] + 'pregnancy', exist_ok=True)
    text, data_block = inner.split('<script type="application/json"', 1)
    inner = ltr(text) + '<script type="application/json"' + data_block
    open(c['SRC'] + 'pregnancy/calculator.html', 'w').write(c['page'](title, DESC, PATH, c['static_shell']('pregnancy', inner), jsonld=ld, app=False))
    week_paths = build_weeks(c, P, reviewed, js, art_svgs())
    build_fetal(c, P, reviewed)
    build_brit(c, P, js)
    return [HUB, PATH, FETAL, BRIT] + week_paths, [
        (FETAL_NAME, FETAL, 'משקל ואורך משוערים של העובר בכל שבוע, 8 עד 42, בטבלה ובגרף, ומשקל הלידה וגיל ההריון בלידה בישראל לפי משרד הבריאות.'),
        (BRIT_H1, BRIT, 'מתי הברית ומתי פדיון הבן לפי תאריך הלידה, עם תאריך עברי ויום בשבוע, כולל לידה סמוך לשקיעה, ניתוח קיסרי, שבת או חג, בכור, כהן או לוי.'),
        (HUB_NAME, HUB, 'כל שבועות ההריון, 4 עד 42, לפי שליש: גודל העובר, אורך ומשקל משוערים ומה מתפתח בכל שבוע.'),
        ('מחשבון הריון', PATH, 'שבוע ההריון, השליש ותאריך הלידה המשוער (לועזי ועברי) לפי וסת אחרונה, תאריך הפריה או החזרת עובר ב-IVF, עם שמות שמתאימים לחודש הלידה.')]


def israel_note(I, w):
    """a line on births in Israel for the last weeks (33 on), from the Ministry of Health's report; '' before that"""
    g, y = dict(I['ga']['groups']), I['year']
    src = f'<a href="{H.escape(I["source"][1])}" target="_blank" rel="noopener">משרד הבריאות</a>'
    if w < 33:
        return ''
    if w < 37:
        t = (f'לפני שבוע 37 נולדו ב-{y} כ-{g["לפני שבוע 37"]}% מהתינוקות בישראל, ולפני שבוע 33 כ-{I["ga"]["before_33"]}% בלבד. '
             f'בהריון תאומים הלידה מוקדמת יותר: חציון שבוע {I["ga"]["twins_median"]}.')
    elif w < 40:
        t = (f'רוב התינוקות בישראל נולדים בשבועות האלה: ב-{y} נולדו {g["שבועות 37 עד 39"]}% מהם בשבועות 37 עד 39, '
             f'וחציון גיל ההריון בלידה היה שבוע {I["ga"]["median"]} (ב-2000: שבוע {I["ga"]["median_2000"]}).')
    else:
        t = (f'ב-{y} נולדו כ-{round(g["לפני שבוע 37"] + g["שבועות 37 עד 39"])}% מהתינוקות בישראל לפני שבוע 40, '
             f'ו-{g["שבוע 40 ואחריו"]}% בשבוע 40 ואחריו. כלומר התאריך המשוער הוא הערכה, ולא מועד שרוב הלידות מגיעות אליו.')
    return f'<aside class="pil"><b>בישראל</b><p>{t} מקור: {src}.</p></aside>'


def name_line(c, n, s):
    """one line on a name of the week from the names data: its rank, and the trend from five years before Y1"""
    r, Y1 = c['by_name'][n], c['Y1']
    now, then = c['ny'](r, s), c['YC'].get((n, s, Y1 - 5), 0)
    sw = 'בבנות' if s == 0 else 'בבנים'
    rank = f'מקום {r["rk"]} {sw} ב-{Y1}' if r['rk'] and r['x'] == s else f'{c["fmt"](now)} {"בנות" if s == 0 else "בנים"} ב-{Y1}'
    if then and now >= then * 1.15:
        trend = f'בעלייה: {c["fmt"](then)} ב-{Y1 - 5}, {c["fmt"](now)} ב-{Y1}'
    elif then and now <= then * 0.87:
        trend = f'בירידה: {c["fmt"](then)} ב-{Y1 - 5}, {c["fmt"](now)} ב-{Y1}'
    else:
        trend = f'יציב: {c["fmt"](now)} ב-{Y1}'
    return f'{rank} · {trend} · שנת השיא: {r["pk"]}'


def build_weeks(c, P, reviewed, js, art):
    """/pregnancy/week-<n> for every week in the data, and the /pregnancy hub. Returns the week paths."""
    e, PH = H.escape, c['PH']
    W = {int(w): x for w, x in P['weeks'].items()}
    I = P['israel']
    tri = lambda w: next(t for t in P['trimesters'] if t['weeks'][0] <= w <= t['weeks'][1])
    measure = lambda x: f'כ-{x["cm"]} ס״מ' + (f' וכ-{x["g"]:,} גרם' if x.get('g') else '')
    cta = f'<p><a class="pcta" href="{PATH}">באיזה שבוע אני? לחישוב במחשבון ההריון</a></p>'
    foot = (f'<p class="k">המידע כללי ואינו תחליף לייעוץ רפואי. הגודל והמשקל הם ממוצעים משוערים, וכל עובר שונה. נבדק לאחרונה: {reviewed}. <a href="/terms">תנאי השימוש</a>. '
            'מקורות: ' + ', '.join(f'<a href="{e(u)}" target="_blank" rel="noopener" dir="ltr">{e(t.split(":")[0])}</a>' for t, u in P['sources'][:2]) + '.</p>')
    links = lambda ls: '<p class="pj-links">' + ''.join(f'<a href="{h}">{e(t)}</a>' for h, t in ls) + '</p>'
    paths = []
    for w, x in sorted(W.items()):
        t, path, st = tri(w), week_url(w), stage_of(P, w)
        url, h1 = PH + path, f'שבוע {w} להריון'
        g, b = x['names']
        title = f'{h1}: התפתחות העובר, משקל, גודל ושמות מומלצים'
        desc = c['fit']([f'{h1}: העובר בגודל של {x["size"]}, {measure(x)}.', x['baby'], f'{t["name"]}, השבוע ה-{w + 1} של ההריון.',
                         f'שמות לשבוע {w}: {g} ו{b}.'])
        left = (f'עוד {40 - w} שבועות' if w < 39 else 'עוד שבוע' if w == 39 else 'זה השבוע של התאריך המשוער' if w == 40 else 'אחרי התאריך המשוער')
        m = month_of(w)
        month_a = (f'שבוע {w} הוא בדרך כלל בחודש {ORD[m]} להריון (שבועות {MONTH_WEEKS[m][0]} עד {MONTH_WEEKS[m][1]}). '
                   'החלוקה לחודשים לא אחידה ומשתנה מעט בין מקורות, ולכן הרופאים והבדיקות סופרים בשבועות.') if m is not None else (
                   f'שבוע {w} הוא כבר אחרי החודש התשיעי, אחרי התאריך המשוער. בשבועות האלה יש מעקב צמוד, ומחליטים עם הצוות הרפואי מתי ללדת.')
        faq = [(f'מה גודל העובר בשבוע {w}?', f'בשבוע {w} העובר בגודל של {x["size"]}, {measure(x)} בממוצע.'),
               (f'באיזה שליש נמצאים בשבוע {w}?', f'בשבוע {w} נמצאים {in_tri(t["name"])}' + (', בשבוע האחרון שלו.' if w == t['weeks'][1] and w < 42 else '.')),
               (f'שבוע {w} זה איזה חודש?', month_a),
               (f'האם שבוע {w} הוא השבוע ה-{w + 1}?', f'כן. שבוע {w} פירושו {w} שבועות שלמים מהיום הראשון של הווסת האחרונה, מ-{w}+0 עד {w}+6, כלומר השבוע ה-{w + 1} של ההריון.')]
        cell = lambda n, s: (f'<td><a href="/names/{c["enc"](n)}">{e(n)}</a><span class="cn">{e(name_line(c, n, s))}</span>'
                             f'<span class="cm">{e(c["short_mean"](c["by_name"][n]))}</span>'
                             f'<button type="button" class="pfav" data-fav="{e(n)}" aria-pressed="false" hidden>שמירה לרשימה</button></td>')
        names = (f'<h2 id="names">שמות לשבוע {w}</h2><p>{e(g)} לבת ו{e(b)} לבן, עם הפירוש והנתונים מ-{c["Y1"]}. '
                 f'שם אחד לבת ואחד לבן בכל שבוע, וכך עד הלידה 78 שמות.</p>'
                 f'<table class="gtbl pnames"><thead><tr><th scope="col">לבת</th><th scope="col">לבן</th></tr></thead><tbody><tr>{cell(g, 0)}{cell(b, 1)}</tr></tbody></table>'
                 f'<p class="pfav-n" hidden></p>'
                 f'<h3 id="stage">בחירת השם בשבוע {w}: {e(st["title"])}</h3><p>{e(st["text"])}</p>{links(st["links"])}')
        now = [y for y in P['checkups'] if y['from'] <= w <= y['to']]
        checks = (f'<h2 id="checkups">בדיקות בשבוע {w}</h2><p>הבדיקות שמשרד הבריאות ממליץ עליהן בשבועות האלה. <a href="{PATH}#checkups">כל לוח הבדיקות</a>.</p>'
                  + checks_table(now, P['checkups_source'], P['checkups_reviewed'])) if now else ''
        nav = ('<nav class="pnav" aria-label="שבועות">' + (f'<a href="{week_url(w - 1)}">השבוע הקודם: שבוע {w - 1}</a>' if w - 1 in W else '<span></span>')
               + (f'<a href="{week_url(w + 1)}">השבוע הבא: שבוע {w + 1}</a>' if w + 1 in W else '') + '</nav>')
        top, crumbs_ld = crumbs(PH, [('השמות של ישראל', '/'), (HUB_NAME, HUB), (h1, None)])
        pic = f'<span class="pr-art" aria-hidden="true"><svg viewBox="0 0 64 64" focusable="false">{art[x["art"]]}</svg></span>'
        inner = f'''{top}<h1>{h1}</h1>
<p class="gmeta">{t["name"]} · השבוע ה-{w + 1} של ההריון</p>
<p class="pmine" data-pweek="{w}" hidden></p>
<p class="dlead">בשבוע {w} העובר בגודל של {e(x["size"])}: {measure(x)}. {e(x["baby"])}</p>
<dl class="pr-facts"><div class="pr-size">{pic}<div><dt>גודל</dt><dd>כמו {e(x["size"])}<span>{measure(x)}</span></dd></div></div>
<div><dt>שליש</dt><dd>{t["name"]}<span>{f"שבועות {t['weeks'][0]} עד {t['weeks'][1]}" if t['weeks'][1] < 42 else f"משבוע {t['weeks'][0]} ועד הלידה"}</span></dd></div>
<div><dt>עד התאריך המשוער</dt><dd>{left}<span>התאריך המשוער הוא בסוף שבוע 40</span></dd></div></dl>
{cta}
<h2 id="growth">גדילה עד שבוע {w}</h2>
{growth(W, w)}
<p class="k">משקל ואורך לכל השבועות: <a href="{FETAL}">משקל העובר לפי שבועות</a>.</p>
{israel_note(I, w)}
{names}
<h2>מה זה ״שבוע {w}״?</h2>
<p>שבוע {w} להריון הוא {w}+0 עד {w}+6: {w} שבועות שלמים מהיום הראשון של הווסת האחרונה, כלומר השבוע ה-{w + 1} של ההריון. כך כותבים גם במכתבי הבדיקות ובאולטרסאונד. כדי לדעת בדיוק באיזה שבוע ויום אתם, ומתי התאריך המשוער, אפשר להשתמש ב<a href="{PATH}">מחשבון ההריון</a>.</p>
<h2>{t["name"]}</h2>
<p>{e(t["text"])}</p>
{checks}<h2>שאלות נפוצות</h2>
{"".join(f"<h3>{e(q)}</h3><p>{e(a)}</p>" for q, a in faq)}
{nav}
{foot}
<script type="module" src="{js}"></script>'''
        ld = {"@context": "https://schema.org", "@graph": [
            {"@type": "WebPage", "@id": url, "url": url, "name": title, "description": desc, "inLanguage": "he",
             "dateModified": "__MODIFIED__", "lastReviewed": P['reviewed'], "isPartOf": {"@id": PH + "/#website"},
             "publisher": {"@id": PH + "/#organization"}, "breadcrumb": {"@id": url + "#breadcrumb"}},
            {"@type": "FAQPage", "@id": url + "#faq", "isPartOf": {"@id": url}, "inLanguage": "he",
             "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq]},
            {**crumbs_ld, "@id": url + "#breadcrumb"}, c['LD_SITE'], c['LD_ORG']]}
        open(c['SRC'] + f'pregnancy/week-{w}.html', 'w').write(c['page'](title, desc, path, c['static_shell']('pregnancy', ltr(inner)), jsonld=ld, app=False))
        paths.append(path)

    # the hub: the calculator, then the weeks of each trimester
    HT = f'{HUB_NAME} – כל שבועות ההריון ומחשבון הריון | השמות של ישראל'
    HD = 'הריון שבוע אחרי שבוע: גודל העובר, אורך ומשקל משוערים ומה מתפתח בכל שבוע, משבוע 4 עד 42, ומחשבון הריון לחישוב השבוע ותאריך הלידה המשוער.'
    groups = ''.join(
        f'<h2>{t["name"]}</h2><p>{e(t["text"])}</p><ul class="pwk">' + ''.join(
            f'<li><a href="{week_url(w)}" data-w="{w}"><b>שבוע {w}</b><span>{e(W[w]["size"])}</span></a></li>'
            for w in range(t['weeks'][0], t['weeks'][1] + 1) if w in W) + '</ul>' for t in P['trimesters'])
    top, crumbs_ld = crumbs(PH, [('השמות של ישראל', '/'), (HUB_NAME, None)])
    inner = (f'{top}<h1>{HUB_NAME}</h1>'
             '<p class="dlead">מה קורה בכל שבוע של ההריון: בגודל של מה העובר, כמה הוא בערך שוקל, ומה מתפתח. '
             'לכל שבוע יש עמוד משלו, ובמחשבון אפשר לחשב באיזה שבוע אתם ומתי התאריך המשוער.</p>'
             '<p class="pmine" data-phub hidden></p>'
             f'{cta}<h2 id="growth">העובר גדל</h2>{growth(W)}<p class="k">כל המספרים בטבלה אחת: <a href="{FETAL}">משקל העובר לפי שבועות</a>.</p>{groups}'
             f'<h2 id="israel">מתי נולדים בישראל</h2>{births_table(I)}'
             f'<h2 id="after">אחרי הלידה</h2><p>נולד בן? ב<a href="{BRIT}">{BRIT_H1}</a> אפשר לראות מתי חל היום השמיני, מתי היום ה-31, ובאיזה תאריך עברי.</p>'
             '<h2 id="checkups">לוח הבדיקות בהריון</h2><p>הבדיקות שמשרד הבריאות ממליץ עליהן, לפי שבועות. '
             f'ב<a href="{PATH}">מחשבון</a> אפשר לראות לכל בדיקה את התאריכים שלכם.</p>'
             f'{checks_table(P["checkups"], P["checkups_source"], P["checkups_reviewed"])}{foot}'
             f'<script type="module" src="{js}"></script>')
    url = PH + HUB
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "CollectionPage", "@id": url, "url": url, "name": HT, "description": HD, "inLanguage": "he",
         "dateModified": "__MODIFIED__", "lastReviewed": P['reviewed'], "isPartOf": {"@id": PH + "/#website"},
         "publisher": {"@id": PH + "/#organization"}, "breadcrumb": {"@id": url + "#breadcrumb"},
         "mainEntity": {"@type": "ItemList", "numberOfItems": len(paths) + 1, "itemListElement":
                        [{"@type": "ListItem", "position": 1, "name": "מחשבון הריון", "url": PH + PATH}]
                        + [{"@type": "ListItem", "position": i, "name": f'שבוע {w} להריון', "url": PH + week_url(w)} for i, w in enumerate(sorted(W), 2)]}},
        {**crumbs_ld, "@id": url + "#breadcrumb"}, c['LD_SITE'], c['LD_ORG']]}
    open(c['SRC'] + 'pregnancy/index.html', 'w').write(c['page'](HT, HD, HUB, c['static_shell']('pregnancy', inner), jsonld=ld, app=False))
    return paths


def bar_rows(groups):
    """table rows: a name, a bar (the longest bar is full width) and the share"""
    top = max(p for _, p in groups)
    return ''.join(f'<tr><th scope="row">{H.escape(n)}</th><td><span class="pbar"><i style="width:{p / top * 100:.0f}%"></i></span></td><td>{p}%</td></tr>' for n, p in groups)


def births_table(I, intro=True):
    """births in Israel by week of pregnancy, as a table with bars, and the source"""
    rows = bar_rows(I['ga']['groups'])
    lead = (f'ב-{I["year"]} נולדו בישראל כ-{I["births"]:,} תינוקות. ' if intro else '') + 'כך התחלקו הלידות לפי שבוע ההריון:'
    return (f'<p>{lead}</p>'
            f'<table class="gtbl gnum pbars"><thead><tr><th scope="col">מתי</th><th scope="col"><span class="vh">חלק מהלידות</span></th><th scope="col">אחוז</th></tr></thead><tbody>{rows}</tbody></table>'
            f'<p>חציון גיל ההריון בלידה היה שבוע {I["ga"]["median"]}: חצי מהתינוקות נולדו לפני סוף שבוע {I["ga"]["median"]}. ב-2000 החציון היה שבוע {I["ga"]["median_2000"]}. '
            f'בהריון תאומים החציון הוא שבוע {I["ga"]["twins_median"]}.</p>'
            f'<p class="k">מקור: <a href="{H.escape(I["source"][1])}" target="_blank" rel="noopener">{H.escape(I["source"][0])}</a>. לידות חי.</p>')


def build_fetal(c, P, reviewed):
    """/pregnancy/fetal-weight: the weight and length of every week in one table, the charts, and birth weights in Israel"""
    e, PH = H.escape, c['PH']
    W = {int(w): x for w, x in P['weeks'].items()}
    I, bw = P['israel'], P['israel']['bw']
    tri = lambda w: next(t for t in P['trimesters'] if t['weeks'][0] <= w <= t['weeks'][1])
    grams = lambda x: f'כ-{x["g"]:,} גרם' if x.get('g') else 'פחות מגרם'
    rows = ''.join(f'<tr><th scope="row"><a href="{week_url(w)}">שבוע {w}</a></th><td>{grams(x)}</td>'
                   f'<td>כ-{x["cm"]} ס״מ</td><td>{e(x["size"])}</td></tr>' + (
                       f'<tr class="ptri"><th scope="rowgroup" colspan="4">{tri(w + 1)["name"]}</th></tr>' if w + 1 in W and tri(w + 1) is not tri(w) else '')
                   for w, x in sorted(W.items()))
    bars = bar_rows(bw['groups'])
    faq = [('כמה שוקל עובר בשבוע 20?', f'בשבוע 20 העובר שוקל בממוצע כ-{W[20]["g"]} גרם, ואורכו כ-{W[20]["cm"]} ס״מ מהראש עד העקב.'),
           ('כמה שוקל עובר בשבוע 30?', f'בשבוע 30 העובר שוקל בממוצע כ-{W[30]["g"]:,} גרם, ואורכו כ-{W[30]["cm"]} ס״מ.'),
           ('כמה שוקל תינוק בלידה?', f'בישראל, ב-{I["year"]}, חציון משקל הלידה היה {bw["median"]:,} גרם: {bw["single"]:,} גרם בלידת תינוק אחד, '
            f'{bw["first"]:,} גרם בלידה ראשונה ו-{bw["twins"]:,} גרם בלידת תאומים. כ-88% מהתינוקות נולדו במשקל 2,500 עד 3,999 גרם.'),
           ('מה נחשב משקל לידה נמוך?', f'משקל לידה נמוך הוא פחות מ-2,500 גרם. בישראל, ב-{I["year"]}, נולדו כך {bw["low"]}% מהתינוקות, '
            f'ו-{bw["very_low"]}% נולדו במשקל של פחות מ-1,500 גרם.'),
           ('איך יודעים כמה העובר שוקל?', 'בהריון אין שקילה: באולטרסאונד מודדים את הראש, הבטן ועצם הירך, ומחשבים מהן הערכה של המשקל. '
            'זו הערכה, והמשקל בלידה יכול להיות שונה ממנה. המספרים בטבלה הם ממוצעים כלליים, וכל עובר גדל בקצב שלו.')]
    title = 'משקל עובר לפי שבועות: טבלה וגרף משבוע 4 עד 42'
    desc = (f'משקל העובר לפי שבועות בטבלה אחת: משקל ואורך משוערים משבוע 4 עד 42, גרף גדילה, ומשקל הלידה בישראל לפי משרד הבריאות '
            f'(חציון {bw["median"]:,} גרם ב-{I["year"]}).')
    top, crumbs_ld = crumbs(PH, [('השמות של ישראל', '/'), (HUB_NAME, HUB), (FETAL_NAME, None)])
    inner = f'''{top}<h1>{FETAL_NAME}</h1>
<p class="dlead">כמה העובר שוקל ומה האורך שלו בכל שבוע, משבוע 4 ועד שבוע 42, ובסוף: כמה שוקלים התינוקות שנולדים בישראל.</p>
{growth(W)}
<h2 id="table">טבלת משקל ואורך לפי שבוע</h2>
<p>המשקל והאורך הם ממוצעים משוערים. עד שבוע {MEASURE_FROM - 1} האורך נמדד מהראש עד העכוז, ומשבוע {MEASURE_FROM} מהראש עד העקב. לכל שבוע יש עמוד עם מה שמתפתח בו, הבדיקות ושמות לבת ולבן.</p>
<table class="gtbl gnum pfetal"><thead><tr><th scope="col">שבוע</th><th scope="col">משקל</th><th scope="col">אורך</th><th scope="col">בגודל של</th></tr></thead>
<tbody><tr class="ptri"><th scope="rowgroup" colspan="4">{tri(4)["name"]}</th></tr>{rows}</tbody></table>
<h2 id="birth">משקל הלידה בישראל</h2>
<p>ב-{I["year"]} נולדו בישראל כ-{I["births"]:,} תינוקות. חציון משקל הלידה היה {bw["median"]:,} גרם: חצי מהתינוקות שקלו פחות, וחצי יותר. בלידה ראשונה החציון נמוך יותר, {bw["first"]:,} גרם, ובתאומים {bw["twins"]:,} גרם.</p>
<table class="gtbl gnum pbars"><thead><tr><th scope="col">משקל לידה</th><th scope="col"><span class="vh">חלק מהתינוקות</span></th><th scope="col">אחוז</th></tr></thead><tbody>{bars}</tbody></table>
<p class="k">מקור: <a href="{e(I["source"][1])}" target="_blank" rel="noopener">{e(I["source"][0])}</a>. לידות חי.</p>
<h2 id="when">מתי נולדים בישראל</h2>
{births_table(I, intro=False)}
<h2 id="faq">שאלות נפוצות</h2>
{"".join(f"<h3>{e(q)}</h3><p>{e(a)}</p>" for q, a in faq)}
<p>אחרי הלידה: <a href="{BRIT}">{BRIT_H1}</a>, ושם לתינוק ב<a href="/names">כל השמות</a> וב<a href="/guides">מדריכים</a>.</p>
<p class="k">המידע כללי ואינו תחליף לייעוץ רפואי. נבדק לאחרונה: {reviewed}. <a href="/terms">תנאי השימוש</a>. מקורות: {", ".join(f'<a href="{e(u)}" target="_blank" rel="noopener" dir="ltr">{e(t.split(":")[0])}</a>' for t, u in P["sources"][:2])}.</p>'''
    url = PH + FETAL
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "WebPage", "@id": url, "url": url, "name": title, "description": desc, "inLanguage": "he",
         "dateModified": "__MODIFIED__", "lastReviewed": P['reviewed'], "isPartOf": {"@id": PH + "/#website"},
         "publisher": {"@id": PH + "/#organization"}, "breadcrumb": {"@id": url + "#breadcrumb"}},
        {"@type": "FAQPage", "@id": url + "#faq", "isPartOf": {"@id": url}, "inLanguage": "he",
         "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq]},
        {**crumbs_ld, "@id": url + "#breadcrumb"}, c['LD_SITE'], c['LD_ORG']]}
    open(c['SRC'] + 'pregnancy/fetal-weight.html', 'w').write(c['page'](title, desc, FETAL, c['static_shell']('pregnancy', inner), jsonld=ld, app=False))


def build_brit(c, P, js):
    """/pregnancy/brit-mila: when the brit mila (day 8) and the pidyon haben (day 31) fall, from the date of birth, the time
    against sunset (or a birth time and a city), a caesarean birth, the mother's firstborn, and a kohen or levi"""
    e, PH = H.escape, c['PH']
    # every source checked on Sefaria (Hebrew text of the seif)
    src = [('שולחן ערוך, יורה דעה רס״ב, א: הברית ביום השמיני, ביום ולא בלילה', SA + '262.1'),
           ('שולחן ערוך, יורה דעה רס״ו, ב: ברית בזמנה דוחה שבת ויום טוב, ושלא בזמנה אינה דוחה', SA + '266.2'),
           ('שולחן ערוך, יורה דעה רס״ו, ח: נולד בין השמשות מונים מהלילה, ואינו דוחה שבת ויום טוב מספק', SA + '266.8'),
           ('שולחן ערוך, יורה דעה רס״ו, י: נולד בניתוח קיסרי (יוצא דופן) אינו דוחה שבת', SA + '266.10'),
           ('במדבר י״ח, ט״ז: ״ופדויו מבן חודש תפדה״', 'https://www.sefaria.org/Numbers.18.16'),
           ('שולחן ערוך, יורה דעה ש״ה, י״א: הפדיון אחרי שלושים יום, ולא בשבת', SA + '305.11'),
           ('שולחן ערוך, יורה דעה ש״ה, י״ח: כהנים, לויים ובני כהנת ולוייה פטורים', SA + '305.18'),
           ('שולחן ערוך, יורה דעה ש״ה, כ״ד: נולד בניתוח קיסרי פטור מפדיון, וגם הנולד אחריו', SA + '305.24')]
    faq = [('איך מחשבים תאריך ברית מילה?', 'הברית ביום השמיני ללידה, כשיום הלידה הוא היום הראשון, ולכן היא באותו יום בשבוע שבו התינוק נולד, שבוע אחרי. '
            'תינוק שנולד אחרי השקיעה נחשב כמי שנולד ביום שאחריו, והברית שלו יום אחד מאוחר יותר.'),
           ('מה קורה כשהתינוק נולד סמוך לשקיעה?', 'לידה בין השקיעה לצאת הכוכבים (בין השמשות) היא ספק: סופרים מהלילה, כלומר מהיום שאחרי, '
            'ואם היום השמיני חל בשבת או בחג הברית נדחית ליום שאחריהם. כך גם בלידה ביום שישי סמוך לשקיעה: הברית ביום ראשון. בכל לידה סמוך לשקיעה כדאי לברר עם הרב.'),
           ('האם עושים ברית בשבת?', 'כן, כשהשבת היא היום השמיני: ברית בזמנה נערכת גם בשבת וביום טוב. תינוק שנולד בניתוח קיסרי לא נימול בשבת, ונהוג שגם לא ביום טוב, '
            'והברית שלו נדחית ליום שאחריהם. ברית שנדחתה מסיבה אחרת, למשל צהבת, לא נערכת בשבת ובחג.'),
           ('מתי עושים פדיון הבן?', 'ביום ה-31 ללידה, אחרי שעברו 30 ימים מלאים. אם היום ה-31 חל בשבת, הפדיון נדחה ליום ראשון, וכך גם כשהוא חל בחג.'),
           ('למי עושים פדיון הבן?', 'לבן זכר שהוא הבכור של אמו ונולד בלידה רגילה. כהנים ולויים, ובן לאם שהיא בת כהן או בת לוי, פטורים, '
            'וכך גם מי שנולד בניתוח קיסרי, והבן שנולד אחריו. במקרים מיוחדים, למשל אחרי הפלה, כדאי לשאול רב.')]
    cities = ''.join(f'<option value="{k}">{n}</option>' for k, n in BRIT_CITIES)
    form = f"""<form id="bform" class="pform" novalidate>
<label class="pfield"><span>תאריך הלידה</span><input type="date" name="date" required></label>
<fieldset class="pmethods"><legend>מתי ביום התינוק נולד?</legend>
<label class="pm"><input type="radio" name="time" value="day" checked><span>לפני השקיעה</span></label><label class="pm"><input type="radio" name="time" value="twilight"><span>סמוך לשקיעה</span></label><label class="pm"><input type="radio" name="time" value="night"><span>אחרי השקיעה</span></label></fieldset>
<details class="pr-sun"><summary>לא בטוחים? לפי שעת הלידה והעיר</summary>
<div class="pr-sunf"><label class="pfield"><span>שעת הלידה</span><input type="time" name="clock"></label>
<label class="pfield"><span>עיר</span><select name="city">{cities}</select></label></div>
<p id="bsun" class="k" role="status" hidden></p></details>
<fieldset class="pr-opts pr-optcol"><legend>לפדיון הבן ולמועד הברית</legend>
<label><input type="checkbox" name="first">זו הלידה הראשונה של האם (בכור לאמו)</label>
<label><input type="checkbox" name="caesar">התינוק נולד בניתוח קיסרי</label>
<label><input type="checkbox" name="kl">האב כהן או לוי, או שהאם בת כהן או בת לוי</label></fieldset>
<button type="submit" class="pgo">חישוב</button>
<p id="berr" class="perr" role="alert" hidden></p>
</form>
<noscript><p class="perr">המחשבון צריך JavaScript. אפשר לחשב גם לבד: הברית שבוע אחרי יום הלידה, באותו יום בשבוע, והפדיון 30 ימים אחרי יום הלידה.</p></noscript>
<div id="bres" class="pres" aria-live="polite" hidden></div>"""
    title, desc = BRIT_H1 + ': מתי הברית ומתי הפדיון', (
        'חישוב תאריך ברית מילה ופדיון הבן לפי תאריך הלידה: היום השמיני והיום ה-31, בלועזי ובעברי. כולל לידה סמוך לשקיעה, '
        'ניתוח קיסרי, ברית בשבת ובחג, ובכור, כהן או לוי, עם מקורות מהשולחן ערוך.')
    top, crumbs_ld = crumbs(PH, [('השמות של ישראל', '/'), (HUB_NAME, HUB), (BRIT_H1, None)])
    inner = f"""{top}<h1>{BRIT_H1}</h1>
<p class="dlead">מתי הברית ומתי פדיון הבן? הזינו את תאריך הלידה, סמנו אם התינוק נולד לפני השקיעה או אחריה, ואם צריך גם ניתוח קיסרי או בכור. החישוב נעשה במכשיר שלכם, ושום דבר לא נשמר.</p>
{form}
<h2 id="brit">איך מחשבים את מועד הברית?</h2>
<p>הברית נערכת ביום השמיני ללידה, כשיום הלידה הוא היום הראשון. לכן היא חלה באותו יום בשבוע שבו התינוק נולד, שבוע אחרי: תינוק שנולד ביום שלישי נימול ביום שלישי שאחריו. הברית נערכת ביום, ולא בלילה.</p>
<p>היום העברי מתחיל בשקיעה. תינוק שנולד אחרי השקיעה נחשב כמי שנולד ביום שאחריו, ולכן הברית שלו יום אחד מאוחר יותר. לידה אחרי חצות ולפני הזריחה שייכת ליום של אותו תאריך.</p>
<h2 id="sunset">לידה סמוך לשקיעה</h2>
<p>לידה בין השקיעה לצאת הכוכבים (בין השמשות) היא ספק: אולי עוד יום, ואולי כבר לילה. במקרה כזה סופרים מהלילה, כלומר מהיום שאחרי, והברית לא נערכת בשבת או בחג מספק. כך תינוק שנולד ביום שישי סמוך לשקיעה נימול ביום ראשון.</p>
<p>המחשבון יכול לחשב את שעת השקיעה לפי העיר והתאריך, בקירוב של דקה או שתיים. לידה מ-10 דקות לפני השקיעה ועד 40 דקות אחריה נחשבת במחשבון ״סמוך לשקיעה״, ובשעות האלה צריך לברר עם רב.</p>
<h2 id="shabbat">ברית בשבת ובחג</h2>
<p>ברית בזמנה, ביום השמיני, נערכת גם בשבת וביום טוב. לתינוק שנולד בניתוח קיסרי הברית לא נערכת בשבת, ונהוג שגם לא ביום טוב, ונדחית ליום שאחריהם. כשהיום השמיני חל בראש השנה, שני הימים הם יום טוב, והברית נדחית ליום שאחרי שניהם. גם כשהתינוק לא בריא, למשל בצהבת, הברית נדחית עד שהוא מבריא, ואז היא כבר לא נערכת בשבת ובחג. המועד הסופי נקבע עם המוהל.</p>
<h2 id="pidyon">איך מחשבים את מועד פדיון הבן?</h2>
<p>פדיון הבן נערך ביום ה-31 ללידה, אחרי שעברו 30 ימים מלאים. אם היום ה-31 חל בשבת או בחג, הפדיון נדחה ליום שאחריו. בחול המועד אפשר לערוך פדיון. המחשבון בודק את החגים לפי הלוח בישראל.</p>
<p>הפדיון נערך רק לבן בכור לאמו שנולד בלידה רגילה. כהנים ולויים פטורים, וגם בן לאם שהיא בת כהן או בת לוי. תינוק שנולד בניתוח קיסרי פטור, וכך גם הבן שנולד אחריו. אחרי הפלה קודמת ובמקרים אחרים צריך לברר עם רב.</p>
<h2 id="name">ומה עם השם?</h2>
<p>בברית נוהגים להכריז על השם. אם הוא עוד לא נבחר: <a href="/names/boys">שמות לבנים</a>, <a href="/guides/hebrew-month-names">שמות לפי חודש עברי וחגים</a>, ו<a href="/guides">מדריכים ומאמרים לבחירת שם</a>.</p>
<h2 id="faq">שאלות נפוצות</h2>
{"".join(f"<h3>{e(q)}</h3><p>{e(a)}</p>" for q, a in faq)}
<h2 id="sources">מקורות</h2>
<p>המחשבון נותן מידע כללי לפי ההלכה המקובלת ולוח החגים בישראל, ואינו תחליף לפסיקה של רב או מוהל.</p>
<ul>{"".join(f'<li><a href="{u}" target="_blank" rel="noopener">{e(t)}</a></li>' for t, u in src)}</ul>
<script type="module" src="{js}"></script>"""
    url = PH + BRIT
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "WebPage", "@id": url, "url": url, "name": title, "description": desc, "inLanguage": "he",
         "dateModified": "__MODIFIED__", "isPartOf": {"@id": PH + "/#website"},
         "breadcrumb": {"@id": url + "#breadcrumb"}, "mainEntity": {"@id": url + "#app"}},
        {"@type": "WebApplication", "@id": url + "#app", "name": BRIT_H1, "alternateName": BRIT_NAME, "url": url, "description": desc, "inLanguage": "he",
         "applicationCategory": "UtilitiesApplication", "operatingSystem": "Any", "isAccessibleForFree": True,
         "offers": {"@type": "Offer", "price": "0", "priceCurrency": "ILS"}, "publisher": {"@id": PH + "/#organization"}},
        {"@type": "FAQPage", "@id": url + "#faq", "isPartOf": {"@id": url}, "inLanguage": "he",
         "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq]},
        {**crumbs_ld, "@id": url + "#breadcrumb"}, c['LD_SITE'], c['LD_ORG']]}
    open(c['SRC'] + 'pregnancy/brit-mila.html', 'w').write(c['page'](title, desc, BRIT, c['static_shell']('pregnancy', inner), jsonld=ld, app=False))
