/*==============================================================================
FNPH Raid layer: exam content, teaching cards, answer carriers, stations,
controller, sound. Written for this fork; sits on top of the Radius Raid engine.
==============================================================================*/
(function(){
'use strict';
const Q=s=>document.querySelector(s);
const store={get(k,d){try{const v=localStorage.getItem('fnphraid.'+k);return v==null?d:JSON.parse(v);}catch(e){return d;}},set(k,v){try{localStorage.setItem('fnphraid.'+k,JSON.stringify(v));}catch(e){}}};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rand=(a,b)=>a+Math.random()*(b-a);
function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
const pickOne=a=>a[Math.floor(Math.random()*a.length)];
const WS=2; // world scale: map coords x2 = world (1920 x 1200)

/* ================= Deck ================= */
function hash(s){let h=5381;for(let i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;return(h>>>0).toString(36);}
function splitOpts(raw){const why={},opts=raw.split('|').map(x=>x.trim()).filter(Boolean).map(p=>{const k=p.indexOf(' :: ');if(k<0)return p;const o=p.slice(0,k).trim();why[o]=p.slice(k+4).trim();return o;});return{opts,why};}
function parseDeck(text){
  const rooms=[],errors=[];let cur=null,target=null,curC=null;
  text.split(/\r?\n/).forEach((raw,i)=>{
    const line=raw.trim();if(!line)return;
    if(line.startsWith('>')){const t=line.slice(1).trim();if(target){if(t.startsWith('Process cues: ')&&target.type==='l'){target.cues=t.slice(14).split('|').map(x=>x.trim());if(target.cues.length!==target.seq.length)errors.push('Line '+(i+1)+': process cues must match the number of steps');}else (target.note=target.note||[]).push(t);}return;}
    if(line.startsWith('###')){const p=line.slice(3).split('|').map(s=>s.trim());if(!cur){cur={locus:'Station 1',topic:'General',mode:'',items:[],note:[],concepts:[]};rooms.push(cur);}curC={title:p[0]||'Concept',mode:(p[1]||'').toLowerCase(),note:[],items:[]};cur.concepts.push(curC);target=curC;return;}
    if(line.startsWith('##')){curC=null;const p=line.slice(2).split('|').map(s=>s.trim());cur={concepts:[],locus:p[0]||('Station '+(rooms.length+1)),topic:p[1]||p[0]||'Untitled',mode:(p[2]||'').toLowerCase(),items:[],note:[]};rooms.push(cur);target=cur;return;}
    if(line.startsWith('#'))return;
    const m=line.match(/^([QLS])\s*:\s*(.+)$/i);
    if(!m){errors.push('Line '+(i+1)+': start it with Q:, L:, S:, ## or >');return;}
    const body=m[2],eq=body.indexOf(' = ');
    if(eq<0){errors.push('Line '+(i+1)+': needs " = " between the question and the answer');return;}
    if(!cur){cur={locus:'Station 1',topic:'General',mode:'',items:[],note:[],concepts:[]};rooms.push(cur);}
    const prompt=body.slice(0,eq).trim(),rest=body.slice(eq+3),t=m[1].toUpperCase();
    let it;
    if(t==='Q'){const {opts,why}=splitOpts(rest);if(!opts.length){errors.push('Line '+(i+1)+': no answer');return;}it={type:'q',prompt,answer:opts[0],wrongs:opts.slice(1),why};}
    else{const cut=rest.indexOf(' ~~ ');const clues={};
      const labelled=x=>{const k=x.indexOf(' => ');if(k<0)return x;const term=x.slice(0,k).trim();clues[term]=x.slice(k+4).trim();return term;};
      const seq=(cut<0?rest:rest.slice(0,cut)).split('|').map(x=>x.trim()).filter(Boolean).map(labelled);
      const d=cut<0?{opts:[],why:{}}:splitOpts(rest.slice(cut+4));
      if(seq.length<2){errors.push('Line '+(i+1)+': a list needs at least 2 items');return;}
      const why={};const decoys=d.opts.map(x=>{const term=labelled(x);if(d.why[x])why[term]=d.why[x];return term;});
      it={type:t==='L'?'l':'s',prompt,seq,decoys,why,clues};}
    it.note=[];it.concept=curC;if(curC)curC.items.push(it);cur.items.push(it);target=it;
  });
  rooms.forEach((r,ri)=>{r.idx=ri;r.items.forEach(it=>{it.id=hash(r.topic+'::'+it.type+'::'+it.prompt);it.room=r;});});
  return{rooms,errors};
}
{const bh=hash(window.FNPH_DECK);if(store.get('deckBase','')!==bh){const sv=store.get('deck',null);if(sv!=null){store.set('deckOld',sv);try{localStorage.removeItem('fnphraid.deck');}catch(e){}}store.set('deckBase',bh);}}
let deckText=store.get('deck',window.FNPH_DECK);
let deck=parseDeck(deckText);if(!deck.rooms.length){deckText=window.FNPH_DECK;deck=parseDeck(deckText);}
let ALL_ANS=[],ALL_LIST=[];
function indexDeck(){ALL_ANS=[];ALL_LIST=[];deck.rooms.forEach(r=>r.items.forEach(it=>{if(it.type==='q')ALL_ANS.push({t:it.answer,room:r});else it.seq.forEach(x=>ALL_LIST.push({t:x,room:r}));}));}
indexDeck();
let stats=store.get('stats',{}),captured=new Set(store.get('captured',[])),skipped=new Set(store.get('skip',[]));
/* concepts: a station is a syllabus topic; each run plays one concept (summary + its questions) */
let cdone=new Set(store.get('cdone',[]));
const ckey=(r,c)=>r.topic+'::'+c.title;
function pickConcept(r){
  const cs=(r.concepts||[]).filter(c=>c.items.some(i=>!mastered(i)));if(!cs.length)return null;
  const next=cs.find(c=>!cdone.has(ckey(r,c)));if(next)return next;
  // all secured once: revisit the weakest concept
  let best=null,bm=2;cs.forEach(c=>{const m=c.items.filter(mastered).length/c.items.length;if(m<bm){bm=m;best=c;}});return best;
}
function conceptsDone(r){const cs=(r.concepts||[]).filter(c=>c.items.length);return cs.filter(c=>cdone.has(ckey(r,c))).length;}
let timerOn=store.get('timer',true);const MASTER_AT=3;
let best=store.get('best',0),teachAll=store.get('teachAll',true),soundOn=store.get('sound',true),musicOn=store.get('music',true),deathMode=store.get('deathMode2','drill');
function st(id){return stats[id]||(stats[id]={box:0,right:0,wrong:0,seen:0});}
/* spaced repetition: each grade schedules the next review (days per Leitner box); a miss comes back within the hour */
const SRS_DAYS=[0,1,3,7,16,35];
function grade(id,ok){const s=st(id);s.seen++;if(ok){s.right++;s.box=Math.min(5,s.box+1);s.due=Date.now()+SRS_DAYS[s.box]*864e5;}else{s.wrong++;s.box=0;s.due=Date.now()+30*60e3;}store.set('stats',stats);}
function dueItems(max){const now=Date.now();return deck.rooms.flatMap(r=>r.items).filter(it=>{const s=stats[it.id];return !mastered(it)&&s&&s.seen>0&&(s.due||0)<=now;}).sort((a,b)=>(stats[a.id].due||0)-(stats[b.id].due||0)).slice(0,max||1e9);}
function reviewRoom(){
  const items=dueItems(30);if(!items.length)return null;
  const cnt={};items.forEach(it=>cnt[it.room.idx]=(cnt[it.room.idx]||0)+1);
  const idx=+Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a])[0];
  return{review:true,locus:'Daily review',topic:'Daily review · spaced repetition',mode:'',idx:Math.min(idx,SLOTS.length-1),concepts:[],
    note:['These are the items due today across every station, mixed together. Choose the correct answer in play; missed items return automatically.','- Right: it comes back in 1, 3, 7, 16, then 35 days.','- Wrong: it comes back within the hour.'],items};
}
function mastered(it){return !!stats[it.id]&&stats[it.id].box>=MASTER_AT;}
function masteredCount(room){return room.items.filter(mastered).length;}
function mastery(room){if(!room.items.length)return 0;let t=0;room.items.forEach(it=>t+=Math.min(MASTER_AT,stats[it.id]?stats[it.id].box:0));return t/(room.items.length*MASTER_AT);}
const mapRooms=()=>deck.rooms.slice(0,SLOTS.length);
/* ---------- arsenal: the gun upgrades as you master more questions (saved progress, across runs) ---------- */
const ARSENAL=[
  {at:0, name:'Mk I Pulse',  fireRate:5,  speed:10, count:1, spread:.3,  damage:1,   piercing:0, size:24, lineWidth:2.6, color:'#ffd27a', homing:0,   armour:0},
  {at:40,name:'Mk II Twin',  fireRate:4.5,speed:11, count:2, spread:.10, damage:1,   piercing:0, size:26, lineWidth:2.8, color:'#9dff7a', homing:0,   armour:0},
  {at:120,name:'Mk III Plasma',fireRate:4, speed:12, count:2, spread:.10, damage:1.5, piercing:0, size:30, lineWidth:3.4, color:'#62e6ff', homing:0,   armour:1},
  {at:300,name:'Mk IV Rail',  fireRate:3.5,speed:14, count:2, spread:.08, damage:1.5, piercing:1, size:36, lineWidth:3.6, color:'#c78bff', homing:0,   armour:1},
  {at:700,name:'Mk V Seeker', fireRate:3,  speed:14, count:3, spread:.12, damage:2,   piercing:1, size:36, lineWidth:3.8, color:'#ff7ad9', homing:.06, armour:2}
];
const totalMastered=()=>deck.rooms.reduce((n,r)=>n+masteredCount(r),0);
function arsenalTier(){const m=totalMastered();let t=0;ARSENAL.forEach((a,i)=>{if(m>=a.at)t=i;});return t;}
function applyArsenal(announce){
  const t=arsenalTier(),prev=R.tier;R.tier=t;$.arsenal=ARSENAL[t];
  if(announce&&prev!=null&&t>prev)setTimeout(()=>{R.toast('Arsenal upgraded: '+ARSENAL[t].name+'. Answer gunships are armoured up too.',true);synth('mastered');},1300);
}
function arsenalLine(){const t=arsenalTier(),m=totalMastered(),nx=ARSENAL[t+1];return 'Arsenal: <b>'+ARSENAL[t].name+'</b>'+(nx?' · next, '+nx.name+', at '+nx.at+' mastered (you have '+m+')':' · fully upgraded');}
let routeOrder=store.get('routeOrder','map');
const PLAN_ORDER=['Mood disorders','Schizophrenia','Personality disorders','Phenomenology & psychopathology','Psychiatric interview','Substance use disorders','Biological treatments','Emergency psychiatry','Perinatal psychiatry','Genetics','Old age psychiatry','Psychiatry of later life','Neurology I','Neurology II','Forensic I — Mental health law','Forensic II — Assessment & services','Community & social psychiatry','Telepsychiatry','History of psychiatry','Basic statistics'];
const ORDER_LABEL={map:'map order (gate inwards)',plan:'study plan (mood first)',weak:'weakest station first',due:'most reviews due first'};
function routeRooms(){
  const rr=mapRooms().filter(r=>!skipped.has(r.topic)&&r.items.length);
  if(routeOrder==='plan'){const k=r=>{const i=PLAN_ORDER.indexOf(r.topic);return i<0?99:i;};return rr.slice().sort((a,b)=>k(a)-k(b));}
  if(routeOrder==='weak')return rr.slice().sort((a,b)=>mastery(a)-mastery(b));
  if(routeOrder==='due'){const now=Date.now(),d=r=>r.items.filter(it=>!mastered(it)&&stats[it.id]&&stats[it.id].seen&&(stats[it.id].due||0)<=now).length;return rr.slice().sort((a,b)=>d(b)-d(a));}
  return rr;
}
function noteHTML(lines){
  if(!lines||!lines.length)return '';let h='',ul=false;
  lines.forEach(l=>{if(l.startsWith('- ')){if(!ul){h+='<ul>';ul=true;}h+='<li>'+esc(l.slice(2))+'</li>';}else{if(ul){h+='</ul>';ul=false;}h+='<p>'+esc(l)+'</p>';}});
  if(ul)h+='</ul>';return h;
}
function reasonFor(item,text){
  if(item.why&&item.why[text])return item.why[text];
  const src=deck.rooms.flatMap(r=>r.items).find(o=>o!==item&&(o.type==='q'?o.answer===text:o.seq&&o.seq.includes(text)));
  if(src)return 'That belongs to a different question: "'+src.prompt+'".';
  return 'Not the right answer here.';
}
function qOptions(it){
  const pool=shuffle(it.wrongs).slice(0,3);
  const fill=shuffle(it.room.items.filter(o=>o.type==='q'&&o!==it).map(o=>o.answer)).concat(shuffle(ALL_ANS.filter(a=>a.room!==it.room).map(a=>a.t)));
  for(const a of fill){if(pool.length>=3)break;if(a!==it.answer&&!pool.includes(a))pool.push(a);}
  return shuffle([it.answer].concat(pool));
}
function mixQueue(items){
  const qs=shuffle(items.filter(i=>i.type==='q')),ls=shuffle(items.filter(i=>i.type!=='q')),out=[];
  if(!ls.length)return qs;if(!qs.length)return ls;
  const gap=Math.max(1,Math.round(qs.length/(ls.length+1)));let qi=0;
  ls.forEach(l=>{for(let k=0;k<gap&&qi<qs.length;k++)out.push(qs[qi++]);out.push(l);});
  while(qi<qs.length)out.push(qs[qi++]);return out;
}

/* ================= Sound: jsfxr through Web Audio + synth + music ================= */
let AC=null,MASTER=null,SFX=null,MUS=null,NOISE=null,BUF={},musicTimer=0,musicNext=0,musicStep=0,musicHot=0;
function ac(){
  if(!AC){try{
    AC=new(window.AudioContext||window.webkitAudioContext)();
    const comp=AC.createDynamicsCompressor();comp.threshold.value=-12;comp.ratio.value=4;
    MASTER=AC.createGain();MASTER.gain.value=soundOn?1:0;MASTER.connect(comp);comp.connect(AC.destination);
    SFX=AC.createGain();SFX.gain.value=.8;SFX.connect(MASTER);
    MUS=AC.createGain();MUS.gain.value=musicOn?.28:0;MUS.connect(MASTER);
    const n=AC.sampleRate*2,b=AC.createBuffer(1,n,AC.sampleRate),ch=b.getChannelData(0);for(let i=0;i<n;i++)ch[i]=Math.random()*2-1;NOISE=b;
    for(const k in $.definitions.audio){BUF[k]=[];$.definitions.audio[k].params.forEach(p=>{try{
      const uri=jsfxr(p),b64=uri.slice(uri.indexOf(',')+1),bin=atob(b64),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);
      AC.decodeAudioData(u.buffer,buf=>BUF[k].push(buf),()=>{});}catch(e){}});}
  }catch(e){AC=null;}}
  if(AC&&AC.state!=='running'){try{AC.resume();}catch(e){}}
  return AC;
}
$.audio={play(name){if(name==='shoot'||name==='shootAlt'){synth(name==='shoot'?'gun':'gun2');return;}if(!soundOn||!AC||!BUF[name]||!BUF[name].length)return;try{const s=AC.createBufferSource();s.buffer=pickOne(BUF[name]);const g=AC.createGain();g.gain.value=name==='shoot'||name==='shootAlt'?.35:.7;s.connect(g);g.connect(SFX);s.start();}catch(e){}},references:[]};
['pointerdown','keydown','touchstart'].forEach(ev=>document.addEventListener(ev,()=>{ac();if(musicOn&&!musicTimer&&R.active)startMusic();},{passive:true}));
function env(g,t,a,peak,d){g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(peak,t+a);g.gain.exponentialRampToValueAtTime(.0001,t+a+d);}
function osc(type,f0,f1,dur,vol,t,bus){const o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.setValueAtTime(f0,t);if(f1)o.frequency.exponentialRampToValueAtTime(f1,t+dur);env(g,t,.006,vol,dur);o.connect(g);g.connect(bus||SFX);o.start(t);o.stop(t+dur+.05);}
function nz(dur,vol,f0,f1,t,bus,type,q){const s=AC.createBufferSource(),f=AC.createBiquadFilter(),g=AC.createGain();s.buffer=NOISE;f.type=type||'lowpass';f.frequency.setValueAtTime(f0,t);if(f1)f.frequency.exponentialRampToValueAtTime(f1,t+dur);if(q)f.Q.value=q;env(g,t,.004,vol,dur);s.connect(f);f.connect(g);g.connect(bus||SFX);s.start(t,Math.random());s.stop(t+dur+.05);}
function synth(k){
  if(!soundOn||!ac())return;const t=AC.currentTime;try{
  if(k==='correct'){[660,880,1320,1760].forEach((f,i)=>osc('triangle',f,0,.25,.3,t+i*.07));}
  else if(k==='killed'){osc('sawtooth',260,40,1,.5,t);nz(1.2,.8,1800,60,t);[0,.34].forEach(d=>osc('sine',58,40,.2,.9,t+1+d));}
  else if(k==='captured'){[523,659,784,1047,784,1047,1318].forEach((f,i)=>{osc('square',f,0,.2,.14,t+i*.11);osc('triangle',f/2,0,.22,.18,t+i*.11);});}
  else if(k==='card'){osc('sine',880,1320,.12,.12,t);}
  else if(k==='wave'){[0,.2,.4].forEach(d=>osc('square',700,500,.15,.08,t+d));}
  else if(k==='lock'){osc('sine',1500,1800,.06,.1,t);}
  else if(k==='gun'||k==='gun2'){nz(.07,.55,5200,900,t,null,'highpass');nz(.11,.5,900,120,t,null,'lowpass');osc('square',150,45,.07,.22,t);if(k==='gun2')osc('sawtooth',900,300,.05,.06,t);}
  else if(k==='tick'){osc('square',1200,1200,.03,.06,t);}
  else if(k==='mastered'){[784,988,1175,1568].forEach((f,i)=>osc('sine',f,0,.3,.18,t+i*.06));}
  }catch(e){}
}
const BASS=[55,55,65.4,55,49,49,58.3,49];
function startMusic(){if(!ac()||musicTimer)return;musicNext=AC.currentTime+.1;musicStep=0;musicTimer=setInterval(schedMusic,60);}
function stopMusic(){if(musicTimer){clearInterval(musicTimer);musicTimer=0;}}
function schedMusic(){
  const spb=60/124/2;
  while(musicNext<AC.currentTime+.25){
    const s=musicStep%16,bar=Math.floor(musicStep/16)%8,root=BASS[bar],t=musicNext,hot=musicHot;
    if(s%2===0)osc('sawtooth',root,root*.99,spb*1.6,.2,t,MUS);
    if(s%4===0)osc('sine',root/2,root/2*.9,spb*2.2,.3,t,MUS);
    if(s===0||s===8||(hot>.5&&(s===6||s===14)))osc('sine',150,40,.22,.6*Math.max(.35,hot),t,MUS);
    if(hot>.2&&(s===4||s===12))nz(.16,.3*hot,3000,900,t,MUS,'bandpass',.9);
    if(hot>.4)nz(.04,.1,9000,7000,t,MUS,'highpass');
    if(s%8===3&&bar%2===1)osc('triangle',root*6,root*6,spb*1.2,.05,t,MUS);
    musicNext+=spb;musicStep++;
  }
}
function applySound(){
  if(MASTER)MASTER.gain.setTargetAtTime(soundOn?1:0,AC.currentTime,.05);
  if(MUS)MUS.gain.setTargetAtTime(musicOn?.28:0,AC.currentTime,.1);
  Q('#bSound').textContent=soundOn?'Sound on':'Sound off';Q('#bMusic').textContent=musicOn?'Music on':'Music off';
}

