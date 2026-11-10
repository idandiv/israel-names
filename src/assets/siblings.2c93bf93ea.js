import DATA from '/assets/siblings-data.70bc8d324a.js';
/* =========================================================
   The DNA of a name and names that go with it (siblings). Pure functions, no DOM.
   Used three ways: in the app bundle (build_bundle.py strips "export"; p5b_dna.js builds the records from the app's data),
   on /tools/siblings (tools/siblings.py joins this file into the page's module, with the records in data/seo.json), and at build for the static name pages
   (the app's SEO export runs suggestSiblings for every name and build_site.py prints the result).
   A record (DNA_FIELDS), from the CBS data and data/meanings.json:
     syl     syllables (sylCount of fullname-core.mjs on the English spelling)
     g       girls, % of all babies ever given the name
     med     the typical birth year: half of the babies given the name were born by then
     sec     [Jewish, Muslim, Christian-Arab, Druze], % of the babies given the name
     origin  the origin in meanings.json ('' when not known)
     th      themes (DNA_THEMES), a bitmask
     y1      [girls, boys] given the name in the last year of the data
     r3      babies given the name in the last three years of the data
   ========================================================= */
const DNA_THEMES = ['nature', 'light', 'strength', 'bible', 'intl'];
const DNA_FIELDS = ['syl', 'g', 'med', 'sec', 'origin', 'th', 'y1', 'r3'];
const THEME_HE = { nature: 'טבע', light: 'אור', strength: 'עוצמה' };   // bible and intl: the origin says it
/* origins that sound alike for siblings: the Hebrew ones together (a biblical name is also Hebrew, see sameOrigin) */
const ORIGIN_GROUP = { 'מקראי': 'bible', 'עברי': 'heb', 'מקום בישראל': 'heb', 'חודש/חג': 'heb', 'ארמי': 'aram', 'ערבי': 'arab',
  'יידיש': 'yid', 'אמהרי': 'amh', 'לועזי': 'intl' };
const ORIGIN_PL = { bible: 'מקראיים', heb: 'עבריים', aram: 'ארמיים', arab: 'ערביים', yid: 'ביידיש', amh: 'אמהריים', intl: 'לועזיים' };
const ORIGIN_ONE = { bible: 'שם מקראי', heb: 'שם עברי', aram: 'שם ארמי', arab: 'שם ערבי', yid: 'שם ביידיש', amh: 'שם אמהרי', intl: 'שם לועזי' };
const FINAL = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
const SIB_POOL_MIN = 15;     // a suggestion was given to at least this many babies of that sex in the last year
const SIB_RARE = 100;        // "rare": fewer babies than this in the last year

const heb = n => [...n].filter(c => c >= 'א' && c <= 'ת').map(c => FINAL[c] || c);

function dnaOf(n, R) {
  const r = Object.fromEntries(DNA_FIELDS.map((f, k) => [f, R[k]]));
  const L = heb(n);
  return { n, ...r, h: L.join(''), og: ORIGIN_GROUP[r.origin] || '', len: L.length, first: L[0] || '', end: L.slice(-2).join(''),
    single: !/[\s-]/.test(n) };
}

/* same up to one letter changed, added or removed (נועה / נועם, יונתן / יהונתן) */
function oneApart(a, b) {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  if (a.length === b.length) { let d = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i] && ++d > 1) return false; return true; }
  const [s, l] = a.length < b.length ? [a, b] : [b, a];
  for (let i = 0; i < l.length; i++) if (l.slice(0, i) + l.slice(i + 1) === s) return true;
  return false;
}

const cosine = (a, b) => {
  let ab = 0, aa = 0, bb = 0;
  for (let k = 0; k < 4; k++) { ab += a[k] * b[k]; aa += a[k] * a[k]; bb += b[k] * b[k]; }
  return aa && bb ? ab / Math.sqrt(aa * bb) : 0;
};
const bits = x => { let k = 0; for (; x; x &= x - 1) k++; return k; };
const sameOrigin = (a, b) => !a.og || !b.og ? 0 : a.og === b.og ? 1 : (a.og === 'bible' && b.og === 'heb') || (a.og === 'heb' && b.og === 'bible') ? .5 : 0;

/* how well b goes with a as siblings: null when they must not be paired (the same name, one letter apart, one inside the
   other, or of different communities), else {score, parts} with the part each dimension adds */
