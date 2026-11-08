// The names journey (stage by week, holidays around the due date) and the brit mila / pidyon haben dates (app/pregnancy.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toDay, fromDay, hebDM, holidaysBetween, birthWindow, journeyStage, isShabbat, yomTov, britDates, TERM, sunsetLocal, timeOfBirth, hhmm, CITIES,
  britIcs, britHtml, stepsHtml, israelLine, ics } from '../app/pregnancy.mjs';
import { readFileSync } from 'node:fs';

const P = JSON.parse(readFileSync(new URL('../data/pregnancy.json', import.meta.url), 'utf-8'));
const H = P.holidays;
const between = (a, b) => holidaysBetween(H, toDay(a), toDay(b)).map(h => [h.id, fromDay(h.from), fromDay(h.to)]);

test('hebDM: the Hebrew day and month as Intl writes them', () => {
  assert.deepEqual(hebDM(toDay('2026-09-12')), { d: 1, m: 'תשרי' });
  assert.deepEqual(hebDM(toDay('2027-03-23')), { d: 14, m: 'אדר ב׳' });   // 5787 is a leap year
});

test('holidaysBetween: Hanukkah crosses from Kislev to Tevet, and counts when only its end is in range', () => {
  assert.deepEqual(between('2026-11-20', '2027-01-10'), [['hanukkah', '2026-12-05', '2026-12-12']]);
  assert.deepEqual(between('2026-12-10', '2026-12-20'), [['hanukkah', '2026-12-05', '2026-12-12']]);
  assert.deepEqual(between('2026-12-13', '2026-12-20'), []);
});

test('holidaysBetween: in a leap year Purim is in Adar II, not Adar I; in a common year in Adar', () => {
  assert.deepEqual(between('2027-02-01', '2027-03-31'), [['purim', '2027-03-23', '2027-03-23']]);
  assert.deepEqual(between('2026-02-20', '2026-03-10'), [['purim', '2026-03-03', '2026-03-03']]);
});

test('holidaysBetween: Pesach at the edge of the range, and the two days of Rosh Hashanah', () => {
  assert.deepEqual(between('2027-04-28', '2027-05-10'), [['pesach', '2027-04-22', '2027-04-28']]);
  assert.deepEqual(between('2027-04-29', '2027-05-10'), []);
  assert.deepEqual(between('2026-09-13', '2026-09-13'), [['rosh-hashana', '2026-09-12', '2026-09-13']]);
});

test('birthWindow: from 37+0 to 41+6', () => {
  const due = toDay('2027-01-01'), [a, b] = birthWindow(due);
  assert.equal(a - (due - TERM), 37 * 7);
  assert.equal(b - (due - TERM), 41 * 7 + 6);
});

test('journeyStage: by full weeks', () => {
  assert.deepEqual([0, 13, 14, 22, 23, 33, 34, 42].map(journeyStage), ['dream', 'dream', 'sex', 'sex', 'narrow', 'narrow', 'decide', 'decide']);
});

test('yomTov and isShabbat', () => {
  assert.equal(yomTov(toDay('2026-09-21')), 'יום כיפור');
  assert.equal(yomTov(toDay('2027-04-22')), 'פסח');
  assert.equal(yomTov(toDay('2027-04-23')), '');            // chol hamoed
  assert.equal(yomTov(toDay('2027-06-11')), 'שבועות');
  assert.equal(yomTov(toDay('2026-12-05')), '');            // Hanukkah is not a day without work
  assert.ok(isShabbat(toDay('2026-11-07')) && !isShabbat(toDay('2026-11-08')));
});

test('britDates: the brit on day 8, a week later on the same weekday; after sunset one day later', () => {
  const day = toDay('2026-11-01');  // a Sunday
  const a = britDates(day, false), b = britDates(day, true);
  assert.equal(fromDay(a.brit), '2026-11-08');
  assert.equal(fromDay(b.heb), '2026-11-02');
  assert.equal(fromDay(b.brit), '2026-11-09');
  assert.equal(fromDay(a.pidyon), '2026-12-01');           // day 31
  assert.equal(a.moved, false);
});