/* ================= World map ================= */
let mapCanvas=null;
function buildMap(){
  mapCanvas=document.createElement('canvas');mapCanvas.width=$.ww;mapCanvas.height=$.wh;
  const c=mapCanvas.getContext('2d');c.scale(WS,WS);drawMapBase(c);
  c.setTransform(1,0,0,1,0,0);c.fillStyle='rgba(4,8,18,.35)';c.fillRect(0,0,$.ww,$.wh);
  c.strokeStyle='rgba(98,230,255,.05)';c.lineWidth=1;
  for(let x=0;x<$.ww;x+=60){c.beginPath();c.moveTo(x,0);c.lineTo(x,$.wh);c.stroke();}
  for(let y=0;y<$.wh;y+=60){c.beginPath();c.moveTo(0,y);c.lineTo($.ww,y);c.stroke();}
  $.miniMapImage=mapCanvas;
}
const SP=i=>({x:SLOTS[i].x*WS,y:SLOTS[i].y*WS});

/* ================= Answer carriers ================= */
function wrapText(ctx,text,maxW,maxLines){
  const words=text.split(/\s+/),lines=[];let line='';
  for(const w of words){const t=line?line+' '+w:w;if(ctx.measureText(t).width>maxW&&line){lines.push(line);line=w;}else line=t;}
  if(line)lines.push(line);
  if(lines.length>maxLines){lines.length=maxLines;lines[maxLines-1]=lines[maxLines-1].replace(/\s*\S*$/,'')+'…';}
  return lines;
}
function makeLabel(text,num){
  const c=document.createElement('canvas'),g=c.getContext('2d'),dpr=Math.min(2,window.devicePixelRatio||1),W0=240;
  g.font='600 13.5px "Chakra Petch", "Segoe UI", sans-serif';
  const lines=wrapText(g,text,W0-50,4),H0=20+lines.length*17;
  c.width=W0*dpr;c.height=H0*dpr;g.scale(dpr,dpr);

  // Frosted cyber plate body
  g.fillStyle='rgba(8,12,20,.95)';
  g.beginPath();
  if(g.roundRect)g.roundRect(1,1,W0-2,H0-2,8);else g.rect(1,1,W0-2,H0-2);
  g.fill();

  // Subtle interior scanlines
  g.fillStyle='rgba(255,255,255,.03)';
  for(let y=4;y<H0-4;y+=3){g.fillRect(4,y,W0-8,1);}

  // Top header accent line
  g.fillStyle='rgba(255,79,168,.4)';
  g.fillRect(10,1,W0-20,2);

  // Text
  g.font='600 13.5px "Chakra Petch", "Segoe UI", sans-serif';
  g.fillStyle='#f0f6ff';
  g.textBaseline='middle';
  lines.forEach((l,i)=>g.fillText(l,42,H0/2-(lines.length-1)*8.5+i*17));

  return{canvas:c,w:W0,h:H0};
}
$.Carrier=function(o){
  for(const k in o)this[k]=o[k];
  this.radius=26;this.life=this.lifeMax=3+(($.arsenal&&$.arsenal.armour)||0);this.hitFlag=0;this.t=Math.random()*6;this.label=makeLabel(R.optionLabel(this.text),this.num);this.vx=0;this.vy=0;this.alive=true;
};
$.Carrier.prototype.update=function(i){
  if(!this.alive)return;
  const h=$.hero,dx=h.x-this.x,dy=h.y-this.y,d=Math.hypot(dx,dy)||1;
  this.t+=.03*$.dt;
  const sp=R.wave&&R.phase==='fight'?R.wave.speed*($.slow?.4:1):0;
  const px=-dy/d,py=dx/d,wob=Math.sin(this.t+this.num)*.35;
  const ox0=this.x,oy0=this.y;
  this.x+=(dx/d*sp+px*wob*sp)*$.dt;this.y+=(dy/d*sp+py*wob*sp)*$.dt;
  for(const o of $.carriers){if(o===this||!o.alive)continue;const ox=this.x-o.x,oy=this.y-o.y,od=Math.hypot(ox,oy)||1;if(od<140){this.x+=ox/od*(140-od)*.02*$.dt;this.y+=oy/od*(140-od)*.02*$.dt;}}
  this.x=Math.max(this.radius,Math.min($.ww-this.radius,this.x));this.y=Math.max(this.radius,Math.min($.wh-this.radius,this.y));
  const fdt=$.dt||1;this.vx=(this.x-ox0)/fdt;this.vy=(this.y-oy0)/fdt;
  // ramming counts as choosing: the right answer scores, a wrong one kills you
  if(R.phase==='fight'&&h.life>0&&d<h.radius+this.radius*.75){this.rammed=true;R.carrierDown(this);}
};
$.Carrier.prototype.hit=function(dmg){
  if(!this.alive||R.phase!=='fight')return;
  this.life-=dmg;this.hitFlag=10;$.audio.play('hit');
  if(!this.warned){this.warned=1;R.toast('Hitting '+this.num+' · '+R.optionLabel(this.text));}
  if(this.life<=0)R.carrierDown(this);
};
$.Carrier.prototype.render=function(){
  if(!this.alive)return;
  const ctx=$.ctxmg,aim=R.aimTarget()===this,t=this.t,hue=aim?190:322;
  const hCol=aim?'98,230,255':'255,79,168';

  // 1. Drop shadow on tarmac
  ctx.save();
  ctx.translate(this.x+5,this.y+7);
  ctx.fillStyle='rgba(0,0,0,.5)';
  ctx.beginPath();ctx.ellipse(0,0,this.radius+6,this.radius*.65,0,0,$.twopi);ctx.fill();
  ctx.restore();

  // 2. VTOL Hover Thruster Pods (4 corners)
  const pods=[[-20,-16],[20,-16],[-20,16],[20,16]];
  for(let k=0;k<pods.length;k++){
    const px=this.x+pods[k][0],py=this.y+pods[k][1];
    ctx.fillStyle='#1e2632';ctx.fillRect(px-3.5,py-4,7,8);
    ctx.strokeStyle='rgba('+hCol+',.6)';ctx.lineWidth=1;
    ctx.strokeRect(px-3.5,py-4,7,8);

    // Flickering hover exhaust plume
    const pFlame=6+Math.sin(t*12+k*1.6)*3.5;
    const pGrad=ctx.createLinearGradient(px,py+4,px,py+4+pFlame);
    pGrad.addColorStop(0,'#ffffff');
    pGrad.addColorStop(0.3,'rgba('+hCol+',.8)');
    pGrad.addColorStop(1,'rgba('+hCol+',0)');
    ctx.fillStyle=pGrad;
    ctx.beginPath();
    ctx.moveTo(px-2.5,py+4);ctx.lineTo(px,py+4+pFlame);ctx.lineTo(px+2.5,py+4);
    ctx.closePath();ctx.fill();
  }

  // 3. Heavy Armored Gunship Hull (Octagonal)
  ctx.save();
  ctx.translate(this.x,this.y);
  const r0=this.radius;

  ctx.beginPath();
  for(let a=0;a<8;a++){
    const ang=a*$.twopi/8+$.pi/8;
    const ax=Math.cos(ang)*r0,ay=Math.sin(ang)*(r0*.88);
    if(a===0)ctx.moveTo(ax,ay);else ctx.lineTo(ax,ay);
  }
  ctx.closePath();

  // Dark gunmetal chassis gradient
  const hullG=ctx.createLinearGradient(-r0,-r0,r0,r0);
  hullG.addColorStop(0,'#161e28');
  hullG.addColorStop(0.5,'#232f3e');
  hullG.addColorStop(1,'#121820');
  ctx.fillStyle=hullG;ctx.fill();

  // Outer glowing hull stroke
  ctx.strokeStyle='hsla('+hue+',100%,65%,1)';
  ctx.lineWidth=aim?2.5:1.5;ctx.stroke();

  // Inner reactor core ring
  const rotMod=$.enemyOffsetMod/8;
  ctx.strokeStyle='hsla('+hue+',100%,75%,.85)';
  ctx.lineWidth=3;
  ctx.beginPath();ctx.arc(0,0,r0-8,rotMod,rotMod+1.4);ctx.stroke();
  ctx.beginPath();ctx.arc(0,0,r0-8,rotMod+$.pi,rotMod+$.pi+1.4);ctx.stroke();

  // Target lock brackets when aimed/locked
  if(aim){
    ctx.strokeStyle='rgba(98,230,255,.9)';ctx.lineWidth=2;
    const brR=r0+8,bRot=t*3;
    for(let b=0;b<4;b++){
      ctx.save();ctx.rotate(b*$.pi/2+bRot);
      ctx.beginPath();
      ctx.moveTo(brR-5,-brR);ctx.lineTo(brR,-brR);ctx.lineTo(brR,-brR+5);
      ctx.stroke();ctx.restore();
    }
  }

  // Segmented Energy Health Pips
  for(let k=0;k<this.lifeMax;k++){
    ctx.fillStyle=k<this.life?'hsla('+hue+',100%,70%,1)':'rgba(255,255,255,.15)';
    ctx.fillRect(-13+k*10,r0+7,8,3);
    ctx.strokeStyle='rgba(0,0,0,.6)';ctx.lineWidth=0.8;
    ctx.strokeRect(-13+k*10,r0+7,8,3);
  }

  // Answer Number Callout
  ctx.fillStyle='#ffffff';
  ctx.font='700 20px "Chakra Petch", sans-serif';
  ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(String(this.num),0,1);

  // Hit damage flash
  if(this.hitFlag>0){
    this.hitFlag-=$.dt;
    ctx.fillStyle='hsla('+hue+',100%,80%,'+this.hitFlag/10+')';
    ctx.beginPath();ctx.arc(0,0,r0,0,$.twopi);ctx.fill();
  }
  ctx.restore();

  // 4. Holographic Answer Plate (Positioned above gunship)
  const L=this.label;
  const minX=-$.screen.x+8,maxX=-$.screen.x+$.cw-L.w-8,minY=-$.screen.y+R.topSafe(),maxY=-$.screen.y+$.ch-L.h-8;
  let lx=this.x-L.w/2,ly=this.y-this.radius-L.h-18;
  lx=Math.max(minX,Math.min(maxX,lx));ly=Math.max(minY,Math.min(maxY,ly));

  this.plate={x:lx,y:ly,w:L.w,h:L.h};
  // Cyber plate canvas
  ctx.drawImage(L.canvas,lx,ly,L.w,L.h);

  // Plate border with glowing neon edge
  ctx.strokeStyle=aim?'hsla(190,100%,65%,1)':'hsla(322,100%,62%,.85)';
  ctx.lineWidth=aim?2.5:1.5;
  ctx.beginPath();
  if(ctx.roundRect)ctx.roundRect(lx+1,ly+1,L.w-2,L.h-2,8);else ctx.rect(lx+1,ly+1,L.w-2,L.h-2);
  ctx.stroke();

  // Option Number Badge on Plate
  ctx.fillStyle=aim?'hsl(190,100%,60%)':'hsl(322,100%,62%)';
  ctx.beginPath();ctx.arc(lx+20,ly+L.h/2,13,0,$.twopi);ctx.fill();
  ctx.fillStyle='#060a10';ctx.font='700 15px "Chakra Petch", sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(String(this.num),lx+20,ly+L.h/2+1);
  ctx.textAlign='left';ctx.textBaseline='alphabetic';

  // Energy Tether connecting plate to gunship
  ctx.save();
  ctx.strokeStyle='hsla('+hue+',100%,65%,'+(aim?'.6':'.3')+')';
  ctx.lineWidth=aim?1.5:1;
  ctx.setLineDash([4,4]);
  ctx.beginPath();
  ctx.moveTo(this.x,this.y-this.radius);
  ctx.lineTo(Math.max(lx+20,Math.min(lx+L.w-20,this.x)),ly+L.h);
  ctx.stroke();
  ctx.restore();
};
$.Carrier.prototype.explode=function(hue,big){
  this.alive=false;
  R.addShockwave(this.x,this.y,hue,big?160:95);
  $.explosions.push(new $.Explosion({x:this.x,y:this.y,radius:big?70:45,hue:hue,saturation:100}));
  $.particleEmitters.push(new $.ParticleEmitter({x:this.x,y:this.y,count:big?40:22,spawnRange:this.radius,friction:.88,minSpeed:4,maxSpeed:22,minDirection:0,maxDirection:$.twopi,hue:hue,saturation:100}));
  $.audio.play(big?'explosionAlt':'explosion');
};

