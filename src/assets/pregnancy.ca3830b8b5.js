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

/* the Hebrew day and month of a day as Intl writes the month: {d: 14, m: 'אדר ב׳'} */
export function hebDM(day) {
  const p = new Intl.DateTimeFormat('he-u-ca-hebrew', { day: 'numeric', month: 'long', timeZone: 'UTC' }).formatToParts(new Date(day * DAY));
  const get = t => (p.find(x => x.type === t) || {}).value || '';
  return { d: +get('day'), m: get('month') };
}
/* a month of pregnancy.json (MONTHS in tools/pregnancy.py) on an Intl month: in a leap year Purim is in אדר ב׳, not in אדר א׳ */
const isMonth = (key, m) => (key === 'אדר' ? m === 'אדר' || m === 'אדר ב׳' : (MONTH_KEY[m] || m) === key);

/* the holidays (pregnancy.json holidays) that fall, all or partly, between days a and b: [{...holiday, from, to}] by date */
export function holidaysBetween(holidays, a, b) {
  const out = [], longest = Math.max(1, ...holidays.map(h => h.len));
  for (let d = a - longest + 1; d <= b; d++) {
    const x = hebDM(d);
    for (const h of holidays) if (h.day === x.d && isMonth(h.month, x.m) && d + h.len - 1 >= a) out.push({ ...h, from: d, to: d + h.len - 1 });
  }
  return out;
}
/* the weeks around the due date when most babies are born, 37+0 to 41+6, as days */
export const birthWindow = due => [due - TERM + 37 * 7, due - TERM + 41 * 7 + 6];
/* where the names search usually is at this week: dream (to 13), sex (14-22, the anatomy scans), narrow (23-33), decide (34 on) */
export const journeyStage = weeks => (weeks < 14 ? 'dream' : weeks < 23 ? 'sex' : weeks < 34 ? 'narrow' : 'decide');

/* ---- brit mila and pidyon haben (Shulchan Aruch, Yoreh De'ah 262, 266, 305) ---- */
export const isShabbat = day => new Date(day * DAY).getUTCDay() === 6;
/* the holidays of the Israeli calendar on which work is forbidden (one day each, as in Israel); '' on any other day */
const YOMTOV = { 'תשרי': { 1: 'ראש השנה', 2: 'ראש השנה', 10: 'יום כיפור', 15: 'סוכות', 22: 'שמיני עצרת' },
  'ניסן': { 15: 'פסח', 21: 'שביעי של פסח' }, 'סיוון': { 6: 'שבועות' } };
export function yomTov(day) {
  const x = hebDM(day);
  return (YOMTOV[MONTH_KEY[x.m] || x.m] || {})[x.d] || '';
}
/* birth: the civil date of the birth; evening: born after sunset, when the Hebrew day has already turned.
   heb: the civil day whose daytime is the Hebrew birth day (day 1); brit: day 8; pidyon: day 31, or the next day
   that is not Shabbat or a holiday */
