'use strict';
/* MVE leaderboard v2 · shell, leaderboards, 性能山, 逐任务, detail drawer, events, boot.
   Every view reads the same normalized board (explorer.js), so a benchmark looks the same in all of them. */

const heat=r=>fin(r)?(.07+.78*r).toFixed(3):0;
const hiText=r=>fin(r)&&r>.58;
function setAccent(id){const s=bstyle(id),st=document.documentElement.style;st.setProperty('--acc-l',s.l);st.setProperty('--acc-d',s.d);}
const statusPill=b=>isPlanned(b)?'<span class="pill plan"><i></i>尚未接入</span>':b.status==='diagnostic'?'<span class="pill diag"><i></i>独立诊断</span>':'<span class="pill live"><i></i>持续评测</span>';
const rankBadge=k=>k==null?'<span class="rk na">—</span>':`<span class="rk ${k<=3?'m'+k:''}">${String(k).padStart(2,'0')}</span>`;

/* ---------- navigation ---------- */
function renderNav(){
  for(const el of $$('[data-page]'))el.setAttribute('aria-current',el.dataset.page===S.page?'page':'false');
  const t=DATA?.updatedAt?String(DATA.updatedAt).replace('T',' ').slice(0,16)+' UTC':'';
  $('#snap').innerHTML=t?`<i></i><span>数据快照 </span><b class="t" style="font-weight:500">${esc(t)}</b>`:'';
}
function benchBlurb(b){
  if(isPlanned(b))return '计划中';
  const ts=b.tracks||[];
  const nat=ts.find(t=>t.encoderBoard);if(nat)return `${nat.encoderBoard.rows.length} 编码器 · ${nat.expectedCombinations||nat.combinations?.length} 组合`;
  const pro=ts.find(t=>t.proRows);if(pro)return `${pro.proRows.length} 组合 · ${(pro.perturbations||[]).length} 类扰动`;
  if(b.id==='robotwin2'){const g=new Set(ts.flatMap(t=>t.runs.map(r=>r.encoder)));return `${g.size} 组 · ${b.taskCount} 任务`;}
  return `${ts.reduce((n,t)=>n+(t.runs?.length||0),0)} 条诊断 · ${b.taskCount} 实例`;
}
function rail(){
  return `<nav class="rail" aria-label="选择 benchmark">${DATA.benchmarks.map(b=>{const m=bmeta(b.id);
    return `<button class="chip-b ${isPlanned(b)?'planned':''}" style="${bcVars(b.id)}" data-bench="${esc(b.id)}" aria-current="${b.id===S.bench}">${tile(b.id)}<span><b>${esc(m.name||b.name)}</b><small>${esc(benchBlurb(b))}</small></span></button>`;}).join('')}</nav>`;
}
function heroStats(b){
  const ts=b.tracks||[],nat=ts.find(t=>t.encoderBoard),pro=ts.find(t=>t.proRows);
  if(nat){const rows=nat.encoderBoard.rows;return [['视觉编码器',rows.length,`${rows.filter(r=>fin(r.successRate)).length} 个覆盖完整`],['策略组合',`${nat.completeCombinations}/${nat.expectedCombinations}`,'完整 / 计划'],['有效回合',num(nat.auditedValidEpisodes),'严格审计'],['训练种子',(nat.trainingSeeds||[]).join(' · '),'等权平均']];}
  if(pro){const k=(pro.perturbations||[]).length;return [['编码器 × 策略',pro.proRows.length,`${k} 类扰动独立计分`],['完整扰动格',`${pro.completedCells}/${pro.proRows.length*k}`,'三种子齐全'],['有效回合',num(pro.auditedValidEpisodes),'严格审计'],['训练种子',(pro.trainingSeeds||[]).join(' · '),'等权平均']];}
  if(b.id==='robotwin2'){const g=new Set(ts.flatMap(t=>t.runs.map(r=>r.encoder))),seeds=[...new Set(ts.flatMap(t=>t.trainingSeeds||[]))].sort();
    const main=ts[0];return [['编码器组',g.size,'R0 官方 DP + 冻结编码器'],['协议任务',`${new Set(main.runs.flatMap(r=>(r.taskResults||[]).map(x=>x.taskId))).size} / 50`,`共评估 ${b.taskCount} 个任务`],['评估版本',ts.length,'Easy / Hard / 参照'],['训练种子',seeds.join(' · '),'序贯补种子']];}
  if(isPlanned(b))return [];
  const runs=ts.flatMap(t=>t.runs||[]);return [['扰动实例',b.taskCount,'已接入'],['诊断记录',runs.length,'单回合'],['有效回合',num(runs.reduce((n,r)=>n+(r.episodes||0),0)),'不排名'],['训练种子',[...new Set(ts.flatMap(t=>t.trainingSeeds||[]))].join(' · '),'']];
}
function hero(b){
  const m=bmeta(b.id),st=heroStats(b),src=m.projectUrl||b.sourceUrl;
  return `<section class="hero"><div class="hero-id">${tile(b.id,'l')}<div><h1>${esc(m.name||b.name)}${m.tagline?`<small>${esc(m.tagline)}</small>`:''}</h1>
    <p class="q">${esc(m.question||b.description)}</p>
    <div class="meta">${statusPill(b)}${m.publicationDate?`<span>${esc(m.publicationLabel||'发布')} · ${dateDot(m.publicationDate)}</span>`:''}
    ${src?`<a href="${esc(safeUrl(src))}" target="_blank" rel="noopener">官方项目 ↗</a>`:''}${m.paperUrl?`<a href="${esc(safeUrl(m.paperUrl))}" target="_blank" rel="noopener">论文 ↗</a>`:''}${m.scale?`<span>${esc(m.scale)}</span>`:''}</div></div></div>
    ${st.length?`<div class="stats">${st.map(s=>`<div class="stat"><span>${esc(s[0])}</span><b>${esc(s[1])}</b>${s[2]?`<small>${esc(s[2])}</small>`:''}</div>`).join('')}</div>`:''}</section>`;
}
function tabCount(b,v){
  if(v==='rank'){const t=currentTrackFor(b,'rank');const bd=t&&getBoard(b,t,b.id==='libero'?'encoder':'auto');return bd?bd.rows.length:'';}
  if(v==='combos'){const t=b.tracks.find(t=>t.combinations);return t?t.combinations.length:'';}
  if(v==='videos')return (b.tasks||[]).filter(t=>taskVideos(b,t).length).length;
  if(v==='about')return (GUIDES[b.id]?.tasks||[]).length||'';
  return '';
}
function currentTrackFor(b,v){const ids=viewTracks(b,v);return trackById(b,ids.includes(S.track)?S.track:ids[0]);}
function tabs(b,vs){
  return `<div class="tabs" role="tablist" aria-label="视图">${vs.map(v=>{const c=tabCount(b,v);
    return `<button class="tab" role="tab" data-view="${v}" aria-selected="${v===S.view}">${icon(VIEW_META[v][1])}${VIEW_META[v][0]}${c!==''?`<span class="count">${c}</span>`:''}</button>`;}).join('')}</div>`;
}

