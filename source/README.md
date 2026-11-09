# קוד המקור של "השמות של ישראל"

כאן נמצא כל מה שצריך כדי לבנות את האתר מחדש. התוצאה הנבנית (`src/` בתיקייה הראשית) היא מה ש-Vercel מפרסם.

## מבנה
- `app/` – קוד האתר: קובצי JavaScript (מחוברים לפי הסדר שב-`tools/build_bundle.py`) וקובצי CSS.
- `data/babynamesIL.csv` – הנתונים הגולמיים של הלמ״ס (מחבילת babynamesIL).
- `data/data.b64` – הנתונים בפורמט הדחוס שהאתר טוען (נוצר מה-CSV).
- `data/seo.json` – עובדות לכל שם עבור העמודים הסטטיים (נוצר מהקוד של האתר עצמו, כך שהמספרים זהים).
- `data/meanings.json` – הפירושים והסיפורים של השמות, שורה לכל שם. המקור היחיד לתוכן הזה: האתר מקבל אותו כנכס נפרד (`assets/meanings.<hash>.js`), והעמודים הסטטיים קוראים אותו ישירות. השדות והכללים מתועדים ב-`tools/meanings.py`. נכנסים לקובץ רק פירושים שנבדקו ואושרו.
- `data/guides.json` + `content/guides/<slug>.html` – המדריכים והמאמרים (`/guides`). הפורמט והסימונים בתוך הטקסט מתועדים ב-`tools/guides.py`, שגם בודק בבנייה שכל שם קיים ומתאים.
- `data/forecast-2025.json` – תחזית השמות ל-2025 (`/guides/names-forecast-2025`), שנשמרה מהנתונים עד 2024 כדי שאפשר יהיה לבדוק אותה מול נתוני 2025 של הלמ״ס. השיטה והבדיקה על שנים קודמות ב-`tools/forecast.py`. כל עוד הנתונים נגמרים ב-2024, הבנייה בודקת שהקובץ תואם לנתונים (`python3 tools/forecast.py` כותב אותו מחדש).
- `data/pregnancy.json` + `app/pregnancy.mjs` – מחשבון ההריון (`/pregnancy/calculator`): תוכן השבועות, שמות לפי חודש עברי, החגים (`holidays`: תאריך, הסבר ושמות, גם למדריך `/guides/hebrew-month-names`), לוח הבדיקות של משרד הבריאות (`checkups`, עם מקור ותאריך בדיקה), שאלות ומקורות, והקוד של המחשבון. אותו תוכן בונה גם עמוד לכל שבוע (`/pregnancy/week-<n>`, עם פירורי לחם, ציור הגודל מ-`ART` (נקרא ב-node בזמן הבנייה), גרף משקל וגרף אורך ב-SVG (האורך נקטע בשבוע 20, כשהמדידה עוברת לראש-עקב), ושם לבת ושם לבן לכל שבוע, `weeks[n].names`, עם כפתור שמירה לרשימה של האתר), את `/pregnancy`, את `/pregnancy/fetal-weight` (טבלת משקל ואורך ונתוני הלידות בישראל, `israel`: דוח משרד הבריאות) ואת מחשבון הברית ופדיון הבן (`/pregnancy/brit-mila`, `britDates()`: לידה סמוך לשקיעה, קיסרי, בכור, כהן או לוי, ושעת שקיעה לפי עיר, `sunsetLocal()`), ושם אותו קוד מראה "השבוע שלכם" לפי התאריך שנשמר במכשיר. בתוצאה של המחשבון יש גם "השלב שלכם בשמות" (ארבעת השלבים מ-`stages`, החגים בשבועות 37–41 והשמות השמורים במכשיר), קובץ יומן (`ics()`, אירוע לכל שבוע ולכל בדיקה) וכרטיס שיתוף (canvas, PNG), ושניהם נוצרים במכשיר בלי לשלוח דבר. ה-CSS של המדריכים ועמודי ההריון נמצא ב-`doc_css` ב-`tools/build_site.py`, נכס נפרד (`doc.<hash>.css`) שנטען רק בעמודים בלי האפליקציה, כך ששינוי בו לא נוגע בעמודי השמות. הבנייה ב-`tools/pregnancy.py`, והבדיקות ב-`tests/pregnancy*.test.mjs`, `tests/test_build.py` ו-`tests/e2e/`.
- `app/fullname-core.mjs` + `app/fullname.mjs` + `tools/fullname.py` – בדיקת השם המלא (`/tools/full-name`): השם עם שם המשפחה בעברית ובאנגלית, ברשימת הכיתה, בשורה של הדרכון, ראשי תיבות, איך השמות נשמעים יחד, כמה ילדים בשם יש בכיתה ושמות שמתאימים לשם המשפחה. הכללים ב-`fullname-core.mjs`, והם משותפים לאתר (`build_bundle.py` מצרף אותו לחבילה בלי `export`) ולעמוד הכלי. הכתיבים באנגלית של כל שם (`enq`, `env` ב-`seo.json`) מחושבים בקוד האתר עצמו ומוצגים בעמוד השם הסטטי ובשאלות הנפוצות שלו. שם המשפחה נשמר רק במכשיר. הבדיקות ב-`tests/fullname.test.mjs`, `tests/test_fullname.py` ו-`tests/e2e/fullname.e2e.mjs`.
- `data/pa.json` – רשימות 10 המובילים של רשות האוכלוסין (מקור לקובץ `app/p0d_pa.js`).
- `assets/` – תמונת השיתוף `og.png` והפונטים.
- `tools/` – סקריפטי הבנייה.

