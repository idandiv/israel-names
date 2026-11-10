"""Guides: long articles at /guides/<slug> and the /guides hub, built by build_site.py (static pages without the app).

Sources:
  data/guides.json            the guides, in hub order: slug, title (without the site suffix), h1, desc, card (hub text), badge (hub tag),
                              published (YYYY-MM-DD), optional updated, cover (see the covers below), faq [[q, a]], and per-guide data (pairs, lists, forms, trend)
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
      <!--forecast:<key>-->   a table of the names forecast (tools/forecast.py, data/forecast-<year>.json) by forecast[<key>]:
                              sector (all, Jewish), sex, kind: top (the first n, 10 by default, with the base year and the
                              Population Authority's rank; names that leave the top n are listed under it), up or down (the names
                              of 100 babies or more the forecast moves most)
      <!--backtest-->         how the same method did in earlier years (the file's backtest)
      {{fc:<name>:<s>:<sector>}} {{fcbase:<name>:<s>:<sector>}}  the forecast for the name, and its babies in the base year
      {{pa:<name>:<s>:<sector>}}  babies in the Population Authority's 2025 list (data/pa.json), checked to be in it
      {{bt:<key>}}            the backtest in one number: top (names of the real top 10 in the forecast's, on average), model and
                              naive (the median error, %), up and down (rising and falling names that went that way, %)
Every name in a guide is checked: it exists, and a pair name was given to at least 20 babies of that sex in Y1,
most of them of that sex (with "different_start": true, two names that do not start with the same letter); a list or forms name to at least 20 babies of that sex in Y1. A names list with ends must sort
every name with its ending and at least 20 babies of that sex in Y1 into names (listed) or other (left out), so a new
name in the data stops the build until it is sorted.
A failed check stops the build, like meanings.py.
"""
import json, os, re, html as H
import forecast

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
BLOCKS = {'pairs': 'pairs', 'names': 'lists', 'forms': 'forms', 'switch': 'switch', 'faded': 'faded', 'new': 'new', 'shared': 'shared', 'era': 'era',
          'forecast': 'forecast'}
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


# ---- covers: a drawing for every guide (hub card, top of the article), inline SVG built from the guide's own names and data ----
# cover: {"motif": a key of MOTIFS, "tone": a colour token of base.css, "names": names the guide links to, on no other cover},
# and by motif: calendar "holidays" (ids in data/pregnancy.json, one per name), script "arabic" (the spelling of each name),
# fade "sex" (for the peak year). Numbers on a cover come from the data, like the numbers in the articles.
TONES = ('accent', 'stamp', 'c3', 'c4', 'girl', 'boy')
CW, CH = 640, 360   # the cover's viewBox, 16:9
# In the drawing's right-to-left text, anchor "start" is the right edge of the text and "end" the left edge.


def _t(x, y, size, s, cls='cv-n', anchor='middle', extra=''):
    return f'<text x="{x}" y="{y}" font-size="{size}" text-anchor="{anchor}" class="{cls}"{extra}>{H.escape(str(s))}</text>'


def _calendar(g, D):
    """tear-off calendar pages: the real date of each holiday, and a name of that holiday"""
    out = ''
    for i, (n, h, rot) in enumerate(zip(g['cover']['names'], g['cover']['holidays'], (2.5, -2, 1.5, -3))):
        day = D['holiday'](h)
        x, y = 468 - i * 148, 58 + (8 if i % 2 else 0)
        out += (f'<g transform="rotate({rot} {x + 66} {y + 118})"><rect x="{x}" y="{y}" width="132" height="236" rx="12" class="cv-leaf"/>'
                f'<path d="M{x} {y + 46}V{y + 12}a12 12 0 0 1 12-12h108a12 12 0 0 1 12 12v34z" class="cv-t"/>'
                + _t(x + 66, y + 31, 22, day['month'], 'cv-l cv-on') + _t(x + 66, y + 96, 42, heb_day(day['day']), 'cv-n cv-dim')
                + _t(x + 66, y + 168, 62, n) + _t(x + 66, y + 212, 19, day['name'], 'cv-l cv-lt') + '</g>')
    return out


