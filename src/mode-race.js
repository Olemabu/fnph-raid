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
function visible(){return R.active&&R.modeName&&R.modeName()==='race'&&['recall','fight','resolve','dead','swarmdead'].includes(R.phase);}

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
  const up=k.up||($.pad&&$.pad.my<-.5),down=k.down||($.pad&&$.pad.my>.5);
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
  const fake={text,num:lane+1,x:$.hero.x,y:$.hero.y,alive:true,rammed:false,explode(){this.alive=false;}};
  if(R.wave)R.wave.t=Math.min(1,r.el/r.dur);
  R.carrierDown(fake);
}

/* ------------------------------ rendering ------------------------------ */
function draw(){
  const r=run;resize();const c=cx,hor=Math.round(H*.40),camH=1.0,focal=H*.9;
  const sh=r&&r.shake?(Math.random()-.5)*r.shake:0;
  c.save();c.translate(sh,sh*.6);
  // sky
  let g=c.createLinearGradient(0,0,0,hor);g.addColorStop(0,'#05060f');g.addColorStop(.6,'#1a1036');g.addColorStop(1,'#4a1d4f');
  c.fillStyle=g;c.fillRect(-20,-20,W+40,hor+20);
  const drift=r?Math.sin(r.curveT*.35)*60:0;
  // sun / moon
  c.fillStyle='rgba(255,120,160,.25)';c.beginPath();c.arc(W*.7-drift,hor*.55,H*.09,0,Math.PI*2);c.fill();
  c.fillStyle='rgba(255,170,200,.6)';c.beginPath();c.arc(W*.7-drift,hor*.55,H*.055,0,Math.PI*2);c.fill();
  // skyline (hospital blocks) with lit windows
  for(let i=0;i<26;i++){const bw=W/18,bx=((i*bw*1.13-drift*1.6)%(W+bw*2)+W+bw*2)%(W+bw*2)-bw,bh=hor*(.12+((i*37)%11)/40);
    c.fillStyle='#0d0f1f';c.fillRect(bx,hor-bh,bw*.92,bh);
    c.fillStyle='rgba(255,210,122,.35)';for(let wy=hor-bh+6;wy<hor-6;wy+=9)for(let wx=bx+4;wx<bx+bw*.85;wx+=8)if(((wx*7+wy*3+i)|0)%5===0)c.fillRect(wx,wy,3,4);}
  // ground
  c.fillStyle='#0b1a10';c.fillRect(-20,hor,W+40,H-hor+20);
  if(!r){c.restore();return;}
  // road by scanlines (perspective: screen offset and width both scale with ZR/z)
  const pos=r.pos,n=r.n,ZR=10,span=H-hor;
  const proj=(lx,z)=>{const sc=ZR/z,half=W*.6*sc;return{x:W/2+(curveAt(z,r)-r.x+lx)*half,y:hor+span*sc,half};};
  for(let y=hor+1;y<H+2;y+=2){
    const sc=(y-hor)/span,z=ZR/sc;if(z>Z0*1.6)continue;
    const half=W*.6*sc,cxs=W/2+(curveAt(z,r)-r.x)*half;
    const stripe=Math.floor((z+pos)/40)%2===0;
    c.fillStyle=stripe?'#0f2416':'#0b1a10';c.fillRect(0,y,W,2);
    c.fillStyle=stripe?'#e8e8e8':'#d03030';c.fillRect(cxs-half*1.12,y,half*2.24,2);
    c.fillStyle=stripe?'#2a2d36':'#25272f';c.fillRect(cxs-half,y,half*2,2);
    if(stripe){c.fillStyle='rgba(255,255,255,.75)';for(let l=1;l<n;l++){const lx=cxs-half+half*2*l/n;c.fillRect(lx-Math.max(1,half*.012),y,Math.max(2,half*.024),2);}}
  }
  // roadside lamps and hospital signs
  for(let k=0;k<14;k++){const z=((k*90-pos)%1260+1260)%1260+30;
    for(const side of[-1,1]){const p=proj(side*1.45,z);if(p.y>H||p.y<hor)continue;const hgt=p.half*.9;
      c.fillStyle='#2b2f3a';c.fillRect(p.x-p.half*.02,p.y-hgt,Math.max(1,p.half*.04),hgt);
      c.fillStyle='rgba(255,220,150,.9)';c.beginPath();c.arc(p.x,p.y-hgt,Math.max(1.5,p.half*.05),0,Math.PI*2);c.fill();
      if(k%4===0&&side===1){c.fillStyle='#d01f3c';const sw=p.half*.35;c.fillRect(p.x-sw/2,p.y-hgt*1.25,sw,sw*.55);c.fillStyle='#fff';c.fillRect(p.x-sw*.06,p.y-hgt*1.25+sw*.08,sw*.12,sw*.4);c.fillRect(p.x-sw*.2,p.y-hgt*1.25+sw*.22,sw*.4,sw*.12);}}}
  // answer gantry
  if(R.phase!=='recall'&&r.z>0){
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
  // ambulance (rear view)
  const lane=laneOf(r.x,n),tilt=(r.target!=null?(r.target-r.x):0)*.25+((($.keys&&$.keys.state.right)?1:0)-(($.keys&&$.keys.state.left)?1:0))*.06;
  const narrow=W<700,cols=narrow?2:n,rows=Math.ceil(n/cols),cardH=narrow?74:Math.max(86,H*.13-10),cardsTop=H-rows*(cardH+10)-10*(narrow?1:0)-(narrow?0:0),cw=Math.min(W*.15,180),chh=cw*.78,ax=W/2,ay=cardsTop-chh*.95;
  c.save();c.translate(ax,ay);c.rotate(tilt);
  c.fillStyle='rgba(0,0,0,.45)';c.beginPath();c.ellipse(0,chh*.52,cw*.62,chh*.12,0,0,Math.PI*2);c.fill();
  c.fillStyle='#111';c.fillRect(-cw*.48,chh*.30,cw*.18,chh*.22);c.fillRect(cw*.30,chh*.30,cw*.18,chh*.22);
  c.fillStyle='#f2f4f8';c.fillRect(-cw/2,-chh*.5,cw,chh*.86);
  c.fillStyle='#d01f3c';c.fillRect(-cw/2,chh*.02,cw,chh*.1);
  c.fillStyle='#1c2a3a';c.fillRect(-cw*.36,-chh*.40,cw*.3,chh*.28);c.fillRect(cw*.06,-chh*.40,cw*.3,chh*.28);
  c.fillStyle='#d01f3c';c.fillRect(-cw*.05,-chh*.36,cw*.1,chh*.22);c.fillRect(-cw*.11,-chh*.3,cw*.22,chh*.09);
  const blink=(Date.now()/120|0)%2;
  c.fillStyle=blink?'#2f7bff':'#ff2a3d';c.fillRect(-cw*.42,-chh*.62,cw*.3,chh*.12);
  c.fillStyle=blink?'#ff2a3d':'#2f7bff';c.fillRect(cw*.12,-chh*.62,cw*.3,chh*.12);
  c.globalAlpha=.18;c.fillStyle=blink?'#2f7bff':'#ff2a3d';c.beginPath();c.ellipse(blink?-cw*.27:cw*.27,-chh*.56,cw*.32,chh*.16,0,0,Math.PI*2);c.fill();c.globalAlpha=1;
  c.fillStyle=r.boost>1.2?'#ffb03a':'#ff4040';c.fillRect(-cw*.48,chh*.14,cw*.12,chh*.08);c.fillRect(cw*.36,chh*.14,cw*.12,chh*.08);
  c.fillStyle='#0b0e14';c.font='800 '+(cw*.09|0)+'px "Chakra Petch", sans-serif';c.textAlign='center';c.fillText('FNPH',0,chh*.3);
  c.restore();
  // lane marker under the ambulance
  c.fillStyle=LANE_COL[lane];c.font='800 14px "Chakra Petch", sans-serif';c.textAlign='center';c.fillText('LANE '+(lane+1),ax,ay-chh*.75);
  // answer cards along the bottom, in lane order
  cardRects=[];
  if(R.phase!=='recall'){
    const pad=10,cwid=(W-pad*(cols+1))/cols;
    for(let i=0;i<n;i++){const col=i%cols,row=Math.floor(i/cols),x=pad+col*(cwid+pad),top=cardsTop+row*(cardH+pad),on=i===lane,res=r.result&&r.result.lane===i;
      cardRects.push({i,x,y:top,w:cwid,h:cardH});
      c.fillStyle=on?'rgba(20,24,36,.95)':'rgba(8,10,18,.82)';c.fillRect(x,top,cwid,cardH);
      c.strokeStyle=res?(r.result.ok?'#9dff7a':'#ff3355'):LANE_COL[i];c.lineWidth=on||res?3:1.5;c.strokeRect(x+1,top+1,cwid-2,cardH-2);
      c.fillStyle=LANE_COL[i];c.beginPath();c.arc(x+18,top+18,12,0,Math.PI*2);c.fill();
      c.fillStyle='#060a10';c.font='800 14px "Chakra Petch", sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(String(i+1),x+18,top+19);
      c.textAlign='left';c.textBaseline='alphabetic';c.fillStyle='#eef2ff';
      wrapText(c,r.opts[i],x+36,top+22,cwid-44,cardH-20);}
  }
  // speed / hint strip
  c.fillStyle='rgba(255,255,255,.7)';c.font='600 12px "JetBrains Mono", monospace';c.textAlign='left';
  c.fillText(R.phase==='recall'?'Recall first · the gantry opens after you rate yourself':W<1100?'←/→ steer · 1-4 lane · ↑ boost · ↓ brake':'←/→ or stick steer · 1-4 jump lane · ↑ boost (more points) · ↓ brake (more reading time)',14,cardsTop-10);
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

function loop(now){
  requestAnimationFrame(loop);
  const dt=Math.min(3,(now-(last||now))/16.667);last=now;
  if(!cv)return;
  const vis=visible();
  cv.style.display=vis?'block':'none';
  const keys=document.querySelector('#play .keys');if(keys)keys.style.visibility=vis?'hidden':'';
  if(!vis){if(run&&!R.active)run=null;return;}
  const paused=R.paused||$.state!=='play'||!document.getElementById('cardWrap').hidden;
  if(!paused)update(dt);
  draw();
}
ensureCanvas();requestAnimationFrame(loop);
})();
