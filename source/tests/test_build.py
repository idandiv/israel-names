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

    def test_week_names_and_weights(self):
        self.broken(lambda P: P['weeks']['20'].pop('names'))
        self.broken(lambda P: P['weeks']['21'].update({'names': P['weeks']['20']['names']}))   # a name in two weeks
        self.broken(lambda P: P['weeks']['30'].update({'g': 10}))                             # the weight goes down
        self.broken(lambda P: P['weeks']['6'].update({'g': 1}))                               # a weight before week 8

    def test_growth_chart(self):
        W = {int(w): x for w, x in self.P['weeks'].items()}
        self.assertIn('pg-dot', pregnancy.growth_svg(W, 20))
        self.assertNotIn('pg-dot', pregnancy.growth_svg(W, 6))
        self.assertNotIn('pg-dot', pregnancy.growth_svg(W))
        self.assertIn('פחות מגרם', pregnancy.growth(W, 6))

    def test_holidays(self):
        self.assertEqual(self.P['holidays'][0]['id'], 'rosh-hashana')
        self.broken(lambda P: P['holidays'].reverse())                                      # out of the year's order
        self.broken(lambda P: P['holidays'].append(dict(P['holidays'][-1])))               # an id twice
        self.broken(lambda P: P['holidays'][0].update({'month': 'סיון'}))                 # not one of MONTHS (סיוון)
        self.broken(lambda P: P['holidays'][0].update({'day': 31}))
        self.broken(lambda P: P['holidays'][0].update({'note': ''}))
        self.broken(lambda P: P['holidays'][0].update({'id': 'ראש השנה'}))               # an id for the <!--holiday:...--> marker

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

    def test_length_chart_breaks_where_the_measurement_changes(self):
        W = {int(w): x for w, x in self.P['weeks'].items()}
        svg = pregnancy.growth_svg(W, 20, 'cm')
        self.assertEqual(svg.count('<polyline'), 2)                       # to week 19, and from week 20
        self.assertIn('pg-note', svg)
        self.assertEqual(pregnancy.growth_svg(W, 20).count('<polyline'), 1)  # the weight: one line
        self.assertIn('לא קפיצה בגדילה', pregnancy.growth(W, 20))

    def test_stages(self):
        self.assertEqual([pregnancy.stage_of(self.P, w)['id'] for w in (4, 13, 14, 22, 23, 33, 34, 42)],
                         ['dream', 'dream', 'sex', 'sex', 'narrow', 'narrow', 'decide', 'decide'])
        self.broken(lambda P: P['stages'].reverse())
        self.broken(lambda P: P['stages'][0].update({'until': 12}))     # not the weeks of journeyStage
        self.broken(lambda P: P['stages'][1]['links'].pop())

    def test_israel(self):
        self.broken(lambda P: P['israel']['ga']['groups'][1].__setitem__(1, 41.2))   # no longer adds up to 100%
        self.broken(lambda P: P['israel']['bw']['groups'].pop())
        self.broken(lambda P: P['israel'].update({'source': ['x', 'https://example.com/a.pdf']}))
        self.broken(lambda P: P['israel'].update({'source': ['x', 'https://evilgov.il/a.pdf']}))
        self.broken(lambda P: P['israel']['bw'].update({'low': 5}))

    def test_intergrowth(self):
        self.assertEqual(self.P['intergrowth']['median']['24'], 32.0)
        self.broken(lambda P: P['intergrowth']['median'].update({'25': 31.0}))                         # going down
        self.broken(lambda P: P['intergrowth']['median'].pop('25'))                                    # a week missing
        self.broken(lambda P: P['intergrowth'].update({'source': ['x', 'https://example.com/a.pdf']}))

    def test_month_of(self):
        self.assertEqual([pregnancy.month_of(w) for w in (4, 5, 13, 14, 20, 27, 28, 36, 40)], [0, 1, 2, 3, 4, 5, 6, 8, 8])
        self.assertIsNone(pregnancy.month_of(41))

    def test_crumbs(self):
        html, ld = pregnancy.crumbs('https://x', [('בית', '/'), ('הריון', '/pregnancy'), ('שבוע <1>', None)])
        self.assertIn('<span aria-current="page">שבוע &lt;1&gt;</span>', html)
        self.assertEqual([i.get('item') for i in ld['itemListElement']], ['https://x/', 'https://x/pregnancy', None])


