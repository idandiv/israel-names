"""Step 1: raw CBS CSV -> data/data.b64 (the compact gzip+base64 JSON the app loads).

- Names are cleaned: Hebrew geresh (׳) -> ASCII apostrophe, stray leading/trailing apostrophes removed
  (rows that then collide are merged), and malformed names (anything but Hebrew letters, apostrophe,
  space, hyphen) are dropped.
- The order of names is kept stable across data releases (data/name_order.txt): existing names keep
  their position, new names are appended by popularity. Old indices of names that were removed are
  written to DATA.rm so the app can migrate anything a browser saved by index.
"""
import os, re, json, gzip, base64
import pandas as pd
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data')
d = pd.read_csv(os.path.join(D, 'babynamesIL.csv'))
SEC = ['Jewish', 'Muslim', 'Christian-Arab', 'Druze']
Y0 = 1949
Y1 = int(d.year.max())

def clean(n):
    n = str(n).replace('׳', "'").replace('`', "'").strip()
    n = re.sub(r"\s+", ' ', n)
    if n.count("'") and n.startswith("'"): n = n[1:]
    return n
d['name'] = d.name.map(clean)
ok = d.name.str.fullmatch(r"[א-ת][א-ת' \-]*")
dropped = sorted(set(d.name[~ok]))
d = d[ok]
d['s'] = d.sector.map(SEC.index); d['x'] = (d.sex == 'M').astype(int)
d = d.groupby(['name', 's', 'x', 'year'], as_index=False).n.sum()   # merges rows that became identical

tot = d.groupby(['s', 'x', 'year']).n.sum()
T = [[[int(tot.get((s, x, y), 0)) for y in range(Y0, Y1 + 1)] for x in (0, 1)] for s in range(4)]

order_file = os.path.join(D, 'name_order.txt')
old = [l for l in open(order_file, encoding='utf-8').read().split('\n') if l] if os.path.exists(order_file) else []
present = set(d.name)
by_total = d.groupby('name').n.sum().sort_values(ascending=False)
names = [n for n in old if n in present] + [n for n in by_total.index if n not in set(old)]
removed = [i for i, n in enumerate(old) if n not in present]
idx = {n: i for i, n in enumerate(names)}

rows = [[] for _ in names]
for (nm, s, x), g in d.groupby(['name', 's', 'x']):
    g = g.sort_values('year'); a = int(g.year.min()) - Y0; b = int(g.year.max()) - Y0
    arr = [''] * (b - a + 1)
    for y, n in zip(g.year, g.n): arr[y - Y0 - a] = str(int(n))
    rows[idx[nm]].append(f"{s}{x}{a}:" + ",".join(arr))
txt = "\n".join(n + "|" + "|".join(r) for n, r in zip(names, rows))
data = {"y0": Y0, "T": T, "txt": txt, "rm": removed}
raw = json.dumps(data, ensure_ascii=False).encode()
open(os.path.join(D, 'data.b64'), 'w').write(base64.b64encode(gzip.compress(raw, 9, mtime=0)).decode())
open(order_file, 'w', encoding='utf-8').write('\n'.join(names) + '\n')
print(f'{len(names)} names, years {Y0}-{Y1}; dropped {dropped}; removed old indices {removed}')
