(() => {
  'use strict';
  const $=s=>document.querySelector(s),$$=s=>Array.from(document.querySelectorAll(s));
  const videos=$$('video'),reduce=matchMedia('(prefers-reduced-motion: reduce)');
  let pairKey=null;const pending=new Set();
  function load(v){if(!v.getAttribute('src')&&v.dataset.src){v.src=v.dataset.src;v.load();}}
  function pairState(){ $$('[data-play-pair]').forEach(b=>{const playing=$$(`[data-pair-member="${b.dataset.playPair}"]`).some(v=>!v.paused);b.setAttribute('aria-pressed',String(playing));b.textContent=playing?'Pause both Ⅱ':'Play both ▷';}); }
  function pauseOthers(v){videos.forEach(other=>{if(other!==v&&!(pairKey&&v.dataset.pairMember===pairKey&&other.dataset.pairMember===pairKey))other.pause();});}
  async function play(v,automatic=false){pending.add(v);load(v);v.dataset.automatic=String(automatic);if(!automatic){if(v.dataset.pairMember!==pairKey)pairKey=null;pauseOthers(v);}try{await v.play();}catch{v.closest('.video-wrap')?.classList.remove('is-playing');}finally{pending.delete(v);}}
  videos.forEach(v=>{
    const wrap=v.closest('.video-wrap');
    wrap?.querySelector('.video-play')?.addEventListener('click',()=>play(v));
    v.addEventListener('pointerdown',()=>{load(v);v.dataset.automatic='false';});
    v.addEventListener('keydown',()=>{load(v);v.dataset.automatic='false';});
    v.addEventListener('play',()=>{wrap?.classList.add('is-playing');if(v.dataset.automatic!=='true')pauseOthers(v);pairState();});
    v.addEventListener('pause',()=>{wrap?.classList.remove('is-playing');pairState();});
    v.addEventListener('ended',()=>{wrap?.classList.remove('is-playing');pairState();});
    v.addEventListener('error',()=>{v.closest('figure')?.setAttribute('data-media-error','true');wrap?.classList.remove('is-playing');});
  });
  $$('[data-play-pair]').forEach(b=>b.addEventListener('click',async()=>{
    const pair=$$(`[data-pair-member="${b.dataset.playPair}"]`);
    if(pair.some(v=>!v.paused)){pair.forEach(v=>v.pause());pairKey=null;pairState();return;}
    pairKey=b.dataset.playPair;videos.filter(v=>!pair.includes(v)).forEach(v=>v.pause());
    pair.forEach(v=>{load(v);v.currentTime=0;v.dataset.automatic='false';});
    await Promise.allSettled(pair.map(v=>v.play()));pairState();
  }));
  const fg=$('#figure-dialog');$$('[data-zoom]').forEach(b=>b.addEventListener('click',()=>{$('#figure-dialog-title').textContent=b.dataset.title;$('#dialog-image').src=b.dataset.zoom;$('#dialog-image').alt=b.querySelector('img')?.alt||b.dataset.title;videos.forEach(v=>v.pause());fg.showModal();}));$('[data-close-dialog]').addEventListener('click',()=>fg.close());fg.addEventListener('click',e=>{if(e.target===fg)fg.close();});
  const film=$('#film-dialog');$$('[data-open-film]').forEach(b=>b.addEventListener('click',()=>{film.showModal();play($('#overview-film'));}));$('[data-close-film]').addEventListener('click',()=>film.close());film.addEventListener('close',()=>$('#overview-film').pause());film.addEventListener('click',e=>{if(e.target===film)film.close();});
  $('#copy-citation').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('#bibtex').textContent);$('#copy-status').textContent='BibTeX copied.';}catch{const range=document.createRange();range.selectNodeContents($('#bibtex'));const s=window.getSelection();s.removeAllRanges();s.addRange(range);$('#copy-status').textContent='Citation selected. Press Ctrl/Cmd+C to copy.';}});
  if('IntersectionObserver' in window){
    const observer=new IntersectionObserver(entries=>{
      entries.forEach(({target:v,intersectionRatio:ratio})=>{v.dataset.visible=String(ratio>=.45);if(ratio<.1&&v.id!=='overview-film')v.pause();});
      if(reduce.matches||document.hidden||document.querySelector('dialog[open]')||videos.some(v=>!v.paused&&v.dataset.automatic!=='true'))return;
      const budget=innerWidth>700?2:1;
      for(const v of videos){if(v.dataset.visible==='true'&&!v.dataset.pairMember&&v.id!=='overview-film'&&v.paused&&!v.ended&&!pending.has(v)&&videos.filter(x=>!x.paused||pending.has(x)).length<budget)play(v,true);}
    },{threshold:[0,.1,.45]});videos.filter(v=>v.id!=='overview-film').forEach(v=>observer.observe(v));
  }
  document.addEventListener('visibilitychange',()=>{if(document.hidden)videos.forEach(v=>v.pause());});
  reduce.addEventListener('change',()=>{if(reduce.matches)videos.filter(v=>v.dataset.automatic==='true').forEach(v=>v.pause());});
  // Progressive enhancement: final data remains readable without JavaScript.
  const charts=$$('[data-performance-chart]');
  document.documentElement.classList.add('charts-enhanced');
  function animateChart(chart){
    chart.getAnimations({subtree:true}).forEach(a=>a.cancel());
    chart.dataset.played='true';
    if(reduce.matches)return;
    chart.querySelectorAll('.bar-fill').forEach((bar,i)=>bar.animate([{transform:'scaleX(0)'},{transform:'scaleX(1)'}],{duration:850,delay:i*60,fill:'backwards',easing:'cubic-bezier(.2,.7,.2,1)'}));
    chart.querySelectorAll('.chart-line').forEach(line=>line.animate([{strokeDasharray:'1',strokeDashoffset:'1'},{strokeDasharray:'1',strokeDashoffset:'0'}],{duration:1100,easing:'ease-out'}));
    chart.querySelectorAll('.chart-band').forEach(band=>band.animate([{opacity:0},{opacity:getComputedStyle(band).opacity}],{duration:850,easing:'ease-out'}));
    chart.querySelectorAll('.chart-point').forEach(point=>point.animate([{opacity:0},{opacity:1}],{duration:500,delay:250,fill:'backwards'}));
  }
  $$('[data-replay-chart]').forEach(b=>b.addEventListener('click',()=>animateChart(b.closest('[data-performance-chart]'))));
  if('IntersectionObserver' in window){
    const chartObserver=new IntersectionObserver(entries=>entries.forEach(({target,isIntersecting})=>{
      const chart=target.closest('[data-performance-chart]');
      if(isIntersecting&&!chart.dataset.played)animateChart(chart);
      else if(!isIntersecting)chart.getAnimations({subtree:true}).forEach(a=>a.finish());
    }),{threshold:.15});charts.forEach(c=>chartObserver.observe(c.querySelector('.line-chart,.bar-chart')));
  }
  function finishCharts(){charts.forEach(c=>c.getAnimations({subtree:true}).forEach(a=>a.finish()));}
  function syncChartMotion(){ $$('[data-replay-chart]').forEach(b=>{b.disabled=reduce.matches;b.title=reduce.matches?'Animation disabled by your reduced-motion preference':'Replay chart animation';});if(reduce.matches)finishCharts(); }
  syncChartMotion();reduce.addEventListener('change',syncChartMotion);
  const tip=document.createElement('div');tip.className='chart-tooltip';tip.id='chart-tooltip';tip.setAttribute('role','tooltip');tip.hidden=true;document.body.append(tip);
  function hideChartTip(){tip.hidden=true;}
  function showChartTip(point){
    tip.textContent=point.dataset.chartPoint;tip.hidden=false;
    const r=point.getBoundingClientRect(),t=tip.getBoundingClientRect();
    tip.style.left=Math.max(8,Math.min(innerWidth-t.width-8,r.left+r.width/2-t.width/2))+'px';
    tip.style.top=(r.top-t.height-10>8?r.top-t.height-10:Math.min(innerHeight-t.height-8,r.bottom+10))+'px';
  }
  $$('[data-chart-point]').forEach(point=>{
    point.addEventListener('pointerenter',()=>showChartTip(point));point.addEventListener('focus',()=>showChartTip(point));point.addEventListener('click',()=>showChartTip(point));
    point.addEventListener('pointerleave',hideChartTip);point.addEventListener('blur',hideChartTip);
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape')hideChartTip();});
  document.addEventListener('pointerdown',e=>{if(!e.target.closest('[data-chart-point]'))hideChartTip();});
  addEventListener('scroll',hideChartTip,{passive:true});addEventListener('resize',hideChartTip);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){finishCharts();hideChartTip();}});
  // A reading map follows document flow; native anchors still work without JS.
  const tocDialog=$('#contents-dialog'),tocTrigger=$('.contents-trigger');
  const tocLinks=$$('.toc-link'),desktopLinks=$$('.desktop-contents .toc-link');
  const readingTargets=desktopLinks.map(a=>$(a.hash));
  document.documentElement.classList.add('contents-enabled');
  tocTrigger.addEventListener('click',()=>{
    hideChartTip();videos.forEach(v=>v.pause());tocDialog.showModal();
    tocTrigger.setAttribute('aria-expanded','true');document.body.classList.add('contents-open');
    requestReadingUpdate();
  });
  $('.toc-close').addEventListener('click',()=>tocDialog.close());
  tocDialog.addEventListener('close',()=>{tocTrigger.setAttribute('aria-expanded','false');document.body.classList.remove('contents-open');});
  tocDialog.addEventListener('click',event=>{
    const r=tocDialog.getBoundingClientRect();
    if(event.target===tocDialog&&(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom))tocDialog.close();
  });
  tocDialog.querySelectorAll('a,[data-open-film]').forEach(a=>a.addEventListener('click',()=>tocDialog.close(),{capture:true}));
  const wideContents=matchMedia('(min-width:1320px)');
  wideContents.addEventListener('change',()=>{if(tocDialog.open)tocDialog.close();requestReadingUpdate();});
  let readingFrame=0,lastReadingIndex=-1;
  function updateReadingMap(){
    readingFrame=0;
    const available=Math.max(0,document.documentElement.scrollHeight-innerHeight);
    const progress=available?Math.max(0,Math.min(1,scrollY/available)):1;
    let index=0;readingTargets.forEach((target,i)=>{if(target.getBoundingClientRect().top<=155)index=i;});
    if(available-scrollY<=3)index=readingTargets.length-1;
    $$('.reading-percent').forEach(el=>el.textContent=Math.round(progress*100)+'%');
    $$('.toc-reading-track span').forEach(el=>el.style.transform=`scaleX(${progress})`);
    if(index!==lastReadingIndex){
      tocLinks.forEach(a=>{const active=a.hash===desktopLinks[index].hash;a.classList.toggle('is-current',active);if(active)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});
      const id=readingTargets[index].id;
      const headerId=['top','abstract'].includes(id)?'collaboration':['rq1','rq2','experts','robustness'].includes(id)?'results':id==='physical-robustness'?'robots':id;
      $$('.site-header nav a').forEach(a=>a.classList.toggle('is-current',a.hash==='#'+headerId));
      lastReadingIndex=index;
    }
    $$('.toc-nav').forEach(nav=>{
      const active=nav.querySelector('.is-current');
      nav.querySelector('.toc-marker').style.transform=`translateY(${active.offsetTop}px)`;
      nav.querySelector('.toc-marker').style.height=active.offsetHeight+'px';
      nav.querySelector('.toc-trail').style.height=Math.max(0,active.offsetTop+active.offsetHeight/2-18)+'px';
    });
  }
  function requestReadingUpdate(){if(!readingFrame)readingFrame=requestAnimationFrame(updateReadingMap);}
  addEventListener('scroll',requestReadingUpdate,{passive:true});
  addEventListener('resize',requestReadingUpdate);addEventListener('hashchange',requestReadingUpdate);
  if('ResizeObserver' in window)new ResizeObserver(requestReadingUpdate).observe($('#main'));
  document.fonts.ready.then(requestReadingUpdate);requestReadingUpdate();
  // Short, one-time reveals preserve reading speed and respect reduced motion.
  const revealNodes=$$('.paper-section-head,.paper-figure,.sim-card,.physical-card,.paper-subhead');
  let revealObserver;
  function revealAll(){revealNodes.forEach(el=>el.classList.remove('motion-pending'));revealObserver?.disconnect();}
  if(!reduce.matches&&'IntersectionObserver' in window){
    revealObserver=new IntersectionObserver(entries=>entries.forEach(({target,isIntersecting})=>{
      if(isIntersecting){target.classList.remove('motion-pending');revealObserver.unobserve(target);}
    }),{threshold:.06,rootMargin:'0px 0px -20px 0px'});
    revealNodes.forEach((el,i)=>{
      if(el.getBoundingClientRect().top>=innerHeight){el.classList.add('motion-pending');el.style.setProperty('--reveal-delay',`${Math.min(i%3,2)*45}ms`);revealObserver.observe(el);}
    });
  }
  document.addEventListener('focusin',event=>event.target.closest('.motion-pending')?.classList.remove('motion-pending'));
  reduce.addEventListener('change',()=>{if(reduce.matches)revealAll();});
})();