/* ---------- filters (one row above everything they scope) ---------- */
const boardKind=(b,v)=>b.id==='libero'&&(v==='rank'||v==='mountain')?'encoder':'auto';
function activeBoard(b=B(),v=S.view){if(!['rank','combos','mountain','matrix'].includes(v))return null;return getBoard(b,currentTrackFor(b,v),boardKind(b,v));}
const TRACK_LABEL={'native-20x1':'原生 20×1 · 三训练种子（主榜）','p1-2ep':'历史 P1 · 每任务 2 回合','expanded-20x3':'历史扩展 · 20 seed × 3 回合',
  'pro-native-20x1':'原生 PRO · 四类扰动 · 三训练种子','pro-development':'历史 PRO 单例诊断','plus-development':'Plus 单例诊断'};
function shortTrack(t){return TRACK_LABEL[t.id]||String(t.label||t.id).replace(/\s*·\s*不排名$/,'');}
function filters(b){
  const v=S.view;
  if(v==='about')return '';
  if(v==='videos'){const suites=SUITE_ORDER.filter(s=>(b.tasks||[]).some(t=>t.suite===s&&taskVideos(b,t).length));
    return `<div class="filters">${suites.length>1?`<div class="fgroup"><span class="flabel">任务分类</span><div class="seg">${[['all','全部'],...suites.map(s=>[s,suiteName(s)])].map(([k,l])=>`<button data-vcat="${k}" aria-pressed="${S.cat===k}">${esc(l)}</button>`).join('')}</div></div>`:''}${searchBox('任务名称或指令…')}</div>`;}
  const bd=activeBoard(b,v);if(!bd)return '';
  const ids=viewTracks(b,v),parts=[];
  if(ids.length>1)parts.push(`<div class="fgroup"><label for="track">版本</label><select id="track" class="sel">${ids.map(id=>{const t=trackById(b,id);return `<option value="${esc(id)}" ${id===bd.track.id?'selected':''}>${esc(shortTrack(t))}</option>`;}).join('')}</select></div>`);
  if(bd.catKind!=='task'&&bd.cats.length){const opts=bd.kind==='pro'?bd.cats:[{id:'all',label:'全部任务'},...bd.cats];const cur=curCat(bd);
    parts.push(`<div class="fgroup"><span class="flabel">${bd.kind==='pro'?'扰动':'分类口径'}</span><div class="seg">${opts.map(c=>`<button data-cat="${esc(c.id)}" aria-pressed="${cur===c.id}" title="${esc(c.title||'')}">${esc(c.label)}</button>`).join('')}</div></div>`);}
  else if(bd.catKind==='task'&&curCat(bd)!=='all'){const c=bd.cats.find(x=>x.id===curCat(bd));
    parts.push(`<div class="fgroup"><span class="flabel">口径</span><div class="seg"><button data-cat="all" aria-pressed="false">全部任务</button><button aria-pressed="true">${esc(c.label)}</button></div></div>`);}
  if(bd.kind==='pro')parts.push(`<div class="fgroup"><span class="flabel">任务集</span><div class="seg">${[['all','全部'],...SUITE_ORDER.map(s=>[s,suiteName(s)])].map(([k,l])=>`<button data-suite="${k}" aria-pressed="${S.suite===k}">${esc(l)}</button>`).join('')}</div></div>`);
  if(bd.pols.length>1)parts.push(`<div class="fgroup"><span class="flabel">动作策略</span><div class="seg">${[['all','全部']].concat(bd.pols.map(p=>[p,polName(p)])).map(([k,l])=>`<button data-pol="${esc(k)}" aria-pressed="${S.pol===k}">${k!=='all'&&polIdx(k)>=0?`<svg width="9" height="9" viewBox="-6 -6 12 12" aria-hidden="true">${shape(polIdx(k),0,0,4.6)}</svg>`:''}${esc(l)}</button>`).join('')}</div></div>`);
  if(v==='rank'&&bd.kind==='encoder')parts.push(`<div class="fgroup"><span class="flabel">明细列</span><div class="seg"><button data-mode="policy" aria-pressed="${S.mode==='policy'}">按动作策略</button><button data-mode="suite" aria-pressed="${S.mode==='suite'}">按任务分类</button></div></div>`);
  parts.push(searchBox(bd.kind==='encoder'?'搜索编码器…':'搜索编码器或策略…'));
  return `<div class="filters">${parts.join('')}</div>`;
}
const searchBox=ph=>`<label class="search">${icon('search')}<span class="sr-only">搜索</span><input id="q" type="search" value="${esc(S.q)}" placeholder="${esc(ph)}" autocomplete="off"></label>`;
function scopeBar(bd,shown){
  const total=bd.rows.filter(r=>inPool(bd,r)).length,done=rankRows(bd).filter(x=>x.rank!=null).length;
  return `<div class="scopebar">${scopeLabel(bd).map(p=>`<b>${esc(p)}</b>`).join('<span class="sep"></span>')}<span class="sep"></span><span>${shown<total?`显示 ${shown} / `:''}${total} 行 · ${done} 行覆盖完整</span>${bd.seeds?.length?`<span class="sep"></span><span>训练种子 ${esc(bd.seeds.join(' / '))}</span>`:''}</div>`;
}