def _script(g, D):
    """shared names: each name in Hebrew and in Arabic, face to face"""
    out = '<line x1="320" y1="30" x2="320" y2="332" class="cv-s" stroke-width="1" stroke-dasharray="3 7" opacity=".5"/>'
    for i, (n, a) in enumerate(zip(g['cover']['names'], g['cover']['arabic'])):
        y = 86 + i * 76
        out += _t(450, y, 68, n) + _t(190, y - 3, 44, a, 'cv-ar') + f'<circle cx="320" cy="{y - 20}" r="6" class="cv-t"/>'
    return out


def _height(g, D):
    """siblings: heights marked on a door frame, each mark a name"""
    out = '<rect x="566" y="22" width="30" height="316" rx="4" class="cv-cell"/>'
    for k in range(13):
        w = 18 if k % 3 == 0 else 9
        out += f'<rect x="{596 - w}" y="{34 + k * 24}" width="{w}" height="2" class="cv-tick"/>'
    for n, (y, s, x2) in zip(g['cover']['names'], ((92, 78, 120), (166, 68, 170), (232, 58, 240), (306, 50, 300))):
        out += f'<line x1="566" y1="{y}" x2="{x2}" y2="{y}" class="cv-s" stroke-width="2" opacity=".7"/>' + _t((566 + x2) // 2, y - 10, s, n)
    return out


def _switch(g, D):
    """the share of girls in each name, in the guide's two periods: an empty dot for the first, a full one for the second"""
    X = lambda p: round(60 + p * 4.3, 1)
    out = f'<line x1="{X(50)}" y1="22" x2="{X(50)}" y2="302" class="cv-s" stroke-width="1" stroke-dasharray="3 6" opacity=".5"/>'
    for i, n in enumerate(g['cover']['names']):
        a, b = D['switch'](g, n)
        y, col = 50 + i * 54, 'girl' if b > a else 'boy'
        out += (f'<line x1="{X(a)}" y1="{y}" x2="{X(b)}" y2="{y}" style="stroke:var(--{col})" stroke-width="5" stroke-linecap="round"/>'
                f'<circle cx="{X(a)}" cy="{y}" r="7" class="cv-hollow" style="stroke:var(--{col})"/><circle cx="{X(b)}" cy="{y}" r="9" style="fill:var(--{col})"/>'
                + _t(574, y + 16, 48, n))
    return (out + f'<line x1="{X(0)}" y1="312" x2="{X(100)}" y2="312" class="cv-s" stroke-width="1" opacity=".5"/>'
            + _t(X(0), 340, 17, 'בנים', 'cv-l cv-m') + _t(X(50), 340, 17, '50%', 'cv-l cv-m') + _t(X(100), 340, 17, 'בנות', 'cv-l cv-m'))


def _fade(g, D):
    """names that faded: the older the peak year, the fainter the name"""
    C = g['cover']
    rows = sorted(((D['peak'](n, C['sex']), n) for n in C['names']), reverse=True)
    out = ''
    for i, ((y, n), o) in enumerate(zip(rows, (1, .74, .54, .38, .26, .16))):
        x, yy = (520, 320, 120)[i % 3], 118 if i < 3 else 276
        out += f'<g opacity="{o}">' + _t(x, yy, 78, n) + _t(x, yy + 34, 20, f'שיא ב-{y}', 'cv-l') + '</g>'
    return out


def _timeline(g, D):
    """new names on an axis of the year each first appeared; a name too close to the one before it stands higher, on a stem"""
    years = {}
    for n in g['cover']['names']:
        years.setdefault(D['first'](n), []).append(n)
    lo, hi = min(years), max(years)
    X = lambda y: 566 - (y - lo) * 460 // max(1, hi - lo)
    out, prev = '<line x1="60" y1="306" x2="600" y2="306" class="cv-s" stroke-width="2" opacity=".7"/>', None
    for y in sorted(years):
        x, names = X(y), years[y]
        assert len(names) <= 3, f'guides: {g["slug"]}: cover: more than 3 names first seen in {y}'
        raised = prev is not None and prev - x < 110 and len(names) == 1
        base, size = (150, 84) if raised else (280, 62 if len(names) == 1 else 58)
        if raised:
            out += f'<line x1="{x}" y1="{base + 12}" x2="{x}" y2="306" class="cv-s" stroke-width="2" stroke-dasharray="2 6" opacity=".7"/>'
        out += f'<circle cx="{x}" cy="306" r="7" class="cv-t"/>' + _t(x, 342, 20, y, 'cv-l')
        out += ''.join(_t(x, base - k * 76, size, n, 'cv-n cv-tn' if k == 0 else 'cv-n') for k, n in enumerate(names))
        prev = x
    return out


def _scene(g, D):
    """nature names as a landscape; names in order: the moon, the cliff, the tree, the sea, the bird"""
    moon, cliff, tree, sea, bird = g['cover']['names']
    edge = 'l-34-16-30 26-26-8-40 56-46 18-50 62-32 50'
    wave = 'M0 298q40-22 80 0t80 0 80 0 80 0 80 0 80 0 80 0 80 0'
    return ('<path d="M120 46a44 44 0 1 0 34 72a36 36 0 1 1-34-72z" class="cv-t"/>' + _t(216, 96, 52, moon)
            + f'<path d="M640 300V112{edge}z" class="cv-soft"/><path d="M640 112{edge}" class="cv-s" stroke-width="2.5" stroke-linejoin="round"/>' + _t(566, 232, 70, cliff)
            + '<path d="M318 300V218" class="cv-s" stroke-width="5"/><circle cx="318" cy="186" r="42" class="cv-t" opacity=".85"/>'
              '<circle cx="288" cy="210" r="26" class="cv-t" opacity=".85"/><circle cx="348" cy="210" r="26" class="cv-t" opacity=".85"/>' + _t(216, 270, 58, tree)
            + f'<path d="{wave}V360H0z" class="cv-t" opacity=".3"/><path d="{wave}" class="cv-s" stroke-width="2.5"/>' + _t(320, 346, 42, sea)
            + '<path d="M410 60q14-16 28 0q14-16 28 0" class="cv-s" stroke-width="3" stroke-linecap="round"/>' + _t(438, 44, 34, bird))


def _ticket(g, D):
    """a boarding pass: each name beside its form in the world, from the guide's forms table"""
    ltr = ' direction="ltr"'
    out = ('<path d="M46 62a14 14 0 0 1 14-14h520a14 14 0 0 1 14 14v84a14 14 0 0 0 0 28v124a14 14 0 0 1-14 14H60a14 14 0 0 1-14-14V174a14 14 0 0 0 0-28z" class="cv-leaf"/>'
           '<path d="M46 62a14 14 0 0 1 14-14h520a14 14 0 0 1 14 14v18H46z" class="cv-t"/>'
           '<line x1="196" y1="96" x2="196" y2="300" class="cv-s" stroke-width="2" stroke-dasharray="4 7" opacity=".6"/>'
           + _t(320, 72, 18, 'BOARDING PASS', 'cv-l cv-on', extra=ltr)
           + _t(120, 150, 46, 'TLV', extra=ltr) + '<path d="M120 170v52m-8-10 8 12 8-12" class="cv-s" stroke-width="2.5"/>' + _t(120, 268, 46, 'NYC', 'cv-n cv-tn', extra=ltr))
    for n, y in zip(g['cover']['names'], (118, 218)):
        out += (_t(574, y, 17, 'שם', 'cv-l cv-m', 'start') + _t(574, y + 66, 74, n, 'cv-n', 'start')
                + _t(392, y, 17, 'בעולם', 'cv-l cv-m', 'start') + _t(392, y + 58, 34, D['form'](g, n), 'cv-l cv-lt', 'end', ltr))
    return out


def _endings(g, D):
    """names lined up by their ending, so the endings stand in two coloured columns"""
    out = ''
    for x, end in ((392, 'אל'), (84, 'יה')):
        out += f'<rect x="{x - 8}" y="20" width="76" height="320" rx="12" class="cv-t" opacity=".16"/>' + _t(x + 30, 54, 24, '‑' + end, 'cv-l cv-lt')
        for i, n in enumerate(m for m in g['cover']['names'] if m.endswith(end)):
            out += (f'<text x="{x}" y="{134 + i * 92}" font-size="84" text-anchor="end" class="cv-n">{H.escape(n[:-2])}'
                    f'<tspan class="cv-tn">{end}</tspan></text>')
    return out


def _mirror(g, D):
    """twins: two names side by side, reflected as in water, and two more pairs under them"""
    a, b, *more = g['cover']['names']
    top = _t(462, 172, 104, a) + _t(178, 172, 104, b, 'cv-n cv-tn')
    return ('<line x1="320" y1="44" x2="320" y2="300" class="cv-s" stroke-width="1.5" stroke-dasharray="3 8" opacity=".5"/>'
            '<line x1="40" y1="190" x2="600" y2="190" class="cv-s" stroke-width="1" opacity=".22"/>'
            f'<g transform="translate(0 362) scale(1 -1)" opacity=".15">{top}</g>{top}'
            + ''.join(_t(x, 330, 30, f'{p} · {q}', 'cv-l cv-m') for x, p, q in zip((462, 178), more[::2], more[1::2])))


def _spark(g, D):
    """a forecast: each name in a lane, its share of the babies of its sex year by year (left to right, as the charts of the
    name pages) and a dashed step to the forecast; every line is scaled to its own lowest and highest point"""
    names = g['cover']['names']
    (y0, y1), (x0, x1) = D['spark_years'](), (60, 420)
    step = (x1 - x0) / (y1 - y0)
    ltr = ' direction="ltr"'
    out = _t(x0, 44, 18, y0, 'cv-l cv-m', extra=ltr) + _t(x1, 44, 18, f'{y1}?', 'cv-l cv-lt', extra=ltr)
    for i, n in enumerate(names):
        v = D['spark'](n)
        assert len(v) == y1 - y0 + 1, f'guides: {g["slug"]} cover: {n} needs a value for each year {y0}-{y1}'
        lo, hi, mid = min(v), max(v), 90 + i * 74
        Y = lambda t: round(mid + 20 - 40 * (t - lo) / ((hi - lo) or 1), 1)
        pts = [(round(x0 + k * step, 1), Y(t)) for k, t in enumerate(v)]
        line = lambda P: ' '.join(f'{x},{y}' for x, y in P)
        out += (f'<polyline points="{line(pts[:-1])}" class="cv-s" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" fill="none"/>'
                f'<polyline points="{line(pts[-2:])}" class="cv-s" stroke-width="3" stroke-dasharray="3 7" stroke-linecap="round" fill="none"/>'
                f'<circle cx="{pts[-1][0]}" cy="{pts[-1][1]}" r="8" class="cv-t"/>'
                + _t(598, mid + 18, 50, n, 'cv-n cv-tn' if v[-1] > v[-2] else 'cv-n', 'start'))
    return out


MOTIFS = {'calendar': _calendar, 'script': _script, 'height': _height, 'switch': _switch, 'fade': _fade, 'timeline': _timeline,
          'scene': _scene, 'ticket': _ticket, 'endings': _endings, 'mirror': _mirror, 'spark': _spark}
# how many names each drawing holds
COVER_NAMES = {'calendar': (4, 4), 'script': (4, 4), 'height': (4, 4), 'switch': (5, 5), 'fade': (6, 6), 'timeline': (4, 7),
               'scene': (5, 5), 'ticket': (2, 2), 'endings': (6, 6), 'mirror': (6, 6), 'spark': (4, 4)}


def check_covers(G, need):
    """a cover for every guide, with a drawing and tone that exist, the right number of names, and no name on two covers"""
    seen = {}
    for g in G:
        slug, C = g['slug'], g.get('cover')
        assert C, f'guides: {slug} has no cover (cover: motif, tone, names)'
        assert C.get('motif') in MOTIFS, f'guides: {slug}: cover motif {C.get("motif")} is not one of {" ".join(MOTIFS)}'
        assert C.get('tone') in TONES, f'guides: {slug}: cover tone {C.get("tone")} is not one of {" ".join(TONES)}'
        N, (lo, hi) = C.get('names') or [], COVER_NAMES[C['motif']]
        assert lo <= len(N) <= hi and len(set(N)) == len(N), f'guides: {slug}: a {C["motif"]} cover needs {lo}-{hi} different names'
        for n in N:
            need(n, f'{slug} cover')
            assert n not in seen, f'guides: {n} is on the covers of {seen.get(n)} and {slug}'
            seen[n] = slug
        for key, motif in (('holidays', 'calendar'), ('arabic', 'script')):
            assert C['motif'] != motif or len(C.get(key) or []) == len(N), f'guides: {slug}: a {motif} cover needs {key}, one for each name'
        if C['motif'] == 'endings':
            for end in ('אל', 'יה'):
                assert sum(n.endswith(end) for n in N) == 3, f'guides: {slug}: an endings cover needs 3 names ending with {end}'


def cover_svg(g, D):
    """the cover of guide g; D: what the drawings read from the data (holiday, switch, peak, first, form)"""
    C = g['cover']
    gid = f'cg-{g["slug"]}'
    bg = (f'<defs><radialGradient id="{gid}" cx="88%" cy="6%" r="95%">'
          '<stop offset="0" style="stop-color:var(--t);stop-opacity:.3"/>'
          '<stop offset=".7" style="stop-color:var(--t);stop-opacity:0"/></radialGradient></defs>'
          f'<rect width="{CW}" height="{CH}" class="cv-bg"/><rect width="{CW}" height="{CH}" fill="url(#{gid})"/>')
    return (f'<svg class="cover" viewBox="0 0 {CW} {CH}" preserveAspectRatio="xMidYMid slice" style="--t:var(--{C["tone"]})" aria-hidden="true" focusable="false">'
            f'{bg}{MOTIFS[C["motif"]](g, D)}</svg>')


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
            if kind in ('fc', 'fcbase'):
                n, sx, sec = arg.split(':')
                need(n, where)
                r = fc()['forecast'].get(sec, {}).get(sx, {}).get(n)
                assert r, f'guides: {where}: no {sec} forecast for {n} ({SEX_HE[int(sx)]})'
                return fmt(r[1] if kind == 'fc' else r[0])
            if kind == 'bt':
                return bt(arg, where)
            if kind == 'pa':
                n, sx, sec = arg.split(':')
                need(n, where)
                k = dict(forecast.pa_lists()[(sec, int(sx))]).get(n)
                assert k, f'guides: {where}: {n} is not in the Population Authority {sec} list ({SEX_HE[int(sx)]})'
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

    # the forecast: the file made from the data up to its base year (checked against the data while it ends there)
    FC = {}

    def fc():
        if not FC:
            FC.update(c.get('FC') or forecast.load())
            if 'FC' not in c:
                forecast.check(FC, YC, SC, Y1)
        return FC

    def bt(key, where):
        B = list(fc()['backtest'].values())
        mean = lambda k: sum(b[k] for b in B) / len(B)
        out = {'top': lambda: f'{mean("top"):.1f}', 'model': lambda: f'{mean("model"):.1f}%', 'naive': lambda: f'{mean("naive"):.1f}%',
               'up': lambda: f'{round(10 * mean("up"))}%', 'down': lambda: f'{round(10 * mean("down"))}%'}.get(key)
        assert out, f'guides: {where}: unknown {{{{bt:{key}}}}}'
        return out()

    def fc_block(g, key):
        W, F = g['forecast'][key], fc()
        sec, s, kind, where = W.get('sector'), W.get('sex'), W.get('kind'), f'{g["slug"]} forecast {key}'
        assert sec in forecast.SECTORS and s in (0, 1) and kind in ('top', 'up', 'down'), f'guides: {where}: sector, sex or kind'
        d, by, fy = F['forecast'][sec][str(s)], F['base'], F['target']
        kids = 'בנות' if s == 0 else 'בנים'
        order = lambda i: sorted(d, key=lambda n: (-d[n][i], n))
        base_rank = {n: i for i, n in enumerate(order(0), 1)}
        if kind == 'top':
            k = W.get('n', forecast.TOP)
            top, pa = order(1)[:k], {n: i for i, (n, _) in enumerate(forecast.pa_lists()[(sec, s)], 1)}
            for n in top:
                need(n, where)
            body = ''.join(f'<tr><td><span class="grk">{i}</span><a href="/names/{enc(n)}">{e(n)}</a></td><td class="gv"><b>{fmt(d[n][1])}</b></td>'
                           f'<td class="gv">{fmt(d[n][0])}<span class="cn">מקום {base_rank[n]}</span></td><td class="gv">{pa.get(n, "–")}</td></tr>'
                           for i, n in enumerate(top, 1))
            gone = [n for n in order(0)[:k] if n not in top]
            for n in gone:
                need(n, where)
            return (f'<table class="gtbl gvals gfc"><thead><tr><th scope="col">השם</th><th scope="col">תחזית ל-{fy}</th><th scope="col">ב-{by}</th>'
                    f'<th scope="col">רשות האוכלוסין {fy}</th></tr></thead><tbody>{body}</tbody></table>'
                    + (f'<p class="k">יוצאים מה-{k} הראשונים: ' + ', '.join(f'<a href="/names/{enc(n)}">{e(n)}</a> (מקום {base_rank[n]} ב-{by})'
                                                                          for n in gone) + '</p>' if gone else ''))
        rows = forecast.movers({n: v[1] for n, v in d.items()}, lambda n: d[n][0], kind == 'up')[:W.get('n', forecast.TOP)]
        for n in rows:
            need(n, where)
        body = ''.join(f'<tr>{name_td(n)}<td class="gv">{fmt(d[n][0])}</td><td class="gv"><b>{fmt(d[n][1])}</b></td>'
                       f'<td class="gv" dir="ltr">{100 * (d[n][1] / d[n][0] - 1):+.0f}%</td></tr>' for n in rows)
        return (f'<table class="gtbl gvals"><thead><tr><th scope="col">השם</th><th scope="col">{kids} ב-{by}</th><th scope="col">תחזית ל-{fy}</th>'
                f'<th scope="col">שינוי</th></tr></thead><tbody>{body}</tbody></table>')

    def backtest_table():
        B = fc()['backtest']
        years = sorted({int(k.split(':')[0]) for k in B})
        rows = ''
        for y in years:
            a, b = B[f'{y}:0'], B[f'{y}:1']
            rows += (f'<tr><th scope="row">{y}</th><td>{a["top"] + b["top"]}/{2 * forecast.TOP}</td>'
                     f'<td>{(a["model"] + b["model"]) / 2:.1f}%</td><td>{(a["naive"] + b["naive"]) / 2:.1f}%</td>'
                     f'<td>{a["up"] + b["up"] + a["down"] + b["down"]}/{4 * forecast.TOP}</td></tr>')
        return ('<table class="gtbl gnum"><thead><tr><th scope="col">השנה</th><th scope="col">בעשיריות</th><th scope="col">סטיית התחזית</th>'
                '<th scope="col">סטייה בלי מגמה</th><th scope="col">זזו בכיוון שחזינו</th></tr></thead>'
                f'<tbody>{rows}</tbody></table>')

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

    check_covers(G, need)

    def form_of(g, n):
        """the international form of n in the guide's forms tables"""
        rows = dict(r for F in g.get('forms', {}).values() for r in F['rows'])
        assert n in rows, f'guides: {g["slug"]} cover: {n} is not in the guide\'s forms'
        return rows[n]

    def holiday_of(h):
        D_ = next((x for x in PREG['holidays'] if x['id'] == h), None)
        assert D_, f'guides: cover: {h} is not a holiday of pregnancy.json'
        return D_

    def spark_years():
        F = fc()
        return F['base'] - forecast.SPAN + 1, F['target']

    def spark_of(n):
        """the name's share of the babies of its sex (the sex of most of its babies in the base year), all sectors, in the years of
        the trend, and the forecast"""
        F = fc()
        y0, _ = spark_years()
        s = max((0, 1), key=lambda t: YC.get((n, t, F['base']), 0))
        r = F['forecast']['all'][str(s)].get(n)
        assert r, f'guides: cover: no forecast for {n}'
        return [YC.get((n, s, y), 0) / total[(s, y)] for y in range(y0, F['base'] + 1)] + [r[1] / total[(s, F['base'])]]

    DRAW = {'spark': spark_of, 'spark_years': spark_years, 'holiday': holiday_of, 'peak': peak_year, 'first': first_any, 'form': form_of,
            'switch': lambda g, n: (girls(n, *g['periods'][0], g['slug'] + ' cover'), girls(n, *g['periods'][1], g['slug'] + ' cover'))}
    for g in G:
        for n, h in zip(g['cover']['names'], g['cover'].get('holidays', [])):
            assert n in holiday_of(h)['names'], f'guides: {g["slug"]} cover: {n} is not a name of {h}'
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
        body = re.sub(r'<!--forecast:([\w-]+)-->', lambda m: fc_block(g, m.group(1)), body)
        if '<!--backtest-->' in body:
            body = body.replace('<!--backtest-->', backtest_table())
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
        for n in g['cover']['names']:
            assert f'href="/names/{enc(n)}"' in body, f'guides: {slug} cover: the guide does not link to {n}'
        listed.append({'g': g, 'path': path, 'url': url, 'title': title, 'body': body, 'faq': faq, 'faq_html': faq_html,
                       'date': date_he(g.get('updated') or g['published']), 'min': minutes(body + faq_html), 'names': linked(body)})

    def card(x, i=None):
        g = x['g']
        feat = ' class="gfeat"' if i == 0 else ''
        return (f'<li data-t="{e(g["badge"])}"{feat}><a href="/guides/{g["slug"]}">'
                f'<span class="gcv">{cover_svg(g, DRAW)}</span><span class="gtx"><span class="gbadge">{e(g["badge"])}</span><b>{e(g["h1"])}</b>'
                f'<span class="gsum">{e(g["card"])}</span><span class="gfoot"><span class="gfacts">{x["min"]} דק׳ קריאה · {len(x["names"])} שמות</span>'
                f'<span class="gdate">{x["date"]}</span>{c["arrow"]}</span></span></a></li>')

    js = c['hashed']('guides', 'js', open(S + 'app/guides.mjs', encoding='utf-8').read())
    script = f'<script type="module" src="{js}"></script>'
    for x in listed:
        g, slug, path, url, title, body, faq, faq_html = x['g'], x['g']['slug'], x['path'], x['url'], x['title'], x['body'], x['faq'], x['faq_html']
        # the other guides, so every guide links to the rest (not in the table of contents: the h2 has no id):
        # three cards, of the same badge first and then the newest, and the rest as a short list
        more = sorted((o for o in listed if o is not x), key=lambda o: o['g']['badge'] != g['badge'])
        more_html = ('<h2>עוד מדריכים</h2><ul class="gcards grel">' + ''.join(card(o) for o in more[:3]) + '</ul>'
                     + ('<ul class="gmore">' + ''.join(f'<li><a href="/guides/{o["g"]["slug"]}">{e(o["g"]["h1"])}</a></li>' for o in more[3:]) + '</ul>' if more[3:] else '')) if more else ''
        dates = f'פורסם ב-{date_he(g["published"])}' + (f' · עודכן ב-{date_he(g["updated"])}' if g.get('updated') else '')
        chips = ''.join(f'<a href="/names/{enc(n)}">{e(n)}</a>' for n in g['cover']['names'])
        inner = ('<div class="gprog" aria-hidden="true" hidden><i></i></div>'
                 f'<p class="k"><a href="/guides">{SECTION}</a> · השמות של ישראל</p><span class="gbadge">{e(g["badge"])}</span><h1>{e(g["h1"])}</h1>'
                 f'<p class="gmeta">{dates} · {x["min"]} דק׳ קריאה · {len(x["names"])} שמות · הנתונים: הלשכה המרכזית לסטטיסטיקה, {Y0}–{Y1}</p>'
                 f'<div class="ghero">{cover_svg(g, DRAW)}</div><p class="cgc gchips">{chips}</p>{body}{faq_html}{more_html}{script}')
        ld = {"@context": "https://schema.org", "@graph": [
            {"@type": "WebPage", "@id": url, "url": url, "name": title, "description": g['desc'], "inLanguage": "he",
             "isPartOf": {"@id": PH + "/#website"}, "breadcrumb": {"@id": url + "#breadcrumb"}, "mainEntity": {"@id": url + "#article"}},
            {"@type": "Article", "@id": url + "#article", "headline": g['title'], "description": g['desc'], "inLanguage": "he",
             "datePublished": g['published'], "dateModified": "__MODIFIED__", "image": PH + f'/og/guides/{slug}.png',
             "author": {"@id": PH + "/#organization"}, "publisher": {"@id": PH + "/#organization"},
             "mainEntityOfPage": {"@id": url}, "isBasedOn": c['LD_DATA']},
            *([{"@type": "FAQPage", "@id": url + "#faq", "isPartOf": {"@id": url}, "inLanguage": "he",
                "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq]}] if faq else []),
            {"@type": "BreadcrumbList", "@id": url + "#breadcrumb", "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "השמות של ישראל", "item": PH + "/"},
                {"@type": "ListItem", "position": 2, "name": SECTION, "item": PH + "/guides"},
                {"@type": "ListItem", "position": 3, "name": g['h1']}]},
            c['LD_SITE'], c['LD_ORG']]}
        open(c['SRC'] + f'guides/{slug}.html', 'w').write(c['page'](title, g['desc'], path, c['static_shell']('guides', inner), jsonld=ld, app=False,
                                                                   og=(f'/og/guides/{slug}.png', f'הכריכה של המדריך {g["h1"]}')))
        paths.append(path)

    # the hub: the newest guide first and wide, then a grid; a cover, badge, title, summary, reading time and names for each,
    # and buttons that filter by badge (guides.mjs; without JavaScript they stay hidden and every guide shows)
    HT, HD = 'מדריכים ומאמרים לבחירת שם לתינוק | השמות של ישראל', 'מדריכים, מאמרים וטיפים לבחירת שם לתינוק, מבוססים על נתוני הלמ״ס: שמות לתאומים ועוד, עם הפירוש והפופולריות של כל שם.'

    badges = {}
    for x in listed:
        badges[x['g']['badge']] = badges.get(x['g']['badge'], 0) + 1
    filt = ('<div class="gfilt" role="group" aria-label="סינון לפי נושא" hidden><button type="button" aria-pressed="true" data-t="">הכל '
            f'<span>{len(listed)}</span></button>' + ''.join(f'<button type="button" aria-pressed="false" data-t="{e(b)}">{e(b)} <span>{k}</span></button>'
                                                          for b, k in sorted(badges.items(), key=lambda t: -t[1])) + '</div>')
    cards = filt + '<ul class="gcards">' + ''.join(card(x, i) for i, x in enumerate(listed)) + '</ul>'
    all_names = set().union(*(x['names'] for x in listed)) if listed else set()
    stats = f'<p class="gstats"><b>{len(listed)}</b> מדריכים · <b>{len(all_names):,}</b> שמות · נתוני הלמ״ס {Y0}–{Y1}</p>'
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
                                             f'{stats}{cards}{script}', wide=True),
        jsonld=ld, app=False))
    return ['/guides'] + paths, [(x['g']['slug'], x['g']['title'], x['g']['desc']) for x in listed]
