// The calendar file and the share card text (app/pregnancy.mjs): RFC 5545 escaping and folding, stable UIDs,
// which events go in, and what the card says.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { toDay, dueDate, status, checkWindow, icsEscape, icsFold, ics, cardLines } from '../app/pregnancy.mjs';

const P = JSON.parse(readFileSync(new URL('../data/pregnancy.json', import.meta.url), 'utf-8'));
const LMP = toDay('2026-01-01'), DUE = dueDate('lmp', LMP);
const STAMP = '20261105T080000Z';
const at = weeks => LMP + weeks * 7;   // the day week+0
const make = (now, o = {}) => ics({ due: DUE, now, info: P.weeks, checkups: P.checkups, stamp: STAMP, site: 'https://www.shemotil.co.il', ...o });
const events = text => text.split('BEGIN:VEVENT').slice(1);
const unfold = text => text.replace(/\r\n /g, '');
const bytes = s => new TextEncoder().encode(s).length;

test('icsEscape: backslash, semicolon, comma and line breaks', () => {
  assert.equal(icsEscape('a\\b;c,d\ne'), 'a\\\\b\\;c\\,d\\ne');
  assert.equal(icsEscape('שבוע 20'), 'שבוע 20');
});

test('icsFold: at most 75 bytes a line, Hebrew letters never cut, unfolds back to the same text', () => {
  const line = 'DESCRIPTION:' + 'בדיקת סוכר, העמסה של 50 גרם; '.repeat(8);
  const out = icsFold(line);
  const parts = out.split('\r\n');
  assert.ok(parts.length > 1);
  for (const [i, p] of parts.entries()) {
    assert.ok(bytes(p) <= 75, `line ${i} is ${bytes(p)} bytes`);
    if (i) assert.equal(p[0], ' ');
    assert.ok(!p.includes('�'));
  }
  assert.equal(out.replace(/\r\n /g, ''), line);
  assert.equal(icsFold('SUMMARY:short'), 'SUMMARY:short');
  // exactly 75 bytes stays on one line
  const x = 'X'.repeat(75);
  assert.equal(icsFold(x), x);
  assert.equal(icsFold(x + 'Y').split('\r\n').length, 2);
});

