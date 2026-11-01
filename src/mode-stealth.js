/* BLACKSITE: original spy infiltration stage. Reach the answer terminal,
   evade patrol sightlines, then hold interact to commit the answer. */
(function(){
'use strict';
const R=$.raid,COL=['#d67fa1','#74c9d6','#e1c18a','#a2d4ab'];
let cv,c,W=0,H=0,run,last=0,held=false,crouch=false,rects=[];
const obstacles=[{x:-3,z:0,w:2.4,d:2.0},{x:3,z:-1,w:2.4,d:2},{x:0,z:-4,w:2.0,d:1.2}];
function visible(){return R.active&&R.modeName()==='stealth'&&['fight','resolve','dead','swarmdead'].includes(R.phase);}
function init(){if(cv)return;cv=document.createElement('canvas');cv.id='cstealth';cv.style.cssText='position:absolute;inset:0;width:100%;height:100%;z-index:2;display:none;touch-action:none';document.querySelector('#stage').appendChild(cv);c=cv.getContext('2d');
 cv.addEventListener('pointerdown',e=>{if(!run)return;const b=cv.getBoundingClientRect(),x=e.clientX-b.left,y=e.clientY-b.top;const hit=rects.find(r=>x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h);if(hit){run.goal=hit.i;run.hack=0;return;}
  const pts=run.floorPoints||[];let best=null,d=Infinity;for(const p of pts){const dd=Math.hypot(p.p.x-x,p.p.y-y);if(dd<d){d=dd;best=p;}}if(best&&d<90){run.waypoint={x:best.x,z:best.z};run.goal=null;} });
 window.addEventListener('keydown',e=>{if(!visible())return;if(e.key>='1'&&e.key<='4'){run.goal=+e.key-1;run.hack=0;}if(e.key==='e'||e.key==='E'||e.key===' '){held=true;e.preventDefault();}if(e.key==='Shift')crouch=true;});
 window.addEventListener('keyup',e=>{if(e.key==='e'||e.key==='E'||e.key===' ')held=false;if(e.key==='Shift')crouch=false;});
 window.addEventListener('blur',()=>{held=false;crouch=false;});
 const touch=document.createElement('div');touch.id='stealthTouch';touch.innerHTML='<button id="stealthQuiet">Crouch</button><button id="stealthHack">Hold to hack</button>';document.querySelector('#stage').appendChild(touch);
 const bind=(id,set)=>{const el=document.getElementById(id);el.addEventListener('pointerdown',e=>{e.preventDefault();el.setPointerCapture(e.pointerId);set(true);});for(const event of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(event,()=>set(false));};bind('stealthHack',v=>held=v);bind('stealthQuiet',v=>crouch=v);
}
R.stealthStart=function(wave){init();run={opts:wave.opts.slice(),x:0,z:6,heading:Math.PI,t:0,alert:0,hack:0,goal:null,waypoint:null,done:false,hx:$.hero.x,hy:$.hero.y,guards:[],floorPoints:[],terminalRects:[]};held=false;crouch=false;$.enemies.length=0;$.carriers.length=0;};
function blocked(x,z){return Math.abs(x)>7||z>7||z< -7.5||obstacles.some(o=>Math.abs(x-o.x)<o.w/2+.27&&Math.abs(z-o.z)<o.d/2+.27);}
const terminal=(i,n)=>({x:-5.7+(i+.5)*11.4/n,z:-6.6});
function sight(a,b){const d=Math.hypot(a.x-b.x,a.z-b.z),steps=Math.ceil(d*8);for(let i=1;i<steps;i++){const k=i/steps,x=a.x+(b.x-a.x)*k,z=a.z+(b.z-a.z)*k;if(obstacles.some(o=>Math.abs(x-o.x)<o.w/2&&Math.abs(z-o.z)<o.d/2))return false;}return true;}
function choose(i){if(run.done)return;run.done=true;const text=run.opts[i];R.carrierDown({text,num:i+1,x:$.hero.x,y:$.hero.y,alive:true,explode(){this.alive=false;}});}
function update(dt){const r=run;$.hero.x=r.hx;$.hero.y=r.hy;$.hero.vx=$.hero.vy=0;if(r.done)return;r.t+=dt;
 const k=$.keys.state;let dx=(k.right?1:0)-(k.left?1:0)+($.pad.mx||0),dz=(k.down?1:0)-(k.up?1:0)+($.pad.my||0);
 if(Math.hypot(dx,dz)>.15){r.goal=null;r.waypoint=null;}
 let goal=r.waypoint;if(r.goal!=null&&r.goal<r.opts.length){const target=terminal(r.goal,r.opts.length);
  // Use the clear outer corridor before crossing to a selected terminal.
  if(r.z>-5.6){const side=r.x<0?-1:1;goal=Math.abs(r.x-side*5.7)>.15?{x:side*5.7,z:r.z}:{x:side*5.7,z:-5.8};}else goal={x:target.x,z:target.z+.7};
 }
 if(goal&&!dx&&!dz){const dd=Math.hypot(goal.x-r.x,goal.z-r.z);if(dd>.12){dx=(goal.x-r.x)/dd;dz=(goal.z-r.z)/dd;}else r.waypoint=null;}
 const length=Math.hypot(dx,dz);if(length>.05){dx/=Math.max(1,length);dz/=Math.max(1,length);const speed=(crouch?1.1:2.4)*dt;const nx=r.x+dx*speed,nz=r.z+dz*speed;if(!blocked(nx,r.z))r.x=nx;if(!blocked(r.x,nz))r.z=nz;r.heading=Math.atan2(dx,dz);}
 r.guards=[{x:-1.4+Math.sin(r.t*.36)*3.8,z:1.7,a:Math.cos(r.t*.36)>0?Math.PI/2:-Math.PI/2},{x:4.8,z:-3.3+Math.sin(r.t*.42)*2,a:Math.cos(r.t*.42)>0?0:Math.PI}];
 let seen=false;for(const g of r.guards){const dx=r.x-g.x,dz=r.z-g.z,d=Math.hypot(dx,dz);if(d<(crouch?3.1:4.8)&&d>.01&&(dx*Math.sin(g.a)+dz*Math.cos(g.a))/d>.76&&sight(g,r))seen=true;}
 r.alert=Math.max(0,Math.min(1,r.alert+dt*(seen?.43:-.25)));if(r.alert>=1){r.done=true;R.overrun();return;}
 let near=-1;for(let i=0;i<r.opts.length;i++){const t=terminal(i,r.opts.length);if(Math.hypot(r.x-t.x,r.z-t.z)<1.25)near=i;}r.near=near;
 const interact=held||$.pad.fire;if(near>=0&&interact&&!seen)r.hack+=dt/1.1;else r.hack=Math.max(0,r.hack-dt*.7);if(r.hack>=1)choose(near);
 if(R.wave)R.wave.t=Math.min(.95,r.t/90);
}
function agent(D,x,z,angle,color,player){
 D.shadow(x,z,.65,.65);D.box(x,.48,z,.42,.7,.24,color,angle);D.box(x,.91,z,.36,.2,.28,'#243e4b',angle);D.box(x,1.06,z,.27,.23,.27,player?'#8a9d9f':'#7e8e8f',angle);
 for(const s of [-1,1]){D.box(x+s*.13,.16,z,.15,.38,.2,'#152a36',angle);D.box(x+s*.28,.57,z,.12,.55,.16,color,angle);}
 D.box(x+Math.sin(angle)*.18,.69,z+Math.cos(angle)*.18,.13,.12,.4,'#10212c',angle);if(player)D.ring(x,.02,z,.45,'#86d5cd');
}
function draw(){W=cv.width=cv.clientWidth;H=cv.height=cv.clientHeight;const r=run,D=R.stage3d;
 if(D&&D.available){const zoom=Math.max(1,.95/(W/H));D.begin(W,H,[13*zoom,19*zoom,20*zoom],[0,0,-.5],.83,'#101f2b',.014);
  D.box(0,-.16,0,16,.3,17,'#35454a');for(let x=-8;x<=8;x+=1.2)D.box(x,.006,0,.014,.01,17,'#26343b');for(let z=-8;z<=8;z+=1.2)D.box(0,.006,z,16,.01,.014,'#26343b');
  D.box(0,.35,-8,16,.7,.35,'#81918e');for(let z=-5;z<7;z+=1.5){D.box(-6.7,.015,z,.4,.015,.75,'#203640');for(let j=0;j<5;j++)D.box(-6.85+j*.08,.025,z,.025,.015,.65,'#81918a');}for(const side of [-1,1])D.box(side*7.8,.05,0,.045,.04,14,'#c8aa70',0,.45);for(const s of [-1,1])D.box(s*8,.35,0,.35,.7,16,'#64787d');
  // Cutaway archive: server racks, cable trays, ventilation and desk lamps.
  for(let k=0;k<7;k++){const x=-6.6+k*2.2;D.box(x,1.3,-7.6,1.7,2.6,.7,'#1d3544');D.box(x,1.4,-7.22,1.4,2.1,.02,'#10212e');for(let j=0;j<7;j++){D.box(x, .5+j*.27,-7.18,1.2,.11,.03,'#3e5966');D.box(x+.45,.5+j*.27,-7.14,.07,.04,.02,j%3?'#70bdba':'#d7ac6d',0,1);}}
  for(const o of obstacles){D.shadow(o.x,o.z,o.w+.2,o.d+.2);D.bevel(o.x,.66,o.z,o.w,1.3,o.d,'#45545b');D.box(o.x,1.34,o.z,o.w+.08,.08,o.d+.08,'#85918c');for(let j=0;j<3;j++)D.box(o.x-o.w*.3+j*o.w*.3,1.4,o.z,.24,.08,o.d*.65,'#263e48');for(let j=0;j<7;j++){D.box(o.x-o.w*.38+j*o.w*.12,.65,o.z+o.d/2+.01,.06,.6,.025,'#263b45');}for(const side of [-1,1]){D.box(o.x+side*(o.w/2-.15),1.43,o.z,.12,.07,.4,'#c6a36b');D.box(o.x+side*o.w*.3,.2,o.z+o.d/2+.02,.18,.09,.025,'#b49460');}}
  for(const s of [-1,1])for(let z=-4;z<7;z+=4){D.box(s*7.5,1.15,z,.4,2.3,.5,'#435e6b');D.box(s*7.5,2.35,z,.9,.08,.9,'#9cc1bf');D.box(s*7.5,2.3,z,.7,.03,.7,'#c1dbcc',0,1);}
  for(let i=0;i<r.opts.length;i++){const p=terminal(i,r.opts.length);D.box(p.x,.55,p.z,.85,1.1,.65,'#273f4a');D.box(p.x,1.15,p.z,.9,.12,.7,'#80918e');D.box(p.x,1.36,p.z+.05,.66,.36,.08,'#1a343d');D.box(p.x,1.36,p.z+.1,.53,.23,.015,COL[i],0,.9);D.ring(p.x,.014,p.z+.7,.6,COL[i]);}
  for(const g of r.guards){const radius=4.8;for(let j=0;j<16;j++){const a=g.a-.66+j*1.32/16,b=a+1.32/16;const z=g.z+Math.cos(a)*radius,x=g.x+Math.sin(a)*radius;D.box(x,.013,z,.08,.01,.08,'#8e6639',0,.6);const xx=g.x+Math.sin(b)*radius,zz=g.z+Math.cos(b)*radius;/* floor chevrons keep sightlines readable */if(j%2===0)D.box((x+g.x)/2,.014,(z+g.z)/2,.12,.01,1.5,'#605339',-g.a,.3);}agent(D,g.x,g.z,g.a,'#826e55',false);}
  agent(D,r.x,r.z,r.heading,'#334d59',true);D.end(c);
  r.floorPoints=[];for(let x=-7;x<8;x+=.5)for(let z=-7;z<8;z+=.5)if(!blocked(x,z))r.floorPoints.push({x,z,p:D.project([x,0,z])});
  for(let i=0;i<r.opts.length;i++){const t=terminal(i,r.opts.length),p=D.project([t.x,1.8,t.z]);c.fillStyle=COL[i];c.font='bold 14px monospace';c.textAlign='center';c.fillText(String(i+1).padStart(2,'0'),p.x,p.y);}
  // Visible angular fields of view, clipped by actual cover tests.
  for(const g of r.guards){const origin=D.project([g.x,.035,g.z]);c.beginPath();c.moveTo(origin.x,origin.y);for(let k=0;k<=25;k++){const a=g.a-.68+k*1.36/25;let dist=0;while(dist<4.8&&sight(g,{x:g.x+Math.sin(a)*dist,z:g.z+Math.cos(a)*dist}))dist+=.15;const p=D.project([g.x+Math.sin(a)*dist,.035,g.z+Math.cos(a)*dist]);c.lineTo(p.x,p.y);}c.closePath();c.fillStyle=r.alert>.5?'#ec77552c':'#e5bc6830';c.fill();c.strokeStyle='#d8ad6355';c.lineWidth=1;c.stroke();}
 }else{c.fillStyle='#12232c';c.fillRect(0,0,W,H);const s=Math.min(W/18,H/22),ox=W/2,oy=H*.49;r.floorPoints=[];for(let x=-7;x<8;x+=.5)for(let z=-7;z<8;z+=.5)if(!blocked(x,z))r.floorPoints.push({x,z,p:{x:ox+x*s,y:oy+z*s}});
  c.strokeStyle='#45606b';c.strokeRect(ox-8*s,oy-8*s,16*s,16*s);for(const o of obstacles){c.fillStyle='#61737b';c.fillRect(ox+(o.x-o.w/2)*s,oy+(o.z-o.d/2)*s,o.w*s,o.d*s);}for(const g of r.guards){c.fillStyle='#c6a879';c.beginPath();c.arc(ox+g.x*s,oy+g.z*s,5,0,7);c.fill();}for(let i=0;i<r.opts.length;i++){const p=terminal(i,r.opts.length);c.fillStyle=COL[i];c.fillRect(ox+p.x*s-8,oy+p.z*s-8,16,16);}c.fillStyle='#8cd8cb';c.beginPath();c.arc(ox+r.x*s,oy+r.z*s,6,0,7);c.fill();}
 const panelY=W<700?Math.max(H*.21,document.querySelector('#qbar').getBoundingClientRect().bottom+10):H*.21;
 const small=W<700,cols=small?2:r.opts.length,pad=10,ch=small?82:95,rows=Math.ceil(r.opts.length/cols),top=H-rows*(ch+pad);rects=[];
 c.textAlign='left';c.fillStyle='#07131ee6';c.fillRect(18,panelY,240,76);c.fillStyle='#d4b77e';c.font='11px monospace';c.fillText('BLACKSITE / COVERT OPERATIONS',30,panelY+20);c.fillStyle='#c8d6d3';c.fillText(crouch?'CROUCHED · LOW SIGNATURE':'PATROL LINK · STAY IN COVER',30,panelY+40);c.fillStyle='#38515c';c.fillRect(30,panelY+51,210,4);c.fillStyle=r.alert>.5?'#e49b73':'#9ac5bc';c.fillRect(30,panelY+51,210*r.alert,4);
 for(let i=0;i<r.opts.length;i++){const x=pad+i%cols*((W-pad)/cols),y=top+Math.floor(i/cols)*(ch+pad),w=(W-pad*(cols+1))/cols;rects.push({i,x,y,w,h:ch});c.fillStyle='#08141feb';c.fillRect(x,y,w,ch);c.strokeStyle=COL[i];c.lineWidth=r.goal===i?3:1;c.strokeRect(x,y,w,ch);c.fillStyle=COL[i];c.font='bold 12px monospace';c.fillText('0'+(i+1)+' / TERMINAL',x+13,y+20);c.fillStyle='#e1e7df';c.font='13px sans-serif';wrap(R.optionLabel(r.opts[i]),x+13,y+41,w-26,Math.max(2,Math.floor((ch-37)/16)));}
 c.fillStyle='#d0dcd8';c.font='12px monospace';c.fillText(small?'Tap terminal · hold Hack nearby':'WASD / stick move · click floor to move · 1–4 route to terminal · Shift crouch · hold E / Space / trigger to hack',16,top-(small?8:20));
 if(r.near>=0){const lift=small?45:0;c.save();c.translate(0,-lift);c.fillStyle='#0a1a24ed';c.fillRect(W/2-130,top-80,260,42);c.textAlign='center';c.fillStyle='#d2e3d7';c.fillText('HOLD INTERACT · TERMINAL '+(r.near+1),W/2,top-60);c.fillStyle='#76bfb6';c.fillRect(W/2-115,top-49,230*r.hack,3);c.textAlign='left';c.restore();}
}
function wrap(text,x,y,width,max){let line='',rows=0;for(const word of text.split(/\s+/)){if(c.measureText(line+' '+word).width>width&&line){c.fillText(line,x,y+rows++*16);line=word;if(rows>=max)return;}else line+=(line?' ':'')+word;}if(rows<max)c.fillText(line,x,y+rows*16);}
let lastDraw=0;function loop(now){requestAnimationFrame(loop);if(now-lastDraw<30)return;lastDraw=now;const dt=Math.min(.05,(now-(last||now))/1000);last=now;if(!cv)return;const vis=visible();cv.style.display=vis?'block':'none';document.querySelector('#stealthTouch').style.display=vis?'flex':'none';if(!vis){if(!R.active)run=null;return;}const keys=document.querySelector('#play .keys');if(keys)keys.style.visibility='hidden';if(!R.paused&&$.state==='play'&&document.querySelector('#cardWrap').hidden)update(dt);draw();}
init();requestAnimationFrame(loop);
})();
