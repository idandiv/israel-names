/* =========================================================
   NAME TRAITS (themes, character tags)
   ========================================================= */
const TH_WORDS={
  nature:'עץ עצי פרח צמח שיח נהר נחל אגם ים מים מעיין הר גבעה אבן ענב שדה יער טל גל גלים תבואה שתיל ניצן אלמוג פנינה דקל ורד שושן שקד אביב סתיו ציפור יונה עוף אלון ארז אורן תמר רימון גפן דגן שבולים זית הדס לוטם סיגלית נורית כלנית עונת חורש דבש פרי צבייה צבי איילה יעלת',
  light:'אור אורה זוהר זיו נוגה שחר זריחה זריחת ירח כוכב שמש קרן לפיד מאיר מאירה בהיר זהב מואר נאור יזרח תאיר הילה הילת נצנוץ זוהרת זוהרת יאיר',
  strength:'אריה לביא ארי כפיר עוז עוצמה חזק חזקה גבורה גבור גבורת גיבור אמיץ אמיצה לוחם זאב נמר נשר כוח אדיר איתן יציב מנצח ניצחון חרב עוצמתי כוחי',
  bible:'נביא הנביא מקראי משנה התלמוד תלמוד חכמי התנאים התנאים המלך מלך'};
const TH_SET=Object.fromEntries(Object.entries(TH_WORDS).map(([k,v])=>[k,new Set(v.split(' '))]));
const INTL_RE=/^(מ(לטינית|יוונית|גרמנית|צרפתית|אנגלית|ספרדית|אירית)|שם בינלאומי|הצורה הבינלאומית|הצורה (הצרפתית|האנגלית|הרוסית|היוונית|הספרדית)|שם (רוסי|סלאבי|צרפתי|אוקראיני|סקנדינבי)|בספרדית|ברוסית|באנגלית|בפרסית|בלטינית)/;
const THEMES_CACHE=new Map();
const NATURE_NAMES=new Set('פלג אגם אלון יער ארז אופק נחל ים דקל אורן גפן תמר הדס שקד ורד רותם לוטם אלה אילן אילנה אביב סתיו טל גל שחף דרור עופר צבי צביה איילה איילת יעל יעלה נטע שתיל ניצן ניצנה אלמוג פנינה ענבר גליה מעיין ירדן כנרת כרמל ארבל תבור רימון זית סיגל סיגלית נורית כלנית רקפת דליה הדר אדר דולב ליבנה אשל מור מורן ערבה שיבולת שובל תאנה תמרה יסמין לילך ורדה שושנה סהר זיו שקמה גבע צור סלע אפיק נהר רביב יובל ספיר שוהם לבנה דפנה לוטן אדווה אדוה ערבה שגיא אגמית ימית חצב שחר ארזה'.split(' '));
function themesOf(i){if(THEMES_CACHE.has(i))return THEMES_CACHE.get(i);const n=NAMES[i],m=MEAN.get(n);const out=new Set();
  if(m){const derived=/^(הצורה|קיצור|צורה של|צורה אחרת)/.test(m);const head=(m.split(/[.]/)[0]).replace(/^[^:]*:/,'');
    const words=head.replace(/[^א-ת\s]/g,' ').split(/\s+/).filter(Boolean);
    const hit=k=>words.some(w=>TH_SET[k].has(w)||(/^[הובלמש]/.test(w)&&TH_SET[k].has(w.slice(1))));
    if(/^שם מקראי/.test(m)||/נביא|מקראי|התנאים|חכמי|משנה/.test(m))out.add('bible');
    if(NATURE_NAMES.has(n)||(!derived&&/^(שם עברי|בעברית|בערבית|בארמית|מלטינית|שם בינלאומי)/.test(m)&&hit('nature')))out.add('nature');
    if(!derived&&hit('light'))out.add('light');if(!derived&&hit('strength'))out.add('strength');
    if(INTL_RE.test(m)||/שם בינלאומי/.test(m))out.add('intl');}
  else if(NATURE_NAMES.has(n))out.add('nature');
  THEMES_CACHE.set(i,out);return out}
const THEME_LAB=()=>({any:t('הכול','Any'),nature:t('טבע, צומח ומים','Nature & water'),light:t('אור ואנרגיה','Light & energy'),bible:t('תנ״ך ומסורת','Bible & tradition'),intl:t('בינלאומי','International'),strength:t('עוצמה וחיות','Strength & spirit')});
const THEME_EX={nature:'אילן · יער · פלג · אגם',light:'מאור · זוהר · שחר · ליה',bible:'אביגיל · יהונתן · איתמר',intl:'מאיה · אמה · ליאו',strength:'ארי · לביא · עוז'};
function top100Years(st,i){let k=0;for(const x of[0,1])for(let y=0;y<NY;y++){const r=st.rank[x][i*NY+y];if(r&&r<=100)k++}return k}
function nameInfo(st,i){const c=comb(st,i);const r3=c[NY-1]+c[NY-2]+c[NY-3];let mxv=0,my=0;for(let y=0;y<NY;y++)if(c[y]>mxv){mxv=c[y];my=y}
  let pre=0;for(let y=0;y<2005-Y0;y++)pre+=c[y];return{c,r3,mxv,my,pre,mom:st.mom[i]}}
function charTag(st,i,inf){inf=inf||nameInfo(st,i);const m=inf.mom;
  if(inf.pre===0&&inf.r3>=15)return['new',t('חדש לגמרי','Brand new')];
  if(m>0.5&&m<9&&inf.r3>=30)return['up',t('במגמת עלייה חדה','Rising fast')];
  if(inf.r3>0&&inf.r3<45)return['rare',t('נדיר ומקורי','Rare & original')];
  if(top100Years(st,i)>=45&&inf.r3>=30)return['classic',t('קלאסיקה','A classic')];
  if(Y0+inf.my<=1980&&inf.r3<inf.mxv*.25)return['vintage',t('וינטג׳','Vintage')];
  if(m>0.15&&m<9)return['up',t('בעלייה','Rising')];
  if(m<-0.3)return['down',t('בירידה','Declining')];
  return['stable',t('יציב','Steady')]}
const shortMean=i=>{const m=MEAN.get(NAMES[i]);if(!m||LANG==='en')return'';const s=m.split(/(?<=\.)\s/)[0];return s.length>78?s.slice(0,76)+'…':s};
function syllables(i){const r=TRMAP.get(NAMES[i]);if(!r)return null;const v=r.toLowerCase().match(/[aeiouy]+/g);return v?v.length:null}

/* =========================================================
   FAVORITES
   ========================================================= */
let FAV=(store.get('fav',[])||[]).filter(n=>IDX.has(n));
const isFav=n=>FAV.includes(n);
function favBtn(n,cls=''){const on=isFav(n);return `<button class="favbtn ${cls} ${on?'on':''}" data-fav="${esc(n)}" aria-pressed="${on}" aria-label="${on?t('הסרה מהשמות ששמרתי','Remove from saved'):t('שמירה לרשימה','Save to list')}" title="${on?t('שמור ברשימה','Saved'):t('שמירה לרשימה','Save')}">${icon('save',on)}${cls.includes('lbl')?`<span>${on?t('נשמר','Saved'):t('שמירה','Save')}</span>`:''}</button>`}
function toggleFav(n){if(isFav(n))FAV=FAV.filter(x=>x!==n);else{FAV.push(n);toast(t(`${n} נשמר. תמצאו אותו ב״שמורים״ למעלה`,`${NM(IDX.get(n))} saved. Find it under Saved, top of the page`));const ft=$('#favtop');if(ft){ft.classList.remove('bump');void ft.offsetWidth;ft.classList.add('bump')}}store.set('fav',FAV);
  document.querySelectorAll('[data-fav]').forEach(b=>{if(b.dataset.fav===n){const on=isFav(n);b.classList.toggle('on',on);b.setAttribute('aria-pressed',on);b.innerHTML=icon('save',on)+(b.classList.contains('lbl')?`<span>${on?t('נשמר','Saved'):t('שמירה','Save')}</span>`:'')}});
  renderFavBar();if(!$('#modal').hidden&&$('#favpanel'))openFavPanel();}
document.addEventListener('click',e=>{const b=e.target.closest('[data-fav]');if(b){e.stopPropagation();e.preventDefault();toggleFav(b.dataset.fav)}},true);
function favText(){return t(`השמות המובילים שבחרנו מתוך מחולל השמות:\n${FAV.map((n,k)=>`${k+1}. ${n}`).join('\n')}\nמה אתם חושבים?\n\nלפתוח את הרשימה באתר: ${favLink()}`,
  `Our top picks from the name finder:\n${FAV.map((n,k)=>`${k+1}. ${NM(IDX.get(n))} (${n})`).join('\n')}\nWhat do you think?\n\nOpen the list: ${favLink()}`)}
