/* Shared personal progress profile. No AI key or study access code is used. */
(function(){
'use strict';
const ENDPOINT='https://nebula-raid-progress.mabumacnelson.workers.dev',KEY='nebula-raid-sync-v1',PREFIX='nebula-raid-event-v1-';
let cfg=read(KEY,{token:'',remote:{},lastAt:0}),adapter=null,busy=false,status='Not linked',timer;
function read(key,fallback){try{return JSON.parse(localStorage.getItem(key))||fallback;}catch{return fallback;}}
function persist(){localStorage.setItem(KEY,JSON.stringify(cfg));}
function uid(){return crypto.randomUUID?crypto.randomUUID():Array.from(crypto.getRandomValues(new Uint8Array(20)),x=>x.toString(16).padStart(2,'0')).join('');}
function pending(){const out=[];for(let n=0;n<localStorage.length;n++){const key=localStorage.key(n);if(!key.startsWith(PREFIX))continue;const e=read(key,null);if(e?.profile===cfg.token)out.push(e);}return out.sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id));}
function update(){if(adapter&&cfg.token)adapter.apply(McqProgressCore.reduce(pending(),cfg.remote||{}));const el=document.getElementById('progressSyncStatus');if(el)el.textContent=status;}
function put(q,kind,extra={},seed=false){if(!cfg.token)return;const at=seed?0:Math.max(Date.now(),(cfg.lastAt||0)+1);if(!seed)cfg.lastAt=at;const e={id:uid(),q,at,kind,done:false,remaining:0,seen:true,...extra,profile:cfg.token};localStorage.setItem(PREFIX+e.id,JSON.stringify(e));}
function record(q,kind,extra){if(!q||!cfg.token)return;put(q,kind,extra);update();clearTimeout(timer);timer=setTimeout(sync,1200);}
async function request(path,token,events=[]){const response=await fetch(ENDPOINT+path,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify({events:events.map(({profile,...e})=>e)}),signal:AbortSignal.timeout(20000)});let data;try{data=await response.json();}catch{throw Error('Progress service returned an unreadable response.');}if(!response.ok)throw Error(data.error||'Progress sync failed.');return data;}
function sync(){if(busy)return busy;if(!cfg.token||!adapter)return Promise.resolve();busy=runSync();return busy;}
async function runSync(){
 const token=cfg.token;status='Syncing…';update();
 try{let more=true;while(more&&cfg.token===token){const batch=pending().slice(0,200),data=await request('/sync',token,batch);if(cfg.token!==token)break;for(const e of batch)localStorage.removeItem(PREFIX+e.id);cfg.remote=data.states||{};cfg.lastAt=Math.max(cfg.lastAt||0,data.lastAt||0);persist();more=pending().length>0;update();}if(cfg.token===token)status='Synced · '+new Date().toLocaleTimeString();}
 catch(e){status=(e.name==='TypeError'||e.name==='TimeoutError'?'Offline or service unavailable.':e.message)+' Answers are saved here and will retry automatically.';}
 finally{busy=false;update();}
}
async function link(token,create){
 if(!/^NR1-[a-f0-9]{64}$/.test(token))throw Error('Enter the complete personal sync code starting NR1-. This is not your AI study access code.');
 await request(create?'/create':'/sync',token);
 cfg={token,remote:{},lastAt:0};persist();
 for(const [q,s] of Object.entries(adapter.seed()))if(s.seen||s.done||s.remaining)put(q,'seed',s,true);
 await sync();
}
function configure(value){adapter=value;update();if(cfg.token)sync();}
function open(){
 document.getElementById('progressSyncDialog')?.remove();const d=document.createElement('dialog');d.id='progressSyncDialog';d.setAttribute('aria-label','Sync MCQ progress');
 Object.assign(d.style,{maxWidth:'520px',width:'calc(100% - 32px)',maxHeight:'85dvh',overflow:'auto',padding:'24px',background:'#faf8f2',color:'#203746',border:'1px solid #8b6b30',borderRadius:'14px'});
 d.innerHTML='<h2>Sync MCQ progress</h2><p>Link Nebula and FNPH Raid using the same private sync code. Offline answers upload when you reconnect. Only matching MCQs sync; OSCE and generated questions stay separate.</p><p id="progressSyncStatus" role="status"></p><div id="progressSyncActions"></div><p>Keep this code private: it gives access to your MCQ progress. It is separate from your AI study access code.</p><button id="progressSyncClose">Close</button>';
 const actions=d.querySelector('#progressSyncActions');
 function button(label,fn){const b=document.createElement('button');b.textContent=label;Object.assign(b.style,{padding:'12px',margin:'4px',border:'1px solid #8b6b30',borderRadius:'6px',background:'#eee6d3',color:'#203746'});b.onclick=fn;actions.append(b);return b;}
 if(cfg.token){button('Sync now',sync);button('Show my sync code',()=>{if(actions.querySelector('input'))return;const field=document.createElement('input');field.value=cfg.token;field.readOnly=true;field.setAttribute('aria-label','Your private sync code');field.style.cssText='width:100%;box-sizing:border-box;padding:12px;margin:12px 0;font-size:16px';actions.append(field);field.select();});button('Disconnect this device',()=>{cfg={token:'',remote:{},lastAt:0};persist();status='Disconnected. Local learning progress is kept.';open();});}
 else{
  button('Create my sync profile',async()=>{try{status='Creating your profile…';update();const token='NR1-'+Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join('');await link(token,true);open();}catch(e){status=e.message;update();}});
  const label=document.createElement('label');label.textContent='Already created a profile? Paste its sync code:';const field=document.createElement('input');field.type='password';field.autocomplete='off';field.spellcheck=false;field.setAttribute('aria-label','Personal sync code');field.style.cssText='width:100%;box-sizing:border-box;padding:12px;margin:8px 0;font-size:16px';label.append(field);actions.append(label);
  button('Link existing profile',async()=>{try{status='Linking…';update();await link(field.value.trim(),false);open();}catch(e){status=e.message;update();}});
 }
 document.body.append(d);d.querySelector('#progressSyncClose').onclick=()=>d.close();d.addEventListener('close',()=>d.remove());d.showModal();update();
}
window.addEventListener('online',sync);window.addEventListener('storage',e=>{if(e.key===KEY){cfg=read(KEY,cfg);update();}if(e.key?.startsWith(PREFIX))update();});document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync();});setInterval(()=>{if(!document.hidden)sync();},60000);
window.McqProgressSync={configure,record,sync,open,isLinked:()=>!!cfg.token};
})();
