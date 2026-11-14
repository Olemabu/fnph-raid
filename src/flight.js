/* Continuous arcade flight. Learning queues and measured controller axes stay unchanged. */
(function(){
'use strict';
const R=$.raid,KEY='fnphraid.flight.v1',clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
let saved;try{saved=JSON.parse(localStorage.getItem(KEY)||'null');}catch(e){}
let sets=Number.isSafeInteger(saved?.sets)&&saved.sets>=0?saved.sets:0,travel=0,runDone=false;
const regions=[['Coastline','#467d89','#c6b78a'],['Farmland','#71835b','#b4a975'],['City','#687785','#9b9c8e'],['Mountains','#6d7774','#a5a99b']];
const enabled=()=>R.active&&!R.orbAssault&&!R.modeName();
function completeSet(){if(!enabled()||runDone)return;runDone=true;sets++;try{localStorage.setItem(KEY,JSON.stringify({sets}));}catch(e){}R.toast('Flight checkpoint '+sets+' saved · '+regions[Math.floor(sets/3)%regions.length][0],true);}
const F=R.flight={applyShared:value=>{if(Number.isSafeInteger(value?.sets))sets=Math.max(sets,value.sets);},enabled,completeSet,progress:()=>({sets,region:Math.floor(sets/3)%regions.length,stretch:sets%3})};
// A fresh firing press arms this question; confirmation presses stay consumed.
F.combat={wave:null,age:0,next:0,stage:'ready',cooldown:0};
const resetFire=R.resetAnswerFire;
if(resetFire)R.resetAnswerFire=function(){const out=resetFire.apply(this,arguments);Object.assign(F.combat,{wave:null,stage:'ready'});return out;};
const manualFire=()=>!!($.mouse.down||$.pad.rawFire||$.pad.fire||$.touch?.fire||$.keyFire);
const canFire=R.canFire;
if(canFire)R.canFire=function(){const allowed=canFire.apply(this,arguments);if(!enabled())return allowed;
 if(allowed&&manualFire())F.combat.stage='answer';
 return allowed;
};
F.answerFire=()=>!enabled()||F.combat.stage==='answer';
const spawnEnemies=$.spawnEnemies;
$.spawnEnemies=function(){if(!enabled())return spawnEnemies?.apply(this,arguments);
 if(R.phase!=='fight'||R.paused||$.hero.life<=0)return;
 const b=F.combat,dt=$.dt||1;
 if(b.wave!==R.wave){Object.assign(b,{wave:R.wave,age:0,next:180,cooldown:0});$.enemies.length=0;}
 b.age+=dt;
 const chip=document.querySelector('#qChip');
 if(chip)chip.textContent=b.age<180?'Read the question · swarm approaching':b.stage==='answer'?'ANSWER FIRE · shoot through to your option':'Release confirm, then hold FIRE to shoot enemies and your answer';
 if(b.age<180)return;
 const cap=Math.min($.cw<600?12:20,8+Math.floor((R.cleared||0)/2)*2),gap=Math.max(130,240-(R.cleared||0)*12);
 if(b.age<b.next)return;b.next=b.age+gap;
 const count=Math.min(cap-$.enemies.length,3+Math.floor((R.cleared||0)/3));
 for(let n=0;n<count;n++){
  const blocker=n===0,e=$.spawnEnemy(blocker?1:0),left=-$.screen.x+30,right=-$.screen.x+$.cw-30;
  e.raidSwarm=true;e.blocker=blocker;e.life=e.lifeMax=blocker?4:1;e.flightAge=0;e.speed=blocker?1.6:2.4;
  e.flightX=left+Math.random()*(right-left);e.x=e.flightX;e.y=-$.screen.y-40-n*24;
  if(n%3===2){e.x=n%2?left-35:right+35;e.y=-$.screen.y+Math.max(R.topSafe()+90,$.ch*.4);e.flightX=left+Math.random()*(right-left);}
  $.enemies.push(e);
 }
};
F.contact=function(h){const b=F.combat,dt=$.dt||1;b.cooldown=Math.max(0,b.cooldown-dt);if(b.cooldown>0)h.takingDamage=1;
 if(R.phase!=='fight'||R.paused||b.age<180||h.life<=0||b.cooldown>0)return;
 if($.enemies.some(e=>e.raidSwarm&&e.inView&&Math.hypot(e.x-h.x,e.y-h.y)<e.radius+h.radius)){
  h.life=Math.max(0,h.life-.12);h.takingDamage=1;b.cooldown=33;$.rumble.level=6;$.audio.play('takingDamage');
 }
};
const start=R.start;R.start=function(){runDone=false;start.apply(this,arguments);if(enabled()){$.mouse.moved=0;$.pad.aim=null;if($.touch)$.touch.aim=null;$.aimLock=null;$.hero.direction=$.hero.prevDirection=-Math.PI/2;$.hero.flightBank=0;}};
// Start the teaching encounter directly: no return trip to a hospital map marker.
const update=R.update;R.update=function(){if(enabled()&&R.phase==='travel'){R.beginCombat();return;}const result=update.apply(this,arguments);if(enabled()){const loc=document.querySelector('#hLoc');if(loc)loc.textContent=regions[Math.floor(sets/3)%regions.length][0]+' · stretch '+(sets%3+1)+'/3';}return result;};
const begin=R.beginCombat;R.beginCombat=function(){runDone=false;return begin.apply(this,arguments);};
const heroUpdate=$.Hero.prototype.update;
$.Hero.prototype.update=function(){
 heroUpdate.call(this);if(!enabled())return;
 F.contact(this);
 const dt=$.dt||1;
 this.flightBank=(this.flightBank||0)+(clamp(this.vx/8,-1,1)*.28-(this.flightBank||0))*(1-Math.exp(-dt*.14));
 const left=-$.screen.x+44,right=-$.screen.x+$.cw-44,top=-$.screen.y+Math.min($.ch*.46,R.topSafe()+70),bottom=-$.screen.y+$.ch-(R.sideControls?32:70);
 this.x=clamp(this.x,left,Math.max(left,right));this.y=clamp(this.y,top,Math.max(top,bottom));
 travel+=dt*(2.5+clamp(-this.vy,-1.2,3));
};
const camera=$.updateScreen;
$.updateScreen=function(){if(!enabled())return camera();
 // Stable flight viewport; the world scrolls beneath the manually steered plane.
 if(!Number.isFinite(F.cx)||F.hero!==$.hero||F.width!==$.cw||F.height!==$.ch){F.width=$.cw;F.height=$.ch;for(const e of $.carriers)e.flightAnchor=null;F.hero=$.hero;$.hero.x=$.ww/2;$.hero.y=$.wh/2;F.cx=$.hero.x;F.cy=$.hero.y-$.ch*(R.sideControls?.34:.18);}
 $.screen.x=$.cw/2-F.cx;$.screen.y=$.ch/2-F.cy;$.rumble.x=$.rumble.y=0;$.mousescreen();
};
const map=R.renderMap,world=R.renderWorld,lighting=R.renderLighting,minimap=$.renderMinimap;
R.renderMap=function(){if(!enabled())return map();
 const c=$.ctxmg,w=$.cw,h=$.ch,region=Math.floor(sets/3)%regions.length,[name,ground,detail]=regions[region],offset=travel%220,horizon=Math.max(68,Math.min(h*.24,148));
 const skies=[['#a8d0db','#e7e0c4'],['#9ec3c2','#e6dfc4'],['#96acbc','#e3ded3'],['#a9c6d1','#e1dfd4']],sky=skies[region];
 const bg=c.createLinearGradient(0,0,0,h);bg.addColorStop(0,sky[0]);bg.addColorStop(Math.min(.32,horizon/h),sky[1]);bg.addColorStop(Math.min(.34,horizon/h+.03),ground);bg.addColorStop(1,'#263d3b');c.fillStyle=bg;c.fillRect(0,0,w,h);
 // Distant terrain drifts slower than the ground to make altitude and forward speed legible.
 for(let layer=0;layer<2;layer++){
  const base=horizon+layer*24,drift=travel*(layer ? 0.12 : 0.2),amp=layer?17:27;
  c.beginPath();c.moveTo(0,h);for(let x=0;x<=w+12;x+=12){const y=base+Math.sin((x+drift)*.009+region*1.7)*amp+Math.sin((x-drift*.6)*.021+region)*amp*.28;c.lineTo(x,y);}c.lineTo(w,h);c.closePath();
  c.fillStyle=layer?'rgba(34,63,66,.34)':'rgba(38,67,69,.25)';c.fill();
 }
 // Deterministic terrain tiles keep landmarks and fields stable across frames.
 const rowStep=220,colStep=190,rows=Math.ceil(h/rowStep)+2,cols=Math.ceil(w/colStep)+2;
 for(let row=-1;row<rows;row++)for(let col=-1;col<cols;col++){
  const terrainRow=row-Math.floor(travel/rowStep),seed=Math.abs(Math.sin(terrainRow*12.9898+col*78.233+region*43.1)),x=col*colStep+Math.sin(terrainRow*3+region)*11,y=row*rowStep+offset;
  const tileW=colStep-7,tileH=rowStep-8,city=name==='City';
  c.fillStyle=seed>.53?detail:'#b1bf8b';c.globalAlpha=.14+seed*.15;
  c.beginPath();c.moveTo(x+8,y+7);c.lineTo(x+tileW-7,y+12);c.lineTo(x+tileW-12,y+tileH-8);c.lineTo(x+11,y+tileH-12);c.closePath();c.fill();
  c.globalAlpha=.25;c.strokeStyle='#e5e2bd55';c.lineWidth=1;
  if(name==='Farmland'){
   c.save();c.beginPath();c.rect(x+12,y+12,tileW-24,tileH-24);c.clip();
   for(let furrow=0;furrow<7;furrow++){const fx=x+23+furrow*23+Math.sin(terrainRow+furrow)*8;c.beginPath();c.moveTo(fx,y+tileH);c.lineTo(fx+25,y);c.stroke();}
   c.restore();
  }else if(city){
   c.strokeStyle='#d9e0d744';c.lineWidth=5;c.beginPath();c.moveTo(x+tileW*.48,y);c.lineTo(x+tileW*.48,y+tileH);c.moveTo(x,y+tileH*.55);c.lineTo(x+tileW,y+tileH*.55);c.stroke();
   for(let b=0;b<4;b++){
    const bx=x+20+(b%2)*75,by=y+22+Math.floor(b/2)*94,bw=40+(b%3)*7,bh=40+(b%2)*19;
    c.fillStyle=b%2?'#344b59':'#415967';c.fillRect(bx,by,bw,bh);c.fillStyle='#edcf8755';
    for(let wy=0;wy<3;wy++)for(let wx=0;wx<2;wx++)c.fillRect(bx+7+wx*14,by+7+wy*11,4,4);
   }
  }else if(name==='Mountains'){
   c.fillStyle='#263e46aa';c.beginPath();c.moveTo(x,y+tileH);c.lineTo(x+tileW*.48,y+20+seed*35);c.lineTo(x+tileW,y+tileH);c.closePath();c.fill();
   c.fillStyle='#e4e5d4aa';c.beginPath();c.moveTo(x+tileW*.48,y+20+seed*35);c.lineTo(x+tileW*.39,y+tileH*.48);c.lineTo(x+tileW*.53,y+tileH*.43);c.closePath();c.fill();
  }else if(name==='Coastline'){
   c.fillStyle='#28627666';c.beginPath();c.ellipse(x+tileW*.76,y+tileH*.4,48,22,.12,0,Math.PI*2);c.fill();
   c.strokeStyle='#dceadd77';c.lineWidth=1.5;for(let wave=0;wave<4;wave++){c.beginPath();c.ellipse(x+tileW*.77,y+tileH*.4,27+wave*8,9+wave*4,.12,0,Math.PI*2);c.stroke();}
  }
  // A distinct landmark anchors each region without reverting to the old map.
  if(Math.abs(terrainRow+col*2+region*3)%8===2){
   const lx=x+tileW*.72,ly=y+tileH*.68;
   if(name==='Farmland'){
    c.strokeStyle='#d9d5ae';c.lineWidth=2;c.beginPath();c.moveTo(lx,ly);c.lineTo(lx,ly-33);c.moveTo(lx-13,ly-30);c.lineTo(lx+13,ly-30);c.moveTo(lx,ly-30);c.lineTo(lx-9,ly-39);c.moveTo(lx,ly-30);c.lineTo(lx+8,ly-40);c.stroke();
   }else if(city){c.fillStyle='#1e3545';c.fillRect(lx-12,ly-41,24,41);c.fillStyle='#d5b96e';for(let wy=0;wy<4;wy++)c.fillRect(lx-6,ly-34+wy*8,4,3);
   }else if(name==='Coastline'){c.fillStyle='#f0e8c8';c.fillRect(lx-4,ly-30,8,30);c.fillStyle='#bb6c52';c.fillRect(lx-6,ly-31,12,6);c.fillStyle='#fff5cc';c.fillRect(lx-2,ly-22,4,4);
   }else{c.fillStyle='#e6e0c7';c.fillRect(lx-3,ly-28,6,28);c.fillStyle='#dfb75c';c.beginPath();c.arc(lx,ly-30,6,0,Math.PI*2);c.fill();}
  }
 }
 c.globalAlpha=1;
 if(name==='Coastline'){
  c.fillStyle='#b4b38a';c.beginPath();c.moveTo(0,horizon+6);for(let y=horizon;y<=h+30;y+=16)c.lineTo(w*.22+Math.sin((y-travel)*.002)*w*.09,y);c.lineTo(0,h);c.closePath();c.fill();
  const sea=c.createLinearGradient(0,0,w*.27,0);sea.addColorStop(0,'#173f60');sea.addColorStop(1,'#4b9a9b');c.fillStyle=sea;c.beginPath();c.moveTo(0,horizon);for(let y=horizon;y<=h+30;y+=14)c.lineTo(w*.2+Math.sin((y-travel)*.002)*w*.09,y);c.lineTo(0,h);c.closePath();c.fill();
  c.strokeStyle='#e6eee377';c.lineWidth=2;for(let n=1;n<4;n++){c.beginPath();for(let y=horizon;y<=h+30;y+=15){const x=w*.2+Math.sin((y-travel)*.002)*w*.09-n*12;if(y===horizon)c.moveTo(x,y);else c.lineTo(x,y);}c.stroke();}
 }
 // A faint navigation corridor supplies scale; its path changes with the field.
 c.strokeStyle=region%2?'#e5e2bd66':'#b6e0e277';c.lineWidth=sets%3===1?14:7;c.beginPath();
 for(let y=horizon;y<h+30;y+=18){const x=w*(region===2?.56:.67)+Math.sin((y-travel)*.003+sets)*w*.09;if(y===horizon)c.moveTo(x,y);else c.lineTo(x,y);}c.stroke();
 // Cloud banks have their own slow drift, separate from the landscape.
 c.fillStyle='#f1f5ef';c.globalAlpha=.14;for(let i=0;i<7;i++){
  const cy=((i*173+travel*.38)%(h+220))-110,cx=(i*277+region*61+Math.sin(travel*.001+i)*30)%w;
  c.beginPath();c.ellipse(cx,cy,65+(i%3)*22,16+(i%2)*8,-.16,0,Math.PI*2);c.fill();
 }
 c.globalAlpha=1;
 // Restrained edge streaks reinforce speed without crossing the options or ship.
 c.strokeStyle='#eef5e51a';c.lineWidth=1;for(let i=0;i<5;i++){const yy=(i*151+travel*1.7)%(h+70)-35;c.beginPath();c.moveTo(8,yy);c.lineTo(w*.06,yy+24);c.moveTo(w*.94,yy+26);c.lineTo(w-8,yy);c.stroke();}
 const badgeW=Math.min(w-24,440),badgeX=(w-badgeW)/2;c.fillStyle='#0a2235cc';c.fillRect(badgeX,h-38,badgeW,27);c.fillStyle='#fff4d7';c.font='600 12px "Chakra Petch",sans-serif';c.fillText(name+' · FLIGHT '+(sets+1)+' · '+(sets%3+1)+'/3 TO NEXT LANDSCAPE',badgeX+12,h-20);
};
R.renderWorld=function(){if(!enabled())world();};R.renderLighting=function(){if(!enabled())lighting();};$.renderMinimap=function(){if(!enabled())minimap();};
F.moveEnemy=function(e){
 const dt=$.dt||1;e.t+=.02*dt;
 if(R.answerPlate){const p=R.answerPlate(e);e.mergedAnswer=true;e.plate=p;e.x=p.x+p.w/2;e.y=p.y+p.h/2;e.flightAnchor={x:e.x,y:e.y};e.vx=e.vy=0;return;}
 if(!e.flightAnchor){const n=Math.max(1,$.carriers.length),slot=e.num-1,maxH=Math.max(0,...$.carriers.map(c=>c.label?.h||0)),safe=R.sideControls?Math.min($.ch*.58,Math.max(90,R.topSafe())+maxH+55):Math.max(90,R.topSafe())+maxH+55;
  e.flightAnchor={x:-$.screen.x+$.cw*((slot+.5)/n),y:-$.screen.y+safe};
  e.x=e.flightAnchor.x;e.y=-$.screen.y-50;
 }
 const ox=e.x,oy=e.y;e.x=e.flightAnchor.x+Math.sin(e.t)*18;e.y+=(e.flightAnchor.y+Math.sin($.tick*.013)*10-e.y)*(1-Math.exp(-dt*.025));e.vx=(e.x-ox)/dt;e.vy=(e.y-oy)/dt;
 // Answer aircraft hold readable formations while terrain supplies forward motion.
};
// Interceptors sweep in from ahead, cross the flight field and peel off below.
const spawn=$.spawnEnemy,enemyUpdate=$.Enemy.prototype.update;
$.spawnEnemy=function(){const e=spawn.apply(this,arguments);if(enabled()){const slot=$.enemies?.length||0,index=Number.isFinite(e.index)?e.index:slot;e.flightX=-$.screen.x+40+Math.random()*Math.max(1,$.cw-80);e.x=e.flightX;e.y=-$.screen.y-60-slot*12;e.flightT=0;e.flightAge=0;e.flightPhase=(slot+index*.71)*1.7;e.flightPattern=(slot+index+sets+(R.cleared||0))%3;e.flightSide=slot%2?1:-1;}return e;};
$.Enemy.prototype.update=function(i){if(!enabled())return enemyUpdate.call(this,i);
 if(this.raidSwarm){
  if(R.phase!=='fight'||R.paused){this.inView=false;return;}
  const dt=$.dt||1;this.flightAge+=dt;const age=this.flightAge,t=age/60,left=-$.screen.x+25,right=-$.screen.x+$.cw-25,ox=this.x,oy=this.y;
  const centre=(left+right)/2,wide=Math.max(24,Math.min($.cw*.25,150)),phase=this.flightPhase||this.index;
  const formation=age<42,cross=age>=42&&age<168,chase=age>=168&&age<330,passing=age>=330;
  let want=this.flightX;
  if(formation){const slot=(this.index%5)-2;want=clamp(centre+slot*(this.blocker?24:38)+Math.sin(phase)*12,left,right);}
  else if(cross){const pattern=this.flightPattern||0;want=pattern===0?centre+Math.sin(t*1.9+phase)*wide:pattern===1?centre+Math.sin((t-0.7)*1.25+phase)*wide*1.35:centre+Math.sin(t*2.8+phase)*wide*.72;}
  else if(chase){const spread=this.blocker?18:48;want=$.hero.x+Math.sin(t*2.3+phase)*spread;}
  else{want=this.x+this.flightSide*(this.blocker?1.2:2.6)*dt;}
  want=clamp(want,left,right);this.x+=(want-this.x)*(1-Math.exp(-dt*(this.blocker ? 0.042 : 0.033)));
  this.y+=(this.speed+(passing ? 0.65 : 0))*dt;this.vx=(this.x-ox)/dt;this.vy=(this.y-oy)/dt;
  this.inView=this.y+$.screen.y>-30&&this.y+$.screen.y<$.ch+40;this.hitFlag=Math.max(0,this.hitFlag-dt);
  if(this.y+$.screen.y>$.ch+70||this.flightAge>660)$.enemies.splice(i,1);return;
 }
this.flightX??=this.x;this.flightT=(this.flightT||0)+$.dt*.018;const ox=this.x,oy=this.y;
 this.x=this.flightX+Math.sin(this.flightT+this.index)*45;this.y+=Math.max(1.2,Math.min(3,this.speed||1.6))*$.dt;this.vx=(this.x-ox)/($.dt||1);this.vy=(this.y-oy)/($.dt||1);this.inView=this.y+$.screen.y>-40&&this.y+$.screen.y<$.ch+40;
 if(this.y+$.screen.y>$.ch+80)$.enemies.splice(i,1);
};
const stockEnemyRender=$.Enemy.prototype.render;
$.Enemy.prototype.render=function(i){
 if(!enabled()||!this.raidSwarm)return stockEnemyRender.call(this,i);
 if(!this.inView)return;
 const c=$.ctxmg,r=this.radius||15,heavy=!!this.blocker,hit=this.hitFlag>0,edge=heavy?'#d7b668':'#6cb9c4',core=heavy?'#ffd478':'#9de9e8';
 c.save();c.translate(this.x,this.y);
 const wing=heavy?r*1.72:r*1.48,length=heavy?r*1.55:r*1.35;
 // Engine bloom and tail fins make the hostile read as a small mecha interceptor.
 for(const side of [-1,1]){const x=side*r*.42,y=-length*.55,g=c.createLinearGradient(x,y-8,x,y+13);g.addColorStop(0,'#bff7ffcc');g.addColorStop(.45,heavy?'#f0bd5b99':'#57dbe899');g.addColorStop(1,'#4dd6ff00');c.fillStyle=g;c.beginPath();c.moveTo(x-3,y);c.lineTo(x,y+13);c.lineTo(x+3,y);c.closePath();c.fill();}
 c.fillStyle='rgba(1,10,17,.32)';c.beginPath();c.ellipse(2,4,wing*.9,length*.74,0,0,Math.PI*2);c.fill();
 c.beginPath();c.moveTo(0,length*.88);c.lineTo(wing*.38,length*.22);c.lineTo(wing,length*.56);c.lineTo(wing*.78,-length*.08);c.lineTo(wing*.36,-length*.44);c.lineTo(0,-length*.82);c.lineTo(-wing*.36,-length*.44);c.lineTo(-wing*.78,-length*.08);c.lineTo(-wing,-length*.56);c.lineTo(-wing*.38,length*.22);c.closePath();
 const hull=c.createLinearGradient(-wing,-length,wing,length);hull.addColorStop(0,'#526b77');hull.addColorStop(.36,'#182c39');hull.addColorStop(.72,'#304754');hull.addColorStop(1,'#111e29');c.fillStyle=hull;c.fill();c.strokeStyle=hit?'#fff4c9':edge;c.lineWidth=heavy?2:1.3;c.stroke();
 // Segmented shoulder armour and the central cockpit/reactor remain legible at small sizes.
 c.fillStyle=heavy?'#8a6c3b':'#40626b';for(const side of [-1,1]){c.beginPath();c.moveTo(side*wing*.72,-length*.18);c.lineTo(side*wing*.96,length*.30);c.lineTo(side*wing*.48,length*.15);c.lineTo(side*wing*.4,-length*.10);c.closePath();c.fill();c.strokeStyle=edge;c.lineWidth=.8;c.stroke();}
 c.beginPath();c.moveTo(0,-length*.58);c.lineTo(r*.24,-length*.04);c.lineTo(r*.19,length*.42);c.lineTo(0,length*.62);c.lineTo(-r*.19,length*.42);c.lineTo(-r*.24,-length*.04);c.closePath();c.fillStyle='#0c1a24';c.fill();c.strokeStyle=edge;c.lineWidth=1;c.stroke();
 c.fillStyle=hit?'#fff8db':core;c.shadowColor=core;c.shadowBlur=heavy?9:6;c.beginPath();c.ellipse(0,length*.03,r*.16,length*.22,0,0,Math.PI*2);c.fill();c.shadowBlur=0;
 c.strokeStyle='#dceef070';c.lineWidth=.8;c.beginPath();c.moveTo(-wing*.45,-length*.12);c.lineTo(-r*.25,length*.23);c.moveTo(wing*.45,-length*.12);c.lineTo(r*.25,length*.23);c.stroke();
 if(this.lifeMax>1){const count=Math.min(5,this.lifeMax),gap=2,pip=Math.min(5,(r*1.5-gap*(count-1))/count),start=-((pip+gap)*count-gap)/2;c.fillStyle='#101c26cc';c.fillRect(-wing*.52,length*.88,wing*1.04,4);for(let n=0;n<count;n++){c.fillStyle=n<this.life?(heavy?'#e4c16e':'#80d7df'):'#33414a';c.fillRect(start+n*(pip+gap),length*.93,pip,3);}}
 if(hit){c.globalAlpha=.28;c.fillStyle='#fff4d1';c.beginPath();c.moveTo(0,-length*.82);c.lineTo(wing,length*.56);c.lineTo(0,length*.88);c.lineTo(-wing,length*.56);c.closePath();c.fill();}
 c.restore();
};
const help=document.createElement('p');help.className='meta';help.textContent='Move sideways with Left / Right, A / D or the left joystick. Your ship always faces forward and fires straight ahead. Release the confirmation button, then hold FIRE / Space to shoot through swarms to your answer. Contact drains health; collect falling health packs and upgrades. Target brackets mark the selected enemy. Every completed set changes the route; every three sets changes the landscape.';document.querySelector('#home .operations')?.appendChild(help);
})();
