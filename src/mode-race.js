/* =====================================================================
   FNPH Raid · AMBULANCE RUN (racing stage mode)
   A pseudo-3D road. Each question is a gantry of answer lanes rushing
   towards you: steer the ambulance into the lane with the right answer.
   It plugs into the normal raid flow: when the gate is reached the chosen
   lane is passed to R.carrierDown(), exactly like shooting a gunship, so
   grading, drill mode, teaching cards and mastery all work unchanged.
   Used for stations whose deck header has "| race" (or whose topic
   mentions an emergency). See HANDOFF.md.
   ===================================================================== */
(function(){
const R=$.raid;
const LANE_COL=['#ff4fa8','#62e6ff','#ffd27a','#9dff7a'];
const Z0=1000;              // distance from spawn to the answer gantry
let cv=null,cx=null,W=0,H=0,last=0,run=null,mouseX=null,cardRects=[];

function ensureCanvas(){
  if(cv)return;
  cv=document.createElement('canvas');cv.id='cmode';
  cv.style.cssText='position:absolute;inset:0;width:100%;height:100%;z-index:2;display:none;cursor:crosshair;touch-action:none';
  document.getElementById('stage').appendChild(cv);cx=cv.getContext('2d');
  cv.addEventListener('pointermove',e=>{mouseX=e.clientX/(cv.clientWidth||1);});
  cv.addEventListener('pointerdown',e=>{
    // tapping an answer card steers to that lane (touch friendly)
    const hit=cardRects.find(q=>e.offsetX>=q.x&&e.offsetX<=q.x+q.w&&e.offsetY>=q.y&&e.offsetY<=q.y+q.h);
    if(hit&&run){run.target=laneX(hit.i,run.n);mouseX=null;return;}
    mouseX=e.clientX/(cv.clientWidth||1);});
  window.addEventListener('keydown',e=>{
    if(!run||!visible())return;
    if(e.key>='1'&&e.key<='4'){const k=+e.key-1;if(k<run.n){run.target=laneX(k,run.n);mouseX=null;}}
  });
}
function resize(){const w=cv.clientWidth|0,h=cv.clientHeight|0;if(w!==W||h!==H){W=cv.width=w;H=cv.height=h;}}
const laneX=(i,n)=>-1+(2*i+1)/n;
const laneOf=(x,n)=>Math.max(0,Math.min(n-1,Math.floor((x+1)/2*n)));
function visible(){return R.active&&R.modeName&&R.modeName()==='race'&&['fight','resolve','dead','swarmdead'].includes(R.phase);}

/* called by setupWave() for race stations */
function start(wave){
  ensureCanvas();
  const n=wave.opts.length,dur=Math.max(10,(wave.r0-60)/(wave.speed*60));
  const prev=run;
  run={n,opts:wave.opts.slice(),correct:wave.correct.slice(),z:Z0,dur,el:0,
       x:prev?prev.x:0,target:null,pos:prev?prev.pos:0,curveT:prev?prev.curveT:Math.random()*10,
       done:false,result:null,flash:0,shake:0,hx:$.hero.x,hy:$.hero.y,boost:1,speedV:prev?prev.speedV:0};
  $.enemies.length=0;$.carriers.length=0;
}
R.raceStart=start;

/* road geometry: centre-line offset grows with distance, curvature drifts over time */
function curveAt(z,run){const c=Math.sin(run.curveT*.35)*.9+Math.sin(run.curveT*.13+1)*.6;return c*Math.pow(z/Z0,2)*1.6;}

function update(dt){
  if(!run)return;
  const r=run;
  // freeze the top-down hero where it was
  $.hero.x=r.hx;$.hero.y=r.hy;$.hero.vx=0;$.hero.vy=0;
  r.flash=Math.max(0,r.flash-dt*.05);r.shake=Math.max(0,r.shake-dt*.6);
  if(r.done){r.speedV*=Math.pow(.96,dt);r.pos+=r.speedV*dt;return;}
  // steering: keys, left stick, mouse, or 1-4 auto-steer
  const k=$.keys&&$.keys.state||{};let steer=(k.right?1:0)-(k.left?1:0);
  if($.pad&&Math.abs($.pad.mx||0)>.2)steer=$.pad.mx;
  if(steer){r.target=null;mouseX=null;}
  if(mouseX!=null)r.target=Math.max(-1,Math.min(1,(mouseX-.5)*2.4));
  if(steer)r.x+=steer*.035*dt;
  else if(r.target!=null)r.x+=(r.target-r.x)*Math.min(1,.12*dt);
  r.x=Math.max(-1.05,Math.min(1.05,r.x));
  // throttle: up/W boosts (more points), down/S brakes (more reading time)
  const up=R.touchBoost||k.up||($.pad&&$.pad.my<-.5),down=R.touchBrake||k.down||($.pad&&$.pad.my>.5);
  r.boost=up?1.7:down?.45:1;
  const base=Z0/(r.dur*60);
  const live=R.phase==='fight';
  const want=live?base*r.boost:base*.25;
  r.speedV+=(want-r.speedV)*Math.min(1,.06*dt);
  r.curveT+=dt*.01*(r.speedV/base||0);
  r.pos+=r.speedV*dt;
  if(!live)return;
  r.el+=dt/60;
  r.z-=r.speedV*dt;
  if(R.wave){R.wave.t=Math.min(1,r.el/r.dur);const eta=document.getElementById('qEta');if(eta)eta.style.transform='scaleX('+(1-R.wave.t).toFixed(3)+')';}
  if(r.z<=0)choose();
}
function choose(){
  const r=run;r.done=true;
  const lane=laneOf(r.x,r.n),text=r.opts[lane],ok=r.correct.includes(text);
  r.result={lane,ok};r.flash=1;r.shake=ok?6:22;
  r.parts=[];const cxp=W/2,cyp=H*.55;for(let i=0;i<(ok?90:60);i++){const a=Math.random()*Math.PI*2,v=3+Math.random()*(ok?11:8);r.parts.push({x:cxp,y:cyp,vx:Math.cos(a)*v,vy:Math.sin(a)*v-4,l:40+Math.random()*30,s:2+Math.random()*4,c:ok?(i%3?LANE_COL[lane]:'#ffffff'):(i%2?'#ff3355':'#ffb03a')});}
  const fake={text,num:lane+1,x:$.hero.x,y:$.hero.y,alive:true,rammed:false,explode(){this.alive=false;}};
  if(R.wave)R.wave.t=Math.min(1,r.el/r.dur);
  R.carrierDown(fake);
}

/* ------------------------------ rendering ------------------------------ */
function draw(){
  const r=run;resize();const theme=R.routeTheme||(R.campaign?R.campaign.routeFor((R.rooms&&R.rooms[R.si]?R.rooms[R.si].idx:0)):{name:'Night dispatch',label:'Hospital perimeter',sky:['#05060f','#1a1036','#4a1d4f'],ground:'#0b1a10',edge:'#62e6ff'});const c=cx,hor=Math.round(H*.40),camH=1.0,focal=H*.9,n=r.n;
  const sh=r&&r.shake?(Math.random()-.5)*r.shake:0;
  c.save();c.translate(sh,sh*.6);
  if(r){const dx=r.x-(r.px==null?r.x:r.px);r.px=r.x;r.roll=(r.roll||0)*.9+dx*.9;c.translate(W/2,H*.6);c.rotate(-r.roll);c.translate(-W/2,-H*.6);}
  if(!(R.stage3d&&R.stage3d.available)){
  // sky
  let g=c.createLinearGradient(0,0,0,hor);g.addColorStop(0,theme.sky[0]);g.addColorStop(.6,theme.sky[1]);g.addColorStop(1,theme.sky[2]);
  c.fillStyle=g;c.fillRect(-20,-20,W+40,hor+20);
  for(let i=0;i<70;i++){const sx=((i*97.3)%1)*0+((i*137)%W),sy=(i*53)%(hor*.8);c.fillStyle='rgba(255,255,255,'+(.25+((i*31)%7)/12+.1*Math.sin(Date.now()/500+i))+')';c.fillRect(sx,sy,i%5?1:2,i%5?1:2);}
  const drift=r?Math.sin(r.curveT*.35)*60:0;
  // sun / moon
  c.fillStyle='rgba(255,120,160,.25)';c.beginPath();c.arc(W*.7-drift,hor*.55,H*.09,0,Math.PI*2);c.fill();
  c.fillStyle='rgba(255,170,200,.6)';c.beginPath();c.arc(W*.7-drift,hor*.55,H*.055,0,Math.PI*2);c.fill();
  // skyline (hospital blocks) with lit windows
  for(let i=0;i<26;i++){const bw=W/18,bx=((i*bw*1.13-drift*1.6)%(W+bw*2)+W+bw*2)%(W+bw*2)-bw,bh=hor*(.12+((i*37)%11)/40);
    c.fillStyle='#0d0f1f';c.fillRect(bx,hor-bh,bw*.92,bh);
    c.fillStyle='rgba(255,210,122,.35)';for(let wy=hor-bh+6;wy<hor-6;wy+=9)for(let wx=bx+4;wx<bx+bw*.85;wx+=8)if(((wx*7+wy*3+i)|0)%5===0)c.fillRect(wx,wy,3,4);}
  // ground
  c.fillStyle=theme.ground;c.fillRect(-20,hor,W+40,H-hor+20);
  if(!r){c.restore();return;}
  // road by scanlines (perspective: screen offset and width both scale with ZR/z)
  const pos=r.pos,ZR=10,span=H-hor;
  const proj=(lx,z)=>{const sc=ZR/z,half=W*.6*sc;return{x:W/2+(curveAt(z,r)-r.x+lx)*half,y:hor+span*sc,half};};
  for(let y=hor+1;y<H+2;y+=2){
    const sc=(y-hor)/span,z=ZR/sc;if(z>Z0*1.6)continue;
    const half=W*.6*sc,cxs=W/2+(curveAt(z,r)-r.x)*half;
    const stripe=Math.floor((z+pos)/40)%2===0;
    c.fillStyle=theme.ground;c.fillRect(0,y,W,2);
    c.fillStyle=stripe?theme.edge:'#17252e';c.fillRect(cxs-half*1.12,y,half*2.24,2);
    c.fillStyle=theme.wet?(stripe?'#213242':'#192a38'):(stripe?'#303943':'#28313b');c.fillRect(cxs-half,y,half*2,2);
    if(stripe){c.fillStyle='rgba(255,255,255,.75)';for(let l=1;l<n;l++){const lx=cxs-half+half*2*l/n;c.fillRect(lx-Math.max(1,half*.012),y,Math.max(2,half*.024),2);}}
  }
  // roadside scenery: hospital blocks and trees, drawn far to near
  const deco=[];
  for(let k=0;k<18;k++){const z=((k*70-pos*.98)%1260+1260)%1260+25;deco.push({z,k});}
  deco.sort((a,b)=>b.z-a.z).forEach(({z,k})=>{
    for(const side of[-1,1]){
      if((k+(side>0?1:0))%3===0){const p=proj(side*(2.6+(k%2)*.4),z);if(p.y<hor||p.y>H+40)continue;const bw=p.half*1.1,bh=p.half*(1+(k%3)*.35);const bx=p.x-bw/2;
        c.fillStyle='#161a2c';c.fillRect(bx,p.y-bh,bw,bh);c.fillStyle='#1f2440';c.fillRect(bx+(side<0?bw*.85:0),p.y-bh,bw*.15,bh);
        if(bw>8){c.fillStyle='rgba(255,214,140,.55)';const ww=Math.max(1,bw*.08),wh=Math.max(1,bh*.06);for(let wy=0;wy<5;wy++)for(let wx=0;wx<5;wx++)if((wx*3+wy*7+k)%4)c.fillRect(bx+bw*.1+wx*bw*.17,p.y-bh+bh*.12+wy*bh*.17,ww,wh);}
        if(k%6===0&&bw>14){c.fillStyle='#d01f3c';c.fillRect(p.x-bw*.12,p.y-bh*1.08,bw*.24,bw*.1);}
      }else{const p=proj(side*(1.9+(k%3)*.25),z);if(p.y<hor||p.y>H+40)continue;const tr=p.half*.32;
        c.fillStyle='#2a1c12';c.fillRect(p.x-tr*.1,p.y-tr*1.3,tr*.2,tr*1.3);
        c.fillStyle='#0f3b22';c.beginPath();c.arc(p.x,p.y-tr*1.5,tr*.9,0,Math.PI*2);c.fill();
        c.fillStyle='#16502e';c.beginPath();c.arc(p.x-tr*.25,p.y-tr*1.75,tr*.6,0,Math.PI*2);c.fill();}
    }});
  // roadside lamps and hospital signs
  for(let k=0;k<14;k++){const z=((k*90-pos)%1260+1260)%1260+30;
    for(const side of[-1,1]){const p=proj(side*1.45,z);if(p.y>H||p.y<hor)continue;const hgt=p.half*.9;
      c.fillStyle='#2b2f3a';c.fillRect(p.x-p.half*.02,p.y-hgt,Math.max(1,p.half*.04),hgt);
      c.fillStyle='rgba(255,220,150,.9)';c.beginPath();c.arc(p.x,p.y-hgt,Math.max(1.5,p.half*.05),0,Math.PI*2);c.fill();
      if(k%4===0&&side===1){c.fillStyle='#d01f3c';const sw=p.half*.35;c.fillRect(p.x-sw/2,p.y-hgt*1.25,sw,sw*.55);c.fillStyle='#fff';c.fillRect(p.x-sw*.06,p.y-hgt*1.25+sw*.08,sw*.12,sw*.4);c.fillRect(p.x-sw*.2,p.y-hgt*1.25+sw*.22,sw*.4,sw*.12);}}}
  // Moving lamp standards, luminous lane-edge reflections and underpass ribs.
  for(let k=10;k>=0;k--){
    const z=((k*105-pos)%1150+1150)%1150+18;
    const l=proj(-1.28,z),rr=proj(1.28,z),height=l.half*1.35;
    if(theme.tunnel){
      c.strokeStyle='#02080ed9';c.lineWidth=Math.max(3,l.half*.14);c.beginPath();c.moveTo(l.x,l.y);c.lineTo(l.x,l.y-height*.6);c.bezierCurveTo(l.x,l.y-height*1.6,rr.x,rr.y-height*1.6,rr.x,rr.y-height*.6);c.lineTo(rr.x,rr.y);c.stroke();
      c.strokeStyle=theme.edge+'55';c.lineWidth=Math.max(1,l.half*.015);c.beginPath();c.moveTo(l.x+l.half*.08,l.y-height*.3);c.bezierCurveTo(l.x,l.y-height*1.5,rr.x,rr.y-height*1.5,rr.x-l.half*.08,rr.y-height*.3);c.stroke();
    }else for(const side of [-1,1]){
      const p=side<0?l:rr;c.strokeStyle='#b0cbd466';c.lineWidth=Math.max(1,p.half*.016);c.beginPath();c.moveTo(p.x,p.y);c.lineTo(p.x,p.y-height);c.lineTo(p.x-side*p.half*.22,p.y-height);c.stroke();
      c.fillStyle='#e7e7c9';c.fillRect(p.x-side*p.half*.22-2,p.y-height-2,Math.max(2,p.half*.12),Math.max(1,p.half*.025));
      if(theme.wet){c.globalAlpha=.1;c.fillStyle=theme.edge;c.fillRect(p.x-side*p.half*.18,p.y,Math.max(1,p.half*.04),Math.min(H-p.y,p.half*.8));c.globalAlpha=1;}
    }
  }
  // Roadside traffic stays outside the answer lanes; it never changes grading.
  for(let k=0;k<5;k++){
    const z=((k*223-pos*.64)%1200+1200)%1200+35,p=proj(k%2?-1.75:1.75,z),bw=p.half*.32,bh=bw*.65;
    if(bw<2)continue;c.fillStyle=k%2?'#34526a':'#ac8b6a';c.fillRect(p.x-bw/2,p.y-bh,bw,bh);c.fillStyle='#101e2e';c.fillRect(p.x-bw*.35,p.y-bh*.85,bw*.7,bh*.4);c.fillStyle=k%2?'#ee7668':'#ffe8b5';c.fillRect(p.x-bw*.43,p.y-bh*.2,bw*.18,bh*.1);c.fillRect(p.x+bw*.25,p.y-bh*.2,bw*.18,bh*.1);
  }
  // answer gantry
  if(r.z>0){
    const zz=Math.max(8,15+r.z*.4),pl=proj(-1.1,zz),pr=proj(1.1,zz),gh=pl.half*1.15;
    c.fillStyle='#3a3f4c';c.fillRect(pl.x-pl.half*.04,pl.y-gh,pl.half*.08,gh);c.fillRect(pr.x-pr.half*.04,pr.y-gh,pr.half*.08,gh);
    c.fillRect(pl.x,pl.y-gh,pr.x-pl.x,Math.max(2,gh*.06));
    for(let i=0;i<n;i++){const a=proj(laneX(i,n)-1/n+.04,zz),b=proj(laneX(i,n)+1/n-.04,zz),pw=b.x-a.x,ph=gh*.42,py=a.y-gh+gh*.07;
      c.fillStyle=LANE_COL[i];c.globalAlpha=.9;c.fillRect(a.x,py,pw,ph);c.globalAlpha=1;
      c.strokeStyle='#fff';c.lineWidth=Math.max(1,pw*.02);c.strokeRect(a.x,py,pw,ph);
      c.fillStyle='#060a10';c.font='800 '+Math.max(8,ph*.7|0)+'px "Chakra Petch", sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(String(i+1),a.x+pw/2,py+ph/2+1);
      // lane floor glow leading to the gate
      const f=proj(laneX(i,n),zz);c.fillStyle=LANE_COL[i];c.globalAlpha=.18;c.fillRect(a.x,f.y-2,pw,4);c.globalAlpha=1;}
    c.textAlign='left';c.textBaseline='alphabetic';
  }
  // headlight wash on the road ahead
  {const hg=c.createRadialGradient(W/2,H*.72,10,W/2,H*.62,W*.35);hg.addColorStop(0,'rgba(255,245,200,.16)');hg.addColorStop(1,'rgba(255,245,200,0)');c.fillStyle=hg;c.beginPath();c.moveTo(W/2-W*.06,H*.8);c.lineTo(W/2-W*.3,hor+span*.12);c.lineTo(W/2+W*.3,hor+span*.12);c.lineTo(W/2+W*.06,H*.8);c.closePath();c.fill();}
  // speed streaks when boosting
  if(R.phase==='fight'&&r.boost>1.2){c.strokeStyle='rgba(255,255,255,.18)';c.lineWidth=2;for(let i=0;i<22;i++){const a=(i*2.399+Date.now()/90)%(Math.PI*2),r0=W*.18+((Date.now()/3+i*97)%(W*.4));c.beginPath();c.moveTo(W/2+Math.cos(a)*r0,hor+Math.sin(a)*r0*.5);c.lineTo(W/2+Math.cos(a)*(r0+60),hor+Math.sin(a)*(r0+60)*.5);c.stroke();}}
  // burst when passing the gantry
  if(r.parts){r.parts=r.parts.filter(q=>(q.l-=1)>0);r.parts.forEach(q=>{q.x+=q.vx;q.y+=q.vy;q.vy+=.25;c.globalAlpha=Math.min(1,q.l/30);c.fillStyle=q.c;c.fillRect(q.x,q.y,q.s,q.s);});c.globalAlpha=1;}
  if(theme.wet){c.strokeStyle='#d5edff33';c.lineWidth=1;const tm=Date.now()/16;for(let k=0;k<65;k++){const x=(k*157.7+tm*1.3)%W,y=(k*79.1+tm*4)%H;c.beginPath();c.moveTo(x,y);c.lineTo(x-5,y+15);c.stroke();}}
  }else{R.stage3d.race(c,W,H,r,theme);}
  // Cinematic route identity and progress to the destination.
  c.fillStyle='#06101dd9';c.fillRect(16,hor-56,Math.min(310,W*.43),48);c.fillStyle=theme.edge;c.font='600 10px "JetBrains Mono", monospace';c.fillText(theme.label.toUpperCase(),28,hor-37);c.fillStyle='#eef5ec';c.font='600 15px "Chakra Petch", sans-serif';c.fillText(theme.name,28,hor-16);
  const progress=R.total?Math.min(1,(R.cleared+(R.wave?R.wave.t:0))/R.total):0;c.fillStyle='#a4c7c733';c.fillRect(16,hor-6,Math.min(310,W*.43),2);c.fillStyle=theme.edge;c.fillRect(16,hor-6,Math.min(310,W*.43)*progress,2);
  // ambulance (rear view)
  const lane=laneOf(r.x,n),tilt=(r.target!=null?(r.target-r.x):0)*.25+((($.keys&&$.keys.state.right)?1:0)-(($.keys&&$.keys.state.left)?1:0))*.06;
  const narrow=W<700,cols=narrow?2:n,rows=Math.ceil(n/cols),cardH=narrow?74:Math.max(86,H*.13-10),cardsTop=H-rows*(cardH+10)-10*(narrow?1:0)-(narrow?0:0),cw=Math.min(W*.15,180),chh=cw*.78,ax=W/2,ay=cardsTop-chh*.95;
  if(!(R.stage3d&&R.stage3d.available)){
  c.save();c.translate(ax,ay);c.rotate(tilt);
  c.fillStyle='rgba(0,0,0,.45)';c.beginPath();c.ellipse(0,chh*.52,cw*.62,chh*.12,0,0,Math.PI*2);c.fill();
  c.fillStyle='#111';c.fillRect(-cw*.48,chh*.30,cw*.18,chh*.22);c.fillRect(cw*.30,chh*.30,cw*.18,chh*.22);
  const body=c.createLinearGradient(-cw/2,0,cw/2,0);body.addColorStop(0,'#8ca4af');body.addColorStop(.12,'#edf0e8');body.addColorStop(.7,'#d5dfdf');body.addColorStop(1,'#718c9f');c.fillStyle=body;c.fillRect(-cw/2,-chh*.5,cw,chh*.86);c.strokeStyle='#e5efff';c.lineWidth=1;c.strokeRect(-cw/2,-chh*.5,cw,chh*.86);
  c.fillStyle='#d01f3c';c.fillRect(-cw/2,chh*.02,cw,chh*.1);
  c.fillStyle='#1c2a3a';c.fillRect(-cw*.36,-chh*.40,cw*.3,chh*.28);c.fillRect(cw*.06,-chh*.40,cw*.3,chh*.28);
  c.fillStyle='#d01f3c';c.fillRect(-cw*.05,-chh*.36,cw*.1,chh*.22);c.fillRect(-cw*.11,-chh*.3,cw*.22,chh*.09);
  c.strokeStyle='#bad2e177';c.lineWidth=1;c.beginPath();c.moveTo(0,-chh*.46);c.lineTo(0,chh*.3);c.moveTo(-cw*.36,-chh*.39);c.lineTo(-cw*.09,-chh*.18);c.moveTo(cw*.07,-chh*.39);c.lineTo(cw*.34,-chh*.18);c.stroke();
  const blink=(Date.now()/180|0)%2;
  c.fillStyle=blink?'#2f7bff':'#ff2a3d';c.fillRect(-cw*.42,-chh*.62,cw*.3,chh*.12);
  c.fillStyle=blink?'#ff2a3d':'#2f7bff';c.fillRect(cw*.12,-chh*.62,cw*.3,chh*.12);
  c.globalAlpha=.18;c.fillStyle=blink?'#2f7bff':'#ff2a3d';c.beginPath();c.ellipse(blink?-cw*.27:cw*.27,-chh*.56,cw*.32,chh*.16,0,0,Math.PI*2);c.fill();c.globalAlpha=1;
  c.fillStyle=r.boost>1.2?'#ffb03a':'#ff4040';c.fillRect(-cw*.48,chh*.14,cw*.12,chh*.08);c.fillRect(cw*.36,chh*.14,cw*.12,chh*.08);
  c.fillStyle='#0b0e14';c.font='800 '+(cw*.09|0)+'px "Chakra Petch", sans-serif';c.textAlign='center';c.fillText('FNPH',0,chh*.3);
  c.restore();
  }
  // lane marker under the ambulance
  c.fillStyle=LANE_COL[lane];c.font='800 14px "Chakra Petch", sans-serif';c.textAlign='center';c.fillText('LANE '+(lane+1),ax,ay-chh*.75);
  // answer cards along the bottom, in lane order
  cardRects=[];
  {
    const pad=10,cwid=(W-pad*(cols+1))/cols;
    for(let i=0;i<n;i++){const col=i%cols,row=Math.floor(i/cols),x=pad+col*(cwid+pad),top=cardsTop+row*(cardH+pad),on=i===lane,res=r.result&&r.result.lane===i;
      cardRects.push({i,x,y:top,w:cwid,h:cardH});
      c.fillStyle=on?'rgba(20,24,36,.95)':'rgba(8,10,18,.82)';c.fillRect(x,top,cwid,cardH);
      c.strokeStyle=res?(r.result.ok?'#9dff7a':'#ff3355'):LANE_COL[i];c.lineWidth=on||res?3:1.5;c.strokeRect(x+1,top+1,cwid-2,cardH-2);
      c.fillStyle=LANE_COL[i];c.beginPath();c.arc(x+18,top+18,12,0,Math.PI*2);c.fill();
      c.fillStyle='#060a10';c.font='800 14px "Chakra Petch", sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(String(i+1),x+18,top+19);
      c.textAlign='left';c.textBaseline='alphabetic';c.fillStyle='#eef2ff';
      wrapText(c,R.optionLabel(r.opts[i]),x+36,top+22,cwid-44,cardH-20);}
  }
  // speed / hint strip
  c.fillStyle='rgba(255,255,255,.7)';c.font='600 12px "JetBrains Mono", monospace';c.textAlign='left';
  c.fillText(W<1100?'←/→ steer · 1-4 lane · ↑ boost · ↓ brake':'←/→ or stick steer · 1-4 jump lane · ↑ boost (more points) · ↓ brake (more reading time)',14,cardsTop-10);
  c.textAlign='left';
  // result flash
  if(r.flash>0&&r.result){c.fillStyle=r.result.ok?'rgba(98,255,160,'+(r.flash*.35)+')':'rgba(255,30,60,'+(r.flash*.5)+')';c.fillRect(-20,-20,W+40,H+40);}
  c.restore();
}
function wrapText(c,t,x,y,w,maxH){
  let fs=17;
  for(;fs>=11;fs--){c.font='600 '+fs+'px "Chakra Petch", sans-serif';if(lines(c,t,w).length*(fs+3)<=maxH)break;}
  const L=lines(c,t,w);L.forEach((l,i)=>{if((i+1)*(fs+3)<=maxH+fs)c.fillText(l,x,y+i*(fs+3)+4);});
}
function lines(c,t,w){const out=[];let cur='';String(t).split(/\s+/).forEach(word=>{const tst=cur?cur+' '+word:word;if(c.measureText(tst).width>w&&cur){out.push(cur);cur=word;}else cur=tst;});if(cur)out.push(cur);return out;}

let lastDraw=0;
function loop(now){
  requestAnimationFrame(loop);
  if(now-lastDraw<30)return;lastDraw=now;
  const dt=Math.min(3,(now-(last||now))/16.667);last=now;
  if(!cv)return;
  const vis=visible();
  cv.style.display=vis?'block':'none';
  const keys=document.querySelector('#play .keys');if(keys)keys.style.visibility=(vis||(R.modeName&&R.modeName()&&R.phase!=='travel'))?'hidden':'';
  if(!vis){if(run&&!R.active)run=null;return;}
  const paused=R.paused||$.state!=='play'||!document.getElementById('cardWrap').hidden;
  if(!paused)update(dt*(R.answerSplash?.18:1));
  draw();
}
ensureCanvas();requestAnimationFrame(loop);
})();
