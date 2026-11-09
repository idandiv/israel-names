/* =========================================================
   /tools/full-name: the page (tools/fullname.py builds it and joins this file with app/p0_translit.js and
   app/fullname-core.mjs into one module, so romanize and TRMAP come from p0_translit.js).
   Names come from DATA (seo.json): {y1, dd, names: {name: [en, sex, babies in y1, rank in y1, [other spellings], Arabic name 0/1]}}.
   The surname stays on the device (bnil_surname / bnil_surname_en, the keys of the app's quick view).
   ========================================================= */
import { spellVariants, sylCount, fullNotes, balanceOK, initials, mrz, email, perClass, classLine, SURNAMES_EN } from './fullname-core.mjs';
import DATA from './fullname-data.js';

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => Math.round(n).toLocaleString('he-IL');
const ltr = s => `<bdi dir="ltr">${esc(s)}</bdi>`;
const store = {
  get(k) { try { const v = localStorage.getItem('bnil_' + k); return v == null ? '' : JSON.parse(v) } catch (e) { return '' } },
  set(k, v) { try { if (v) localStorage.setItem('bnil_' + k, JSON.stringify(v)); else localStorage.removeItem('bnil_' + k) } catch (e) { } },
};
const clean = s => String(s || '').replace(/[^א-ת'׳\s-]/g, '').replace(/\s+/g, ' ').trim();
const norm = s => clean(s).replace(/׳/g, "'");
/* a name in the data, as typed or with a hyphen for a space (שי לי / שי-לי) */
const rec = n => DATA.names[n] || DATA.names[n.replace(/ /g, '-')] || null;
const enFirst = n => { const r = rec(n); return r ? r[0] : (n ? romanize(n, false) : '') };
const enLast = n => SURNAMES_EN[n] || (n ? n.split(' ').map(p => romanize(p, false)).join(' ') : '');

const form = $('#fform'), out = $('#fres'), err = $('#ferr');
const F = k => form.elements[k];
let lastEnTouched = false;

/* names that balance the surname: common in the last year, of that sex and of the family's community (the community of
   the first name typed; a known Israeli surname means a Jewish name), that pass balanceOK. Popular first */
function balance(first, last, lastEn, sex) {
  const s2 = sylCount(lastEn), r = rec(first);
  const ar = r ? r[5] : SURNAMES_EN[last] ? 0 : null;
  const names = Object.entries(DATA.names)
    .filter(([n, x]) => x[1] === sex && x[3] > 0 && x[2] >= 50 && (ar == null || x[5] === ar) && n !== first && !/[\s-]/.test(n))
    .sort((a, b) => b[1][2] - a[1][2])
    .filter(([n, x]) => balanceOK(n, last, x[0], lastEn))
    .slice(0, 10).map(([n]) => n);
  return { s2, names };
}

function render() {
  const first = norm(F('first').value), middle = norm(F('middle').value), last = norm(F('last').value);
  if (!first || !last) {
    err.textContent = !first ? 'כתבו שם פרטי, בעברית.' : 'כתבו שם משפחה, בעברית.';
    err.hidden = false; out.hidden = true; return false;
  }
  err.hidden = true;
  if (!lastEnTouched) F('lastEn').value = enLast(last);
  const lastEn = F('lastEn').value.trim() || enLast(last);
  store.set('surname', last); store.set('surname_en', lastEnTouched ? lastEn : '');
  const r = rec(first), fEn = enFirst(first), mEn = middle ? enFirst(middle) : '';
  const sex = +form.querySelector('[name=sex]:checked').value;
  const ini = initials([first, middle, last], [fEn, mEn, lastEn]);
  const notes = fullNotes(first, last, fEn, lastEn);
  const full = [first, middle, last].filter(Boolean).join(' ');
  const fullEn = [fEn, mEn, lastEn].filter(Boolean).join(' ');
  const vars = r ? r[4] : spellVariants(first, fEn, false, false).map(v => v.s);
  const icon = k => k === 'good' ? '✓' : k === 'warn' ? '!' : '•';

  let stat;
  if (r && r[2]) {
    const v = perClass(r[2], DATA.dd);
    stat = `ב-${DATA.y1} נולדו ${fmt(r[2])} תינוקות בשם ${esc(first)}${r[3] ? `, מקום ${r[3]} ב${r[1] === 0 ? 'בנות' : 'בנים'}` : ''}. ${classLine(v)}.`;
  } else if (r) stat = `ב-${DATA.y1} השם ${esc(first)} כמעט לא ניתן (פחות מ-5 תינוקות), כך שכנראה לא יהיה עוד אחד כזה בכיתה.`;
  else stat = `השם ${esc(first)} לא מופיע בנתוני הלמ״ס, שכוללים כל שם שניתן לפחות ל-5 תינוקות בשנה. כלומר הוא נדיר מאוד.`;
  const link = r ? ` <a href="/names/${encodeURIComponent(DATA.names[first] ? first : first.replace(/ /g, '-'))}">לתיק השם ${esc(first)}</a>` : '';

  const bal = balance(first, last, lastEn, sex);

  out.innerHTML = `<div class="fn-big">${esc(full)}</div><div class="fn-en" dir="ltr">${esc(fullEn)}</div>
<button type="button" class="pfav fn-say" id="fsay" hidden>השמעה בקול</button>
<dl class="fn-dl">
<div><dt>ברשימת הכיתה ובצבא</dt><dd>${esc([last, first, middle].filter(Boolean).join(' '))}</dd></div>
<div><dt>באנגלית</dt><dd>${ltr(fullEn)}${vars.length ? `<span class="fn-also">השם הפרטי נכתב גם ${vars.map(ltr).join(' או ')}</span>` : ''}</dd></div>
<div><dt>בשורה של הדרכון</dt><dd>${ltr(mrz(lastEn, [fEn, mEn]))}</dd></div>
<div><dt>ראשי תיבות</dt><dd>${esc(ini.he)} · ${ltr(ini.en)}${ini.bad ? `<span class="fn-warn">באנגלית יוצא ${ltr(ini.bad)}. אולי כדאי לחשוב שוב על השם השני.</span>` : ''}</dd></div>
<div><dt>כתובת מייל</dt><dd>${ltr(email(fEn, lastEn))}</dd></div>
</dl>
${notes.length ? `<h3>איך הם נשמעים יחד</h3><ul class="fn-notes">${notes.map(n => `<li class="fn-${n.k}"><span aria-hidden="true">${icon(n.k)}</span>${esc(n.t)}</li>`).join('')}</ul>` : ''}
<h3>כמה ${esc(first)} יש בכיתה?</h3><p>${stat}${link}</p>
${bal.names.length ? `<h3>שמות שמתאימים לשם המשפחה</h3>
<p class="fn-sub">שמות ל${sex === 0 ? 'בנות' : 'בנים'} מהנפוצים ב-${DATA.y1}, שלא נבלעים בשם המשפחה, לא מתחרזים איתו ולא פותחים באותה אות, ושהקצב שלהם עולה או אחיד:</p>
<p class="cgc">${bal.names.map(n => `<a href="/names/${encodeURIComponent(n)}">${esc(n)} ${esc(last)}</a>`).join('')}</p>` : ''}
<p class="fn-share"><button type="button" class="pfav" id="fshare">שיתוף הבדיקה</button><span class="fn-sub">הקישור כולל רק את השם הפרטי, בלי שם המשפחה.</span></p>`;
  out.hidden = false;

  $('#fshare').onclick = async () => {
    const url = location.origin + location.pathname + '?n=' + encodeURIComponent(first);
    try { if (navigator.share) { await navigator.share({ title: document.title, url }); return } } catch (e) { return }
    try { await navigator.clipboard.writeText(url); $('#fshare').textContent = 'הקישור הועתק' } catch (e) { prompt('הקישור:', url) }
  };
  sayButton(full);
  return true;
}

/* "how does it sound": the browser's own Hebrew voice, when it has one */
function sayButton(full) {
  const b = $('#fsay'), S = window.speechSynthesis;
  if (!b || !S) return;
  const voice = () => S.getVoices().find(v => /^he/i.test(v.lang));
  const show = () => { b.hidden = !voice() };
  show(); S.onvoiceschanged = show;
  b.onclick = () => { S.cancel(); const u = new SpeechSynthesisUtterance(full); u.lang = 'he-IL'; u.voice = voice(); u.rate = .9; S.speak(u) };
}

form.addEventListener('submit', ev => { ev.preventDefault(); if (render()) out.scrollIntoView({ behavior: 'smooth', block: 'start' }) });
F('lastEn').addEventListener('input', () => { lastEnTouched = !!F('lastEn').value.trim() });
F('last').addEventListener('input', () => { if (!lastEnTouched) F('lastEn').value = enLast(norm(F('last').value)) });
F('first').addEventListener('change', () => {   // the suggestions follow the sex of the name typed
  const r = rec(norm(F('first').value)); if (r) form.querySelector(`[name=sex][value="${r[1]}"]`).checked = true;
});
form.addEventListener('change', ev => { if (!out.hidden && ev.target.name !== 'first') render() });

/* start: the name from the link, the surname from this device */
{
  let n = '';
  try { n = norm(new URLSearchParams(location.search).get('n') || '') } catch (e) { }
  const sn = store.get('surname'), snEn = store.get('surname_en');
  if (n) { F('first').value = n; const r = rec(n); if (r) form.querySelector(`[name=sex][value="${r[1]}"]`).checked = true }
  if (typeof sn === 'string' && sn) F('last').value = clean(sn);
  if (typeof snEn === 'string' && snEn) { F('lastEn').value = snEn; lastEnTouched = true } else if (F('last').value) F('lastEn').value = enLast(norm(F('last').value));
  if (F('first').value && F('last').value) render();
}
