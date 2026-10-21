'use strict';
/* MVE leaderboard v2 · editorial pages: benchmark guide (关于), task videos, task drawer, atlas, method, log.
   Task descriptions and media are editorial metadata, never scores. */

/* ---------- media ---------- */
const mediaVis=new IntersectionObserver(es=>es.forEach(e=>{if(!e.isIntersecting)e.target.pause();}),{threshold:.05});
function initVideos(){
  for(const v of $$('video')){mediaVis.observe(v);if(v.dataset.bound)continue;v.dataset.bound='1';
    v.addEventListener('play',()=>$$('video').forEach(o=>{if(o!==v)o.pause();}));}
}
function mediaOrigin(m){
  const l=String(m?.label||'');
  if(l.includes('专家'))return '专家动作重放 · 不计入任何模型成绩';
  if(m?.kind==='official_demo'||/^https?:/.test(String(m?.src||m?.url||'')))return '官方演示 · 非 MVE 评测结果';
  return 'MVE 历史诊断片段 · 不代表当前榜单的平均表现';
}
function videoBlock(list,i=0,id='v'){
  const m=list[i];
  if(!m)return `<div class="vid"><div class="vid-empty">尚无已核验的执行视频<br>保留任务说明与官方来源</div></div>`;
  const src=safeUrl(m.src||m.url),poster=m.poster||m.posterUrl;
  return `<div class="d-video" data-vbox="${esc(id)}"><video controls playsinline muted preload="metadata" ${poster?`poster="${esc(safeUrl(poster))}"`:''} src="${esc(src)}" aria-label="${esc(m.label||'任务视频')}"></video></div>
    ${list.length>1?`<div class="clips" role="group" aria-label="切换视频">${list.map((x,j)=>`<button data-clip="${j}" data-clip-box="${esc(id)}" aria-pressed="${j===i}">${esc(x.label||`片段 ${j+1}`)}</button>`).join('')}</div>`:''}
    <div class="prov"><i></i>${esc(mediaOrigin(m))}${m.label?` · ${esc(m.label)}`:''}${m.sourceUrl?` · <a class="link" href="${esc(safeUrl(m.sourceUrl))}" target="_blank" rel="noopener">来源 ↗</a>`:''}</div>`;
}
const CLIPS={};
function guideMedia(list){return (list||[]).filter(m=>m.url||m.src).map(m=>({...m,src:m.src||m.url,poster:m.poster||m.posterUrl||''}));}
function taskClipList(b,t,g){
  const all=[...taskVideos(b,t),...guideMedia(g?.media)];
  return all.filter((m,i)=>m.src&&all.findIndex(x=>x.src===m.src)===i);
}
document.addEventListener('click',e=>{
  const c=e.target.closest('[data-clip]');if(!c)return;
  const id=c.dataset.clipBox,list=CLIPS[id];if(!list)return;
  for(const host of $$(`[data-vhost="${CSS.escape(id)}"]`)){host.innerHTML=videoBlock(list,Number(c.dataset.clip),id);}initVideos();
});