function favCompare(){CMP=FAV.slice(0,4);store.set('cmp',CMP);const m=$('#modal');if(m)m.hidden=true;setTab('names','compare')}
function renderFavBar(){const c=$('#favcnt');if(c){c.textContent=FAV.length;$('#favtop').classList.toggle('has',FAV.length>0)}const bar=$('#favbar');if(bar)bar.hidden=true;document.body.classList.remove('hasfav');const hs=$('#homesaved');if(hs&&TAB==='home')drawHomeSaved()}
function openFavPanel(){const m=$('#modal');m.hidden=false;const st=stats(-1);
  m.innerHTML=`<div class="mbox favpanel" id="favpanel" role="dialog" aria-label="${t('השמות ששמרתי','Saved names')}"><button class="mclose" id="mclose" aria-label="${t('סגירה','Close')}">${icon('close')}</button>
    <h3>${t('השמות ששמרתי','Saved names')} <span class="cnt">${FAV.length}</span></h3>
    ${FAV.length?`<div class="favlist">${FAV.map(n=>{const i=IDX.get(n);return `<div class="favrow"><button class="fvname" data-q="${i}"><b>${nmh(i)}</b><span>${esc(shortMean(i))||secShort(i)}</span></button>${spark(share(st,i),70,22)}<button class="iconbtn" data-rm="${esc(n)}" aria-label="${t('הסרה','Remove')}">${icon('close')}</button></div>`}).join('')}</div>
      <div class="mrow"><button class="next" id="fpcopy">${icon('copy')}${t(' העתקת הרשימה לוואטסאפ',' Copy list')}</button>${FAV.length>1?`<button class="copybtn" id="fpcmp">${icon('chart')}${t(' השוואה בגרף',' Compare')}</button>`:''}<button class="copybtn" id="fplink">${icon('link')}${t(' קישור לרשימה',' Link to list')}</button><button class="copybtn danger" id="fpclear">${t('ניקוי הרשימה','Clear list')}</button></div>`
      :`<p class="sub">${t('עוד לא שמרתם שמות. לחצו על סימן השמירה בכרטיס שם כדי להוסיף.','No saved names yet. Tap the bookmark on a name card to add one.')}</p>`}</div>`;
  const close=()=>m.hidden=true;$('#mclose').onclick=close;m.onclick=e=>{if(e.target===m)close()};
  m.querySelectorAll('[data-rm]').forEach(b=>b.onclick=()=>toggleFav(b.dataset.rm));
  m.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>quickView(+b.dataset.q));
  const fc=$('#fpcopy');if(fc)fc.onclick=()=>copy(favText());const fp=$('#fpcmp');if(fp)fp.onclick=favCompare;
  const fl=$('#fplink');if(fl)fl.onclick=()=>copy(favLink());
  const cl=$('#fpclear');if(cl)cl.onclick=()=>{if(cl.dataset.sure){FAV=[];store.set('fav',FAV);renderFavBar();openFavPanel();rerenderCards()}else{cl.dataset.sure=1;cl.textContent=t('לחצו שוב לאישור','Tap again to confirm')}};}
function rerenderCards(){if(TAB==='gen')drawGenResults()}

/* =========================================================
   QUICK VIEW
   ========================================================= */
let SURNAME=store.get('surname','');
function surnameNotes(n,sn){const A=lettersOf(n),B=lettersOf(sn);if(!B.length)return[];const out=[];
  if(A[0]===B[0])out.push(t('שני השמות פותחים באותה אות: צליל חוזר שקל לזכור.','Both start with the same letter: a catchy repeat.'));
  if(A[A.length-1]===B[0])out.push(t('השם נגמר באות שבה מתחיל שם המשפחה, ולכן הם עלולים להתחבר בדיבור.','The name ends with the surname’s first letter, so they may blur together when spoken.'));
  const L=A.length+B.length;out.push(L<=7?t('צירוף קצר וקליט.','A short, snappy combination.'):L>=12?t('צירוף ארוך. שם פרטי קצר יכול לאזן אותו.','A long combination; a shorter first name can balance it.'):t('אורך מאוזן.','A balanced length.'));
  if(A.slice(-2).join('')===B.slice(-2).join(''))out.push(t('שני השמות מתחרזים בסוף.','The two rhyme at the end.'));return out}
function quickView(i){const st=stats(-1),n=NAMES[i],inf=nameInfo(st,i),tag=charTag(st,i,inf);const s=T(st,i),gp=st.tot[0][i]/s;const x=gp>=.5?0:1;
  const rk=st.rank[x][i*NY+NY-1];const sh=share(st,i);let pk=0;for(let y=1;y<NY;y++)if(sh[y]>sh[pk])pk=y;const syl=syllables(i);
  const th=[...themesOf(i)].map(k=>THEME_LAB()[k]);
  const m=$('#modal');m.hidden=false;
  m.innerHTML=`<div class="mbox qv" role="dialog" aria-label="${esc(NM(i))}"><button class="mclose" id="mclose" aria-label="${t('סגירה','Close')}">${icon('close')}</button>
    <div class="qvtop"><div><div class="qvn">${nmh(i)}</div>${LANG==='en'?`<div class="nmhe" dir="rtl">${esc(n)}</div>`:''}</div>${favBtn(n,'lbl')}</div>
    ${MEAN.has(n)&&LANG!=='en'?`<p class="qvm">${esc(MEAN.get(n))}</p>`:''}
    <div class="qvtags"><span class="ctag c-${tag[0]}">${tag[1]}</span>${paPill(n)}<span class="pill">${gp>=.85?t('שם של בנות','Girls’ name'):gp<=.15?t('שם של בנים','Boys’ name'):t('יוניסקס','Unisex')}</span>${secTag(i)}${th.map(l=>`<span class="pill acc">${l}</span>`).join('')}</div>
    <div class="qvchart">${spark(sh,320,64)}<div class="heatlab"><span>${Y0}</span><span>${Y1}</span></div></div>
    <div class="endst"><div><b>${fmt(inf.c[NY-1])}</b><span>${t(`תינוקות ב-${Y1}`,`babies in ${Y1}`)}${rk?` · ${t('מקום ','#')}${rk}`:''}</span></div><div><b>${Y0+pk}</b><span>${t('שנת השיא','peak year')}</span></div><div><b>${st.med[i]||'—'}</b><span>${t('שנת לידה טיפוסית','typical birth year')}</span></div></div>
    <div class="qvfacts"><span>${LEN[i]} ${t('אותיות','letters')}</span>${syl?`<span>${t(`בערך ${syl} הברות`,`~${syl} syllables`)}</span>`:''}<span>${t('גימטריה','Gematria')} ${GEMS[i]}</span><span>${kfmt(s)} ${t('מאז 1949','since 1949')}</span></div>
    <div class="qvsur"><label for="qvs">${t('איך זה נשמע עם שם המשפחה?','How does it sound with your surname?')}</label><input class="inp" id="qvs" value="${esc(SURNAME)}" placeholder="${t('שם משפחה','Surname')}" autocomplete="off"><div id="qvsout"></div></div>
    <div class="mrow"><button class="next" id="qvopen">${t('לתיק השם המלא','Open full name file')}</button><button class="copybtn" id="qvcmp">${icon('chart')}${t(' הוספה להשוואה',' Add to compare')}</button></div></div>`;
  const close=()=>m.hidden=true;$('#mclose').onclick=close;m.onclick=e=>{if(e.target===m)close()};
  const drawS=()=>{const v=$('#qvs').value.trim();SURNAME=v;store.set('surname',v);$('#qvsout').innerHTML=v?`<div class="qvfull">${esc(n)} ${esc(v)}</div><ul>${surnameNotes(n,v).map(x=>`<li>${x}</li>`).join('')}</ul>`:''};
  $('#qvs').oninput=drawS;drawS();
  $('#qvopen').onclick=()=>{close();pick(i)};
  $('#qvcmp').onclick=()=>{if(!CMP.includes(n)){if(CMP.length>=4)CMP.shift();CMP.push(n);store.set('cmp',CMP)}close();setTab('names','compare')};}

/* =========================================================
   GENERATOR
   ========================================================= */
