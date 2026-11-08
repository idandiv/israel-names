"""Checks of data/arabic.json (tools/arabic.py) and of the built Arabic pages in src/ar/.
Reads the built site, so run `npm run site` first (part of `npm test`, like check_site.py)."""
import json, os, re, sys, unittest

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
sys.path.insert(0, os.path.join(ROOT, 'source', 'tools'))
import arabic  # noqa: E402

PAGES = {'/ar': 'ar/index.html', '/ar/names/boys': 'ar/names/boys.html', '/ar/names/girls': 'ar/names/girls.html', '/ar/names/popular': 'ar/names/popular.html'}
HEBREW = re.compile(r'[֐-׿]')


def read(rel):
    return open(os.path.join(ROOT, 'src', rel), encoding='utf-8').read()


class Spellings(unittest.TestCase):
    def test_the_file_is_valid(self):
        self.assertEqual(arabic.errors(arabic.load(), arabic.cbs_names()), [])

    def test_the_letter_check_catches_a_wrong_consonant(self):
        self.assertTrue(arabic.skeleton_ok('خالد', "ח'אלד"))
        self.assertFalse(arabic.skeleton_ok('خالد', 'חאלד'))       # ח without geresh is ح
        self.assertTrue(arabic.skeleton_ok('عبد الله', 'עבדאללה'))
        self.assertTrue(arabic.skeleton_ok('ملاك', 'מלאק'))        # ק stands for ك too
        self.assertFalse(arabic.skeleton_ok('محمد', 'מחמד ן'))

    def test_errors_are_reported(self):
        errs = arabic.errors({'محمد': {'he': ['מוחמד']}, 'أحمد': {'he': ['מוחמד', 'לא-שם']}, 'abc': {'he': ['אחמד']}}, {'מוחמד', 'אחמד'})
        self.assertTrue(any('also listed under' in e for e in errs))
        self.assertTrue(any('not a name in the CBS data' in e for e in errs))
        self.assertTrue(any('Arabic letters' in e for e in errs))

    def test_arabic_counting(self):
        self.assertEqual(arabic.babies(2), 'مولودان')
        self.assertEqual(arabic.babies(7), '7 مواليد')
        self.assertEqual(arabic.babies(2257), '2,257 مولوداً')
        self.assertEqual(arabic.babies(1300), '1,300 مولود')


class Pages(unittest.TestCase):
    def test_every_page_is_arabic_static_and_paired_where_it_should_be(self):
        for path, f in PAGES.items():
            s = read(f)
            self.assertIn('<html lang="ar" dir="rtl">', s, path)
            self.assertNotRegex(s, r'/assets/app\.[0-9a-f]+\.js', path)
            title = re.search(r'<title>(.*?)</title>', s).group(1)
            h1 = re.search(r'<h1>(.*?)</h1>', s).group(1)
            self.assertNotRegex(title + h1, HEBREW, path)
            he = {v: k for k, v in arabic.PAIRS.items()}.get(path)
            if he:
                self.assertIn(f'<link rel="alternate" hreflang="he" href="__BASE_URL__{he}">', s, path)
                self.assertIn(f'href="{he}" hreflang="he" lang="he">עברית</a>', s, path)
                self.assertIn(f'<a class="doclang" href="{path}" hreflang="ar" lang="ar">العربية</a>', read(he.lstrip('/') + '.html'), he)
            else:
                self.assertNotIn('hreflang="he" href', s, path)

    def test_the_list_counts_all_spellings_of_a_name_together(self):
        # وتين is ותין, ואתין and וותין in the CBS data: one line in the list of girls
        s = read('ar/names/girls.html')
        self.assertEqual(s.count('<b>وتين</b>'), 1)
        for h in ('ואתין', 'וותין'):
            self.assertNotIn(f'>{h}<', s)

    def test_names_without_a_sure_spelling_stay_in_hebrew_letters_and_are_explained(self):
        s = read('ar/names/boys.html')
        self.assertIn('<b lang="he" class="he">עבד</b><sup>*</sup>', s)
        self.assertIn('* الأسماء المكتوبة بالحروف العبرية', s)

    def test_the_lists_in_the_markup_are_the_lists_on_the_page(self):
        s = read('ar/names/boys.html')
        ld = json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>', s, re.S).group(1))['@graph']
        page = next(n for n in ld if n['@type'] == 'CollectionPage')
        self.assertEqual(page['inLanguage'], 'ar')
        items = page['mainEntity'][0]['itemListElement']
        self.assertEqual(len(items), 50)
        shown = re.findall(r'<li><a href="[^"]+" hreflang="he"><span class="cr">\d+</span><b[^>]*>([^<]+)</b>', s.split('id="list"')[1].split('</ol>')[0])
        self.assertEqual([i['name'] for i in items], shown)


if __name__ == '__main__':
    unittest.main()
