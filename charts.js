/* charts.js */
const NSDCharts = (() => {
  const C = { c1:'#7c6ff7',c2:'#e879f9',c3:'#22d3ee',c4:'#4ade80',c5:'#fb923c',c6:'#fbbf24', grid:'rgba(255,255,255,0.05)',txt:'#5a5a7a' };
  const grad=(ctx,top,bot)=>{ const g=ctx.createLinearGradient(0,0,0,ctx.canvas.height); g.addColorStop(0,top); g.addColorStop(1,bot); return g; };
  const BF={family:"'Inter',sans-serif",size:11};
  const BGO={color:C.grid,drawBorder:false,borderDash:[3,3]};
  const BT={color:C.txt,font:BF};
  const BL={labels:{color:'#9898b8',font:BF,boxWidth:10,boxHeight:10,padding:12}};
  const BTO={backgroundColor:'#13131f',borderColor:'rgba(124,111,247,.25)',borderWidth:1,titleColor:'#f1f1ff',bodyColor:'#9898b8',padding:10};
  const inst={};
  const destroy=id=>{ if(inst[id]){inst[id].destroy();delete inst[id];} };
  const COLS=[C.c1,C.c2,C.c3,C.c4,C.c5,C.c6];

  function line(id,labels,datasets,opts={}){
    destroy(id); const cv=document.getElementById(id); if(!cv)return;
    const ctx=cv.getContext('2d');
    inst[id]=new Chart(ctx,{type:'line',data:{labels,datasets:datasets.map((ds,i)=>{
      const col=ds.color||COLS[i%6];
      return{label:ds.label,data:ds.data,borderColor:col,borderWidth:2.5,pointRadius:3,pointHoverRadius:5,pointBackgroundColor:col,tension:.4,fill:ds.fill!==false,backgroundColor:ds.fill!==false?grad(ctx,col+'28',col+'00'):'transparent'};
    })},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},
      plugins:{legend:BL,tooltip:BTO},
      scales:{x:{grid:BGO,ticks:{...BT,maxRotation:0},border:{color:C.grid}},y:{grid:BGO,ticks:{...BT,callback:v=>opts.currency?'₹'+(v/100000).toFixed(1)+'L':v},border:{color:C.grid},beginAtZero:true}}}});
  }

  function bar(id,labels,datasets,opts={}){
    destroy(id); const cv=document.getElementById(id); if(!cv)return;
    const ctx=cv.getContext('2d');
    inst[id]=new Chart(ctx,{type:'bar',data:{labels,datasets:datasets.map((ds,i)=>({label:ds.label,data:ds.data,backgroundColor:ds.color||COLS[i%6],borderRadius:5,borderSkipped:false,maxBarThickness:40}))},
      options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},
        plugins:{legend:BL,tooltip:BTO},
        scales:{x:{grid:{...BGO,display:false},ticks:{...BT,maxRotation:30},border:{color:C.grid}},y:{grid:BGO,ticks:{...BT,callback:v=>opts.currency?'₹'+(v/100000).toFixed(1)+'L':v},border:{color:C.grid},beginAtZero:true}}}});
  }

  function hbar(id,labels,data,opts={}){
    destroy(id); const cv=document.getElementById(id); if(!cv)return;
    const ctx=cv.getContext('2d');
    inst[id]=new Chart(ctx,{type:'bar',data:{labels,datasets:[{data,backgroundColor:labels.map((_,i)=>COLS[i%6]),borderRadius:5,borderSkipped:false,maxBarThickness:26}]},
      options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,
        plugins:{legend:{display:false},tooltip:BTO},
        scales:{x:{grid:BGO,ticks:{...BT,callback:v=>opts.currency?'₹'+(v/100000).toFixed(1)+'L':v},border:{color:C.grid}},y:{grid:{display:false},ticks:{...BT,font:{...BF,size:10}},border:{color:C.grid}}}}});
  }

  function doughnut(id,labels,data,opts={}){
    destroy(id); const cv=document.getElementById(id); if(!cv)return;
    const ctx=cv.getContext('2d');
    inst[id]=new Chart(ctx,{type:'doughnut',data:{labels,datasets:[{data,backgroundColor:COLS.slice(0,data.length),borderWidth:0,hoverOffset:4}]},
      options:{responsive:true,maintainAspectRatio:false,cutout:'72%',
        plugins:{legend:{display:false},tooltip:{...BTO,callbacks:{label:c=>` ${c.label}: ${opts.pct?c.parsed.toFixed(1)+'%':c.parsed.toLocaleString('en-IN')}` }}}}});
  }

  return {line,bar,hbar,doughnut,destroy};
})();
