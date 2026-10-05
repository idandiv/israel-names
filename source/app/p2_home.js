/* =========================================================
   HOME
   ========================================================= */
let galMode=store.get('gm','sex'), GAL=null;
function reigns(st,x){const r=[];let prev=-1;for(let y=0;y<NY;y++){const id=st.top[x][y][0];if(id==null)continue;if(id!==prev){r.push({i:id,a:y,b:y});prev=id}else r[r.length-1].b=y}return r}
function renderHome(){
  const st=stats(-1), sec=$('#tab-home');
  let babies=0;for(const v of st.DD)babies+=v;
  const n1=[0,1].map(x=>st.top[x][NY-1][0]);
  const popular=[...st.top[0][NY-1].slice(0,4),...st.top[1][NY-1].slice(0,4)];
  sec.innerHTML=`
  <div class="landing fade">
    <div class="kick">${t(`${(babies/1e6).toFixed(1).replace('.0','')} מיליון תינוקות · ${fmt(N)} שמות · ${Y0}–${Y1}`,`${(babies/1e6).toFixed(1).replace('.0','')} million babies · ${fmt(N)} names · ${Y0}–${Y1}`)}</div>
    <h2>${t('מה הסיפור<br>מאחורי השם שלך?','What’s the story<br>behind your name?')}</h2>
    <p>${t('כמה ישראלים נקראים כמוך, מתי השם היה בשיא, מה הוא אומר ומה הפירוש שלו.','How many Israelis share it, when it peaked, what it means, and what it says about you.')}</p>
    <div class="search bigsearch">${icon('search')}<input id="hq" type="search" placeholder="${t('הקלידו שם…','Type a name…')}" autocomplete="off" aria-label="${t('חיפוש שם','Search a name')}"><div class="sugg" id="hsugg" hidden></div></div>
    <div class="chips quick">${popular.map(i=>`<button data-i="${i}">${nmh(i)}</button>`).join('')}<button class="ghost" id="rnd2">${icon('dice')}${t('שם אקראי','Random')}</button></div>
  </div>
  <div class="card homesaved" id="homesaved" hidden></div>
  <div class="ctapair">
  <button class="gencta" id="gencta"><span class="gl1">${icon('gen')}</span><span><b>${t('מחפשים שם לתינוק?','Looking for a baby name?')}</b><span>${t('פתחו את מחולל השמות: לפי משמעות, אופי ומגמה, עם רשימת מועדפים לשיתוף.','Open the name finder: by meaning, vibe and trend, with a shareable shortlist.')}</span></span><span class="go">${t('למחולל','Open')} ${icon('arrow')}</span></button>
  <button class="matchcta" id="matchcta"><span class="gl1">${icon('users')}</span>${(()=>{const r=NMX.active&&NMX.rooms[NMX.active];return r&&r.me?`<span><b>${r.pname?t(`להמשיך לבחור עם ${esc(r.pname)}`,`Keep choosing with ${esc(r.pname)}`):t('להמשיך בהתאמת השמות','Continue NameMatch')}</b><span>${t(`${r.likes.length} שמות שאהבת · ${matchesOf(r).length} התאמות`,`${r.likes.length} liked · ${matchesOf(r).length} matches`)}</span></span><span class="go">${t('להמשיך','Continue')} ${icon('arrow')}</span>`:`<span><b>${t('בוחרים שם ביחד','Choosing a name together')}</b><span>${t('מחליקים שמות בנפרד – רואים רק מה ששניכם אהבתם','Swipe separately – see only the names you both loved')}</span></span><span class="go">${t('להתחיל','Start')} ${icon('arrow')}</span>`})()}<span class="nmdemo" aria-hidden="true"><i class="c2"></i><i class="c1"><em>${t('נועה','Noa')}</em></i><b class="mk">${icon('heart',1)}</b></span></button>
  </div>
  ${(()=>{const r=NMX.active&&NMX.rooms[NMX.active];return r&&r.me?`<div class="nmnewwrap"><button class="linkbtn" id="nmnewroom">${t('או פתיחת חדר חדש','Or open a new room')}</button></div>`:''})()}
  <div class="tiles3 two">
    <button class="tilec" data-go="games"><span class="k">${t('משחק יומי','Daily game')}</span><b>${t('השם הסודי','The secret name')}</b><span>${t('נחשו את השם של היום ב-10 ניסיונות','Guess today’s name in 10 tries')}</span></button>
    <button class="tilec" data-go="me"><span class="k">${t('פרופיל אישי','Personal profile')}</span><b>${t('מה השם שלי אומר עליי','What my name says')}</b><span>${t('כמה הוא נדיר בשנתון שלכם ומה התואר שלכם','How rare it was in your year, and your title')}</span></button>

  </div>
`;
  wireSearch($('#hq'),$('#hsugg'),pick);
  openOn(sec.querySelector('.quick'));
  $('#rnd2').onclick=()=>{const pool=[];for(let i=0;i<N;i++)if(T(st,i)>=400&&MEAN.has(NAMES[i]))pool.push(i);pick(rand(pool))};
  drawHomeSaved();
  $('#gencta').onclick=()=>setTab('gen');$('#matchcta').onclick=()=>setTab('match');{const nr=$('#nmnewroom');if(nr)nr.onclick=()=>{NMX.showRooms=true;NMX.newRoom=true;setTab('match')}}
  sec.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>b.dataset.go==='me'?setTab('names','me'):setTab(b.dataset.go));

}
function wireGalSeg(){const g=$('#gseg');if(g)g.onclick=e=>{const b=e.target.closest('[data-g]');if(!b)return;galMode=b.dataset.g;store.set('gm',galMode);g.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x.dataset.g===galMode));drawGalaxy()}}
function reignsHTML(st){return [0,1].map(x=>{const r=reigns(st,x);const col=x?'--boy':'--girl';
    const tot={};r.forEach(s=>{tot[s.i]=(tot[s.i]||0)+s.b-s.a+1});
    const ord=[];r.forEach(s=>{if(!ord.includes(s.i))ord.push(s.i)});
    return `<div class="reignrow"><h4 style="color:var(${col})">${x?t('בנים','Boys'):t('בנות','Girls')} · ${ord.length} ${t('שמות שונים הגיעו למקום הראשון','different names reached #1')}</h4>
      <div class="reign">${r.map((s,k)=>{const len=s.b-s.a+1;return `<button data-i="${s.i}" title="${esc(NM(s.i))} ${Y0+s.a}${len>1?'–'+(Y0+s.b):''}" style="flex:${len} 1 0;background:var(${col});opacity:${k%2?.68:1}">${len>=4?nmh(s.i):''}</button>`}).join('')}</div>
      <div class="reignlab"><span>${Y0}</span><span>1970</span><span>1990</span><span>2010</span><span>${Y1}</span></div>
      <div class="chips">${ord.map(i=>`<button data-i="${i}">${nmh(i)}<small>${tot[i]} ${tot[i]===1?t('שנה','yr'):t('שנים','yrs')}</small></button>`).join('')}</div></div>`}).join('')}
