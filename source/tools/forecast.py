"""The names forecast for the year after the CBS data, and how well the same method did before. Internal: no page shows it yet;
it is kept for the report on the CBS 2025 data (milestone 0b), and tools/guides.py can show it in a guide (the forecast markers).

The method, for every name given to at least MIN babies of a sex in the base year:
  1. its share of the babies of that sex in each of the SPAN years up to the base year (all sectors, or the Jewish sector)
  2. a straight line through the log of those shares (least squares): the yearly rate of change
  3. the share of the next year: the base year's share, moved by DAMP of that rate (half the trend: the whole trend erred more in the backtest)
  4. times the babies of that sex in the base year (the forecast assumes as many births as in the base year)
The backtest runs the same method from earlier base years and compares it with what the CBS published, and with the naive
forecast "the same share as last year".

The forecast is kept in data/forecast-<target>.json, made once from the data up to the base year, so it stays the
same forecast after the CBS publishes the target year, and the target year's data can grade it (milestone 0b).
While the data ends with the base year, the tests (and the build of a guide that shows it) check that the file is what
this method gives (python3 tools/forecast.py
writes it again).
Population Authority lists (data/pa.json) are not mixed into the numbers: its counts for the same names are far from the
CBS counts (דוד: 1,842 boys in the CBS 2024 data, 1,036 in the Authority's 2025 list), so the two count in different ways.
A guide can show them beside the forecast as a second opinion.
"""
import csv, json, math, os, statistics, sys

S = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..') + '/'
BASE, TARGET = 2024, 2025
SPAN, DAMP, MIN = 6, 0.5, 20         # years of the trend, the part of the trend carried forward, babies in the base year
KEEP = 50                            # the file keeps names given to at least KEEP babies in the base year
TOP, MOVE_MIN, ERR_MIN = 10, 100, 200   # the top list; babies in the base year of a riser or faller; of a name in the error
BACKTEST = (2020, 2021, 2022, 2023, 2024)
SECTORS = ('all', 'Jewish')
FILE = S + f'data/forecast-{TARGET}.json'
PA_ALIAS = {'אילה': 'איילה'}         # the Authority's spelling -> the CBS spelling (as app/p0d_pa.js)
PA_LIST = {('all', 0): 'girlsGeneral', ('all', 1): 'boysGeneral', ('Jewish', 0): 'girlsJewish', ('Jewish', 1): 'boysJewish'}


def by_sector(YC, SC, sector):
    """babies by (name, sex, year): all sectors (YC) or one CBS sector (SC)"""
    if sector == 'all':
        return YC
    return {(n, s, y): k for (n, s, sec, y), k in SC.items() if sec == sector}


def totals(D):
    T = {}
    for (n, s, y), k in D.items():
        T[(s, y)] = T.get((s, y), 0) + k
    return T


def predict(D, T, s, base, damp=DAMP, names=None):
    """{name: babies of sex s in base + 1}, for names given to at least MIN babies of sex s in base"""
    ys = range(base - SPAN + 1, base + 1)
    mx = statistics.mean(ys)
    out = {}
    for n in names if names is not None else {n for (n, sx, y) in D if sx == s and y == base}:
        ks = [D.get((n, s, y), 0) for y in ys]
        if ks[-1] < MIN:
            continue
        L = [math.log((k + .5) / T[(s, y)]) for k, y in zip(ks, ys)]
        my = statistics.mean(L)
        b = sum((x - mx) * (l - my) for x, l in zip(ys, L)) / sum((x - mx) ** 2 for x in ys)
        out[n] = ks[-1] * math.exp(damp * b)   # = the base share, moved by damp * b, times the base year's babies
    return out


def ranked(d):
    """names, most first (ties by name, so the order does not depend on the data's order)"""
    return sorted(d, key=lambda n: (-d[n], n))


def movers(p, base_k, up):
    """names of MOVE_MIN babies or more in the base year that the forecast moves up (or down), the biggest change first"""
    cand = [n for n in p if base_k(n) >= MOVE_MIN and (p[n] > base_k(n) if up else p[n] < base_k(n))]
    return sorted(cand, key=lambda n: ((-1 if up else 1) * p[n] / base_k(n), n))