class PregnancyPages(unittest.TestCase):
    """the built pages (src/pregnancy, from npm run site)"""
    SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'src', 'pregnancy')

    def page(self, name):
        return open(os.path.join(self.SRC, name + '.html'), encoding='utf-8').read()

    def test_week_titles(self):
        import re
        titles = [re.search(r'<title>(.*?)</title>', self.page(f'week-{w}')).group(1) for w in range(4, 43)]
        self.assertEqual(len(set(titles)), 39)
        self.assertEqual(titles[16], 'שבוע 20 להריון: התפתחות העובר, משקל, גודל ושמות מומלצים')

    def test_breadcrumbs_match_the_schema(self):
        import json, re
        for name in ('week-20', 'calculator', 'brit-mila', 'fetal-weight', 'index'):
            s = self.page(name)
            shown = re.findall(r'<a href="([^"]+)">', re.search(r'<nav class="crumbs".*?</nav>', s).group(0))
            graph = json.loads(re.search(r'application/ld\+json">(.*?)</script>', s, re.S).group(1))['@graph']
            bc = next(n for n in graph if n['@type'] == 'BreadcrumbList')['itemListElement']
            self.assertEqual(shown, [i['item'].replace('__BASE_URL__', '') for i in bc if 'item' in i], name)
            self.assertNotIn('item', bc[-1], name)

    def test_length_note_on_weeks_24_and_25(self):
        for name, n in (('week-24', 1), ('week-25', 1), ('week-26', 0), ('fetal-weight', 1)):
            self.assertEqual(self.page(name).count('intergrowth21.ndog.ox.ac.uk'), n, name)

    def test_brit_title_and_sources(self):
        s = self.page('brit-mila')
        self.assertIn('<title>חישוב תאריך ברית מילה ופדיון הבן', s)
        for seif in ('262.1', '266.2', '266.8', '266.10', '305.11', '305.18', '305.24'):
            self.assertIn(f"Yoreh_De'ah.{seif}", s)


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
        add('דוד', 1, [1984, 2004, 2024], 200)    # a classic
        add('אימרי', 1, [2024], 200)               # rising: new in 2024
        add('יוסף', 1, [2024], 30)                 # Jewish and (below) Muslim babies in 2024: a shared name
        add('דן', 1, [2024], 50)
        SN, SC = {}, {}
        for (n, s, y), k in YC.items():
            SN[(n, s, 'Jewish')] = SN.get((n, s, 'Jewish'), 0) + k
            SC[(n, s, 'Jewish', y)] = k
        YC[('יוסף', 1, 2024)] += 25
        SC[('יוסף', 1, 'Muslim', 2024)] = 25
        SN[('יוסף', 1, 'Muslim')] = 25
        names = {n for n, _, _ in YC}
        by_name = {n: {'n': n, 'g': 50, 'origin': '', 'en': n, 'sec': 'יהודים'} for n in names}
        self.tmp = tempfile.mkdtemp()
        self.c = {'page': lambda *a, **k: '', 'static_shell': lambda cur, inner, **k: inner, 'hashed': lambda *a: '/assets/x.js', 'by_name': by_name, 'YC': YC, 'SN': SN, 'SC': SC,
                  'PREG': {'months': [{'month': 'תשרי', 'note': 'n', 'names': ['שי']}],
                           'holidays': [{'id': 'sukkot', 'name': 'סוכות', 'month': 'תשרי', 'day': 15, 'len': 7, 'note': 'n', 'names': ['דוד']}]},
                  'ny': lambda x, s: YC.get((x['n'], s, self.Y1), 0), 'enc': lambda n: n, 'fmt': lambda n: f'{n:,}',
                  'short_mean': lambda x: '', 'coll_list': lambda rows, f: '', 'arrow': '', 'Y0': self.Y0, 'Y1': self.Y1,
                  'SRC': self.tmp + '/', 'PH': '', 'LD_SITE': {}, 'LD_ORG': {}, 'LD_DATA': {}}
        self.g = {'slug': 'test', 'title': 't', 'h1': 'h', 'desc': 'd', 'badge': 'b', 'card': 'c', 'published': '2026-11-05',
                  'cover': {'motif': 'mirror', 'tone': 'accent', 'names': ['שי', 'קרן', 'גלית', 'אריאה', 'יוסף', 'דוד']},
                  'periods': [[1980, 1999], [2015, 2024]],
                  'switch': {'up': {'dir': 'girls', 'names': ['שי']}},
                  'faded': {'g80': {'sex': 0, 'decade': 1980, 'names': ['קרן', 'גלית']}},
                  'new': {'girls': {'sex': 0, 'names': ['אריאה']}},
                  'shared': {'boys': {'sex': 1, 'names': ['יוסף']}},
                  'era': {'old': {'sex': 1, 'kind': 'classic', 'names': ['דוד']}, 'now': {'sex': 1, 'kind': 'rising', 'names': ['אימרי']}},
                  'body': '<p>{{girls:שי:2015:Y1}} {{sector:יוסף:1:Muslim}} {{name:שי}} {{name:קרן}} {{name:גלית}} {{name:אריאה}} {{name:יוסף}} {{name:דוד}}</p><!--switch:up--><!--faded:g80--><!--new:girls-->'
                          '<!--shared:boys--><!--era:old--><!--era:now--><!--month:תשרי--><!--holiday:sukkot-->'}
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

    def test_shared(self):
        self.broken(lambda g: g['shared']['boys'].update({'names': []}))              # יוסף fits and is not sorted
        self.build(lambda g: g['shared']['boys'].update({'names': [], 'other': ['יוסף']}))
        self.broken(lambda g: g['shared']['boys'].update({'names': ['יוסף', 'דוד']}))  # דוד has no Arab-sector babies
        self.broken(lambda g: g.update({'body': g['body'] + '{{sector:דוד:1:Muslim}}'}))

    def test_era(self):
        self.broken(lambda g: g['era']['old'].update({'kind': 'rising'}))           # דוד was given in 1984 and 2004
        self.broken(lambda g: g['era']['now'].update({'kind': 'classic'}))          # אימרי was not
        self.broken(lambda g: g['era']['old'].update({'names': ['שי']}))            # too few babies

    def test_calendar(self):
        self.broken(lambda g: g.update({'body': g['body'].replace('<!--month:תשרי-->', '')}))      # every month, or none
        self.broken(lambda g: g.update({'body': g['body'].replace('<!--holiday:sukkot-->', '')}))
        self.build(lambda g: g.update({'body': g['body'].replace('<!--month:תשרי-->', '').replace('<!--holiday:sukkot-->', '')}))
        self.broken(lambda g: g.update({'body': g['body'] + '<!--holiday:purim-->'}))
        self.c['PREG']['holidays'][0]['names'] = ['שי']                                         # 15 girls in 2024, fewer than 20
        self.broken(None)

    def test_different_start(self):
        pairs = {'boys': [{'theme': 't', 'note': 'n', 'pairs': [['דוד', 'אימרי']]}]}
        self.build(lambda g: g.update({'pairs': pairs, 'different_start': True, 'body': g['body'] + '<!--pairs:boys-->'}))
        pairs['boys'][0]['pairs'] = [['דוד', 'דן']]   # both start with ד
        self.broken(lambda g: g.update({'pairs': pairs, 'different_start': True, 'body': g['body'] + '<!--pairs:boys-->'}))

    def test_cover(self):
        pages = {}
        self.c['page'] = lambda title, desc, path, body, **k: pages.update({path: body}) or ''
        self.build()
        self.assertIn('<svg class="cover"', pages['/guides'])
        self.assertIn('<svg class="cover"', pages['/guides/test'])
        self.broken(lambda g: g.pop('cover'))
        self.broken(lambda g: g['cover'].update({'motif': 'nope'}))
        self.broken(lambda g: g['cover'].update({'tone': 'red'}))
        self.broken(lambda g: g['cover'].update({'names': ['שי', 'קרן', 'גלית']}))                             # too few for a mirror
        self.broken(lambda g: g['cover'].update({'names': ['שי', 'קרן', 'גלית', 'אריאה', 'יוסף', 'אין-כזה']}))  # not in the data
        self.broken(lambda g: g['cover'].update({'names': ['שי', 'קרן', 'גלית', 'אריאה', 'יוסף', 'דן']}))       # the guide does not link to דן

    def test_no_name_on_two_covers(self):
        need = lambda n, where: n
        a = copy.deepcopy(self.g)
        b = {**copy.deepcopy(self.g), 'slug': 'other'}
        with self.assertRaises(AssertionError):
            guides.check_covers([a, b], need)
        b['cover']['names'] = ['א', 'ב', 'ג', 'ד', 'ה', 'ו']
        guides.check_covers([a, b], need)

    def test_every_drawing(self):
        D = {'holiday': lambda h: {'month': 'תשרי', 'day': 15, 'name': 'סוכות', 'id': h, 'names': []}, 'switch': lambda g, n: (10, 60),
             'peak': lambda n, s: 1970, 'first': lambda n: 2010 + names.index(n), 'form': lambda g, n: 'Name'}
        names = ['אבאל', 'גדאל', 'הואל', 'זחיה', 'טייה', 'כליה', 'מן']
        extra = {'calendar': {'holidays': ['a', 'b', 'c', 'd']}, 'script': {'arabic': ['ا', 'ب', 'ت', 'ث']}, 'fade': {'sex': 0}}
        self.assertEqual(set(guides.MOTIFS), set(guides.COVER_NAMES))
        for m, (lo, _) in guides.COVER_NAMES.items():
            g = {'slug': m, 'cover': {'motif': m, 'tone': 'accent', 'names': names[:lo], **extra.get(m, {})}}
            guides.check_covers([g], lambda n, where: n)
            svg = guides.cover_svg(g, D)
            for n in names[:lo]:
                self.assertIn(n[:-2] if m == 'endings' else n, svg, m)

    def test_heb_day(self):
        self.assertEqual([guides.heb_day(d) for d in (1, 10, 15, 16, 25, 30)], ['א׳', 'י׳', 'ט״ו', 'ט״ז', 'כ״ה', 'ל׳'])

    def test_mostly(self):
        self.build(lambda g: g.update({'body': g['body'] + '{{mostly:שי:1:Jewish}}'}))
        self.broken(lambda g: g.update({'body': g['body'] + '{{mostly:שי:1:Muslim}}'}))


if __name__ == '__main__':
    unittest.main()
