/* =========================================================
   Round 18: life stages, compare table + share link,
   "my name" story card
   ========================================================= */

/* ---------- name file: how old are they today (life stages) ---------- */
const STAGES=()=>[[0,5,t('גן','Preschool')],[6,17,t('בית ספר','School')],[18,21,t('צבא','Army age')],[22,34,t('צעירים','Young adults')],[35,54,t('הורים','Parents')],[55,69,t('מבוגרים','Older adults')],[70,200,t('סבים וסבתות','Grandparents')]];
function lifeStages(c){return STAGES().map(([a,b,l])=>{let s=0;for(let y=0;y<NY;y++){const age=NOW-(Y0+y);if(age>=a&&age<=b)s+=c[y]}return{l,a,b,s}})}
function lifeStagesHTML(nm,c){const S=lifeStages(c);const tot=S.reduce((a,x)=>a+x.s,0)||1;const mx=Math.max(...S.map(x=>x.s))||1;const top=S.find(x=>x.s===mx);
  return `<div class="lstage">${S.map(x=>`<div class="lsrow ${x===top?'top':''}"><span class="lsl">${x.l}<small>${x.b>=200?t(`${x.a} ומעלה`,`${x.a}+`):`${x.a}–${x.b}`}</small></span><span class="lsb"><i style="width:${(x.s/mx*100).toFixed(1)}%"></i></span><span class="lsv">${x.s?Math.round(x.s/tot*100)+'%':'—'}</span></div>`).join('')}</div>
    <p class="sub lsnote">${t(`הקבוצה הגדולה ביותר היום: ${top.l}. לפי שנות הלידה בלבד, בלי תמותה והגירה.`,`Largest group today: ${top.l.toLowerCase()}. Based on birth years only.`)}</p>`}

/* ---------- compare: summary table + share link ---------- */
function compareTableHTML(st){if(!CMP.length)return'';const L=NY-1;
  const rows=CMP.map((n,k)=>{const i=IDX.get(n),c=comb(st,i),sh=share(st,i);let pk=0,tot=0;for(let y=0;y<NY;y++){tot+=c[y];if(sh[y]>sh[pk])pk=y}
    const b=c[L-10]+c[L-11]+c[L-12];const tr=b>=30?Math.round(st.mom[i]*100):null;
    return `<tr><td><i class="cdot" style="background:var(${CC[k]})"></i><button class="linkname" data-i="${i}">${nmh(i)}</button></td><td>${kfmt(tot)}</td><td>${pk===0?t(`${Y0} או לפני`,`${Y0} or earlier`):Y0+pk}</td><td>${fmt(c[L])}</td><td class="${tr==null?'':tr>=0?'up':'dn'}">${tr==null?'—':`<span dir="ltr">${(tr>0?'+':'')+tr}%</span>`}</td></tr>`}).join('');
  return `<div class="cmptbl"><table><thead><tr><th>${t('שם','Name')}</th><th>${t('סה״כ','Total')}</th><th>${t('שנת שיא','Peak')}</th><th>${t(`ב-${Y1}`,`In ${Y1}`)}</th><th>${t('מגמה ב-10 שנים','10-yr trend')}</th></tr></thead><tbody>${rows}</tbody></table></div>`}
const compareLink=()=>`${SHARE_URL}#compare=${encodeURIComponent(CMP.join(','))}`;
function compareFromHash(h){const m=/^compare=(.+)$/.exec(h||'');if(!m)return null;let s='';try{s=decodeURIComponent(m[1])}catch(e){s=m[1]}const L=s.split(',').map(x=>x.trim()).filter(x=>IDX.has(x)).slice(0,4);return L.length?L:null}
addEventListener('hashchange',()=>{const L=compareFromHash((location.hash||'').slice(1));if(L){CMP=L;store.set('cmp',CMP);setTab('names','compare')}});

