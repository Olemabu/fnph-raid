/* Two distinct OSCE stations per local calendar day, including reviews and manual practice. */
(function(root){
'use strict';
const LIMIT=2;
const unique=ids=>[...new Set(ids||[])];
function used(progress,records,key,index,valid){return unique([...(records?.[key]||[]),...Object.keys(progress||{}).filter(id=>(progress[id].seen||[]).includes(index))]).filter(id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(id));}
function canOpen(id,ids){return ids.slice(0,LIMIT).includes(id)||ids.length<LIMIT;}
function choose(stations,progress,visited,index,eligible){
 const valid=new Set(stations.map(s=>s.id)),fixed=unique(visited).slice(0,LIMIT);
 const due=stations.filter(s=>progress[s.id]?.due!=null&&progress[s.id].due<=index).sort((a,b)=>progress[a.id].due-progress[b.id].due).map(s=>s.id);
 const fresh=stations.slice(0,eligible).filter(s=>!progress[s.id]||progress[s.id].stage===0).map(s=>s.id);
 const continuing=stations.slice(0,eligible).filter(s=>progress[s.id]&&progress[s.id].stage<4).map(s=>s.id);
 return unique([...fixed,...due,...fresh,...continuing]).slice(0,LIMIT).filter(id=>valid.has(id));
}
root.NebulaOsceLimit={LIMIT,used,canOpen,choose};
})(typeof window!=='undefined'?window:globalThis);