function drawGalaxy(){
  const cv=$('#gal');if(!cv)return;const st=stats(TAB==='trends'?F:-1),wrap=$('#galwrap');
  const W=wrap.clientWidth,H=Math.round(Math.max(340,Math.min(560,W*.62))),dpr=window.devicePixelRatio||1;
  cv.width=W*dpr;cv.height=H*dpr;cv.style.height=H+'px';const ctx=cv.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,H);
  const P={l:40,r:12,t:12,b:24};const MIN=W<520?400:150;
  const pts=[];let mx=0;for(let i=0;i<N;i++){const s=T(st,i);if(s<MIN)continue;pts.push({i,t:s,gp:st.tot[0][i]/s,m:st.med[i]});if(s>mx)mx=s}
  const l0=Math.log10(MIN),l1=Math.log10(mx*1.15);
  const X=y=>P.l+(y-Y0)/(Y1-Y0)*(W-P.l-P.r),Yf=v=>H-P.b-(Math.log10(v)-l0)/(l1-l0)*(H-P.t-P.b);
  const fnt='IBM Plex Sans Hebrew, system-ui, sans-serif';
  ctx.strokeStyle=css('--grid');ctx.fillStyle=css('--muted');ctx.lineWidth=1;ctx.font=`11px ${fnt}`;
  ctx.textAlign='center';for(let d=1950;d<=2020;d+=10){const x=X(d);ctx.beginPath();ctx.moveTo(x,P.t);ctx.lineTo(x,H-P.b);ctx.stroke();ctx.fillText(d,x,H-7)}
  ctx.textAlign='right';for(const v of[300,1000,3000,10000,30000,100000]){if(v>mx*1.15||v<MIN)continue;const y=Yf(v);ctx.beginPath();ctx.moveTo(P.l,y);ctx.lineTo(W-P.r,y);ctx.stroke();ctx.fillText(kfmt(v),P.l-6,y+4)}
  const G=hex2rgb(css('--girl')),B=hex2rgb(css('--boy')),UP=hex2rgb(css('--good')),DN=hex2rgb(css('--bad')),MU=hex2rgb(css('--muted'));
  const SCOL=SC.map(c=>hex2rgb(css(c)));
  pts.sort((a,b)=>b.t-a.t);
  for(const p of pts){p.x=X(p.m)+((p.i*7919)%9-4)*.35;p.y=Yf(p.t);p.r=(W<520?1.4:1.8)+Math.sqrt(p.t/mx)*(W<520?11:15);
    let c;if(galMode==='sex'){c=G.map((v,k)=>Math.round(v*p.gp+B[k]*(1-p.gp)))}else if(galMode==='sec'){c=SCOL[domSec(p.i)]}else{const m=st.mom[p.i];c=m<=-.99?MU:m>.15?UP:m<-.15?DN:MU}
    ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,7);ctx.fillStyle=`rgba(${c},.5)`;ctx.fill();ctx.lineWidth=1;ctx.strokeStyle=`rgba(${c},.9)`;ctx.stroke();}
  const placed=[];const maxL=W<520?22:W<800?40:60;let k=0;ctx.textAlign='center';
  const tryLabel=(p,bold)=>{ctx.font=`${bold?700:600} ${bold?14:p.r>9?13:11.5}px ${fnt}`;const lab=NM(p.i);const w=ctx.measureText(lab).width+4,h=14;const bx=p.x-w/2,by=p.y-h/2;
    if(!bold&&(bx<P.l||bx+w>W-P.r))return false;if(!bold&&placed.some(r=>bx<r[0]+r[2]&&bx+w>r[0]&&by<r[1]+r[3]&&by+h>r[1]))return false;
    placed.push([bx,by,w,h]);ctx.lineWidth=3;ctx.strokeStyle=css('--surface');ctx.strokeText(lab,p.x,p.y+4);ctx.fillStyle=css('--ink');ctx.fillText(lab,p.x,p.y+4);return true};
  const cur=pts.find(p=>p.i===CUR);
  if(cur){ctx.beginPath();ctx.arc(cur.x,cur.y,cur.r+4,0,7);ctx.lineWidth=2;ctx.strokeStyle=css('--ink');ctx.stroke();tryLabel(cur,true)}
  for(const p of pts){if(k>=maxL)break;if(p===cur)continue;if(tryLabel(p,false))k++}
  GAL={pts,W,H};
  const dot=c=>`<i style="display:inline-block;width:10px;height:10px;border-radius:50%;background:var(${c});vertical-align:-1px"></i>`;
  $('#galleg').innerHTML=(galMode==='sex'
    ?`<span>${dot('--girl')} ${t('שם של בנות','Girls’ name')}</span><span>${dot('--boy')} ${t('שם של בנים','Boys’ name')}</span><span>${t('צבע ביניים = יוניסקס','In-between = unisex')}</span>`
    :galMode==='sec'?SECT().map((s,k)=>`<span>${dot(SC[k])} ${s}</span>`).join('')
    :`<span>${dot('--good')} ${t('עולה בעשור האחרון','Rising this decade')}</span><span>${dot('--bad')} ${t('יורד','Falling')}</span><span>${dot('--muted')} ${t('יציב או נעלם','Stable or gone')}</span>`)
    +`<span>${fmt(pts.length)} ${t(`שמות עם ${MIN} תינוקות ומעלה`,`names with ${MIN}+ babies`)}</span>`;
}
function wireGalaxy(){const cv=$('#gal'),tip=$('#gtip');if(!cv)return;
  const hit=e=>{if(!GAL)return null;const r=cv.getBoundingClientRect();const x=e.clientX-r.left,y=e.clientY-r.top;let best=null,bd=1e9;
    for(const p of GAL.pts){const d=Math.hypot(p.x-x,p.y-y)-p.r;if(d<bd){bd=d;best=p}}return bd<8?best:null};
  const show=(p,touch)=>{if(!p){tip.hidden=true;return}
    tip.innerHTML=`<b>${nmh(p.i)}</b>${fmt(p.t)} ${t('תינוקות · טיפוסי:','babies · typical:')} ${p.m}<br>${Math.round(p.gp*100)}% ${t('בנות','girls')} · ${secShort(p.i)}${touch?`<br><button data-i="${p.i}">${t('לתיק השם','Open')}</button>`:''}`;
    tip.hidden=false;tip.classList.toggle('on',!!touch);const tw=tip.offsetWidth;let left=p.x+p.r+8;if(left+tw>GAL.W)left=p.x-p.r-8-tw;tip.style.left=Math.max(0,left)+'px';tip.style.top=Math.max(0,p.y-30)+'px'};
  cv.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse')return;const p=hit(e);show(p,false);cv.style.cursor=p?'pointer':'crosshair'});
  cv.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse')tip.hidden=true});
  cv.addEventListener('click',e=>{const p=hit(e);if(!p){tip.hidden=true;return}if(e.pointerType==='mouse'||matchMedia('(hover:hover)').matches)pick(p.i);else show(p,true)});
  tip.addEventListener('click',e=>{const b=e.target.closest('[data-i]');if(b)pick(+b.dataset.i)});
}
let rsT;addEventListener('resize',()=>{clearTimeout(rsT);rsT=setTimeout(()=>{if($('#gal'))drawGalaxy()},200)});

