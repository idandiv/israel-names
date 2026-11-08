"""The Arabic pages (/ar): the Arabic spelling of names given in Arab society, data/arabic.json, and the pages built from it.

data/arabic.json, one line per name: "محمد": {"he": ["מוחמד"], "by": "claude", "date": "2026-11-08"}
  key       the Arabic spelling: Arabic letters, a space only inside a compound name (عبد الله), no diacritics
  he        the CBS spellings in Hebrew letters that are this name, the main one first (ותין, ואתין and וותין are all وتين)
  by, date  who added it and when
Only spellings we are sure of go in. A name whose Arabic form is unclear (איילה: آيلا or the Hebrew Ayala?) stays out,
and the lists show it as the CBS records it, in Hebrew letters.
Every entry is checked against its Hebrew spellings letter by letter (skeleton()), so a typo or a wrong pairing fails the build.

The pages (build()): /ar, /ar/names/boys, /ar/names/girls and /ar/names/popular. They count the three sectors of Arab society in the
CBS data together (Muslim, Christian-Arab, Druze), are static (page(..., app=False)) and are paired with the Hebrew page on the same
subject by hreflang (PAIRS). Run directly to check the file (npm run site does): exits 1 on any error.
"""
import csv, html as H, json, os, re, sys

D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..') + '/'
PATH = D + 'data/arabic.json'
FIELDS = {'he', 'by', 'date'}
ARAB = ('Muslim', 'Christian-Arab', 'Druze')
SECTOR_AR = {'Muslim': 'المسلمون', 'Christian-Arab': 'المسيحيون العرب', 'Druze': 'الدروز'}
# the Hebrew page each Arabic page is the counterpart of (hreflang in both, and the language link at the top)
PAIRS = {'/names/boys': '/ar/names/boys', '/names/girls': '/ar/names/girls', '/names/popular': '/ar/names/popular'}
CONTACT = 'idandiva11@gmail.com'  # the site's public contact address (data/pages.json)

# ---- the letter check: the consonants of the Arabic spelling must be the consonants of the Hebrew one ----
# How the CBS writes Arabic in Hebrew letters: a geresh marks the letters Hebrew lacks, and a few letters stand for more than one
# (ק is ق and also ك, as in מלאק = ملاك; ג is ج and also غ, as in גזל = غزل). Vowel letters are left out on both sides.
HE_GERESH = {'ג': 'ج', 'ח': 'خ', 'ע': 'غ', 'ת': 'ث', 'ד': 'ذض', 'צ': 'ض', 'ט': 'ظ', 'ז': 'جژ'}
HE_PLAIN = {'ב': 'ب', 'ג': 'جغق', 'ד': 'دض', 'ה': 'ه', 'ז': 'زظ', 'ח': 'ح', 'ט': 'طت', 'כ': 'ك', 'ך': 'ك', 'ל': 'ل', 'מ': 'م', 'ם': 'م',
            'נ': 'ن', 'ן': 'ن', 'ס': 'سصث', 'ע': 'ع', 'פ': 'ف', 'ף': 'ف', 'צ': 'ص', 'ץ': 'ص', 'ק': 'قك', 'ר': 'ر', 'ש': 'شس', 'ת': 'تثط'}
HE_VOWEL = 'אוי'
AR_VOWEL = 'اأإآٱءئؤويىة'
AR_RE = re.compile(r'[ء-ي]+( [ء-ي]+)?')


def he_skeleton(n):
    """the consonants of a Hebrew-letter spelling, each as the set of Arabic letters it may stand for"""
    s, out = n.replace(' ', '').replace('-', ''), []
    for k, ch in enumerate(s):
        if ch in "'׳":
            continue
        if k + 1 < len(s) and s[k + 1] in "'׳" and ch in HE_GERESH:
            out.append(HE_GERESH[ch])
        elif ch in HE_VOWEL or (ch == 'ה' and k == len(s) - 1):   # a final ה is a vowel (ة, ى, ا)
            continue
        else:
            out.append(HE_PLAIN.get(ch, '?'))
    return out


def ar_skeleton(a):
    s = a.replace(' ', '')
    return [c for k, c in enumerate(s) if c not in AR_VOWEL and not (c == 'ه' and k == len(s) - 1)]   # الله: the final ه goes with the vowels


def skeleton_ok(ar, he):
    h, a = he_skeleton(he), ar_skeleton(ar)
    return len(h) == len(a) and all(c in opts for c, opts in zip(a, h))


