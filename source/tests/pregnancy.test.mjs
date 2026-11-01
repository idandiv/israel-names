// The pregnancy calculator's date math (app/pregnancy.mjs): due dates, week and trimester, input checks, Hebrew dates.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toDay, fromDay, todayDay, dueDate, status, trimester, problem, hebNum, hebrewDate } from '../app/pregnancy.mjs';

const D = toDay;
const due = (m, d, o) => fromDay(dueDate(m, D(d), o));

test('dates: real days only, round trip', () => {
  assert.equal(fromDay(D('2026-03-27')), '2026-03-27');
  for (const bad of ['2026-02-30', '2026-13-01', '2026-1-5', '', null, 'abc']) assert.equal(D(bad), null, String(bad));
  assert.equal(D('2028-02-29') - D('2028-02-28'), 1);
});

test('the visitor\'s local date is the day number, whatever the time of day', () => {
  assert.equal(fromDay(todayDay(new Date(2026, 9, 25, 0, 30))), '2026-10-25');
  assert.equal(fromDay(todayDay(new Date(2026, 9, 25, 23, 59))), '2026-10-25');
});

test('last period: +280 days, moved by the cycle length', () => {
  assert.equal(due('lmp', '2026-01-01'), '2026-10-08');
  assert.equal(due('lmp', '2026-01-01', { cycle: 32 }), '2026-10-12');
  assert.equal(due('lmp', '2026-01-01', { cycle: 21 }), '2026-10-01');
  assert.equal(due('lmp', '2026-01-01', { cycle: 35 }), '2026-10-15');
});

test('conception +266, IVF transfer +266 minus the embryo age', () => {
  assert.equal(due('conception', '2026-01-15'), '2026-10-08');
  assert.equal(due('ivf', '2026-01-20', { embryo: 5 }), '2026-10-08');
  assert.equal(due('ivf', '2026-01-18', { embryo: 3 }), '2026-10-08');
});

test('daylight saving changes in Israel (March and October) do not move a day', () => {
  // Israel moves the clock on 2026-03-27 and 2026-10-25; the span crosses both
  assert.equal(D('2026-10-26') - D('2026-03-26'), 214);
  assert.equal(due('lmp', '2026-03-26'), '2026-12-31');
  const s = status(dueDate('lmp', D('2026-03-26')), D('2026-10-26'));
  assert.deepEqual([s.weeks, s.days], [30, 4]);
});

test('week, day and the current week number', () => {
  const d = dueDate('lmp', D('2026-01-01'));
  const s = status(d, D('2026-01-01') + 87);  // 12 weeks and 3 days
  assert.deepEqual([s.ga, s.weeks, s.days, s.week], [87, 12, 3, 13]);
  assert.equal(s.left, 280 - 87);
  assert.equal(status(d, d).pct, 100);
  assert.equal(status(d, d + 10).pct, 100);
});

test('trimesters: 13+6 is the first, 14+0 the second, 27+6 the second, 28+0 the third', () => {
  assert.equal(trimester(13 * 7 + 6), 1);
  assert.equal(trimester(14 * 7), 2);
  assert.equal(trimester(27 * 7 + 6), 2);
  assert.equal(trimester(28 * 7), 3);
  assert.equal(trimester(0), 1);
});

test('input problems', () => {
  const now = D('2026-10-30');
  assert.equal(problem('lmp', D('2026-08-01'), now), null);
  assert.equal(problem('lmp', null, now), 'date');
  assert.equal(problem('lmp', D('2026-11-01'), now), 'future');
  assert.equal(problem('nope', D('2026-08-01'), now), 'method');
  assert.equal(problem('lmp', D('2026-08-01'), now, { cycle: 50 }), 'cycle');
  assert.equal(problem('ivf', D('2026-08-01'), now, { embryo: 4 }), 'embryo');
  assert.equal(problem('lmp', D('2026-10-28'), now, { cycle: 35 }), 'early');   // adjusted period is still ahead
  assert.equal(problem('lmp', now - 44 * 7, now), null);
  assert.equal(problem('lmp', now - 44 * 7 - 1, now), 'past');
  assert.equal(problem('ivf', now, now, { embryo: 5 }), null);                  // transfer today: 2+5
});

test('Hebrew numerals', () => {
  assert.equal(hebNum(1), 'א׳');
  assert.equal(hebNum(15), 'ט״ו');
  assert.equal(hebNum(16), 'ט״ז');
  assert.equal(hebNum(30), 'ל׳');
  assert.equal(hebNum(5787), 'תשפ״ז');
  assert.equal(hebNum(5786), 'תשפ״ו');
  assert.equal(hebNum(5800), 'ת״ת');
});

test('Hebrew date and month key', () => {
  assert.deepEqual(hebrewDate(D('2027-04-22')), { text: 'ט״ו בניסן תשפ״ז', month: 'ניסן' });
  assert.equal(hebrewDate(D('2026-09-12')).month, 'תשרי');                      // 1 Tishrei 5787
  assert.equal(hebrewDate(D('2027-03-23')).month, 'אדר');                       // Adar II in a leap year
  const months = new Set();
  for (let d = D('2026-01-01'); d < D('2028-01-01'); d++) months.add(hebrewDate(d).month);
  assert.deepEqual([...months].sort(), ['אב', 'אדר', 'אייר', 'אלול', 'חשוון', 'טבת', 'כסלו', 'ניסן', 'סיוון', 'שבט', 'תמוז', 'תשרי']);
});