test('britDates: a brit on Shabbat is flagged; a pidyon on Shabbat or a holiday moves to the next day', () => {
  const sat = britDates(toDay('2026-10-31'), false);       // born on Shabbat: the brit is on Shabbat
  assert.equal(sat.britRest, 'שבת');
  const thu = britDates(toDay('2026-11-05'), false);       // day 31 is Shabbat 5.12.2026
  assert.equal(fromDay(thu.pidyon), '2026-12-06');
  assert.deepEqual([thu.moved, thu.movedFrom], [true, 'שבת']);
  // day 31 on the first day of Pesach 5787 (Thursday 22.4.2027): moved to Friday
  const pes = britDates(toDay('2027-04-22') - 30, false);
  assert.equal(fromDay(pes.pidyon), '2027-04-23');
  assert.equal(pes.movedFrom, 'פסח');
  // Shavuot 5787 is on a Friday (11.6.2027), then Shabbat: moved to Sunday
  const shav = britDates(toDay('2027-06-11') - 30, false);
  assert.equal(fromDay(shav.pidyon), '2027-06-13');
});

test('britDates: a caesarean birth does not override Shabbat or a holiday, and both days of Rosh Hashanah (YD 266:10)', () => {
  // born Shabbat 5.9.2026: day 8 is Shabbat 12.9, which is also 1 Tishrei 5787; 2 Tishrei is Sunday: the brit is Monday
  const c = britDates(toDay('2026-09-05'), { caesar: true });
  assert.equal(fromDay(c.brit), '2026-09-14');
  assert.deepEqual([c.britMoved, c.britFrom, c.strict], [true, 'שבת וראש השנה', 'caesar']);
  assert.equal(c.pidyon, null);
  assert.equal(c.exempt, 'caesar');
  // the same birth, not caesarean: the brit is on Shabbat and Rosh Hashanah, on time
  const n = britDates(toDay('2026-09-05'), {});
  assert.equal(fromDay(n.brit), '2026-09-12');
  assert.equal(n.britRest, 'שבת וראש השנה');
  // a caesarean brit on a weekday stays on day 8
  assert.equal(fromDay(britDates(toDay('2026-11-02'), { caesar: true }).brit), '2026-11-09');
});

test('britDates: born near sunset is counted from the night and does not override Shabbat (YD 266:8)', () => {
  const fri = britDates(toDay('2026-11-06'), { time: 'twilight' });     // Friday near sunset: the brit is Sunday
  assert.equal(fromDay(fri.heb), '2026-11-07');
  assert.equal(fromDay(fri.brit), '2026-11-15');
  assert.equal(fri.strict, 'twilight');
  const tue = britDates(toDay('2026-11-03'), { time: 'twilight' });     // Tuesday near sunset: the following Wednesday
  assert.equal(fromDay(tue.brit), '2026-11-11');
  assert.equal(tue.britMoved, false);
  assert.equal(fromDay(tue.pidyon), '2026-12-04');                       // day 31 from the later day
});

test('britDates: no pidyon for a kohen or levi, or when not the firstborn; true/false still means night/day', () => {
  assert.deepEqual([britDates(toDay('2026-11-01'), { kl: true }).pidyon, britDates(toDay('2026-11-01'), { kl: true }).exempt], [null, 'kl']);
  assert.equal(britDates(toDay('2026-11-01'), { first: false }).exempt, 'notfirst');
  assert.equal(fromDay(britDates(toDay('2026-11-01'), { first: true }).pidyon), '2026-12-01');
  assert.equal(britDates(toDay('2026-11-01'), true).time, 'night');
});

