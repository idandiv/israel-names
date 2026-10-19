"""Temporary page /design-preview: the current colors next to three calmer palettes, on the site's real fonts.
Built only for the redesign preview (noindex, not in the sitemap). Delete this file and its call in build_site.py before merging.
"""

IC = {
    'home': '<path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z"/>',
    'search': '<path d="M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14zm9 16-4.3-4.3"/>',
    'names': '<path d="M4 6h16M4 12h10M4 18h7"/><circle cx="18" cy="16" r="3"/><path d="m20.2 18.2 1.8 1.8"/>',
    'gen': '<path d="M5 19 19 5M14 4l1 2 2 1-2 1-1 2-1-2-2-1 2-1zM6 8l.7 1.3L8 10l-1.3.7L6 12l-.7-1.3L4 10l1.3-.7zM17 15l.7 1.3 1.3.7-1.3.7L17 19l-.7-1.3L15 17l1.3-.7z"/>',
    'save': '<path d="M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1z"/>',
    'arrow': '<path d="M15 6l-6 6 6 6"/>',
    'dice': '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M9 9h.01M15 15h.01M15 9h.01M9 15h.01"/>',
}


def ic(k):
    return (f'<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" '
            f'stroke-linecap="round" stroke-linejoin="round">{IC[k]}</svg>')


# accent / text on accent / soft accent background; contrast ratios computed against --bg #101119 and --surface #1a1c28
PALETTES = [
    ('now', 'עכשיו באתר', 'המצב הנוכחי, לשם השוואה',
     'סגול בהיר עם ורוד, כרטיסים בגרדיאנט סגול→ורוד והילה סביב החיפוש.',
     ('#a49dff', '#14122e', '#2c2958'), ('7.9', '7.1', '7.7'),
     'מה שעושה את זה "AI": שני צבעי מבטא ושני גרדיאנטים שמתחרים בחיפוש.'),
    ('a', 'אפשרות A', 'סגול רגוע',
     'אותו סגול של המותג, טיפה עמוק ושקט יותר. צבע מבטא אחד, בלי ורוד ובלי גרדיאנט.',
     ('#9d99ed', '#141327', '#2b294b'), ('7.4', '6.6', '7.1'),
     'הכי קרוב לזהות של היום. מי שמכיר את האתר ירגיש בבית.'),
    ('b', 'אפשרות B', 'כחול דיו',
     'כחול קר ומקצועי, בתחושה של עיתון או מאגר נתונים רציני.',
     ('#74a7e8', '#091628', '#182e4b'), ('7.6', '6.8', '7.3'),
     'שימו לב: קרוב לכחול שמסמן "בנים" בגרפים. נצטרך לשנות את צבע הבנים.'),
    ('c', 'אפשרות C', 'ירוק מרווה',
     'ירוק-זית רך ועמום. טבעי, חם בלי להיות מתקתק, ולא דומה לאף אתר AI.',
     ('#96be8e', '#0c1a08', '#1c3517'), ('9.0', '8.1', '8.6'),
     'שימו לב: קרוב לירוק של "בעלייה". נצטרך לסמן מגמה גם בחץ (וזה בכל מקרה בתוכנית).'),
]