/* ---------- leaderboard ---------- */
function coverCell(c){
  if(!c)return '';
  if(c.total&&c.total<=5)return `<span class="cov ${c.done<c.total?'part':''}" title="${c.done}/${c.total} ${c.unit}"><span class="dots">${Array.from({length:c.total},(_,i)=>`<i class="${i<c.done?'on':''}"></i>`).join('')}</span>${c.done}/${c.total}</span>`;
  return `<span class="cov ${c.done<c.total?'part':''}">${num(c.done)} / ${num(c.total)} ${esc(c.unit)}</span>`;
}
function scoreCell(bd,s,std){
  if(bd.single)return fin(s)?(s>0?`<span class="cell ok">${icon('check')}成功</span>`:'<span class="cell no">未成功</span>'):'<span class="na-text">—</span>';
  if(!fin(s))return '<span class="na-text">覆盖未齐</span>';
  return `<div class="score"><span class="v">${pc(s)}${fin(std)?`<small>± ${(100*std).toFixed(1)}</small>`:''}</span><span class="bar" aria-hidden="true"><i style="width:${(100*s).toFixed(1)}%"></i></span></div>`;
}
function heatCell(rate,tip,single){
  if(single)return fin(rate)?`<span class="cell ${rate>0?'ok':'no'}" data-tip="${esc(tip)}">${rate>0?'✓':'✕'}</span>`:'<span class="cell na">—</span>';
  return fin(rate)?`<span class="cell ${hiText(rate)?'hi':''}" style="--v:${heat(rate)}" data-tip="${esc(tip)}">${pc(rate)}</span>`:`<span class="cell na" data-tip="${esc(tip+'\n覆盖未齐')}">—</span>`;
}
function rowSub(bd,r){
  if(bd.kind==='run'&&(bd.single||!encSub(r.encoder)))return r.label||encSub(r.encoder);
  return encSub(r.encoder)||r.family||r.label||'';
}
function detailCols(bd){
  if(bd.kind==='encoder'&&S.mode==='policy')return bd.pols.map(p=>({type:'pol',id:p,label:polName(p),title:`${polName(p)} · 三种子均值`}));
  return bd.cats.map(c=>({type:'cat',id:c.id,label:c.label,title:c.title}));
}
function detailValue(bd,r,col){
  if(col.type==='pol'){const p=r.pols[col.id];if(!p)return {rate:null};
    if(curCat(bd)==='all')return {rate:p.rate};return {rate:bd.combos.get(p.combo)?.cats[curCat(bd)]?.rate??null};}
  if(bd.kind==='encoder'&&S.pol!=='all'){const c=bd.combos.get(r.pols[S.pol]?.combo);return {rate:c?.cats[col.id]?.rate??null};}
  const c=r.cats[col.id];if(!c)return {rate:null};
  if(bd.kind==='pro'&&S.suite!=='all')return {rate:c.suites?.[S.suite]?.rate??null};
  return c;
}
function podium(bd,top){
  const all=rankRows(bd).filter(x=>x.rank!=null).sort((a,b)=>a.rank-b.rank);
  return `<div class="podium">${top.map((x,i)=>{const next=all[i+1],gap=next&&fin(next.s)?(100*(x.s-next.s)).toFixed(1):null;
    return `<button class="pod" data-row="${esc(x.r.id)}"><span class="pod-top">${rankBadge(x.rank)}${encMark(x.r.encoder)}<b>${esc(x.r.name)}</b></span>
      <span class="pod-bottom"><span class="big">${pc(x.s)}<small>%</small></span><span class="side"><span>${bd.kind!=='encoder'?esc(polName(x.r.head)):esc(encMeta(x.r.encoder).family||'')}</span><span>${gap!==null?`领先下一名 ${gap} pt`:''}</span></span></span></button>`;}).join('')}</div>`;
}
function table(bd,rows){
  const cols=detailCols(bd),cur=curCat(bd),showPol=bd.kind!=='encoder'&&bd.pols.length>1,isTask=bd.catKind==='task'&&!(bd.kind==='encoder'&&S.mode==='policy');
  const scoreLabel=bd.kind==='pro'?`${bd.cats.find(c=>c.id===cur)?.label||''} 成功率`:cur==='all'?(bd.kind==='encoder'&&S.pol==='all'?'跨策略平均':'平均成功率'):`${bd.cats.find(c=>c.id===cur)?.label} 成功率`;
  const grpLabel=cols[0]?.type==='pol'?'各动作策略（三种子均值）':bd.kind==='pro'?'四类扰动（各自独立计分）':bd.catKind==='task'?'逐任务':'各任务分类';
  const head=`<tr><th class="c-rk" scope="col">名次</th><th class="c-enc" scope="col">视觉编码器</th>${showPol?'<th class="c-pol" scope="col">动作策略</th>':''}
    <th class="c-score sel" scope="col" aria-sort="${S.dir<0?'descending':'ascending'}"><button class="th-btn" data-sort aria-pressed="true">${esc(scoreLabel)} <span class="arr">${S.dir<0?'↓':'↑'}</span></button></th>
    ${cols.map(c=>{const on=c.type==='pol'?S.pol===c.id:cur===c.id;return `<th class="cat ${isTask?'task':''} ${on?'sel':''}" scope="col" title="${esc(c.title||'')}"><button class="th-btn" ${c.type==='pol'?`data-pol="${esc(c.id)}"`:`data-cat="${esc(c.id)}"`} aria-pressed="${on}">${c.type==='pol'&&polIdx(c.id)>=0?`<svg width="9" height="9" viewBox="-6 -6 12 12" aria-hidden="true">${shape(polIdx(c.id),0,0,4.6)}</svg>`:''}${esc(c.label)}</button></th>`;}).join('')}
    <th class="c-cov" scope="col">覆盖</th></tr>`;
  const body=rows.map(x=>{const r=x.r;
    return `<tr data-row="${esc(r.id)}" tabindex="0" class="${fin(x.s)?'':'dim'}"><td class="c-rk">${rankBadge(x.rank)}</td>
      <td class="c-enc"><div class="enc">${encMark(r.encoder)}<div class="enc-t"><b>${esc(r.name)}</b><small>${esc(rowSub(bd,r)||'—')}</small></div></div></td>
      ${showPol?`<td class="c-pol">${polBadge(r.head)}</td>`:''}<td class="c-score">${scoreCell(bd,x.s,rowStd(bd,r))}</td>
      ${cols.map(c=>{const v=detailValue(bd,r,c);return `<td class="cat">${heatCell(v.rate,`${r.name}${showPol?' · '+polName(r.head):''}\n${c.title||c.label}：${pcs(v.rate)}${fin(v.std)?` ± ${(100*v.std).toFixed(1)}`:''}`,bd.single)}</td>`;}).join('')}
      <td class="c-cov">${coverCell(r.cover)}</td></tr>`;}).join('');
  return `<table class="lb"><caption class="sr-only">${esc(bd.title)}</caption><thead><tr class="grpr"><th class="grp" colspan="${showPol?4:3}"></th><th class="grp" colspan="${cols.length}" style="text-align:center">${esc(grpLabel)}</th><th class="grp"></th></tr>${head}</thead><tbody>${body||`<tr><td colspan="${cols.length+4}"><div class="empty">没有符合筛选的行。</div></td></tr>`}</tbody></table>`;
}
function heatLegend(bd){
  if(bd.single)return `<div class="legend"><span class="key"><span class="cell ok">✓</span>成功</span><span class="key"><span class="cell no">✕</span>未成功</span><span>每格 1 回合，仅作诊断</span></div>`;
  return `<div class="legend"><span class="key">0%<span class="ramp"></span>100%</span><span class="key"><span class="cell na">—</span>覆盖未齐，不填 0</span><span>点击列标题切换排名口径；点击行查看种子、分类与逐任务证据</span></div>`;
}
function notesBox(bd){
  const m=bmeta(bd.bench.id),items=[bd.method,bd.note,...(bd.notes||[]),m.caveat].filter(Boolean);
  const uniq=[...new Set(items)];if(!uniq.length)return '';
  return `<details class="note-box"><summary>${icon('info')}如何读这张榜 <span class="muted" style="font-weight:450">· ${esc(shortTrack(bd.track))}</span></summary><ul>${uniq.map(n=>`<li>${esc(n)}</li>`).join('')}</ul></details>`;
}
function rankView(b){
  const bd=activeBoard(b,S.view);if(!bd)return emptyBox('当前没有可比较的结果');
  const rows=visibleRows(bd),top=rankRows(bd).filter(x=>x.rank!=null).sort((a,c)=>a.rank-c.rank).slice(0,3);
  const showPod=!bd.single&&!S.q&&S.dir<0&&top.length===3;
  return `${scopeBar(bd,rows.length)}${showPod?podium(bd,top):''}<div class="board" role="region" aria-label="${esc(bd.title)}" tabindex="0">${table(bd,rows)}</div><div style="margin-top:10px">${heatLegend(bd)}</div>${notesBox(bd)}`;
}
const emptyBox=(t,p='')=>`<div class="card empty">${icon('layersOff')}<h3>${esc(t)}</h3>${p?`<p>${esc(p)}</p>`:''}</div>`;