test('britHtml: every note links its source on Sefaria, and an exempt pidyon shows no date', () => {
  const t = britHtml(britDates(toDay('2026-10-31'), { caesar: true }), toDay('2026-10-31'));
  assert.match(t, /sefaria\.org\/Shulchan_Arukh%2C_Yoreh_De'ah\.266\.10/);
  assert.match(t, /sefaria\.org\/Shulchan_Arukh%2C_Yoreh_De'ah\.305\.24/);
  assert.doesNotMatch(t, /<dt>פדיון הבן<\/dt>/);
  const s = britHtml(britDates(toDay('2026-10-31'), { first: true }), toDay('2026-10-31'));
  assert.match(s, /266\.2/);
  assert.match(s, /<dt>פדיון הבן<\/dt>/);
});

// sunset times from Hebcal (hebcal.com/zmanim, sea level), checked 8.11.2026; within 2 minutes, summer time included
test('sunsetLocal: within 2 minutes of Hebcal in six cities, in winter, in summer and on the clock changes', () => {
  const H = [['jerusalem', '2026-12-21', '16:39'], ['jerusalem', '2026-06-21', '19:48'], ['tel-aviv', '2026-03-27', '18:57'],
    ['haifa', '2026-10-25', '16:56'], ['beer-sheva', '2026-01-15', '17:01'], ['eilat', '2026-06-21', '19:43'], ['tiberias', '2026-09-10', '18:51']];
  for (const [city, d, want] of H) {
    const [h, m] = want.split(':').map(Number), got = sunsetLocal(toDay(d), city);
    assert.ok(Math.abs(got - (h * 60 + m)) <= 2, `${city} ${d}: ${hhmm(got)}, Hebcal ${want}`);
  }
});

test('timeOfBirth: before, near and after sunset; after midnight is the day of that date', () => {
  const d = toDay('2026-06-21');   // Jerusalem, sunset about 19:47
  assert.equal(timeOfBirth(d, '19:30', 'jerusalem').time, 'day');
  assert.equal(timeOfBirth(d, '19:40', 'jerusalem').time, 'twilight');
  assert.equal(timeOfBirth(d, '20:25', 'jerusalem').time, 'twilight');
  assert.equal(timeOfBirth(d, '20:40', 'jerusalem').time, 'night');
  assert.equal(timeOfBirth(d, '02:00', 'jerusalem').time, 'day');
  assert.equal(timeOfBirth(d, '', 'jerusalem'), null);
  assert.equal(timeOfBirth(d, '19:00', 'nowhere'), null);
});

test('the cities of the brit page are the cities of the sunset', () => {
  const py = readFileSync(new URL('../tools/pregnancy.py', import.meta.url), 'utf8');
  const keys = [...py.match(/BRIT_CITIES = \[(.*)\]/)[1].matchAll(/\('([a-z-]+)'/g)].map(m => m[1]);
  assert.deepEqual(keys, Object.keys(CITIES));
});

test('britIcs: the brit and the pidyon as all-day events, without the pidyon when exempt', () => {
  const b = britDates(toDay('2026-11-01'), { first: true });
  const t = britIcs(b, { stamp: '20261108T000000Z' });
  assert.match(t, /DTSTART;VALUE=DATE:20261108/);
  assert.match(t, /DTSTART;VALUE=DATE:20261201/);
  assert.equal((t.match(/BEGIN:VEVENT/g) || []).length, 2);
  assert.ok(t.split('\r\n').every(l => new TextEncoder().encode(l).length <= 75));
  assert.equal((britIcs(britDates(toDay('2026-11-01'), { caesar: true }), { stamp: 'x' }).match(/BEGIN:VEVENT/g) || []).length, 1);
});

test('stepsHtml: the four stages in order, the current one marked', () => {
  const st = { dream: ['לחלום'], sex: ['לדעת מין'], narrow: ['לצמצם'], decide: ['להחליט'] };
  const h = stepsHtml(st, 'narrow');
  assert.equal((h.match(/is-past/g) || []).length, 2);
  assert.match(h, /<li class="is-now" aria-current="step">לצמצם<\/li>/);
});

test('israelLine: the share of births before week 40, from the groups', () => {
  const t = israelLine({ year: 2024, median: 39, groups: [['לפני שבוע 37', 6.2], ['שבועות 37 עד 39', 51.2], ['שבוע 40 ואחריו', 42.5]] });
  assert.match(t, /כ-57% מהתינוקות נולדו לפני שבוע 40/);
  assert.equal(israelLine(undefined), '');
});

test('ics: each week event carries the names of the week', () => {
  const due = toDay('2027-03-01'), now = due - 200;
  const t = ics({ due, now, info: { 20: { size: 'בננה', names: ['טליה', 'יהונתן'] } }, checks: false, stamp: 'x' });
  assert.match(t.replace(/\r\n /g, ''), /שמות לשבוע: טליה לבת\\, יהונתן לבן/);
});