function affinity(a, b) {
  const A = a.h, B = b.h;
  if (oneApart(A, B) || (A.length > 2 && B.includes(A)) || (B.length > 2 && A.includes(B))) return null;
  const cs = cosine(a.sec, b.sec);
  if (cs < .6) return null;
  const parts = {
    sector: 2 * cs,
    era: 2.2 * Math.exp(-Math.abs(a.med - b.med) / 10),
    pop: 1.2 * Math.exp(-Math.abs(Math.log((a.r3 + 5) / (b.r3 + 5))) / 1.2),
    origin: 1.4 * sameOrigin(a, b),
    theme: .8 * Math.min(1, bits(a.th & b.th)),
    length: a.syl && b.syl ? (a.syl === b.syl ? .6 : Math.abs(a.syl - b.syl) === 1 ? .25 : 0) : 0,
    rhyme: a.end === b.end && a.end.length === 2 ? -1 : 0,
    start: A.length > 2 && B.length > 2 && A.slice(0, 3) === B.slice(0, 3) ? -1.2 : 0,   // איתן / איתמר: too close
  };
  return { score: Object.values(parts).reduce((s, v) => s + v, 0), parts };
}

const decade = y => Math.floor(y / 10) * 10;
const decHe = d => d >= 2000 ? `שנות ה-${d}` : `שנות ה-${String(d).slice(2)}`;
const list = a => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' ו' + a[a.length - 1];

/* why c goes with the siblings: up to three short reasons, the strongest first */
function reasons(sibs, c) {
  const out = [];
  const og = sibs.every(s => s.og && s.og === sibs[0].og) ? sibs[0].og : '';
  if (og && c.og === og) out.push([3, `${ORIGIN_ONE[og]}, כמו ${list(sibs.map(s => s.n))}`]);
  const med = Math.round(sibs.reduce((s, x) => s + x.med, 0) / sibs.length);
  if (Math.abs(c.med - med) <= 6) out.push([2.5, `מאותו דור: שנת הלידה הטיפוסית ${c.med}${sibs.length === 1 ? `, ול${sibs[0].n} ${sibs[0].med}` : ''}`]);
  const th = sibs.reduce((m, s) => m & s.th, 31) & c.th;
  const thl = DNA_THEMES.filter((t, k) => th & (1 << k) && THEME_HE[t]).map(t => THEME_HE[t]);
  if (thl.length) out.push([2, `שם של ${thl.join(' ושל ')}, כמו ${list(sibs.map(s => s.n))}`]);
  if (c.syl && sibs.every(s => s.syl === c.syl)) out.push([1.5, `אותו אורך: ${c.syl === 1 ? 'הברה אחת' : `${c.syl} הברות`}`]);
  const r = Math.exp(sibs.reduce((s, x) => s + Math.log(x.r3 + 5), 0) / sibs.length);
  if (Math.abs(Math.log((c.r3 + 5) / r)) < .5) out.push([1, c.r3 < 3 * SIB_RARE ? 'נדיר באותה מידה' : 'נפוץ באותה מידה']);
  return out.sort((x, y) => y[0] - x[0]).slice(0, 3).map(x => x[1]);
}

/* suggestions for a sibling of sibs (DNA records), from pool (DNA records):
   opts.sex 0 girls, 1 boys; opts.k how many (12); opts.style 'classic' (typical birth year before 2000) or 'new' (2005 on);
   opts.rarity 'rare' (fewer than SIB_RARE babies of that sex in the last year) or 'common'; opts.letter 'same' (start with
   the letter of a sibling) or 'other' (with none of them). Every suggestion goes with every sibling (see affinity);
   no two suggestions are one letter apart. [{n, score, why}], the best first */
function suggestSiblings(sibs, pool, opts = {}) {
  const { sex = 1, k = 12, style = '', rarity = '', letter = '' } = opts;
  if (!sibs.length) return [];
  const firsts = new Set(sibs.map(s => s.first));
  const scored = [];
  for (const c of pool) {
    const y = c.y1[sex];
    if (!c.single || y < SIB_POOL_MIN || (sex === 0 ? c.g < 50 : c.g > 50)) continue;
    if (sibs.some(s => s.n === c.n)) continue;
    if (style === 'classic' && c.med >= 2000) continue;
    if (style === 'new' && c.med < 2005) continue;
    if (rarity === 'rare' && y >= SIB_RARE) continue;
    if (rarity === 'common' && y < SIB_RARE) continue;
    if (letter === 'same' && !firsts.has(c.first)) continue;
    if (letter === 'other' && firsts.has(c.first)) continue;
    let s = 0, ok = true;
    for (const b of sibs) { const f = affinity(b, c); if (!f) { ok = false; break; } s += f.score; }
    if (ok) scored.push({ c, score: s / sibs.length });
  }
  scored.sort((x, y) => y.score - x.score || y.c.y1[sex] - x.c.y1[sex] || (x.c.n < y.c.n ? -1 : 1));
  const out = [];
  for (const { c, score } of scored) {
    if (out.some(o => oneApart(o.h, c.h))) continue;
    out.push({ n: c.n, h: c.h, score: Math.round(score * 100) / 100, why: reasons(sibs, c) });
    if (out.length >= k) break;
  }
  return out;
}

