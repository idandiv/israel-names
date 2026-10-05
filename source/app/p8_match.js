/* =========================================================
   NAMEMATCH — choose a name together (swipe)
   Data layer: localStorage rooms + link exchange; live sync via the
   room capability when this viewer can connect.
   ========================================================= */
IC.x='<path d="M6 6l12 12M18 6 6 18"/>';
IC.v='<path d="M5 12.5l4.5 4.5L19 7.5"/>';
IC.star='<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z"/>';
IC.undo='<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>';
IC.heart='<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>';
IC.users='<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.2a4.5 4.5 0 0 1 5 4.8"/>';
IC.link='<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>';
IC.back='<path d="M9 6l6 6-6 6"/>';
IC.chat='<path d="M20 11.5a8 8 0 0 1-11.6 7.1L4 20l1.4-4.2A8 8 0 1 1 20 11.5z"/>';

/* Rooms are stored by NAME, not by index into the data, so future data releases (new years, new names)
   can't scramble saved rooms. Older saves used indices of the first data release; LEGACY_RM lists the
   positions removed since then, so those numbers are translated once and then saved as names. */
const LEGACY_RM=[1628,4807];
const legacyIdx=v=>{if(!Number.isInteger(v)||v<0||LEGACY_RM.includes(v))return null;const j=v-LEGACY_RM.filter(x=>x<v).length;return j<N?j:null};
const toIdx=v=>typeof v==='string'?(IDX.has(v)?IDX.get(v):null):legacyIdx(v);
const ROOM_ARR=['likes','supers','passes','plikes','psupers','seen'];
function roomIn(o){if(!o||typeof o!=='object'||Array.isArray(o))return null;const r=Object.assign({},o);
  ROOM_ARR.forEach(k=>{r[k]=(Array.isArray(o[k])?o[k]:[]).map(toIdx).filter(v=>v!=null)});
  r.hist=(Array.isArray(o.hist)?o.hist:[]).map(h=>h&&{i:toIdx(h.n!=null?h.n:h.i),type:h.type}).filter(h=>h&&h.i!=null);
  r.q=Array.isArray(o.q)?o.q:[];return r}
