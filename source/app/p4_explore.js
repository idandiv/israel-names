/* =========================================================
   EXPLORE
   ========================================================= */
let RY=store.get('ry',Y1), raceTimer=null, exEnd=store.get('end',0);
const ROWH=30;
function stopRace(){if(raceTimer){clearInterval(raceTimer);raceTimer=null;const b=$('#rp');if(b)b.innerHTML=icon('play',1)+t(' ניגון',' Play')}}
function drawRace(st){const y=RY-Y0;$('#ry').textContent=RY;const r2=$('#ry2');if(r2)r2.textContent=RY;
  for(const [x,sel] of [[0,'#rg'],[1,'#rb']]){const box=$(sel);if(!box)continue;const ids=st.top[x][y].slice(0,10);const mx=ids.length?st.Y[x][ids[0]*NY+y]:1;
    const have=new Map([...box.children].map(el=>[+el.dataset.i,el]));
    ids.forEach((id,r)=>{let row=have.get(id);
      if(!row){row=document.createElement('button');row.className='rrow';row.dataset.i=id;row.innerHTML=`<span class="rk"></span><span class="bw"><i style="background:var(${x?'--boy':'--girl'})"></i><span>${nmh(id)}</span></span><span class="v"></span>`;
        row.style.transform=`translateY(${10*ROWH}px)`;row.style.opacity=0;box.appendChild(row);void row.offsetWidth;}
      delete row.dataset.out;have.delete(id);
      row.querySelector('.rk').textContent=r+1;row.querySelector('.bw i').style.width=(st.Y[x][id*NY+y]/mx*100)+'%';row.querySelector('.v').textContent=fmt(st.Y[x][id*NY+y]);
      row.style.transform=`translateY(${r*ROWH}px)`;row.style.opacity=1;});
    have.forEach(row=>{row.dataset.out=1;row.style.transform=`translateY(${10*ROWH}px)`;row.style.opacity=0;setTimeout(()=>{if(row.dataset.out)row.remove()},560)});}
  const sc=$('#seccols');if(sc)sc.innerHTML=SECT().map((s,k)=>{const ss=stats(k);return `<div><h4><span class="stag s${k}">${s}</span></h4><div class="gl">${t('בנות','Girls')}</div><ol>${ss.top[0][y].slice(0,3).map(id=>`<li><button data-i="${id}">${nmh(id)}</button></li>`).join('')}</ol><div class="bl">${t('בנים','Boys')}</div><ol>${ss.top[1][y].slice(0,3).map(id=>`<li><button data-i="${id}">${nmh(id)}</button></li>`).join('')}</ol></div>`}).join('');
}
function renderExplore(){
  stopRace();const st=stats(F), sec=$('#tab-explore');
  const GB=[['--girl',t('בנות','Girls')],['--boy',t('בנים','Boys')]];
  const card=(id,title,sub,body,wide,extra='')=>`<div class="card${wide?' wide':''}"><div class="head"><div><h3>${title}</h3><div class="sub">${sub}</div></div>${extra}</div>${body}</div>`;
  sec.innerHTML=`<div class="grid">
   ${leadersHTML()}
   <div class="card wide"><div class="head"><div><h3>${t('מירוץ השמות','The name race')}</h3><div class="sub">${t('10 השמות המובילים בכל שנה. לחצו ניגון וצפו איך שמות עוקפים זה את זה לאורך 76 שנה. משתנה לפי המגזר שבחרתם למעלה.','The top 10 names each year. Press play and watch names overtake each other across 76 years. Follows the community filter above.')}</div></div></div>
     <div class="ctrl"><span class="yearbig" id="ry">${RY}</span><input type="range" id="rr" min="${Y0}" max="${Y1}" value="${RY}" aria-label="${t('שנה','Year')}"><button class="play" id="rp">${icon('play',1)+t(' ניגון',' Play')}</button></div>
     <div class="race"><div class="g"><h4>${t('בנות','Girls')}</h4><div class="rl2" id="rg" style="height:${10*ROWH}px"></div></div><div class="b"><h4>${t('בנים','Boys')}</h4><div class="rl2" id="rb" style="height:${10*ROWH}px"></div></div></div>
     </div>
   <div class="card wide"><div class="head"><div><h3>${t('יהודים, מוסלמים, נוצרים ודרוזים','Jewish, Muslim, Christian & Druze')}</h3><div class="sub">${t('השמות הנפוצים ביותר בכל מגזר בכל הזמנים','The most common names in each community, all time')}</div></div></div>
     <div class="seccols" id="secall"></div>
     <h4 style="margin:18px 0 4px;font-size:14px">${t('שמות גשר','Bridge names')}</h4><div class="sub" style="margin-bottom:8px">${t('נפוצים גם אצל יהודים וגם בחברה הערבית (מוסלמים, נוצרים ודרוזים)','Common among both Jews and Arab Israelis (Muslim, Christian and Druze)')}</div>
     <div class="lst" id="bridge"></div></div>
   ${card('',t('המטאורים','Shooting stars'),t(`השמות שהכי זינקו ב-10 השנים האחרונות (${Y1-12}–${Y1-10} מול ${Y1-2}–${Y1})`,`Biggest risers of the last decade (${Y1-12}–${Y1-10} vs ${Y1-2}–${Y1})`),'<div class="lst" id="up"></div>')}
   ${card('',t('יוצאים מהאופנה','Going out of style'),t('השמות שהכי איבדו גובה באותה תקופה','Biggest fallers over the same period'),'<div class="lst" id="down"></div>')}
   ${card('',t('ישראל נהיית יצירתית יותר','Israel is getting more creative'),t('איזה אחוז מהתינוקות קיבלו אחד מ-10 השמות הנפוצים של אותה שנה','Share of babies given one of that year’s top 10 names'),`<div class="cw"><canvas id="cDiv"></canvas></div><div class="legend">${legendHTML(GB)}</div>`,true)}
   ${card('',t('כמה שמות שונים בשנה','Different names per year'),t('שמות שניתנו ל-5 תינוקות לפחות','Names given to at least 5 babies'),`<div class="cw sm"><canvas id="cUniq"></canvas></div><div class="legend">${legendHTML(GB)}</div>`)}
   ${card('',t('אורך שם ממוצע','Average name length'),t('מספר אותיות בעברית, משוקלל לפי תינוקות','Hebrew letters, weighted by babies'),`<div class="cw sm"><canvas id="cLen"></canvas></div><div class="legend">${legendHTML(GB)}</div>`)}
   ${card('',t('איך נגמרים השמות','How names end'),t('האות האחרונה בשם · אחוז מהתינוקות בכל שנה','Last Hebrew letter · share of babies each year'),`<div class="cw"><canvas id="cEnd"></canvas></div><div class="legend" id="eleg"></div>`,true,`<div class="seg" id="eseg"><button data-e="0" aria-pressed="${exEnd===0}">${t('בנות','Girls')}</button><button data-e="1" aria-pressed="${exEnd===1}">${t('בנים','Boys')}</button></div>`)}
   ${card('',t('יוניסקס אמיתיים','Truly unisex'),t('שמות נפוצים עם החלוקה הכי שוויונית בין בנות לבנים','Common names with the most even girl/boy split'),'<div class="lst" id="uni"></div>')}
   ${card('',t('שמות שהחליפו צד','Names that switched sides'),t(`אחוז הבנות בשנות ה-80 וה-90, מול 2010–${Y1}`,`Share of girls in the 1980s–90s vs 2010–${Y1}`),'<div class="lst" id="swap"></div>')}
   ${card('',t('הקאמבקים','Comebacks'),t('היו נפוצים פעם, כמעט נעלמו, וחזרו בגדול','Once common, nearly vanished, back in force'),'<div class="lst" id="comeb"></div>')}
   ${card('',t('הבזקים','Flashes'),t('שמות שרוב הילדים שלהם נולדו בחלון של 6 שנים בלבד','Names whose babies were mostly born within 6 years'),'<div class="lst" id="flash"></div>')}
   ${card('',t('הקלאסיקות','The classics'),t('השמות שהיו הכי הרבה שנים בטופ 20','Most years in the top 20'),'<div class="lst" id="ever"></div>')}
   ${card('',t('שמות חדשים','New names'),t(`לא הופיעו לפני 2010, וכבר נפוצים ב-${Y1}`,`Absent before 2010, already common in ${Y1}`),'<div class="lst" id="newb"></div>')}
   ${card('',t('האות הראשונה','First letter'),t('באיזו אות עברית מתחיל השם · אחוז מהתינוקות','Which Hebrew letter the name starts with · share of babies'),`<div class="cw"><canvas id="cLet"></canvas></div><div class="legend">${legendHTML([['--c4',t('שנות ה-50','1950s')],['--c3',`${Y1-4}–${Y1}`]])}</div>`,true,'<div class="seg" id="lseg"></div>')}
   ${card('',t('כמה תינוקות נספרו בכל שנה','Babies counted each year'),t('לפי מגזר · ההקשר לכל שאר הגרפים','By community · context for every other chart'),`<div class="cw"><canvas id="cBirth"></canvas></div><div class="legend">${legendHTML(SECT().map((s,k)=>[SC[k],s]))}</div>`,true)}
  </div>`;
  drawRace(st);drawLeaders(st);groupTrends();
  $('#rr').oninput=e=>{RY=+e.target.value;store.set('ry',RY);drawRace(st)};
  $('#rp').onclick=()=>{if(raceTimer){stopRace();return}
    if(RY>=Y1)RY=Y0;$('#rp').innerHTML=icon('pause')+t(' עצירה',' Pause');raceTimer=setInterval(()=>{RY++;$('#rr').value=RY;drawRace(st);if(RY>=Y1)stopRace()},650)};
  sec.querySelectorAll('.rl2,.lst,#seccols,#secall').forEach(openOn);
  // communities
  $('#secall').innerHTML=SECT().map((s,k)=>{const ss=stats(k);const tp=x=>{const a=[];for(let i=0;i<N;i++)if(ss.tot[x][i])a.push(i);return a.sort((p,q)=>ss.tot[x][q]-ss.tot[x][p]).slice(0,3)};
    let bb=0;for(const v of DATA.T[k][0])bb+=v;for(const v of DATA.T[k][1])bb+=v;
    return `<div><h4><span class="stag s${k}">${s}</span></h4><div class="sub">${kfmt(bb)} ${t('תינוקות','babies')} · ${fmt(SECTOT.filter(w=>w[k]).length)} ${t('שמות','names')}</div><div class="gl">${t('בנות','Girls')}</div><ol>${tp(0).map(id=>`<li><button data-i="${id}">${nmh(id)}</button></li>`).join('')}</ol><div class="bl">${t('בנים','Boys')}</div><ol>${tp(1).map(id=>`<li><button data-i="${id}">${nmh(id)}</button></li>`).join('')}</ol></div>`}).join('');
  const br=[];for(let i=0;i<N;i++){const w=SECTOT[i];const j=w[0],a=w[1]+w[2]+w[3];if(j>=200&&a>=200)br.push([i,j,a])}
  br.sort((p,q)=>Math.min(q[1],q[2])-Math.min(p[1],p[2]));
  $('#bridge').innerHTML=br.slice(0,10).map(([i,j,a])=>`<button data-i="${i}"><span>${nmh(i)}</span><span class="split"><i style="width:${j/(j+a)*100}%;background:var(--c1)"></i><i style="width:${a/(j+a)*100}%;background:var(--c3)"></i></span><span class="x">${Math.round(j/(j+a)*100)}% ${t('יהודים','Jewish')}</span></button>`).join('')+
    `<div class="legend">${legendHTML([['--c1',t('יהודים','Jewish')],['--c3',t('מוסלמים, נוצרים ודרוזים','Muslim, Christian & Druze')]])}</div>`;
  // movers
  const S=(i,a,b)=>{let s=0,d=0;for(let y=a;y<=b;y++){s+=st.Y[0][i*NY+y]+st.Y[1][i*NY+y];d+=st.DD[y]}return[s,d?s/d:0]};
  const mv=[];for(let i=0;i<N;i++){const [nN,sN]=S(i,NY-3,NY-1),[nT,sT]=S(i,NY-13,NY-11);if(nN<120&&nT<120)continue;if(nT<15)continue;mv.push([i,sN/sT-1])}
  const row=(i,d,cls)=>`<button data-i="${i}"><span>${nmh(i)}</span>${spark(share(st,i).slice(NY-25),80,18,cls==='down'?'var(--bad)':'var(--good)')}<span class="d ${cls}">${d}</span></button>`;
  mv.sort((a,b)=>b[1]-a[1]);
  const empty=`<span class="sub">${t('אין שמות כאלה במגזר הזה','No such names in this community')}</span>`;
  $('#up').innerHTML=mv.slice(0,8).map(([i,r])=>row(i,'+'+Math.round(r*100)+'%','up')).join('')||empty;
  $('#down').innerHTML=mv.slice(-8).reverse().map(([i,r])=>row(i,Math.round(r*100)+'%','down')).join('')||empty;
  const lg=[css('--girl'),css('--boy')],GL=[t('בנות','Girls'),t('בנים','Boys')];
  const top10=x=>YEARS.map((_,y)=>{let s=0;for(const id of st.top[x][y].slice(0,10))s+=st.Y[x][id*NY+y];return st.D[x][y]?s/st.D[x][y]*100:0});
  const o=chartBase();o.plugins.tooltip.callbacks={label:q=>` ${q.dataset.label}: ${q.parsed.y.toFixed(1)}%`};o.scales.y.ticks.callback=q=>q+'%';
  mk('cDiv',{type:'line',data:{labels:YEARS,datasets:[line(GL[0],top10(0),lg[0]),line(GL[1],top10(1),lg[1])]},options:o});
  mk('cUniq',{type:'line',data:{labels:YEARS,datasets:[line(GL[0],st.uniq[0],lg[0]),line(GL[1],st.uniq[1],lg[1])]},options:chartBase()});
  const avgLen=x=>YEARS.map((_,y)=>{let s=0,n=0;for(let i=0;i<N;i++){const q=st.Y[x][i*NY+y];if(q){s+=q*LEN[i];n+=q}}return n?s/n:null});
  const o3=chartBase();o3.scales.y.beginAtZero=false;o3.plugins.tooltip.callbacks={label:q=>` ${q.dataset.label}: ${q.parsed.y.toFixed(2)}`};
  mk('cLen',{type:'line',data:{labels:YEARS,datasets:[line(GL[0],avgLen(0),lg[0]),line(GL[1],avgLen(1),lg[1])]},options:o3});
  const drawEnd=()=>{const x=exEnd;const LL=NAMES.map(lastL);const tot={};for(let i=0;i<N;i++){const l=LL[i];tot[l]=(tot[l]||0)+st.tot[x][i]}
    const top=Object.entries(tot).sort((a,b)=>b[1]-a[1]).slice(0,4).map(e=>e[0]);
    const ser=top.map(l=>YEARS.map((_,y)=>{let s=0;for(let i=0;i<N;i++)if(LL[i]===l)s+=st.Y[x][i*NY+y];return st.D[x][y]?s/st.D[x][y]*100:0}));
    const o5=chartBase();o5.scales.y.ticks.callback=q=>q+'%';o5.plugins.tooltip.callbacks={label:q=>` ${q.dataset.label}: ${q.parsed.y.toFixed(1)}%`};
    const lab=l=>t(`מסתיים ב-${l}`,`Ends in ${l}`);
    mk('cEnd',{type:'line',data:{labels:YEARS,datasets:top.map((l,k)=>line(lab(l),ser[k],css(CC[k])))},options:o5});
    $('#eleg').innerHTML=legendHTML(top.map((l,k)=>[CC[k],lab(l)]));};
  drawEnd();$('#eseg').onclick=e=>{const b=e.target.closest('[data-e]');if(!b)return;exEnd=+b.dataset.e;store.set('end',exEnd);$('#eseg').querySelectorAll('button').forEach(q=>q.setAttribute('aria-pressed',+q.dataset.e===exEnd));drawEnd()};
  const uni=[];for(let i=0;i<N;i++){const a=st.tot[0][i],b=st.tot[1][i];if(a+b<1500||!a||!b)continue;const bal=Math.min(a,b)/Math.max(a,b);if(bal>0.2)uni.push([i,bal,a,b])}
  uni.sort((p,q)=>q[1]*Math.log(q[2]+q[3])-p[1]*Math.log(p[2]+p[3]));
  const split=(a,b)=>`<span class="split"><i style="width:${a/(a+b)*100}%;background:var(--girl)"></i><i style="width:${b/(a+b)*100}%;background:var(--boy)"></i></span>`;
  $('#uni').innerHTML=uni.slice(0,9).map(([i,bal,a,b])=>`<button data-i="${i}"><span>${nmh(i)}</span>${split(a,b)}<span class="x">${Math.round(a/(a+b)*100)}% ${t('בנות','girls')}</span></button>`).join('')||empty;
  const gs=(i,a,b)=>{let g=0,s=0;for(let y=a-Y0;y<=b-Y0;y++){g+=st.Y[0][i*NY+y];s+=st.Y[0][i*NY+y]+st.Y[1][i*NY+y]}return[s?g/s:0,s]};
  const sw=[];for(let i=0;i<N;i++){const [p1,t1]=gs(i,1980,1999),[p2,t2]=gs(i,2010,Y1);if(t1<150||t2<150)continue;sw.push([i,p2-p1,p1,p2])}
  sw.sort((a,b)=>Math.abs(b[1])-Math.abs(a[1]));
  $('#swap').innerHTML=sw.slice(0,8).map(([i,d,p1,p2])=>`<button data-i="${i}"><span>${nmh(i)}</span><span class="x" style="text-align:center">${Math.round(p1*100)}% ${LANG==='en'?'→':'←'} ${Math.round(p2*100)}%</span><span class="d" style="color:var(${d>0?'--girl':'--boy'})">${d>0?t('יותר בנות','more girls'):t('יותר בנים','more boys')}</span></button>`).join('')||empty;
  const cb=[];for(let i=0;i<N;i++){if(T(st,i)<2000)continue;const s=share(st,i);const avg=(a,b)=>{let q=0;for(let y=a;y<=b;y++)q+=s[y];return q/(b-a+1)};
    let early=0;for(let y=0;y<=1975-Y0-4;y++)early=Math.max(early,avg(y,y+4));let tr=1e9;for(let y=1975-Y0;y<=2008-Y0;y++)tr=Math.min(tr,avg(y,y+4));const rec=avg(NY-5,NY-1);
    if(early>0.5&&rec>=0.35*early&&rec>=3*Math.max(tr,0.02))cb.push([i,rec/Math.max(tr,0.02)])}
  cb.sort((a,b)=>b[1]-a[1]);
  $('#comeb').innerHTML=cb.slice(0,9).map(([i,r])=>`<button data-i="${i}"><span>${nmh(i)}</span>${spark(share(st,i),80,18)}<span class="x">${t('פי','×')}${r>=20?'20+':r.toFixed(0)} ${t('מהשפל','from the low')}</span></button>`).join('')||empty;
  const fl=[];for(let i=0;i<N;i++){const s=T(st,i);if(s<1500)continue;const cc=comb(st,i);let best=0,by=0;for(let y=0;y+6<=NY;y++){let q=0;for(let k=0;k<6;k++)q+=cc[y+k];if(q>best){best=q;by=y}}const f=best/s;if(f>=0.5&&by+6<NY-1)fl.push([i,f,by])}
  fl.sort((a,b)=>b[1]-a[1]);
  $('#flash').innerHTML=fl.slice(0,9).map(([i,f,by])=>`<button data-i="${i}"><span>${nmh(i)}</span>${spark(share(st,i),80,18)}<span class="x">${Y0+by}–${Y0+by+5} · ${Math.round(f*100)}%</span></button>`).join('')||empty;
  const ev=[];for(let i=0;i<N;i++){let k=0;for(const x of[0,1])for(let y=0;y<NY;y++){const r=st.rank[x][i*NY+y];if(r&&r<=20)k++}if(k)ev.push([i,k])}
  ev.sort((a,b)=>b[1]-a[1]);
  $('#ever').innerHTML=ev.slice(0,9).map(([i,k])=>`<button data-i="${i}"><span>${nmh(i)}</span>${spark(share(st,i),80,18)}<span class="x">${k} ${t('שנים','yrs')}</span></button>`).join('');
  const nb=[];const y10=2010-Y0;for(let i=0;i<N;i++){const cc=comb(st,i);let pre=0;for(let y=0;y<y10;y++)pre+=cc[y];if(pre)continue;if(cc[NY-1]>=30)nb.push([i,cc[NY-1]])}
  nb.sort((a,b)=>b[1]-a[1]);
  $('#newb').innerHTML=nb.slice(0,9).map(([i,n])=>`<button data-i="${i}"><span>${nmh(i)}</span>${spark(comb(st,i).slice(NY-15),80,18,'var(--good)')}<span class="x">${fmt(n)} ${t('ב-','in ')}${Y1}</span></button>`).join('')||empty;
  let lx=store.get('lx',2);
  const drawLet=()=>{$('#lseg').innerHTML=[[2,t('כולם','All')],[0,t('בנות','Girls')],[1,t('בנים','Boys')]].map(([k,l])=>`<button data-k="${k}" aria-pressed="${k===lx}">${l}</button>`).join('');
    const AB='אבגדהוזחטיכלמנסעפצקרשת'.split('');const cnt=(a,b)=>{const m=Object.fromEntries(AB.map(c=>[c,0]));let TT=0;for(let i=0;i<N;i++){const f=NAMES[i][0];if(!(f in m))continue;for(const x of[0,1]){if(lx!==2&&x!==lx)continue;for(let y=a;y<=b;y++){const q=st.Y[x][i*NY+y];m[f]+=q;TT+=q}}}return AB.map(c=>TT?m[c]/TT*100:0)};
    const o4=chartBase();o4.scales.x.ticks.maxTicksLimit=30;o4.scales.x.ticks.font={size:13,family:'IBM Plex Sans Hebrew',weight:'600'};o4.scales.x.reverse=true;o4.scales.y.ticks.callback=q=>q+'%';o4.plugins.tooltip.callbacks={label:q=>` ${q.dataset.label}: ${q.parsed.y.toFixed(1)}%`};
    mk('cLet',{type:'bar',data:{labels:AB,datasets:[{label:t('שנות ה-50','1950s'),data:cnt(1,10),backgroundColor:css('--c4'),borderRadius:4,borderSkipped:'bottom'},{label:`${Y1-4}–${Y1}`,data:cnt(NY-5,NY-1),backgroundColor:css('--c3'),borderRadius:4,borderSkipped:'bottom'}]},options:o4});};
  drawLet();$('#lseg').onclick=e=>{const b=e.target.closest('[data-k]');if(b){lx=+b.dataset.k;store.set('lx',lx);drawLet()}};
  const o6=chartBase();o6.scales.y.stacked=true;o6.plugins.tooltip.callbacks={label:q=>` ${q.dataset.label}: ${fmt(q.parsed.y)}`};
  mk('cBirth',{type:'line',data:{labels:YEARS,datasets:SECT().map((s,k)=>({...line(s,YEARS.map((_,y)=>DATA.T[k][0][y]+DATA.T[k][1][y]),css(SC[k])),fill:true,backgroundColor:css(SC[k])+'aa',borderWidth:1}))},options:o6});
}

