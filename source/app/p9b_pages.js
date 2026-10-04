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
function docLinksHTML(){return `<nav class="doclinks">${DOCS.map(d=>`<a href="${docHref(d)}" data-doc="${d}">${PAGES[d].title}</a>`).join('<span aria-hidden="true">·</span>')}</nav>`}
