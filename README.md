# 👶 השמות של ישראל | ShemotIL

> מאגר שמות התינוקות של ישראל: תיק לכל שם לפי נתוני הלמ״ס מ-1949 עד 2024, ומשחק החלקות זוגי בזמן אמת למציאת השם המשותף.

🔗 **לאתר החי:** [www.shemotil.co.il](https://www.shemotil.co.il)

---

## ✨ פיצ'רים מרכזיים

- 📊 **תיק לכל שם (כ-5,700 שמות):** שכיחות לאורך השנים (1949–2024), שנת שיא, חלוקה בין בנות לבנים, משמעות, פרופיל אופי וגימטריה.
- 💕 **NameMatch, בוחרים שם ביחד:** כל אחד מבני הזוג מחליק שמות בנפרד, וההתאמות מופיעות מיד לשניהם (Supabase Realtime).
- 🚀 **עמודי אוספים ל-SEO:** [שמות לבנים](https://www.shemotil.co.il/names/boys), [שמות לבנות](https://www.shemotil.co.il/names/girls), [שמות יוניסקס](https://www.shemotil.co.il/names/unisex), [השמות הנפוצים בישראל](https://www.shemotil.co.il/names/popular), ואינדקס א״ב של [כל השמות](https://www.shemotil.co.il/names).
- 🧭 **כלים לבחירת שם:** מחולל שמות לפי העדפות, השוואה בין שמות, מגמות ומשחקים.
- ⚡ **סטטי ומהיר:** עמוד HTML מוכן לכל שם, שגם מנועי חיפוש קוראים בלי JavaScript. כל הנכסים (קוד, נתונים, פונטים) מאוחסנים באתר עצמו.

---

## 🛠️ טכנולוגיות

| שכבה | טכנולוגיה | תפקיד |
| :--- | :--- | :--- |
| אירוח | Vercel | אתר סטטי, כותרות אבטחה (CSP) וקאש לנכסים עם hash |
| זמן אמת | Supabase | חדרי NameMatch: RPC, Realtime (WebSocket) ו-RLS |
| בנייה | Python + Node.js | יצירת כל העמודים הסטטיים, ה-sitemap וה-robots.txt |
| מדידה ופרסום | Vercel Analytics, Google AdSense | סטטיסטיקות ביקור ואימות AdSense |

---

## 📂 מבנה הפרויקט

- `source/` – **קוד המקור**: קוד האפליקציה (`app/`), נתוני הלמ״ס (`data/`) וכלי הבנייה (`tools/`). הוראות מפורטות ב-[`source/README.md`](source/README.md).
- `src/` – **האתר הבנוי** (נוצר מ-`source/`): עמוד לכל שם ב-`names/<שם>.html`, עמודי האוספים, האינדקס, עמודי המידע והנכסים ב-`assets/`.
- `scripts/finalize.mjs` – שלב ה-build ב-Vercel: מעתיק את `src` ל-`public`, ממלא את כתובת האתר ואת הגדרות Supabase, וכותב `sitemap.xml`, `robots.txt`, `llms.txt` ו-`ads.txt`.
- `scripts/lastmod.json` – נוצר ב-`build_site.py`: לכל עמוד, התאריך שבו התוכן שלו השתנה לאחרונה (ה-`lastmod` ב-sitemap). נכנס לריפו יחד עם `src/`.
- `supabase/migrations/` – הטבלאות, פונקציות ה-RPC והרשאות ה-RLS של NameMatch.
- `vercel.json` – הגדרות הפריסה, כתובות נקיות וכותרות אבטחה.

> ⚠️ **לא עורכים את `src/` ידנית.** הוא נבנה מחדש מ-`source/` בכל בנייה, וכל שינוי ידני יימחק.

---

## 💻 פיתוח מקומי

התקנה (פעם אחת):

```bash
cd source
npm install
```

בנייה מחדש של `src/` אחרי שינוי בקוד (מתוך `source/`):

```bash
npm run bundle && npm run site
```

בנייה מלאה כמו ב-Vercel (מהתיקייה הראשית), שיוצרת את `public/`:

```bash
npm run build
```

בדיקה בדפדפן:

```bash
npx serve public
```

רק אם נתוני הלמ״ס השתנו: `python3 tools/make_data.py` (צריך pandas), ואז `npm run build` בתוך `source/`. השלב הזה מחשב מחדש את `seo.json` ודורש Playwright (`npx playwright install chromium`).

### שיטת העבודה
1. כל שינוי ב-branch משלו (`feat/...`, `fix/...`, `docs/...`) שנפתח מ-`main` עדכני.
2. בנייה ובדיקה מקומית (`npm test` בתוך `source/`). אותן בדיקות רצות אוטומטית על כל PR.
3. Pull Request ל-`main`. Vercel מעלה תצוגה מקדימה לכל PR.
4. מיזוג ל-`main` מעלה לפרודקשן. הענף `main` מוגן, ואי אפשר לדחוף אליו ישירות.

---

## 🌐 כתובת האתר ומשתני סביבה

- קישורי השיתוף בדפדפן נבנים מהכתובת שהאתר רץ עליה (`window.location.origin`), אלא אם הוגדר `NEXT_PUBLIC_BASE_URL`.
- ל-SEO (canonical, sitemap.xml, og:image) הכתובת נלקחת לפי הסדר:
  1. `NEXT_PUBLIC_BASE_URL`
  2. `VERCEL_PROJECT_PRODUCTION_URL` (מוגדר אוטומטית ב-Vercel)
  3. `VERCEL_URL`
- מעבר לדומיין: מוסיפים אותו ב-Vercel → Settings → Domains, מגדירים `NEXT_PUBLIC_BASE_URL` ועושים Redeploy.

| משתנה | שימוש |
| :--- | :--- |
| `NEXT_PUBLIC_BASE_URL` | כתובת האתר הקבועה |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | דורסים את `supabase.config.json` |
| `ADSENSE_PUBLISHER_ID` | כותב את `ads.txt` אם הקובץ בריפו ריק |
| `SUPABASE_ACCESS_TOKEN` | רק להרצת מיגרציות מהטרמינל, לא נשמר באתר |

דוגמה בקובץ `.env.example`. קובצי `.env` לא נכנסים לריפו.

---

## 💕 NameMatch ו-Supabase

- כל מבקר מקבל משתמש אנונימי אוטומטית, בלי מייל. חדר נפתח ב-RPC `create_room`, והצטרפות ב-`join_room` (עד 4 מכשירים לחדר).
- כל החלקה נשמרת בטבלה `swipes` ומגיעה לבן או לבת הזוג מיד דרך Realtime. התאמה מופיעה בשני המסכים.
- RLS פעיל על כל הטבלאות: רק חברי החדר רואים אותו, וכל אחד כותב רק את ההחלקות שלו.
- אם ה-WebSocket חסום, האתר עובר לבדיקה כל 3 שניות. אם Supabase לא זמין בכלל, החדר עובד במצב הקישורים.
- הגדרות: `supabase.config.json` (כתובת ומפתח publishable, ציבוריים מטבעם, וההגנה היא ב-RLS).
- הרצת המיגרציות והפעלת כניסה אנונימית:

```bash
SUPABASE_ACCESS_TOKEN=sbp_... node scripts/db-setup.mjs
```

---

## 🔎 אחרי שינויים באתר

- Google Search Console: לשלוח את `https://www.shemotil.co.il/sitemap.xml`.
- לבדוק עמוד ב-[Rich Results Test](https://search.google.com/test/rich-results) ובתצוגה המקדימה של וואטסאפ.

---

מקור הנתונים: הלשכה המרכזית לסטטיסטיקה, דרך חבילת babynamesIL. נוצר ע״י [עידן דיוה](https://www.linkedin.com/in/idan-diva/).
