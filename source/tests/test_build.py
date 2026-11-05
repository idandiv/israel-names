"""Build-time checks of the generators (tools/pregnancy.py, tools/guides.py): broken data must stop the build.
Run with `python3 -m unittest discover -s tests -p 'test_*.py'` from source/ (part of `npm test`)."""
import copy, os, sys, unittest

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


if __name__ == '__main__':
    unittest.main()
