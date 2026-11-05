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
   s.seen=s.seen||e.seen||e.done||e.remaining>0;s.result=s.done?'right':s.seen?'wrong':undefined;continue;
  }
  if(e.kind==='restore'){s.done=e.done;s.remaining=e.remaining;s.seen=e.seen;s.result=e.seen?(e.done?'right':'wrong'):undefined;continue;}
  s.seen=true;
  if(e.kind==='wrong'||e.kind==='guess'){s.done=false;s.remaining=2;s.result='wrong';}
  if(e.kind==='right'){s.result='right';s.remaining=Math.max(0,s.remaining-1);s.done=s.remaining===0;}
 }
 return states;
}
// Shared saves grow by union; only measured counters use idempotent additions.
const safe=k=>!['__proto__','constructor','prototype'].includes(k);
function merge(a,b){
 if(b===null||b===undefined)return a;
 if(Array.isArray(b)){const old=Array.isArray(a)?a:[];return [...new Map([...old,...b].map(v=>[JSON.stringify(v),v])).values()];}
 if(typeof b==='object'){const out={...(a&&typeof a==='object'&&!Array.isArray(a)?a:{})};for(const [k,v] of Object.entries(b))if(safe(k))out[k]=merge(out[k],v);return out;}
 if(typeof b==='number')return Math.max(Number.isFinite(a)?a:0,b);
 if(typeof b==='boolean')return !!a||b;
 if(a==='done'||a==='right')return a;
 return b;
}
function isCounter(app,path){
 const key=path[0],last=path.at(-1);
 return app==='raid'?(key==='fnphraid.stats'&&['seen','right','wrong','guessed'].includes(last))||(key==='fnphraid.campaign.v1'&&last==='visualXP')||(key==='fnphraid.flight.v1'&&last==='sets'):
 key==='nebula-progress-v1'&&path[1]==='time'&&['by','days'].includes(path[2])&&path.length===4;
}
function operation(app,current,base){
 const add=[];
 function walk(value,old,path){
  if(typeof value==='number'&&isCounter(app,path)){
   if(!base)return value;
   const n=Math.max(0,value-(Number(old)||0));if(n)add.push([path,n]);return undefined;
  }
  if(Array.isArray(value))return value;
  if(value&&typeof value==='object'){const out={};for(const [k,v] of Object.entries(value)){if(!safe(k))continue;const next=walk(v,old?.[k],[...path,k]);if(next!==undefined)out[k]=next;}return out;}
  return value;
 }
 return {app,data:walk(current,base,[]),add};
}
function applyOperation(state,event){
 const out=merge(state,event.data);
 // A timetable is ordered configuration, not a completion set. Preserve duplicate day slots.
 if(event.app==='nebula'){
  const old=state?.['nebula-progress-v1']||{},next=event.data['nebula-progress-v1'];
  if(next){const size=Number.isInteger(next.orderSize)&&next.orderSize>0&&next.orderSize<=366?next.orderSize:old.orderSize||48;const valid=o=>Array.isArray(o)&&o.length===size;const selected=valid(next.order)&&(!valid(old.order)||(Number(next.orderAt)||0)>(Number(old.orderAt)||0))?next.order:old.order;if(valid(selected))out['nebula-progress-v1'].order=selected.slice();}
  const prior=state?.['nebula-start'],incoming=event.data['nebula-start'];
  if(incoming&&prior&&(Number(incoming.changedAt)||0)<=(Number(prior.changedAt)||0))out['nebula-start']={...prior};
 }

 if(event.app==='raid'&&event.data['fnphraid.bestTime'])for(const [id,n] of Object.entries(event.data['fnphraid.bestTime'])){const old=state?.['fnphraid.bestTime']?.[id];if(old>0&&n>0)out['fnphraid.bestTime'][id]=Math.min(old,n);}
 for(const [path,n] of event.add||[]){if(!isCounter(event.app,path)||!path.every(safe)||!Number.isFinite(n)||n<0)continue;let at=out;for(const k of path.slice(0,-1))at=at[k]||(at[k]={});const k=path.at(-1);at[k]=(Number(at[k])||0)+n;}
 return out;
}
root.McqProgressCore={reduce,merge,operation,applyOperation,isCounter};
})(typeof window!=='undefined'?window:globalThis);