/* ---------- task facts & drawer ---------- */
function taskFacts(t){
  if(!t)return '';
  const f=[];
  if(t.domain)f.push(['场景',t.domain==='simulation'?'仿真':'实机']);
  if(t.structure)f.push(['结构',t.structure==='composite'?'组合任务':'基础操作']);
  if(t.activity)f.push(['活动组',t.activity==='Atomic'?'原子技能':t.activity]);
  if(t.subtasks!=null)f.push(['子任务',String(t.subtasks)]);
  if(t.mobileManipulation)f.push(['移动操作',t.mobileManipulation==='No'?'不需要':t.mobileManipulation==='Yes'?'需要':t.mobileManipulation]);
  if(t.embodiments?.length)f.push(['机器人',t.embodiments.join(' / ')]);
  if(t.officialDimensions)for(const [k,v] of Object.entries(t.officialDimensions))f.push([k==='manip'?'官方操作标签':k==='cognition'?'官方认知标签':k,Array.isArray(v)?v.join(' / '):String(v)]);
  if(t.categoryAssignment)f.push(['归类依据',t.categoryAssignment]);
  return `${f.length?`<dl class="tfacts">${f.map(([a,b])=>`<div><dt>${esc(a)}</dt><dd>${esc(b)}</dd></div>`).join('')}</dl>`:''}${t.note?`<p class="muted" style="font-size:12.5px">${esc(t.note)}</p>`:''}${t.goalDefinition?`<details class="note-box" style="margin:10px 0"><summary>官方目标谓词</summary><pre class="mono" style="padding:10px 14px;margin:0;white-space:pre-wrap">${esc(t.goalDefinition)}</pre></details>`:''}`;
}
function taskBoard(b){
  const bd=activeBoard(b,['rank','combos','mountain','matrix'].includes(S.view)?S.view:'rank');
  if(!bd)return null;if(bd.kind==='encoder')return getBoard(b,bd.track,'auto');if(bd.kind==='pro')return null;return bd;
}
function taskDrawer(b,t){
  const g=guideTaskMap(b.id).get(t.id),title=g?.title||t.instruction||shortTask(t),list=taskClipList(b,t,g),vid=`task-${t.id}`;CLIPS[vid]=list;
  const cat=b.id==='libero'?`${suiteName(t.suite)} · ${SUITES[t.suite]?.[1]||''}`:t.condition||t.suite||'';
  let h=`<div class="d-h">${tile(b.id)}<div><h2>${esc(title)}</h2><p>${esc(g?.objective||'')}</p></div></div>
    <div class="meta" style="margin-top:10px">${cat?`<span class="pill">${esc(cat)}</span>`:''}<span class="mono muted">${esc(t.id)}</span>${g?.sourceUrl?`<a href="${esc(safeUrl(g.sourceUrl))}" target="_blank" rel="noopener">官方定义 ↗</a>`:''}</div>
    ${t.instruction?`<p class="ins">原始指令 <code lang="en">${esc(t.instruction)}</code></p>`:''}
    <div class="d-sec" data-vhost="${esc(vid)}">${videoBlock(list,0,vid)}</div>`;
  const bd=taskBoard(b);
  if(bd){const pm=bd.kind==='pair'?curCat(bd):null,other=pm?bd.cats.find(c=>c.id!==pm):null;
    const rows=bd.rows.filter(r=>inPool(bd,r)).map(r=>{const v=r.tasks?.[t.id];return {r,v:v&&pm?{...v,rate:fin(v[pm])?v[pm]:null}:v};})
      .filter(x=>x.v&&(!pm||fin(x.v.rate))).sort((a,c)=>(fin(c.v.rate)?c.v.rate:-1)-(fin(a.v.rate)?a.v.rate:-1));
    const lab=x=>bd.kind==='pair'?`${rowMark(bd,x.r)}<span>${esc(x.r.name)}</span>`:`${encMark(x.r.encoder)}<span>${esc(x.r.name)}</span>${bd.kind!=='run'||bd.pols.length>1?polBadge(x.r.head):''}`;
    const sub=x=>pm?(other&&fin(x.v[other.id])?`${other.label} ${pc(x.v[other.id],0)}%`:''):fin(x.v.succ)?`${x.v.succ}/${x.v.ep}`:'覆盖未齐';
    if(rows.length)h+=`<div class="d-sec"><h3>本任务成绩 <small>${esc(shortTrack(bd.track))}${pm?' · '+esc(bd.cats.find(c=>c.id===pm)?.label||''):''}${S.pol!=='all'?' · '+esc(polName(S.pol)):''}</small></h3><div class="blist">${rows.slice(0,40).map(x=>bRow(lab(x),x.v.rate,sub(x),`data-row="${esc(x.r.id)}"`)).join('')}</div>${rows.length>40?`<p class="muted" style="font-size:12px">仅列前 40 行。</p>`:''}</div>`;}
  h+=g?`<div class="d-sec"><h3>任务说明</h3>${taskFacts(g)}</div>`:'';
  return h;
}

