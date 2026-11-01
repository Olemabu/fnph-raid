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
// Use the original interceptor silhouette in every view.
R.drawFrame=function(c,x,y,scale,tier,time,topDown,heading,recoil){
 c.save();c.translate(x,y);c.scale(scale*(topDown?1:4),scale*(topDown?1:4));
 const direction=topDown?(heading||0):-Math.PI/2;
 // Earned wing extensions preserve visible refits around the original hull.
 if(tier>0){c.save();c.rotate(direction);const f=FRAMES[tier];
  for(const side of [-1,1]){plate(c,[[-12,side*17],[-22-tier*3,side*(23+tier*3)],[-4,side*(20+tier*3)],[7,side*12]],f);}
  c.restore();}
 $.drawInterceptor.call({x:0,y:0,vx:0,vy:0,vmax:6,direction,life:1,takingDamage:0,turnRate:0,weapon:{fireFlag:0},preview:true},c,time);
 c.restore();
};
// Keep the original flight effects, guns, searchlights and damage shield in combat.
const originalRender=$.Hero.prototype.render;
$.Hero.prototype.render=function(){
 const tier=R.campaign?R.campaign.frameTier():Math.min(4,R.tier||0);
 if(this.life>0&&tier>0){const c=$.ctxmg,f=FRAMES[tier];c.save();c.translate(this.x,this.y);c.rotate(this.direction);
  for(const side of [-1,1])plate(c,[[-12,side*17],[-22-tier*3,side*(23+tier*3)],[-4,side*(20+tier*3)],[7,side*12]],f);
  c.restore();}
 originalRender.call(this);
};
})();
