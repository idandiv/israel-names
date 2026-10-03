/* =========================================================
   GAMES
   ========================================================= */
let GAME_BUILT=null;
const G={hl:null,streak:0,best:store.get('best',0),q:null,qs:0,qn:0,gg:null,ggs:0,ggn:0,};
let GSEC=store.get('gsec','all');if(!['all','jew','arab'].includes(GSEC))GSEC='all';
function gOk(i){if(GSEC==='all')return true;const w=SECTOT[i],tt=w[0]+w[1]+w[2]+w[3];if(!tt)return false;return GSEC==='jew'?w[0]/tt>=.7:(w[1]+w[2]+w[3])/tt>=.7}
const gMin=(v)=>GSEC==='arab'?Math.round(v/5):v;
function gsecBar(){return `<div class="card wide gsecbar"><span class="nml">${t('השמות במשחקים הקצרים:','Names in the quick games:')}</span><div class="chips sel" id="gsec">${[['all',t('כל המגזרים','All communities')],['jew',t('שמות יהודיים','Jewish names')],['arab',t('שמות ערביים','Arab names')]].map(([k,l])=>`<button data-gs="${k}" aria-pressed="${GSEC===k}">${l}</button>`).join('')}</div></div>`}
function renderGame(){if(GAME_BUILT!==LANG)YG.cur=null;const sec=$('#tab-game');const key=LANG;
  if(GAME_BUILT!==key||!sec.firstChild){GAME_BUILT=key;G.hl=null;G.q=null;G.gg=null;
    sec.innerHTML=`<div class="gamegrid">
      <div class="card wide namle" id="g-namle"></div>
      ${gsecBar()}
      <div class="card wide" id="g-yg"></div>
      <div class="card" id="g-hl"></div>
      <div class="card" id="g-dec"></div>
      <div class="card wide" id="g-graph"></div></div>`;
    const gf=$('#gofull2');if(gf)gf.onclick=()=>setMode('full');
    $('#g-namle').addEventListener('click',onNamleClick);
    $('#gsec').onclick=e=>{const b=e.target.closest('[data-gs]');if(!b||b.dataset.gs===GSEC)return;GSEC=b.dataset.gs;store.set('gsec',GSEC);$('#gsec').querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b));
      YG.cur=null;YG.streak=0;G.hl=null;G.streak=0;G.q=null;G.qs=0;G.qn=0;G.gg=null;G.ggs=0;G.ggn=0;renderYG();renderHL();renderGG();renderDec()};}
  renderNamle();renderYG();renderHL();renderGG();renderDec();}

/* personal bests (this device only) */
const LB={my:store.get('myscore',{})};
function lbSave(p){Object.assign(LB.my,p);store.set('myscore',LB.my)}

/* --- Secret name --- */