def _no_dupes(pairs):
    keys = [k for k, _ in pairs]
    dupes = sorted({k for k in keys if keys.count(k) > 1})
    if dupes:
        raise ValueError('arabic.json: name listed twice: ' + ', '.join(dupes))
    return dict(pairs)


def load(path=PATH):
    return json.load(open(path, encoding='utf-8'), object_pairs_hook=_no_dupes)


def cbs_names():
    return {r['name'] for r in csv.DictReader(open(D + 'data/babynamesIL.csv', encoding='utf-8'))}


def errors(d, names):
    out, seen = [], {}
    for a, v in d.items():
        bad = lambda msg: out.append(f'{a}: {msg}')
        if not AR_RE.fullmatch(a):
            bad('the key must be Arabic letters, without diacritics (one space allowed, in a compound name)')
        if not isinstance(v, dict):
            bad('must be an object'); continue
        if set(v) - FIELDS:
            bad('unknown field ' + ', '.join(sorted(set(v) - FIELDS)))
        he = v.get('he')
        if not isinstance(he, list) or not he or not all(isinstance(h, str) for h in he):
            bad('he must be a list of Hebrew spellings'); continue
        for h in he:
            if h not in names:
                bad(f'{h} is not a name in the CBS data')
            if h in seen:
                bad(f'{h} is also listed under {seen[h]}')
            seen[h] = a
            if not skeleton_ok(a, h):
                bad(f'its letters do not match {h}')
    return out


def check(names=None):
    d = load()
    errs = errors(d, names if names is not None else cbs_names())
    if errs:
        raise SystemExit('data/arabic.json:\n  ' + '\n  '.join(errs))
    return d


# ---- Arabic wording ----
def count(n, sg, dual, pl, acc):
    """a number and its counted noun, by the Arabic rules: 1 ولد, 2 ولدان, 3–10 أولاد, 11–99 ولداً, 100 ولد (by the last two digits)"""
    r, f = n % 100, f'{n:,}'
    if n == 1:
        return f'{sg} واحد'
    if n == 2:
        return dual
    if 3 <= r <= 10:
        return f'{f} {pl}'
    if 11 <= r <= 99:
        return f'{f} {acc}'
    return f'{f} {sg}'


babies = lambda n: count(n, 'مولود', 'مولودان', 'مواليد', 'مولوداً')
places = lambda n: 'مرتبة واحدة' if n == 1 else 'مرتبتين' if n == 2 else count(n, 'مرتبة', 'مرتبتان', 'مراتب', 'مرتبة')
SEX = {1: {'pl': 'الأولاد', 'w': 'أولاد', 'one_of': lambda k: count(k, 'ولد', 'ولدين', 'أولاد', 'ولداً'), 'k': 'boys', 'child': 'لابنكم'},
       0: {'pl': 'البنات', 'w': 'بنات', 'one_of': lambda k: count(k, 'بنت', 'بنتين', 'بنات', 'بنتاً'), 'k': 'girls', 'child': 'لابنتكم'}}


def and_list(items):
    return items[0] if len(items) == 1 else '، '.join(items[:-1]) + ' و' + items[-1]


