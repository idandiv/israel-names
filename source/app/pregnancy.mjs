/* Pregnancy pages (built by tools/pregnancy.py, loaded as a module on every /pregnancy page): the calculator on
   /pregnancy/calculator, and "your week" on the week pages and the hub, from the date saved on this device.
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

/* the saved input (JSON from localStorage) -> {v, due, st} on day `now`, or null when there is none or it no longer works */
export function saved(raw, now) {
  let v = null;
  try { v = JSON.parse(raw || 'null'); } catch (e) { return null; }
  if (!v || typeof v !== 'object') return null;
  const day = toDay(v.d), opts = { cycle: +v.c || 28, embryo: +v.e || 5 };
  if (problem(v.m, day, now, opts)) return null;
  const due = dueDate(v.m, day, opts);
  return { v, due, st: status(due, now) };
}

/* the week shown on the week pages: 4 to 42 (before week 4 there is no page) */
export const pageWeek = st => Math.min(42, st.weeks);

/* a checkup's dates: from the start of week `from` (from+0) to the end of week `to` (to+6) */
export const checkWindow = (due, x) => [due - TERM + x.from * 7, due - TERM + x.to * 7 + 6];

/* 'done', 'past' (the window is over), 'now' (today is in it) or 'soon' */
export function checkState(due, x, now, done = []) {
  if (done.includes(x.id)) return 'done';
  const [a, b] = checkWindow(due, x);
  return now > b ? 'past' : now >= a ? 'now' : 'soon';
}

/* the checkup to show first: the earliest one that is not done and not over, or null */
export const nextCheck = (list, due, now, done = []) =>
  list.find(x => ['now', 'soon'].includes(checkState(due, x, now, done))) || null;

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
// {m, d, c, e}: the input; done: the ids of the checkups marked as done; seen: the week shown on the last visit
const fmtN = n => n.toLocaleString('he-IL');
const dm = day => new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'numeric', timeZone: 'UTC' }).format(new Date(day * DAY));
const STATE = { done: 'בוצעה', past: 'המועד עבר', now: 'עכשיו', soon: '' };
const load = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
const keep = v => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* private mode: works without saving */ } };
const weeksText = n => (n === 1 ? 'שבוע' : n === 2 ? 'שבועיים' : `${n} שבועות`);

/* the line under the week on a return visit: what changed since the week shown last time */
export function sinceText(seen, weeks) {
  if (!(seen >= 0) || seen === weeks) return '';
  return weeks > seen ? `מאז הביקור הקודם עברתם לשבוע ${weeks}.` : '';
}

function checks(D, due, now, done) {
  const next = nextCheck(D.checkups, due, now, done);
  const when = x => { const [a, b] = checkWindow(due, x); return `בין ${dm(a)} ל-${dm(b)}`; };
  return `<section class="pr-checks"><h3>הבדיקות שלכם</h3>
    ${next ? `<p class="pr-next"><b>${checkState(due, next, now, done) === 'now' ? 'עכשיו הזמן' : 'הבדיקה הבאה'}: ${next.name}</b><span>${when(next)}</span></p>` : ''}
    <ul class="pchk">${D.checkups.map(x => { const s = checkState(due, x, now, done); return `<li class="is-${s}">
      <label><input type="checkbox" data-check="${x.id}"${s === 'done' ? ' checked' : ''}><span><b>${x.name}</b><span>${when(x)}${STATE[s] ? ` · ${STATE[s]}` : ''}</span></span></label></li>`; }).join('')}</ul>
    <p class="pr-more">סמנו בדיקות שעשיתם, והסימון יישמר במכשיר. <a href="#checkups">מה כל בדיקה</a> · לוח כללי, המועדים נקבעים מול הרופא והקופה.</p></section>`;
}

function render(D, st, due, now, v, since) {
  const wk = D.weeks[Math.min(42, st.weeks)];
  const heb = hebrewDate(due), mon = D.months[heb.month];
  const left = st.left > 0 ? `עוד ${fmtN(st.left)} ימים${st.left >= 14 ? ` (כ-${Math.round(st.left / 7)} שבועות)` : ''}`
    : st.left === 0 ? 'היום!' : `התאריך עבר לפני ${fmtN(-st.left)} ימים`;
  const size = wk ? `<h3>שבוע ${Math.min(42, st.weeks)}: בגודל של ${wk.size}</h3>
      <p class="pr-num">כ-${wk.cm} ס״מ${wk.g ? ` · כ-${fmtN(wk.g)} גרם` : ''}</p><p>${wk.baby}</p>
      <p class="pr-more"><a href="/pregnancy/week-${Math.min(42, st.weeks)}">עוד על שבוע ${Math.min(42, st.weeks)}</a> · <a href="/pregnancy">כל השבועות</a></p>`
    : `<h3>השבועות הראשונים</h3><p>${D.early}</p>`;
  return `<div class="pr-head"><span class="pr-k">שבוע ההריון</span>
      <b class="pr-w" dir="ltr">${st.weeks}+${st.days}</b>
      <span>${st.weeks} שבועות ו-${st.days} ימים · השבוע ה-${st.week} · ${TRI[st.trimester]}</span>
      ${since ? `<p class="pr-since">${since}</p>` : ''}</div>
    <div class="pr-bar" role="progressbar" aria-label="התקדמות ההריון" aria-valuemin="0" aria-valuemax="40" aria-valuenow="${Math.min(40, st.weeks)}"><i style="width:${st.pct.toFixed(1)}%"></i></div>
    <div class="pr-tri"><span>שליש 1</span><span>שליש 2</span><span>שליש 3</span></div>
    <dl class="pr-facts"><div><dt>תאריך לידה משוער</dt><dd>${gregorianText(due)}<span>${heb.text}</span></dd></div>
      <div><dt>עד התאריך המשוער</dt><dd>${left}</dd></div></dl>
    <section class="pr-week">${size}</section>
    ${checks(D, due, now, v.done || [])}
    ${mon ? `<section class="pr-names"><h3>נולדים ב${heb.month}? שמות שמתאימים לחודש</h3><p class="k">${mon.note}</p>
      <p class="cgc">${mon.names.map(([n, href]) => `<a href="${href}">${n}</a>`).join('')}</p>
      <p class="pr-more"><a href="#months">שמות לכל החודשים</a> · <a href="/guides">מדריכים ומאמרים לבחירת שם</a></p></section>` : ''}
    <p class="pr-save">התאריך נשמר רק בדפדפן במכשיר הזה, כדי שבביקור הבא תראו מיד את השבוע העדכני. <button type="button" id="pforget">מחיקת התאריך</button></p>`;
}

