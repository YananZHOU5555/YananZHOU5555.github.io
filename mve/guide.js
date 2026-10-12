/* Official task descriptions and media are editorial metadata, never scores. */
let guideLibrary={benchmarks:{}},guideCategory='all',guideQuery='',guideTaskId='',guidePage=0;
const guidePageSize=10;
const guideData=()=>guideLibrary.benchmarks[benchmarkId]||{};
const hasLocalTask=t=>(bench().tasks||[]).some(x=>x.id===t?.localTaskId);
function taskFacts(t){
 const facts=[];
 if(t.domain)facts.push(['场景',t.domain==='simulation'?'仿真任务':'实机任务']);
 if(t.structure)facts.push(['结构',t.structure==='composite'?'组合任务':'基础操作']);
 if(t.activity)facts.push(['活动组',t.activity==='Atomic'?'原子技能':t.activity]);
 if(t.subtasks!=null)facts.push(['子任务',String(t.subtasks)]);
 if(t.mobileManipulation)facts.push(['移动操作',t.mobileManipulation==='No'?'不需要':t.mobileManipulation==='Yes'?'需要':t.mobileManipulation]);
 if(t.embodiments?.length)facts.push(['机器人',t.embodiments.join(' / ')]);
 if(t.officialDimensions)Object.entries(t.officialDimensions).forEach(([k,v])=>facts.push([k==='manip'?'官方操作标签':k==='cognition'?'官方认知标签':k,Array.isArray(v)?v.join(' / '):String(v)]));
 if(t.categoryAssignment)facts.push(['归类依据',t.categoryAssignment]);
 return `${facts.length?`<dl class="task-facts">${facts.map(([label,value])=>`<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>`:''}${t.note?`<p class="task-definition-note">${esc(t.note)}</p>`:''}${t.goalDefinition?`<details class="task-definition"><summary>官方目标谓词 <span>＋</span></summary><pre>${esc(t.goalDefinition)}</pre></details>`:''}`;
}
function guideTasks(){
 const g=guideData();
 return g.tasks?.length?g.tasks:(bench().tasks||[]).map(t=>({id:t.id,localTaskId:t.id,title:t.instruction||t.name,objective:t.instruction||t.name,categoryId:t.suite,instruction:t.instruction}));
}
function guideCategories(){return guideData().categories||((benchmarkMeta(benchmarkId).axes||[]).map((a,i)=>({id:suiteOrder[i]||String(i),name:a.name,question:a.description})));}
function taskMedia(task){
 const local=bench().tasks?.find(t=>t.id===task?.localTaskId);
 const localMedia=(local?.media||[]).filter(m=>m.videoUrl||m.type==='video').map(m=>({...m,url:m.videoUrl||m.url,type:'video',kind:'local_diagnostic',note:m.condition||m.note,sourceUrl:m.sourceUrl}));
 return [...(task?.media||[]),...localMedia].filter((m,i,all)=>m.url&&all.findIndex(x=>x.url===m.url)===i);
}
function guideHeroMedia(){
 const g=guideData();if(g.media?.length)return g.media[0];
 const sample=guideTasks().find(t=>taskMedia(t).length);return sample?taskMedia(sample)[0]:null;
}
function mediaOrigin(m){return m?.label?.includes('专家')?'专家动作重放 · 不计入模型成绩':m?.kind==='local_diagnostic'?'MVE 历史诊断 · 非当前榜单演示':'官方演示 · 非 MVE 测评结果';}
function videoEmbed(m,role='task'){
 if(!m?.url)return `<div class="video-unavailable"><span class="film-icon" aria-hidden="true">▷</span><strong>尚无已核验的执行视频</strong><p>保留任务说明与官方来源，素材补齐后在此播放。</p></div>`;
 const url=safeUrl(m.url);
 const content=`<video class="evidence-video" controls muted playsinline preload="${['atlas','gallery'].includes(role)?'none':'metadata'}" ${m.posterUrl?`poster="${esc(safeUrl(m.posterUrl))}"`:''} src="${esc(url)}" aria-label="${esc(m.label||'任务执行视频')}"></video>`;
 return `<figure class="video-evidence" data-media-role="${role}"><div class="video-stage">${content}<div class="video-error" hidden>视频暂时无法加载。<a href="${esc(url)}" target="_blank" rel="noopener">打开视频来源 ↗</a></div></div><figcaption><span class="video-provenance"><i></i>${esc(mediaOrigin(m))}</span><span>${esc(m.label||'任务演示')}${m.originalDurationSeconds?` · ${m.originalDurationSeconds}s`:''}</span>${m.sourceUrl?`<a href="${esc(safeUrl(m.sourceUrl))}" target="_blank" rel="noopener">来源 ↗</a>`:''}</figcaption></figure>`;
}
function initVideos(){
 document.querySelectorAll('video').forEach(v=>{
  mediaVisibility.observe(v);if(v.dataset.bound)return;v.dataset.bound='true';
  v.addEventListener('play',()=>document.querySelectorAll('video').forEach(other=>{if(other!==v)other.pause();}));
  v.addEventListener('error',()=>{const error=v.closest('.video-stage')?.querySelector('.video-error');if(error)error.hidden=false;});
 });
}
const mediaVisibility=new IntersectionObserver(entries=>entries.forEach(e=>{if(!e.isIntersecting)e.target.pause();}),{threshold:.05});
function cleanupVideos(){mediaVisibility.disconnect();document.querySelectorAll('video').forEach(v=>v.pause());}
function mediaCount(tasks){return tasks.filter(t=>taskMedia(t).length).length;}
function guideScopeText(){return guideData().taskInventory?.note||guideData().taskScope||'任务目录仅说明任务目标；视频与当前评估成绩独立。';}
function benchmarkCard(b){
 const m=benchmarkMeta(b.id),g=guideLibrary.benchmarks[b.id]||{},media=g.media?.[0]||(b.tasks||[]).flatMap(t=>(t.media||[]).filter(m=>m.videoUrl).map(m=>({...m,url:m.videoUrl,kind:'local_diagnostic'})))[0];
 return `<article class="benchmark-card" data-benchmark-card="${esc(b.id)}"><div class="benchmark-card-top"><span class="catalog-status ${b.status}">${benchmarkStatus(b)}</span><time>${esc(dateText(m))}</time></div><div class="atlas-card-title"><h2><button class="link-button" data-guide="${esc(b.id)}">${esc(m.name||b.name)}</button></h2><button class="round-link" data-guide="${esc(b.id)}" aria-label="打开 ${esc(m.name||b.name)} 总览">↗</button></div><p class="benchmark-question">${esc(m.question||b.description)}</p>${media?videoEmbed(media,'atlas'):`<div class="atlas-text-preview"><span>RESEARCH SCOPE</span><strong>${esc(m.tagline)}</strong><p>${esc(m.scale)}</p></div>`}<div class="axis-tags">${(g.categories||m.axes||[]).map(a=>`<span>${esc(a.name)}</span>`).join('')}</div><div class="benchmark-card-bottom"><span>${g.tasks?.length?`${num(g.tasks.length)} 项任务 / 变体已编目`:'官方任务目录'}<small>${esc(benchmarkCoverage(b))}</small></span><button class="text-action" data-guide="${esc(b.id)}">总览与任务 →</button></div></article>`;
}
function renderAtlas(){
 $('#content').innerHTML=`<div class="atlas-intro"><span class="eyebrow">THE BENCHMARK COLLECTION</span><h2>先看清测试什么，<br>再比较谁做得更好。</h2><p>从桌面操作到双臂协作，从对象辨识到长程推理。逐一查看任务、分类差异与执行视频，再进入相应结果。</p><div class="atlas-key"><span><i class="key-live"></i>本站已有评测</span><span><i class="key-diagnostic"></i>独立诊断</span><span><i class="key-planned"></i>官方任务导览</span></div></div><div class="benchmark-grid">${data.benchmarks.map(benchmarkCard).join('')}</div>`;initVideos();
}
function renderGuide(){
 const b=bench(),m=benchmarkMeta(b.id),g=guideData(),categories=guideCategories(),tasks=guideTasks(),media=guideHeroMedia(),source=m.projectUrl||b.sourceUrl;
 if(!categories.some(c=>c.id===guideCategory))guideCategory='all';
 $('#content').innerHTML=`<article class="benchmark-guide"><nav class="guide-sections" aria-label="总览章节"><button data-guide-section="guide-overview"><span>01</span>总览</button><button data-guide-section="guide-taxonomy"><span>02</span>类别区别</button><button data-guide-section="guide-directory"><span>03</span>任务与视频 <small>${num(tasks.length)}</small></button><button data-guide-section="guide-evaluation"><span>04</span>评测范围</button></nav><section class="guide-hero" id="guide-overview"><div class="guide-story"><span class="eyebrow">UNDERSTAND THE BENCHMARK</span><h2>${esc(m.tagline||m.name)}</h2><p class="guide-lead">${esc(g.intro||m.description||b.description)}</p><dl class="guide-facts-inline"><div><dt>官方规模</dt><dd>${esc(m.scale)}</dd></div><div><dt>本站进度</dt><dd>${esc(benchmarkCoverage(b))}</dd></div></dl><div class="guide-links"><a href="${esc(safeUrl(source))}" target="_blank" rel="noopener">官方项目 ↗</a>${m.paperUrl?`<a href="${esc(safeUrl(m.paperUrl))}" target="_blank" rel="noopener">阅读论文 ↗</a>`:''}<time>${esc(publication(m))}</time></div><button class="primary-action" data-guide-section="guide-directory">探索 ${num(tasks.length)} 项任务 <span>↓</span></button></div><div class="guide-hero-media">${videoEmbed(media,'hero')}<p class="media-context">${esc(media?.note||media?.condition||'演示用于理解任务流程；不代表本站模型的平均表现。')}</p></div></section><section id="guide-taxonomy" class="guide-block"><div class="guide-block-heading"><div><span class="section-number">02 / TAXONOMY</span><h2>这些类别，究竟差在哪？</h2></div><p>${esc(g.categoryBasis||'按官方测试维度解读；不同维度的分数独立阅读。')}</p></div><div class="taxonomy-grid">${categories.map((c,i)=>`<button class="taxonomy-tab ${i===0?'active':''}" data-axis="${esc(c.id)}" aria-pressed="${i===0}"><span class="axis-counter">${String(i+1).padStart(2,'0')}</span><span><strong>${esc(c.name)}</strong><small>${esc(c.english||'测试维度')}</small></span><span class="axis-arrow">↗</span></button>`).join('')}</div><div id="axis-detail"></div><details class="taxonomy-compare"><summary>并排比较全部 ${categories.length} 个类别 <span>＋</span></summary><div class="table-wrap"><table><thead><tr><th>类别</th><th>主要改变什么</th><th>保持什么 / 对照范围</th><th>与其他类别的区别</th></tr></thead><tbody>${categories.map(c=>`<tr><td><strong>${esc(c.name)}</strong></td><td>${esc(c.changes||c.question||'详见官方任务')}</td><td>${esc(c.holdsFixed||'以各任务定义为准')}</td><td>${esc(c.distinction||c.question||'详见官方定义')}</td></tr>`).join('')}</tbody></table></div></details></section><section id="guide-directory" class="guide-block"><div class="guide-block-heading"><div><span class="section-number">03 / TASK EXPLORER</span><h2>每个任务，都说清楚。</h2></div><p>${esc(g.taskInventory?.label||g.taskScope||'逐项查看动作目标与真实执行视频。')}</p></div><div class="directory-toolbar"><div class="directory-filter"><label for="guide-category">任务类别</label><select id="guide-category"><option value="all">全部类别 · ${tasks.length}</option>${categories.map(c=>`<option value="${esc(c.id)}" ${guideCategory===c.id?'selected':''}>${esc(c.name)} · ${tasks.filter(t=>t.categoryId===c.id).length}</option>`).join('')}</select></div><label class="directory-search"><span>⌕</span><input id="guide-search" type="search" placeholder="搜索任务、物体或动作…" value="${esc(guideQuery)}" aria-label="搜索任务目录"></label><span class="directory-coverage">${num(mediaCount(tasks))} 项含视频</span></div><div class="task-workbench"><div class="task-index"><div class="task-index-head"><span id="guide-match-count"></span><span>选择任务 →</span></div><div id="guide-task-list"></div><div id="guide-pagination"></div></div><div id="guide-task-preview" class="task-preview" aria-live="polite"></div></div><p class="directory-note">${esc(guideScopeText())}${g.taskInventory?.sourceUrl?` <a href="${esc(safeUrl(g.taskInventory.sourceUrl))}" target="_blank" rel="noopener">官方任务目录 ↗</a>`:''}</p></section><section id="guide-evaluation" class="guide-block"><div class="guide-block-heading"><div><span class="section-number">04 / EVALUATION</span><h2>官方任务与本站成绩，分别看。</h2></div></div><div class="evaluation-columns"><section><span class="evaluation-label">MVE COVERAGE</span><h3>本站评测范围</h3><p>${esc(b.description)}</p>${b.id==='libero'||track()?.proRows?'<p>冻结视觉编码器 · FP32 · 完整 batch 32 · 20k steps。每任务 20 个评估 seed 各 1 次，训练种子 17 / 29 / 43 齐全后等权平均。</p>':''}${b.status!=='planned'?`<button class="primary-action" data-view="${track()?.proRows?'pro':'leaderboard'}">进入${b.status==='diagnostic'?'诊断结果':'成绩分榜'} →</button>`:'<span class="not-evaluated">尚无 MVE 实测成绩</span>'}</section><section><span class="evaluation-label">READING THE EVIDENCE</span><h3>如何正确读结果</h3><p>${esc(b.status==='planned'?'本站尚无实测成绩。官方任务演示说明测试内容，不构成 MVE 模型表现。':m.caveat)}</p><p>这里的视频用于理解任务。官方演示、专家重放与本站历史诊断均保留来源；不以示例视频替代当前模型的成功率。</p><div class="guide-sources">${(g.sources||[]).slice(0,5).map(s=>`<a href="${esc(safeUrl(s.url))}" target="_blank" rel="noopener">${esc(s.label)} ↗</a>`).join('')}</div></section></div></section><div class="guide-bottom"><button class="text-action" data-view="atlas">← 对比所有 benchmark</button><button class="text-action" data-guide-section="guide-overview">回到总览 ↑</button></div></article>`;
 renderAxis(categories[0]?.id);renderGuideDirectory();initVideos();
}
function renderAxis(id){
 const c=guideCategories().find(c=>c.id===id);if(!c)return;
 $('#axis-detail').querySelectorAll('video').forEach(v=>{v.pause();mediaVisibility.unobserve(v);});
 document.querySelectorAll('[data-axis]').forEach(b=>{b.classList.toggle('active',b.dataset.axis===id);b.setAttribute('aria-pressed',String(b.dataset.axis===id));});
 const count=guideTasks().filter(t=>t.categoryId===id).length,media=guideData().media?.find(m=>m.categoryId===id);
 $('#axis-detail').innerHTML=`<section class="axis-detail"><div class="axis-question"><span>${esc(c.english||c.name)}</span><h3>${esc(c.question||c.name)}</h3><p>${esc(c.distinction||'具体类别定义以官方说明为准。')}</p>${count?`<button class="text-action" data-directory-category="${esc(id)}">浏览本类 ${count} 项任务 →</button>`:''}${benchmarkId==='libero'&&suiteOrder.includes(id)?`<button class="text-action" data-guide-category="${esc(id)}">查看 ${suiteName(id)} 分榜 →</button>`:''}</div><dl><div><dt>改变什么</dt><dd>${esc(c.changes||'以任务定义为准')}</dd></div><div><dt>保持什么</dt><dd>${esc(c.holdsFixed||'以任务定义为准；不假设严格配对')}</dd></div><div class="axis-example"><dt>具体例子</dt><dd>${esc(c.example||'在下方目录选择任务，查看具体操作目标。')}</dd></div></dl></section>`;
 if(media)$('#axis-detail').insertAdjacentHTML('beforeend',`<div class="axis-video"><div><span class="section-number">CATEGORY IN ACTION</span><h3>${esc(c.name)}，看实际变化。</h3><p>${esc(media.note||media.label)}</p></div>${videoEmbed(media,'category')}</div>`);
 initVideos();
}
function matchingGuideTasks(){const q=guideQuery.trim().toLowerCase();return guideTasks().filter(t=>(guideCategory==='all'||t.categoryId===guideCategory)&&(!q||`${t.title} ${t.objective} ${t.instruction||''} ${t.id}`.toLowerCase().includes(q)));}
function renderGuideDirectory(){
 const tasks=matchingGuideTasks(),pages=Math.max(1,Math.ceil(tasks.length/guidePageSize));guidePage=Math.min(guidePage,pages-1);
 if(!tasks.some(t=>t.id===guideTaskId))guideTaskId=tasks[0]?.id||'';
 const first=guidePage*guidePageSize,subset=tasks.slice(first,first+guidePageSize);
 $('#guide-match-count').textContent=`${num(tasks.length)} 项任务`;
 $('#guide-task-list').innerHTML=subset.map((t,i)=>`<button class="task-index-row ${t.id===guideTaskId?'active':''}" data-guide-task="${esc(t.id)}" aria-pressed="${t.id===guideTaskId}"><span class="task-index-number">${String(first+i+1).padStart(2,'0')}</span><span><strong>${esc(t.title||t.id)}</strong><small>${esc(t.objective)}</small></span><span class="task-index-media" title="${taskMedia(t).length?'有执行视频':'任务说明'}">${taskMedia(t).length?'▷':'↗'}</span></button>`).join('')||'<div class="directory-empty">没有匹配任务。试试其他动作或物体名称。</div>';
 $('#guide-pagination').innerHTML=`<button data-guide-page="${guidePage-1}" ${guidePage===0?'disabled':''} aria-label="上一页任务">←</button><span>${guidePage+1} / ${pages}</span><button data-guide-page="${guidePage+1}" ${guidePage===pages-1?'disabled':''} aria-label="下一页任务">→</button>`;
 renderGuideTask();
}
function renderGuideTask(mediaIndex=0){
 const t=guideTasks().find(t=>t.id===guideTaskId),panel=$('#guide-task-preview');
 document.querySelectorAll('[data-guide-task]').forEach(b=>{b.classList.toggle('active',b.dataset.guideTask===t?.id);b.setAttribute('aria-pressed',String(b.dataset.guideTask===t?.id));});
 if(t&&panel.dataset.task===t.id&&panel.dataset.clip===String(mediaIndex))return;
 panel.dataset.task=t?.id||'';panel.dataset.clip=String(mediaIndex);
 panel.querySelectorAll('video').forEach(v=>{v.pause();mediaVisibility.unobserve(v);});
 if(!t){panel.innerHTML='<div class="directory-empty">调整筛选后，选择一个任务查看。</div>';return;}
 const cat=guideCategories().find(c=>c.id===t.categoryId),media=taskMedia(t),m=media[mediaIndex];
 document.querySelectorAll('[data-guide-task]').forEach(b=>{b.classList.toggle('active',b.dataset.guideTask===t.id);b.setAttribute('aria-pressed',String(b.dataset.guideTask===t.id));});
 panel.innerHTML=`<div class="task-preview-heading"><span class="task-category-label">${esc(cat?.name||t.categoryId)}</span><span class="task-evidence-kind">${hasLocalTask(t)?'本站任务条目':t.categoryAssignment?.includes('导读')?'官方任务 · 导览归类':'官方任务定义'}</span></div><h3>${esc(t.title||t.id)}</h3><p class="task-objective">${esc(t.objective)}</p>${taskFacts(t)}${videoEmbed(m)}${media.length>1?`<div class="clip-switcher" aria-label="切换该任务视频">${media.map((x,i)=>`<button data-guide-clip="${i}" aria-pressed="${i===mediaIndex}">${esc(x.label||`片段 ${i+1}`)}</button>`).join('')}</div>`:''}<p class="task-video-note">${esc(m?.note||m?.condition||'此条目提供任务定义；尚无可核验的逐任务视频。')}</p>${t.instruction?`<details class="task-instruction"><summary>原始任务指令 <span>＋</span></summary><p lang="en">${esc(t.instruction)}</p></details>`:''}<div class="task-preview-footer"><span>${esc(t.id)}</span><div>${t.sourceUrl?`<a href="${esc(safeUrl(t.sourceUrl))}" target="_blank" rel="noopener">官方定义 ↗</a>`:''}${hasLocalTask(t)?`<button class="text-action" data-task="${esc(t.localTaskId)}">本站记录 ↗</button>`:''}</div></div>`;
 initVideos();
}
document.addEventListener('click',e=>{
 const section=e.target.closest('[data-guide-section]');if(section){$('#'+section.dataset.guideSection)?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});return;}
 const axis=e.target.closest('[data-axis]');if(axis){renderAxis(axis.dataset.axis);return;}
 const category=e.target.closest('[data-directory-category]');if(category){guideCategory=category.dataset.directoryCategory;guideQuery='';guidePage=0;$('#guide-category').value=guideCategory;$('#guide-search').value='';renderGuideDirectory();updateRoute();$('#guide-directory').scrollIntoView({block:'start'});return;}
 const task=e.target.closest('[data-guide-task]');if(task){guideTaskId=task.dataset.guideTask;renderGuideTask();updateRoute();return;}
 const clip=e.target.closest('[data-guide-clip]');if(clip){renderGuideTask(Number(clip.dataset.guideClip));return;}
 const page=e.target.closest('[data-guide-page]');if(page){guidePage=Number(page.dataset.guidePage);guideTaskId=matchingGuideTasks()[guidePage*guidePageSize]?.id||'';renderGuideDirectory();updateRoute();return;}

});
document.addEventListener('input',e=>{if(e.target.id==='guide-search'){guideQuery=e.target.value;guidePage=0;renderGuideDirectory();updateRoute();}});
document.addEventListener('change',e=>{if(e.target.id==='guide-category'){guideCategory=e.target.value;guidePage=0;renderGuideDirectory();updateRoute();}});