def column(key, kick, name, desc, colors, ratios, note):
    acc, on, soft = colors
    swatches = ''.join(f'<li><i style="background:{c}"></i><span>{lbl}</span><code>{c}</code></li>'
                       for c, lbl in zip(colors, ('מבטא', 'טקסט על מבטא', 'רקע רך')))
    ratio_rows = ''.join(f'<li><span>{lbl}</span><b>{r}:1</b></li>'
                         for r, lbl in zip(ratios, ('מבטא על הרקע', 'מבטא על כרטיס', 'טקסט על כפתור')))
    return f'''<section class="pv pv-{key}" id="{key}" aria-labelledby="h-{key}" style="--acc:{acc};--on:{on};--soft:{soft}">
<header class="pvh"><span class="pvk">{kick}</span><h2 id="h-{key}">{name}</h2><p>{desc}</p>
<ul class="sw">{swatches}</ul></header>
<div class="mock" aria-label="דוגמה: {name}">
 <div class="mbar"><span class="mlogo">השמות של ישראל</span>
  <nav class="mnav" aria-label="ניווט לדוגמה"><span class="on">{ic('home')}ראשי</span><span>{ic('names')}שמות</span><span class="hl">{ic('gen')}<em>מחולל</em></span></nav></div>
 <div class="mland"><span class="mkick">9 מיליון תינוקות · 5,706 שמות</span>
  <h3>מה הסיפור מאחורי השם שלך?</h3>
  <p>כמה ישראלים נקראים כמוך, מתי השם היה בשיא, ומה הפירוש שלו.</p>
  <label class="msearch">{ic('search')}<input type="search" placeholder="הקלידו שם..." aria-label="חיפוש שם לדוגמה"></label>
  <div class="mchips"><button type="button" aria-pressed="true">אביגיל</button><button type="button">איילה</button><button type="button">דוד</button><button type="button" class="ghost">{ic('dice')}שם אקראי</button></div>
 </div>
 <a class="mcta" href="#{key}"><span class="gl">{ic('gen')}</span><span class="tx"><b>מחפשים שם לתינוק?</b><span>לפי משמעות, אופי ומגמה, עם רשימת מועדפים לשיתוף.</span></span><span class="go">למחולל {ic('arrow')}</span></a>
 <div class="mcard"><button type="button" class="sv" aria-label="שמירה">{ic('save')}</button>
  <span class="nm">אביגיל</span><small>שם מקראי: "אבי גיל", שמחת אבי.</small>
  <span class="tags"><span class="tg up">↑ בעלייה</span><span class="tg">קלאסיקה</span></span>
  <span class="ft"><span>1,437 ב-2024</span><svg viewBox="0 0 80 20" aria-hidden="true"><path d="M1 17 L12 16 L22 15 L32 13 L42 13 L52 9 L62 8 L72 5 L79 3" fill="none" stroke="currentColor" stroke-width="1.6"/></svg></span></div>
 <div class="mpills"><span class="p g">שם לבנות</span><span class="p c1">ניקוד: נוֹעָה</span><span class="p c3">עלייה: 656 תינוקות</span><span class="p c4">נפוץ יותר מ-99%</span><span class="p st">דור ה-Z</span></div>
 <div class="mbtns"><button type="button" class="pri">שמירת השם</button><button type="button" class="sec">השוואה</button><a href="#{key}">כל השמות לבנות</a></div>
</div>
<p class="pnote">{note}</p>
<ul class="ratios" aria-label="ניגודיות (מינימום נדרש 4.5:1)">{ratio_rows}</ul>
</section>'''


