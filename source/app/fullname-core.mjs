/* =========================================================
   The full name: English spellings, how a first name sits with a surname, initials, roll call.
   Pure functions, one source for two places:
   - the app bundle (tools/build_bundle.py adds this file after p0_translit.js with "export " removed),
     for the name page, the quick view and the FAQ answer exported to data/seo.json;
   - the /tools/full-name page (tools/fullname.py joins p0_translit.js, this file and app/fullname.mjs into one module).
   Tested in tests/fullname.test.mjs.
   ========================================================= */

/* the Hebrew final letters, so ם and מ count as the same letter */
const FN_FIN = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
export const fnLetters = s => [...String(s || '')].filter(c => c >= 'א' && c <= 'ת').map(c => FN_FIN[c] || c);

/* ---------- English spellings ----------
   Other ways to write a name in English, from the letters that are written in more than one way.
   Each variant changes one thing in the main spelling and says why. Arabic names keep their main spelling,
   since ח and כ are written differently there. */
const FN_WHY = {
  het: 'ח נכתבת Ch או H. בישראל מקובל Ch, אבל דוברי אנגלית קוראים אותו כמו ב-Chair, ולכן יש שמעדיפים H.',
  khaf: 'כ בלי דגש נכתבת Kh או Ch.',
  tsadi: 'צ נכתבת Tz או Ts.',
  endHe: 'ה בסוף השם לא נשמעת, אז אפשר לכתוב אותה בסוף (h) או לוותר עליה.',
  endYud: 'י בסוף השם נכתבת i או y.',
};
const fnCase = (src, rep) => (src[0] === src[0].toUpperCase() ? rep[0].toUpperCase() + rep.slice(1) : rep);
function fnSwap(en, re, to) {
  const m = re.exec(en);
  if (!m) return null;
  return en.slice(0, m.index) + fnCase(m[0], to(m[0].toLowerCase())) + en.slice(m.index + m[0].length);
}
/* names whose spelling is already the English one (Rachel, Michael): their ח and כ stay as they are */
const FN_ENGLISH = new Set(['Rachel', 'Michael', 'Hannah', 'Nachman']);
/* arab: an Arabic name; bib: a biblical name, the only kind where a final ה is often written as h when the main spelling has none (Rivka, Rivkah) */
export function spellVariants(he, en, arab, bib) {
  he = String(he || ''); en = String(en || '');
  if (!he || !en || /[\s-]/.test(he)) return [];
  const out = [], add = (s, why) => { if (s && s !== en && !out.some(v => v.s === s)) out.push({ s, why }) };
  const count = ch => [...he].filter(c => c === ch).length;
  const endHe = he.endsWith('ה'), midHe = [...he.slice(0, -1)].includes('ה');
  if (!arab && !FN_ENGLISH.has(en)) {
    // ח, once, with no other letter that becomes h (a ה inside the name, or a כ)
    if (count('ח') === 1 && !midHe && !/[כך]/.test(he)) {
      const body = endHe && /ah$/i.test(en) ? en.slice(0, -1) : en;   // the h of a final ה is not the ח
      const rest = en.slice(body.length);
      let v = null;
      if (/ch/i.test(body)) v = fnSwap(body, /ch/i, () => 'h');
      else if (/kh/i.test(body)) v = fnSwap(body, /kh/i, () => 'ch');
      else {   // a lone h: not the h of sh, ch, th or kh
        const k = [...body].findIndex((c, j) => /h/i.test(c) && !/[sctk]/i.test(body[j - 1] || ''));
        if (k >= 0) v = body.slice(0, k) + fnCase(body[k], 'ch') + body.slice(k + 1);
      }
      if (v) add(v + rest, FN_WHY.het);
    }
    // כ without a dagesh: anywhere but the start, and no ח to mix it with
    if (/.[כך]/.test(he) && !he.includes('ח')) {
      if (/kh/i.test(en)) add(fnSwap(en, /kh/i, () => 'ch'), FN_WHY.khaf);
      else if (/ch/i.test(en)) add(fnSwap(en, /ch/i, () => 'kh'), FN_WHY.khaf);
    }
    if (/[צץ]/.test(he)) {
      if (/tz/i.test(en)) add(fnSwap(en, /tz/i, () => 'ts'), FN_WHY.tsadi);
      else if (/ts/i.test(en)) add(fnSwap(en, /ts/i, () => 'tz'), FN_WHY.tsadi);
    }
  }
  if (endHe) {
    if (/[^h]ah$/i.test(en)) add(en.slice(0, -1), FN_WHY.endHe);
    else if (bib && /[^aeiouy]a$/i.test(en) && !/(.)\1a$/i.test(en)) add(en + 'h', FN_WHY.endHe);
  }
  // a final י after a vowel: Itai / Itay, Roi / Roy
  if (he.endsWith('י') && !he.endsWith('יי')) {
    if (/[aeou]i$/i.test(en)) add(en.slice(0, -1) + 'y', FN_WHY.endYud);
    else if (/[aeou]y$/i.test(en)) add(en.slice(0, -1) + 'i', FN_WHY.endYud);
  }
  return out.slice(0, 3);
}
const fnOr = a => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' או ' + a[a.length - 1];
/* the answer to "איך כותבים את השם X באנגלית?", on the name page and in its FAQ (data/seo.json "enq") */
export function enAnswer(he, en, curated, vars) {
  const head = curated ? `השם ${he} נכתב באנגלית בדרך כלל ${en}.` : `כתיב מוצע לשם ${he} באנגלית: ${en}.`;
  return vars && vars.length ? `${head} אפשר לכתוב אותו גם ${fnOr(vars.map(v => v.s))}.` : head;
}

