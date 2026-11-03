/* Continuous arcade flight. Learning queues and measured controller axes stay unchanged. */
(function(){
'use strict';
const R=$.raid,KEY='fnphraid.flight.v1',clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
let saved;try{saved=JSON.parse(localStorage.getItem(KEY)||'null');}catch(e){}
let sets=Number.isSafeInteger(saved?.sets)&&saved.sets>=0?saved.sets:0,travel=0,runDone=false;
const regions=[['Coastline','#467d89','#c6b78a'],['Farmland','#71835b','#b4a975'],['City','#687785','#9b9c8e'],['Mountains','#6d7774','#a5a99b']];
const enabled=()=>R.active&&!R.orbAssault&&!R.modeName();
function completeSet(){if(!enabled()||runDone)return;runDone=true;sets++;try{localStorage.setItem(KEY,JSON.stringify({sets}));}catch(e){}R.toast('Flight checkpoint '+sets+' saved · '+regions[Math.floor(sets/3)%regions.length][0],true);}
const F=R.flight={enabled,completeSet,progress:()=>({sets,region:Math.floor(sets/3)%regions.length,stretch:sets%3})};
const start=R.start;R.start=function(){runDone=false;start.apply(this,arguments);if(enabled()){$.mouse.moved=0;$.pad.aim=null;if($.touch)$.touch.aim=null;$.aimLock=null;$.hero.direction=$.hero.prevDirection=-Math.PI/2;$.hero.flightBank=0;}};
// Start the teaching encounter directly: no return trip to a hospital map marker.
const update=R.update;R.update=function(){if(enabled()&&R.phase==='travel'){R.beginCombat();return;}const result=update.apply(this,arguments);if(enabled()){const loc=document.querySelector('#hLoc');if(loc)loc.textContent=regions[Math.floor(sets/3)%regions.length][0]+' · stretch '+(sets%3+1)+'/3';}return result;};
const begin=R.beginCombat;R.beginCombat=function(){runDone=false;return begin.apply(this,arguments);};
const heroUpdate=$.Hero.prototype.update;
$.Hero.prototype.update=function(){
 heroUpdate.call(this);if(!enabled())return;
 const dt=$.dt||1;
 this.flightBank=(this.flightBank||0)+(clamp(this.vx/8,-1,1)*.28-(this.flightBank||0))*(1-Math.exp(-dt*.14));
 const left=-$.screen.x+44,right=-$.screen.x+$.cw-44,top=-$.screen.y+Math.min($.ch*.46,R.topSafe()+70),bottom=-$.screen.y+$.ch-70;
 this.x=clamp(this.x,left,Math.max(left,right));this.y=clamp(this.y,top,Math.max(top,bottom));
 travel+=dt*(2.5+clamp(-this.vy,-1.2,3));
};
const camera=$.updateScreen;
$.updateScreen=function(){if(!enabled())return camera();
 // Stable flight viewport; the world scrolls beneath the manually steered plane.
 if(!Number.isFinite(F.cx)||F.hero!==$.hero||F.width!==$.cw||F.height!==$.ch){F.width=$.cw;F.height=$.ch;for(const e of $.carriers)e.flightAnchor=null;F.hero=$.hero;$.hero.x=$.ww/2;$.hero.y=$.wh/2;F.cx=$.hero.x;F.cy=$.hero.y-$.ch*.18;}
 $.screen.x=$.cw/2-F.cx;$.screen.y=$.ch/2-F.cy;$.rumble.x=$.rumble.y=0;$.mousescreen();
};
const map=R.renderMap,world=R.renderWorld,lighting=R.renderLighting,minimap=$.renderMinimap;
R.renderMap=function(){if(!enabled())return map();
 const c=$.ctxmg,w=$.cw,h=$.ch,[name,ground,detail]=regions[Math.floor(sets/3)%regions.length],offset=travel%180;
 const bg=c.createLinearGradient(0,0,w,h);bg.addColorStop(0,ground);bg.addColorStop(1,'#344c43');c.fillStyle=bg;c.fillRect(0,0,w,h);
 // Ground tiles use deterministic positions, so scenery does not flicker frame to frame.
 for(let row=-1;row<Math.ceil(h/180)+1;row++)for(let col=0;col<Math.ceil(w/160)+1;col++){
  const terrainRow=row-Math.floor(travel/180),seed=Math.abs(Math.sin(terrainRow*12.9898+col*78.233+sets*43.1)),x=col*160+Math.sin(terrainRow*3+sets)*12,y=row*180+offset,city=name==='City';
  c.fillStyle=seed>.5?detail:'#abc18b';c.globalAlpha=.18+seed*.2;c.fillRect(x+12,y+12,city?80:140,city?90:155);
  c.globalAlpha=.28;c.fillStyle='#172f35';
  if(name==='Coastline'){c.fillStyle='#214f44';for(let j=0;j<6;j++){c.beginPath();c.arc(x+25+j*19,y+30+(j%3)*28,5+j%3,0,Math.PI*2);c.fill();}}
  else if(name==='Mountains'){c.beginPath();c.moveTo(x,y+150);c.lineTo(x+70,y+5);c.lineTo(x+150,y+150);c.fill();}
  else {c.fillRect(x+25,y+30,city?35:12,city?50:12);c.fillRect(x+95,y+100,city?40:14,city?40:14);}
 }
 c.globalAlpha=1;
 if(name==='Coastline'){
  c.fillStyle='#b4b38a';c.beginPath();c.moveTo(0,0);for(let y=0;y<=h+30;y+=20)c.lineTo(w*.22+Math.sin((y-travel)*.002)*w*.09,y);c.lineTo(0,h);c.fill();
  const sea=c.createLinearGradient(0,0,w*.27,0);sea.addColorStop(0,'#173f60');sea.addColorStop(1,'#4b9a9b');c.fillStyle=sea;c.beginPath();c.moveTo(0,0);for(let y=0;y<=h+30;y+=20)c.lineTo(w*.2+Math.sin((y-travel)*.002)*w*.09,y);c.lineTo(0,h);c.fill();
  c.strokeStyle='#e6eee355';c.lineWidth=2;for(let n=1;n<4;n++){c.beginPath();for(let y=0;y<=h+30;y+=15){const x=w*.2+Math.sin((y-travel)*.002)*w*.09-n*12;if(!y)c.moveTo(x,y);else c.lineTo(x,y);}c.stroke();}
 }
 c.strokeStyle='#e5e2bd55';c.lineWidth=sets%3===1?18:8;c.beginPath();
 for(let y=-20;y<h+30;y+=20){const x=w*.67+Math.sin((y-travel)*.003+sets)*w*.09;if(y===-20)c.moveTo(x,y);else c.lineTo(x,y);}c.stroke();
 // Soft cloud layer moves at a different speed from the terrain.
 c.fillStyle='#f1f5ef';c.globalAlpha=.12;
 for(let i=0;i<6;i++){const y=((i*173+travel*.42)%(h+220))-110;c.beginPath();c.ellipse((i*277+sets*47)%w,y,100,28,-.2,0,Math.PI*2);c.fill();}
 c.globalAlpha=1;c.fillStyle='#0a2235cc';c.fillRect(Math.max(12,w/2-220),h-38,Math.min(w-24,440),27);c.fillStyle='#fff4d7';c.font='13px sans-serif';c.fillText(name+' · flight '+(sets+1)+' · '+(sets%3+1)+'/3 to next landscape',Math.max(24,w/2-208),h-20);
};
R.renderWorld=function(){if(!enabled())world();};R.renderLighting=function(){if(!enabled())lighting();};$.renderMinimap=function(){if(!enabled())minimap();};
F.moveEnemy=function(e){
 const dt=$.dt||1;e.t+=.02*dt;
 if(!e.flightAnchor){const n=Math.max(1,$.carriers.length),slot=e.num-1,maxH=Math.max(0,...$.carriers.map(c=>c.label?.h||0)),safe=Math.max(90,R.topSafe())+maxH+55;
  e.flightAnchor={x:-$.screen.x+$.cw*((slot+.5)/n),y:-$.screen.y+safe};
  e.x=e.flightAnchor.x;e.y=-$.screen.y-50;
 }
 const ox=e.x,oy=e.y;e.x=e.flightAnchor.x+Math.sin(e.t)*18;e.y+=(e.flightAnchor.y+Math.sin($.tick*.013)*10-e.y)*(1-Math.exp(-dt*.025));e.vx=(e.x-ox)/dt;e.vy=(e.y-oy)/dt;
 // Answer aircraft hold readable formations while terrain supplies forward motion.
};
// Interceptors sweep in from ahead, cross the flight field and peel off below.
const spawn=$.spawnEnemy,enemyUpdate=$.Enemy.prototype.update;
$.spawnEnemy=function(){const e=spawn.apply(this,arguments);if(enabled()){e.x=-$.screen.x+40+Math.random()*Math.max(1,$.cw-80);e.y=-$.screen.y-60;e.flightX=e.x;e.flightT=0;}return e;};
$.Enemy.prototype.update=function(i){if(!enabled())return enemyUpdate.call(this,i);this.flightX??=this.x;this.flightT=(this.flightT||0)+$.dt*.018;const ox=this.x,oy=this.y;
 this.x=this.flightX+Math.sin(this.flightT+this.index)*45;this.y+=Math.max(1.2,Math.min(3,this.speed||1.6))*$.dt;this.vx=(this.x-ox)/($.dt||1);this.vy=(this.y-oy)/($.dt||1);this.inView=this.y+$.screen.y>-40&&this.y+$.screen.y<$.ch+40;
 if(this.y+$.screen.y>$.ch+80)$.enemies.splice(i,1);
};
const help=document.createElement('p');help.className='meta';help.textContent='Move sideways with Left / Right, A / D or the left joystick. Your ship always faces forward and fires straight ahead. Hold FIRE / Space to shoot. Target brackets mark the selected enemy. Every completed set changes the route; every three sets changes the landscape.';document.querySelector('#home .operations')?.appendChild(help);
})();
