'use strict';
let catalog={encoders:{},benchmarks:{}}, proPerturbation='Object';
let data, benchmarkId=location.hash==='#pro'?'libero-pro':'libero', trackId=location.hash==='#pro'?'pro-native-20x1':'native-20x1', view=({'#pro':'pro','#encoders':'encoders','#tasks':'tasks','#protocol':'protocol','#log':'log'}[location.hash]||'guide'), ascending=false, encoderBreakdown='policies';
const $=s=>document.querySelector(s), esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pct=(s,n)=>n>0&&s!==null&&s!==undefined?`${(100*s/n).toFixed(1)}%`:'—';
const num=n=>Number(n||0).toLocaleString('en-US');
const suiteName=s=>({libero_spatial:'Spatial',libero_object:'Object',libero_goal:'Goal',libero_10:'Long-horizon'}[s]||s||'诊断任务');
const bench=()=>data.benchmarks.find(b=>b.id===benchmarkId)||data.benchmarks[0];
const track=()=>bench().tracks.find(t=>t.id===trackId)||bench().tracks[0];
const displayRuns=()=>track()?.combinations||track()?.runs||[];
const isCombination=r=>Array.isArray(r.runIds);
const statusLabel=r=>({complete:'已核验',training_running:'训练中',training:'训练中',training_incomplete:'训练未完成',awaiting_evaluation:'待评估',waiting_gpu:'等待GPU',waiting_cache_or_dependency:'等待缓存',waiting_cache:'等待缓存',pending:'待评估',in_progress:'评估中',partial:'评估中',running:'评估中',blocked:'访问受阻'}[r.progressStatus||r.status]||r.progressStatus||r.status||'待评估');
const safeUrl=u=>/^(https?:\/\/|data\/media\/)/.test(u||'')?u:'#';
// Encoder identity is stable across heads, filters, benchmarks and result order.
const encoderIdentity={
  resnet50_in1k_v2:['R50','#647267'], vitb16_in1k_v1:['ViT','#967843'],
  mae_b16:['MAE','#89784a'], dinov2_b14_reg:['D2B','#5c8294'],
  dinov3_b16:['D3B','#526fa5'], dinov3_l16:['D3L','#7273a4'],
  clip_b16:['CLP','#98726b'], siglip2_b16_224:['S2B','#b07969'],
  siglip2_so400m14_384:['S2S','#9d5e68'], eupe_vit_b:['EUV','#548375'],
  eupe_convnext_b:['EUC','#759054'], vc1_b:['VCB','#927a91'],
  vc1_l:['VCL','#a36f8b'], pe_spatial_b16_512:['PES','#568b9c'],
  pe_core_b16_224:['PEC','#697faf'], r3m_resnet50:['R3M','#a07d53'],
  vip:['VIP','#8b8850'], theia_b_cdiv:['THB','#7489a0'],
  sam21_hiera_t:['SAM','#739879'], dav2_b:['DA2','#ab954c'],
  c_radio_v3_b:['CR3','#8c74a3'], c_radio_v4_so400m:['CR4','#a177a0']
};
const encoderStyle=id=>`--encoder-color:${(encoderIdentity[id]||['?', '#647267'])[1]}`;
function encoderLabel(r,showId=false){const identity=encoderIdentity[r.encoder]||['?', '#647267'];return `<span class="encoder-identity" style="${encoderStyle(r.encoder)}"><span class="encoder-mark" aria-hidden="true">${identity[0]}</span><span class="encoder-name">${esc(r.encoderLabel||r.encoder)}${r.server?` · ${esc(r.server)}`:''}${r.revisionLabel?`<small>${esc(r.revisionLabel)}</small>`:''}${showId?`<small>${esc(r.encoder)}</small>`:''}</span></span>`;}
function logDate(value){const date=new Date(value);return Number.isNaN(date.getTime())?'时间未记录':date.toISOString().replace('T',' ').slice(0,16)+' UTC';}
function badge(head){return `<span class="head-badge ${String(head).toLowerCase()==='dp'?'dp':''}">${esc(policyName(head||'—'))}</span>`;}
function metric(label,value,note,suffix=''){return `<div class="metric"><div class="metric-label">${label}</div><div class="metric-value">${value}<small>${suffix}</small></div><div class="metric-note">${note}</div></div>`;}
function visibleTasks(){const s=$('#suite').value,q=$('#search').value.trim().toLowerCase();return (bench().tasks||[]).filter(t=>(s==='all'||t.suite===s)&&(!q||`${t.name} ${t.instruction} ${t.suite}`.toLowerCase().includes(q)));}
function runScore(r,suite=$('#suite').value){
  if(suite==='all')return {successes:r.successes,episodes:r.episodes||0,rate:r.successRate??null};
  if(isCombination(r)){const a=r.suiteResults.find(x=>x.suite===suite);return {successes:a?.successes??null,episodes:a?.episodes||0,rate:a?.successRate??null};}
  const tasks=bench().tasks.filter(t=>t.suite===suite),ids=new Set(tasks.map(t=>t.id));
  const a=(r.taskResults||[]).filter(t=>ids.has(t.taskId));
  const ready=a.length===tasks.length&&a.every(t=>typeof t.successes==='number');
  const episodes=a.reduce((n,t)=>n+t.episodes,0),successes=ready?a.reduce((n,t)=>n+t.successes,0):null;
  return {successes,episodes,rate:successes!==null&&episodes?successes/episodes:null};
}
function visibleRuns(ignoreSearch=false){
  const h=$('#head').value,q=ignoreSearch?'':$('#search').value.trim().toLowerCase();
  return displayRuns().filter(r=>(h==='all'||r.head?.toUpperCase()===h)&&(!q||`${r.encoder} ${r.encoderLabel} ${r.head}`.toLowerCase().includes(q))).sort((a,b)=>{
    if(track()?.combinations||track()?.ranked){const x=runScore(a).rate,y=runScore(b).rate;if((x!==null)!==(y!==null))return x!==null?-1:1;if(x!==null&&y!==null&&x!==y)return (ascending?1:-1)*(x-y);}
    return (a.encoderLabel||a.encoder).localeCompare(b.encoderLabel||b.encoder);
  });
}

