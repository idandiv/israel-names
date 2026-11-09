"""The full-name tool, built by build_site.py (a static page without the app):
  /tools/full-name   how a first name sits with a surname: the full name in Hebrew and in English, the way class and army
                     lists read it (surname first), the passport line, initials, notes on how the two sound together,
                     how many children of that name are in a class, and names that would balance the surname.

Sources:
  app/fullname-core.mjs  the rules: English spellings, syllables, notes, initials (shared with the app bundle, see build_bundle.py)
  app/fullname.mjs       the page itself; joined at build with app/p0_translit.js (the English spelling of a surname) and the core
                         into one hashed module
  data/seo.json          per name: the English spelling and its other spellings (en, env), babies and rank in Y1, the main sex;
                         and dd, all births in Y1. Shipped as a second hashed module (fullname-data), imported by the page
The page works without JS for reading: what is checked, how Hebrew letters are written in English (with examples
from the data) and the FAQ. ?n=<name> fills the first name. The surname is never put in the URL and never sent:
it is saved on the device only (bnil_surname, the same key as the app's quick view).
"""
import json, os, re, subprocess, html as H

S = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..') + '/'
PATH = '/tools/full-name'
NAME = 'בדיקת שם מלא'
H1 = 'איך השם נשמע עם שם המשפחה?'
TITLE = 'בדיקת שם מלא: איך השם נשמע עם שם המשפחה'
DESC = ('מזינים שם פרטי ושם משפחה ורואים את השם המלא בעברית ובאנגלית, ברשימת הכיתה ובדרכון, ראשי תיבות, '
        'איך השמות נשמעים יחד, כמה ילדים בשם הזה יש בכיתה, ושמות שמתאימים לשם המשפחה.')
e = H.escape


def surnames():
    """SURNAMES_EN in app/fullname-core.mjs (one list for the page and its table), read with node"""
    js = "import { SURNAMES_EN } from './app/fullname-core.mjs'; process.stdout.write(JSON.stringify(SURNAMES_EN));"
    out = subprocess.run(['node', '--input-type=module', '-e', js], cwd=S, capture_output=True, text=True, check=True)
    return json.loads(out.stdout)


def module_js(c, data_url):
    """p0_translit.js + fullname-core.mjs (without export) + fullname.mjs (without its imports), one module"""
    rd = lambda f: open(S + 'app/' + f, encoding='utf-8').read()
    core = re.sub(r'^export ', '', rd('fullname-core.mjs'), flags=re.M)
    page = rd('fullname.mjs')
    imports = re.findall(r'^import .*$', page, flags=re.M)
    assert imports == ["import { spellVariants, sylCount, fullNotes, balanceOK, initials, mrz, email, perClass, classLine, SURNAMES_EN } from './fullname-core.mjs';",
                       "import DATA from './fullname-data.js';"], f'fullname.mjs: unexpected imports {imports}'
    page = re.sub(r'^import .*\n', '', page, flags=re.M)
    return c['hashed']('fullname', 'js', f"import DATA from '{data_url}';\n" + rd('p0_translit.js') + '\n' + core + '\n' + page)


def examples(c):
    """the letter table: each letter written in more than one way, with a real name for it (its spelling and another one)"""
    names = sorted(c['NAMES'], key=lambda x: -x['last'])
    def first(test):
        for x in names:
            if x['env'] and test(x['n']):
                return f'{x["n"]}: <bdi dir="ltr">{e(x["en"])}</bdi> או <bdi dir="ltr">{e(x["env"][0][0])}</bdi>'
        raise AssertionError('fullname: no example name')
    plain = lambda n: f'{n}: <bdi dir="ltr">{e(c["by_name"][n]["en"])}</bdi>'
    return [
        ('ח', 'Ch או H (לפעמים Kh)', first(lambda n: 'ח' in n and 'ה' not in n[:-1] and not re.search('[כך]', n))),
        ('כ, ך (בלי דגש)', 'Kh או Ch', first(lambda n: re.search('.[כך]', n) and 'ח' not in n)),
        ('צ, ץ', 'Tz או Ts', first(lambda n: re.search('[צץ]', n))),
        ('ה בסוף השם', 'a או ah', first(lambda n: n.endswith('ה'))),
        ('י בסוף השם', 'i או y', first(lambda n: n.endswith('י'))),
        ('ו', 'V, O או U, לפי הצליל', ' · '.join(plain(n) for n in ('יובל', 'אור', 'אורי'))),
        ('א, ע', 'לא נכתבות, רק התנועה שלהן', ' · '.join(plain(n) for n in ('עומר', 'אדם', 'עדי'))),
    ]


