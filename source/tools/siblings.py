"""The siblings tool, built by build_site.py (a static page without the app):
  /tools/siblings   names that go with the names of the brothers and sisters: 12 suggestions, each with the reasons,
                    the family's style in a few words, and filters (classic or new, rare or common, the first letter).

Sources:
  app/dna-core.mjs   the DNA of a name and the matching (shared with the app bundle, see build_bundle.py)
  app/siblings.mjs   the page itself; joined at build with the core into one hashed module
  data/seo.json      per name: its DNA record (dna, from dnaRec in app/p5b_dna.js) and the names for a sibling (sib),
                     shipped as a second hashed module (siblings-data), imported by the page
The page works without JS for reading: how the matching works, examples from the data and the FAQ.
?n=<name>,<name> fills the names (and s, st, r, l the choices), so the result can be shared.
"""
import json, os, re, html as H

S = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..') + '/'
PATH = '/tools/siblings'
NAME = 'שם לאח או לאחות'
H1 = 'שם לאח או לאחות: שמות שמתאימים למשפחה'
TITLE = 'שם לאח או לאחות: שמות שמתאימים לשמות של האחים'
DESC = ('מזינים את השמות של האחים והאחיות ומקבלים 12 שמות שמתאימים להם: מאותו דור ומגזר, במקור, באורך ובנדירות דומים, '
        'עם הסבר לכל הצעה ותיאור של הסגנון של המשפחה. לפי נתוני הלמ״ס.')
e = H.escape


def module_js(c, data_url):
    """dna-core.mjs (without export) + siblings.mjs (without its imports), one module"""
    rd = lambda f: open(S + 'app/' + f, encoding='utf-8').read()
    core = rd('dna-core.mjs')
    assert not re.search(r'^import ', core, flags=re.M), 'dna-core.mjs: the page module has no room for imports'
    core = re.sub(r'^export ', '', core, flags=re.M)
    page = rd('siblings.mjs')
    imports = re.findall(r'^import .*$', page, flags=re.M)
    assert imports == ["import { dnaOf, suggestSiblings, familyStyle, SIB_POOL_MIN } from './dna-core.mjs';",
                       "import DATA from './siblings-data.js';"], f'siblings.mjs: unexpected imports {imports}'
    page = re.sub(r'^import .*\n', '', page, flags=re.M)
    return c['hashed']('siblings', 'js', f"import DATA from '{data_url}';\n" + core + '\n' + page)


def examples(c):
    """the two most common names of each sex in Y1, with the names for a brother and a sister (seo.json sib)"""
    out = []
    for s in (0, 1):
        top = sorted((x for x in c['NAMES'] if x['x'] == s and x['rk']), key=lambda x: x['rk'])[:2]
        for x in top:
            b, g = ([n for n in L if n in c['by_name']] for L in x['sib'])
            assert b and g, f'siblings: no names for a sibling of {x["n"]}'
            out.append((x['n'], b, g))
    return out


