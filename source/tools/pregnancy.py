"""The pregnancy calculator page, /pregnancy/calculator, built by build_site.py (a static page without the app).

Sources:
  data/pregnancy.json   weeks 4-42 (size comparison, length in cm, weight in g from week 8, one sentence on the baby),
                        names for each Hebrew month (with the reason), FAQ, sources and the date the content was reviewed
  app/pregnancy.mjs     the calculator (date math + the result card), served as a hashed asset to this page only
The page works without JS for reading: how the date is calculated (with an example computed here by the same rules as
the calculator), the trimesters, every week, and the names by month. The calculator reads the weeks and the month
names from a JSON data block in the page. Every month name must be in the data, or the build stops.
"""
import json, os, datetime, html as H

S = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..') + '/'
PATH = '/pregnancy/calculator'
TITLE = 'מחשבון הריון – חישוב שבוע הריון ותאריך לידה משוער'
DESC = ('מחשבון הריון: הזינו את היום הראשון של הווסת האחרונה, את תאריך ההפריה או את החזרת העובר ב-IVF, '
        'וקבלו את שבוע ההריון, השליש ותאריך הלידה המשוער, בלועזי ובעברי.')
MONTHS = ['תשרי', 'חשוון', 'כסלו', 'טבת', 'שבט', 'אדר', 'ניסן', 'אייר', 'סיוון', 'תמוז', 'אב', 'אלול']
EARLY = ('בשבועות הראשונים עוד אין מה לראות בבדיקה. ההריון נספר מהיום הראשון של הווסת האחרונה, '
         'וההפריה מתרחשת בדרך כלל כשבועיים אחריו, בשבוע השני או השלישי.')


def load():
    P = json.load(open(S + 'data/pregnancy.json', encoding='utf-8'))
    assert sorted(map(int, P['weeks'])) == list(range(4, 43)), 'pregnancy.json: weeks must be 4 to 42'
    for w, x in P['weeks'].items():
        assert x.get('size') and x.get('cm') and x.get('baby'), f'pregnancy.json: week {w} misses size, cm or baby'
    assert [m['month'] for m in P['months']] == MONTHS, 'pregnancy.json: the 12 Hebrew months, from תשרי'
    return P


def build(c):
    """c: page, static_shell, hashed, by_name, enc, SRC, PH, LD_SITE, LD_ORG. Writes src/pregnancy/calculator.html; returns its path."""
    P = load()
    e, enc, PH = H.escape, c['enc'], c['PH']
    for m in P['months']:
        for n in m['names']:
            assert n in c['by_name'], f'pregnancy.json: {n} ({m["month"]}) is not in the data'
        assert len(set(m['names'])) == len(m['names']), f'pregnancy.json: a name twice in {m["month"]}'
    js = c['hashed']('pregnancy', 'js', open(S + 'app/pregnancy.mjs', encoding='utf-8').read())
    data = {'weeks': P['weeks'], 'early': EARLY,
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
        f'<li><b>שבוע {w}</b> <span>בגודל של {e(x["size"])} · כ-{x["cm"]} ס״מ' + (f' · כ-{x["g"]:,} גרם' if x.get('g') else '') + f'</span><p>{e(x["baby"])}</p></li>'
        for w, x in sorted(P['weeks'].items(), key=lambda t: int(t[0]))) + '</ol>'
    months = ''.join(
        f'<h3>{m["month"]}</h3><p class="k">{e(m["note"])}</p><p class="cgc">'
        + ''.join(f'<a href="/names/{enc(n)}">{e(n)}</a>' for n in m['names']) + '</p>' for m in P['months'])
    faq = P['faq']
    reviewed = '.'.join(str(int(p)) for p in reversed(P['reviewed'].split('-')))
    inner = f'''<p class="k">השמות של ישראל · כלים להורים</p><h1>מחשבון הריון</h1>
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
<h2 id="faq">שאלות נפוצות</h2>
{''.join(f'<h3>{e(q)}</h3><p>{e(a)}</p>' for q, a in faq)}
<h2 id="sources">מקורות</h2>
<p>המידע כללי ואינו תחליף לייעוץ רפואי. בכל שאלה על ההריון פנו לרופא או לאחות המטפלים. נבדק לאחרונה: {reviewed}.</p>
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
            {"@type": "ListItem", "position": 2, "name": "מחשבון הריון"}]},
        c['LD_SITE'], c['LD_ORG']]}
    os.makedirs(c['SRC'] + 'pregnancy', exist_ok=True)
    open(c['SRC'] + 'pregnancy/calculator.html', 'w').write(c['page'](title, DESC, PATH, c['static_shell']('pregnancy', inner), jsonld=ld, app=False))
    return [PATH], [('מחשבון הריון', PATH, 'שבוע ההריון, השליש ותאריך הלידה המשוער (לועזי ועברי) לפי וסת אחרונה, תאריך הפריה או החזרת עובר ב-IVF, עם שמות שמתאימים לחודש הלידה.')]
