# השמות של ישראל – גרסת פריסה ל-Vercel

## העלאה ראשונה (בלי קוד)
1. מעלים את התיקייה הזו לריפו חדש ב-GitHub. אפשר גם להריץ `npx vercel` מתוך התיקייה.
2. ב-Vercel: Add New → Project → בוחרים את הריפו → Deploy. אין צורך לשנות הגדרות, הכול מוגדר ב-`vercel.json`.
3. אחרי כמה שניות האתר עולה בכתובת `xxx.vercel.app`.

## כתובת האתר (בלי שום Hardcoding)
- בדפדפן, כל קישורי השיתוף (תיק שם, רשימת שמורים, חדר זוגי, משחק) נבנים מהכתובת שהאתר רץ עליה כרגע (`window.location.origin`).
- אם מגדירים ב-Vercel את משתנה הסביבה `NEXT_PUBLIC_BASE_URL` (למשל `https://shemot.co.il`), הוא גובר על הכול, גם בקישורי השיתוף.
- ל-SEO (canonical, sitemap.xml, og:image) נלקחת הכתובת לפי הסדר: `NEXT_PUBLIC_BASE_URL`, ואם הוא לא מוגדר, דומיין הפרודקשן ש-Vercel מגדיר אוטומטית (`VERCEL_PROJECT_PRODUCTION_URL`).
- מעבר לדומיין פרטי: מוסיפים את הדומיין ב-Vercel → Settings → Domains, מגדירים `NEXT_PUBLIC_BASE_URL` ועושים Redeploy. זה הכול.

## מה יש בפנים
- `src/` – האתר המוכן: `index.html`, עמוד סטטי לכל שם ב-`names/<שם>.html` (נפתח בכתובת `/names/<שם>`), אינדקס כל השמות ב-`/names`, דף 404 ותמונת שיתוף `og.png`.
- `src/assets/` – הקוד, הנתונים, הגרפים והפונטים. הכול מאוחסן אצלכם, בלי תלות בשרתים חיצוניים. שמות הקבצים כוללים hash, ולכן נשמרים בקאש לשנה.
- `scripts/finalize.mjs` – שלב ה-build ב-Vercel: מעתיק את `src` ל-`public`, ממלא את כתובת האתר וכותב `sitemap.xml` ו-`robots.txt`.

## אחרי שהאתר באוויר
- Google Search Console: מוסיפים את הדומיין ושולחים את `/sitemap.xml`.
- כדאי לבדוק עמוד שם אחד ב-[Rich Results Test](https://search.google.com/test/rich-results) ובתצוגה מקדימה של וואטסאפ.

## בחירת שם בזוג בזמן אמת (Supabase)
- כל מבקר מקבל משתמש אנונימי אוטומטית (בלי מייל). חדר נפתח ב-RPC `create_room`, הצטרפות ב-`join_room` (עד 4 מכשירים לחדר).
- כל החלקה נשמרת בטבלה `swipes`, ובן/בת הזוג מקבלים אותה מיד דרך Realtime (WebSocket). התאמה קופצת לשני המסכים.
- הרשאות: RLS פעיל על כל הטבלאות. רק חברי החדר רואים אותו, וכל אחד כותב רק את ההחלקות שלו.
- אם ה-WebSocket חסום ברשת מסוימת, האתר עובר אוטומטית לבדיקה כל 3 שניות. אם Supabase לא זמין בכלל, החדר עובד במצב הקישורים הישן.
- הגדרות: `supabase.config.json` (כתובת ומפתח publishable, ציבוריים מטבעם). אפשר לדרוס ב-Vercel עם `NEXT_PUBLIC_SUPABASE_URL` ו-`NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- הקמת/עדכון מסד הנתונים מהטרמינל: `SUPABASE_ACCESS_TOKEN=sbp_... node scripts/db-setup.mjs` (מריץ את `supabase/migrations` ומפעיל כניסה אנונימית).
