// The hero at the top of the calculator result (app/pregnancy.mjs): what heroModel shows for a given status.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { toDay, dueDate, status, heroModel, ART } from '../app/pregnancy.mjs';

const P = JSON.parse(readFileSync(new URL('../data/pregnancy.json', import.meta.url), 'utf-8'));
const LMP = toDay('2026-01-01'), DUE = dueDate('lmp', LMP);
const at = (w, d = 0) => status(DUE, LMP + w * 7 + d);
const model = st => heroModel(st, P.weeks[Math.min(42, st.weeks)]);

test('heroModel: the week as the site counts it, the ordinal week, and the share of the way', () => {
  const m = model(at(20, 4));
  assert.equal(m.n, 20);
  assert.equal(m.ga, '20+4');
  assert.equal(m.ord, 21);
  assert.equal(m.pct, Math.round((144 / 280) * 100));
  assert.equal(m.size, P.weeks['20'].size);
  assert.equal(m.art, 'banana');
});

test('heroModel: tags for length, weight, trimester and days left', () => {
  const m = model(at(20, 4));
  assert.deepEqual(m.tags.map(t => t.k), ['len', 'wt', 'tri', 'left']);
  assert.equal(m.tags[0].t, `כ-${P.weeks['20'].cm} ס״מ`);
  assert.equal(m.tags[2].t, 'השליש השני');
  assert.equal(m.tags[3].t, 'עוד 136 ימים');
  // no weight yet in the early weeks: no weight tag
  const w = Object.keys(P.weeks).find(k => !P.weeks[k].g);
  if (w) assert.ok(!model(at(+w)).tags.some(t => t.k === 'wt'));
});

test('heroModel: the views a tap cycles through', () => {
  const m = model(at(20, 4));
  assert.deepEqual(m.views.map(v => v.big), ['20', `${m.pct}%`, '136']);
  assert.equal(m.views[2].u, 'ימים');
  // on and after the due date: no "days left" view
  assert.equal(model(at(40)).views.length, 2);
  assert.equal(model(at(40)).tags.at(-1).t, 'התאריך המשוער היום');
  assert.equal(model(at(41)).tags.at(-1).t, '7 ימים אחרי התאריך');
});

test('heroModel: before week 4 there is no size, and after 42 the week stays 42', () => {
  const early = heroModel(at(2, 3), undefined);
  assert.equal(early.size, '');
  assert.equal(early.art, '');
  assert.deepEqual(early.tags.map(t => t.k), ['tri', 'left']);
  const late = model(at(43, 2));
  assert.equal(late.n, 42);
  assert.equal(late.pct, 100);
});

test('every week has a drawing, and every drawing is used and is plain SVG', () => {
  const used = new Set();
  for (const [w, x] of Object.entries(P.weeks)) {
    assert.ok(ART[x.art], `week ${w}: no drawing "${x.art}"`);
    assert.equal(model(at(+w)).art, x.art);
    used.add(x.art);
  }
  assert.deepEqual([...used].sort(), Object.keys(ART).sort(), 'a drawing no week uses');
  for (const [k, svg] of Object.entries(ART)) {
    assert.doesNotMatch(svg, /<script|on\w+=|href|url\(|undefined|NaN/i, k);
    assert.match(svg, /^<(path|circle|ellipse|g|rect)/, k);
  }
});