/* ---------- task videos ---------- */
function videosView(b){
  const g=guideTaskMap(b.id),q=S.q.trim().toLowerCase();
  const tasks=(b.tasks||[]).filter(t=>taskVideos(b,t).length).filter(t=>S.cat==='all'||!SUITE_ORDER.includes(S.cat)||t.suite===S.cat)
    .filter(t=>!q||`${t.name} ${t.instruction} ${g.get(t.id)?.title||''} ${t.condition||''}`.toLowerCase().includes(q));
  if(!tasks.length)return emptyBox('没有符合条件的任务视频');
  return `<div class="scopebar"><b>${tasks.length} 个任务</b><span class="sep"></span><span>封面为初始观测或片段首帧；点击查看视频、任务说明与该任务的各模型成绩。视频是任务演示或历史诊断，不代表当前模型的平均表现。</span></div>
    <div class="vgrid">${tasks.map(t=>{const gt=g.get(t.id),poster=taskPoster(t),cat=b.id==='libero'?suiteName(t.suite):(t.condition||'');
      return `<button class="vcard" data-task="${esc(t.id)}"><span class="poster">${poster?`<img src="${esc(safeUrl(poster))}" alt="" loading="lazy" decoding="async">`:''}${cat?`<span class="tag pill">${esc(cat)}</span>`:''}<span class="play">${icon('play')}</span></span>
        <span class="body"><b>${esc(gt?.title||t.instruction||shortTask(t))}</b><small>${esc(gt?.objective||t.instruction||'')}</small></span></button>`;}).join('')}</div>`;
}

