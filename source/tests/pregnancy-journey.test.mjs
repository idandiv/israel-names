// The names journey (stage by week, holidays around the due date) and the brit mila / pidyon haben dates (app/pregnancy.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { toDay, fromDay, hebDM, holidaysBetween, birthWindow, journeyStage, isShabbat, yomTov, britDates, TERM } from '../app/pregnancy.mjs';

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
