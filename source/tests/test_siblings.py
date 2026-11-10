"""Checks of the built siblings pieces: /tools/siblings and the sibling block of every name page (tools/siblings.py,
build_site.py). Reads the built site, so run `npm run site` first (part of `npm test`, like check_site.py)."""
import html, json, os, re, unittest

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
SEO = json.load(open(os.path.join(ROOT, 'source', 'data', 'seo.json'), encoding='utf-8'))
BY = {x['n']: x for x in SEO['names']}


def read(rel):
    return open(os.path.join(ROOT, 'src', rel), encoding='utf-8').read()


def graph(s):
    return json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>', s, re.S).group(1))['@graph']


class SiblingsTool(unittest.TestCase):
    def setUp(self):
        self.s = read('tools/siblings.html')

    def test_page(self):
        self.assertEqual(self.s.count('<h1'), 1)
        self.assertIn('<form id="sform"', self.s)
        self.assertNotRegex(self.s, r'/assets/app\.[0-9a-f]+\.js', 'a page without the app')
        types = {n['@type'] for n in graph(self.s)}
        self.assertTrue({'WebPage', 'WebApplication', 'FAQPage', 'BreadcrumbList'} <= types)
        self.assertIn('/tools/siblings', open(os.path.join(ROOT, 'scripts', 'paths.json'), encoding='utf-8').read())   # the sitemap's paths
        self.assertIn('/tools/siblings', read('llms.txt'))

    def test_faq_matches_the_page(self):
        faq = next(n for n in graph(self.s) if n['@type'] == 'FAQPage')['mainEntity']
        self.assertGreaterEqual(len(faq), 4)
        for q in faq:
            self.assertIn(html.escape(q['name']), self.s)
            self.assertIn(html.escape(q['acceptedAnswer']['text']), self.s)

    def test_the_module_and_its_data(self):
        js = re.search(r'<script type="module" src="(/assets/siblings\.[0-9a-f]+\.js)"', self.s).group(1)
        mod = read(js.lstrip('/'))
        data_url = re.match(r"import DATA from '(/assets/siblings-data\.[0-9a-f]+\.js)';", mod).group(1)
        self.assertEqual(mod.count('\nimport '), 0, 'only the data import is left')
        self.assertNotRegex(mod, r'(?m)^export ')
        self.assertIn('function suggestSiblings(', mod)
        data = json.loads(read(data_url.lstrip('/'))[len('export default '):-1])
        self.assertEqual(data['y1'], SEO['y1'])
        self.assertEqual(len(data['names']), len(SEO['names']))
        self.assertEqual(data['names']['איתן'], BY['איתן']['dna'])

    def test_examples_are_real_names(self):
        ex = self.s[self.s.index('id="examples"'):self.s.index('id="faq"')]
        names = re.findall(r'href="/names/([^"]+)"', ex)
        self.assertGreaterEqual(len(names), 20)
        for n in names:
            self.assertIn(html.unescape(__import__('urllib.parse').parse.unquote(n)), BY)


class NamePageSiblings(unittest.TestCase):
    def test_block_and_faq(self):
        for n in ('איתן', 'נועה', 'מוחמד', 'יוסף'):
            s, x = read(f'names/{n}.html'), BY[n]
            b, g = x['sib']
            self.assertIn(f'<h2>שמות שמתאימים לאח או לאחות של {n}</h2>', s)
            block = s[s.index(f'<h2>שמות שמתאימים לאח או לאחות של {n}</h2>'):]
            for m in b + g:
                self.assertIn(f'>{html.escape(m)}</a>', block)
            self.assertIn('href="/tools/siblings?n=', block)
            faq = next(q for q in graph(s) if 'FAQPage' in q['@type'])['mainEntity']
            q = [f for f in faq if f['name'] == f'אילו שמות מתאימים לאח או לאחות של {n}?']
            self.assertEqual(len(q), 1)
            for m in b[:3] + g[:3]:
                self.assertIn(m, q[0]['acceptedAnswer']['text'])

    def test_every_name_gets_names_of_its_community(self):
        """a name of one community (90% of its babies or more) gets names given mostly there too: at least 30% of their
        babies are of that community (a name like אדם, given to Jewish and Arab babies alike, can go with both)"""
        for x in SEO['names']:
            self.assertEqual(len(x['sib']), 2)
            self.assertLessEqual(max(map(len, x['sib'])), 6)
            sec = x['dna'][3]
            for L in x['sib']:
                self.assertNotIn(x['n'], L)
                if max(sec) >= 90:
                    k = sec.index(max(sec))
                    for m in L:
                        self.assertGreaterEqual(BY[m]["dna"][3][k], 30, f'{x["n"]} -> {m}')

if __name__ == '__main__':
    unittest.main()