function roomOut(r){const o=Object.assign({},r);ROOM_ARR.forEach(k=>{o[k]=(r[k]||[]).map(i=>NAMES[i])});o.hist=(r.hist||[]).map(h=>({n:NAMES[h.i],type:h.type}));return o}
const NMX={rooms:(()=>{const out=Object.create(null);const o=store.get('nm_rooms',{});if(o&&typeof o==='object'&&!Array.isArray(o))for(const k of Object.keys(o)){const r=roomIn(o[k]);if(r)out[k]=r}return out})(),active:store.get('nm_active',null),live:null,peer:null,deck:null,deckFor:null,busy:false,joinTried:null};
const nmSave=()=>{const o={};for(const k of Object.keys(NMX.rooms))o[k]=roomOut(NMX.rooms[k]);store.set('nm_rooms',o);store.set('nm_active',NMX.active)};
{const o=store.get('nm_rooms',null);if(o&&typeof o==='object'&&Object.values(o).some(r=>r&&Array.isArray(r.likes)&&r.likes.some(v=>typeof v==='number')))nmSave()}   /* one-time migration of index-based saves */
const R=()=>{const r=NMX.active?NMX.rooms[NMX.active]:null;return r&&typeof r==='object'&&Array.isArray(r.likes)?r:null};
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const b64e=s=>btoa(unescape(encodeURIComponent(s))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const b64d=s=>{try{s=s.replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';return decodeURIComponent(escape(atob(s)))}catch(e){return''}};
const newCode=()=>Array.from({length:6},()=>'abcdefghjkmnpqrstuvwxyz23456789'[Math.floor(Math.random()*31)]).join('');
const fLabel=f=>({f:t('שמות בנות','Girls’ names'),m:t('שמות בנים','Boys’ names'),a:t('כל השמות','All names')}[f]);
const rTok=r=>`${r.f}${(r.sec||1).toString(16)}${r.uni?'u':''}${r.cloud?'c':''}`;
function inviteLink(r){return `${SHARE_URL}#match.${r.code}.${rTok(r)}`}
function picksLink(r){const L=[...r.supers.map(i=>'*'+NAMES[i]),...r.likes.filter(i=>!r.supers.includes(i)).map(i=>NAMES[i])];
  return `${SHARE_URL}#match.${r.code}.${rTok(r)}.${b64e(r.me||'')}.~${b64e(L.join(','))}`}
function parseMatchHash(h){h=(h||'').replace(/^#/,'');const m=h.match(/match\.([a-z0-9]{4,16})\.([fma])([0-9a-f]?)(u?)(c?)(?:\.([A-Za-z0-9_-]*)\.([A-Za-z0-9~_-]*))?/);if(!m)return null;
  const out={code:m[1],f:m[2],sec:m[3]?parseInt(m[3],16):1,uni:!!m[4],cloud:!!m[5]};if(m[7]!==undefined){out.pname=b64d(m[6]||'').replace(/[\u0000-\u001f\u200e\u200f\u202a-\u202e\u2066-\u2069]/g,'').slice(0,30);out.plikes=[];out.psupers=[];
    if(m[7][0]==='~'){b64d(m[7].slice(1)).split(',').slice(0,3000).forEach(x=>{const sup=x[0]==='*';const n=sup?x.slice(1):x;if(IDX.has(n)){const id=IDX.get(n);if(!out.plikes.includes(id))out.plikes.push(id);if(sup)out.psupers.push(id)}})}
    else m[7].split('~').filter(Boolean).forEach(x=>{const sup=x[0]==='S';const id=legacyIdx(parseInt(sup?x.slice(1):x,36));if(id!=null){out.plikes.push(id);if(sup)out.psupers.push(id)}})}return out}
function ensureRoom(code,f,sec,uni){if(!NMX.rooms[code])NMX.rooms[code]={code,f,sec:sec||1,uni:!!uni,sent:0,me:'',likes:[],supers:[],passes:[],hist:[],pname:'',plikes:[],psupers:[],seen:[],created:Date.now(),pupd:0};return NMX.rooms[code]}
function matchesOf(r){const pl=new Set(r.plikes);const ms=r.likes.filter(i=>pl.has(i));
  const sc=i=>(r.supers.includes(i)?1:0)+(r.psupers.includes(i)?1:0);return ms.sort((a,b)=>sc(b)-sc(a)||r.likes.indexOf(a)-r.likes.indexOf(b))}
function importPartner(r,p,silent){const before=new Set(matchesOf(r));r.pname=p.pname||r.pname||'';r.plikes=p.plikes;r.psupers=p.psupers;r.pupd=Date.now();nmSave();
  const fresh=matchesOf(r).filter(i=>!before.has(i)&&!r.seen.includes(i));if(!silent&&fresh.length){r.seen.push(...fresh);nmSave();setTimeout(()=>matchModal(fresh),300)}return fresh}

/* ---------- deck ---------- */
function deckOrder(r){const st=stats(-1);const rnd=mulberry32(hash('nm'+r.code));const arr=[];
  const mask=r.sec||1;
  for(let i=0;i<N;i++){if(/[^א-ת]/.test(NAMES[i]))continue;const s=T(st,i);if(s<100)continue;const gp=st.tot[0][i]/s;
    const w4=SECTOT[i],tt=w4[0]+w4[1]+w4[2]+w4[3];let sh=0;for(let k=0;k<4;k++)if(mask&(1<<k))sh+=w4[k];if(sh/tt<.5)continue;
    const lo=r.uni?.4:.85,hi=r.uni?.6:.15;if(r.f==='f'&&gp<lo)continue;if(r.f==='m'&&gp>hi)continue;if(r.f==='a'&&!r.uni&&gp>.15&&gp<.85)continue;
    const c=comb(st,i);const r3=c[NY-1]+c[NY-2]+c[NY-3];arr.push([i,(r3+s/40)*(MEAN.has(NAMES[i])?1.3:1)])}
  /* popularity order, shuffled inside bands of 25 so it never feels like a ranked list */
  arr.sort((a,b)=>b[1]-a[1]);return arr.map((x,k)=>[x[0],Math.floor(k/25)+rnd()]).sort((a,b)=>a[1]-b[1]).map(a=>a[0])}
function remaining(r){if(NMX.deckFor!==r.code){NMX.deck=deckOrder(r);NMX.deckFor=r.code}let done=new Set([...r.likes,...r.passes]);let rem=NMX.deck.filter(i=>!done.has(i));
  if(!rem.length&&r.passes.length){r.round=(r.round||1)+1;r.passes=[];nmSave();toast(t('סבב חדש: השמות שדילגתם עליהם חוזרים','New round: skipped names are back'));done=new Set(r.likes);rem=NMX.deck.filter(i=>!done.has(i))}return rem}

/* ---------- live sync (when the room capability can connect) ---------- */
async function nmLive(){const r=R();if(!r||!r.me)return;if(NMX.joinTried===r.code)return;NMX.joinTried=r.code;
  const room=await cap('room');if(!room)return;
  try{const nr=await room.join('nm-'+r.code);NMX.live=nr;
    nr.onPeers(ch=>{const rr=R();if(!rr)return;const other=ch.peers.find(p=>!p.isMe&&p.presence&&p.presence.app==='nm');NMX.peer=other||null;
      if(other){const pr=other.presence;importPartner(rr,{pname:String(pr.n||'').slice(0,30),plikes:(pr.l||[]).filter(x=>Number.isInteger(x)&&x>=0&&x<N),psupers:(pr.s||[]).filter(x=>Number.isInteger(x)&&x>=0&&x<N)},false)}
      if(TAB==='match')nmTop()});
    nmPresence();}catch(e){NMX.live=null}}
let nmPT;function nmPresence(){clearTimeout(nmPT);nmPT=setTimeout(()=>{const r=R();if(!NMX.live||!r)return;NMX.live.presence({app:'nm',n:(r.me||'').slice(0,30),l:r.likes.slice(-600),s:r.supers.slice(-100)}).catch(()=>{})},250)}

/* ---------- views ---------- */
function renderMatch(){document.body.classList.add('matchmode');const sec=$('#tab-match');
  const h=parseMatchHash(location.hash);
  if(h){NMX.showRooms=false;const r=ensureRoom(h.code,h.f,h.sec,h.uni);if(h.cloud&&!r.me)r.cloudInvite=1;NMX.active=h.code;if(h.plikes){importPartner(r,h,!r.me);try{history.replaceState(null,'',HREF('match.'+h.code+'.'+rTok(r)))}catch(e){}}nmSave()}
  const r=R();
  if(!r||NMX.showRooms){nmOnboard(sec);return}
  if(!r.me){nmJoin(sec,r);return}
  sec.innerHTML=`<div class="nmapp"><div class="nmtop" id="nmtop"></div><div class="nmstage" id="nmstage"></div>
    <div class="nmbtns" dir="ltr"><button class="nmb sm" id="nb-undo" aria-label="${t('ביטול הפעולה האחרונה','Undo')}">${icon('undo')}</button><button class="nmb no" id="nb-no" aria-label="${t('לא בשבילנו','Pass')}">${icon('x')}</button><button class="nmb sup" id="nb-sup" aria-label="${t('מועדף עליון','Super like')}">${icon('star',1)}</button><button class="nmb yes" id="nb-yes" aria-label="${t('אהבתי','Like')}">${icon('v')}</button></div>
    <div class="nmhint">${t('ימינה: אהבתי · שמאלה: לא · למעלה: מועדף עליון','Right: like · Left: pass · Up: super like')}</div></div>`;
  $('#nb-yes').onclick=()=>nmFly('like');$('#nb-no').onclick=()=>nmFly('pass');$('#nb-sup').onclick=()=>nmFly('super');$('#nb-undo').onclick=nmUndo;
  nmTop();nmStage();if(r.cloud)cloudOpen(r);else nmLive();
}
/* "my rooms": every room on this device, open one, start a new one, or delete one */
function nmRooms(){NMX.showRooms=true;try{history.replaceState(null,'',HREF('match'))}catch(e){}cloudClose();renderMatch();window.scrollTo(0,0)}
async function nmDelRoom(b,sec){const code=b.dataset.del,r=NMX.rooms[code];if(!r)return;
  if(!b.dataset.sure){b.dataset.sure=1;b.classList.add('sure');b.innerHTML=`<span>${t('למחוק?','Delete?')}</span>`;setTimeout(()=>{if(b.isConnected&&b.dataset.sure){delete b.dataset.sure;b.classList.remove('sure');b.innerHTML=icon('close')}},4000);return}
  b.disabled=true;let ok=true;if(r.cloud)ok=await cloudLeave(r);
  delete NMX.rooms[code];if(NMX.active===code)NMX.active=null;nmSave();
  toast(ok?t('החדר נמחק','Room deleted'):t('החדר הוסר מהמכשיר. לשרת לא הצלחנו להגיע כרגע','Removed from this device; the server was unreachable'));
  NMX.showRooms=true;nmOnboard(sec)}
const ago=ts=>{if(!ts)return'';const m=Math.round((Date.now()-ts)/60000);return m<1?t('עכשיו','just now'):m<60?t(`לפני ${m} דק׳`,`${m}m ago`):m<1440?t(`לפני ${Math.round(m/60)} שע׳`,`${Math.round(m/60)}h ago`):t(`לפני ${Math.round(m/1440)} ימים`,`${Math.round(m/1440)}d ago`)};
function nmTop(){const r=R(),el=$('#nmtop');if(!el||!r)return;const ms=matchesOf(r).length;const live=r.cloud?CL.online:!!NMX.peer;
  el.innerHTML=`<button class="nmback" id="nmback" aria-label="${t('חזרה לאתר הראשי','Back to main site')}">${icon('back')}<span>${t('לאתר','Site')}</span></button><button class="nmrooms" id="nmrooms" aria-label="${t('החדרים שלי','My rooms')}">${icon('list')}</button>
    <button class="nmstatus" id="nmstat">${r.pname?`<i class="dot ${live?'on':''}"></i><span><b>${esc(r.me)}</b> ${t('ו','& ')}<b>${esc(r.pname)}</b>${live?'':r.cloud?'':` · <small>${ago(r.pupd)}</small>`}</span>`:`${icon('users')}<span>${r.cloud?t('הזמנת בן/בת הזוג','Invite your partner'):t('שליחה לבן/בת הזוג','Send to partner')}</span>`}</button>
    <button class="nmmatches" id="nmms" aria-label="${t('ההתאמות שלנו','Our matches')}">${icon('heart',ms>0)}<span>${t('התאמות','Matches')}</span><b>${ms}</b></button>`;
  $('#nmback').onclick=()=>{document.body.classList.remove('matchmode');setTab('home')};$('#nmstat').onclick=nmInvite;$('#nmms').onclick=nmMatches;$('#nmrooms').onclick=nmRooms;}
function nmNudge(r){if(r.cloud&&r.pname)return'';if(r.cloud){const n=r.likes.length;return n>=3&&n%3===0?`<button class="nmnudge" id="nmnudge">${icon('link')}<span>${t('בן/בת הזוג עוד לא בחדר. שלחו להם את הקישור','Your partner hasn’t joined yet. Send them the link')}</span></button>`:''}const fresh=r.likes.length-(r.sent||0);if(fresh<8)return'';return `<button class="nmnudge" id="nmnudge">${icon('link')}<span>${r.pname?t(`יש לך ${fresh} בחירות חדשות. שלחו ל${esc(r.pname)} כדי לגלות התאמות`,`${fresh} new picks. Send them to ${esc(r.pname)}`):t(`בחרת ${fresh} שמות. שלחו לבן/בת הזוג כדי שיצטרפו`,`You picked ${fresh}. Send them to your partner`)}</span></button>`}
function nmCardHTML(i,cls){const st=stats(-1),c=comb(st,i);const pd=peakDec(st,i);const m=MEAN.get(NAMES[i])||'';
  return `<div class="nmcard ${cls}" data-i="${i}"><div class="stampl like">${t('אהבתי','LIKE')}</div><div class="stampl pass">${t('לא','NOPE')}</div><div class="stampl sup">${t('מועדף','SUPER')}</div>
    <div class="nmname">${esc(NAMES[i])}</div>${LANG==='en'?`<div class="nmrom">${esc(rom(i))}</div>`:''}
    ${m&&LANG!=='en'?`<p class="nmmean">${esc(m)}</p>`:''}
    <div class="nmfacts"><span><b>${decLabel(pd)}</b>${t('עשור השיא','peak decade')}</span><span><b>${LEN[i]}</b>${t('אותיות','letters')}</span><span><b>${fmt(c[NY-1])}</b>${t(`תינוקות ב-${Y1}`,`babies in ${Y1}`)}</span></div>
    <div class="nmspark">${spark(share(st,i),260,40)}</div></div>`}
function nmStage(){const r=R(),el=$('#nmstage');if(!el)return;const rem=remaining(r);
  if(!rem.length){el.innerHTML=`<div class="nmend"><h3>${t('עברתם על כל השמות','You’ve seen every name')}</h3><p>${t(`אהבתם ${r.likes.length} שמות. שלחו את הבחירות לבן/בת הזוג כדי לגלות התאמות.`,`You liked ${r.likes.length}. Send your picks to find matches.`)}</p><button class="next" id="nmend-share">${t('שליחת הבחירות שלי','Send my picks')}</button></div>`;$('#nmend-share').onclick=nmInvite;return}
  el.innerHTML=(rem[1]!=null?nmCardHTML(rem[1],'under'):'')+nmCardHTML(rem[0],'top')+nmNudge(r);
  nmDrag(el.querySelector('.nmcard.top'));const nn=$('#nmnudge');if(nn)nn.onclick=nmInvite;}
function nmDrag(card){if(!card)return;let sx=0,sy=0,dx=0,dy=0,down=false;
  const set=()=>{card.style.transform=`translate(${dx}px,${dy}px) rotate(${dx/18}deg)`;
    card.querySelector('.like').style.opacity=Math.max(0,Math.min(1,dx/110));card.querySelector('.pass').style.opacity=Math.max(0,Math.min(1,-dx/110));card.querySelector('.sup').style.opacity=Math.max(0,Math.min(1,-dy/120))*(Math.abs(dx)<90?1:0)};
  card.addEventListener('pointerdown',e=>{if(NMX.busy)return;down=true;sx=e.clientX;sy=e.clientY;card.setPointerCapture(e.pointerId);card.style.transition='none'});
  card.addEventListener('pointermove',e=>{if(!down)return;dx=e.clientX-sx;dy=Math.min(40,e.clientY-sy);set()});
  const up=()=>{if(!down)return;down=false;card.style.transition='';
    if(dx>100)nmFly('like',dx,dy);else if(dx<-100)nmFly('pass',dx,dy);else if(dy<-110)nmFly('super',dx,dy);else{dx=0;dy=0;set();card.querySelectorAll('.stampl').forEach(s=>s.style.opacity=0)}};
  card.addEventListener('pointerup',up);card.addEventListener('pointercancel',up);}
function nmFly(type,dx=0,dy=0){const card=document.querySelector('.nmcard.top');if(!card)return;if(NMX.busy){if((NMX.q||(NMX.q=[])).length<4)NMX.q.push(type);return}NMX.busy=true;const W=window.innerWidth;
  card.querySelector(type==='like'?'.like':type==='pass'?'.pass':'.sup').style.opacity=1;
  card.style.transition='transform .32s cubic-bezier(.3,.7,.4,1),opacity .32s';
  card.style.transform=type==='super'?`translate(${dx}px,-${window.innerHeight}px) rotate(${dx/18}deg)`:`translate(${type==='like'?W*1.2:-W*1.2}px,${dy}px) rotate(${type==='like'?24:-24}deg)`;card.style.opacity=.2;
  setTimeout(()=>{NMX.busy=false;nmAct(type,+card.dataset.i);const nx=NMX.q&&NMX.q.shift();if(nx&&$('#modal').hidden)setTimeout(()=>nmFly(nx),20);else if(NMX.q)NMX.q.length=0},300)}
function nmAct(type,i){const r=R();r.hist.push({i,type});if(r.hist.length>200)r.hist.shift();
  if(type==='pass')r.passes.push(i);else{r.likes.push(i);if(type==='super')r.supers.push(i)}
  nmSave();nmPresence();cloudQueue(r,i,type==='super'?'super':type);
  if(type!=='pass'&&r.plikes.includes(i)&&!r.seen.includes(i)){r.seen.push(i);nmSave();matchModal([i])}
  nmStage();nmTop()}
function nmUndo(){const r=R();const h=r.hist.pop();if(!h){toast(t('אין מה לבטל','Nothing to undo'));return}
  const rm=(a,i)=>{const k=a.lastIndexOf(i);if(k>=0)a.splice(k,1)};rm(r.passes,h.i);rm(r.likes,h.i);rm(r.supers,h.i);nmSave();nmPresence();cloudQueue(r,h.i,'none');nmStage();nmTop()}
document.addEventListener('keydown',e=>{if(TAB!=='match'||!$('.nmcard.top')||!$('#modal').hidden||/INPUT|TEXTAREA/.test(document.activeElement.tagName))return;
  const rtl=false;if(e.key==='ArrowRight'){nmFly('like');e.preventDefault()}else if(e.key==='ArrowLeft'){nmFly('pass');e.preventDefault()}else if(e.key==='ArrowUp'){nmFly('super');e.preventDefault()}else if(e.key==='Backspace'||e.key==='z'){nmUndo();e.preventDefault()}});

function nmSetupForm(pre){const f=pre.f||store.get('nm_f','f'),sec=pre.sec||store.get('nm_sec',1),uni=pre.uni!=null?pre.uni:store.get('nm_uni',true);
  return `<div class="nmq"><div class="nml">${t('למי השם?','Who is it for?')}</div><div class="seg big nmf" id="nmsex">${['f','m','a'].map(k=>`<button data-f2="${k}" aria-pressed="${f===k}">${{f:t('בת','A girl'),m:t('בן','A boy'),a:t('עוד לא יודעים','Not sure yet')}[k]}</button>`).join('')}</div></div>
    <div class="nmq"><div class="nml">${t('מאילו מגזרים להציג שמות? (אפשר כמה)','Which communities? (pick any)')}</div><div class="chips sel" id="nmsec">${SECT().map((n,k)=>`<button data-b="${k}" aria-pressed="${!!(sec&(1<<k))}">${n}</button>`).join('')}</div></div>
    <label class="wztoggle nmuni"><input type="checkbox" id="nmuni" ${uni?'checked':''}><span><b>${t('לכלול גם שמות יוניסקס','Include unisex names')}</b><small>${t('כמו טל, נועם, אריאל, עדי','Like Tal, Noam, Ariel, Adi')}</small></span></label>`}
function nmReadForm(){const f=($('#nmsex [aria-pressed="true"]')||{}).dataset?.f2||'f';let sec=0;document.querySelectorAll('#nmsec [aria-pressed="true"]').forEach(b=>sec|=1<<+b.dataset.b);if(!sec)sec=1;const uni=$('#nmuni').checked;store.set('nm_f',f);store.set('nm_sec',sec);store.set('nm_uni',uni);return{f,sec,uni}}
function nmWireForm(){$('#nmsex').onclick=e=>{const b=e.target.closest('[data-f2]');if(!b)return;$('#nmsex').querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b))};
  $('#nmsec').onclick=e=>{const b=e.target.closest('[data-b]');if(!b)return;const on=b.getAttribute('aria-pressed')==='true';if(on&&document.querySelectorAll('#nmsec [aria-pressed="true"]').length===1)return;b.setAttribute('aria-pressed',String(!on))}}
function nmOnboard(sec){const rooms=Object.values(NMX.rooms).filter(x=>x.me).sort((a,b)=>(b.created||0)-(a.created||0));
  sec.innerHTML=`<div class="nmapp"><div class="nmtop"><button class="nmback" id="nmback">${icon('back')}<span>${t('לאתר הראשי','Main site')}</span></button></div>
    <div class="nmwelcome fade"><div class="nmlogo">${icon('heart',1)}</div><div class="k">${t('התאמת שמות זוגית','NameMatch for couples')}</div>
      <h2>${t('בוחרים שם<br>ביחד.','Choose a name<br>together.')}</h2>
      <p>${t('כל אחד מחליק לבד, מתי שנוח לו. כששניכם אוהבים את אותו שם, יש התאמה. בלי הרשמה, ואפשר לחזור לחדר בכל רגע.','Each of you swipes alone, whenever it suits. When you both like a name, it’s a match. No sign-up, and you can come back to the room anytime.')}</p>
      ${rooms.length?`<div class="nmprev"><div class="nml">${t('החדרים שלי','My rooms')}</div>${rooms.map(x=>`<div class="nmroom"><button data-room="${x.code}"><b>${x.pname?t(`${esc(x.me)} ו${esc(x.pname)}`,`${esc(x.me)} & ${esc(x.pname)}`):esc(x.me)}</b><span>${fLabel(x.f)} · ${x.likes.length} ${t('אהבתם','liked')} · ${matchesOf(x).length} ${t('התאמות','matches')}</span></button><button class="nmdel" data-del="${x.code}" aria-label="${t('מחיקת החדר','Delete room')}">${icon('close')}</button></div>`).join('')}<div class="nml" id="nmnewlab" style="margin-top:14px">${t('פתיחת חדר חדש','Open a new room')}</div></div>`:''}
      <label class="nml" for="nmme">${t('השם שלך','Your name')}</label><input class="inp nmin" id="nmme" maxlength="30" autocomplete="off" placeholder="${t('למשל: עידן','e.g. Dana')}" value="${esc(store.get('nm_me',''))}">
      ${nmSetupForm({})}
      <button class="next nmgo" id="nmcreate">${t('יצירת חדר משותף','Create a shared room')}</button>
    </div></div>`;
  $('#nmback').onclick=()=>{document.body.classList.remove('matchmode');setTab('home')};nmWireForm();
  $('#nmcreate').onclick=()=>{const me=$('#nmme').value.trim();if(!me){toast(t('כתבו את השם שלכם','Enter your name'));$('#nmme').focus();return}store.set('nm_me',me);
    const o=nmReadForm();const btn=$('#nmcreate');btn.disabled=true;btn.textContent=t('יוצרים חדר…','Creating…');
    NMX.showRooms=false;(async()=>{let code=cloudOn()?cloudCode():newCode();let r=ensureRoom(code,o.f,o.sec,o.uni);r.me=me.slice(0,30);r.host=1;
      if(cloudOn()&&!(await cloudCreate(r))){delete NMX.rooms[code];code=newCode();r=ensureRoom(code,o.f,o.sec,o.uni);r.me=me.slice(0,30);r.host=1;toast(t('אין חיבור לשרת כרגע. החדר יעבוד בשליחת קישורים.','No connection right now. The room will sync by links.'))}
      NMX.active=code;nmSave();try{history.replaceState(null,'',HREF('match.'+code+'.'+rTok(r)))}catch(e){}renderMatch();if(r.cloud)setTimeout(nmInvite,350)})()};
  sec.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>nmDelRoom(b,sec));
  if(NMX.newRoom){NMX.newRoom=false;setTimeout(()=>{const l=$('#nmnewlab')||$('#nmme');if(l)l.scrollIntoView({block:'center'});const i=$('#nmme');if(i)i.focus({preventScroll:true})},60)}
  sec.querySelectorAll('[data-room]').forEach(b=>b.onclick=()=>{NMX.showRooms=false;NMX.active=b.dataset.room;const r=R();nmSave();try{history.replaceState(null,'',HREF('match.'+r.code+'.'+rTok(r)))}catch(e){}renderMatch()});}
function nmJoin(sec,r,roster){const secs=SECT().filter((_,k)=>(r.sec||1)&(1<<k)).join(', ');
  /* a shared room link: first ask who is connecting, so a returning participant is never added twice */
  if(r.cloudInvite&&cloudOn()&&roster===undefined){
    sec.innerHTML=`<div class="nmapp"><div class="nmtop"><button class="nmback" id="nmback">${icon('back')}<span>${t('לאתר הראשי','Main site')}</span></button></div><div class="nmwelcome"><p class="sub">${t('טוענים את החדר…','Loading the room…')}</p></div></div>`;
    $('#nmback').onclick=()=>{document.body.classList.remove('matchmode');setTab('home')};
    cloudRoster(r.code).then(L=>{if(TAB==='match'&&R()===r&&!r.me)nmJoin(sec,r,L||[])});return}
  const names=roster||[];const who=names.length>0;
  sec.innerHTML=`<div class="nmapp"><div class="nmtop"><button class="nmback" id="nmback">${icon('back')}<span>${t('לאתר הראשי','Main site')}</span></button></div>
  <div class="nmwelcome fade"><div class="nmlogo">${icon('users')}</div><div class="k">${t('הוזמנת לבחור שם יחד','You’re invited to choose a name together')}</div>
    ${who?`<h2>${t('מי מתחבר כרגע?','Who’s connecting?')}</h2>
    <p>${t('חוזרים לחדר? בחרו את השם שלכם. הוזמנתם עכשיו? בחרו "משתתף/ת חדש/ה".','Coming back? Pick your name. Just invited? Choose "I’m new here".')}</p>
    <div class="nmwho">${names.map((n,k)=>`<button class="nmseat" data-k="${k}">${icon('users')}<span>${esc(n)}</span></button>`).join('')}
      <button class="nmseat nmnew" id="nmnew">${t('משתתף/ת חדש/ה','I’m new here')}</button></div>`
    :`<h2>${r.pname?t(`${esc(r.pname)} מחכה לך.`,`${esc(r.pname)} is waiting.`):t('בואו נבחר שם.','Let’s pick a name.')}</h2>`}
    <div class="nmform" id="nmform" ${who?'hidden':''}>
    <p>${t(`${fLabel(r.f)} · ${secs}${r.uni?' · כולל יוניסקס':''}. החליקו ימינה על שמות שאתם אוהבים${r.plikes.length?`, ו${esc(r.pname||'בן/בת הזוג')} כבר בחר/ה ${r.plikes.length} שמות. נגלה איפה אתם מסכימים`:''}.`,`${fLabel(r.f)} · ${secs}. Swipe right on names you love.`)}</p>
    <label class="nml" for="nmme">${t('השם שלך','Your name')}</label><input class="inp nmin" id="nmme" maxlength="30" autocomplete="off" value="${who?'':esc(store.get('nm_me',''))}">
    <button class="next nmgo" id="nmjoin">${t('הצטרפות לחדר','Join the room')}</button></div></div></div>`;
  $('#nmback').onclick=()=>{document.body.classList.remove('matchmode');setTab('home')};
  const done=()=>{r.invShown=1;delete r.cloudInvite;try{history.replaceState(null,'',HREF('match.'+r.code+'.'+rTok(r)))}catch(e){}nmSave();renderMatch()};
  const claim=async name=>{sec.querySelectorAll('button').forEach(b=>b.disabled=true);const res=await cloudClaim(r,name);
    if(res==='ok'){store.set('nm_me',name);done();toast(t(`שמחים שחזרת, ${name}. ממשיכים מאיפה שעצרת.`,`Welcome back, ${name}.`));return}
    r.me='';toast(res==='missing'?t('השם הזה כבר לא נמצא בחדר','That name is no longer in the room'):res==='full'?t('החדר הזה כבר מלא','This room is already full'):t('אין חיבור לשרת כרגע. נסו שוב בעוד רגע.','No connection right now. Try again in a moment.'));nmJoin(sec,r,res==='missing'?undefined:names)};
  const askClaim=name=>{const close=nmModal(`<h3>${t('השם הזה כבר בחדר, לחבר אותך אליו?','That name is already in the room. Connect you to it?')}</h3>
      <p class="sub">${t(`אם זה את/ה, ${esc(name)} ימשיך מאיפה שעצר, בלי ליצור משתתף כפול.`,`If it’s you, ${esc(name)} continues where it left off, without a duplicate.`)}</p>
      <button class="next nmgo" id="nmyes">${t(`כן, אני ${esc(name)}`,`Yes, I’m ${esc(name)}`)}</button><button class="linkbtn nmno" id="nmno">${t('לא, אבחר שם אחר','No, I’ll pick another name')}</button>`,'nminv');
    $('#nmyes').onclick=()=>{close();claim(name)};$('#nmno').onclick=()=>{close();const i=$('#nmme');if(i){i.focus();i.select()}}};
  /* only one name in the room: that is usually the person who sent the invite, so make sure before connecting */
  const showNew=()=>{sec.querySelector('.nmwho').hidden=true;const h=sec.querySelector('.nmwelcome h2');if(h)h.textContent=t('בואו נבחר שם.','Let’s pick a name.');const pp=sec.querySelector('.nmwelcome>p');if(pp)pp.hidden=true;$('#nmform').hidden=false;$('#nmme').focus()};
  sec.querySelectorAll('.nmseat[data-k]').forEach(b=>b.onclick=()=>{const n=names[+b.dataset.k];if(names.length>1){claim(n);return}
    const close=nmModal(`<h3>${t(`להמשיך בתור ${esc(n)}?`,`Continue as ${esc(n)}?`)}</h3><p class="sub">${t(`בחרו בזה רק אם אתם ${esc(n)} וחוזרים מדפדפן או ממכשיר אחר. אם ${esc(n)} הזמין/ה אתכם, הצטרפו כמשתתף/ת חדש/ה.`,`Only if you are ${esc(n)} coming back from another browser or device. If ${esc(n)} invited you, join as new.`)}</p>
      <button class="next nmgo" id="nmyes">${t(`כן, אני ${esc(n)}`,`Yes, I’m ${esc(n)}`)}</button><button class="linkbtn nmno" id="nmno">${t('לא, אני מצטרף/ת בפעם הראשונה','No, I’m joining for the first time')}</button>`,'nminv');
    $('#nmyes').onclick=()=>{close();claim(n)};$('#nmno').onclick=()=>{close();showNew()}});
  if(who)$('#nmnew').onclick=showNew;
  $('#nmjoin').onclick=async()=>{const me=$('#nmme').value.trim();if(!me){toast(t('כתבו את השם שלכם','Enter your name'));return}
    const dup=names.find(n=>sameName(n,me));if(dup){askClaim(dup);return}
    store.set('nm_me',me);r.me=me.slice(0,30);r.invShown=1;
    if(r.cloudInvite){const b=$('#nmjoin');b.disabled=true;b.textContent=t('מצטרפים…','Joining…');const res=await cloudJoin(r);
      const reset=()=>{r.me='';b.disabled=false;b.textContent=t('הצטרפות לחדר','Join the room')};
      if(res==='full'){reset();toast(t('החדר הזה כבר מלא','This room is already full'));return}
      if(res==='taken'){reset();askClaim(me);return}
      if(res!=='ok')toast(t('אין חיבור לשרת כרגע. ממשיכים בשליחת קישורים.','No connection right now. Using links instead.'));
      done();return}
    nmSave();renderMatch()}}
function nmModal(html,cls=''){const m=$('#modal');m.hidden=false;m.innerHTML=`<div class="mbox ${cls}" role="dialog"><button class="mclose" id="mclose" aria-label="${t('סגירה','Close')}">${icon('close')}</button>${html}</div>`;
  const close=()=>m.hidden=true;$('#mclose').onclick=close;m.onclick=e=>{if(e.target===m)close()};return close}
const picksText=r=>r.pname?t(`הבחירות החדשות שלי בהתאמת השמות. פתח/י כדי לראות את ההתאמות שלנו:\n${picksLink(r)}`,`My latest picks. Open to see our matches:\n${picksLink(r)}`):t(`בואו נבחר שם לתינוק ביחד! פתח/י את הקישור, כתוב/י את השם שלך ותתחיל/י להחליק:\n${picksLink(r)}`,`Let's choose a baby name together! Open the link and start swiping:\n${picksLink(r)}`);
function nmInvite(){const r=R();if(r.cloud)return nmInviteCloud(r);const live=!!NMX.live;
  const close=nmModal(`<h3>${r.pname?t(`החדר של ${esc(r.me)} ו${esc(r.pname)}`,`${esc(r.me)} & ${esc(r.pname)}`):t('שליחה לבן/בת הזוג','Send to your partner')}</h3>
    <p class="sub">${t('הקישור הוא גם ההזמנה וגם הבחירות שלכם. שולחים אותו בכל פעם שבחרתם עוד שמות, ובן/בת הזוג עושים אותו דבר בחזרה. כך ההתאמות מתעדכנות אצל שניכם.','The link is both the invite and your picks. Send it whenever you’ve picked more, and your partner does the same back.')}</p>
    ${shareRow(picksText(r))}
    <div class="nmstate">${r.pname?`<div><b>${esc(r.pname)}</b> · ${t(`${r.plikes.length} בחירות התקבלו ${ago(r.pupd)}`,`${r.plikes.length} picks received ${ago(r.pupd)}`)}</div>`:`<div>${t('עוד לא התקבלו בחירות מבן/בת הזוג','No picks from your partner yet')}</div>`}<div>${t(`שלחת לאחרונה ${r.sent||0} מתוך ${r.likes.length} הבחירות שלך`,`You last sent ${r.sent||0} of your ${r.likes.length} picks`)}</div>${live?`<div class="liveok">${t('שניכם מחוברים עכשיו, הבחירות מסתנכרנות לבד','You’re both online, picks sync live')}</div>`:''}</div>
    <details class="nmpastebox"><summary>${t('קיבלתם קישור והוא נפתח בדפדפן אחר?','Got a link that opened in another browser?')}</summary><div class="nmpaste"><input class="inp" id="nmpaste" placeholder="${t('הדביקו כאן את הקישור','Paste the link here')}" autocomplete="off"><button class="copybtn" id="nmpastego">${t('קליטה','Import')}</button></div></details>`,'nminv');
  wireShare(picksText(r),()=>{r.sent=r.likes.length;nmSave();nmStage()},close);
  $('#nmpastego').onclick=()=>{const v=$('#nmpaste').value;const k=v.indexOf('#');const p=parseMatchHash(k>=0?v.slice(k):v);
    if(!p||!p.plikes){toast(t('זה לא נראה כמו קישור בחירות','That doesn’t look like a picks link'));return}
    if(p.code!==r.code){toast(t('הקישור שייך לחדר אחר','That link belongs to another room'));return}
    const fresh=importPartner(r,p,true);close();nmTop();if(fresh.length){r.seen.push(...fresh.filter(i=>!r.seen.includes(i)));nmSave();matchModal(fresh)}else toast(t(`נקלטו ${p.plikes.length} בחירות. עוד אין התאמות חדשות.`,`Imported ${p.plikes.length} picks. No new matches yet.`))};}
/* share sheet for an invite / picks link: WhatsApp first (opens the app with the message ready), then copy, then the phone's own share menu */
const waURL=text=>'https://wa.me/?text='+encodeURIComponent(text);
function shareRow(text,onSend){return `<a class="next nmsend nmwa" id="nmwa" href="${waURL(text)}" target="_blank" rel="noopener">${icon('chat')}<span>${t('שליחה בוואטסאפ','Send on WhatsApp')}</span></a>
    <div class="nmshare2"><button class="copybtn" id="nmcopy">${icon('link')} ${t('העתקת קישור','Copy link')}</button>${navigator.share?`<button class="copybtn" id="nmos">${t('שיתוף אחר','Other apps')}</button>`:''}</div>`}
function wireShare(text,onSend,close){const done=()=>{if(onSend)onSend();setTimeout(close,150)};
  const wa=$('#nmwa');if(wa)wa.onclick=()=>done();
  const cp=$('#nmcopy');if(cp)cp.onclick=()=>{copy(text);done()};
  const os=$('#nmos');if(os)os.onclick=()=>{navigator.share({text}).then(done).catch(()=>{})}}
const inviteText=r=>t(`בואו נבחר שם לתינוק ביחד! פתח/י את הקישור והתחל/י להחליק. ההתאמות יופיעו לשנינו בזמן אמת:\n${inviteLink(r)}`,`Let's choose a baby name together! Open the link and start swiping. Matches show up for both of us live:\n${inviteLink(r)}`);
function invCloudState(r){const others=cloudOthers();
  return{h:others.length?t(`החדר של ${esc(r.me)} ו${esc(others.join(' ו'))}`,`${esc(r.me)} & ${esc(others.join(' & '))}`):t('הזמנת בן/בת הזוג','Invite your partner'),
    st:`${others.length?`<div><b>${esc(others.join(', '))}</b> · ${CL.online?t('מחובר/ת עכשיו','online now'):t('לא מחובר/ת כרגע. הבחירות יחכו','offline, picks will wait')}</div>`:`<div>${t('עוד אף אחד לא הצטרף','Nobody has joined yet')}</div>`}<div class="${CL.live?'liveok':''}">${CL.live?t('מחובר לסנכרון חי','Live sync connected'):t('מתחבר לסנכרון…','Connecting…')}</div>`}}
/* the open invite window follows the room live (someone joins while it is open) */
function invCloudRefresh(){const box=document.querySelector('#modal:not([hidden]) .cloudinv');const r=R();if(!box||!r)return;const s=invCloudState(r);
  const h=box.querySelector('#invh'),st=box.querySelector('#invst');if(h)h.innerHTML=s.h;if(st)st.innerHTML=s.st}
function nmInviteCloud(r){const s=invCloudState(r),text=inviteText(r);
  const close=nmModal(`<h3 id="invh">${s.h}</h3>
    <p class="sub">${t('שולחים את הקישור פעם אחת בלבד. מהרגע שבן/בת הזוג מצטרפים, כל בחירה מסתנכרנת לבד, וכשיש התאמה היא קופצת לשניכם באותו רגע.','Send the link once. After your partner joins, every swipe syncs by itself and matches pop up on both phones at the same moment.')}</p>
    ${shareRow(text)}
    <div class="nmstate" id="invst">${s.st}</div>`,'nminv cloudinv');
  wireShare(text,null,close);cloudSync(r,true)}
function matchModal(ids){const r=R();const i=ids[0];const m=MEAN.get(NAMES[i]);
  const close=nmModal(`<div class="mmatch"><div class="rings"><i></i><i></i></div><div class="mk">${t('יש לנו התאמה','It’s a match')}</div>
    <div class="mname">${esc(NAMES[i])}</div>${m&&LANG!=='en'?`<p>${esc(m)}</p>`:''}
    <div class="mwho">${esc(r.me)} ${icon('heart',1)} ${esc(r.pname||t('בן/בת הזוג','partner'))}</div>
    ${ids.length>1?`<div class="sub">${t(`ועוד ${ids.length-1} התאמות חדשות`,`and ${ids.length-1} more new matches`)}</div>`:''}
    <div class="mrow"><button class="next" id="mmgo">${t('המשך בהחלקות','Keep swiping')}</button><button class="copybtn" id="mmall">${t('צפייה בכל ההתאמות','See all matches')}</button></div></div>`,'matchbox');
  $('#mmgo').onclick=close;$('#mmall').onclick=()=>{close();nmMatches()};nmTop()}
function nmMatches(){const r=R();const ms=matchesOf(r);const st=stats(-1);
  const close=nmModal(`<h3>${t('ההתאמות שלנו','Our matches')} <span class="cnt">${ms.length}</span></h3>
    ${ms.length?`<div class="favlist">${ms.map(i=>{const both=r.supers.includes(i)&&r.psupers.includes(i),one=r.supers.includes(i)||r.psupers.includes(i);
      return `<div class="favrow"><button class="fvname" data-q="${i}"><b>${esc(NAMES[i])}${both?` <em class="sbadge">${t('מועדף על שניכם','both super-liked')}</em>`:one?` <em class="sbadge">${t('מועדף עליון','super like')}</em>`:''}</b><span>${esc(shortMean(i))}</span></button>${spark(share(st,i),70,22)}<button class="iconbtn" data-sv="${esc(NAMES[i])}" aria-label="${t('שמירה','Save')}">${icon('save',isFav(NAMES[i]))}</button></div>`}).join('')}</div>
      <div class="mrow"><button class="next" id="mcopy">${icon('copy')} ${t('העתקת הרשימה','Copy list')}</button></div>`
     :`<p class="sub">${r.pname||r.plikes.length?t('עוד אין שמות ששניכם אהבתם. המשיכו להחליק.','No shared likes yet. Keep swiping.'):t('ההתאמות יופיעו כאן אחרי שבן/בת הזוג יצטרפו וישלחו את הבחירות שלהם.','Matches show up here once your partner joins and sends their picks.')}</p>${r.pname?'':`<div class="mrow"><button class="next" id="minv">${t('הזמנת שותף','Invite partner')}</button></div>`}`}`,'favpanel');
  $('#modal').querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>quickView(+b.dataset.q));
  $('#modal').querySelectorAll('[data-sv]').forEach(b=>b.onclick=e=>{e.stopPropagation();toggleFav(b.dataset.sv);b.innerHTML=icon('save',isFav(b.dataset.sv))});
  const c=$('#mcopy');if(c)c.onclick=()=>copy(t(`ההתאמות שלנו (${r.me} ו${r.pname||'בן/בת הזוג'}):\n${ms.map((i,k)=>`${k+1}. ${NAMES[i]}${r.supers.includes(i)||r.psupers.includes(i)?' (מועדף)':''}`).join('\n')}\n\nמתוך התאמת השמות של "השמות של ישראל": ${SHARE_URL}`,`Our matches:\n${ms.map((i,k)=>`${k+1}. ${rom(i)} (${NAMES[i]})`).join('\n')}\n\n${SHARE_URL}`));
  const iv=$('#minv');if(iv)iv.onclick=()=>{close();nmInvite()};}
addEventListener('hashchange',()=>{const h=(location.hash||'').slice(1);if(/^match/.test(h)){if(TAB!=='match')setTab('match');else renderMatch()}else if(TABS.includes(h)&&h!==TAB)setTab(h)});
