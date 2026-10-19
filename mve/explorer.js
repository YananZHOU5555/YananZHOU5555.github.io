'use strict';
/* MVE leaderboard v2 · core: state, identities, data loading, and one adapter that turns every
   benchmark / version into the same "board" shape. Every number comes from data/data.json as
   published; this file only reshapes it (ranks and per-category sums are presentation only). */

const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fin=Number.isFinite;
const num=n=>Number(n||0).toLocaleString('en-US');
const pc=(r,d=1)=>fin(r)?(100*r).toFixed(d):'—';
const pcs=(r,d=1)=>fin(r)?`${(100*r).toFixed(d)}%`:'—';
const safeUrl=u=>{if(!u)return '#';try{const x=new URL(u,location.href);return /^https?:$/.test(x.protocol)?x.href:'#';}catch{return '#';}};
const dateDot=d=>d?String(d).slice(0,10).replaceAll('-','.'):'';

/* ---------- state ---------- */
const S={page:'board',bench:'libero',view:'rank',track:'',cat:'all',suite:'all',pol:'all',q:'',dir:-1,mode:'policy',drawer:'',
  gcat:'all',gq:'',gtask:'',gpage:0,logq:'',logtype:'all'};
let DATA=null,CATALOG={encoders:{},benchmarks:{}};
const GUIDES={},BOARDS=new Map();

/* ---------- identities ---------- */
// Benchmark accents: the reference categorical palette in its fixed order (light / dark steps).
const BENCH_STYLE={
  libero:{l:'#2a78d6',d:'#3987e5',icon:'layers'},
  'libero-plus':{l:'#1baf7a',d:'#199e70',icon:'plusSq'},
  'libero-pro':{l:'#6250d6',d:'#9085e9',icon:'shield'},
  robotwin2:{l:'#eb6834',d:'#d95926',icon:'twin'},
  robodojo:{l:'#e87ba4',d:'#d55181',icon:'gate'},
  robocasa365:{l:'#eda100',d:'#c98500',icon:'home'},
  vlabench:{l:'#008300',d:'#2f9e44',icon:'chat'},
  geniesim:{l:'#e34948',d:'#e66767',icon:'spark'}};
const bstyle=id=>BENCH_STYLE[id]||{l:'#647267',d:'#8d8b84',icon:'layers'};
const bcVars=id=>`--cl:${bstyle(id).l};--cd:${bstyle(id).d}`;
const tile=(id,size='')=>`<span class="tile bc ${size}" style="${bcVars(id)}">${icon(bstyle(id).icon)}</span>`;

