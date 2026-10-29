"""Meanings and stories of names: data/meanings.json, the one source for this content.

One line per name: "נועה": {"mean": "...", "story": "...", "origin": "מקראי", "source": "במדבר כו, לג", "variant_of": null, "by": "idan", "date": "2026-11-02"}
Only reviewed, approved entries go in the file (drafts are reviewed in Google Sheets first).
  mean        short meaning, shown on the name page and in its title/description
  story       optional longer background
  origin      optional, one of ORIGINS
  source      optional, where the meaning comes from (a verse, a dictionary)
  variant_of  optional, the name this is another spelling of (that name must have a meaning)
  by, date    optional, who approved it and when

Used by build_bundle.py and build_site.py. Run directly to check the file (npm run site does): exits 1 on any error.
"""
import json, os, re, sys

PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data', 'meanings.json')
ORIGINS = ['מקראי', 'עברי', 'מקום בישראל', 'חודש/חג', 'ארמי', 'ערבי', 'יידיש', 'אמהרי', 'לועזי', 'כתיב של שם אחר']
FIELDS = {'mean', 'story', 'origin', 'source', 'variant_of', 'by', 'date'}
# how the first sentence of a name page names the origin: "נחשון הוא שם מקראי לבנים."
# the app has the same map (ORIGIN_KIND in app/p0f_url.js), keep them in sync
ORIGIN_KIND = {'מקראי': 'שם מקראי', 'עברי': 'שם עברי', 'מקום בישראל': 'שם עברי', 'חודש/חג': 'שם עברי',
               'ארמי': 'שם ארמי', 'ערבי': 'שם ערבי', 'יידיש': 'שם ביידיש', 'אמהרי': 'שם אמהרי', 'לועזי': 'שם לועזי'}


def _no_dupes(pairs):
    keys = [k for k, _ in pairs]
    dupes = sorted({k for k in keys if keys.count(k) > 1})
    if dupes:
        raise ValueError('meanings.json: name listed twice: ' + ', '.join(dupes))
    return dict(pairs)


def load(path=PATH):
    return json.load(open(path, encoding='utf-8'), object_pairs_hook=_no_dupes)


def errors(d):
    out = []
    for n, v in d.items():
        bad = lambda msg: out.append(f'{n}: {msg}')
        if not re.fullmatch(r"[א-ת' \-]+", n):
            bad('the name must be Hebrew letters')
        if not isinstance(v, dict):
            bad('must be an object'); continue
        extra = set(v) - FIELDS
        if extra:
            bad('unknown field ' + ', '.join(sorted(extra)))
        for k in FIELDS:
            if k in v and v[k] is not None and not isinstance(v[k], str):
                bad(f'{k} must be text')
        mean, story, var = v.get('mean') or '', v.get('story') or '', v.get('variant_of')
        if not mean and not var:
            bad('needs a meaning (mean) or variant_of')
        if mean and not 2 <= len(mean) <= 200:
            bad(f'meaning is {len(mean)} characters (2-200)')
        if story and len(story) > 800:
            bad(f'story is {len(story)} characters (max 800)')
        for k in ('mean', 'story', 'source'):
            s = v.get(k) or ''
            if s != s.strip() or '\n' in s:
                bad(f'{k} has extra spaces or a line break')
        if v.get('origin') and v['origin'] not in ORIGINS:
            bad('origin must be one of: ' + ' · '.join(ORIGINS))
        if var:
            t = d.get(var)
            if var == n or not t:
                bad(f'variant_of "{var}" is not another name in the file')
            elif not t.get('mean') or t.get('variant_of'):
                bad(f'variant_of "{var}" must have its own meaning')
        if v.get('date') and not re.fullmatch(r'\d{4}-\d{2}-\d{2}', v['date']):
            bad('date must be YYYY-MM-DD')
    return out


def meaning(d, n):
    """the meaning shown for a name: its own, or the one of the name it is a spelling of"""
    v = d.get(n) or {}
    if v.get('mean'):
        return v['mean']
    return (d.get(v.get('variant_of')) or {}).get('mean', '')


def origin(d, n):
    """the origin used in the first sentence: its own, or the one of the name it is a spelling of ('' if none)"""
    v = d.get(n) or {}
    if v.get('origin') in ORIGIN_KIND:
        return v['origin']
    o = (d.get(v.get('variant_of')) or {}).get('origin', '') if v.get('variant_of') else ''
    return o if o in ORIGIN_KIND else ''


def compact(d):
    """what the browser gets: {name: [meaning, story, origin]} (empty fields at the end left out)"""
    out = {}
    for n, v in d.items():
        row = [meaning(d, n), v.get('story') or '', origin(d, n)]
        while len(row) > 1 and not row[-1]:
            row.pop()
        out[n] = row
    return out


if __name__ == '__main__':
    try:
        errs = errors(load())
    except ValueError as e:
        errs = [str(e)]
    for e in errs:
        print('meanings.json:', e, file=sys.stderr)
    if errs:
        sys.exit(1)
    print('meanings.json ok')
