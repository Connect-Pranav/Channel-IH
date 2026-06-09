/* data.js — NSD file parser & data model builder */
const NSDParser = (() => {
  const fmt=n=>{if(!n||isNaN(n))return'—';n=Number(n);if(n>=10000000)return'₹'+(n/10000000).toFixed(2)+'Cr';if(n>=100000)return'₹'+(n/100000).toFixed(2)+'L';return'₹'+n.toLocaleString('en-IN');};
  const pct=(a,b)=>b?(((a/b)*100).toFixed(1)+'%'):'—';
  const safe=v=>(v==null||v===''||v==='N/A'||v==='NA')?null:v;

  function detectCols(headers){
    const h=headers.map(x=>String(x||'').toLowerCase().trim());
    const find=(...keys)=>{for(const k of keys){const i=h.findIndex(x=>x.includes(k));if(i!==-1)return i;}return -1;};
    return {
      empId:find('emp id','empid','employee id','emp_id','id'),
      empName:find('emp name','employee name','agent name','name','exec'),
      tl:find('tl name','team lead','tl','supervisor','tl_name'),
      manager:find('manager','l2','l3','rm','reporting'),
      location:find('location','branch','city','area','zone'),
      date:find('date','dt','sale date','trans date'),
      week:find('week','wk','week no'),
      month:find('month','mon'),
      sales:find('sales','revenue','amount','value','total sales','sale amt','net sales'),
      target:find('target','tgt','monthly target'),
      activation:find('activation','active','activated','l1'),
      status:find('status','emp status'),
      doj:find('doj','joining','date of join'),
    };
  }

  function sheetToObjects(rows){
    if(!rows||rows.length<2)return[];
    const headers=rows[0].map(x=>String(x||'').trim());
    const cols=detectCols(headers);
    return rows.slice(1).map(row=>{
      const obj={};
      headers.forEach((h,i)=>{obj[h]=safe(row[i]);});
      if(cols.empId>=0)    obj._empId=row[cols.empId];
      if(cols.empName>=0)  obj._empName=String(row[cols.empName]||'').trim();
      if(cols.tl>=0)       obj._tl=String(row[cols.tl]||'').trim();
      if(cols.manager>=0)  obj._manager=String(row[cols.manager]||'').trim();
      if(cols.location>=0) obj._location=String(row[cols.location]||'').trim();
      if(cols.date>=0)     obj._date=row[cols.date];
      if(cols.sales>=0)    obj._sales=parseFloat(row[cols.sales])||0;
      if(cols.target>=0)   obj._target=parseFloat(row[cols.target])||0;
      if(cols.activation>=0)obj._activation=parseFloat(row[cols.activation])||0;
      if(cols.status>=0)   obj._status=String(row[cols.status]||'').toLowerCase();
      if(cols.doj>=0)      obj._doj=row[cols.doj];
      if(cols.week>=0)     obj._week=row[cols.week];
      return obj;
    }).filter(r=>r._empName||r._empId||r._sales);
  }

  function computeVintage(dojVal){
    if(!dojVal)return null;
    let d;
    if(typeof dojVal==='number'){d=new Date((dojVal-25569)*86400*1000);}
    else{d=new Date(dojVal);}
    if(isNaN(d.getTime()))return null;
    const days=Math.floor((Date.now()-d.getTime())/86400000);
    if(days<=30)return'0-30 Days';
    if(days<=60)return'31-60 Days';
    if(days<=90)return'61-90 Days';
    if(days<=180)return'91-180 Days';
    return'180+ Days';
  }

  function buildModel(sheetsMap){
    const keys=Object.keys(sheetsMap);
    const findSheet=(...names)=>{
      for(const n of names){const k=keys.find(k=>k.toLowerCase().replace(/\s/g,'').includes(n.toLowerCase().replace(/\s/g,'')));if(k)return sheetsMap[k];}
      return null;
    };
    const salesDump=findSheet('saledump','salesdump','dump','daily sales','dailysales')||findSheet('daily')||sheetsMap[keys[0]]||[];
    const hcSheet=findSheet('weeklyhc','monthlyhc','hc')||[];
    const activSheet=findSheet('l1activation','activation')||[];
    const mapSheet=findSheet('mapping')||[];

    const salesRows=sheetToObjects(salesDump);
    const hcRows=sheetToObjects(hcSheet);
    const mapRows=sheetToObjects(mapSheet);

    // build mapping empId → TL/Manager/Location from mapping sheet
    const mapping={};
    for(const r of mapRows){
      const id=r._empId||r._empName;
      if(id)mapping[id]={tl:r._tl,manager:r._manager,location:r._location};
    }

    const execMap={};
    for(const r of salesRows){
      const id=r._empId||r._empName||'Unknown';
      const map=mapping[id]||{};
      if(!execMap[id]){
        execMap[id]={id,name:r._empName||String(id),
          tl:r._tl||map.tl,manager:r._manager||map.manager,location:r._location||map.location,
          sales:0,target:0,activation:0,doj:r._doj,rows:0};
      }
      execMap[id].sales+=r._sales;
      execMap[id].target+=r._target;
      execMap[id].activation+=r._activation;
      execMap[id].rows++;
      if(!execMap[id].tl&&r._tl)execMap[id].tl=r._tl;
      if(!execMap[id].manager&&r._manager)execMap[id].manager=r._manager;
      if(!execMap[id].location&&r._location)execMap[id].location=r._location;
    }
    const execs=Object.values(execMap).filter(e=>e.sales>0).sort((a,b)=>b.sales-a.sales);

    const mgrMap={};
    for(const e of execs){
      const m=e.manager||'Unassigned';
      if(!mgrMap[m])mgrMap[m]={name:m,sales:0,target:0,activation:0,hc:0};
      mgrMap[m].sales+=e.sales;mgrMap[m].target+=e.target;mgrMap[m].activation+=e.activation;mgrMap[m].hc++;
    }
    const managers=Object.values(mgrMap).sort((a,b)=>b.sales-a.sales);

    const tlMap={};
    for(const e of execs){
      const t=e.tl||'Unassigned';
      if(!tlMap[t])tlMap[t]={name:t,sales:0,target:0,activation:0,hc:0};
      tlMap[t].sales+=e.sales;tlMap[t].target+=e.target;tlMap[t].activation+=e.activation;tlMap[t].hc++;
    }
    const tls=Object.values(tlMap).sort((a,b)=>b.sales-a.sales);

    const locMap={};
    for(const e of execs){
      const l=e.location||'Unknown';
      if(!locMap[l])locMap[l]={name:l,sales:0,target:0,activation:0,hc:0};
      locMap[l].sales+=e.sales;locMap[l].target+=e.target;locMap[l].activation+=e.activation;locMap[l].hc++;
    }
    const locations=Object.values(locMap).sort((a,b)=>b.sales-a.sales);

    const dateMap={};
    for(const r of salesRows){
      if(!r._date)continue;
      let d;
      if(typeof r._date==='number')d=new Date((r._date-25569)*86400*1000).toISOString().slice(0,10);
      else d=String(r._date).slice(0,10);
      if(!dateMap[d])dateMap[d]=0;
      dateMap[d]+=r._sales;
    }
    const dailyDates=Object.keys(dateMap).sort().slice(-30);
    const dailySales=dailyDates.map(d=>dateMap[d]);

    const weekMap={};
    for(const r of salesRows){
      const w=String(r._week||'W?');
      if(!weekMap[w])weekMap[w]=0;
      weekMap[w]+=r._sales;
    }

    const totalSales=execs.reduce((s,e)=>s+e.sales,0);
    const totalTarget=execs.reduce((s,e)=>s+e.target,0)||totalSales*1.1;
    const totalActiv=execs.reduce((s,e)=>s+e.activation,0);
    const totalHC=Math.max(execs.length,hcRows.length)||1;
    const activeHC=hcRows.filter(r=>r._status==='active'||r._status==='yes').length||Math.round(totalHC*0.9);
    const productivity=totalHC?(totalSales/totalHC).toFixed(0):0;
    const convPct=totalHC?((totalActiv/totalHC)*100).toFixed(1):0;
    const achPct=totalTarget?((totalSales/totalTarget)*100).toFixed(1):'—';

    const vintBuckets={'0-30 Days':0,'31-60 Days':0,'61-90 Days':0,'91-180 Days':0,'180+ Days':0};
    for(const e of execs){const v=computeVintage(e.doj);if(v)vintBuckets[v]++;}
    // if no DOJ data spread evenly
    if(Object.values(vintBuckets).every(v=>v===0)){
      const each=Math.round(totalHC/5);
      Object.keys(vintBuckets).forEach(k=>vintBuckets[k]=each);
    }

    return{
      meta:{totalHC,activeHC,totalSales,totalTarget,totalActiv,productivity,convPct,achPct,
        bestLocation:locations[0]?.name||'—',worstLocation:locations[locations.length-1]?.name||'—',
        topManager:managers[0]?.name||'—',topExec:execs[0]?.name||'—',sheetsLoaded:keys.length},
      execs,managers,tls,locations,dailyDates,dailySales,weekMap,vintBuckets,fmt,pct
    };
  }

  async function parseFiles(fileList){
    if(!window.XLSX)throw new Error('SheetJS (XLSX) library not loaded');
    const sheetsMap={};
    for(const file of fileList){
      const buf=await file.arrayBuffer();
      const wb=XLSX.read(buf,{type:'array',cellDates:false,raw:true});
      for(const sn of wb.SheetNames){
        const ws=wb.Sheets[sn];
        const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:null,raw:true});
        if(rows.length>1)sheetsMap[sn]=rows;
      }
    }
    if(!Object.keys(sheetsMap).length)throw new Error('No valid data found in uploaded files');
    return buildModel(sheetsMap);
  }

  function demoModel(){
    const managers=[
      {name:'Osama Abdulla',sales:9580000,target:9000000,activation:72,hc:12},
      {name:'Rahul Sharma',sales:8120000,target:8500000,activation:61,hc:11},
      {name:'Priya Mehta',sales:7400000,target:7800000,activation:58,hc:10},
      {name:'Kiran Patil',sales:6900000,target:7200000,activation:52,hc:9},
      {name:'Sunita Rao',sales:6200000,target:6700000,activation:47,hc:8},
    ];
    const tls=[
      {name:'Chirag K K',sales:3200000,target:3000000,activation:28,hc:4},
      {name:'Anita S',sales:2900000,target:2800000,activation:24,hc:4},
      {name:'Ravi M',sales:2650000,target:2700000,activation:22,hc:4},
      {name:'Deepa P',sales:2400000,target:2600000,activation:19,hc:3},
      {name:'Suresh N',sales:2100000,target:2200000,activation:17,hc:3},
      {name:'Meena G',sales:1950000,target:2000000,activation:15,hc:3},
    ];
    const names=['Chirag K K','Anita S','Ravi M','Deepa P','Suresh N','Meena G','Priya T','Anand R','Sanjay V','Karan H'];
    const locs=['Peenya','Koramangala','Whitefield','Hebbal','Anekal'];
    const execs=Array.from({length:30},(_,i)=>({
      id:'EMP'+String(1000+i).padStart(4,'0'),
      name:names[i%10]+' '+(Math.floor(i/10)+1),
      tl:tls[i%6].name,manager:managers[i%5].name,location:locs[i%5],
      sales:Math.round(1800000-i*45000+Math.random()*150000),
      target:1600000,activation:Math.round(14-i*0.3),rows:30
    }));
    const locations=[
      {name:'Peenya',sales:12150000,target:11000000,activation:95,hc:18},
      {name:'Koramangala',sales:9800000,target:9200000,activation:78,hc:15},
      {name:'Whitefield',sales:8700000,target:8600000,activation:69,hc:14},
      {name:'Hebbal',sales:7500000,target:7800000,activation:60,hc:12},
      {name:'Anekal',sales:6200000,target:6800000,activation:50,hc:10},
    ];
    const totalSales=managers.reduce((s,m)=>s+m.sales,0);
    const dailyDates=Array.from({length:20},(_,i)=>{const d=new Date();d.setDate(d.getDate()-19+i);return d.toISOString().slice(0,10);});
    const dailySales=dailyDates.map(()=>Math.round(800000+Math.random()*600000));
    const weekMap={'W1':4200000,'W2':5100000,'W3':4900000,'W4':5500000};
    const vintBuckets={'0-30 Days':22,'31-60 Days':18,'61-90 Days':14,'91-180 Days':24,'180+ Days':12};
    return{
      meta:{totalHC:90,activeHC:82,totalSales,totalTarget:totalSales*1.08,totalActiv:457,
        productivity:(totalSales/90).toFixed(0),convPct:'78.4',
        achPct:((totalSales/(totalSales*1.08))*100).toFixed(1),
        bestLocation:'Peenya',worstLocation:'Anekal',
        topManager:'Osama Abdulla',topExec:'Chirag K K',sheetsLoaded:14},
      execs,managers,tls,locations,dailyDates,dailySales,weekMap,vintBuckets,fmt,pct
    };
  }

  return{parseFiles,demoModel};
})();
