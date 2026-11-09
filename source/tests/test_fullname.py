"""Checks of the built full-name pieces: /tools/full-name and the English section of every name page (tools/fullname.py,
build_site.py). Reads the built site, so run `npm run site` first (part of `npm test`, like check_site.py)."""
import html, json, os, re, unittest

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
SEO = json.load(open(os.path.join(ROOT, 'source', 'data', 'seo.json'), encoding='utf-8'))
BY = {x['n']: x for x in SEO['names']}


def read(rel):
    return open(os.path.join(ROOT, 'src', rel), encoding='utf-8').read()


def graph(s):
    return json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>', s, re.S).group(1))['@graph']


class FullNameTool(unittest.TestCase):
    def setUp(self):
        self.s = read('tools/full-name.html')

    def test_page(self):
        self.assertEqual(self.s.count('<h1'), 1)
        self.assertIn('<form id="fform"', self.s)
        self.assertNotRegex(self.s, r'/assets/app\.[0-9a-f]+\.js', 'a page without the app')
        types = {n['@type'] for n in graph(self.s)}
        self.assertTrue({'WebPage', 'WebApplication', 'FAQPage', 'BreadcrumbList'} <= types)

    def test_faq_matches_the_page(self):
        faq = next(n for n in graph(self.s) if n['@type'] == 'FAQPage')['mainEntity']
        for q in faq:
            self.assertIn(html.escape(q['name']), self.s)
            self.assertIn(html.escape(q['acceptedAnswer']['text']), self.s)

    def test_the_module_and_its_data(self):
        js = re.search(r'<script type="module" src="(/assets/fullname\.[0-9a-f]+\.js)"', self.s).group(1)
        mod = read(js.lstrip('/'))
        data_url = re.match(r"import DATA from '(/assets/fullname-data\.[0-9a-f]+\.js)';", mod).group(1)
        self.assertEqual(mod.count('\nimport '), 0, 'only the data import is left')
        self.assertNotRegex(mod, r'(?m)^export ')
        data = json.loads(read(data_url.lstrip('/'))[len('export default '):-1])
        self.assertEqual(data['dd'], SEO['dd'])
        self.assertEqual(len(data['names']), len(SEO['names']))
        self.assertEqual(data['names']['איתי'][0], 'Itai')
        self.assertIn('Itay', data['names']['איתי'][4])

    def test_letter_table_uses_real_names(self):
        rows = re.findall(r'<tr><th scope="row">(.*?)</th><td>(.*?)</td><td>(.*?)</td></tr>', self.s)
        self.assertEqual(len(rows), 7)
        for _, _, ex in rows:
            for n in re.findall(r'([א-ת]+): <bdi', ex):
                self.assertIn(n, BY)

    def test_surname_never_in_a_link(self):
        self.assertIn('הקישור כולל רק את השם הפרטי', read(re.search(r'src="/(assets/fullname\.[0-9a-f]+\.js)"', self.s).group(1)))


class NamePageEnglish(unittest.TestCase):
    def test_section_and_faq(self):
        for n in ('איתי', 'יצחק', 'מוחמד', 'נועה'):
            s, x = read(f'names/{n}.html'), BY[n]
            self.assertIn(f'<h2>איך כותבים {n} באנגלית</h2>', s)
            self.assertIn(html.escape(x['enq']), s)
            faq = next(g for g in graph(s) if 'FAQPage' in g['@type'])['mainEntity']
            q = [f for f in faq if f['name'] == f'איך כותבים את השם {n} באנגלית?']
            self.assertEqual(len(q), 1)
            self.assertEqual(q[0]['acceptedAnswer']['text'], x['enq'])
            self.assertIn(f'href="/tools/full-name?n=', s)
            for v, why in x['env']:
                self.assertIn(f'<bdi dir="ltr">{html.escape(v)}</bdi>: {html.escape(why)}', s)

    def test_every_name_has_an_answer(self):
        for x in SEO['names']:
            self.assertTrue(x['enq'].startswith(('השם ', 'כתיב מוצע')), x['n'])
            self.assertIn(x['en'], x['enq'])
            self.assertLessEqual(len(x['env']), 3)


if __name__ == '__main__':
    unittest.main()
