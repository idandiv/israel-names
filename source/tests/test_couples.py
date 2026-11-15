"""Checks of the built couple pieces: the landing page /tools/couple-names (tools/couples.py), the link into the
couple room on every name page, and the footer links (build_site.py). Reads the built site, so run `npm run site` first
(part of `npm test`, like check_site.py)."""
import html, json, os, re, unittest

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')


def read(rel):
    return open(os.path.join(ROOT, 'src', rel), encoding='utf-8').read()


def graph(s):
    return json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>', s, re.S).group(1))['@graph']


class CouplePage(unittest.TestCase):
    def setUp(self):
        self.s = read('tools/couple-names.html')

    def test_page(self):
        self.assertEqual(self.s.count('<h1'), 1)
        self.assertNotRegex(self.s, r'/assets/app\.[0-9a-f]+\.js', 'a page without the app')
        self.assertIn('href="/#match"', self.s)
        types = {n['@type'] for n in graph(self.s)}
        self.assertTrue({'WebPage', 'WebApplication', 'FAQPage', 'BreadcrumbList'} <= types)
        self.assertIn('/tools/couple-names', open(os.path.join(ROOT, 'scripts', 'paths.json'), encoding='utf-8').read())   # the sitemap's paths
        self.assertIn('/tools/couple-names', read('llms.txt'))

    def test_faq_matches_the_page(self):
        faq = next(n for n in graph(self.s) if n['@type'] == 'FAQPage')['mainEntity']
        self.assertGreaterEqual(len(faq), 5)
        for q in faq:
            self.assertIn(html.escape(q['name']), self.s)
            self.assertIn(html.escape(q['acceptedAnswer']['text']), self.s)


class CoupleLinks(unittest.TestCase):
    def test_name_page_links_into_the_room(self):
        s = read('names/נועה.html')
        self.assertIn('href="/?nmadd=%D7%A0%D7%95%D7%A2%D7%94#match"', s)
        self.assertIn('href="/tools/couple-names"', s)

    def test_footer_keeps_the_name_finder(self):
        # the name finder left the main nav for the couple tab, so the static footer links to both
        s = read('tools/siblings.html')
        self.assertIn('href="/#gen"', s)
        self.assertIn('href="/tools/couple-names"', s)


if __name__ == '__main__':
    unittest.main()
