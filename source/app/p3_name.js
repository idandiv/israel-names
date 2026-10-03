/* =========================================================
   NAME VIEW
   ========================================================= */
let metric='n', tmode=store.get('tmode','sex'), REL=store.get('rel','tw');
function renderName(){
  const S=false;const tmode_=S?'sex':tmode,metric_=S?'n':metric;
  const i=CUR, nm=NAMES[i], dn=nmh(i), st=stats(F), v=$('#tab-name');
  const g=Float64Array.from({length:NY},(_,y)=>st.Y[0][i*NY+y]), b=Float64Array.from({length:NY},(_,y)=>st.Y[1][i*NY+y]);
  const tg=st.tot[0][i], tb=st.tot[1][i], tot=tg+tb;
  const where=SECTOT[i];
  if(!tot){const has=where.map((q,s)=>q?sectName(s):null).filter(Boolean);
    v.innerHTML=`${secChips()}<div class="hero fade"><div class="eyebrow">${t('תיק שם','NAME FILE')}</div><div class="nm">${dn}</div><div class="empty">${t('אין לשם הזה נתונים במגזר שבחרתם. הוא מופיע אצל:','No data for this name in the selected community. It appears among:')} ${has.join(', ')}. <br><button class="chip" id="toall" style="margin-top:10px">${t('הצגה בכל המגזרים','Show all communities')}</button></div></div>`;
    $('#toall').onclick=()=>setF(-1);return;}
  const c=comb(st,i), sh=share(st,i);
  let pk=0;for(let y=1;y<NY;y++)if(sh[y]>sh[pk])pk=y;
  const first=c.findIndex(q=>q>0), yrsIn=c.filter(q=>q>0).length;
  const med=st.med[i];
  const dom=tg>=tb?0:1; const L=NY-1;
  const rk=st.rank[dom][i*NY+L]; const best=(()=>{let r=1e9,ry=0;for(let y=0;y<NY;y++){const q=st.rank[dom][i*NY+y];if(q&&q<r){r=q;ry=y}}return[r,ry]})();
  const mom=st.mom[i];
  const gp=tg/tot*100;
  const sexWord=gp>=85?t('שם של בנות','A girls’ name'):gp<=15?t('שם של בנים','A boys’ name'):gp>=60?t('בעיקר לבנות','Mostly girls'):gp<=40?t('בעיקר לבנים','Mostly boys'):t('שם יוניסקס אמיתי','Truly unisex');
  let less=0,cnt=0;for(let j=0;j<N;j++){const q=T(st,j);if(!q)continue;cnt++;if(q<tot)less++}const pct=Math.floor(less/cnt*100);
  const pills=[];
  {const wt=where.reduce((a,q)=>a+q,0);const ds=where.indexOf(Math.max(...where));const dp=where[ds]/wt*100;
   pills.push(dp>=97?`<span class="pill sec s${ds}">${t('ניתן כמעט רק אצל ','Almost only ')}${sectName(ds)}</span>`:`<span class="pill sec s${ds}">${t('בעיקר אצל ','Mostly ')}${sectName(ds)} · ${Math.round(dp)}%</span>`);}
  {const pp=paPill(nm);if(pp)pills.push(pp);}
  if(mom>=9)pills.push(`<span class="pill up">${t('שם חדש לגמרי','Brand-new name')}</span>`);
  else if(mom>0.5)pills.push(`<span class="pill up">${t('בהמראה','Taking off')}: <bdi dir="ltr">+${Math.round(mom*100)}%</bdi> ${t('בעשור','in a decade')}</span>`);
  else if(mom>0.1)pills.push(`<span class="pill up">${t('בעלייה','Rising')}: <bdi dir="ltr">+${Math.round(mom*100)}%</bdi> ${t('בעשור','in a decade')}</span>`);
  else if(mom<-0.5)pills.push(`<span class="pill down">${t('בצניחה','Plunging')}: <bdi dir="ltr">${Math.round(mom*100)}%</bdi> ${t('בעשור','in a decade')}</span>`);
  else if(mom<-0.1)pills.push(`<span class="pill down">${t('בירידה','Falling')}: <bdi dir="ltr">${Math.round(mom*100)}%</bdi> ${t('בעשור','in a decade')}</span>`);
  else if(c[L])pills.push(`<span class="pill">${t('יציב בעשור האחרון','Stable this decade')}</span>`);
  if(!c[L])pills.push(`<span class="pill down">${t(`לא ניתן ב-${Y1} (פחות מ-5)`,`Not given in ${Y1} (under 5)`)}</span>`);
  pills.push(`<span class="pill acc">${sexWord}</span>`);
  pills.push(`<span class="pill">${generation(med)}</span>`);
  pills.push(`<span class="pill">${t(`נפוץ יותר מ-${pct}% מהשמות`,`More common than ${pct}% of names`)}</span>`);
  if(best[0]<=10)pills.push(`<span class="pill acc">${best[0]===1?t('היה מקום ראשון','Was #1'):t('היה בטופ 10','Was top 10')} (${t('מקום ','#')}${best[0]} ${t('ב-','in ')}${Y0+best[1]})</span>`);
  if(yrsIn===NY)pills.push(`<span class="pill">${t(`נוכח בכל ${NY} השנים`,`Present in all ${NY} years`)}</span>`);
  const oneIn=Math.round(st.DD[pk]/c[pk]);
  const age=NOW-med;const gw=(fem,mas,both)=>gp>=80?fem:gp<=20?mas:both;
  const secTot=where.reduce((a,q)=>a+q,0);
  const mxs=Math.max(...sh);
  const summary=t(`${nm}: ${fmt(tot)} תינוקות בישראל מאז ${Y0}. שיא ב-${Y0+pk} (אחד מכל ${fmt(oneIn)}), ${c[L]?`${fmt(c[L])} תינוקות ב-${Y1}`:`כמעט לא ניתן ב-${Y1}`}. ה${nm} ${gw('הטיפוסית נולדה','הטיפוסי נולד','הטיפוסי/ת נולד/ה')} ב-${med}. גימטריה ${gem(nm)}. (השמות של ישראל, נוצר ע״י עידן דיוה)`,
    `${NM(i)} (${nm}): ${fmt(tot)} babies in Israel since ${Y0}. Peak in ${Y0+pk} (1 in ${fmt(oneIn)}), ${fmt(c[L])} babies in ${Y1}. Typical birth year ${med}. (Names of Israel, made by Idan Diva)`);
  v.innerHTML=`<div class="nametools">${secChips()}</div>
  <div class="hero fade">
    <div class="stamp"><div><small>${t('גימטריה','GEMATRIA')}</small><b class="tn">${gem(nm)}</b><small>${letters(nm)} ${t('אותיות','letters')}</small></div></div>
    <div class="eyebrow">${t('תיק שם','NAME FILE')} · ${F<0?t('כל המגזרים','All communities'):sectName(F)}</div>
    <div class="nm">${dn}</div>${LANG==='en'?`<div class="nmhe" dir="rtl">${esc(nm)}</div>`:''}
    <p class="tagline">${t(`מאז ${Y0} קיבלו את השם <b>${fmt(tot)}</b> תינוקות. ${atStart(pk)?`השם היה הכי נפוץ כבר בתחילת הרישום, ב-<b>${Y0}</b>, כשאחד מכל <b>${fmt(oneIn)}</b> תינוקות נקרא ${esc(nm)}.`:`השיא היה ב-<b>${Y0+pk}</b>, כשאחד מכל <b>${fmt(oneIn)}</b> תינוקות נקרא ${esc(nm)}.`} ה${esc(nm)} ${gw('הטיפוסית נולדה','הטיפוסי נולד','הטיפוסי/ת נולד/ה')} ב-<b>${med}</b>, כלומר ${gw('בערך בת','בערך בן','בערך בן/בת')} <b>${age}</b> היום.`,
      `Since ${Y0}, <b>${fmt(tot)}</b> babies got this name. ${atStart(pk)?`It was already most common when records began in <b>${Y0}</b> (1 in <b>${fmt(oneIn)}</b>).`:`It peaked in <b>${Y0+pk}</b>, when 1 in every <b>${fmt(oneIn)}</b> babies was named ${dn}.`} The typical ${dn} was born in <b>${med}</b>, so is about <b>${age}</b> today.`)}</p>
    ${LANG!=='en'&&MEAN.has(nm)?`<p class="meaning"><span>${t('פירוש השם','Meaning')}</span>${esc(MEAN.get(nm))}</p>`:''}
    ${LANG!=='en'&&STORY.has(nm)?`<p class="story">${esc(STORY.get(nm))}</p>`:''}
    <div class="pills">${(S?pills.slice(0,3):pills).join('')}</div>
    ${`<div class="heat">${Array.from(sh,(q,y)=>`<i title="${Y0+y}: ${fmt(c[y])}" style="background:var(--accent);opacity:${q?(.08+.92*q/mxs).toFixed(2):0}"></i>`).join('')}</div>
    <div class="heatlab"><span>${Y0}</span><span>1970</span><span>1990</span><span>2010</span><span>${Y1}</span></div>`}
    <div class="stats">
      <div class="stat"><div class="k">${t('סה״כ תינוקות','Total babies')}</div><div class="v">${fmt(tot)}</div><div class="s">${Y0}–${Y1}</div></div>
      <div class="stat"><div class="k">${t('ב-','In ')}${Y1}</div><div class="v">${fmt(c[L])}</div><div class="s">${rk?t(`מקום ${rk} ${dom?'בבנים':'בבנות'}`,`#${rk} among ${dom?'boys':'girls'}`):t('מחוץ לרשימה','Not listed')}</div></div>
      <div class="stat"><div class="k">${t('שנת השיא','Peak year')}</div><div class="v">${Y0+pk}</div><div class="s">${atStart(pk)?t('כבר בתחילת הרישום','already at the start of records'):`${t('אחד מכל','1 in')} ${fmt(oneIn)}`}</div></div>
      <div class="stat"><div class="k">${t('הופעה ראשונה','First seen')}</div><div class="v">${Y0+first}</div><div class="s">${yrsIn} ${t('שנים ברשימות','years listed')}</div></div>
    </div>
    <div class="meter"><div class="row"><span class="g">${t('בנות','Girls')} ${gp.toFixed(gp>99||gp<1?1:0)}%</span><span class="b">${t('בנים','Boys')} ${(100-gp).toFixed(gp>99||gp<1?1:0)}%</span></div>
      <div class="track"><i style="width:${gp}%;background:var(--girl)"></i><i style="width:${100-gp}%;background:var(--boy)"></i></div></div>
    <div class="actions">${favBtn(nm,'lbl big')}<button class="next" id="shlink">${icon('link')}${t(' שיתוף העמוד',' Share page')}</button><button class="copybtn" id="card">${t('כרטיס לשיתוף','Share card')}</button><button class="copybtn" id="cpy">${t('העתקת סיכום','Copy summary')}</button><button class="copybtn" id="tocmp">${t('הוספה להשוואה','Add to compare')}</button></div>
  </div>
  <div class="grid">
    <div class="card wide"><div class="head"><div><h3>${t(`הסיפור של ${esc(nm)} לאורך השנים`,`${dn} through the years`)}</h3><div class="sub" id="tsub"></div></div>
      ${S?'':`<div class="ctrls"><div class="seg" id="tseg"><button data-t="sex" aria-pressed="${tmode_==='sex'}">${t('לפי מין','By sex')}</button><button data-t="sec" aria-pressed="${tmode_==='sec'}">${t('לפי מגזר','By community')}</button><button data-t="mix" aria-pressed="${tmode_==='mix'}">${t('חלוקה למגזרים','Community mix')}</button></div>
      <div class="seg" id="mseg" ${tmode_==='mix'?'hidden':''}><button data-m="n" aria-pressed="${metric_==='n'}">${t('מספרים','Counts')}</button><button data-m="p" aria-pressed="${metric_==='p'}">${t('לכל 1,000','Per 1,000')}</button></div></div>`}</div>
      <div class="cw"><canvas id="cTime"></canvas></div>
      <div class="legend" id="tleg"></div></div>
    <div class="card"><div class="head"><div><h3>${t('פרופיל אופי השם','Name character profile')}</h3><div class="sub">${t('חמישה ממדים מהנתונים, מ-0 עד 100','Five data-driven dimensions, 0 to 100')}</div></div></div><div id="prof"></div></div>
    <div class="card"><div class="head"><div><h3>${t('ציר הדרך של השם','The name\u2019s journey')}</h3><div class="sub">${t('הרגעים החשובים בחיים של השם','Key moments in the name\u2019s life')}${F>=0?' · '+sectName(F):''}</div></div></div><ol class="journey" id="journey"></ol></div>
    <div class="card"><div class="head"><div><h3>${t('כמה בכיתה?','How many per class?')}</h3><div class="sub">${t('לפי התינוקות שנולדו בשנה, בכיתה של 30 ילדים','Based on babies born that year, in a class of 30')}</div></div></div><div id="classbox"></div></div>
    <div class="card"><div class="head"><div><h3>${t('בני כמה הם היום?','How old are they today?')}</h3><div class="sub">${t(`כל מי שנקרא ${esc(nm)}, לפי שלב בחיים`,`Everyone named ${dn}, by life stage`)}</div></div></div><div id="lstage"></div></div>
    ${S?'':`<div class="card"><div class="head"><div><h3>${t('מקום בדירוג','Rank over time')}</h3><div class="sub">${dom?t('בין שמות הבנים','Among boys’ names'):t('בין שמות הבנות','Among girls’ names')} · ${t('למעלה זה טוב · קו מקווקו: מתחת לסף הרישום','higher is better · dashed: below the listing threshold')}</div></div></div><div class="cw sm"><canvas id="cRank"></canvas></div></div>
    <div class="card"><div class="head"><div><h3>${t('באיזה מגזר?','Which community?')}</h3><div class="sub">${t('כל התינוקות בשם, בכל המגזרים','All babies with this name, all communities')}</div></div></div><div class="hb" id="secs"></div></div>`}
    <div class="card ${S?'wide':''}"><div class="head"><div><h3>${t('השנה שלך','Your year')}</h3><div class="sub">${t(`בחרו שנת לידה וגלו כמה ${esc(nm)} נולדו איתכם`,`Pick a birth year to see how many were born with you`)}</div></div></div>
      <div class="yr"><select id="ysel" aria-label="${t('שנת לידה','Birth year')}">${YEARS.slice().reverse().map(y=>`<option ${y===store.get('yr',1990)?'selected':''}>${y}</option>`).join('')}</select></div><div class="yrout" id="yout"></div></div>
    <div class="card wide"><div class="head"><div><h3>${t('האם ידעת?','Did you know?')}</h3></div></div><div class="faq" id="faq"></div></div>
    <div class="card wide"><div class="head"><div><h3>${t(`שמות קרובים ל${esc(nm)}`,`Names related to ${dn}`)}</h3><div class="sub" id="relsub"></div></div>
      <div class="seg" id="relseg">${[['tw',t('תאומי זהות','Twins')],['var',t('כתיבים','Spellings')],['rhy',t('חרוזים','Rhymes')],['gem',t('גימטריה','Gematria')]].map(([k,l])=>`<button data-r="${k}" aria-pressed="${REL===k}">${l}</button>`).join('')}</div></div>
      <div class="rel" id="rel"></div></div>
  </div>`;
  $('#card').onclick=()=>shareCard(i);

  $('#cpy').onclick=()=>copy(summary+'\n'+nameURL(i));$('#shlink').onclick=()=>shareName(i);
  $('#tocmp').onclick=()=>{if(!CMP.includes(nm)){if(CMP.length>=4)CMP.shift();CMP.push(nm);store.set('cmp',CMP)}setTab('compare')};
  if(!S){$('#mseg').onclick=e=>{const bt=e.target.closest('[data-m]');if(bt){metric=bt.dataset.m;renderName();}};
  $('#tseg').onclick=e=>{const bt=e.target.closest('[data-t]');if(bt){tmode=bt.dataset.t;store.set('tmode',tmode);renderName();}};}
  // time chart
  const o=chartBase();let ds=[],leg='',sub;
  const perSec=s=>{const a=new Float64Array(NY);for(const x of[0,1]){const q=SER[i][s*2+x];if(q)for(let y=0;y<NY;y++)a[y]+=q[y]}return a};
  if(tmode_==='mix'){sub=t('איזה חלק מהתינוקות בשם הזה נולדו בכל מגזר, בכל שנה','Share of the babies with this name born in each community, per year');
    const per=[0,1,2,3].map(perSec);const totY=YEARS.map((_,y)=>per.reduce((a,p)=>a+p[y],0));
    o.scales.y.stacked=true;o.scales.y.max=100;o.scales.y.ticks.callback=q=>q+'%';o.plugins.tooltip.callbacks={label:q=>` ${q.dataset.label}: ${q.parsed.y.toFixed(0)}%`};
    for(let s=0;s<4;s++){if(!where[s])continue;ds.push({...line(sectName(s),per[s].map((q,y)=>totY[y]?q/totY[y]*100:null),css(SC[s])),fill:true,backgroundColor:css(SC[s])+'bb',borderWidth:1,tension:.2});leg+=legendHTML([[SC[s],sectName(s)]])}}
  else{o.plugins.tooltip.callbacks={label:q=>` ${q.dataset.label}: ${metric_==='n'?fmt(q.parsed.y):q.parsed.y.toFixed(2)+t(' לאלף',' per 1,000')}`};
    sub=metric_==='n'?t('מספר תינוקות שנולדו בכל שנה','Babies born each year'):t('מכל 1,000 תינוקות','Per 1,000 babies');
    if(tmode_==='sex'){const sc=(a,x)=>metric_==='n'?a:a.map((q,y)=>st.D[x][y]?q/st.D[x][y]*1000:0);
      if(tg)ds.push(line(t('בנות','Girls'),sc(g,0),css('--girl'),true));if(tb)ds.push(line(t('בנים','Boys'),sc(b,1),css('--boy'),true));
      leg=legendHTML([...(tg?[['--girl',t('בנות','Girls')]]:[]),...(tb?[['--boy',t('בנים','Boys')]]:[])]);}
    else{for(let s=0;s<4;s++){if(!where[s])continue;const a=perSec(s);const d=YEARS.map((_,y)=>DATA.T[s][0][y]+DATA.T[s][1][y]);ds.push(line(sectName(s),metric_==='n'?a:a.map((q,y)=>d[y]?q/d[y]*1000:0),css(SC[s])));leg+=legendHTML([[SC[s],sectName(s)]])}}}
  $('#tsub').textContent=sub;$('#tleg').innerHTML=leg;
  mk('cTime',{type:'line',data:{labels:YEARS,datasets:ds},options:o});
  if(!S){/* Years where the name is under the CBS publishing threshold (<5 babies) have no rank. Instead of gaps,
     they sit on a "below threshold" floor just under the last listed rank of that year, drawn as a thin dashed line. */
  const real=YEARS.map((_,y)=>st.rank[dom][i*NY+y]||0),below=real.map(r=>!r);
  const floorOf=y=>(st.uniq[dom][y]||1)+1,ranks=real.map((r,y)=>r||floorOf(y));
  const col=css(dom?'--boy':'--girl'),mut=css('--muted')||'#888';
  const o2=chartBase();o2.scales.y={...o2.scales.y,type:'logarithmic',reverse:true,min:1,max:Math.max(...ranks)*1.15,beginAtZero:false,
    ticks:{...(o2.scales.y.ticks||{}),callback:v=>[1,3,10,30,100,300,1000,3000].includes(v)?v:''}};
  o2.plugins.tooltip.callbacks={label:q=>below[q.dataIndex]?t(' מתחת לסף הרישום (פחות מ-5 תינוקות)',' Below the listing threshold (under 5 babies)'):` ${t('מקום','Rank')} ${fmt(q.parsed.y)}`};
  const ds={...line(t('מקום','Rank'),ranks,col),spanGaps:true,pointRadius:0,
    segment:{borderDash:c2=>below[c2.p0DataIndex]||below[c2.p1DataIndex]?[4,4]:undefined,borderColor:c2=>below[c2.p0DataIndex]||below[c2.p1DataIndex]?mut:undefined,borderWidth:c2=>below[c2.p0DataIndex]&&below[c2.p1DataIndex]?1:undefined}};
  mk('cRank',{type:'line',data:{labels:YEARS,datasets:[ds]},options:o2});
  const decs=[];for(let d=1940;d<=2020;d+=10){let s=0;for(let y=0;y<NY;y++)if(Y0+y>=d&&Y0+y<d+10)s+=c[y];decs.push([d,s])}
  const dm=Math.max(...decs.map(d=>d[1]));const pd=decs.find(d=>d[1]===dm)[0];
  if($('#decs'))$('#decs').innerHTML=decs.map(([d,s])=>`<div class="c ${d===pd?'pk':''}" title="${d}: ${fmt(s)}"><em>${s?kfmt(s):''}</em><i style="height:${dm?s/dm*100:0}%"></i><span>${d===1940?'1949':"'"+String(d).slice(2)}</span></div>`).join('');
  const sm=Math.max(...where);
  $('#secs').innerHTML=SECT().map((s,k)=>`<div class="r"><span class="lab">${s}</span><span class="t"><i style="width:${sm?where[k]/sm*100:0}%;background:var(${SC[k]})"></i></span><span class="val">${secTot?Math.round(where[k]/secTot*100):0}%</span></div>`).join('')+`<div class="sub" style="margin-top:4px">${where.filter(q=>q/secTot>=.02).length>1?t('השם חוצה מגזרים','This name crosses communities'):t('השם מופיע במגזר אחד בלבד','Found in one community only')}</div>`;}
  const yr=()=>{const y=+$('#ysel').value;store.set('yr',y);const yi=y-Y0;const n=c[yi];
    const r0=st.rank[0][i*NY+yi],r1=st.rank[1][i*NY+yi];const d=st.DD[yi];
    $('#yout').innerHTML=n?`<div class="big1 tn">${fmt(n)}</div>${t(`תינוקות בשם ${esc(nm)} נולדו ב-${y}. זה אחד מכל <b>${fmt(d/n)}</b>.`,`babies named ${dn} were born in ${y}. That’s 1 in <b>${fmt(d/n)}</b>.`)}<br>${r0?t(`מקום <b>${r0}</b> בבנות`,`<b>#${r0}</b> among girls`):''}${r0&&r1?' · ':''}${r1?t(`מקום <b>${r1}</b> בבנים`,`<b>#${r1}</b> among boys`):''}`:t(`ב-${y} פחות מ-5 תינוקות קיבלו את השם. נדיר!`,`Fewer than 5 babies got this name in ${y}. Rare!`);};
  $('#ysel').onchange=yr;yr();
  // journey, class, faq
  {const x=dom,R=y=>st.rank[x][i*NY+y];const items=[];const fy=c.findIndex(q=>q>0);
   items.push([Y0+fy,fy===0?t('כבר שם בשנה הראשונה של הנתונים','Already there in the first year of data'):t('מופיע לראשונה ברשימות','First appears in the records')]);
   const firstR=lim=>{for(let y=0;y<NY;y++){const r=R(y);if(r&&r<=lim)return y}return -1};
   const t100=firstR(100),t10=firstR(10);if(t100>fy)items.push([Y0+t100,t('נכנס לטופ 100','Enters the top 100')]);if(t10>=0&&t10>fy)items.push([Y0+t10,t('נכנס לטופ 10','Enters the top 10')]);
   const ones=YEARS.map((_,y)=>y).filter(y=>R(y)===1);if(ones.length)items.push([Y0+ones[0],ones.length>1?t(`מקום ראשון ב-${ones.length} שנים (עד ${Y0+ones[ones.length-1]})`,`#1 for ${ones.length} years (until ${Y0+ones[ones.length-1]})`):t('מגיע למקום הראשון','Reaches #1')]);
   if(pk!==L||!c[L])items.push([Y0+pk,atStart(pk)?t(`תחילת הרישום: השם כבר בשיא, אחד מכל ${fmt(oneIn)} תינוקות`,`Records begin: already at its peak, 1 in ${fmt(oneIn)} babies`):t(`שנת השיא: אחד מכל ${fmt(oneIn)} תינוקות`,`Peak year: 1 in ${fmt(oneIn)} babies`)]);
   if(c[L])items.push([Y1,(pk===L?t('שנת השיא עד היום: ','Peak so far: '):'')+(R(L)?t(`מקום ${R(L)} ${dom?'בבנים':'בבנות'}, ${fmt(c[L])} תינוקות`,`#${R(L)} among ${dom?'boys':'girls'}, ${fmt(c[L])} babies`):t(`${fmt(c[L])} תינוקות`,`${fmt(c[L])} babies`))]);
   else{let ly=NY-1;while(ly>0&&!c[ly])ly--;items.push([Y0+ly,t('הפעם האחרונה שהשם מופיע ברשימות','Last time the name appears')])}
   const pa=paInfo(nm);if(pa&&pa.c)items.push([2025,t(`לפי רשות האוכלוסין: מקום ${pa.c.rank} ברשימה`,`Population Authority: #${pa.c.rank}`)]);
   items.sort((a,b)=>a[0]-b[0]);
   $('#journey').innerHTML=items.map(([y,tx],k)=>`<li class="${y===Y0+pk&&k===items.findIndex(z=>z[0]===Y0+pk)?'pk':''}"><b>${y}</b><span>${tx}</span></li>`).join('');}
  {const per=y=>c[y]/st.DD[y]*30;const now=per(L),then=per(pk);const nmS=esc(nm);
   const tile=(lab,v)=>{let head,viz='';
     if(v>=1){const k=Math.round(v);head=t(`<b>${v>=1.95?Math.round(v):1}</b> ${v>=1.95?gw('ילדות','ילדים','ילדים'):gw('ילדה','ילד','ילד/ה')} בשם ${nmS} בכל כיתה`,`<b>${Math.round(v)}</b> per class`);viz=`<div class="classdots" aria-hidden="true">${Array.from({length:30},(_,j)=>`<i class="${j<k?'on':''}"></i>`).join('')}</div>`}
     else if(v>0){const k=Math.round(1/v);head=t(`${gw('ילדה אחת','ילד אחד','ילד/ה אחד/ת')} בכל <b>${fmt(k)}</b> כיתות`,`One in every <b>${fmt(k)}</b> classes`);viz=k<=24?`<div class="classes" aria-hidden="true">${Array.from({length:k},(_,j)=>`<i class="${j===0?'on':''}"></i>`).join('')}</div>`:`<div class="sub">${t('פחות מכיתה אחת בכל בית ספר','Less than one per school')}</div>`}
     else head=t('כמעט אף ילד בשם הזה','Almost no one');
     return `<div class="ctile"><div class="ck">${lab}</div><div class="cv">${head}</div>${viz}</div>`};
   {const pf=$('#prof');if(pf)pf.innerHTML=profileHTML(i);const ls=$('#lstage');if(ls)ls.innerHTML=lifeStagesHTML(nm,c);}
   $('#classbox').innerHTML=`<div class="ctiles">${tile(t(`היום · ילידי ${Y1}`,`Today · born ${Y1}`),now)}${pk!==L?tile(atStart(pk)?t(`בתחילת הרישום · ${Y0}`,`When records began · ${Y0}`):t(`בשיא · ${Y0+pk}`,`At the peak · ${Y0+pk}`),then):''}</div>`;}
  {const q=[];let my=0;for(let y=1;y<NY;y++)if(c[y]>c[my])my=y;
   q.push([t(`באיזו שנה נולדו הכי הרבה ${esc(nm)}?`,`Which year had the most babies named ${dn}?`),my===pk?t(`ב-${Y0+my}, עם ${fmt(c[my])} תינוקות. זו גם שנת השיא שלו.`,`${Y0+my}, with ${fmt(c[my])} babies, also its peak year.`):t(`ב-${Y0+my}, עם ${fmt(c[my])} תינוקות. ${atStart(pk)?`אבל ביחס למספר התינוקות שנולדו, הוא היה הכי נפוץ כבר בתחילת הרישום, ב-${Y0}.`:`שנת השיא היא ${Y0+pk}, כי אז הוא היה הכי נפוץ ביחס למספר התינוקות שנולדו באותה שנה.`}`,`${Y0+my}, with ${fmt(c[my])} babies. Its peak year is ${Y0+pk}, when it was most common relative to all births that year.`)]);
   let k10=0,k100=0;for(let y=0;y<NY;y++){const r=st.rank[dom][i*NY+y];if(r&&r<=10)k10++;if(r&&r<=100)k100++}
   q.push([t('כמה זמן השם היה בצמרת?','How long was it near the top?'),k10?t(`${k10} שנים בטופ 10, ו-${k100} שנים בטופ 100.`,`${k10} years in the top 10 and ${k100} in the top 100.`):k100?t(`הוא לא הגיע לטופ 10, אבל היה ${k100} שנים בטופ 100.`,`Never top 10, but ${k100} years in the top 100.`):t('הוא אף פעם לא נכנס לטופ 100. שם מיוחד באמת.','It never made the top 100. Truly distinctive.')]);
   let jy=0,jd=0;for(let y=1;y<NY;y++){const dd=c[y]-c[y-1];if(dd>jd){jd=dd;jy=y}}
   if(jd>=20)q.push([t('מתי השם קפץ הכי הרבה?','When did it jump the most?'),t(`בין ${Y0+jy-1} ל-${Y0+jy}: מ-${fmt(c[jy-1])} ל-${fmt(c[jy])} תינוקות בשנה אחת.`,`Between ${Y0+jy-1} and ${Y0+jy}: from ${fmt(c[jy-1])} to ${fmt(c[jy])} babies.`)]);
   const gm=NAMES.filter((n2,j)=>j!==i&&GEMS[j]===GEMS[i]&&T(stats(-1),j)>=200).slice(0,3);
   $('#faq').innerHTML=q.map(([a,b],k)=>`<details ${k<1?'open':''}><summary>${a}</summary><p>${b}</p></details>`).join('');}
  // related
  const norm=a=>{let m=0;for(const q of a)m+=q;m/=a.length;const d=a.map(q=>q-m);let l=0;for(const q of d)l+=q*q;l=Math.sqrt(l)||1;return d.map(q=>q/l)};
  const mv=norm(Array.from(sh));const res=[];
  /* twins and spellings stay within the same sex (a unisex name may pair with either) */
  const uniName=gp>20&&gp<80;const sexOf=j=>{const a=st.tot[0][j],b=st.tot[1][j],g=a+b?a/(a+b):.5;return g>=.8?0:g<=.2?1:2};
  const mySec=domSec(i),mixed=(()=>{const w=SECTOT[i],tt=w[0]+w[1]+w[2]+w[3];return w[mySec]/tt<.8})();
  const sameSex=j=>(uniName||sexOf(j)===dom)&&(mixed||domSec(j)===mySec);
  for(let j=0;j<N;j++){if(j===i||T(st,j)<300||!sameSex(j))continue;const oo=norm(Array.from(share(st,j)));let s=0;for(let y=0;y<NY;y++)s+=mv[y]*oo[y];res.push([j,s])}
  res.sort((a,q)=>q[1]-a[1]);
  /* spelling key: only changes that keep the sound -- final he/aleph, aleph/ayin, doubled vav/yod,
     an aleph next to a yod (מאיה/מיה), and sound-alike letters (ח/כ, ק/כ, ט/ת) */
  const spellKey=w=>{let x=w.replace(/['\s-]/g,'').replace(/[ךםןףץ]/g,c=>({'ך':'כ','ם':'מ','ן':'נ','ף':'פ','ץ':'צ'}[c]));
    x=x.replace(/[הא]$/,'H').replace(/ע/g,'א').replace(/וו/g,'ו').replace(/יי/g,'י').replace(/יא/g,'י').replace(/אי/g,'י').replace(/[חק]/g,'כ').replace(/ט/g,'ת');return x};
  const SK=spellKey(nm);
  const vs=[],rh=[],gm=[];const end=nm.slice(-2),G=GEMS[i];
  for(let j=0;j<N;j++){if(j===i)continue;if(T(st,j)<30)continue;const n2=NAMES[j];
    if(n2!==nm&&spellKey(n2)===SK&&sameSex(j))vs.push(j);
    if(n2.length>2&&nm.length>=2&&n2.endsWith(end)&&(st.tot[0][j]>=st.tot[1][j]?0:1)===dom)rh.push(j);
    if(GEMS[j]===G)gm.push(j);}
  const byT=a=>a.sort((p,q)=>T(st,q)-T(st,p));
  const chip=(j,s)=>`<button data-i="${j}"><b>${nmh(j)}</b><small>${s}</small></button>`;
  const REL_DEF={tw:[t(`השמות שהעלייה והירידה שלהם הכי דומות לזו של ${esc(nm)}`,`Names whose rise and fall most resemble ${dn}`),res.slice(0,8).map(([j,s])=>chip(j,Math.round(s*100)+t('% דמיון','% match'))),t('אין מספיק נתונים','Not enough data')],
    var:[t(`כתיבים אחרים של ${esc(nm)}, שנשמעים אותו דבר`,`Other spellings of ${dn} that sound the same`),byT(vs).slice(0,8).map(j=>chip(j,kfmt(T(st,j)))),t('אין כתיבים קרובים בנתונים','No close spellings in the data')],
    rhy:[t('אותן שתי אותיות אחרונות, לאותו מין','Same last two Hebrew letters, same sex'),byT(rh).slice(0,8).map(j=>chip(j,kfmt(T(st,j)))),t('לא מצאנו חרוז','No rhyme found')],
    gem:[t(`שמות ששווים בדיוק ${gem(nm)} בגימטריה, כמו ${esc(nm)}`,`Names with the same gematria value (${gem(nm)})`),byT(gm).slice(0,8).map(j=>chip(j,kfmt(T(st,j)))),t('אין שם אחר עם אותה גימטריה. ייחודי!','No other name has this value. Unique!')]};
  const drawRel=()=>{const [s,items,emp]=REL_DEF[REL];$('#relsub').innerHTML=s;$('#rel').innerHTML=items.join('')||`<span class="sub">${emp}</span>`;
    $('#relseg').querySelectorAll('button').forEach(q=>q.setAttribute('aria-pressed',q.dataset.r===REL))};
  drawRel();$('#relseg').onclick=e=>{const q=e.target.closest('[data-r]');if(q){REL=q.dataset.r;store.set('rel',REL);drawRel()}};
  openOn($('#rel'));
}
