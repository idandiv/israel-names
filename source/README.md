# קוד המקור של "השמות של ישראל"

כאן נמצא כל מה שצריך כדי לבנות את האתר מחדש. התוצאה הנבנית (`src/` בתיקייה הראשית) היא מה ש-Vercel מפרסם.

## מבנה
- `app/` – קוד האתר: קובצי JavaScript (מחוברים לפי הסדר שב-`tools/build_bundle.py`) וקובצי CSS.
- `data/babynamesIL.csv` – הנתונים הגולמיים של הלמ״ס (מחבילת babynamesIL).
- `data/data.b64` – הנתונים בפורמט הדחוס שהאתר טוען (נוצר מה-CSV).
- `data/seo.json` – עובדות לכל שם עבור העמודים הסטטיים (נוצר מהקוד של האתר עצמו, כך שהמספרים זהים).
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
- `npm run site` – בונה את `src/` (כל עמודי השמות, האינדקס, 404 והנכסים עם hash).

## מסד הנתונים (בחירת שם בזוג)
המיגרציות ב-`../supabase/migrations`. הרצה מהטרמינל:
```
SUPABASE_ACCESS_TOKEN=sbp_... node ../scripts/db-setup.mjs
```
(מפתח גישה נוצר ב-supabase.com/dashboard/account/tokens. כדאי למחוק אותו אחרי השימוש.)