def build(c):
    os.makedirs(c['SRC'] + 'tools', exist_ok=True)
    data = {'y1': c['Y1'], 'names': {x['n']: x['dna'] for x in c['NAMES']}}
    data_url = c['hashed']('siblings-data', 'js', 'export default ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';')
    js = module_js(c, data_url)
    link = lambda n: f'<a href="/names/{c["enc"](n)}">{e(n)}</a>'

    form = '''<form id="sform" class="pform" novalidate autocomplete="off">
<div id="snames" class="fn-row sib-names"><label class="pfield"><span>אח או אחות 1</span><input name="n1" maxlength="24" required placeholder="למשל נועה"></label></div>
<button type="button" class="sib-add" id="sadd">+ עוד אח או אחות</button>
<fieldset class="pmethods"><legend>מחפשים שם ל:</legend>
<label class="pm"><input type="radio" name="sex" value="1" checked><span>בן</span></label><label class="pm"><input type="radio" name="sex" value="0"><span>בת</span></label><label class="pm"><input type="radio" name="sex" value="2"><span>עוד לא יודעים</span></label></fieldset>
<div class="fn-row">
<label class="pfield"><span>סגנון</span><select name="style"><option value="">הכול</option><option value="classic">קלאסי (שמות ותיקים)</option><option value="new">עכשווי (שמות של הדור הזה)</option></select></label>
<label class="pfield"><span>כמה נפוץ</span><select name="rarity"><option value="">הכול</option><option value="rare">נדיר (פחות מ-100 תינוקות בשנה)</option><option value="common">מוכר (100 ומעלה)</option></select></label>
<label class="pfield"><span>האות הראשונה</span><select name="letter"><option value="">לא משנה</option><option value="same">כמו של אחד האחים</option><option value="other">אחרת משל כל האחים</option></select></label>
</div>
<button type="submit" class="pgo">הצעות לשמות</button>
<p id="serr" class="perr" role="alert" hidden></p>
</form>
<noscript><p class="perr">ההתאמה צריכה JavaScript. בינתיים אפשר לקרוא למטה איך היא עובדת, ולראות דוגמאות.</p></noscript>
<div id="sres" class="pres" aria-live="polite" hidden></div>'''

    ex = ''.join(f'<h3>אח או אחות ל{link(n)}</h3><p>לאח: {", ".join(map(link, b))}.<br>לאחות: {", ".join(map(link, g))}.</p>' for n, b, g in examples(c))
    faq = [
        ('איך בוחרים שם לאח או לאחות?',
         'הרבה משפחות מחפשות שם שמתאים לשמות של האחים בלי להיות דומה מדי להם: מאותו דור ובאותו סגנון, אבל בצליל אחר. '
         'הכלי כאן מחפש שמות כאלה בנתוני הלמ״ס, ומסביר לכל שם למה הוא הוצע.'),
        ('לפי מה נבחרים השמות?',
         'לפי חמישה דברים: המגזר שבו ניתנים השמות, הדור שלהם (שנת הלידה הטיפוסית של מי שנקרא כך), המקור (מקראי, עברי, ערבי, לועזי ועוד), '
         'האורך בהברות, וכמה הם נפוצים היום. השמות שמוצעים ניתנו ב-' + str(c['Y1']) + ' לפחות ל-15 תינוקות.'),
        ('למה לא מוצעים שמות שדומים מאוד לשמות של האחים?',
         'שמות כמו נועה ונועם, או איתן ואיתמר, נשמעים כמעט אותו דבר, ובבית קל להתבלבל ביניהם. לכן הכלי לא מציע שם ששונה רק באות אחת, '
         'או שם שנמצא בתוך שם של אח. שמות שמתחילים באותן שלוש אותיות כמו שם של אח, או מתחרזים איתו, מקבלים פחות עדיפות.'),
        ('אפשר להזין כמה אחים?',
         'כן, עד ארבעה. כל שם שמוצע צריך להתאים לכל האחים, ולכן ככל שיש יותר אחים ההצעות מדויקות יותר, וגם יש פחות מהן.'),
        ('השמות שאני מזין נשמרים אצלכם?',
         'לא. ההתאמה רצה בדפדפן, והשמות לא נשלחים לשום מקום. שמות שמסמנים ב-♥ נשמרים רק במכשיר שלכם, ברשימת השמות ששמרתם באתר.'),
    ]
    nav = ('<nav class="crumbs" aria-label="ניווט באתר"><a href="/">השמות של ישראל</a> › '
           f'<span aria-current="page">{NAME}</span></nav>')
    inner = f'''{nav}<h1>{H1}</h1>
<p class="dlead">מזינים את השמות של האחים והאחיות, ומקבלים שמות שמתאימים להם: מאותו דור ומאותו מגזר, במקור ובאורך דומים, אבל לא דומים מדי בצליל. כל הצעה באה עם ההסבר שלה, לפי נתוני הלמ״ס.</p>
{form}
<h2 id="how">איך זה עובד</h2>
<p>לכל שם בנתונים חישבנו כמה תכונות, מתוך נתוני הלמ״ס ומתוך הפירושים באתר:</p>
<ul>
<li><b>מגזר</b>: איזה חלק מהתינוקות שנקראו כך הם יהודים, מוסלמים, נוצרים ערבים ודרוזים. שם מוצע רק כשהוא ניתן בעיקר באותם מגזרים כמו השמות של האחים.</li>
<li><b>דור</b>: שנת הלידה הטיפוסית, השנה שעד אליה נולדו חצי מהתינוקות שקיבלו את השם.</li>
<li><b>מקור</b>: מקראי, עברי, ארמי, ערבי, לועזי ועוד, כשהוא ידוע.</li>
<li><b>אורך וצליל</b>: מספר ההברות, האותיות הראשונות והסיומת.</li>
<li><b>נדירות</b>: כמה תינוקות קיבלו את השם בשלוש השנים האחרונות בנתונים.</li>
</ul>
<p>ההצעות הן השמות שהכי קרובים לשמות של האחים בכל אלה, מתוך שמות שניתנו ב-{c['Y1']} לפחות ל-15 תינוקות. שמות שנשמעים כמעט אותו דבר, כמו שם ששונה באות אחת, לא מוצעים.</p>
<h2 id="examples">דוגמאות</h2>
<p>השמות שהכלי מציע לאחים של השמות הנפוצים ב-{c['Y1']}:</p>
{ex}
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
    open(c['SRC'] + 'tools/siblings.html', 'w').write(c['page'](title, DESC, PATH, c['static_shell']('tools', inner), jsonld=ld, app=False))
    return [PATH], [(NAME, PATH, DESC)]
