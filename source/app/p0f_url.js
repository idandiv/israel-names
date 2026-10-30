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
  URL_MISS=null;if(n==null)return null;n=normQ(n);if(IDX.has(n))return IDX.get(n);URL_MISS=n.slice(0,40);return null}
let URL_MISS=null;
/* a link to a name that isn't in the data: say so, and offer the closest names */
function notFound(raw){const m=$('#modal');if(!m)return;const near=suggest(raw.slice(0,2),6);m.hidden=false;
  m.innerHTML=`<div class="mbox" role="dialog" aria-label="${t('השם לא נמצא','Name not found')}"><button class="mclose" id="mclose" aria-label="${t('סגירה','Close')}">${icon('close')}</button>
    <h3>${t(`לא מצאנו את השם "${esc(raw)}"`,`We couldn’t find "${esc(raw)}"`)}</h3>
    <p class="sub">${t(`המאגר כולל כל שם שניתן לפחות ל-5 תינוקות באותה שנה, מאז ${Y0}. ייתכן שהשם נדיר מדי, או שהוא כתוב אחרת.`,'The data includes every name given to at least 5 babies in a year since 1949. The name may be too rare, or spelled differently.')}</p>
    ${near.length?`<div class="nml">${t('אולי חיפשתם:','Maybe you meant:')}</div><div class="chips" id="nfchips">${near.map(j=>`<button data-i="${j}">${nmh(j)}</button>`).join('')}</div>`:''}</div>`;
  const close=()=>m.hidden=true;$('#mclose').onclick=close;m.onclick=e=>{if(e.target===m)close()};
  const ch=$('#nfchips');if(ch)ch.onclick=e=>{const b=e.target.closest('[data-i]');if(b)pick(+b.dataset.i)}}
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
/* Hebrew title, description and FAQ of a name: the same texts as the static pages
   (name_meta / name_faq in tools/build_site.py, from the same numbers as data/seo.json), keep them in sync */
function seoFacts(i){const st=stats(-1),c=comb(st,i);let tot=0;for(let y=0;y<NY;y++)tot+=c[y];tot=Math.round(tot);
  const pk=peakOf(st,i),gf=tot?st.tot[0][i]/tot:.5,x=gf>=.5?0:1;
  return{n:NAMES[i],tot,pk:Y0+pk,start:pk===0,oneIn:c[pk]?Math.round(st.DD[pk]/c[pk]):0,last:Math.round(c[NY-1]),rk:st.rank[x][i*NY+NY-1]||0,x,g:Math.round(gf*100),mean:MEAN.get(NAMES[i])||''}}
const endDot=s=>/[.!?]$/.test(s)?s:s+'.';
function fitDesc(parts,cap=155){let s=parts[0].length<=cap?parts[0]:parts[0].slice(0,cap-1).replace(/ [^ ]*$/,'')+'…';
  for(const p of parts.slice(1)){if(s.length+1+p.length>cap)break;s+=' '+p}return s}
function sexAnswer(n,g){const b=100-g;
  return g>=85?`${n} הוא שם של בנות: ${g}% מהתינוקות שנקראו כך הם בנות.`:g<=15?`${n} הוא שם של בנים: ${b}% מהתינוקות שנקראו כך הם בנים.`
    :g>=60?`${n} ניתן בעיקר לבנות: ${g}% בנות ו-${b}% בנים.`:g<=40?`${n} ניתן בעיקר לבנים: ${b}% בנים ו-${g}% בנות.`:`${n} הוא שם יוניסקס: ${g}% בנות ו-${b}% בנים.`}
/* first sentence of a name page when the origin is known, "נחשון הוא שם מקראי לבנים."
   (ORIGIN_KIND in tools/meanings.py, sex_kind in tools/build_site.py) */
const ORIGIN_KIND={'מקראי':'שם מקראי','עברי':'שם עברי','מקום בישראל':'שם עברי','חודש/חג':'שם עברי','ארמי':'שם ארמי','ערבי':'שם ערבי','יידיש':'שם ביידיש','אמהרי':'שם אמהרי','לועזי':'שם לועזי'};
function originLead(i){const n=NAMES[i],k=ORIGIN_KIND[ORIGIN.get(n)];if(!k)return'';const g=seoFacts(i).g;
  return `${n} הוא ${g>=85?`${k} לבנות`:g<=15?`${k} לבנים`:g>=60?`${k} שניתן בעיקר לבנות`:g<=40?`${k} שניתן בעיקר לבנים`:`${k} שניתן גם לבנות וגם לבנים`}.`}
