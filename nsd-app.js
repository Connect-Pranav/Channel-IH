/* app.js — NSD Executive Dashboard Main Application */
(function(){
'use strict';

// ─── State ─────────────────────────────────────────────────────────────────
let MODEL = null;
let FILES = [];
let CURRENT_TAB = 'summary';

// ─── Utils ──────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const el = (tag,cls,html='') => { const e=document.createElement(tag); if(cls)e.className=cls; if(html)e.innerHTML=html; return e; };
const fmtN = n => n==null||isNaN(n)?'—':Number(n).toLocaleString('en-IN');
const fmtL = n => { if(!n||isNaN(n))return'—'; n=Number(n); if(n>=10000000)return'₹'+(n/10000000).toFixed(2)+'Cr'; if(n>=100000)return'₹'+(n/100000).toFixed(2)+'L'; return'₹'+n.toLocaleString('en-IN'); };
const fmtP = (a,b) => b?(((a/b)*100).toFixed(1)+'%'):'—';
const achClass = p => { const v=parseFloat(p); if(v>=100)return'pg'; if(v>=85)return'po'; return'pr'; };
const rankBadge = i => {
  if(i===0)return'<span class="rb gld">🥇</span>';
  if(i===1)return'<span class="rb slv">🥈</span>';
  if(i===2)return'<span class="rb brz">🥉</span>';
  return`<span class="rb nrm">${i+1}</span>`;
};
const barCell = (val,max) => {
  const pct=max?Math.min((val/max)*100,100):0;
  return`<div class="bw" style="width:80px"><div class="bf bv" style="width:${pct}%"></div></div>`;
};

// ─── Toast ───────────────────────────────────────────────────────────────────
function toast(msg, type='ti'){
  const t=$('toasts'); if(!t)return;
  const d=el('div',`toast ${type}`,`<span>${type==='ts'?'✅':type==='te'?'❌':'ℹ️'}</span> ${msg}`);
  t.appendChild(d);
  setTimeout(()=>d.remove(),3500);
}

// ─── Loading ──────────────────────────────────────────────────────────────────
function showLoading(msg='Processing files…'){
  const d=el('div','lov',`<div class="spinner"></div><div style="font-size:.8rem;color:#9898b8">${msg}</div>`);
  d.id='loading-overlay'; document.body.appendChild(d);
}
function hideLoading(){ const d=$('loading-overlay'); if(d)d.remove(); }

// ─── File Upload UI ───────────────────────────────────────────────────────────
function initUpload(){
  const zone=$('upload-zone'); if(!zone)return;
  const input=el('input'); input.type='file'; input.multiple=true; input.accept='.xlsx,.xlsb,.csv,.xls';
  input.style.display='none'; document.body.appendChild(input);

  const card = zone.querySelector('.upload-card');
  card.addEventListener('dragover',e=>{e.preventDefault();card.classList.add('drag-over');});
  card.addEventListener('dragleave',()=>card.classList.remove('drag-over'));
  card.addEventListener('drop',e=>{
    e.preventDefault(); card.classList.remove('drag-over');
    handleFiles(Array.from(e.dataTransfer.files));
  });

  $('btn-browse').addEventListener('click',()=>input.click());
  input.addEventListener('change',()=>{ handleFiles(Array.from(input.files)); input.value=''; });
  $('btn-demo').addEventListener('click',loadDemo);
}

function handleFiles(newFiles){
  const valid = newFiles.filter(f=>/\.(xlsx|xlsb|csv|xls)$/i.test(f.name));
  if(!valid.length){ toast('Please upload .xlsx, .xlsb, .csv or .xls files','te'); return; }
  FILES.push(...valid.filter(f=>!FILES.find(x=>x.name===f.name)));
  renderFileList();
}

function renderFileList(){
  const list=$('file-list'); if(!list)return;
  list.innerHTML='';
  FILES.forEach((f,i)=>{
    const ext = f.name.split('.').pop().toUpperCase();
    const ico = ext==='CSV'?'📊':'📗';
    const size = f.size > 1048576 ? (f.size/1048576).toFixed(1)+'MB' : (f.size/1024).toFixed(0)+'KB';
    const div=el('div','fi',`
      <div class="fi-ico">${ico}</div>
      <div class="fi-info">
        <div class="fi-name">${f.name}</div>
        <div class="fi-meta">${size} · ${ext}</div>
        <div class="fi-prog"><div class="fi-bar" style="width:100%"></div></div>
      </div>
      <button class="fi-rm" onclick="removeFile(${i})">✕</button>
    `);
    list.appendChild(div);
  });
  const runBtn=$('btn-run');
  if(runBtn) runBtn.style.display = FILES.length ? 'flex' : 'none';
}

window.removeFile = (i) => { FILES.splice(i,1); renderFileList(); };

async function processFiles(){
  if(!FILES.length){ toast('Add files first','te'); return; }
  showLoading('Parsing workbooks…');
  try {
    MODEL = await NSDParser.parseFiles(FILES);
    hideLoading();
    toast(`✅ ${FILES.length} file(s) loaded — ${MODEL.meta.sheetsLoaded} sheets parsed`,'ts');
    showDashboard();
  } catch(e) {
    hideLoading();
    toast('Error: '+e.message,'te');
    console.error(e);
  }
}

function loadDemo(){
  MODEL = NSDParser.demoModel();
  toast('Demo data loaded — 14 sheets simulated','ti');
  showDashboard();
}

// ─── Show Dashboard ────────────────────────────────────────────────────────────
function showDashboard(){
  $('upload-zone').style.display = 'none';
  $('dashboard-zone').style.display = 'block';
  updateTopbar();
  renderTab(CURRENT_TAB);
}

function updateTopbar(){
  const m = MODEL.meta;
  const tb = $('topbar-title');
  if(tb) tb.innerHTML = `NSD Executive <span>Dashboard</span>`;
  const meta = $('topbar-meta');
  if(meta) meta.innerHTML = `<div class="live-dot"></div> ${m.totalHC} Headcount · ${m.sheetsLoaded} Sheets · Ach: ${m.achPct}%`;
}

// ─── NAV ──────────────────────────────────────────────────────────────────────
function initNav(){
  document.querySelectorAll('.nav-item[data-tab]').forEach(item=>{
    item.addEventListener('click',()=>{
      document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
      item.classList.add('active');
      CURRENT_TAB = item.dataset.tab;
      if(MODEL) renderTab(CURRENT_TAB);
    });
  });
}

function renderTab(tab){
  const zone=$('dashboard-zone'); if(!zone)return;
  const renders = {
    summary:    renderSummary,
    sales:      renderSales,
    manager:    renderManager,
    tl:         renderTL,
    executive:  renderExec,
    location:   renderLocation,
    vintage:    renderVintage,
    kpiguide:   renderKPIGuide,
  };
  if(renders[tab]) renders[tab]();
}

// ─── SUMMARY ──────────────────────────────────────────────────────────────────
function renderSummary(){
  const m=MODEL.meta;
  const achNum = parseFloat(m.achPct)||0;
  const html=`
  <div class="ph">
    <div><h1>📊 Executive Summary</h1><p>Consolidated branch performance overview — all locations combined</p></div>
    <div class="ph-actions">
      <button class="tbtn" onclick="exportCSV()">⬇️ Export</button>
      <button class="tbtn primary" onclick="loadNewFiles()">📂 Load Files</button>
    </div>
  </div>

  <div class="kpi-grid">
    ${kpiCard('Total Headcount', fmtN(m.totalHC), '👥', 'var(--accent-primary)', `Active: ${fmtN(m.activeHC)}`, 'neu')}
    ${kpiCard('Total Sales', fmtL(m.totalSales), '💰', 'var(--accent-green)', `Target: ${fmtL(m.totalTarget)}`, 'up')}
    ${kpiCard('Achievement %', (m.achPct||'—')+'%', '🎯', achNum>=100?'var(--accent-green)':achNum>=85?'var(--accent-orange)':'var(--accent-red)', `vs Target`, achNum>=100?'up':'dn')}
    ${kpiCard('Productivity', fmtL(m.productivity), '⚡', 'var(--accent-cyan)', 'Per Head', 'neu')}
    ${kpiCard('Activation', fmtN(m.totalActiv), '🔥', 'var(--accent-pink)', `Conv: ${m.convPct}%`, 'up')}
    ${kpiCard('Active HC', fmtN(m.activeHC), '✅', 'var(--accent-yellow)', `of ${fmtN(m.totalHC)} total`, 'neu')}
    ${kpiCard('Best Location', m.bestLocation, '📍', 'var(--accent-green)', 'Top performer', 'up')}
    ${kpiCard('Top Manager', m.topManager.split(' ')[0]+'…', '🏆', 'var(--accent-primary)', 'Highest sales', 'up')}
  </div>

  <div class="g21 mb20">
    <div class="card">
      <div class="ch"><div class="ct">📈 Daily Sales Trend</div><span class="cbadge">Last 20 Days</span></div>
      <div class="cb"><div class="cw" style="height:220px"><canvas id="ch-daily"></canvas></div></div>
    </div>
    <div class="card">
      <div class="ch"><div class="ct">📍 Location Split</div></div>
      <div class="cb" style="display:flex;gap:16px;align-items:center">
        <div class="cw" style="height:180px;width:180px;flex-shrink:0"><canvas id="ch-loc-donut"></canvas></div>
        <div class="dl">
          ${MODEL.locations.map((l,i)=>`<div class="dl-i"><div class="dl-d" style="background:${['#7c6ff7','#e879f9','#22d3ee','#4ade80','#fb923c','#fbbf24'][i%6]}"></div><span class="dl-l">${l.name}</span><span class="dl-v">${fmtL(l.sales)}</span></div>`).join('')}
        </div>
      </div>
    </div>
  </div>

  <div class="sdiv"><div class="sdiv-txt">Key Insights</div><div class="sdiv-line"></div></div>
  <div class="ig">
    <div class="ii"><div class="ii-ico">🏆</div><div class="ii-txt"><strong>Top Manager</strong><span>${m.topManager} leads with highest sales volume</span></div></div>
    <div class="ii"><div class="ii-ico">📍</div><div class="ii-txt"><strong>Best Location</strong><span>${m.bestLocation} is the #1 performing branch</span></div></div>
    <div class="ii"><div class="ii-ico">📉</div><div class="ii-txt"><strong>Focus Area</strong><span>${m.worstLocation} needs intervention — lowest achievement</span></div></div>
    <div class="ii"><div class="ii-ico">⚡</div><div class="ii-txt"><strong>Productivity</strong><span>${fmtL(m.productivity)} per head — benchmark against top branches</span></div></div>
    <div class="ii"><div class="ii-ico">🎯</div><div class="ii-txt"><strong>Achievement</strong><span>${m.achPct}% of monthly target achieved</span></div></div>
    <div class="ii"><div class="ii-ico">🔥</div><div class="ii-txt"><strong>Activation</strong><span>${m.convPct}% conversion rate across all teams</span></div></div>
  </div>`;
  $('dashboard-zone').innerHTML=html;

  // Charts
  NSDCharts.line('ch-daily', MODEL.dailyDates.map(d=>d.slice(5)), [{label:'Daily Sales',data:MODEL.dailySales,color:'#7c6ff7'}], {currency:true});
  NSDCharts.doughnut('ch-loc-donut', MODEL.locations.map(l=>l.name), MODEL.locations.map(l=>l.sales));
}

// ─── SALES ────────────────────────────────────────────────────────────────────
function renderSales(){
  const m=MODEL.meta;
  const weeks = Object.keys(MODEL.weekMap);
  const wVals = Object.values(MODEL.weekMap);
  const mtd = MODEL.dailySales.reduce((s,v)=>s+v,0);
  const today = new Date().getDate();
  const daysLeft = new Date(new Date().getFullYear(), new Date().getMonth()+1, 0).getDate() - today;
  const rrr = daysLeft>0 ? ((m.totalTarget - m.totalSales)/daysLeft) : 0;

  const html=`
  <div class="ph"><div><h1>📈 Sales Performance</h1><p>Daily, weekly & monthly trend analysis</p></div></div>

  <div class="kpi-grid">
    ${kpiCard('MTD Sales', fmtL(m.totalSales), '📅', 'var(--accent-primary)', 'Month to Date', 'up')}
    ${kpiCard('WTD Sales', fmtL(wVals[wVals.length-1]||0), '📆', 'var(--accent-cyan)', 'This Week', 'up')}
    ${kpiCard('Daily Run Rate', fmtL(m.totalSales/today), '📊', 'var(--accent-green)', `Avg per day`, 'neu')}
    ${kpiCard('Req. Run Rate', fmtL(Math.max(rrr,0)), '🎯', 'var(--accent-orange)', `${daysLeft} days left`, rrr>0?'dn':'up')}
    ${kpiCard('Achievement', (m.achPct||'—')+'%', '🏆', 'var(--accent-yellow)', 'vs Monthly Target', parseFloat(m.achPct)>=100?'up':'dn')}
    ${kpiCard('Conversion', m.convPct+'%', '🔥', 'var(--accent-pink)', 'Activation Rate', 'up')}
  </div>

  <div class="g2 mb20">
    <div class="card">
      <div class="ch"><div class="ct">📈 Daily Sales Trend</div><span class="cbadge">Last ${MODEL.dailyDates.length} Days</span></div>
      <div class="cb"><div class="cw" style="height:220px"><canvas id="ch-s-daily"></canvas></div></div>
    </div>
    <div class="card">
      <div class="ch"><div class="ct">📊 Weekly Achievement</div></div>
      <div class="cb"><div class="cw" style="height:220px"><canvas id="ch-s-weekly"></canvas></div></div>
    </div>
  </div>

  <div class="card mb20">
    <div class="ch"><div class="ct">📍 Location vs Target</div><span class="cbadge">Sales vs Target Comparison</span></div>
    <div class="cb"><div class="cw" style="height:220px"><canvas id="ch-s-loc"></canvas></div></div>
  </div>

  <div class="g2">
    <div class="card">
      <div class="ch"><div class="ct">🏆 Top Locations by Sales</div></div>
      <div class="cb p0">
        <div class="tw"><table class="dt">
          <thead><tr><th>#</th><th>Location</th><th>Sales</th><th>Target</th><th>Ach%</th><th>HC</th></tr></thead>
          <tbody>
            ${MODEL.locations.map((l,i)=>`<tr class="${i<3?'r'+(i+1):''}">
              <td>${rankBadge(i)}</td>
              <td class="tn">${l.name}</td>
              <td class="tv">${fmtL(l.sales)}</td>
              <td class="tv">${fmtL(l.target)}</td>
              <td><span class="pill ${achClass(fmtP(l.sales,l.target))}">${fmtP(l.sales,l.target)}</span></td>
              <td>${l.hc}</td>
            </tr>`).join('')}
          </tbody>
        </table></div>
      </div>
    </div>
    <div class="card">
      <div class="ch"><div class="ct">📊 Achievement Breakdown</div></div>
      <div class="cb"><div class="cw" style="height:260px"><canvas id="ch-s-ach"></canvas></div></div>
    </div>
  </div>`;
  $('dashboard-zone').innerHTML=html;

  NSDCharts.line('ch-s-daily', MODEL.dailyDates.map(d=>d.slice(5)), [{label:'Sales',data:MODEL.dailySales}], {currency:true});
  NSDCharts.bar('ch-s-weekly', weeks, [{label:'Weekly Sales',data:wVals,color:'#7c6ff7'}], {currency:true});
  NSDCharts.bar('ch-s-loc', MODEL.locations.map(l=>l.name),
    [{label:'Sales',data:MODEL.locations.map(l=>l.sales),color:'#7c6ff7'},{label:'Target',data:MODEL.locations.map(l=>l.target),color:'#e879f9'}],
    {currency:true});
  NSDCharts.doughnut('ch-s-ach', MODEL.locations.map(l=>l.name), MODEL.locations.map(l=>l.sales));
}

// ─── MANAGER ──────────────────────────────────────────────────────────────────
function renderManager(){
  const managers=MODEL.managers;
  const maxSales=managers[0]?.sales||1;
  const html=`
  <div class="ph"><div><h1>👔 Manager Dashboard</h1><p>L3 Manager performance ranking — sorted by achievement</p></div></div>

  <div class="kpi-grid">
    ${kpiCard('Total Managers', fmtN(managers.length), '👔', 'var(--accent-primary)', 'L3 level', 'neu')}
    ${kpiCard('Top Manager', managers[0]?.name?.split(' ')[0]||'—', '🏆', 'var(--accent-yellow)', fmtL(managers[0]?.sales), 'up')}
    ${kpiCard('Avg Team Sales', fmtL(managers.reduce((s,m)=>s+m.sales,0)/managers.length), '📊', 'var(--accent-cyan)', 'Per manager', 'neu')}
    ${kpiCard('Total Activation', fmtN(managers.reduce((s,m)=>s+m.activation,0)), '🔥', 'var(--accent-pink)', 'Combined', 'up')}
  </div>

  <div class="g21 mb20">
    <div class="card">
      <div class="ch"><div class="ct">🏆 Manager Sales Ranking</div><span class="cbadge">Sorted by Sales</span></div>
      <div class="cb"><div class="cw" style="height:260px"><canvas id="ch-mgr-bar"></canvas></div></div>
    </div>
    <div class="card">
      <div class="ch"><div class="ct">📊 Sales Share</div></div>
      <div class="cb" style="display:flex;flex-direction:column;gap:12px">
        <div class="cw" style="height:180px"><canvas id="ch-mgr-pie"></canvas></div>
        <div class="dl">
          ${managers.slice(0,5).map((m,i)=>`<div class="dl-i"><div class="dl-d" style="background:${['#7c6ff7','#e879f9','#22d3ee','#4ade80','#fb923c'][i]}"></div><span class="dl-l">${m.name.split(' ')[0]}</span><span class="dl-v">${fmtL(m.sales)}</span></div>`).join('')}
        </div>
      </div>
    </div>
  </div>

  <div class="card">
    <div class="ch"><div class="ct">📋 Manager Performance Table</div><span class="cbadge">${managers.length} Managers</span>
      <div class="ca"><button class="cbtn" onclick="renderManager()">↻ Refresh</button></div>
    </div>
    <div class="cb p0">
      <div class="tw"><table class="dt">
        <thead><tr><th>Rank</th><th>Manager</th><th>HC</th><th>Sales</th><th>Target</th><th>Ach%</th><th>Activation</th><th>Productivity</th><th>Sales Bar</th></tr></thead>
        <tbody>
          ${managers.map((m,i)=>`<tr class="${i<3?'r'+(i+1):''}">
            <td>${rankBadge(i)}</td>
            <td class="tn">${m.name}</td>
            <td>${m.hc}</td>
            <td class="tv">${fmtL(m.sales)}</td>
            <td class="tv">${fmtL(m.target)}</td>
            <td><span class="pill ${achClass(fmtP(m.sales,m.target))}">${fmtP(m.sales,m.target)}</span></td>
            <td>${fmtN(m.activation)}</td>
            <td class="tv">${m.hc?fmtL(m.sales/m.hc):'—'}</td>
            <td>${barCell(m.sales,maxSales)}</td>
          </tr>`).join('')}
        </tbody>
      </table></div>
    </div>
  </div>`;
  $('dashboard-zone').innerHTML=html;
  NSDCharts.hbar('ch-mgr-bar', managers.map(m=>m.name.split(' ')[0]), managers.map(m=>m.sales), {currency:true});
  NSDCharts.doughnut('ch-mgr-pie', managers.map(m=>m.name.split(' ')[0]), managers.map(m=>m.sales));
}

// ─── TL ──────────────────────────────────────────────────────────────────────
function renderTL(){
  const tls=MODEL.tls;
  const maxS=tls[0]?.sales||1;
  const html=`
  <div class="ph"><div><h1>👤 Team Leader Dashboard</h1><p>TL-wise headcount, sales, activation and productivity ranking</p></div></div>

  <div class="kpi-grid">
    ${kpiCard('Total TLs', fmtN(tls.length), '👤', 'var(--accent-primary)', 'Team Leaders', 'neu')}
    ${kpiCard('Top TL', tls[0]?.name?.split(' ')[0]||'—', '🏆', 'var(--accent-yellow)', fmtL(tls[0]?.sales), 'up')}
    ${kpiCard('Avg TL Sales', fmtL(tls.reduce((s,t)=>s+t.sales,0)/tls.length), '📊', 'var(--accent-cyan)', 'Per TL', 'neu')}
    ${kpiCard('Avg Team Size', (tls.reduce((s,t)=>s+t.hc,0)/tls.length).toFixed(1), '👥', 'var(--accent-green)', 'Execs per TL', 'neu')}
  </div>

  <div class="g2 mb20">
    <div class="card">
      <div class="ch"><div class="ct">🏆 TL Sales Ranking</div></div>
      <div class="cb"><div class="cw" style="height:240px"><canvas id="ch-tl-bar"></canvas></div></div>
    </div>
    <div class="card">
      <div class="ch"><div class="ct">📊 TL Activation Rate</div></div>
      <div class="cb"><div class="cw" style="height:240px"><canvas id="ch-tl-activ"></canvas></div></div>
    </div>
  </div>

  <div class="card">
    <div class="ch"><div class="ct">📋 TL Performance Table</div><span class="cbadge">${tls.length} Team Leaders</span></div>
    <div class="cb p0"><div class="tw"><table class="dt">
      <thead><tr><th>Rank</th><th>TL Name</th><th>HC</th><th>Sales</th><th>Target</th><th>Ach%</th><th>Activation</th><th>Productivity</th><th>Sales Bar</th></tr></thead>
      <tbody>
        ${tls.map((t,i)=>`<tr class="${i<3?'r'+(i+1):''}">
          <td>${rankBadge(i)}</td>
          <td class="tn">${t.name}</td>
          <td>${t.hc}</td>
          <td class="tv">${fmtL(t.sales)}</td>
          <td class="tv">${fmtL(t.target)}</td>
          <td><span class="pill ${achClass(fmtP(t.sales,t.target))}">${fmtP(t.sales,t.target)}</span></td>
          <td>${fmtN(t.activation)}</td>
          <td class="tv">${t.hc?fmtL(t.sales/t.hc):'—'}</td>
          <td>${barCell(t.sales,maxS)}</td>
        </tr>`).join('')}
      </tbody>
    </table></div></div>
  </div>`;
  $('dashboard-zone').innerHTML=html;
  NSDCharts.hbar('ch-tl-bar', tls.slice(0,10).map(t=>t.name.split(' ')[0]), tls.slice(0,10).map(t=>t.sales), {currency:true});
  NSDCharts.bar('ch-tl-activ', tls.slice(0,10).map(t=>t.name.split(' ')[0]), [{label:'Activation',data:tls.slice(0,10).map(t=>t.activation),color:'#4ade80'}]);
}

// ─── EXECUTIVE ────────────────────────────────────────────────────────────────
function renderExec(){
  const execs=MODEL.execs;
  const maxS=execs[0]?.sales||1;
  const searchVal=($('exec-search')||{}).value||'';
  const filtered=searchVal?execs.filter(e=>(e.name||'').toLowerCase().includes(searchVal.toLowerCase())||(e.tl||'').toLowerCase().includes(searchVal.toLowerCase())||(e.location||'').toLowerCase().includes(searchVal.toLowerCase())):execs;

  const html=`
  <div class="ph"><div><h1>👨‍💼 Executive Dashboard</h1><p>Individual executive performance — all agents ranked</p></div></div>

  <div class="kpi-grid">
    ${kpiCard('Total Execs', fmtN(execs.length), '👨‍💼', 'var(--accent-primary)', 'All agents', 'neu')}
    ${kpiCard('Top Executive', (execs[0]?.name||'—').split(' ')[0], '🏆', 'var(--accent-yellow)', fmtL(execs[0]?.sales), 'up')}
    ${kpiCard('Avg Exec Sales', fmtL(execs.reduce((s,e)=>s+e.sales,0)/execs.length), '📊', 'var(--accent-cyan)', 'Per executive', 'neu')}
    ${kpiCard('High Performers', fmtN(execs.filter(e=>e.sales>(execs.reduce((s,x)=>s+x.sales,0)/execs.length)).length), '⭐', 'var(--accent-green)', 'Above avg', 'up')}
  </div>

  <div class="fr">
    <input class="finp" id="exec-search" placeholder="🔍 Search by name, TL, location…" value="${searchVal}" oninput="renderExec()" style="min-width:260px">
    <span style="font-size:.72rem;color:var(--text-muted)">Showing ${filtered.length} of ${execs.length}</span>
  </div>

  <div class="card">
    <div class="ch"><div class="ct">📋 Executive Rankings</div><span class="cbadge">${filtered.length} Records</span></div>
    <div class="cb p0"><div class="tw"><table class="dt">
      <thead><tr><th>Rank</th><th>Emp ID</th><th>Name</th><th>Manager</th><th>TL</th><th>Location</th><th>Sales</th><th>Target</th><th>Activation</th><th>Productivity</th><th>Sales Bar</th></tr></thead>
      <tbody>
        ${filtered.slice(0,50).map((e,i)=>`<tr class="${i<3?'r'+(i+1):''}">
          <td>${rankBadge(i)}</td>
          <td style="font-family:'JetBrains Mono',monospace;font-size:.72rem;color:var(--text-muted)">${e.id||'—'}</td>
          <td class="tn">${e.name||'—'}</td>
          <td>${e.manager||'—'}</td>
          <td>${e.tl||'—'}</td>
          <td>${e.location||'—'}</td>
          <td class="tv">${fmtL(e.sales)}</td>
          <td class="tv">${fmtL(e.target)||'—'}</td>
          <td>${fmtN(e.activation)}</td>
          <td class="tv">${fmtL(e.sales)}</td>
          <td>${barCell(e.sales,maxS)}</td>
        </tr>`).join('')}
      </tbody>
    </table></div></div>
  </div>`;
  $('dashboard-zone').innerHTML=html;
  // Re-bind search
  setTimeout(()=>{ const s=$('exec-search'); if(s)s.focus(); },50);
}

// ─── LOCATION ─────────────────────────────────────────────────────────────────
function renderLocation(){
  const locs=MODEL.locations;
  const maxS=locs[0]?.sales||1;
  const html=`
  <div class="ph"><div><h1>📍 Location Dashboard</h1><p>Branch-wise headcount, sales and achievement comparison</p></div></div>

  <div class="kpi-grid">
    ${kpiCard('Total Locations', fmtN(locs.length), '📍', 'var(--accent-primary)', 'Active branches', 'neu')}
    ${kpiCard('Best Branch', locs[0]?.name||'—', '🏆', 'var(--accent-yellow)', fmtL(locs[0]?.sales), 'up')}
    ${kpiCard('Worst Branch', locs[locs.length-1]?.name||'—', '⚠️', 'var(--accent-red)', fmtL(locs[locs.length-1]?.sales), 'dn')}
    ${kpiCard('Avg Branch Sales', fmtL(locs.reduce((s,l)=>s+l.sales,0)/locs.length), '📊', 'var(--accent-cyan)', 'Per branch', 'neu')}
  </div>

  <div class="g2 mb20">
    <div class="card">
      <div class="ch"><div class="ct">📊 Location Sales Comparison</div></div>
      <div class="cb"><div class="cw" style="height:240px"><canvas id="ch-loc-bar"></canvas></div></div>
    </div>
    <div class="card">
      <div class="ch"><div class="ct">🔥 Activation by Location</div></div>
      <div class="cb"><div class="cw" style="height:240px"><canvas id="ch-loc-activ"></canvas></div></div>
    </div>
  </div>

  <div class="card">
    <div class="ch"><div class="ct">📋 Location Performance Table</div><span class="cbadge">${locs.length} Branches</span></div>
    <div class="cb p0"><div class="tw"><table class="dt">
      <thead><tr><th>Rank</th><th>Location</th><th>HC</th><th>Sales</th><th>Target</th><th>Ach%</th><th>Activation</th><th>Productivity</th><th>Sales Bar</th></tr></thead>
      <tbody>
        ${locs.map((l,i)=>`<tr class="${i<3?'r'+(i+1):''}">
          <td>${rankBadge(i)}</td>
          <td class="tn">📍 ${l.name}</td>
          <td>${l.hc}</td>
          <td class="tv">${fmtL(l.sales)}</td>
          <td class="tv">${fmtL(l.target)}</td>
          <td><span class="pill ${achClass(fmtP(l.sales,l.target))}">${fmtP(l.sales,l.target)}</span></td>
          <td>${fmtN(l.activation)}</td>
          <td class="tv">${l.hc?fmtL(l.sales/l.hc):'—'}</td>
          <td>${barCell(l.sales,maxS)}</td>
        </tr>`).join('')}
      </tbody>
    </table></div></div>
  </div>`;
  $('dashboard-zone').innerHTML=html;
  NSDCharts.bar('ch-loc-bar', locs.map(l=>l.name), [{label:'Sales',data:locs.map(l=>l.sales),color:'#7c6ff7'},{label:'Target',data:locs.map(l=>l.target),color:'#e879f9'}], {currency:true});
  NSDCharts.bar('ch-loc-activ', locs.map(l=>l.name), [{label:'Activation',data:locs.map(l=>l.activation),color:'#4ade80'}]);
}

// ─── VINTAGE ──────────────────────────────────────────────────────────────────
function renderVintage(){
  const vb=MODEL.vintBuckets;
  const total=Object.values(vb).reduce((s,v)=>s+v,0)||1;
  const bucketColors=['#7c6ff7','#22d3ee','#4ade80','#fbbf24','#f87171'];
  const html=`
  <div class="ph"><div><h1>📅 Vintage Analysis</h1><p>Employee tenure distribution across age buckets</p></div></div>

  <div class="kpi-grid" style="grid-template-columns:repeat(5,1fr)">
    ${Object.entries(vb).map(([k,v],i)=>`
      <div class="vb">
        <div class="vb-lbl">${k}</div>
        <div class="vb-val" style="color:${bucketColors[i]}">${v}</div>
        <div class="vb-sub">${((v/total)*100).toFixed(1)}% of HC</div>
      </div>
    `).join('')}
  </div>

  <div class="g2 mb20">
    <div class="card">
      <div class="ch"><div class="ct">📊 Vintage Distribution</div></div>
      <div class="cb" style="display:flex;gap:16px;align-items:center">
        <div class="cw" style="height:220px;width:220px;flex-shrink:0"><canvas id="ch-vin-donut"></canvas></div>
        <div class="dl">
          ${Object.entries(vb).map(([k,v],i)=>`<div class="dl-i"><div class="dl-d" style="background:${bucketColors[i]}"></div><span class="dl-l">${k}</span><span class="dl-v">${v} HC (${((v/total)*100).toFixed(1)}%)</span></div>`).join('')}
        </div>
      </div>
    </div>
    <div class="card">
      <div class="ch"><div class="ct">📈 Tenure Bar Chart</div></div>
      <div class="cb"><div class="cw" style="height:220px"><canvas id="ch-vin-bar"></canvas></div></div>
    </div>
  </div>

  <div class="card">
    <div class="ch"><div class="ct">📋 Vintage Summary Table</div></div>
    <div class="cb p0"><div class="tw"><table class="dt">
      <thead><tr><th>Tenure Bucket</th><th>HC Count</th><th>% of Total HC</th><th>Typical Sales Index</th><th>Action Recommended</th></tr></thead>
      <tbody>
        <tr><td class="tn">0–30 Days</td><td class="tv">${vb['0-30 Days']}</td><td>${((vb['0-30 Days']/total)*100).toFixed(1)}%</td><td><span class="pill po">Low</span></td><td>OJT compliance, buddy program</td></tr>
        <tr><td class="tn">31–60 Days</td><td class="tv">${vb['31-60 Days']}</td><td>${((vb['31-60 Days']/total)*100).toFixed(1)}%</td><td><span class="pill po">Medium</span></td><td>Product knowledge, shadowing</td></tr>
        <tr><td class="tn">61–90 Days</td><td class="tv">${vb['61-90 Days']}</td><td>${((vb['61-90 Days']/total)*100).toFixed(1)}%</td><td><span class="pill pg">Ramping</span></td><td>Target setting, coaching</td></tr>
        <tr><td class="tn">91–180 Days</td><td class="tv">${vb['91-180 Days']}</td><td>${((vb['91-180 Days']/total)*100).toFixed(1)}%</td><td><span class="pill pg">High</span></td><td>Maintain momentum</td></tr>
        <tr><td class="tn">180+ Days</td><td class="tv">${vb['180+ Days']}</td><td>${((vb['180+ Days']/total)*100).toFixed(1)}%</td><td><span class="pill pv">Core</span></td><td>Retention, advancement path</td></tr>
      </tbody>
    </table></div></div>
  </div>`;
  $('dashboard-zone').innerHTML=html;
  NSDCharts.doughnut('ch-vin-donut', Object.keys(vb), Object.values(vb));
  NSDCharts.bar('ch-vin-bar', Object.keys(vb), [{label:'Headcount',data:Object.values(vb),color:'#7c6ff7'}]);
}

// ─── KPI GUIDE ─────────────────────────────────────────────────────────────────
function renderKPIGuide(){
  const html=`
  <div class="ph"><div><h1>📐 KPI Formula Guide</h1><p>All formulas, DAX measures, data model and automation opportunities</p></div></div>

  <div class="kpi-grid">
    ${kpiCard('KPI Formulas', '18+', '📐', 'var(--accent-primary)', 'Documented', 'neu')}
    ${kpiCard('DAX Measures', '12', '⚙️', 'var(--accent-cyan)', 'Power BI ready', 'neu')}
    ${kpiCard('Data Sources', '14', '📁', 'var(--accent-green)', 'Sheets mapped', 'neu')}
    ${kpiCard('Automation', '6', '🤖', 'var(--accent-pink)', 'Opportunities', 'neu')}
  </div>

  <div class="g2 mb20">
    <div class="card">
      <div class="ch"><div class="ct">📐 Core KPI Formulas</div></div>
      <div class="cb p0"><div class="tw"><table class="dt">
        <thead><tr><th>KPI</th><th>Formula</th><th>Unit</th></tr></thead>
        <tbody>
          <tr><td class="tn">Achievement %</td><td style="font-family:'JetBrains Mono',monospace;font-size:.72rem">(MTD Sales / MTD Target) × 100</td><td>%</td></tr>
          <tr><td class="tn">Productivity</td><td style="font-family:'JetBrains Mono',monospace;font-size:.72rem">Total Sales / Active HC</td><td>₹</td></tr>
          <tr><td class="tn">Conversion %</td><td style="font-family:'JetBrains Mono',monospace;font-size:.72rem">(Activations / Total Leads) × 100</td><td>%</td></tr>
          <tr><td class="tn">Daily Run Rate</td><td style="font-family:'JetBrains Mono',monospace;font-size:.72rem">MTD Sales / Working Days Elapsed</td><td>₹/day</td></tr>
          <tr><td class="tn">Required Run Rate</td><td style="font-family:'JetBrains Mono',monospace;font-size:.72rem">(Target - MTD Sales) / Remaining Days</td><td>₹/day</td></tr>
          <tr><td class="tn">Activation %</td><td style="font-family:'JetBrains Mono',monospace;font-size:.72rem">(Active Agents / Total HC) × 100</td><td>%</td></tr>
          <tr><td class="tn">Attrition Rate</td><td style="font-family:'JetBrains Mono',monospace;font-size:.72rem">(Exits in Period / Avg HC) × 100</td><td>%</td></tr>
          <tr><td class="tn">WTD Achievement</td><td style="font-family:'JetBrains Mono',monospace;font-size:.72rem">(WTD Sales / Weekly Target) × 100</td><td>%</td></tr>
        </tbody>
      </table></div></div>
    </div>

    <div class="card">
      <div class="ch"><div class="ct">⚙️ Power BI DAX Measures</div></div>
      <div class="cb p0"><div class="tw"><table class="dt">
        <thead><tr><th>Measure</th><th>DAX</th></tr></thead>
        <tbody>
          <tr><td class="tn">MTD Sales</td><td style="font-family:'JetBrains Mono',monospace;font-size:.68rem">TOTALMTD(SUM(Sales[Amount]), Dates[Date])</td></tr>
          <tr><td class="tn">WTD Sales</td><td style="font-family:'JetBrains Mono',monospace;font-size:.68rem">TOTALWTD(SUM(Sales[Amount]), Dates[Date])</td></tr>
          <tr><td class="tn">YTD Sales</td><td style="font-family:'JetBrains Mono',monospace;font-size:.68rem">TOTALYTD(SUM(Sales[Amount]), Dates[Date])</td></tr>
          <tr><td class="tn">Achievement%</td><td style="font-family:'JetBrains Mono',monospace;font-size:.68rem">DIVIDE([MTD Sales],[MTD Target],0)*100</td></tr>
          <tr><td class="tn">Productivity</td><td style="font-family:'JetBrains Mono',monospace;font-size:.68rem">DIVIDE([Total Sales],[Active HC],0)</td></tr>
          <tr><td class="tn">Prev Month</td><td style="font-family:'JetBrains Mono',monospace;font-size:.68rem">CALCULATE([Total Sales],PREVIOUSMONTH(Dates[Date]))</td></tr>
          <tr><td class="tn">MoM Growth</td><td style="font-family:'JetBrains Mono',monospace;font-size:.68rem">DIVIDE([Total Sales]-[PM Sales],[PM Sales],0)</td></tr>
        </tbody>
      </table></div></div>
    </div>
  </div>

  <div class="card mb20">
    <div class="ch"><div class="ct">🗂️ Data Model — Sheet Relationships</div></div>
    <div class="cb">
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;font-size:.72rem">
        ${[
          ['Sale Dump','EmpID, Date, Sales, TL, Manager, Location'],
          ['Weekly HC','EmpID, Status, Week, Active Flag'],
          ['L1 Activation','EmpID, Date, Activated, Product'],
          ['TL Count','TL Name, HC, Sales, Date'],
          ['Mapping','EmpID→TL→Manager→Location'],
          ['Monthly HC','Month, Location, HC, Target'],
          ['Vintage Wise','EmpID, DOJ, Bucket, Sales'],
          ['OJT Compliance','EmpID, Compliance %, Status'],
        ].map(([name,fields])=>`
          <div style="background:var(--bg-surface);border:1px solid var(--border);border-radius:var(--r-md);padding:10px 12px">
            <div style="font-weight:700;color:var(--accent-secondary);margin-bottom:6px">${name}</div>
            <div style="color:var(--text-muted);line-height:1.7">${fields}</div>
          </div>
        `).join('')}
      </div>
    </div>
  </div>

  <div class="card">
    <div class="ch"><div class="ct">🤖 Automation Opportunities</div></div>
    <div class="cb">
      <div class="ig">
        <div class="ii"><div class="ii-ico">📧</div><div class="ii-txt"><strong>Daily Email Report</strong><span>Power Automate → trigger on new xlsb upload → generate PDF → send to Pranav + managers</span></div></div>
        <div class="ii"><div class="ii-ico">⚠️</div><div class="ii-txt"><strong>Low Achievement Alert</strong><span>Alert TLs when team falls below 70% achievement by 15th of month</span></div></div>
        <div class="ii"><div class="ii-ico">📊</div><div class="ii-txt"><strong>Auto Dashboard Refresh</strong><span>Drag new xlsb into folder → Python script extracts → GitHub Pages auto-deploys</span></div></div>
        <div class="ii"><div class="ii-ico">🔄</div><div class="ii-txt"><strong>Weekly HC Sync</strong><span>Pull from HRMS → update Mapping sheet → recalculate vintage buckets automatically</span></div></div>
        <div class="ii"><div class="ii-ico">📱</div><div class="ii-txt"><strong>WhatsApp Digest</strong><span>Daily 9AM: top 3 performers, overall achievement, lagging locations via WhatsApp Business API</span></div></div>
        <div class="ii"><div class="ii-ico">🤖</div><div class="ii-txt"><strong>AI Coaching Notes</strong><span>Claude API: generate personalized coaching notes per TL based on team productivity delta</span></div></div>
      </div>
    </div>
  </div>`;
  $('dashboard-zone').innerHTML=html;
}

// ─── KPI Card Helper ──────────────────────────────────────────────────────────
function kpiCard(label, value, icon, color, sub, badgeClass='neu'){
  return `<div class="kpi" style="--kc:${color}">
    <div class="kpi-lbl"><div class="kdot"></div>${label}</div>
    <div class="kpi-val">${value}</div>
    <div class="kpi-sub"><span class="kbadge ${badgeClass}">${sub}</span></div>
    <div class="k-ico">${icon}</div>
  </div>`;
}

// ─── Export ───────────────────────────────────────────────────────────────────
window.exportCSV = () => {
  if(!MODEL)return;
  const rows = [['Rank','Name','Manager','TL','Location','Sales','Target','Activation']];
  MODEL.execs.forEach((e,i)=>rows.push([i+1,e.name,e.manager,e.tl,e.location,e.sales,e.target,e.activation]));
  const csv = rows.map(r=>r.join(',')).join('\n');
  const a=document.createElement('a'); a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);
  a.download='NSD_Executive_Report.csv'; a.click();
  toast('CSV exported','ts');
};

window.loadNewFiles = () => {
  FILES=[]; MODEL=null;
  $('upload-zone').style.display='flex';
  $('dashboard-zone').style.display='none';
  renderFileList();
};

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', ()=>{
  initNav();
  initUpload();
  // expose for button
  window.processFiles = processFiles;
});

})();