function render(){
 document.body.dataset.pageView=view;
 const b=bench(),t=track(),meta=benchmarkMeta(b.id),isLog=view==='log',isAtlas=view==='atlas',info=['log','atlas','guide','protocol'].includes(view),pro=!!t?.proRows;
 $('#page-title').textContent=isAtlas?'Benchmark Atlas':isLog?'实验日志':b.id==='libero'?'LIBERO · Joint40':b.name;
 $('#description').textContent=isAtlas?'了解测试目标、任务结构与 MVE 的实际评测覆盖。':isLog?'训练、评估、审计与发布的可追溯记录。':meta.question||b.description;
 $('#breadcrumb').textContent=isAtlas?'8 BENCHMARKS':isLog?'RESEARCH JOURNAL':meta.publicationDate?publication(meta):b.name;
 $('#stage').textContent=isLog?'实验与 GitHub 记录':isAtlas?'任务 · 能力 · 证据':t?.id==='native-20x1'?'开发比较 · FP32 / 20k':pro?'开发比较 · 独立扰动':t?'历史 / 独立诊断':'尚未接入';
 $('#source').href=safeUrl(isLog?data.repository?.commitsUrl:meta.projectUrl||b.sourceUrl);
 $('#source').hidden=isAtlas||!(isLog?data.repository?.commitsUrl:meta.projectUrl||b.sourceUrl);
 $('#source').textContent=isLog?'GitHub 提交记录 ↗':'官方项目 ↗';
 $('.guide-shortcut').hidden=info;
 $('#pro-results-link').hidden=true;
 $('#metrics').hidden=info;
 $('.controls').hidden=info;
 $('.workspace-head').classList.toggle('information-view',info);
 $('#repository-link').href=safeUrl(data.repository?.url);
 $('#repository-link').title=data.repository?.isPrivate===false?'项目仓库':'私有项目仓库 · 需要访问权限';
 $('#bench-count').textContent=String(data.benchmarks.length).padStart(2,'0');
 $('#benchmarks').innerHTML=data.benchmarks.map((x,i)=>`${i===4?'<div class="side-label upcoming-label">EXPLORE NEXT</div>':''}<button class="bench ${!isLog&&!isAtlas&&x.id===b.id?'active':''}" data-benchmark="${esc(x.id)}" ${!isLog&&!isAtlas&&x.id===b.id?'aria-current="page"':''}><span class="bench-index">${String(i+1).padStart(2,'0')}</span><span class="bench-name">${esc(x.id==='libero'?'LIBERO':x.name)}<small>${benchmarkStatus(x)}</small></span><span class="bench-indicator ${x.status}"></span></button>`).join('');
 const views=[['guide','总览'],[pro?'pro':'leaderboard',pro?'扰动分榜':'策略组合'],...(t?.encoderBoard?[['encoders','编码器综合']]:[]),...(t?.encoderBoard||pro?[['mountains','性能山']]:[]),...(t?.combinations?[['taskboard','逐任务分榜']]:[]),['tasks','本站视频']];
 $('.tabs').innerHTML=(b.status==='planned'?[['guide','总览与任务']]:views).map(([id,label])=>`<button data-view="${id}" class="${view===id?'active':''}" aria-current="${view===id?'page':'false'}">${label}</button>`).join('');
 $('.section-bar').hidden=isLog||isAtlas;
 document.querySelectorAll('.benchmark-sidebar [data-view]').forEach(e=>{e.classList.toggle('active',e.dataset.view===view);e.setAttribute('aria-current',e.dataset.view===view?'page':'false');});
 const labels={'native-20x1':'Native · FP32 / 20k','p1-2ep':'历史 P1 · 2 回合','expanded-20x3':'历史扩展 · 20×3','pro-native-20x1':'PRO · Native / 20×1','pro-development':'历史 PRO · 单例诊断','plus-development':'Plus · 单例诊断'};
 $('#track').innerHTML=(b.tracks||[]).map(x=>`<option value="${esc(x.id)}" ${x.id===t?.id?'selected':''}>${esc(labels[x.id]||x.label)}</option>`).join('')||'<option>暂无评估</option>';
 $('#track').disabled=!t;
 const oldSuite=$('#suite').value,oldHead=$('#head').value,suites=pro?suiteOrder:[...new Set((b.tasks||[]).map(x=>x.suite))];
 $('#suite').innerHTML='<option value="all">全部任务</option>'+suites.map(x=>`<option value="${esc(x)}">${esc(suiteName(x))}</option>`).join('');
 if(suites.includes(oldSuite))$('#suite').value=oldSuite;
 const choices=pro?t.proRows:displayRuns(),heads=[...new Set(choices.map(r=>r.head).filter(Boolean))];
 $('#head').innerHTML=`<option value="all">${view==='encoders'||view==='mountains'&&!pro?`${t?.encoderBoard?.policyHeads.length||5} 策略等权平均`:'全部动作策略'}</option>`+heads.map(h=>`<option value="${esc(h.toUpperCase())}">${esc(policyName(h))}</option>`).join('');
 if(heads.some(h=>h.toUpperCase()===oldHead))$('#head').value=oldHead;
 $('#head').disabled=false;$('#head').closest('label').hidden=false;$('#search').disabled=false;$('#suite').disabled=false;
 const rs=displayRuns(),done=rs.filter(r=>r.status==='complete'),samples=rs.reduce((n,r)=>n+(r.episodes||0),0),enc=new Set((pro?t.proRows:rs).map(r=>r.encoder));
 $('#metrics').innerHTML=metric('任务覆盖',pro?t.tasksPerTrack:b.taskCount??'—',pro?'每种扰动独立覆盖':b.taskCountLabel||'同一 benchmark')+metric('视觉编码器',enc.size||'—',t?.encoderBoard?`${t.encoderBoard.policyHeads.length} 种动作策略`:pro?`${t.proRows.length} 个策略组合`:'独立诊断')+metric(pro?'完整扰动格':t?.combinations?'完整策略组合':'已核验回合',pro?t.completedCells:t?.combinations?done.length:num(samples),pro||t?.combinations?'完整三个训练种子':'诊断覆盖',t?.combinations?`/ ${rs.length}`:'')+metric('有效评估回合',num(pro?t.auditedValidEpisodes:samples),t?.combinations||pro?'每任务 20 seed × 3 训练种子':'仅列已核验证据');
 renderContent();
}
function renderHeaderControls(){
 const info=['log','atlas','guide','protocol'].includes(view),t=track();
 $('#category-tabs').hidden=info;$('#perturbation-tabs').hidden=info||!t?.proRows;$('#board-options').hidden=info;
 const suites=t?.proRows?suiteOrder:suiteOrder.filter(s=>(bench().tasks||[]).some(t=>t.suite===s));
 $('#category-tabs').innerHTML=`<span class="scope-label">任务分类</span>${categoryButton('all','Overall · 全部')}${suites.map(s=>categoryButton(s)).join('')}<span class="scope-hint">点击分类，重新排序</span>`;
 if(t?.proRows){if(!t.proRows[0].cells.some(c=>c.track===proPerturbation))proPerturbation=t.proRows[0].cells[0].track;
 $('#perturbation-tabs').innerHTML='<span class="scope-label">扰动分榜</span>'+t.proRows[0].cells.map(c=>`<button data-perturbation="${esc(c.track)}" class="${c.track===proPerturbation?'active':''}" aria-pressed="${c.track===proPerturbation}">${esc(c.label)}${c.track===proPerturbation?' ↓':''}</button>`).join('')+'<span class="scope-hint">每类独立 · 无全 PRO 总分</span>';}
 $('#task-selector').hidden=view!=='taskboard';
 if(view==='taskboard'){const previous=$('#task-scope').value,tasks=(bench().tasks||[]).filter(t=>$('#suite').value==='all'||t.suite===$('#suite').value);$('#task-scope').innerHTML=tasks.map((t,i)=>`<option value="${esc(t.id)}">${String(i+1).padStart(2,'0')} · ${esc(t.instruction||t.name)}</option>`).join('');if(tasks.some(t=>t.id===previous))$('#task-scope').value=previous;}
 $('#board-options').innerHTML=`<span class="active-scope"><span class="dot"></span>${esc(currentScope())}${view==='taskboard'?' · 单任务':$('#head').value==='all'?'':` · ${esc(policyName($('#head').value))}`}<small>${t?.combinations||t?.proRows?'开发比较 · 3 个训练种子等权':`独立诊断 · 训练种子 ${esc(t?.trainingSeeds?.join(' / ')||'未登记')}`}</small></span>${view==='encoders'?`<div class="segmented" role="group" aria-label="编码器表格明细"><button data-breakdown="policies" aria-pressed="${encoderBreakdown==='policies'}">策略明细</button><button data-breakdown="suites" aria-pressed="${encoderBreakdown==='suites'}">分类明细</button></div>`:''}${view==='mountains'?`<button class="text-action" id="sort">成功率 ${ascending?'↑ 升序':'↓ 降序'}</button>`:''}`;
}
function empty(title,message){return `<div class="empty-state"><div class="eyebrow">EVIDENCE FIRST</div><h2>${esc(title)}</h2><p>${esc(message)}</p>${bench().sourceUrl?`<a href="${esc(safeUrl(bench().sourceUrl))}" target="_blank" rel="noopener">了解官方 benchmark ↗</a>`:''}</div>`;}