const ICONS={
  layers:'<path d="M12 3 3 7.5l9 4.5 9-4.5L12 3Z"/><path d="m3 12 9 4.5 9-4.5"/><path d="m3 16.5 9 4.5 9-4.5"/>',
  plusSq:'<rect x="3.5" y="3.5" width="17" height="17" rx="4.5"/><path d="M12 8.2v7.6M8.2 12h7.6"/>',
  shield:'<path d="M12 3 5 6v5.6c0 4.1 2.9 7.8 7 9.4 4.1-1.6 7-5.3 7-9.4V6l-7-3Z"/><path d="m9 12 2.2 2.2L15.5 10"/>',
  twin:'<circle cx="8.6" cy="12" r="5.1"/><circle cx="15.4" cy="12" r="5.1"/>',
  gate:'<path d="M3.5 5.5c5.6 1.6 11.4 1.6 17 0"/><path d="M5 9.2h14"/><path d="M7 6.8V20M17 6.8V20"/>',
  home:'<path d="m3.5 11 8.5-7 8.5 7"/><path d="M6 9.4V20h12V9.4"/><path d="M10 20v-5h4v5"/>',
  chat:'<path d="M5 4.5h14a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2h-7l-4.5 3.5V17H5a2 2 0 0 1-2-2V6.5a2 2 0 0 1 2-2Z"/><circle cx="12" cy="10.8" r="2.2"/>',
  spark:'<path d="M11 3.5 12.9 9l5.6 1.9-5.6 1.9L11 18.3l-1.9-5.5-5.6-1.9L9.1 9 11 3.5Z"/><path d="m18.5 15 .8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z"/>',
  trophy:'<path d="M8 4h8v5a4 4 0 0 1-8 0V4Z"/><path d="M8 6H4.5a3 3 0 0 0 3.6 3.9M16 6h3.5a3 3 0 0 1-3.6 3.9"/><path d="M12 13v3.5M8.5 20.5h7"/><path d="M9.5 20.5c0-1.8 1.1-3.6 2.5-3.6s2.5 1.8 2.5 3.6"/>',
  combo:'<rect x="3.5" y="3.5" width="7" height="7" rx="1.8"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.8"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.8"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.8"/>',
  mountain:'<path d="m2.5 19.5 6.8-11.8 3.6 6.1 2.4-3.6 6.2 9.3H2.5Z"/><path d="m7.6 10.7 1.7 1.6 1.4-1.4"/>',
  matrix:'<rect x="3.5" y="3.5" width="17" height="17" rx="2.5"/><path d="M3.5 9.2h17M3.5 14.8h17M9.2 3.5v17M14.8 3.5v17"/>',
  video:'<rect x="3" y="5.5" width="13" height="13" rx="2.5"/><path d="m16 10 5-3v10l-5-3"/>',
  play:'<path d="M8 5.5v13l10.5-6.5L8 5.5Z"/>',
  book:'<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15Z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5"/>',
  search:'<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  ext:'<path d="M14 4h6v6"/><path d="M20 4 11 13"/><path d="M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"/>',
  x:'<path d="M6 6l12 12M18 6 6 18"/>',
  chev:'<path d="m9 6 6 6-6 6"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.7v.1"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>',
  moon:'<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/>',
  auto:'<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 0 1 0 17Z" fill="currentColor" stroke="none"/>',
  github:'<path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"/>',
  flask:'<path d="M9.5 3.5h5M10.5 3.5v5.2L5 18a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5.5-9.3V3.5"/><path d="M7.4 15h9.2"/>',
  seed:'<path d="M12 21v-7"/><path d="M12 14c0-4 3-7 7.5-7.5C19 11 16 14 12 14Z"/><path d="M12 12c0-3-2.4-5.5-6.5-6 .4 3.6 2.8 6 6.5 6Z"/>',
  scale:'<path d="M12 4v16M6 20h12"/><path d="m5.5 8 3-3.5h7l3 3.5"/><path d="M3 13.5 5.5 8 8 13.5a2.5 2.5 0 0 1-5 0ZM16 13.5 18.5 8l2.5 5.5a2.5 2.5 0 0 1-5 0Z"/>',
  eye:'<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/>',
  list:'<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>',
  clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  layersOff:'<path d="M4 4l16 16"/><path d="M12 3 3 7.5l9 4.5 9-4.5L12 3Z"/>',
  check:'<path d="m5 12.5 4.2 4.2L19 7"/>',
  cross:'<path d="M7 7l10 10M17 7 7 17"/>'};
const icon=(n,cls='')=>`<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n]||''}</svg>`;

// Encoder marks and colors (unchanged from the original site; two RoboTwin groups added).
const ENC={resnet50_in1k_v2:['R50','#647267'],vitb16_in1k_v1:['ViT','#967843'],mae_b16:['MAE','#89784a'],dinov2_b14_reg:['D2B','#5c8294'],
  dinov3_b16:['D3B','#526fa5'],dinov3_l16:['D3L','#7273a4'],clip_b16:['CLP','#98726b'],siglip2_b16_224:['S2B','#b07969'],
  siglip2_so400m14_384:['S2S','#9d5e68'],eupe_vit_b:['EUV','#548375'],eupe_convnext_b:['EUC','#759054'],vc1_b:['VCB','#927a91'],
  vc1_l:['VCL','#a36f8b'],pe_spatial_b16_512:['PES','#568b9c'],pe_core_b16_224:['PEC','#697faf'],r3m_resnet50:['R3M','#a07d53'],
  vip:['VIP','#8b8850'],theia_b_cdiv:['THB','#7489a0'],sam21_hiera_t:['SAM','#739879'],dav2_b:['DA2','#ab954c'],
  c_radio_v3_b:['CR3','#8c74a3'],c_radio_v4_so400m:['CR4','#a177a0'],resnet18_in1k:['R18','#6b7f8c'],dp_resnet18_scratch:['R0','#8c8577']};
