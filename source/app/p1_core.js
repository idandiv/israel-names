const Y0=DATA.y0, NY=DATA.T[0][0].length, Y1=Y0+NY-1, YEARS=Array.from({length:NY},(_,i)=>Y0+i);
const NOW=new Date().getFullYear();   /* ages and 'X years ago' follow today's date */
const LINKEDIN='https://www.linkedin.com/in/idan-diva/';
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
/* Persistence layer: localStorage with an in-memory fallback (private mode / blocked storage), schema versioning and cleanup. */
const SCHEMA=2, MEMST={};
const store={get(k,d){try{const v=localStorage.getItem('bnil_'+k);if(v!=null)return JSON.parse(v)}catch(e){}return Object.prototype.hasOwnProperty.call(MEMST,k)?MEMST[k]:d},
  set(k,v){MEMST[k]=v;try{localStorage.setItem('bnil_'+k,JSON.stringify(v))}catch(e){}},
  del(k){delete MEMST[k];try{localStorage.removeItem('bnil_'+k)}catch(e){}},
  keys(){try{const o=[];for(let j=0;j<localStorage.length;j++){const k=localStorage.key(j);if(k&&k.startsWith('bnil_'))o.push(k.slice(5))}return o}catch(e){return Object.keys(MEMST)}},
  wipe(){this.keys().forEach(k=>this.del(k))}};
(function migrate(){const v=store.get('_v',1);
  /* v1 -> v2: shape of saved data unchanged; just drop daily secret-name boards older than 30 days */
  const now=Date.now();store.keys().forEach(k=>{const m=/^namle2_(\d+)-(\d+)-(\d+)_/.exec(k);if(m&&now-new Date(+m[1],m[2]-1,+m[3]).getTime()>30*864e5)store.del(k)});
  if(v!==SCHEMA)store.set('_v',SCHEMA)})();
let LANG=store.get('lang','he');if(LANG!=='en')LANG='he';
const t=(he,en)=>LANG==='en'?en:he;
const fmt=n=>Math.round(n).toLocaleString(LANG==='en'?'en-US':'he-IL');
const kfmt=n=>n>=1e6?(n/1e6).toFixed(1)+'M':n>=1e4?Math.round(n/1e3)+'K':n>=1e3?(n/1e3).toFixed(1)+'K':fmt(n);
const css=v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const rand=a=>a[Math.floor(Math.random()*a.length)];
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const SECT_HE=['יהודים','מוסלמים','נוצרים ערבים','דרוזים'],SECT_EN=['Jewish','Muslim','Christian Arab','Druze'];
const SECT=()=>LANG==='en'?SECT_EN:SECT_HE;
const sectName=s=>SECT()[s];
/* Escape closes whatever is on top: an open dialog first, then suggestion lists, then the phone search bar */
/* "delete all my data": two taps, then device + server */
function wipeBtn(w){if(!w)return;w.onclick=async()=>{if(!w.dataset.sure){w.dataset.sure=1;w.textContent=t('בטוח? לחצו שוב למחיקה','Sure? Tap again to delete');return}
    if(w.disabled)return;w.disabled=true;w.textContent=t('מוחקים…','Deleting…');
    const server=await cloudDeleteMe();   /* 'ok' | 'none' (never used couple rooms) | 'fail' */
    store.wipe();try{sessionStorage.setItem('wiped',server)}catch(e){}
    try{history.replaceState(null,'',HREF('home'))}catch(e){}location.reload()}}
document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;const m=$('#modal');
  if(m&&!m.hidden){m.hidden=true;e.preventDefault();return}
  const open=[...document.querySelectorAll('.sugg')].filter(b=>!b.hidden);if(open.length){open.forEach(b=>b.hidden=true);return}
  const bar=document.querySelector('.bar.sopen');if(bar){bar.classList.remove('sopen');const q=$('#q');if(q)q.blur()}});
let toastT;function toast(m,ms){const el=$("#toast");el.textContent=m;el.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>el.hidden=true,ms||Math.max(2400,Math.min(6000,m.length*55)))}
function copy(text){const ok=()=>toast(t('הועתק! אפשר להדביק בוואטסאפ','Copied! Paste it anywhere'));const no=()=>toast(t('ההעתקה נחסמה בדפדפן הזה','Copying is blocked in this browser'));try{navigator.clipboard.writeText(text).then(ok,no)}catch(e){no()}}