let TGROUP=store.get('tgroup','lead');
const TG=()=>[['lead',t('מי מוביל','Who leads')],['trend',t('עולים ויורדים','Rising & falling')],['sect',t('מגזרים','Communities')],['gender',t('בנים ובנות','Boys & girls')],['il',t('ישראל בגרפים','Israel in charts')]];
function groupTrends(){const map={leaders:'lead',rg:'lead',secall:'sect',up:'trend',down:'trend',comeb:'trend',flash:'trend',newb:'trend',ever:'trend',cDiv:'il',cUniq:'il',cLen:'il',cEnd:'il',cLet:'il',cBirth:'il',uni:'gender',swap:'gender'};
  const grid=$('#tab-explore .grid');if(!grid)return;
  [...grid.children].forEach(c=>{const id=c.id&&map[c.id]?c.id:Object.keys(map).find(k=>c.querySelector('#'+k));c.dataset.g=id?map[id]:'il'});
  {const has=(c,k)=>c.id===k||c.querySelector('#'+k);const kids=[...grid.children];const rc=kids.find(c=>has(c,'rg')),lc=kids.find(c=>has(c,'leaders'));if(rc&&lc&&rc!==lc)grid.insertBefore(rc,lc)}
  let nav=$('#tgnav');if(!nav){nav=document.createElement('div');nav.id='tgnav';nav.className='seg tgnav';grid.parentNode.insertBefore(nav,grid)}
  const apply=()=>{nav.innerHTML=TG().map(([k,l])=>`<button data-tg="${k}" aria-pressed="${TGROUP===k}">${l}</button>`).join('');
    [...grid.children].forEach(c=>c.hidden=c.dataset.g!==TGROUP);if(TGROUP!=='lead')stopRace();window.dispatchEvent(new Event('resize'))};
  nav.onclick=e=>{const b=e.target.closest('[data-tg]');if(b){TGROUP=b.dataset.tg;store.set('tgroup',TGROUP);apply()}};apply();}
