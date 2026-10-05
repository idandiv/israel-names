/* =========================================================
   NameMatch realtime (Supabase).
   - Every visitor is signed in anonymously (no e-mail), the session lives in localStorage.
   - Rooms/members are created through RPCs; each member upserts its own swipes.
   - A Realtime channel per room streams the partner's swipes (postgres_changes, RLS-scoped)
     and presence (who is online). A match pops on both phones within a fraction of a second.
   - Falls back to the link-exchange mode when Supabase is not configured or unreachable.
   ========================================================= */
const SBC=(window.SITE_CONFIG||{}).supabase||null;
const CL={client:null,loading:null,uid:null,seat:null,ch:null,room:null,members:new Map(),p:new Map(),online:false,live:false,flushing:false,pullSeq:0,pulling:0,evq:[],opening:null,lastOpen:0,lastSync:0};
const cloudOn=()=>!!(SBC&&SBC.url&&SBC.key&&SBC.lib);
function sbLoad(){if(!cloudOn())return Promise.resolve(null);if(CL.loading)return CL.loading;
  CL.loading=new Promise(res=>{if(window.supabase&&window.supabase.createClient)return res(window.supabase);
      const s=document.createElement('script');s.src=SBC.lib;s.async=true;s.onload=()=>res(window.supabase||null);s.onerror=()=>res(null);document.head.appendChild(s)})
    .then(async lib=>{if(!lib)throw new Error('lib');
      const c=CL.client||lib.createClient(SBC.url,SBC.key,{auth:{persistSession:true,autoRefreshToken:true,storageKey:'bnil_sb_auth'}});CL.client=c;
      const g=await c.auth.getSession();let session=g.data&&g.data.session;
      /* never replace a stored identity because of a network blip: only sign in anew when there is truly no session */
      if(!session){if(g.error)throw g.error;const {data,error}=await c.auth.signInAnonymously();if(error)throw error;session=data.session}
      CL.uid=session.user.id;return c})
    .catch(e=>{console.warn('[namematch] realtime unavailable',e&&e.message);CL.loading=null;return null});
  return CL.loading}
const cloudCode=()=>Array.from({length:10},()=>'abcdefghjkmnpqrstuvwxyz23456789'[Math.floor(Math.random()*31)]).join('');

async function cloudCreate(r){const c=await sbLoad();if(!c)return false;
  const {error}=await c.rpc('create_room',{p_code:r.code,p_sex:r.f,p_sectors:r.sec||1,p_unisex:!!r.uni,p_name:r.me});
  if(error){console.warn('[namematch] create',error.message);return false}r.cloud=1;nmSave();return true}
async function cloudJoin(r){const c=await sbLoad();if(!c)return 'off';
  const {data,error}=await c.rpc('join_room',{p_code:r.code,p_name:r.me});
  if(error)return error.code==='P0002'?'missing':error.code==='P0001'?'full':error.code==='P0003'?'taken':'off';
  r.cloud=1;if(data){r.f=data.sex;r.sec=data.sectors;r.uni=data.unisex;NMX.deckFor=null}nmSave();return 'ok'}
/* returning participants: the names already in a room, and "I'm <name>" on a new device / browser */
async function cloudRoster(code){const c=await sbLoad();if(!c)return null;const {data,error}=await c.rpc('room_roster',{p_code:code});
  if(error){console.warn('[namematch] roster',error.message);return null}return (data||[]).map(x=>x.display_name).filter(Boolean)}
async function cloudClaim(r,name){const c=await sbLoad();if(!c)return 'off';
  const {data,error}=await c.rpc('claim_seat',{p_code:r.code,p_name:name});
  if(error)return error.code==='P0002'||error.code==='P0004'?'missing':error.code==='P0001'?'full':'off';
  r.cloud=1;r.me=name;r.restore=1;if(data){r.f=data.sex;r.sec=data.sectors;r.uni=data.unisex}NMX.deckFor=null;nmSave();return 'ok'}
const sameName=(a,b)=>String(a||'').trim().toLowerCase()===String(b||'').trim().toLowerCase();
/* partner names: every participant except me (my other devices are not partners) */
const cloudOthers=()=>{const out=[];CL.members.forEach((m,u)=>{if(m.seat===CL.seat||m.seat!==u)return;if(!out.includes(m.n))out.push(m.n)});return out};

