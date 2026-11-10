/* =========================================================
   /tools/siblings: the page (tools/siblings.py builds it and joins this file with app/dna-core.mjs into one module).
   Names come from DATA (seo.json): {y1, names: {name: DNA record (DNA_FIELDS)}}.
   Saved names go to the app's list on this device (bnil_fav), so they show under "saved" on the site.
   ========================================================= */
import { dnaOf, suggestSiblings, familyStyle, SIB_POOL_MIN } from './dna-core.mjs';
import DATA from './siblings-data.js';

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