let GEN=Object.assign({mode:'free',sex:'F',theme:'any',vibe:'any',len:'any',fl:'',sort:'pop',more:false,like:'אריאל'},store.get('gen2',{}));
let GEN_SHOWN=24, GEN_LIST=[], WZ={step:0,themes:[],letter:'',nogut:false,shown:5,hide:[],seed:Math.random()*1e9|0,world:store.get('wzworld','heb')};
{const w=store.get('wz',null);if(w&&typeof w==='object'&&Array.isArray(w.themes)&&Array.isArray(w.hide))WZ=Object.assign(WZ,w)}
const saveGen=()=>store.set('gen2',GEN);
function genCard(st,i,extra=''){const inf=nameInfo(st,i);const tag=charTag(st,i,inf);const n=NAMES[i];
  return `<div class="gcard2 fade" data-q="${i}" role="button" tabindex="0" aria-label="${esc(NM(i))}">${favBtn(n,'corner')}
    <span class="nm3">${nmh(i)}</span>${LANG==='en'?`<small dir="rtl">${esc(n)}</small>`:''}
    ${shortMean(i)?`<span class="gmean">${esc(shortMean(i))}</span>`:''}
    <span class="ctag c-${tag[0]}">${tag[1]}</span>${extra}
    <span class="gfoot">${spark(share(st,i).slice(NY-30),84,20,tag[0]==='up'||tag[0]==='new'?'var(--good)':'var(--accent)')}<small>${inf.c[NY-1]?t(`${fmt(inf.c[NY-1])} ב-${Y1}`,`${fmt(inf.c[NY-1])} in ${Y1}`):t(`שיא ב-${Y0+inf.my}`,`peaked ${Y0+inf.my}`)}</small></span></div>`}
function wireCards(el){el.addEventListener('click',e=>{if(e.target.closest('[data-fav]'))return;const c=e.target.closest('[data-q]');if(c)quickView(+c.dataset.q)});
  el.addEventListener('keydown',e=>{if(e.key==='Enter'){const c=e.target.closest('[data-q]');if(c)quickView(+c.dataset.q)}})}
function sexOk(st,i,sx){const s=T(st,i);if(!s)return false;const gp=st.tot[0][i]/s;return sx==='F'?gp>=.85:sx==='M'?gp<=.15:sx==='U'?(gp>=.25&&gp<=.75&&s>=150):true}
function renderGen(){const sec=$('#tab-gen');
  sec.innerHTML=`<div class="pagehead"><h2>${t('מחולל השמות','The name finder')}</h2><p>${t(`שמות אמיתיים שניתנו בישראל, לפי משמעות, אופי ומגמה. שמרו את מה שאהבתם ושתפו את הרשימה.`,`Real names given in Israel, by meaning, vibe and trend. Save the ones you like and share your list.`)}</p>
    <button class="matchlink" id="gomatch">${icon('users')}<span>${t('בוחרים בזוג? נסו את התאמת השמות','Choosing together? Try NameMatch')}</span></button>
    <div class="seg modes" id="gmode">${[['free',t('סינון חופשי','Free filter')],['wiz',t('שאלון מותאם אישית','Guided quiz')],['like',t('שמות דומים לשם שאהבנו','Names like one we love')]].map(([k,l])=>`<button data-m="${k}" aria-pressed="${GEN.mode===k}">${l}</button>`).join('')}</div></div>
    <div id="gbody"></div>`;
  $('#gomatch').onclick=()=>setTab('match');
  $('#gmode').onclick=e=>{const b=e.target.closest('[data-m]');if(!b)return;GEN.mode=b.dataset.m;saveGen();renderGen()};
  ({free:genFree,wiz:genWizard,like:genLike})[GEN.mode]();}
function genFree(){const body=$('#gbody');const opt=(k,v,l,ex)=>`<button data-k="${k}" data-v="${v}" aria-pressed="${GEN[k]===v}" class="${ex?'rich':''}">${l}${ex?`<small>${ex}</small>`:''}</button>`;
  const AB='אבגדהוזחטיכלמנסעפצקרשת'.split('');const TL=THEME_LAB();
  body.innerHTML=`<div class="card genpanel" id="genf">
    <div class="gstep"><div class="gsl"><span class="num">1</span>${t('למי?','For a')}</div><div class="seg big">${opt('sex','F',t('בת','Girl'))}${opt('sex','M',t('בן','Boy'))}${opt('sex','U',t('יוניסקס','Unisex'))}</div></div>
    <div class="gstep"><div class="gsl"><span class="num">2</span>${t('משמעות ועולם תוכן','Meaning & theme')}</div><div class="themegrid">${['any','nature','light','bible','intl','strength'].map(k=>opt('theme',k,TL[k],k==='any'?t('כל המשמעויות','All meanings'):THEME_EX[k])).join('')}</div></div>
    <div class="gstep"><div class="gsl"><span class="num">3</span>${t('אופי ומגמה','Character & trend')}</div><div class="chips sel">${opt('vibe','any',t('הכול','Any'))}${opt('vibe','trend',t('טרנדי עכשיו','Trending'))}${opt('vibe','classic',t('קלאסי','Classic'))}${opt('vibe','rare',t('נדיר ומיוחד','Rare'))}${opt('vibe','vintage',t('וינטג׳','Vintage'))}${opt('vibe','new',t('חדש לגמרי','Brand new'))}</div></div>
    <button class="moretoggle" id="gmore" aria-expanded="${GEN.more}">${GEN.more?t('פחות אפשרויות','Fewer options'):t('עוד אפשרויות: מגזר, אורך ואות ראשונה','More: community, length, first letter')}</button>
    ${GEN.more?`<div class="gextra">
      <div class="fl"><span>${t('מגזר','Community')}</span><div class="chips sel">${[[-1,t('כולם','All')],...SECT().map((s,k)=>[k,s])].map(([v,l])=>`<button data-f="${v}" aria-pressed="${F===v}">${l}</button>`).join('')}</div></div>
      <div class="fl"><span>${t('אורך','Length')}</span><div class="chips sel">${opt('len','any',t('הכול','Any'))}${opt('len','s',t('קצר (עד 3 אותיות)','Short (≤3)'))}${opt('len','m',t('4 אותיות','4 letters'))}${opt('len','l',t('5 ומעלה','5+'))}</div></div>
      <div class="fl"><span>${t('אות ראשונה','First letter')}</span><select class="inp" id="gfl" aria-label="${t('אות ראשונה','First letter')}"><option value="">${t('כל אות','Any')}</option>${AB.map(c=>`<option ${GEN.fl===c?'selected':''}>${c}</option>`).join('')}</select></div></div>`:''}
  </div>
  <div class="reshead"><div id="gcount" class="rescount"></div><div class="seg" id="gsort">${[['pop',t('הכי נפוצים היום','Most popular now')],['trend',t('במגמת עלייה','Rising')],['rand',t('אקראי','Random')]].map(([k,l])=>`<button data-s="${k}" aria-pressed="${GEN.sort===k}">${l}</button>`).join('')}</div></div>
  <div class="gencards2" id="gcards"></div><div class="loadmore" id="gmorebox"></div>`;
  $('#genf').onclick=e=>{const f=e.target.closest('[data-f]');if(f){F=+f.dataset.f;store.set('F',F);genFree();return}
    const b=e.target.closest('[data-k]');if(b){GEN[b.dataset.k]=b.dataset.v;saveGen();GEN_SHOWN=24;genFree();return}
    if(e.target.closest('#gmore')){GEN.more=!GEN.more;saveGen();genFree()}};
  const fl=$('#gfl');if(fl)fl.onchange=e=>{GEN.fl=e.target.value;saveGen();GEN_SHOWN=24;genFree()};
  $('#gsort').onclick=e=>{const b=e.target.closest('[data-s]');if(b){GEN.sort=b.dataset.s;saveGen();GEN_SHOWN=24;genFree()}};
  wireCards($('#gcards'));computeGen();drawGenResults();}
let GEN_EXACT=0,GEN_DROP=[];
function computeGen(){const exact=genPass({});GEN_EXACT=exact.length;GEN_DROP=[];
  /* fewer than 3 exact matches: add close results by relaxing one filter at a time (never the sex) */
  if(exact.length<3){const TL=THEME_LAB();const steps=[['vibe',GEN.vibe!=='any',t('אופי ומגמה','character')],['fl',!!GEN.fl,t('אות ראשונה','first letter')],['len',GEN.len!=='any',t('אורך','length')],['theme',GEN.theme!=='any',t('משמעות','meaning')]];
    const relax={};for(const [k,on,lab] of steps){if(!on)continue;relax[k]=1;GEN_DROP.push(lab);const near=genPass(relax).filter(i=>!exact.includes(i));if(near.length>=6||k==='theme'){GEN_LIST=exact.concat(near);return}}}
  GEN_LIST=exact}
