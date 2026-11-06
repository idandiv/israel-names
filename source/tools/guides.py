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
      <!--shared:<key>-->     names of shared[<key>].sex given in Y1 to at least SHARED_MIN babies of the Jewish sector and SHARED_MIN of
                              the Arab sectors (Muslim, Christian-Arab and Druze together), with Y1 by sector; every such name must be in
                              names or other
      <!--era:<key>-->        era[<key>].names of era[<key>].sex in ERA_YEARS and Y1, checked by kind: classic (ERA_MIN babies or more in
                              each of those years) or rising (fewer than MIN_BABIES in ERA_YEARS, ERA_MIN or more in Y1)
      <!--month:<month>-->    the names of that Hebrew month (months in data/pregnancy.json), most given first
      <!--holiday:<id>-->     a holiday of holidays in data/pregnancy.json: its name, date, note and names (each given to at least
                              20 babies of a sex in Y1); a guide with one month or holiday marker needs all of them
      {{name:<name>}}         link to the name page (in FAQ answers: the name only)
      {{count:<name>:<s>}}    babies of sex s (0 girls, 1 boys) given the name in Y1
      {{countin:<name>:<s>:<year>}}  the same in another year
      {{first:<name>:<s>}}    the first year the name was given to babies of sex s
      {{peak:<name>:<s>}} {{peakn:<name>:<s>}}  the year the name was most given to babies of sex s, and how many
      {{none:<name>:<s>}}     prints nothing; checks the name is not in the Y1 data for sex s (fewer than 5 babies per sector)
      {{girls:<name>:<from>:<to>}}  the share of girls among the babies given the name in those years ("63%")
      {{mostly:<name>:<s>:<sector>}}  prints nothing; checks that most babies of sex s ever given the name are of that CBS sector
      {{sector:<name>:<s>:<sector>}}  babies of sex s of that CBS sector given the name in Y1 (at least 5)
      {{share:<end>:<s>:<year>}}  the share of babies of sex s whose name ends with <end> ("11.4%")
      {{top:<end>:<s>:<year>:<name>}}  link to <name>, checked to be the most common name ending with <end> that year
                              for each sex in <s> ("0,1": for girls and for boys)
      {{Y0}} {{Y1}}           first and last year of the data (a <year> argument can also be Y0 or Y1)
Every name in a guide is checked: it exists, and a pair name was given to at least 20 babies of that sex in Y1,
most of them of that sex (with "different_start": true, two names that do not start with the same letter); a list or forms name to at least 20 babies of that sex in Y1. A names list with ends must sort
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
SHARED_MIN = 20                     # shared names: babies in Y1 in the Jewish sector, and in the Arab sectors
ERA_YEARS, ERA_MIN = (1984, 2004), 150   # names of an era: the years shown before Y1, and babies needed in each (classic)
ARAB = ('Muslim', 'Christian-Arab', 'Druze')
# marker kind -> the guide's data it shows: every key of that data needs its <!--kind:key--> marker in the body
BLOCKS = {'pairs': 'pairs', 'names': 'lists', 'forms': 'forms', 'switch': 'switch', 'faded': 'faded', 'new': 'new', 'shared': 'shared', 'era': 'era'}
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


def heb_day(d):
    """1-30 in Hebrew letters: 1 א׳, 15 ט״ו, 16 ט״ז, 25 כ״ה"""
    assert 1 <= d <= 30
    t, o = divmod(d, 10)
    s = ('', 'י', 'כ', 'ל')[t] + ' אבגדהוזחט'[o].strip()
    s = {'יה': 'טו', 'יו': 'טז'}.get(s, s)
    return s + '׳' if len(s) == 1 else s[:-1] + '״' + s[-1]


# ---- covers: a drawing for every guide (hub card, top of the article), inline SVG built from the guide's own names ----
# cover: {"motif": a key of MOTIFS, "tone": a colour token of base.css, "names": 4-7 names of the guide, all in the data}
TONES = ('accent', 'stamp', 'c3', 'c4', 'girl', 'boy')
COVER_NAMES = (4, 7)
CW, CH = 640, 360   # the cover's viewBox, 16:9