test('ics: a valid calendar with CRLF line ends and all-day dates', () => {
  const text = make(at(20) + 2);
  assert.ok(text.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n'));
  assert.ok(text.endsWith('END:VCALENDAR\r\n'));
  assert.ok(!/[^\r]\n/.test(text), 'every line ends with CRLF');
  for (const line of text.split('\r\n')) assert.ok(bytes(line) <= 75, line);
  for (const e of events(text)) {
    assert.match(e, /DTSTART;VALUE=DATE:\d{8}\r\n/);
    assert.match(e, /DTEND;VALUE=DATE:\d{8}\r\n/);
    assert.match(e, /DTSTAMP:20261105T080000Z\r\n/);
    assert.match(e, /BEGIN:VALARM[\s\S]*TRIGGER:PT9H[\s\S]*END:VALARM/);
  }
  assert.equal((text.match(/BEGIN:VEVENT/g) || []).length, (text.match(/END:VEVENT/g) || []).length);
});

test('ics: weekly events from the next week to 41, then the due date', () => {
  const text = unfold(make(at(20) + 2, { checks: false }));
  const sums = [...text.matchAll(/SUMMARY:(.*)\r\n/g)].map(m => m[1]);
  assert.equal(sums[0], 'שבוע 21 להריון');
  assert.ok(sums.includes('שבוע 41 להריון'));
  assert.ok(!sums.includes('שבוע 40 להריון'), 'week 40 starts on the due date: one event, not two');
  assert.ok(!sums.includes('שבוע 20 להריון'), 'the current week has already started');
  assert.equal(sums.filter(x => x === 'תאריך הלידה המשוער').length, 1);
  assert.equal(sums.length, 20 + 1);  // weeks 21-41 without 40, and the due date
  // week 21 starts on its +0 day, with a link to its page
  const w21 = events(text).find(e => e.includes('SUMMARY:שבוע 21 להריון'));
  assert.match(w21, new RegExp(`DTSTART;VALUE=DATE:${new Date(at(21) * 864e5).toISOString().slice(0, 10).replace(/-/g, '')}`));
  assert.match(w21, /URL:https:\/\/www.shemotil.co.il\/pregnancy\/week-21/);
  assert.match(w21, /DESCRIPTION:בגודל של /);
});

test('ics: checkups that are not done and not over, on the day their window opens (or today)', () => {
  const now = at(12) + 3;
  const text = unfold(make(now, { weeks: false, done: ['nt'] }));
  const sums = [...text.matchAll(/SUMMARY:(.*)\r\n/g)].map(m => m[1]);
  const names = Object.fromEntries(P.checkups.map(x => [x.id, x.name]));
  assert.ok(!sums.includes(`בדיקה: ${names.first}`), 'the first visit (6-9) is over by week 12');
  assert.ok(!sums.includes(`בדיקה: ${names.nt}`), 'marked as done');
  assert.ok(sums.includes(`בדיקה: ${names['late-scan']}`));
  assert.ok(sums.includes('תאריך הלידה המשוער'));
  assert.ok(!sums.some(x => x.startsWith('שבוע ')));
  const late = P.checkups.find(x => x.id === 'late-scan'), [a] = checkWindow(DUE, late);
  const ev = events(text).find(e => e.includes(`SUMMARY:בדיקה: ${late.name}`));
  assert.match(ev, new RegExp(`DTSTART;VALUE=DATE:${new Date(a * 864e5).toISOString().slice(0, 10).replace(/-/g, '')}`));
  // a window that is open today starts today
  const early = P.checkups.find(x => x.id === 'early-scan');
  const ev2 = events(text).find(e => e.includes(`SUMMARY:בדיקה: ${early.name}`));
  assert.match(ev2, new RegExp(`DTSTART;VALUE=DATE:${new Date(now * 864e5).toISOString().slice(0, 10).replace(/-/g, '')}`));
});

test('ics: UIDs are stable for the same due date and unique in the file', () => {
  const uids = t => [...t.matchAll(/UID:(.*)\r\n/g)].map(m => m[1]);
  const a = uids(make(at(20))), b = uids(make(at(20), { stamp: '20270101T000000Z' }));
  assert.deepEqual(a, b);
  assert.equal(new Set(a).size, a.length);
  assert.ok(a.every(u => u.endsWith('@shemotil.co.il')));
  assert.ok(a.includes(`w21-20261008@shemotil.co.il`));
  assert.notDeepEqual(uids(ics({ due: DUE + 7, now: at(20), info: P.weeks, stamp: STAMP })).slice(0, 1), a.slice(0, 1));
});

test('ics: nothing after the due date has passed except what is still ahead', () => {
  const text = make(DUE + 3, { checks: true });
  const sums = [...unfold(text).matchAll(/SUMMARY:(.*)\r\n/g)].map(m => m[1]);
  assert.deepEqual(sums.filter(x => x.startsWith('שבוע ')), ['שבוע 41 להריון']);
  assert.ok(!sums.includes('תאריך הלידה המשוער'));
});

test('cardLines: week, size and the month only when asked', () => {
  const st = status(DUE, at(20) + 3), heb = { month: 'תשרי' };
  const c = cardLines(st, P.weeks, heb);
  assert.equal(c.week, '20');
  assert.equal(c.sub, `בגודל של ${P.weeks['20'].size}`);
  assert.equal(c.month, '');
  assert.equal(cardLines(st, P.weeks, heb, { month: true }).month, 'מגיע/ה בתשרי');
  assert.equal(cardLines(status(DUE, at(2)), P.weeks, heb).sub, 'השבועות הראשונים');
  assert.equal(cardLines(status(DUE, at(43)), P.weeks, heb).week, '42');
  assert.ok(!JSON.stringify(c).match(/\d{4}-\d{2}/), 'no dates on the card');
});