function genPass(R){const st=stats(F);const out=[];
  for(let i=0;i<N;i++){const s=T(st,i);if(s<30)continue;if(!sexOk(st,i,GEN.sex))continue;
    const L=LEN[i];if(!R.len){if(GEN.len==='s'&&L>3)continue;if(GEN.len==='m'&&L!==4)continue;if(GEN.len==='l'&&L<5)continue}
    if(!R.fl&&GEN.fl&&NAMES[i][0]!==GEN.fl)continue;
    if(!R.theme&&GEN.theme!=='any'&&!themesOf(i).has(GEN.theme))continue;
    const inf=nameInfo(st,i);const m=inf.mom;let ok=true;
    if(!R.vibe)switch(GEN.vibe){case'trend':ok=m>.4&&m<9&&inf.r3>=60;break;
      case'classic':ok=top100Years(st,i)>=45&&inf.r3>=30;break;
      case'rare':ok=inf.r3>=5&&inf.r3<=45&&s<600;break;
      case'vintage':ok=Y0+inf.my<=1980&&s>=800&&inf.r3<inf.mxv*.25;break;
      case'new':ok=inf.pre===0&&inf.r3>=15;break;}
    if(ok)out.push([i,inf.r3,m])}
  if(GEN.sort==='pop')out.sort((a,b)=>b[1]-a[1]||T(st,b[0])-T(st,a[0]));
  else if(GEN.sort==='trend')out.sort((a,b)=>(b[1]>=20?Math.min(b[2],8):-9)-(a[1]>=20?Math.min(a[2],8):-9));
  else{const sh=shuffle(out);out.length=0;out.push(...sh)}
  return out.map(o=>o[0])}
function drawGenResults(){const st=stats(F),box=$('#gcards');if(!box)return;const n=GEN_LIST.length;
  const near=n>GEN_EXACT;
  $('#gcount').innerHTML=!n?t('לא נמצאו שמות שמתאימים לכל הבחירות. נסו לשחרר אחד המסננים.','No names match every choice. Try loosening a filter.')
    :near?t(`${GEN_EXACT?`רק <b>${GEN_EXACT}</b> ${GEN_EXACT===1?'שם תואם':'שמות תואמים'} בדיוק לכל הבחירות.`:'אין שם שתואם בדיוק לכל הבחירות.'} הוספנו שמות קרובים, בלי הסינון של ${GEN_DROP.join(' ו')}.`,`${GEN_EXACT} exact matches. We added close ones without the ${GEN_DROP.join(' and ')} filter.`)
    :t(`נמצאו <b>${fmt(n)}</b> שמות שתואמים להגדרות שלכם`,`<b>${fmt(n)}</b> names match your choices`);
  box.innerHTML=GEN_LIST.slice(0,GEN_SHOWN).map((i,k)=>(near&&k===GEN_EXACT?`<div class="gnear">${t('שמות קרובים','Close matches')}</div>`:'')+genCard(st,i)).join('');
  const mb=$('#gmorebox');mb.innerHTML=n>GEN_SHOWN?`<button class="copybtn" id="gload">${t(`טען עוד שמות (${fmt(n-GEN_SHOWN)} נוספים)`,`Load more (${fmt(n-GEN_SHOWN)} left)`)}</button>`:'';
  const l=$('#gload');if(l)l.onclick=()=>{GEN_SHOWN+=24;drawGenResults()};}
function wzCandidates(){const st=stats(-1);const out=[];const GUT=/[חעצץ]/;
  for(let i=0;i<N;i++){const n=NAMES[i];if(!MEAN.has(n)||T(st,i)<30)continue;if(!sexOk(st,i,WZ.sex))continue;
    const th=themesOf(i);let k=0;if(WZ.themes.length){WZ.themes.forEach(x=>{if(th.has(x))k++});if(!k)continue}
    const L=LEN[i];if(WZ.len==='s'&&L>3)continue;if(WZ.len==='m'&&L!==4)continue;if(WZ.len==='l'&&L<5)continue;
    if(WZ.world!=='all'){const w=SECTOT[i],tt=w[0]+w[1]+w[2]+w[3];const j=w[0]/tt;if(WZ.world==='heb'&&j<.6)continue;if(WZ.world==='arab'&&j>.4)continue}
    if(WZ.letter&&!lettersOf(n).includes(WZ.letter))continue;if(WZ.nogut&&GUT.test(n))continue;
    const inf=nameInfo(st,i);const r=inf.r3;if(WZ.pop==='pop'&&r<400)continue;if(WZ.pop==='mid'&&(r<45||r>=400))continue;if(WZ.pop==='rare'&&(r<1||r>=45))continue;
    let sc=k*10;sc+=WZ.pop==='pop'?Math.log10(r+1)*3:WZ.pop==='mid'?Math.min(inf.mom,4):WZ.pop==='any'?Math.log10(r+1)*1.2:(hash(n+WZ.seed)%1000)/500;sc+=(hash(WZ.seed+n)%1000)/700;out.push([i,sc,k])}
  out.sort((a,b)=>b[1]-a[1]);
  /* "no preference" on sex: alternate girls and boys so the top results are balanced */
  if(WZ.sex==='any'){const g=[],b=[];out.forEach(o=>{const s=T(st,o[0]);(st.tot[0][o[0]]/s>=.5?g:b).push(o)});const mix=[];for(let k=0;k<Math.max(g.length,b.length);k++){if(g[k])mix.push(g[k]);if(b[k])mix.push(b[k])}return mix}
  return out}
