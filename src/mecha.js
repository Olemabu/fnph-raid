/* Original vector frames for FNPH Raid. Shared hangar and battlefield renderer. */
(function(){
'use strict';
const R=$.raid;
const FRAMES=R.frames=[
 {name:'Kestrel',code:'RX–01',role:'Reconnaissance frame',at:0,ink:'#24394a',metal:'#91a7b0',light:'#f1e6c7',core:'#7affdb'},
 {name:'Sentinel',code:'RX–02',role:'Armoured response frame',at:3,ink:'#183047',metal:'#8bb4cf',light:'#d9f5ff',core:'#67dfff'},
 {name:'Seraph',code:'RX–03',role:'Wing-assisted assault frame',at:7,ink:'#402f35',metal:'#c2a18b',light:'#ffedcf',core:'#ff9b62'},
 {name:'Archon',code:'RX–04',role:'Prismatic command frame',at:12,ink:'#2e2849',metal:'#9d94c9',light:'#eee6ff',core:'#c5a1ff'},
 {name:'Nightingale',code:'RX–05',role:'Ascendant guardian frame',at:17,ink:'#293342',metal:'#d3bf87',light:'#fff7dd',core:'#ffe392'}
];
const poly=(c,pts,fill,stroke)=>{c.beginPath();pts.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=1;c.stroke();}};
const line=(c,p,col,w=1)=>{c.strokeStyle=col;c.lineWidth=w;c.beginPath();p.forEach((v,i)=>i?c.lineTo(...v):c.moveTo(...v));c.stroke();};
function glow(c,x,y,r,col){const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,col);g.addColorStop(1,'transparent');c.fillStyle=g;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();}
function plate(c,pts,f){const yy=pts.map(p=>p[1]),g=c.createLinearGradient(0,Math.min(...yy),20,Math.max(...yy)+1);g.addColorStop(0,f.light);g.addColorStop(.23,f.metal);g.addColorStop(1,f.ink);poly(c,pts,g,f.metal);const a=pts[0],b=pts[1];line(c,[[a[0]+2,a[1]+2],[b[0]-2,b[1]+2]],f.light,1.6);}
R.drawFrame=function(c,x,y,scale,tier,time,topDown,heading,recoil){
 const f=FRAMES[Math.max(0,Math.min(4,tier|0))];c.save();c.translate(x,y);c.scale(scale,scale);
 if(topDown){
  c.rotate(heading||0);c.shadowColor=f.core;c.shadowBlur=10;
  for(const s of [-1,1]){
   poly(c,[[-20,s*9],[-29-8*Math.sin(time*24),s*13],[-20,s*17]],f.core);
   c.shadowBlur=0;plate(c,[[-18,s*8],[-6,s*17],[10,s*14],[16,s*7],[1,s*4]],f);
   if(tier>=1)plate(c,[[-13,s*16],[-7,s*(22+tier)],[6,s*(22+tier)],[14,s*15]],f);
   if(tier>=2)poly(c,[[-13,s*20],[-28-tier*3,s*(30+tier*3)],[-21,s*12]],f.ink,f.core);
   if(tier>=3)line(c,[[-24,s*24],[-34,s*33],[-25,s*14]],f.core,1.5);
   c.fillStyle=f.ink;c.fillRect(-5,s*10-2,24,4);c.fillStyle=f.light;c.fillRect(8,s*10-1,14,2);
  }
  plate(c,[[-17,0],[-7,-9],[11,-7],[20,0],[11,7],[-7,9]],f);
  c.fillStyle=f.ink;c.fillRect(1-(recoil||0)*3,-3,27,6);c.fillStyle=f.core;c.fillRect(24-(recoil||0)*3,-2,5,4);
  glow(c,2,0,12,f.core+'88');poly(c,[[-4,0],[3,-4],[9,0],[3,4]],f.core);
  if(tier===4){c.strokeStyle=f.core+'99';c.lineWidth=.8;c.beginPath();c.arc(0,0,34,time*.6,time*.6+Math.PI*1.5);c.stroke();}
 }else{
  // A front three-quarter hangar portrait: every plate is drawn, not a sprite filter.
  const bob=Math.sin(time*1.4)*2;c.translate(0,bob);
  for(const s of [-1,1]){
   if(tier>=2){
    c.save();c.scale(s,1);const wing=23+tier*15;
    poly(c,[[20,-65],[wing+28,-112],[wing+19,-28],[30,-5]],f.ink,f.metal);
    plate(c,[[35,-65],[wing+20,-103],[wing+10,-49],[43,-30]],f);
    line(c,[[40,-62],[wing+13,-91],[wing+4,-49]],f.core,2);
    if(tier>=3){poly(c,[[42,-40],[wing+45,-64],[wing+14,2],[36,20]],f.ink,f.core);line(c,[[50,-35],[wing+33,-51],[wing+10,-4]],f.light,2);}
    c.restore();
   }
   glow(c,s*24,94,44,f.core+'44');
   // Thigh, knee, shin and broad mechanical foot.
   plate(c,[[s*8,15],[s*34,11],[s*41,47],[s*29,64],[s*12,49]],f);
   poly(c,[[s*13,49],[s*36,48],[s*40,64],[s*23,72]],f.ink,f.metal);
   plate(c,[[s*17,66],[s*39,62],[s*46,99],[s*24,108],[s*14,89]],f);
   poly(c,[[s*23,99],[s*44,94],[s*55,113],[s*15,113]],f.ink,f.light);
   line(c,[[s*27,72],[s*31,94]],f.core,3);
   // Shoulder silhouette grows at every refit.
   const shoulder=45+tier*4;
   plate(c,[[s*24,-65],[s*shoulder,-73],[s*(shoulder+13),-53],[s*(shoulder+9),-27],[s*28,-33]],f);
   poly(c,[[s*30,-64],[s*(shoulder-1),-68],[s*(shoulder+7),-54],[s*33,-47]],f.ink,f.light);
   line(c,[[s*35,-58],[s*(shoulder+4),-58]],f.core,2);
   poly(c,[[s*34,-30],[s*51,-27],[s*53,-7],[s*38,0]],f.ink,f.metal);
   plate(c,[[s*37,-7],[s*56,-12],[s*62,22],[s*47,34],[s*37,19]],f);
   poly(c,[[s*44,29],[s*58,25],[s*60,42],[s*46,45]],f.ink,f.light);
   // Wrist cannon, barrel bores and glowing capacitors.
   c.save();c.scale(s,1);c.fillStyle=f.ink;c.fillRect(44,2,13,58+tier*3);c.strokeStyle=f.metal;c.strokeRect(44,2,13,58+tier*3);c.fillStyle=f.core;c.fillRect(48,9,3,25);c.fillStyle='#080f16';c.fillRect(47,54+tier*3,7,9);c.restore();
   if(tier>=1){c.save();c.scale(s,1);c.fillStyle=f.ink;c.fillRect(33,-90,12,25);c.strokeStyle=f.light;c.strokeRect(33,-90,12,25);for(let k=0;k<3;k++){c.fillStyle=f.core;c.fillRect(36,-86+k*6,6,2);}c.restore();}
  }
  // Pelvis, abdominal articulation, ribbed torso and reactor.
  poly(c,[[-26,10],[26,10],[35,30],[13,42],[-13,42],[-35,30]],f.ink,f.light);
  for(let k=0;k<3;k++)plate(c,[[-17,-9+k*8],[17,-9+k*8],[14,0+k*8],[-14,0+k*8]],f);
  plate(c,[[-29,-64],[29,-64],[35,-31],[20,-7],[-20,-7],[-35,-31]],f);
  poly(c,[[-26,-59],[0,-48],[26,-59],[22,-32],[0,-19],[-22,-32]],f.ink,f.light);
  glow(c,0,-37,33,f.core+'77');poly(c,[[0,-49],[12,-38],[0,-24],[-12,-38]],f.core,f.light);
  for(let k=0;k<3;k++)for(const s of [-1,1])line(c,[[s*17,-34+k*5],[s*27,-39+k*5]],f.light,1.4);
  // Helmet, brow, visor, cheek vents and signature antennae.
  poly(c,[[-10,-85],[-5,-99],[7,-100],[14,-85],[10,-67],[0,-61],[-12,-70]],f.ink,f.light);
  plate(c,[[-12,-86],[0,-94],[13,-85],[8,-77],[-9,-77]],f);
  c.shadowColor=f.core;c.shadowBlur=13;line(c,[[-9,-80],[0,-77],[10,-81]],f.core,3);c.shadowBlur=0;
  poly(c,[[-3,-74],[5,-74],[4,-64],[0,-61]],f.light,f.ink);
  line(c,[[-8,-88],[-15,-111],[-4,-96]],f.light,2);line(c,[[8,-88],[18,-112],[5,-96]],f.light,2);
  if(tier>=3){line(c,[[-13,-82],[-25,-99],[-17,-73]],f.core,1.5);line(c,[[13,-82],[25,-99],[17,-73]],f.core,1.5);}
  if(tier===4){c.save();c.translate(0,-105);c.scale(1,.25);c.strokeStyle=f.core;c.lineWidth=2;c.shadowColor=f.core;c.shadowBlur=20;c.beginPath();c.arc(0,0,44,0,Math.PI*2);c.stroke();c.restore();}
 }
 c.restore();
};
// Same earned frame in actual top-down combat. Controls, hitbox and weapons are unchanged.
$.Hero.prototype.render=function(){
 if(this.life<=0)return;const c=$.ctxmg;const tier=R.campaign?R.campaign.frameTier():Math.min(4,R.tier||0);
 c.save();c.fillStyle='#0007';c.beginPath();c.ellipse(this.x+5,this.y+9,34+tier*2,24,0,0,Math.PI*2);c.fill();c.restore();
 R.drawFrame(c,this.x,this.y,1.25,tier,$.tick/60,true,this.direction,this.recoil);
 this.recoil=Math.max(0,(this.recoil||0)-.25*$.dt);
 c.strokeStyle=this.takingDamage?'#ff5468':FRAMES[tier].core+'99';c.lineWidth=1.5;c.beginPath();c.arc(this.x,this.y,40,-Math.PI/2,-Math.PI/2+Math.PI*2*this.life);c.stroke();
};
})();