const encMeta=id=>CATALOG.encoders?.[id]||{};
const encMark=id=>{const [t,c]=ENC[id]||[String(id||'?').slice(0,3).toUpperCase(),'#6d7680'];return `<span class="mark" style="--e:${c}" aria-hidden="true">${esc(t)}</span>`;};
const encColor=id=>(ENC[id]||[0,'#6d7680'])[1];
const NAME_FALLBACK={resnet18_in1k:'ResNet-18 IN-1K（R1）'};
function encName(id,label){const m=encMeta(id);return m.shortName||m.name||NAME_FALLBACK[id]||label||id;}
function encSub(id){const m=encMeta(id);return [m.family,m.publicationDate?`${m.publicationLabel||'首次公开'} ${dateDot(m.publicationDate)}`:''].filter(Boolean).join(' · ');}

// Action policies: fixed categorical slots 1-5 plus a shape each (second encoding, never color alone).
const POL=[['act','ACT'],['dp','DP-U-Net'],['dp-dit','DP-DiT'],['bcvilt','BCViLT'],['flow','Flow-DiT']];
const POL_ALIAS={act_native_7:'act',dp_unet_native:'dp',dp_dit_native:'dp-dit',bcvilt_native:'bcvilt',flow_dit_native:'flow'};
const polKey=h=>{const k=String(h||'').toLowerCase();return POL_ALIAS[k]||k;};
const polIdx=h=>POL.findIndex(p=>p[0]===polKey(h));
const polName=h=>(POL.find(p=>p[0]===polKey(h))||[0,h||'—'])[1];
function shape(i,x,y,r=4.6,extra=''){
  const f=`style="fill:var(--s${(i%5)+1})" ${extra}`;
  switch(i){
    case 1:return `<rect x="${x-r*.88}" y="${y-r*.88}" width="${r*1.76}" height="${r*1.76}" rx="1.3" ${f}/>`;
    case 2:return `<path d="M${x} ${y-r*1.12}L${x+r*1.08} ${y+r*.82}H${x-r*1.08}Z" ${f}/>`;
    case 3:return `<path d="M${x} ${y-r*1.18}L${x+r*1.18} ${y}L${x} ${y+r*1.18}L${x-r*1.18} ${y}Z" ${f}/>`;
    case 4:{const a=r*.38,b=r*1.05;return `<path d="M${x-a} ${y-b}h${2*a}v${b-a}h${b-a}v${2*a}h-${b-a}v${b-a}h-${2*a}v-${b-a}h-${b-a}v-${2*a}h${b-a}Z" ${f}/>`;}
    default:return `<circle cx="${x}" cy="${y}" r="${r}" ${f}/>`;}
}
const polBadge=h=>{const i=polIdx(h);return `<span class="pb">${i>=0?`<svg viewBox="-6 -6 12 12" aria-hidden="true">${shape(i,0,0,4.4)}</svg>`:''}${esc(polName(h))}</span>`;};

const SUITES={libero_spatial:['Spatial','空间关系'],libero_object:['Object','对象变化'],libero_goal:['Goal','目标区分'],libero_10:['Long','长程执行']};
const SUITE_ORDER=Object.keys(SUITES);
const suiteName=s=>SUITES[s]?.[0]||s;
const STATUS={complete:'已核验',training_running:'训练中',training:'训练中',training_incomplete:'训练未完成',awaiting_evaluation:'待评估',
  waiting_gpu:'等待 GPU',waiting_cache_or_dependency:'等待缓存',waiting_cache:'等待缓存',pending:'待评估',in_progress:'评估中',partial:'评估中',running:'评估中',blocked:'访问受阻'};
const statusLabel=r=>STATUS[r?.progressStatus||r?.status]||r?.progressStatus||r?.status||'待评估';

/* ---------- data loading ---------- */
async function getJSON(url,onProgress){
  const r=await fetch(url,{cache:'no-cache'});
  if(!r.ok)throw new Error(`${url} → HTTP ${r.status}`);
  if(!onProgress||!r.body)return r.json();
  const total=Number(r.headers.get('content-length'))||0,reader=r.body.getReader(),parts=[];let got=0;
  for(;;){const {done,value}=await reader.read();if(done)break;parts.push(value);got+=value.length;onProgress(got,total);}
  return JSON.parse(await new Blob(parts).text());
}
async function loadAll(onProgress){
  const opt=u=>getJSON(u).catch(()=>null);
  const [d,c,g1,g2]=await Promise.all([getJSON('data/data.json',onProgress),opt('data/catalog.json'),opt('data/guide-core.json'),opt('data/guide-next.json')]);
  if(!d?.benchmarks?.length)throw new Error('数据中没有 benchmark');
  DATA=d;if(c)CATALOG=c;for(const g of [g1,g2])if(g?.benchmarks)Object.assign(GUIDES,g.benchmarks);
  BOARDS.clear();
}