function genWizard(){store.set('wz',WZ);const body=$('#gbody');const TL=THEME_LAB();const st=stats(-1);const AB='אבגדהוזחטיכלמנסעפצקרשת'.split('');
  const steps=[
    {k:'sex',q:t('למי השם?','Who is the name for?'),o:[['F',t('בת','A girl')],['M',t('בן','A boy')],['U',t('יוניסקס','Unisex'),t('שם שמתאים גם לבת וגם לבן','A name that fits both')]],any:1},
    {k:'themes',multi:5,q:t('איזו אווירה אתם מחפשים?','What feeling are you after?'),sub:t('אפשר לבחור כמה סגנונות שרוצים. שמות שמתאימים לכמה מהם יופיעו ראשונים.','Pick as many as you like. Names that fit several come first.'),o:['nature','light','bible','intl','strength'].map(k=>[k,TL[k],THEME_EX[k]]),any:1},
    {k:'len',q:t('מה אורך השם המועדף עליכם?','Preferred length?'),o:[['s',t('קצר וקולע','Short & sharp'),t('2–3 אותיות: תום, שי, גל, מאי','2–3 letters: Tom, Shai, Gal')],['m',t('קלאסי ומאוזן','Balanced'),t('4 אותיות: איתמר, לביא, אביגיל','4 letters')],['l',t('ארוך ונוכח','Long & present'),t('5 אותיות ומעלה','5+ letters')]],any:1},
    {k:'pop',q:t('כמה נפוץ שיהיה?','How common should it be?'),o:[['pop',t('מוכר ואהוב','Well known'),t('מהשמות הנפוצים היום','Among today’s most common')],['mid',t('באמצע','In between'),t('מוכר, אבל לא בכל כיתה','Familiar, not in every class')],['rare',t('נדיר ומיוחד','Rare & special'),t('כמעט אף אחד לא נקרא ככה','Hardly anyone has it')]],any:1},
    {k:'sound',q:t('אותיות או צלילים מיוחדים?','Special letters or sounds?'),sub:t('שלב אופציונלי. אפשר לדלג.','Optional step. You can skip it.')}];
  const NS=steps.length;
  if(WZ.step<NS){const s=steps[WZ.step];
    const prog=`<div class="wzprog">${steps.map((_,k)=>`<i class="${k<=WZ.step?'on':''}"></i>`).join('')}<span>${t(`שאלה ${WZ.step+1} מתוך ${NS}`,`Question ${WZ.step+1} of ${NS}`)}</span></div>`;
    let inner='';
    if(s.k==='sound'){inner=`<div class="wzsound"><div class="nml">${t('אות שחייבת להופיע בשם (למשל הנצחה של סבא או סבתא)','A letter that must appear (e.g. to honor a grandparent)')}</div>
        <div class="letgrid">${AB.map(c=>`<button data-l="${c}" aria-pressed="${WZ.letter===c}">${c}</button>`).join('')}</div>
        <label class="wztoggle"><input type="checkbox" id="wzgut" ${WZ.nogut?'checked':''}><span><b>${t('בלי צלילים גרוניים','No guttural sounds')}</b><small>${t('בלי ח׳, ע׳ וצ׳. נוח למי שגר בחו״ל או מתכנן רילוקיישן.','No ח, ע or צ. Easier abroad.')}</small></span></label></div>
      <div class="wznav"><button class="next" id="wzfin">${t('הצגת השמות שלי','Show my names')}</button><button class="linkbtn" id="wzskip">${t('דלגו על השלב','Skip')}</button></div>`}
    else if(s.multi){inner=`<div class="wzopts">${s.o.map(([v,l,ex])=>`<button data-v="${v}" aria-pressed="${WZ.themes.includes(v)}" class="multi"><span class="ck">${icon('v')}</span><b>${l}</b>${ex?`<small>${ex}</small>`:''}</button>`).join('')}</div>
      <div class="wznav"><button class="next" id="wznext" ${WZ.themes.length?'':'disabled'}>${t('המשך לשלב הבא','Continue')}${WZ.themes.length?` (${WZ.themes.length})`:''}</button></div>`}
    else if(s.k==='sex')inner=`<div class="nml">${t('מאיזה עולם שמות?','Which name world?')}</div><div class="chips sel wzworld">${[['heb',t('עברי וישראלי','Hebrew & Israeli')],['arab',t('ערבי','Arabic')],['all',t('הכול','All')]].map(([v,l])=>`<button data-w="${v}" aria-pressed="${WZ.world===v}">${l}</button>`).join('')}</div><div class="nml">${t('ולמי?','And for')}</div><div class="wzopts">${s.o.map(([v,l,ex])=>`<button data-v="${v}" aria-pressed="${WZ[s.k]===v}"><b>${l}</b>${ex?`<small>${ex}</small>`:''}</button>`).join('')}</div>`;
    else inner=`<div class="wzopts">${s.o.map(([v,l,ex])=>`<button data-v="${v}" aria-pressed="${WZ[s.k]===v}"><b>${l}</b>${ex?`<small>${ex}</small>`:''}</button>`).join('')}</div>`;
    body.innerHTML=`<div class="card wizard fade">${prog}<h3 class="wzq">${s.q}</h3>${s.sub?`<p class="wzsub">${s.sub}</p>`:''}${inner}${s.any||WZ.step?`<div class="wzfoot">${s.any?`<button class="linkbtn" id="wzany">${t('לא משנה לנו','No preference')}</button>`:''}${WZ.step?`<button class="linkbtn" id="wzback">${t('חזרה','Back')}</button>`:''}</div>`:''}</div>`;
    const bk=$('#wzback');if(bk)bk.onclick=()=>{WZ.step--;genWizard()};
    const an=$('#wzany');if(an)an.onclick=()=>{if(s.multi)WZ.themes=[];else WZ[s.k]='any';WZ.step++;genWizard()};
    if(s.k==='sound'){body.querySelector('.letgrid').onclick=e=>{const b=e.target.closest('[data-l]');if(!b)return;WZ.letter=WZ.letter===b.dataset.l?'':b.dataset.l;genWizard()};
      $('#wzgut').onchange=e=>{WZ.nogut=e.target.checked};
      const go=()=>{WZ.step=NS;WZ.shown=5;WZ.hide=[];genWizard()};$('#wzfin').onclick=go;$('#wzskip').onclick=()=>{WZ.letter='';WZ.nogut=false;go()};return}
    if(s.multi){body.querySelector('.wzopts').onclick=e=>{const b=e.target.closest('[data-v]');if(!b)return;const v=b.dataset.v;
        if(WZ.themes.includes(v))WZ.themes=WZ.themes.filter(x=>x!==v);else{if(WZ.themes.length>=s.multi){toast(t(`אפשר לבחור עד ${s.multi} סגנונות`,`Up to ${s.multi} styles`));return}WZ.themes.push(v)}genWizard()};
      $('#wznext').onclick=()=>{if(!WZ.themes.length)return;WZ.step++;genWizard()};return}
    const ww=body.querySelector('.wzworld');if(ww)ww.onclick=e=>{const b=e.target.closest('[data-w]');if(!b)return;WZ.world=b.dataset.w;store.set('wzworld',WZ.world);ww.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b))};
    body.querySelector('.wzopts').onclick=e=>{const b=e.target.closest('[data-v]');if(!b)return;WZ[s.k]=b.dataset.v;WZ.step++;setTimeout(genWizard,120);b.setAttribute('aria-pressed','true')};
    return}
  const all=wzCandidates().filter(o=>!WZ.hide.includes(o[0]));const shown=all.slice(0,WZ.shown);
  const lbl={F:t('בת','a girl'),M:t('בן','a boy'),U:t('יוניסקס','unisex'),any:t('בת או בן','any sex')}[WZ.sex]+(WZ.world==='all'?'':' · '+(WZ.world==='heb'?t('עברי וישראלי','Hebrew'):t('ערבי','Arabic')));
  const sum=[lbl,WZ.themes.length?WZ.themes.map(k=>TL[k]).join(' + '):t('כל סגנון','any style'),{s:t('קצר','short'),m:t('4 אותיות','4 letters'),l:t('ארוך','long'),any:t('כל אורך','any length')}[WZ.len],{pop:t('מוכר ואהוב','well known'),mid:t('באמצע','in between'),rare:t('נדיר','rare'),any:t('כל רמת נפוצות','any popularity')}[WZ.pop]];
  if(WZ.letter)sum.push(t(`עם האות ${WZ.letter}`,`with ${WZ.letter}`));if(WZ.nogut)sum.push(t('בלי צלילים גרוניים','no gutturals'));
  body.innerHTML=`<div class="card wizard done"><div class="wzsum">${t('בחרתם','You chose')}: ${sum.map(x=>`<b>${x}</b>`).join(' · ')} <button class="linkbtn" id="wzedit">${t('שינוי','Edit')}</button></div>
    <h3 class="wzq">${all.length?t(`${shown.length} השמות שהכי מתאימים לכם`,`Your ${shown.length} best matches`):t('לא מצאנו התאמה מדויקת','No exact match')}</h3>
    ${all.length?`<p class="wzsub">${t(`מתוך ${fmt(all.length)} שמות שעונים על כל הבחירות. לא אהבתם שם? החליפו רק אותו.`,`Out of ${fmt(all.length)} names that fit. Don’t like one? Swap just that one.`)}</p>`:`<p class="wzsub">${t('נסו לוותר על אחת הבחירות, למשל אורך השם או האות.','Try relaxing one choice, like length or letter.')}</p>`}</div>
    <div class="gencards2" id="gcards">${shown.map(o=>genCard(st,o[0],`${o[2]>1?`<span class="why">${t(`מתאים ל-${o[2]} סגנונות`,`fits ${o[2]} styles`)}</span>`:''}<button class="swapbtn" data-swap="${o[0]}">${icon('undo')}<span>${t('החלפת השם','Swap')}</span></button>`)).join('')}</div>
    <div class="loadmore">${all.length>WZ.shown?`<button class="copybtn" id="wzmore">${t('עוד 5 הצעות','5 more ideas')}</button>`:''}<button class="linkbtn" id="wzagain">${t('להתחיל מחדש','Start over')}</button></div>`;
  const gc=$('#gcards');gc.addEventListener('click',e=>{const sw=e.target.closest('[data-swap]');if(sw){e.stopPropagation();WZ.hide.push(+sw.dataset.swap);const card=sw.closest('.gcard2');card.classList.add('out');setTimeout(genWizard,180)}},true);
  wireCards(gc);const mo=$('#wzmore');if(mo)mo.onclick=()=>{WZ.shown+=5;genWizard()};
  $('#wzagain').onclick=()=>{WZ={step:0,themes:[],letter:'',nogut:false,shown:5,hide:[],seed:Math.random()*1e9|0,world:store.get('wzworld','heb')};genWizard()};$('#wzedit').onclick=()=>{WZ.step=1;genWizard()};}