/* ---------- syllables ----------
   From the English spelling: vowel groups, where two vowels that are said apart (No-a, Ya-el, A-ri-el) count twice.
   y is a vowel unless a vowel follows it (Yael, Aryeh). ai and ei before a last consonant are two syllables too
   (Ya-ir, Me-ir, Cha-im), but one at the end or before more letters (I-tai, Ei-tan). */
const FN_DIPH = new Set(['ai', 'ay', 'ei', 'ey', 'oi', 'oy', 'ui', 'uy', 'ou', 'ee', 'oo']);
export function sylCount(en) {
  const s = String(en || '').toLowerCase().replace(/[^a-z]/g, '');
  if (!s) return 0;
  const V = (k) => 'aeiou'.includes(s[k]) || (s[k] === 'y' && !'aeiou'.includes(s[k + 1] || '') && k > 0);
  let n = 0;
  for (let k = 0; k < s.length; k++) {
    if (!V(k)) continue;
    n++;
    if (k + 1 < s.length && V(k + 1) && FN_DIPH.has(s[k] + s[k + 1])) {
      if (/[ae]i/.test(s[k] + s[k + 1]) && k + 3 === s.length && !V(k + 2)) continue;   // Ya-ir, Cha-im
      k++;
    }
  }
  return Math.max(n, 1);
}

/* ---------- surnames in English ----------
   Common Israeli surnames with their usual spelling; for any other surname the page suggests a spelling
   from the rules (romanize in p0_translit.js) and lets you correct it. */
export const SURNAMES_EN = {
  'כהן': 'Cohen', 'לוי': 'Levi', 'מזרחי': 'Mizrahi', 'פרץ': 'Peretz', 'ביטון': 'Biton', 'דהן': 'Dahan', 'אברהם': 'Avraham',
  'פרידמן': 'Friedman', 'מלכה': 'Malka', 'אזולאי': 'Azoulay', 'כץ': 'Katz', 'יוסף': 'Yosef', 'דוד': 'David', 'אוחיון': 'Ohayon',
  'עמר': 'Amar', 'חדד': 'Hadad', 'גבאי': 'Gabay', 'בן דוד': 'Ben David', 'שפירא': 'Shapira', 'חזן': 'Hazan', 'אלבז': 'Elbaz',
  'אשכנזי': 'Ashkenazi', 'ששון': 'Sasson', 'מימון': 'Maimon', 'שלום': 'Shalom', 'יעקב': 'Yaakov', 'אליהו': 'Eliyahu',
  'בן חיים': 'Ben Haim', 'רוזנברג': 'Rosenberg', 'גולדברג': 'Goldberg', 'גולדשטיין': 'Goldstein', 'ויס': 'Weiss',
  'שוורץ': 'Schwartz', 'קליין': 'Klein', 'ברק': 'Barak', 'טל': 'Tal', 'שמעוני': 'Shimoni', 'נחום': 'Nahum', 'חיים': 'Haim',
  'אוחנה': 'Ohana', 'אדלר': 'Adler', 'קורן': 'Koren', 'שגיא': 'Sagi', 'ישראלי': 'Israeli', 'אלון': 'Alon', 'גל': 'Gal',
  'בר': 'Bar', 'שחר': 'Shahar', 'אהרון': 'Aharon', 'אהרוני': 'Aharoni', 'יצחק': 'Yitzhak', 'משה': 'Moshe', 'בירנבאום': 'Birnbaum',
  'רבינוביץ': 'Rabinovich', 'ברגר': 'Berger', 'וייס': 'Weiss', 'הורוביץ': 'Horowitz', 'סעדה': 'Saada', 'בוזגלו': 'Bozaglo',
};

/* ---------- the first name next to the surname ----------
   Notes on how the two sound together: k is 'good', 'warn' or 'info', id names the rule (balanceOK filters by it). */