function methodNote(summary,detail){return `<details class="method-note"><summary><span><span class="development-tag">开发比较</span><strong>${esc(summary)}</strong></span><span class="method-link">统计口径</span></summary><p>${esc(detail)}</p></details>`;}
function boardHeading(title,count,note='',extra=''){return `<div class="board-heading"><div><h2>${esc(title)}</h2><span class="board-count">${esc(count)}</span>${note?`<p class="board-note">${esc(note)}</p>`:''}</div>${extra}</div>`;}
function notice(){
  const t=track();
  if(t?.id==='native-20x1')return methodNote('3 训练种子均值 · 20 评估 seed','保留原生空间 tokens，完整 batch32、FP32 训练 20,000 步。每行是视觉编码器 × 动作策略，成功率为训练种子 17 / 29 / 43 的等权均值。总体需收齐 3×800 回合，分类需各 3×200 回合。缺项不填 0、不用部分种子替代。当前为开发比较，与历史 P1、20×3 分开。'+(t.comparisonNote||'')+(t.servers?.length?' 审计快照：'+t.servers.map(s=>`${s.id} ${logDate(s.observedAt)}`).join('；'):'')+'。');
  return `<div class="notice"><strong>历史 / 诊断数据</strong><span>${esc(t?.ranked?'训练 seed17、每任务 2 回合的 P1 开发快照；不作为最终排名。':t?.id==='expanded-20x3'?'旧协议已停止新增。20 个评估种子 × 每种子 3 回合；覆盖未齐，不排序、不与原生 20×1 合并。':'独立任务诊断；任务、扰动或初态覆盖未齐，不作为 benchmark 整体成功率。')}</span></div>`;
}
function scoreHTML(s,n,rate=n&&s!==null&&s!==undefined?s/n:null){return rate!==null?`<div class="score"><strong>${(100*rate).toFixed(1)}%</strong><span class="bar"><i style="width:${100*rate}%"></i></span></div>`:`<div class="score"><span class="null">${track()?.id==='native-20x1'?'—':n?'覆盖未齐':'尚无结果'}</span></div>`;}
function renderContent(){
 cleanupVideos();stopGifs();renderHeaderControls();const b=bench(),t=track();
 if(view==='atlas'){renderAtlas();return;}
 if(view==='guide'){renderGuide();return;}
 if(view==='mountains'){renderMountains();return;}
 if(view==='log'){$('#content').innerHTML=experimentLog();return;}
 if(view==='protocol'){$('#content').innerHTML=protocol();return;}
 if(view==='tasks'){renderTasks();return;}
 if(view==='pro'||t?.proRows){renderProBoard();return;}
 if(view==='encoders'){renderEncoderBoard();return;}
 if(!t||!displayRuns().length){renderGuide();return;}
 const combined=!!t.combinations,runs=combined?rankedRuns():visibleRuns(),universe=combined?rankedRuns(true):visibleRuns(true),taskView=view==='taskboard',suites=suiteOrder.filter(s=>(b.tasks||[]).some(t=>t.suite===s)),suiteCols=!taskView&&b.id==='libero'&&(t.id==='p1-2ep'||combined);
 const score=combined?selectedRunScore:runScore;
 $('#content').innerHTML=notice()+boardHeading(taskView?'逐任务分榜':'编码器 × 动作策略',`${runs.length} 个组合`,taskView?$('#task-scope').selectedOptions[0]?.textContent||'':`${currentScope()} · ${combined?'三个训练种子等权平均':`独立诊断 · 训练种子 ${t.trainingSeeds?.join(' / ')||'未登记'}`}`)+`<div class="table-wrap" tabindex="0" role="region" aria-label="策略组合分榜"><table class="benchmark-table"><thead><tr><th>比较序</th><th>视觉编码器 / 发布</th><th class="action-cell">动作策略</th><th aria-sort="${ascending?'ascending':'descending'}"><button class="sort-button" id="sort" ${!t.ranked&&!combined?'disabled':''}>${taskView?'任务成功率':$('#suite').value==='all'?'平均成功率':esc(suiteName($('#suite').value))} ${ascending?'↑':'↓'}</button><small class="column-note">${taskView?'单任务 · 60 回合':combined?'三训练种子均值':`训练种子 ${esc(t.trainingSeeds?.join(' / ')||'未登记')}`}</small></th><th>成功 / 有效</th>${suiteCols?categoryHeaders(suites):''}<th class="status-col">覆盖</th></tr></thead><tbody>${runs.map(r=>{
 const a=score(r),rank=combined||t.ranked?comparisonRank(a.rate,universe,x=>score(x).rate):null;
 return `<tr data-result-id="${esc(r.id)}"><td class="rank ${rank===1?'first':''}">${rank===null?'—':String(rank).padStart(2,'0')}</td><td><button class="link-button encoder" data-run="${esc(r.id)}">${encoderLabel(r)}</button><div class="encoder-byline"><span>${esc(publication(encoderMeta(r.encoder)))}</span>${projectLink(r.encoder)}</div></td><td class="action-cell">${badge(r.head)}</td><td>${scoreHTML(a.successes,a.episodes,a.rate)}</td><td class="sample">${a.episodes?`${a.successes??'—'} / ${num(a.episodes)}`:'—'}</td>${suiteCols?suites.map(s=>{const z=runScore(r,s);return `<td class="suite-col suite-score ${$('#suite').value===s?'selected-column':''}">${z.rate===null?'—':scoreText(z.rate)}</td>`;}).join(''):''}<td class="status-col"><span class="status ${r.status==='complete'?'complete':'pending'}">${combined?`${r.completedSeeds.length} / 3 种子`:esc(statusLabel(r))}</span><button class="row-detail" data-run="${esc(r.id)}">证据 ↗</button></td></tr>`;
 }).join('')||'<tr><td colspan="10">没有符合筛选条件的组合。</td></tr>'}</tbody></table></div><div class="table-caption"><span>分类表头可直接切换分榜；点击编码器查看种子与逐任务证据。</span><span>比较序为当前范围内的开发排序；— 表示覆盖未齐</span></div>`;
}
function mediaPreview(task,index){
 const m=task.media?.find(x=>x.videoUrl&&x.runId)||task.media?.find(x=>x.videoUrl)||task.media?.find(x=>x.type==='video');
 if(m)return videoEmbed({...m,url:m.videoUrl||m.url,kind:'local_diagnostic'},'gallery');
 return '<div class="video-unavailable"><span class="film-icon">▷</span><strong>尚无已核验执行视频</strong></div>';
}
function renderTasks(){
 const tasks=visibleTasks();if(!tasks.length){$('#content').innerHTML=empty('暂无符合条件的本站视频','官方任务介绍与视频可在总览中查看。');return;}
 $('#content').innerHTML=`<div class="gallery-intro"><div><span class="eyebrow">RECORDED ROLLOUTS</span><h2>看见动作发生的过程。</h2></div><p>${tasks.length} 个任务。保留原始视频、模型与来源；历史诊断不代表当前模型的平均表现。</p></div><div class="task-grid">${tasks.map((task,i)=>{const gt=(guideLibrary.benchmarks[benchmarkId]?.tasks||[]).find(x=>x.localTaskId===task.id);return `<article class="task-card"><div class="task-visual">${mediaPreview(task,i)}</div><div class="task-info"><div class="task-suite">${esc(suiteName(task.suite))} / ${esc(task.id)}</div><h2 class="task-title"><button class="link-button" data-task="${esc(task.id)}">${esc(gt?.title||task.instruction||task.name.replaceAll('_',' '))}</button></h2><p class="gallery-objective">${esc(gt?.objective||task.instruction)}</p><div class="task-bottom"><span>原始回合 · 1× 播放</span><button data-task="${esc(task.id)}">任务与证据 ↗</button></div></div></article>`;}).join('')}</div>`;initVideos();
}
function protocol(){const t=track(),b=bench();if(b.id!=='libero'&&!t?.proRows)return `<div class="protocol-grid"><article class="protocol-block"><h2>${esc(b.name)} · 本站协议</h2><p>${esc(b.description)}</p><p>${esc(t?.rankingNote||'尚未接入实测；参见 Benchmark 解读中的官方范围。')}</p><dl><dt>当前记录</dt><dd>${esc(t?.label||'暂无评估')}</dd><dt>训练种子</dt><dd>${esc(t?.trainingSeeds?.join(' / ')||'尚未登记')}</dd><dt>每任务回合数</dt><dd>${esc(t?.targetEpisodesPerTask||'—')}</dd></dl></article><article class="protocol-block"><h2>结果边界</h2><p>${esc(benchmarkMeta(b.id).caveat||'诊断与参照基线不混入 MVE 原生编码器排名。')}</p><button class="text-action" data-view="guide">查看这个 benchmark 的测试目标 →</button></article></div>`;if(t?.proRows)return proNotice()+`<div class="protocol-grid"><article class="protocol-block"><h2>Same frozen policy.</h2><p>40任务共同训练，保留原生视觉tokens，完整batch32、FP32、20,000步。每个动作模型独立冻结，同一训练种子的不同扰动复用同一checkpoint。</p><p>每模型、每任务20个评估种子各1次；每格需三个训练种子17 / 29 / 43各800回合，分类各200回合。技术canary不计分。</p></article><article class="protocol-block"><h2>Separate perturbations.</h2><p>Object、Language、Swap、Task是扰动维度；Spatial、Object、Goal、Long-horizon是原始任务分类，可通过任务集筛选独立查看。</p><p>Environment官方资产缺失，因此不显示全PRO总分。不把非配对初态解释成纯因果增益；历史单回合诊断与当前多任务结果分开。</p></article></div>`;return `<div class="protocol-grid"><article class="protocol-block"><h2>One protocol. Fair comparison.</h2><dl><dt>Benchmark</dt><dd>${esc(b.name)}</dd><dt>当前版本</dt><dd>${esc(t?.label||'尚无评估')}</dd><dt>独立训练种子</dt><dd>${esc(t?.trainingSeeds?.join(', ')||'—')} · 目标 17 / 29 / 43</dd><dt>每模型、每任务目标</dt><dd>${t?.targetEpisodesPerTask||'—'} 回合</dd><dt>证据更新时间</dt><dd>${esc(data.updatedAt)}</dd></dl></article><article class="protocol-block"><h2>Read the evidence.</h2>${t?.id==='native-20x1'?'<p>Joint40多任务共同训练，冻结视觉编码器并保留原生空间tokens；动作策略涵盖 ACT（7层解码器）、DP-U-Net、DP-DiT、BCViLT、Flow-DiT，均使用完整 batch32、FP32 训练 20,000 步。组合榜按各自冻结版本独立汇总；编码器综合榜在完整、相同的策略集合内等权平均。</p><p>每个训练seed模型、每任务20个评估种子，每种子1回合，分别使用20个不同官方初态；每个训练种子需完整800回合；主榜将17 / 29 / 43的成功率等权平均，合计2400回合。Spatial、Object、Goal、Long-horizon各含10任务，各分类在三个种子均收齐200回合后显示均值。未完整的组合保留进度，不与历史P1或20×3合并，仍为开发比较。</p>':'<p>当前LIBERO为Joint40共同训练，冻结视觉编码器，比较DP与ACT。P1为开发校准；排行榜仅在相同协议和完整覆盖内排序。</p><p>历史扩展评估为每个训练模型、每任务20个评估种子，每种子3回合。官方每任务50个唯一初态，60回合包含10次跨评估种子的初态复用；它们不是60个独立物理场景。</p>'}<p>Plus／PRO的少量诊断与基础LIBERO分开，不混合成鲁棒性排名。未完成结果不会填0，也不会被计为失败。</p><p>视频是有明确来源的执行记录，可能来自专家重放或早期诊断。素材标签与当前表格成绩相互独立；选中的视频不代表平均表现。</p></article></div>`;}
function openRun(id){const r=displayRuns().find(x=>x.id===id)||track().runs.find(x=>x.id===id);if(!r)return;if(isCombination(r)){openCombination(r);return;}$('#detail-eyebrow').textContent=`MODEL DETAIL / ${track().label}`;const tr=new Map((r.taskResults||[]).map(x=>[x.taskId,x]));$('#detail-body').innerHTML=`<h2 class="model-title">${encoderLabel(r)} ${badge(r.head)}</h2><p class="detail-instruction">${esc(statusLabel(r))}${r.server?` · ${esc(r.server)}`:''} · 训练种子 ${r.trainingSeed??track().trainingSeeds.join(' / ')}</p><div class="detail-stat">${pct(r.successes,r.episodes)}<small>${r.successes??'—'} / ${num(r.episodes)} 有效回合</small></div>${!r.rankingEligible?`<div class="notice">${track().id==='native-20x1'?(r.status==='complete'?'已完成800回合的单训练种子开发评估；主榜按三个训练种子等权汇总。':'模型覆盖未齐，仅展示已核验进度，不计算总体成功率。'):'覆盖未齐，不用于正式排名或跨覆盖比较。'}</div>`:''}<h3>逐任务成功 / 有效回合</h3><div class="heatmap">${bench().tasks.map((task,i)=>{const a=tr.get(task.id),n=a?.episodes||0,f=n&&typeof a.successes==='number'?a.successes/n:null;return `<button data-task="${esc(task.id)}" style="background:${f===null?'#f1f2ed':f===0?'#f1e7e1':f===1?'#bbd1b8':'#dde7d6'}" title="${esc(task.instruction)}">${String(i+1).padStart(2,'0')}<small>${f!==null?`${a.successes}/${n}`:n?`${n}/${a.expectedEpisodes||'—'} 回合`:'—'}</small></button>`;}).join('')}</div>${r.groups?.length?`<h3>已审计评估种子组</h3><div class="table-wrap"><table><thead><tr><th>评估种子</th><th>有效 / 目标</th><th>组内成功数</th></tr></thead><tbody>${r.groups.map(g=>`<tr><td>${g.rootSeed}</td><td>${g.episodes} / ${g.expectedEpisodes}</td><td>${g.successes??'尚未收齐'}</td></tr>`).join('')}</tbody></table></div>`:''}<p class="dialog-note">${track().id==='native-20x1'?'每任务收齐20回合才显示该任务成功数；未收齐的格子只显示回合进度。历史素材按标签展示，不代表原生模型执行。':'点击格子查看任务、视频与模型对比。空白格表示未评估；成功数为0表示已评估但未成功。'}</p>`;showDialog();}
const policyName=h=>({'act':'ACT','dp':'DP-U-Net','dp-dit':'DP-DiT','flow':'Flow-DiT','bcvilt':'BCViLT'}[String(h).toLowerCase()]||String(h));
const encoderScore=(r,suite=$('#suite').value)=>suite==='all'?r:r.suiteResults.find(s=>s.suite===suite)||{successRate:null,completedPolicies:[]};

