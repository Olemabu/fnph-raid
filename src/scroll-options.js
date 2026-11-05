/* Native text scrolling is separate from canvas aiming and answer hit detection. */
(function(root){
'use strict';
function state(){return {offset:0,wait:3,manual:0,held:false,phase:'down'};}
function advance(s,dt,max){
 dt=Math.max(0,Math.min(.1,dt));if(max<=0){s.offset=0;s.wait=3;s.phase='down';return null;}
 if(s.held)return null;if(s.manual>0){s.manual=Math.max(0,s.manual-dt);return null;}
 if(s.wait>0){s.wait=Math.max(0,s.wait-dt);return null;}
 if(s.phase==='restart'){s.offset=0;s.wait=3;s.phase='down';return 0;}
 s.offset=Math.min(max,s.offset+dt*10);if(s.offset>=max){s.wait=4;s.phase='restart';}return s.offset;
}
function lane(carriers,x){if(!Number.isFinite(x))return null;return carriers.find(c=>c.alive&&c.plate&&x>=c.plate.x&&x<=c.plate.x+c.plate.w)||null;}
root.OptionScrollMotion={state,advance,lane};
if(typeof document==='undefined')return;
const R=$.raid,stage=document.querySelector('#stage'),overlay=document.createElement('div');overlay.id='optionScrollOverlay';overlay.hidden=true;stage.appendChild(overlay);
const nodes=new Map(),reduceMotion=matchMedia('(prefers-reduced-motion: reduce)');let last=performance.now();
function create(carrier){
 const box=document.createElement('section');box.className='optionScrollPlate';box.setAttribute('aria-label','Answer option '+carrier.num);
 const viewport=document.createElement('div');viewport.className='optionScrollText';viewport.tabIndex=0;viewport.setAttribute('role','region');viewport.setAttribute('aria-label','Option '+carrier.num+' text. Swipe vertically to read a long answer.');
 const text=document.createElement('div');text.className='optionScrollContent';text.textContent=carrier.label.text;viewport.append(text);
 const track=document.createElement('div');track.className='optionScrollTrack';track.setAttribute('aria-hidden','true');const thumb=document.createElement('i');track.append(thumb);box.append(viewport,track);overlay.append(box);
 const motion=state(),entry={box,viewport,thumb,motion};
 function manual(e){e.stopPropagation();motion.manual=12;motion.offset=viewport.scrollTop;motion.wait=3;motion.phase='down';}
 viewport.addEventListener('pointerdown',e=>{manual(e);motion.held=true;},{passive:true});
 for(const type of ['pointerup','pointercancel','lostpointercapture'])viewport.addEventListener(type,e=>{manual(e);motion.held=false;},{passive:true});
 for(const type of ['pointermove','click'])viewport.addEventListener(type,e=>e.stopPropagation(),{passive:true});
 viewport.addEventListener('wheel',manual,{passive:true});viewport.addEventListener('keydown',manual);
 viewport.addEventListener('scroll',()=>{if(motion.held||motion.manual>0)motion.offset=viewport.scrollTop;},{passive:true});
 return entry;
}
function loop(now){
 requestAnimationFrame(loop);const dt=(now-last)/1000;last=now;
 const show=R.sideControls&&R.active&&!R.paused&&R.phase==='fight'&&$.state==='play'&&document.querySelector('#cardWrap').hidden&&!R.answerSplash;
 overlay.hidden=!show;if(!show){R.readingOption=null;return;}
 const live=($.carriers||[]).filter(c=>c.alive&&c.label?.scrollable&&c.plate);
 const focused=lane(live,$.hero?.x),changed=focused!==R.readingOption;R.readingOption=focused;
 for(const [c,n] of nodes)if(!live.includes(c)){n.box.remove();nodes.delete(c);}
 for(const c of live){
  let n=nodes.get(c);if(!n){n=create(c);nodes.set(c,n);}
  const reading=c===focused;n.box.classList.toggle('readingOption',reading);n.box.setAttribute('aria-current',reading?'true':'false');if(changed&&reading)n.motion.wait=Math.max(1,n.motion.wait);
  const p=c.plate;Object.assign(n.box.style,{left:Math.round(p.x+$.screen.x-($.rumble.x||0))+'px',top:Math.round(p.y+$.screen.y-($.rumble.y||0))+'px',width:p.w+'px',height:p.h+'px'});
  const max=Math.max(0,n.viewport.scrollHeight-n.viewport.clientHeight);n.box.classList.toggle('overflows',max>1);
  const offset=reduceMotion.matches||!reading?null:advance(n.motion,dt,max);if(offset!==null)n.viewport.scrollTop=offset;
  const visible=Math.max(1,n.viewport.clientHeight-32),ratio=visible/(visible+max),thumbHeight=Math.max(8,ratio*visible);n.thumb.style.height=thumbHeight+'px';n.thumb.style.transform='translateY('+(max?n.viewport.scrollTop/max*(visible-thumbHeight):0)+'px)';
 }
}
window.addEventListener('blur',()=>{for(const n of nodes.values()){n.motion.held=false;n.motion.manual=12;}});
requestAnimationFrame(loop);
})(typeof window!=='undefined'?window:globalThis);
