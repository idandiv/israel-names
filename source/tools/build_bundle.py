"""Step 2: concatenate app sources into dist/ (bundle for the site + single-file preview).
   dist/js_bundle.js, dist/css_bundle.css   -> used by build_site.py
   dist/names.html                          -> single-file preview (claude.ai artifact, hash routing)
   dist/test.html                           -> same, as a full HTML page with SEO export enabled (used by export_seo.mjs and local tests)"""
import gzip, base64, json, os
S = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
A = os.path.join(S, 'app'); DIST = os.path.join(S, 'dist'); os.makedirs(DIST, exist_ok=True)
CSS = ['base.css', 'extra.css', 'extra2.css', 'extra3.css', 'extra4.css']
JS = ['p0_translit.js', 'p0b_meanings.js', 'p0c_meanings2.js', 'p0d_pa.js', 'p0e_story.js', 'p0f_url.js', 'p1_core.js', 'p2_home.js',
      'p3_name.js', 'p3b_extra.js', 'p4_explore.js', 'p5_tools.js', 'p8_match.js', 'p8b_cloud.js', 'p9_persist.js', 'p6_games.js']  # p6 holds boot(): keep last
PREVIEW_URL = 'https://claude.ai/artifact/6tr1eyeJJ7zw49We8J48vF'   # only for the preview build; the real site uses its own origin
rd = lambda p: open(p, encoding='utf-8').read()
css = ''.join(rd(os.path.join(A, f)) for f in CSS)
js = '\n'.join(rd(os.path.join(A, f)) for f in JS)
data = gzip.decompress(base64.b64decode(rd(os.path.join(S, 'data', 'data.b64')))).decode()
html = f'''<title>השמות של ישראל</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Karantina:wght@400;700&family=IBM+Plex+Sans+Hebrew:wght@400;500;600;700&display=swap">
<style>{css}</style>
<div id="app" dir="rtl"></div>
<div class="toast" id="toast" hidden></div>
<div class="modal" id="modal" hidden></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"></script>
<script>window.SITE_CONFIG=__CFG__;</script>
<script>const DATA={data};</script>
<script>
(()=>{{
{js}
}})();
</script>
'''
w = lambda n, s: open(os.path.join(DIST, n), 'w', encoding='utf-8').write(s)
w('names.html', html.replace('__CFG__', json.dumps({'baseUrl': PREVIEW_URL, 'routing': 'hash'})))
w('test.html', '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>'
  + html.replace('__CFG__', json.dumps({'baseUrl': PREVIEW_URL, 'routing': 'hash', 'exportSEO': True})) + '</body></html>')
w('js_bundle.js', js); w('css_bundle.css', css)
print('bundle ok', len(js), 'chars js')
