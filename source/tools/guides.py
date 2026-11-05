"""Guides: long articles at /guides/<slug> and the /guides hub, built by build_site.py (static pages without the app).

Sources:
  data/guides.json            the guides, in hub order: slug, title (without the site suffix), h1, desc, card (hub text), badge (hub tag),
                              published (YYYY-MM-DD), optional updated, faq [[q, a]], and per-guide data (pairs, lists, forms, trend)
  content/guides/<slug>.html  the article body, an HTML fragment with these markers:
      <!--toc-->              table of contents of the <h2 id="..."> headings
      <!--pairs:<group>-->    the pair tables of pairs[<group>] (girls, boys, mixed)
      <!--names:<key>-->      a ranked list of lists[<key>] for one sex (sex 0 or 1) or both ("both"); optional checks: ends (endings, with other),
                              without (letters no name may have), origins (allowed origins); en: true shows the English spelling
      <!--forms:<key>-->      a table of forms[<key>].rows, [name, its international form], for one sex
      <!--trend-->            the share of babies with each ending of trend.cols, in trend.years and Y1
      <!--switch:<key>-->     the girls' share of switch[<key>].names in the two periods of the guide's "periods" ([[1980, 1999], [2015, 2024]]),
                              checked by dir: girls (up by SWITCH_PTS points or more), boys (down by as much), stable (35-65% in both, moved
                              less than 15), spelling (one spelling, two names: moved SWITCH_PTS or more either way); every name needs
                              SWITCH_MIN babies in each period
      <!--faded:<key>-->      names of faded[<key>].sex that peaked in faded[<key>].decade with FADED_PEAK babies or more and were given
                              in Y1 to at most 5% of that; every such name must be in names (listed) or other (left out)
      <!--new:<key>-->        names first seen in NEW_FROM or later (either sex), given to at least 20 babies of new[<key>].sex in Y1,
                              of the Jewish sector or not (arab: true); every such name must be in names or other
      {{name:<name>}}         link to the name page (in FAQ answers: the name only)
      {{count:<name>:<s>}}    babies of sex s (0 girls, 1 boys) given the name in Y1
      {{countin:<name>:<s>:<year>}}  the same in another year
      {{first:<name>:<s>}}    the first year the name was given to babies of sex s
      {{peak:<name>:<s>}} {{peakn:<name>:<s>}}  the year the name was most given to babies of sex s, and how many
      {{none:<name>:<s>}}     prints nothing; checks the name is not in the Y1 data for sex s (fewer than 5 babies per sector)
      {{girls:<name>:<from>:<to>}}  the share of girls among the babies given the name in those years ("63%")
      {{mostly:<name>:<s>:<sector>}}  prints nothing; checks that most babies of sex s ever given the name are of that CBS sector
      {{share:<end>:<s>:<year>}}  the share of babies of sex s whose name ends with <end> ("11.4%")
      {{top:<end>:<s>:<year>:<name>}}  link to <name>, checked to be the most common name ending with <end> that year
                              for each sex in <s> ("0,1": for girls and for boys)
      {{Y0}} {{Y1}}           first and last year of the data (a <year> argument can also be Y0 or Y1)
Every name in a guide is checked: it exists, and a pair name was given to at least 20 babies of that sex in Y1,
most of them of that sex; a list or forms name to at least 20 babies of that sex in Y1. A names list with ends must sort
every name with its ending and at least 20 babies of that sex in Y1 into names (listed) or other (left out), so a new
name in the data stops the build until it is sorted.
A failed check stops the build, like meanings.py.
"""
import json, os, re, html as H

S = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..') + '/'
GROUPS = {'girls': (0, 0), 'boys': (1, 1), 'mixed': (0, 1)}  # sexes of the first and second name
SEX_HE = {0: 'בת', 1: 'בן'}
MIN_BABIES = 20
SWITCH_PTS, SWITCH_MIN = 25, 150   # gender switch: points moved, and babies needed in each period
FADED_PEAK = 400                    # faded names: babies in the peak year
NEW_FROM = 2010                     # new names: the first year in the data
# marker kind -> the guide's data it shows: every key of that data needs its <!--kind:key--> marker in the body
BLOCKS = {'pairs': 'pairs', 'names': 'lists', 'forms': 'forms', 'switch': 'switch', 'faded': 'faded', 'new': 'new'}
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
    """c: what build_site.py shares (page, static_shell, by_name, ny, YC, enc, fmt, short_mean, coll_list, Y0, Y1, SRC, PH, LD_*).
    Writes src/guides/; returns (paths for the sitemap, [(slug, title, desc)] for llms.txt and the hub)."""
    G = load()
    by_name, ny, enc, fmt, Y0, Y1, PH = c['by_name'], c['ny'], c['enc'], c['fmt'], c['Y0'], c['Y1'], c['PH']
    e = H.escape
    os.makedirs(c['SRC'] + 'guides', exist_ok=True)

    def need(n, where):
        assert n in by_name, f'guides: {n} ({where}) is not in the data'
        return by_name[n]

    # babies by (name, sex, year) from the CBS file; the shares count every name in it, also names without a page
    YC, SN = c['YC'], c['SN']   # SN: babies by (name, sex, CBS sector), all years
    born_all = {}
    for (n, s, _), k in SN.items():
        born_all[(n, s)] = born_all.get((n, s), 0) + k
    year = lambda y: Y0 if y == 'Y0' else Y1 if y == 'Y1' else int(y)
    total = {}
    for (n, s, y), k in YC.items():
        total[(s, y)] = total.get((s, y), 0) + k

    def ending(end, s, y):
        """[(babies, name)] of sex s in year y whose name ends with end, most first"""
        return sorted(((k, n) for (n, sx, yy), k in YC.items() if sx == s and yy == y and n.endswith(end)), reverse=True)

    def share(end, s, y):
        return f'{100 * sum(k for k, _ in ending(end, s, y)) / total[(s, y)]:.1f}%'

    def peak(n, s, where):
        need(n, where)
        return max(range(Y0, Y1 + 1), key=lambda y: (YC.get((n, s, y), 0), -y))

    def first(n, s, where):
        need(n, where)
        ys = [y for y in range(Y0, Y1 + 1) if YC.get((n, s, y))]
        assert ys, f'guides: {n} ({where}) was never given to a {SEX_HE[s]}'
        return str(ys[0])

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
            if kind == 'countin':
                n, sx, y = arg.split(':')
                need(n, where)
                return fmt(YC.get((n, int(sx), year(y)), 0))
            if kind == 'first':
                n, sx = arg.split(':')
                return first(n, int(sx), where)
            if kind in ('peak', 'peakn'):
                n, sx = arg.split(':')
                y = peak(n, int(sx), where)
                return str(y) if kind == 'peak' else fmt(YC.get((n, int(sx), y), 0))
            if kind == 'none':
                n, sx = arg.split(':')
                assert not ny(need(n, where), int(sx)), f'guides: {where} says {n} is not in the {Y1} data, but it was given to {ny(by_name[n], int(sx))}'
                return ''
            if kind == 'girls':
                n, a, b = arg.split(':')
                return f'{round(girls(n, year(a), year(b), where))}%'
            if kind == 'mostly':
                n, sx, sec = arg.split(':')
                need(n, where)
                k = {t: SN[(n, int(sx), t)] for t in ('Jewish', 'Muslim', 'Christian-Arab', 'Druze') if (n, int(sx), t) in SN}
                assert k and max(k, key=k.get) == sec, f'guides: {where} says most {SEX_HE[int(sx)]} babies named {n} are {sec}: {k}'
                return ''
            if kind == 'share':
                end, sx, y = arg.split(':')
                return share(end, int(sx), year(y))
            if kind == 'top':
                end, sxs, y, n = arg.split(':')
                for sx in sxs.split(','):
                    top = next(t for _, t in ending(end, int(sx), year(y)) if t in by_name)
                    assert top == n, f'guides: {where}: the most common {SEX_HE[int(sx)]} name ending with {end} in {year(y)} is {top}, not {n}'
                need(n, where)
                return f'<a href="/names/{enc(n)}">{e(n)}</a>' if as_html else n
            raise AssertionError(f'guides: unknown marker {{{{{kind}}}}} in {where}')
        out = re.sub(r'\{\{(\w+)(?::([^}]+))?\}\}', one, s)
        assert '{{' not in out, f'guides: unfilled marker in {where}'
        return out

    def girls(n, a, b, where):
        """the share of girls among the babies given the name in years a to b (at least SWITCH_MIN babies)"""
        need(n, where)
        k = [sum(YC.get((n, s, y), 0) for y in range(a, b + 1)) for s in (0, 1)]
        assert sum(k) >= SWITCH_MIN, f'guides: {n} ({where}) was given to {sum(k)} babies in {a}-{b}, fewer than {SWITCH_MIN}'
        return 100 * k[0] / sum(k)

    def peak_year(n, s):
        return max(range(Y0, Y1 + 1), key=lambda y: (YC.get((n, s, y), 0), -y))

    def first_any(n):
        return min(y for s in (0, 1) for y in range(Y0, Y1 + 1) if YC.get((n, s, y)))

    def complete(where, listed, other, fits):
        """every name of the data that fits a list is either listed or left out on purpose (other), and no other name is there"""
        assert not set(listed) & set(other) and len(set(listed)) == len(listed), f'guides: a name twice in {where}'
        for n in listed:
            need(n, where)
            assert fits(n), f'guides: {n} does not fit {where}'
        missing = [n for n in by_name if fits(n) and n not in listed and n not in other]
        assert not missing, f'guides: {where}: sort into names or other: {" ".join(missing)}'

    def mean_span(x):
        m = c['short_mean'](x)
        return f'<span class="cm">{e(m)}</span>' if m else ''

    def name_td(n):
        return f'<td><a href="/names/{enc(n)}">{e(n)}</a>{mean_span(by_name[n])}</td>'

    # girls and boys on two lines, so a narrow column does not break a number from its word
    both = lambda x: ''.join(f'<span class="gl">{babies(x, t)}</span>' for t in (0, 1) if ny(x, t)) or 'פחות מ-5'

    def switch(g, key):
        W = g['switch'][key]
        (a1, b1), (a2, b2) = g['periods']
        where = f'{g["slug"]} switch {key}'
        assert len(set(W['names'])) == len(W['names']), f'guides: a name twice in {where}'
        rows = []
        for n in W['names']:
            p1, p2 = girls(n, a1, b1, where), girls(n, a2, b2, where)
            ok = {'girls': p2 - p1 >= SWITCH_PTS, 'boys': p1 - p2 >= SWITCH_PTS, 'spelling': abs(p2 - p1) >= SWITCH_PTS,
                  'stable': 35 <= p1 <= 65 and 35 <= p2 <= 65 and abs(p2 - p1) < 15}[W['dir']]
            assert ok, f'guides: {n} in {where} ({W["dir"]}): {p1:.0f}% girls in {a1}-{b1}, {p2:.0f}% in {a2}-{b2}'
            rows.append((abs(p2 - p1) if W['dir'] != 'stable' else -abs(p2 - p1), n, p1, p2))
        body = ''.join(f'<tr>{name_td(n)}<td class="gv">{round(p1)}%</td><td class="gv">{round(p2)}%</td><td class="gv">{both(by_name[n])}</td></tr>'
                       for _, n, p1, p2 in sorted(rows, reverse=True))
        return (f'<table class="gtbl gvals"><thead><tr><th scope="col">השם</th><th scope="col">בנות ב-{a1}–{b1}</th>'
                f'<th scope="col">בנות ב-{a2}–{b2}</th><th scope="col">ב-{Y1}</th></tr></thead><tbody>{body}</tbody></table>')

    def faded(g, key):
        F = g['faded'][key]
        s, dec, where = F['sex'], F['decade'], f'{g["slug"]} faded {key}'

        def fits(n):
            y = peak_year(n, s)
            return dec <= y < dec + 10 and YC.get((n, s, y), 0) >= FADED_PEAK and YC.get((n, s, Y1), 0) <= 0.05 * YC.get((n, s, y), 0)
        complete(where, F['names'], F.get('other', []), fits)
        rows = sorted(F['names'], key=lambda n: -YC.get((n, s, peak_year(n, s)), 0))
        body = ''.join(f'<tr>{name_td(n)}<td class="gv">{peak_year(n, s)}</td><td class="gv">{fmt(YC[(n, s, peak_year(n, s))])}</td>'
                       f'<td class="gv">{fmt(ny(by_name[n], s)) if ny(by_name[n], s) else "פחות מ-5"}</td></tr>' for n in rows)
        kids = 'בנות' if s == 0 else 'בנים'
        return (f'<table class="gtbl gvals"><thead><tr><th scope="col">השם</th><th scope="col">שנת השיא</th>'
                f'<th scope="col">{kids} בשיא</th><th scope="col">{kids} ב-{Y1}</th></tr></thead><tbody>{body}</tbody></table>')

    def new(g, key):
        # the Jewish sector or not: where most babies of that sex given the name were born, all years
        N = g['new'][key]
        s, arab, where = N['sex'], N.get('arab', False), f'{g["slug"]} new {key}'

        def fits(n):
            x = by_name[n]
            return (first_any(n) >= NEW_FROM and ny(x, s) >= MIN_BABIES and ny(x, s) >= ny(x, 1 - s)
                    and (2 * SN.get((n, s, 'Jewish'), 0) <= born_all.get((n, s), 0)) == arab)
        complete(where, N['names'], N.get('other', []), fits)
        rows = sorted(N['names'], key=lambda n: -ny(by_name[n], s))
        body = ''.join(f'<tr>{name_td(n)}<td class="gv">{first_any(n)}</td><td class="gv">{babies(by_name[n], s)}</td></tr>' for n in rows)
        return (f'<table class="gtbl gvals"><thead><tr><th scope="col">השם</th><th scope="col">הופיע לראשונה</th>'
                f'<th scope="col">ב-{Y1}</th></tr></thead><tbody>{body}</tbody></table>')

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

    babies = lambda x, s: f'{fmt(ny(x, s))} {"בנות" if s == 0 else "בנים"}'
    # sex "both": counted and shown for girls and boys together ("98 בנות · 166 בנים")
    born = lambda x, s: ny(x, 0) + ny(x, 1) if s == 'both' else ny(x, s)
    show = lambda x, s: ' · '.join(babies(x, t) for t in (0, 1) if ny(x, t)) if s == 'both' else babies(x, s)
    latin = lambda t: f'<span dir="ltr" lang="en">{e(t)}</span>'

    def names_list(g, key):
        L = g['lists'][key]
        s, ends = L['sex'], L.get('ends')
        where = f'{g["slug"]} list {key}'
        listed, other = L['names'], L.get('other', [])
        assert not set(listed) & set(other) and len(set(listed)) == len(listed), f'guides: a name twice in {where}'
        for n in listed:
            x = need(n, where)
            assert not ends or any(n.endswith(t) for t in ends), f'guides: {n} in {where} does not end with {"/".join(ends)}'
            assert born(x, s) >= MIN_BABIES, f'guides: {n} in {where} was given to {born(x, s)} babies of that sex in {Y1}'
            assert not set(n) & set(L.get('without', '')), f'guides: {n} in {where} has one of {L["without"]}'
            assert 'origins' not in L or x['origin'] in L['origins'], f'guides: {n} in {where} is {x["origin"] or "of no origin"}, not {"/".join(L["origins"])}'
        if ends:
            missing = [x['n'] for x in by_name.values() if any(x['n'].endswith(t) for t in ends) and born(x, s) >= MIN_BABIES
                       and x['n'] not in listed and x['n'] not in other]
            assert not missing, f'guides: {where}: sort into names or other: {" ".join(missing)}'
        rows = sorted((by_name[n] for n in listed), key=lambda x: -born(x, s))
        return c['coll_list'](rows, lambda x: (latin(x['en']) + ' · ' if L.get('en') else '') + show(x, s))

    def forms(g, key):
        """a table of names and their international forms: the name (with its spelling in English), the form, babies in Y1"""
        F = g['forms'][key]
        s, where = F['sex'], f'{g["slug"]} forms {key}'
        assert len({n for n, _ in F['rows']}) == len(F['rows']), f'guides: a name twice in {where}'
        for n, _ in F['rows']:
            assert ny(need(n, where), s) >= MIN_BABIES, f'guides: {n} in {where} was given to {ny(by_name[n], s)} babies of that sex in {Y1}'
        rows = sorted(F['rows'], key=lambda r: -ny(by_name[r[0]], s))
        body = ''.join(f'<tr><td><a href="/names/{enc(n)}">{e(n)}</a><span class="cn">{latin(by_name[n]["en"])}</span></td>'
                       f'<td class="gform">{latin(f)}</td><td class="gn">{babies(by_name[n], s)}</td></tr>' for n, f in rows)
        return (f'<table class="gtbl gforms"><thead><tr><th scope="col">השם</th><th scope="col">בעולם</th><th scope="col">ב-{Y1}</th></tr></thead>'
                f'<tbody>{body}</tbody></table>')

    def trend(g):
        T = g['trend']
        years = T['years'] + ([Y1] if Y1 not in T['years'] else [])
        head = ''.join(f'<th scope="col">{e(col["label"])}</th>' for col in T['cols'])
        rows = ''.join(f'<tr><th scope="row">{y}</th>' + ''.join(f'<td>{share(col["end"], col["sex"], y)}</td>' for col in T['cols']) + '</tr>'
                       for y in years)
        return f'<table class="gtbl gnum"><thead><tr><th scope="col">שנה</th>{head}</tr></thead><tbody>{rows}</tbody></table>'

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
        for kind, data in BLOCKS.items():
            unused = set(g.get(data, {})) - set(re.findall(rf'<!--{kind}:([\w-]+)-->', body))
            assert not unused, f'guides: {slug} has {data} data with no <!--{kind}:...--> marker: {" ".join(sorted(unused))}'
        n_pairs = 0
        for group in GROUPS:
            mark = f'<!--pairs:{group}-->'
            if mark in body:
                tables, k = pair_tables(g, group)
                body, n_pairs = body.replace(mark, tables), n_pairs + k
        assert '<!--pairs:' not in body, f'guides: {slug} has pairs markers with no data'
        body = re.sub(r'<!--names:([\w-]+)-->', lambda m: names_list(g, m.group(1)), body)
        body = re.sub(r'<!--forms:([\w-]+)-->', lambda m: forms(g, m.group(1)), body)
        body = re.sub(r'<!--switch:([\w-]+)-->', lambda m: switch(g, m.group(1)), body)
        body = re.sub(r'<!--faded:([\w-]+)-->', lambda m: faded(g, m.group(1)), body)
        body = re.sub(r'<!--new:([\w-]+)-->', lambda m: new(g, m.group(1)), body)
        assert '<!--' not in body.replace('<!--toc-->', '').replace('<!--trend-->', ''), f'guides: {slug} has an unknown block marker'
        if '<!--trend-->' in body:
            body = body.replace('<!--trend-->', trend(g))
        body = body.replace('<!--toc-->', toc(body))
        # the page shows the answers with name links, the FAQPage node the same text without them
        faq = [(fill(q, slug, False), fill(a, slug, False)) for q, a in g.get('faq', [])]
        faq_html = ('<h2 id="faq">שאלות נפוצות</h2>' + ''.join(
            f'<h3>{e(fill(q, slug, False))}</h3><p>{fill(a, slug)}</p>' for q, a in g['faq'])) if faq else ''
        # the other guides, so every guide links to the rest (not in the table of contents: the h2 has no id)
        more = [o for o in G if o is not g]
        more_html = ('<h2>עוד מדריכים</h2><ul>' + ''.join(f'<li><a href="/guides/{o["slug"]}">{e(o["h1"])}</a>: {e(o["card"])}</li>' for o in more)
                     + '</ul>') if more else ''
        dates = f'פורסם ב-{date_he(g["published"])}' + (f' · עודכן ב-{date_he(g["updated"])}' if g.get('updated') else '')
        inner = (f'<p class="k"><a href="/guides">{SECTION}</a> · השמות של ישראל</p><h1>{e(g["h1"])}</h1>'
                 f'<p class="gmeta">{dates} · הנתונים: הלשכה המרכזית לסטטיסטיקה, {Y0}–{Y1}</p>{body}{faq_html}{more_html}')
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
