(() => {
  const escape = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function wilson(n, total=30) {
    const z=1.96, p=n/total, d=1+z*z/total, c=(p+z*z/(2*total))/d;
    const h=z*Math.sqrt(p*(1-p)/total+z*z/(4*total*total))/d;
    return [Math.max(0,(c-h)*100), Math.min(100,(c+h)*100)];
  }

  function bars(scores, counts=false) {
    return Object.entries(scores).map(([name,v]) => {
      const percent=counts?v/30*100:v, ci=counts?wilson(v):null;
      const cls=name==='CoRE'?'core':name==='CHORUS'?'chorus':name==='CLS-DP'?'clsdp':'';
      const detail=`${name}: ${percent.toFixed(1)}%${ci?` · ${v}/30 successes · 95% Wilson CI ${ci[0].toFixed(1)}–${ci[1].toFixed(1)}%`:''}`;
      return `<div class="bar-row ${cls}" tabindex="0" data-chart-point="${escape(detail)}" aria-label="${escape(detail)}"><span class="bar-name">${escape(name)}</span><div class="bar-track" aria-hidden="true"><div class="bar-fill" style="width:${percent}%"></div>${ci?`<span class="bar-ci" style="left:${ci[0]}%;width:${ci[1]-ci[0]}%"></span>`:''}</div><span class="bar-value">${counts?v+'/30':v.toFixed(1)+'%'}</span></div>`;
    }).join('');
  }

  function line(data) {
    const total=data.total||30, left=48, right=530, top=58, bottom=250;
    const span=data.xs[data.xs.length-1]-data.xs[0];
    const x=i=>span?left+(data.xs[i]-data.xs[0])/span*(right-left):(left+right)/2;
    const y=v=>bottom-(bottom-top)*v/100;
    const marker=(name,cx,cy,color)=>{
      const style=`fill="var(--canvas)" stroke="${color}" stroke-width="2"`;
      if(name==='CHORUS') return `<rect x="${cx-4.5}" y="${cy-4.5}" width="9" height="9" ${style}/>`;
      if(name==='CLS-DP') return `<path d="M ${cx} ${cy-5.5} L ${cx+5.5} ${cy+4.5} L ${cx-5.5} ${cy+4.5} Z" ${style}/>`;
      return `<circle cx="${cx}" cy="${cy}" r="4.5" ${style}/>`;
    };
    let s=`<svg class="performance-plot" viewBox="0 0 565 328" role="group" aria-label="${escape(data.title)}. Success rate, ${total} trials per method and condition. Focus a point for its result and 95% Wilson interval."><text x="48" y="29">Success (%)</text>`;
    [0,25,50,75,100].forEach(v=>s+=`<line x1="${left}" y1="${y(v)}" x2="${right}" y2="${y(v)}" stroke="var(--line)" stroke-dasharray="3 4" aria-hidden="true"/><text x="32" y="${y(v)+4}" text-anchor="end">${v}</text>`);
    const entries=Object.entries(data.counts);
    entries.forEach(([name,vals],j)=>{
      const color=name==='CoRE'?'var(--blue)':name==='CHORUS'?'var(--sage)':name==='CLS-DP'?'var(--clay)':'var(--state)';
      const bounds=vals.map(v=>wilson(v,total));
      const area=bounds.map((b,i)=>`${x(i)},${y(b[1])}`).concat(bounds.map((b,i)=>`${x(i)},${y(b[0])}`).reverse()).join(' ');
      s+=`<polygon class="chart-band" points="${area}" fill="${color}" opacity=".09" pointer-events="none" aria-hidden="true"/><polyline class="chart-line" pathLength="1" points="${vals.map((v,i)=>`${x(i)},${y(v/total*100)}`).join(' ')}" fill="none" stroke="${color}" stroke-width="2.6" stroke-linejoin="round" pointer-events="none" aria-hidden="true"/>`;
      vals.forEach((v,i)=>{
        const px=x(i), py=y(v/total*100), ci=bounds[i];
        const detail=`${name} · ${data.xaxis}: ${data.xlabels[i]} · ${v}/${total} successes (${(v/total*100).toFixed(1)}%) · 95% Wilson CI ${ci[0].toFixed(1)}–${ci[1].toFixed(1)}%`;
        s+=`<g class="chart-point" tabindex="0" role="img" data-chart-point="${escape(detail)}" aria-label="${escape(detail)}" style="--point-color:${color}"><circle class="chart-hit-area" cx="${px}" cy="${py}" r="20" fill="transparent"/>${marker(name,px,py,color)}</g>`;
        if(data.labelAll!==false||name==='CoRE') s+=`<text x="${px+(i===0?10:i===vals.length-1?-10:0)}" y="${py+(name==='CoRE'?-12:19)}" text-anchor="${i===0?'start':i===vals.length-1?'end':'middle'}" class="plot-label" style="fill:${color}" pointer-events="none">${total===100?v+'%':v+'/'+total}</text>`;
      });
      const lx=entries.length===3?220+j*110:325+j*110;
      s+=`<g class="chart-legend" aria-hidden="true"><line x1="${lx}" y1="12" x2="${lx+18}" y2="12" stroke="${color}" stroke-width="2.6"/>${marker(name,lx+9,12,color)}<text x="${lx+25}" y="17" class="legend">${escape(name)}</text></g>`;
    });
    data.xlabels.forEach((label,i)=>s+=`<text x="${x(i)}" y="${bottom+39}" text-anchor="middle">${escape(label)}</text>`);
    s+=`<text x="289" y="321" text-anchor="middle">${escape(data.xaxis)}</text></svg><p class="chart-note">${total} trials per point · Bands: 95% Wilson intervals.</p>`;
    return s;
  }
  window.CoreCharts={escape,wilson,bars,line};
})();