function calculator() {
  const D = JSON.parse(document.getElementById('pdata').textContent);
  const form = document.getElementById('pform'), out = document.getElementById('pres'), err = document.getElementById('perr');
  const date = form.elements.date, cycle = form.elements.cycle, embryo = form.elements.embryo;
  const method = () => (form.querySelector('input[name="method"]:checked') || {}).value;
  date.max = fromDay(todayDay());
  const sync = () => form.querySelectorAll('[data-for]').forEach(el => { el.hidden = el.dataset.for !== method(); });
  const read = () => ({ m: method(), d: date.value, c: +cycle.value, e: +embryo.value });
  let state = {};
  function show(v, save, since = '') {
    const now = todayDay(), day = toDay(v.d), opts = { cycle: v.c, embryo: v.e };
    const why = problem(v.m, day, now, opts);
    err.textContent = why ? ERR[why] : '';
    err.hidden = !why;
    if (why) { out.hidden = true; return; }
    const due = dueDate(v.m, day, opts), st = status(due, now);
    // a new date starts with no checkups marked; the same date keeps them
    state = { ...v, done: save && (state.d !== v.d || state.m !== v.m) ? [] : state.done || [], seen: st.weeks };
    out.innerHTML = render(D, st, due, now, state, since);
    out.hidden = false;
    out.querySelectorAll('[data-check]').forEach(box => box.addEventListener('change', () => {
      const id = box.dataset.check;
      state.done = box.checked ? [...new Set([...state.done, id])] : state.done.filter(x => x !== id);
      keep(state);
      const y = scrollY;
      show(state, false);
      scrollTo(0, y);
      const again = out.querySelector(`[data-check="${id}"]`);
      if (again) again.focus();
    }));
    document.getElementById('pforget').onclick = () => {
      try { localStorage.removeItem(KEY); } catch (e) { /* storage blocked: nothing was saved */ }
      state = {}; out.hidden = true; form.reset(); sync(); date.focus();
    };
    keep(state);
    if (save) {
      out.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    }
  }
  form.addEventListener('change', e => { if (e.target.name === 'method') sync(); });
  form.addEventListener('submit', e => { e.preventDefault(); show(read(), true); });
  const s = saved(load(), todayDay());
  if (s) {
    const v = s.v;
    form.querySelector(`input[name="method"][value="${v.m}"]`).checked = true;
    date.value = v.d;
    if (v.c) cycle.value = String(v.c);
    if (v.e) embryo.value = String(v.e);
    state = { ...v, done: Array.isArray(v.done) ? v.done : [] };
    sync(); show(read(), false, sinceText(v.seen, s.st.weeks));
  } else sync();
}

/* "your week" on a week page (data-pweek) and on the hub (data-phub), when a date is saved on this device */
function yourWeek(el) {
  const s = saved(load(), todayDay());
  if (!s || s.st.weeks < 4) return;
  const w = pageWeek(s.st), here = +el.dataset.pweek, at = `<bdi dir="ltr">${s.st.weeks}+${s.st.days}</bdi>`;
  const link = `<a href="/pregnancy/week-${w}">לעמוד של שבוע ${w}</a>`;
  if ('phub' in el.dataset) {
    el.innerHTML = `<b>לפי התאריך ששמרתם, אתם בשבוע ${w}</b> (${at}). ${link}`;
    const tile = document.querySelector(`.pwk a[data-w="${w}"]`);
    if (tile) { tile.classList.add('pcur'); tile.setAttribute('aria-current', 'true'); }
  } else if (here === w) {
    el.innerHTML = `<b>זה השבוע שלכם</b>, לפי התאריך ששמרתם (${at}).`;
  } else {
    el.innerHTML = here > w
      ? `לפי התאריך ששמרתם אתם בשבוע ${w} (${at}), ולשבוע הזה תגיעו בעוד ${weeksText(here - w)}. ${link}`
      : `לפי התאריך ששמרתם אתם כבר בשבוע ${w} (${at}). ${link}`;
  }
  el.hidden = false;
}

if (typeof document !== 'undefined') {
  if (document.getElementById('pform')) calculator();
  document.querySelectorAll('.pmine').forEach(yourWeek);
}