def _txt(x, y, size, n, cls='cv-n', extra=''):
    return f'<text x="{x}" y="{y}" font-size="{size}" text-anchor="middle" class="{cls}"{extra}>{H.escape(n)}</text>'


def _calendar(N):
    """the Hebrew year as a ring of 12 months, the first name inside it, the rest beside it"""
    import math
    cx, cy, r = 190, 180, 120
    dots = ''
    for i in range(12):
        a = -math.pi / 2 + i * math.pi / 6
        x, y = cx + r * math.cos(a), cy + r * math.sin(a)
        dots += (f'<circle cx="{x:.1f}" cy="{y:.1f}" r="11" class="cv-t"/>' if i in (0, 3, 6, 8)
                 else f'<circle cx="{x:.1f}" cy="{y:.1f}" r="6" class="cv-t" opacity=".4"/>')
    ring = f'<circle cx="{cx}" cy="{cy}" r="{r}" class="cv-s" stroke-width="1.5" opacity=".35"/>' \
           f'<circle cx="{cx}" cy="{cy}" r="{r - 34}" class="cv-s" stroke-width="1" stroke-dasharray="2 7" opacity=".45"/>'
    side = ''.join(_txt(470, y, s, n, 'cv-n' if i % 2 == 0 else 'cv-n cv-tn')
                   for i, (n, y, s) in enumerate(zip(N[1:5], (98, 168, 238, 308), (66, 54, 60, 50))))
    return ring + dots + _txt(cx, cy + 26, 78, N[0]) + side


def _mirror(N):
    """twins: two names side by side, reflected as in water, and two more pairs under them"""
    a, b = N[0], N[1]
    top = _txt(462, 172, 104, a) + _txt(178, 172, 104, b, 'cv-n cv-tn')
    refl = f'<g transform="translate(0 362) scale(1 -1)" opacity=".13">{top}</g>'
    axis = f'<line x1="320" y1="44" x2="320" y2="300" class="cv-s" stroke-width="1.5" stroke-dasharray="3 8" opacity=".5"/>' \
           f'<circle cx="320" cy="34" r="5" class="cv-t"/><line x1="40" y1="190" x2="600" y2="190" class="cv-s" stroke-width="1" opacity=".22"/>'
    pairs = ''.join(_txt(x, 330, 32, f'{p} · {q}', 'cv-m') for x, (p, q) in zip((462, 178), zip(N[2::2], N[3::2])))
    return axis + refl + top + pairs


def _fade(N):
    """names that faded: a line that peaks and falls behind them, the names dimmer and dimmer"""
    pts = [(0, 330), (80, 316), (160, 270), (230, 150), (280, 90), (330, 120), (400, 220), (480, 290), (560, 318), (640, 326)]
    line = ' '.join(f'{x},{y}' for x, y in reversed([(CW - x, y) for x, y in pts]))
    chart = (f'<polygon points="{CW},{CH} {line} 0,{CH}" class="cv-t" opacity=".07"/>'
             f'<polyline points="{line}" class="cv-s" stroke-width="2.5" stroke-linejoin="round" opacity=".55"/>')
    spots = ((520, 128), (320, 128), (120, 128), (520, 262), (320, 262), (120, 262))
    names = ''.join(_txt(x, y, 70, n, extra=f' opacity="{o}"') for (x, y), n, o in zip(spots, N, (1, .78, .58, .42, .28, .17)))
    return chart + names


def _names(N):
    """the default: the guide's names set like a poster, a few dots of the tone"""
    spots = ((468, 122, 82, 'cv-n'), (190, 112, 58, 'cv-n cv-tn'), (330, 210, 66, 'cv-n'), (528, 282, 52, 'cv-n cv-tn'),
             (150, 262, 70, 'cv-n cv-dim'), (360, 322, 44, 'cv-m'), (80, 320, 0, ''))
    out = ''.join(_txt(x, y, s, n, cls) for (x, y, s, cls), n in zip(spots, N) if s)
    dots = ''.join(f'<circle cx="{x}" cy="{y}" r="{r}" class="cv-t" opacity="{o}"/>'
                   for x, y, r, o in ((96, 64, 6, .9), (590, 56, 4, .6), (612, 196, 8, .35), (40, 180, 3, .7), (250, 300, 5, .5)))
    return dots + out


