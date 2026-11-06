"""Checks of the built main collection pages (src/names/boys|girls|unisex.html): what build_site.py promises in the title and the markup.
Reads the built site, so run `npm run site` first (part of `npm test`, like check_site.py)."""
import csv, html, json, os, re, unittest

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
DATA = os.path.join(ROOT, 'source', 'data')
Y1 = json.load(open(os.path.join(DATA, 'seo.json'), encoding='utf-8'))['y1']
PAGES = ('boys', 'girls', 'unisex')


def read(rel):
    return open(os.path.join(ROOT, 'src', rel), encoding='utf-8').read()


def graph(s):
    return json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>', s, re.S).group(1))['@graph']


def node(s, t):
    return next(n for n in graph(s) if n['@type'] == t)


def body_of(s):
    return s[s.index('<body'):]


class MainCollections(unittest.TestCase):
    def test_title_says_the_year_and_the_description_says_the_data_year(self):
        for k in PAGES:
            s = read(f'names/{k}.html')
            title = re.search(r'<title>(.*?)</title>', s).group(1)
            desc = re.search(r'<meta name="description" content="([^"]*)"', s).group(1)
            self.assertIn('(2026)', title, k)
            self.assertIn('פירושים ומקורות', title, k)
            self.assertIn(f'({Y1})', desc, k)     # never only "2026": the numbers are of Y1

    def test_the_faq_on_the_page_is_the_faq_in_the_markup(self):
        for k, count in (('boys', 4), ('girls', 4), ('unisex', 3)):
            s = read(f'names/{k}.html')
            part = body_of(s).split('שאלות נפוצות</h2>')[1].split('</article>')[0]
            shown = [(html.unescape(q), html.unescape(a)) for q, a in re.findall(r'<h3>(.*?)</h3><p>(.*?)</p>', part)]
            marked = [(q['name'], q['acceptedAnswer']['text']) for q in node(s, 'FAQPage')['mainEntity']]
            self.assertEqual(shown, marked, k)
            self.assertEqual(len(marked), count, k)
            self.assertNotIn('<a ', ''.join(a for _, a in marked), k)   # plain text in the markup

    def test_breadcrumbs_on_the_page_and_in_the_markup(self):
        for k, name in (('boys', 'שמות לבנים'), ('girls', 'שמות לבנות'), ('unisex', 'שמות יוניסקס')):
            s = read(f'names/{k}.html')
            items = node(s, 'BreadcrumbList')['itemListElement']
            self.assertEqual([i['name'] for i in items], ['דף הבית', 'כל השמות', name])
            self.assertNotIn('item', items[-1])
            self.assertIn(f'<span aria-current="page">{name}</span>', s)
        self.assertNotIn('BreadcrumbList', read('names/short-boys.html'))   # the other collections are unchanged

    def test_every_anchor_points_to_a_heading_that_exists(self):
        for k in PAGES:
            s = body_of(read(f'names/{k}.html'))
            for path, anchor in re.findall(r'href="(/guides/[^"#]+)#([^"]+)"', s):
                self.assertIn(f'id="{anchor}"', read(path.lstrip('/') + '.html'), f'{k}: {path}#{anchor}')
            for anchor in re.findall(r'href="#([^"]+)"', s):
                self.assertIn(f'id="{anchor}"', s, f'{k}: #{anchor}')

    def test_quick_links_stay_few(self):
        for k in PAGES:
            nav = re.search(r'<nav class="cgc ctop".*?</nav>', read(f'names/{k}.html'), re.S).group(0)
            self.assertLessEqual(nav.count('<a '), 8, k)

    def test_counts_and_rank_changes_match_the_cbs_file(self):
        counts = {1: {}, 0: {}}
        for r in csv.DictReader(open(os.path.join(DATA, 'babynamesIL.csv'), encoding='utf-8')):
            y = int(r['year'])
            if y in (Y1, Y1 - 1) and re.fullmatch(r"[א-ת' \-]+", r['name']):
                c = counts[0 if r['sex'] == 'F' else 1].setdefault(y, {})
                c[r['name']] = c.get(r['name'], 0) + int(r['n'])
        for k, s, w in (('boys', 1, 'בנים'), ('girls', 0, 'בנות')):
            page = read(f'names/{k}.html')
            rows = re.findall(r'<span class="cr">(\d+)</span><b>(.*?)</b><span class="cn">([^<]*?)(?: <span class="mv (\w+)"[^>]*>(.*?)</span>)?</span></a>', page)[:100]
            self.assertEqual(len(rows), 100, k)
            then = {n: i for i, (n, _) in enumerate(sorted(counts[s][Y1 - 1].items(), key=lambda t: -t[1]), 1)}
            for rank, n, stat, mark, text in rows:
                n = html.unescape(n)
                self.assertEqual(stat, f'{counts[s][Y1][n]:,} {w}', n)        # by sex: אריאל has 1,479 boys of 2,099 babies
                if then.get(n, 999) > 100:
                    self.assertEqual(mark, 'mvn', n)
                else:
                    # names tied in the year before can share a place in either order, so the mark must fit somewhere in the tied range
                    c = counts[s][Y1 - 1][n]
                    low, high = 1 + sum(v > c for v in counts[s][Y1 - 1].values()), sum(v >= c for v in counts[s][Y1 - 1].values())
                    self.assertEqual(text[0], {'mvu': '▲', 'mvd': '▼', 'mv0': '–'}[mark], n)
                    place = int(rank) + {'mvu': int(text[1:] or 0), 'mvd': -int(text[1:] or 0), 'mv0': 0}[mark]
                    self.assertTrue(low <= place <= high, f'{n}: place {place} in {Y1 - 1}, the counts say {low}-{high}')


if __name__ == '__main__':
    unittest.main()