/* ---------- parse ---------- */
const NAMES=[], IDX=new Map(), SER=[];
DATA.txt.split('\n').forEach((line,i)=>{
  const p=line.split('|'); const nm=p[0]; NAMES.push(nm); IDX.set(nm,i);
  const slots=new Array(8).fill(null);
  for(let k=1;k<p.length;k++){const q=p[k];const s=+q[0],x=+q[1];const c=q.indexOf(':');const a=+q.slice(2,c);
    const arr=new Int32Array(NY);q.slice(c+1).split(',').forEach((v,j)=>{if(v)arr[a+j]=+v});slots[s*2+x]=arr;}
  SER.push(slots);
});
const N=NAMES.length;
let ROM=null;const rom=i=>{if(!ROM)ROM=NAMES.map((n,j)=>{const w=SECTOT[j],tt=w[0]+w[1]+w[2]+w[3];return romanize(n,tt>0&&(w[1]+w[2]+w[3])/tt>.5)});return ROM[i]};
const NM=i=>LANG==='en'?rom(i):NAMES[i];
const nmh=i=>esc(NM(i));
function den(x,F){const out=new Float64Array(NY);for(let s=0;s<4;s++){if(F>=0&&s!==F)continue;const a=DATA.T[s][x];for(let i=0;i<NY;i++)out[i]+=a[i];}return out}
function yearly(i,x,F){const out=new Float64Array(NY);for(let s=0;s<4;s++){if(F>=0&&s!==F)continue;const a=SER[i][s*2+x];if(a)for(let y=0;y<NY;y++)out[y]+=a[y];}return out}
const cache={};
function stats(F){
  if(cache[F])return cache[F];
  const st={F,Y:[new Float64Array(N*NY),new Float64Array(N*NY)],D:[den(0,F),den(1,F)],tot:[new Float64Array(N),new Float64Array(N)],rank:[new Int16Array(N*NY),new Int16Array(N*NY)],top:[[],[]],uniq:[[],[]],med:new Int16Array(N),mom:new Float32Array(N)};
  for(let x=0;x<2;x++){const Y=st.Y[x];
    for(let i=0;i<N;i++){const a=yearly(i,x,F);Y.set(a,i*NY);let s=0;for(let y=0;y<NY;y++)s+=a[y];st.tot[x][i]=s;}
    for(let y=0;y<NY;y++){const ids=[];for(let i=0;i<N;i++)if(Y[i*NY+y]>0)ids.push(i);
      ids.sort((a,b)=>Y[b*NY+y]-Y[a*NY+y]);ids.forEach((id,r)=>{st.rank[x][id*NY+y]=r+1});
      st.top[x].push(ids.slice(0,15));st.uniq[x].push(ids.length);}
  }
  const DD=YEARS.map((_,y)=>st.D[0][y]+st.D[1][y]);
  for(let i=0;i<N;i++){const s=st.tot[0][i]+st.tot[1][i];if(!s)continue;
    let acc=0,m=Y0;for(let y=0;y<NY;y++){acc+=st.Y[0][i*NY+y]+st.Y[1][i*NY+y];if(acc>=s/2){m=Y0+y;break}}st.med[i]=m;
    let a=0,b=0,da=0,db=0;for(let y=NY-3;y<NY;y++){a+=st.Y[0][i*NY+y]+st.Y[1][i*NY+y];da+=DD[y]}for(let y=NY-13;y<NY-10;y++){b+=st.Y[0][i*NY+y]+st.Y[1][i*NY+y];db+=DD[y]}
    st.mom[i]=b?(a/da)/(b/db)-1:(a?9:-1);}
  st.DD=DD;
  return cache[F]=st;
}
let F=store.get('F',-1); if(![-1,0,1,2,3].includes(F))F=-1;

/* ---------- helpers ---------- */
const GEM={'א':1,'ב':2,'ג':3,'ד':4,'ה':5,'ו':6,'ז':7,'ח':8,'ט':9,'י':10,'כ':20,'ך':20,'ל':30,'מ':40,'ם':40,'נ':50,'ן':50,'ס':60,'ע':70,'פ':80,'ף':80,'צ':90,'ץ':90,'ק':100,'ר':200,'ש':300,'ת':400};
const gem=n=>[...n].reduce((s,c)=>s+(GEM[c]||0),0);
const letters=n=>[...n].filter(c=>GEM[c]).length;
const LEN=NAMES.map(letters), GEMS=NAMES.map(gem);
const SECTOT=Array.from({length:N},(_,i)=>[0,1,2,3].map(s=>{let v=0;for(const x of[0,1]){const a=SER[i][s*2+x];if(a)for(const q of a)v+=q}return v}));
const domSec=i=>{const w=SECTOT[i];return w.indexOf(Math.max(...w))};
function secTag(i){const w=SECTOT[i],s=w[0]+w[1]+w[2]+w[3];if(!s)return'';const o=[0,1,2,3].filter(k=>w[k]/s>=.12).sort((a,b)=>w[b]-w[a]);
  if(o.length===1)return `<span class="stag s${o[0]}">${sectName(o[0])}</span>`;return o.map(k=>`<span class="stag s${k}">${sectName(k)} ${Math.round(w[k]/s*100)}%</span>`).join('')}