## בנייה (פעם ראשונה)
```
cd source
npm install                      # chart.js, supabase-js, playwright
npx playwright install chromium  # פעם אחת, בשביל export_seo
```

## בנייה מלאה
```
cd source
python3 tools/make_data.py       # רק אם ה-CSV השתנה (צריך pandas)
npm run build                    # bundle -> seo.json -> src/
```
אחר כך `git add -A && git commit && git push`, ו-Vercel מפרסם לבד.

- `npm run bundle` – מחבר את הקוד ל-`dist/` (כולל `dist/names.html`, גרסת התצוגה בקובץ אחד).
- `npm run seo` – מחשב מחדש את `data/seo.json`.
- `npm run site` – בודק את `data/meanings.json` (`tools/meanings.py`; שגיאה עוצרת את הבנייה) ובונה את `src/` (כל עמודי השמות, האינדקס, 404 והנכסים עם hash). בסוף הוא מריץ את `tools/check_site.py`, שבודק את `src/` שנבנה: קישורים פנימיים שבורים, title ו-description, H1 אחד, canonical, JSON-LD תקין, התאמה בין העמודים ל-sitemap, ושהאפליקציה לא נטענת בעמוד שהיא תשתלט עליו. בעיה עוצרת את הבנייה.
- `npm test` – בדיקות Node ב-`tests/` (שלב ה-build של Vercel, `scripts/finalize.mjs`), בדיקות הבנייה ב-Python (`tests/test_build.py`) ו-`check_site.py`.
- `npm run e2e` – בדיקות דפדפן (Playwright) לעמודי ההריון, מול `src/` עם ה-headers וה-CSP של `vercel.json`. מקומית אפשר להגדיר `CHROMIUM_PATH` ל-Chromium קיים.
- כל הבדיקות האלה רצות ב-GitHub Actions על כל PR (`.github/workflows/checks.yml`).

## הוספת פירושים
עורכים את `data/meanings.json` ומריצים `npm run bundle && npm run site`. אין צורך להריץ מחדש את `npm run seo`: העמודים הסטטיים קוראים את הפירושים ישירות מהקובץ.

## מסד הנתונים (בחירת שם בזוג)
המיגרציות ב-`../supabase/migrations`. הרצה מהטרמינל:
```
SUPABASE_ACCESS_TOKEN=sbp_... node ../scripts/db-setup.mjs
```
(מפתח גישה נוצר ב-supabase.com/dashboard/account/tokens. כדאי למחוק אותו אחרי השימוש.)