/* ================= Raid controller ================= */
const R=$.raid={active:false,phase:'idle'};
let toastT=0;
R.topSafe=()=>{const qp=Q('#qbar');return qp&&!qp.hidden?qp.getBoundingClientRect().bottom-$.cOffset.top+8:70;};
// The reward reveals the term only after the player selects its description.
function clearAnswerSplash(){R.answerSplash=false;Q('#answerSplash').hidden=true;Q('#answerSplashText').textContent='';}
function showAnswerSplash(term){
  const el=Q('#answerSplash');el.hidden=true;
  Q('#answerSplashText').textContent=(R.cur&&R.cur.cues?'':term.charAt(0).toUpperCase()+' — ')+term.toUpperCase();
  Q('#answerSplashText').className=term.length>36?'long':'';
  void el.offsetWidth; // restart the impact animation for consecutive correct terms
  el.hidden=false;R.answerSplash=true;R.timer=Math.max(R.timer,1.1);
}
R.toast=(msg,plain)=>{const el=Q('#toast');el.textContent=msg;el.className='toast'+(plain?'':' hot');el.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>el.hidden=true,1800);};
/* stage modes: a station can be played as a different mini-game ('race' = ambulance run). Set with a third header field: ## Locus | Topic | race */
const MODES=['race','fps'];
function roomMode(r){if(!r)return'';if(MODES.includes(r.mode))return r.mode;if(r.mode)return'';return/emergenc/i.test(r.topic)?'race':/\bOSCE\b/i.test(r.topic)?'fps':'';}
R.modeName=()=>{if(!(R.active&&R.rooms&&R.rooms[R.si]))return'';const c=R.concept;if(c&&MODES.includes(c.mode))return c.mode;return roomMode(R.rooms[R.si]);};
R.swarmOn=()=>R.active&&(R.phase==='travel'||((R.phase==='fight'||R.phase==='resolve')&&!R.modeName()));
R.swarmRate=()=>R.phase==='fight'?2.2:R.phase==='travel'?1.1:1.6;
R.aimTarget=()=>$.aimLock&&$.aimLock.alive?$.aimLock:(R.hover&&R.hover.alive?R.hover:null);
/* ---------- aim assist: the answer plate counts as part of the target, the nearest gunship snaps, and the current target is sticky ---------- */
const SNAP=70,KEEP=120,PLATE_PAD=10,UNLOCK_MOVE=60;
function inPlate(c,x,y){const p=c.plate;return!!p&&x>=p.x-PLATE_PAD&&x<=p.x+p.w+PLATE_PAD&&y>=p.y-PLATE_PAD&&y<=p.y+p.h+PLATE_PAD;}
R.pickAt=function(x,y,prev){
  let plateHit=null,best=null,bd=1e9;
  $.carriers.forEach(c=>{if(!c.alive)return;if(inPlate(c,x,y)&&!plateHit)plateHit=c;const d=Math.hypot(c.x-x,c.y-y);if(d<c.radius+SNAP&&d<bd){bd=d;best=c;}});
  if(plateHit)return plateHit;
  if(prev&&prev.alive&&Math.hypot(prev.x-x,prev.y-y)<prev.radius+KEEP&&(!best||best===prev||Math.hypot(best.x-x,best.y-y)>Math.hypot(prev.x-x,prev.y-y)*.6))return prev;
  return best;
};
/* where to shoot so the bullet meets a moving gunship */
R.leadPoint=function(c,fx,fy){
  const bs=($.hero&&$.hero.weapon&&$.hero.weapon.bullet&&$.hero.weapon.bullet.speed)||10;
  let tx=c.x,ty=c.y;for(let k=0;k<3;k++){const t=Math.hypot(tx-fx,ty-fy)/bs;tx=c.x+(c.vx||0)*t;ty=c.y+(c.vy||0)*t;}
  return{x:tx,y:ty};
};
R.lockOn=function(c){$.aimLock=c;R.lockAnchor={x:$.mouse.sx||0,y:$.mouse.sy||0};};