/* ---------- benchmarks, tracks, views ---------- */
const benchById=id=>DATA.benchmarks.find(b=>b.id===id);
const B=()=>benchById(S.bench)||DATA.benchmarks[0];
const bmeta=id=>CATALOG.benchmarks?.[id]||{};
const trackById=(b,id)=>(b.tracks||[]).find(t=>t.id===id);
const isPlanned=b=>b.status==='planned'||!(b.tracks||[]).length;
const VIEW_META={rank:['榜单','trophy'],combos:['组合','combo'],mountain:['性能山','mountain'],matrix:['逐任务','matrix'],videos:['任务视频','video'],about:['关于','book']};
function viewTracks(b,view){
  const ts=(b.tracks||[]);
  if(b.id==='libero'){
    if(view==='rank'||view==='mountain')return ts.filter(t=>t.encoderBoard).map(t=>t.id);
    if(view==='combos'||view==='matrix')return ts.filter(t=>t.combinations||t.runs?.length).sort((a,c)=>(c.combinations?1:0)-(a.combinations?1:0)).map(t=>t.id);
  }
  if(view==='mountain')return ts.filter(t=>t.proRows||(t.runs||[]).filter(r=>fin(r.successRate)).length>=3).map(t=>t.id);
  if(view==='matrix')return ts.filter(t=>t.proRows||(t.runs||[]).length>1).map(t=>t.id);
  return ts.map(t=>t.id);
}
function views(b){
  const v=[];
  if(!isPlanned(b)){v.push('rank');if(b.id==='libero')v.push('combos');if(viewTracks(b,'mountain').length)v.push('mountain');if(viewTracks(b,'matrix').length)v.push('matrix');}
  if((b.tasks||[]).some(t=>taskVideos(b,t).length))v.push('videos');
  v.push('about');return v;
}
function currentTrack(b=B(),view=S.view){
  const ids=viewTracks(b,view);
  if(!ids.includes(S.track))S.track=ids[0]||'';
  return trackById(b,S.track);
}

/* ---------- tasks & media ---------- */
function guideTaskMap(bid){const m=new Map();for(const t of GUIDES[bid]?.tasks||[])if(t.localTaskId)m.set(t.localTaskId,t);return m;}
const shortTask=t=>String(t.name||t.id).replace(/^robotwin2-/,'').replaceAll('_',' ');
function taskCols(b,present){
  const g=guideTaskMap(b.id);
  return (b.tasks||[]).filter(t=>!present||present.has(t.id)).map((t,i)=>({id:t.id,idx:i+1,group:t.suite||'',
    label:b.id==='libero'?String(i+1).padStart(2,'0'):(t.condition||shortTask(t)),
    title:g.get(t.id)?.title||t.instruction||shortTask(t),instruction:t.instruction||''}));
}
function taskVideos(b,t){
  return (t.media||[]).filter(m=>m.videoUrl||m.type==='video').map(m=>({...m,src:m.videoUrl||m.url,poster:m.posterUrl||''}));
}
function taskPoster(t){
  const v=(t.media||[]).find(m=>m.posterUrl);if(v)return v.posterUrl;
  const img=(t.media||[]).find(m=>m.type==='image');return img?.url||'';
}