/* leave a room on the server (my participant and its swipes); a room nobody is left in is deleted */
async function cloudLeave(r){const c=await sbLoad();if(!c)return false;if(CL.room===r.code)cloudClose();
  try{const {error}=await c.rpc('leave_room',{p_code:r.code});return !error}catch(e){return false}}
/* outgoing: a small persistent queue so swipes made offline are sent later */
function cloudQueue(r,i,kind){if(!r.cloud)return;(r.q=r.q||[]).push([NAMES[i],kind]);nmSave();cloudFlush(r)}
async function cloudFlush(r){if(!r||!r.cloud||!CL.client||!CL.seat||CL.room!==r.code||CL.flushing||!(r.q&&r.q.length))return;CL.flushing=true;
  const batch=r.q.slice(0,300);const last=new Map();batch.forEach(([n,k])=>last.set(n,k));
  const rows=[...last].map(([name,kind])=>({room_code:r.code,user_id:CL.seat,name,kind}));
  const {error}=await CL.client.from('swipes').upsert(rows,{onConflict:'room_code,user_id,name'});CL.flushing=false;
  if(!error){r.q.splice(0,batch.length);nmSave();if(r.q.length)cloudFlush(r)}else{console.warn('[namematch] send',error.message);setTimeout(()=>cloudFlush(r),4000)}}

/* incoming: partner state is rebuilt from everyone else's rows */
function cloudApply(r,silent){const pl=new Set(),ps=new Set();
  CL.p.forEach(m=>m.forEach((k,n)=>{const i=IDX.get(n);if(i==null)return;if(k==='like'||k==='super')pl.add(i);if(k==='super')ps.add(i)}));
  const names=cloudOthers();
  importPartner(r,{pname:names.join(t(' ו',' & ')),plikes:[...pl],psupers:[...ps]},silent);r.pname=names.join(t(' ו',' & '));   /* someone left: their name goes too */if(TAB==='match')nmTop();invCloudRefresh()}
/* full snapshot of the room (members + swipes). Returns false when it failed, so the caller can retry.
   Responses are sequenced (an older one never overwrites a newer one), and realtime swipes that
   arrive while a snapshot is in flight are re-applied on top of it. */
async function cloudPull(r){const c=CL.client;if(!c||CL.room!==r.code)return true;const seq=++CL.pullSeq;CL.pulling++;if(CL.pulling===1)CL.evq=[];
  let m,s;try{[m,s]=await Promise.all([c.from('room_members').select('user_id,display_name,seat_of').eq('room_code',r.code),swipesAll(c,r.code)])}
  catch(e){m={error:e}}finally{CL.pulling--}
  if(seq!==CL.pullSeq||CL.room!==r.code)return true;
  if(m.error||(s&&s.error)){console.warn('[namematch] pull',((m.error||s.error)||{}).message);return false}
  const before=CL.membersRoom===r.code?cloudOthers():[];
  CL.members=new Map(m.data.map(x=>[x.user_id,{n:x.display_name,seat:x.seat_of||x.user_id}]));CL.membersRoom=r.code;const mine=CL.members.get(CL.uid);CL.seat=mine?mine.seat:CL.uid;CL.p=new Map();
  const restoring=!!r.restore;if(restoring){cloudRestore(r,s.data.filter(x=>x.user_id===CL.seat));delete r.restore}
  const put=x=>{if(x.user_id===CL.seat)return;if(!CL.p.has(x.user_id))CL.p.set(x.user_id,new Map());CL.p.get(x.user_id).set(x.name,x.kind)};
  s.data.forEach(put);if(!CL.pulling){CL.evq.forEach(put);CL.evq=[]}
  CL.lastSync=Date.now();cloudApply(r,restoring);
  {const now=cloudOthers();before.filter(n=>!now.includes(n)).forEach(n=>toast(t(`${n} יצא/ה מהחדר`,`${n} left the room`)))}
  if(restoring){r.seen=[...new Set([...r.seen,...matchesOf(r)])];nmSave();if(TAB==='match'&&R()===r)nmStage()}
  return true}
/* all swipes of a room, page by page (the API returns at most 1,000 rows per request) */
async function swipesAll(c,code){const out=[];for(let from=0;from<50000;from+=1000){const {data,error}=await c.from('swipes').select('user_id,name,kind').eq('room_code',code).order('user_id').order('name').range(from,from+999);
    if(error)return{error};out.push(...data);if(data.length<1000)break}return{data:out}}
