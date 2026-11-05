// "Your week" and the checkups (app/pregnancy.mjs): the saved date, the week shown on a return visit, checkup dates and states.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { toDay, fromDay, dueDate, saved, pageWeek, checkWindow, checkState, nextCheck, sinceText } from '../app/pregnancy.mjs';

const D = toDay;
const P = JSON.parse(readFileSync(new URL('../data/pregnancy.json', import.meta.url), 'utf-8'));
const LMP = '2026-01-01', DUE = dueDate('lmp', D(LMP));
const raw = v => JSON.stringify({ m: 'lmp', d: LMP, c: 28, e: 5, ...v });

test('saved: the stored input back as the due date and today\'s status', () => {
  const s = saved(raw(), D('2026-03-26'));   // 84 days: 12+0
  assert.equal(fromDay(s.due), '2026-10-08');
  assert.deepEqual([s.st.weeks, s.st.days], [12, 0]);
  assert.equal(saved(raw({ m: 'conception', d: '2026-01-15' }), D('2026-03-26')).st.weeks, 12);
});

test('saved: nothing, broken JSON or an input that no longer works is null', () => {
  for (const r of [null, '', 'null', '{', '"text"', '42', raw({ m: 'x' }), raw({ d: '2026-02-30' }), raw({ c: 50 }), raw({ m: 'ivf', e: 4 })])
    assert.equal(saved(r, D('2026-03-26')), null, String(r));
  assert.equal(saved(raw(), D('2025-12-31')), null, 'a date in the future');
  assert.equal(saved(raw(), D('2026-11-15')), null, 'more than 44 weeks ago');
});

test('saved: old entries without cycle or embryo use the defaults', () => {
  assert.equal(fromDay(saved(JSON.stringify({ m: 'lmp', d: LMP }), D('2026-03-26')).due), '2026-10-08');
  assert.equal(fromDay(saved(JSON.stringify({ m: 'ivf', d: LMP }), D('2026-03-26')).due), fromDay(D(LMP) + 261));
});

test('the week page to show: the completed weeks, at most 42', () => {
  assert.equal(pageWeek({ weeks: 12 }), 12);
  assert.equal(pageWeek({ weeks: 43 }), 42);
});

test('since the last visit: a line only when the week moved forward', () => {
  assert.equal(sinceText(undefined, 12), '');
  assert.equal(sinceText(12, 12), '');
  assert.equal(sinceText(13, 12), '');
  assert.equal(sinceText(10, 12), 'מאז הביקור הקודם עברתם לשבוע 12.');
  assert.equal(sinceText(0, 4), 'מאז הביקור הקודם עברתם לשבוע 4.');
});

test('a checkup window runs from the start of week `from` to the end of week `to`', () => {
  const [a, b] = checkWindow(DUE, { from: 11, to: 13 });
  assert.equal(fromDay(a), '2026-03-19');   // 11+0
  assert.equal(fromDay(b), '2026-04-08');   // 13+6
  assert.equal(b - a, 20);
});

test('checkup states at the edges of the window, and done wins', () => {
  const x = { id: 'nt', from: 11, to: 13 };
  const at = (w, d) => D(LMP) + w * 7 + d;
  assert.equal(checkState(DUE, x, at(10, 6)), 'soon');
  assert.equal(checkState(DUE, x, at(11, 0)), 'now');
  assert.equal(checkState(DUE, x, at(13, 6)), 'now');
  assert.equal(checkState(DUE, x, at(14, 0)), 'past');
  assert.equal(checkState(DUE, x, at(12, 0), ['nt']), 'done');
  assert.equal(checkState(DUE, x, at(20, 0), ['nt']), 'done');
});

test('the next checkup: the first one that is not done and not over', () => {
  const L = P.checkups, at = w => D(LMP) + w * 7;
  assert.equal(nextCheck(L, DUE, at(5)).id, 'first');
  assert.equal(nextCheck(L, DUE, at(12)).id, 'dating');
  assert.equal(nextCheck(L, DUE, at(12), ['first', 'dating']).id, 'nt');
  assert.equal(nextCheck(L, DUE, at(17)).id, 'triple');
  assert.equal(nextCheck(L, DUE, at(25), ['gct']).id, 'growth');
  assert.equal(nextCheck(L, DUE, at(42), ['post-term']), null);
});

test('the checkups data: unique ids, weeks 4 to 42, in order', () => {
  const ids = P.checkups.map(x => x.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const x of P.checkups) assert.ok(4 <= x.from && x.from <= x.to && x.to <= 42, x.id);
  assert.deepEqual(P.checkups.map(x => x.from), [...P.checkups.map(x => x.from)].sort((a, b) => a - b));
});