function secShort(i){const w=SECTOT[i],s=w[0]+w[1]+w[2]+w[3];return [0,1,2,3].filter(k=>w[k]/s>=.12).sort((a,b)=>w[b]-w[a]).map(sectName).join(' · ')}
const FIN={'ך':'כ','ם':'מ','ן':'נ','ף':'פ','ץ':'צ'};
const lastL=n=>{const l=[...n].filter(c=>GEM[c]);const c=l[l.length-1]||'';return FIN[c]||c};
function spark(arr,w=64,h=20,color='var(--accent)'){let m=0;for(const v of arr)m=Math.max(m,v);if(!m)m=1;
  const pts=Array.from(arr,(v,i)=>`${(i/(arr.length-1)*w).toFixed(1)},${(h-1-v/m*(h-2)).toFixed(1)}`).join(' ');
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true" style="direction:ltr"><polyline points="${pts}" fill="none" style="stroke:${color}" stroke-width="1.6" stroke-linejoin="round"/></svg>`}
function comb(st,i){const a=new Float64Array(NY);for(let y=0;y<NY;y++)a[y]=st.Y[0][i*NY+y]+st.Y[1][i*NY+y];return a}
/* One definition of "peak year" for the whole site: the year the name was most common relative to all births.
   If that is the first year of the data (1949), the real peak may be earlier, so it is labeled "start of records". */
function peakOf(st,i){const sh=share(st,i);let pk=0;for(let y=1;y<NY;y++)if(sh[y]>sh[pk])pk=y;return pk}
const atStart=pk=>pk===0;
function peakDesc(i){const st=stats(-1),c=comb(st,i);let tot=0;for(let y=0;y<NY;y++)tot+=c[y];const pk=peakOf(st,i),oneIn=c[pk]?Math.round(st.DD[pk]/c[pk]):0;const nm=NAMES[i],mean=MEAN.get(nm)||'';
  return t(`${fmt(tot)} תינוקות בישראל נקראו ${nm} מאז ${Y0}. `+(atStart(pk)?`השם היה הכי נפוץ כבר בתחילת הרישום, ב-${Y0}.`:`שנת השיא: ${Y0+pk}, כשאחד מכל ${fmt(oneIn)} תינוקות נקרא כך.`)+(mean?` משמעות: ${mean}`:''),
    `${fmt(tot)} babies in Israel were named ${NM(i)} since ${Y0}. `+(atStart(pk)?`It was already most common when records began in ${Y0}.`:`Peak year: ${Y0+pk}, when 1 in ${fmt(oneIn)} babies got this name.`)).slice(0,300)}
function share(st,i){const a=comb(st,i);for(let y=0;y<NY;y++){const d=st.DD[y];a[y]=d?a[y]/d*1000:0}return a}
const T=(st,i)=>st.tot[0][i]+st.tot[1][i];
function peakDec(st,i){const c=comb(st,i);const dec={};c.forEach((q,y)=>{const d=Math.floor((Y0+y)/10)*10;dec[d]=(dec[d]||0)+q});return +Object.entries(dec).sort((a,b)=>b[1]-a[1])[0][0]}
const decLabel=d=>d===1940?t(`שנות ה-40`,`1940s`):d>=2000?t(`שנות ה-${d}`,`${d}s`):t(`שנות ה-${String(d).slice(2)}`,`${d}s`);   /* 2000 and later in full: "שנות ה-2010", not "שנות ה-10" */
function generation(y){if(y<1965)return t('דור הבייבי בום','Baby boomers');if(y<1981)return t('דור ה-X','Gen X');if(y<1997)return t('דור ה-Y','Millennials');if(y<2013)return t('דור ה-Z','Gen Z');return t('דור האלפא','Gen Alpha')}
function ed1(a,b){if(a===b)return false;const la=a.length,lb=b.length;if(Math.abs(la-lb)>1)return false;let i=0,j=0,e=0;
  while(i<la&&j<lb){if(a[i]===b[j]){i++;j++;continue}if(++e>1)return false;if(la>lb)i++;else if(lb>la)j++;else{i++;j++}}return e+(la-i)+(lb-j)<=1}
const hex2rgb=h=>{h=h.replace('#','');if(h.length===3)h=h.split('').map(c=>c+c).join('');const n=parseInt(h,16);return[n>>16&255,n>>8&255,n&255]};
function chartBase(){const rtl=LANG!=='en';return{responsive:true,maintainAspectRatio:false,animation:{duration:500},interaction:{mode:'index',intersect:false},
  plugins:{legend:{display:false},tooltip:{rtl,textDirection:rtl?'rtl':'ltr',backgroundColor:css('--ink'),titleColor:css('--bg'),bodyColor:css('--bg'),padding:10,boxPadding:4,usePointStyle:true}},
  scales:{x:{grid:{display:false},ticks:{color:css('--muted'),maxTicksLimit:8,maxRotation:0,font:{family:'IBM Plex Sans Hebrew'}},border:{color:css('--line')}},
          y:{grid:{color:css('--grid')},ticks:{color:css('--muted'),maxTicksLimit:5,font:{family:'IBM Plex Sans Hebrew'}},border:{display:false},beginAtZero:true}}}}
const charts={};
function mk(id,cfg){if(charts[id])charts[id].destroy();const el=document.getElementById(id);if(!el)return;charts[id]=new Chart(el,cfg);return charts[id]}
const line=(label,data,color,fill)=>({label,data:Array.from(data),borderColor:color,backgroundColor:fill?color+'22':color,fill:!!fill,borderWidth:2,pointRadius:0,pointHoverRadius:5,pointHoverBorderWidth:2,pointHoverBorderColor:css('--surface'),tension:.3});
const CC=['--c1','--c2','--c3','--c4'];
const SC=['--c1','--c3','--c4','--c2']; // sector colors (match .s0-.s3 tags)
function openOn(el){if(el)el.addEventListener('click',e=>{const b=e.target.closest('[data-i]');if(b)pick(+b.dataset.i)})}
const legendHTML=items=>items.map(([c,l])=>`<span><i style="background:var(${c})"></i>${l}</span>`).join('');

/* ---------- shell ---------- */
const TABS=['home','names','gen','trends','games','match'];
let MODE=store.get('mode','simple');if(MODE!=='full')MODE='simple';
const SIMPLE=()=>MODE==='simple';
let TAB='home', NSUB=store.get('nsub','file');if(!['file','me','compare'].includes(NSUB))NSUB='file';
const IC={
 home:'<path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z"/>',
 search:'<path d="M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14zm9 16-4.3-4.3"/>',
 names:'<path d="M4 6h16M4 12h10M4 18h7"/><circle cx="18" cy="16" r="3"/><path d="m20.2 18.2 1.8 1.8"/>',
 gen:'<path d="M5 19 19 5M14 4l1 2 2 1-2 1-1 2-1-2-2-1 2-1zM6 8l.7 1.3L8 10l-1.3.7L6 12l-.7-1.3L4 10l1.3-.7zM17 15l.7 1.3 1.3.7-1.3.7L17 19l-.7-1.3L15 17l1.3-.7z"/>',
 trends:'<path d="M4 19V5M4 19h16M7 15l4-4 3 3 5-6"/>',
 games:'<rect x="3" y="7" width="18" height="11" rx="4"/><path d="M8 11v3M6.5 12.5h3M15.5 12h.01M18 14h.01"/>',
 save:'<path d="M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1z"/>',
 copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
 chart:'<path d="M4 19h16M6 15l4-5 4 3 4-6"/>',
 list:'<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
 close:'<path d="M6 6l12 12M18 6 6 18"/>',
 play:'<path d="M8 5v14l11-7z"/>',pause:'<path d="M8 5v14M16 5v14"/>',
 dice:'<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M9 9h.01M15 15h.01M15 9h.01M9 15h.01"/>',
 arrow:'<path d="M15 6l-6 6 6 6"/>'};
const icon=(k,fill)=>`<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" fill="${fill?'currentColor':'none'}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${IC[k]}</svg>`;
function tabShort(k){return{home:t('ראשי','Home'),names:t('שמות','Names'),gen:t('מחולל','Finder'),trends:t('מגמות','Trends'),games:t('משחקים','Games')}[k]}
function tabLabel(k){return{home:t('ראשי','Home'),names:t('חקר שמות','Explore names'),gen:t('מחולל שמות','Name finder'),trends:t('מגמות ודאטה','Trends & data'),games:t('משחקים','Games')}[k]}
function renderShell(){
  document.documentElement.lang=LANG==='en'?'en':'he';
  const app=$('#app');app.dir=LANG==='en'?'ltr':'rtl';
  const madeBy=`${t('נוצר ע״י','Created by')} <a class="credit" href="${LINKEDIN}" target="_blank" rel="noopener">${t('עידן דיוה','Idan Diva')}</a>`;
  app.innerHTML=`
  <div class="bar">
    <div class="toprow">
      <button class="brandbtn" id="home" aria-label="${t('לדף הבית','Home')}"><h1>${t('השמות של ישראל','Names of Israel')}</h1></button>
      <div class="search tsearch">${icon('search')}<input id="q" type="search" placeholder="${t('חיפוש שם…','Search a name…')}" autocomplete="off" aria-label="${t('חיפוש שם','Search a name')}"><div class="sugg" id="sugg" hidden></div></div>
      <button class="favtop" id="favtop" aria-label="${t('השמות ששמרתי','Saved names')}">${icon('save',1)}<span>${t('שמורים','Saved')}</span><b id="favcnt">0</b></button>
      <button class="srchbtn" id="srchbtn" aria-label="${t('חיפוש שם','Search')}">${icon('search')}</button>
      <button class="langbtn" id="lang" aria-label="${t('Switch to English','מעבר לעברית')}">${LANG==='en'?'עב':'EN'}</button>
    </div>
    <nav class="mainnav" role="tablist">${['home','names','gen','trends','games'].map(k=>`<button role="tab" data-tab="${k}" class="${k==='gen'?'hl':''}" aria-selected="${k===TAB}">${icon(k)}<span class="lf">${tabLabel(k)}</span><span class="ls">${tabShort(k)}</span></button>`).join('')}</nav>
  </div>
  ${TABS.map(k=>`<section id="tab-${k}" ${k===TAB?'':'hidden'}></section>`).join('')}
  <p class="madeby">${madeBy}</p>
  <details class="note"><summary>${t('על הנתונים והמקורות','About the data')}</summary><p>${t('המקור: הלשכה המרכזית לסטטיסטיקה, דרך חבילת babynamesIL. הנתונים כוללים כל שם שניתן לפחות ל-5 תינוקות באותה שנה, באותו מגדר ובאותו מגזר. לכן שמות נדירים חסרים, ו״אחוז מהתינוקות״ מחושב מתוך התינוקות שנרשמו בשמות שבנתונים. ה״גיל הטיפוסי״ מבוסס על שנות הלידה בלבד, בלי תמותה והגירה. פירושי השמות הם הפירושים המקובלים, ולחלק מהשמות יש יותר מפירוש אחד. תגיות ״עדכון 2025״ ו״תשפ״ו״ מבוססות על רשימות 10 השמות המובילים שפרסמה רשות האוכלוסין וההגירה, ואינן חלק מנתוני הלמ״ס.',
    'Source: Israel Central Bureau of Statistics, via the babynamesIL package. The data includes every name given to at least 5 babies in a given year, sex and community, so very rare names are missing and percentages are out of the babies listed. "Typical age" uses birth years only. English spellings are approximate transliterations of the Hebrew. "2025 update" tags come from Population Authority top-10 lists, not CBS data.')}</p>
    <p>${cloudOn()?t('פרטיות: אין הרשמה. השמות ששמרתם, התשובות במחולל וההתקדמות במשחקים נשמרים רק בדפדפן במכשיר הזה. בבחירת שם בזוג, השם שבחרתם להציג בחדר והבחירות שלכם בו נשמרים בשרת מאובטח (Supabase), כדי שבן או בת הזוג יראו אותם בזמן אמת. רק מי שהצטרף לחדר יכול לראות אותם, וחדרים שלא היה בהם שימוש 90 יום נמחקים אוטומטית. הכפתור כאן מוחק את מה שנשמר במכשיר.','Privacy: no sign-up. Saved names, finder answers and game progress stay in this browser. In couple rooms, your display name and swipes are stored on a secure server (Supabase) so your partner sees them live. Only room members can see them, and rooms unused for 90 days are deleted automatically. This button deletes what is stored on this device.'):t('פרטיות: אין הרשמה ואין שרת. השמות ששמרתם, התשובות במחולל, ההתקדמות במשחקים והבחירות הזוגיות נשמרים רק בדפדפן במכשיר הזה. מה שעובר בין אנשים עובר רק בקישורים שאתם בוחרים לשלוח.','Privacy: no sign-up and no server. Saved names, finder answers, game progress and couple picks stay in this browser on this device. Only links you choose to send carry anything to others.')}</p>
    <button class="copybtn danger" id="wipeall">${cloudOn()?t('מחיקת כל הנתונים שלי (במכשיר ובשרת)','Delete all my data (device and server)'):t('מחיקת כל הנתונים השמורים במכשיר','Delete all data saved on this device')}</button></details>
  ${docLinksHTML()}
  <div id="favbar" class="favbar" hidden></div>`;
  document.querySelector('.mainnav').addEventListener('click',e=>{const b=e.target.closest('[data-tab]');if(b){PUSH_ONCE=true;setTab(b.dataset.tab)}});
  $('#home').onclick=()=>{PUSH_ONCE=true;setTab('home')};
  $('#favtop').onclick=openFavPanel;
  wipeBtn($('#wipeall'));
  $('#srchbtn').onclick=()=>{const bar=document.querySelector('.bar');bar.classList.toggle('sopen');if(bar.classList.contains('sopen'))setTimeout(()=>$('#q').focus(),50)};
  $('#lang').onclick=()=>{LANG=LANG==='en'?'he':'en';store.set('lang',LANG);GAME_BUILT=null;renderShell();setTab(TAB)};
  wireSearch($('#q'),$('#sugg'),pick);
  app.addEventListener('click',e=>{const b=e.target.closest('.sectors [data-f]');if(b)setF(+b.dataset.f)});
  renderFavBar();
}
function secChips(){const opts=[[-1,t('כל המגזרים','All')],...SECT().map((s,i)=>[i,s])];
  return `<div class="sectors" role="group" aria-label="${t('סינון לפי מגזר','Filter by community')}"><span class="seclab">${t('מגזר:','Community:')}</span>${opts.map(([v,l])=>`<button class="chip ${v>=0?'sc'+v:''}" data-f="${v}" aria-pressed="${v===F}">${l}</button>`).join('')}</div>`}
function setMode(m){if(m===MODE)return;MODE=m;store.set('mode',MODE);rerender()}
function setF(v){F=v;store.set('F',F);GAME_BUILT=null;rerender()}
const LEGACY={name:['names','file'],me:['names','me'],compare:['names','compare'],explore:['trends'],game:['games']};
function setTab(k,sub){if(TAB==='match'&&k!=='match'&&typeof cloudClose==='function')cloudClose();if(LEGACY[k]){sub=sub||LEGACY[k][1];k=LEGACY[k][0]}if(!TABS.includes(k))k='home';if(sub){NSUB=sub;store.set('nsub',NSUB)}
  TAB=k;document.querySelectorAll('.mainnav button').forEach(b=>b.setAttribute('aria-selected',b.dataset.tab===k));
  TABS.forEach(q=>{const el=$('#tab-'+q);el.hidden=q!==k;if(q!==k)el.innerHTML=''});GAME_BUILT=null;
  if(k!=='match'){document.body.classList.remove('matchmode');store.set('tab',k);syncURL()}else if(!/^#match/.test(location.hash)){const r=NMX.showRooms?null:R();try{history.replaceState(null,'',HREF(r?`match.${r.code}.${rTok(r)}`:'match'))}catch(e){}}
  stopRace();rerender();window.scrollTo({top:0});}
function rerender(){({home:renderHome,names:renderNames,gen:renderGen,trends:renderTrends,games:renderGames,match:renderMatch})[TAB]();renderFavBar();}
function renderNames(){const sec=$('#tab-names');
  sec.innerHTML=`<div class="subnav seg" role="tablist">${[['file',t('תיק שם','Name file')],['me',t('מה השם שלי אומר עליי','What my name says')],['compare',t('השוואת שמות','Compare')]].map(([k,l])=>`<button data-sub="${k}" aria-pressed="${NSUB===k}">${l}</button>`).join('')}</div>
    <div id="tab-name"></div><div id="tab-me"></div><div id="tab-compare"></div>`;
  sec.querySelector('.subnav').onclick=e=>{const b=e.target.closest('[data-sub]');if(b){NSUB=b.dataset.sub;store.set('nsub',NSUB);renderNames();PUSH_ONCE=true;syncURL()}};
  ({file:renderName,me:renderMe,compare:renderCompare})[NSUB]();}
function renderTrends(){$('#tab-trends').innerHTML=`<div class="pagehead"><h2>${t('מגמות ודאטה','Trends & data')}</h2><p>${t(`${NY} שנים של שמות: מי הוביל בכל תקופה, מי עולה ומי יורד, ומה מאפיין כל מגזר.`,`${NY} years of names: who led each era, who\u2019s rising and falling, and what sets each community apart.`)}</p>${secChips()}</div><div id="tab-explore"></div>`;renderExplore()}
function renderGames(){if(!$('#tab-game')){$('#tab-games').innerHTML=`<div class="pagehead"><h2>${t('משחקים','Games')}</h2><p>${t('השם הסודי של היום, ועוד משחקי טריוויה קצרים על שמות.','Today’s secret name, plus quick name trivia games.')}</p></div><div id="tab-game"></div>`;GAME_BUILT=null}renderGame()}

/* ---------- search ---------- */
const normQ=q=>String(q||'').replace(/[׳’‘`´]/g,"'").replace(/[״“”]/g,'"').replace(/\s+/g,' ').trim();
function suggest(q,limit=8,minTot=0){q=normQ(q);if(!q)return[];const st=stats(-1);const pre=[],inn=[];const lq=q.toLowerCase();const latin=/[a-z]/i.test(q);
  for(let i=0;i<N;i++){if(minTot&&T(st,i)<minTot)continue;const n=latin?rom(i).toLowerCase():NAMES[i];const qq=latin?lq:q;if(n.startsWith(qq))pre.push(i);else if(n.includes(qq))inn.push(i);}
  const v=i=>T(st,i);pre.sort((a,b)=>v(b)-v(a));inn.sort((a,b)=>v(b)-v(a));return pre.concat(inn).slice(0,limit);}
function wireSearch(inp,box,onPick,minTot=0){let sel=-1,items=[];
  const draw=()=>{const empty=!inp.value.trim();items=empty?(store.get('recent',[])||[]).filter(n=>IDX.has(n)).map(n=>IDX.get(n)).slice(0,6):suggest(inp.value,8,minTot);if(!items.length){if(empty){box.hidden=true;return}box.innerHTML=`<div class="snone">${t('לא מצאנו שם כזה במאגר','No such name in the data')}<small>${t('המאגר כולל שמות שניתנו ל-5 תינוקות לפחות באותה שנה','The data covers names given to at least 5 babies in a year')}</small></div>`;box.hidden=false;return}const st=stats(-1);
    box.innerHTML=(empty?`<div class="srecent">${t('חיפושים אחרונים','Recent')}<button type="button" class="srclr" data-clr="1">${t('ניקוי','Clear')}</button></div>`:'')+items.map((i,k)=>`<button data-i="${i}" class="${k===sel?'on':''}"><b>${esc(NAMES[i])}</b>${LANG==='en'?` <em>${esc(rom(i))}</em>`:''}<span>${secShort(i)} · ${fmt(T(st,i))}</span></button>`).join('');box.hidden=false;};
  inp.addEventListener('input',()=>{sel=-1;draw()});inp.addEventListener('focus',()=>{if(!inp.value.trim()){sel=-1;draw()}});
  inp.addEventListener('keydown',e=>{if(box.hidden&&e.key!=='Enter')return;if(!items.length&&e.key!=='Enter'&&e.key!=='Escape')return;
    if(e.key==='ArrowDown'){sel=Math.min(sel+1,items.length-1);draw();e.preventDefault()}
    else if(e.key==='ArrowUp'){sel=Math.max(sel-1,0);draw();e.preventDefault()}
    else if(e.key==='Enter'){const v=normQ(inp.value);if(!v)return;const i=sel>=0?items[sel]:(IDX.has(v)?IDX.get(v):items[0]);if(i!=null){onPick(i);box.hidden=true;}else toast(t(`לא מצאנו את השם "${v}" במאגר`,`"${v}" isn't in the data`));}
    else if(e.key==='Escape')box.hidden=true;});
  box.addEventListener('mousedown',e=>{if(e.target.closest('[data-clr]')){e.preventDefault();store.set('recent',[]);box.hidden=true;return}const b=e.target.closest('[data-i]');if(b){e.preventDefault();onPick(+b.dataset.i);box.hidden=true;}});
  inp.addEventListener('blur',()=>setTimeout(()=>box.hidden=true,150));}

let CUR=IDX.get(store.get('name','נועה'));if(CUR==null)CUR=IDX.get('נועה')||0;
function pushRecent(i){const n=NAMES[i];let r=(store.get('recent',[])||[]).filter(x=>x!==n&&IDX.has(x));r.unshift(n);store.set('recent',r.slice(0,8))}
function pick(i){PUSH_ONCE=true;CUR=i;store.set('name',NAMES[i]);pushRecent(i);const q=$('#q');if(q){q.value='';q.blur()}const bar=document.querySelector('.bar');if(bar)bar.classList.remove('sopen');const m=$('#modal');if(m)m.hidden=true;if(TAB!=='names'||NSUB!=='file')setTab('names','file');else{renderNames();window.scrollTo({top:0,behavior:'smooth'});}syncURL()}

/* ---------- capabilities (lazy) ---------- */
const CAP={};
function cap(name){if(!(name in CAP))CAP[name]=(window.claude&&window.claude.use?window.claude.use(name):Promise.resolve(null)).catch(()=>null);return CAP[name]}

/* ---------- share card ---------- */
function nameFacts(i,Fx){const st=stats(Fx);const c=comb(st,i),sh=share(st,i);let pk=0;for(let y=1;y<NY;y++)if(sh[y]>sh[pk])pk=y;
  const s=T(st,i);return{st,c,sh,pk,tot:s,med:st.med[i],gp:s?st.tot[0][i]/s:0,oneIn:c[pk]?Math.round(st.DD[pk]/c[pk]):0,last:c[NY-1]}}
async function makeCard(i,extra){
  try{await Promise.all([document.fonts.load('700 200px Karantina'),document.fonts.load('600 40px "IBM Plex Sans Hebrew"')])}catch(e){}
  const f=nameFacts(i,-1);const W=1080,H=1350;const cv=document.createElement('canvas');cv.width=W;cv.height=H;const g=cv.getContext('2d');
  const C={bg:'#14152a',ink:'#f3f2ff',mut:'#a8a9c8',acc:'#a49dff',st:'#ff7f9b',girl:'#f07a4a',boy:'#4a95ee'};
  g.fillStyle=C.bg;g.fillRect(0,0,W,H);
  const grd=g.createRadialGradient(W*.8,H*.15,50,W*.8,H*.15,700);grd.addColorStop(0,'rgba(164,157,255,.28)');grd.addColorStop(1,'rgba(164,157,255,0)');g.fillStyle=grd;g.fillRect(0,0,W,H);
  const en=LANG==='en';g.direction=en?'ltr':'rtl';const X0=en?80:W-80;g.textAlign=en?'left':'right';
  const body='"IBM Plex Sans Hebrew", Arial, sans-serif';
  g.fillStyle=C.mut;g.font=`600 34px ${body}`;g.fillText(en?'NAMES OF ISRAEL':'השמות של ישראל',X0,110);
  g.fillStyle=C.ink;let fs=300;g.font=`700 ${fs}px Karantina, ${body}`;const label=en?rom(i):NAMES[i];while(g.measureText(label).width>W-160&&fs>120){fs-=10;g.font=`700 ${fs}px Karantina, ${body}`}
  g.fillText(label,X0,120+fs*.85);
  let y=150+fs*.85;
  if(en){g.fillStyle=C.mut;g.font=`600 46px ${body}`;g.direction='rtl';g.textAlign='left';g.fillText(NAMES[i],X0,y+20);g.direction='ltr';y+=50}
  // stamp
  g.save();g.translate(en?W-170:170,190);g.rotate(-.2);g.strokeStyle=C.st;g.lineWidth=7;g.beginPath();g.arc(0,0,105,0,7);g.stroke();g.fillStyle=C.st;g.textAlign='center';
  g.font=`700 92px Karantina, ${body}`;g.fillText(GEMS[i],0,28);g.font=`700 24px ${body}`;g.fillText(en?'GEMATRIA':'גימטריה',0,-45);g.restore();
  g.textAlign=en?'left':'right';
  // stats
  const rows=[[fmt(f.tot),t(`תינוקות מאז ${Y0}`,`babies since ${Y0}`)],[String(Y0+f.pk),f.pk===0?t('שיא כבר בתחילת הרישום','peak at start of records'):t('שנת השיא','peak year')],[String(f.med),t('שנת לידה טיפוסית','typical birth year')]];
  y+=40;rows.forEach(([v,l],k)=>{const xx=en?80+k*320:W-80-k*320;g.textAlign=en?'left':'right';g.fillStyle=C.acc;g.font=`700 92px Karantina, ${body}`;g.fillText(v,xx,y+80);g.fillStyle=C.mut;g.font=`500 28px ${body}`;g.fillText(l,xx,y+120)});
  y+=170;
  // chart
  const cx=80,cw=W-160,ch=360,cy=y+ch;const m=Math.max(...f.sh)||1;
  g.beginPath();g.moveTo(cx,cy);f.sh.forEach((v,k)=>g.lineTo(cx+k/(NY-1)*cw,cy-v/m*ch));g.lineTo(cx+cw,cy);g.closePath();
  const ag=g.createLinearGradient(0,cy-ch,0,cy);ag.addColorStop(0,'rgba(164,157,255,.55)');ag.addColorStop(1,'rgba(164,157,255,0)');g.fillStyle=ag;g.fill();
  g.beginPath();f.sh.forEach((v,k)=>{const px=cx+k/(NY-1)*cw,py=cy-v/m*ch;k?g.lineTo(px,py):g.moveTo(px,py)});g.strokeStyle=C.acc;g.lineWidth=6;g.lineJoin='round';g.stroke();
  g.fillStyle=C.mut;g.font=`500 26px ${body}`;g.direction='ltr';g.textAlign='left';g.fillText(String(Y0),cx,cy+40);g.textAlign='right';g.fillText(String(Y1),cx+cw,cy+40);g.direction=en?'ltr':'rtl';
  y=cy+80;
  // gender bar
  const gw=cw*f.gp;g.fillStyle=C.girl;g.fillRect(cx+cw-gw,y,gw,22);g.fillStyle=C.boy;g.fillRect(cx,y,cw-gw-4,22);
  g.font=`600 28px ${body}`;g.textAlign=en?'left':'right';g.fillStyle=C.ink;
  g.fillText(en?`${Math.round(f.gp*100)}% girls · ${Math.round(100-f.gp*100)}% boys`:`${Math.round(f.gp*100)}% בנות · ${Math.round(100-f.gp*100)}% בנים`,X0,y+70);
  if(extra){g.fillStyle=C.acc;g.font=`700 40px ${body}`;g.fillText(extra,X0,y+130)}
  g.fillStyle=C.mut;g.font=`500 26px ${body}`;g.fillText(en?'Made by Idan Diva · linkedin.com/in/idan-diva':'נוצר ע״י עידן דיוה · linkedin.com/in/idan-diva',X0,H-60);
  return cv;
}
async function shareCard(i,extra){const cv=await makeCard(i,extra);showCard(cv,`${rom(i)}-names-of-israel.png`,NM(i),t('כרטיס השם שלכם','Your name card'))}
async function showCard(cv,fname,alt,title){const url=cv.toDataURL('image/png');
  const m=$('#modal');m.hidden=false;
  m.innerHTML=`<div class="mbox" role="dialog" aria-label="${t('כרטיס לשיתוף','Share card')}"><button class="mclose" id="mclose" aria-label="${t('סגירה','Close')}">×</button>
    <h3>${title}</h3><img src="${url}" alt="${esc(alt)}" class="${cv.height>cv.width*1.4?'tall':''}">
    <div class="mrow"><button class="next" id="mshare" hidden>${t('שיתוף לסטורי / וואטסאפ','Share to story / WhatsApp')}</button><button class="next" id="msave" hidden>${t('שמירת התמונה','Save image')}</button><button class="copybtn" id="mcopy">${t('העתקת התמונה','Copy image')}</button></div>
    <div class="sub">${t('בטלפון אפשר גם ללחוץ לחיצה ארוכה על התמונה ולשמור','On a phone you can also long-press the image to save it')}</div></div>`;
  $('#mclose').onclick=()=>m.hidden=true;m.onclick=e=>{if(e.target===m)m.hidden=true};
  cv.toBlob(bl=>{try{const file=new File([bl],fname,{type:'image/png'});if(navigator.canShare&&navigator.canShare({files:[file]})){const b=$('#mshare');if(!b)return;b.hidden=false;const sv=$('#msave');if(sv)sv.className='copybtn';b.onclick=()=>navigator.share({files:[file],title:alt}).catch(()=>{})}}catch(e){}});
  const dl=await cap('downloads');
  if(!dl){const b=$('#msave');b.hidden=false;b.onclick=()=>{const a=document.createElement('a');a.href=url;a.download=fname;document.body.appendChild(a);a.click();a.remove()}}
  if(dl){const b=$('#msave');b.hidden=false;b.onclick=()=>cv.toBlob(bl=>dl.save({filename:fname,data:bl}).catch(e=>{if(e&&e.code!=='declined')toast(t('השמירה לא זמינה כאן','Saving is not available here'))}))}
  $('#mcopy').onclick=()=>{try{cv.toBlob(bl=>navigator.clipboard.write([new ClipboardItem({'image/png':bl})]).then(()=>toast(t('התמונה הועתקה','Image copied')),()=>toast(t('ההעתקה נחסמה. נסו לשמור או ללחוץ ארוכות','Copy blocked. Try saving or long-press'))))}catch(e){toast(t('ההעתקה נחסמה. נסו לשמור או ללחוץ ארוכות','Copy blocked. Try saving or long-press'))}};
}

/* mobile: hide header while scrolling down, show on scroll up */
(function(){let last=0,tk=false;addEventListener('scroll',()=>{if(tk)return;tk=true;requestAnimationFrame(()=>{tk=false;const y=scrollY,bar=document.querySelector('.bar');if(!bar)return;
  if(innerWidth>700||TAB==='match'){bar.classList.remove('hid');last=y;return}
  if(y>last+8&&y>140&&!bar.classList.contains('sopen')&&document.activeElement.id!=='q')bar.classList.add('hid');else if(y<last-8||y<80)bar.classList.remove('hid');last=y})},{passive:true})})();