/* ---------- 关于 (benchmark guide) ---------- */
function guideTasks(b){
  const g=GUIDES[b.id];
  if(g?.tasks?.length)return g.tasks;
  return (b.tasks||[]).map(t=>({id:t.id,localTaskId:t.id,title:t.instruction||shortTask(t),objective:t.condition||t.instruction||'',categoryId:t.suite,instruction:t.instruction}));
}
function guideCats(b){
  const g=GUIDES[b.id];if(g?.categories?.length)return g.categories;
  return (bmeta(b.id).axes||[]).map((a,i)=>({id:SUITE_ORDER[i]||String(i),name:a.name,question:a.description}));
}
function coverageText(b){
  if(isPlanned(b))return '尚无本站实测成绩';
  const nat=b.tracks.find(t=>t.combinations),pro=b.tracks.find(t=>t.proRows);
  if(nat)return `Joint40 · ${nat.completeCombinations}/${nat.expectedCombinations} 个编码器 × 策略组合完整（三训练种子）`;
  if(pro)return `${pro.tasksPerTrack||40} 任务 × ${(pro.perturbations||[]).length} 类扰动 · ${pro.completedCells} 个完整扰动格`;
  if(b.id==='robotwin2')return `${b.taskCount} 个任务已评估 · ${b.tracks.length} 个版本（${b.tracks.some(t=>t.pairBoard)?'主榜 Easy + Hard 对照官方榜 · ':''}Easy / Hard / 官方 DP 参照）`;
  return `${b.taskCount} 个实例 · ${b.tracks.reduce((n,t)=>n+t.runs.length,0)} 条单回合诊断`;
}
function aboutView(b){
  const m=bmeta(b.id),g=GUIDES[b.id]||{},cats=guideCats(b),tasks=guideTasks(b),hm=guideMedia(g.media),src=m.projectUrl||b.sourceUrl;
  if(!hm.length){const t=tasks.find(x=>(x.media||[]).length);if(t)hm.push(...guideMedia(t.media));else{const lt=(b.tasks||[]).find(x=>taskVideos(b,x).length);if(lt)hm.push(...taskVideos(b,lt));}}
  CLIPS['hero']=hm;
  return `<div class="about">
    ${isPlanned(b)?`<div class="callout">本站尚未接入 ${esc(m.name||b.name)} 的实测成绩。下面的任务与类别说明来自官方资料，用于理解测试目标。</div>`:''}
    <section class="card about-hero"><div><h2>${esc(m.tagline||m.name||b.name)}</h2><p>${esc(g.intro||m.description||b.description)}</p>
      <dl class="facts"><dt>官方规模</dt><dd>${esc(m.scale||'—')}</dd><dt>本站进度</dt><dd>${esc(coverageText(b))}</dd>${m.caveat?`<dt>阅读提示</dt><dd>${esc(m.caveat)}</dd>`:''}</dl>
      <div class="src-list">${src?`<a class="btn" href="${esc(safeUrl(src))}" target="_blank" rel="noopener">${icon('ext')}官方项目</a>`:''}${m.paperUrl?`<a class="btn" href="${esc(safeUrl(m.paperUrl))}" target="_blank" rel="noopener">${icon('book')}论文</a>`:''}${!isPlanned(b)?`<button class="btn primary" data-view="rank">${icon('trophy')}查看榜单</button>`:''}</div></div>
      <div data-vhost="hero">${videoBlock(hm,0,'hero')}</div></section>
    ${cats.length?`<section><div class="section-h"><div><h2>评测维度</h2><p>${esc(g.categoryBasis||'按官方测试维度解读；不同维度的分数分开读。')}</p></div><span class="muted">${cats.length} 类</span></div>
      <div class="cats">${cats.map((c,i)=>{const n=tasks.filter(t=>t.categoryId===c.id).length;return `<article class="catc"><span class="n">${String(i+1).padStart(2,'0')}${c.english?` · ${esc(c.english)}`:''}</span><h4>${esc(c.name)}${n?`<small>${n} 项任务</small>`:''}</h4><p>${esc(c.question||'')}</p>
        ${c.changes||c.holdsFixed||c.example||c.distinction?`<dl>${c.changes?`<div><dt>改变什么</dt><dd>${esc(c.changes)}</dd></div>`:''}${c.holdsFixed?`<div><dt>保持不变</dt><dd>${esc(c.holdsFixed)}</dd></div>`:''}${c.example?`<div><dt>例子</dt><dd>${esc(c.example)}</dd></div>`:''}${c.distinction?`<div><dt>与其他类别的区别</dt><dd>${esc(c.distinction)}</dd></div>`:''}</dl>`:''}</article>`;}).join('')}</div></section>`:''}
    <section><div class="section-h"><div><h2>任务目录</h2><p>${esc(g.taskInventory?.label||g.taskScope||'逐项查看任务目标与执行视频。')}</p></div><span class="muted">${num(tasks.length)} 项${g.taskInventory?.officialCount?` · 官方共 ${num(g.taskInventory.officialCount)} 项`:''}</span></div>
      <div class="card dir"><div class="dir-list"><div class="dir-tools">${cats.length>1?`<div class="seg">${[['all','全部']].concat(cats.map(c=>[c.id,c.name])).map(([k,l])=>`<button data-gcat="${esc(k)}" aria-pressed="${S.gcat===k}">${esc(l)}</button>`).join('')}</div>`:''}
        <label class="search">${icon('search')}<span class="sr-only">搜索任务</span><input id="gq" type="search" value="${esc(S.gq)}" placeholder="搜索任务、物体或动作…" autocomplete="off"></label></div><div id="dir-list"></div><div class="pager" id="dir-pager"></div></div>
      <div class="dir-view" id="dir-view" aria-live="polite"></div></div>
      ${g.taskInventory?.note||g.taskScope?`<p class="muted" style="font-size:12.5px;margin:10px 2px 0">${esc(g.taskInventory?.note||g.taskScope)}${g.taskInventory?.sourceUrl?` <a class="link" href="${esc(safeUrl(g.taskInventory.sourceUrl))}" target="_blank" rel="noopener">官方任务目录 ↗</a>`:''}</p>`:''}</section>
    ${(g.sources||[]).length?`<section><div class="section-h"><div><h2>来源</h2></div></div><div class="src-list">${g.sources.map(s=>`<a class="btn" href="${esc(safeUrl(s.url))}" target="_blank" rel="noopener">${esc(s.label)} ↗</a>`).join('')}</div></section>`:''}
  </div>`;
}
const PAGE=12;
function matchingGuide(b){const q=S.gq.trim().toLowerCase();return guideTasks(b).filter(t=>(S.gcat==='all'||t.categoryId===S.gcat)&&(!q||`${t.title} ${t.objective} ${t.instruction||''} ${t.id}`.toLowerCase().includes(q)));}
function renderDirectory(){
  const b=B(),list=$('#dir-list');if(!list)return;
  const tasks=matchingGuide(b),pages=Math.max(1,Math.ceil(tasks.length/PAGE));
  if(S.gtask&&tasks.some(t=>t.id===S.gtask))S.gpage=Math.floor(tasks.findIndex(t=>t.id===S.gtask)/PAGE);
  S.gpage=Math.min(S.gpage,pages-1);if(!tasks.some(t=>t.id===S.gtask))S.gtask=tasks[S.gpage*PAGE]?.id||'';
  const sub=tasks.slice(S.gpage*PAGE,S.gpage*PAGE+PAGE),loc=new Set((b.tasks||[]).map(t=>t.id));
  list.innerHTML=sub.map((t,i)=>{const hasV=(t.media||[]).length||(loc.has(t.localTaskId)&&taskVideos(b,(b.tasks||[]).find(x=>x.id===t.localTaskId)).length);
    return `<button class="trow" data-gtask="${esc(t.id)}" aria-pressed="${t.id===S.gtask}"><span class="i">${String(S.gpage*PAGE+i+1).padStart(2,'0')}</span><span><b>${esc(t.title||t.id)}</b><small>${esc(t.objective||'')}</small></span>${icon(hasV?'video':'book')}</button>`;}).join('')||'<div class="empty">没有匹配的任务</div>';
  $('#dir-pager').innerHTML=`<button data-gpage="${S.gpage-1}" ${S.gpage===0?'disabled':''} aria-label="上一页">‹</button><span>${num(tasks.length)} 项 · ${S.gpage+1} / ${pages}</span><button data-gpage="${S.gpage+1}" ${S.gpage>=pages-1?'disabled':''} aria-label="下一页">›</button>`;
  renderGuideTask(b);
}
function renderGuideTask(b){
  const view=$('#dir-view');if(!view)return;$$('#dir-view video').forEach(v=>v.pause());
  const t=guideTasks(b).find(x=>x.id===S.gtask);
  if(!t){view.innerHTML='<div class="empty">选择左侧任务查看。</div>';return;}
  const cat=guideCats(b).find(c=>c.id===t.categoryId),local=(b.tasks||[]).find(x=>x.id===t.localTaskId),list=local?taskClipList(b,local,t):guideMedia(t.media),vid=`g-${t.id}`;CLIPS[vid]=list;
  view.innerHTML=`<div class="meta">${cat?`<span class="pill">${esc(cat.name)}</span>`:''}<span class="mono muted">${esc(t.id)}</span>${local?`<button class="btn" data-task="${esc(local.id)}" style="margin-left:auto">${icon('trophy')}本站成绩</button>`:''}</div>
    <h3>${esc(t.title||t.id)}</h3><p class="obj">${esc(t.objective||'')}</p><div data-vhost="${esc(vid)}">${videoBlock(list,0,vid)}</div>
    ${t.instruction?`<p class="ins">原始指令 <code lang="en">${esc(t.instruction)}</code></p>`:''}${taskFacts(t)}
    ${t.sourceUrl?`<p style="font-size:12.5px"><a class="link" href="${esc(safeUrl(t.sourceUrl))}" target="_blank" rel="noopener">官方定义 ↗</a></p>`:''}`;
  initVideos();
}
document.addEventListener('click',e=>{
  let el;
  if((el=e.target.closest('[data-gcat]'))){S.gcat=el.dataset.gcat;S.gpage=0;S.gtask='';$$('[data-gcat]').forEach(x=>x.setAttribute('aria-pressed',String(x===el)));renderDirectory();writeRoute();return;}
  if((el=e.target.closest('[data-gtask]'))){S.gtask=el.dataset.gtask;$$('[data-gtask]').forEach(x=>x.setAttribute('aria-pressed',String(x===el)));renderGuideTask(B());writeRoute();return;}
  if((el=e.target.closest('[data-gpage]'))){S.gpage=Number(el.dataset.gpage);S.gtask='';renderDirectory();writeRoute();return;}
});
document.addEventListener('input',e=>{if(e.target.id==='gq'){S.gq=e.target.value;S.gpage=0;S.gtask='';renderDirectory();}});

