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
const flight=new Image(),hangar=new Image();
flight.src=window.FNPH_SHIP_ASSETS['kestrel-flight'];hangar.src=window.FNPH_SHIP_ASSETS['kestrel-hangar'];
R.shipAssets={flight,hangar,ready:false,draws:0};
R.shipAssetsReady=Promise.all([flight.decode(),hangar.decode()]).then(()=>{R.shipAssets.ready=true;if(R.campaign)R.campaign.render();}).catch(()=>{throw Error('Ship artwork could not be decoded. Retry the game download.');});
function thrust(c,x,y,size,power){
 const g=c.createLinearGradient(x,y,x,y+size);g.addColorStop(0,'#e9fcff');g.addColorStop(.25,'#64dfffbb');g.addColorStop(1,'#1495ff00');c.fillStyle=g;c.beginPath();c.moveTo(x-3*power,y);c.quadraticCurveTo(x-4*power,y+size*.35,x,y+size);c.quadraticCurveTo(x+4*power,y+size*.35,x+3*power,y);c.fill();
}
function drawFlight(c,x,y,height,heading,time,speed,firing,damage){
 if(!R.shipAssets.ready)return;
 const width=height*flight.naturalWidth/flight.naturalHeight;
 c.save();c.translate(x,y);c.rotate(heading+Math.PI/2);c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';
 // Effects supplement the rendered hull; they never replace its artwork.
 const pulse=.86+.14*Math.sin(time*27),power=.7+Math.min(1,speed/6)*.6;
 for(const side of [-1,1])thrust(c,side*width*.134,height*.43,height*(.13+speed*.018)*pulse,power*height/104);
 c.drawImage(flight,-width/2,-height/2,width,height);R.shipAssets.draws++;
 if(firing){for(const side of [-1,1]){const mx=side*width*.18,my=-height*.31;const g=c.createRadialGradient(mx,my,0,mx,my,height*.12);g.addColorStop(0,'#fffef1');g.addColorStop(.3,'#9befffdd');g.addColorStop(1,'#2ca8ff00');c.fillStyle=g;c.fillRect(mx-height*.12,my-height*.12,height*.24,height*.24);}}
 if(damage){c.strokeStyle='#68dfff';c.lineWidth=1.8;c.globalAlpha=.65;c.beginPath();c.ellipse(0,0,width*.59,height*.53,0,0,Math.PI*2);c.stroke();}
 c.restore();
}
R.drawFrame=function(c,x,y,scale,tier,time,topDown,heading){
 if(!R.shipAssets.ready)return;
 if(topDown)drawFlight(c,x,y,74*scale,heading||0,time,0,false,false);
 else{const size=300*scale;c.save();c.translate(x,y+Math.sin(time*1.4)*3);c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.drawImage(hangar,-size/2,-size/2,size,size);R.shipAssets.draws++;c.restore();}
};
// Combat uses the rendered orthographic sprite, with the existing physics/hitbox.
$.Hero.prototype.render=function(){
 if(this.life<=0)return;
 const c=$.ctxmg,speed=Math.hypot(this.vx||0,this.vy||0),fire=this.weapon.fireFlag>0;
 drawFlight(c,this.x,this.y,104,this.direction,$.tick/60,speed,fire,this.takingDamage);
 if(fire)this.weapon.fireFlag=Math.max(0,this.weapon.fireFlag-$.dt);
};
})();