function seoMeta(i){const x=seoFacts(i),n=x.n;
  const peak=x.start?`השם היה הכי נפוץ כבר בתחילת הרישום, ב-${Y0}.`:`שנת השיא: ${x.pk}, כשאחד מכל ${fmt(x.oneIn)} תינוקות נקרא כך.`;
  const rest=[`${fmt(x.tot)} תינוקות נקראו ${n} בישראל מאז ${Y0}.`,peak,`בנות ${x.g}% · בנים ${100-x.g}%.`,`גימטריה: ${gem(n)}.`];
  return x.mean?{title:`משמעות השם ${n} – מקור, פופולריות וגימטריה | השמות של ישראל`,desc:fitDesc([`משמעות השם ${n}: ${endDot(x.mean)}`,...rest])}
    :{title:`השם ${n} – פופולריות בישראל, סטטיסטיקה וגימטריה | השמות של ישראל`,desc:fitDesc(rest)}}
function seoFAQ(i){const x=seoFacts(i),n=x.n,q=x.mean?[[`מה המשמעות של השם ${n}?`,endDot(x.mean)]]:[];
  const last=x.last?`ב-${Y1} נקראו כך ${fmt(x.last)} תינוקות`+(x.rk?`, מקום ${x.rk} ${x.x===0?'בבנות':'בבנים'}.`:'.'):`ב-${Y1} השם לא ניתן, או שניתן לפחות מ-5 תינוקות.`;
  q.push([`כמה תינוקות נקראו ${n} בישראל?`,`מאז ${Y0} קיבלו את השם ${n} ${fmt(x.tot)} תינוקות בישראל. ${last}`]);
  q.push([`האם ${n} הוא שם לבן או לבת?`,sexAnswer(n,x.g)]);
  q.push([`מתי השם ${n} היה הכי פופולרי?`,x.start?`השם היה הכי נפוץ כבר בתחילת הרישום, ב-${Y0}.`:`שנת השיא של השם הייתה ${x.pk}, כשאחד מכל ${fmt(x.oneIn)} תינוקות נקרא ${n}.`]);
  q.push([`מה הגימטריה של השם ${n}?`,`הגימטריה של השם ${n} היא ${gem(n)}.`]);
  return q}
function nameMeta(i){const nm=NAMES[i];
  return LANG==='en'?{title:`The name ${NM(i)} (${nm}) – meaning, origin and statistics | Names of Israel`,desc:peakDesc(i)}:seoMeta(i)}
/* the Hebrew title and description are the static home page's too (SITE_T / SITE_D in tools/build_site.py), keep them in sync */
const SITE_TITLE=()=>t('שמות לתינוקות – מאגר השמות של ישראל | Shemotil','Names of Israel | Baby names database and a couples name-matching game');
const SITE_DESC=()=>t('שמות לתינוקות עם משמעות, מקור ופופולריות: מאגר השמות של ישראל (Shemotil) כולל כל שם שניתן בישראל מאז 1949 לפי הלמ״ס, ומשחק זוגי לבחירת שם ביחד. חינם.','Looking for a baby name? Every name given in Israel, with meanings, popularity over the years and a couples game to find your match. Completely free!');
function setMeta(){const onName=TAB==='names'&&NSUB==='file';const m=onName?nameMeta(CUR):{title:SITE_TITLE(),desc:SITE_DESC()};
  document.title=m.title;metaTag('meta[name="description"]','name','description',m.desc);
  /* one h1 per screen: on a name page the name is the h1 (renderName), so the brand becomes plain text there */
  {const b=document.querySelector('#home>.bt'),tag=onName?'SPAN':'H1';if(b&&b.tagName!==tag){const e=document.createElement(tag);e.className='bt';e.innerHTML=b.innerHTML;b.replaceWith(e)}}
  metaTag('meta[property="og:title"]','property','og:title',m.title);metaTag('meta[property="og:description"]','property','og:description',m.desc);
  if(SITE.base&&SITE.routing==='path'){const u=onName?nameURL(CUR):SITE.root;metaTag('link[rel="canonical"]','rel','canonical',u);metaTag('meta[property="og:url"]','property','og:url',u)}}
addEventListener('popstate',()=>{if(docFromURL())return;const h=(location.hash||'').slice(1);
  if(/^(match|saved\.|compare=)/.test(h))return;                 /* handled by their own hashchange listeners */
  const i=nameFromURL();if(i!=null){CUR=i;store.set('name',NAMES[i]);if(TAB!=='names'||NSUB!=='file')setTab('names','file');else{renderNames();setMeta()}return}
  if(URL_MISS){setTab('home');notFound(URL_MISS);return}
  const k=h||'home';if(TABS.includes(k)&&k!=='match'){if(k!==TAB)setTab(k)}else if(LEGACY[k])setTab(k);else setTab('home');
  window.scrollTo(0,0)});
/* share the page of one name: native share sheet on phones, copy elsewhere */
function shareName(i){const url=nameURL(i);const title=nameMeta(i).title;
  if(navigator.share&&matchMedia('(pointer:coarse)').matches){navigator.share({title,text:t(`הסיפור של השם ${NAMES[i]}`,`The story of the name ${NM(i)}`),url}).catch(()=>{});return}
  copy(url)}