/* one entry point for "bring this room up to date": send pending swipes, then take a snapshot; retries on failure */
let syncT=null,syncTry=0;
function cloudSync(r,now){if(!r||!r.cloud)return;clearTimeout(syncT);syncT=setTimeout(()=>doSync(r),now?0:250)}
async function doSync(r){if(!r||!r.cloud||CL.room!==r.code||!CL.client)return;await cloudFlush(r);const ok=await cloudPull(r);
  if(ok){syncTry=0;return}syncTry++;clearTimeout(syncT);syncT=setTimeout(()=>{const rr=R();if(rr===r)doSync(r)},[1000,3000,8000,15000][Math.min(syncTry-1,3)])}
/* a device that just connected to an existing participant continues from that participant's swipes */
function cloudRestore(r,rows){const L=new Set(),S=new Set(),P=new Set();
  rows.forEach(x=>{const i=IDX.get(x.name);if(i==null)return;if(x.kind==='like'||x.kind==='super')L.add(i);if(x.kind==='super')S.add(i);if(x.kind==='pass')P.add(i)});
  r.likes=[...L];r.supers=[...S];r.passes=[...P];r.hist=[];r.q=[];NMX.deckFor=null;nmSave()}
const chOk=()=>!!(CL.ch&&CL.ch.state!=='closed');   /* 'closed' = the library gave up on this channel; errored ones it rejoins by itself */
const trackMe=()=>{if(!CL.ch||!CL.live)return;const rr=R();try{CL.ch.track({n:rr?rr.me:'',s:CL.seat})}catch(e){}};
function cloudClose(){if(CL.ch&&CL.client){try{CL.ch.untrack()}catch(e){}try{CL.client.removeChannel(CL.ch)}catch(e){}}CL.ch=null;CL.room=null;CL.live=false;CL.online=false;CL.members=new Map();CL.p=new Map()}
async function cloudOpen(r){if(!r||!r.cloud)return;if(CL.room===r.code&&chOk())return;
  if(CL.opening===r.code)return;CL.opening=r.code;CL.lastOpen=Date.now();
  try{await cloudOpenNow(r)}finally{if(CL.opening===r.code)CL.opening=null}}
async function cloudOpenNow(r){const c=await sbLoad();if(!c){if(TAB==='match')nmTop();return}   /* the 3s timer retries the open */
  cloudClose();CL.room=r.code;CL.seat=null;
  const {error}=await c.rpc('join_room',{p_code:r.code,p_name:r.me});   /* idempotent: refreshes membership/display name */
  if(error&&error.code==='P0002'){toast(t('החדר לא נמצא בשרת. ממשיכים במצב קישורים.','Room not found online. Using links instead.'));r.cloud=0;nmSave();CL.room=null;return}
  if(error&&error.code==='P0003'){   /* this browser lost its anonymous identity: reconnect through "who is connecting?" */
    CL.room=null;r.me='';r.cloudInvite=1;nmSave();if(TAB==='match')renderMatch();return}
  if(error){CL.room=null;console.warn('[namematch] open',error.message);return}   /* retried by the timer */
  await cloudPull(r);await cloudFlush(r);   /* show the room right away, even before the socket is up */
  if(CL.room!==r.code)return;
  for(const old of (c.getChannels?c.getChannels():[]).filter(x=>x.topic==='realtime:nm:'+r.code)){try{await c.removeChannel(old)}catch(e){}}
  if(CL.room!==r.code)return;
  const ch=c.channel('nm:'+r.code,{config:{presence:{key:CL.uid}}});CL.ch=ch;
  ch.on('postgres_changes',{event:'*',schema:'public',table:'swipes',filter:'room_code=eq.'+r.code},p=>{if(store.get('debug',0))console.log('[namematch] change',p.eventType);const x=p.new;if(!x||!x.user_id||x.user_id===CL.seat)return;
      if(CL.pulling)CL.evq.push(x);
      if(!CL.p.has(x.user_id))CL.p.set(x.user_id,new Map());CL.p.get(x.user_id).set(x.name,x.kind);const rr=R();if(!rr||rr.code!==r.code)return;
      cloudApply(rr,false);if(!CL.members.has(x.user_id))cloudSync(rr)})   /* a swipe from someone we don't know yet: refresh the members */
    .on('postgres_changes',{event:'*',schema:'public',table:'room_members',filter:'room_code=eq.'+r.code},p=>{const x=p.new;if(!x||!x.user_id||x.user_id===CL.uid)return;
      const isNew=!CL.members.has(x.user_id)&&!x.seat_of;const rr=R();if(rr&&rr.code===r.code){if(isNew)toast(t(`${x.display_name} הצטרף/ה לחדר`,`${x.display_name} joined`));cloudSync(rr)}})
    .on('presence',{event:'sync'},()=>{const ps=ch.presenceState();CL.online=Object.keys(ps).some(k=>k!==CL.uid&&!(ps[k]||[]).some(m=>m&&m.s&&m.s===CL.seat));if(TAB==='match')nmTop();invCloudRefresh()})
    .subscribe(async (st,err)=>{if(store.get('debug',0))console.log('[namematch] channel',st,err&&err.message);if(CL.ch!==ch)return;
      if(st==='SUBSCRIBED'){CL.live=true;trackMe();const rr=R();if(rr&&rr.code===r.code)cloudSync(rr,true)}
      else if(st==='CHANNEL_ERROR'||st==='TIMED_OUT'||st==='CLOSED'){CL.live=false;CL.online=false}
      if(TAB==='match')nmTop()});}
