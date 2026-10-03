/* =========================================================
   Site config + URL routing. No URL is hard-coded here: the build injects
   window.SITE_CONFIG = {baseUrl, routing}. On a real host baseUrl may be empty,
   and then the current origin is used, so links follow whatever domain serves the site.
   routing 'path'  -> /names/<name>  (real hosting, crawlable)
   routing 'hash'  -> #name=<name>   (single-file preview where paths are not ours)
   ========================================================= */
const SITE=(()=>{const c=window.SITE_CONFIG||{};let base=String(c.baseUrl||'').trim();
  if(!base||/^__/.test(base))base=location.origin&&location.origin!=='null'?location.origin:'';
  base=base.replace(/\/+$/,'');const routing=c.routing==='hash'?'hash':'path';
  return{base,routing,root:routing==='path'?base+'/':base}})();
const SHARE_URL=SITE.root;
const HREF=h=>(SITE.routing==='path'?'/':'')+'#'+h;
function nameURL(i){const n=encodeURIComponent(NAMES[i]);return SITE.routing==='path'?`${SITE.base}/names/${n}`:`${SITE.base}#name=${n}`}
function nameFromURL(){let n=null;
  try{const m=/^\/names\/([^/?#]+)\/?$/.exec(location.pathname);if(m)n=decodeURIComponent(m[1]).replace(/\.html$/,'')}catch(e){}
  if(n==null){try{n=new URLSearchParams(location.search).get('name')}catch(e){}}
  if(n==null){const m=/^#name=(.+)$/.exec(location.hash||'');if(m){try{n=decodeURIComponent(m[1])}catch(e){n=m[1]}}}
  if(n==null)return null;n=n.trim();return IDX.has(n)?IDX.get(n):null}
/* the URL that matches what is on screen */
function currentURL(){
  if(TAB==='names'&&NSUB==='file')return SITE.routing==='path'?`/names/${encodeURIComponent(NAMES[CUR])}`:`#name=${encodeURIComponent(NAMES[CUR])}`;
  const h=TAB==='names'?NSUB:TAB;return SITE.routing==='path'?`/#${h}`:`#${h}`}
function syncURL(){if(TAB==='match')return;const u=currentURL();
  try{const now=SITE.routing==='path'?location.pathname+location.hash:location.hash;
    if(now!==u&&decodeURI(now)!==decodeURI(u)){if(PUSH_ONCE)history.pushState(null,'',u);else history.replaceState(null,'',u)}}catch(e){}
  PUSH_ONCE=false;setMeta()}
let PUSH_ONCE=false;
/* <title>, description, canonical and Open Graph follow the screen */
function metaTag(sel,attr,key,val){let m=document.head.querySelector(sel);if(!m){m=document.createElement(sel.startsWith('link')?'link':'meta');m.setAttribute(attr,key);document.head.appendChild(m)}m.setAttribute(sel.startsWith('link')?'href':'content',val)}
function nameMeta(i){const nm=NAMES[i];
  return{title:t(`השם ${nm} – משמעות, מקור וסטטיסטיקה | השמות של ישראל`,`The name ${NM(i)} (${nm}) – meaning, origin and statistics | Names of Israel`),desc:peakDesc(i)}}
const SITE_TITLE=()=>t('השמות של ישראל – כל שמות התינוקות בישראל מאז 1949','Names of Israel – every baby name in Israel since 1949');
const SITE_DESC=()=>t('מה הסיפור מאחורי השם שלך? משמעות, מקור, שנת שיא וגרפים לכל שם שניתן בישראל מאז 1949, מחולל שמות לתינוק ומשחקים. לפי נתוני הלמ״ס.','The story behind every baby name given in Israel since 1949: meaning, peak year, charts, a name finder and games. CBS data.');
function setMeta(){const onName=TAB==='names'&&NSUB==='file';const m=onName?nameMeta(CUR):{title:SITE_TITLE(),desc:SITE_DESC()};
  document.title=m.title;metaTag('meta[name="description"]','name','description',m.desc);
  metaTag('meta[property="og:title"]','property','og:title',m.title);metaTag('meta[property="og:description"]','property','og:description',m.desc);
  if(SITE.base&&SITE.routing==='path'){const u=onName?nameURL(CUR):SITE.root;metaTag('link[rel="canonical"]','rel','canonical',u);metaTag('meta[property="og:url"]','property','og:url',u)}}
addEventListener('popstate',()=>{const h=(location.hash||'').slice(1);
  if(/^(match|saved\.|compare=)/.test(h))return;                 /* handled by their own hashchange listeners */
  const i=nameFromURL();if(i!=null){CUR=i;store.set('name',NAMES[i]);if(TAB!=='names'||NSUB!=='file')setTab('names','file');else{renderNames();setMeta()}return}
  const k=h||'home';if(TABS.includes(k)&&k!=='match'){if(k!==TAB)setTab(k)}else if(LEGACY[k])setTab(k);else setTab('home');
  window.scrollTo(0,0)});
/* share the page of one name: native share sheet on phones, copy elsewhere */
function shareName(i){const url=nameURL(i);const title=nameMeta(i).title;
  if(navigator.share&&matchMedia('(pointer:coarse)').matches){navigator.share({title,text:t(`הסיפור של השם ${NAMES[i]}`,`The story of the name ${NM(i)}`),url}).catch(()=>{});return}
  copy(url)}
