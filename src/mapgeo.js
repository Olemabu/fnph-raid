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
  // 2.5D Drop shadow
  c.fillStyle='rgba(0,0,0,.6)';c.fillRect(-w/2+3,-h/2+5,w,h);
  // Extruded wall depth (east and south faces)
  c.fillStyle='rgba(15,10,8,.85)';c.fillRect(-w/2,-h/2,w+2,h+3);
  // Main roof plate
  c.fillStyle=col;c.fillRect(-w/2,-h/2,w,h);
  // Rooftop perimeter border trim
  c.strokeStyle='rgba(255,235,210,.35)';c.lineWidth=1;c.strokeRect(-w/2+.5,-h/2+.5,w-1,h-1);
  c.strokeStyle='rgba(0,0,0,.5)';c.lineWidth=1;c.strokeRect(-w/2+1.5,-h/2+1.5,w-3,h-3);
  // Roof ridge line
  c.strokeStyle='rgba(255,240,220,.4)';c.beginPath();
  if(w>=h){c.moveTo(-w/2+3,0);c.lineTo(w/2-3,0);}else{c.moveTo(0,-h/2+3);c.lineTo(0,h/2-3);}
  c.stroke();
  // Rooftop HVAC / vents
  if(w>36&&h>22){
    c.fillStyle='rgba(30,38,34,.75)';c.fillRect(-w/4,-h/4,w/3,h/3);
    c.strokeStyle='rgba(255,255,255,.2)';c.strokeRect(-w/4,-h/4,w/3,h/3);
  }
  c.restore();
}
const HUTS=[[552,556,14],[530,546,8],[574,546,8],[540,574,8],[566,574,8],[552,534,7]];
const SUBURB=(()=>{const R=mulberry(7),a=[];
  for(let i=0;i<520;i++){const x=R()*MAPW,y=R()*MAPH;if(inPoly(x,y,COMPOUND))continue;
    a.push({x,y,w:8+R()*14,h:7+R()*10,rot:ROT+(R()-.5)*.1,col:['#1e1814','#221e1a','#261d18','#1c221e'][Math.floor(R()*4)],ht:.5+R()*1.1});}
  const R2=mulberry(21);
  for(let i=0;i<900;i++){const x=-420+R2()*1800,y=-360+R2()*1320;if(x>-10&&x<970&&y>-10&&y<610)continue;
    a.push({x,y,w:9+R2()*16,h:8+R2()*12,rot:ROT+(R2()-.5)*.15,col:'#1a1614',ht:.5+R2()*1.3,far:true});}
  return a;})();
const TREES=(()=>{const R=mulberry(11),a=[];
  for(let i=0;i<260;i++){const x=200+R()*700,y=40+R()*560;if(!inPoly(x,y,COMPOUND))continue;
    if(Math.hypot(x-420,y-74)<95)continue;
    if(BUILD.some(b=>Math.abs(x-b[0])<b[2]/2+6&&Math.abs(y-b[1])<b[3]/2+6))continue;
    if(SLOTS.some(s=>Math.hypot(s.x-x,s.y-y)<20)||Math.hypot(HQ.x-x,HQ.y-y)<22)continue;
    a.push({x,y,r:4+R()*6,dark:R()<.5,seed:R()});}
  return a;})();

// Pre-calculate street lamp positions along main roads
const LAMPS=(()=>{
  const pts=[];
  for(let i=0;i<ROADS_OUT.length;i++){
    const r=ROADS_OUT[i];
    for(let j=0;j<r.length-1;j++){
      const x1=r[j][0],y1=r[j][1],x2=r[j+1][0],y2=r[j+1][1],len=Math.hypot(x2-x1,y2-y1);
      const steps=Math.max(1,Math.floor(len/64));
      for(let s=1;s<=steps;s++){
        const f=s/(steps+1);
        pts.push({x:x1+(x2-x1)*f,y:y1+(y2-y1)*f,r:38,warm:true});
      }
    }
  }
  for(let i=0;i<ROADS_IN.length;i+=2){
    const r=ROADS_IN[i];
    if(r.length>1){
      const x1=r[0][0],y1=r[0][1],x2=r[1][0],y2=r[1][1];
      pts.push({x:(x1+x2)/2,y:(y1+y2)/2,r:32,warm:false});
    }
  }
  return pts;
})();

