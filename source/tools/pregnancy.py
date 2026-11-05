"""The pregnancy pages, built by build_site.py (static pages without the app):
  /pregnancy/calculator   the calculator
  /pregnancy/week-<n>     one page per week, 4 to 42 ("week 12" is 12+0 to 12+6, as in the calculator)
  /pregnancy              the hub: the calculator and every week, by trimester

Sources:
  data/pregnancy.json   weeks 4-42 (size comparison, length in cm, weight in g from week 8, one sentence on the baby),
                        the three trimesters (weeks and a paragraph), names for each Hebrew month (with the reason), FAQ, sources and the date the content was reviewed,
                        and the checkups (the Ministry of Health's schedule: weeks from-to, what each one is, its own source and review date)
  app/pregnancy.mjs     the calculator (date math, the result card, the checkups with personal dates) and "your week" on the week pages
                        and the hub; one hashed module for every pregnancy page
The page works without JS for reading: how the date is calculated (with an example computed here by the same rules as
the calculator), the trimesters, every week, and the names by month. The calculator reads the weeks and the month
names from a JSON data block in the page. Every month name must be in the data, or the build stops.
"""
import json, os, re, datetime, html as H
from urllib.parse import urlparse

S = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..') + '/'
PATH = '/pregnancy/calculator'
HUB, HUB_NAME = '/pregnancy', 'הריון שבוע אחרי שבוע'
week_url = lambda w: f'/pregnancy/week-{w}'
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
    return P


def checks_table(items, src, reviewed):
    """the checkups as a table (name and coverage, when, what), with the source and the review date under it"""
    e = H.escape
    return ('<table class="gtbl pchks"><thead><tr><th>בדיקה</th><th>מתי</th><th>מה זה</th></tr></thead><tbody>'
            + ''.join(f'<tr><td><b>{e(x["name"])}</b><span class="cn">{e(x["kind"])}</span></td><td>{e(x["when"])}</td><td><span class="cm">{e(x["what"])}</span></td></tr>' for x in items)
            + f'</tbody></table><p class="k">לוח כללי לפי <a href="{e(src[1])}" target="_blank" rel="noopener">{e(src[0].split(":")[0])}</a>. '
            f'המועדים והבדיקות נקבעים מול הרופא או הרופאה והקופה. נבדק לאחרונה: {dmy(reviewed)}.</p>')


