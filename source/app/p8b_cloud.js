/* =========================================================
   NameMatch realtime (Supabase).
   - Every visitor is signed in anonymously (no e-mail), the session lives in localStorage.
   - Rooms/members are created through RPCs; each member upserts its own swipes.
   - A Realtime channel per room streams the partner's swipes (postgres_changes, RLS-scoped)
     and presence (who is online). A match pops on both phones within a fraction of a second.
   - Falls back to the link-exchange mode when Supabase is not configured or unreachable.
   ========================================================= */
const SBC=(window.SITE_CONFIG||{}).supabase||null;
const CL={client:null,loading:null,uid:null,seat:null,ch:null,room:null,members:new Map(),p:new Map(),online:false,live:false,flushing:false};
const cloudOn=()=>!!(SBC&&SBC.url&&SBC.key&&SBC.lib);
function sbLoad(){if(!cloudOn())return Promise.resolve(null);if(CL.loading)return CL.loading;
  CL.loading=new Promise(res=>{if(window.supabase&&window.supabase.createClient)return res(window.supabase);
      const s=document.createElement('script');s.src=SBC.lib;s.async=true;s.onload=()=>res(window.supabase||null);s.onerror=()=>res(null);document.head.appendChild(s)})
    .then(async lib=>{if(!lib)throw new Error('lib');
      const c=CL.client||lib.createClient(SBC.url,SBC.key,{auth:{persistSession:true,autoRefreshToken:true,storageKey:'bnil_sb_auth'}});CL.client=c;
      let {data:{session}}=await c.auth.getSession();
      if(!session){const {data,error}=await c.auth.signInAnonymously();if(error)throw error;session=data.session}
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
  importPartner(r,{pname:names.join(t(' ו',' & ')),plikes:[...pl],psupers:[...ps]},silent);if(TAB==='match')nmTop()}
async function cloudPull(r){const c=CL.client;if(!c||CL.room!==r.code)return;
  const [m,s]=await Promise.all([c.from('room_members').select('user_id,display_name,seat_of').eq('room_code',r.code),c.from('swipes').select('user_id,name,kind').eq('room_code',r.code)]);
  if(m.error||s.error){console.warn('[namematch] pull',(m.error||s.error).message);return}
  CL.members=new Map(m.data.map(x=>[x.user_id,{n:x.display_name,seat:x.seat_of||x.user_id}]));const mine=CL.members.get(CL.uid);CL.seat=mine?mine.seat:CL.uid;CL.p=new Map();
  const restoring=!!r.restore;if(restoring){cloudRestore(r,s.data.filter(x=>x.user_id===CL.seat));delete r.restore}
  s.data.forEach(x=>{if(x.user_id===CL.seat)return;if(!CL.p.has(x.user_id))CL.p.set(x.user_id,new Map());CL.p.get(x.user_id).set(x.name,x.kind)});
  cloudApply(r,restoring);
  if(restoring){r.seen=[...new Set([...r.seen,...matchesOf(r)])];nmSave();if(TAB==='match'&&R()===r)nmStage()}}
/* a device that just connected to an existing participant continues from that participant's swipes */
function cloudRestore(r,rows){const L=new Set(),S=new Set(),P=new Set();
  rows.forEach(x=>{const i=IDX.get(x.name);if(i==null)return;if(x.kind==='like'||x.kind==='super')L.add(i);if(x.kind==='super')S.add(i);if(x.kind==='pass')P.add(i)});
  r.likes=[...L];r.supers=[...S];r.passes=[...P];r.hist=[];r.q=[];NMX.deckFor=null;nmSave()}
function cloudClose(){if(CL.ch&&CL.client){try{CL.ch.untrack()}catch(e){}try{CL.client.removeChannel(CL.ch)}catch(e){}}CL.ch=null;CL.room=null;CL.live=false;CL.online=false}
async function cloudOpen(r){if(!r||!r.cloud)return;if(CL.room===r.code&&CL.ch)return;const c=await sbLoad();if(!c){if(TAB==='match')nmTop();return}
  cloudClose();CL.room=r.code;CL.seat=null;
  const {error}=await c.rpc('join_room',{p_code:r.code,p_name:r.me});   /* idempotent: refreshes membership/display name */
  if(error&&error.code==='P0002'){toast(t('החדר לא נמצא בשרת. ממשיכים במצב קישורים.','Room not found online. Using links instead.'));r.cloud=0;nmSave();CL.room=null;return}
  await cloudPull(r);await cloudFlush(r);   /* show the room right away, even before the socket is up */
  if(CL.room!==r.code)return;
  const ch=c.channel('nm:'+r.code,{config:{presence:{key:CL.uid}}});CL.ch=ch;
  ch.on('postgres_changes',{event:'*',schema:'public',table:'swipes',filter:'room_code=eq.'+r.code},p=>{if(store.get('debug',0))console.log('[namematch] change',p.eventType);const x=p.new;if(!x||!x.user_id||x.user_id===CL.seat)return;
      if(!CL.p.has(x.user_id))CL.p.set(x.user_id,new Map());CL.p.get(x.user_id).set(x.name,x.kind);const rr=R();if(rr&&rr.code===r.code)cloudApply(rr,false)})
    .on('postgres_changes',{event:'*',schema:'public',table:'room_members',filter:'room_code=eq.'+r.code},p=>{const x=p.new;if(!x||!x.user_id||x.user_id===CL.uid)return;
      const isNew=!CL.members.has(x.user_id)&&!x.seat_of;const rr=R();if(rr&&rr.code===r.code){if(isNew)toast(t(`${x.display_name} הצטרף/ה לחדר`,`${x.display_name} joined`));cloudPull(rr)}})
    .on('presence',{event:'sync'},()=>{const ps=ch.presenceState();CL.online=Object.keys(ps).some(k=>k!==CL.uid&&!(ps[k]||[]).some(m=>m&&m.s&&m.s===CL.seat));if(TAB==='match')nmTop()})
    .subscribe(async (st,err)=>{if(store.get('debug',0))console.log('[namematch] channel',st,err&&err.message);if(CL.ch!==ch)return;
      if(st==='SUBSCRIBED'){CL.live=true;try{await ch.track({n:r.me,s:CL.seat})}catch(e){}const rr=R();if(rr&&rr.code===r.code){await cloudFlush(rr);await cloudPull(rr)}}
      else if(st==='CHANNEL_ERROR'||st==='TIMED_OUT'||st==='CLOSED'){CL.live=false;CL.online=false}
      if(TAB==='match')nmTop()});}
/* safety net: if the WebSocket can't connect (strict networks), poll every few seconds instead */
setInterval(()=>{if(document.visibilityState!=='visible'||CL.live)return;const r=R();if(TAB==='match'&&r&&r.cloud&&CL.room===r.code&&CL.client){cloudFlush(r);cloudPull(r)}},3000);
/* phones sleep: catch up when the page is visible again */
document.addEventListener('visibilitychange',()=>{if(document.visibilityState!=='visible'){if(CL.ch)try{CL.ch.untrack()}catch(e){}return}if(CL.ch&&CL.live){const rr=R();try{CL.ch.track({n:rr?rr.me:''})}catch(e){}}const r=R();if(r&&r.cloud&&CL.room===r.code){cloudFlush(r);cloudPull(r)}});
addEventListener('pagehide',()=>{if(CL.ch)try{CL.ch.untrack()}catch(e){}});
addEventListener('online',()=>{const r=R();if(r&&r.cloud&&CL.room===r.code){cloudFlush(r);cloudPull(r)}});

/* "Delete all my data": remove this browser's anonymous user, memberships and swipes from the server */
async function cloudDeleteMe(){if(!cloudOn())return'none';let had=false;try{had=!!localStorage.getItem('bnil_sb_auth')}catch(e){}if(!had)return'none';
  try{const c=await sbLoad();if(!c)return'fail';cloudClose();const {error}=await c.rpc('delete_my_data');if(error)return'fail';try{await c.auth.signOut({scope:'local'})}catch(e){}return'ok'}catch(e){return'fail'}}
/* after the reload that follows a wipe: say what happened */
setTimeout(()=>{let w=null;try{w=sessionStorage.getItem('wiped');sessionStorage.removeItem('wiped')}catch(e){}if(!w)return;
  toast(w==='ok'?t('כל הנתונים שלך נמחקו, מהמכשיר ומהשרת','All your data was deleted, from this device and the server'):w==='fail'?t('הנתונים נמחקו מהמכשיר. לשרת לא הצלחנו להגיע, והחדרים שם יימחקו אוטומטית אחרי 90 יום','Deleted from this device. The server was unreachable; rooms there are removed after 90 days'):t('כל הנתונים שלך נמחקו מהמכשיר','All your data was deleted from this device'))},1200);