function renderEncoderBoard(){
 const board=track()?.encoderBoard;
 if(!board?.rows.length){$('#content').innerHTML=empty('当前版本尚无编码器综合成绩','需要相同 benchmark、协议和策略集合下的完整三训练种子。');return;}
 const q=$('#search').value.trim().toLowerCase(),suites=suiteOrder.filter(s=>bench().tasks.some(t=>t.suite===s)),h=$('#head').value;
 const rows=board.rows.filter(r=>!q||`${r.encoder} ${r.encoderLabel}`.toLowerCase().includes(q)).sort((a,b)=>compareRates(encoderViewScore(a).successRate,encoderViewScore(b).successRate)||a.encoder.localeCompare(b.encoder));
 $('#content').innerHTML=methodNote(h==='all'?`${board.policyHeads.length} 种动作策略等权平均`:`${policyName(h)} · 三训练种子均值`,`${board.method} 当前完整策略集合：${board.policyHeads.map(policyName).join(' / ')}。${board.missingNote} ${board.revisionNote} 策略分榜仅使用该策略的三种子均值；综合榜需要全策略覆盖。`)+boardHeading(h==='all'?'视觉编码器综合榜':`视觉编码器 · ${policyName(h)}`,`${rows.length} 个编码器`,`${currentScope()} · ${h==='all'?'相同五策略集合，等权比较':'固定动作策略，比较视觉表征'}`)+`<div class="table-wrap" tabindex="0" role="region" aria-label="视觉编码器分榜"><table class="benchmark-table encoder-table" data-breakdown="${encoderBreakdown}"><thead><tr><th>比较序</th><th>视觉编码器 / 发布</th><th><button class="sort-button" id="sort">${h==='all'?'策略平均':policyName(h)} ${ascending?'↑':'↓'}</button><small class="column-note">${esc(currentScope())}</small></th>${board.policyHeads.map(h=>`<th class="policy-col"><button data-policy="${h.toUpperCase()}" class="column-filter ${$('#head').value===h.toUpperCase()?'active':''}">${esc(policyName(h))}${$('#head').value===h.toUpperCase()?' ↓':''}</button></th>`).join('')}${categoryHeaders(suites)}<th class="status-col">覆盖</th></tr></thead><tbody>${rows.map(r=>{
 const z=encoderViewScore(r),rank=comparisonRank(z.successRate,board.rows,x=>encoderViewScore(x).successRate);
 return `<tr data-encoder-id="${esc(r.encoder)}"><td class="rank ${rank===1?'first':''}">${rank===null?'—':String(rank).padStart(2,'0')}</td><td><button class="link-button encoder" data-encoder-detail="${esc(r.id)}">${encoderLabel(r)}</button><div class="encoder-byline"><span>${esc(publication(encoderMeta(r.encoder)))}</span>${projectLink(r.encoder)}</div></td><td>${scoreHTML(null,0,z.successRate)}</td>${r.policies.map(p=>{const c=track().combinations.find(c=>c.id===p.combinationId),rate=c?runScore(c).rate:null;return `<td class="policy-col">${c?`<button class="link-button" data-run="${esc(c.id)}">${scoreText(rate)} ↗</button>`:'—'}</td>`;}).join('')}${suites.map(s=>`<td class="suite-col suite-score ${$('#suite').value===s?'selected-column':''}">${scoreText(encoderViewScore(r,s).successRate)}</td>`).join('')}<td class="status-col"><span class="status ${z.successRate===null?'pending':'complete'}">${h==='all'?`${z.completedPolicies.length} / ${board.policyHeads.length} 策略`:z.successRate===null?'覆盖未齐':'3 / 3 种子'}</span></td></tr>`;
 }).join('')||'<tr><td colspan="12">没有匹配的编码器。</td></tr>'}</tbody></table></div><div class="table-caption"><span>点击策略表头切换单策略榜；分类表头切换分类榜。</span><span>${h==='all'?'相同策略集合等权平均':'当前为单策略三种子均值'} · 缺项不填 0</span></div>`;
}
function proScore(cell,suite=$('#suite').value){return suite==='all'?cell:cell.suiteResults.find(x=>x.suite===suite);}

