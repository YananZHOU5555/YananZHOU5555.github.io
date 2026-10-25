'use strict';
/* MVE leaderboard v2 · shell, ranked dot plots (榜单, which also replaced the old 性能山), 逐任务, drawer, events, boot.
   Every view reads the same normalized board (explorer.js), so a benchmark looks the same in all of them. */

const heat=r=>fin(r)?(.07+.78*r).toFixed(3):0;
const hiText=r=>fin(r)&&r>.58;
function setAccent(id){const s=bstyle(id),st=document.documentElement.style;st.setProperty('--acc-l',s.l);st.setProperty('--acc-d',s.d);}
const statusPill=b=>isPlanned(b)?'<span class="pill plan"><i></i>尚未接入</span>':b.status==='diagnostic'?'<span class="pill diag"><i></i>独立诊断</span>':'<span class="pill live"><i></i>持续评测</span>';
const rankBadge=k=>k==null?'<span class="rk na">—</span>':`<span class="rk ${k<=3?'m'+k:''}">${String(k).padStart(2,'0')}</span>`;

/* ---------- navigation ---------- */
function renderNav(){
  for(const el of $$('[data-page]'))el.setAttribute('aria-current',el.dataset.page===S.page?'page':'false');
  const snapshot=DATA?.generatedAt||DATA?.updatedAt,t=snapshot?String(snapshot).replace('T',' ').slice(0,16)+' UTC':'';
  $('#snap').innerHTML=t?`<i></i><span>数据快照 </span><b class="t" style="font-weight:500">${esc(t)}</b>`:'';
}
function benchBlurb(b){
  if(isPlanned(b))return '计划中';
  const ts=b.tracks||[];
  const nat=ts.find(t=>t.encoderBoard);if(nat)return `${nat.encoderBoard.rows.length} 编码器 · ${nat.expectedCombinations||nat.combinations?.length} 组合`;
  const pro=ts.find(t=>t.proRows);if(pro)return `${new Set(pro.proRows.map(r=>r.encoder)).size} 编码器 · ${pro.proRows.length} 组合`;
  if(b.id==='robotwin2'){const pt=ts.find(t=>t.pairBoard);if(pt){const rs=pt.pairBoard.rows||[],ours=new Set((pt.pairBoard.groups||[]).filter(g=>g.ours).map(g=>g.id));
    return `${rs.filter(r=>ours.has(r.group)).length} 组 · 对照官方 ${rs.filter(r=>!ours.has(r.group)).length} 个方法`;}
    const g=new Set(ts.flatMap(t=>(t.runs||[]).map(r=>r.encoder)));return `${g.size} 组 · ${b.taskCount} 任务`;}
  return `${ts.reduce((n,t)=>n+(t.runs?.length||0),0)} 条诊断 · ${b.taskCount} 实例`;
}
function rail(){
  return `<nav class="rail" style="--n:${DATA.benchmarks.length}" aria-label="选择 benchmark">${DATA.benchmarks.map(b=>{const m=bmeta(b.id);
    return `<button class="chip-b ${isPlanned(b)?'planned':''}" style="${bcVars(b.id)}" data-bench="${esc(b.id)}" aria-current="${b.id===S.bench}">${tile(b.id)}<span><b>${esc(m.name||b.name)}</b><small>${esc(benchBlurb(b))}</small></span></button>`;}).join('')}</nav>`;
}
function heroStats(b){
  const ts=b.tracks||[],nat=ts.find(t=>t.encoderBoard),pro=ts.find(t=>t.proRows),pair=ts.find(t=>t.pairBoard);
  if(nat){const eb=getBoard(b,nat,'encoder'),sd=eb.seed,rows=eb.rows,ok=rows.filter(r=>fin(r.overall.rate)),top=[...ok].sort((a,c)=>c.overall.rate-a.overall.rate)[0];
    const cb=sd===null?null:getBoard(b,nat,'auto');   // the tiles follow 训练口径, as on LIBERO-PRO
    return [['视觉编码器',rows.length,`${ok.length} 个覆盖完整`],['策略组合',sd===null?`${nat.completeCombinations}/${nat.expectedCombinations}`:`${cb.rows.filter(r=>fin(r.overall.rate)).length}/${nat.expectedCombinations}`,sd===null?'完整 / 计划':`seed${sd} 完整 / 计划`],
      ['有效回合',num(sd===null?nat.auditedValidEpisodes:eb.episodes),`严格审计 · 训练种子 ${sd===null?(nat.trainingSeeds||[]).join(' / '):sd}`],
      top?[sd===null?'跨策略平均第 1':`seed${sd} 跨策略平均第 1`,pcs(top.overall.rate),top.name]:['训练种子',(nat.trainingSeeds||[]).join(' · '),'等权平均']];}
  if(pro){const bd=getBoard(b,pro,'auto'),eb=getBoard(b,pro,'proEncoder'),k=bd.cats.length,
      ranked=eb.rows.filter(r=>fin(r.overall?.rate)).sort((a,c)=>c.overall.rate-a.overall.rate),top=ranked[0];
    return [['视觉编码器',eb.rows.length,`${ranked.length} 个 ${eb.pols.length} 种策略齐全`],['编码器 × 策略',pro.proRows.length,`完整扰动格 ${bd.completeCells}/${pro.proRows.length*k}${bd.proSeed===null?'':` · seed${bd.proSeed}`}`],
      ['有效回合',num(bd.episodes),`严格审计 · 训练种子 ${bd.seeds.join(' / ')}`],
      top?['跨策略平均第 1',pcs(top.overall.rate),`${top.name} · 总分为 ${k} 类扰动均值`]:['训练种子',(pro.trainingSeeds||[]).join(' · '),'等权平均']];}
  if(pair)return pairStats(getBoard(b,pair,'auto'));
  if(b.id==='robotwin2'){const g=new Set(ts.flatMap(t=>(t.runs||[]).map(r=>r.encoder))),seeds=[...new Set(ts.flatMap(t=>t.trainingSeeds||[]))].sort();
    const main=ts[0];return [['编码器组',g.size,'R0 官方 DP + 冻结编码器'],['协议任务',`${new Set((main.runs||[]).flatMap(r=>(r.taskResults||[]).map(x=>x.taskId))).size} / 50`,`共评估 ${b.taskCount} 个任务`],['评估版本',ts.length,'Easy / Hard / 参照'],['训练种子',seeds.join(' · '),'序贯补种子']];}
  if(isPlanned(b))return [];
  const runs=ts.flatMap(t=>t.runs||[]);return [['扰动实例',b.taskCount,'已接入'],['诊断记录',runs.length,'单回合'],['有效回合',num(runs.reduce((n,r)=>n+(r.episodes||0),0)),'不排名'],['训练种子',[...new Set(ts.flatMap(t=>t.trainingSeeds||[]))].join(' · '),'']];
}
// Insight tiles for a two-metric board: the quoted board's size, our reproduction of its baseline, our best per metric.
function pairStats(bd){
  const R=bd.rows,src=bd.source||{},[c0,c1]=bd.cats.filter(c=>!c.derived),tot=bd.cats.find(c=>c.derived),v=(r,c)=>c?r?.cats[c.id]?.rate:null,out=[];
  // 总分 (the default ranking) first; the quoted board's size is then left to the benchmark chip and the source line
  const ourTot=tot?R.filter(r=>r.ours&&fin(v(r,tot))).sort((x,y)=>v(y,tot)-v(x,tot)):[];
  if(ourTot.length){const best=ourTot[0],peers=R.filter(r=>r.peer&&fin(v(r,tot))).sort((x,y)=>v(y,tot)-v(x,tot)),k=1+peers.filter(r=>v(r,tot)>v(best,tot)+1e-12).length;
    out.push([`我们最好的${tot.label}`,pc(v(best,tot)),`${best.name}（${c0.label} ${pc(v(best,c0))} / ${c1.label} ${pc(v(best,c1))}），同口径第 ${k}${k>1?`（${peers[0].name} ${pc(v(peers[0],tot))} 第 1）`:''}`]);}
  else if(src.methods)out.push(['官方榜',`${src.methods} 个方法`,`${src.tasks?`${src.tasks} 任务 · `:''}最新条目 ${dateDot(src.boardDate).slice(5)}`]);
  const h=bd.highlights?.reproduction,a=h&&R.find(r=>r.id===h.ours),o=h&&R.find(r=>r.id===h.official);
  if(a&&o&&fin(v(a,c0))&&fin(v(o,c0))){const d=100*Math.abs(v(a,c0)-v(o,c0));
    out.push([`${a.name.split(' · ')[0]} 与官方 ${o.name}（${c0.label}）`,`${pc(v(a,c0))} / ${pc(v(o,c0))}`,
      `${d<3?'复现对上':`相差 ${d.toFixed(1)} 个点`}${fin(v(a,c1))&&fin(v(o,c1))?`；${c1.label} ${pc(v(a,c1))} / ${pc(v(o,c1))}`:''}`]);}
  for(const c of [c0,c1].filter(Boolean)){
    const ours=R.filter(r=>r.ours&&fin(v(r,c))).sort((x,y)=>v(y,c)-v(x,c)),peers=R.filter(r=>r.peer&&fin(v(r,c))).sort((x,y)=>v(y,c)-v(x,c));
    if(!ours.length)continue;
    const best=ours[0],k=1+peers.filter(r=>v(r,c)>v(best,c)+1e-12).length,others=peers.filter(r=>!r.ours);
    out.push([`我们最好的 ${c.label}`,pc(v(best,c)),c===c0?`${best.name}，同口径第 ${k}${k>1?`（${peers[0].name} ${pc(v(peers[0],c))} 第 1）`:''}`
      :`${best.name}，同口径第 ${k}${others.length?`；${others.slice(0,2).map(r=>`${r.name} ${pc(v(r,c))}`).join('、')}`:''}`]);
  }
  return out.slice(0,4);
}
function hero(b){
  const m=bmeta(b.id),st=heroStats(b),src=m.projectUrl||b.sourceUrl;
  return `<section class="hero"><div class="hero-id">${tile(b.id,'l')}<div><h1>${esc(m.name||b.name)}${m.tagline?`<small>${esc(m.tagline)}</small>`:''}</h1>
    <p class="q">${esc(m.question||b.description)}</p>
    <div class="meta">${statusPill(b)}${m.publicationDate?`<span>${esc(m.publicationLabel||'发布')} · ${dateDot(m.publicationDate)}</span>`:''}
    ${src?`<a href="${esc(safeUrl(src))}" target="_blank" rel="noopener">官方项目 ↗</a>`:''}${m.paperUrl?`<a href="${esc(safeUrl(m.paperUrl))}" target="_blank" rel="noopener">论文 ↗</a>`:''}${m.scale?`<span>${esc(m.scale)}</span>`:''}</div></div></div>
    </section>${st.length?`<div class="kpis">${st.map(s=>`<div class="kpi"><span>${esc(s[0])}</span><b>${esc(s[1])}</b>${s[2]?`<small>${esc(s[2])}</small>`:''}</div>`).join('')}</div>`:''}`;
}
function tabCount(b,v){
  if(v==='rank'){const t=currentTrackFor(b,'rank');const bd=t&&getBoard(b,t,boardKind(b,'rank'));return bd?bd.rows.length:'';}
  if(v==='combos'){const t=b.tracks.find(t=>t.combinations||t.proRows);return t?(t.combinations||t.proRows).length:'';}
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
// 榜单 ranks encoders (user, 2026-10-23: the default ranking is the encoder mean); 组合 / 逐任务 keep encoder × policy rows
const boardKind=(b,v)=>b.id==='libero'&&['rank','capacity'].includes(v)?'encoder':b.id==='libero-pro'&&v==='rank'?'proEncoder':'auto';
function activeBoard(b=B(),v=S.view){if(!['rank','combos','matrix','capacity'].includes(v))return null;return getBoard(b,currentTrackFor(b,v),boardKind(b,v));}
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
  const pro=bd.kind==='pro'||bd.pro;
  // 训练口径 (user, 2026-10-23): the same buttons on every board with per-seed results — seed mean, then each training seed
  const seeds=trackSeeds(bd.track),on=bd.seed==null?'mean':String(bd.seed);
  if(seeds.length)parts.push(`<div class="fgroup"><span class="flabel">训练口径</span><div class="seg">${[['mean',seedMeanLabel(bd.track)],...seeds.map(s=>[String(s),`seed${s}`])].map(([k,l])=>
    `<button data-pro-seed="${k}" aria-pressed="${on===k}" title="${esc(k==='mean'?(bd.track.pairBoard?.seedMeanTitle||`${seeds.join(' / ')} 齐全后等权平均`):`训练 seed${k} · 单种子`)}">${esc(l)}</button>`).join('')}</div></div>`);
  if(bd.kind==='pair'){const cur=curCat(bd),n=k=>bd.rows.filter(r=>k==='all'||(k==='peer'&&r.peer)||(k==='ours'&&r.ours)).length;
    parts.push(`<div class="fgroup"><span class="flabel">口径</span><div class="seg">${bd.cats.map(c=>`<button data-cat="${esc(c.id)}" aria-pressed="${cur===c.id}" title="${esc(c.title||'')}">${esc(c.label)}</button>`).join('')}</div></div>`);
    if((bd.groups||[]).length>1)parts.push(`<div class="fgroup"><span class="flabel">显示</span><div class="seg">${[['ours','我们'],['peer','同口径'],['all','全部']].map(([k,l])=>`<button data-grp="${k}" aria-pressed="${S.grp===k}">${l}<span class="cnt">${n(k)}</span></button>`).join('')}</div></div>`);}
  else if(bd.catKind!=='task'&&bd.cats.length){const opts=pro?[{id:'all',label:'总分',title:`${bd.cats.length} 类扰动等权平均`},...bd.cats]:[{id:'all',label:'全部任务'},...bd.cats];const cur=curCat(bd);
    parts.push(`<div class="fgroup"><span class="flabel">${pro?'口径':'分类口径'}</span><div class="seg">${opts.map(c=>`<button data-cat="${esc(c.id)}" aria-pressed="${cur===c.id}" title="${esc(c.title||'')}">${esc(c.label)}</button>`).join('')}</div></div>`);}
  else if(bd.catKind==='task'&&curCat(bd)!=='all'){const c=bd.cats.find(x=>x.id===curCat(bd));
    parts.push(`<div class="fgroup"><span class="flabel">口径</span><div class="seg"><button data-cat="all" aria-pressed="false">全部任务</button><button aria-pressed="true">${esc(c.label)}</button></div></div>`);}
  if(pro)parts.push(`<div class="fgroup"><span class="flabel">任务集</span><div class="seg">${[['all','全部'],...SUITE_ORDER.map(s=>[s,suiteName(s)])].map(([k,l])=>`<button data-suite="${k}" aria-pressed="${S.suite===k}">${esc(l)}</button>`).join('')}</div></div>`);
  if(bd.pols.length>1)parts.push(`<div class="fgroup"><span class="flabel">动作策略</span><div class="seg">${[['all','全部']].concat(bd.pols.map(p=>[p,polName(p)])).map(([k,l])=>`<button data-pol="${esc(k)}" aria-pressed="${S.pol===k}">${k!=='all'&&polIdx(k)>=0?`<svg width="9" height="9" viewBox="-6 -6 12 12" aria-hidden="true">${shape(polIdx(k),0,0,4.6)}</svg>`:''}${esc(l)}</button>`).join('')}</div></div>`);
  if(v==='rank'&&bd.kind==='encoder')parts.push(`<div class="fgroup"><span class="flabel">明细列</span><div class="seg"><button data-mode="policy" aria-pressed="${S.mode==='policy'}">按动作策略</button><button data-mode="suite" aria-pressed="${S.mode==='suite'}">${bd.pro?'按扰动类别':'按任务分类'}</button></div></div>`);
  if(capacityApplies(bd))parts.push(`<div class="fgroup"><span class="flabel">视觉参数</span><div class="seg">${SIZE_TIERS.map(([k,l])=>`<button data-size="${k}" aria-pressed="${S.size===k}">${l}</button>`).join('')}</div></div>`);
  parts.push(searchBox(bd.kind==='encoder'?'搜索编码器…':bd.kind==='pair'?'搜索方法或团队…':'搜索编码器或策略…'));
  return `<div class="filters">${parts.join('')}</div>`;
}
const searchBox=ph=>`<label class="search">${icon('search')}<span class="sr-only">搜索</span><input id="q" type="search" value="${esc(S.q)}" placeholder="${esc(ph)}" autocomplete="off"></label>`;
function scopeBar(bd,shown){
  const total=bd.rows.filter(r=>inPool(bd,r)).length,done=rankRows(bd).filter(x=>x.rank!=null).length;
  return `<div class="scopebar">${scopeLabel(bd).map(p=>`<b>${esc(p)}</b>`).join('<span class="sep"></span>')}<span class="sep"></span><span>${shown<total?`显示 ${shown} / `:''}${total} 行 · ${done} 行覆盖完整</span>${bd.seeds?.length&&bd.kind!=='pair'?`<span class="sep"></span><span>训练种子 ${esc(bd.seeds.join(' / '))}</span>`:''}${bd.seedNote?`<span class="sep"></span><span>${esc(bd.seedNote)}</span>`:''}</div>`;
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
  if(bd.kind==='encoder'&&S.mode==='policy')return bd.pols.map(p=>({type:'pol',id:p,label:polName(p),title:`${polName(p)} · ${bd.seed==null?'三种子均值':`seed${bd.seed}`}`}));
  return bd.cats.map(c=>({type:'cat',id:c.id,label:c.label,title:c.title}));
}
function detailValue(bd,r,col){
  if(col.type==='pol'){const p=r.pols[col.id];if(!p)return {rate:null};
    if(bd.pro){const c=bd.combos.get(p.combo);return {rate:c?rowScore(bd.comboBoard,c,curCat(bd)):null};}
    if(curCat(bd)==='all')return {rate:p.rate};return {rate:bd.combos.get(p.combo)?.cats[curCat(bd)]?.rate??null};}
  if(bd.kind==='encoder'&&S.pol!=='all'){const c=bd.combos.get(r.pols[S.pol]?.combo);if(bd.pro)return {rate:c?rowScore(bd.comboBoard,c,col.id):null};return {rate:c?.cats[col.id]?.rate??null};}
  const c=r.cats[col.id];if(!c)return {rate:null};
  if((bd.kind==='pro'||bd.pro)&&S.suite!=='all')return {rate:c.suites?.[S.suite]?.rate??null};
  return c;
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
/* ---------- 榜单: one ranked dot plot for every board ----------
   Each row: rank · identity · a 0–100 track with the row's markers · numbers. Filled dot = the ranking score
   (two-metric boards: filled = first metric, ring = second); component markers keep one shape per policy / category. */
const PCT=v=>`${(100*Math.max(0,Math.min(1,v))).toFixed(2)}%`;
function shortScore(bd){const c=bd.cats.find(x=>x.id===curCat(bd));if(bd.kind==='encoder'&&S.pol!=='all')return polName(S.pol);return c?c.label:bd.kind==='pro'?'总分':'平均';}
function rowSubShort(bd,r){
  if(bd.kind==='pair')return r.sub;
  if(bd.kind==='encoder')return encMeta(r.encoder).family||'';
  if(bd.kind==='run')return bd.pols.length>1?polName(r.head):(encMeta(r.encoder).family||r.label||'');
  return r.polLabel||polName(r.head);
}
function dotSpec(bd){
  const cur=curCat(bd);
  if(bd.kind==='pair'){
    const cols=bd.cats.map(c=>({label:c.label,title:c.title,attr:`data-cat="${esc(c.id)}"`,on:cur===c.id,value:r=>r.cats[c.id]?.rate}));
    // first metric = filled dot, second = ring, both in the group color; 总分 (their mean) = the black dot between them
    const real=bd.cats.filter(c=>!c.derived);
    return {cols,essential:cols.length,line:r=>groupColor(bd,r.group),
      marks:r=>bd.cats.map(c=>c.derived?{v:r.cats[c.id]?.rate,cls:'dot mean',color:'var(--ink)',z:3}
        :{v:r.cats[c.id]?.rate,cls:real.indexOf(c)?'ring':'dot',color:groupColor(bd,r.group),z:real.indexOf(c)?1:2})};
  }
  const det=detailCols(bd),pol=det[0]?.type==='pol',many=det.length>6,main=pol?'var(--ink)':'var(--acc)';
  const comp=r=>det.map((c,i)=>{const v=detailValue(bd,r,c).rate;
    if(many)return {v,cls:'tiny',z:0};
    if(pol)return {v,svg:shape(polIdx(c.id),0,0,4.6),z:1};
    const hl=(bd.kind==='pro'||bd.pro)&&cur===c.id;return {v,svg:shape(i,0,0,4.3,'',hl?'var(--acc)':'var(--faint)'),z:hl?3:1};});
  const detCols=many?[]:det.map(c=>({label:c.label,title:c.title||c.label,attr:c.type==='pol'?`data-pol="${esc(c.id)}"`:`data-cat="${esc(c.id)}"`,
    on:c.type==='pol'?S.pol===c.id:cur===c.id,value:r=>detailValue(bd,r,c).rate}));
  const cols=[{label:shortScore(bd),title:scopeLabel(bd).join(' · '),attr:'data-sort',on:true,value:r=>rowScore(bd,r)},...detCols];
  return {cols,essential:1,line:()=>'var(--ink-2)',marks:r=>[...comp(r),{v:rowScore(bd,r),cls:'dot',color:main,z:2}]};
}
function dotHead(bd,spec){
  const who=bd.kind==='pair'?'方法':bd.kind==='encoder'||bd.pols.length<2?'视觉编码器':'编码器 · 动作策略';
  return `<div class="dp-head" role="row"><span class="dp-rk" role="columnheader">#</span><span class="dp-id" role="columnheader">${who}</span>
    <span class="dp-axis" role="columnheader" aria-label="成功率 0–100%">${[0,25,50,75,100].map(v=>`<i style="left:${v}%">${v}</i>`).join('')}</span>
    ${spec.cols.map((c,i)=>`<button class="dp-n hb${c.on?' on':''}${i>=spec.essential?' x':''}" role="columnheader" ${c.attr} aria-pressed="${c.on}" title="${esc(c.title||'')}">${esc(c.label)}${c.on?`<span class="arr">${S.dir<0?'↓':'↑'}</span>`:''}</button>`).join('')}</div>`;
}
function dotRow(bd,spec,x){
  const r=x.r,ms=spec.marks(r).filter(m=>fin(m.v)),vs=ms.map(m=>m.v),lo=Math.min(...vs),hi=Math.max(...vs),sub=rowSubShort(bd,r);
  const line=vs.length>1&&hi-lo>.004?`<i class="dp-line" style="left:${PCT(lo)};width:${(100*(hi-lo)).toFixed(2)}%;--gl:${spec.line(r)}"></i>`:'';
  const marks=ms.sort((a,c)=>(a.z||0)-(c.z||0)).map(m=>m.svg?`<svg class="dp-s" style="left:${PCT(m.v)}" viewBox="-6 -6 12 12">${m.svg}</svg>`
    :`<i class="dp-m ${m.cls}" style="left:${PCT(m.v)}${m.color?`;--g:${m.color}`:''}"></i>`).join('');
  const vals=spec.cols.map(c=>c.value(r));
  const tip=[`${r.name}${sub?` · ${sub}`:''}`,...spec.cols.map((c,i)=>`${c.title||c.label}：${pcs(vals[i])}`),x.rank?`名次 ${x.rank}`:'覆盖未齐，不排名'].join('\n');
  return `<div class="dp-row${r.ours&&S.grp!=='ours'?' ours':''}${fin(x.s)?'':' dim'}" role="row" tabindex="0" data-row="${esc(r.id)}" data-tip="${esc(tip)}" aria-label="${esc(tip.replaceAll('\n','，'))}">
    <span class="dp-rk${x.rank&&x.rank<=3?' lead':''}" role="cell">${x.rank??'—'}</span><span class="dp-id" role="cell">${rowMark(bd,r)}<b>${esc(r.name)}</b>${sub?`<small>${esc(sub)}${capacityApplies(bd)?` · ${capacityLabel(r)}`:''}</small>`:capacityApplies(bd)?`<small>${capacityLabel(r)}</small>`:''}</span>
    <span class="dp-track" role="cell" aria-hidden="true">${line}${marks}</span>${spec.cols.map((c,i)=>`<span class="dp-n${c.on?' on':''}${i>=spec.essential?' x':''}" role="cell">${fin(vals[i])?pc(vals[i]):'—'}</span>`).join('')}</div>`;
}
function dotLegend(bd){
  const k=[],mk=(cls,c)=>`<i class="lg-m ${cls}" style="--g:${c}"></i>`,sv=x=>`<svg class="lg-s" viewBox="-6 -6 12 12" aria-hidden="true">${x}</svg>`;
  if(bd.kind==='pair'){
    // in the default view (ours only) the group squares would all say the same thing: show them once the quoted groups are in
    if(S.grp!=='ours')for(const g of bd.groups||[])k.push(`<span class="key"><i class="lg-sq" style="--g:${groupColor(bd,g.id)}"></i>${esc(g.label)}</span>`);
    const real=bd.cats.filter(c=>!c.derived),tot=bd.cats.find(c=>c.derived),ec=S.grp==='ours'?'var(--acc)':'var(--ink-2)';
    if(tot)k.push(`<span class="key">${mk('dot mean','var(--ink)')}${esc(tot.label)}（${esc(real.map(c=>c.label).join('、'))} 平均）</span>`);
    k.push(`<span class="key">${mk('dot',ec)}${esc(real[0]?.label||'')}${real[1]?`<span class="gap"></span>${mk('ring',ec)}${esc(real[1].label)}`:''}</span>`);
  }else{
    const det=detailCols(bd),pol=det[0]?.type==='pol',cur=curCat(bd);
    const mainLbl=cur==='all'&&bd.kind==='encoder'&&S.pol==='all'?(bd.pro?`跨策略平均（各策略总分，总分为 ${bd.cats.length} 类扰动均值）`:'跨策略平均'):cur==='all'&&bd.kind==='pro'?`总分（${det.length} 类均值）`:shortScore(bd);
    k.push(`<span class="key">${mk('dot',pol?'var(--ink)':'var(--acc)')}${esc(mainLbl)}</span>`);
    if(det.length>6)k.push(`<span class="key"><i class="lg-m tiny"></i>单个${bd.catKind==='task'?'任务':'分类'}</span>`);
    else det.forEach((c,i)=>k.push(`<span class="key">${sv(pol?shape(polIdx(c.id),0,0,4.6):shape(i,0,0,4.3,'',(bd.kind==='pro'||bd.pro)&&cur===c.id?'var(--acc)':'var(--faint)'))}${esc(c.label)}</span>`));
  }
  k.push(`<span class="key muted">点击表头切换排序 · 点击行查看逐任务</span>`);
  return `<div class="legend dp-legend">${k.join('')}</div>`;
}
function sourceLine(bd){
  const s=bd.source;if(!s)return '';
  return `<p class="src-line">${icon('info')}<span>${esc(s.label)}：最新条目 ${esc(dateDot(s.boardDate))}，${esc(dateDot(s.retrieved))} 取数。只在同样的任务上重新求均值，是引用不是复现。</span>${s.url?`<a class="link" href="${esc(safeUrl(s.url))}" target="_blank" rel="noopener">官方榜 ↗</a>`:''}${s.paperUrl?`<a class="link" href="${esc(safeUrl(s.paperUrl))}" target="_blank" rel="noopener">论文 ↗</a>`:''}</p>`;
}
function rankView(b){
  const bd=activeBoard(b,S.view);if(!bd)return emptyBox('当前没有可比较的结果');
  const rows=visibleRows(bd);
  if(bd.single)return `${scopeBar(bd,rows.length)}<div class="board" role="region" aria-label="${esc(bd.title)}" tabindex="0">${table(bd,rows)}</div><div style="margin-top:10px">${heatLegend(bd)}</div>${notesBox(bd)}`;
  const spec=dotSpec(bd);
  return `${scopeBar(bd,rows.length)}${dotLegend(bd)}<div class="dplot" role="table" aria-label="${esc(bd.title)}" style="--nc:${spec.cols.length};--ne:${spec.essential}">${dotHead(bd,spec)}${rows.map(x=>dotRow(bd,spec,x)).join('')||'<div class="empty">没有符合筛选的行。</div>'}</div>${sourceLine(bd)}${notesBox(bd)}`;
}
function capacityDetails(r){
  const m=capacityMeta(r),known=fin(m.parameters);
  return `<div class="d-sec"><h3>视觉容量 <small>单份模块 · 冻结权重也计数</small></h3><dl class="kv"><dt>参数量</dt><dd>${known?`${num(m.parameters)}（${capacityLabel(r)}）`:'待核验'}</dd><dt>容量档位</dt><dd>${esc(SIZE_TIERS.find(x=>x[0]===capacityTier(m.parameters))[1])}</dd><dt>输入 / 空间 tokens</dt><dd>${m.inputSize||'—'} px / ${m.nativeTokens||'—'}</dd><dt>策略读出 tokens</dt><dd>${m.readoutTokens||m.nativeTokens||'—'}</dd><dt>可训练视觉适配层</dt><dd>${fin(m.adapterParameters)?num(m.adapterParameters)+'（不计入视觉容量）':'尚未统一核验，不估算'}</dd><dt>证据类型</dt><dd>${esc(m.status||'待核验')}</dd><dt>计数口径</dt><dd>实际加载的视觉模块，不含文本塔、策略头和策略适配层；共享多相机时参数不重复计数。</dd><dt>模块说明</dt><dd>${esc(m.note||'暂无已核验记录')}</dd><dt>来源</dt><dd class="mono">${esc(m.evidence||'—')}${m.pointer?'<br>'+esc(m.pointer):''}</dd><dt>部署速度</dt><dd>尚未做统一硬件时延实测；参数量不等于延迟。</dd></dl></div>`;
}
function capacityView(b){
  const bd=activeBoard(b,'capacity');if(!bd)return emptyBox('当前没有可比较的结果');
  const rows=visibleRows(bd),points=rows.filter(x=>fin(x.s)&&fin(capacityMeta(x.r).parameters));
  const xmax=Math.max(350,...points.map(x=>capacityMeta(x.r).parameters/1e6))*1.07;
  const sx=n=>64+780*n/xmax,sy=n=>312-264*n;
  const bands=[['small',0,50,'小型'],['base',50,150,'中型'],['large',150,xmax,'大型']];
  const axes=[0,25,50,75,100].map(v=>`<line x1="64" x2="844" y1="${sy(v/100)}" y2="${sy(v/100)}"/><text x="51" y="${sy(v/100)+4}" text-anchor="end">${v}%</text>`).join('');
  const ticks=[0,50,150,300,400].filter(v=>v<=xmax).map(v=>`<text x="${sx(v)}" y="336" text-anchor="middle">${v}M</text>`).join('');
  const dots=points.map(x=>{const r=x.r,m=capacityMeta(r),label=`${r.name}${r.head?' · '+polName(r.head):''} · ${capacityLabel(r)} · ${pcs(x.s)}`;
    return `<g class="cap-point" data-row="${esc(r.id)}" data-tip="${esc(label)}" tabindex="0" role="button" aria-label="${esc(label)}"><circle cx="${sx(m.parameters/1e6)}" cy="${sy(x.s)}" r="7" fill="${encColor(r.encoder)}"/><title>${esc(label)}</title></g>`;}).join('');
  const ordered=S.capacitySort==='params'?[...rows].sort((a,c)=>(capacityMeta(a.r).parameters??Infinity)-(capacityMeta(c.r).parameters??Infinity)):rows;
  const table=ordered.map(x=>{const r=x.r,m=capacityMeta(r),tier=capacityTier(m.parameters);return `<tr data-row="${esc(r.id)}" tabindex="0"><td>${rankBadge(x.rank)}</td><td><b>${esc(r.name)}</b>${r.head?`<small>${esc(r.polLabel||polName(r.head))}</small>`:''}</td><td><b>${capacityLabel(r)}</b><small>${esc(SIZE_TIERS.find(t=>t[0]===tier)[1].split(' · ')[0])}</small></td><td>${m.inputSize||'—'} / ${m.readoutTokens||m.nativeTokens||'—'}</td><td><b>${pcs(x.s)}</b></td></tr>`;}).join('');
  return `${scopeBar(bd,rows.length)}<section class="cap-hero"><div><span class="cap-kicker">CAPACITY × ROBOT PERFORMANCE</span><h2>同一容量预算，谁更值得用？</h2><p>按当前 benchmark、动作策略和任务分类查看。分档只改变比较范围，分数和种子口径沿用原榜。</p></div><div class="cap-count"><b>${points.length}<small> / ${rows.length}</small></b><span>有分数与参数证据的组合</span></div></section>
  <div class="cap-chart"><svg viewBox="0 0 900 374" role="img" aria-label="视觉参数量与机器人成功率散点图"><text x="16" y="22">成功率 ↑</text>${bands.map(([k,l,h,label])=>`<rect class="cap-band ${k}" x="${sx(l)}" y="34" width="${sx(h)-sx(l)}" height="278"/><text x="${sx((l+h)/2)}" y="27" text-anchor="middle">${label}</text>`).join('')}<g class="cap-axes">${axes}${ticks}</g>${dots}<text x="454" y="365" text-anchor="middle">单份视觉模块参数量 →</text></svg><p>每个点对应当前口径的一行；悬停或点击查看身份。未完成分数、未核验参数不画点。跨动作头的点只作描述，不据此宣称容量控制下的优越性。</p></div>
  <div class="board"><table class="lb cap-table"><thead><tr><th>${S.size==='all'?'名次':'档内名次'}</th><th>编码器 / 策略</th><th><button class="th-btn" data-capacity-sort="params" aria-pressed="${S.capacitySort==='params'}">视觉参数 ${S.capacitySort==='params'?'↑':''}</button></th><th>输入 px / 读出 tokens</th><th><button class="th-btn" data-capacity-sort="score" aria-pressed="${S.capacitySort==='score'}">${esc(shortScore(bd))}成功率 ${S.capacitySort==='score'?'↓':''}</button></th></tr></thead><tbody>${table||'<tr><td colspan="5">当前没有符合筛选的行。</td></tr>'}</tbody></table></div>
  <p class="cap-footnote">M = 百万参数。统计实际加载的视觉模块，包含冻结参数；不含文本塔、策略头与策略适配层。少数模块保留池化/分类头，详情逐一注明。LIBERO 使用 native tokens；RoboTwin 的空间特征另池化为16个读出 tokens。RoboTwin 的适配层容量与架构推导口径见详情；无视觉模块证据的官方方法留空。参数量不能代替统一硬件上的延迟、显存或 FLOPs；双相机共享权重也仍需两路计算。</p>${notesBox(bd)}`;
}
const emptyBox=(t,p='')=>`<div class="card empty">${icon('layersOff')}<h3>${esc(t)}</h3>${p?`<p>${esc(p)}</p>`:''}</div>`;

/* ---------- 逐任务 matrix ---------- */
function matrixSpec(bd){
  if(bd.kind==='pair'){const tc=new Map(bd.taskCols.map(c=>[c.id,c]));
    return {groups:bd.cats.filter(m=>!m.derived).map(m=>({id:m.id,label:`${m.label} · ${m.title}`,cols:m.tasks.filter(t=>tc.has(t)).map(t=>({...tc.get(t),id:`${m.id}|${t}`,task:t,metric:m.id,title:`${m.label} · ${tc.get(t).title}`}))})),
      value:(r,col)=>{const v=r.tasks?.[col.task];return {rate:fin(v?.[col.metric])?v[col.metric]:null};},wide:true,click:true};}
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
  const head1=`<tr><th class="rowh" rowspan="2" style="text-align:left;font:600 11px var(--font);color:var(--muted)">名次 · ${bd.kind==='pair'?'方法':`编码器${bd.kind!=='encoder'?' · 策略':''}`}</th>${spec.groups.map(g=>`<th class="g" colspan="${g.cols.length}">${esc(g.label)}</th>`).join('')}<th class="sum" rowspan="2">${esc(scopeLabel(bd)[0])}</th></tr>`;
  const head2=`<tr>${flat.map(c=>`<th class="ch ${c.first?'first':''}" ${spec.click?`data-task="${esc(c.task||c.id)}"`:''} data-tip="${esc(c.title)}" ${spec.wide?'style="font:500 10.5px var(--font);white-space:normal;line-height:1.15;padding:2px 3px"':''}>${esc(spec.wide?c.label:c.label)}</th>`).join('')}</tr>`;
  const body=rows.map(x=>{const r=x.r;
    return `<tr class="${r.ours&&S.grp!=='ours'?'ours':''}"><th class="rowh" scope="row" data-row="${esc(r.id)}" style="cursor:pointer;font-weight:400"><div class="enc"><span class="mx-rk">${x.rank??'—'}</span>${rowMark(bd,r)}<div class="enc-t"><b>${esc(r.name)}</b><small>${esc(rowSubShort(bd,r)||'')}</small></div></div></th>
      ${flat.map(c=>{const v=spec.value(r,c),tip=`${r.name}${bd.kind!=='encoder'?' · '+polName(r.head):''}\n${c.title}\n${bd.single?(fin(v.rate)?(v.rate>0?'成功':'未成功'):'—'):pcs(v.rate)}${fin(v.succ)&&fin(v.ep)?` · ${v.succ}/${v.ep} 回合`:''}`;
        const inner=bd.single?(fin(v.rate)?`<span class="${v.rate>0?'':'na'}" style="--v:${v.rate>0?.5:0}">${v.rate>0?'✓':'✕'}</span>`:'<span class="na">·</span>')
          :fin(v.rate)?`<span class="${hiText(v.rate)?'hi':''}" style="--v:${heat(v.rate)}">${Math.round(100*v.rate)}</span>`:'<span class="na">·</span>';
        return `<td class="c ${c.first?'first':''}" ${spec.click?`data-task="${esc(c.task||c.id)}"`:''} data-tip="${esc(tip)}">${inner}</td>`;}).join('')}
      <td class="sum">${pc(x.s)}</td></tr>`;}).join('');
  return `${scopeBar(bd,rows.length)}<div class="mx-wrap" role="region" aria-label="逐任务成功率" tabindex="0"><table class="mx ${spec.wide?'wide':''}"><thead>${head1}${head2}</thead><tbody>${body}</tbody></table></div>
    <div style="margin-top:10px">${heatLegend(bd)}</div>${notesBox(bd)}`;
}

/* ---------- content dispatch ---------- */
function content(b){
  switch(S.view){
    case 'rank':case 'combos':return rankView(b);
    case 'capacity':return capacityView(b);
    case 'matrix':return matrixView(b);
    case 'videos':return videosView(b);
    default:return aboutView(b);
  }
}
function boardPage(){
  const b=B(),vs=views(b);if(!vs.includes(S.view))S.view=vs[0];
  if(['rank','combos','matrix','capacity'].includes(S.view))currentTrack(b,S.view);
  return `<div class="wrap">${rail()}${hero(b)}${tabs(b,vs)}<div id="filters">${filters(b)}</div><div id="content">${content(b)}</div></div>`;
}
function render(){
  if(!DATA)return;
  if(!benchById(S.bench))S.bench=DATA.benchmarks[0].id;   // links to a benchmark the site no longer lists
  if(S.seed!=='mean'&&!benchHasSeed(B(),S.seed))S.seed='mean';   // e.g. seed17 kept from LIBERO when switching to RoboTwin
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
  for(const v of ['rank','combos','matrix','capacity']){const bd=activeBoard(b,v);if(!bd)continue;const r=bd.rows.find(x=>x.id===id);if(r)return {bd,r};
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
  return `<div class="d-sec"><h3>逐任务成功率 <small>${bd.kind==='combo'?(bd.seed==null?'三种子均值，收齐 60 回合才显示':`seed${bd.seed}，每任务 20 回合`):'点击任务查看视频与对比'}</small></h3>${groups.map(([g,cs])=>`${g?`<div class="hm-group">${esc(g)}</div>`:''}<div class="hm">${cs.map(c=>{const v=r.tasks[c.id];
    if(!v)return `<button class="na" data-task="${esc(c.id)}" data-tip="${esc(c.title)}\n未评估">${esc(c.label)}<small>—</small></button>`;
    const rate=v.rate;return `<button class="${fin(rate)?(hiText(rate)?'hi':''):'na'}" style="--v:${heat(rate)}" data-task="${esc(c.id)}" data-tip="${esc(`${c.title}\n${pcs(rate)}${fin(v.succ)?` · ${v.succ}/${v.ep} 回合`:''}`)}">${esc(c.label.length>8?c.label.slice(0,7)+'…':c.label)}<small>${fin(rate)?pc(rate,0)+'%':(v.ep?`${v.ep}/${v.exp||'—'}`:'—')}</small></button>`;}).join('')}</div>`).join('')}</div>`;
}
function pairDrawer(bd,r){
  const g=(bd.groups||[]).find(x=>x.id===r.group),pool=bd.rows.filter(o=>inPool(bd,o));
  const rk=c=>{const v=r.cats[c.id]?.rate;return fin(v)?1+pool.filter(o=>fin(o.cats[c.id]?.rate)&&o.cats[c.id].rate>v+1e-12).length:null;};
  const N=c=>pool.filter(o=>fin(o.cats[c.id]?.rate)).length;
  let h=`<div class="d-h"><i class="sq l" style="--g:${groupColor(bd,r.group)}" aria-hidden="true"></i><div><h2>${esc(r.name)}</h2><p>${esc([g?.label,r.sub].filter(Boolean).join(' · '))}</p></div></div>`;
  const real=bd.cats.filter(c=>!c.derived),mk=c=>c.derived?`<i class="lg-m dot mean" style="--g:var(--ink)"></i>`:`<i class="lg-m ${real.indexOf(c)?'ring':'dot'}" style="--g:${groupColor(bd,r.group)}"></i>`;
  h+=`<div class="d-pair">${bd.cats.map(c=>`<div><span>${mk(c)}${esc(c.label)}</span><b>${pcs(r.cats[c.id]?.rate)}</b><small>${esc(c.title||'')}${rk(c)?` · 第 ${rk(c)} / ${N(c)}`:''}</small></div>`).join('')}</div>`;
  h+=`<div class="d-sec"><h3>逐任务 <small>${r.ours?'每个任务取已完成训练种子的均值':'官方榜逐任务表，单次评估'} · 点击任务看各方法对比</small></h3><table class="seed-t pt"><thead><tr><th>任务</th>${real.map(c=>`<th>${esc(c.label)}</th>`).join('')}</tr></thead><tbody>${bd.taskCols.map(c=>{const v=r.tasks[c.id]||{};
    return `<tr data-task="${esc(c.id)}"><td>${esc(c.label)}</td>${real.map(m=>{const x=v[m.id],inM=(m.tasks||[]).includes(c.id),sd=v[`${m.id}Seeds`];
      if(!inM)return `<td class="muted">${fin(x)?`${pc(x,0)}%`:'不测'}<small>不计入</small></td>`;
      return `<td><span class="mini"><i style="width:${fin(x)?(100*x).toFixed(1):0}%;background:${groupColor(bd,r.group)}"></i></span>${fin(x)?`${pc(x,0)}%`:'—'}${r.ours&&sd?`<small>${sd} 种子</small>`:''}</td>`;}).join('')}</tr>`;}).join('')}</tbody></table></div>`;
  if(r.official){const o=r.official,src=bd.source||{};
    h+=`<div class="d-sec"><h3>官方榜 50 任务成绩 <small>${esc(src.label||'')}</small></h3><dl class="kv"><dt>官方名次</dt><dd>${o.rank} / ${src.methods||'—'}（按 Easy、Hard 平均排）</dd><dt>平均</dt><dd>${pcs(o.avg)}</dd><dt>Easy</dt><dd>${pcs(o.easy)}</dd><dt>Hard</dt><dd>${pcs(o.hard)}</dd><dt>赛道</dt><dd>${esc(o.track==='Single'?'Single · 每任务单独训练，与我们同口径':'Co-train · 50 任务共 2,500 条 demo 联合训练')}</dd><dt>上榜日期</dt><dd>${esc(dateDot(o.date))}</dd></dl>${src.url?`<p style="margin:10px 0 0"><a class="link" href="${esc(safeUrl(src.url))}" target="_blank" rel="noopener">查看官方榜 ↗</a></p>`:''}</div>`;}
  if(bd.method)h+=`<div class="callout">${esc(bd.method)}</div>`;
  return h;
}
function rowDrawer(bd,r){
  if(bd.kind==='pair')return pairDrawer(bd,r)+capacityDetails(r);
  const s=rowScore(bd,r),x=rankRows(bd).find(o=>o.r.id===r.id),N=rankRows(bd).filter(o=>o.rank!=null).length;
  let h=encHead(r,bd.kind!=='encoder'?polBadge(r.head):'');
  if(capacityApplies(bd))h+=capacityDetails(r);
  h+=`<div class="d-big"><b>${bd.single?(fin(s)?(s>0?'成功':'未成功'):'—'):pcs(s)}</b><span>${esc(scopeLabel(bd).join(' · '))}${x?.rank?` · 名次 ${x.rank} / ${N}`:''}${fin(rowStd(bd,r))?` · 种子间 ± ${(100*rowStd(bd,r)).toFixed(1)}`:''}</span></div>${coverCell(r.cover)}`;
  if(bd.kind==='encoder'){const P=!!bd.pro;
    const sl=bd.seed==null?'三种子均值':`seed${bd.seed}`;
    h+=`<div class="d-sec"><h3>各动作策略 <small>${P?`各自总分（${bd.cats.length} 类扰动均值）· ${sl}`:sl} · 点击查看该组合</small></h3><div class="blist">${bd.pols.map(k=>{const p=r.pols[k];return bRow(polBadge(k),p?.rate,p?(P?`${p.done}/${p.total} 扰动`:`${p.done}/${p.total||3} 种子`):'无',p?.combo?`data-row="${esc(p.combo)}"`:'');}).join('')}</div></div>`;
    h+=`<div class="d-sec"><h3>${P?'各扰动类别':'各任务分类'} <small>${S.pol==='all'?'跨策略等权':polName(S.pol)}</small></h3><div class="blist">${bd.cats.map(c=>{const v=S.pol==='all'?r.cats[c.id]:bd.combos.get(r.pols[S.pol]?.combo)?.cats[c.id];return bRow(`${esc(c.label)} <span class="muted">${esc(c.title)}</span>`,v?.rate,v?.total&&S.pol==='all'?`${v.done}/${v.total} 策略`:'');}).join('')}</div></div>`;
    if(bd.method)h+=`<div class="callout">${esc(bd.method)}</div>`;
  }else if(bd.kind==='combo'){
    const c=r.ref;
    h+=`<div class="d-sec"><h3>训练种子 <small>每个种子 800 回合（40 任务 × 20 个评估 seed）</small></h3><table class="seed-t"><thead><tr><th>种子</th><th>成功率</th><th>成功 / 有效</th><th>状态</th></tr></thead><tbody>${(c.seedRates||[]).map(z=>`<tr><td>${z.seed}</td><td><b>${pcs(z.successRate)}</b></td><td>${z.successes??'—'} / ${num(z.episodes)}</td><td>${z.complete?'完整':'评估中'}</td></tr>`).join('')||'<tr><td colspan="4">尚无</td></tr>'}</tbody></table></div>`;
    h+=`<div class="d-sec"><h3>各任务分类 <small>${bd.seed==null?'三种子均值 ± 种子间标准差':`seed${bd.seed}`}</small></h3><div class="blist">${bd.cats.map(cc=>{const v=r.cats[cc.id];return bRow(`${esc(cc.label)} <span class="muted">${esc(cc.title)}</span>`,v?.rate,fin(v?.std)?`± ${(100*v.std).toFixed(1)}`:(v?`${v.done}/3 种子`:''));}).join('')}</div></div>`;
    h+=taskHeat(bd,r);
    h+=`<div class="d-sec"><h3>冻结身份</h3><dl class="kv"><dt>动作策略版本</dt><dd class="mono">${esc(c.policyFamily||'—')}</dd><dt>模型</dt><dd class="mono">${(c.runIds||[]).map(esc).join('<br>')}</dd></dl></div>`;
  }else if(bd.kind==='pro'){
    h+=`<div class="d-sec"><h3>四类扰动 <small>${bd.proSeed===null?'三种子均值':`seed${bd.proSeed} · 单种子`}；总分为 ${bd.cats.length} 类等权平均</small></h3><div class="blist">${bd.cats.map(c=>{const v=r.cats[c.id];return bRow(esc(c.label),v?.rate,v?`${v.done}/${v.total} 种子`:'');}).join('')}</div></div>`;
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
  const prevView=S.view;Object.assign(S,{page:'board',bench:id,track:'',cat:'all',suite:'all',pol:'all',grp:'ours',q:'',dir:-1,size:'all',capacitySort:'score',drawer:'',gcat:'all',gq:'',gtask:'',gpage:0});
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
  if((el=g('[data-size]'))){S.size=el.dataset.size;S.drawer='';renderBoardParts();return;}
  if((el=g('[data-capacity-sort]'))){S.capacitySort=el.dataset.capacitySort;renderContent();return;}
  if((el=g('[data-sort]'))){S.dir=-S.dir;renderContent();return;}
  if((el=g('[data-cat]'))){const v=el.dataset.cat;if(S.cat===v&&v!=='all')S.dir=-S.dir;else{S.cat=v;S.dir=-1;}renderBoardParts();return;}
  if((el=g('[data-vcat]'))){S.cat=el.dataset.vcat;renderBoardParts();return;}
  if((el=g('[data-pol]'))){const v=el.dataset.pol;S.pol=S.pol===v&&v!=='all'?'all':v;renderBoardParts();return;}
  if((el=g('[data-suite]'))){S.suite=el.dataset.suite;renderBoardParts();return;}
  // data-pro-seed: the 训练口径 buttons of every benchmark (the attribute kept its name from when only LIBERO-PRO had them)
  if((el=g('[data-pro-seed]'))){const v=el.dataset.proSeed;if(!/^(mean|\d{1,3})$/.test(v))return;S.seed=v;S.drawer='';render();$(`[data-pro-seed="${v}"]`)?.focus();return;}
  if((el=g('[data-grp]'))){S.grp=el.dataset.grp;renderBoardParts();return;}
  if((el=g('[data-mode]'))){S.mode=el.dataset.mode;renderBoardParts();return;}
  if((el=g('[data-row]'))){lastFocus=el;openDrawer('r:'+el.dataset.row);return;}
  if((el=g('[data-task]'))){lastFocus=el;openDrawer('t:'+el.dataset.task);return;}
});
function renderBoardParts(){$('#filters').innerHTML=filters(B());renderContent();}
document.addEventListener('change',e=>{if(e.target.id==='track'){S.track=e.target.value;S.cat='all';S.suite='all';S.grp='ours';renderBoardParts();}});
let qTimer=0;
document.addEventListener('input',e=>{if(e.target.id==='q'){S.q=e.target.value;clearTimeout(qTimer);qTimer=setTimeout(renderContent,120);}});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&S.drawer){closeDrawer();return;}
  if(e.key==='Enter'||e.key===' '){const el=e.target.closest('[data-row][tabindex]');if(el){e.preventDefault();lastFocus=el;openDrawer('r:'+el.dataset.row);}}
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
