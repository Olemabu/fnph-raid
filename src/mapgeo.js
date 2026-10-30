const MAPW=960,MAPH=600,ROT=0.19;
const SLOTS=[
  {x:852,y:452},{x:774,y:490},{x:756,y:340},{x:826,y:252},{x:654,y:138},
  {x:564,y:104},{x:420,y:74},{x:402,y:206},{x:528,y:342},{x:552,y:556},
  {x:462,y:412},{x:546,y:182},{x:720,y:552}
];
const HQ={x:560,y:262};
const ROADS_OUT=[
  [[238,0],[228,72],[180,600]],
  [[922,0],[912,48],[840,600]],
  [[0,150],[228,100],[240,60]],
  [[240,60],[520,62],[922,40]]
];
const ROADS_IN=[
  [[228,330],[468,360],[540,378],[690,412],[768,428],[852,452],[878,456]],
  [[522,66],[708,102],[702,180],[894,220]],
  [[522,66],[468,360]],
  [[492,222],[720,264]],
  [[738,190],[690,412]],
  [[544,378],[510,516],[624,528],[636,402]],
  [[768,428],[732,600]],
  [[342,346],[312,468]],
  [[300,256],[480,292]]
];
const BUILD=[
  // cx,cy,w,h,colour,kind
  [564,104,72,48,'#a35a2c','u'],[654,138,72,60,'#9c6a64','quad'],[546,182,66,58,'#94693e','quad'],
  [402,206,72,60,'#9c5130','quad'],[642,206,84,22,'#80766a'],[342,288,72,22,'#8a3822'],
  [516,286,24,26,'#a35a2c'],[528,342,66,26,'#8a3822'],[636,368,72,24,'#a35a2c'],
  [756,340,84,48,'#9c6a64'],[816,300,24,48,'#a35a2c'],[828,246,48,22,'#a35a2c'],
  [756,222,30,22,'#9c6a64'],[462,412,102,36,'#8a3822'],[576,442,32,22,'#8f6c52'],
  [246,362,30,22,'#a35a2c'],[720,552,30,40,'#9c6a64'],[774,566,40,24,'#8a3822'],
  [300,170,40,26,'#7d6a58'],[650,470,40,26,'#7d6a58']
];
const COMPOUND=[[244,34],[918,52],[850,600],[196,600]];

function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function inPoly(x,y,p){let c=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const xi=p[i][0],yi=p[i][1],xj=p[j][0],yj=p[j][1];if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi))c=!c;}return c;}

function roofRect(c,x,y,w,h,col){
  c.save();c.translate(x,y);c.rotate(ROT);
  c.fillStyle=col;c.fillRect(-w/2,-h/2,w,h);
  c.strokeStyle='rgba(0,0,0,.45)';c.lineWidth=1;c.strokeRect(-w/2+.5,-h/2+.5,w-1,h-1);
  c.strokeStyle='rgba(255,230,200,.18)';c.beginPath();
  if(w>=h){c.moveTo(-w/2+3,0);c.lineTo(w/2-3,0);}else{c.moveTo(0,-h/2+3);c.lineTo(0,h/2-3);}
  c.stroke();c.restore();
}
const HUTS=[[552,556,14],[530,546,8],[574,546,8],[540,574,8],[566,574,8],[552,534,7]];
const SUBURB=(()=>{const R=mulberry(7),a=[];
  for(let i=0;i<520;i++){const x=R()*MAPW,y=R()*MAPH;if(inPoly(x,y,COMPOUND))continue;
    a.push({x,y,w:8+R()*14,h:7+R()*10,rot:ROT+(R()-.5)*.1,col:['#2a2420','#2e2b26','#33261f','#242a26'][Math.floor(R()*4)],ht:.5+R()*1.1});}
  const R2=mulberry(21);
  for(let i=0;i<900;i++){const x=-420+R2()*1800,y=-360+R2()*1320;if(x>-10&&x<970&&y>-10&&y<610)continue;
    a.push({x,y,w:9+R2()*16,h:8+R2()*12,rot:ROT+(R2()-.5)*.15,col:'#2a2420',ht:.5+R2()*1.3,far:true});}
  return a;})();
const TREES=(()=>{const R=mulberry(11),a=[];
  for(let i=0;i<260;i++){const x=200+R()*700,y=40+R()*560;if(!inPoly(x,y,COMPOUND))continue;
    if(Math.hypot(x-420,y-74)<95)continue;
    if(BUILD.some(b=>Math.abs(x-b[0])<b[2]/2+6&&Math.abs(y-b[1])<b[3]/2+6))continue;
    if(SLOTS.some(s=>Math.hypot(s.x-x,s.y-y)<20)||Math.hypot(HQ.x-x,HQ.y-y)<22)continue;
    a.push({x,y,r:3+R()*6,dark:R()<.5});}
  return a;})();