/* ---------- atlas ---------- */
function atlasPage(){
  return `<div class="wrap"><div class="page-h"><h1>Benchmark 图谱</h1><p>八个机器人操作 benchmark：各自测什么、规模多大、本站评测进行到哪一步。每个 benchmark 的颜色与图标在全站一致。</p></div>
    <div class="atlas">${DATA.benchmarks.map(b=>{const m=bmeta(b.id),g=GUIDES[b.id]||{},axes=(g.categories||m.axes||[]).map(a=>a.name);
      return `<article class="bcard" style="${bcVars(b.id)}"><div class="top-row">${tile(b.id,'l')}<h3>${esc(m.name||b.name)}<small>${esc(m.tagline||'')}</small></h3></div>
        <p class="q">${esc(m.question||b.description)}</p>${axes.length?`<div class="axes">${axes.slice(0,6).map(a=>`<span>${esc(a)}</span>`).join('')}</div>`:''}
        <div class="meta">${statusPill(b)}${m.publicationDate?`<span>${dateDot(m.publicationDate)}</span>`:''}<span>${esc(m.scale||'')}</span></div>
        <div class="foot"><span><b>${esc(isPlanned(b)?'尚无实测':benchBlurb(b))}</b><br>${num((g.tasks||[]).length||b.taskCount)} 项任务已编目</span>
          <div class="actions"><button class="btn" data-go-bench="${esc(b.id)}" data-go-view="about">了解任务</button>${!isPlanned(b)?`<button class="btn primary" data-go-bench="${esc(b.id)}" data-go-view="rank">榜单</button>`:''}</div></div></article>`;}).join('')}</div></div>`;
}