let DECX=store.get('decx',0);
function drawDecades(st){const box=$('#decgrid');if(!box)return;const x=DECX;
  const rows=[];for(let d=1950;d<=2020;d+=10){const ys=YEARS.map((y,k)=>k).filter(k=>Y0+k>=d&&Y0+k<d+10);const sc=[];
    for(let i=0;i<N;i++){let v=0;for(const k of ys)v+=st.Y[x][i*NY+k];if(v)sc.push([i,v])}sc.sort((a,b)=>b[1]-a[1]);rows.push([d,sc.slice(0,5)])}
  box.innerHTML=`<div class="decgrid">${rows.map(([d,top])=>`<div class="decrow"><div class="declab">${d===2020?t(`2020–${Y1}`,`2020–${String(Y1).slice(2)}`):decLabel(d)}</div><div class="decnames">${top.map(([i,v],k)=>`<button data-di="${i}" class="${k===0?'first':''}"><em>${k+1}</em><b>${nmh(i)}</b><small>${kfmt(v)}</small></button>`).join('')}</div></div>`).join('')}</div>`;
  let sel=null;
  box.onclick=e=>{const b=e.target.closest('[data-di]');if(!b)return;const i=b.dataset.di;
    if(sel===i){pick(+i);return}sel=i;box.querySelectorAll('[data-di]').forEach(q=>q.classList.toggle('hl',q.dataset.di===i));box.classList.add('focus');
    toast(t('לחיצה נוספת פותחת את תיק השם','Tap again to open the name file'))};
  const seg=$('#decseg');if(seg)seg.onclick=e=>{const b=e.target.closest('[data-x]');if(!b)return;DECX=+b.dataset.x;store.set('decx',DECX);seg.querySelectorAll('button').forEach(q=>q.setAttribute('aria-pressed',q===b));box.classList.remove('focus');drawDecades(st)};}