R.start=function(rooms,si){
  if(!$.initialized)$.init();
  clearAnswerSplash();
  rooms=rooms.filter(r=>(r.review||r.idx<SLOTS.length)&&r.items.length);
  if(!rooms.length){alertHome('Pick at least one station with questions.');return;}
  showScreen('play');$.resizecb();$.reset();
  Object.assign(R,{active:true,concept:null,clock:0,par:0,timeMax:0,paused:false,lastTick:-1,casings:[],rooms,si:Math.max(0,si||0),phase:'travel',queue:[],cur:null,wave:null,cleared:0,total:0,deaths:0,answered:0,correct:0,streak:0,taken:0,misses:new Map(),dying:0,hover:null});
  R.tier=null;applyArsenal(false);
  const s=SP(R.rooms[R.si].idx);
  if(R.si===0){$.hero.x=Math.min($.ww-30,s.x+170);$.hero.y=s.y+20;}else{const p=SP(R.rooms[R.si-1].idx);$.hero.x=p.x;$.hero.y=p.y;}
  $.screen.x=$.cw/2-$.hero.x;$.screen.y=$.ch/2-$.hero.y;
  $.setDifficulty(R.si);
  objective();hud();$.setState('play');
  ac();applySound();if(musicOn)startMusic();
};
function objective(){
  const r=R.rooms[R.si];
  Q('#qbar').hidden=false;Q('#qChip').textContent='Objective';Q('#qChip').className='chip obj';
  Q('#qText').textContent='Fly to station '+(r.idx+1)+': '+r.locus;Q('#qChain').innerHTML='';Q('#qEta').style.transform='scaleX(0)';
}
R.update=function(){
  if(!R.active)return;
  musicHot=R.phase==='fight'&&R.wave?Math.min(1,.5+R.wave.t*.7):R.phase==='travel'?.4:.2;
  if(R.phase==='travel'){
    const s=SP(R.rooms[R.si].idx);
    if(Math.hypot($.hero.x-s.x,$.hero.y-s.y)<120)openBriefing();
  }else if(R.phase==='fight'&&R.wave&&$.carriers.length){
    const near=$.carriers.filter(c=>c.alive).reduce((m,c)=>Math.min(m,Math.hypot(c.x-$.hero.x,c.y-$.hero.y)),1e9);
    R.wave.t=Math.max(0,Math.min(1,1-(near-60)/(R.wave.r0-60)));
    Q('#qEta').style.transform='scaleX('+(1-R.wave.t).toFixed(3)+')';
  }else if(R.phase==='resolve'){R.timer-=$.dt/60;if(R.timer<=0)afterCorrect();}
  if(R.dying){R.dying-=$.dt/60;if(R.dying<=0){R.dying=0;R.deathCard();}}
  if($.hero.life<=0&&!R.dying&&R.phase!=='dead'&&R.phase!=='swarmdead')swarmDown();
  hud();
};
function openBriefing(){
  const r=R.rooms[R.si];
  const C=R.concept=r.missionConcept||pickConcept(r),basePool=C?C.items:r.items,
    pool=R.campaignRun&&R.campaign?R.campaign.missionItems(basePool):basePool;
  const fresh=pool.filter(i=>!mastered(i)),done=pool.filter(mastered);
  const review=[];
  R.phase='briefing';R.queue=mixQueue(fresh);
  if(R.campaignRun&&r.review)R.queue=mixQueue(pool.filter(i=>!mastered(i)));
  if(R.campaignRun&&C&&C.title.startsWith('OSCE:'))R.queue=R.queue.filter(i=>i.type!=='q').concat(R.queue.filter(i=>i.type==='q'));R.total=R.queue.length;R.cleared=0;
  R.par=Math.max(60,fresh.length*30+review.length*15);R.clock=0;R.m0=masteredCount(r);R.d0=R.deaths;R.timeMax=R.par;
  $.setDifficulty(R.si);
  const m=Math.round(masteredCount(r)/r.items.length*100),mode=R.modeName(),cs=(r.concepts||[]).filter(c=>c.items.length);
  const head=C?'<p class="meta">'+esc(r.topic)+' · concept '+(cs.indexOf(C)+1)+' of '+cs.length+' · '+conceptsDone(r)+' secured so far</p><h2>'+esc(C.title)+'</h2>'+(C.note.length?'<div class="note">'+noteHTML(C.note)+'</div>':''):'<h2>'+esc(r.topic)+'</h2>'+(r.note&&r.note.length?'<div class="note">'+noteHTML(r.note)+'</div>':'');
  card('brief',r.review?'Daily review · '+r.items.length+' due':'Station '+(r.idx+1)+' of '+SLOTS.length+' · '+esc(r.locus),
    head+
    '<div class="plan"><div><b>'+fresh.length+'</b><span>to learn</span></div><div><b>'+(done.length-review.length)+'</b><span>mastered, skipped</span></div><div><b>'+review.length+'</b><span>review</span></div><div><b>'+(timerOn?fmt(R.par):'off')+'</b><span>par time</span></div></div>'+
    '<div class="mbar"><i style="width:'+m+'%"></i></div><p class="meta">'+arsenalLine()+'</p><p class="meta">'+m+'% of this station mastered. An item is mastered after 3 correct answers in a row. Mastered items are permanently retired from gameplay, so the station gets shorter and par gets easier to beat. The clock stops whenever a card is open, so reading never costs you time, and you cannot fail on time.</p>'+
    (mode==='race'?'<p class="meta"><b>Ambulance run.</b> Each question is a gantry of answer lanes. Steer into the right lane with ←/→, the left stick, the mouse or keys 1 to 4. Hold ↑ to boost for more points, or ↓ to brake for more reading time.</p>':mode==='fps'?'<p class="meta"><b>Ward round (first person).</b> The answer panels walk towards you. Aim with the mouse (the screen edges turn you) or ←/→ and the sticks. Fire with click, Space, F or the pad trigger. Keys 1 to 4, or tapping a card, lock on. Each panel takes 3 hits, so a stray shot won\'t pick an answer.</p>':''),
    mode==='race'?'Start the run':mode==='fps'?'Start the ward round':'Begin assault',()=>{R.phase='fight';nextQuestion();},400);
}
function fmt(sec){sec=Math.max(0,Math.ceil(sec));return Math.floor(sec/60)+':'+String(sec%60).padStart(2,'0');}
let tLast=performance.now();
function timerLoop(now){
  const dt=Math.min(.25,(now-tLast)/1000);tLast=now;
  if(R.active&&timerOn&&R.par&&!R.paused&&Q('#cardWrap').hidden&&$.state==='play'&&['fight','resolve','dead','swarmdead'].includes(R.phase)){
    R.clock+=dt;
    const el=Q('#hTime');if(el){el.textContent=fmt(R.clock);el.classList.toggle('over',R.clock>R.par);}
    const tb=Q('#hTimeBar');if(tb){tb.style.transform='scaleX('+Math.min(1,R.clock/R.par).toFixed(3)+')';tb.classList.toggle('over',R.clock>R.par);}
  }
  requestAnimationFrame(timerLoop);
}
requestAnimationFrame(timerLoop);
function nextQuestion(){
  const eligible=R.queue.filter(it=>!mastered(it));R.total=Math.max(R.cleared,R.total-(R.queue.length-eligible.length));R.queue=eligible;
  if(!R.queue.length){stationCleared();return;}
  R.cur=R.queue.shift();R.cur.found=[];setupWave();
}
R.optionLabel=text=>R.cur&&R.cur.clues&&R.cur.clues[text]||text;
function setupWave(){
  clearAnswerSplash();
  const it=R.cur;let opts,correct,chip;
  if(it.type==='q'){opts=qOptions(it);correct=[it.answer];chip='Shoot the correct answer';}
  else{
    const rem=it.seq.filter(x=>!it.found.includes(x)),c=it.type==='l'?it.seq[it.found.length]:pickOne(rem);
    opts=[c];
    if(it.type==='l'){const k=it.found.length;[it.seq[k+1],it.seq[k+2],it.seq[k+3]].forEach(x=>{if(x&&opts.length<3&&!opts.includes(x))opts.push(x);});}
    for(const x of shuffle(it.decoys||[])){if(opts.length>=4)break;if(!opts.includes(x)&&!it.seq.includes(x))opts.push(x);}
    if(opts.length<4)for(const x of shuffle(ALL_LIST.concat(ALL_ANS).filter(a=>a.room!==it.room).map(a=>a.t))){if(opts.length>=4)break;if(!opts.includes(x)&&!it.seq.includes(x))opts.push(x);}
    if(it.cues)opts=[c].concat(shuffle(it.seq.filter(x=>x!==c)).slice(0,3));
    opts=shuffle(opts);correct=it.type==='l'?[c]:rem;
    chip=it.type==='l'?(it.cues?'Process · choose action ':Object.keys(it.clues||{}).length?'Mnemonic · shoot meaning ':'Procedure · shoot step ')+(it.found.length+1)+' of '+it.seq.length+' in order':'List · any order · '+rem.length+' of '+it.seq.length+' left';
  }
  const len=it.prompt.length+opts.map(R.optionLabel).join('').length,dur=Math.max(14,Math.min(28,11+len/16));
  const r0=Math.max(220,Math.min($.cw,$.ch)*.44);
  R.wave={opts,correct,chip,t:0,r0,speed:(r0-60)/(dur*60)};
  $.carriers.length=0;$.aimLock=null;R.hover=null;
  const a0=Math.random()*$.twopi,m=r0*.85+60;
  const cx=Math.max(r0+40,Math.min($.ww-r0-40,$.hero.x)),cy=Math.max(m,Math.min($.wh-m,$.hero.y));
  opts.forEach((text,i)=>{const a=a0+i*$.twopi/opts.length;$.carriers.push(new $.Carrier({text,num:i+1,x:cx+Math.cos(a)*r0,y:cy+Math.sin(a)*r0*.85}));});
  if(R.modeName()==='race'&&R.raceStart){$.carriers.length=0;R.raceStart(R.wave);}
  if(R.modeName()==='fps'&&R.fpsStart){$.carriers.length=0;R.fpsStart(R.wave);}
  Q('#qbar').hidden=false;Q('#qChip').textContent=chip;Q('#qChip').className='chip';Q('#qText').textContent=it.cues?it.prompt.replace(': the phases of the station, in order','')+' · '+it.cues[it.found.length]+' ('+(it.found.length+1)+'/'+it.seq.length+'): choose the action':it.prompt+(it.type==='l'&&Object.keys(it.clues||{}).length?' · '+it.seq[it.found.length][0].toUpperCase()+' ('+(it.found.length+1)+'/'+it.seq.length+'): choose its meaning':'');
  Q('#qChain').innerHTML=it.type!=='q'&&it.found.length?it.found.map(x=>'<span>'+esc(x)+'</span>').join(''):'';
  R.phase='fight';
  if(R.modeName()==='race'){R.wave.chip=it.type==='q'?'Drive into the correct lane':chip.replace(/^Procedure · shoot/,'Procedure · drive through');if(R.phase==='fight')Q('#qChip').textContent=R.wave.chip;}
  synth('wave');hud();
}
R.carrierDown=function(c){
  const it=R.cur,ok=R.wave.correct.includes(c.text);R.answered++;R.wasMastered=mastered(it);
  if(ok){
    R.correct++;R.streak++;const mult=Math.min(5,1+Math.floor(R.streak/3)),pts=Math.round((150+250*(1-R.wave.t))*mult);$.score+=pts;
    c.explode(190,true);$.textPops.push(new $.TextPop({x:c.x,y:c.y,value:pts,hue:190,saturation:100,lightness:70}));
    $.carriers.forEach((o,k)=>{if(o!==c&&o.alive)setTimeout(()=>{if(o.alive)o.explode(20,false);},140+k*110);});
    $.spawnPowerup(c.x,c.y,true);$.rumble.level=10;synth('correct');
    if(it.type==='q'){grade(it.id,true);if(R.campaign)R.campaign.recordItem(it);R.cleared++;reinforce(it);R.lastWave=R.wave;R.phase='resolve';R.timer=.9;R.after='q';newlyMastered(it);}
    else{it.found.push(c.text);Q('#qChain').innerHTML=it.found.map(x=>'<span>'+esc(x)+'</span>').join('');
      if(it.found.length===it.seq.length){grade(it.id,true);if(R.campaign)R.campaign.recordItem(it);R.cleared++;reinforce(it);R.phase='resolve';R.timer=.9;R.after='list';newlyMastered(it);}
      else{R.phase='resolve';R.timer=.6;R.after='step';Q('#qChain').innerHTML=it.found.map(x=>'<span>'+esc(x)+'</span>').join('');}}
    if(R.campaign)R.campaign.onCorrect();
    if(it.clues&&it.clues[c.text])showAnswerSplash(c.text);
    R.toast((c.rammed?'Rammed it! ':'')+(it.type==='q'?'Correct: ':'Correct step: ')+c.text,true);
  }else{
    c.explode(0,false);R.die(c.text);
  }
  hud();
};
/* drill mode: once a missed question is finally answered right, it comes back once more 2 to 3 questions later */
function reinforce(it){
  if(mastered(it)||(!R.campaignRun&&deathMode!=='drill')||!it.drillMiss)return;
  it.drillMiss=false;
  const pos=Math.min(R.queue.length,2+Math.floor(Math.random()*2));
  R.queue.splice(pos,0,it);R.total++;
  setTimeout(()=>R.toast('Got it. It comes back once more after '+pos+' more question'+(pos===1?'':'s')+' to lock it in.',true),1100);
}
function newlyMastered(it){if(!R.wasMastered&&mastered(it)){setTimeout(()=>{R.toast('Mastered! This one drops out of future runs.',true);synth('mastered');},500);applyArsenal(true);}}
function afterCorrect(){
  clearAnswerSplash();
  const it=R.cur;
  $.carriers.length=0;$.aimLock=null;
  if(R.after==='step'){setupWave();return;}
  if(mastered(it)){nextQuestion();return;}
  if(teachAll&&!R.campaignRun){learnCard(it);}else nextQuestion();
}
function learnCard(it){
  let body='<p class="cq">'+esc(it.prompt)+'</p>';
  if(it.type==='q'){
    body+='<div class="ans good"><span class="lbl">Answer</span><b>'+esc(it.answer)+'</b></div>';
    if(it.note.length)body+='<div class="note">'+noteHTML(it.note)+'</div>';
    const others=(R.lastWave?R.lastWave.opts:[]).filter(o=>o!==it.answer);
    if(others.length)body+='<div class="others"><span class="lbl">Why the other options were wrong</span><ul>'+others.map(o=>'<li><b>'+esc(o)+'</b><span>'+esc(reasonFor(it,o))+'</span></li>').join('')+'</ul></div>';
  }else{
    body+='<div class="ans good"><span class="lbl">'+(it.type==='l'?'In order':'All of them')+'</span>'+(it.type==='l'?'<ol>':'<ul>')+it.seq.map(x=>'<li>'+esc(x)+'</li>').join('')+(it.type==='l'?'</ol>':'</ul>')+'</div>';
    if(it.note.length)body+='<div class="note">'+noteHTML(it.note)+'</div>';
    const d=(it.decoys||[]).filter(x=>it.why&&it.why[x]);
    if(d.length)body+='<div class="others"><span class="lbl">Traps in this round</span><ul>'+d.map(o=>'<li><b>'+esc(o)+'</b><span>'+esc(it.why[o])+'</span></li>').join('')+'</ul></div>';
  }
  card('learn',it.type==='q'?'Correct':it.type==='l'?'Procedure complete':'List complete',body,R.queue.length?'Next':'Finish station',nextQuestion,700);
}
R.die=function(picked){
  clearAnswerSplash();
  const it=R.cur;R.phase='dead';R.deaths++;R.streak=0;grade(it.id,false);
  const prev=R.misses.get(it.id);R.misses.set(it.id,{item:it,pick:picked||(prev&&prev.pick)||null,n:(prev?prev.n:0)+1});
  R.deadInfo={picked,opts:R.wave?R.wave.opts.slice():[],found:(it.found||[]).slice()};
  $.carriers.forEach(o=>{if(o.alive)o.explode(0,false);});
  $.hero.life=0;$.rumble.level=25;$.audio.play('death');synth('killed');
  $.explosions.push(new $.Explosion({x:$.hero.x,y:$.hero.y,radius:60,hue:0,saturation:100}));
  $.particleEmitters.push(new $.ParticleEmitter({x:$.hero.x,y:$.hero.y,count:50,spawnRange:10,friction:.95,minSpeed:2,maxSpeed:22,minDirection:0,maxDirection:$.twopi,hue:0,saturation:100}));
  Q('#hurt').classList.add('on');R.dying=1.1;hud();
};
R.overrun=function(){if(R.phase==='fight')R.die(null);};
R.deathCard=function(){
  Q('#hurt').classList.remove('on');
  const dm=R.campaignRun?'drill':deathMode,it=R.cur,{picked,opts,found}=R.deadInfo;let body='<p class="cq">'+esc(it.prompt)+'</p>';
  if(it.type==='q'){
    if(picked)body+='<div class="ans bad"><span class="lbl">You picked</span><b>'+esc(picked)+'</b><span>'+esc(reasonFor(it,picked))+'</span></div>';
    else body+='<div class="ans bad"><span class="lbl">Overrun</span><span>The answers reached you before you destroyed the right one.</span></div>';
    body+='<div class="ans good"><span class="lbl">Correct answer</span><b>'+esc(it.answer)+'</b></div>';
    if(it.note.length)body+='<div class="note">'+noteHTML(it.note)+'</div>';
    const others=opts.filter(o=>o!==it.answer&&o!==picked);
    if(others.length)body+='<div class="others"><span class="lbl">The other wrong options</span><ul>'+others.map(o=>'<li><b>'+esc(o)+'</b><span>'+esc(reasonFor(it,o))+'</span></li>').join('')+'</ul></div>';
  }else{
    if(picked){let why;
      if(it.type==='l'&&it.seq.includes(picked))why='It is on this list, but it is step '+(it.seq.indexOf(picked)+1)+'. You needed step '+(found.length+1)+'.';
      else why=reasonFor(it,picked);
      body+='<div class="ans bad"><span class="lbl">You picked</span><b>'+esc(picked)+'</b><span>'+esc(why)+'</span></div>';}
    else body+='<div class="ans bad"><span class="lbl">Overrun</span><span>The answers reached you before you destroyed the right one.</span></div>';
    body+='<div class="ans good"><span class="lbl">'+(it.type==='l'?'The full procedure, in order':'The full list')+'</span>'+(it.type==='l'?'<ol>':'<ul>')+it.seq.map(x=>'<li>'+esc(x)+'</li>').join('')+(it.type==='l'?'</ol>':'</ul>')+'</div>';
    if(it.note.length)body+='<div class="note">'+noteHTML(it.note)+'</div>';
  }
  body+='<p class="meta">'+(dm==='restart'?'This station restarts from the beginning.':dm==='drill'?'Drill mode: this question comes straight back until you get it right, then once more 2 to 3 questions later.':'This one goes back into the station queue. You will see it again.')+'</p>';
  card('death',picked?(R.modeName()==='race'?'Wrong lane':'Killed'):'Overrun',body,'Respawn',respawn,2500);
};
function respawn(){
  const it=R.cur,dm=R.campaignRun?'drill':deathMode;it.found=[];
  if(dm==='restart'){R.queue=mixQueue(R.rooms[R.si].items.filter(i=>!mastered(i)));R.total=R.queue.length;R.cleared=0;}
  else if(dm==='drill'){it.drillMiss=true;R.queue.unshift(it);}
  else{const pos=R.queue.length?1+Math.floor(Math.random()*R.queue.length):0;R.queue.splice(pos,0,it);}
  $.hero.life=1;$.enemies.length=0;$.carriers.length=0;$.bullets.length=0;
  R.phase='fight';nextQuestion();
  if(dm==='drill')setTimeout(()=>R.toast('Same question again. Get it right to move on.',true),400);
  else if(dm==='shuffle')setTimeout(()=>R.toast('Missed questions come back later. The station falls only when every one is answered correctly.',true),400);
}
function swarmDown(){
  clearAnswerSplash();
  R.phase='swarmdead';R.deaths++;R.streak=0;$.rumble.level=25;$.audio.play('death');synth('killed');
  $.carriers.forEach(o=>{if(o.alive)o.explode(0,false);});
  $.explosions.push(new $.Explosion({x:$.hero.x,y:$.hero.y,radius:60,hue:0,saturation:0}));
  setTimeout(()=>card('death','Overrun by the swarm','<p>Your health ran out. The swarm doesn\'t test knowledge. It just keeps the pressure on, so keep moving and pick up health packs.</p><p class="meta">You respawn at full health. The current question restarts.</p>','Respawn',()=>{
    $.hero.life=1;$.enemies.length=0;$.bullets.length=0;
    if(R.cur&&R.cur.type!=='q')R.cur.found=[];
    if(R.cur){R.phase='fight';setupWave();}else{R.phase='travel';objective();}
  },900),1000);
}
function stationCleared(){
  const r=R.rooms[R.si],s=SP(r.idx),C=R.concept;
  if(C){cdone.add(ckey(r,C));store.set('cdone',[...cdone]);}
  const csN=(r.concepts||[]).filter(c=>c.items.length).length,allC=!C||conceptsDone(r)>=csN;
  if(allC&&!r.review){captured.add(r.topic);store.set('captured',[...captured]);}R.taken++;
  $.score+=1000;synth('captured');$.rumble.level=14;
  for(let k=0;k<6;k++)setTimeout(()=>{$.explosions.push(new $.Explosion({x:s.x+rand(-60,60),y:s.y+rand(-60,60),radius:rand(30,70),hue:190,saturation:100}));$.audio.play('explosionAlt');},k*160);
  $.levelPops.push(new $.LevelPop({level:r.idx+1}));
  $.carriers.length=0;
  const bestTimes=store.get('bestTime',{}),prevBest=bestTimes[r.topic];
  let timeHTML='';
  if(timerOn&&R.par){
    const under=R.clock<=R.par;if(under)$.score+=500;
    if(!prevBest||R.clock<prevBest){bestTimes[r.topic]=R.clock;store.set('bestTime',bestTimes);}
    timeHTML='<div class="plan"><div><b>'+fmt(R.clock)+'</b><span>your time (reading excluded)</span></div><div><b>'+fmt(R.par)+'</b><span>par</span></div><div><b class="'+(under?'win':'')+'">'+(under?'Beat par':'Over par')+'</b><span>'+(under?'+500 bonus':'no penalty')+'</span></div><div><b>'+fmt(Math.min(R.clock,prevBest||R.clock))+'</b><span>best time here</span></div></div>';
  }
  const mNow=masteredCount(r),left=r.items.filter(i=>!mastered(i));
  let body=(C?'<p class="cq">Concept secured: '+esc(C.title)+'</p><p class="meta">'+conceptsDone(r)+' of '+csN+' concepts secured at '+esc(r.locus)+(allC?'. The whole station is yours.':'. The next run here plays the next concept.')+'</p>':'<p class="cq">'+esc(r.locus)+' is yours.</p>')+timeHTML+
    '<div class="mbar"><i style="width:'+Math.round(mNow/r.items.length*100)+'%"></i></div>'+
    '<p class="meta">'+mNow+' of '+r.items.length+' mastered here ('+(mNow-R.m0>=0?'+'+(mNow-R.m0):mNow-R.m0)+' this run) · '+(R.deaths-R.d0)+' death'+(R.deaths-R.d0===1?'':'s')+' here.</p>';
  if(left.length)body+='<div class="others"><span class="lbl">Still to master here (they come back next time)</span><ul>'+left.slice(0,8).map(it=>'<li><b>'+esc(it.prompt)+'</b><span>'+esc(it.type==='q'?it.answer:it.seq.join(' → '))+'</span></li>').join('')+(left.length>8?'<li><span>…and '+(left.length-8)+' more. See Study the stations.</span></li>':'')+'</ul></div>';
  else body+='<p>Every item here is mastered and retired from gameplay.</p>';
  if(R.onCampaignClear&&R.onCampaignClear())return;
  const nxt=R.si+1<R.rooms.length?R.rooms[R.si+1]:null;
  card('learn',C&&!allC?'Concept secured':'Station taken',body,nxt?'Advance to '+nxt.locus:'Finish the raid',()=>{
    if(nxt){R.si++;R.phase='travel';objective();}else victory();
  },600);
}
function victory(){
  R.phase='won';if($.score>best){best=$.score;store.set('best',best);}
  const all=mapRooms().filter(r=>r.items.length).every(r=>captured.has(r.topic));
  card('learn',all?'FNPH taken':'Route complete','<p>'+R.taken+' station'+(R.taken===1?'':'s')+' captured · '+R.deaths+' death'+(R.deaths===1?'':'s')+' · score '+$.score.toLocaleString()+'</p><p class="meta">Your debrief lists every question that killed you, with the teaching notes.</p>','See debrief',debrief,500);
}
R.pause=function(){
  if(!R.active||$.state!=='play'||R.phase==='dead'||R.phase==='swarmdead'||R.dying)return;
  const r=R.rooms[R.si];
  R.paused=true;
  card('pause','Paused','<p>Station '+(r.idx+1)+': '+esc(r.locus)+'. Captured stations are saved.</p><div class="row"><button class="btn" id="cEnd">End raid and see debrief</button><button class="btn ghost" id="cHome">Back to base</button></div>','Resume',()=>{},0);
  Q('#cEnd').onclick=()=>{closeCard(true);debrief();};
  Q('#cHome').onclick=()=>{closeCard(true);quitToHome();};
};
function quitToHome(){clearAnswerSplash();R.active=false;R.campaignRun=false;stopMusic();$.setState('idle');renderHome();showScreen('home');}