/* ---------- 性能山 (sorted column chart; dots = per-policy or per-task components) ---------- */
function mountainView(b){
  const bd=activeBoard(b,'mountain');if(!bd)return emptyBox('当前版本没有可比较的结果');
  const all=rankRows(bd),q=S.q.trim().toLowerCase(),done=all.filter(x=>fin(x.s)).sort((a,c)=>c.s-a.s||a.r.name.localeCompare(c.r.name)),pend=all.filter(x=>!fin(x.s));
  if(!done.length)return emptyBox('当前口径下还没有完整结果','需要相同协议下完整的训练种子结果。');
  const cat=curCat(bd);
  let comps=null;
  if(bd.kind==='encoder'&&S.pol==='all')comps={kind:'pol',keys:bd.pols,get:(r,k)=>{const p=r.pols[k];if(!p)return null;return cat==='all'?p.rate:bd.combos.get(p.combo)?.cats[cat]?.rate??null;},label:k=>polName(k)};
  else if(bd.kind==='run'&&bd.catKind==='task'&&cat==='all')comps={kind:'task',keys:bd.cats.map(c=>c.id),get:(r,k)=>r.cats[k]?.rate??null,label:k=>bd.cats.find(c=>c.id===k)?.label||k};
  const legend=comps?.kind==='pol'?`<div class="legend">${comps.keys.map(k=>`<span class="key"><svg viewBox="-6 -6 12 12" aria-hidden="true">${shape(polIdx(k),0,0,4.6)}</svg>${esc(polName(k))}</span>`).join('')}<span class="key"><svg viewBox="0 0 14 10" aria-hidden="true"><rect x="2" y="1" width="10" height="9" rx="2" style="fill:color-mix(in oklab,var(--ink) 9%,var(--surface))"/><path d="M2 1.5h10" style="stroke:var(--ink-2)" stroke-width="2"/></svg>跨策略平均</span></div>`
    :comps?.kind==='task'?`<div class="legend"><span class="key"><svg viewBox="0 0 10 10" aria-hidden="true"><circle cx="5" cy="5" r="3.4" style="fill:var(--muted)"/></svg>单个任务</span><span class="key"><svg viewBox="0 0 14 10" aria-hidden="true"><rect x="2" y="1" width="10" height="9" rx="2" style="fill:color-mix(in oklab,var(--acc) 26%,var(--surface))"/><path d="M2 1.5h10" style="stroke:var(--acc)" stroke-width="2"/></svg>任务平均</span></div>`:'';
  const ttl=bd.kind==='pro'?`${bd.cats.find(c=>c.id===cat)?.label} 扰动`:bd.title;
  return `${scopeBar(bd,done.length)}<div class="card chart-card"><div class="chart-head"><div><h3>${esc(ttl)} · 按成功率排列</h3><p>柱高 = ${esc(scopeLabel(bd).join(' · '))} 的成功率；从左到右名次递减。${comps?.kind==='pol'?'彩色标记为各动作策略的三种子均值，柱为它们的等权平均。':comps?.kind==='task'?'灰点为单个任务的成功率。':''}悬停或聚焦查看数值，点击打开详情。</p></div>${legend}</div>
    <div class="chart" id="mtn">${mountainSvg(bd,done,comps,q)}</div>
    ${pend.length?`<div class="pending-list"><span>覆盖未齐，暂不上山：</span>${pend.map(x=>`<span class="pb" data-row="${esc(x.r.id)}" title="${esc(x.r.name)}">${esc(x.r.name)}${bd.kind!=='encoder'?' · '+esc(polName(x.r.head)):''}</span>`).join('')}</div>`:''}</div>${notesBox(bd)}`;
}
function mountainSvg(bd,rows,comps,q){
  const n=rows.length,band=n>24?46:Math.max(46,Math.min(130,900/n)),L=50,R=16,T=30,Bm=132,ph=290,W=Math.round(L+R+band*n),H=T+ph+Bm;
  const y=v=>T+(1-v)*ph,base=y(0),cw=Math.min(26,band*.5),out=[];
  out.push(`<g class="grid">${[0,.2,.4,.6,.8,1].map(v=>`<line x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}"/><text x="${L-8}" y="${y(v)+4}" text-anchor="end">${v*100}%</text>`).join('')}</g>`);
  out.push(`<g class="axis"><line x1="${L}" x2="${W-R}" y1="${base}" y2="${base}"/></g>`);
  rows.forEach((x,i)=>{
    const r=x.r,cx=L+band*(i+.5),x0=cx-cw/2,x1=cx+cw/2,yt=y(x.s),h=base-yt,rad=Math.min(4,h);
    const vals=comps?comps.keys.map(k=>({k,v:comps.get(r,k)})).filter(o=>fin(o.v)):[];
    const topY=Math.min(yt,...vals.map(o=>y(o.v)));
    const pol=bd.kind!=='encoder'?` · ${polName(r.head)}`:'';
    const tip=[`${r.name}${pol}`,`${scopeLabel(bd)[0]}：${pcs(x.s)} · 名次 ${x.rank}`,...vals.slice(0,12).map(o=>`${comps.label(o.k)}：${pcs(o.v)}`)].join('\n');
    const dim=q&&!`${r.encoder} ${r.name} ${polName(r.head)}`.toLowerCase().includes(q);
    const label=`${r.name}${bd.kind==='pro'||bd.kind==='combo'?' · '+(r.polLabel||polName(r.head)):''}`;
    const [mk,mc]=ENC[r.encoder]||[String(r.encoder).slice(0,3).toUpperCase(),'#6d7680'];
    const k=vals.length,dx=k>1?Math.min(comps.kind==='pol'?7:4.2,(band*.7)/k):0;
    out.push(`<g class="col" data-row="${esc(r.id)}" data-tip="${esc(tip)}" tabindex="0" role="button" aria-label="${esc(tip.replaceAll('\n','，'))}" ${dim?'opacity=".25"':''}>
      <rect class="bg" x="${cx-band/2}" y="${T-14}" width="${band}" height="${ph+Bm+10}" rx="8"/>
      ${h>.5?`<path class="colfill ${comps?.kind==='pol'?'neutral':''}" d="M${x0} ${base}V${yt+rad}Q${x0} ${yt} ${x0+rad} ${yt}H${x1-rad}Q${x1} ${yt} ${x1} ${yt+rad}V${base}Z"/>`:''}
      <line class="cap ${comps?.kind==='pol'?'neutral':''}" x1="${x0}" x2="${x1}" y1="${yt}" y2="${yt}"/>
      ${vals.map((o,j)=>comps.kind==='pol'?shape(polIdx(o.k),cx+(j-(k-1)/2)*dx,y(o.v),4.6,'class="dot"'):`<circle class="dot" cx="${cx+(j-(k-1)/2)*dx}" cy="${y(o.v)}" r="3.2" style="fill:var(--muted);fill-opacity:.75"/>`).join('')}
      ${band>=30?`<text class="val" x="${cx}" y="${topY-9}" text-anchor="middle">${pc(x.s)}</text>`:''}
      <text class="rkn" x="${cx}" y="${base+16}" text-anchor="middle">${String(x.rank).padStart(2,'0')}</text>
      <rect x="${cx-15}" y="${base+23}" width="30" height="17" rx="5" style="fill:color-mix(in oklab,${mc} 15%,var(--surface));stroke:color-mix(in oklab,${mc} 35%,transparent)"/>
      <text x="${cx}" y="${base+35}" text-anchor="middle" style="fill:${mc};font:650 9.5px var(--mono)">${esc(mk)}</text>
      <text class="name" transform="translate(${cx+4} ${base+52}) rotate(-38)" text-anchor="end">${esc(label.length>24?label.slice(0,23)+'…':label)}</text></g>`);
  });
  const responsive=n<=24;
  const padL=Math.max(0,Math.min(170,(rows[0]?.r.name.length||10)*6.2)-band*.5);
  return `<svg viewBox="${-padL} 0 ${W+padL} ${H}" ${responsive?`width="${W+padL}" style="height:auto;max-width:100%"`:`width="${W+padL}" height="${H}"`} role="img" aria-label="性能山：${esc(bd.title)}，共 ${n} 个完整结果">${out.join('')}</svg>`;
}