function proNotice(){return methodNote('四类扰动分别计分 · 三训练种子等权均值 · 无全 PRO 总分','每格为训练种子 17 / 29 / 43 等权均值：40 个任务，每模型、每任务 20 个评估种子各 1 次；完整覆盖 2,400 回合后显示。点击分数查看种子与 Spatial / Object / Goal / Long-horizon 分类。未完成项显示 —。当前为开发比较；Environment 资产尚未齐全，四类扰动不合成全 PRO 总分。原始与变体初态不作纯因果配对解释。');}
function renderProBoard(){
 const t=track();if(!t?.proRows?.length){$('#content').innerHTML=empty('当前版本没有完整 PRO 多任务成绩','历史单例诊断保留在评估版本中。');return;}
 const h=$('#head').value,q=$('#search').value.trim().toLowerCase(),universe=t.proRows.filter(r=>h==='all'||r.head.toUpperCase()===h),rows=universe.filter(r=>!q||`${r.encoder} ${r.encoderLabel} ${r.policyLabel}`.toLowerCase().includes(q)).sort((a,b)=>compareRates(proSelectedScore(a),proSelectedScore(b))||a.encoder.localeCompare(b.encoder));
 $('#content').innerHTML=proNotice()+boardHeading('扰动鲁棒性分榜',`${rows.length} 个组合`,`${rows[0]?.cells.find(c=>c.track===proPerturbation)?.label||proPerturbation} 扰动排序 · ${currentScope()}`)+`<div class="table-wrap" tabindex="0" role="region" aria-label="PRO 扰动分榜"><table class="benchmark-table pro-table"><thead><tr><th>比较序</th><th>视觉编码器 / 发布</th><th class="action-cell">动作策略</th>${t.proRows[0].cells.map(p=>`<th class="${p.track===proPerturbation?'selected-column':''}" aria-sort="${p.track===proPerturbation?(ascending?'ascending':'descending'):'none'}"><button data-perturbation="${esc(p.track)}" class="column-filter">${esc(p.label)} ${p.track===proPerturbation?'↓':''}</button><small class="column-note">${esc(currentScope())} · 三种子</small></th>`).join('')}</tr></thead><tbody>${rows.map(r=>{const rank=comparisonRank(proSelectedScore(r),universe,proSelectedScore);return `<tr data-pro-row="${esc(r.id)}"><td class="rank ${rank===1?'first':''}">${rank===null?'—':String(rank).padStart(2,'0')}</td><td>${encoderLabel(r)}<div class="encoder-byline"><span>${esc(publication(encoderMeta(r.encoder)))}</span>${projectLink(r.encoder)}</div></td><td class="action-cell">${badge(r.head)}</td>${r.cells.map(c=>{const z=proScore(c);return `<td data-pro-track="${esc(c.track)}" class="${c.track===proPerturbation?'selected-column':''}"><button class="pro-cell" data-pro-detail="${esc(r.id)}" data-pro-key="${esc(c.track)}" aria-label="查看 ${esc(r.encoderLabel)} ${esc(c.label)} 证据"><strong>${scoreText(z.successRate)}</strong><span>${c.completedSeeds.length} / 3 种子 · ${z.successes??'—'} / ${num(z.episodes)} 回合 ↗</span></button></td>`;}).join('')}</tr>`;}).join('')||'<tr><td colspan="7">没有符合筛选条件的组合。</td></tr>'}</tbody></table></div><div class="table-caption"><span>点击扰动列标题重新排序；上方任务分类独立筛选。</span><span>四类扰动不合成 PRO 总分 · Environment 资产尚未齐全</span></div>`;
}
function openProCell(id,key){
  const r=track().proRows.find(r=>r.id===id),c=r?.cells.find(c=>c.track===key);if(!c)return;
  const actual=new Map(c.models.map(m=>[m.trainingSeed,m]));
  $('#detail-eyebrow').textContent=`LIBERO-PRO / ${c.label} · 原生 20×1`;
  $('#detail-body').innerHTML=`<h2 class="model-title">${encoderLabel(r)} ${badge(r.policyLabel)}</h2><p class="detail-instruction">${esc(c.label)} 扰动 · ${c.completedSeeds.length} / 3 训练种子完成 · 当前为开发比较</p><div class="detail-stat">${c.successRate===null?'—':`${(100*c.successRate).toFixed(2)}%`}<small>${c.successes??'—'} / ${num(c.episodes)} 有效回合 · 目标 2,400</small></div><h3>原始任务分类的成功率</h3><div class="suite-summary">${c.suiteResults.map(s=>`<div><span>${esc(suiteName(s.suite))}</span><strong>${s.successRate===null?'—':`${(100*s.successRate).toFixed(2)}%`}</strong><small>${s.successes??'—'} / ${num(s.episodes)} · 目标 600</small></div>`).join('')}</div><h3>三个训练种子</h3><div class="table-wrap"><table class="seed-table"><thead><tr><th>训练种子</th><th>成功率</th><th>成功 / 有效</th><th>评估状态</th></tr></thead><tbody>${[17,29,43].map(seed=>{const m=actual.get(seed);return `<tr data-pro-seed="${seed}"><td>${seed}</td><td>${m?`${(100*m.successRate).toFixed(2)}%`:'—'}</td><td>${m?`${m.successes} / ${num(m.episodes)}`:'—'}</td><td>${m?'完整 · 严格审计通过':'尚无完整审计结果'}</td></tr>`;}).join('')}</tbody></table></div><p class="dialog-note">均值 = (seed17成功率 + seed29成功率 + seed43成功率) / 3。分类需各600回合完整覆盖；缺失保留为空。Object 扰动与原始 Object 任务集是两个不同维度。</p><details class="pro-proof"><summary>冻结模型与审计身份</summary>${c.models.map(m=>`<p>Seed ${m.trainingSeed}<br>Checkpoint SHA256 <code>${esc(m.checkpointSha256)}</code><br>审计 ${esc(m.auditEvidence.id)}<br>审计 SHA256 <code>${esc(m.auditEvidence.sha256)}</code></p>`).join('')||'<p>尚无完整模型审计。</p>'}</details>`;
  showDialog();
}

