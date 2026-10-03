/* =========================================================
   Persistence extras: shared saved-list links, secret-name stats, cross-tab sync
   ========================================================= */
function favLink(list){const L=(list||FAV).filter(n=>IDX.has(n));return `${SHARE_URL}#saved.${b64e(L.join(','))}`}
function parseSavedHash(h){const m=/^saved\.([A-Za-z0-9_-]+)/.exec(h||'');if(!m)return null;const L=[...new Set(b64d(m[1]).split(',').map(x=>x.trim()).filter(x=>IDX.has(x)))].slice(0,60);return L.length?L:null}
function openSharedList(L){const m=$('#modal');m.hidden=false;const fresh=L.filter(n=>!FAV.includes(n));
  m.innerHTML=`<div class="mbox favpanel" role="dialog" aria-label="${t('רשימה ששותפה איתכם','Shared list')}"><button class="mclose" id="mclose" aria-label="${t('סגירה','Close')}">${icon('close')}</button>
    <h3>${t('קיבלתם רשימת שמות','Someone shared a name list')} <span class="cnt">${L.length}</span></h3>
    <div class="chips" id="shchips">${L.map(n=>`<button data-i="${IDX.get(n)}" class="${FAV.includes(n)?'on':''}">${nmh(IDX.get(n))}</button>`).join('')}</div>
    <p class="sub">${fresh.length?t(`מתוכם, ${fresh.length} עוד לא ברשימה שלכם.`,`${fresh.length} of these are not on your list yet.`):t('כל השמות כבר ברשימה שלכם.','All of these are already on your list.')}</p>
    <div class="mrow">${fresh.length?`<button class="next" id="shmerge">${icon('save')}${t(' הוספה לרשימה שלי',' Add to my list')}</button>`:''}<button class="copybtn" id="shclose">${t('רק להציץ','Just looking')}</button></div></div>`;
  const close=()=>{m.hidden=true};$('#mclose').onclick=close;$('#shclose').onclick=close;m.onclick=e=>{if(e.target===m)close()};
  $('#shchips').onclick=e=>{const b=e.target.closest('[data-i]');if(b){close();quickView(+b.dataset.i)}};
  const mg=$('#shmerge');if(mg)mg.onclick=()=>{FAV=FAV.concat(fresh);store.set('fav',FAV);renderFavBar();rerenderCards();close();toast(t(`${fresh.length} שמות נוספו לשמורים`,`${fresh.length} names added to Saved`));const b=$('#favtop');if(b){b.classList.remove('bump');void b.offsetWidth;b.classList.add('bump')}};
  try{syncURL()}catch(e){}}
function checkSavedHash(h0){const L=parseSavedHash(h0!=null?h0:(location.hash||'').slice(1));if(L){if(TAB==='match')setTab('home');openSharedList(L);return true}return false}
addEventListener('hashchange',()=>checkSavedHash());

/* Secret-name daily stats: one entry per day (first finished board of the day counts) */
function nstatGet(){const s=store.get('nstat',null);return s&&typeof s==='object'&&s.days?s:{days:{},dist:[0,0,0,0,0,0,0,0,0,0]}}
function nstatRecord(st){if(st.mode!=='daily'||!st.done)return;const S=nstatGet();if(S.days[st.key]!=null)return;
  S.days[st.key]=st.won?1:0;if(st.won){const k=Math.min(triesUsed(st),10)-1;S.dist[k]=(S.dist[k]||0)+1}store.set('nstat',S)}
function nstatSummary(){const S=nstatGet();const keys=Object.keys(S.days);const played=keys.length,wins=keys.filter(k=>S.days[k]).length;
  const dk=d=>`${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;let cur=0;const d=new Date();
  if(S.days[dk(d)]==null)d.setDate(d.getDate()-1); /* today not played yet: streak still alive from yesterday */
  while(S.days[dk(d)]===1){cur++;d.setDate(d.getDate()-1)}
  const won=keys.filter(k=>S.days[k]).map(k=>{const [y,m,dd]=k.split('-').map(Number);return Date.UTC(y,m-1,dd)/864e5}).sort((a,b)=>a-b);
  let best=0,run=0,prev=null;won.forEach(x=>{run=prev!=null&&x-prev===1?run+1:1;best=Math.max(best,run);prev=x});
  return{played,wins,pct:played?Math.round(wins/played*100):0,cur,best:Math.max(best,cur)}}
function nstatHTML(){const s=nstatSummary();if(!s.played)return'';
  return `<div class="nstat"><div><b>${s.played}</b><span>${t('משחקים','Played')}</span></div><div><b>${s.pct}%</b><span>${t('הצלחה','Solved')}</span></div><div><b>${s.cur}</b><span>${t('רצף נוכחי','Streak')}</span></div><div><b>${s.best}</b><span>${t('רצף שיא','Best')}</span></div></div>`}

/* Cross-tab sync: saving a name in one tab updates the counter in the others */
addEventListener('storage',e=>{if(e.key==='bnil_fav'){try{FAV=(JSON.parse(e.newValue||'[]')||[]).filter(n=>IDX.has(n))}catch(_){FAV=[]}renderFavBar();rerenderCards()}});

/* Build-time export for the static SEO pages (only when the build asks for it) */
if(window.SITE_CONFIG&&window.SITE_CONFIG.exportSEO)window.__bnilExport=()=>{const st=stats(-1);const out=[];
  const byDec={};for(let i=0;i<N;i++){const s=T(st,i);if(s<50)continue;const g=st.tot[0][i]/s;const sx=g>=.7?0:g<=.3?1:2;const k=peakDec(st,i)+'_'+sx;(byDec[k]=byDec[k]||[]).push(i)}
  Object.values(byDec).forEach(a=>a.sort((x,y)=>T(st,y)-T(st,x)));
  for(let i=0;i<N;i++){const c=comb(st,i);let tot=0,my=0;for(let y=0;y<NY;y++){tot+=c[y];if(c[y]>c[my])my=y}const pk=peakOf(st,i);
    const g=tot?st.tot[0][i]/tot:.5;const sx=g>=.7?0:g<=.3?1:2;const x=g>=.5?0:1;const rk=st.rank[x][i*NY+NY-1]||0;
    const rel=(byDec[peakDec(st,i)+'_'+sx]||[]).filter(j=>j!==i).slice(0,8).map(j=>NAMES[j]);
    out.push({n:NAMES[i],en:rom(i),tot:Math.round(tot),pk:Y0+pk,pkc:Math.round(c[pk]),start:pk===0,oneIn:c[pk]?Math.round(st.DD[pk]/c[pk]):0,my:Y0+my,myc:Math.round(c[my]),desc:peakDesc(i),last:Math.round(c[NY-1]),rk,x,g:Math.round(g*100),med:st.med[i],first:Y0+c.findIndex(v=>v>0),
      sec:secShort(i),mean:MEAN.get(NAMES[i])||'',story:STORY.get(NAMES[i])||'',rel})}
  return{y0:Y0,y1:Y1,names:out}};