/* ---------- method ---------- */
function methodPage(){
  const P=[['scale','同协议才比较','只有同一 benchmark、同一训练与评估协议、同一覆盖范围内的结果才排名次。历史协议与诊断记录分开显示，不混合分母。'],
    ['seed','多个训练种子','以三个训练种子的等权平均为准（LIBERO：17 / 29 / 43；RoboTwin：0 / 1 / 2），± 为种子间标准差；只有单个种子的版本会在版本名里注明。'],
    ['layersOff','缺失不填 0','覆盖未齐的格子显示 “—”，不计为失败，也不用部分种子的均值代替。'],
    ['eye','冻结视觉编码器','视觉编码器全程冻结，只训练动作模型；比较的是视觉表征本身对机器人操作的支持。'],
    ['flask','证据可追溯','每个成绩都能追到审计记录、checkpoint 与日志；有回合报错的评估作废重跑。视频是任务演示或历史诊断，不代表平均表现。']];
  const cards=DATA.benchmarks.filter(b=>!isPlanned(b)).map(b=>{const m=bmeta(b.id);
    return `<section class="card proto" style="${bcVars(b.id)}"><div class="top-row">${tile(b.id)}<h3>${esc(m.name||b.name)}</h3>${statusPill(b)}</div><p class="muted" style="margin:0 0 10px;font-size:13px">${esc(b.description)}</p>
      <table><tbody>${[...b.tracks].sort((x,y)=>((y.combinations||y.proRows)?1:0)-((x.combinations||x.proRows)?1:0)).map(t=>`<tr><th>${esc(shortTrack(t))}</th><td>${t.trainingSeeds?.length?`训练种子 ${esc(t.trainingSeeds.join(' / '))}`:''}${t.targetEpisodesPerTask?` · 每任务 ${esc(t.targetEpisodesPerTask)} 回合`:''}${t.rankingNote?`<br><span class="muted">${esc(t.rankingNote)}</span>`:''}</td></tr>`).join('')}
      ${m.caveat?`<tr><th>阅读提示</th><td>${esc(m.caveat)}</td></tr>`:''}</tbody></table></section>`;}).join('');
  return `<div class="wrap"><div class="page-h"><h1>评测方法</h1><p>MVE 比较冻结视觉编码器在机器人操作中的作用。下面是全站共同的规则和每个 benchmark 的协议。</p></div>
    <div class="method"><div class="principles">${P.map(([i,t,d])=>`<article class="principle">${icon(i)}<h4>${esc(t)}</h4><p>${esc(d)}</p></article>`).join('')}</div>${cards}
    ${(DATA.notes||[]).length?`<section class="card proto"><h3 style="margin:0 0 8px">数据快照说明</h3><ul style="margin:0;padding-left:18px;color:var(--ink-2);font-size:13px">${DATA.notes.map(n=>`<li>${esc(n)}</li>`).join('')}</ul></section>`:''}</div></div>`;
}