/* ---------- cards ---------- */
let cardCb=null,cardReadyAt=0;
function card(kind,title,body,btn,cb,delay){
  $.setState('freeze');$.mouse.down=0;
  const el=Q('#card');el.className='card '+kind;
  Q('#cardInner').innerHTML='<p class="kicker">'+esc(title)+'</p>'+body;
  const b=Q('#cardBtn');b.textContent=btn;b.disabled=true;cardCb=cb;cardReadyAt=performance.now()+(delay||0);
  Q('#cardWrap').hidden=false;Q('#cardInner').scrollTop=0;synth('card');
  const tick=()=>{if(Q('#cardWrap').hidden)return;const left=cardReadyAt-performance.now();if(left<=0){b.disabled=false;b.focus({preventScroll:true});Q('#cardBar').style.transform='scaleX(1)';}else{Q('#cardBar').style.transform='scaleX('+(1-left/(delay||1)).toFixed(3)+')';requestAnimationFrame(tick);}};
  Q('#cardBar').style.transform='scaleX(0)';tick();
}
function closeCard(skipCb){
  if(!skipCb&&performance.now()<cardReadyAt)return;
  Q('#cardWrap').hidden=true;const cb=cardCb;cardCb=null;R.paused=false;
  if(R.active&&R.phase!=='won')$.setState('play');
  if(!skipCb&&cb)cb();
}
Q('#cardBtn').addEventListener('click',()=>closeCard());

/* ---------- HUD ---------- */
let hudKey='';
function globalBar(){
  const rr=R.active?R.rooms:routeRooms();let tot=0,mt=0;
  const segs=rr.map((r,i)=>{const n=r.items.length,m=masteredCount(r);tot+=n;mt+=m;
    return '<span class="seg'+(captured.has(r.topic)?' cap':'')+(R.active&&i===R.si?' cur':'')+'" title="'+esc(r.locus)+': '+m+'/'+n+' mastered"><i style="width:'+(n?m/n*100:0)+'%"></i></span>';}).join('');
  const taken=rr.filter(r=>captured.has(r.topic)).length;
  return{html:segs,label:'Overall: '+(tot?Math.round(mt/tot*100):0)+'% mastered ('+mt+'/'+tot+') · '+taken+'/'+rr.length+' stations taken',key:mt+'/'+taken+'/'+(R.active?R.si:-1)};
}
let gKey='';
function updateGlobal(){const g=globalBar();if(g.key===gKey)return;gKey=g.key;Q('#gSegs').innerHTML=g.html;Q('#gLabel').textContent=g.label;}
function hud(){
  if(R.campaign)R.campaign.updateRibbon();
  if(!R.active)return;
  updateGlobal();
  const r=R.rooms[R.si],tot=R.total||r.items.length,done=R.phase==='travel'?0:R.cleared;
  const key=[r.idx,done,tot,$.score,R.deaths,R.streak,Math.round($.hero.life*20),R.par,R.phase].join('|');if(key===hudKey)return;hudKey=key;
  Q('#hStn').textContent=R.campaignRun&&R.campaign?R.campaign.hudLabel():'Station '+(R.si+1)+' of '+R.rooms.length;Q('#hLoc').textContent=(r.idx+1)+'. '+r.locus;Q('#hTopic').textContent=R.concept?r.topic+' · '+R.concept.title:r.topic;
  Q('#hProg').style.width=(tot?done/tot*100:0)+'%';Q('#hCount').textContent=done+' / '+tot+' cleared';
  Q('#hScore').textContent=$.score.toLocaleString();Q('#hStreak').textContent='×'+Math.min(5,1+Math.floor(R.streak/3));Q('#hDeaths').textContent=R.deaths;
  Q('#hLife').style.width=Math.max(0,$.hero.life*100)+'%';
  Q('#hPar').textContent=timerOn&&R.par?'par '+fmt(R.par):timerOn?'par --':'clock off';if(!timerOn||!R.par){Q('#hTime').textContent=timerOn?'0:00':'--';Q('#hTimeBar').style.transform='scaleX(0)';}Q('#hLife').style.background='hsl('+Math.max(0,$.hero.life)*120+',90%,50%)';
}

/* ---------- shockwaves & world drawing ---------- */
R.shockwaves=[];
R.addShockwave=function(x,y,hue,maxR){
  R.shockwaves.push({x:x,y:y,r:8,maxR:maxR||100,hue:hue||195,alpha:1,w:4});
};
function updateShockwaves(){
  for(let i=R.shockwaves.length-1;i>=0;i--){
    const sw=R.shockwaves[i];
    sw.r+=(sw.maxR-sw.r)*0.16*$.dt+2.5*$.dt;
    sw.alpha=Math.max(0,1-sw.r/sw.maxR);
    sw.w=Math.max(1,4*sw.alpha);
    if(sw.r>=sw.maxR-2||sw.alpha<=0.02)R.shockwaves.splice(i,1);
  }
}
function drawShockwaves(c){
  for(let i=0;i<R.shockwaves.length;i++){
    const sw=R.shockwaves[i];
    c.save();
    // Primary shockwave ring
    c.beginPath();c.arc(sw.x,sw.y,sw.r,0,$.twopi);
    c.strokeStyle='hsla('+sw.hue+',100%,75%,'+(sw.alpha*.85)+')';
    c.lineWidth=sw.w;c.stroke();
    // Inner bright energy refraction
    c.beginPath();c.arc(sw.x,sw.y,Math.max(1,sw.r-3),0,$.twopi);
    c.strokeStyle='rgba(255,255,255,'+(sw.alpha*.65)+')';
    c.lineWidth=Math.max(1,sw.w*.5);c.stroke();
    c.restore();
  }
}

R.renderMap=function(){
  const c=$.ctxmg;c.fillStyle='#05080d';c.fillRect(0,0,$.cw,$.ch);
  if(mapCanvas)c.drawImage(mapCanvas,Math.round($.screen.x-$.rumble.x),Math.round($.screen.y-$.rumble.y));
};
R.renderWorld=function(){
  const c=$.ctxmg,t=$.tick/60;
  updateCasings();drawCasings(c);
  updateShockwaves();drawShockwaves(c);

  // route path
  c.save();c.setLineDash([10,10]);c.lineDashOffset=-t*30;c.strokeStyle='rgba(242,184,75,.45)';c.lineWidth=2;c.beginPath();
  R.rooms.forEach((r,i)=>{const p=SP(r.idx);if(i===0)c.moveTo(p.x,p.y);else c.lineTo(p.x,p.y);});c.stroke();c.restore();

  R.rooms.forEach((r,i)=>{
    const p=SP(r.idx),cap=captured.has(r.topic),cur=i===R.si,col=cap?'98,230,255':cur?'255,90,60':'242,184,75';
    const pulse=cur?1+.15*Math.sin(t*5):1;

    // Active station glowing beacon pillar rising upwards
    if(cur){
      c.save();
      const bg=c.createLinearGradient(p.x,p.y,p.x,p.y-240);
      bg.addColorStop(0,'rgba(255,90,60,.45)');
      bg.addColorStop(0.5,'rgba(255,140,80,.14)');
      bg.addColorStop(1,'rgba(255,90,60,0)');
      c.fillStyle=bg;
      c.beginPath();
      c.moveTo(p.x-30,p.y);c.lineTo(p.x-8,p.y-240);c.lineTo(p.x+8,p.y-240);c.lineTo(p.x+30,p.y);
      c.closePath();c.fill();
      c.restore();
    }

    c.fillStyle='rgba('+col+',.08)';c.beginPath();c.arc(p.x,p.y,90*pulse,0,$.twopi);c.fill();
    c.strokeStyle='rgba('+col+','+(cur?.9:.55)+')';c.lineWidth=cur?3:2;c.beginPath();c.arc(p.x,p.y,34,0,$.twopi);c.stroke();
    c.beginPath();c.arc(p.x,p.y,90*pulse,t,t+1.4);c.stroke();c.beginPath();c.arc(p.x,p.y,90*pulse,t+$.pi,t+$.pi+1.4);c.stroke();
    c.fillStyle='rgba('+col+',1)';c.font='700 22px "Chakra Petch", sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(String(r.idx+1),p.x,p.y+1);
    c.font='600 14px "Chakra Petch", sans-serif';c.lineWidth=4;c.strokeStyle='rgba(4,6,10,.9)';c.strokeText(r.locus+(cap?' · taken':''),p.x,p.y+52);c.fillStyle='rgba(236,241,232,.95)';c.fillText(r.locus+(cap?' · taken':''),p.x,p.y+52);
    if(cap){c.strokeStyle='rgba(98,230,255,1)';c.lineWidth=2;c.beginPath();c.moveTo(p.x+20,p.y-20);c.lineTo(p.x+20,p.y-62);c.stroke();c.fillStyle='rgba(98,230,255,.9)';c.beginPath();c.moveTo(p.x+20,p.y-62);c.lineTo(p.x+50,p.y-54+Math.sin(t*4)*3);c.lineTo(p.x+20,p.y-46);c.fill();}
    c.textAlign='left';c.textBaseline='alphabetic';
  });
};
R.renderAim=function(){
  const c=$.ctxmg,h=$.hero;
  R.refreshHover();
  drawTactical(c);
  // objective arrow while travelling
  if(R.phase==='travel'){const s=SP(R.rooms[R.si].idx),dx=s.x-h.x,dy=s.y-h.y,d=Math.hypot(dx,dy);
    if(d>140){const a=Math.atan2(dy,dx),r0=46;c.save();c.translate(h.x+Math.cos(a)*r0,h.y+Math.sin(a)*r0);c.rotate(a);c.fillStyle='rgba(255,90,60,'+(.6+.4*Math.sin($.tick/6))+')';c.beginPath();c.moveTo(14,0);c.lineTo(-6,-9);c.lineTo(-2,0);c.lineTo(-6,9);c.closePath();c.fill();c.restore();
      c.font='600 13px "Chakra Petch", sans-serif';c.fillStyle='rgba(255,200,180,.9)';c.textAlign='center';c.fillText(Math.round(d/10)+' m',h.x+Math.cos(a)*74,h.y+Math.sin(a)*74+4);c.textAlign='left';}}
  // aim line to locked / hovered answer
  const tg=R.aimTarget();
  if(tg&&h.life>0){c.save();c.setLineDash([4,6]);c.strokeStyle='rgba(98,230,255,.5)';c.lineWidth=1.5;c.beginPath();c.moveTo(h.x,h.y);c.lineTo(tg.x,tg.y);c.stroke();c.restore();
  }
};
R.renderLighting=function(){
  const c=$.ctxmg,h=$.hero;
  if(h.life<=0)return;

  c.save();
  c.globalCompositeOperation='lighter';

  // 1. Player Engine & Chassis Bloom
  const engGrad=c.createRadialGradient(h.x,h.y,4,h.x,h.y,60);
  engGrad.addColorStop(0,'rgba(98,230,255,.24)');
  engGrad.addColorStop(0.5,'rgba(98,230,255,.08)');
  engGrad.addColorStop(1,'rgba(0,0,0,0)');
  c.fillStyle=engGrad;
  c.beginPath();c.arc(h.x,h.y,60,0,$.twopi);c.fill();

  // 2. Active Station Pad Beacon Glow
  if(R.rooms&&R.rooms[R.si]){
    const sp=SP(R.rooms[R.si].idx);
    const sg=c.createRadialGradient(sp.x,sp.y,10,sp.x,sp.y,150);
    sg.addColorStop(0,'rgba(255,90,60,.28)');
    sg.addColorStop(0.5,'rgba(255,140,80,.09)');
    sg.addColorStop(1,'rgba(0,0,0,0)');
    c.fillStyle=sg;
    c.beginPath();c.arc(sp.x,sp.y,150,0,$.twopi);c.fill();
  }

  // 3. Bullet Plasma Blooms
  const nb=Math.min(25,$.bullets.length);
  for(let i=0;i<nb;i++){
    const b=$.bullets[i];
    if(b.inView){
      const bg=c.createRadialGradient(b.x,b.y,1,b.x,b.y,22);
      bg.addColorStop(0,'rgba(255,235,170,.4)');
      bg.addColorStop(0.5,'rgba(255,160,60,.12)');
      bg.addColorStop(1,'rgba(0,0,0,0)');
      c.fillStyle=bg;
      c.beginPath();c.arc(b.x,b.y,22,0,$.twopi);c.fill();
    }
  }

  // 4. Explosion Blasts Bloom
  for(let i=0;i<$.explosions.length;i++){
    const ex=$.explosions[i];
    const er=ex.radius*2.2;
    const eg=c.createRadialGradient(ex.x,ex.y,2,ex.x,ex.y,er);
    eg.addColorStop(0,'rgba(255,255,255,.55)');
    eg.addColorStop(0.35,'hsla('+ex.hue+',100%,70%,.35)');
    eg.addColorStop(1,'rgba(0,0,0,0)');
    c.fillStyle=eg;
    c.beginPath();c.arc(ex.x,ex.y,er,0,$.twopi);c.fill();
  }

  // 5. Living Carrier Gunship Core Energy Fields
  for(let i=0;i<$.carriers.length;i++){
    const cr=$.carriers[i];
    if(cr.alive){
      const aim=R.aimTarget()===cr;
      const cg=c.createRadialGradient(cr.x,cr.y,6,cr.x,cr.y,75);
      cg.addColorStop(0,aim?'rgba(98,230,255,.32)':'rgba(255,79,168,.28)');
      cg.addColorStop(0.5,aim?'rgba(98,230,255,.1)':'rgba(255,79,168,.08)');
      cg.addColorStop(1,'rgba(0,0,0,0)');
      c.fillStyle=cg;
      c.beginPath();c.arc(cr.x,cr.y,75,0,$.twopi);c.fill();
    }
  }

  c.restore();
};
R.minimap=function(m){
  R.rooms.forEach((r,i)=>{const p=SP(r.idx);$.ctxmg.fillStyle=captured.has(r.topic)?'#62e6ff':i===R.si?'#ff5a3c':'#f2b84b';$.ctxmg.fillRect(m.x+p.x*m.scale-2,m.y+p.y*m.scale-2,4,4);});
  $.carriers.forEach(cr=>{if(cr.alive){$.ctxmg.fillStyle='#ff4fa8';$.ctxmg.fillRect(m.x+cr.x*m.scale-1,m.y+cr.y*m.scale-1,3,3);}});
};

