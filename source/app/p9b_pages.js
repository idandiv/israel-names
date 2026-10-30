/* =========================================================
   Info pages: about / privacy / terms (content in data/pages.json -> PAGES).
   Real URLs on the site (/about, /privacy, /terms, also prebuilt as static pages for crawlers),
   #about etc. in the single-file preview. Shown as a full-screen page over the app;
   the back button or Escape returns to where you were (or to the home page).
   ========================================================= */
const DOCS=['about','privacy','terms','accessibility'];
const docHref=k=>SITE.routing==='path'?'/'+k:'#'+k;
function docFromURL(){
  if(SITE.routing==='path'){const m=/^\/(about|privacy|terms|accessibility)(?:\.html)?\/?$/.exec(location.pathname);return m?m[1]:null}
  const h=(location.hash||'').slice(1);return DOCS.includes(h)?h:null}
let DOC=null,DOC_PUSHED=false,DOC_PREV_TITLE='';
function openDoc(k,push){const P=PAGES[k];if(!P)return;
  let el=$('#docpage');if(!el){el=document.createElement('div');el.id='docpage';el.className='docpage';document.body.appendChild(el)}
  if(!DOC)DOC_PREV_TITLE=document.title;DOC=k;
  if(push){try{history.pushState({doc:k},'',docHref(k));DOC_PUSHED=true}catch(e){}}
  el.innerHTML=`<div class="docin" dir="rtl" lang="he">
    <div class="doctop"><button class="docback" id="docback">${icon('back')}<span>חזרה לדף הבית</span></button><span class="docbrand">השמות של ישראל</span></div>
    <article class="docbody"><h1>${P.title}</h1>${P.html}</article>
    <nav class="docnav">${DOCS.map(d=>`<a href="${docHref(d)}" data-doc="${d}" ${d===k?'aria-current="page"':''}>${PAGES[d].title}</a>`).join('')}</nav>
    <p class="docfoot">נוצר ע״י <a href="https://www.linkedin.com/in/idan-diva/" target="_blank" rel="noopener">עידן דיוה</a></p></div>`;
  el.hidden=false;el.scrollTop=0;document.body.classList.add('docopen');
  document.title=`${P.title} | השמות של ישראל`;metaTag('meta[name="description"]','name','description',P.desc);
  if(SITE.base&&SITE.routing==='path')metaTag('link[rel="canonical"]','rel','canonical',SITE.base+'/'+k);
  $('#docback').onclick=closeDoc;
  const wb=el.querySelector('[data-wipe]');if(wb){wb.innerHTML=`<button class="copybtn danger" id="docwipe">${cloudOn()?'מחיקת כל הנתונים שלי (במכשיר ובשרת)':'מחיקת כל הנתונים השמורים במכשיר'}</button>`;wipeBtn($('#docwipe'))}
  setTimeout(()=>{const b=$('#docback');if(b)b.focus({preventScroll:true})},30)}
function hideDoc(){const el=$('#docpage');if(el){el.hidden=true;el.innerHTML=''}DOC=null;DOC_PUSHED=false;document.body.classList.remove('docopen');
  if(DOC_PREV_TITLE)document.title=DOC_PREV_TITLE;setMeta()}
/* back: return to the previous screen if we came from inside the site, otherwise to the home page */
function closeDoc(){if(!DOC)return;if(DOC_PUSHED){history.back();return}
  hideDoc();try{history.replaceState(null,'',HREF('home'))}catch(e){}PUSH_ONCE=false;setTab('home');window.scrollTo(0,0)}
addEventListener('popstate',()=>{const k=docFromURL();if(k)openDoc(k,false);else if(DOC)hideDoc()});
if(SITE.routing!=='path')addEventListener('hashchange',()=>{const k=docFromURL();if(k&&k!==DOC)openDoc(k,false)});
document.addEventListener('keydown',e=>{if(e.key!=='Escape'||!DOC)return;const m=$('#modal');if(m&&!m.hidden)return;e.preventDefault();closeDoc()});
/* links to the pages anywhere in the app (footer, inside the pages) open them in place */
document.addEventListener('click',e=>{const a=e.target.closest&&e.target.closest('a[data-doc]');if(!a||e.metaKey||e.ctrlKey||e.shiftKey||e.button)return;
  e.preventDefault();const k=a.dataset.doc;if(k===DOC)return;if(DOC){try{history.replaceState({doc:k},'',docHref(k))}catch(e){}openDoc(k,false)}else openDoc(k,true)});
/* a direct visit to /about etc.: open after the app has booted (boot rewrites the URL to the home tab) */
{const k0=docFromURL();if(k0)setTimeout(()=>{try{history.replaceState(null,'',docHref(k0))}catch(e){}openDoc(k0,false)},0)}
/* name collections (/names/boys etc.) are plain static pages, so these are ordinary links; the preview build has no such pages */
const COLLS=[['boys','שמות לבנים'],['girls','שמות לבנות'],['unisex','שמות יוניסקס'],['popular','השמות הנפוצים בישראל']];
/* every collection page, grouped for the home page card (COLLS + HUBS in tools/build_site.py, keep them in sync).
   The pages are Hebrew, so the links stay in Hebrew in the English version too */
const COLL_GROUPS=[
  [['הכי נפוצים','Most popular'],[['boys','שמות לבנים'],['girls','שמות לבנות'],['unisex','יוניסקס'],['popular','הנפוצים בישראל'],['','כל השמות א–ת']]],
  [['מגמות','Trends'],[['rising','שמות בעלייה'],['comeback','שמות ישנים שחוזרים']]],
  [['לפי מקור','By origin'],[['biblical-boys','מקראיים לבנים'],['biblical-girls','מקראיים לבנות'],['hebrew-boys','עבריים לבנים'],['hebrew-girls','עבריים לבנות']]],
  [['קצרים ונדירים','Short and rare'],[['short-boys','קצרים לבנים'],['short-girls','קצרים לבנות'],['rare-boys','נדירים לבנים'],['rare-girls','נדירים לבנות']]],
  [['לפי עשור','By decade'],[['1960s','שנות ה-60'],['1980s','שנות ה-80'],['2000s','שנות ה-2000']]]];
/* plain links to the static collection pages; the preview build (hash routing) has no such pages, so no card there */
function collsHomeHTML(){if(SITE.routing!=='path')return'';
  return `<nav class="card homecolls" aria-label="${t('אוספי שמות','Name collections')}"><h3>${t('אוספי שמות','Name collections')}</h3><p class="sub">${t('רשימות מוכנות לפי נושא, עם פירוש לכל שם','Ready-made lists by topic, in Hebrew')}</p>
    <div class="cgs">${COLL_GROUPS.map(([[he,en],items])=>`<div class="cg"><span class="cgl">${t(he,en)}</span><div class="chips">${items.map(([k,v])=>`<a class="nlink" href="/names${k?'/'+k:''}">${v}</a>`).join('')}</div></div>`).join('')}</div></nav>`}
function docLinksHTML(){return `<nav class="doclinks">${DOCS.map(d=>`<a href="${docHref(d)}" data-doc="${d}">${PAGES[d].title}</a>`).join('<span aria-hidden="true">·</span>')}</nav>`
  +(SITE.routing==='path'?`<nav class="doclinks" aria-label="אוספי שמות">${COLLS.map(([k,v])=>`<a href="/names/${k}">${v}</a>`).join('<span aria-hidden="true">·</span>')}</nav>`:'')}