export function britDates(birth, evening) {
  const heb = birth + (evening ? 1 : 0), brit = heb + 7, first = heb + 30;
  let pidyon = first;
  while (isShabbat(pidyon) || yomTov(pidyon)) pidyon++;
  return { heb, brit, britRest: isShabbat(brit) ? 'שבת' : yomTov(brit), pidyon, moved: pidyon !== first,
    movedFrom: isShabbat(first) ? 'שבת' : yomTov(first) };
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

/* the size of the baby, drawn: one flat illustration per fruit or vegetable (64x64), the same on every device */
const G = '#4f9a55', G2 = '#3d7f44', BR = '#7a5230';
const hi = (x, y, rx = 4, ry = 3) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#fff" opacity=".45" transform="rotate(-30 ${x} ${y})"/>`;
const round = (cx, cy, r, dark, main) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${dark}"/><circle cx="${cx - r * .09}" cy="${cy - r * .09}" r="${r * .9}" fill="${main}"/>${hi(cx - r * .42, cy - r * .42, r * .24, r * .16)}`;
const leaf = (x, y, a = 0, c = G) => `<path d="M${x} ${y}c3-6 10-8 15-6-2 6-9 9-15 6z" fill="${c}" transform="rotate(${a} ${x} ${y})"/>`;
const stem = (x1, y1, x2, y2, w = 2.5, c = BR) => `<path d="M${x1} ${y1}Q${(x1 + x2) / 2 + 1} ${(y1 + y2) / 2} ${x2} ${y2}" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round"/>`;
const ring = r => `<circle cx="32" cy="34" r="${r}" fill="none" stroke="#a49dff" stroke-width="1.5" stroke-dasharray="2 4" opacity=".8"/>`;
const grid = (pts, r, c, s) => pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"${s ? ` stroke="${s}" stroke-width="1"` : ''}/>`).join('');
const squash = (a, b, c, st) => `<ellipse cx="32" cy="39" rx="21" ry="15" fill="${a}"/><ellipse cx="32" cy="39" rx="14" ry="15" fill="${b}"/><ellipse cx="32" cy="39" rx="6.5" ry="15" fill="${c}"/>${hi(20, 33, 4, 2.6)}${stem(32, 25, 36, 15, 4.5, st)}`;
const melonLines = '<path d="M17 30c8 4 22 4 30 0M14 39c10 4 26 4 36 0M17 48c8 3 22 3 30 0M24 19c-4 10-4 30 0 34M40 19c4 10 4 30 0 34M32 17v38" stroke="#f6e6b8" stroke-width="1.3" fill="none" opacity=".8"/>';

export const ART = {
  poppy: `${ring(13)}<path d="M27 31c2.5-4 10-4 11 1 1 4-1.5 8-6 8-4 0-7.5-5-5-9z" fill="#7a7f9c"/>${hi(30, 32.5, 2, 1.2)}`,
  sesame: `${ring(16)}<path d="M32 22c5 5 8 10 8 14a8 8 0 0 1-16 0c0-4 3-9 8-14z" fill="#efdcb1"/><path d="M32 22c5 5 8 10 8 14a8 8 0 0 1-4 7c2-6 0-13-4-21z" fill="#d9c08a"/>${hi(29, 33, 2, 1.4)}`,
  lentil: `${ring(18)}<ellipse cx="32" cy="35" rx="12" ry="9" fill="#c86e28"/><ellipse cx="31" cy="34" rx="10.5" ry="7.5" fill="#e98d3f"/>${hi(26.5, 31.5, 3, 1.8)}`,
  blueberry: `${round(32, 36, 18, '#2f3c80', '#4f64c4')}<path d="M32 26l1.8 3.2 3.6-.6-1.6 3.2 2.6 2.4-3.6.4L32 38l-1.4-3.4-3.6-.4 2.6-2.4-1.6-3.2 3.6.6z" fill="#27336d"/>`,
  raspberry: `<path d="M23 21c4-4 14-4 18 0-3 1-6 2-9 2s-6-1-9-2z" fill="${G}"/>${grid([[26, 28], [32, 27], [38, 28], [23, 35], [29, 34], [35, 34], [41, 35], [25, 42], [31, 41], [37, 42], [28, 48], [34, 48], [31, 54]], 5.2, '#e44f74', '#b52f55')}${grid([[24.5, 26.5], [30.5, 25.5], [36.5, 26.5], [21.5, 33.5], [27.5, 32.5], [33.5, 32.5], [23.5, 40.5], [29.5, 39.5]], 1.4, '#ffd0dc')}`,
  cherry: `${stem(23, 40, 38, 12)}${stem(41, 42, 38, 12)}${leaf(38, 12, -10)}${round(22, 46, 11, '#8e1630', '#d4273f')}${round(42, 48, 11, '#8e1630', '#d4273f')}`,
  strawberry: `<path d="M32 58C20 50 13 40 14 31c1-6 6-9 12-8 2 0 4 1 6 1s4-1 6-1c6-1 11 2 12 8 1 9-6 19-18 27z" fill="#c9202f"/><path d="M31 56C20 48 15 39 16 31c1-5 5-7 10-6.5 2 .2 4 1 6 1s4-.8 6-1c5-.5 9 1.5 10 6.5 1 8-6 17-17 25z" fill="#e8333f"/>${grid([[24, 32], [32, 31], [40, 32], [28, 39], [36, 39], [22, 38], [42, 38], [32, 46], [27, 47], [37, 46]], 1.1, '#ffe07a')}<path d="M19 25c4-2 8-1 10 1l3-7 3 7c2-2 6-3 10-1-3 4-7 6-13 6s-10-2-13-6z" fill="${G}"/>${hi(22, 34, 2.4, 1.6)}`,
  fig: `${stem(32, 16, 33, 9, 3)}<path d="M32 14c3 6 4 8 8 12 6 6 9 11 9 17 0 9-8 15-17 15s-17-6-17-15c0-6 3-11 9-17 4-4 5-6 8-12z" fill="#5e2c63"/><path d="M31 16c2.5 5 3.5 7 7 10.5 5.5 5.5 8.5 10 8.5 15.5 0 8-7 13.5-15.5 13.5S15 50 15 42c0-5.5 3-10 8.5-15.5C27 23 28.5 21 31 16z" fill="#8a4790"/>${hi(23, 38, 3.6, 2.4)}`,
  lime: `${leaf(34, 21, -15, G2)}<ellipse cx="32" cy="37" rx="19" ry="15" fill="#4c8f2e"/><ellipse cx="30.5" cy="35.5" rx="17" ry="13.5" fill="#7cc142"/><circle cx="51" cy="37" r="2.2" fill="#4c8f2e"/>${hi(23, 31, 4.5, 2.6)}`,
  peach: `${stem(32, 21, 33, 15, 2.5)}${leaf(33, 18, -12)}${round(32, 39, 19, '#e0673f', '#ff9a66')}<path d="M33 22c-5 9-5 24 0 35" stroke="#e8754d" stroke-width="2" fill="none" opacity=".8"/><ellipse cx="42" cy="44" rx="6" ry="8" fill="#ff7d5e" opacity=".45"/>`,
  lemon: `${leaf(36, 20, -20)}<ellipse cx="32" cy="38" rx="21" ry="15" fill="#d9ab00"/><ellipse cx="30.5" cy="36.5" rx="19" ry="13.5" fill="#ffd83d"/><circle cx="9.5" cy="38" r="2.8" fill="#d9ab00"/><circle cx="54.5" cy="38" r="2.8" fill="#d9ab00"/>${hi(22, 31, 5, 2.6)}`,
  apple: `${stem(32, 24, 35, 13, 3)}${leaf(35, 17, -15)}<path d="M32 24c-4-3-9-4-13-2-6 3-8 10-6 18 2 9 8 16 14 16 2 0 3-1 5-1s3 1 5 1c6 0 12-7 14-16 2-8 0-15-6-18-4-2-9-1-13 2z" fill="#a8202c"/><path d="M31 25c-3.5-2.5-8-3.3-11.5-1.6-5.2 2.6-7 8.8-5.2 15.8 1.8 7.8 7 14 12.2 14 1.8 0 2.7-.9 4.5-.9s2.7.9 4.5.9c5.2 0 10.4-6.1 12.2-13.9 1.7-7-.1-13.2-5.3-15.8-3.5-1.8-7.9-1-11.4 1.5z" fill="#de3a44"/>${hi(21, 33, 3.4, 2.4)}`,
  avocado: `<path d="M32 9c7 0 10 8 12 15 2 6 8 11 8 19 0 10-9 16-20 16S12 53 12 43c0-8 6-13 8-19 2-7 5-15 12-15z" fill="#355f2a"/><path d="M32 14c5 0 7.5 7 9.5 13 2 5 6.5 9.5 6.5 16 0 7.5-7 12-16 12s-16-4.5-16-12c0-6.5 4.5-11 6.5-16 2-6 4.5-13 9.5-13z" fill="#d6e8a0"/><path d="M32 18c4 0 6 6 7.5 11 1.5 4 5.5 8 5.5 13.5 0 6-5.8 10-13 10s-13-4-13-10c0-5.5 4-9.5 5.5-13.5C26 24 28 18 32 18z" fill="#e8f2bd"/><circle cx="32" cy="43" r="8.5" fill="#8a5a35"/><circle cx="31" cy="42" r="7.5" fill="#a26a3f"/>${hi(28.5, 39.5, 2.2, 1.5)}`,
  pomegranate: `<path d="M25 24l2-7 3 4 2-5 2 5 3-4 2 7z" fill="#9c2233"/>${round(32, 40, 19, '#8e1d2c', '#c8303f')}<path d="M44 34c2 4 2 9 0 13" stroke="#e0606c" stroke-width="2" fill="none" opacity=".6"/>`,
  pepper: `${stem(32, 24, 38, 13, 4, G)}<path d="M17 31c0-6 6-9 10-8 2 .5 3.5 1.5 5 1.5s3-1 5-1.5c4-1 10 2 10 8 0 6 0 14-2 19-2 6-6 8-9 6-1.5-1-2.5-2-4-2s-2.5 1-4 2c-3 2-7 0-9-6-2-5-2-13-2-19z" fill="#b8251f"/><path d="M18.5 31c0-5 5-7.5 8.5-7 2 .3 3.5 1.3 5 1.3s3-1 5-1.3c3.5-.5 8.5 2 8.5 7 0 5.5 0 12.5-1.8 17-1.8 5-5 6.5-7.5 5-1.4-.9-2.6-1.8-4.2-1.8s-2.8.9-4.2 1.8c-2.5 1.5-5.7 0-7.5-5-1.8-4.5-1.8-11.5-1.8-17z" fill="#e0372c"/><path d="M32 27v26" stroke="#b8251f" stroke-width="2" opacity=".55"/>${hi(23, 34, 2.6, 4.5)}`,
  mango: `${stem(40, 18, 43, 12, 2.5)}${leaf(42, 14, -25)}<path d="M13 39c0-12 10-22 22-22 9 0 14 6 14 13 0 12-12 25-24 25-7 0-12-6-12-16z" fill="#d9621f"/><path d="M15 39c0-10.5 8.8-19.5 19.5-19.5 7.8 0 12 5 12 11 0 10.5-10.5 22-21 22-6 0-10.5-5-10.5-13.5z" fill="#f28a2e"/><path d="M17 38c0-9 7.5-16.5 16.5-16.5 6 0 9.5 3.5 10 8-6 3-14 9-19 18-3.5 3-7.5.5-7.5-9.5z" fill="#f9c23c" opacity=".9"/>${hi(22, 31, 3.4, 2.2)}`,
  banana: `<path d="M8 17C9 40 28 54 50 52c4-.4 7-2 7-4 0-1.5-1.5-2-3-2-16 0-28-10-33-24-1.5-5-13-9-13-5z" fill="#d9a51c"/><path d="M8.6 16.4C9.6 38.4 27.6 51.4 49 49.6c3.6-.3 5.8-1.4 6.3-2.6-15.6-.2-27.6-10-32.4-23.8-1.4-4.6-14.4-10.8-14.3-6.8z" fill="#ffd84a"/><path d="M14 22c4 14 16 23 32 25" stroke="#fff3b0" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".75"/><path d="M6 17.5l2-5.5 4.5 3.5z" fill="#6b4a2a"/><circle cx="56.6" cy="48" r="2" fill="#6b4a2a"/>`,
  carrot: `<path d="M43 19c-1-6 1-10 5-13 0 4 0 8-2 12zM45 21c4-3 9-4 13-2-4 2-8 4-11 5zM41 20c-3-4-3-9-1-13 2 4 2 9 2 13z" fill="${G}"/><path d="M43 20c4 4 4 9 1 12L19 55c-2 2-5-1-3-3l20-29c2-3 4-4 7-3z" fill="#e2701f"/><path d="M42 21c3 3 3 7 .5 9.5L20 52.5c-1 1-2.5 0-1.8-1.2L37 23.5c1.6-2.3 3-3.2 5-2.5z" fill="#f78f34"/><path d="M33 30l4 3M28 37l4 3M23 44l3.5 2.5" stroke="#d2600f" stroke-width="1.6" stroke-linecap="round"/>`,
  zucchini: `<g transform="rotate(-28 32 34)"><rect x="6" y="27" width="50" height="15" rx="7.5" fill="#2f6a29"/><rect x="7" y="27.5" width="48" height="12" rx="6" fill="#4a8a3a"/><path d="M12 31h38M12 36h38" stroke="#6faa55" stroke-width="1.4" opacity=".8"/><rect x="54" y="31" width="6" height="6" rx="2" fill="#6b8f3a"/><circle cx="8.5" cy="34.5" r="3" fill="#c5d98a"/></g>`,
  grapefruit: `<circle cx="32" cy="36" r="20" fill="#e8743f"/><circle cx="32" cy="36" r="17.5" fill="#fff0e0"/><circle cx="32" cy="36" r="16" fill="#ff7b7b"/><path d="M32 20v32M16 36h32M20.7 24.7l22.6 22.6M43.3 24.7L20.7 47.3" stroke="#ffd2cc" stroke-width="1.6"/><circle cx="32" cy="36" r="2.6" fill="#fff0e0"/>`,
  corn: `<ellipse cx="32" cy="32" rx="11" ry="22" fill="#e3a72b"/>${grid([0, 1, 2, 3, 4, 5, 6, 7].flatMap(r => (r % 2 ? [27.5, 32.5, 37.5] : [25, 30, 35, 40]).map(x => [x, 14 + r * 5])).filter(([x, y]) => ((x - 32) / 10.5) ** 2 + ((y - 32) / 21) ** 2 < 0.9), 2.3, '#ffd65c')}<path d="M18 56c-4-14-2-27 8-36-2 13 0 25 6 36zM46 56c4-14 2-27-8-36 2 13 0 25-6 36z" fill="#6fb24f"/><path d="M20 55c-3-12-2-23 5-31" stroke="#4d8f36" stroke-width="1.4" fill="none"/>`,
  cauliflower: `<path d="M8 44c7-3 15-1 19 8-8 3-16 1-19-8zM56 44c-7-3-15-1-19 8 8 3 16 1 19-8zM24 56c2-7 6-10 8-10s6 3 8 10z" fill="${G}"/>${grid([[23, 33], [41, 33], [32, 27], [27, 41], [37, 41], [32, 35]], 9, '#d9d0b2')}${grid([[22, 32], [40, 32], [31, 26], [26, 40], [36, 40], [31, 34]], 8, '#f5f0df')}${grid([[19, 29], [37, 29], [28, 23], [23, 37], [33, 37]], 1.6, '#fff')}`,
  lettuce: `<path d="M10 42c-2-10 6-22 14-24 4-4 12-4 16 0 8 2 16 14 14 24-2 9-10 14-22 14S12 51 10 42z" fill="#4d9a34"/><path d="M15 42c-1-8 4-17 10-19 3-3 11-3 14 0 6 2 11 11 10 19-1.5 7-8 10.5-17 10.5S16.5 49 15 42z" fill="#7cc142"/><path d="M21 42c0-7 5-13 11-13s11 6 11 13" fill="#a8dc72"/><path d="M32 30v24M32 42l-7-7M32 47l7-7" stroke="#d4f0a8" stroke-width="1.6" fill="none" stroke-linecap="round"/>`,
  broccoli: `<path d="M26 58l2.5-18h7l2.5 18z" fill="#8fbf5a"/><path d="M28 58l1.8-18h3l-.8 18z" fill="#a9d474"/>${grid([[21, 31], [32, 24], [43, 31], [26, 38], [38, 38], [32, 33]], 9.5, '#2f7334')}${grid([[20, 30], [31, 23], [42, 30], [25, 37], [37, 37], [31, 32]], 8, '#43944a')}${grid([[17, 27], [28, 20], [39, 27], [22, 34], [34, 34]], 2, '#6cbf6c')}`,
  eggplant: `${stem(33, 18, 39, 9, 3.5, G)}<path d="M23 24c-9 6-12 19-6 28 6 8 19 8 25 1 6-7 3-15-3-21-4-4-6-8-10-10-2.5-1-4.5 0-6 2z" fill="#3e1b4d"/><path d="M24 25.5c-8 5.5-10.5 17-5.2 25 5.3 7 16.8 7 22.2 1 5.3-6.2 2.6-13.3-2.7-18.6-3.5-3.5-5.3-7-8.8-8.8-2.2-.9-4-.1-5.5 1.4z" fill="#6a2f7f"/><path d="M22 22c3-5 8-7 13-5 2 3 1 7-2 9-4-3-7-3-11-4z" fill="${G}"/>${hi(22, 37, 2.8, 5)}`,
  kabocha: squash('#2f5e32', '#3f7740', '#4f8a4c', '#8a7a3a'),
  cabbage: `${round(32, 37, 20, '#6fa356', '#9ccc7c')}<path d="M32 20c-9 6-12 22-4 34M32 20c9 6 12 22 4 34M16 30c8 2 14 8 16 18M48 30c-8 2-14 8-16 18" stroke="#d9efc8" stroke-width="1.6" fill="none" opacity=".9"/>`,
  coconut: `<circle cx="32" cy="36" r="20" fill="#6b3f22"/><circle cx="32" cy="36" r="16" fill="#fbf8f1"/><circle cx="32" cy="36" r="11" fill="#efe7d4"/><path d="M14 30l-3-2M16 46l-3 2M48 46l3 2M50 30l3-2M32 16v-3" stroke="#8a5a35" stroke-width="2" stroke-linecap="round"/>${hi(24, 29, 3, 2)}`,
  butternut: `${stem(31, 11, 34, 5, 3.5, '#8a7a3a')}<path d="M27 10c4-1 8 1 9 5 1 6-1 11 2 17 4 7 9 11 9 18 0 8-7 12-15 12S17 58 17 50c0-7 5-11 9-18 3-6 1-11 2-17 0-2-.5-4-1-5z" fill="#d9944a"/><path d="M28 11.5c3.5-.8 6.5 1 7.3 4.3.9 5.5-.9 10 1.8 15.5 3.6 6.4 8.4 10 8.4 16.5 0 7-6 10.7-13.5 10.7S18.5 54.8 18.5 47.8c0-6.5 4.7-10.2 8.3-16.5 2.7-5.5.9-10 1.8-15.5.1-1.7-.3-3.3-.6-4.3z" fill="#f3b766"/><circle cx="32" cy="49" r="6" fill="#e9a14d" opacity=".7"/>${hi(24, 44, 2.6, 4)}`,
  pineapple: `<path d="M32 28c-2-9-1-15 0-20 1 5 2 11 0 20zM30 29c-6-4-9-10-10-16 4 2 8 7 10 16zM34 29c6-4 9-10 10-16-4 2-8 7-10 16zM29 31c-8-1-12-5-14-9 5 0 10 3 14 9zM35 31c8-1 12-5 14-9-5 0-10 3-14 9z" fill="${G}"/><ellipse cx="32" cy="44" rx="14" ry="16" fill="#d9921c"/><ellipse cx="31" cy="43" rx="12.5" ry="14.5" fill="#f2b53a"/><path d="M20 36l18 18M20 46l12 12M24 30l20 20M32 29l13 13M44 36L26 54M44 46L32 58M40 30L20 50M32 29L19 42" stroke="#c98a1e" stroke-width="1.3" fill="none"/>`,
  melon: `${round(32, 37, 20, '#b98a3e', '#d9b56b')}${melonLines}`,
  honeydew: `${stem(32, 18, 34, 13, 2.5, '#8a7a3a')}${round(32, 37, 20, '#a9c97e', '#d6ecaa')}<path d="M20 44c4 4 10 6 16 5" stroke="#bcd98f" stroke-width="2" fill="none" opacity=".8"/>`,
  papaya: `<ellipse cx="32" cy="34" rx="15" ry="23" fill="#7aa23f" transform="rotate(-20 32 34)"/><ellipse cx="32" cy="34" rx="12.5" ry="20.5" fill="#ff8a3d" transform="rotate(-20 32 34)"/><ellipse cx="32" cy="35" rx="5.5" ry="11" fill="#ffb27a" transform="rotate(-20 32 34)"/>${grid([[30, 29], [34, 31], [31, 34], [35, 36], [32, 39], [29, 37], [33, 42], [30, 32]], 1.7, '#2b2b2b')}`,
  romaine: `<path d="M22 58c-8-12-9-32-1-46 5 14 6 32 1 46z" fill="#4d9a34"/><path d="M42 58c8-12 9-32 1-46-5 14-6 32-1 46z" fill="#4d9a34"/><path d="M32 59c-9-14-10-36 0-52 10 16 9 38 0 52z" fill="#7cc142"/><path d="M32 57V12M32 26l-5-4M32 36l5-4M32 46l-5-4" stroke="#d4f0a8" stroke-width="1.6" fill="none" stroke-linecap="round"/>`,
  pumpkin: squash('#d2601f', '#ec7a2c', '#f7943e', '#5f7f2f'),
  watermelon: `<ellipse cx="32" cy="38" rx="23" ry="17" fill="#1f5f2a"/><ellipse cx="31" cy="37" rx="21.5" ry="15.5" fill="#3a8a3f"/><path d="M14 30c3 2 2 6 5 8s2 6 4 9M24 23c2 3 0 7 3 10s1 8 3 11 1 6 2 7M36 22c-1 3 2 7 0 10s2 8 0 11 1 6-1 8M47 27c-2 3 0 6-3 9s0 7-3 10" stroke="#1f5f2a" stroke-width="2.6" fill="none" stroke-linecap="round"/>${hi(19, 30, 4, 2.4)}`,
};

/* ---- the hero at the top of the result: what it shows (pure) ---- */
/* n: the week as the rest of the site counts it (whole weeks, like the week pages); views: what a tap on the ring's
   centre cycles through; tags: length, weight, trimester and days left */
export function heroModel(st, wk) {
  const n = Math.min(42, st.weeks), pct = Math.round(st.pct);
  const tags = [];
  if (wk) {
    tags.push({ k: 'len', t: `כ-${wk.cm} ס״מ` });
    if (wk.g) tags.push({ k: 'wt', t: `כ-${fmtN(wk.g)} גרם` });
  }
  tags.push({ k: 'tri', t: TRI[st.trimester] });
  tags.push({ k: 'left', t: st.left > 0 ? `עוד ${fmtN(st.left)} ימים` : st.left === 0 ? 'התאריך המשוער היום' : `${fmtN(-st.left)} ימים אחרי התאריך` });
  const views = [{ k: 'שבוע', big: String(n), u: 'להריון' }, { k: 'עברתם', big: `${pct}%`, u: 'מהדרך' }];
  if (st.left > 0) views.push({ k: 'עוד', big: fmtN(st.left), u: st.left === 1 ? 'יום' : 'ימים' });
  return { n, ga: `${st.weeks}+${st.days}`, ord: st.week, pct, size: wk ? wk.size : '', art: (wk && wk.art) || '', tags, views };
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

const ICON = {
  len: '<path d="M3 17 17 3l4 4L7 21z"/><path d="m7 13 2 2m1-5 2 2m1-5 2 2"/>',
  wt: '<path d="M6 8h12l2 12H4z"/><circle cx="12" cy="5" r="2"/>',
  tri: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4m8-4v4"/>',
  left: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
};
// the water inside the ring's centre: a wave a little wider than the box, so sliding it by one wavelength loops
const WAVE = 'M-100 2Q-87.5-2-75 2T-50 2T-25 2T0 2T25 2T50 2T75 2T100 2T125 2T150 2V110H-100Z';
// bubbles in the water: x, r, seconds, delay
const BUBBLES = [[30, 1.6, 3.2, 0], [46, 1.1, 2.6, 1.1], [58, 1.9, 3.8, .5], [70, 1.2, 2.9, 1.9], [40, 1, 3.4, 2.6], [64, 1.4, 3.1, 3.3]];
// the sparkles when the drawing is tapped: direction x, y
const SPARKS = [[-30, -22], [28, -26], [36, 6], [-34, 10], [-8, -36], [12, 32]];

/* the hero card: a ring (purple to rose) that draws itself to the share of the pregnancy that has passed, with a dot
   riding to its end; inside it the centre fills with water to the same level, waves moving and bubbles rising; the
   week counts up (a tap cycles week / % / days left); the size as a drawing that grows in and bobs; tags; the bar.
   All CSS/SVG; still: no entry animation (a re-render after ticking a checkup) */
function heroHtml(m, st, since, still) {
  const ticks = [126, 252].map(a => `<line class="ph-tick" x1="110" y1="11" x2="110" y2="25" transform="rotate(${a} 110 110)"/>`).join('');
  const bubbles = m.pct >= 12 ? BUBBLES.map(([x, r, d, w]) => `<circle class="ph-b" cx="${x}" cy="${m.pct + 3}" r="${r}" style="--d:${d}s;--w:${w}s"/>`).join('') : '';
  const v = m.views[0], art = ART[m.art];
  return `<section class="phero${still ? ' ph-still' : ''}">
    <div class="ph-stage">
      <svg class="ph-ring" viewBox="0 0 220 220" aria-hidden="true" focusable="false">
        <defs><linearGradient id="ph-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" class="ph-s1"/><stop offset="1" class="ph-s2"/></linearGradient></defs>
        <circle class="ph-track" cx="110" cy="110" r="92"/>${ticks}
        <circle class="ph-arc" cx="110" cy="110" r="92" pathLength="100" stroke-dasharray="100" stroke-dashoffset="${100 - m.pct}" stroke="url(#ph-grad)" transform="rotate(-90 110 110)"/>
        <g class="ph-dot" style="--a:${(m.pct * 3.6).toFixed(1)}deg"><circle class="ph-glow" cx="110" cy="18" r="12"/><circle cx="110" cy="18" r="7"/></g>
      </svg>
      <button type="button" class="ph-core" title="הקשה מחליפה תצוגה">
        <svg class="ph-water" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <g class="ph-lvl" style="--y:${100 - m.pct}px;--h:${m.pct}"><path class="ph-w1" d="${WAVE}"/><path class="ph-w2" d="${WAVE}"/>${bubbles}</g></svg>
        <span class="ph-val" aria-live="polite"><span class="ph-k">${v.k}</span><b class="ph-n">${v.big}</b><span class="ph-u">${v.u}</span></span>
        <span class="ph-dots" aria-hidden="true">${m.views.map((x, i) => `<i${i ? '' : ' class="on"'}></i>`).join('')}</span></button>
    </div>
    <div class="ph-info">
      <p class="ph-ga"><b class="pr-w" dir="ltr">${m.ga}</b><span>${st.weeks} שבועות ו-${st.days} ימים · השבוע ה-${m.ord}</span></p>
      ${since ? `<p class="pr-since">${since}</p>` : ''}
      ${m.size ? `<p class="ph-size">${art ? `<span class="ph-fruit" aria-hidden="true"><svg viewBox="0 0 64 64" focusable="false">${art}</svg>${SPARKS.map(([x, y]) => `<i style="--x:${x}px;--y:${y}px"></i>`).join('')}</span>` : ''}<span>התינוק שלכם בגודל של <b>${m.size}</b></span></p>` : ''}
      <ul class="ph-tags">${m.tags.map((t, i) => `<li style="--i:${i}"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICON[t.k]}</svg>${t.t}</li>`).join('')}</ul>
    </div>
    <div class="pr-bar" role="progressbar" aria-label="התקדמות ההריון" aria-valuemin="0" aria-valuemax="40" aria-valuenow="${Math.min(40, st.weeks)}"><i style="width:${st.pct.toFixed(1)}%"></i></div>
    <div class="pr-tri"><span>שליש 1</span><span>שליש 2</span><span>שליש 3</span></div>
  </section>`;
}

/* the hero's moving parts: the count-up, the tap on the centre, the fruit's wiggle, and pausing the endless
   animations while the card is off screen */
let heroSeen = null;
function heroLive(m, intro) {
  const el = document.querySelector('.phero');
  if (!el) return;
  const core = el.querySelector('.ph-core'), k = core.querySelector('.ph-k'), n = core.querySelector('.ph-n'), u = core.querySelector('.ph-u');
  const dots = [...core.querySelectorAll('.ph-dots i')];
  let i = 0, run = 0, counted = true;
  // the entry animations wait (paused) until the card is on screen; the count-up starts with them
  const count = () => {
    if (counted) return;
    counted = true;
    const t0 = performance.now(), me = ++run, T = 1100;
    const step = t => {
      if (me !== run) return;
      const p = Math.min(1, (t - t0) / T);
      n.textContent = String(Math.round(m.n * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  if (intro && !matchMedia('(prefers-reduced-motion: reduce)').matches) { counted = false; n.textContent = '0'; }
  core.onclick = () => {
    run++;   // a tap stops the count-up
    i = (i + 1) % m.views.length;
    const v = m.views[i];
    k.textContent = v.k; n.textContent = v.big; u.textContent = v.u;
    dots.forEach((d, j) => d.classList.toggle('on', j === i));
    core.classList.remove('is-pop'); void core.offsetWidth; core.classList.add('is-pop');
  };
  const fruit = el.querySelector('.ph-fruit');
  if (fruit) fruit.onclick = () => { fruit.classList.remove('is-wiggle'); void fruit.offsetWidth; fruit.classList.add('is-wiggle'); };
  if (heroSeen) heroSeen.disconnect();
  if ('IntersectionObserver' in window) {
    heroSeen = new IntersectionObserver(([e]) => { el.classList.toggle('ph-off', !e.isIntersecting); if (e.isIntersecting) count(); });
    heroSeen.observe(el);
  } else count();
}

/* ---- the names journey: what to do about the name at this week, holidays around the due date, the saved names ---- */
const STAGE = {
  dream: ['זמן לחלום', 'עוד מוקדם, וזה בדיוק הזמן לאסוף שמות שאוהבים, בלי לחץ ובלי להחליט.',
    [['/guides', 'מדריכים ומאמרים'], ['/names', 'כל השמות ואוספי השמות'], ['/guides/hebrew-month-names', 'שמות לפי חודש עברי וחגים']]],
  sex: ['כבר יודעים בן או בת?', 'רבים יודעים בשלב הזה אם זה בן או בת, וזה זמן טוב להתחיל רשימה משותפת.',
    [['/names/girls', 'שמות לבנות'], ['/names/boys', 'שמות לבנים'], ['/#match', 'בוחרים שם ביחד']]],
  narrow: ['זמן לצמצם את הרשימה', 'כדאי להגיד כל שם בקול עם שם המשפחה, ולבדוק כמה תינוקות קיבלו אותו בשנים האחרונות.',
    [['/#match', 'בוחרים שם ביחד'], ['/names/popular', 'השמות הנפוצים'], ['/guides/sibling-names', 'שמות לאחים ואחיות']]],
  decide: ['זמן להחליט', 'הלידה מתקרבת. ואם עוד לא החלטתם, זה בסדר: יש הורים שמחכים לפגוש את התינוק לפני שהם בוחרים.',
    [['/pregnancy/brit-mila', 'מחשבון ברית מילה ופדיון הבן'], ['/#match', 'בוחרים שם ביחד'], ['/guides/hebrew-month-names', 'שמות לפי חודש עברי וחגים']]],
};
const nameLinks = list => list.map(([n, href]) => `<a href="${href}">${n}</a>`).join('');
/* the names saved on this device (the site's favorites, bnil_fav) */
function savedNames() {
  try {
    const v = JSON.parse(localStorage.getItem('bnil_fav') || '[]');
    return Array.isArray(v) ? v.filter(n => typeof n === 'string' && n && n.length < 40) : [];
  } catch (e) { return []; }
}
function journey(D, st, due, fav) {
  const [title, text, links] = STAGE[journeyStage(st.weeks)];
  const [a, b] = birthWindow(due), near = holidaysBetween(D.holidays || [], a, b);
  const span = h => `<bdi dir="ltr">${h.len > 1 ? `${dm(h.from)}–${dm(h.to)}` : dm(h.from)}</bdi>`;
  const hol = near.length ? `<div class="pj-hol"><h4>חגים סביב התאריך המשוער</h4>
      <p class="k">התאריך המשוער הוא הערכה, והלידה יכולה להיות גם כמה שבועות לפניו או אחריו. בין שבוע 37 לסוף שבוע 41, אצלכם <bdi dir="ltr">${dm(a)}–${dm(b)}</bdi>, ${near.length > 1 ? 'חלים' : 'חל'}:</p>
      ${near.map(h => `<p><b>${h.name}</b> <span class="k">(${span(h)})</span></p><p class="cgc">${nameLinks(h.names)}</p>`).join('')}</div>` : '';
  const favs = fav.length ? `<p class="pj-fav">שמרתם באתר ${fav.length === 1 ? 'שם אחד' : `${fmtN(fav.length)} שמות`}: ${fav.slice(0, 6).map(n => `<a href="/names/${encodeURIComponent(n)}">${esc(n)}</a>`).join(', ')}${fav.length > 6 ? ' ועוד' : ''}. <a href="/">לרשימה המלאה</a></p>` : '';
  return `<section class="pr-journey"><h3>השמות שלכם: ${title}</h3><p>${text}</p>
    <p class="pj-links">${links.map(([href, t]) => `<a href="${href}">${t}</a>`).join('')}</p>${favs}${hol}</section>`;
}
const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function render(D, st, due, now, v, since, still) {
  const wk = D.weeks[Math.min(42, st.weeks)];
  const heb = hebrewDate(due), mon = D.months[heb.month];
  const left = st.left > 0 ? `עוד ${fmtN(st.left)} ימים${st.left >= 14 ? ` (כ-${Math.round(st.left / 7)} שבועות)` : ''}`
    : st.left === 0 ? 'היום!' : `התאריך עבר לפני ${fmtN(-st.left)} ימים`;
  const size = wk ? `<h3>מה קורה בשבוע ${Math.min(42, st.weeks)}</h3><p>${wk.baby}</p>
      <p class="pr-more"><a href="/pregnancy/week-${Math.min(42, st.weeks)}">עוד על שבוע ${Math.min(42, st.weeks)}</a> · <a href="/pregnancy">כל השבועות</a></p>`
    : `<h3>השבועות הראשונים</h3><p>${D.early}</p>`;
  return `${heroHtml(heroModel(st, wk), st, since, still)}
    <dl class="pr-facts"><div><dt>תאריך לידה משוער</dt><dd>${gregorianText(due)}<span>${heb.text}</span></dd></div>
      <div><dt>עד התאריך המשוער</dt><dd>${left}</dd></div></dl>
    <section class="pr-week">${size}</section>
    ${checks(D, due, now, v.done || [])}
    ${journey(D, st, due, savedNames())}
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
  let state = {}, played = false;
  function show(v, save, since = '') {
    const now = todayDay(), day = toDay(v.d), opts = { cycle: v.c, embryo: v.e };
    const why = problem(v.m, day, now, opts);
    err.textContent = why ? ERR[why] : '';
    err.hidden = !why;
    if (why) { out.hidden = true; return; }
    const due = dueDate(v.m, day, opts), st = status(due, now);
    // a new date starts with no checkups marked; the same date keeps them
    state = { ...v, done: save && (state.d !== v.d || state.m !== v.m) ? [] : state.done || [], seen: st.weeks };
    const intro = save || !played;
    played = true;
    out.innerHTML = render(D, st, due, now, state, since, !intro);
    out.hidden = false;
    heroLive(heroModel(st, D.weeks[Math.min(42, st.weeks)]), intro);
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

/* the brit mila and pidyon haben calculator (/pregnancy/brit-mila) */
function britCalc() {
  const form = document.getElementById('bform'), out = document.getElementById('bres'), err = document.getElementById('berr');
  const day = (d, label, extra = '') => `<div><dt>${label}</dt><dd>${gregorianText(d)}<span>${hebrewDate(d).text}</span>${extra}</dd></div>`;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const birth = toDay(form.elements.date.value), evening = form.elements.evening.checked;
    err.hidden = birth != null;
    err.textContent = birth == null ? 'בחרו את תאריך הלידה.' : '';
    if (birth == null) { out.hidden = true; return; }
    const b = britDates(birth, evening);
    const rest = b.britRest ? `<p class="pr-note"><b>הברית חלה ב${b.britRest === 'שבת' ? 'שבת' : `חג (${b.britRest})`}.</b> ברית בזמנה, ביום השמיני, נערכת גם בשבת ובחג. בלידה בניתוח קיסרי היא לא נערכת בשבת ובחג, ונדחית ליום שאחריהם. בררו עם המוהל.</p>` : '';
    const moved = b.moved ? `<p class="pr-note">היום ה-31 חל ב${b.movedFrom === 'שבת' ? 'שבת' : `חג (${b.movedFrom})`}, ובשבת ובחג לא עורכים פדיון הבן, ולכן הוא נדחה ל${gregorianText(b.pidyon).split(',')[0]}.</p>` : '';
    out.innerHTML = `<dl class="pr-facts"><div><dt>יום הלידה</dt><dd>${gregorianText(birth)}${evening ? ', אחרי השקיעה' : ''}<span>${hebrewDate(b.heb).text}</span></dd></div></dl>
      <h3>ברית מילה: היום השמיני</h3><dl class="pr-facts">${day(b.brit, 'ברית מילה')}</dl>${rest}
      <p class="k">המוהל קובע את המועד הסופי. כשהתינוק לא בריא, למשל בצהבת, הברית נדחית עד שהוא מבריא.</p>
      <h3>פדיון הבן: היום ה-31</h3><dl class="pr-facts">${day(b.pidyon, 'פדיון הבן')}</dl>${moved}
      <p class="k">פדיון הבן נערך לבן בכור לאמו שנולד בלידה רגילה, לא בניתוח קיסרי, כשהאב אינו כהן או לוי והאם אינה בת כהן או לוי. אחרי הפלה קודמת ובמקרים אחרים צריך לברר. בררו עם רב.</p>`;
    out.hidden = false;
  });
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
  if (document.getElementById('bform')) britCalc();
  document.querySelectorAll('.pmine').forEach(yourWeek);
}