/* ---------- input: mouse hover, keys, controller ---------- */
R.onMouseMove=function(){
  if(!R.active)return;$.pad.aim=null;padCur.on=false;
  R.hover=R.pickAt($.mouse.x,$.mouse.y,R.hover);
  // a key or controller lock survives small mouse jitter; it clears once the mouse really moves away
  if($.aimLock){const a=R.lockAnchor||{x:0,y:0};if(R.hover!==$.aimLock&&Math.hypot(($.mouse.sx||0)-a.x,($.mouse.sy||0)-a.y)>UNLOCK_MOVE)$.aimLock=null;}
};
/* called every frame: keep the mouse target up to date as the gunships move */
R.refreshHover=function(){
  if(!R.active||$.pad.aim!=null||padCur.on)return;
  $.mouse.x=($.mouse.sx||0)-$.screen.x;$.mouse.y=($.mouse.sy||0)-$.screen.y;
  R.hover=R.pickAt($.mouse.x,$.mouse.y,R.hover);
};
let keyFire=0;
document.addEventListener('keydown',e=>{
  if(Q('#play').hidden)return;
  if(!Q('#cardWrap').hidden){if(e.key==='Enter'||e.key===' '){e.preventDefault();closeCard();}return;}
  if(!R.active||R.phase!=='fight')return;
  if(e.key>='1'&&e.key<='4'){const c=$.carriers.find(c=>c.num===+e.key&&c.alive);if(c){R.lockOn(c);synth('lock');R.toast('Locked on '+c.num+' · '+R.optionLabel(c.text),true);}e.preventDefault();}
  else if(e.key==='Tab'){cycleLock(1);e.preventDefault();}
  else if(e.key===' '){keyFire=1;e.preventDefault();}
});
document.addEventListener('keyup',e=>{if(e.key===' ')keyFire=0;});
function cycleLock(dir){
  padCur.on=false;
  const live=$.carriers.filter(c=>c.alive).sort((a,b)=>a.num-b.num);if(!live.length)return;
  const i=live.indexOf($.aimLock);R.lockOn(live[(i+dir+live.length)%live.length]);synth('lock');R.toast('Locked on '+$.aimLock.num+' · '+R.optionLabel($.aimLock.text),true);
}
R.input=function(){ $.keyFire=keyFire; };
let padPrev=[],padId='',padBase=null;const padCur={on:false,x:0,y:0};let padSens=store.get('padSens',1);
let padMap=store.get('padMap2',null);
let wiz=null; // controller setup wizard state
function readPad(){let p=null;try{const ps=navigator.getGamepads?navigator.getGamepads():[];for(const g of ps)if(g&&g.connected!==false&&g.buttons&&g.buttons.length){p=g;break;}}catch(e){}return p;}
let navLast='',navT=0,navRep=false;
function padNav(scr,dir){
  const els=[...scr.querySelectorAll('button:not([disabled]),a.btn,input[type=checkbox],select,summary')].filter(e=>e.offsetParent!==null);if(!els.length)return;
  let cur=document.querySelector('.padf');if(!cur||!scr.contains(cur)){cur=null;}
  if(!cur){const first=els.find(e=>e.id==='campaignLaunch')||els.find(e=>e.id==='bStart')||els[0];first.classList.add('padf');first.focus({preventScroll:true});first.scrollIntoView({block:'nearest'});return;}
  const a=cur.getBoundingClientRect(),ax=a.left+a.width/2,ay=a.top+a.height/2;let best=null,bs=1e9;
  els.forEach(e=>{if(e===cur)return;const b=e.getBoundingClientRect(),bx=b.left+b.width/2,by=b.top+b.height/2,dx=bx-ax,dy=by-ay;
    const main=dir==='r'?dx:dir==='l'?-dx:dir==='d'?dy:-dy,off=dir==='r'||dir==='l'?Math.abs(dy):Math.abs(dx);
    if(main<=4)return;const sc=main+off*2.2;if(sc<bs){bs=sc;best=e;}});
  if(best){cur.classList.remove('padf');best.classList.add('padf');best.focus({preventScroll:true});best.scrollIntoView({block:'nearest',behavior:'smooth'});synth('lock');}
}
R.pollPad=function(){
  const p=readPad();
  if(!p){if(padId){padId='';padStatus();}$.pad.mx=$.pad.my=0;$.pad.fire=0;padPrev=[];if(wiz)renderWiz(null);return;}
  if(p.id!==padId){padId=p.id;padStatus();}
  // calibrate resting values so worn or odd generic sticks don't drift
  if(!padBase||padBase.id!==p.id){padBase={id:p.id,v:p.axes.map(v=>v||0),n:0};}
  if(padBase.n<30){padBase.n++;p.axes.forEach((v,i)=>{if(Math.abs((v||0)-padBase.v[i])<.1)padBase.v[i]=padBase.v[i]*.8+(v||0)*.2;});}
  const dev=i=>i==null||i>=p.axes.length?0:(p.axes[i]||0)-(padBase.v[i]||0);
  const cur=p.buttons.map(b=>!!b&&(b.pressed||b.value>.5)),edge=i=>cur[i]&&!padPrev[i];
  if(wiz){wizStep(p,cur,dev);padPrev=cur;return;}
  // known controller profiles (measured on the player's own pad), used unless a custom layout is saved
  const PROFILE=/0810/.test(p.id)&&/0001/.test(p.id)?{id:p.id,drive:{x:0,y:1,sx:1,sy:1},aim:{x:5,y:2,sx:1,sy:1},fire:[0,1,2,3,4,5,6,7],pause:[8,9],hat:9}:null;
  const M=padMap&&padMap.id===p.id?padMap:PROFILE;
  const fireBtns=M?M.fire:[0,1,2,3,6,7],pauseBtns=M?M.pause:[8,9];
  const anyFireEdge=fireBtns.some(edge)||[0,1,2,3].some(edge),anyPauseEdge=pauseBtns.some(edge);
  // overlays and menus: any fire or pause button presses the main button
  if(!Q('#cardWrap').hidden){if(anyFireEdge||anyPauseEdge)closeCard();padPrev=cur;return;}
  {const scr=['warRoom','home','walk','edit','debrief'].map(id=>Q('#'+id)).find(e=>e&&!e.hidden);
   if(scr){let nx=0,ny=0;if(M){nx=dev(M.drive.x)*M.drive.sx;ny=dev(M.drive.y)*M.drive.sy;}else{nx=dev(0);ny=dev(1);}
     if(cur[14])nx=-1;if(cur[15])nx=1;if(cur[12])ny=-1;if(cur[13])ny=1;
     {const hi=M&&M.hat!=null?M.hat:(p.axes.length>9?9:null);if(hi!=null){const h=p.axes[hi];const H=[[-1,0,-1],[-.71,1,-1],[-.43,1,0],[-.14,1,1],[.14,0,1],[.43,-1,1],[.71,-1,0],[1,-1,-1]];for(const [v,hx,hy] of H)if(Math.abs(h-v)<.08){nx=hx;ny=hy;}}}
     const dir=Math.abs(nx)>.5||Math.abs(ny)>.5?(Math.abs(nx)>Math.abs(ny)?(nx>0?'r':'l'):(ny>0?'d':'u')):'';
     const now=performance.now();
     if(dir&&(dir!==navLast||now-navT>(navRep?140:380))){navRep=dir===navLast;navLast=dir;navT=now;padNav(scr,dir);}
     if(!dir){navLast='';navRep=false;}
     if(edge(0)||(!M&&edge(2))){const f=document.querySelector('.padf');if(f&&scr.contains(f))f.click();else if(scr.id==='home'){if(R.campaign)R.campaign.launch();else Q('#bStart').click();}else if(scr.id==='warRoom')Q('#warDeploy').click();else if(scr.id==='debrief')Q('#dAgain').click();}
     else if(edge(1)&&scr.id!=='home'){const back=scr.querySelector('[data-go="home"]');if(back)back.click();}
     else if(anyPauseEdge){if(scr.id==='home'){if(R.campaign)R.campaign.launch();else Q('#bStart').click();}else if(scr.id==='warRoom')Q('#warDeploy').click();else if(scr.id==='debrief')Q('#dAgain').click();}
     padPrev=cur;return;}}
  if(!Q('#play').hidden&&anyPauseEdge){R.pause();padPrev=cur;return;}
  // drive
  let mx=0,my=0;
  if(M){mx=dev(M.drive.x)*M.drive.sx;my=dev(M.drive.y)*M.drive.sy;}
  else{mx=dev(0);my=dev(1);}
  if(Math.hypot(mx,my)<.2){mx=0;my=0;}
  if(cur[14])mx=-1;if(cur[15])mx=1;if(cur[12])my=-1;if(cur[13])my=1;
  {const hi=M&&M.hat!=null?M.hat:(p.axes.length>9?9:null);if(hi!=null){const h=p.axes[hi];const H=[[-1,0,-1],[-.71,1,-1],[-.43,1,0],[-.14,1,1],[.14,0,1],[.43,-1,1],[.71,-1,0],[1,-1,-1]];for(const [v,hx,hy] of H)if(Math.abs(h-v)<.08){mx=hx;my=hy;}}}
  $.pad.mx=Math.max(-1,Math.min(1,mx));$.pad.my=Math.max(-1,Math.min(1,my));
  // aim
  let lx=0,ly=0;
  if(M){lx=dev(M.aim.x)*M.aim.sx;ly=dev(M.aim.y)*M.aim.sy;}
  else if(p.mapping==='standard'){lx=dev(2);ly=dev(3);}
  else{const pairs=[[2,3],[2,5],[3,4],[5,2],[3,2]];let bm=.2;for(const [a,b] of pairs){if(a>=p.axes.length||b>=p.axes.length)continue;if(Math.abs(padBase.v[a])>.5||Math.abs(padBase.v[b])>.5)continue;const x=dev(a),y=dev(b),mg=Math.hypot(x,y);if(mg>bm){bm=mg;lx=x;ly=y;}}}
  const lm=Math.hypot(lx,ly);$.pad.ax=lm>.3?lx:0;$.pad.ay=lm>.3?ly:0;
  if(lm>.3&&R.active&&$.state==='play'){
    $.aimLock=null;padCur.on=false;$.mouse.moved=0;
    const want=Math.atan2(ly,lx);
    if($.pad.aim==null)$.pad.aim=$.hero.direction;
    const diff=((want-$.pad.aim)+$.pi*3)%$.twopi-$.pi;$.pad.aim+=diff*Math.min(1,.25*padSens*($.dt||1));
    const ang=c=>Math.abs(((Math.atan2(c.y-$.hero.y,c.x-$.hero.x)-want)+$.pi*3)%$.twopi-$.pi);
    let best=null,bd=.34;
    $.carriers.forEach(c=>{if(!c.alive)return;const da=ang(c);if(da<bd){bd=da;best=c;}});
    const prev=R.hover&&R.hover.alive?R.hover:null;
    R.hover=prev&&ang(prev)<.5&&(!best||best===prev||bd>ang(prev)*.6)?prev:best;
  }
  if(R.hover&&R.hover.alive&&$.pad.aim!=null){const ta=Math.atan2(R.hover.y-$.hero.y,R.hover.x-$.hero.x);$.pad.aim+=(((ta-$.pad.aim)+$.pi*3)%$.twopi-$.pi)*.35;}
  // fire (buttons, or a trigger that reports as an axis)
  let firing=fireBtns.some(i=>cur[i]);
  if(M&&M.fireAxis!=null&&Math.abs(dev(M.fireAxis))>.5)firing=true;
  $.pad.fire=firing?1:0;
  if(!M&&(edge(4)||edge(5)))cycleLock(edge(4)?-1:1);
  padPrev=cur;
};
/* ---------- controller setup wizard ---------- */
const WIZ=[
  {k:'driveX',t:'Push the stick you want to MOVE the machine with to the RIGHT, then let go'},
  {k:'driveY',t:'Push the same MOVE stick DOWN, then let go'},
  {k:'aimX',t:'Push the stick you want to TURN the machine with to the RIGHT, then let go'},
  {k:'aimY',t:'Push the same TURN stick DOWN, then let go'},
  {k:'fire',t:'Press the button (or trigger) you want to FIRE with'},
  {k:'pause',t:'Press the button you want to PAUSE with (Start)'}
];
function openWiz(){const p=readPad();wiz={step:0,map:{id:p?p.id:'',drive:{},aim:{},fire:[],pause:[],fireAxis:null},armed:true,msg:''};Q('#padModal').hidden=false;renderWiz(p);}
function closeWiz(){wiz=null;Q('#padModal').hidden=true;renderHome();}
function wizStep(p,cur,dev){
  const st=WIZ[wiz.step];
  const usedAx=[wiz.map.drive.x,wiz.map.drive.y,wiz.map.aim.x,wiz.map.aim.y].filter(v=>v!=null);
  // wait for everything to be released between steps
  const busyAx=p.axes.some((v,i)=>Math.abs(dev(i))>.35),busyBtn=cur.some(Boolean);
  if(!wiz.armed){if(!busyAx&&!busyBtn)wiz.armed=true;renderWiz(p);return;}
  if(st&&(st.k==='driveX'||st.k==='driveY'||st.k==='aimX'||st.k==='aimY')){
    let bi=-1,bv=.6;p.axes.forEach((v,i)=>{const d=dev(i);if(Math.abs(d)>bv&&Math.abs(padBase.v[i]||0)<.5){if((st.k==='driveY'&&i===wiz.map.drive.x)||(st.k==='aimY'&&i===wiz.map.aim.x))return;if((st.k==='aimX'||st.k==='aimY')&&(i===wiz.map.drive.x||i===wiz.map.drive.y))return;bv=Math.abs(d);bi=i;}});
    if(bi>=0){const sg=dev(bi)>0?1:-1;
      if(st.k==='driveX'){wiz.map.drive.x=bi;wiz.map.drive.sx=sg;}else if(st.k==='driveY'){wiz.map.drive.y=bi;wiz.map.drive.sy=sg;}
      else if(st.k==='aimX'){wiz.map.aim.x=bi;wiz.map.aim.sx=sg;}else{wiz.map.aim.y=bi;wiz.map.aim.sy=sg;}
      wiz.msg='Got it: axis '+bi+(sg<0?' (reversed)':'');wiz.step++;wiz.armed=false;synth('lock');}
    else{const bb=cur.findIndex(Boolean);if(bb>=0)wiz.msg='That was button '+bb+'. Please use a STICK for this step.';}
  }else if(st){
    const bb=cur.findIndex((v,i)=>v&&!padPrev[i]);
    if(bb>=0){if(st.k==='pause'&&wiz.map.fire.includes(bb)){wiz.msg='Button '+bb+' already fires. Pick a different one.';}
      else{wiz.map[st.k].push(bb);wiz.msg='Got it: button '+bb;wiz.step++;wiz.armed=false;synth('lock');}}
    else if(st.k==='fire'){let ai=-1;p.axes.forEach((v,i)=>{if(Math.abs(dev(i))>.6&&!usedAx.includes(i))ai=i;});if(ai>=0){wiz.map.fireAxis=ai;wiz.msg='Got it: trigger on axis '+ai;wiz.step++;wiz.armed=false;synth('lock');}}
  }
  if(wiz.step>=WIZ.length){padMap=wiz.map;store.set('padMap2',padMap);wiz.done=true;}
  renderWiz(p);
}
function renderWiz(p){
  if(!wiz)return;
  const body=Q('#padBody');
  let h='';
  if(!p)h+='<p class="errs">No controller detected. Plug it in and press any button on it.</p>';
  if(wiz.done){const m=padMap;h+='<p class="padBig">Saved.</p><ul class="padSum"><li>Move: axes '+m.drive.x+' and '+m.drive.y+'</li><li>Turn: axes '+m.aim.x+' and '+m.aim.y+'</li><li>Fire: '+(m.fire.length?'button '+m.fire.join(', '):'trigger axis '+m.fireAxis)+'</li><li>Pause: button '+m.pause.join(', ')+'</li></ul><p class="muted">The D-pad also drives. You can run this again any time.</p>';Q('#padDone').textContent='Done';}
  else{h+='<p class="muted">Step '+(wiz.step+1)+' of '+WIZ.length+'</p><p class="padBig">'+WIZ[wiz.step].t+'</p>'+(wiz.armed?'':'<p class="muted">Let go of everything…</p>')+(wiz.msg?'<p class="padMsg">'+esc(wiz.msg)+'</p>':'');Q('#padDone').textContent='Cancel';}
  if(p){h+='<div class="padLive"><span class="lbl">Live readout: what your controller is sending</span><div class="axes">'+p.axes.map((v,i)=>{const d=(v||0)-((padBase&&padBase.v[i])||0);return '<div class="ax"><span>Axis '+i+'</span><b><i style="left:'+(50+Math.max(-1,Math.min(1,d))*50)+'%"></i></b></div>';}).join('')+'</div><div class="btns">'+p.buttons.map((b,i)=>'<span class="'+((b.pressed||b.value>.5)?'on':'')+'">'+i+'</span>').join('')+'</div></div>';}
  body.innerHTML=h;
}
function padStatus(){const el=Q('#padStatus');if(el){el.textContent=padId?'Controller connected: '+padId.replace(/\(.*?\)/g,'').trim().slice(0,46)+(padMap&&padMap.id===padId?' · your custom layout is set':(/0810/.test(padId)&&/0001/.test(padId)?' · your controller profile is loaded: left stick moves, right stick turns. Keep the ANALOG light on.':' · default: left stick moves, right stick turns. If the right stick does nothing, press the ANALOG button on the controller (red light on).')):'No controller detected. Plug it in and press a button.';el.classList.toggle('on',!!padId);}}