function drawMapBase(c,opt){
  opt=opt||{};
  // Midnight tactical ground
  c.fillStyle='#090d0b';c.fillRect(0,0,MAPW,MAPH);

  // Suburb district (outer city fabric)
  for(const s of SUBURB){
    if(s.far)continue;
    c.save();c.translate(s.x,s.y);c.rotate(s.rot);
    // Subtle building shadow
    c.fillStyle='rgba(0,0,0,.45)';c.fillRect(-s.w/2+1,-s.h/2+2,s.w,s.h);
    c.fillStyle=opt.ground?'#111613':s.col;c.fillRect(-s.w/2,-s.h/2,s.w,s.h);
    c.strokeStyle='rgba(255,255,255,.05)';c.lineWidth=0.5;c.strokeRect(-s.w/2,-s.h/2,s.w,s.h);
    c.restore();
  }

  // East-side suburb access street grid
  c.strokeStyle='#141b17';c.lineWidth=6;
  for(let y=60;y<620;y+=42){c.beginPath();c.moveTo(905-y*.12,y);c.lineTo(960,y+12);c.stroke();}

  // Outer highway tarmac foundations
  c.lineCap='round';c.lineJoin='round';
  for(const r of ROADS_OUT){
    c.strokeStyle='#18201a';c.lineWidth=17;line(c,r); // Gravel shoulder
    c.strokeStyle='#2a352e';c.lineWidth=11;line(c,r); // Asphalt surface
  }

  // Outer highway dashed centerlines
  c.save();c.setLineDash([7,8]);c.strokeStyle='rgba(240,210,130,.4)';c.lineWidth=1.2;
  for(const r of ROADS_OUT){line(c,r);}
  c.restore();

  // Hospital Compound Grounds (Secured perimeter)
  c.save();
  // Compound drop shadow
  c.fillStyle='rgba(0,0,0,.5)';poly(c,COMPOUND);c.fill();
  // Main compound soil/turf
  c.fillStyle='#121a15';poly(c,COMPOUND);c.fill();
  // Inner compound perimeter security fence with warning dash
  c.strokeStyle='#35483a';c.lineWidth=2.5;poly(c,COMPOUND);c.stroke();
  c.setLineDash([8,6]);c.strokeStyle='rgba(242,184,75,.45)';c.lineWidth=1.2;poly(c,COMPOUND);c.stroke();
  c.restore();

  // Sports Field (Lush pitch with mowing striping & regulation lines)
  c.save();c.translate(420,74);c.rotate(ROT*.4);
  // Pitch grass base
  c.fillStyle='#1c2617';c.fillRect(-84,-48,168,96);
  // Alternating lawn stripes
  for(let sx=-80;sx<80;sx+=16){
    c.fillStyle=((sx/16)&1)?'#22301c':'#1c2817';
    c.fillRect(sx,-44,16,88);
  }
  // Field white lines
  c.strokeStyle='rgba(235,245,230,.55)';c.lineWidth=1.2;
  c.strokeRect(-72,-38,144,76);
  // Halfway line & center circle
  c.beginPath();c.moveTo(0,-38);c.lineTo(0,38);c.stroke();
  c.beginPath();c.arc(0,0,13,0,Math.PI*2);c.stroke();
  c.beginPath();c.arc(0,0,1.5,0,Math.PI*2);c.fillStyle='rgba(235,245,230,.6)';c.fill();
  // Goal penalty areas
  c.strokeRect(-72,-20,18,40);
  c.strokeRect(54,-20,18,40);
  // Floodlight poles at 4 corners
  const floodPoles=[[-76,-42],[76,-42],[-76,42],[76,42]];
  for(const [px,py] of floodPoles){
    c.fillStyle='#4a5d50';c.beginPath();c.arc(px,py,3,0,Math.PI*2);c.fill();
    // Floodlight glow onto pitch
    const fg=c.createRadialGradient(px,py,1,px,py,32);
    fg.addColorStop(0,'rgba(210,240,255,.22)');
    fg.addColorStop(1,'rgba(210,240,255,0)');
    c.fillStyle=fg;c.beginPath();c.arc(px,py,32,0,Math.PI*2);c.fill();
  }
  c.restore();

  // Trees (Layered foliage with cast shadows)
  if(!opt.ground)for(const t of TREES){
    // Tree drop shadow
    c.fillStyle='rgba(0,0,0,.5)';c.beginPath();c.arc(t.x+2.5,t.y+3.5,t.r,0,Math.PI*2);c.fill();
    // Base dark canopy
    c.fillStyle=t.dark?'#17261a':'#1e3323';c.beginPath();c.arc(t.x,t.y,t.r,0,Math.PI*2);c.fill();
    // Highlight inner foliage cluster
    c.fillStyle=t.dark?'#213825':'#2b4a32';c.beginPath();c.arc(t.x-t.r*.25,t.y-t.r*.25,t.r*.68,0,Math.PI*2);c.fill();
    // Foliage rim highlight
    c.strokeStyle='rgba(255,255,255,.08)';c.lineWidth=0.8;c.beginPath();c.arc(t.x,t.y,t.r,0,Math.PI*2);c.stroke();
  }

  // Inner hospital roads & lanes
  for(const r of ROADS_IN){
    c.strokeStyle='#1b241e';c.lineWidth=11;line(c,r);
    c.strokeStyle=opt.ground?'#4a554e':'#2f3c34';c.lineWidth=7;line(c,r);
  }

  // Streetlamps along roadways (Warm luminous pools on tarmac)
  for(const lp of LAMPS){
    const lg=c.createRadialGradient(lp.x,lp.y,1,lp.x,lp.y,lp.r);
    lg.addColorStop(0,lp.warm?'rgba(255,215,130,.32)':'rgba(160,220,255,.25)');
    lg.addColorStop(0.4,lp.warm?'rgba(255,200,110,.12)':'rgba(130,200,255,.08)');
    lg.addColorStop(1,'rgba(0,0,0,0)');
    c.fillStyle=lg;c.beginPath();c.arc(lp.x,lp.y,lp.r,0,Math.PI*2);c.fill();
    // Bright lamp bulb center
    c.fillStyle=lp.warm?'#ffe6a8':'#d6f2ff';c.beginPath();c.arc(lp.x,lp.y,1.8,0,Math.PI*2);c.fill();
  }

  // Station Landing Pads (The 13 exam stations on the battlefield)
  for(let i=0;i<SLOTS.length;i++){
    const s=SLOTS[i];
    c.save();c.translate(s.x,s.y);
    // Tarmac pad circle
    c.fillStyle='rgba(14,20,17,.9)';c.beginPath();c.arc(0,0,26,0,Math.PI*2);c.fill();
    c.strokeStyle='rgba(242,184,75,.4)';c.lineWidth=1.5;
    c.setLineDash([5,4]);c.beginPath();c.arc(0,0,26,0,Math.PI*2);c.stroke();c.setLineDash([]);
    // Inner cross / alignment marks
    c.strokeStyle='rgba(98,230,255,.3)';c.lineWidth=1;
    c.beginPath();
    c.moveTo(-16,0);c.lineTo(-6,0);c.moveTo(6,0);c.lineTo(16,0);
    c.moveTo(0,-16);c.lineTo(0,-6);c.moveTo(0,6);c.lineTo(0,16);
    c.stroke();
    // 4 Corner Chevron Taxiway Lights
    const chevrons=[[-20,-20],[20,-20],[20,20],[-20,20]];
    for(const [cx,cy] of chevrons){
      c.fillStyle='rgba(98,230,255,.9)';c.beginPath();c.arc(cx,cy,2,0,Math.PI*2);c.fill();
      const cg=c.createRadialGradient(cx,cy,1,cx,cy,8);
      cg.addColorStop(0,'rgba(98,230,255,.5)');cg.addColorStop(1,'rgba(98,230,255,0)');
      c.fillStyle=cg;c.beginPath();c.arc(cx,cy,8,0,Math.PI*2);c.fill();
    }
    c.restore();
  }
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
