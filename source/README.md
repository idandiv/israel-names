# קוד המקור של "השמות של ישראל"

כאן נמצא כל מה שצריך כדי לבנות את האתר מחדש. התוצאה הנבנית (`src/` בתיקייה הראשית) היא מה ש-Vercel מפרסם.

## מבנה
- `app/` – קוד האתר: קובצי JavaScript (מחוברים לפי הסדר שב-`tools/build_bundle.py`) וקובצי CSS.
- `data/babynamesIL.csv` – הנתונים הגולמיים של הלמ״ס (מחבילת babynamesIL).
- `data/data.b64` – הנתונים בפורמט הדחוס שהאתר טוען (נוצר מה-CSV).
- `data/seo.json` – עובדות לכל שם עבור העמודים הסטטיים (נוצר מהקוד של האתר עצמו, כך שהמספרים זהים).
- `data/meanings.json` – הפירושים והסיפורים של השמות, שורה לכל שם. המקור היחיד לתוכן הזה: האתר מקבל אותו כנכס נפרד (`assets/meanings.<hash>.js`), והעמודים הסטטיים קוראים אותו ישירות. השדות והכללים מתועדים ב-`tools/meanings.py`. נכנסים לקובץ רק פירושים שנבדקו ואושרו.
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
- `npm test` – בדיקות Node ב-`tests/` (שלב ה-build של Vercel, `scripts/finalize.mjs`) ו-`check_site.py`. אותן בדיקות רצות ב-GitHub Actions על כל PR (`.github/workflows/checks.yml`).

## הוספת פירושים
עורכים את `data/meanings.json` ומריצים `npm run bundle && npm run site`. אין צורך להריץ מחדש את `npm run seo`: העמודים הסטטיים קוראים את הפירושים ישירות מהקובץ.

## מסד הנתונים (בחירת שם בזוג)
המיגרציות ב-`../supabase/migrations`. הרצה מהטרמינל:
```
SUPABASE_ACCESS_TOKEN=sbp_... node ../scripts/db-setup.mjs
```
(מפתח גישה נוצר ב-supabase.com/dashboard/account/tokens. כדאי למחוק אותו אחרי השימוש.)