/* the family's style in a few words, from what all the names share: "משפחה של שמות מקראיים קצרים, בסגנון שנות ה-2010",
   or for one name "שם עברי קצר ונפוץ היום, בסגנון שנות ה-2010" (rare or common: in the last three years) */
function familyStyle(sibs) {
  if (!sibs.length) return '';
  const one = sibs.length === 1, adj = [];
  const og = sibs.every(s => s.og && s.og === sibs[0].og) ? sibs[0].og : '';
  const syl = sibs.map(s => s.syl).filter(Boolean);
  if (syl.length === sibs.length && syl.every(v => v <= 2)) adj.push(one ? 'קצר' : 'קצרים');
  else if (syl.length === sibs.length && syl.every(v => v >= 3)) adj.push(one ? 'ארוך' : 'ארוכים');
  if (sibs.every(s => s.r3 < 3 * SIB_RARE)) adj.push(one ? 'נדיר היום' : 'נדירים היום');
  else if (sibs.every(s => s.r3 >= 30 * SIB_RARE)) adj.push(one ? 'נפוץ היום' : 'נפוצים היום');
  const head = one ? (og ? ORIGIN_ONE[og] : 'שם') : 'משפחה של שמות' + (og ? ' ' + ORIGIN_PL[og] : '');
  const med = sibs.reduce((s, x) => s + x.med, 0) / sibs.length;
  return `${head}${adj.length ? ' ' + list(adj) : ''}, בסגנון ${decHe(decade(med))}`;
}