MOTIFS = {'calendar': _calendar, 'mirror': _mirror, 'fade': _fade, 'names': _names}


def check_cover(g, need):
    C = g.get('cover')
    assert C, f'guides: {g["slug"]} has no cover (cover: motif, tone, names)'
    assert C.get('motif') in MOTIFS, f'guides: {g["slug"]}: cover motif {C.get("motif")} is not one of {" ".join(MOTIFS)}'
    assert C.get('tone') in TONES, f'guides: {g["slug"]}: cover tone {C.get("tone")} is not one of {" ".join(TONES)}'
    N = C.get('names') or []
    assert COVER_NAMES[0] <= len(N) <= COVER_NAMES[1] and len(set(N)) == len(N), \
        f'guides: {g["slug"]}: a cover needs {COVER_NAMES[0]}-{COVER_NAMES[1]} different names'
    for n in N:
        need(n, f'{g["slug"]} cover')


def cover_svg(g, uid=''):
    """the cover of guide g; uid tells two drawings of the same guide on one page apart (the gradient's id)"""
    C = g['cover']
    gid = f'cg-{g["slug"]}{uid}'
    bg = (f'<defs><radialGradient id="{gid}" cx="88%" cy="6%" r="95%">'
          f'<stop offset="0" style="stop-color:var(--{C["tone"]});stop-opacity:.34"/>'
          f'<stop offset=".7" style="stop-color:var(--{C["tone"]});stop-opacity:0"/></radialGradient></defs>'
          f'<rect width="{CW}" height="{CH}" class="cv-bg"/><rect width="{CW}" height="{CH}" fill="url(#{gid})"/>')
    return (f'<svg class="cover" viewBox="0 0 {CW} {CH}" preserveAspectRatio="xMidYMid slice" style="--t:var(--{C["tone"]})" aria-hidden="true" focusable="false">'
            f'{bg}{MOTIFS[C["motif"]](C["names"])}</svg>')


