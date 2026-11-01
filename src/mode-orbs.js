/* Orb Assault: concurrent physical question shells; shared MCQ grading. */
(function(){
'use strict';
const R=$.raid,Q=s=>document.querySelector(s),O=R.orbs={parents:[],parked:[],serial:0,ready:false,focus:null};
const colours=['#087f9b','#a36e22','#805a9a'];
const panel=document.createElement('aside');panel.id='orbIntel';panel.hidden=true;panel.innerHTML='<button id="orbToggle" aria-expanded="false">Options / lock target</button><b>ORB ASSAULT</b><p id="orbHint"></p><div id="orbChoices"></div>';Q('#play').appendChild(panel);Q('#orbToggle').onclick=()=>{const open=panel.classList.toggle('expanded');Q('#orbToggle').setAttribute('aria-expanded',String(open));};
function active(){return R.active&&R.orbAssault;}
function area(){return{w:Math.max(280,$.cw-(innerWidth>1000?300:innerHeight<500?160:0)),h:$.ch,top:R.topSafe()+65,bottom:$.ch-(Q('#play').classList.contains('touchPlaying')?145:55)};}
function blast(x,y,hue=190){$.explosions.push(new $.Explosion({x,y,radius:45,hue,saturation:90}));$.rumble.level=7;$.audio.play('explosionAlt');}
function reserve(){
 const used=new Set(O.parents.map(p=>p.item.id));
 while(O.parents.length<3){const i=R.queue.findIndex(it=>it.type==='q'&&!R.isMastered(it)&&!used.has(it.id));if(i<0)break;const it=R.queue.splice(i,1)[0];used.add(it.id);add(it);}
 sync();
}
function add(item){
 if(O.parents.some(p=>p.item.id===item.id))return;
 const old=O.parked.findIndex(p=>p.item.id===item.id);if(old>=0){const p=O.parked.splice(old,1)[0];p.alive=true;O.parents.push(p);return;}
 const a=area(),slot=O.serial++%3,col=colours[slot],p={item,kind:'parent',text:'Question shell',num:'P'+O.serial,code:'Q'+String(O.serial).padStart(2,'0'),alive:true,radius:36,life:6,lifeMax:6,x:a.w*(.2+slot*.3),y:Math.max(a.top-25,innerWidth>1000?245:innerHeight<500?130:310)+O.parents.length*8,open:false,options:[],colour:col,sparks:0,armour:1,t:0,label:{w:0,h:0}};
 p.hit=damage=>{if(!p.alive)return;if(p.open){p.sparks=8;return;}p.armour=O.parents.some(other=>other!==p&&other.open)?5:1;p.life-=damage/p.armour;p.sparks=8;if(p.life<=0)crack(p);};p.update=()=>{};p.explode=()=>{};p.render=()=>renderParent(p);O.parents.push(p);
}
function crack(p){
 if(p.open)return;p.open=true;p.life=0;p.wave=R.orbOptions(p.item);p.wave.opts.forEach((text,i)=>{const o={kind:'option',parent:p,text,num:i+1,alive:true,radius:19,life:5,lifeMax:5,x:p.x+(i-1.5)*42,y:p.y+(innerHeight<500?28:90)+Math.floor(i/2)*(innerHeight<500?35:95),goalX:p.x+((i%2)-.5)*(area().w/3)*.48,t:i,label:{w:0,h:0},plate:null};o.hit=damage=>{if(!o.alive)return;o.life-=damage;o.flash=6;if(o.life<=0)answer(p,o);};o.explode=(hue)=>{if(o.alive){o.alive=false;blast(o.x,o.y,hue);}};o.update=()=>{};o.render=()=>renderOption(o);p.options.push(o);});if($.aimLock===p)$.aimLock=null;focus(p);blast(p.x,p.y);sync();
}
function focus(p){if(!p?.alive)return;O.focus=p;R.cur=p.item;R.wave=p.open?p.wave:null;Q('#qChip').textContent=p.open?p.code+' · destroy the correct answer':p.code+' · crack the shell';Q('#qText').textContent=p.open?p.item.prompt:'Question orbs approaching · fire upwards to crack a shell';Q('#orbHint').textContent=O.parents.some(x=>x.open)?'Other unopened shells: 5× armour. Keep firing; destroy an answer to resolve its parent.':'Crack a large orb to reveal its question and four answer orbs. Distance is your reading time.';
 const choices=Q('#orbChoices');if(choices.dataset.key!==p.code+':'+p.open){choices.dataset.key=p.code+':'+p.open;choices.replaceChildren();if(p.open)p.options.forEach(o=>{const b=document.createElement('button');b.textContent=o.num+' · '+o.text;b.onclick=()=>{focus(p);R.lockOn(o);};choices.appendChild(b);});}
}
function sync(){for(const p of O.parents)p.armour=!p.open&&O.parents.some(other=>other!==p&&other.open)?5:1;const ordered=O.parents.slice().sort((a,b)=>(b===O.focus)-(a===O.focus));$.carriers=ordered.flatMap(p=>p.open?p.options.filter(o=>o.alive).concat(p):[p]);}
function release(except){for(const p of O.parents)if(p.item!==except&&!R.isMastered(p.item))R.queue.unshift(p.item);O.parents=[];O.focus=null;O.ready=false;$.carriers=[];}
function answer(p,o){
 if(!p.alive||R.phase!=='fight')return;focus(p);const all=$.carriers;$.carriers=p.options;const correct=p.wave.correct.includes(o.text);
 if(!correct)release(p.item);
 R.cur=p.item;R.wave=p.wave;R.carrierDown(o);
 if(correct){p.alive=false;blast(p.x,p.y);O.parents=O.parents.filter(x=>x!==p);R.phase='fight';$.carriers=all.filter(c=>c!==p&&c.parent!==p);reserve();if(O.parents.length)focus(O.parents.find(x=>x.open)||O.parents[0]);else{O.ready=false;R.advanceQuestion();}}
 else{$.carriers=[];O.ready=false;}
}
function breach(p){
 if(!p.alive)return;focus(p);const opened=p.open;release(p.item);R.cur=p.item;R.wave=p.wave||R.orbOptions(p.item);if(opened)R.die(null);else R.swarmDeath();
}
O.prepareRetry=()=>{O.parked=O.parents.slice();release(R.cur);};
O.stage=it=>{if(!active())return;if(!O.ready){O.ready=true;O.parents=[];O.focus=null;$.enemies=[];$.bullets=[];const a=area();$.hero.x=a.w/2;$.hero.y=a.bottom-42;$.hero.direction=-Math.PI/2;$.mouse.sx=$.hero.x;$.mouse.sy=0;$.mouse.ax=$.hero.x;$.mouse.ay=0;$.screen.x=$.screen.y=0;O.size={w:$.cw,h:$.ch};}add(it);reserve();R.phase='fight';focus(O.parents.find(p=>p.item===it)||O.parents[0]);};
O.update=()=>{
 if(!active()||R.phase!=='fight'||!O.ready)return;
 const a=area(),pace=Math.max(.25,Math.min(1,(a.bottom-R.topSafe())/450)),dt=Math.min(2,$.dt||1),target=$.aimLock||R.hover;
 if(target?.alive)focus(target.parent||target);
 if(O.size.w!==$.cw||O.size.h!==$.ch){const sx=$.cw/O.size.w,sy=$.ch/O.size.h;for(const p of O.parents){p.x*=sx;p.y*=sy;for(const o of p.options){o.x*=sx;o.y*=sy;o.goalX*=sx;}}O.size={w:$.cw,h:$.ch};}
 $.hero.x=Math.max(42,Math.min(a.w-42,$.hero.x));$.hero.y=Math.max(a.h*.55,Math.min(a.bottom-22,$.hero.y));
 for(const p of O.parents){p.t+=dt/60;if(p.y<R.topSafe()+40){const shift=R.topSafe()+40-p.y;p.y+=shift;p.options.forEach(o=>o.y+=shift);}p.y+=.13*dt*pace;p.armour=!p.open&&O.parents.some(other=>other!==p&&other.open)?5:1;p.sparks=Math.max(0,p.sparks-dt);
  for(const o of p.options){o.t+=dt/60;o.x+=(o.goalX+Math.sin(o.t*1.3+o.num)*12-o.x)*Math.min(1,.1*dt);o.x=Math.max(24,Math.min(a.w-24,o.x));o.y+=.21*dt*pace;o.flash=Math.max(0,(o.flash||0)-dt);}
  if(p.y>a.bottom-45||p.options.some(o=>o.alive&&o.y>a.bottom-24)){breach(p);break;}
 }
 sync();
};
function sphere(x,y,r,col){const c=$.ctxmg,g=c.createRadialGradient(x-r*.35,y-r*.4,1,x,y,r);g.addColorStop(0,'#ffffff');g.addColorStop(.18,col);g.addColorStop(.8,FNPHTheme.light?'#253f51':'#152b41');g.addColorStop(1,'#07131f');c.fillStyle=g;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();c.strokeStyle=col;c.lineWidth=2;c.stroke();}
function textPlate(text,x,y,width,lines=3){const c=$.ctxmg;c.font='600 12px Segoe UI';const words=text.split(/\s+/),out=[];let line='';for(const word of words){const next=line?line+' '+word:word;if(c.measureText(next).width>width-16&&line){out.push(line);line=word;}else line=next;}out.push(line);const shown=out.slice(0,lines);if(out.length>lines)shown[lines-1]+='…';const h=shown.length*16+12;c.fillStyle=FNPHTheme.light?'#fffdf7ed':'#102131ed';c.strokeStyle='#a4b1ad';c.lineWidth=.7;c.fillRect(x-width/2,y,width,h);c.strokeRect(x-width/2,y,width,h);c.fillStyle=FNPHTheme.light?'#203746':'#eff5ef';c.textAlign='center';shown.forEach((l,i)=>c.fillText(l,x,y+17+i*16,width-12));return{x:x-width/2,y,w:width,h};}
function renderParent(p){if(!p.alive)return;const c=$.ctxmg;c.save();sphere(p.x,p.y,p.radius,p.colour);if(p.armour>1){c.strokeStyle='#c2a367';c.lineWidth=4;c.beginPath();c.arc(p.x,p.y,43,0,Math.PI*2);c.stroke();}if(p.open||p.life<5){c.strokeStyle=p.sparks?'#fff1a0':'#9fe9ec';c.lineWidth=2;c.beginPath();for(let k=0;k<5;k++){const a=k*1.27;c.moveTo(p.x+Math.cos(a)*8,p.y+Math.sin(a)*8);c.lineTo(p.x+Math.cos(a+.15)*23,p.y+Math.sin(a+.15)*23);c.lineTo(p.x+Math.cos(a)*35,p.y+Math.sin(a)*35);}c.stroke();}c.fillStyle='#fffdf7';c.font='bold 17px Segoe UI';c.textAlign='center';c.fillText(p.open?p.code+' ?':p.code,p.x,p.y+6);c.font='10px Segoe UI';c.fillStyle=FNPHTheme.light?'#203746':'#eff5ef';c.fillText(p.open?'EXPOSED QUESTION':p.armour>1?'ARMOURED ×5':'SHELL '+Math.max(0,Math.ceil(p.life))+'/6',p.x,p.y-49);if(p.open){textPlate(p.item.prompt,p.x,Math.max(R.topSafe(),p.y-105),Math.min(190,area().w/3-8),3);for(const o of p.options){if(!o.alive)continue;c.strokeStyle=p.colour+'55';c.lineWidth=1;c.setLineDash([3,5]);c.beginPath();c.moveTo(p.x,p.y);c.lineTo(o.x,o.y);c.stroke();c.setLineDash([]);}}else{c.fillStyle=p.colour;c.fillRect(p.x-28,p.y+43,56*Math.max(0,p.life/6),3);}c.restore();}
function renderOption(o){if(!o.alive)return;const c=$.ctxmg,p=o.parent;c.save();sphere(o.x,o.y,o.radius,p.colour);c.font='bold 15px Segoe UI';c.textAlign='center';c.fillStyle='#fff';c.fillText(o.num,o.x,o.y+5);c.font='9px Segoe UI';c.fillStyle=FNPHTheme.light?'#203746':'#eff5ef';c.fillText(p.code,o.x,o.y-29);c.strokeStyle=p.colour;c.lineWidth=3;c.beginPath();c.arc(o.x,o.y,24,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.max(0,o.life/5));c.stroke();const w=Math.max(58,Math.min(O.focus===p?165:110,area().w/6-10)),x=Math.max(w/2+5,Math.min(area().w-w/2-5,o.x));o.plate=textPlate(o.text,x,o.y+29,w,O.focus===p?3:1);c.restore();}
const reconsider=R.reconsider;R.reconsider=function(guessed){reconsider(guessed);if(active()&&R.phase==='fight'&&!O.ready&&R.cur)O.stage(R.cur);};
const start=R.start;R.start=function(rooms,si,options){R.orbAssault=!!options?.orbAssault;O.parents=[];O.parked=[];O.serial=0;O.ready=false;panel.hidden=!R.orbAssault;start(rooms,si,options);};
const mode=R.modeName;R.modeName=()=>active()?'orbs':mode();const update=R.update;R.update=()=>{O.update();update();};
const camera=$.updateScreen;$.updateScreen=function(){if(active()){$.screen.x=$.screen.y=0;}else camera();};
const map=R.renderMap,world=R.renderWorld,lighting=R.renderLighting,mini=$.renderMinimap;
R.renderMap=()=>{if(!active())return map();const c=$.ctxmg,a=area();c.fillStyle=FNPHTheme.light?'#e9ede7':'#07111d';c.fillRect(0,0,$.cw,$.ch);c.strokeStyle=FNPHTheme.light?'#bac9c433':'#789aaf22';c.lineWidth=1;for(let x=0;x<a.w;x+=48){c.beginPath();c.moveTo(x,0);c.lineTo(x,$.ch);c.stroke();}for(let y=($.tick*.12)%48;y<$.ch;y+=48){c.beginPath();c.moveTo(0,y);c.lineTo(a.w,y);c.stroke();}c.strokeStyle='#b07b4c88';c.setLineDash([8,9]);c.beginPath();c.moveTo(0,a.bottom);c.lineTo(a.w,a.bottom);c.stroke();c.setLineDash([]);};R.renderWorld=()=>{if(!active())world();};R.renderLighting=()=>{if(!active())lighting();};$.renderMinimap=()=>{if(!active())mini();};
function ui(){requestAnimationFrame(ui);const on=active()&&!Q('#play').hidden;panel.hidden=!on||!Q('#cardWrap').hidden;Q('#play').classList.toggle('orbAssault',on);}requestAnimationFrame(ui);
})();