const MAXG=10;
const NML={state:null,fresh:false};
let NOPT=Object.assign({sec:'all',lvl:'e'},store.get('nopt',{}));
const NLV={all:{e:[10000,1e9],m:[3000,10000],h:[800,3000]},'0':{e:[8000,1e9],m:[2000,8000],h:[500,2000]},'1':{e:[3000,1e9],m:[1000,3000],h:[300,1000]}};
const nmodeKey=()=>NOPT.sec+NOPT.lvl;
function nmodeLabel(){return `${{all:t('מעורב','Mixed'),'0':t('יהודי','Jewish'),'1':t('מוסלמי','Muslim')}[NOPT.sec]} · ${{e:t('קל','Easy'),m:t('בינוני','Medium'),h:t('קשה','Hard')}[NOPT.lvl]}`}
function todayKey(){const d=new Date();return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`}
function dayNum(){const d=new Date();return Math.floor((Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())-Date.UTC(2026,9,1))/864e5)+1}
function hash(s){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
const NAT=/עץ|פרח|צמח|שיח|נהר|אגם|אגם מים|הר |אבן|ציפור|עוף|אריה|צבי|זאב|דוב|ירח|גל |טל |עונת|ענב|פרי|שתיל|ניצן|אלמוג|פנינה|זהב|נחל|שדה|יער|דבש|זריחת|שמש|כוכב|ים"|ים\.|חודש/;
function catOf(i){const m=MEAN.get(NAMES[i]);if(!m)return null;
  if(/^שם מקראי/.test(m))return 'bib';
  if(/^(בערבית|הצורה הערבית|בפרסית)/.test(m))return 'arab';
  if(/^(שם עברי|בעברית|בארמית)/.test(m)){const body=m.split(/[.]/)[0];return NAT.test(body)?'nat':'heb'}
  return 'intl';}
const catLab=c=>c?{bib:t('תנ״כי','Biblical'),heb:t('עברי','Hebrew'),nat:t('טבע','Nature'),arab:t('ערבי','Arabic'),intl:t('בינלאומי','International')}[c]:'?';
function namlePool(){const st=stats(-1);let [lo,hi]=NLV[NOPT.sec][NOPT.lvl];
  /* Muslim names rarely have curated meanings, so that pool doesn't require one; and any pool that is too small
     is widened downward until it has at least 40 names, so the daily name never loops over a handful. */
  const needMean=NOPT.sec!=='1';
  const build=()=>{const p=[];for(let i=0;i<N;i++){if(needMean&&!MEAN.has(NAMES[i])||/[^א-ת]/.test(NAMES[i]))continue;
    if(NOPT.sec==='all'){const v=T(st,i);if(v>=lo&&v<hi)p.push(i)}else{const s=+NOPT.sec,w=SECTOT[i],tt=w[0]+w[1]+w[2]+w[3];if(w[s]/tt>=.7&&w[s]>=lo&&w[s]<hi)p.push(i)}}return p};
  let p=build();while(p.length<40&&lo>25){lo=Math.floor(lo/1.6);p=build()}
  if(p.length<5){for(let i=0;i<N&&p.length<40;i++)if(MEAN.has(NAMES[i])&&!p.includes(i))p.push(i)}return p}
function attr(i){const st=stats(-1);const s=T(st,i),gp=s?st.tot[0][i]/s:.5;return{sex:gp>=.7?0:gp<=.3?1:2,dec:peakDec(st,i),tot:s,gem:GEMS[i],sec:domSec(i),cat:catOf(i)}}
const sexLab=s=>[t('בת','Girl'),t('בן','Boy'),t('יוניסקס','Unisex')][s];
const lettersOf=n=>[...n].filter(c=>GEM[c]).map(c=>FIN[c]||c);
function wordle(g,s){const G_=lettersOf(g),S=lettersOf(s);const res=G_.map(()=>'x');const left={};
  S.forEach((c,k)=>{if(G_[k]===c)res[k]='g';else left[c]=(left[c]||0)+1});
  G_.forEach((c,k)=>{if(res[k]==='g')return;if(left[c]){res[k]='y';left[c]--}});return{L:G_,res}}
function namleDaily(p,mk){const a=p.slice().sort((x,y)=>NAMES[x]<NAMES[y]?-1:NAMES[x]>NAMES[y]?1:0);const rnd=mulberry32(hash('bnil-daily-'+mk));
  for(let k=a.length-1;k>0;k--){const j=Math.floor(rnd()*(k+1));[a[k],a[j]]=[a[j],a[k]]}const d=dayNum()-1;return a[((d%a.length)+a.length)%a.length]}
function namleNew(mode){const p=namlePool();const key=todayKey(),mk=nmodeKey();
  if(mode==='daily'){let saved=store.get('namle2_'+key+'_'+mk,null);if(saved&&saved.sn){if(IDX.has(saved.sn)){saved.secret=IDX.get(saved.sn);saved.guesses=(saved.gn||[]).filter(n=>IDX.has(n)).map(n=>IDX.get(n))}else saved=null}NML.state=saved||{mode,key,mk,day:dayNum(),secret:namleDaily(p,mk),guesses:[],hint:false,reveal:[],done:false,won:false,shown:false}}
  else NML.state={mode,mk,secret:rand(p),guesses:[],hint:false,reveal:[],done:false,won:false,shown:false};}
function namleSave(){if(NML.state.mode==='daily'){const s=NML.state;store.set('namle2_'+s.key+'_'+s.mk,Object.assign({},s,{sn:NAMES[s.secret],gn:s.guesses.map(i=>NAMES[i])}));nstatRecord(NML.state)}}
const triesUsed=s=>s.guesses.length+(s.hint?1:0);
function lockedMask(s){const S=lettersOf(NAMES[s.secret]);const lock=S.map(()=>false);
  s.guesses.forEach(i=>{const w=wordle(NAMES[i],NAMES[s.secret]);w.res.forEach((r,k)=>{if(r==='g'&&k<S.length)lock[k]=true})});
  s.reveal.forEach(k=>lock[k]=true);return{S,lock}}
function renderNamle(){const el=$('#g-namle');
  if(!NML.state||(NML.state.mode==='daily'&&NML.state.key!==todayKey())||NML.state.mk!==nmodeKey())namleNew(NML.state&&NML.state.mode==='free'?'free':'daily');
  const s=NML.state,A=attr(s.secret);
  const arrow=(g,v)=>g<v?'↑':'↓';
  const cell=(cls,main,sub)=>`<div class="${cls}">${main}${sub?`<small>${sub}</small>`:''}</div>`;
  const rows=s.guesses.map((i,ri)=>{const a=attr(i);const w=wordle(NAMES[i],NAMES[s.secret]);const fresh=NML.fresh&&ri===s.guesses.length-1;
    const tiles=`<div class="tiles">${w.L.map((c,k)=>`<i class="t-${w.res[k]}" style="animation-delay:${fresh?k*90:0}ms">${c}</i>`).join('')}</div>`;
    const tr=a.tot/A.tot,gd=Math.abs(a.gem-A.gem),dd=Math.abs(a.dec-A.dec);
    const decL=a.dec===1940?(LANG==='en'?'1940s':'ה-40'):(LANG==='en'?`${a.dec}s`:`ה-${String(a.dec).slice(2)}`);
    return `<div class="nrow ${fresh?'fresh':''}"><div class="nmcell">${tiles}${LANG==='en'?`<small>${esc(rom(i))}</small>`:''}</div>
      ${cell(a.sex===A.sex?'ok':'',sexLab(a.sex))}${cell(a.sec===A.sec?'ok':'',sectName(a.sec))}${cell(a.cat&&a.cat===A.cat?'ok':'',catLab(a.cat))}
      ${dd===0?cell('ok',decL):cell(dd<=10?'near':'',decL,a.dec<A.dec?t('↑ מאוחר יותר','↑ later'):t('↓ מוקדם יותר','↓ earlier'))}
      ${tr>=.8&&tr<=1.25?cell('ok',kfmt(a.tot)):cell(tr>=.5&&tr<=2?'near':'',kfmt(a.tot),arrow(a.tot,A.tot))}
      ${gd===0?cell('ok',a.gem,t('בול!','exact!')):gd<=30?cell('hot',a.gem,`${arrow(a.gem,A.gem)} ${t('רותח!','hot!')}`):gd<=80?cell('near',a.gem,`${arrow(a.gem,A.gem)} ${t('חם','warm')}`):cell('',a.gem,arrow(a.gem,A.gem))}</div>`}).join('');
  NML.fresh=false;
  const left=MAXG-triesUsed(s);
  const {S,lock}=lockedMask(s);
  const mask=`<div class="mask" aria-label="${t('תבנית השם','Name pattern')}">${S.map((c,k)=>lock[k]||s.done?`<i class="on">${c}</i>`:'<i></i>').join('')}</div>`;
  const dots=`<div class="tries">${Array.from({length:MAXG},(_,k)=>`<i class="${k<s.guesses.length?'u':k<triesUsed(s)?'h':''}"></i>`).join('')}<span>${t(left===1?'נותר ניסיון אחד':`נותרו ${left} ניסיונות`,left===1?'1 try left':`${left} tries left`)}</span></div>`;
  const teaser=s.hint?(()=>{const st=stats(-1),c=comb(st,s.secret),n=c[NY-1],md=st.med[s.secret];return t(`נחשפה אות אחת. בנוסף: ${n?`ב-${Y1} קיבלו את השם ${fmt(n)} תינוקות`:`ב-${Y1} כמעט לא ניתן`}, ושנת הלידה הטיפוסית היא ${md}.`,`One letter revealed. Also: ${n?`${fmt(n)} babies got it in ${Y1}`:`almost none in ${Y1}`}, typical birth year ${md}.`)})():'';
  el.innerHTML=`<div class="head"><div><h3>${t('השם הסודי','The secret name')} ${s.mode==='daily'?`<span class="daynum">#${s.day}</span>`:''}</h3><div class="sub">${s.mode==='daily'?t('שם חדש בכל יום בחצות. ','A new name every day at midnight. '):t('משחק חופשי. ','Free play. ')}${t(`${MAXG} ניסיונות. האותיות נצבעות כמו בוורדל, והעמודות מכוונות אתכם.`,`${MAXG} tries. Letters color like Wordle; the columns steer you.`)}</div></div>
      <div class="seg"><button data-nm="daily" aria-pressed="${s.mode==='daily'}">${t('היומי','Daily')}</button><button data-nm="free" aria-pressed="${s.mode==='free'}">${t('חופשי','Free')}</button></div></div>
    <div class="nopts"><div class="fl"><span>${t('איזה שם?','Which name?')}</span><div class="seg wrap">${[['all',t('מעורב','Mixed')],['0',t('שם יהודי','Jewish name')],['1',t('שם מוסלמי','Muslim name')]].map(([v,l])=>`<button data-ns="${v}" aria-pressed="${NOPT.sec===v}">${l}</button>`).join('')}</div></div>
      <div class="fl"><span>${t('רמת קושי','Difficulty')}</span><div class="seg">${[['e',t('קל','Easy')],['m',t('בינוני','Medium')],['h',t('קשה','Hard')]].map(([v,l])=>`<button data-nl="${v}" aria-pressed="${NOPT.lvl===v}">${l}</button>`).join('')}</div></div></div>
    <div class="nboard">${mask}${dots}</div>
    ${s.hint?`<div class="hintbox"><b>${t('גלגל הצלה:','Lifeline:')}</b> ${esc(teaser)}</div>`:''}
    <div class="nwrap"><div><div class="nrow h"><div>${t('הניחוש','Guess')}</div><div>${t('מין','Sex')}</div><div>${t('מגזר','Community')}</div><div>${t('סוג השם','Type')}</div><div>${t('עשור שיא','Peak')}</div><div>${t('תינוקות','Babies')}</div><div>${t('גימטריה','Gematria')}</div></div>${rows||`<div class="nempty">${t('הניחוש הראשון שלכם יופיע כאן','Your first guess will appear here')}</div>`}</div></div>
    <div class="legendn"><span><i class="t-g"></i>${t('אות במקום הנכון','right spot')}</span><span><i class="t-y"></i>${t('יש בשם, במקום אחר','in the name, elsewhere')}</span><span><i class="t-x"></i>${t('לא בשם','not in the name')}</span></div>
    ${s.done?`<div class="feedback big">${s.won?t(`<b>ניצחון!</b> ניחשתם ב-${triesUsed(s)} ניסיונות.`,`<b>You got it</b> in ${triesUsed(s)} tries.`):t('נגמרו הניסיונות.','Out of tries.')} ${t('השם הסודי:','The secret name:')} <b>${nmh(s.secret)}</b></div>
      <div class="actions"><button class="next" data-act="card">${t('כרטיס השם','Name card')}</button><button class="copybtn" data-act="share">${t('שיתוף התוצאה','Share result')}</button>${s.mode==='free'?`<button class="copybtn" data-act="again">${t('עוד סיבוב','Play again')}</button>`:`<button class="copybtn" data-act="free">${t('לשחק עוד במצב חופשי','Keep playing (free mode)')}</button>`}</div>`
      :`<div class="ninp"><input class="inp" id="nq" placeholder="${t('הקלידו ניחוש…','Type a guess…')}" autocomplete="off" aria-label="${t('ניחוש','Guess')}"><div class="sugg" id="nsugg" hidden></div>
        ${s.hint?'':`<button class="lifeline" data-act="hint" ${left<=1?'disabled':''}>${t('גלגל הצלה (עולה ניסיון)','Lifeline (costs a try)')}</button>`}</div>`}`;
  if(!s.done)wireSearch($('#nq'),$('#nsugg'),i=>{if(s.guesses.includes(i)){toast(t('כבר ניחשתם את השם הזה','Already guessed'));return}
    s.guesses.push(i);NML.fresh=true;
    if(i===s.secret){s.done=true;s.won=true}else if(triesUsed(s)>=MAXG)s.done=true;
    else{const gd=Math.abs(GEMS[i]-GEMS[s.secret]);if(gd>0&&gd<=30)toast(t('הגימטריה רותחת!','Gematria is hot!'))}
    namleSave();renderNamle();if(s.done&&!s.shown){s.shown=true;namleSave();setTimeout(()=>namleEnd(),s.won?900:500)}else{const q=$('#nq');if(q)q.focus()}},30);
}
function namleShare(){const s=NML.state;const lines=s.guesses.map(i=>wordle(NAMES[i],NAMES[s.secret]).res.map(r=>r==='g'?'●':r==='y'?'◐':'○').join(' '));const RL=LANG==='en'?'':'\u200F';
  return `${t('השם הסודי','The secret name')}${s.mode==='daily'?` #${s.day}`:''} · ${nmodeLabel()}\n${lines.map(l=>RL+l).join('\n')}\n${t('● במקום הנכון · ◐ בשם, במקום אחר · ○ לא בשם','● right spot · ◐ in the name · ○ not in it')}${s.hint?t('\n(עם גלגל הצלה)','\n(with a lifeline)'):''}\n${t('ניחוש','Guess')} ${s.won?triesUsed(s):'X'}/${MAXG}\n${s.won?t('הצלחתי לגלות את השם של היום!','I found today’s name!'):t('הפעם השם ניצח אותי…','The name beat me this time…')}\n${t('נסו גם אתם:','Try it:')} ${SHARE_URL}`}
function namleEnd(){const s=NML.state,i=s.secret,st=stats(-1);const c=comb(st,i);const x=st.tot[0][i]>=st.tot[1][i]?0:1;const d=peakDec(st,i);
  const decTop=[];{const ys=YEARS.map((y,k)=>k).filter(k=>Math.floor((Y0+k)/10)*10===d);const sc={};for(let j=0;j<N;j++){let v=0;for(const k of ys)v+=st.Y[x][j*NY+k];if(v)sc[j]=v}Object.entries(sc).sort((a,b)=>b[1]-a[1]).slice(0,7).forEach(([j])=>{if(+j!==i&&decTop.length<6)decTop.push(+j)})}
  const m=$('#modal');m.hidden=false;
  m.innerHTML=`<div class="mbox endcard" role="dialog" aria-label="${t('סיום המשחק','Game over')}"><button class="mclose" id="mclose" aria-label="${t('סגירה','Close')}">×</button>
    <div class="endk">${s.won?t(`ניצחון ב-${triesUsed(s)}/${MAXG}`,`Solved in ${triesUsed(s)}/${MAXG}`):t('הפעם לא הצלחתם','Not this time')}${s.mode==='daily'?` · #${s.day}`:''}</div>
    <div class="endn">${nmh(i)}</div>
    ${MEAN.has(NAMES[i])&&LANG!=='en'?`<p class="endm">${esc(MEAN.get(NAMES[i]))}</p>`:''}
    <div class="endst"><div><b>${fmt(c[NY-1])}</b><span>${t(`תינוקות ב-${Y1}`,`babies in ${Y1}`)}</span></div><div><b>${st.med[i]}</b><span>${t('שנת לידה טיפוסית','typical birth year')}</span></div><div><b>${kfmt(T(st,i))}</b><span>${t('מאז 1949','since 1949')}</span></div></div>
    ${s.mode==='daily'?nstatHTML():''}
    <div class="sub">${t(`עוד שמות ${x?'בנים':'בנות'} מ${decLabel(d)}:`,`More ${x?'boys':'girls'} from the ${decLabel(d)}:`)}</div>
    <div class="chips" id="endchips">${decTop.map(j=>`<button data-i="${j}">${nmh(j)}</button>`).join('')}</div>
    <div class="mrow"><button class="next" id="endshare">${t('שיתוף התוצאה','Share result')}</button><button class="copybtn" id="endopen">${t('לתיק השם המלא','Open full name file')}</button></div></div>`;
  const close=()=>{m.hidden=true};$('#mclose').onclick=close;m.onclick=e=>{if(e.target===m)close()};
  $('#endchips').onclick=e=>{const b=e.target.closest('[data-i]');if(b){close();pick(+b.dataset.i)}};
  $('#endopen').onclick=()=>{close();pick(i)};$('#endshare').onclick=()=>copy(namleShare());}
function onNamleClick(e){const o=e.target.closest('[data-ns],[data-nl]');if(o){if(o.dataset.ns)NOPT.sec=o.dataset.ns;else NOPT.lvl=o.dataset.nl;store.set('nopt',NOPT);renderNamle();return}
  const b=e.target.closest('[data-nm],[data-act]');if(!b)return;const s=NML.state;
  if(b.dataset.nm){if(b.dataset.nm==='free')namleNew('free');else NML.state=null;renderNamle();return}
  const a=b.dataset.act;
  if(a==='hint'){if(s.hint||s.done)return;s.hint=true;const {S,lock}=lockedMask(s);const free=S.map((_,k)=>k).filter(k=>!lock[k]);if(free.length)s.reveal.push(rand(free));
    if(triesUsed(s)>=MAXG)s.done=true;namleSave();renderNamle();if(s.done&&!s.shown){s.shown=true;namleSave();namleEnd()}return}
  if(a==='card')namleEnd();else if(a==='again'||a==='free'){namleNew('free');renderNamle()}
  else if(a==='share')copy(namleShare());
}


/* --- Guess from graph --- */
function newGG(){const st=stats(-1);const p=[];for(let i=0;i<N;i++)if(T(st,i)>=gMin(2500)&&gOk(i))p.push(i);const s=rand(p);const dom=st.tot[0][s]>=st.tot[1][s]?0:1;
  const same=p.filter(j=>j!==s&&(st.tot[0][j]>=st.tot[1][j]?0:1)===dom);G.gg={s,opts:shuffle([s,...shuffle(same).slice(0,3)]),done:false,pick:null}}
function renderGG(){const el=$('#g-graph');if(!G.gg)newGG();const g=G.gg,st=stats(-1);
  el.innerHTML=`<div class="head"><div><h3>${t('נחשו מהגרף','Guess from the graph')}</h3><div class="sub">${t('של איזה שם הסיפור הזה?','Whose story is this?')}</div></div><span class="pill acc tn">${G.ggs}/${G.ggn}</span></div>
    <div class="cw sm"><canvas id="ggc"></canvas></div>
    <div class="gopts">${g.opts.map(i=>`<button data-o="${i}" class="${g.done?(i===g.s?'win':(i===g.pick?'lose':'')):''}">${nmh(i)}</button>`).join('')}</div>
    ${g.done?`<div class="actions"><button class="next" id="ggn">${t('הבא ←','Next →')}</button><button class="copybtn" id="ggo">${t('לתיק של ','Open ')}${nmh(g.s)}</button></div>`:''}`;
  const o=chartBase();o.plugins.tooltip.enabled=false;o.scales.y.ticks.display=false;o.animation={duration:900};
  mk('ggc',{type:'line',data:{labels:YEARS,datasets:[line('?',share(st,g.s),css('--accent'),true)]},options:o});
  el.querySelectorAll('[data-o]').forEach(b=>b.onclick=()=>{if(g.done)return;g.done=true;g.pick=+b.dataset.o;G.ggn++;if(g.pick===g.s)G.ggs++;renderGG()});
  if(g.done){$('#ggn').onclick=()=>{newGG();renderGG()};$('#ggo').onclick=()=>pick(g.s)}}

/* --- Who's younger --- */
const YG={cur:null,streak:0,best:store.get('ygbest',0)};
function newYG(){const st=stats(-1);const p=[];for(let i=0;i<N;i++)if(T(st,i)>=gMin(1500)&&gOk(i))p.push(i);let a,b,k=0;do{a=rand(p);b=rand(p);k++}while((a===b||Math.abs(st.med[a]-st.med[b])<3)&&k<200);YG.cur={a,b,done:false}}
function renderYG(){const el=$('#g-yg');if(!el)return;if(!YG.cur)newYG();const st=stats(-1);const {a,b,done}=YG.cur;const win=st.med[a]>st.med[b]?a:b;
  const info=i=>`${t('נולד/ה טיפוסית ב-','Typically born in ')}${st.med[i]} · ${t('בערך בן/בת ','about ')}${NOW-st.med[i]}${t('',' years old')}`;
  el.innerHTML=`<div class="head"><div><h3>${t('מי צעיר יותר?','Who’s younger?')}</h3><div class="sub">${t('למי מהשניים ״האדם הטיפוסי״ צעיר יותר? כלומר, איזה שם ניתן בעיקר מאוחר יותר.','Whose typical person is younger? In other words, which name was mostly given later?')}</div></div><span class="pill acc">${t('רצף','Streak')} ${YG.streak} · ${t('שיא','Best')} ${YG.best}</span></div>
    <div class="vs"><button class="opt ${done?(a===win?'win':'lose'):''}" data-y="a"><div class="nm2">${nmh(a)}</div><div class="res">${done?info(a):''}</div></button><span class="vsx">${t('או','or')}</span>
    <button class="opt ${done?(b===win?'win':'lose'):''}" data-y="b"><div class="nm2">${nmh(b)}</div><div class="res">${done?info(b):''}</div></button></div>
    ${done?`<div class="actions"><button class="next" id="ygn">${t('הבא ←','Next →')}</button></div>`:''}`;
  el.querySelectorAll('[data-y]').forEach(bt=>bt.onclick=()=>{if(YG.cur.done)return;const p=bt.dataset.y==='a'?a:b;YG.cur.done=true;if(p===win){YG.streak++;if(YG.streak>YG.best){YG.best=YG.streak;store.set('ygbest',YG.best)}}else YG.streak=0;renderYG()});
  const n=$('#ygn');if(n)n.onclick=()=>{newYG();renderYG()};}

/* --- Higher / lower --- */
function newHL(){const st=stats(-1);const p=[];for(let i=0;i<N;i++)if(st.Y[0][i*NY+NY-1]+st.Y[1][i*NY+NY-1]>=gMin(40)&&gOk(i))p.push(i);let a=rand(p),b;do{b=rand(p)}while(b===a);G.hl={a,b,done:false}}
function renderHL(){const el=$('#g-hl');if(!G.hl)newHL();const st=stats(-1);const n=i=>st.Y[0][i*NY+NY-1]+st.Y[1][i*NY+NY-1];const {a,b,done}=G.hl;const win=n(a)>=n(b)?a:b;
  el.innerHTML=`<div class="head"><div><h3>${t('מי יותר פופולרי?','Which is more popular?')}</h3><div class="sub">${t(`איזה שם ניתן ליותר תינוקות ב-${Y1}?`,`Which name was given to more babies in ${Y1}?`)}</div></div><span class="pill acc">${t('רצף','Streak')} ${G.streak} · ${t('שיא','Best')} ${Math.max(G.best,LB.my.streak||0)}</span></div>
    <div class="vs"><button class="opt ${done?(a===win?'win':'lose'):''}" data-p="a"><div class="nm2">${nmh(a)}</div><div class="res">${done?fmt(n(a))+' '+t('תינוקות','babies'):''}</div></button><span class="vsx">${t('או','or')}</span>
    <button class="opt ${done?(b===win?'win':'lose'):''}" data-p="b"><div class="nm2">${nmh(b)}</div><div class="res">${done?fmt(n(b))+' '+t('תינוקות','babies'):''}</div></button></div>
    ${done?`<div class="score"><button class="next" id="hln">${t('הבא ←','Next →')}</button></div>`:''}`;
  el.querySelectorAll('[data-p]').forEach(bt=>bt.onclick=()=>{if(G.hl.done)return;const p=bt.dataset.p==='a'?a:b;G.hl.done=true;if(p===win){G.streak++;if(G.streak>G.best){G.best=G.streak;store.set('best',G.best)}if(G.streak>(LB.my.streak||0))lbSave({streak:G.streak})}else G.streak=0;renderHL()});
  const hn=$('#hln');if(hn)hn.onclick=()=>{newHL();renderHL()};}

/* --- Decade --- */
function newQ(){const st=stats(-1);const p=[];for(let i=0;i<N;i++)if(T(st,i)>=gMin(1500)&&gOk(i))p.push(i);const i=rand(p);const ans=peakDec(st,i);
  const all=shuffle([1940,1950,1960,1970,1980,1990,2000,2010,2020].filter(d=>d!==ans)).slice(0,3);G.q={i,ans,opts:[ans,...all].sort((a,b)=>a-b),done:false}}
function renderDec(){const el=$('#g-dec');if(!G.q)newQ();
  el.innerHTML=`<div class="head"><div><h3>${t('נחשו את העשור','Guess the decade')}</h3><div class="sub">${t('באיזה עשור נולדו הכי הרבה תינוקות בשם הזה?','In which decade were the most babies given this name?')}</div></div><span class="pill acc tn">${G.qs}/${G.qn}</span></div>
    <div style="font-family:var(--f-display);font-size:clamp(56px,12vw,90px);font-weight:700;line-height:.95;text-align:center">${nmh(G.q.i)}</div>
    <div class="qopts">${G.q.opts.map(d=>`<button data-d="${d}" class="${G.q.done?(d===G.q.ans?'win':(d===G.q.pick?'lose':'')):''}">${decLabel(d)}</button>`).join('')}</div>
    <div class="feedback">${G.q.done?(G.q.pick===G.q.ans?t('בול! ','Spot on! '):t('לא הפעם. ','Not this time. '))+t(`השיא היה ב${decLabel(G.q.ans)}.`,`It peaked in the ${decLabel(G.q.ans)}.`)+` <button class="chip" id="qopen">${t('לתיק השם','Open name file')}</button>`:''}</div>
    ${G.q.done?`<button class="next" id="qn">${t('שם הבא ←','Next name →')}</button>`:''}`;
  el.querySelectorAll('[data-d]').forEach(bt=>bt.onclick=()=>{if(G.q.done)return;G.q.done=true;G.q.pick=+bt.dataset.d;G.qn++;if(G.q.pick===G.q.ans)G.qs++;renderDec()});
  const qn=$('#qn');if(qn)qn.onclick=()=>{newQ();renderDec()};const qo=$('#qopen');if(qo)qo.onclick=()=>pick(G.q.i);}

/* ---------- boot ---------- */
(function boot(){const H0=(location.hash||'').slice(1);let t0=H0;if(/^match/.test(t0))t0='match';else if(/^compare=/.test(t0)){const L=compareFromHash(t0);if(L){CMP=L;store.set('cmp',CMP)}NSUB='compare';t0='names'}else if(!/^saved\./.test(t0)){const ni=nameFromURL();if(ni!=null){CUR=ni;store.set('name',NAMES[ni]);NSUB='file';t0='names'}}if(!TABS.includes(t0)&&!LEGACY[t0])t0='home';   /* a plain visit always opens the home page */TAB=TABS.includes(t0)?t0:(LEGACY[t0]?LEGACY[t0][0]:'home');
  const isSaved=/^saved\./.test(H0);if(isSaved){t0='home';TAB='home'}const miss=URL_MISS;if(miss){t0='home';TAB='home'}renderShell();setTab(t0);if(isSaved)checkSavedHash(H0);if(miss)notFound(miss);try{document.activeElement&&document.activeElement.blur()}catch(e){}
  const mq=matchMedia('(prefers-color-scheme: dark)');mq.addEventListener&&mq.addEventListener('change',()=>{GAME_BUILT=null;rerender()});
  new MutationObserver(()=>{GAME_BUILT=null;rerender()}).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});})();