CSS = '''<style>
body::before{display:none!important}
.dp{max-width:1440px;margin:0 auto;padding:32px 16px 64px;color:var(--ink);font-family:var(--f-body);font-size:15px;line-height:1.55}
.dp .intro{max-width:720px;margin:0 0 24px}
.dp .intro .k{color:var(--muted);font-size:13px;margin:0}
.dp .intro h1{font-family:var(--f-display);font-weight:700;font-size:56px;line-height:1;margin:8px 0 12px}
.dp .intro p{color:var(--ink-2);margin:0 0 8px}
.dp .intro ul{color:var(--ink-2);margin:8px 0 0;padding-inline-start:20px}
.dp .jump{position:sticky;top:0;z-index:5;display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;padding:12px 0;margin-bottom:16px;background:var(--bg);border-bottom:1px solid var(--line)}
.dp .jump a{color:var(--ink);text-decoration:none;border:1px solid var(--line);border-radius:999px;padding:4px 12px;font-size:14px;font-weight:600;white-space:nowrap;flex:none}
.dp .jump a:hover{border-color:var(--muted)}
.dp .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(296px,1fr));gap:24px;align-items:start}
.dp .pv{scroll-margin-top:72px;min-width:0}
.dp .pvh{margin-bottom:16px;min-height:200px}
.dp .pvk{font-size:12px;font-weight:700;letter-spacing:.04em;color:var(--muted)}
.dp .pvh h2{font-family:var(--f-display);font-weight:700;font-size:40px;line-height:1;margin:4px 0 8px}
.dp .pvh p{color:var(--ink-2);font-size:14px;margin:0 0 12px}
.dp .sw{list-style:none;padding:0;margin:0;display:grid;gap:4px}
.dp .sw li{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--ink-2)}
.dp .sw i{width:16px;height:16px;border-radius:4px;border:1px solid var(--line);flex:none}
.dp .sw code{margin-inline-start:auto;color:var(--muted);font-size:12px;direction:ltr}
.dp .pnote{font-size:13px;color:var(--ink-2);margin:12px 0 8px;min-height:40px}
.dp .ratios{list-style:none;padding:0;margin:0;display:grid;gap:4px;font-size:13px;color:var(--muted)}
.dp .ratios li{display:flex;justify-content:space-between;border-top:1px solid var(--line);padding-top:4px}
.dp .ratios b{color:var(--ink);font-weight:600;direction:ltr}
.dp .ic{width:18px;height:18px;flex:none}
.dp button{font:inherit}

/* --- the mock: shared new direction (flat, one accent, one border style) --- */
.mock{border:1px solid var(--line);border-radius:16px;background:var(--bg);overflow:hidden;padding:0 12px 16px}
.mbar{display:flex;flex-direction:column;gap:8px;padding:12px 0 0;border-bottom:1px solid var(--line);margin:0 -12px;padding-inline:12px;background:var(--bg)}
.mlogo{font-family:var(--f-display);font-weight:700;font-size:28px;line-height:1;color:var(--acc)}
.mnav{display:flex;gap:16px;font-size:13px;font-weight:600;color:var(--ink-2)}
.mnav span{display:flex;align-items:center;gap:4px;padding:4px 0 8px;border-bottom:2px solid transparent}
.mnav .ic{width:16px;height:16px}
.mnav .on{color:var(--acc);border-color:var(--acc)}
.mnav em{font-style:normal}
.mland{margin-top:16px;padding:20px 16px;border-radius:16px;background:var(--surface);border:1px solid var(--line)}
.mkick{font-size:12px;font-weight:700;color:var(--muted)}
.mland h3{font-family:var(--f-display);font-weight:700;font-size:48px;line-height:.9;margin:8px 0 0;color:var(--ink)}
.mland p{font-size:14px;color:var(--ink-2);margin:8px 0 0}
.msearch{position:relative;display:flex;align-items:center;margin-top:16px}
.msearch .ic{position:absolute;inset-inline-start:12px;color:var(--muted)}
.msearch input{width:100%;font:600 16px var(--f-body);padding:12px 16px;padding-inline-start:40px;border-radius:12px;border:1px solid var(--line);background:var(--bg);color:var(--ink)}
.msearch input::placeholder{color:var(--muted)}
.msearch input:focus{outline:2px solid var(--acc);outline-offset:2px;border-color:var(--acc)}
.mchips{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.mchips button{border:1px solid var(--line);background:transparent;color:var(--ink-2);padding:4px 12px;border-radius:999px;font-size:13px;font-weight:500;display:flex;align-items:center;gap:4px;cursor:pointer;transition:border-color .15s ease,color .15s ease}
.mchips button:hover{border-color:var(--muted);color:var(--ink)}
.mchips button[aria-pressed="true"]{border-color:var(--acc);background:var(--soft);color:var(--ink);font-weight:600}
.mchips .ghost{border-style:dashed}
.mchips .ic{width:14px;height:14px}
.mcta{display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin-top:12px;padding:16px;border-radius:16px;background:var(--surface);border:1px solid var(--line);color:var(--ink);text-decoration:none;transition:border-color .15s ease}
.mcta:hover{border-color:var(--acc)}
.mcta:focus-visible{outline:2px solid var(--acc);outline-offset:2px}
.mcta .gl{width:40px;height:40px;border-radius:12px;background:var(--soft);color:var(--acc);display:grid;place-items:center;flex:none}
.mcta .tx{flex:1 1 160px;display:flex;flex-direction:column;gap:4px;min-width:0}
.mcta b{font-size:16px}
.mcta .tx span{font-size:13px;color:var(--ink-2)}
.mcta .go{display:flex;align-items:center;gap:4px;font-weight:700;font-size:14px;background:var(--acc);color:var(--on);padding:8px 12px;border-radius:999px;margin-inline-start:auto}
.mcta .go .ic{width:16px;height:16px}
.mcard{position:relative;margin-top:12px;padding:16px;border-radius:16px;background:var(--surface);border:1px solid var(--line);display:flex;flex-direction:column;gap:4px}
.mcard .nm{font-family:var(--f-display);font-weight:700;font-size:44px;line-height:.9}
.mcard small{font-size:13px;color:var(--ink-2)}
.mcard .sv{position:absolute;inset-inline-end:12px;top:12px;width:32px;height:32px;border-radius:8px;border:1px solid var(--line);background:transparent;color:var(--ink-2);display:grid;place-items:center;cursor:pointer}
.mcard .sv:hover{color:var(--acc);border-color:var(--acc)}
.mcard .tags{display:flex;gap:8px;margin-top:4px}
.tg{font-size:12px;font-weight:600;padding:2px 8px;border-radius:999px;background:var(--surface-2);color:var(--ink-2)}
.tg.up{color:var(--good)}
.mcard .ft{display:flex;justify-content:space-between;align-items:center;margin-top:8px;font-size:12px;color:var(--muted)}
.mcard .ft svg{width:80px;height:20px;color:var(--acc)}
.mpills{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.mpills .p{font-size:12px;font-weight:500;padding:2px 8px;border-radius:999px;border:1px solid var(--line);color:var(--ink-2)}
.mpills .p.g{color:var(--girl);border-color:color-mix(in srgb,var(--girl) 50%,var(--line))}
.mbtns{display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin-top:16px}
.mbtns button{border-radius:999px;padding:8px 16px;font-weight:700;font-size:14px;cursor:pointer;transition:background-color .15s ease,border-color .15s ease}
.mbtns .pri{background:var(--acc);color:var(--on);border:1px solid var(--acc)}
.mbtns .pri:hover{background:color-mix(in srgb,var(--acc) 88%,#fff)}
.mbtns .pri:active{transform:scale(.98)}
.mbtns .sec{background:transparent;color:var(--ink);border:1px solid var(--line)}
.mbtns .sec:hover{border-color:var(--muted)}
.mbtns a{color:var(--acc);font-size:14px;font-weight:600;text-underline-offset:3px}
.mock button:focus-visible{outline:2px solid var(--acc);outline-offset:2px}

/* --- "now": reproduce today's look for comparison --- */
.pv-now .mbar{background:color-mix(in srgb,var(--bg) 88%,transparent);backdrop-filter:blur(10px)}
.pv-now .mnav .hl em{background:linear-gradient(90deg,var(--acc),#ff7f9b);-webkit-background-clip:text;background-clip:text;color:transparent}
.pv-now .mland{border-radius:24px;background:radial-gradient(120% 100% at 100% 0%,color-mix(in srgb,var(--acc) 16%,var(--surface)),var(--surface) 60%)}
.pv-now .msearch .ic{color:var(--acc)}
.pv-now .msearch input{border:2px solid var(--acc);border-radius:18px;background:var(--surface);box-shadow:0 8px 30px color-mix(in srgb,var(--acc) 18%,transparent)}
.pv-now .mchips button{background:var(--surface)}
.pv-now .mchips button[aria-pressed="true"]{color:var(--acc);font-weight:700}
.pv-now .mcta{border:0;border-radius:20px;color:#fff;background:linear-gradient(110deg,#4637c9,#a83a66)}
.pv-now .mcta .gl{background:rgba(255,255,255,.18);color:#fff;border-radius:14px}
.pv-now .mcta .tx span{color:#fff;opacity:.92}
.pv-now .mcta .go{background:rgba(255,255,255,.2);color:#fff}
.pv-now .mcard{border-radius:18px}
.pv-now .tg{background:color-mix(in srgb,var(--acc) 22%,transparent);color:var(--acc)}
.pv-now .tg.up{background:color-mix(in srgb,var(--good) 18%,transparent);color:var(--good)}
.pv-now .mcard .ft svg{color:var(--good)}
.pv-now .mpills .p{border:0;font-weight:600}
.pv-now .mpills .g{background:color-mix(in srgb,var(--acc) 22%,transparent);color:var(--acc)}
.pv-now .mpills .c1{background:color-mix(in srgb,var(--c1) 20%,transparent);color:#7fb2f0}
.pv-now .mpills .c3{background:color-mix(in srgb,var(--c3) 20%,transparent);color:var(--good)}
.pv-now .mpills .c4{background:color-mix(in srgb,var(--c4) 22%,transparent);color:#e2b04a}
.pv-now .mpills .st{background:color-mix(in srgb,#ff7f9b 20%,transparent);color:#ff7f9b}
@media (max-width:640px){.dp .intro h1{font-size:44px}.dp .pvh{min-height:0}.dp .pnote{min-height:0}}
</style>'''