/* ---------- 逐任务 matrix ---------- */
function matrixSpec(bd){
  if(bd.kind==='pro')return {groups:bd.cats.map(c=>({id:c.id,label:`${c.label} 扰动`,cols:SUITE_ORDER.map(s=>({id:`${c.id}|${s}`,label:suiteName(s),title:`${c.label} 扰动 · ${suiteName(s)}`}))})),
    value:(r,col)=>{const [p,s]=col.id.split('|');const c=r.cats[p];return {rate:c?.suites?.[s]?.rate??null,succ:c?.suites?.[s]?.succ,ep:c?.suites?.[s]?.ep};},wide:true,click:false};
  const cols=bd.taskCols;
  if(bd.bench.id==='libero'){const groups=SUITE_ORDER.filter(s=>cols.some(c=>c.group===s)).map(s=>({id:s,label:`${suiteName(s)} · ${SUITES[s][1]}`,cols:cols.filter(c=>c.group===s)}));
    return {groups,value:(r,col)=>r.tasks?.[col.id]||{rate:null},wide:false,click:true};}
  return {groups:[{id:'all',label:shortTrack(bd.track),cols}],value:(r,col)=>r.tasks?.[col.id]||r.cats?.[col.id]||{rate:null},wide:true,click:true};
}
function matrixView(b){
  const bd=activeBoard(b,'matrix');if(!bd)return emptyBox('当前版本没有逐任务结果');
  const rows=visibleRows(bd),spec=matrixSpec(bd),flat=spec.groups.flatMap(g=>g.cols.map((c,i)=>({...c,first:i===0})));
  const head1=`<tr><th class="rowh" rowspan="2" style="text-align:left;font:600 11px var(--font);color:var(--muted)">名次 · 编码器${bd.kind!=='encoder'?' · 策略':''}</th>${spec.groups.map(g=>`<th class="g" colspan="${g.cols.length}">${esc(g.label)}</th>`).join('')}<th class="sum" rowspan="2">${esc(scopeLabel(bd)[0])}</th></tr>`;
  const head2=`<tr>${flat.map(c=>`<th class="ch ${c.first?'first':''}" ${spec.click?`data-task="${esc(c.id)}"`:''} data-tip="${esc(c.title)}" ${spec.wide?'style="font:500 10.5px var(--font);white-space:normal;line-height:1.15;padding:2px 3px"':''}>${esc(spec.wide?c.label:c.label)}</th>`).join('')}</tr>`;
  const body=rows.map(x=>{const r=x.r;
    return `<tr><th class="rowh" scope="row" data-row="${esc(r.id)}" style="cursor:pointer;font-weight:400"><div class="enc">${rankBadge(x.rank)}${encMark(r.encoder)}<div class="enc-t"><b>${esc(r.name)}</b><small>${bd.kind!=='encoder'?esc(r.polLabel||polName(r.head)):esc(rowSub(bd,r))}</small></div></div></th>
      ${flat.map(c=>{const v=spec.value(r,c),tip=`${r.name}${bd.kind!=='encoder'?' · '+polName(r.head):''}\n${c.title}\n${bd.single?(fin(v.rate)?(v.rate>0?'成功':'未成功'):'—'):pcs(v.rate)}${fin(v.succ)&&fin(v.ep)?` · ${v.succ}/${v.ep} 回合`:''}`;
        const inner=bd.single?(fin(v.rate)?`<span class="${v.rate>0?'':'na'}" style="--v:${v.rate>0?.5:0}">${v.rate>0?'✓':'✕'}</span>`:'<span class="na">·</span>')
          :fin(v.rate)?`<span class="${hiText(v.rate)?'hi':''}" style="--v:${heat(v.rate)}">${Math.round(100*v.rate)}</span>`:'<span class="na">·</span>';
        return `<td class="c ${c.first?'first':''}" ${spec.click?`data-task="${esc(c.id)}"`:''} data-tip="${esc(tip)}">${inner}</td>`;}).join('')}
      <td class="sum">${pc(x.s)}</td></tr>`;}).join('');
  return `${scopeBar(bd,rows.length)}<div class="mx-wrap" role="region" aria-label="逐任务成功率" tabindex="0"><table class="mx ${spec.wide?'wide':''}"><thead>${head1}${head2}</thead><tbody>${body}</tbody></table></div>
    <div style="margin-top:10px">${heatLegend(bd)}</div>${notesBox(bd)}`;
}

