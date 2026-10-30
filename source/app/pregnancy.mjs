/* Pregnancy calculator, /pregnancy/calculator (built by tools/pregnancy.py, loaded only on that page as a module).
   The date math is exported for tests/pregnancy.test.mjs; the page part runs only in a browser.
   Dates are whole days since 1970-01-01 (UTC), so a daylight saving change never moves a day. */
export const DAY = 864e5;
export const TERM = 280;                     // days from the last period to the due date
export const METHODS = ['lmp', 'conception', 'ivf'];

/* 'YYYY-MM-DD' -> day number, null when it is not a real date */
export function toDay(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3] ? d.getTime() / DAY : null;
}
export const fromDay = n => new Date(n * DAY).toISOString().slice(0, 10);
/* the visitor's own calendar date (local time), as a day number */
export const todayDay = (now = new Date()) => Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / DAY;

/* due date: last period + 280 days, moved by the cycle's difference from 28 days; conception + 266;
   IVF transfer + 266 minus the embryo's age (3 or 5 days) */
export function dueDate(method, day, { cycle = 28, embryo = 5 } = {}) {
  if (method === 'lmp') return day + TERM + (cycle - 28);
  if (method === 'conception') return day + 266;
  if (method === 'ivf') return day + 266 - embryo;
  throw new Error('unknown method ' + method);
}

/* trimesters: first up to 13+6, second 14+0 to 27+6, third from 28+0 */
export const trimester = ga => (ga < 14 * 7 ? 1 : ga < 28 * 7 ? 2 : 3);

/* where the pregnancy stands on day `now`: ga = days since the (adjusted) last period */
export function status(due, now) {
  const ga = now - (due - TERM);
  return { ga, weeks: Math.floor(ga / 7), days: ga % 7, week: Math.floor(ga / 7) + 1, trimester: trimester(ga),
    left: due - now, pct: Math.min(100, Math.max(0, (ga / TERM) * 100)) };
}

/* null when the input can be calculated, otherwise the reason (a key of ERR) */
export function problem(method, day, now, { cycle = 28, embryo = 5 } = {}) {
  if (!METHODS.includes(method)) return 'method';
  if (day == null) return 'date';
  if (day > now) return 'future';
  if (method === 'lmp' && !(cycle >= 21 && cycle <= 45)) return 'cycle';
  if (method === 'ivf' && embryo !== 3 && embryo !== 5) return 'embryo';
  const ga = now - (dueDate(method, day, { cycle, embryo }) - TERM);
  if (ga < 0) return 'early';
  if (ga > 44 * 7) return 'past';
  return null;
}

/* 1-999 in Hebrew letters with geresh or gershayim: 15 -> ט״ו, 787 -> תשפ״ז */
const HL = [[400, 'ת'], [300, 'ש'], [200, 'ר'], [100, 'ק'], [90, 'צ'], [80, 'פ'], [70, 'ע'], [60, 'ס'], [50, 'נ'], [40, 'מ'],
  [30, 'ל'], [20, 'כ'], [10, 'י'], [9, 'ט'], [8, 'ח'], [7, 'ז'], [6, 'ו'], [5, 'ה'], [4, 'ד'], [3, 'ג'], [2, 'ב'], [1, 'א']];
export function hebNum(n) {
  let s = '';
  n %= 1000;
  while (n > 0) {
    if (n === 15 || n === 16) { s += n === 15 ? 'טו' : 'טז'; break; }
    const [v, c] = HL.find(([v]) => v <= n);
    s += c; n -= v;
  }
  return s.length === 1 ? s + '׳' : s.slice(0, -1) + '״' + s.slice(-1);
}