def build(ctx):
    """writes the Arabic pages into src/; returns (paths, [(title, path, description)]) for the sitemap and llms.txt"""
    page, SRC, PH, Y0, Y1, SC = ctx['page'], ctx['SRC'], ctx['PH'], ctx['Y0'], ctx['Y1'], ctx['SC']
    enc, fmt, by_name, ic = ctx['enc'], ctx['fmt'], ctx['by_name'], ctx['ic']
    AR = check(set(by_name))
    HE2AR = {h: a for a, v in AR.items() for h in v['he']}
    MAIN_HE = {a: v['he'][0] for a, v in AR.items()}
    os.makedirs(SRC + 'ar/names', exist_ok=True)

    def tally(sexes, years, secs=ARAB):
        """babies by name as shown (the Arabic spelling, or the CBS spelling when there is none), all spellings of a name together"""
        c = {}
        for (nm, sx, q, y), v in SC.items():
            if sx in sexes and q in secs and y in years and nm in by_name:
                k = HE2AR.get(nm, nm)
                c[k] = c.get(k, 0) + v
        return sorted(c.items(), key=lambda t: (-t[1], t[0]))

    he_of = lambda k: MAIN_HE.get(k, k)
    is_ar = lambda k: k in AR

    def name_html(k, link=True):
        label = f'<bdi>{H.escape(k)}</bdi>' if is_ar(k) else f'<bdi lang="he" class="he">{H.escape(k)}</bdi><sup>*</sup>'
        return f'<a href="/names/{enc(he_of(k))}" hreflang="he">{label}</a>' if link else label

    def plain(k):
        return k if is_ar(k) else k + '*'

    def ranked(sexes, year, k=50):
        return tally(sexes, {year})[:k]

    def rank_of(sexes, year):
        return {n: i for i, (n, _) in enumerate(tally(sexes, {year}), 1)}

    def mark(n, now, then):
        was = then.get(n, 999)
        if was > 50:
            return f' <span class="mv mvn" role="img" aria-label="لم يكن بين الخمسين الأوائل في {Y1 - 1}">جديد</span>'
        d = was - now
        if not d:
            return f' <span class="mv mv0" role="img" aria-label="المرتبة نفسها كما في {Y1 - 1}">–</span>'
        return (f' <span class="mv {"mvu" if d > 0 else "mvd"}" role="img" aria-label="{"تقدّم" if d > 0 else "تراجع"} {places(abs(d))} منذ {Y1 - 1}">'
                f'{"▲" if d > 0 else "▼"}{abs(d)}</span>')

    def coll(rows, stat):
        return '<ol class="coll">' + ''.join(
            f'<li><a href="/names/{enc(he_of(n))}" hreflang="he"><span class="cr">{i}</span>'
            + (f'<b>{H.escape(n)}</b>' if is_ar(n) else f'<b lang="he" class="he">{H.escape(n)}</b><sup>*</sup>')
            + f'<span class="cn">{stat(i, n, c)}</span></a></li>' for i, (n, c) in enumerate(rows, 1)) + '</ol>'

    HE_NOTE = ('<p class="k arnote">* الأسماء المكتوبة بالحروف العبرية هي كما سجّلتها دائرة الإحصاء المركزية: لم نتأكد بعد من كتابتها الصحيحة بالعربية، '
               'ولذلك لم نكتبها. كل اسم في القائمة يقود إلى صفحته بالعبرية، وفيها الأرقام لكل سنة. '
               f'وجدتم خطأ في كتابة اسم؟ اكتبوا لنا: <a href="mailto:{CONTACT}" dir="ltr">{CONTACT}</a></p>')

    def crumbs(name):
        return f'<nav class="crumbs" aria-label="مسار التصفح"><a href="/ar">الرئيسية</a> › <span aria-current="page">{name}</span></nav>'

    def chips(label, items):
        return f'<nav class="cgc ctop" aria-label="{label}">' + ''.join(f'<a href="{h}">{v}</a>' for h, v in items) + '</nav>'

    COLL_NAV = [('/ar/names/boys', 'أسماء أولاد'), ('/ar/names/girls', 'أسماء بنات'), ('/ar/names/popular', 'الأكثر انتشاراً')]

    def shell(path, inner):
        he = {v: k for k, v in PAIRS.items()}.get(path, '/')
        nav = '<nav class="docnav" aria-label="قوائم الأسماء">' + ''.join(
            f'<a href="{h}"' + (' aria-current="page"' if h == path else '') + f'>{v}</a>' for h, v in [('/ar', 'الرئيسية')] + COLL_NAV) + '</nav>'
        return f'''<div class="docin" dir="rtl">
<div class="doctop"><a class="docback" href="/ar">{ic(ctx['IC_BACK'])}<span>الرئيسية</span></a><span class="docend"><a class="doclang" href="{he}" hreflang="he" lang="he">עברית</a><span class="docbrand" lang="en">Shemotil</span></span></div>
<article class="docbody">{inner}</article>
{nav}
<div class="docfoot"><p>المصدر: دائرة الإحصاء المركزية. باقي الموقع، ومنه صفحة كل اسم ولعبة اختيار الاسم معاً، بالعبرية حالياً: <a href="/" hreflang="he">إلى الموقع بالعبرية</a>.</p></div>
</div>'''

    def ld(path, title, desc, lists, faq, trail):
        url = PH + path
        return {"@context": "https://schema.org", "@graph": [
            {"@type": "CollectionPage", "@id": url, "url": url, "name": title, "description": desc, "inLanguage": "ar",
             "dateModified": "__MODIFIED__", "isPartOf": {"@id": PH + "/#website"}, "author": {"@id": PH + "/#organization"},
             "isBasedOn": {"@type": "CreativeWork", "name": f"أسماء المواليد في إسرائيل {Y0}–{Y1}",
                           "creator": {"@type": "Organization", "name": "دائرة الإحصاء المركزية", "url": "https://www.cbs.gov.il"}},
             **({"breadcrumb": {"@id": url + "#breadcrumb"}} if trail else {}),
             **({"mainEntity": [{"@type": "ItemList", "name": ln, "numberOfItems": len(rows), "itemListOrder": "https://schema.org/ItemListOrderDescending",
                                 "itemListElement": [{"@type": "ListItem", "position": i, "name": n, "url": f"{PH}/names/{enc(he_of(n))}"}
                                                     for i, (n, _) in enumerate(rows, 1)]} for ln, rows in lists]} if lists else {})},
            *([{"@type": "FAQPage", "@id": url + "#faq", "isPartOf": {"@id": url}, "inLanguage": "ar",
                "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq]}] if faq else []),
            *([{"@type": "BreadcrumbList", "@id": url + "#breadcrumb",
                "itemListElement": [{"@type": "ListItem", "position": i, "name": n, **({"item": PH + p} if p else {})} for i, (n, p) in enumerate(trail, 1)]}] if trail else []),
            ctx['LD_SITE'], ctx['LD_ORG']]}

    def write(path, title, desc, inner, lists=(), faq=(), trail=None):
        faq_html = ('<h2 id="faq">أسئلة شائعة</h2>' + ''.join(f'<h3>{H.escape(q)}</h3><p>{H.escape(a)}</p>' for q, a in faq)) if faq else ''
        open(SRC + path.lstrip('/') + ('/index.html' if path == '/ar' else '.html'), 'w').write(page(
            title, desc, path, shell(path, inner + faq_html), jsonld=ld(path, title, desc, lists, faq, trail), app=False, lang='ar'))

    total = lambda sexes, year, secs=ARAB: sum(v for (nm, sx, q, y), v in SC.items() if sx in sexes and q in secs and y == year)
    year_rows = {s: ranked({s}, Y1) for s in (0, 1)}

    # ---- /ar/names/boys and /ar/names/girls ----
    def leader_since(s):
        top, y = tally({s}, {Y1})[0][0], Y1
        while y > Y0 and tally({s}, {y - 1})[0][0] == top:
            y -= 1
        return top, y

    def sex_page(s):
        S, rows = SEX[s], year_rows[s]
        now, then = rank_of({s}, Y1), rank_of({s}, Y1 - 1)
        name = f'أسماء {S["w"]}'
        path = f'/ar/names/{S["k"]}'
        title = f'أسماء {S["w"]} {ctx["PAGE_YEAR"]}: الأكثر انتشاراً في المجتمع العربي | Shemotil'
        desc = (f'أكثر 50 اسماً انتشاراً بين {S["pl"]} لدى المسلمين والمسيحيين العرب والدروز في إسرائيل، مع عدد المواليد ومن تقدّم ومن تراجع. '
                f'بحسب أرقام دائرة الإحصاء المركزية ({Y1}).')
        all_s = total({s}, Y1)
        top10 = sum(c for _, c in rows[:10]) / all_s * 100
        lead_name, since = leader_since(s)
        sectors = ''.join(f'<tr><td>{SECTOR_AR[q]}</td><td>' + ' '.join(
            f'<span class="gi">{name_html(n)} <span class="cn">{fmt(c)}</span></span>' for n, c in tally({s}, {Y1}, (q,))[:5]) + '</td></tr>' for q in ARAB)
        years = ''.join(f'<tr><td>{y}</td><td>{name_html(n)}</td><td><span class="cn">{fmt(c)}</span></td></tr>'
                        for y in range(Y1, Y1 - 10, -1) for n, c in [tally({s}, {y})[0]])
        other = COLL_NAV[0] if s == 0 else COLL_NAV[1]
        inner = (crumbs(name) + f'<h1>{name}</h1>'
                 f'<p class="dlead">تبحثون عن اسم {S["child"]}؟ هذه الأسماء الخمسون التي أُعطيت أكثر من غيرها لل{S["pl"][2:]} '
                 f'في المجتمع العربي والدرزي في إسرائيل في {Y1}، آخر سنة نشرتها دائرة الإحصاء المركزية. '
                 f'بعد القائمة: <a href="#sectors">الأوائل في كل مجتمع</a> و<a href="#years">الاسم الأول في كل سنة</a>.</p>'
                 + chips('قوائم أخرى', [other, COLL_NAV[2], ('/ar', 'كل القوائم')])
                 + f'<h2 id="list">أكثر 50 اسماً بين {S["pl"]} في {Y1}</h2>'
                 f'<p class="k">بحسب عدد المواليد في المجتمعات الثلاثة معاً. السهم يبيّن التغيّر في الترتيب منذ {Y1 - 1}.</p>'
                 + coll(rows, lambda i, n, c: fmt(c) + mark(n, i, then)) + HE_NOTE
                 + f'<h2 id="sectors">الأوائل في كل مجتمع</h2><p>القائمة أعلاه تجمع المجتمعات الثلاثة. هذه الأسماء الخمسة الأولى في كل منها في {Y1}، مع عدد المواليد.</p>'
                 f'<table class="gtbl gtop gsec"><thead><tr><th scope="col">المجتمع</th><th scope="col">الأسماء الأولى</th></tr></thead><tbody>{sectors}</tbody></table>'
                 + f'<h2 id="years">الاسم الأول بين {S["pl"]} في كل سنة</h2>'
                 f'<table class="gtbl gtop"><thead><tr><th scope="col">السنة</th><th scope="col">الاسم</th><th scope="col">عدد المواليد</th></tr></thead><tbody>{years}</tbody></table>'
                 + f'<h2 id="facts">ماذا تقول الأرقام</h2><ul>'
                 f'<li>بلغ عدد {S["pl"]} الذين وُلدوا لعائلات مسلمة ومسيحية عربية ودرزية في {Y1} {fmt(all_s)}.</li>'
                 f'<li>حصلت الأسماء العشرة الأولى على {top10:.1f}% منهم، والأسماء الخمسون على {sum(c for _, c in rows) / all_s * 100:.1f}%.</li>'
                 f'<li>{name_html(rows[0][0])} هو الاسم الأول بين {S["pl"]} '
                 + (f'في كل سنة منذ {since}' if since < Y1 else f'في {Y1}')
                 + f'. في {Y1} حمله واحد من كل {S["one_of"](round(all_s / rows[0][1]))}.</li></ul>')
        faq = [(f'ما هو الاسم الأكثر انتشاراً بين {S["pl"]} في المجتمع العربي في {Y1}؟',
                f'{plain(rows[0][0])}: حمله {babies(rows[0][1])}. وبعده {plain(rows[1][0])} ({fmt(rows[1][1])}) ثم {plain(rows[2][0])} ({fmt(rows[2][1])}).'),
               (f'ما هي الأسماء الأولى بين {S["pl"]} لدى المسيحيين العرب والدروز؟',
                ' '.join(f'لدى {SECTOR_AR[q]}: {and_list([plain(n) for n, _ in tally({s}, {Y1}, (q,))[:3]])}.' for q in ('Christian-Arab', 'Druze'))),
               ('من أين هذه الأرقام؟',
                'من دائرة الإحصاء المركزية في إسرائيل، عبر حزمة البيانات المفتوحة babynamesIL. يظهر الاسم في البيانات إذا أُعطي لخمسة مواليد على الأقل '
                'في السنة نفسها، من الجنس نفسه وفي المجتمع نفسه، ولذلك لا تظهر الأسماء النادرة جداً.')]
        write(path, title, desc, inner, [(f'أكثر 50 اسماً بين {S["pl"]} في {Y1}', rows)], faq, [('الرئيسية', '/ar'), (name, None)])
        return path, title, desc

    out = [sex_page(1), sex_page(0)]

    # ---- /ar/names/popular ----
    both, ever = ranked({0, 1}, Y1), tally({0, 1}, set(range(Y0, Y1 + 1)))[:50]
    name = 'الأسماء الأكثر انتشاراً'
    path = '/ar/names/popular'
    title = f'الأسماء الأكثر انتشاراً في المجتمع العربي في إسرائيل ({Y1}) | Shemotil'
    desc = (f'أكثر 50 اسماً انتشاراً للأولاد والبنات معاً لدى المسلمين والمسيحيين العرب والدروز في {Y1}، والأسماء الأكثر انتشاراً منذ {Y0}. '
            'بحسب أرقام دائرة الإحصاء المركزية.')
    inner = (crumbs(name) + f'<h1>{name}</h1>'
             f'<p class="dlead">الأسماء التي أُعطيت أكثر من غيرها في المجتمع العربي والدرزي في إسرائيل: للأولاد والبنات معاً في {Y1}، '
             f'ومنذ بداية السجلات في {Y0}.</p>' + chips('قوائم أخرى', COLL_NAV[:2] + [('/ar', 'كل القوائم')])
             + f'<h2 id="now">أكثر 50 اسماً في {Y1}</h2><p class="k">الأولاد والبنات معاً، بحسب عدد المواليد.</p>'
             + coll(both, lambda i, n, c: fmt(c))
             + f'<h2 id="ever">أكثر 50 اسماً منذ {Y0}</h2><p class="k">مجموع المواليد في كل السنوات.</p>'
             + coll(ever, lambda i, n, c: fmt(c)) + HE_NOTE)
    faq = [(f'ما هو الاسم الأكثر انتشاراً في المجتمع العربي في إسرائيل منذ {Y0}؟',
            f'{plain(ever[0][0])}: حمله {babies(ever[0][1])} منذ {Y0}. وبعده {plain(ever[1][0])} ثم {plain(ever[2][0])}.'),
           (f'ما هو الاسم الأكثر انتشاراً في {Y1}؟', f'{plain(both[0][0])} ({fmt(both[0][1])})، وبعده {plain(both[1][0])} ({fmt(both[1][1])}) ثم {plain(both[2][0])} ({fmt(both[2][1])}).')]
    write(path, title, desc, inner, [(f'أكثر 50 اسماً في {Y1}', both), (f'أكثر 50 اسماً منذ {Y0}', ever)], faq, [('الرئيسية', '/ar'), (name, None)])
    out.append((path, title, desc))

    # ---- /ar ----
    births = total({0, 1}, Y1)
    title = 'أسماء أولاد وبنات في المجتمع العربي في إسرائيل: الأرقام الرسمية | Shemotil'
    desc = (f'أسماء المواليد الأكثر انتشاراً لدى المسلمين والمسيحيين العرب والدروز في إسرائيل، بحسب أرقام دائرة الإحصاء المركزية من {Y0} حتى {Y1}: '
            'كم طفلاً حمل كل اسم، ومن تقدّم ومن تراجع.')
    top5 = lambda s: and_list([name_html(n) for n, _ in year_rows[s][:5]])
    inner = ('<h1>أسماء المواليد في المجتمع العربي</h1>'
             f'<p class="dlead">هنا الأسماء التي يختارها الأهل في المجتمع العربي والدرزي في إسرائيل، كما تظهر في أرقام دائرة الإحصاء المركزية: '
             f'من {Y0} حتى {Y1}، آخر سنة نُشرت. بلغ عدد المواليد لعائلات مسلمة ومسيحية عربية ودرزية في {Y1} {fmt(births)}.</p>'
             + chips('قوائم الأسماء', COLL_NAV)
             + f'<h2>الأوائل في {Y1}</h2><ul><li>الأولاد: {top5(1)}.</li><li>البنات: {top5(0)}.</li></ul>'
             + '<h2>القوائم</h2><ul>' + ''.join(f'<li><a href="{p}">{H.escape(t.split(" | ")[0])}</a>: {H.escape(d)}</li>' for p, t, d in out) + '</ul>'
             + '<h2>عن الأرقام</h2>'
             '<p>الأرقام من دائرة الإحصاء المركزية في إسرائيل، عبر حزمة البيانات المفتوحة babynamesIL. يظهر الاسم إذا أُعطي لخمسة مواليد على الأقل '
             'في السنة نفسها، من الجنس نفسه وفي المجتمع نفسه. تسجّل الدائرة الأسماء بالحروف العبرية، فكتبناها بالعربية حيث تأكدنا من كتابتها، '
             'وجمعنا الكتابات العبرية المختلفة للاسم الواحد (مثل وتين) معاً. الأسماء التي لم نتأكد من كتابتها تظهر بالحروف العبرية.</p>'
             f'<p>وجدتم خطأ في كتابة اسم أو في الأرقام؟ اكتبوا لنا: <a href="mailto:{CONTACT}" dir="ltr">{CONTACT}</a></p>')
    write('/ar', title, desc, inner)
    return ['/ar'] + [p for p, _, _ in out], [(title.split(' | ')[0], '/ar', desc)] + [(t.split(' | ')[0], p, d) for p, t, d in out]


if __name__ == '__main__':
    try:
        d = check()
    except (SystemExit, ValueError) as e:
        print(e, file=sys.stderr)
        sys.exit(1)
    print(f'arabic.json ok ({len(d)} names)')