function genLike(){const body=$('#gbody');const st=stats(-1);let base=IDX.get(GEN.like);if(base==null)base=IDX.get('אריאל');
  body.innerHTML=`<div class="card genpanel"><div class="gstep"><div class="gsl">${t('איזה שם אתם אוהבים?','Which name do you love?')}</div>
    <div class="cmpin" style="margin:0"><input class="inp" id="lq" value="${esc(NM(base))}" autocomplete="off" aria-label="${t('שם שאהבתם','A name you love')}"><div class="sugg" id="lsugg" hidden></div></div>
    <div class="sub">${t('נמצא שמות עם צליל, אורך, סיום, משמעות ומגמה דומים.','We match sound, length, ending, meaning and trend.')}</div></div></div>
    <div class="reshead"><div class="rescount">${t(`שמות בסגנון <b>${esc(NAMES[base])}</b>`,`Names in the style of <b>${nmh(base)}</b>`)}</div></div><div class="gencards2" id="gcards"></div>`;
  wireSearch($('#lq'),$('#lsugg'),i=>{GEN.like=NAMES[i];saveGen();genLike()});
  const gp=b=>st.tot[0][b]/T(st,b);const bsx=gp(base)>=.75?'F':gp(base)<=.25?'M':'U';const bl=lettersOf(NAMES[base]);const bth=themesOf(base);
  const norm=a=>{let m=0;for(const q of a)m+=q;m/=a.length;const d=a.map(q=>q-m);let l=0;for(const q of d)l+=q*q;l=Math.sqrt(l)||1;return d.map(q=>q/l)};
  const bv=norm(Array.from(share(st,base)));const bt=T(st,base);const res=[];
  for(let i=0;i<N;i++){if(i===base||T(st,i)<60)continue;if(bsx!=='U'&&!sexOk(st,i,bsx))continue;if(bsx==='U'&&!sexOk(st,i,'U'))continue;
    const L=lettersOf(NAMES[i]);const why=[];let sc=0;
    const v=norm(Array.from(share(st,i)));let c=0;for(let y=0;y<NY;y++)c+=bv[y]*v[y];sc+=.35*Math.max(0,c);if(c>.85)why.push(t('מגמה דומה','similar trend'));
    sc+=.15*Math.max(0,1-Math.abs(L.length-bl.length)/4);
    if(L.slice(-2).join('')===bl.slice(-2).join('')){sc+=.18;why.push(t('אותו סיום','same ending'))}else if(L[L.length-1]===bl[bl.length-1])sc+=.07;
    if(L[0]===bl[0]){sc+=.08;why.push(t('אותה אות פותחת','same first letter'))}
    sc+=.12*Math.max(0,1-Math.abs(Math.log10(T(st,i)/bt))/2);
    const th=themesOf(i);let sh=0;bth.forEach(k=>{if(th.has(k))sh++});if(sh){sc+=Math.min(.2,.1*sh);why.push(t('משמעות קרובה','related meaning'))}
    if(domSec(i)===domSec(base))sc+=.05;
    res.push([i,sc,why])}
  res.sort((a,b)=>b[1]-a[1]);
  $('#gcards').innerHTML=res.slice(0,15).map(([i,sc,why])=>genCard(st,i,why.length?`<span class="why">${why.slice(0,2).join(' · ')}</span>`:'')).join('');
  wireCards($('#gcards'));}

/* =========================================================
   COMPARE
   ========================================================= */
let CMP=(store.get('cmp',['נועה','מאיה','תמר','שירה'])).filter(n=>IDX.has(n)).slice(0,4);
const PRESETS=[[t=>t('מלכות הבנות','Queens'),'נועה,מיכל,אסתר,עדן'],[t=>t('מלכי הבנים','Kings'),'דוד,יוסף,מוחמד,משה'],[t=>t('שנות ה-80','The 80s'),'מורן,שירן,סיון,קרן'],[t=>t('הדור החדש','New wave'),'לביא,אריאל,רפאל,הלל'],[t=>t('יוניסקס','Unisex'),'טל,בר,עדי,שחר'],[t=>t('גשרים','Bridges'),'אדם,אמיר,יוסף,עומר']];
function renderCompare(){const st=stats(F),sec=$('#tab-compare');
  sec.innerHTML=`${secChips()}<div class="card" style="margin-top:12px">
      <div class="head"><div><h3>${t('השוואת שמות','Compare names')}</h3><div class="sub">${t('עד 4 שמות על אותו גרף · כמה תינוקות מכל 1,000 קיבלו את השם בכל שנה','Up to 4 names · babies per 1,000 given the name each year')}</div></div></div>
      <div class="cmpin"><input class="inp" id="cq" placeholder="${t('הוסיפו שם להשוואה','Add a name')}" autocomplete="off" aria-label="${t('הוספת שם להשוואה','Add a name')}"><div class="sugg" id="csugg" hidden></div></div>
      <div id="ctags" class="ctags">${CMP.map((n,k)=>`<span class="tag" style="border-color:var(${CC[k]})">${nmh(IDX.get(n))}<button data-x="${esc(n)}" aria-label="${t('הסרה','Remove')}">×</button></span>`).join('')||`<span class="sub">${t('הוסיפו שם כדי להתחיל','Add a name to start')}</span>`}</div>
      <div class="cw" style="height:320px"><canvas id="cmpChart"></canvas></div>
      ${compareTableHTML(st)}
      ${CMP.length>1?`<div class="cmpact"><button class="copybtn" id="cmplink">${icon('link')} ${t('קישור לשיתוף ההשוואה','Share this comparison')}</button></div>`:''}
      <div class="chips" id="presets">${PRESETS.map(([l,v])=>`<button data-p="${v}">${l(t)}</button>`).join('')}</div></div>`;
  {const cl=$('#cmplink');if(cl)cl.onclick=()=>{const u=compareLink();if(navigator.share&&matchMedia('(pointer:coarse)').matches)navigator.share({title:t('השוואת שמות','Name comparison'),text:CMP.join(' · '),url:u}).catch(()=>{});else copy(u)}}
  sec.querySelectorAll('.cmptbl [data-i]').forEach(b=>b.onclick=()=>pick(+b.dataset.i));
  wireSearch($('#cq'),$('#csugg'),i=>{const n=NAMES[i];if(!CMP.includes(n)){if(CMP.length>=4)CMP.shift();CMP.push(n)}store.set('cmp',CMP);renderCompare()});
  $('#ctags').onclick=e=>{const b=e.target.closest('[data-x]');if(b){CMP=CMP.filter(n=>n!==b.dataset.x);store.set('cmp',CMP);renderCompare()}};
  $('#presets').onclick=e=>{const b=e.target.closest('[data-p]');if(b){CMP=b.dataset.p.split(',').filter(n=>IDX.has(n));store.set('cmp',CMP);renderCompare()}};
  const o=chartBase();o.plugins.tooltip.callbacks={label:q=>` ${q.dataset.label}: ${q.parsed.y.toFixed(2)}${t(' לאלף',' per 1,000')}`};
  mk('cmpChart',{type:'line',data:{labels:YEARS,datasets:CMP.map((n,k)=>line(NM(IDX.get(n)),share(st,IDX.get(n)),css(CC[k])))},options:o});}

/* =========================================================
   MY NAME (quiz + family)
   ========================================================= */
let ME=store.get('me',null);const ME_EX={n:'נועה',y:2005,x:0,ex:true};
let FAM=store.get('fam',null);const FAM_EX=[{n:'משה',y:1955},{n:'רחל',y:1958},{n:'מיכל',y:1982},{n:'נועה',y:2008}];
function persona(tier,timing,x){const g=(f,m)=>x?m:f;const P={
  unicorn:[t('חד-קרן','The Unicorn'),t('פחות מ-5 תינוקות מאותו מין קיבלו את השם בשנה שלך. אין עוד כמוך בשנתון.','Fewer than 5 same-sex babies got your name that year. You are one of a kind.')],
  pioneer_hi:[t(g('הטרנדסטרית','הטרנדסטר'),'The Trendsetter'),t('נולדת לפני שהשם הגיע לשיא. היית שם לפני שזה היה מגניב.','You were born before the name peaked. You were there before it was cool.')],
  pioneer_lo:[t('המגלה','The Discoverer'),t('ההורים שלך מצאו את השם לפני כמעט כולם.','Your parents found this name before almost anyone else.')],
  wave_hi:[t(g('כוכבת הדור','כוכב הדור'),'Face of a Generation'),t('השם שלך הגדיר את השנתון. בכל כיתה היה עוד אחד או שניים.','Your name defined your year. Every class had one or two more.')],
  wave_lo:[t('בתזמון מושלם','Perfect Timing'),t('נולדת בדיוק כשהשם היה בשיא, אבל הוא אף פעם לא היה המוני.','Born right at the name’s peak, yet it never got crowded.')],
  classic_hi:[t('הקלאסיקה','The Classic'),t('שם שעבר דורות. ההורים שלך בחרו בבטוח והאהוב.','A name that spans generations. Your parents picked the beloved and safe.')],
  classic_lo:[t('הוינטג׳','The Vintage Soul'),t('שם עם נשמה ישנה, שנבחר אחרי שהשיא שלו כבר עבר.','A name with an old soul, chosen after its heyday.')]};
  if(tier===5)return P.unicorn;const hi=tier<=1;return P[`${timing}_${hi?'hi':'lo'}`];}