def build(c):
    """c: page, static_shell, hashed, by_name, enc, fit, SRC, PH, LD_SITE, LD_ORG. Writes src/pregnancy/;
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
    js = c['hashed']('pregnancy', 'js', open(S + 'app/pregnancy.mjs', encoding='utf-8').read())
    data = {'weeks': P['weeks'], 'early': EARLY, 'checkups': [{k: x[k] for k in ('id', 'name', 'from', 'to', 'what')} for x in P['checkups']],
            'months': {m['month']: {'note': m['note'], 'names': [[n, f'/names/{enc(n)}'] for n in m['names']]} for m in P['months']}}
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
    inner = f'''<p class="k"><a href="{HUB}">{HUB_NAME}</a> · השמות של ישראל</p><h1>מחשבון הריון</h1>
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
        {"@type": "BreadcrumbList", "@id": url + "#breadcrumb", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "השמות של ישראל", "item": PH + "/"},
            {"@type": "ListItem", "position": 2, "name": HUB_NAME, "item": PH + HUB},
            {"@type": "ListItem", "position": 3, "name": "מחשבון הריון"}]},
        c['LD_SITE'], c['LD_ORG']]}
    os.makedirs(c['SRC'] + 'pregnancy', exist_ok=True)
    text, data_block = inner.split('<script type="application/json"', 1)
    inner = ltr(text) + '<script type="application/json"' + data_block
    open(c['SRC'] + 'pregnancy/calculator.html', 'w').write(c['page'](title, DESC, PATH, c['static_shell']('pregnancy', inner), jsonld=ld, app=False))
    week_paths = build_weeks(c, P, reviewed, js)
    return [HUB, PATH] + week_paths, [
        (HUB_NAME, HUB, 'כל שבועות ההריון, 4 עד 42, לפי שליש: גודל העובר, אורך ומשקל משוערים ומה מתפתח בכל שבוע.'),
        ('מחשבון הריון', PATH, 'שבוע ההריון, השליש ותאריך הלידה המשוער (לועזי ועברי) לפי וסת אחרונה, תאריך הפריה או החזרת עובר ב-IVF, עם שמות שמתאימים לחודש הלידה.')]


def build_weeks(c, P, reviewed, js):
    """/pregnancy/week-<n> for every week in the data, and the /pregnancy hub. Returns the week paths."""
    e, PH = H.escape, c['PH']
    W = {int(w): x for w, x in P['weeks'].items()}
    tri = lambda w: next(t for t in P['trimesters'] if t['weeks'][0] <= w <= t['weeks'][1])
    measure = lambda x: f'כ-{x["cm"]} ס״מ' + (f' וכ-{x["g"]:,} גרם' if x.get('g') else '')
    cta = f'<p><a class="pcta" href="{PATH}">באיזה שבוע אני? לחישוב במחשבון ההריון</a></p>'
    foot = (f'<p class="k">המידע כללי ואינו תחליף לייעוץ רפואי. הגודל והמשקל הם ממוצעים משוערים, וכל עובר שונה. נבדק לאחרונה: {reviewed}. <a href="/terms">תנאי השימוש</a>. '
            'מקורות: ' + ', '.join(f'<a href="{e(u)}" target="_blank" rel="noopener" dir="ltr">{e(t.split(":")[0])}</a>' for t, u in P['sources'][:2]) + '.</p>')
    crumbs = lambda url, last: {"@type": "BreadcrumbList", "@id": url + "#breadcrumb", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "השמות של ישראל", "item": PH + "/"},
        {"@type": "ListItem", "position": 2, "name": HUB_NAME, "item": PH + HUB},
        {"@type": "ListItem", "position": 3, "name": last}]}
    paths = []
    for w, x in sorted(W.items()):
        t, path = tri(w), week_url(w)
        url, h1 = PH + path, f'שבוע {w} להריון'
        title = f'{h1} – גודל העובר והתפתחות, השבוע ה-{w + 1} | השמות של ישראל'
        desc = c['fit']([f'{h1}: העובר בגודל של {x["size"]}, {measure(x)}.', x['baby'], f'{t["name"]}, השבוע ה-{w + 1} של ההריון.'])
        left = (f'עוד {40 - w} שבועות' if w < 39 else 'עוד שבוע' if w == 39 else 'זה השבוע של התאריך המשוער' if w == 40 else 'אחרי התאריך המשוער')
        faq = [(f'מה גודל העובר בשבוע {w}?', f'בשבוע {w} העובר בגודל של {x["size"]}, {measure(x)} בממוצע.'),
               (f'באיזה שליש נמצאים בשבוע {w}?', f'בשבוע {w} נמצאים {in_tri(t["name"])}' + (', בשבוע האחרון שלו.' if w == t['weeks'][1] and w < 42 else '.')),
               (f'האם שבוע {w} הוא השבוע ה-{w + 1}?', f'כן. שבוע {w} פירושו {w} שבועות שלמים מהיום הראשון של הווסת האחרונה, מ-{w}+0 עד {w}+6, כלומר השבוע ה-{w + 1} של ההריון.')]
        now = [x for x in P['checkups'] if x['from'] <= w <= x['to']]
        checks = (f'<h2 id="checkups">בדיקות בשבוע {w}</h2><p>הבדיקות שמשרד הבריאות ממליץ עליהן בשבועות האלה. <a href="{PATH}#checkups">כל לוח הבדיקות</a>.</p>'
                  + checks_table(now, P['checkups_source'], P['checkups_reviewed'])) if now else ''
        nav = ('<nav class="pnav" aria-label="שבועות">' + (f'<a href="{week_url(w - 1)}">השבוע הקודם: שבוע {w - 1}</a>' if w - 1 in W else '<span></span>')
               + (f'<a href="{week_url(w + 1)}">השבוע הבא: שבוע {w + 1}</a>' if w + 1 in W else '') + '</nav>')
        inner = f'''<p class="k"><a href="{HUB}">{HUB_NAME}</a> · השמות של ישראל</p><h1>{h1}</h1>
<p class="gmeta">{t["name"]} · השבוע ה-{w + 1} של ההריון</p>
<p class="pmine" data-pweek="{w}" hidden></p>
<p class="dlead">בשבוע {w} העובר בגודל של {e(x["size"])}: {measure(x)}. {e(x["baby"])}</p>
<dl class="pr-facts"><div><dt>גודל</dt><dd>כמו {e(x["size"])}<span>{measure(x)}</span></dd></div>
<div><dt>שליש</dt><dd>{t["name"]}<span>{f"שבועות {t['weeks'][0]} עד {t['weeks'][1]}" if t['weeks'][1] < 42 else f"משבוע {t['weeks'][0]} ועד הלידה"}</span></dd></div>
<div><dt>עד התאריך המשוער</dt><dd>{left}<span>התאריך המשוער הוא בסוף שבוע 40</span></dd></div></dl>
{cta}
<h2>מה זה ״שבוע {w}״?</h2>
<p>שבוע {w} להריון הוא {w}+0 עד {w}+6: {w} שבועות שלמים מהיום הראשון של הווסת האחרונה, כלומר השבוע ה-{w + 1} של ההריון. כך כותבים גם במכתבי הבדיקות ובאולטרסאונד. כדי לדעת בדיוק באיזה שבוע ויום אתם, ומתי התאריך המשוער, אפשר להשתמש ב<a href="{PATH}">מחשבון ההריון</a>.</p>
<h2>{t["name"]}</h2>
<p>{e(t["text"])}</p>
{checks}<h2>שאלות נפוצות</h2>
{"".join(f"<h3>{e(q)}</h3><p>{e(a)}</p>" for q, a in faq)}
{nav}
<p>בינתיים אפשר להתחיל לחשוב על שם: <a href="/guides">מדריכים ומאמרים לבחירת שם</a>, או <a href="/names">כל השמות לפי א״ב</a>.</p>
{foot}
<script type="module" src="{js}"></script>'''
        ld = {"@context": "https://schema.org", "@graph": [
            {"@type": "WebPage", "@id": url, "url": url, "name": title, "description": desc, "inLanguage": "he",
             "dateModified": "__MODIFIED__", "lastReviewed": P['reviewed'], "isPartOf": {"@id": PH + "/#website"},
             "publisher": {"@id": PH + "/#organization"}, "breadcrumb": {"@id": url + "#breadcrumb"}},
            {"@type": "FAQPage", "@id": url + "#faq", "isPartOf": {"@id": url}, "inLanguage": "he",
             "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq]},
            crumbs(url, h1), c['LD_SITE'], c['LD_ORG']]}
        open(c['SRC'] + f'pregnancy/week-{w}.html', 'w').write(c['page'](title, desc, path, c['static_shell']('pregnancy', ltr(inner)), jsonld=ld, app=False))
        paths.append(path)

    # the hub: the calculator, then the weeks of each trimester
    HT = f'{HUB_NAME} – כל שבועות ההריון ומחשבון הריון | השמות של ישראל'
    HD = 'הריון שבוע אחרי שבוע: גודל העובר, אורך ומשקל משוערים ומה מתפתח בכל שבוע, משבוע 4 עד 42, ומחשבון הריון לחישוב השבוע ותאריך הלידה המשוער.'
    groups = ''.join(
        f'<h2>{t["name"]}</h2><p>{e(t["text"])}</p><ul class="pwk">' + ''.join(
            f'<li><a href="{week_url(w)}" data-w="{w}"><b>שבוע {w}</b><span>{e(W[w]["size"])}</span></a></li>'
            for w in range(t['weeks'][0], t['weeks'][1] + 1) if w in W) + '</ul>' for t in P['trimesters'])
    inner = (f'<p class="k">השמות של ישראל · כלים להורים</p><h1>{HUB_NAME}</h1>'
             '<p class="dlead">מה קורה בכל שבוע של ההריון: בגודל של מה העובר, כמה הוא בערך שוקל, ומה מתפתח. '
             'לכל שבוע יש עמוד משלו, ובמחשבון אפשר לחשב באיזה שבוע אתם ומתי התאריך המשוער.</p>'
             '<p class="pmine" data-phub hidden></p>'
             f'{cta}{groups}<h2 id="checkups">לוח הבדיקות בהריון</h2><p>הבדיקות שמשרד הבריאות ממליץ עליהן, לפי שבועות. '
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
        {"@type": "BreadcrumbList", "@id": url + "#breadcrumb", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "השמות של ישראל", "item": PH + "/"},
            {"@type": "ListItem", "position": 2, "name": HUB_NAME}]},
        c['LD_SITE'], c['LD_ORG']]}
    open(c['SRC'] + 'pregnancy/index.html', 'w').write(c['page'](HT, HD, HUB, c['static_shell']('pregnancy', inner), jsonld=ld, app=False))
    return paths