function drawMapBase(c,opt){
  opt=opt||{};
  c.fillStyle='#0f1512';c.fillRect(0,0,MAPW,MAPH);
  // suburbs
  for(const s of SUBURB){if(s.far)continue;c.save();c.translate(s.x,s.y);c.rotate(s.rot);c.fillStyle=opt.ground?'#151a17':s.col;c.fillRect(-s.w/2,-s.h/2,s.w,s.h);c.restore();}
  // east-side street grid
  c.strokeStyle='#1d2420';c.lineWidth=5;
  for(let y=60;y<620;y+=42){c.beginPath();c.moveTo(905-y*.12,y);c.lineTo(960,y+12);c.stroke();}
  // outer roads
  c.lineCap='round';c.lineJoin='round';
  for(const r of ROADS_OUT){c.strokeStyle='#28302b';c.lineWidth=13;line(c,r);c.strokeStyle='#323c36';c.lineWidth=9;line(c,r);}
  // compound ground
  c.fillStyle='#16201a';poly(c,COMPOUND);c.fill();
  c.strokeStyle='#3d4d40';c.lineWidth=2;c.setLineDash([6,4]);poly(c,COMPOUND);c.stroke();c.setLineDash([]);
  // sports field
  c.save();c.translate(420,74);c.rotate(ROT*.4);
  c.fillStyle=opt.ground?'#3f4a2a':'#3a3426';c.fillRect(-82,-46,164,92);
  c.strokeStyle='rgba(240,230,200,.3)';c.lineWidth=1.2;c.strokeRect(-70,-36,140,72);
  c.beginPath();c.moveTo(0,-36);c.lineTo(0,36);c.stroke();c.beginPath();c.arc(0,0,12,0,Math.PI*2);c.stroke();c.restore();
  // trees
  if(!opt.ground)for(const t of TREES){c.fillStyle=t.dark?'#1f3324':'#243b29';c.beginPath();c.arc(t.x,t.y,t.r,0,Math.PI*2);c.fill();}
  // inner roads
  for(const r of ROADS_IN){c.strokeStyle='#26302a';c.lineWidth=9;line(c,r);c.strokeStyle=opt.ground?'#4a554e':'#38443d';c.lineWidth=6;line(c,r);}
  // buildings (footprint shadows only on the 3D ground)
  for(const b of BUILD){
    const [x,y,w,h,col,k]=b;
    if(opt.ground){c.save();c.translate(x,y);c.rotate(ROT);c.fillStyle='#0e1310';c.fillRect(-w/2-2,-h/2-2,w+4,h+4);c.restore();continue;}
    if(k==='quad'){
      roofRect(c,x,y,w,h,col);
      c.save();c.translate(x,y);c.rotate(ROT);c.fillStyle='#1d2a20';c.fillRect(-w/2+12,-h/2+12,w-24,h-24);c.restore();
    }else if(k==='u'){
      c.save();c.translate(x,y);c.rotate(ROT);c.translate(-x,-y);
      roofRect(c,x,y-h/2+8,w,16,col);c.restore();
      c.save();c.translate(x,y);c.rotate(ROT);
      c.fillStyle=col;c.fillRect(-w/2,-h/2+8,14,h-8);c.fillRect(w/2-14,-h/2+8,14,h-8);
      c.strokeStyle='rgba(0,0,0,.45)';c.strokeRect(-w/2,-h/2,w,h);c.restore();
    }else roofRect(c,x,y,w,h,col);
  }
  // car park
  c.save();c.translate(774,490);c.rotate(ROT);c.fillStyle='#252c2f';c.fillRect(-36,-32,72,64);
  c.strokeStyle='rgba(230,230,210,.3)';c.lineWidth=1;
  for(let i=-30;i<=30;i+=8){c.beginPath();c.moveTo(i,-30);c.lineTo(i,-14);c.stroke();c.beginPath();c.moveTo(i,14);c.lineTo(i,30);c.stroke();}
  c.restore();
  // round huts
  if(!opt.ground)for(const [x,y,r] of HUTS){c.fillStyle='#8f5a34';c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();c.strokeStyle='rgba(0,0,0,.4)';c.stroke();
    c.strokeStyle='rgba(255,220,180,.2)';c.beginPath();c.arc(x,y,r*.45,0,Math.PI*2);c.stroke();}
  // labels
  c.fillStyle='rgba(200,215,200,.45)';c.font='600 10px "JetBrains Mono", monospace';
  c.save();c.translate(870,250);c.rotate(Math.PI/2-.13);c.fillText('ZAIRE RD',0,0);c.restore();
  c.save();c.translate(196,300);c.rotate(Math.PI/2+.09);c.fillText('ANGOLA RD',0,0);c.restore();
  c.fillText('ANGOLA RD',560,36);
  // north arrow + scale
  c.save();c.translate(36,40);c.strokeStyle='rgba(242,184,75,.7)';c.fillStyle='rgba(242,184,75,.7)';c.lineWidth=1.5;
  c.beginPath();c.moveTo(0,12);c.lineTo(0,-12);c.stroke();c.beginPath();c.moveTo(0,-16);c.lineTo(-5,-6);c.lineTo(5,-6);c.closePath();c.fill();
  c.font='700 11px "Chakra Petch", sans-serif';c.fillText('N',-4,28);c.restore();
  c.fillStyle='rgba(200,215,200,.6)';c.fillRect(24,MAPH-22,60,2);c.font='10px "JetBrains Mono", monospace';c.fillText('50 m',36,MAPH-28);
}
function line(c,pts){c.beginPath();c.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)c.lineTo(pts[i][0],pts[i][1]);c.stroke();}
function poly(c,pts){c.beginPath();c.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)c.lineTo(pts[i][0],pts[i][1]);c.closePath();}