/* ---------- leaders over time (merged #1 timeline + top-5 by decade) ---------- */
function leadersHTML(){return `<div class="card wide leaders" id="leaders"><div class="head"><div><h3>${t('המובילים לאורך הזמן','Leaders through time')}</h3><div class="sub">${t('הפס: השם שהיה במקום הראשון בכל שנה. הטבלה: חמשת המובילים בכל עשור. לחצו על שם כדי לסמן אותו לאורך כל התקופות.','The strip: the #1 name each year. The table: the top 5 of each decade. Tap a name to trace it through time.')}</div></div>
  <div class="seg" id="ldseg"><button data-x="0" aria-pressed="${DECX===0}">${t('בנות','Girls')}</button><button data-x="1" aria-pressed="${DECX===1}">${t('בנים','Boys')}</button></div></div><div id="ldbody"></div></div>`}
function drawLeaders(st){const box=$('#ldbody');if(!box)return;const x=DECX;const col=x?'--boy':'--girl';
  const r=reigns(st,x);const tot={};r.forEach(s=>{tot[s.i]=(tot[s.i]||0)+s.b-s.a+1});const longest=r.reduce((a,b)=>(b.b-b.a)>(a.b-a.a)?b:a);
  const rows=[];for(let d=1950;d<=2020;d+=10){const ys=YEARS.map((y,k)=>k).filter(k=>Y0+k>=d&&Y0+k<d+10);const sc=[];
    for(let i=0;i<N;i++){let v=0;for(const k of ys)v+=st.Y[x][i*NY+k];if(v)sc.push([i,v])}sc.sort((a,b)=>b[1]-a[1]);rows.push([d,sc.slice(0,5)])}
  const pos=y=>((y-Y0)/(NY)*100).toFixed(2)+'%';
  box.innerHTML=`<div class="ldstrip" style="--c:var(${col})">${r.map((s,k)=>{const len=s.b-s.a+1;return `<button data-di="${s.i}" class="${k%2?'alt':''}" style="flex:${len} 1 0" title="${esc(NM(s.i))} · ${Y0+s.a}${len>1?'–'+(Y0+s.b):''}">${len>=5?`<span>${nmh(s.i)}</span>`:''}</button>`}).join('')}</div>
    <div class="ldaxis">${[1950,1960,1970,1980,1990,2000,2010,2020].map(y=>`<span style="inset-inline-start:${pos(y)}">${y}</span>`).join('')}</div>
    <div class="ldfacts"><span><b>${Object.keys(tot).length}</b> ${t('שמות שונים הגיעו למקום הראשון','names reached #1')}</span><span>${t('השלטון הארוך:','Longest reign:')} <b>${nmh(longest.i)}</b> ${longest.b-longest.a+1} ${t('שנים','years')}</span></div>
    <div class="ldsel" id="ldsel" hidden></div>
    <div class="ldrows">${rows.map(([d,top])=>`<div class="ldrow"><span class="ldlab">${d===2020?'2020–24':decLabel(d)}</span>
      ${top[0]?`<button class="ld1" data-di="${top[0][0]}" style="--c:var(${col})"><b>${nmh(top[0][0])}</b><small>${kfmt(top[0][1])}</small></button>`:''}
      <span class="ldrest">${top.slice(1).map(([i,v],k)=>`<button data-di="${i}"><em>${k+2}</em>${nmh(i)}</button>`).join('')}</span></div>`).join('')}</div>`;
  const wrap=$('#leaders');let sel=null;
  wrap.onclick=e=>{const b=e.target.closest('[data-di]');if(!b)return;const i=b.dataset.di;
    if(sel===i){sel=null;wrap.classList.remove('focus');wrap.querySelectorAll('.hl').forEach(q=>q.classList.remove('hl'));$('#ldsel').hidden=true;return}
    sel=i;wrap.classList.add('focus');wrap.querySelectorAll('[data-di]').forEach(q=>q.classList.toggle('hl',q.dataset.di===i));
    const yrs=tot[i]||0;const decs=rows.filter(([d,top])=>top.some(([j])=>String(j)===i)).length;
    const s=$('#ldsel');s.hidden=false;s.innerHTML=`<b>${nmh(+i)}</b><span>${yrs?t(`${yrs} שנים במקום הראשון`,`${yrs} years at #1`):t('לא הגיע למקום הראשון','never #1')} · ${t(`בטופ 5 ב-${decs} עשורים`,`top 5 in ${decs} decades`)}</span><button class="linkbtn" id="ldopen">${t('לתיק השם','Open name file')}</button><button class="iconbtn" id="ldclr" aria-label="${t('ניקוי','Clear')}">${icon('close')}</button>`;
    $('#ldopen').onclick=ev=>{ev.stopPropagation();pick(+i)};$('#ldclr').onclick=ev=>{ev.stopPropagation();sel=null;wrap.classList.remove('focus');wrap.querySelectorAll('.hl').forEach(q=>q.classList.remove('hl'));s.hidden=true}};
  const seg=$('#ldseg');seg.onclick=e=>{const b=e.target.closest('[data-x]');if(!b)return;e.stopPropagation();DECX=+b.dataset.x;store.set('decx',DECX);seg.querySelectorAll('button').forEach(q=>q.setAttribute('aria-pressed',q===b));wrap.classList.remove('focus');drawLeaders(st)};}