/* safety nets, every 3s while the room is on screen:
   - not connected yet (no network / server hiccup): retry opening the room
   - socket down: take a snapshot every tick; socket up: still a light snapshot every 15s, in case an event was missed */
setInterval(()=>{if(document.visibilityState!=='visible'||TAB!=='match')return;const r=R();if(!r||!r.cloud||!r.me)return;
  if(CL.live&&CL.client&&CL.client.realtime&&typeof CL.client.realtime.isConnected==='function'&&!CL.client.realtime.isConnected()){CL.live=false;CL.online=false;nmTop()}
  if(CL.room!==r.code||!chOk()){if(!CL.opening&&Date.now()-CL.lastOpen>8000)cloudOpen(r);return}
  if(!CL.client)return;
  if(!CL.live||Date.now()-CL.lastSync>15000)doSync(r)},3000);
/* phones sleep and apps switch (e.g. to WhatsApp to send the invite): catch up the moment the page is back */
function cloudResume(){const r=R();if(TAB!=='match'||!r||!r.cloud||!r.me)return;
  if(CL.live&&CL.client&&CL.client.realtime&&typeof CL.client.realtime.isConnected==='function'&&!CL.client.realtime.isConnected()){CL.live=false;CL.online=false}
  trackMe();if(CL.room!==r.code||!chOk()){CL.lastOpen=0;cloudOpen(r)}else cloudSync(r,true)}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState!=='visible'){if(CL.ch)try{CL.ch.untrack()}catch(e){}return}cloudResume()});
addEventListener('pageshow',e=>{if(e.persisted)cloudResume()});
addEventListener('focus',()=>{if(Date.now()-CL.lastSync>4000)cloudResume()});
addEventListener('pagehide',()=>{if(CL.ch)try{CL.ch.untrack()}catch(e){}});
addEventListener('online',cloudResume);

/* "Delete all my data": remove this browser's anonymous user, memberships and swipes from the server */
async function cloudDeleteMe(){if(!cloudOn())return'none';let had=false;try{had=!!localStorage.getItem('bnil_sb_auth')}catch(e){}if(!had)return'none';
  try{const c=await sbLoad();if(!c)return'fail';cloudClose();const {error}=await c.rpc('delete_my_data');if(error)return'fail';try{await c.auth.signOut({scope:'local'})}catch(e){}return'ok'}catch(e){return'fail'}}
/* after the reload that follows a wipe: say what happened */
setTimeout(()=>{let w=null;try{w=sessionStorage.getItem('wiped');sessionStorage.removeItem('wiped')}catch(e){}if(!w)return;
  toast(w==='ok'?t('כל הנתונים שלך נמחקו, מהמכשיר ומהשרת','All your data was deleted, from this device and the server'):w==='fail'?t('הנתונים נמחקו מהמכשיר. לשרת לא הצלחנו להגיע, והחדרים שם יימחקו אוטומטית אחרי 90 יום','Deleted from this device. The server was unreachable; rooms there are removed after 90 days'):t('כל הנתונים שלך נמחקו מהמכשיר','All your data was deleted from this device'))},1200);