def build(c):
    """c: what build_site.py shares (page, static_shell, by_name, ny, YC, SN, SC, PREG, enc, fmt, short_mean, coll_list, Y0, Y1, SRC, PH, LD_*).
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
    SC = c.get('SC', {})        # babies by (name, sex, CBS sector, year)
    PREG = c.get('PREG') or {'months': [], 'holidays': []}   # data/pregnancy.json: the Hebrew months and the holidays
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
            if kind == 'sector':
                n, sx, sec = arg.split(':')
                need(n, where)
                k = SC.get((n, int(sx), sec, Y1), 0)
                assert k, f'guides: {where}: {n} was not given to {SEX_HE[int(sx)]} babies of the {sec} sector in {Y1}'
                return fmt(k)
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

    def shared(g, key):
        """names given in Y1 in the Jewish sector and in the Arab sectors, with the babies of each sector"""
        W = g['shared'][key]
        s, where = W['sex'], f'{g["slug"]} shared {key}'
        sec = lambda n, t: SC.get((n, s, t, Y1), 0)

        def fits(n):
            return sec(n, 'Jewish') >= SHARED_MIN and sum(sec(n, t) for t in ARAB) >= SHARED_MIN
        complete(where, W['names'], W.get('other', []), fits)
        rows = sorted(W['names'], key=lambda n: -ny(by_name[n], s))
        num = lambda k: fmt(k) if k else '–'
        body = ''.join(f'<tr>{name_td(n)}' + ''.join(f'<td class="gv">{num(sec(n, t))}</td>' for t in ('Jewish', *ARAB)) + '</tr>' for n in rows)
        return ('<table class="gtbl gvals gsec"><thead><tr><th scope="col">השם</th><th scope="col">יהודים</th><th scope="col">מוסלמים</th>'
                f'<th scope="col">ערבים נוצרים</th><th scope="col">דרוזים</th></tr></thead><tbody>{body}</tbody></table>')

    def era(g, key):
        """names that were given as much 40 years ago as today (classic), or that were barely given 20 years ago (rising)"""
        W = g['era'][key]
        s, kind, where = W['sex'], W['kind'], f'{g["slug"]} era {key}'
        years = (*ERA_YEARS, Y1)
        assert len(set(W['names'])) == len(W['names']), f'guides: a name twice in {where}'
        for n in W['names']:
            need(n, where)
            k = [YC.get((n, s, y), 0) for y in years]
            ok = {'classic': min(k) >= ERA_MIN, 'rising': max(k[:-1]) < MIN_BABIES and k[-1] >= ERA_MIN}[kind]
            assert ok, f'guides: {n} in {where} ({kind}): {dict(zip(years, k))}'
        rows = sorted(W['names'], key=lambda n: -YC.get((n, s, Y1), 0))
        num = lambda k: fmt(k) if k else 'פחות מ-5'
        body = ''.join(f'<tr>{name_td(n)}' + ''.join(f'<td class="gv">{num(YC.get((n, s, y), 0))}</td>' for y in years) + '</tr>' for n in rows)
        kids = 'בנות' if s == 0 else 'בנים'
        return ('<table class="gtbl gvals"><thead><tr><th scope="col">השם</th>' + ''.join(f'<th scope="col">{kids} ב-{y}</th>' for y in years)
                + f'</tr></thead><tbody>{body}</tbody></table>')

    def month(m, where):
        M = next((x for x in PREG['months'] if x['month'] == m), None)
        assert M, f'guides: {where}: {m} is not a month of pregnancy.json'
        for n in M['names']:
            need(n, where)
        return c['coll_list'](sorted((by_name[n] for n in M['names']), key=lambda x: -born(x, 'both')), lambda x: show(x, 'both') or 'פחות מ-5')

    def holiday(h, where):
        D = next((x for x in PREG['holidays'] if x['id'] == h), None)
        assert D, f'guides: {where}: {h} is not a holiday of pregnancy.json'
        for n in D['names']:
            x = need(n, where)
            assert max(ny(x, 0), ny(x, 1)) >= MIN_BABIES, f'guides: {n} ({where}, {D["name"]}) was given to fewer than {MIN_BABIES} babies of each sex in {Y1}'
        date = f'{heb_day(D["day"])} ב{D["month"]}' + (f' · {D["len"]} ימים' if D['len'] > 1 else '')
        rows = sorted((by_name[n] for n in D['names']), key=lambda x: -born(x, 'both'))
        return (f'<h3 id="{e(h)}">{e(D["name"])}</h3><p class="k">{date}</p><p>{e(D["note"])}</p>'
                + c['coll_list'](rows, lambda x: show(x, 'both')))

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
                assert not g.get('different_start') or a[0] != b[0], f'guides: {a} and {b} start with the same letter ({where})'
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
    def minutes(html):
        """reading time: the words of the page (tables included), 180 a minute"""
        words = len(re.sub(r'<[^>]+>', ' ', html).split())
        return max(1, -(-words // 180))

    def linked(html):
        """the names the page links to"""
        return set(re.findall(r'href="/names/([^"#?]+)"', html))

    for g in G:
        check_cover(g, need)
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
        body = re.sub(r'<!--shared:([\w-]+)-->', lambda m: shared(g, m.group(1)), body)
        body = re.sub(r'<!--era:([\w-]+)-->', lambda m: era(g, m.group(1)), body)
        # the calendar: every month and every holiday once, or none
        ms, hs = re.findall(r'<!--month:([\w-]+)-->', body), re.findall(r'<!--holiday:([\w-]+)-->', body)
        if ms or hs:
            assert sorted(ms) == sorted(x['month'] for x in PREG['months']), f'guides: {slug} needs one <!--month:...--> marker for each month'
            assert sorted(hs) == sorted(x['id'] for x in PREG['holidays']), f'guides: {slug} needs one <!--holiday:...--> marker for each holiday'
        body = re.sub(r'<!--month:([\w-]+)-->', lambda m: month(m.group(1), slug), body)
        body = re.sub(r'<!--holiday:([\w-]+)-->', lambda m: holiday(m.group(1), slug), body)
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
        listed.append({'g': g, 'date': date_he(g.get('updated') or g['published']), 'min': minutes(body + faq_html), 'names': linked(body)})

    # the hub: the newest guide first and wide, then a grid; a cover, badge, title, summary, reading time and names for each,
    # and buttons that filter by badge (guides.mjs; without JavaScript they stay hidden and every guide shows)
    HT, HD = 'מדריכים ומאמרים לבחירת שם לתינוק | השמות של ישראל', 'מדריכים, מאמרים וטיפים לבחירת שם לתינוק, מבוססים על נתוני הלמ״ס: שמות לתאומים ועוד, עם הפירוש והפופולריות של כל שם.'

    def card(x, i):
        g = x['g']
        feat = ' class="gfeat"' if i == 0 else ''
        return (f'<li data-t="{e(g["badge"])}"{feat}><a href="/guides/{g["slug"]}">'
                f'<span class="gcv">{cover_svg(g)}</span><span class="gtx"><span class="gbadge">{e(g["badge"])}</span><b>{e(g["h1"])}</b>'
                f'<span class="gsum">{e(g["card"])}</span><span class="gfoot"><span class="gfacts">{x["min"]} דק׳ קריאה · {len(x["names"])} שמות</span>'
                f'<span class="gdate">{x["date"]}</span>{c["arrow"]}</span></span></a></li>')
    badges = {}
    for x in listed:
        badges[x['g']['badge']] = badges.get(x['g']['badge'], 0) + 1
    filt = ('<div class="gfilt" role="group" aria-label="סינון לפי נושא" hidden><button type="button" aria-pressed="true" data-t="">הכל '
            f'<span>{len(listed)}</span></button>' + ''.join(f'<button type="button" aria-pressed="false" data-t="{e(b)}">{e(b)} <span>{k}</span></button>'
                                                          for b, k in sorted(badges.items(), key=lambda t: -t[1])) + '</div>')
    cards = filt + '<ul class="gcards">' + ''.join(card(x, i) for i, x in enumerate(listed)) + '</ul>'
    all_names = set().union(*(x['names'] for x in listed)) if listed else set()
    stats = f'<p class="gstats"><b>{len(listed)}</b> מדריכים · <b>{len(all_names):,}</b> שמות · נתוני הלמ״ס {Y0}–{Y1}</p>'
    js = c['hashed']('guides', 'js', open(S + 'app/guides.mjs', encoding='utf-8').read())
    url = PH + '/guides'
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "CollectionPage", "@id": url, "url": url, "name": HT, "description": HD, "inLanguage": "he",
         "dateModified": "__MODIFIED__", "isPartOf": {"@id": PH + "/#website"}, "author": {"@id": PH + "/#organization"},
         "mainEntity": {"@type": "ItemList", "numberOfItems": len(listed), "itemListElement": [
             {"@type": "ListItem", "position": i, "name": x['g']['title'], "url": f'{PH}/guides/{x["g"]["slug"]}'} for i, x in enumerate(listed, 1)]}},
        c['LD_SITE'], c['LD_ORG']]}
    open(c['SRC'] + 'guides/index.html', 'w').write(c['page'](
        HT, HD, '/guides', c['static_shell']('guides', f'<p class="k">השמות של ישראל</p><h1>{SECTION}</h1>'
                                             '<p class="dlead">מדריכים, מאמרים וטיפים לבחירת שם, מבוססים על נתוני הלמ״ס והמחקר.</p>'
                                             f'{stats}{cards}<script type="module" src="{js}"></script>', wide=True),
        jsonld=ld, app=False))
    return ['/guides'] + paths, [(x['g']['slug'], x['g']['title'], x['g']['desc']) for x in listed]
