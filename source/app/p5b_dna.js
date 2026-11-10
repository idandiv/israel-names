/* =========================================================
   NAME DNA: the records of app/dna-core.mjs from the app's data, and names for a sibling
   (the name page card, and the SEO export of p9_persist.js for the static pages and /tools/siblings)
   ========================================================= */
function dnaRec(i){const st=stats(-1),w=SECTOT[i],s=(w[0]+w[1]+w[2]+w[3])||1,tot=T(st,i),th=themesOf(i);
  let r3=0;for(let y=NY-3;y<NY;y++)r3+=st.Y[0][i*NY+y]+st.Y[1][i*NY+y];
  return[sylCount(rom(i)),tot?Math.round(st.tot[0][i]/tot*100):50,st.med[i],w.map(v=>Math.round(v/s*100)),ORIGIN.get(NAMES[i])||'',
    DNA_THEMES.reduce((m,k,b)=>th.has(k)?m|1<<b:m,0),[0,1].map(x=>Math.round(st.Y[x][i*NY+NY-1])),Math.round(r3)]}
let DNA_ALL=null,DNA_POOL=null;
function dnaAll(){if(!DNA_ALL)DNA_ALL=NAMES.map((n,i)=>dnaOf(n,dnaRec(i)));return DNA_ALL}
/* the names a suggestion can come from: given to at least SIB_POOL_MIN babies of a sex in the last year */
function dnaPool(){if(!DNA_POOL)DNA_POOL=dnaAll().filter(d=>Math.max(d.y1[0],d.y1[1])>=SIB_POOL_MIN);return DNA_POOL}
/* [boys, girls] for a sibling of name i, k of each */
function siblingsOf(i,k=6){const me=[dnaAll()[i]];return[1,0].map(sex=>suggestSiblings(me,dnaPool(),{sex,k}))}
/* "אילו שמות מתאימים לאח או לאחות של X?" in the name page FAQ (seoFAQ), as on the static page (name_faq in tools/build_site.py) */
const heList=a=>a.length<2?a.join(''):a.slice(0,-1).join(', ')+' ו'+a[a.length-1];
function sibAnswer(i){const [b,g]=siblingsOf(i).map(L=>L.slice(0,3).map(x=>x.n));if(!b.length&&!g.length)return'';
  return`שמות מאותו דור ומגזר ובסגנון דומה: ${[b.length?`לאח ${heList(b)}`:'',g.length?`לאחות ${heList(g)}`:''].filter(Boolean).join(', ו')}.`}
const SIB_TOOL=()=>`${SITE.base}/tools/siblings`;
function sibBoxHTML(i){const [b,g]=siblingsOf(i);if(!b.length&&!g.length)return'';const nm=NAMES[i];
  const row=(lab,L)=>L.length?`<div class="sibrow"><span class="sibl">${lab}</span><div class="chips">${L.map(s=>nameLink(IDX.get(s.n),`<span title="${esc(s.why.join(' · '))}">${esc(s.n)}</span>`)).join('')}</div></div>`:'';
  const top=(b[0]&&g[0])?(b[0].score>=g[0].score?b[0]:g[0]):(b[0]||g[0]);
  return `${row('לאח',b)}${row('לאחות',g)}${top&&top.why.length?`<p class="sub sibwhy">למה ${esc(top.n)}? ${esc(top.why.join(' · '))}.</p>`:''}
    <a class="fnlink" href="${SIB_TOOL()}?n=${encodeURIComponent(nm)}">יש עוד אחים? לכלי ההתאמה לאחים ${icon('arrow')}</a>`}