/* ---------- content dispatch ---------- */
function content(b){
  switch(S.view){
    case 'rank':case 'combos':return rankView(b);
    case 'mountain':return mountainView(b);
    case 'matrix':return matrixView(b);
    case 'videos':return videosView(b);
    default:return aboutView(b);
  }
}
function boardPage(){
  const b=B(),vs=views(b);if(!vs.includes(S.view))S.view=vs[0];
  if(['rank','combos','mountain','matrix'].includes(S.view))currentTrack(b,S.view);
  return `<div class="wrap">${rail()}${hero(b)}${tabs(b,vs)}<div id="filters">${filters(b)}</div><div id="content">${content(b)}</div></div>`;
}
function render(){
  if(!DATA)return;
  setAccent(S.page==='board'?S.bench:'libero');
  renderNav();
  const main=$('#main');
  main.innerHTML=S.page==='atlas'?atlasPage():S.page==='method'?methodPage():S.page==='log'?logPage():boardPage();
  afterRender();writeRoute();
  if(S.drawer)renderDrawer();else hideDrawer();
}
function renderContent(){const b=B();$('#content').innerHTML=content(b);afterRender();writeRoute();}
function afterRender(){
  initVideos();if(S.page==='board'&&S.view==='about')renderDirectory();
  // a table that fits keeps its header sticky under the site header; a wider one scrolls inside its own frame
  for(const el of $$('.board')){el.classList.remove('scroll');const t=el.querySelector('table');if(t&&t.scrollWidth>el.clientWidth+2)el.classList.add('scroll');}
}
window.addEventListener('resize',()=>{clearTimeout(window.__rz);window.__rz=setTimeout(()=>{for(const el of $$('.board')){el.classList.remove('scroll');const t=el.querySelector('table');if(t&&t.scrollWidth>el.clientWidth+2)el.classList.add('scroll');}},150);});

