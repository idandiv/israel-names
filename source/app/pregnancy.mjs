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
const STATE = { done: 'בוצעה', past: 'המועד עבר', now: 'עכשיו', soon: '' };
const load = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
const keep = v => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* private mode: works without saving */ } };
const weeksText = n => (n === 1 ? 'שבוע' : n === 2 ? 'שבועיים' : `${n} שבועות`);

/* the line under the week on a return visit: what changed since the week shown last time */
export function sinceText(seen, weeks) {
  if (!(seen >= 0) || seen === weeks) return '';
  return weeks > seen ? `מאז הביקור הקודם עברתם לשבוע ${weeks}.` : '';
}

const dm = day => new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'numeric', timeZone: 'UTC' }).format(new Date(day * DAY));
/* ---- calendar file (.ics, RFC 5545), made on the device ---- */
const ymd = day => fromDay(day).replace(/-/g, '');
/* text values: backslash, semicolon, comma and line breaks are escaped */
export const icsEscape = s => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
/* lines longer than 75 octets (UTF-8 bytes, not letters: a Hebrew letter is 2) go on, after CRLF and a space;
   a letter is never cut in the middle */
export function icsFold(line) {
  const enc = new TextEncoder();
  const out = [];
  let cur = '', n = 0;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    if (n + b > 75) { out.push(cur); cur = ' '; n = 1; }
    cur += ch; n += b;
  }
  out.push(cur);
  return out.join('\r\n');
}
/* the calendar: an all-day event on the first day of each coming week (to 41; 40+0 is the due date), the due date,
   and each checkup that is not done or over, on the day its window opens (today if it is open now).
   UIDs depend only on the event and the due date, so importing again updates the same events. */
export function ics({ due, now, info = {}, checkups = [], done = [], weeks = true, checks = true, site = 'https://www.shemotil.co.il', stamp }) {
  stamp = stamp || new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//shemotil.co.il//pregnancy//HE', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    `X-WR-CALNAME:${icsEscape('ההריון שלנו · השמות של ישראל')}`];
  const ev = (uid, day, summary, desc, url) => L.push('BEGIN:VEVENT', `UID:${uid}-${ymd(due)}@shemotil.co.il`, `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${ymd(day)}`, `DTEND;VALUE=DATE:${ymd(day + 1)}`, `SUMMARY:${icsEscape(summary)}`, `DESCRIPTION:${icsEscape(desc)}`,
    ...(url ? [`URL:${url}`] : []), 'TRANSP:TRANSPARENT',
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsEscape(summary)}`, 'TRIGGER:PT9H', 'END:VALARM', 'END:VEVENT');
  const start = due - TERM;
  if (weeks) {
    for (let w = Math.max(4, Math.floor((now - start) / 7) + 1); w <= 41; w++) {
      if (w === 40) continue;
      const wk = info[w], url = `${site}/pregnancy/week-${w}`;
      ev(`w${w}`, start + w * 7, `שבוע ${w} להריון`, `${wk ? `בגודל של ${wk.size}. ` : ''}מה קורה השבוע: ${url}`, url);
    }
  }
  if (due >= now) ev('due', due, 'תאריך הלידה המשוער', `שבוע 40. בהצלחה! ${site}/pregnancy/week-40`, `${site}/pregnancy/week-40`);
  if (checks) {
    for (const x of checkups) {
      const [a, b] = checkWindow(due, x);
      if (done.includes(x.id) || b < now) continue;
      ev(`c-${x.id}`, Math.max(a, now), `בדיקה: ${x.name}`,
        `${x.what}\nהמועד: ${dm(a)} עד ${dm(b)}. לוח כללי, המועדים נקבעים מול הרופא והקופה.\n${site}/pregnancy/calculator#checkups`);
    }
  }
  L.push('END:VCALENDAR');
  return L.map(icsFold).join('\r\n') + '\r\n';
}

/* ---- the share card: what it says (pure), then the drawing ---- */
export function cardLines(st, info, heb, { month = false } = {}) {
  const w = Math.min(42, st.weeks), wk = info[w];
  return { kicker: 'שבוע ההריון', week: String(w), sub: wk ? `בגודל של ${wk.size}` : 'השבועות הראשונים',
    month: month && heb ? `מגיע/ה ב${heb.month}` : '', pct: st.pct, site: 'shemotil.co.il' };
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

const shareHtml = w => `<section class="pr-share"><h3>תזכורת בכל שבוע</h3>
    <p>קובץ יומן לטלפון או למחשב: אירוע בכל פעם שמתחיל שבוע חדש, עם קישור לעמוד של השבוע, ותזכורת כשמגיע המועד של בדיקה. הקובץ נוצר במכשיר, ושום פרט לא נשלח.</p>
    <div class="pr-opts"><label><input type="checkbox" id="pics-w" checked>השבועות</label><label><input type="checkbox" id="pics-c" checked>הבדיקות</label></div>
    <p class="pr-acts"><button type="button" class="pbtn" id="pics">הוספה ליומן</button></p>
    <h3>לשתף</h3>
    <p>כרטיס עם השבוע והגודל, לשליחה למשפחה ולחברים. הוא נוצר במכשיר ואין בו תאריכים.</p>
    <div class="pr-opts"><label><input type="checkbox" id="pcard-m">להוסיף את החודש העברי של הלידה</label></div>
    <p class="pr-acts"><button type="button" class="pbtn" id="pcard">יצירת כרטיס</button><button type="button" class="pbtn2" id="plink">העתקת קישור לשבוע ${w}</button></p>
    <figure class="pr-card" id="pcardbox" hidden><img alt="כרטיס שיתוף: שבוע ${w} להריון" width="1080" height="1350">
      <figcaption class="pr-acts"><button type="button" class="pbtn" id="pshare" hidden>שיתוף</button><a class="pbtn2" download="shemotil-week-${w}.png">הורדה</a></figcaption></figure>
    <p class="pr-msg" id="pmsg" role="status"></p></section>`;

function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4e3);
}

