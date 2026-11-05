/* Shared deterministic MCQ mastery: first success completes; a miss/guess needs two successes. */
(function(root){
'use strict';
function reduce(events,initial={}){
 const states=Object.assign(Object.create(null),Object.fromEntries(Object.entries(initial).map(([id,s])=>[id,{...s}]))),seen=new Set();
 const sorted=events.slice().sort((a,b)=>(a.kind==='seed'?0:1)-(b.kind==='seed'?0:1)||a.at-b.at||a.id.localeCompare(b.id));
 for(const e of sorted){
  if(seen.has(e.id))continue;seen.add(e.id);
  const s=states[e.q]||(states[e.q]={done:false,remaining:0,seen:false});
  if(e.kind==='seed'){
   if(e.remaining>0){s.remaining=Math.max(s.remaining,e.remaining);s.done=false;}else if(e.done&&!s.remaining)s.done=true;
   s.seen=s.seen||e.seen||e.done||e.remaining>0;continue;
  }
  if(e.kind==='restore'){s.done=e.done;s.remaining=e.remaining;s.seen=e.seen;continue;}
  s.seen=true;
  if(e.kind==='wrong'||e.kind==='guess'){s.done=false;s.remaining=2;}
  if(e.kind==='right'){s.remaining=Math.max(0,s.remaining-1);s.done=s.remaining===0;}
 }
 return states;
}
root.McqProgressCore={reduce};
})(typeof window!=='undefined'?window:globalThis);