/* =========================================================
   /tools/siblings: the page (tools/siblings.py builds it and joins this file with app/dna-core.mjs into one module).
   Names come from DATA (seo.json): {y1, names: {name: DNA record (DNA_FIELDS)}}.
   Saved names go to the app's list on this device (bnil_fav), so they show under "saved" on the site.
   ========================================================= */

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => Math.round(n).toLocaleString('he-IL');
const store = {
  get(k, d) { try { const v = localStorage.getItem('bnil_' + k); return v == null ? d : JSON.parse(v) } catch (e) { return d } },
  set(k, v) { try { localStorage.setItem('bnil_' + k, JSON.stringify(v)) } catch (e) { } },
};
const clean = s => String(s || '').replace(/[׳’`]/g, "'").replace(/[^א-ת'\s-]/g, '').replace(/\s+/g, ' ').trim();
const key = n => DATA.names[n] ? n : DATA.names[n.replace(/ /g, '-')] ? n.replace(/ /g, '-') : '';
const ALL = Object.entries(DATA.names).map(([n, r]) => dnaOf(n, r));
const BY = new Map(ALL.map(d => [d.n, d]));
const POOL = ALL.filter(d => Math.max(d.y1[0], d.y1[1]) >= SIB_POOL_MIN);
const MAX = 4;

const form = $('#sform'), out = $('#sres'), err = $('#serr'), box = $('#snames');
const F = k => form.elements[k];
const inputs = () => [...box.querySelectorAll('input')];

function addInput(v = '') {
  if (inputs().length >= MAX) return;
  const k = inputs().length + 1;
  const l = document.createElement('label');
  l.className = 'pfield';
  l.innerHTML = `<span>אח או אחות ${k}</span><input name="n${k}" maxlength="24" autocomplete="off"${k === 1 ? ' required placeholder="למשל נועה"' : ''}>`;
  l.querySelector('input').value = v;
  box.appendChild(l);
  $('#sadd').hidden = inputs().length >= MAX;
}

function favs() { const f = store.get('fav', []); return Array.isArray(f) ? f : [] }
function toggleFav(n) {
  const f = favs(), on = f.includes(n);
  store.set('fav', on ? f.filter(x => x !== n) : f.concat(n));
  return !on;
}

function card(s, sex) {
  const d = BY.get(s.n), on = favs().includes(s.n), y = d.y1[sex];
  return `<li><div class="sib-top"><a href="/names/${encodeURIComponent(s.n)}">${esc(s.n)}</a>
<button type="button" class="sib-fav" data-fav="${esc(s.n)}" aria-pressed="${on}" aria-label="${on ? 'הסרה מהשמות ששמרתי' : 'שמירה לרשימה'}: ${esc(s.n)}">${on ? '♥' : '♡'}</button></div>
<span class="sib-n">${fmt(y)} ${sex === 0 ? 'בנות' : 'בנים'} ב-${DATA.y1}</span>
${s.why.length ? `<ul class="sib-why">${s.why.map(w => `<li>${esc(w)}</li>`).join('')}</ul>` : ''}</li>`;
}

function render() {
  const typed = inputs().map(i => clean(i.value)).filter(Boolean);
  if (!typed.length) { err.textContent = 'כתבו את השם של אח או אחות אחד לפחות, בעברית.'; err.hidden = false; out.hidden = true; return false }
  const missing = typed.filter(n => !key(n));
  if (missing.length) {
    err.textContent = `${missing.map(n => `השם ${n}`).join(' ו')} לא ${missing.length > 1 ? 'מופיעים' : 'מופיע'} בנתוני הלמ״ס, שכוללים כל שם שניתן לפחות ל-5 תינוקות בשנה. אולי בכתיב אחר?`;
    err.hidden = false; out.hidden = true; return false;
  }
  err.hidden = true;
  const sibs = [...new Set(typed.map(key))].map(n => BY.get(n));
  const sex = +form.querySelector('[name=sex]:checked').value;
  const opts = { style: F('style').value, rarity: F('rarity').value, letter: F('letter').value };
  const lists = (sex === 2 ? [1, 0] : [sex]).map(x => [x, suggestSiblings(sibs, POOL, { ...opts, sex: x, k: sex === 2 ? 6 : 12 })]);
  const names = sibs.map(s => s.n);
  const any = lists.some(([, L]) => L.length);
  out.innerHTML = `<p class="sib-style"><span>הסגנון של ${names.length > 1 ? 'השמות במשפחה' : `השם ${esc(names[0])}`}</span><b>${esc(familyStyle(sibs))}</b></p>
${lists.map(([x, L]) => `${sex === 2 ? `<h3>${x === 0 ? 'לאחות' : 'לאח'}</h3>` : ''}${L.length ? `<ol class="sib-list">${L.map(s => card(s, x)).join('')}</ol>` : ''}`).join('')}
${any ? '' : '<p class="perr">לא מצאנו שמות שמתאימים לכל הבחירות. נסו להסיר אחד המסננים.</p>'}
<p class="fn-share"><button type="button" class="pfav" id="sshare">שיתוף ההצעות</button><span class="fn-sub">♥ שומר את השם ברשימת השמות ששמרתם באתר.</span></p>`;
  out.hidden = false;
  out.querySelectorAll('[data-fav]').forEach(b => b.onclick = () => {
    const on = toggleFav(b.dataset.fav);
    b.textContent = on ? '♥' : '♡'; b.setAttribute('aria-pressed', on);
    b.setAttribute('aria-label', `${on ? 'הסרה מהשמות ששמרתי' : 'שמירה לרשימה'}: ${b.dataset.fav}`);
  });
  $('#sshare').onclick = async () => {
    const q = new URLSearchParams({ n: names.join(','), s: sex });
    for (const [k, v] of Object.entries({ st: opts.style, r: opts.rarity, l: opts.letter })) if (v) q.set(k, v);
    const url = location.origin + location.pathname + '?' + q;
    try { if (navigator.share) { await navigator.share({ title: document.title, url }); return } } catch (e) { return }
    try { await navigator.clipboard.writeText(url); $('#sshare').textContent = 'הקישור הועתק' } catch (e) { prompt('הקישור:', url) }
  };
  return true;
}

form.addEventListener('submit', ev => { ev.preventDefault(); if (render()) out.scrollIntoView({ behavior: 'smooth', block: 'start' }) });
form.addEventListener('change', ev => { if (!out.hidden && (ev.target.tagName === 'SELECT' || ev.target.type === 'radio')) render() });
$('#sadd').addEventListener('click', () => { addInput(); inputs().at(-1).focus() });

/* start: the names from the link (?n=a,b&s=0&st=new&r=rare&l=other) */
{
  let q = new URLSearchParams();
  try { q = new URLSearchParams(location.search) } catch (e) { }
  const names = (q.get('n') || '').split(',').map(clean).filter(Boolean).slice(0, MAX);
  box.innerHTML = '';
  (names.length ? names : ['', '']).forEach(n => addInput(n));
  const s = q.get('s');
  if (['0', '1', '2'].includes(s)) form.querySelector(`[name=sex][value="${s}"]`).checked = true;
  for (const [k, f] of [['st', 'style'], ['r', 'rarity'], ['l', 'letter']]) {
    const v = q.get(k);
    if (v && [...F(f).options].some(o => o.value === v)) F(f).value = v;
  }
  if (names.length) render();
}
