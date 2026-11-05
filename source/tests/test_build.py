"""Build-time checks of the generators (tools/pregnancy.py, tools/guides.py): broken data must stop the build.
Run with `python3 -m unittest discover -s tests -p 'test_*.py'` from source/ (part of `npm test`)."""
import copy, os, shutil, sys, tempfile, unittest

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'tools'))
import guides, pregnancy  # noqa: E402


class PregnancyData(unittest.TestCase):
    def setUp(self):
        self.P = pregnancy.load()

    def broken(self, change):
        P = copy.deepcopy(self.P)
        change(P)
        with self.assertRaises(AssertionError):
            pregnancy.check(P)

    def test_the_data_passes(self):
        self.assertEqual(len(self.P['weeks']), 39)
        self.assertGreater(len(self.P['checkups']), 5)

    def test_weeks(self):
        self.broken(lambda P: P['weeks'].pop('20'))
        self.broken(lambda P: P['weeks']['20'].pop('size'))
        self.broken(lambda P: P['weeks']['20'].pop('art'))                 # every week has a drawing
        self.broken(lambda P: P['weeks']['20'].update({'art': '🍌'}))        # a key, not an emoji
        self.assertEqual(self.P['weeks']['20']['art'], 'banana')

    def test_months_and_trimesters(self):
        self.broken(lambda P: P['months'].reverse())
        self.broken(lambda P: P['trimesters'][1]['weeks'].__setitem__(0, 15))

    def test_checkups(self):
        self.broken(lambda P: P['checkups'].append(dict(P['checkups'][0])))                 # an id twice
        self.broken(lambda P: P['checkups'][0].update({'from': 3}))                          # before week 4
        self.broken(lambda P: P['checkups'][1].update({'from': 14, 'to': 12}))               # from after to
        self.broken(lambda P: P['checkups'][0].update({'what': ''}))                         # a missing field
        self.broken(lambda P: P['checkups'].reverse())                                       # out of order
        self.broken(lambda P: P.update({'checkups_source': ['x', 'https://example.com/']}))  # not a trusted source
        self.broken(lambda P: P.update({'checkups_source': ['x', 'https://gov.il.example.com/']}))
        self.broken(lambda P: P.update({'checkups_reviewed': '3.11.2026'}))

    def test_trusted_sources(self):
        from urllib.parse import urlparse
        self.assertTrue(urlparse(self.P['checkups_source'][1]).hostname.endswith(pregnancy.TRUSTED))

    def test_dmy(self):
        self.assertEqual(pregnancy.dmy('2026-10-30'), '30.10.2026')
        self.assertEqual(pregnancy.dmy('2026-01-05'), '5.1.2026')

    def test_ltr(self):
        self.assertEqual(pregnancy.ltr('שבוע 12+3'), 'שבוע <bdi dir="ltr">12+3</bdi>')


class Guides(unittest.TestCase):
    def test_one_letter_apart(self):
        self.assertTrue(guides.one_letter_apart('אודיה', 'הודיה'))
        self.assertTrue(guides.one_letter_apart('אורי', 'אורית'))
        self.assertFalse(guides.one_letter_apart('נועה', 'מאיה'))

    def test_guides_load(self):
        G = guides.load()
        self.assertEqual(len({g['slug'] for g in G}), len(G))
        for g in G:
            self.assertTrue(g['body'].strip(), g['slug'])