/* ---------- drawer ---------- */
function findRow(id){
  const b=B();
  for(const v of ['rank','combos','mountain','matrix']){const bd=activeBoard(b,v);if(!bd)continue;const r=bd.rows.find(x=>x.id===id);if(r)return {bd,r};
    if(bd.combos?.has(id)){const cb=getBoard(b,bd.track,'auto');return {bd:cb,r:cb.rows.find(x=>x.id===id)};}}
  for(const t of b.tracks||[]){const bd=getBoard(b,t,'auto');const r=bd.rows.find(x=>x.id===id);if(r)return {bd,r};}
  return null;
}
function openDrawer(key){S.drawer=key;renderDrawer();writeRoute();}
function hideDrawer(){$('#drawer').classList.remove('on');$('#scrim').classList.remove('on');$('#drawer').setAttribute('aria-hidden','true');$$('#drawer video').forEach(v=>v.pause());}
function closeDrawer(){S.drawer='';hideDrawer();writeRoute();lastFocus?.focus?.();}
let lastFocus=null;
function renderDrawer(){
  const [kind,...rest]=S.drawer.split(':'),id=rest.join(':');let html='',eyebrow='';
  if(kind==='r'){const f=findRow(id);if(!f){S.drawer='';hideDrawer();return;}html=rowDrawer(f.bd,f.r);eyebrow=`${bmeta(f.bd.bench.id).name||f.bd.bench.name} · ${shortTrack(f.bd.track)}`;}
  else if(kind==='t'){const b=B(),t=(b.tasks||[]).find(x=>x.id===id);if(!t){S.drawer='';hideDrawer();return;}html=taskDrawer(b,t);eyebrow=`${bmeta(b.id).name||b.name} · 任务`;}
  else{hideDrawer();return;}
  $('#drawer-eyebrow').textContent=eyebrow;$('#drawer-body').innerHTML=html;$('#drawer-body').scrollTop=0;
  $('#drawer').classList.add('on');$('#scrim').classList.add('on');$('#drawer').setAttribute('aria-hidden','false');
  initVideos();setTimeout(()=>$('#drawer .x')?.focus(),40);
}
const bRow=(label,rate,sub='',attrs='')=>`<div class="brow ${attrs?'click':''}" ${attrs}><span class="lbl">${label}</span><span class="bar"><i style="width:${fin(rate)?(100*rate).toFixed(1):0}%"></i></span><span class="v">${pcs(rate)}${sub?`<small>${esc(sub)}</small>`:''}</span></div>`;
function encHead(r,extra=''){
  const m=encMeta(r.encoder),links=[m.paperUrl&&`<a class="link" href="${esc(safeUrl(m.paperUrl))}" target="_blank" rel="noopener">论文 ↗</a>`,m.projectUrl&&`<a class="link" href="${esc(safeUrl(m.projectUrl))}" target="_blank" rel="noopener">项目 ↗</a>`].filter(Boolean).join(' · ');
  return `<div class="d-h">${encMark(r.encoder)}<div><h2>${esc(r.name)} ${extra}</h2><p>${esc([m.family,m.publicationDate?`${m.publicationLabel||'发布'} ${dateDot(m.publicationDate)}`:''].filter(Boolean).join(' · ')||r.label||'')}${links?` · ${links}`:''}</p>${m.focus?`<p class="muted" style="font-size:12.5px">${esc(m.focus)}</p>`:''}</div></div>`;
}
function taskHeat(bd,r){
  const cols=bd.taskCols||[];if(!cols.length||!r.tasks)return '';
  const groups=bd.bench.id==='libero'?SUITE_ORDER.filter(s=>cols.some(c=>c.group===s)).map(s=>[`${suiteName(s)} · ${SUITES[s][1]}`,cols.filter(c=>c.group===s)]):[['',cols]];
  return `<div class="d-sec"><h3>逐任务成功率 <small>${bd.kind==='combo'?'三种子均值，收齐 60 回合才显示':'点击任务查看视频与对比'}</small></h3>${groups.map(([g,cs])=>`${g?`<div class="hm-group">${esc(g)}</div>`:''}<div class="hm">${cs.map(c=>{const v=r.tasks[c.id];
    if(!v)return `<button class="na" data-task="${esc(c.id)}" data-tip="${esc(c.title)}\n未评估">${esc(c.label)}<small>—</small></button>`;
    const rate=v.rate;return `<button class="${fin(rate)?(hiText(rate)?'hi':''):'na'}" style="--v:${heat(rate)}" data-task="${esc(c.id)}" data-tip="${esc(`${c.title}\n${pcs(rate)}${fin(v.succ)?` · ${v.succ}/${v.ep} 回合`:''}`)}">${esc(c.label.length>8?c.label.slice(0,7)+'…':c.label)}<small>${fin(rate)?pc(rate,0)+'%':(v.ep?`${v.ep}/${v.exp||'—'}`:'—')}</small></button>`;}).join('')}</div>`).join('')}</div>`;
}
function rowDrawer(bd,r){
  const s=rowScore(bd,r),x=rankRows(bd).find(o=>o.r.id===r.id),N=rankRows(bd).filter(o=>o.rank!=null).length;
  let h=encHead(r,bd.kind!=='encoder'?polBadge(r.head):'');
  h+=`<div class="d-big"><b>${bd.single?(fin(s)?(s>0?'成功':'未成功'):'—'):pcs(s)}</b><span>${esc(scopeLabel(bd).join(' · '))}${x?.rank?` · 名次 ${x.rank} / ${N}`:''}${fin(rowStd(bd,r))?` · 种子间 ± ${(100*rowStd(bd,r)).toFixed(1)}`:''}</span></div>${coverCell(r.cover)}`;
  if(bd.kind==='encoder'){
    h+=`<div class="d-sec"><h3>各动作策略 <small>三种子均值 · 点击查看该组合</small></h3><div class="blist">${bd.pols.map(k=>{const p=r.pols[k];return bRow(polBadge(k),p?.rate,p?`${p.done}/3 种子`:'无',p?.combo?`data-row="${esc(p.combo)}"`:'');}).join('')}</div></div>`;
    h+=`<div class="d-sec"><h3>各任务分类 <small>${S.pol==='all'?'跨策略等权':polName(S.pol)}</small></h3><div class="blist">${bd.cats.map(c=>{const v=S.pol==='all'?r.cats[c.id]:bd.combos.get(r.pols[S.pol]?.combo)?.cats[c.id];return bRow(`${esc(c.label)} <span class="muted">${esc(c.title)}</span>`,v?.rate,v?.total&&S.pol==='all'?`${v.done}/${v.total} 策略`:'');}).join('')}</div></div>`;
    if(bd.method)h+=`<div class="callout">${esc(bd.method)}</div>`;
  }else if(bd.kind==='combo'){
    const c=r.ref;
    h+=`<div class="d-sec"><h3>训练种子 <small>每个种子 800 回合（40 任务 × 20 个评估 seed）</small></h3><table class="seed-t"><thead><tr><th>种子</th><th>成功率</th><th>成功 / 有效</th><th>状态</th></tr></thead><tbody>${(c.seedRates||[]).map(z=>`<tr><td>${z.seed}</td><td><b>${pcs(z.successRate)}</b></td><td>${z.successes??'—'} / ${num(z.episodes)}</td><td>${z.complete?'完整':'评估中'}</td></tr>`).join('')||'<tr><td colspan="4">尚无</td></tr>'}</tbody></table></div>`;
    h+=`<div class="d-sec"><h3>各任务分类 <small>三种子均值 ± 种子间标准差</small></h3><div class="blist">${bd.cats.map(cc=>{const v=r.cats[cc.id];return bRow(`${esc(cc.label)} <span class="muted">${esc(cc.title)}</span>`,v?.rate,fin(v?.std)?`± ${(100*v.std).toFixed(1)}`:(v?`${v.done}/3 种子`:''));}).join('')}</div></div>`;
    h+=taskHeat(bd,r);
    h+=`<div class="d-sec"><h3>冻结身份</h3><dl class="kv"><dt>动作策略版本</dt><dd class="mono">${esc(c.policyFamily||'—')}</dd><dt>模型</dt><dd class="mono">${(c.runIds||[]).map(esc).join('<br>')}</dd></dl></div>`;
  }else if(bd.kind==='pro'){
    h+=`<div class="d-sec"><h3>四类扰动 <small>各自独立计分，不合成总分</small></h3><div class="blist">${bd.cats.map(c=>{const v=r.cats[c.id];return bRow(esc(c.label),v?.rate,v?`${v.done}/3 种子`:'');}).join('')}</div></div>`;
    h+=`<div class="d-sec"><h3>扰动 × 原始任务分类</h3><table class="seed-t"><thead><tr><th></th>${SUITE_ORDER.map(s=>`<th>${suiteName(s)}</th>`).join('')}</tr></thead><tbody>${bd.cats.map(c=>`<tr><td>${esc(c.label)}</td>${SUITE_ORDER.map(s=>`<td>${pcs(r.cats[c.id]?.suites?.[s]?.rate)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    const models=Object.values(r.cats).flatMap(c=>c.models.map(m=>({...m,p:c.label})));
    if(models.length)h+=`<div class="d-sec"><h3>审计身份 <small>${models.length} 个完整模型评估</small></h3><table class="seed-t"><thead><tr><th>扰动</th><th>种子</th><th>成功率</th><th>Checkpoint</th></tr></thead><tbody>${models.map(m=>`<tr><td>${esc(m.p)}</td><td>${m.trainingSeed}</td><td>${pcs(m.successRate)}</td><td class="mono">${esc(String(m.checkpointSha256||'').slice(0,12))}</td></tr>`).join('')}</tbody></table></div>`;
    h+=`<div class="callout">${esc(bd.method)}</div>`;
  }else{
    const ref=r.ref;
    h+=`<div class="d-sec"><dl class="kv"><dt>成功 / 有效</dt><dd>${ref.successes??'—'} / ${num(ref.episodes)}${ref.expectedEpisodes&&ref.expectedEpisodes!==ref.episodes?`（目标 ${num(ref.expectedEpisodes)}）`:''}</dd><dt>训练种子</dt><dd>${esc(ref.trainingSeed??(bd.seeds||[]).join(' / '))}</dd>${ref.label?`<dt>记录</dt><dd>${esc(ref.label)}</dd>`:''}${ref.instructionProfile?`<dt>指令设置</dt><dd class="mono">${esc(ref.instructionProfile)}</dd>`:''}${ref.steps?`<dt>步数</dt><dd>${ref.steps}</dd>`:''}${ref.server?`<dt>服务器</dt><dd>${esc(ref.server)}</dd>`:''}${ref.checkpointSha256?`<dt>Checkpoint</dt><dd class="mono">${esc(String(ref.checkpointSha256).slice(0,16))}</dd>`:''}<dt>状态</dt><dd>${esc(statusLabel(ref))}</dd></dl></div>`;
    h+=taskHeat(bd,r);
    if(bd.method)h+=`<div class="callout">${esc(bd.method)}</div>`;
  }
  return h;
}

/* ---------- events ---------- */
function selectBench(id){
  if(!benchById(id))return;
  const prevView=S.view;Object.assign(S,{page:'board',bench:id,track:'',cat:'all',suite:'all',pol:'all',q:'',dir:-1,drawer:'',gcat:'all',gq:'',gtask:'',gpage:0});
  const vs=views(B());S.view=vs.includes(prevView)?prevView:vs[0];render();
}
function setTheme(t){try{if(t==='auto')localStorage.removeItem('mve-theme');else localStorage.setItem('mve-theme',t);}catch{}
  if(t==='auto')document.documentElement.removeAttribute('data-theme');else document.documentElement.dataset.theme=t;
  const btn=$('#theme');if(btn){btn.innerHTML=icon(t==='dark'?'moon':t==='light'?'sun':'auto');btn.title={auto:'主题：跟随系统',light:'主题：浅色',dark:'主题：深色'}[t];btn.dataset.mode=t;}}
document.addEventListener('click',e=>{
  const g=s=>e.target.closest(s);let el;
  if((el=g('[data-close]'))){closeDrawer();return;}
  if((el=g('#theme'))){const order=['auto','light','dark'];setTheme(order[(order.indexOf(el.dataset.mode||'auto')+1)%3]);return;}
  if((el=g('[data-page]'))){S.page=el.dataset.page;S.drawer='';render();window.scrollTo(0,0);return;}
  if((el=g('[data-bench]'))){selectBench(el.dataset.bench);return;}
  if((el=g('[data-go-bench]'))){selectBench(el.dataset.goBench);if(el.dataset.goView&&views(B()).includes(el.dataset.goView)){S.view=el.dataset.goView;render();}window.scrollTo(0,0);return;}
  if((el=g('[data-view]'))){S.view=el.dataset.view;S.drawer='';if(S.view==='videos'&&!SUITE_ORDER.includes(S.cat))S.cat='all';render();return;}
  if((el=g('[data-sort]'))){S.dir=-S.dir;renderContent();return;}
  if((el=g('[data-cat]'))){const v=el.dataset.cat;if(S.cat===v&&v!=='all')S.dir=-S.dir;else{S.cat=v;S.dir=-1;}renderBoardParts();return;}
  if((el=g('[data-vcat]'))){S.cat=el.dataset.vcat;renderBoardParts();return;}
  if((el=g('[data-pol]'))){const v=el.dataset.pol;S.pol=S.pol===v&&v!=='all'?'all':v;renderBoardParts();return;}
  if((el=g('[data-suite]'))){S.suite=el.dataset.suite;renderBoardParts();return;}
  if((el=g('[data-mode]'))){S.mode=el.dataset.mode;renderBoardParts();return;}
  if((el=g('[data-row]'))){lastFocus=el;openDrawer('r:'+el.dataset.row);return;}
  if((el=g('[data-task]'))){lastFocus=el;openDrawer('t:'+el.dataset.task);return;}
});
function renderBoardParts(){$('#filters').innerHTML=filters(B());renderContent();}
document.addEventListener('change',e=>{if(e.target.id==='track'){S.track=e.target.value;S.cat='all';S.suite='all';renderBoardParts();}});
let qTimer=0;
document.addEventListener('input',e=>{if(e.target.id==='q'){S.q=e.target.value;clearTimeout(qTimer);qTimer=setTimeout(renderContent,120);}});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&S.drawer){closeDrawer();return;}
  if(e.key==='Enter'||e.key===' '){const el=e.target.closest('tr[data-row],g[data-row]');if(el){e.preventDefault();lastFocus=el;openDrawer('r:'+el.dataset.row);}}
});
// tooltip
const tip=()=>$('#tip');
function showTip(el,ev){const t=el.dataset.tip;if(!t)return;const n=tip();n.textContent=t;n.classList.add('on');placeTip(el,ev);}
function placeTip(el,ev){const n=tip(),r=el.getBoundingClientRect(),w=n.offsetWidth,h=n.offsetHeight;
  let x=ev?.clientX??(r.left+r.width/2),y=(ev?.clientY??r.top)-h-14;if(y<8)y=(ev?.clientY??r.bottom)+16;x=Math.min(window.innerWidth-w-8,Math.max(8,x-w/2));n.style.left=x+'px';n.style.top=y+'px';}
document.addEventListener('mouseover',e=>{const el=e.target.closest('[data-tip]');if(el)showTip(el,e);});
document.addEventListener('mousemove',e=>{const el=e.target.closest('[data-tip]');if(el&&tip().classList.contains('on'))placeTip(el,e);});
document.addEventListener('mouseout',e=>{const el=e.target.closest('[data-tip]');if(el&&!el.contains(e.relatedTarget))tip().classList.remove('on');});
document.addEventListener('focusin',e=>{const el=e.target.closest('[data-tip]');if(el)showTip(el);});
document.addEventListener('focusout',()=>tip().classList.remove('on'));
window.addEventListener('scroll',()=>tip().classList.remove('on'),{passive:true});
window.addEventListener('hashchange',()=>{if(!DATA)return;const before=location.hash;readRoute();render();if(location.hash!==before)return;});

/* ---------- boot ---------- */
(async function boot(){
  let saved='auto';try{saved=localStorage.getItem('mve-theme')||'auto';}catch{}
  setTheme(saved);readRoute();setAccent(S.page==='board'?S.bench:'libero');
  const main=$('#main');
  main.innerHTML=`<div class="loading" role="status"><b>正在载入已核验的评测数据</b><div class="bar indet"><i></i></div><small id="load-msg">data.json</small></div>`;
  try{
    await loadAll((got,total)=>{const msg=$('#load-msg'),bar=$('.loading .bar');if(!msg)return;
      if(total&&got<=total){bar.classList.remove('indet');bar.firstElementChild.style.width=`${Math.round(100*got/total)}%`;}
      msg.textContent=`${(got/1048576).toFixed(1)} MB${total&&got<=total?` / ${(total/1048576).toFixed(1)} MB`:''}`;});
    if(!benchById(S.bench))S.bench=DATA.benchmarks[0].id;
    render();
  }catch(err){main.innerHTML=`<div class="wrap"><div class="alert" role="alert"><b>暂时无法读取评测数据</b><p>${esc(err.message)}</p><button class="btn" onclick="location.reload()">重新载入</button></div></div>`;}
})();