/* ================= Screens ================= */
const SCREENS=['home','warRoom','play','walk','edit','debrief'];
function showScreen(id){SCREENS.forEach(s=>Q('#'+s).hidden=s!==id);if(id==='play')setTimeout(()=>$.resizecb(),0);window.scrollTo(0,0);}
document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>{renderHome();showScreen(b.dataset.go);}));
function alertHome(msg){renderHome();showScreen('home');const p=document.createElement('p');p.className='errs';p.textContent=msg;Q('#homeMsg').appendChild(p);setTimeout(()=>p.remove(),4000);}
function renderHome(){
  if(R.campaign){R.campaign.render();R.campaign.updateRibbon();}
  const ol=Q('#stations');ol.innerHTML='';
  deck.rooms.forEach((r,i)=>{
    const on=!skipped.has(r.topic),onMap=i<SLOTS.length,m=Math.round(mastery(r)*100),cap=captured.has(r.topic);
    const li=document.createElement('li');
    li.className='strow';li.innerHTML='<button class="st'+(cap?' cap':'')+'" aria-pressed="'+(on&&onMap)+'" title="Include in or skip from the full raid"'+(onMap?'':' disabled')+'><span class="num">'+(onMap?i+1:'·')+'</span><span class="nm"><b>'+esc(r.locus)+'</b><small>'+esc(r.topic)+' · '+r.items.length+' items'+(cap?' · taken':'')+(onMap?'':' · study only')+'</small></span><span class="mast">'+m+'%<span class="bar"><i style="width:'+m+'%"></i></span></span></button>';
    if(onMap&&r.items.length){const a=document.createElement('button');a.className='btn attack';a.textContent=cap?'Retake':'Attack';a.title='Raid only '+r.locus;a.addEventListener('click',()=>{ac();R.start([r],0);});li.appendChild(a);}
    li.querySelector('button').addEventListener('click',()=>{if(skipped.has(r.topic))skipped.delete(r.topic);else skipped.add(r.topic);store.set('skip',[...skipped]);renderHome();});
    ol.appendChild(li);
  });
  const rr=routeRooms(),nxt=rr.find(r=>!captured.has(r.topic)),nT=rr.filter(r=>captured.has(r.topic)).length;
  const nSel=rr.length,nAll=mapRooms().filter(r=>r.items.length).length;
  Q('#bStart').textContent=(nSel<nAll?'Raid '+nSel+' selected station'+(nSel===1?'':'s'):nT===0?'Start the full raid':'Continue raid')+(nxt&&nT?' · next: '+nxt.locus:'');
  Q('#progLine').textContent=nT+' of '+rr.length+' stations taken · best score '+best.toLocaleString();
  Q('#bTeach').textContent='Teaching card after correct answers: '+(teachAll?'on':'off');
  Q('#bMode').textContent='When I die: '+({drill:'repeat it until right, then again 2 to 3 later',shuffle:'question goes back into the queue',restart:'station restarts'}[deathMode]||'repeat it until right');
  Q('#bReset').hidden=nT===0;padStatus();
  Q('#bTimer').textContent='Par-time clock: '+(timerOn?'on':'off');
  Q('#bOrder').textContent='Full raid order: '+ORDER_LABEL[routeOrder];
  {const nd=dueItems().length;const b=Q('#bReview');b.textContent=nd?'Daily review ('+Math.min(nd,30)+(nd>30?' of '+nd:'')+' due)':'Daily review (nothing due)';b.disabled=!nd;}
  Q('#bSens').textContent='Controller aim turn speed: '+({0.6:'slow',1:'medium',1.5:'fast'}[padSens]||'medium');
  {const g=globalBar();Q('#homeSegs').innerHTML=g.html;Q('#homeGLabel').textContent=g.label;gKey='';}
  if(!mapCanvas)buildMap();
  const mc=Q('#homeMap'),c=mc.getContext('2d');c.drawImage(mapCanvas,0,0,mc.width,mc.height);
  mapRooms().forEach(r=>{const p=SLOTS[r.idx],x=p.x*mc.width/960,y=p.y*mc.height/600,cap=captured.has(r.topic);
    c.beginPath();c.arc(x,y,13,0,Math.PI*2);c.fillStyle='rgba(8,12,10,.9)';c.fill();c.lineWidth=2.5;c.strokeStyle=cap?'#62e6ff':'#f2b84b';c.stroke();
    c.fillStyle=cap?'#62e6ff':'#f2b84b';c.font='700 14px "Chakra Petch", sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(String(r.idx+1),x,y+1);});
}
Q('#homeMap').addEventListener('click',e=>{
  const mc=Q('#homeMap'),b=mc.getBoundingClientRect(),x=(e.clientX-b.left)/b.width*960,y=(e.clientY-b.top)/b.height*600;
  let best=null,bd=40;mapRooms().forEach(r=>{if(!r.items.length)return;const p=SLOTS[r.idx],d=Math.hypot(p.x-x,p.y-y);if(d<bd){bd=d;best=r;}});
  if(best){ac();R.start([best],0);}
});
Q('#bStart').addEventListener('click',()=>{ac();const rr=routeRooms();if(!rr.length){alertHome('Pick at least one station with questions.');return;}let i=rr.findIndex(r=>!captured.has(r.topic));if(i<0){captured.clear();store.set('captured',[]);i=0;}R.start(rr,i);});
Q('#bTeach').addEventListener('click',()=>{teachAll=!teachAll;store.set('teachAll',teachAll);renderHome();});
Q('#bMode').addEventListener('click',()=>{deathMode={drill:'shuffle',shuffle:'restart',restart:'drill'}[deathMode]||'drill';store.set('deathMode2',deathMode);renderHome();});
Q('#bPad').addEventListener('click',()=>{ac();openWiz();});
Q('#padDone').addEventListener('click',closeWiz);
Q('#padReset').addEventListener('click',()=>{padMap=null;store.set('padMap2',null);wiz=null;Q('#padModal').hidden=true;renderHome();});
Q('#bSens').addEventListener('click',()=>{padSens=padSens===0.6?1:padSens===1?1.5:0.6;store.set('padSens',padSens);renderHome();});
Q('#bOrder').addEventListener('click',()=>{routeOrder={map:'plan',plan:'weak',weak:'due',due:'map'}[routeOrder]||'map';store.set('routeOrder',routeOrder);renderHome();});
Q('#bReview').addEventListener('click',()=>{ac();const rv=reviewRoom();if(rv)R.start([rv],0);});
Q('#bTimer').addEventListener('click',()=>{timerOn=!timerOn;store.set('timer',timerOn);renderHome();});
Q('#bReset').addEventListener('click',()=>{captured.clear();store.set('captured',[]);renderHome();});
Q('#bStudy').addEventListener('click',()=>openWalk(0));
Q('#bEdit').addEventListener('click',()=>{Q('#deckText').value=deckText;Q('#deckErr').textContent='';Q('#deckMsg').textContent='';showScreen('edit');});
Q('#bSound').addEventListener('click',()=>{soundOn=!soundOn;store.set('sound',soundOn);ac();applySound();});
Q('#bMusic').addEventListener('click',()=>{musicOn=!musicOn;store.set('music',musicOn);ac();applySound();if(musicOn)startMusic();});
Q('#bPause').addEventListener('click',()=>R.pause());
Q('#bBrief').addEventListener('click',()=>{if(R.campaignRun&&R.campaign)R.campaign.showBriefing();else R.pause();});

/* ---------- study (walk) ---------- */
let walkIdx=0;
function openWalk(i){walkIdx=Math.max(0,Math.min(deck.rooms.length-1,i));renderWalk();showScreen('walk');}
function renderWalk(){
  const tabs=Q('#walkTabs');tabs.innerHTML='';
  deck.rooms.forEach((r,i)=>{const b=document.createElement('button');b.textContent=(i+1)+'. '+r.locus;b.setAttribute('aria-current',i===walkIdx?'true':'false');b.addEventListener('click',()=>{walkIdx=i;renderWalk();});tabs.appendChild(b);});
  const r=deck.rooms[walkIdx];
  Q('#walkHead').innerHTML='<p class="eyebrow">Station '+(walkIdx+1)+' of '+deck.rooms.length+'</p><h2>'+esc(r.locus)+': '+esc(r.topic)+'</h2>'+(r.note.length?'<div class="note brief">'+noteHTML(r.note)+'</div>':'');
  Q('#walkCards').innerHTML=r.items.map(it=>{
    const s=stats[it.id],box=s?s.box:0,dots=(mastered(it)?'MASTERED ':'')+'●'.repeat(Math.min(MASTER_AT,box))+'○'.repeat(Math.max(0,MASTER_AT-box)),kind=it.type==='q'?'Question':it.type==='l'?'Procedure (in order)':'List (any order)';
    let body='<div class="q">'+esc(it.prompt)+'</div>';
    if(it.type==='q')body+='<div class="a">'+esc(it.answer)+'</div>';
    else body+=(it.type==='l'?'<ol class="a">':'<ul class="a">')+it.seq.map(x=>'<li>'+esc(x)+'</li>').join('')+(it.type==='l'?'</ol>':'</ul>');
    if(it.note.length)body+='<div class="note">'+noteHTML(it.note)+'</div>';
    return '<article class="qcard"><div class="k"><span>'+kind+'</span><span class="dots" title="Memory strength">'+dots+'</span></div>'+body+'</article>';
  }).join('')||'<p class="muted">No items yet. Add some in Edit.</p>';
  Q('#walkPrev').disabled=walkIdx===0;Q('#walkNext').disabled=walkIdx>=deck.rooms.length-1;Q('#walkSolo').disabled=walkIdx>=SLOTS.length||!r.items.length;
}
Q('#walkPrev').addEventListener('click',()=>{walkIdx--;renderWalk();window.scrollTo(0,0);});
Q('#walkNext').addEventListener('click',()=>{walkIdx++;renderWalk();window.scrollTo(0,0);});
Q('#walkSolo').addEventListener('click',()=>{ac();R.start([deck.rooms[walkIdx]],0);});

/* ---------- edit ---------- */
Q('#deckSave').addEventListener('click',()=>{
  const t=Q('#deckText').value,d=parseDeck(t);
  if(!d.rooms.length){Q('#deckErr').textContent='No stations found. Add at least one "## Station | Topic" line.';return;}
  deckText=t;deck=d;indexDeck();store.set('deck',t);
  Q('#deckErr').textContent=d.errors.length?('Saved, but these lines were skipped:\n'+d.errors.slice(0,12).join('\n')):'';
  Q('#deckMsg').textContent='Saved · '+d.rooms.length+' stations';
});
Q('#deckReset').addEventListener('click',()=>{Q('#deckText').value=window.FNPH_DECK;Q('#deckMsg').textContent='Starter deck loaded. Press Save to keep it.';});

/* ---------- debrief ---------- */
function debrief(){
  R.active=false;stopMusic();$.setState('idle');Q('#cardWrap').hidden=true;
  if($.score>best){best=$.score;store.set('best',best);}
  const acc=R.answered?Math.round(R.correct/R.answered*100):0;
  Q('#dSum').innerHTML=[['Score',$.score.toLocaleString()],['Stations taken',R.taken],['Deaths',R.deaths],['Accuracy',acc+'%'],['Best',best.toLocaleString()]].map(([k,v])=>'<div><span class="lbl">'+k+'</span><b>'+v+'</b></div>').join('');
  const groups=new Map();R.misses.forEach(m=>{const k=m.item.room;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(m);});
  let html='';
  [...groups.keys()].sort((a,b)=>a.idx-b.idx).forEach(r=>{
    html+='<div class="grp">'+(r.idx+1)+'. '+esc(r.locus)+' · '+esc(r.topic)+'</div>';
    groups.get(r).forEach(m=>{const it=m.item,ans=it.type==='q'?esc(it.answer):(it.type==='l'?it.seq.map((x,i)=>(i+1)+'. '+esc(x)).join('<br>'):it.seq.map(esc).join(' · '));
      html+='<article class="row"><b>'+esc(it.prompt)+'</b><span class="a">'+ans+'</span>'+(m.pick?'<span class="p">You shot: '+esc(m.pick)+' · '+esc(it.type==='q'?reasonFor(it,m.pick):'')+'</span>':'<span class="p">Overrun</span>')+(m.n>1?'<span class="p">Died here '+m.n+' times</span>':'')+(it.note.length?'<div class="note">'+noteHTML(it.note)+'</div>':'')+'</article>';});
  });
  Q('#dMiss').innerHTML=html||'<p class="muted">No deaths on questions. Clean raid.</p>';
  showScreen('debrief');
}
Q('#dAgain').addEventListener('click',()=>Q('#bStart').click());
Q('#dStudy').addEventListener('click',()=>{const f=R.misses&&R.misses.size?[...R.misses.values()][0].item.room.idx:0;openWalk(f);});

/* ================= Tactical weapon look ================= */
$.onShot=function(h){
  const a=h.direction,side=a+$.pi/2;$.rumble.level=Math.max($.rumble.level,1.2);
  R.casings=R.casings||[];
  if(R.casings.length<80)R.casings.push({x:h.x+Math.cos(a)*6,y:h.y+Math.sin(a)*6,vx:Math.cos(side)*rand(2.2,3.6)+rand(-.5,.5),vy:Math.sin(side)*rand(2.2,3.6)+rand(-.5,.5),r:rand(0,6),vr:rand(-.5,.5),life:1});
  h.recoil=1;
};
function updateCasings(){
  if(!R.casings)return;
  for(const c of R.casings){c.x+=c.vx*$.dt;c.y+=c.vy*$.dt;c.vx*=.9;c.vy*=.9;c.r+=c.vr*$.dt;c.vr*=.95;c.life-=.012*$.dt;}
  R.casings=R.casings.filter(c=>c.life>0);
}
function drawCasings(ctx){
  if(!R.casings)return;
  for(const c of R.casings){ctx.save();ctx.translate(c.x,c.y);ctx.rotate(c.r);ctx.globalAlpha=Math.min(1,c.life*1.5);ctx.fillStyle='#d9a441';ctx.fillRect(-2.5,-1,5,2);ctx.fillStyle='#8a6420';ctx.fillRect(1.5,-1,1,2);ctx.restore();}
  ctx.globalAlpha=1;
}
$.Hero.prototype.render=function(){
  if(this.life<=0)return;
  const ctx=$.ctxmg,a=this.direction,sp=Math.hypot(this.vx,this.vy);
  if($.pad.aim!=null&&!$.mouse.moved){this.heading=a;}else if(sp>.4)this.heading=Math.atan2(this.vy,this.vx);if(this.heading===undefined)this.heading=a;
  this.recoil=Math.max(0,(this.recoil||0)-.25*$.dt);
  if(this.takingDamage){ctx.fillStyle='hsla(0,100%,50%,'+rand(.03,.12)+')';ctx.fillRect(-$.screen.x,-$.screen.y,$.cw,$.ch);}
  // shadow
  ctx.fillStyle='rgba(0,0,0,.45)';ctx.beginPath();ctx.ellipse(this.x+6,this.y+9,26,20,this.heading,0,$.twopi);ctx.fill();
  // hull (faces direction of travel)
  ctx.save();ctx.translate(this.x,this.y);ctx.rotate(this.heading);ctx.scale(1.5,1.5);
  ctx.fillStyle='#3d4a3a';ctx.strokeStyle='#9fb39a';ctx.lineWidth=1.2;
  ctx.beginPath();ctx.moveTo(18,0);ctx.lineTo(10,-11);ctx.lineTo(-12,-12);ctx.lineTo(-16,-6);ctx.lineTo(-16,6);ctx.lineTo(-12,12);ctx.lineTo(10,11);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle='#2b3529';ctx.fillRect(-13,-15,22,4);ctx.fillRect(-13,11,22,4);
  ctx.strokeStyle='rgba(255,255,255,.12)';ctx.beginPath();ctx.moveTo(-8,-12);ctx.lineTo(-8,12);ctx.moveTo(4,-11);ctx.lineTo(4,11);ctx.stroke();
  const eng=.5+.5*Math.sin($.tick/2);ctx.fillStyle='rgba(98,230,255,'+(.35+.4*eng*Math.min(1,sp/3))+')';ctx.fillRect(-18,-5,3,4);ctx.fillRect(-18,1,3,4);
  ctx.restore();
  // turret + barrel (faces aim)
  ctx.save();ctx.translate(this.x,this.y);ctx.rotate(a);ctx.scale(1.5,1.5);
  const rb=this.recoil*4;
  ctx.fillStyle='#6d7d66';ctx.fillRect(4-rb,-2.6,22,5.2);ctx.strokeStyle='#cfe0c8';ctx.lineWidth=.8;ctx.strokeRect(4-rb,-2.6,22,5.2);
  ctx.fillStyle='#a8baa1';ctx.fillRect(4-rb,-2.4,22,1.4);
  ctx.fillStyle='#2a2f29';ctx.fillRect(24-rb,-3.6,5,7.2);ctx.strokeStyle='#cfe0c8';ctx.strokeRect(24-rb,-3.6,5,7.2);
  ctx.fillStyle='#4c5b47';ctx.strokeStyle='#b8cbb2';ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(0,0,8,0,$.twopi);ctx.fill();ctx.stroke();
  ctx.fillStyle='#2b3529';ctx.fillRect(-3,-3,6,6);
  ctx.fillStyle='#ff3b30';ctx.beginPath();ctx.arc(-4,0,1.4,0,$.twopi);ctx.fill();
  if(this.weapon.fireFlag>3){
    const f=this.weapon.fireFlag/6,mx=30-rb;
    ctx.fillStyle='rgba(255,220,130,'+f+')';ctx.beginPath();ctx.moveTo(mx,0);
    for(let k=0;k<10;k++){const ang=k*$.twopi/10,r=k%2?4:rand(10,16)*f;ctx.lineTo(mx+Math.cos(ang)*r*(k%2?1:1.3),Math.sin(ang)*r*.7);}
    ctx.closePath();ctx.fill();
    ctx.fillStyle='rgba(255,255,255,'+f+')';ctx.beginPath();ctx.arc(mx+2,0,3,0,$.twopi);ctx.fill();
  }
  ctx.restore();
  // health ring
  ctx.strokeStyle='hsla('+this.life*120+',90%,55%,.7)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(this.x,this.y,32,-$.pi/2,-$.pi/2+$.twopi*this.life);ctx.stroke();
};
$.Bullet.prototype.render=function(){
  if(!this.inView)return;
  const ctx=$.ctxmg,col=this.strokeStyle==='#ffd27a'?'255,210,122':null;
  const g=ctx.createLinearGradient(this.ex,this.ey,this.x,this.y);
  g.addColorStop(0,col?'rgba('+col+',0)':'rgba(255,255,255,0)');g.addColorStop(1,col?'rgba('+col+',1)':this.strokeStyle);
  ctx.strokeStyle=g;ctx.lineWidth=this.lineWidth;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(this.ex,this.ey);ctx.lineTo(this.x,this.y);ctx.stroke();
  ctx.fillStyle='rgba(255,240,200,.9)';ctx.beginPath();ctx.arc(this.x,this.y,1.6,0,$.twopi);ctx.fill();
  ctx.lineCap='butt';
};
function aimPoint(){
  const h=$.hero,tg=$.aimLock&&$.aimLock.alive?$.aimLock:null;
  if(tg)return{x:tg.x,y:tg.y,snap:true};
  if(padCur.on){const hv=R.hover&&R.hover.alive?R.hover:null;if(hv)return{x:hv.x,y:hv.y,snap:true};return{x:padCur.x-$.screen.x,y:padCur.y-$.screen.y,snap:false};}
  if($.pad.aim!=null){const hv=R.hover&&R.hover.alive?R.hover:null;if(hv)return{x:hv.x,y:hv.y,snap:true};return{x:h.x+Math.cos($.pad.aim)*240,y:h.y+Math.sin($.pad.aim)*240,snap:false};}
  return{x:$.mouse.x,y:$.mouse.y,snap:false};
}
function drawTactical(ctx){
  const h=$.hero;if(h.life<=0)return;
  const p=aimPoint(),a=h.direction,mx=h.x+Math.cos(a)*44,my=h.y+Math.sin(a)*44;
  const d=Math.min(900,Math.hypot(p.x-mx,p.y-my));
  // laser sight
  const g=ctx.createLinearGradient(mx,my,mx+Math.cos(a)*d,my+Math.sin(a)*d);g.addColorStop(0,'rgba(255,40,40,.55)');g.addColorStop(1,'rgba(255,40,40,.12)');
  ctx.strokeStyle=g;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(mx,my);ctx.lineTo(mx+Math.cos(a)*d,my+Math.sin(a)*d);ctx.stroke();
  ctx.fillStyle='rgba(255,60,60,.95)';ctx.beginPath();ctx.arc(mx+Math.cos(a)*d,my+Math.sin(a)*d,2.2,0,$.twopi);ctx.fill();
  // reticle
  const over=R.aimTarget(),col=over?'98,230,255':'235,245,235',r=over?over.radius+12:14,t=$.tick/20;
  ctx.save();ctx.translate(over?over.x:p.x,over?over.y:p.y);
  ctx.strokeStyle='rgba('+col+',.95)';ctx.lineWidth=2;
  for(let k=0;k<4;k++){ctx.save();ctx.rotate(k*$.pi/2+(over?t:0));ctx.beginPath();ctx.moveTo(r,-r+7);ctx.lineTo(r,-r);ctx.lineTo(r-7,-r);ctx.stroke();ctx.restore();}
  if(!over){ctx.beginPath();ctx.moveTo(-5,0);ctx.lineTo(-2,0);ctx.moveTo(5,0);ctx.lineTo(2,0);ctx.moveTo(0,-5);ctx.lineTo(0,-2);ctx.moveTo(0,5);ctx.lineTo(0,2);ctx.stroke();}
  ctx.fillStyle='rgba('+col+',1)';ctx.beginPath();ctx.arc(0,0,1.5,0,$.twopi);ctx.fill();
  if(over){ctx.font='700 11px "JetBrains Mono", monospace';ctx.textAlign='center';ctx.fillText('LOCK '+over.num,0,r+14);ctx.textAlign='left';}
  ctx.restore();
}
R.beginCombat=()=>{openBriefing();cardReadyAt=0;closeCard();};R.isMastered=mastered;R.loadout=()=>ARSENAL[arsenalTier()];R.showScreen=showScreen;R.deckRooms=()=>deck.rooms;R.itemStats=()=>stats;R.showCard=card;R.openBriefing=openBriefing;R.toHome=quitToHome;
/* ================= Boot ================= */
function boot(){
  $.init();buildMap();renderHome();if(!R.active)showScreen('home');
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