/* ---------- "my name" story card (1080x1920) ---------- */
async function makeMeCard(me,o){
  try{await Promise.all([document.fonts.load('700 200px Karantina'),document.fonts.load('600 40px "IBM Plex Sans Hebrew"')])}catch(e){}
  const i=IDX.get(me.n),W=1080,H=1920;const cv=document.createElement('canvas');cv.width=W;cv.height=H;const g=cv.getContext('2d');
  const C={bg:'#121326',ink:'#f3f2ff',mut:'#a8a9c8',acc:'#a49dff',st:'#ff7f9b',line:me.x?'#4a95ee':'#f07a4a'};
  g.fillStyle=C.bg;g.fillRect(0,0,W,H);
  let grd=g.createRadialGradient(W*.85,H*.12,40,W*.85,H*.12,900);grd.addColorStop(0,'rgba(164,157,255,.32)');grd.addColorStop(1,'rgba(164,157,255,0)');g.fillStyle=grd;g.fillRect(0,0,W,H);
  grd=g.createRadialGradient(W*.1,H*.9,40,W*.1,H*.9,800);grd.addColorStop(0,'rgba(255,127,155,.16)');grd.addColorStop(1,'rgba(255,127,155,0)');g.fillStyle=grd;g.fillRect(0,0,W,H);
  const en=LANG==='en';g.direction=en?'ltr':'rtl';const X0=en?90:W-90;const AL=en?'left':'right';g.textAlign=AL;
  const body='"IBM Plex Sans Hebrew", Arial, sans-serif';const K=s=>`700 ${s}px Karantina, ${body}`,B=(w,s)=>`${w} ${s}px ${body}`;
  const fit=(txt,font,size,max)=>{let s=size;g.font=font(s);while(g.measureText(txt).width>max&&s>40){s-=6;g.font=font(s)}return s};
  g.fillStyle=C.mut;g.font=B(600,36);g.fillText(en?'NAMES OF ISRAEL':'השמות של ישראל',X0,140);
  g.fillStyle=C.st;g.font=B(700,40);g.fillText(en?'What my name says about me':'מה השם שלי אומר עליי',X0,250);
  // name + year
  const nm=en?rom(i):me.n;let s=fit(nm,K,330,W-180);g.fillStyle=C.ink;g.fillText(nm,X0,250+s*.92);let y=280+s*.92;
  g.fillStyle=C.mut;g.font=B(600,44);g.fillText(en?`Born ${me.y}`:`${me.x?'נולד':'נולדה'} ב-${me.y}`,X0,y+30);y+=70;
  // persona
  s=fit(o.title,K,170,W-180);g.fillStyle=C.acc;g.fillText(o.title,X0,y+s*.95);y+=s*.95+40;
  g.fillStyle=C.ink;g.font=B(500,40);const words=o.desc.split(' ');let ln='',lines=[];for(const w of words){const tst=ln?ln+' '+w:w;if(g.measureText(tst).width>W-180){lines.push(ln);ln=w}else ln=tst}if(ln)lines.push(ln);
  lines.slice(0,3).forEach((l,k)=>g.fillText(l,X0,y+20+k*58));y+=20+Math.min(lines.length,3)*58+50;
  // stat tiles
  const tiles=[[o.n?fmt(o.n):'<5',en?`${o.sexw} named ${nm} in ${me.y}`:`${o.sexw} בשם ${me.n} ב-${me.y}`],[o.n?o.pct:'—',en?'of that year’s babies':`מה${o.sexw} בשנתון`],[o.n?(en?'1 in ':'1 מכל ')+fmt(o.D/o.n):'—',o.tierLab]];
  const tw=(W-180-40)/3;tiles.forEach(([v,l],k)=>{const x=en?90+k*(tw+20):W-90-k*(tw+20);g.fillStyle='rgba(255,255,255,.05)';const bx=en?x:x-tw;g.beginPath();g.roundRect?g.roundRect(bx,y,tw,210,28):g.rect(bx,y,tw,210);g.fill();
    g.textAlign=AL;g.fillStyle=C.ink;const vs=fit(v,K,110,tw-50);g.fillText(v,en?x+25:x-25,y+30+vs*.85);g.fillStyle=C.mut;g.font=B(500,27);
    const lw=l.split(' ');let a='',b2=[];for(const w of lw){const tt=a?a+' '+w:w;if(g.measureText(tt).width>tw-50){b2.push(a);a=w}else a=tt}if(a)b2.push(a);b2.slice(0,2).forEach((q,m)=>g.fillText(q,en?x+25:x-25,y+150+m*34))});
  y+=255;
  // your year's top names
  if(o.peers.length){g.fillStyle=C.mut;g.font=B(600,32);g.fillText(en?`Top names of ${me.y}`:`השמות המובילים של ${me.y}`,X0,y);g.fillStyle=C.ink;g.font=B(700,46);g.fillText(o.peers.slice(0,3).map(j=>en?rom(j):NAMES[j]).join(' · '),X0,y+62)}
  y+=125;
  // chart with birth-year marker
  const ch=Math.max(160,Math.min(340,H-265-y)),cx=90,cw=W-180,cy=y+ch;const m=Math.max(...o.sh)||1;
  g.beginPath();g.moveTo(cx,cy);o.sh.forEach((v,k)=>g.lineTo(cx+k/(NY-1)*cw,cy-v/m*ch));g.lineTo(cx+cw,cy);g.closePath();
  const ag=g.createLinearGradient(0,cy-ch,0,cy);ag.addColorStop(0,'rgba(164,157,255,.5)');ag.addColorStop(1,'rgba(164,157,255,0)');g.fillStyle=ag;g.fill();
  g.beginPath();o.sh.forEach((v,k)=>{const px=cx+k/(NY-1)*cw,py=cy-v/m*ch;k?g.lineTo(px,py):g.moveTo(px,py)});g.strokeStyle=C.line;g.lineWidth=7;g.lineJoin='round';g.stroke();
  const yi=me.y-Y0,mx=cx+yi/(NY-1)*cw,my=cy-o.sh[yi]/m*ch;g.setLineDash([10,10]);g.strokeStyle='rgba(255,255,255,.35)';g.lineWidth=3;g.beginPath();g.moveTo(mx,cy);g.lineTo(mx,my);g.stroke();g.setLineDash([]);
  g.fillStyle=C.st;g.beginPath();g.arc(mx,my,16,0,7);g.fill();g.strokeStyle=C.bg;g.lineWidth=6;g.stroke();
  g.fillStyle=C.ink;g.font=B(700,34);g.textAlign='center';g.direction='ltr';g.fillText(String(me.y),Math.min(Math.max(mx,cx+50),cx+cw-50),Math.max(my-36,cy-ch+10));
  g.fillStyle=C.mut;g.font=B(500,28);g.textAlign='left';g.fillText(String(Y0),cx,cy+46);g.textAlign='right';g.fillText(String(Y1),cx+cw,cy+46);g.direction=en?'ltr':'rtl';g.textAlign=AL;
  // footer
  const host=(SITE.base||'').replace(/^https?:\/\//,'');g.fillStyle=C.acc;g.font=B(700,38);g.fillText(en?'What does your name say about you?':'ומה השם שלכם אומר עליכם?',X0,H-170);
  if(host&&host.length<=40){g.direction='ltr';g.textAlign=en?'left':'right';g.fillStyle=C.ink;g.font=B(600,34);g.fillText(host,X0,H-118);g.direction=en?'ltr':'rtl'}
  g.textAlign=AL;g.fillStyle=C.mut;g.font=B(500,28);g.fillText(en?'Made by Idan Diva':'נוצר ע״י עידן דיוה',X0,H-70);
  return cv}

/* ---------- name file: character profile (radar, 0–100 on five data-derived axes) ---------- */
let PROF_TYP=null;
function profileOf(i){const st=stats(-1),c=comb(st,i),sh=share(st,i);let tot=0,mod=0,dAll=0,dMod=0;
  for(let y=0;y<NY;y++){tot+=c[y];dAll+=st.DD[y];if(Y0+y>=2015){mod+=c[y];dMod+=st.DD[y]}}
  if(!tot)return null;const base=dMod/dAll,modShare=mod/tot;
  const cl=v=>Math.max(0,Math.min(100,Math.round(v)));
  const pkv=Math.max(...sh);                                   /* peak share, babies per 1,000 */
  const g=st.tot[0][i]/tot,dom=g>=.5?0:1;let best=1e9;for(let y=0;y<NY;y++){const r=st.rank[dom][i*NY+y];if(r&&r<best)best=r}
  const dec=[];for(let d=1950;d<=2020;d+=10){let s=0,n=0;for(let y=0;y<NY;y++){const Y=Y0+y;if(Y>=d&&Y<d+10||d===1950&&Y<1950){s+=sh[y];n++}}dec.push(n?s/n:0)}
  const dm=Math.max(...dec);const steady=dm?dec.filter(v=>v>=dm*.3).length:0;
  return{mod:cl(modShare/base/3*100),uniq:cl(100*(1-(Math.log10(Math.max(pkv,.03))-Math.log10(.03))/(Math.log10(30)-Math.log10(.03)))),
    uni:cl(100*(1-Math.abs(g-.5)*2)),peak:best<1e9?cl(100*(1-Math.log10(best)/3)):0,time:cl(steady/dec.length*100),
    raw:{modShare,pkv,g,best,steady,decN:dec.length}}}
function profTypical(){if(PROF_TYP)return PROF_TYP;const st=stats(-1);const keys=['mod','uniq','uni','peak','time'];const acc={};keys.forEach(k=>acc[k]=[]);
  for(let i=0;i<N;i++){if(T(st,i)<1000)continue;const p=profileOf(i);if(p)keys.forEach(k=>acc[k].push(p[k]))}
  PROF_TYP={};keys.forEach(k=>{const a=acc[k].sort((x,y)=>x-y);PROF_TYP[k]=a[Math.floor(a.length/2)]||0});return PROF_TYP}
const PROF_AX=()=>[['mod',t('מודרניות','Modern')],['uniq',t('ייחודיות','Distinctive')],['uni',t('יוניסקס','Unisex')],['peak',t('עוצמת שיא','Peak power')],['time',t('על-זמניות','Timeless')]];
function profileHTML(i){const p=profileOf(i);if(!p)return'';const T0=profTypical();const ax=PROF_AX();const r=p.raw;
  /* the tag follows the axis where this name stands out most from a typical name */
  /* stand-out = distance above the typical name, relative to the room left above it; ties go to the rarer trait */
  const PRI={time:5,uni:4,mod:3,uniq:2,peak:1};
  const lead=ax.map(([k])=>[k,(p[k]-T0[k])/Math.max(1,100-T0[k])]).sort((a,b)=>b[1]-a[1]||PRI[b[0]]-PRI[a[0]])[0][0];
  const TAG={mod:[p.peak>=50?t('להיט עכשווי','A current hit'):t('כוכב עולה','A rising star'),t(`${Math.round(r.modShare*100)}% מהתינוקות בשם הזה נולדו מ-2015 ואילך.`,`${Math.round(r.modShare*100)}% of them were born since 2015.`)],
    uniq:[t('שם בוטיק','A boutique name'),t(`גם בשיא שלו, פחות מ-${r.pkv<1?'1':Math.ceil(r.pkv)} מכל 1,000 תינוקות קיבלו אותו.`,`Even at its peak, under ${r.pkv<1?1:Math.ceil(r.pkv)} in 1,000 babies got it.`)],
    uni:[t('שם יוניסקס','A unisex name'),t(`${Math.round(r.g*100)}% בנות ו-${100-Math.round(r.g*100)}% בנים.`,`${Math.round(r.g*100)}% girls, ${100-Math.round(r.g*100)}% boys.`)],
    peak:[t('אגדה מהצמרת','A chart-topper'),t(`הגיע עד מקום ${fmt(r.best)} בדירוג.`,`Reached #${fmt(r.best)} in the rankings.`)],
    time:[t('קלאסיקה על-זמנית','A timeless classic'),t(`נשאר נפוץ ב-${r.steady} מתוך ${r.decN} העשורים.`,`Stayed common in ${r.steady} of ${r.decN} decades.`)]}[lead];
  const W=280,H=250,cx=W/2,cy=H/2+6,R=86;const ang=k=>-Math.PI/2-k*2*Math.PI/5;   /* clockwise from top, RTL-friendly order */
  const pt=(k,v)=>[cx+Math.cos(ang(k))*R*v/100,cy+Math.sin(ang(k))*R*v/100];
  const poly=vals=>vals.map((v,k)=>pt(k,v).map(q=>q.toFixed(1)).join(',')).join(' ');
  const rings=[25,50,75,100].map(v=>`<polygon points="${poly([v,v,v,v,v])}" class="prring"/>`).join('');
  const spokes=ax.map((_,k)=>{const [x,y]=pt(k,100);return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" class="prspoke"/>`}).join('');
  const labels=ax.map(([k,l],j)=>{const [x,y]=pt(j,124);const anc=Math.abs(x-cx)<8?'middle':x<cx?'end':'start';const yy=y<cy-10?y-6:y>cy+10?y+8:y;return `<text x="${x.toFixed(1)}" y="${yy.toFixed(1)}" text-anchor="${anc}" class="prlab ${k===lead?'on':''}">${l}</text><text x="${x.toFixed(1)}" y="${(yy+15).toFixed(1)}" text-anchor="${anc}" class="prlab prv ${k===lead?'on':''}">${p[k]}</text>`}).join('');
  const dots=ax.map(([k,l],j)=>{const [x,y]=pt(j,p[k]);return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.5" class="prdot"><title>${l}: ${p[k]} (${t('שם טיפוסי','typical')}: ${T0[k]})</title></circle>`}).join('');
  const rows=ax.map(([k,l])=>`<div class="prrow ${k===lead?'on':''}"><span>${l}</span><span class="prbar"><i style="width:${p[k]}%"></i><em style="inset-inline-start:${T0[k]}%"></em></span><b>${p[k]}</b></div>`).join('');
  return `<div class="prtag"><b>${TAG[0]}</b><span>${TAG[1]}</span></div>
    <svg class="prsvg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${t('פרופיל אופי השם','Name character profile')}">${rings}${spokes}
      <polygon points="${poly(ax.map(([k])=>T0[k]))}" class="prtyp"/><polygon points="${poly(ax.map(([k])=>p[k]))}" class="prme"/>${dots}${labels}</svg>
    <div class="prleg"><span><i class="me"></i>${t(`${esc(NAMES[i])}`,`${esc(NM(i))}`)}</span><span><i class="ty"></i>${t('שם טיפוסי','Typical name')}</span></div>
    <details class="prmore"><summary>${t('איך זה מחושב?','How is this calculated?')}</summary>${rows}
      <p class="sub">${t('מודרניות: חלק הלידות מ-2015 ואילך, ביחס לכלל האוכלוסייה. ייחודיות: כמה נדיר השם היה גם בשיא שלו. יוניסקס: 100 כשהחלוקה 50/50. עוצמת שיא: המקום הגבוה ביותר בדירוג אי פעם. על-זמניות: בכמה עשורים השם נשאר נפוץ. הקו המקווקו הוא החציון של שמות שניתנו לפחות ל-1,000 תינוקות.','Modern: share of births since 2015 vs. the population. Distinctive: how rare it was even at its peak. Unisex: 100 at a 50/50 split. Peak power: best rank ever. Timeless: decades in which it stayed common. Dashed: median of names given to 1,000+ babies.')}</p></details>`}