/* 1080x1350 PNG in the site's fonts (already on the page), right to left */
const FONTS = ['700 100px Karantina', '700 60px "IBM Plex Sans Hebrew"', '600 60px "IBM Plex Sans Hebrew"', '500 60px "IBM Plex Sans Hebrew"'];
async function drawCard(c) {
  try { await Promise.all(FONTS.map(f => document.fonts.load(f, 'שבוע 20'))); } catch (e) { /* the fallback font still draws */ }
  const cv = document.createElement('canvas');
  cv.width = 1080; cv.height = 1350;
  const x = cv.getContext('2d');
  const g = x.createLinearGradient(0, 0, 1080, 1350);
  g.addColorStop(0, '#272266'); g.addColorStop(1, '#101119');
  x.fillStyle = g; x.fillRect(0, 0, 1080, 1350);
  x.fillStyle = 'rgba(164,157,255,.12)'; x.beginPath(); x.arc(540, 520, 330, 0, 2 * Math.PI); x.fill();
  x.direction = 'rtl'; x.textAlign = 'center';
  const fit = (text, font, size, max) => { do { x.font = font.replace('$', size); size -= 4; } while (x.measureText(text).width > max && size > 24); };
  x.fillStyle = '#b9bcd3'; x.font = '600 50px "IBM Plex Sans Hebrew"'; x.fillText(c.kicker, 540, 300);
  x.fillStyle = '#f0f1f8'; x.font = '700 440px Karantina'; x.fillText(c.week, 540, 700);
  x.fillStyle = '#a49dff'; fit(c.sub, '700 $px "IBM Plex Sans Hebrew"', 76, 940); x.fillText(c.sub, 540, 950);
  if (c.month) { x.fillStyle = '#f0f1f8'; fit(c.month, '500 $px "IBM Plex Sans Hebrew"', 54, 940); x.fillText(c.month, 540, 1035); }
  const bar = (a, w) => { x.beginPath(); if (x.roundRect) x.roundRect(a, 1100, w, 16, 8); else x.rect(a, 1100, w, 16); x.fill(); };
  x.fillStyle = 'rgba(255,255,255,.12)'; bar(160, 760);
  const fw = Math.max(16, 760 * c.pct / 100);
  x.fillStyle = '#a49dff'; bar(920 - fw, fw);   // right to left, like the bar on the page
  x.font = '700 70px Karantina'; x.fillText('השמות של ישראל', 540, 1235);
  x.direction = 'ltr'; x.fillStyle = '#8a8ea8'; x.font = '500 36px "IBM Plex Sans Hebrew"'; x.fillText(c.site, 540, 1290);
  return new Promise(r => cv.toBlob(r, 'image/png'));
}

/* the buttons of the share section (made again on each render) */
function share(D, st, due, now, done) {
  const q = sel => document.querySelector(sel), msg = q('#pmsg'), w = Math.min(42, st.weeks);
  const box = q('#pcardbox'), img = box.querySelector('img'), dl = box.querySelector('a'), btn = q('#pshare');
  const opts = () => ({ weeks: q('#pics-w').checked, checks: q('#pics-c').checked });
  q('#pics-w').onchange = q('#pics-c').onchange = () => { const o = opts(); q('#pics').disabled = !o.weeks && !o.checks; };
  q('#pics').onclick = () => {
    const text = ics({ due, now, info: D.weeks, checkups: D.checkups, done, ...opts(), site: location.origin });
    download(new Blob([text], { type: 'text/calendar;charset=utf-8' }), 'shemotil-pregnancy.ics');
    msg.textContent = 'הקובץ ירד. פתחו אותו כדי להוסיף את האירועים ליומן.';
  };
  let file = null, url = '';
  const card = async () => {
    const blob = await drawCard(cardLines(st, D.weeks, hebrewDate(due), { month: q('#pcard-m').checked }));
    if (!blob) { msg.textContent = 'לא הצלחנו ליצור את הכרטיס בדפדפן הזה.'; return; }
    if (url) URL.revokeObjectURL(url);
    url = URL.createObjectURL(blob);
    file = new File([blob], `shemotil-week-${w}.png`, { type: 'image/png' });
    img.src = url; dl.href = url; box.hidden = false;
    btn.hidden = !(navigator.canShare && navigator.canShare({ files: [file] }));
    msg.textContent = '';
  };
  q('#pcard').onclick = card;
  q('#pcard-m').onchange = () => { if (!box.hidden) card(); };
  btn.onclick = () => navigator.share({ files: [file], title: `שבוע ${w} להריון` }).catch(() => { /* closed or not allowed */ });
  q('#plink').onclick = async () => {
    const link = `${location.origin}/pregnancy/week-${w}`;
    try { await navigator.clipboard.writeText(link); msg.textContent = `הקישור הועתק: ${link}`; } catch (e) { msg.textContent = link; }
  };
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
    ${shareHtml(Math.min(42, st.weeks))}
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
    share(D, st, due, now, state.done);
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