export function fullNotes(first, last, firstEn, lastEn) {
  const A = fnLetters(first), B = fnLetters(last), out = [];
  if (!A.length || !B.length) return out;
  const a = A.join(''), b = B.join('');
  if (a === b) return [{ id: 'same', k: 'warn', t: 'השם הפרטי זהה לשם המשפחה. זה קורה, אבל כדאי לדעת שתצטרכו להסביר אותו לא מעט.' }];
  if (a.length >= 3 && b.includes(a) || b.length >= 3 && a.includes(b))
    out.push({ id: 'inside', k: 'info', t: 'אחד השמות נמצא בתוך השני. יש שאוהבים את המשחק הזה, ויש שזה מבלבל.' });
  if (A[A.length - 1] === B[0])
    out.push({ id: 'blur', k: 'warn', t: `השם נגמר באות ${B[0]}, ושם המשפחה מתחיל בה. כשאומרים אותם ברצף, האות הזאת עלולה להיבלע.` });
  else if (/[aeiouy]$/i.test(firstEn || '') && /^[aeiou]/i.test(lastEn || ''))
    out.push({ id: 'vowel', k: 'info', t: 'השם נגמר בתנועה ושם המשפחה מתחיל בתנועה, אז ברצף הם עלולים להישמע כמו מילה אחת. שווה להגיד בקול.' });
  if (A[0] === B[0]) out.push({ id: 'alit', k: 'info', t: `שני השמות פותחים באות ${A[0]}. צליל חוזר כזה קל לזכור, אבל לא כולם אוהבים אותו.` });
  if (A.length >= 2 && B.length >= 2 && A.slice(-2).join('') === B.slice(-2).join(''))
    out.push({ id: 'rhyme', k: 'warn', t: 'השם ושם המשפחה מתחרזים בסוף. בגן זה חמוד, ובהמשך יש מי שמתעייף מזה.' });
  const s1 = sylCount(firstEn), s2 = sylCount(lastEn);
  if (s1 && s2) {
    const tot = s1 + s2;
    if (tot <= 2) out.push({ id: 'short', k: 'info', t: 'שתי הברות בסך הכול: שם קצר וחד, שנשמע כמו קריאה אחת.' });
    else if (tot >= 7) out.push({ id: 'long', k: 'warn', t: `${tot} הברות בסך הכול, צירוף ארוך. שם פרטי קצר יותר יאזן אותו.` });
    else if (s1 < s2) out.push({ id: 'rise', k: 'good', t: `שם קצר לפני שם משפחה ארוך יותר (${s1}+${s2} הברות): בדרך כלל זה הקצב שהכי נוח להגיד.` });
    else if (s1 === s2) out.push({ id: 'even', k: 'good', t: `לשני השמות אותו מספר הברות (${s1}+${s2}): קצב אחיד.` });
    else out.push({ id: 'fall', k: 'info', t: `השם הפרטי ארוך משם המשפחה (${s1}+${s2} הברות). זה עובד, רק שווה להגיד אותו בקול כמה פעמים.` });
  }
  return out;
}

/* a first name that sits well with the surname: nothing swallowed, no vowel clash, no rhyme or shared first letter,
   not too long, and a rhythm that rises or stays even */
export const balanceOK = (first, last, firstEn, lastEn) => {
  const ids = fullNotes(first, last, firstEn, lastEn).map(x => x.id);
  return !ids.some(id => ['same', 'inside', 'blur', 'vowel', 'alit', 'rhyme', 'long'].includes(id)) && ids.some(id => id === 'rise' || id === 'even');
};

/* ---------- initials, roll call and passport ---------- */
/* three-letter initials that spell an English word nobody wants on a monogram */
const FN_BAD = new Set(['ASS', 'BAD', 'BUM', 'COW', 'DIE', 'DUD', 'FAT', 'HAG', 'LOL', 'OMG', 'PEE', 'PIG', 'POO', 'RAT', 'SAD', 'SOS', 'WTF', 'ZIT', 'FBI', 'CIA', 'IRS']);
export function initials(parts, partsEn) {
  const he = parts.filter(Boolean).map(p => fnLetters(p)[0] || '').filter(Boolean);
  const en = partsEn.filter(Boolean).map(p => (String(p).match(/[a-z]/i) || [''])[0].toUpperCase()).filter(Boolean);
  const word = en.join('');
  return { he: he.join('.') + (he.length ? '.' : ''), en: en.join('.') + (en.length ? '.' : ''), bad: en.length === 3 && FN_BAD.has(word) ? word : '' };
}
/* the machine-readable line of a passport (ICAO 9303): SURNAME<<GIVEN<NAMES, letters only */
export function mrz(lastEn, givenEn) {
  const f = s => String(s || '').toUpperCase().replace(/[^A-Z\s-]/g, '').trim().replace(/[\s-]+/g, '<');
  return `${f(lastEn)}<<${givenEn.filter(Boolean).map(f).join('<')}`;
}
export const email = (firstEn, lastEn) => [firstEn, lastEn].map(s => String(s || '').toLowerCase().replace(/[^a-z]/g, '')).filter(Boolean).join('.') + '@';

/* ---------- how many in a class ----------
   babies of that name in the last year, out of all births that year, in a class of 30 */
export const perClass = (n, births) => births ? n / births * 30 : 0;
export function classLine(v) {
  if (v >= 1.95) return `בערך ${Math.round(v)} ילדים בשם הזה בכל כיתה`;
  if (v >= 1) return 'בערך ילד אחד בשם הזה בכל כיתה';
  if (v > 0) return `ילד אחד בשם הזה בכל ${Math.round(1 / v).toLocaleString('he-IL')} כיתות, בערך`;
  return 'כמעט אף ילד בשם הזה';
}