function renderMe(){
  const sec=$('#tab-me');const me=ME||ME_EX;
  sec.innerHTML=`<div class="card meq" style="margin-top:16px">
    <div class="head"><div><h3>${t('מה השם שלך אומר עליך?','What does your name say about you?')}</h3><div class="sub">${t('הכניסו שם, שנת לידה ומין, וקבלו פרופיל מבוסס נתונים','Enter a name, birth year and sex, and get a data-driven profile')}</div></div></div>
    <div class="meform"><label class="mefl" for="meq">${t('השם שלך','Your name')}</label><label class="mefl" for="mey">${t('שנת לידה','Birth year')}</label><span class="mefl mefl-x">${t('מין','Sex')}</span><div class="cmpin" style="margin:0"><input class="inp" id="meq" value="${esc(LANG==='en'?rom(IDX.get(me.n)):me.n)}" autocomplete="off" aria-label="${t('השם שלך','Your name')}"><div class="sugg" id="mesugg" hidden></div></div>
      <select class="inp" id="mey" aria-label="${t('שנת לידה','Birth year')}">${YEARS.slice().reverse().map(y=>`<option ${y===me.y?'selected':''}>${y}</option>`).join('')}</select>
      <div class="seg" id="mex"><button data-x="0" aria-pressed="${me.x===0}">${t('בת','Girl')}</button><button data-x="1" aria-pressed="${me.x===1}">${t('בן','Boy')}</button></div></div>
    ${me.ex?`<div class="exnote">${t('זו דוגמה. הכניסו את השם שלכם כדי לראות את שלכם.','This is an example. Enter your own name to see yours.')}</div>`:''}
    <div id="meout"></div></div>
  <div class="card" style="margin-top:14px">
    <div class="head"><div><h3>${t('השמות במשפחה שלי','My family’s names')}</h3><div class="sub">${t('הוסיפו את בני המשפחה עם שנת הלידה, וגלו כמה ייחודית המשפחה שלכם','Add family members with their birth years and see how unique your family is')}</div></div></div>
    ${FAM?'':`<div class="exnote">${t('משפחה לדוגמה. ערכו או הוסיפו כדי ליצור את שלכם.','Example family. Edit or add members to make it yours.')}</div>`}
    <div id="famrows" class="famrows"></div>
    <div class="actions"><button class="copybtn" id="famadd">${t('+ הוספת בן/בת משפחה','+ Add member')}</button></div>
    <div id="famout"></div></div>`;
  let pendingI=IDX.get(me.n);
  const run=()=>{const i=pendingI;if(i==null)return;ME={n:NAMES[i],y:+$('#mey').value,x:+($('#mex [aria-pressed="true"]')?.dataset.x||0)};store.set('me',ME);const ex=document.querySelector('.meq .exnote');if(ex)ex.remove();drawMe(ME);};
  const onMe=i=>{pendingI=i;$('#meq').value=NM(i);const st=stats(-1);const x=st.tot[0][i]>=st.tot[1][i]?0:1;$('#mex').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',+b.dataset.x===x));run()};
  wireSearch($('#meq'),$('#mesugg'),onMe);
  /* a fully typed name counts even without picking it from the list; the sex follows the name */
  $('#meq').addEventListener('change',()=>{const v=$('#meq').value.trim().replace(/[׳`]/g,"'");const i=IDX.has(v)?IDX.get(v):suggest(v,1)[0];if(i!=null&&i!==pendingI&&(NAMES[i]===v||rom(i).toLowerCase()===v.toLowerCase()))onMe(i)});
  $('#mey').onchange=run;$('#mex').onclick=e=>{const b=e.target.closest('[data-x]');if(!b)return;$('#mex').querySelectorAll('button').forEach(q=>q.setAttribute('aria-pressed',q===b));run()};
  drawMe(me);drawFam();
}
function drawMe(me){
  const st=stats(-1),i=IDX.get(me.n),x=me.x,yi=me.y-Y0,dn=nmh(i);const out=$('#meout');
  const n=st.Y[x][i*NY+yi],r=st.rank[x][i*NY+yi],D=st.D[x][yi];
  const sh=YEARS.map((_,y)=>st.D[x][y]?st.Y[x][i*NY+y]/st.D[x][y]:0);let pk=0;for(let y=1;y<NY;y++)if(sh[y]>sh[pk])pk=y;
  const tier=!n?5:r<=10?0:r<=50?1:r<=200?2:r<=600?3:4;
  const tierLab=[t('סופר-מיינסטרים','Super mainstream'),t('פופולרי','Popular'),t('מוכר','Familiar'),t('מיוחד','Distinctive'),t('נדיר','Rare'),t('נדיר ביותר','Ultra rare')][tier];
  const diff=me.y-(Y0+pk);const timing=!sh[pk]||pk===0?'classic':diff<-4?'pioneer':diff>4?'classic':'wave';
  const [title,desc]=persona(tier,timing,x);
  const peers=st.top[x][yi].slice(0,6);
  let best=-1,bs=0;for(let j=0;j<N;j++){const q=st.Y[x][j*NY+yi];if(q<60)continue;let s=0;for(let y=0;y<NY;y++)s+=st.Y[x][j*NY+y];const c=q/(s/NY);if(c>bs){bs=c;best=j}}
  const other=st.Y[1-x][i*NY+yi];
  const timingTxt=!sh[pk]?'':pk===0?t(`השם היה בשיא כבר בתחילת הרישום (${Y0}).`,`The name was already at its peak when records began (${Y0}).`):diff<-4?t(`נולדת ${-diff} שנים לפני שהשם הגיע לשיא (${Y0+pk}).`,`You were born ${-diff} years before the name peaked (${Y0+pk}).`):diff>4?t(`נולדת ${diff} שנים אחרי שיא השם (${Y0+pk}).`,`You were born ${diff} years after the name peaked (${Y0+pk}).`):t(`נולדת ממש בשיא של השם (${Y0+pk}).`,`You were born right at the name’s peak (${Y0+pk}).`);
  const sex=x?t('בנים','boys'):t('בנות','girls');
  const pctv=n/D*100,pct=(pctv>=10?pctv.toFixed(0):pctv>=1?pctv.toFixed(1):pctv>=.1?pctv.toFixed(2):pctv.toFixed(3))+'%';
  const pd=n/365,perDay=pd>=1.5?t(`בערך ${Math.round(pd)} ביום`,`about ${Math.round(pd)} a day`):pd>=.75?t('בערך אחד ביום','about one a day'):pd>=1/7?t(`בערך ${Math.round(pd*7)} בשבוע`,`about ${Math.round(pd*7)} a week`):t(`בערך ${Math.max(1,Math.round(n/12))} בחודש`,`about ${Math.max(1,Math.round(n/12))} a month`);
  out.innerHTML=`<div class="persona fade"><div class="ptitle">${title}</div><p>${desc}</p>${LANG!=='en'&&MEAN.has(me.n)?`<p class="pmean"><b>${esc(me.n)}:</b> ${esc(MEAN.get(me.n))}</p>`:''}</div>
    <div class="mestats">
      <div class="stat"><div class="k">${t('בשנתון שלך','In your birth year')}</div><div class="v">${n?fmt(n):'<5'}</div><div class="s">${t(`${sex} בשם ${esc(me.n)} ב-${me.y}`,`${sex} named ${dn} in ${me.y}`)}${n?t(` · ${perDay}`,` · ${perDay}`):''}${other?t(` (ועוד ${fmt(other)} ${x?'בנות':'בנים'})`,` (+${fmt(other)} ${x?'girls':'boys'})`):''}</div></div>
      <div class="stat"><div class="k">${t('שכיחות בשנתון','Share of your year')}</div><div class="v">${n?pct:'—'}</div><div class="s">${n?t(`אחת מכל ${fmt(D/n)} ${sex}`.replace('אחת',x?'אחד':'אחת'),`1 in ${fmt(D/n)} ${sex}`):''}${n?' · ':''}${tierLab}${r?` · ${t('מקום ','#')}${r}`:''}</div></div>
      <div class="stat"><div class="k">${t('תזמון','Timing')}</div><div class="v">${sh[pk]?Y0+pk:'—'}</div><div class="s">${timingTxt}</div></div>
      <div class="stat"><div class="k">${t('השמות של השנתון שלך','Your year’s top names')}</div><div class="v sm">${peers.slice(0,3).map(nmh).join(', ')}</div><div class="s">${t('המובילים ב-','Top in ')}${me.y}</div></div>
    </div>
    ${best>=0?`<div class="sub" style="margin-top:12px">${t(`השם שהכי ״שייך״ ל-${me.y}: `,`The name that most belongs to ${me.y}: `)}<button class="chip" data-i="${best}">${nmh(best)}</button></div>`:''}
    <div class="cw sm" style="margin-top:12px"><canvas id="meChart"></canvas></div>
    <div class="actions"><button class="next" id="mecard">${t('כרטיס לשיתוף','Share card')}</button><button class="copybtn" id="mecopy">${t('העתקת התוצאה','Copy result')}</button><button class="copybtn" data-i="${i}">${t('לתיק השם המלא','Open full name file')}</button></div>`;
  openOn(out);
  const o=chartBase();o.plugins.tooltip.callbacks={label:q=>` ${q.parsed.y.toFixed(2)}${t(' לאלף',' per 1,000')}`};
  const data=sh.map(v=>v*1000);
  mk('meChart',{type:'line',data:{labels:YEARS,datasets:[{...line(NM(i),data,css(x?'--boy':'--girl'),true),pointRadius:YEARS.map(y=>y===me.y?7:0),pointBackgroundColor:css('--stamp'),pointBorderColor:css('--surface'),pointBorderWidth:2}]},options:o});
  $('#mecard').onclick=async()=>{const cv=await makeMeCard(me,{title,desc,n,D,pct,tierLab,sh,peers,sexw:sex});showCard(cv,`${rom(i)}-${me.y}-names-of-israel.png`,`${me.n} ${me.y}`,t('הכרטיס שלך','Your card'))};
  $('#mecopy').onclick=()=>copy(t(`${me.n} (${me.y}): ${title}. ${n?`אחד מכל ${fmt(D/n)} ${sex} בשנתון.`:'פחות מ-5 בשנתון!'} ${timingTxt} (השמות של ישראל, נוצר ע״י עידן דיוה)`,`${NM(i)} (${me.y}): ${title}. ${n?`1 in ${fmt(D/n)} ${sex} that year.`:'Under 5 that year!'} ${timingTxt} (Names of Israel, made by Idan Diva)`));
}
function drawFam(){
  const fam=(FAM||FAM_EX).filter(m=>IDX.has(m.n));const box=$('#famrows');
  box.innerHTML=fam.map((m,k)=>`<div class="famrow" data-k="${k}"><div class="cmpin" style="margin:0"><input class="inp" value="${esc(LANG==='en'?rom(IDX.get(m.n)):m.n)}" data-role="n" autocomplete="off" aria-label="${t('שם','Name')}"><div class="sugg" hidden></div></div>
    <select class="inp" data-role="y" aria-label="${t('שנת לידה','Birth year')}">${YEARS.slice().reverse().map(y=>`<option ${y===m.y?'selected':''}>${y}</option>`).join('')}</select>
    <button class="copybtn" data-role="del" aria-label="${t('הסרה','Remove')}">×</button></div>`).join('');
  const save=f=>{FAM=f;store.set('fam',FAM)};
  box.querySelectorAll('.famrow').forEach(row=>{const k=+row.dataset.k;const inp=row.querySelector('input');
    wireSearch(inp,row.querySelector('.sugg'),i=>{const f=fam.slice();f[k]={...f[k],n:NAMES[i]};save(f);renderMe()});
    row.querySelector('select').onchange=e=>{const f=fam.slice();f[k]={...f[k],y:+e.target.value};save(f);drawFam()};
    row.querySelector('[data-role="del"]').onclick=()=>{const f=fam.slice();f.splice(k,1);save(f);renderMe()};});
  $('#famadd').onclick=()=>{const f=fam.slice();if(f.length>=8){toast(t('עד 8 בני משפחה','Up to 8 members'));return}f.push({n:'דוד',y:2015});save(f);renderMe()};
  const st=stats(-1);
  const rows=fam.map(m=>{const i=IDX.get(m.n),yi=m.y-Y0;const x=st.tot[0][i]>=st.tot[1][i]?0:1;const cnt=st.Y[x][i*NY+yi];const D=st.D[x][yi];
    const sh=YEARS.map((_,y)=>st.D[x][y]?st.Y[x][i*NY+y]/st.D[x][y]:0);let pk=0;for(let y=1;y<NY;y++)if(sh[y]>sh[pk])pk=y;
    return{...m,i,x,cnt,oneIn:cnt?D/cnt:D/4,rank:st.rank[x][i*NY+yi],pk:Y0+pk}});
  if(!rows.length){$('#famout').innerHTML='';return}
  const score=Math.max(0,Math.min(100,Math.round(rows.reduce((a,r)=>a+Math.log10(r.oneIn),0)/rows.length/4*100)));
  const label=score>=75?t('משפחה של חדי-קרן','A family of unicorns'):score>=55?t('משפחה מקורית','An original family'):score>=35?t('משפחה עם טעם קלאסי','A family with classic taste'):t('משפחה מיינסטרים לגמרי','A totally mainstream family');
  const rarest=rows.reduce((a,b)=>b.oneIn>a.oneIn?b:a),onTime=rows.reduce((a,b)=>Math.abs(b.y-b.pk)<Math.abs(a.y-a.pk)?b:a);
  $('#famout').innerHTML=`<div class="famscore"><div><div class="big1 tn">${score}</div><div class="sub">${t('ציון ייחודיות (0–100)','Uniqueness score (0–100)')}</div></div><div><div class="ptitle sm">${label}</div>
     <div class="sub">${t(`הכי נדיר/ה: <b>${esc(rarest.n)}</b> (1 מכל ${fmt(rarest.oneIn)}). הכי ״בזמן״: <b>${esc(onTime.n)}</b>, נולד/ה ${Math.abs(onTime.y-onTime.pk)} שנים מהשיא של השם.`,`Rarest: <b>${nmh(rarest.i)}</b> (1 in ${fmt(rarest.oneIn)}). Most on-trend: <b>${nmh(onTime.i)}</b>, born ${Math.abs(onTime.y-onTime.pk)} years from the name’s peak.`)}</div></div></div>
    <div class="famtable">${rows.map(r=>`<button data-i="${r.i}"><b>${nmh(r.i)}</b><span>${r.y}</span><span>${r.cnt?t('1 מכל ','1 in ')+fmt(r.oneIn):t('פחות מ-5','under 5')}</span><span class="bar"><i style="width:${Math.min(100,Math.log10(r.oneIn)/4*100)}%"></i></span></button>`).join('')}</div>
    <div class="cw sm" style="margin-top:12px"><canvas id="famChart"></canvas></div><div class="legend" id="famleg"></div>`;
  openOn($('#famout'));
  const uniq=[...new Set(rows.map(r=>r.i))].slice(0,4);
  const o=chartBase();o.plugins.tooltip.callbacks={label:q=>` ${q.dataset.label}: ${q.parsed.y.toFixed(2)}${t(' לאלף',' per 1,000')}`};
  mk('famChart',{type:'line',data:{labels:YEARS,datasets:uniq.map((i,k)=>{const yrs=rows.filter(r=>r.i===i).map(r=>r.y);return{...line(NM(i),share(st,i),css(CC[k])),pointRadius:YEARS.map(y=>yrs.includes(y)?6:0),pointBackgroundColor:css(CC[k])}})},options:o});
  $('#famleg').innerHTML=legendHTML(uniq.map((i,k)=>[CC[k],NM(i)]))+`<span>${t('נקודה = שנת הלידה','Dot = birth year')}</span>`;
}

function drawHomeSaved(){const el=$('#homesaved');if(!el)return;if(!FAV.length){el.hidden=true;return}el.hidden=false;
  el.innerHTML=`<div class="head"><div><h3>${t('השמות ששמרתי','My saved names')} <span class="cnt">${FAV.length}</span></h3></div><div class="ctrls"><button class="copybtn" id="hscopy">${icon('copy')} ${t('העתקה','Copy')}</button>${FAV.length>1?`<button class="copybtn" id="hscmp">${icon('chart')} ${t('השוואה','Compare')}</button>`:''}</div></div>
    <div class="chips savedchips">${FAV.map(n=>`<button data-q="${IDX.get(n)}">${nmh(IDX.get(n))}</button>`).join('')}</div>`;
  el.querySelector('.savedchips').onclick=e=>{const b=e.target.closest('[data-q]');if(b)quickView(+b.dataset.q)};
  $('#hscopy').onclick=()=>copy(favText());const c=$('#hscmp');if(c)c.onclick=favCompare;}