/* the Hebrew date of a day: {text: 'ט״ו בניסן תשפ״ז', month: 'ניסן'}; month is the key of the month lists (both Adars are אדר) */
const MONTH_KEY = { 'חשון': 'חשוון', 'מרחשוון': 'חשוון', 'סיון': 'סיוון' };
export function hebrewDate(day) {
  const p = new Intl.DateTimeFormat('he-u-ca-hebrew', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    .formatToParts(new Date(day * DAY));
  const get = t => (p.find(x => x.type === t) || {}).value || '';
  const num = v => (/^\d+$/.test(v) ? hebNum(+v) : v);
  const month = get('month');
  const key = month.startsWith('אדר') ? 'אדר' : MONTH_KEY[month] || month;
  return { text: `${num(get('day'))} ב${month} ${num(get('year'))}`, month: key };
}

export const gregorianText = day => new Intl.DateTimeFormat('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
  .format(new Date(day * DAY));

const ERR = {
  method: 'בחרו שיטת חישוב.', date: 'בחרו תאריך.', future: 'התאריך שבחרתם עוד לא הגיע.',
  cycle: 'אורך המחזור צריך להיות בין 21 ל-45 ימים.', embryo: 'בחרו את גיל העובר: 3 או 5 ימים.',
  early: 'לפי התאריך ואורך המחזור, עוד מוקדם לחשב שבוע הריון.',
  past: 'לפי התאריך הזה ההריון כבר אמור היה להסתיים. כדאי לבדוק את התאריך.',
};
const TRI = ['', 'השליש הראשון', 'השליש השני', 'השליש השלישי'];
const KEY = 'bnil_pregnancy';  // the bnil_ prefix: the site's "delete all my data" button removes it too
const fmtN = n => n.toLocaleString('he-IL');

function render(D, st, due) {
  const wk = D.weeks[Math.min(42, st.weeks)];
  const heb = hebrewDate(due), mon = D.months[heb.month];
  const left = st.left > 0 ? `עוד ${fmtN(st.left)} ימים${st.left >= 14 ? ` (כ-${Math.round(st.left / 7)} שבועות)` : ''}`
    : st.left === 0 ? 'היום!' : `התאריך עבר לפני ${fmtN(-st.left)} ימים`;
  const size = wk ? `<h3>שבוע ${Math.min(42, st.weeks)}: בגודל של ${wk.size}</h3>
      <p class="pr-num">כ-${wk.cm} ס״מ${wk.g ? ` · כ-${fmtN(wk.g)} גרם` : ''}</p><p>${wk.baby}</p>`
    : `<h3>השבועות הראשונים</h3><p>${D.early}</p>`;
  return `<div class="pr-head"><span class="pr-k">שבוע ההריון</span>
      <b class="pr-w" dir="ltr">${st.weeks}+${st.days}</b>
      <span>${st.weeks} שבועות ו-${st.days} ימים · השבוע ה-${st.week} · ${TRI[st.trimester]}</span></div>
    <div class="pr-bar" role="progressbar" aria-label="התקדמות ההריון" aria-valuemin="0" aria-valuemax="40" aria-valuenow="${Math.min(40, st.weeks)}"><i style="width:${st.pct.toFixed(1)}%"></i></div>
    <div class="pr-tri"><span>שליש 1</span><span>שליש 2</span><span>שליש 3</span></div>
    <dl class="pr-facts"><div><dt>תאריך לידה משוער</dt><dd>${gregorianText(due)}<span>${heb.text}</span></dd></div>
      <div><dt>עד התאריך המשוער</dt><dd>${left}</dd></div></dl>
    <section class="pr-week">${size}</section>
    ${mon ? `<section class="pr-names"><h3>נולדים ב${heb.month}? שמות שמתאימים לחודש</h3><p class="k">${mon.note}</p>
      <p class="cgc">${mon.names.map(([n, href]) => `<a href="${href}">${n}</a>`).join('')}</p>
      <p class="pr-more"><a href="#months">שמות לכל החודשים</a> · <a href="/guides">מדריכים ומאמרים לבחירת שם</a></p></section>` : ''}
    <p class="pr-save">התאריך נשמר רק בדפדפן במכשיר הזה, כדי שבביקור הבא תראו מיד את השבוע העדכני. <button type="button" id="pforget">מחיקת התאריך</button></p>`;
}

function init() {
  const D = JSON.parse(document.getElementById('pdata').textContent);
  const form = document.getElementById('pform'), out = document.getElementById('pres'), err = document.getElementById('perr');
  const date = form.elements.date, cycle = form.elements.cycle, embryo = form.elements.embryo;
  const method = () => (form.querySelector('input[name="method"]:checked') || {}).value;
  date.max = fromDay(todayDay());
  const sync = () => form.querySelectorAll('[data-for]').forEach(el => { el.hidden = el.dataset.for !== method(); });
  const read = () => ({ m: method(), d: date.value, c: +cycle.value, e: +embryo.value });
  function show(v, save) {
    const now = todayDay(), day = toDay(v.d), opts = { cycle: v.c, embryo: v.e };
    const why = problem(v.m, day, now, opts);
    err.textContent = why ? ERR[why] : '';
    err.hidden = !why;
    if (why) { out.hidden = true; return; }
    const due = dueDate(v.m, day, opts);
    out.innerHTML = render(D, status(due, now), due);
    out.hidden = false;
    document.getElementById('pforget').onclick = () => {
      try { localStorage.removeItem(KEY); } catch (e) { /* storage blocked: nothing was saved */ }
      out.hidden = true; form.reset(); sync(); date.focus();
    };
    if (save) {
      try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* private mode: works without saving */ }
      out.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    }
  }
  form.addEventListener('change', e => { if (e.target.name === 'method') sync(); });
  form.addEventListener('submit', e => { e.preventDefault(); show(read(), true); });
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { saved = null; }
  if (saved && METHODS.includes(saved.m)) {
    form.querySelector(`input[name="method"][value="${saved.m}"]`).checked = true;
    date.value = saved.d || '';
    if (saved.c) cycle.value = String(saved.c);
    if (saved.e) embryo.value = String(saved.e);
    sync(); show(read(), false);
  } else sync();
}

if (typeof document !== 'undefined' && document.getElementById('pform')) init();