class GuideBlocks(unittest.TestCase):
    """the switch, faded and new blocks on a small made-up dataset: a guide that breaks a rule stops the build"""
    Y0, Y1 = 1980, 2024

    def setUp(self):
        YC = {}
        add = lambda n, s, years, k: YC.update({(n, s, y): YC.get((n, s, y), 0) + k for y in years})
        add('שי', 1, range(1980, 2000), 10)       # boys in 1980-1999 (0% girls) ...
        add('שי', 0, range(2015, 2025), 15)       # ... mostly girls in 2015-2024 (75%)
        add('שי', 1, range(2015, 2025), 5)
        add('קרן', 0, range(1980, 2025), 8)       # peaked in 1985, then faded
        YC[('קרן', 0, 1985)] = 500
        add('גלית', 0, [1986], 450)                # another 1980s peak, gone in 2024
        add('אריאה', 0, range(2015, 2025), 30)    # first seen in 2015, Jewish sector
        SN = {}
        for (n, s, y), k in YC.items():
            SN[(n, s, 'Jewish')] = SN.get((n, s, 'Jewish'), 0) + k
        names = {n for n, _, _ in YC}
        by_name = {n: {'n': n, 'g': 50, 'origin': '', 'en': n, 'sec': 'יהודים'} for n in names}
        self.tmp = tempfile.mkdtemp()
        self.c = {'page': lambda *a, **k: '', 'static_shell': lambda cur, inner: inner, 'by_name': by_name, 'YC': YC, 'SN': SN,
                  'ny': lambda x, s: YC.get((x['n'], s, self.Y1), 0), 'enc': lambda n: n, 'fmt': lambda n: f'{n:,}',
                  'short_mean': lambda x: '', 'coll_list': lambda rows, f: '', 'arrow': '', 'Y0': self.Y0, 'Y1': self.Y1,
                  'SRC': self.tmp + '/', 'PH': '', 'LD_SITE': {}, 'LD_ORG': {}, 'LD_DATA': {}}
        self.g = {'slug': 'test', 'title': 't', 'h1': 'h', 'desc': 'd', 'badge': 'b', 'card': 'c', 'published': '2026-11-05',
                  'periods': [[1980, 1999], [2015, 2024]],
                  'switch': {'up': {'dir': 'girls', 'names': ['שי']}},
                  'faded': {'g80': {'sex': 0, 'decade': 1980, 'names': ['קרן', 'גלית']}},
                  'new': {'girls': {'sex': 0, 'names': ['אריאה']}},
                  'body': '<p>{{girls:שי:2015:Y1}}</p><!--switch:up--><!--faded:g80--><!--new:girls-->'}
        self.load = guides.load

    def tearDown(self):
        guides.load = self.load
        shutil.rmtree(self.tmp)

    def build(self, change=None):
        g = copy.deepcopy(self.g)
        if change:
            change(g)
        guides.load = lambda: [g]
        guides.build(self.c)
        return open(self.tmp + '/guides/test.html', encoding='utf-8').read() if os.path.exists(self.tmp + '/guides/test.html') else ''

    def broken(self, change):
        with self.assertRaises(AssertionError):
            self.build(change)

    def test_the_guide_builds(self):
        self.build()   # page() is stubbed, so this checks that every block passes

    def test_switch(self):
        self.broken(lambda g: g['switch']['up'].update({'dir': 'boys'}))         # it moved toward girls
        self.broken(lambda g: g['switch']['up'].update({'dir': 'stable'}))
        self.broken(lambda g: g.update({'periods': [[1980, 1999], [2023, 2024]]}))   # too few babies in the second period
        self.broken(lambda g: g.update({'body': g['body'] + '{{girls:שי:2023:2024}}'}))

    def test_faded(self):
        self.broken(lambda g: g['faded']['g80'].update({'names': ['קרן']}))      # גלית fits and is not sorted
        self.build(lambda g: g['faded']['g80'].update({'names': ['קרן'], 'other': ['גלית']}))
        self.broken(lambda g: g['faded']['g80'].update({'decade': 1970}))

    def test_new(self):
        self.broken(lambda g: g['new']['girls'].update({'arab': True}))         # it is a Jewish-sector name
        self.broken(lambda g: g['new']['girls'].update({'sex': 1}))

    def test_every_block_has_a_marker(self):
        self.broken(lambda g: g['new'].update({'boys': {'sex': 1, 'names': []}}))
        self.broken(lambda g: g.update({'body': g['body'] + '<!--wrong:x-->'}))

    def test_mostly(self):
        self.build(lambda g: g.update({'body': g['body'] + '{{mostly:שי:1:Jewish}}'}))
        self.broken(lambda g: g.update({'body': g['body'] + '{{mostly:שי:1:Muslim}}'}))


if __name__ == '__main__':
    unittest.main()