/* ---------- log ---------- */
const LOG_TYPES={evaluation:'评估',protocol:'协议',correction:'勘误',release:'发布',queue:'队列',recovery:'恢复'};
function logBench(e){const s=`${e.id} ${e.title}`.toLowerCase();if(s.includes('robotwin'))return 'robotwin2';if(/plus/.test(s))return 'libero-plus';if(/(^|[-_ ])pro([-_ ]|$)|PRO/.test(`${e.id} ${e.title}`))return 'libero-pro';if(e.type==='evaluation')return 'libero';return '';}
function logList(){
  const q=S.logq.trim().toLowerCase();
  const items=[...(DATA.experimentLog||[])].sort((a,b)=>(Date.parse(b.at)||0)-(Date.parse(a.at)||0))
    .filter(e=>(S.logtype==='all'||e.type===S.logtype)&&(!q||`${e.title} ${e.summary} ${e.id}`.toLowerCase().includes(q)));
  let day='',out='';
  for(const e of items){const d=String(e.at||'').slice(0,10);if(d!==day){day=d;out+=`<div class="day">${esc(d||'时间未记录')}</div>`;}
    const bid=logBench(e),bm=bid?bmeta(bid):null;
    out+=`<article class="entry"><time>${esc(String(e.at||'').slice(11,16))} UTC</time><div><h4>${bid?`<span class="btag" style="${bcVars(bid)}"><i></i>${esc(bm?.name||bid)}</span>`:''}<span class="tpill">${esc(LOG_TYPES[e.type]||e.type||'记录')}</span>${esc(e.title)}</h4>
      <p>${esc(e.summary)}</p>${String(e.summary||'').length>150?'<button class="more" data-more>展开全文</button>':''}<div class="ev"><span>证据 · ${esc(e.evidenceLabel||'—')}</span>${e.commitUrl&&safeUrl(e.commitUrl)!=='#'?`<a class="link" href="${esc(safeUrl(e.commitUrl))}" target="_blank" rel="noopener">关联提交 ↗</a>`:''}</div></div></article>`;}
  return out||'<div class="card empty"><h3>没有匹配的记录</h3></div>';
}
function logPage(){
  const types=[...new Set((DATA.experimentLog||[]).map(e=>e.type).filter(Boolean))],commits=DATA.repository?.recentCommits||[];
  return `<div class="wrap"><div class="page-h"><h1>实验日志</h1><p>训练、评估、审计与发布的可追溯记录 · ${num((DATA.experimentLog||[]).length)} 条 · 数据快照 ${esc(String(DATA.updatedAt||'').replace('T',' ').slice(0,16))} UTC</p></div>
    <div class="log"><section><div class="log-tools"><div class="seg">${[['all','全部']].concat(types.map(t=>[t,LOG_TYPES[t]||t])).map(([k,l])=>`<button data-logtype="${esc(k)}" aria-pressed="${S.logtype===k}">${esc(l)}</button>`).join('')}</div>
      <label class="search">${icon('search')}<span class="sr-only">搜索日志</span><input id="logq" type="search" value="${esc(S.logq)}" placeholder="搜索标题或内容…" autocomplete="off"></label></div><div id="log-list">${logList()}</div></section>
      <aside class="card commits"><h3>${icon('github')} GitHub 提交</h3><p class="muted" style="font-size:12.5px;margin:0">代码历史，与左侧实验记录分开列示。${DATA.repository?.isPrivate!==false?'仓库为私有。':''}</p>
        ${commits.length?`<ol>${commits.map(c=>`<li><time>${esc(String(c.at||'').slice(0,16).replace('T',' '))}</time>${c.url&&safeUrl(c.url)!=='#'?`<a class="link" href="${esc(safeUrl(c.url))}" target="_blank" rel="noopener">${esc(c.title)}</a>`:esc(c.title)} <span class="mono muted">${esc(String(c.sha||'').slice(0,8))}</span></li>`).join('')}</ol>`:'<p class="muted">暂无提交记录。</p>'}
        ${DATA.repository?.commitsUrl?`<p style="margin:12px 0 0"><a class="btn" href="${esc(safeUrl(DATA.repository.commitsUrl))}" target="_blank" rel="noopener">完整提交历史 ↗</a></p>`:''}</aside></div></div>`;
}
document.addEventListener('click',e=>{
  let el;
  if((el=e.target.closest('[data-logtype]'))){S.logtype=el.dataset.logtype;$$('[data-logtype]').forEach(x=>x.setAttribute('aria-pressed',String(x===el)));$('#log-list').innerHTML=logList();return;}
  if((el=e.target.closest('[data-more]'))){const a=el.closest('.entry');a.classList.toggle('open');el.textContent=a.classList.contains('open')?'收起':'展开全文';}
});
document.addEventListener('input',e=>{if(e.target.id==='logq'){S.logq=e.target.value;$('#log-list').innerHTML=logList();}});