def backtest(D, years=BACKTEST):
    """for each target year and sex: names of the real top 10 in the forecast's top 10; the median error of the forecast and of
    "the same share as last year" (names of ERR_MIN babies or more, given the real births of the year); and of the TOP names
    the forecast moved up (down) most, how many really went up (down)"""
    T = totals(D)
    out = {}
    for t in years:
        for s in (0, 1):
            p = predict(D, T, s, t - 1)
            real = {n: D.get((n, s, t), 0) for n in p}
            last = lambda n: D.get((n, s, t - 1), 0)
            g = T[(s, t)] / T[(s, t - 1)]
            err = lambda f: round(100 * statistics.median(abs(f(n) * g - real[n]) / real[n] for n in p if last(n) >= ERR_MIN and real[n]), 1)
            top_real = ranked({n: D.get((n, s, t), 0) for (n, sx, y) in D if sx == s and y == t})[:TOP]
            share = lambda n, y: D.get((n, s, y), 0) / T[(s, y)]
            out[f'{t}:{s}'] = {
                'top': len(set(ranked(p)[:TOP]) & set(top_real)),
                'model': err(lambda n: p[n]), 'naive': err(last),
                'up': sum(share(n, t) > share(n, t - 1) for n in movers(p, last, True)[:TOP]),
                'down': sum(share(n, t) < share(n, t - 1) for n in movers(p, last, False)[:TOP])}
    return out


def make(YC, SC):
    """the forecast file: for each sector and sex, {name: [babies in BASE, forecast for TARGET]} (KEEP or more in BASE),
    and the backtest of all sectors"""
    F = {'base': BASE, 'target': TARGET, 'span': SPAN, 'damp': DAMP, 'min': MIN, 'forecast': {}}
    for sec in SECTORS:
        D = by_sector(YC, SC, sec)
        T = totals(D)
        F['forecast'][sec] = {}
        for s in (0, 1):
            p = predict(D, T, s, BASE)
            F['forecast'][sec][str(s)] = {n: [D[(n, s, BASE)], round(p[n])] for n in ranked(p) if D[(n, s, BASE)] >= KEEP}
    F['backtest'] = backtest(by_sector(YC, SC, 'all'))
    return F


def load():
    return json.load(open(FILE, encoding='utf-8'))


def check(F, YC, SC, Y1):
    """while the data ends with the base year, the file must be what the method gives from it"""
    if Y1 == BASE:
        assert F == make(YC, SC), f'{FILE} is not the forecast of the data: run python3 tools/forecast.py'
    else:
        assert Y1 > BASE, f'the forecast is made from {BASE}, the data ends with {Y1}'


def pa_lists():
    """the Population Authority's 2025 lists (data/pa.json "c"), in CBS spelling: {(sector, sex): [(name, babies)]}"""
    P = json.load(open(S + 'data/pa.json', encoding='utf-8'))['c']
    return {k: [(PA_ALIAS.get(n, n), v) for n, v in P[key]] for k, key in PA_LIST.items()}


def read_csv():
    YC, SC = {}, {}
    for r in csv.DictReader(open(S + 'data/babynamesIL.csv', encoding='utf-8')):
        nm, sx, sec, y, c = r['name'], 0 if r['sex'] == 'F' else 1, r['sector'], int(r['year']), int(r['n'])
        YC[(nm, sx, y)] = YC.get((nm, sx, y), 0) + c
        SC[(nm, sx, sec, y)] = SC.get((nm, sx, sec, y), 0) + c
    return YC, SC


if __name__ == '__main__':
    YC, SC = read_csv()
    Y1 = max(y for _, _, y in YC)
    if Y1 != BASE and '--force' not in sys.argv:
        sys.exit(f'the data ends with {Y1}, not {BASE}: the {TARGET} forecast is kept as it was made (--force to make it again)')
    json.dump(make(YC, SC), open(FILE, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print('wrote', FILE)
