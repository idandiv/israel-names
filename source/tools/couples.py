"""The couple tool's landing page, built by build_site.py (a static page without the app):
  /tools/couple-names   what choosing a name together is (the swipe at /#match, app/p8_match.js), how it works,
                        the room settings, privacy and the FAQ, with links into the tool.

The tool itself lives in the app at /#match, which search engines can't index; this page is the indexable way in.
The settings and the privacy text here say the same as the app (nmSetupForm in app/p8_match.js, the note in app/p1_core.js),
so a change there should be made here too.
"""
import html as H

PATH = '/tools/couple-names'
NAME = 'בוחרים שם בזוג'
H1 = 'בוחרים שם לתינוק ביחד: התאמת שמות לזוגות'
TITLE = 'בוחרים שם לתינוק בזוג: מחליקים שמות ורואים איפה אתם מסכימים'
DESC = ('כל אחד מכם מחליק שמות בנפרד, בטלפון שלו: ימינה לשם שאהבתם, שמאלה לשם שלא. כששניכם אוהבים את אותו שם, יש התאמה. '
        'בלי הרשמה, עם שמות אמיתיים מנתוני הלמ״ס.')
e = H.escape


def build(c):
    go = lambda label: (f'<a class="matchcta" href="/#match"><span class="gl1">{c["ic_users"]}</span>'
                        f'<span><b>{label}</b><span>יוצרים חדר, שולחים קישור לבן או לבת הזוג ומתחילים להחליק</span></span>'
                        f'<span class="go">להתחיל {c["ic_arrow"]}</span></a>')
    faq = [
        ('איך בוחרים שם לתינוק כשכל אחד מאיתנו אוהב שמות אחרים?',
         'הדרך הכי פשוטה היא לא להתווכח על כל שם, אלא לראות קודם איפה אתם כבר מסכימים. כאן כל אחד מכם עובר על השמות לבד, '
         'ורק שמות ששניכם אהבתם מוצגים כהתאמה. שם שרק אחד מכם אהב לא נחשף לשני, כך שאפשר לסמן בלי לחשוש.'),
        ('צריך להירשם או להוריד אפליקציה?',
         'לא. הכול עובד בדפדפן, בלי הרשמה ובלי סיסמה. פותחים חדר, כותבים את השם שיוצג בו, ושולחים את הקישור לבן או לבת הזוג.'),
        ('מה קורה כששנינו אוהבים את אותו שם?',
         'מיד מופיעה התאמה, ואם שניכם מחוברים באותו זמן רואים אותה בזמן אמת. כל ההתאמות נשמרות ברשימה אחת בחדר, '
         'ושמות שסימנתם כמועדף עליון (החלקה למעלה) מופיעים בה ראשונים.'),
        ('אפשר לבחור איזה שמות יופיעו?',
         'כן. כשפותחים חדר בוחרים אם מחפשים שם לבת, לבן או שעוד לא יודעים, מאילו מגזרים, והאם לכלול שמות יוניסקס. '
         'בהגדרות הנוספות אפשר לבחור תקופה (עדכניים, חוזרים לאופנה, על-זמניים) וכמה השם נפוץ (נפוצים, מוכרים, נדירים). '
         'שני בני הזוג מקבלים את אותם שמות.'),
        ('אפשר להוסיף לחדר שמות שכבר שמרנו?',
         'כן. ברשימת השמות ששמרתם באתר יש כפתור שמכניס את כולם לחדר, ובכל עמוד שם יש כפתור שמוסיף את השם הזה. '
         'שם שהוספתם נחשב כשם שאהבתם, ובן או בת הזוג יקבלו אותו להחלקה.'),
        ('כמה אנשים יכולים להיות בחדר?',
         'עד ארבעה. אפשר גם לפתוח כמה חדרים, למשל אחד לשם לבת ואחד לשם לבן, ולעבור ביניהם מכפתור "חדרים".'),
        ('מה נשמר ואיפה?',
         'השם שבחרתם להציג בחדר והבחירות שלכם בו נשמרים בשרת מאובטח (Supabase), כדי שבן או בת הזוג יראו אותם בזמן אמת. '
         'רק מי שהצטרף לחדר יכול לראות אותם, וחדרים שלא היה בהם שימוש 90 יום נמחקים אוטומטית. '
         'אפשר למחוק הכול בכל רגע מהכפתור "מחיקת כל הנתונים שלי" בתחתית האתר.'),
    ]
    nav = ('<nav class="crumbs" aria-label="ניווט באתר"><a href="/">השמות של ישראל</a> › '
           f'<span aria-current="page">{NAME}</span></nav>')
    inner = f'''{nav}<h1>{H1}</h1>
<p class="dlead">כל אחד מכם מחליק שמות לבד, בטלפון שלו ומתי שנוח לו: ימינה לשם שאהבתם, שמאלה לשם שלא בשבילכם. כששניכם אוהבים את אותו שם, יש התאמה. שם שרק אחד מכם אהב נשאר אצלו.</p>
{go('לפתוח חדר משותף')}
<h2 id="how">איך זה עובד</h2>
<ol>
<li><b>פותחים חדר.</b> כותבים את השם שלכם ובוחרים למי השם: בת, בן או שעוד לא יודעים, מאילו מגזרים, והאם לכלול שמות יוניסקס.</li>
<li><b>מזמינים את בן או בת הזוג.</b> שולחים את הקישור לחדר בוואטסאפ או בכל דרך אחרת. מי שנכנס לקישור מצטרף לאותו חדר ומקבל את אותם שמות.</li>
<li><b>מחליקים, כל אחד בנפרד.</b> ימינה: אהבתי. שמאלה: לא בשבילנו. למעלה: מועדף עליון. אפשר לבטל את הבחירה האחרונה, ושמות שדילגתם עליהם חוזרים בסבב הבא.</li>
<li><b>רואים את ההתאמות.</b> כל שם ששניכם אהבתם נכנס לרשימת ההתאמות של החדר, ולכל שם ברשימה אפשר לפתוח את הפרטים: מה הפירוש שלו וכמה הוא נפוץ לאורך השנים, ולשמור אותו לרשימה שלכם.</li>
</ol>
<h2 id="names">אילו שמות מופיעים</h2>
<p>השמות הם שמות אמיתיים שניתנו לתינוקות בישראל, מנתוני הלמ״ס מאז 1949, ורק שמות שניתנו בסך הכול לפחות ל-100 תינוקות. הם מופיעים בערך לפי כמה הם נפוצים היום, אבל מעורבבים, כך שזה אף פעם לא מרגיש כמו רשימה מדורגת. בהגדרות הנוספות אפשר לצמצם:</p>
<ul>
<li><b>תקופה</b>: שמות עדכניים של השנים האחרונות, שמות של פעם שחוזרים עכשיו לאופנה, או שמות על-זמניים שנותנים כבר עשרות שנים.</li>
<li><b>כמה נפוץ</b>: שמות ששומעים הרבה היום, שמות מוכרים שלא נמצאים בכל כיתה, או שמות נדירים.</li>
</ul>
<p>כבר יש לכם רשימה? הוסיפו לחדר את השמות ששמרתם באתר (למשל ב<a href="/#gen">מחולל השמות</a>), או כל שם מהעמוד שלו. מחפשים רעיונות לפני שמתחילים? יש <a href="/names/girls">שמות לבנות</a>, <a href="/names/boys">שמות לבנים</a> ו<a href="/names/unisex">שמות יוניסקס</a>.</p>
<h2 id="faq">שאלות נפוצות</h2>
{''.join(f'<h3>{e(q)}</h3><p>{e(a)}</p>' for q, a in faq)}'''

    url, title = c['PH'] + PATH, TITLE + ' | השמות של ישראל'
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "WebPage", "@id": url, "url": url, "name": title, "description": DESC, "inLanguage": "he",
         "dateModified": "__MODIFIED__", "isPartOf": {"@id": c['PH'] + "/#website"},
         "breadcrumb": {"@id": url + "#breadcrumb"}, "mainEntity": {"@id": url + "#app"}},
        {"@type": "WebApplication", "@id": url + "#app", "name": NAME, "url": c['PH'] + "/#match", "description": DESC, "inLanguage": "he",
         "applicationCategory": "LifestyleApplication", "operatingSystem": "Any", "isAccessibleForFree": True,
         "offers": {"@type": "Offer", "price": "0", "priceCurrency": "ILS"}, "publisher": {"@id": c['PH'] + "/#organization"}},
        {"@type": "FAQPage", "@id": url + "#faq", "isPartOf": {"@id": url}, "inLanguage": "he",
         "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq]},
        {"@type": "BreadcrumbList", "@id": url + "#breadcrumb", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "השמות של ישראל", "item": c['PH'] + "/"},
            {"@type": "ListItem", "position": 2, "name": NAME}]},
        c['LD_SITE'], c['LD_ORG']]}
    open(c['SRC'] + 'tools/couple-names.html', 'w').write(c['page'](title, DESC, PATH, c['static_shell']('tools', inner), jsonld=ld, app=False))
    return [PATH], [(NAME, PATH, DESC)]