def build(c):
    os.makedirs(c['SRC'] + 'tools', exist_ok=True)
    data = {'y1': c['Y1'], 'dd': c['dd'],
            'names': {x['n']: [x['en'], x['x'], x['last'], x['rk'], [s for s, _ in x['env']], x['ar']] for x in c['NAMES']}}
    data_url = c['hashed']('fullname-data', 'js', 'export default ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';')
    js = module_js(c, data_url)
    SUR = surnames()
    for n in SUR:
        assert re.fullmatch(r"[א-ת ]+", n), f'fullname-core.mjs: bad surname {n}'

    form = '''<form id="fform" class="pform" novalidate autocomplete="off">
<div class="fn-row">
<label class="pfield"><span>שם פרטי</span><input name="first" required maxlength="24" placeholder="למשל איתן"></label>
<label class="pfield"><span>שם משפחה</span><input name="last" required maxlength="30" placeholder="למשל כהן"></label>
</div>
<details class="fn-more"><summary>שם שני ושם המשפחה באנגלית</summary>
<div class="fn-row">
<label class="pfield"><span>שם שני (לא חובה)</span><input name="middle" maxlength="24"></label>
<label class="pfield"><span>שם המשפחה באנגלית</span><input name="lastEn" maxlength="40" dir="ltr" placeholder="Cohen"></label>
</div>
</details>
<fieldset class="pmethods"><legend>ההצעות בסוף יהיו שמות ל:</legend>
<label class="pm"><input type="radio" name="sex" value="1" checked><span>בן</span></label><label class="pm"><input type="radio" name="sex" value="0"><span>בת</span></label></fieldset>
<button type="submit" class="pgo">בדיקה</button>
<p id="ferr" class="perr" role="alert" hidden></p>
</form>
<noscript><p class="perr">הבדיקה צריכה JavaScript. בינתיים אפשר לקרוא למטה מה בודקים ואיך כותבים שמות באנגלית.</p></noscript>
<div id="fres" class="pres" aria-live="polite" hidden></div>'''

    rows = examples(c)
    table = ('<table class="fn-tab"><thead><tr><th scope="col">האות</th><th scope="col">באנגלית</th><th scope="col">דוגמה מהנתונים</th></tr></thead><tbody>'
             + ''.join(f'<tr><th scope="row">{l}</th><td>{w}</td><td>{ex}</td></tr>' for l, w, ex in rows) + '</tbody></table>')
    sur = ('<p class="cgc fn-sur">' + ''.join(f'<span>{e(h)} · <bdi dir="ltr">{e(en)}</bdi></span>' for h, en in SUR.items()) + '</p>')
    faq = [
        ('איך יודעים אם השם מתאים לשם המשפחה?',
         'אומרים את השם המלא בקול כמה פעמים, ברצף. כדאי לשים לב לאות או לתנועה שנבלעות במעבר בין השמות, לחרוז, לאורך (מספר ההברות), '
         'לראשי התיבות ולאיך הצירוף נכתב באנגלית. הבדיקה כאן עוברת על כל אלה, אבל ההחלטה היא של האוזן שלכם.'),
        ('למה כדאי לשמוע את השם כששם המשפחה בא קודם?',
         'ברשימות רבות, כמו רשימת הכיתה, טפסים ורשימות בצבא, השמות מסודרים לפי שם המשפחה ונקראים כך: "כהן איתן". '
         'צירוף שנשמע טוב בסדר הרגיל יכול להישמע אחרת בסדר ההפוך.'),
        ('איך כותבים שם עברי באנגלית?',
         'אין כתיב אחד מחייב. האותיות ח, כ, צ, ה בסוף השם ו-י בסוף השם נכתבות ביותר מדרך אחת, ו-א ו-ע לא נכתבות בכלל, רק התנועה שלהן. '
         'בכל עמוד שם באתר יש את הכתיב המקובל והכתיבים האפשריים, והטבלה בעמוד הזה מסכמת את הכללים.'),
        ('האם שם המשפחה שלי נשמר אצלכם?',
         'לא. הבדיקה רצה בדפדפן, ושם המשפחה נשמר רק במכשיר שלכם, כדי שלא תצטרכו להקליד אותו שוב. הוא לא נשלח לשום מקום ולא נכנס לקישור לשיתוף.'),
    ]
    nav = ('<nav class="crumbs" aria-label="ניווט באתר"><a href="/">השמות של ישראל</a> › '
           f'<span aria-current="page">{NAME}</span></nav>')
    inner = f'''{nav}<h1>{H1}</h1>
<p class="dlead">מזינים שם פרטי ושם משפחה ורואים את השם המלא כמו שהוא ייקרא בכיתה, ייכתב בדרכון ויישמע ברצף. השם הפרטי נבדק מול נתוני הלמ״ס, ושם המשפחה נשמר רק במכשיר שלכם.</p>
{form}
<h2 id="what">מה בודקים</h2>
<ul>
<li><b>השם המלא בעברית ובאנגלית</b>, עם הכתיב המקובל של השם הפרטי וכתיב מוצע לשם המשפחה, שאפשר לתקן.</li>
<li><b>שם המשפחה קודם</b>: ככה השם נקרא ברשימת הכיתה, בטפסים ובצבא.</li>
<li><b>השורה של הדרכון</b>: השורה שהמכונה בביקורת הגבולות קוראת, בתבנית של ארגון התעופה הבינלאומי (ICAO).</li>
<li><b>ראשי תיבות</b> בעברית ובאנגלית, ואזהרה כשראשי התיבות באנגלית יוצרים מילה מביכה.</li>
<li><b>איך השמות נשמעים יחד</b>: אות שנבלעת בין השמות, תנועה שפוגשת תנועה, חרוז, אות פתיחה זהה ומספר ההברות.</li>
<li><b>כמה ילדים בשם הזה יש בכיתה</b>, לפי התינוקות שנולדו ב-{c['Y1']}.</li>
<li><b>שמות שמתאימים לשם המשפחה</b>: שמות נפוצים ב-{c['Y1']} שעוברים את כל הבדיקות האלה מול שם המשפחה שלכם.</li>
</ul>
<h2 id="english">איך כותבים שמות עבריים באנגלית</h2>
<p>אין כתיב אחד מחייב, ורוב ההבדלים מגיעים מכמה אותיות שאפשר לכתוב ביותר מדרך אחת. הדוגמאות לקוחות מהשמות באתר.</p>
{table}
<h2 id="surnames">איך כותבים שמות משפחה מוכרים באנגלית</h2>
<p>הכתיב הנפוץ של שמות משפחה מוכרים בישראל. לשם משפחה אחר הבדיקה מציעה כתיב לפי הכללים, ואפשר לתקן אותו.</p>
{sur}
<h2 id="faq">שאלות נפוצות</h2>
{''.join(f'<h3>{e(q)}</h3><p>{e(a)}</p>' for q, a in faq)}
<script type="module" src="{js}"></script>'''

    url, title = c['PH'] + PATH, TITLE + ' | השמות של ישראל'
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "WebPage", "@id": url, "url": url, "name": title, "description": DESC, "inLanguage": "he",
         "dateModified": "__MODIFIED__", "isPartOf": {"@id": c['PH'] + "/#website"},
         "breadcrumb": {"@id": url + "#breadcrumb"}, "mainEntity": {"@id": url + "#app"}},
        {"@type": "WebApplication", "@id": url + "#app", "name": NAME, "url": url, "description": DESC, "inLanguage": "he",
         "applicationCategory": "UtilitiesApplication", "operatingSystem": "Any", "isAccessibleForFree": True,
         "offers": {"@type": "Offer", "price": "0", "priceCurrency": "ILS"}, "publisher": {"@id": c['PH'] + "/#organization"}},
        {"@type": "FAQPage", "@id": url + "#faq", "isPartOf": {"@id": url}, "inLanguage": "he",
         "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq]},
        {"@type": "BreadcrumbList", "@id": url + "#breadcrumb", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "השמות של ישראל", "item": c['PH'] + "/"},
            {"@type": "ListItem", "position": 2, "name": NAME}]},
        c['LD_SITE'], c['LD_ORG']]}
    open(c['SRC'] + 'tools/full-name.html', 'w').write(c['page'](title, DESC, PATH, c['static_shell']('tools', inner), jsonld=ld, app=False))
    return [PATH], [(NAME, PATH, DESC)]
