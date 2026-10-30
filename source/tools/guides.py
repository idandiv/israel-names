"""Guides: long articles at /guides/<slug> and the /guides hub, built by build_site.py (static pages without the app).

Sources:
  data/guides.json            the guides, in hub order: slug, title (without the site suffix), h1, desc, card (hub text), badge (hub tag),
                              published (YYYY-MM-DD), optional updated, faq [[q, a]], and per-guide data such as pairs
  content/guides/<slug>.html  the article body, an HTML fragment with these markers:
      <!--toc-->              table of contents of the <h2 id="..."> headings
      <!--pairs:<group>-->    the pair tables of pairs[<group>] (girls, boys, mixed)
      {{name:<name>}}         link to the name page (in FAQ answers: the name only)
      {{count:<name>:<s>}}    babies of sex s (0 girls, 1 boys) given the name in Y1
      {{Y0}} {{Y1}}           first and last year of the data
Every name in a guide is checked: it exists, and a pair name was given to at least 20 babies of that sex in Y1,
most of them of that sex. A failed check stops the build, like meanings.py.
"""
import json, os, re, html as H

S = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..') + '/'
GROUPS = {'girls': (0, 0), 'boys': (1, 1), 'mixed': (0, 1)}  # sexes of the first and second name
SEX_HE = {0: 'בת', 1: 'בן'}
MIN_BABIES = 20
SECTION = 'מדריכים ומאמרים'  # the section's name: hub h1, footer, /names group, breadcrumbs


def load():
    G = json.load(open(S + 'data/guides.json', encoding='utf-8'))
    assert len({g['slug'] for g in G}) == len(G), 'guides.json: slug used twice'
    for g in G:
        g['body'] = open(S + f'content/guides/{g["slug"]}.html', encoding='utf-8').read()
    return G


def one_letter_apart(a, b):
    """True when a and b are the same up to one letter changed, added or removed (אודיה / הודיה)"""
    if abs(len(a) - len(b)) > 1:
        return False
    if len(a) == len(b):
        return sum(x != y for x, y in zip(a, b)) <= 1
    s, l = sorted((a, b), key=len)
    return any(l[:i] + l[i + 1:] == s for i in range(len(l)))