/* ---------- boards: one shape for every benchmark ---------- */
function getBoard(b,t,kind){
  if(!t)return null;
  const key=`${b.id}|${t.id}|${kind}`;if(BOARDS.has(key))return BOARDS.get(key);
  const bd=kind==='encoder'&&t.encoderBoard?encoderBoard(b,t):t.proRows?proBoard(b,t):t.combinations?comboBoard(b,t):runBoard(b,t);
  BOARDS.set(key,bd);return bd;
}
const suiteCats=b=>SUITE_ORDER.filter(s=>(b.tasks||[]).some(x=>x.suite===s)).map(s=>({id:s,label:suiteName(s),title:SUITES[s][1]}));
const sortPols=ks=>[...new Set(ks)].filter(Boolean).sort((a,c)=>(polIdx(a)<0?99:polIdx(a))-(polIdx(c)<0?99:polIdx(c)));
function comboBoard(b,t){
  const rows=t.combinations.map(c=>{
    const done=c.status==='complete'&&fin(c.successRate),cats={},tasks={};
    for(const s of c.suiteResults||[])cats[s.suite]={rate:s.status==='complete'&&fin(s.successRate)?s.successRate:null,std:s.successRateStd,succ:s.successes,ep:s.episodes,exp:s.expectedEpisodes,done:s.completedSeeds?.length||0,total:3};
    for(const x of c.taskResults||[]){const ok=x.completedSeeds?.length===3&&x.episodes===x.expectedEpisodes&&fin(x.successRate);
      tasks[x.taskId]={rate:ok?x.successRate:null,std:x.successRateStd,succ:x.successes,ep:x.episodes,exp:x.expectedEpisodes,seeds:x.seedRates||[]};}
    return {id:c.id,kind:'combo',encoder:c.encoder,name:encName(c.encoder,c.encoderLabel),head:polKey(c.head),family:c.policyFamily,
      overall:{rate:done?c.successRate:null,std:c.successRateStd,succ:c.successes,ep:c.episodes,exp:c.expectedEpisodes},cats,tasks,
      cover:{done:c.completedSeeds?.length||0,total:(c.trainingSeeds||t.trainingSeeds||[17,29,43]).length,unit:'种子'},ref:c};
  });
  return {kind:'combo',bench:b,track:t,title:'编码器 × 动作策略',overall:true,cats:suiteCats(b),catKind:'suite',pols:sortPols(rows.map(r=>r.head)),rows,
    method:'每行汇总训练种子 17 / 29 / 43：三个种子等权平均，± 为种子间标准差。',note:t.rankingNote,notes:[t.comparisonNote,...(t.notes||[])].filter(Boolean),
    seeds:t.trainingSeeds,taskCols:taskCols(b),episodes:t.auditedValidEpisodes};
}
function encoderBoard(b,t){
  const eb=t.encoderBoard,combos=comboBoard(b,t),cmap=new Map(combos.rows.map(r=>[r.id,r]));
  const rows=eb.rows.map(r=>{
    const cats={},pols={};
    for(const s of r.suiteResults||[])cats[s.suite]={rate:fin(s.successRate)?s.successRate:null,done:s.completedPolicies?.length||0,total:s.expectedPolicies?.length||0};
    for(const p of r.policies||[])pols[polKey(p.head)]={rate:fin(p.successRate)?p.successRate:null,done:p.completedSeeds?.length||0,total:3,combo:p.combinationId,label:p.label};
    return {id:r.id,kind:'encoder',encoder:r.encoder,name:encName(r.encoder,r.encoderLabel),head:'',overall:{rate:fin(r.successRate)?r.successRate:null},cats,pols,
      cover:{done:r.completedPolicies?.length||0,total:r.expectedPolicies?.length||eb.policyHeads.length,unit:'策略'},ref:r};
  });
  return {kind:'encoder',bench:b,track:t,title:'视觉编码器综合榜',overall:true,cats:suiteCats(b),catKind:'suite',pols:sortPols(eb.policyHeads.map(polKey)),rows,combos:cmap,
    method:eb.method,note:t.rankingNote,notes:[eb.missingNote,eb.revisionNote,t.comparisonNote,...(t.notes||[])].filter(Boolean),
    seeds:t.trainingSeeds,taskCols:taskCols(b),episodes:t.auditedValidEpisodes};
}
function proBoard(b,t){
  const perts=t.perturbations||(t.proRows[0]?.cells||[]).map(c=>({id:c.track,label:c.label}));
  const rows=t.proRows.map(r=>{
    const cats={};
    for(const c of r.cells){const ok=c.status==='complete'&&fin(c.successRate),suites={};
      for(const s of c.suiteResults||[])suites[s.suite]={rate:ok&&fin(s.successRate)?s.successRate:null,succ:s.successes,ep:s.episodes};
      cats[c.track]={rate:ok?c.successRate:null,succ:c.successes,ep:c.episodes,exp:c.expectedEpisodes,done:c.completedSeeds?.length||0,total:3,suites,models:c.models||[],label:c.label};}
    return {id:r.id,kind:'pro',encoder:r.encoder,name:encName(r.encoder,r.encoderLabel),head:polKey(r.head),polLabel:r.policyLabel,overall:null,cats,
      cover:{done:Object.values(cats).filter(c=>fin(c.rate)).length,total:r.cells.length,unit:'扰动'},ref:r};
  });
  return {kind:'pro',bench:b,track:t,title:'扰动鲁棒性榜',overall:false,cats:perts.map(p=>({id:p.id,label:p.label,title:`${p.label} 扰动`})),catKind:'perturbation',
    pols:sortPols(rows.map(r=>r.head)),rows,suites:SUITE_ORDER,
    method:'每个扰动单独计分：训练种子 17 / 29 / 43 各 800 回合的等权均值；四类扰动不合成 PRO 总分。',
    note:'Environment 官方资产尚未齐全，所以没有全 PRO 总分；原始与变体初态不作纯因果配对解释。',notes:[],seeds:t.trainingSeeds,taskCols:[],episodes:t.auditedValidEpisodes};
}
function runBoard(b,t){
  const isLib=b.id==='libero',present=new Set(t.runs.flatMap(r=>(r.taskResults||[]).map(x=>x.taskId)));
  const cols=taskCols(b,present);
  const cats=isLib?SUITE_ORDER.filter(s=>cols.some(c=>c.group===s)).map(s=>({id:s,label:suiteName(s),title:SUITES[s][1]})):cols.map(c=>({id:c.id,label:c.label,title:c.title}));
  const single=t.runs.every(r=>(r.taskResults||[]).every(x=>(x.episodes||0)<=1));
  const rows=t.runs.map(r=>{
    const tasks={},rc={};
    for(const x of r.taskResults||[]){const ok=typeof x.successes==='number'&&x.episodes>0;tasks[x.taskId]={rate:ok?x.successes/x.episodes:null,succ:x.successes,ep:x.episodes,exp:x.expectedEpisodes};}
    if(isLib){for(const c of cats){const a=cols.filter(x=>x.group===c.id).map(x=>tasks[x.id]);const ready=a.length&&a.every(v=>v&&fin(v.rate));
      const ep=a.reduce((n,v)=>n+(v?.ep||0),0),succ=ready?a.reduce((n,v)=>n+v.succ,0):null;rc[c.id]={rate:ready&&ep?succ/ep:null,succ,ep};}}
    else for(const c of cols)rc[c.id]=tasks[c.id]||{rate:null};
    return {id:r.id,kind:'run',encoder:r.encoder,name:encName(r.encoder,r.encoderLabel),label:r.label||'',head:polKey(r.head),
      overall:{rate:fin(r.successRate)?r.successRate:null,succ:r.successes,ep:r.episodes,exp:r.expectedEpisodes},cats:rc,tasks,seed:r.trainingSeed,
      cover:{done:r.episodes||0,total:r.expectedEpisodes||r.episodes||0,unit:'回合'},ref:r};
  });
  return {kind:'run',bench:b,track:t,title:t.label,overall:true,cats,catKind:isLib?'suite':'task',pols:sortPols(rows.map(r=>r.head)),rows,single,
    method:t.rankingNote||'',note:'',notes:t.notes||[],seeds:t.trainingSeeds,taskCols:cols,episodes:rows.reduce((n,r)=>n+(r.overall.ep||0),0)};
}

