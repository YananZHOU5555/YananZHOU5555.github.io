/* Editorial metadata stays separate from audited experimental results. */
const suiteOrder=['libero_spatial','libero_object','libero_goal','libero_10'];
const suiteDescriptions={libero_spatial:'空间关系与放置位置',libero_object:'目标物体的辨识与操作',libero_goal:'相同场景中的不同任务目标',libero_10:'多步骤、长时序任务'};
const encoderMeta=id=>catalog?.encoders?.[id]||{};
const benchmarkMeta=id=>catalog?.benchmarks?.[id]||{};
const scoreText=rate=>Number.isFinite(rate)?`${(rate*100).toFixed(2)}%`:'—';
const currentScope=()=>$('#suite').value==='all'?'全部任务':suiteName($('#suite').value);
const dateText=m=>m.publicationDate?m.publicationDate.replaceAll('-','.'):'日期待核验';
const publication=m=>`${m.publicationLabel||'首次公开'} · ${dateText(m)}`;
const projectLink=(id,label='项目 ↗')=>{const m=encoderMeta(id);return m.projectUrl?`<a class="project-link" href="${esc(safeUrl(m.projectUrl))}" target="_blank" rel="noopener" title="${esc(publication(m))}">${esc(label)}</a>`:'';};
function comparisonRank(rate,rows,score){return Number.isFinite(rate)?1+rows.filter(r=>Number.isFinite(score(r))&&score(r)>rate).length:null;}
function compareRates(a,b){if(!Number.isFinite(a)||!Number.isFinite(b))return Number.isFinite(a)?-1:Number.isFinite(b)?1:0;return (ascending?1:-1)*(a-b);}
function categoryButton(s,label=suiteName(s)){
 const active=$('#suite').value===s;
 return `<button data-category="${esc(s)}" class="${active?'active':''}" aria-pressed="${active}" title="${esc(suiteDescriptions[s]||'全部任务的平均成功率')}">${esc(label)}${active?`<span class="scope-arrow">${ascending?'↑':'↓'}</span>`:''}</button>`;
}
function categoryHeaders(suites){return suites.map(s=>`<th class="suite-col ${$('#suite').value===s?'selected-column':''}" aria-sort="${$('#suite').value===s?(ascending?'ascending':'descending'):'none'}">${categoryButton(s)}</th>`).join('');}
function encoderViewScore(r,suite=$('#suite').value){
 const h=$('#head').value;
 if(h==='all')return encoderScore(r,suite);
 const p=r.policies.find(p=>p.head.toUpperCase()===h),c=track().combinations.find(c=>c.id===p?.combinationId),s=c?runScore(c,suite):null;
 return {successRate:s?.rate??null,completedPolicies:Number.isFinite(s?.rate)?[h]:[],combinationId:c?.id,successes:s?.successes,episodes:s?.episodes||0};
}
function selectedRunScore(r){
 if(view!=='taskboard')return runScore(r);
 const s=r.taskResults?.find(x=>x.taskId===$('#task-scope').value);
 // Per-task means require all three seeds, even when another task is incomplete.
 const rate=s?.completedSeeds?.length===3&&s.episodes===60&&s.expectedEpisodes===60&&Number.isFinite(s.successRate)?s.successRate:null;
 return {successes:rate===null?null:s.successes,episodes:s?.episodes||0,rate};
}
function rankedRuns(ignoreSearch=false){
 const h=$('#head').value,q=ignoreSearch?'':$('#search').value.trim().toLowerCase();
 return displayRuns().filter(r=>(h==='all'||r.head?.toUpperCase()===h)&&(!q||`${r.encoder} ${r.encoderLabel} ${r.head}`.toLowerCase().includes(q)))
 .sort((a,b)=>compareRates(selectedRunScore(a).rate,selectedRunScore(b).rate)||(a.encoderLabel||a.encoder).localeCompare(b.encoderLabel||b.encoder));
}
function proSelectedScore(r){return proScore(r.cells.find(c=>c.track===proPerturbation)||r.cells[0])?.successRate??null;}
function landscapeRows(){
 const t=track(),q=$('#search').value.trim().toLowerCase(),h=$('#head').value;
 let rows=[];
 if(t?.encoderBoard)rows=t.encoderBoard.rows.map(r=>({id:r.id,encoder:r.encoder,name:r.encoderLabel,rate:encoderViewScore(r).successRate,context:h==='all'?`${t.encoderBoard.policyHeads.length} 种策略等权平均`:policyName(h),detail:r.id}));
 else if(t?.proRows)rows=t.proRows.filter(r=>h==='all'||r.head.toUpperCase()===h).map(r=>({id:r.id,encoder:r.encoder,name:r.encoderLabel,rate:proSelectedScore(r),context:`${policyName(r.head)} · ${t.perturbations.find(p=>p.id===proPerturbation||p.key===proPerturbation)?.label||r.cells.find(c=>c.track===proPerturbation)?.label||proPerturbation}`,detail:r.id}));
 rows.forEach(r=>{r.rank=comparisonRank(r.rate,rows,x=>x.rate);});
 return rows.filter(r=>!q||`${r.encoder} ${r.name} ${r.context}`.toLowerCase().includes(q)).sort((a,b)=>compareRates(a.rate,b.rate)||a.name.localeCompare(b.name));
}
function ascentLayout(rows){
 const complete=rows.filter(r=>Number.isFinite(r.rate)).sort((a,b)=>b.rate-a.rate||a.name.localeCompare(b.name));
 const height=Math.max(690,Math.ceil(complete.length/2)*34+220),maxRank=Math.max(2,...complete.map(r=>r.rank));
 return {height,points:complete.map((r,i)=>{
   // Ordinal altitude is explicit in the legend; exact rates remain on every label.
   const progress=(r.rank-1)/(maxRank-1),side=i%2===0?-1:1;
   const y=height*(.43+progress*.43),x=600+side*(95+progress*115)+(i%4<2?-1:1)*14;
   return {...r,x,y,side,labelX:side<0?325:875,labelY:y};
 }).map((r,i,points)=>{
   const peers=points.filter(p=>p.side===r.side),idx=peers.indexOf(r),gap=height*.51/Math.max(1,peers.length-1);
   // Labels have their own evenly spaced lanes; leader lines preserve marker identity.
   return {...r,labelY:peers.length===1?r.y:height*.40+idx*gap};
 })};
}
function ascentNode(r){
 const m=encoderMeta(r.encoder),identity=encoderIdentity[r.encoder]||['?', '#6d8da6'],anchor=r.side<0?'end':'start',ring=r.rank===1?'#d9b248':r.rank===2?'#91a6b8':r.rank===3?'#b9987b':identity[1];
 const label=m.shortName||r.name,dateLabel=m.publicationLabel?.includes('权重')?'权重发布':m.publicationLabel?.includes('版本')?'版本发布':'论文首发';
 const context=track()?.proRows?policyName(track().proRows.find(p=>p.id===r.id)?.head):'';
 return `<a class="ascent-node" data-mountain-id="${esc(r.id)}" data-rate="${r.rate}" data-rank="${r.rank}" href="${esc(safeUrl(m.projectUrl))}" target="_blank" rel="noopener" aria-label="${esc(r.name)}，${esc(r.context)}，${scoreText(r.rate)}，${esc(publication(m))}，打开官方项目" style="${encoderStyle(r.encoder)}"><title>${esc(r.name+' · '+r.context+' · '+currentScope()+' · '+scoreText(r.rate)+' · '+publication(m))}</title><path class="ascent-leader" d="M${r.x} ${r.y}L${r.labelX+(r.side<0?7:-7)} ${r.labelY-3}"/><g class="ascent-marker" transform="translate(${r.x} ${r.y})">${r.rank<=3?`<circle class="ascent-medal" r="25" fill="none" stroke="${ring}" stroke-width="5" opacity=".5"/>`:''}<circle r="20" fill="white" stroke="${identity[1]}" stroke-width="2"/><text text-anchor="middle" y="4" fill="${identity[1]}">${esc(identity[0])}</text></g><g class="ascent-label" transform="translate(${r.labelX} ${r.labelY})" text-anchor="${anchor}"><text class="ascent-name" y="0">${esc(label)}${context?' · '+esc(context):''}<tspan class="ascent-rate"> · ${scoreText(r.rate)}</tspan></text><text class="ascent-date" y="17">${String(r.rank).padStart(2,'0')} · ${esc(dateLabel)} ${esc(dateText(m))}</text></g></a>`;
}
function landscapeMarkup(){
 const rows=landscapeRows();if(!rows.length)return '';
 const complete=rows.filter(r=>Number.isFinite(r.rate)),missing=rows.filter(r=>!Number.isFinite(r.rate)),layout=ascentLayout(rows);
 const context=track()?.proRows?`${track().proRows[0].cells.find(c=>c.track===proPerturbation)?.label||proPerturbation} 扰动 · ${$('#head').value==='all'?'全部动作策略':policyName($('#head').value)}`:$('#head').value==='all'?`${track().encoderBoard.policyHeads.length} 种动作策略等权平均`:policyName($('#head').value);
 return `<section class="landscape" aria-label="视觉编码器雪山图"><div class="landscape-heading"><div><span class="eyebrow">THE MVE SUMMIT</span><h2>${track()?.proRows?'编码器 × 动作策略，独立登山':'视觉编码器 · 向更高处'}<span>${esc(currentScope())}</span></h2></div><span class="landscape-scale">${complete.length} 个完整结果 · 点击标记进入项目 ↗</span></div><p class="landscape-caption">${esc(context)} · ${esc(currentScope())} · 按成功率名次登山，精确分数见标记。</p><div class="ascent-scene"><img class="ascent-mountain" src="data/media/mve-summit-v1.png" alt="" decoding="async"><time class="ascent-stamp" datetime="${esc(data.updatedAt)}">${esc(String(data.updatedAt).slice(0,10).replaceAll('-','.'))} · UTC</time><svg class="ascent-overlay" viewBox="0 0 1200 ${layout.height}" role="group" aria-label="模型登山位置按成功率名次排列"><g class="ascent-flag" transform="translate(610 42)" aria-hidden="true"><path d="M0 0V-37" stroke="#354b5d" stroke-width="1.7"/><path d="M1 -37L24 -31L17 -25L25 -19L1 -24Z" fill="#43a8dd"/></g>${layout.points.map(ascentNode).join('')}</svg>${complete.length?'':'<p class="ascent-empty">当前筛选尚无完整结果</p>'}</div><div class="chart-footnote"><span>高度表示成功率名次；横向仅用于排版。山景为生成插图，分数来自已审计实测。</span><a href="https://robodojo-benchmark.com/leaderboard" target="_blank" rel="noopener">布局参考 RoboDojo ↗</a></div>${missing.length?`<div class="ascent-pending"><span>覆盖未齐 · 暂不上山</span>${missing.map(r=>`<span data-mountain-id="${esc(r.id)}" data-rate="" class="ascent-unscored">${projectLink(r.encoder,r.name+' ↗')}<small>${esc(publication(encoderMeta(r.encoder)))}</small></span>`).join('')}</div>`:''}</section>`;
}
function renderMountains(){
 $('#content').innerHTML=landscapeMarkup()||(empty('当前版本没有可比较的性能山','需要相同协议下完整的训练种子结果。可先了解 benchmark 或浏览独立诊断。'));
}
function benchmarkStatus(b){return b.status==='planned'?'尚未接入':b.status==='diagnostic'?'独立诊断':'持续评测';}
function benchmarkCoverage(b){const t=b.tracks.find(t=>t.combinations||t.proRows)||b.tracks[0];return t?.proRows?`${t.tasksPerTrack} 任务 · ${t.completedCells} 个完整扰动格`:t?.combinations?`${b.taskCount} 任务 · ${t.completeCombinations} 个完整组合`:b.status==='planned'?'尚无本站实测成绩':`${b.taskCount} 个已接入任务 / 实例 · ${t?.runs.length||0} 条诊断记录`;}
function benchmarkCard(b){const m=benchmarkMeta(b.id);return `<article class="benchmark-card" data-benchmark-card="${esc(b.id)}"><div class="benchmark-card-top"><span class="catalog-status ${b.status}">${benchmarkStatus(b)}</span><time>${esc(dateText(m))}</time></div><h2><button class="link-button" data-guide="${esc(b.id)}">${esc(m.name||b.name)} ↗</button></h2><p class="benchmark-question">${esc(m.question||b.description)}</p><div class="axis-tags">${(m.axes||[]).slice(0,4).map(a=>`<span>${esc(a.name)}</span>`).join('')}</div><p class="catalog-scale">${esc(m.scale||'官方任务规模待核验')}</p><div class="benchmark-card-bottom"><span>${esc(benchmarkCoverage(b))}</span><button class="text-action" data-guide="${esc(b.id)}">查看解读 →</button></div></article>`;}
function renderAtlas(){
 $('#content').innerHTML=`<div class="atlas-intro"><span class="eyebrow">FIND THE RIGHT TEST</span><h2>从测试问题，理解每一份成绩。</h2><p>标准操作、视觉与语言扰动、双臂协作、长时序任务——不同 benchmark 回答不同问题。下面将官方测试范围与 MVE 已有证据分开列出。</p></div><div class="benchmark-grid">${data.benchmarks.map(benchmarkCard).join('')}</div>`;
}
function renderGuide(){
 const b=bench(),m=benchmarkMeta(b.id),t=track(),native=!!t?.combinations,isPro=!!t?.proRows,source=m.projectUrl||b.sourceUrl;
 const tasks=b.tasks||[];
 $('#content').innerHTML=`<article class="benchmark-guide"><div class="guide-top"><div><span class="eyebrow">BENCHMARK FIELD GUIDE</span><h2>${esc(m.name||b.name)}</h2><p class="guide-question">${esc(m.question||b.description)}</p><p class="guide-description">${esc(m.description||b.description)}</p><div class="guide-links">${source?`<a href="${esc(safeUrl(source))}" target="_blank" rel="noopener">官方项目 ↗</a>`:''}${m.paperUrl?`<a href="${esc(safeUrl(m.paperUrl))}" target="_blank" rel="noopener">论文 ↗</a>`:''}<time>${esc(publication(m))}</time></div></div><div class="guide-facts"><span>官方测试范围</span><strong>${esc(m.scale||'详见官方项目')}</strong><span>MVE 实际覆盖</span><strong>${esc(benchmarkCoverage(b))}</strong><span class="catalog-status ${b.status}">${benchmarkStatus(b)}</span></div></div><div class="guide-section-title"><h3>具体测试什么</h3><span>能力维度与扰动方式</span></div><div class="guide-axes">${(m.axes||[]).map((a,i)=>`<section><span class="axis-number">${String(i+1).padStart(2,'0')}</span><h3>${esc(a.name)}</h3><p>${esc(a.description)}</p>${native&&suiteOrder[i]?`<button class="text-action" data-guide-category="${suiteOrder[i]}">打开 ${suiteName(suiteOrder[i])} 分榜 →</button>`:''}</section>`).join('')}</div><div class="guide-boundary"><div><h3>本站如何测试</h3><p>${esc(b.description)}</p>${native||isPro?'<p>冻结编码器 · native tokens · FP32 · 完整 batch 32 · 20k steps。每任务 20 个评估 seed 各 1 回合，训练种子 17 / 29 / 43 完整后等权平均。</p>':''}</div><div><h3>阅读边界</h3><p>${esc(m.caveat||'不同任务范围与协议的成绩不能直接混合。')}</p><p>${b.status==='planned'?'此处仅提供官方 benchmark 导览；没有 MVE 实测分数。':b.status==='diagnostic'?'当前仅为独立诊断 / 官方参照基线；不纳入 MVE 编码器综合排名。':isPro?'四类扰动独立计分。Environment 资产尚未齐全，不生成全 PRO 总分。':'当前为开发比较。部分训练种子或策略覆盖未齐时，均值保持为空。'}</p></div></div>${tasks.some(x=>x.media?.length)?`<div class="guide-section-title"><h3>真实任务样例</h3><button class="text-action" data-view="tasks">浏览全部任务 →</button></div><div class="guide-examples">${tasks.filter(x=>x.media?.length).filter((x,i,a)=>a.findIndex(y=>y.suite===x.suite)===i).slice(0,4).map((task,i)=>`<article><div class="task-visual">${mediaPreview(task,i)}</div><span>${esc(suiteName(task.suite))}</span><button class="link-button" data-task="${esc(task.id)}">${esc(task.instruction||task.name)}</button></article>`).join('')}</div>`:''}<div class="guide-bottom"><button class="text-action" data-view="atlas">← 对比所有 benchmark</button>${b.status!=='planned'?`<button class="primary-action" data-view="${isPro?'pro':'leaderboard'}">查看本站${b.status==='diagnostic'?'诊断':'评测'}结果 →</button>`:''}</div></article>`;
}