def body():
    cols = ''.join(column(*p) for p in PALETTES)
    jump = ''.join(f'<a href="#{p[0]}">{"עכשיו" if p[0] == "now" else p[0].upper() + " · " + p[2]}</a>' for p in PALETTES)
    return f'''{CSS}<main class="dp" dir="rtl">
<div class="intro"><p class="k">השמות של ישראל · תצוגה זמנית לבחירת עיצוב</p>
<h1>בחירת צבע</h1>
<p>אותם רכיבים אמיתיים (פס עליון, חיפוש, כרטיס מחולל, כרטיס שם, תגיות וכפתורים), באותם פונטים, בצבע הנוכחי ובשלוש אפשרויות חדשות.</p>
<p>בשלוש האפשרויות החדשות הכיוון זהה, ורק הצבע משתנה:</p>
<ul><li>צבע מבטא אחד, שטוח. בלי גרדיאנטים, בלי הילות זוהרות ובלי ורוד נוסף.</li>
<li>כרטיסים שקטים עם קו דק, והחיפוש הוא הדבר הבולט בעמוד.</li>
<li>תגיות ניטרליות. צבע רק כשיש לו משמעות (מגדר, מגמה).</li></ul>
<p>אפשר גם לשלב, למשל "A, אבל עם הכפתורים של C".</p></div>
<nav class="jump" aria-label="מעבר בין האפשרויות">{jump}</nav>
<div class="grid">{cols}</div>
</main>'''