def build(c):
    """c: what build_site.py shares (page, static_shell, nav, by_name, ny, enc, fmt, short_mean, Y0, Y1, SRC, PH, LD_*).
    Writes src/guides/; returns (paths for the sitemap, [(slug, title, desc)] for llms.txt and the hub)."""
    G = load()
    by_name, ny, enc, fmt, Y0, Y1, PH = c['by_name'], c['ny'], c['enc'], c['fmt'], c['Y0'], c['Y1'], c['PH']
    e = H.escape
    os.makedirs(c['SRC'] + 'guides', exist_ok=True)

    def need(n, where):
        assert n in by_name, f'guides: {n} ({where}) is not in the data'
        return by_name[n]

    def fill(s, where, as_html=True):
        def one(m):
            kind, arg = m.group(1), m.group(2)
            if kind == 'Y0':
                return str(Y0)
            if kind == 'Y1':
                return str(Y1)
            if kind == 'name':
                need(arg, where)
                return f'<a href="/names/{enc(arg)}">{e(arg)}</a>' if as_html else arg
            if kind == 'count':
                n, sx = arg.rsplit(':', 1)
                return fmt(ny(need(n, where), int(sx)))
            raise AssertionError(f'guides: unknown marker {{{{{kind}}}}} in {where}')
        out = re.sub(r'\{\{(\w+)(?::([^}]+))?\}\}', one, s)
        assert '{{' not in out, f'guides: unfilled marker in {where}'
        return out

    def cell(n, s, where):
        x = need(n, where)
        k = ny(x, s)
        assert k >= MIN_BABIES and (x['g'] >= 50 if s == 0 else x['g'] <= 50), \
            f'guides: {n} in {where} is not a name for a {SEX_HE[s]} ({k} in {Y1}, {x["g"]}% girls)'
        m = c['short_mean'](x)
        return (f'<td><a href="/names/{enc(n)}">{e(n)}</a><span class="cn">{fmt(k)} {"בנות" if s == 0 else "בנים"} ב-{Y1}</span>'
                + (f'<span class="cm">{e(m)}</span>' if m else '') + '</td>')

    def pair_tables(g, group):
        s1, s2 = GROUPS[group]
        seen, out = set(), []
        for t in g['pairs'][group]:
            rows = []
            for a, b in t['pairs']:
                where = f'{g["slug"]} {group} "{t["theme"]}"'
                key = frozenset((a, b))
                assert a != b and key not in seen, f'guides: pair {a}/{b} twice in {where}'
                assert not one_letter_apart(a, b), f'guides: {a} and {b} are one letter apart ({where})'
                seen.add(key)
                rows.append(f'<tr>{cell(a, s1, where)}{cell(b, s2, where)}</tr>')
            out.append(f'<h3>{e(t["theme"])}</h3><p class="k">{e(t["note"])}</p>'
                       f'<table class="gtbl"><thead><tr><th scope="col">{SEX_HE[s1]}</th><th scope="col">{SEX_HE[s2]}</th></tr></thead>'
                       f'<tbody>{"".join(rows)}</tbody></table>')
        return ''.join(out), len(seen)

    def toc(body):
        items = re.findall(r'<h2 id="([^"]+)">(.*?)</h2>', body)
        return '<nav class="toc" aria-label="תוכן העניינים"><b>במדריך</b><ol>' + ''.join(
            f'<li><a href="#{i}">{t}</a></li>' for i, t in items) + '</ol></nav>'

    date_he = lambda d: '.'.join(str(int(p)) for p in reversed(d.split('-')))
    paths, listed = [], []
    for g in G:
        slug, path = g['slug'], '/guides/' + g['slug']
        url, title = PH + path, g['title'] + ' | השמות של ישראל'
        body = fill(g['body'], slug)
        n_pairs = 0
        for group in GROUPS:
            mark = f'<!--pairs:{group}-->'
            if mark in body:
                tables, k = pair_tables(g, group)
                body, n_pairs = body.replace(mark, tables), n_pairs + k
        assert '<!--pairs:' not in body, f'guides: {slug} has pairs markers with no data'
        body = body.replace('<!--toc-->', toc(body))
        # the page shows the answers with name links, the FAQPage node the same text without them
        faq = [(fill(q, slug, False), fill(a, slug, False)) for q, a in g.get('faq', [])]
        faq_html = ('<h2 id="faq">שאלות נפוצות</h2>' + ''.join(
            f'<h3>{e(fill(q, slug, False))}</h3><p>{fill(a, slug)}</p>' for q, a in g['faq'])) if faq else ''
        dates = f'פורסם ב-{date_he(g["published"])}' + (f' · עודכן ב-{date_he(g["updated"])}' if g.get('updated') else '')
        inner = (f'<p class="k"><a href="/guides">{SECTION}</a> · השמות של ישראל</p><h1>{e(g["h1"])}</h1>'
                 f'<p class="gmeta">{dates} · הנתונים: הלשכה המרכזית לסטטיסטיקה, {Y0}–{Y1}</p>{body}{faq_html}')
        ld = {"@context": "https://schema.org", "@graph": [
            {"@type": "WebPage", "@id": url, "url": url, "name": title, "description": g['desc'], "inLanguage": "he",
             "isPartOf": {"@id": PH + "/#website"}, "breadcrumb": {"@id": url + "#breadcrumb"}, "mainEntity": {"@id": url + "#article"}},
            {"@type": "Article", "@id": url + "#article", "headline": g['title'], "description": g['desc'], "inLanguage": "he",
             "datePublished": g['published'], "dateModified": "__MODIFIED__", "image": PH + "/og.png",
             "author": {"@id": PH + "/#organization"}, "publisher": {"@id": PH + "/#organization"},
             "mainEntityOfPage": {"@id": url}, "isBasedOn": c['LD_DATA']},
            *([{"@type": "FAQPage", "@id": url + "#faq", "isPartOf": {"@id": url}, "inLanguage": "he",
                "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq]}] if faq else []),
            {"@type": "BreadcrumbList", "@id": url + "#breadcrumb", "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "השמות של ישראל", "item": PH + "/"},
                {"@type": "ListItem", "position": 2, "name": SECTION, "item": PH + "/guides"},
                {"@type": "ListItem", "position": 3, "name": g['h1']}]},
            c['LD_SITE'], c['LD_ORG']]}
        open(c['SRC'] + f'guides/{slug}.html', 'w').write(c['page'](title, g['desc'], path, c['static_shell']('guides', inner), jsonld=ld, app=False))
        paths.append(path)
        listed.append((slug, g['title'], g['desc'], g['card'], g['badge'], date_he(g.get('updated') or g['published'])))

    # the hub: one card per guide (badge, title, summary, date, and a "read" call to action)
    HT, HD = 'מדריכים ומאמרים לבחירת שם לתינוק | השמות של ישראל', 'מדריכים, מאמרים וטיפים לבחירת שם לתינוק, מבוססים על נתוני הלמ״ס: שמות לתאומים ועוד, עם הפירוש והפופולריות של כל שם.'
    cards = '<ul class="gcards">' + ''.join(
        f'<li><a href="/guides/{s}"><span class="gbadge">{e(bd)}</span><b>{e(t)}</b><span class="gsum">{e(cd)}</span>'
        f'<span class="gfoot"><span class="gdate">עודכן ב-{d}</span><span class="gcta">לקריאת המאמר המלא {c["arrow"]}</span></span></a></li>'
        for s, t, _, cd, bd, d in listed) + '</ul>'
    url = PH + '/guides'
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "CollectionPage", "@id": url, "url": url, "name": HT, "description": HD, "inLanguage": "he",
         "dateModified": "__MODIFIED__", "isPartOf": {"@id": PH + "/#website"}, "author": {"@id": PH + "/#organization"},
         "mainEntity": {"@type": "ItemList", "numberOfItems": len(listed), "itemListElement": [
             {"@type": "ListItem", "position": i, "name": t, "url": f'{PH}/guides/{s}'} for i, (s, t, *_) in enumerate(listed, 1)]}},
        c['LD_SITE'], c['LD_ORG']]}
    open(c['SRC'] + 'guides/index.html', 'w').write(c['page'](
        HT, HD, '/guides', c['static_shell']('guides', f'<p class="k">השמות של ישראל</p><h1>{SECTION}</h1>'
                                             '<p class="dlead">מדריכים, מאמרים וטיפים לבחירת שם, מבוססים על נתוני הלמ״ס והמחקר.</p>' + cards),
        jsonld=ld, app=False))
    return ['/guides'] + paths, [(s, t, d) for s, t, d, *_ in listed]
