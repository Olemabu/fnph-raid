/* =====================================================================
   FNPH Raid · WARD ROUND (first-person stage mode, for OSCE stations)
   A raycast first-person view of an FNPH ward. The answer options walk
   towards you as holographic panels; turn, aim and shoot the right one.
   Destroying a panel is your pick: it goes to R.carrierDown(), exactly
   like a gunship, so grading, drill mode, teaching cards and mastery are
   shared with the main game. If the panels reach you, you are overrun.
   Used for stations whose deck header has "| fps" (or whose topic
   mentions OSCE without "emergency"). See HANDOFF.md.
   ===================================================================== */
(function(){
const R=$.raid;
const COL=['#ff4fa8','#62e6ff','#ffd27a','#9dff7a'];
const FOV=1.15,HP=3;
// ward map: 1 = wall, 2 = window wall, 3 = door, 0 = floor
const MAP=[
 '1111111111111111',
 '1000000000000001',
 '1000000000000001',
 '2000000000000002',
 '1000000000000001',
 '1001000000001001',
 '2000000000000002',
 '1000000000000001',
 '1000000000000001',
 '2001000000001002',
 '1000000000000001',
 '1000000000000001',
 '1000000000000001',
 '1000000000000001',
 '1111111331111111'];
const MW=MAP[0].length,MH=MAP.length,cell=(x,y)=>(x<0||y<0||x>=MW||y>=MH)?1:+MAP[y|0][x|0];
const PX=8,PY=13.2,START=9;          // player position and how far the panels start
let cv=null,cx=null,W=0,H=0,last=0,run=null,mouse={x:0,y:0,on:false,down:false},cardRects=[],zbuf=[];

function ensureCanvas(){
  if(cv)return;
  cv=document.createElement('canvas');cv.id='cfps';
  cv.style.cssText='position:absolute;inset:0;width:100%;height:100%;z-index:2;display:none;cursor:none;touch-action:none';
  document.getElementById('stage').appendChild(cv);cx=cv.getContext('2d');
  const mp=e=>{const r=cv.getBoundingClientRect();mouse.x=e.clientX-r.left;mouse.y=e.clientY-r.top;mouse.on=true;if(run)run.keyAim=false;};
  cv.addEventListener('pointermove',mp);
  cv.addEventListener('pointerdown',e=>{mp(e);
    const hit=cardRects.find(q=>mouse.x>=q.x&&mouse.x<=q.x+q.w&&mouse.y>=q.y&&mouse.y<=q.y+q.h);
    if(hit&&run){lockOn(hit.i);return;}
    mouse.down=true;});
  window.addEventListener('pointerup',()=>{mouse.down=false;});
  window.addEventListener('keydown',e=>{
    if(!run||!visible())return;
    if(e.key>='1'&&e.key<='4'){const k=+e.key-1;if(k<run.t.length)lockOn(k);}
  });
}
function lockOn(i){const t=run.t[i];if(!t||!t.alive)return;run.lock=t;run.keyAim=true;mouse.on=false;}
function resize(){const w=cv.clientWidth|0,h=cv.clientHeight|0;if(w!==W||h!==H){W=cv.width=w;H=cv.height=h;}}
function visible(){return R.active&&R.modeName&&R.modeName()==='fps'&&['recall','fight','resolve','dead','swarmdead'].includes(R.phase);}
const wrapA=a=>{while(a>Math.PI)a-=Math.PI*2;while(a<-Math.PI)a+=Math.PI*2;return a;};

function start(wave){
  ensureCanvas();
  const n=wave.opts.length,dur=Math.max(12,(wave.r0-60)/(wave.speed*60));
  const facing=-Math.PI/2,prev=run;
  const spread=Math.min(FOV*.82,.34*(n-1));
  const t=wave.opts.map((text,i)=>{const a=facing+(n>1?-spread/2+spread*i/(n-1):0)+(Math.random()-.5)*.12;
    return{i,text,a0:a,x:PX+Math.cos(a)*START,y:PY+Math.sin(a)*START,d:START,hp:HP,alive:true,flash:0,bob:Math.random()*6};});
  run={n,t,correct:wave.correct.slice(),dur,el:0,ang:prev?prev.ang:facing,done:false,result:null,
       lock:null,keyAim:true,cool:0,recoil:0,tracers:[],shake:0,flash:0,hx:$.hero.x,hy:$.hero.y,speed:(START-1.3)/dur};
  $.enemies.length=0;$.carriers.length=0;
}
R.fpsStart=start;

function update(dt){
  const r=run;if(!r)return;
  $.hero.x=r.hx;$.hero.y=r.hy;$.hero.vx=0;$.hero.vy=0;
  r.recoil=Math.max(0,r.recoil-dt*.25);r.shake=Math.max(0,r.shake-dt*.7);r.flash=Math.max(0,r.flash-dt*.04);
  r.tracers=r.tracers.filter(q=>(q.life-=dt)>0);
  r.t.forEach(t=>{t.flash=Math.max(0,t.flash-dt);t.bob+=dt*.05;});
  if(r.done)return;
  // turning: keys, right stick, mouse near the screen edge, or 1-4 lock-on
  const k=$.keys&&$.keys.state||{};let turn=(k.right?1:0)-(k.left?1:0);
  if($.pad&&Math.abs($.pad.mx||0)>.2)turn=$.pad.mx;
  const padTurn=$.pad&&typeof $.pad.ax==='number'?$.pad.ax:0;if(Math.abs(padTurn)>.25)turn=padTurn;
  if(turn){r.ang+=turn*.035*dt;r.keyAim=true;r.lock=null;}
  else if(r.lock&&r.lock.alive){const want=Math.atan2(r.lock.y-PY,r.lock.x-PX);r.ang+=wrapA(want-r.ang)*Math.min(1,.2*dt);}
  else if(mouse.on&&!r.keyAim){const ex=mouse.x/W;if(ex<.1)r.ang-=(.1-ex)*.5*dt;else if(ex>.9)r.ang+=(ex-.9)*.5*dt;}
  if(R.phase!=='fight')return;
  r.el+=dt/60;
  if(R.wave){R.wave.t=Math.min(1,r.el/r.dur);const eta=document.getElementById('qEta');if(eta)eta.style.transform='scaleX('+(1-R.wave.t).toFixed(3)+')';}
  // panels walk towards you
  r.t.forEach(t=>{if(!t.alive)return;t.d=Math.max(1.2,t.d-r.speed*dt/60);t.x=PX+Math.cos(t.a0)*t.d;t.y=PY+Math.sin(t.a0)*t.d;});
  if(r.t.some(t=>t.alive&&t.d<=1.21)){r.done=true;r.shake=20;R.overrun();return;}
  // firing
  r.cool-=dt;
  const firing=mouse.down||(k.f)||$.keyFire||($.pad&&$.pad.fire);
  const wpn=$.hero&&$.hero.weapon||{fireRate:5};
  if(firing&&r.cool<=0){r.cool=Math.max(3,wpn.fireRate*1.6);shoot();}
}
function crosshair(){return(run.keyAim||!mouse.on)?{x:W/2,y:H*.5}:{x:mouse.x,y:mouse.y};}
function shoot(){
  const r=run,ch=crosshair();r.recoil=1;$.audio&&$.audio.play('shoot');
  const gs=Math.min(W,H*1.6)/1000,gun={x:W*.62+4*gs,y:H*.86-134*gs};
  let best=null;
  r.t.forEach(t=>{if(!t.alive||!t.rect)return;const q=t.rect;if(ch.x>=q.x&&ch.x<=q.x+q.w&&ch.y>=q.y&&ch.y<=q.y+q.h){if(!best||t.d<best.d)best=t;}});
  // generous aim assist: a near miss within a few pixels of a panel edge still counts, if nothing else is under the crosshair
  if(!best){let bd=28;r.t.forEach(t=>{if(!t.alive||!t.rect)return;const q=t.rect,dx=Math.max(q.x-ch.x,0,ch.x-q.x-q.w),dy=Math.max(q.y-ch.y,0,ch.y-q.y-q.h),d=Math.hypot(dx,dy);if(d<bd){bd=d;best=t;}});}
  r.tracers.push({x0:gun.x,y0:gun.y,x1:ch.x,y1:ch.y,life:6,col:($.arsenal&&$.arsenal.color)||'#ffd27a'});
  if(!best)return;
  const dmg=($.hero&&$.hero.weapon&&$.hero.weapon.bullet&&$.hero.weapon.bullet.damage)||1;
  best.hp-=dmg;best.flash=8;$.audio&&$.audio.play('hit');
  if(best.hp<=0)pick(best);
}
function pick(t){
  const r=run;t.alive=false;r.done=true;
  const ok=r.correct.includes(t.text);r.result={i:t.i,ok};r.flash=1;r.shake=ok?8:20;
  if(R.wave)R.wave.t=Math.min(1,r.el/r.dur);
  R.carrierDown({text:t.text,num:t.i+1,x:$.hero.x,y:$.hero.y,alive:true,rammed:false,explode(){this.alive=false;}});
}

/* ------------------------------ rendering ------------------------------ */
function draw(){
  const r=run;resize();const c=cx;
  const sh=r&&r.shake?(Math.random()-.5)*r.shake:0;
  c.save();c.translate(sh,sh*.5);
  const hz=H*.5,focal=(W/2)/Math.tan(FOV/2);
  // ceiling and floor
  let g=c.createLinearGradient(0,0,0,hz);g.addColorStop(0,'#1a2230');g.addColorStop(1,'#2c3644');c.fillStyle=g;c.fillRect(-20,-20,W+40,hz+20);
  g=c.createLinearGradient(0,hz,0,H);g.addColorStop(0,'#2a2f2a');g.addColorStop(1,'#4b5246');c.fillStyle=g;c.fillRect(-20,hz,W+40,H-hz+20);
  // ceiling light strips
  c.fillStyle='rgba(230,245,255,.08)';for(let i=0;i<5;i++){const y=hz*(.15+i*.16);c.fillRect(W*.3-i*W*.03,y,W*.4+i*W*.06,3+i);}
  if(!r){c.restore();return;}
  // walls (DDA raycast, 2px columns)
  const step=2;zbuf=new Array(Math.ceil(W/step));
  for(let col=0;col<W;col+=step){
    const ca=r.ang+Math.atan((col-W/2)/focal),dx=Math.cos(ca),dy=Math.sin(ca);
    let mx=PX|0,my=PY|0;const ddx=Math.abs(1/dx),ddy=Math.abs(1/dy);
    let sx,sy,sdx,sdy;if(dx<0){sx=-1;sdx=(PX-mx)*ddx;}else{sx=1;sdx=(mx+1-PX)*ddx;}if(dy<0){sy=-1;sdy=(PY-my)*ddy;}else{sy=1;sdy=(my+1-PY)*ddy;}
    let side=0,hit=0,guard=0;
    while(!hit&&guard++<64){if(sdx<sdy){sdx+=ddx;mx+=sx;side=0;}else{sdy+=ddy;my+=sy;side=1;}hit=cell(mx,my);}
    let dist=side===0?(mx-PX+(1-sx)/2)/dx:(my-PY+(1-sy)/2)/dy;
    const perp=dist*Math.cos(ca-r.ang);zbuf[col/step|0]=perp;
    const hgt=focal/perp,top=hz-hgt/2;
    let u=side===0?PY+dist*dy:PX+dist*dx;u-=Math.floor(u);
    const shade=Math.max(.5,1-perp/26)*(side?0.85:1);
    const base=hit===2?[150,190,205]:hit===3?[120,90,60]:[196,206,178];
    const cl=k=>'rgb('+(base[0]*shade*k|0)+','+(base[1]*shade*k|0)+','+(base[2]*shade*k|0)+')';
    c.fillStyle=cl(1);c.fillRect(col,top,step,hgt);
    // hospital wall details: dado rail, skirting, window panes, door frames, panel joints
    c.fillStyle='rgba(30,90,80,'+(.75*shade)+')';c.fillRect(col,top+hgt*.58,step,hgt*.05);
    c.fillStyle=cl(.55);c.fillRect(col,top+hgt*.9,step,hgt*.1);
    if(hit===2&&u>.12&&u<.88){c.fillStyle='rgba(120,190,255,'+(.55*shade)+')';c.fillRect(col,top+hgt*.18,step,hgt*.32);}
    if(hit===3&&(u<.08||u>.92)){c.fillStyle=cl(.5);c.fillRect(col,top,step,hgt);}
    if(u<.03){c.fillStyle='rgba(0,0,0,.25)';c.fillRect(col,top,step,hgt);}
  }
  // sprites: answer panels, far to near
  const vis=r.t.filter(t=>t.alive||t===r.lastHit).map(t=>{const a=wrapA(Math.atan2(t.y-PY,t.x-PX)-r.ang);return{t,a,d:Math.hypot(t.x-PX,t.y-PY)};})
    .filter(o=>Math.abs(o.a)<FOV)
    .sort((a,b)=>b.d-a.d);
  r.t.forEach(t=>t.rect=null);
  for(const o of vis){const t=o.t;if(!t.alive)continue;
    const pd=o.d*Math.cos(o.a),sxp=W/2+Math.tan(o.a)*focal,size=focal/pd;
    const pw=size*1.25,ph=size*.9,bob=Math.sin(t.bob)*size*.03,px=sxp-pw/2,py=hz-ph*.62+bob;
    const zc=zbuf[Math.max(0,Math.min(zbuf.length-1,sxp/step|0))];if(zc!==undefined&&zc<pd-.3)continue;
    t.rect={x:px,y:py,w:pw,h:ph};
    const aim=r.lock===t;
    c.fillStyle='rgba(0,0,0,.35)';c.beginPath();c.ellipse(sxp,hz+size*.5,pw*.4,size*.06,0,0,Math.PI*2);c.fill();
    c.fillStyle='rgba(8,12,22,.86)';c.fillRect(px,py,pw,ph);
    c.strokeStyle=COL[t.i];c.lineWidth=Math.max(1.5,size*.03)*(aim?1.6:1);c.strokeRect(px,py,pw,ph);
    if(t.flash>0){c.fillStyle='rgba(255,255,255,'+(t.flash/16)+')';c.fillRect(px,py,pw,ph);}
    // scanlines
    c.fillStyle='rgba(98,230,255,.05)';for(let y=py;y<py+ph;y+=4)c.fillRect(px,y,pw,1);
    // number badge and health
    const br=Math.max(7,size*.1);c.fillStyle=COL[t.i];c.beginPath();c.arc(px+br*1.4,py+br*1.4,br,0,Math.PI*2);c.fill();
    c.fillStyle='#060a10';c.font='800 '+(br*1.3|0)+'px "Chakra Petch", sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(String(t.i+1),px+br*1.4,py+br*1.5);
    for(let h=0;h<HP;h++){c.fillStyle=h<t.hp?COL[t.i]:'rgba(255,255,255,.15)';c.fillRect(px+pw-(HP-h)*pw*.09-pw*.04,py+ph*.06,pw*.07,Math.max(2,ph*.03));}
    c.textAlign='left';c.textBaseline='alphabetic';
    if(pw>120){c.fillStyle='#eef2ff';wrapText(c,t.text,px+pw*.06,py+br*3.2,pw*.88,ph-br*3.4,Math.min(22,size*.13|0));}
    // holo stand
    c.fillStyle=COL[t.i];c.globalAlpha=.35;c.fillRect(sxp-size*.02,py+ph,size*.04,hz+size*.5-(py+ph));c.globalAlpha=1;
  }
  // tracers
  r.tracers.forEach(q=>{c.strokeStyle=q.col;c.globalAlpha=q.life/6;c.lineWidth=3;c.beginPath();c.moveTo(q.x0,q.y0);c.lineTo(q.x1,q.y1);c.stroke();c.globalAlpha=1;});
  // gun
  const gc=($.arsenal&&$.arsenal.color)||'#ffd27a',gx=W*.62,gy=H*.86+r.recoil*14;
  const gs=Math.min(W,H*1.6)/1000;
  c.fillStyle='#141a26';c.beginPath();c.moveTo(gx-90*gs,H+10);c.lineTo(gx-34*gs,gy-20*gs);c.lineTo(gx+40*gs,gy-20*gs);c.lineTo(gx+120*gs,H+10);c.closePath();c.fill();
  c.fillStyle='#2c3647';c.beginPath();c.moveTo(gx-26*gs,gy-20*gs);c.lineTo(gx-14*gs,gy-110*gs);c.lineTo(gx+22*gs,gy-110*gs);c.lineTo(gx+34*gs,gy-20*gs);c.closePath();c.fill();
  c.fillStyle='#3d4a60';c.fillRect(gx-10*gs,gy-128*gs,28*gs,24*gs);
  c.fillStyle=gc;c.globalAlpha=.9;c.fillRect(gx-20*gs,gy-90*gs,4*gs,60*gs);c.fillRect(gx+22*gs,gy-90*gs,4*gs,60*gs);c.fillRect(gx-4*gs,gy-124*gs,16*gs,5*gs);c.globalAlpha=1;
  if(r.recoil>.6){c.fillStyle=gc;c.globalAlpha=.75;c.beginPath();c.arc(gx+4*gs,gy-134*gs,34*gs*r.recoil,0,Math.PI*2);c.fill();c.globalAlpha=1;}
  // crosshair
  const ch=crosshair(),over=r.t.find(t=>t.alive&&t.rect&&ch.x>=t.rect.x&&ch.x<=t.rect.x+t.rect.w&&ch.y>=t.rect.y&&ch.y<=t.rect.y+t.rect.h);
  c.strokeStyle=over?COL[over.i]:'rgba(235,245,235,.95)';c.lineWidth=2;
  c.beginPath();c.moveTo(ch.x-14,ch.y);c.lineTo(ch.x-5,ch.y);c.moveTo(ch.x+5,ch.y);c.lineTo(ch.x+14,ch.y);c.moveTo(ch.x,ch.y-14);c.lineTo(ch.x,ch.y-5);c.moveTo(ch.x,ch.y+5);c.lineTo(ch.x,ch.y+14);c.stroke();
  c.beginPath();c.arc(ch.x,ch.y,over?18:10,0,Math.PI*2);c.stroke();
  if(over){c.fillStyle=COL[over.i];c.font='700 12px "JetBrains Mono", monospace';c.textAlign='center';c.fillText('TARGET '+(over.i+1),ch.x,ch.y+34);c.textAlign='left';}
  // off-screen pointers for panels outside the view
  r.t.forEach(t=>{if(!t.alive)return;const a=wrapA(Math.atan2(t.y-PY,t.x-PX)-r.ang);if(Math.abs(a)<FOV/2)return;
    const left=a<0,x=left?18:W-18,y=hz;c.fillStyle=COL[t.i];c.beginPath();if(left){c.moveTo(x-8,y);c.lineTo(x+6,y-10);c.lineTo(x+6,y+10);}else{c.moveTo(x+8,y);c.lineTo(x-6,y-10);c.lineTo(x-6,y+10);}c.fill();
    c.font='800 13px "Chakra Petch", sans-serif';c.textAlign='center';c.fillText(String(t.i+1),left?x+18:x-18,y+5);c.textAlign='left';});
  // answer cards
  const narrow=W<700,n=r.n,cols=narrow?2:n,rows=Math.ceil(n/cols),cardH=narrow?70:Math.max(78,H*.11),pad=10,cardsTop=H-rows*(cardH+pad);
  cardRects=[];
  if(R.phase!=='recall'){const cw=(W-pad*(cols+1))/cols;
    for(let i=0;i<n;i++){const t=r.t[i],colI=i%cols,row=Math.floor(i/cols),x=pad+colI*(cw+pad),top=cardsTop+row*(cardH+pad),res=r.result&&r.result.i===i;
      cardRects.push({i,x,y:top,w:cw,h:cardH});
      c.globalAlpha=t.alive||res?1:.4;
      c.fillStyle='rgba(8,10,18,.84)';c.fillRect(x,top,cw,cardH);
      c.strokeStyle=res?(r.result.ok?'#9dff7a':'#ff3355'):COL[i];c.lineWidth=res||r.lock===t?3:1.5;c.strokeRect(x+1,top+1,cw-2,cardH-2);
      c.fillStyle=COL[i];c.beginPath();c.arc(x+18,top+18,12,0,Math.PI*2);c.fill();
      c.fillStyle='#060a10';c.font='800 14px "Chakra Petch", sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(String(i+1),x+18,top+19);
      c.textAlign='left';c.textBaseline='alphabetic';c.fillStyle='#eef2ff';wrapText(c,t.text,x+36,top+22,cw-44,cardH-20,17);
      c.globalAlpha=1;}
    c.fillStyle='rgba(255,255,255,.7)';c.font='600 12px "JetBrains Mono", monospace';
    c.fillText(W<1100?'mouse/←→ aim · click/Space fire · 1-4 lock':'Mouse aim (edges turn) or ←/→ · click, Space or F fire · 1-4 or tap a card to lock on',14,cardsTop-10);
  }else{c.fillStyle='rgba(255,255,255,.7)';c.font='600 12px "JetBrains Mono", monospace';c.fillText('Recall first · the panels unseal after you rate yourself',14,H-14);}
  if(r.flash>0&&r.result){c.fillStyle=r.result.ok?'rgba(98,255,160,'+(r.flash*.3)+')':'rgba(255,30,60,'+(r.flash*.45)+')';c.fillRect(-20,-20,W+40,H+40);}
  c.restore();
}
function wrapText(c,t,x,y,w,maxH,f0){
  let fs=f0||17;
  for(;fs>=10;fs--){c.font='600 '+fs+'px "Chakra Petch", sans-serif';if(lines(c,t,w).length*(fs+3)<=maxH)break;}
  lines(c,t,w).forEach((l,i)=>{if((i+1)*(fs+3)<=maxH+fs)c.fillText(l,x,y+i*(fs+3)+4);});
}
function lines(c,t,w){const out=[];let cur='';String(t).split(/\s+/).forEach(word=>{const tst=cur?cur+' '+word:word;if(c.measureText(tst).width>w&&cur){out.push(cur);cur=word;}else cur=tst;});if(cur)out.push(cur);return out;}

function loop(now){
  requestAnimationFrame(loop);
  const dt=Math.min(3,(now-(last||now))/16.667);last=now;
  if(!cv)return;
  const vis=visible();
  cv.style.display=vis?'block':'none';
  if(vis){const keys=document.querySelector('#play .keys');if(keys)keys.style.visibility='hidden';}
  if(!vis){if(run&&!R.active)run=null;return;}
  const paused=R.paused||$.state!=='play'||!document.getElementById('cardWrap').hidden;
  if(!paused)update(dt);
  draw();
}
ensureCanvas();requestAnimationFrame(loop);
})();