function updateRoute(){
 const hash=new URLSearchParams({b:benchmarkId,view,suite:$('#suite').value,policy:$('#head').value});
 if(view==='guide'){if(guideTaskId)hash.set('gtask',guideTaskId);if(guideCategory!=='all')hash.set('gcat',guideCategory);}
 if(trackId)hash.set('version',trackId);if(track()?.proRows)hash.set('perturbation',proPerturbation);if(view==='taskboard')hash.set('task',$('#task-scope').value);
 history.replaceState(null,'',location.pathname+location.search+'#'+hash.toString());
}
function restoreRoute(){
 const raw=location.hash.slice(1);
 if(raw.includes('=')){const h=new URLSearchParams(raw);benchmarkId=data.benchmarks.some(b=>b.id===h.get('b'))?h.get('b'):'libero';trackId=h.get('version')||bench().tracks.find(t=>t.combinations||t.proRows)?.id||bench().tracks[0]?.id;view=['leaderboard','encoders','mountains','pro','tasks','taskboard','guide','atlas','protocol','log'].includes(h.get('view'))?h.get('view'):'leaderboard';proPerturbation=h.get('perturbation')||'Object';guideTaskId=h.get('gtask')||'';guideCategory=h.get('gcat')||'all';guideQuery='';guidePage=0;const gi=matchingGuideTasks().findIndex(t=>t.id===guideTaskId);if(gi>=0)guidePage=Math.floor(gi/guidePageSize);render();for(const [id,key] of [['suite','suite'],['head','policy']])if([...$('#'+id).options].some(o=>o.value===h.get(key)))$('#'+id).value=h.get(key);renderContent();if(h.get('task')&&[...$('#task-scope').options].some(o=>o.value===h.get('task'))){$('#task-scope').value=h.get('task');renderContent();}}
 else {view=['pro','encoders','mountains','tasks','taskboard','guide','atlas','protocol','log'].includes(raw)?raw:'guide';benchmarkId=view==='pro'?'libero-pro':'libero';trackId=view==='pro'?'pro-native-20x1':'native-20x1';render();}
}
function selectBenchmark(id,nextView){
 benchmarkId=id;trackId=bench().tracks.find(t=>t.combinations||t.proRows)?.id||bench().tracks[0]?.id;view=nextView||'guide';ascending=false;guideCategory='all';guideQuery='';guideTaskId='';guidePage=0;
 $('#head').value='all';$('#suite').value='all';$('#search').value='';render();updateRoute();window.scrollTo(0,0);
}
function selectView(value){
 if(value==='pro'&&benchmarkId!=='libero-pro'){selectBenchmark('libero-pro','pro');return;}
 view=value;render();updateRoute();window.scrollTo(0,0);
}
function openEncoder(id){
  const board=track().encoderBoard,r=board.rows.find(r=>r.id===id);if(!r)return;
  $('#detail-eyebrow').textContent='VISUAL ENCODER / 跨动作策略';
  $('#detail-body').innerHTML=`<h2 class="model-title">${encoderLabel(r)}</h2><p class="detail-instruction">${esc(board.method)}</p><div class="detail-stat">${r.successRate===null?'—':`${(r.successRate*100).toFixed(1)}%`}<small>${r.completedPolicies.length} / ${board.policyHeads.length} 策略完整</small></div><div class="table-wrap"><table><thead><tr><th>动作策略 / 冻结版本</th><th>三种子均值</th><th>种子覆盖</th><th></th></tr></thead><tbody>${r.policies.map(p=>`<tr><td>${esc(p.label)}</td><td>${p.successRate===null?'—':`${(p.successRate*100).toFixed(1)}%`}</td><td>${p.completedSeeds.length} / 3</td><td>${p.combinationId?`<button class="link-button" data-run="${esc(p.combinationId)}">种子与任务详情 ↗</button>`:'待评估'}</td></tr>`).join('')}</tbody></table></div><p class="dialog-note">${esc(board.missingNote)} ${r.excludedCombinationIds.length?esc(board.revisionNote):''}不把不同动作策略当作独立训练种子；当前为开发比较。</p>`;
  showDialog();
}
function openCombination(r){
  $('#detail-eyebrow').textContent=`COMBINATION DETAIL / ${track().label}`;
  const actual=new Map(track().runs.filter(x=>r.runIds.includes(x.id)).map(x=>[x.trainingSeed,x])),tr=new Map(r.taskResults.map(x=>[x.taskId,x]));
  $('#detail-body').innerHTML=`<h2 class="model-title">${encoderLabel(r)} ${badge(r.head)}</h2><p class="detail-instruction">${r.completedSeeds.length} / 3 训练种子完成 · 17 / 29 / 43 等权平均</p><div class="detail-stat">${r.successRate===null?'—':`${(100*r.successRate).toFixed(1)}%`}<small>${r.successes??'—'} / ${num(r.episodes)} 有效回合 · 目标2,400</small></div><div class="notice">${r.status==='complete'?'三个训练种子均完成。下面保留各种子成绩，便于比较波动。':'总体覆盖未齐，暂不计算三种子总体均值。每一类独立检查覆盖，收齐三个种子后显示分类均值。'}</div><h3>分类平均成功率</h3><div class="suite-summary">${r.suiteResults.map(a=>`<div><span>${esc(suiteName(a.suite))}</span><strong>${a.successRate===null?'—':`${(100*a.successRate).toFixed(1)}%`}</strong><small>${a.successes??'—'} / ${num(a.episodes)} · 目标600</small></div>`).join('')}</div><h3>三个训练种子</h3><div class="table-wrap"><table class="seed-table"><thead><tr><th>训练种子</th><th>成功率</th><th>成功 / 有效</th><th>状态</th><th></th></tr></thead><tbody>${r.trainingSeeds.map(seed=>{const x=actual.get(seed);return `<tr data-training-seed="${seed}"><td>${seed}</td><td>${x?pct(x.successes,x.episodes):'—'}</td><td>${x?`${x.successes??'—'} / ${num(x.episodes)}`:'—'}</td><td>${x?esc(statusLabel(x)):'尚无已核验模型'}</td><td>${x?`<button class="link-button" data-run="${esc(x.id)}">逐任务详情 ↗</button>`:''}</td></tr>`;}).join('')}</tbody></table></div><h3>逐任务三种子汇总</h3><div class="heatmap">${bench().tasks.map((task,i)=>{const a=tr.get(task.id),f=a?.successRate??null;return `<button data-task="${esc(task.id)}" style="background:${f===null?'#f1f2ed':f===0?'#f1e7e1':f===1?'#bbd1b8':'#dde7d6'}" title="${esc(task.instruction)}">${String(i+1).padStart(2,'0')}<small>${f!==null?`${a.successes}/60`:`${a?.episodes||0}/60 回合`}</small></button>`;}).join('')}</div><p class="dialog-note">均值 = (seed17成功率 + seed29成功率 + seed43成功率) / 3。每种子、每任务20个评估种子各1回合。缺失数据不计0，不用已完成种子的均值代替三种子结果。</p>`;
  showDialog();
}
function openTask(id){const task=bench().tasks.find(x=>x.id===id);if(!task)return;$('#detail-eyebrow').textContent=`TASK DETAIL / ${suiteName(task.suite)}`;const t=track(),rs=displayRuns().filter(r=>$('#head').value==='all'||r.head?.toUpperCase()===$('#head').value).map(r=>({r,a:r.taskResults?.find(x=>x.taskId===id)})).filter(x=>x.a?.episodes>0).sort((x,y)=>(typeof y.a.successes==='number'?y.a.successes/y.a.episodes:-1)-(typeof x.a.successes==='number'?x.a.successes/x.a.episodes:-1));const m=task.media?.find(x=>x.videoUrl&&x.runId)||task.media?.find(x=>x.videoUrl)||task.media?.find(x=>x.type==='video')||task.media?.[0];const v=m?.videoUrl||(m?.type==='video'?m.url:null);$('#detail-body').innerHTML=`<h2>${esc(task.instruction||task.name.replaceAll('_',' '))}</h2><p class="detail-instruction">${esc(task.id)} · ${esc(task.name)}</p>${v?`<video controls playsinline preload="metadata" ${m.posterUrl?`poster="${esc(safeUrl(m.posterUrl))}"`:''} src="${esc(safeUrl(v))}"></video>`:m?`<div class="task-visual" style="height:300px">${mediaPreview(task,0)}</div>`:'<div class="notice">该任务尚未收录执行视频；下面保留真实评估数据。</div>'}${m?`<p class="media-caption">${esc(m.label)} · ${esc(typeof m.condition==='object'?JSON.stringify(m.condition):m.condition||'')} ${esc(m.previewLabel||m.playbackNote||m.note||'')}</p>`:''}<h3>该任务的模型表现</h3><p class="dialog-note">${esc(t?.label||'暂无评估')} ${t?.id==='native-20x1'?'· 每任务汇总三个训练种子各20回合，收齐60回合才显示均值':!t?.ranked?'· 覆盖可能不同，只作诊断':''}</p><div class="table-wrap"><table><thead><tr><th>编码器</th><th>动作模型</th><th>成功率</th><th>成功 / 有效</th></tr></thead><tbody>${rs.map(({r,a})=>`<tr><td><button class="link-button" data-run="${esc(r.id)}">${encoderLabel(r)}</button></td><td>${badge(r.head)}</td><td>${pct(a.successes,a.episodes)}</td><td class="sample">${a.successes??'—'} / ${a.episodes}</td></tr>`).join('')||'<tr><td colspan="4">当前版本没有该任务的逐回合结果。</td></tr>'}</tbody></table></div>`;showDialog();}
function experimentLog(){
  const entries=[...(data.experimentLog||[])].sort((a,b)=>(Date.parse(b.at)||0)-(Date.parse(a.at)||0));
  const types={evaluation:'评估记录',protocol:'协议更新',correction:'证据勘误',release:'版本发布'};
  const commits=data.repository?.recentCommits||[];
  return `<div class="log-intro"><div><h2>实验进展与证据</h2><p>${entries.length} 条已登记记录 · 数据快照 ${esc(logDate(data.updatedAt))}</p></div><span class="log-scope">所有 benchmark</span></div>
    <div class="log-layout"><section aria-label="实验记录">${entries.length?`<ol class="experiment-log">${entries.map(entry=>`<li id="log-${esc(entry.id)}"><article class="log-entry"><div class="log-meta"><time datetime="${esc(entry.at||'')}">${esc(logDate(entry.at))}</time><span class="log-type ${Object.hasOwn(types,entry.type)?esc(entry.type):'evaluation'}">${esc(types[entry.type]||entry.type||types.evaluation)}</span></div><h3>${esc(entry.title)}</h3><p class="log-summary">${esc(entry.summary)}</p>${String(entry.summary||'').length>130?`<button class="log-expand" data-log-toggle aria-expanded="false">展开完整记录 ⌄</button>`:''}<div class="log-evidence"><span>证据 · ${esc(entry.evidenceLabel||'尚未提供证据标签')}</span>${entry.commitUrl&&safeUrl(entry.commitUrl)!=='#'?`<a href="${esc(safeUrl(entry.commitUrl))}" target="_blank" rel="noopener">关联提交 ↗</a>`:'<span class="unlinked">未关联提交</span>'}</div></article></li>`).join('')}</ol>`:'<div class="empty-state"><h2>实验日志尚未收录</h2><p>后续记录将在核验后随数据快照发布。</p></div>'}</section>
    <aside class="commit-panel" aria-label="GitHub 代码提交"><h2>GitHub 提交</h2><p>实际代码历史，和左侧实验记录分别列示。${data.repository?.isPrivate!==false?'仓库为私有，访问需要相应权限。':''}</p>${commits.length?`<ol class="commit-list">${commits.map(commit=>`<li><time datetime="${esc(commit.at||'')}">${esc(logDate(commit.at))}</time><div>${commit.url&&safeUrl(commit.url)!=='#'?`<a href="${esc(safeUrl(commit.url))}" target="_blank" rel="noopener">${esc(commit.title)} ↗</a>`:esc(commit.title)}</div><code>${esc(String(commit.sha||'').slice(0,12))}</code></li>`).join('')}</ol>`:'<p class="commit-empty">当前快照尚未收录提交记录。</p>'}${data.repository?.commitsUrl?`<a class="all-commits" href="${esc(safeUrl(data.repository.commitsUrl))}" target="_blank" rel="noopener">查看完整提交历史 ↗</a>`:''}</aside></div>`;
}
function showDialog(){document.querySelectorAll('video').forEach(v=>v.pause());initVideos();const title=$('#detail-body h2');if(title)title.id='detail-title';if(!$('#detail').open)$('#detail').showModal();$('#detail').scrollTop=0;}
function stopGifs(){document.querySelectorAll('[data-gif][aria-pressed="true"]').forEach(b=>{const p=b.closest('.task-visual');const im=p.querySelector('img');if(im){if(b.dataset.poster)im.src=b.dataset.poster;else im.remove();}b.setAttribute('aria-pressed','false');b.textContent='▶ 播放 GIF';});}
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-benchmark]');if(b){selectBenchmark(b.dataset.benchmark);return;}
 const guide=e.target.closest('[data-guide]');if(guide){selectBenchmark(guide.dataset.guide,'guide');return;}
 const gc=e.target.closest('[data-guide-category]');if(gc){view='leaderboard';$('#suite').value=gc.dataset.guideCategory;render();updateRoute();window.scrollTo(0,0);return;}
 const category=e.target.closest('[data-category]');if(category){$('#suite').value=category.dataset.category;ascending=false;renderContent();updateRoute();$('#category-tabs [data-category="'+$('#suite').value+'"]').focus({preventScroll:true});return;}
 const policy=e.target.closest('[data-policy]');if(policy){$('#head').value=policy.dataset.policy;ascending=false;renderContent();updateRoute();$('#head').focus({preventScroll:true});return;}
 const perturbation=e.target.closest('[data-perturbation]');if(perturbation){proPerturbation=perturbation.dataset.perturbation;ascending=false;renderContent();updateRoute();$('#perturbation-tabs [data-perturbation="'+proPerturbation+'"]').focus({preventScroll:true});return;}
 const logToggle=e.target.closest('[data-log-toggle]');if(logToggle){const expanded=logToggle.getAttribute('aria-expanded')!=='true';logToggle.setAttribute('aria-expanded',String(expanded));logToggle.closest('.log-entry').querySelector('.log-summary').classList.toggle('expanded',expanded);logToggle.textContent=expanded?'收起记录 ⌃':'展开完整记录 ⌄';return;}
 const breakdown=e.target.closest('button[data-breakdown]');if(breakdown){encoderBreakdown=breakdown.dataset.breakdown;renderContent();$(`button[data-breakdown="${encoderBreakdown}"]`).focus({preventScroll:true});return;}
 const tab=e.target.closest('[data-view]');if(tab){selectView(tab.dataset.view);return;}
 const pro=e.target.closest('[data-pro-detail]');if(pro){openProCell(pro.dataset.proDetail,pro.dataset.proKey);return;}
 const enc=e.target.closest('[data-encoder-detail]');if(enc){openEncoder(enc.dataset.encoderDetail);return;}
 const task=e.target.closest('[data-task]');if(task){openTask(task.dataset.task);return;}
 const run=e.target.closest('[data-run]');if(run){openRun(run.dataset.run);return;}
 const gif=e.target.closest('[data-gif]');if(gif){const was=gif.getAttribute('aria-pressed')==='true';stopGifs();if(!was){let im=gif.closest('.task-visual').querySelector('img');if(!im){im=document.createElement('img');im.alt='真实执行GIF';gif.closest('.task-visual').prepend(im);}im.src=safeUrl(gif.dataset.gif);gif.setAttribute('aria-pressed','true');gif.textContent='Ⅱ 暂停';}return;}
 if(e.target.closest('#sort')){ascending=!ascending;renderContent();$('#sort')?.focus({preventScroll:true});}
});
$('#track').addEventListener('change',e=>{trackId=e.target.value;if(['pro','encoders','taskboard','mountains'].includes(view))view=track()?.proRows?'pro':'leaderboard';render();updateRoute();});
for(const id of ['head','suite','task-scope'])$('#'+id).addEventListener('change',()=>{ascending=false;renderContent();updateRoute();});
$('#search').addEventListener('input',renderContent);
$('#reset-filters').onclick=()=>{$('#head').value='all';$('#suite').value='all';$('#search').value='';ascending=false;renderContent();updateRoute();};
$('#close-detail').onclick=()=>$('#detail').close();
$('#detail').addEventListener('close',()=>{stopGifs();$('#detail-body').querySelectorAll('video').forEach(v=>v.pause());});
$('#detail').addEventListener('click',e=>{if(e.target===$('#detail'))$('#detail').close();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){stopGifs();document.querySelectorAll('video').forEach(v=>v.pause());}});
const observer=new IntersectionObserver(es=>es.forEach(e=>{if(!e.isIntersecting&&e.target.getAttribute('aria-pressed')==='true')stopGifs();}));
window.addEventListener('hashchange',()=>{if(data)restoreRoute();});
async function load(){
 const button=$('#refresh');button.disabled=true;
 try{const responses=await Promise.all([fetch('data/data.json',{cache:'no-store'}),fetch('data/catalog.json',{cache:'no-store'}),fetch('data/guide-core.json',{cache:'no-store'}),fetch('data/guide-next.json',{cache:'no-store'})]);if(!responses[0].ok)throw new Error(`数据读取失败 ${responses[0].status}`);data=await responses[0].json();if(responses[1].ok)catalog=await responses[1].json();for(const r of responses.slice(2)){if(r.ok){const g=await r.json();Object.assign(guideLibrary.benchmarks,g.benchmarks||{});}}if(!data.benchmarks?.length)throw new Error('没有可读取的 benchmark 数据');$('#update-time').textContent=`${String(data.updatedAt).replace('T',' ').slice(0,16)} UTC`;$('#update-time').dateTime=data.updatedAt;$('#load-error').hidden=true;restoreRoute();}
 catch(e){$('#load-error').hidden=false;$('#load-error').textContent=`暂时无法读取结果：${e.message}。请点击刷新重试。`;}
 finally{button.disabled=false;}
}
$('#refresh').onclick=load;
load();