/* ---------- scope, scores, ranks ---------- */
function curCat(bd){if(bd.kind==='pro')return bd.cats.some(c=>c.id===S.cat)?S.cat:bd.cats[0]?.id;return bd.cats.some(c=>c.id===S.cat)?S.cat:'all';}
function rowScore(bd,r,cat=curCat(bd)){
  if(bd.kind==='encoder'&&S.pol!=='all'){const p=r.pols[S.pol];if(!p)return null;if(cat==='all')return p.rate;return bd.combos.get(p.combo)?.cats[cat]?.rate??null;}
  if(bd.kind==='pro'){const c=r.cats[cat];if(!c)return null;return S.suite==='all'?c.rate:(c.suites?.[S.suite]?.rate??null);}
  return cat==='all'?(r.overall?.rate??null):(r.cats[cat]?.rate??null);
}
function rowStd(bd,r){
  const cat=curCat(bd);
  if(bd.kind==='combo')return cat==='all'?r.overall.std:r.cats[cat]?.std;
  if(bd.kind==='encoder'&&S.pol!=='all'){const c=bd.combos.get(r.pols[S.pol]?.combo);return cat==='all'?c?.overall.std:c?.cats[cat]?.std;}
  return null;
}
const inPool=(bd,r)=>bd.kind==='encoder'||S.pol==='all'||r.head===S.pol;
function rankRows(bd){
  const rows=bd.rows.filter(r=>inPool(bd,r)).map(r=>({r,s:rowScore(bd,r)}));
  for(const x of rows)x.rank=fin(x.s)?1+rows.filter(y=>fin(y.s)&&y.s>x.s+1e-12).length:null;
  return rows;
}
function visibleRows(bd){
  const q=S.q.trim().toLowerCase();
  return rankRows(bd).filter(x=>!q||`${x.r.encoder} ${x.r.name} ${polName(x.r.head)} ${x.r.label||''} ${x.r.polLabel||''}`.toLowerCase().includes(q))
    .sort((a,b)=>{if(fin(a.s)!==fin(b.s))return fin(a.s)?-1:1;if(fin(a.s)&&Math.abs(a.s-b.s)>1e-12)return S.dir<0?b.s-a.s:a.s-b.s;return a.r.name.localeCompare(b.r.name);});
}
function scopeLabel(bd){
  const cat=curCat(bd),c=bd.cats.find(x=>x.id===cat);
  const parts=[c?(bd.kind==='pro'?`${c.label} 扰动`:c.label):'全部任务'];
  if(bd.kind==='pro'&&S.suite!=='all')parts.push(suiteName(S.suite));
  parts.push(S.pol==='all'?(bd.kind==='encoder'?`${bd.pols.length} 种动作策略等权`:'全部动作策略'):polName(S.pol));
  return parts;
}

