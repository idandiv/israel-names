// The full-name rules (app/fullname-core.mjs): English spellings, syllables, notes, initials, the passport line.
// The same file runs in the app bundle (without "export") and on /tools/full-name.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spellVariants, enAnswer, sylCount, fullNotes, balanceOK, initials, mrz, email, perClass, classLine, SURNAMES_EN, fnLetters } from '../app/fullname-core.mjs';

const S = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const v = (...a) => spellVariants(...a).map(x => x.s);

test('spelling variants change one letter group and say why', () => {
  assert.deepEqual(v('איתי', 'Itai'), ['Itay']);
  assert.deepEqual(v('יצחק', 'Yitzhak'), ['Yitzchak', 'Yitshak']);
  assert.deepEqual(v('חיים', 'Haim'), ['Chaim']);
  assert.deepEqual(v('שחר', 'Shahar'), ['Shachar']);   // the h of sh is not the ח
  assert.deepEqual(v('מרדכי', 'Mordechai'), ['Mordekhai', 'Mordechay']);
  assert.deepEqual(v('שרה', 'Sarah'), ['Sara']);
  for (const x of spellVariants('יצחק', 'Yitzhak')) assert.ok(x.why.length > 10);
});

test('a final ה gets an h only on a biblical name ending in consonant + a', () => {
  assert.deepEqual(v('רבקה', 'Rivka', false, true), ['Rivkah']);
  assert.deepEqual(v('רבקה', 'Rivka', false, false), []);
  assert.deepEqual(v('מאיה', 'Maya', false, true), []);    // Mayah: no
  assert.deepEqual(v('אלה', 'Ella', false, true), []);     // Ellah: no
});

test('names that are already English, Arabic names and two-word names keep their spelling', () => {
  assert.deepEqual(v('רחל', 'Rachel'), []);
  assert.deepEqual(v('מיכאל', 'Michael'), []);
  assert.deepEqual(v('אחמד', 'Ahmad', true), []);
  assert.deepEqual(v('שי-לי', 'Shai-Li'), []);
  assert.deepEqual(v('', 'X'), []);
});

test('the FAQ answer', () => {
  assert.equal(enAnswer('איתי', 'Itai', true, [{ s: 'Itay' }]), 'השם איתי נכתב באנגלית בדרך כלל Itai. אפשר לכתוב אותו גם Itay.');
  assert.equal(enAnswer('יצחק', 'Yitzhak', true, [{ s: 'Yitzchak' }, { s: 'Yitshak' }]).endsWith('גם Yitzchak או Yitshak.'), true);
  assert.equal(enAnswer('זיו', 'Ziv', false, []), 'כתיב מוצע לשם זיו באנגלית: Ziv.');
});

test('syllables from the English spelling', () => {
  const cases = { Noa: 2, Yael: 2, Shai: 1, Itay: 2, Itai: 2, Eitan: 2, Yair: 2, Meir: 2, Haim: 2, Michael: 3, Aryeh: 2, Or: 1, Yehonatan: 4, Cohen: 2, '': 0 };
  for (const [en, n] of Object.entries(cases)) assert.equal(sylCount(en), n, en);
});

test('notes on a first name next to a surname', () => {
  const ids = (...a) => fullNotes(...a).map(x => x.id);
  assert.ok(ids('איתן', 'נחום', 'Eitan', 'Nahum').includes('blur'));       // ן then נ
  assert.ok(ids('נועה', 'אזולאי', 'Noa', 'Azoulay').includes('vowel'));
  assert.ok(ids('דניאל', 'דהן', 'Daniel', 'Dahan').includes('alit'));
  assert.ok(ids('ליאור', 'מאור', 'Lior', 'Maor').includes('rhyme'));
  assert.deepEqual(ids('כהן', 'כהן', 'Cohen', 'Cohen'), ['same']);
  assert.ok(ids('דוד', 'בן דוד', 'David', 'Ben David').includes('inside'));
  assert.ok(ids('אור', 'כהן', 'Or', 'Cohen').includes('rise'));
  assert.ok(ids('יהונתן', 'רוזנברג', 'Yehonatan', 'Rosenberg').includes('long'));
  assert.deepEqual(fullNotes('איתן', '', 'Eitan', ''), []);
  for (const x of fullNotes('נועה', 'אזולאי', 'Noa', 'Azoulay')) assert.ok(['good', 'warn', 'info'].includes(x.k));
});

test('balanceOK: nothing swallowed or rhyming, and an even or rising rhythm', () => {
  assert.equal(balanceOK('אורי', 'נחום', 'Uri', 'Nahum'), true);
  assert.equal(balanceOK('איתן', 'נחום', 'Eitan', 'Nahum'), false);
  assert.equal(balanceOK('נועה', 'אזולאי', 'Noa', 'Azoulay'), false);
});

test('initials, passport line, email, class line', () => {
  assert.deepEqual(initials(['איתן', '', 'כהן'], ['Eitan', '', 'Cohen']), { he: 'א.כ.', en: 'E.C.', bad: '' });
  assert.equal(initials(['אבי', 'שמעון', 'שגיא'], ['Avi', 'Shimon', 'Sagi']).bad, 'ASS');
  assert.equal(mrz('Ben David', ['Eitan', 'Ariel']), 'BEN<DAVID<<EITAN<ARIEL');
  assert.equal(mrz('Cohen', ['Eitan', '']), 'COHEN<<EITAN');
  assert.equal(email('Eitan', 'Ben David'), 'eitan.bendavid@');
  assert.equal(classLine(perClass(0, 1000)), 'כמעט אף ילד בשם הזה');
  assert.equal(classLine(perClass(1000, 160000)), 'ילד אחד בשם הזה בכל 5 כיתות, בערך');
  assert.equal(classLine(perClass(12000, 160000)), 'בערך 2 ילדים בשם הזה בכל כיתה');
});

test('surnames: Hebrew keys, Latin values; final letters count as their regular form', () => {
  for (const [he, en] of Object.entries(SURNAMES_EN)) {
    assert.match(he, /^[א-ת ]+$/);
    assert.match(en, /^[A-Z][a-z]+( [A-Z][a-z]+)?$/);
  }
  assert.deepEqual(fnLetters('נחום'), ['נ', 'ח', 'ו', 'מ']);
});

test('the app bundle carries the core as plain functions (build_bundle.py strips "export")', () => {
  // the built app script the home page loads (src/ is committed; dist/ is not)
  const home = fs.readFileSync(path.join(S, '..', 'src', 'index.html'), 'utf8');
  const js = fs.readFileSync(path.join(S, '..', 'src', home.match(/src="\/(assets\/app\.[0-9a-f]+\.js)"/)[1]), 'utf8');
  assert.ok(js.includes('function spellVariants('));
  assert.doesNotMatch(js, /^export /m);
});
