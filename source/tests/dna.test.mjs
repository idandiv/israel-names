// The DNA of a name and names for a sibling (app/dna-core.mjs), on the real records of data/seo.json.
// The same file runs in the app bundle (without "export") and on /tools/siblings.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dnaOf, oneApart, affinity, suggestSiblings, familyStyle, reasons, SIB_POOL_MIN, SIB_RARE } from '../app/dna-core.mjs';

const S = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SEO = JSON.parse(fs.readFileSync(path.join(S, 'data', 'seo.json'), 'utf8'));
const ALL = SEO.names.map(x => dnaOf(x.n, x.dna));
const BY = new Map(ALL.map(d => [d.n, d]));
const POOL = ALL.filter(d => Math.max(...d.y1) >= SIB_POOL_MIN);
const of = (...n) => n.map(x => BY.get(x));
const names = L => L.map(x => x.n);

test('one letter apart', () => {
  for (const [a, b] of [['נועה', 'נועם'], ['יונתן', 'יהונתן'], ['אורי', 'אוריה'], ['דן', 'דן']]) assert.ok(oneApart(a, b), a + b);
  for (const [a, b] of [['נועה', 'מאיה'], ['דן', 'דנה ל'], ['איתן', 'איתמר']]) assert.ok(!oneApart(a, b), a + b);
});

test('a record: the fields, the Hebrew letters (final letters as regular) and the syllables', () => {
  const d = BY.get('איתן');
  assert.equal(d.h, 'איתנ');
  assert.equal(d.first, 'א');
  assert.equal(d.end, 'תנ');
  assert.equal(d.syl, 2);
  assert.equal(d.og, 'bible');
  assert.deepEqual(d.sec.length, 4);
});

test('pairs that must not be suggested', () => {
  const [noa, noam, eitan, muhammad] = of('נועה', 'נועם', 'איתן', 'מוחמד');
  assert.equal(affinity(noa, noam), null);              // one letter apart
  assert.equal(affinity(eitan, eitan), null);
  assert.equal(affinity(eitan, muhammad), null);        // names of different communities
  const ok = affinity(eitan, BY.get('יאיר'));
  assert.ok(ok && ok.score > 0 && 'era' in ok.parts);
  assert.ok(affinity(eitan, BY.get('איתמר')).parts.start < 0);   // the same first three letters
});

test('suggestions: of the sex asked, given now, never a sibling or close to one, no two alike, the same every time', () => {
  for (const [sibs, sex] of [[['איתן'], 1], [['נועה', 'איתן'], 0], [['מוחמד'], 1], [['שירה', 'אורי', 'נועם'], 0], [['רונית'], 0]]) {
    const S1 = of(...sibs), L = suggestSiblings(S1, POOL, { sex });
    assert.equal(L.length, 12, sibs.join());
    assert.deepEqual(L, suggestSiblings(S1, POOL, { sex }));
    for (const x of L) {
      const d = BY.get(x.n);
      assert.ok(d.y1[sex] >= SIB_POOL_MIN && (sex ? d.g <= 50 : d.g >= 50), x.n);
      assert.ok(!sibs.includes(x.n));
      for (const s of S1) assert.ok(!oneApart(s.h, d.h), `${x.n} / ${s.n}`);
      assert.ok(x.why.length <= 3);
    }
    for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) assert.ok(!oneApart(BY.get(L[i].n).h, BY.get(L[j].n).h));
    for (let i = 1; i < L.length; i++) assert.ok(L[i - 1].score >= L[i].score);
  }
});

test('the community: Arabic names for an Arabic name, Hebrew names for a Hebrew one', () => {
  for (const x of suggestSiblings(of('מוחמד'), POOL, { sex: 0 })) assert.ok(BY.get(x.n).sec[0] < 30, x.n);
  for (const x of suggestSiblings(of('נועה'), POOL, { sex: 1 })) assert.ok(BY.get(x.n).sec[0] > 50, x.n);
});

test('the filters', () => {
  const sibs = of('נועה');
  const rare = suggestSiblings(sibs, POOL, { sex: 0, rarity: 'rare' }), common = suggestSiblings(sibs, POOL, { sex: 0, rarity: 'common' });
  assert.ok(rare.every(x => BY.get(x.n).y1[0] < SIB_RARE) && common.every(x => BY.get(x.n).y1[0] >= SIB_RARE));
  assert.ok(suggestSiblings(sibs, POOL, { sex: 0, style: 'classic' }).every(x => BY.get(x.n).med < 2000));
  assert.ok(suggestSiblings(sibs, POOL, { sex: 0, style: 'new' }).every(x => BY.get(x.n).med >= 2005));
  assert.ok(suggestSiblings(sibs, POOL, { sex: 0, letter: 'same' }).every(x => BY.get(x.n).first === 'נ'));
  assert.ok(suggestSiblings(sibs, POOL, { sex: 0, letter: 'other' }).every(x => BY.get(x.n).first !== 'נ'));
  assert.equal(suggestSiblings(sibs, POOL, { sex: 1, k: 6 }).length, 6);
  assert.deepEqual(suggestSiblings([], POOL, { sex: 1 }), []);
});

test('the reasons are true of the name', () => {
  const sibs = of('אגם', 'אלון');
  for (const x of suggestSiblings(sibs, POOL, { sex: 0 })) {
    const d = BY.get(x.n);
    assert.deepEqual(reasons(sibs, d), x.why);
    for (const w of x.why) {
      if (w.startsWith('שם עברי')) assert.ok(['heb', 'bible'].includes(d.og) && d.og === 'heb');
      if (w.startsWith('מאותו דור')) assert.ok(w.includes(String(d.med)));
      if (w.startsWith('שם של טבע')) assert.ok(d.th & 1);
      if (w.startsWith('אותו אורך')) assert.ok(sibs.every(s => s.syl === d.syl));
    }
  }
});

test('the family style', () => {
  assert.equal(familyStyle(of('אגם', 'אלון')), 'משפחה של שמות עבריים קצרים, בסגנון שנות ה-2000');
  assert.match(familyStyle(of('לביא')), /^שם עברי קצר ונפוץ היום, בסגנון שנות ה-2010$/);
  assert.match(familyStyle(of('רונית')), /נדיר היום, בסגנון שנות ה-60$/);
  assert.equal(familyStyle([]), '');
});

test('the export agrees with the core: every name page lists what suggestSiblings gives', () => {
  for (const n of ['איתן', 'נועה', 'מוחמד', 'אביגיל', 'יוסי']) {
    const x = SEO.names.find(y => y.n === n);
    assert.deepEqual(x.sib, [1, 0].map(sex => names(suggestSiblings(of(n), POOL, { sex, k: 6 }))), n);
  }
});

test('the app bundle carries the core as plain functions (build_bundle.py strips "export" and "import")', () => {
  const home = fs.readFileSync(path.join(S, '..', 'src', 'index.html'), 'utf8');
  const js = fs.readFileSync(path.join(S, '..', 'src', home.match(/src="\/(assets\/app\.[0-9a-f]+\.js)"/)[1]), 'utf8');
  assert.ok(js.includes('function suggestSiblings(') && js.includes('function dnaRec('));
  assert.doesNotMatch(js, /^(export|import) /m);
});