/* ---------- routing ---------- */
const OLD_VIEW={leaderboard:'combos',encoders:'rank',mountains:'mountain',pro:'rank',tasks:'videos',taskboard:'matrix',guide:'about'};
function readRoute(){
  const raw=location.hash.slice(1);
  if(!raw.includes('=')){
    const legacy={pro:['board','libero-pro','rank'],encoders:['board','libero','rank'],tasks:['board','libero','videos'],protocol:['method'],log:['log'],atlas:['atlas']}[raw];
    if(legacy){S.page=legacy[0];if(legacy[1]){S.bench=legacy[1];S.view=legacy[2];}}
    return;
  }
  const h=new URLSearchParams(raw);
  if(h.has('view')&&!h.has('v')){ // links from the previous site
    const v=h.get('view');
    if(v==='atlas')S.page='atlas';else if(v==='protocol')S.page='method';else if(v==='log')S.page='log';else{S.page='board';S.view=OLD_VIEW[v]||'rank';}
    if(h.get('version'))S.track=h.get('version');
    if(h.get('perturbation'))S.cat=h.get('perturbation');else if(h.get('suite')&&h.get('suite')!=='all')S.cat=h.get('suite');
    if(h.get('policy')&&h.get('policy')!=='all')S.pol=polKey(h.get('policy'));
    if(h.get('gtask'))S.gtask=h.get('gtask');if(h.get('gcat'))S.gcat=h.get('gcat');
  }else{
    S.page=['board','atlas','method','log'].includes(h.get('p'))?h.get('p'):'board';
    if(h.get('v'))S.view=h.get('v');if(h.get('t'))S.track=h.get('t');
    S.cat=h.get('cat')||'all';S.suite=h.get('suite')||'all';S.pol=h.get('pol')||'all';S.q=h.get('q')||'';
    S.mode=h.get('mode')==='suite'?'suite':'policy';S.dir=h.get('dir')==='asc'?1:-1;
    S.gcat=h.get('gcat')||'all';S.gtask=h.get('gtask')||'';S.drawer=h.get('d')||'';
  }
  if(h.get('b'))S.bench=h.get('b');
}
function writeRoute(){
  const h=new URLSearchParams();
  if(S.page!=='board')h.set('p',S.page);
  if(S.page==='board'){
    h.set('b',S.bench);h.set('v',S.view);if(S.track)h.set('t',S.track);
    if(S.cat!=='all')h.set('cat',S.cat);if(S.suite!=='all')h.set('suite',S.suite);if(S.pol!=='all')h.set('pol',S.pol);if(S.q)h.set('q',S.q);
    if(S.mode==='suite')h.set('mode','suite');if(S.dir>0)h.set('dir','asc');
    if(S.view==='about'){if(S.gcat!=='all')h.set('gcat',S.gcat);if(S.gtask)h.set('gtask',S.gtask);}
    if(S.drawer)h.set('d',S.drawer);
  }
  history.replaceState(null,'',location.pathname+location.search+'#'+h.toString());
}
