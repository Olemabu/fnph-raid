/* Operation Nightingale. A linear campaign through the existing course content. */
(function(){
'use strict';
const R=$.raid,Q=s=>document.querySelector(s),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KEY='fnphraid.campaign.v1';let save;
try{save=JSON.parse(localStorage.getItem(KEY)||'null');}catch(e){}
if(!save||!Array.isArray(save.done))save={done:[],partial:null};
if(save.partial&&(!Array.isArray(save.partial.cleared)||typeof save.partial.mission!=='string'))save.partial=null;
let complete=new Set(save.done),active=null,lastTier=0,ribbonKey='';
const persist=()=>{save.done=[...complete];try{localStorage.setItem(KEY,JSON.stringify(save));}catch(e){}};
// Fictional dispatch narrative; all examinable content comes from the existing deck.
const STORY=[
 ['First contact','The blackout begins at the gate. Reports are fragmented. Restore the language of symptoms before the next dispatch arrives.','Know what you are seeing.'],
 ['A human signal','A voice breaks through the static. Reach the person behind the symptoms. Every careful question restores part of the network.','Listen before you label.'],
 ['Light and shadow','The main block flickers between bright activity and deep silence. Trace the course, recognise the pattern, and carry the story forward.','Follow the course.'],
 ['Patterns beneath','The north wing holds stories that began long before tonight. Separate enduring patterns from the immediate crisis.','Find the pattern across time.'],
 ['The fractured signal','The pink quad is broadcasting contradictory messages. Make sense of the experiences, then practise the conversations that treatment requires.','Understand. Explain. Reconnect.'],
 ['The treatment forge','The clinic powers up its treatment systems. Every intervention needs an indication, a conversation and a watchful eye.','Choose, monitor, protect.'],
 ['Red dispatch','The emergency channel interrupts. This is where a memorised sequence becomes an action: follow the existing clinical steps in order.','Stay clear under pressure.'],
 ['Breaking the loop','The U-block signal keeps returning to the same point. Explore the pattern of use, recognise its consequences and find a route out.','Understand the loop.'],
 ['The inheritance archive','The sports-field relay opens a hidden archive. Follow the underlying mechanisms and rebuild the missing links.','Trace the connections.'],
 ['Two lives, one mission','The courtyard receives a new dispatch. Work through the perinatal syllabus and its clinical conversations with care.','Think beyond one encounter.'],
 ['The memory quarter','Some lights have been fading for years; others changed tonight. Follow the history and the course before drawing conclusions.','Time changes the meaning.'],
 ['The long view','The round huts become a place of careful observation. Keep the person, their function and their circumstances in view.','Preserve the whole picture.'],
 ['Signals in motion','The south ward exposes another layer of the network. Observe, localise and work through the neurological examination sequences.','Make every finding count.'],
 ['The examination engine','The courtyard instruments come online. Turn the examination into a sequence you can perform, rather than a list you can merely name.','Look. Test. Interpret.'],
 ['Rights under pressure','The clinic gates will not open without clear reasoning. Work through capacity, consent and the legal concepts in the source course.','A decision needs a reason.'],
 ['Beyond the gate','The administration relay carries difficult accounts. Assess the question you were asked, follow the evidence and explain your conclusion.','Keep the question in focus.'],
 ['The wider circle','The restored network reaches beyond the hospital walls. Follow the community syllabus from individual encounters to connected services.','Care extends beyond the ward.'],
 ['Across the distance','A remote signal appears in the pharmacy relay. Rebuild communication across distance without losing the structure of the consultation.','Connection is part of care.'],
 ['Those who came before','The library lights return. Recover the history that shaped the profession and place each development in its own time.','Know how we arrived here.'],
 ['The final proof','The last lock is in the records office. Read the evidence, test your reasoning and bring the hospital network back into focus.','Let the evidence speak.']
];
const ROUTES=R.routes=[
 {name:'Barnawa afterglow',label:'Hospital perimeter',sky:['#071829','#244a54','#f0ae78'],ground:'#122e2d',edge:'#62e6d2',wet:false,tunnel:false},
 {name:'Neon arterial',label:'City transfer',sky:['#080a22','#281744','#ac4c72'],ground:'#111321',edge:'#ee8bd3',wet:true,tunnel:false},
 {name:'Underpass relay',label:'Tunnel response',sky:['#03080e','#10202d','#2e5868'],ground:'#091920',edge:'#64dff4',wet:true,tunnel:true},
 {name:'Blue-hour return',label:'Inter-hospital transfer',sky:['#081528','#2e465c','#d6a77a'],ground:'#1d2929',edge:'#ffe1a1',wet:false,tunnel:false}
];
function chapters(){return R.deckRooms().map((r,i)=>({room:r,index:i,story:STORY[i]||STORY[0],concepts:r.concepts.filter(c=>c.items.length)}));}
function timeline(){const out=[];chapters().forEach(ch=>{
 if(ch.index)out.push({id:'transfer::'+ch.room.topic,kind:'transfer',chapter:ch.index,ch,title:'Dispatch to '+ch.room.locus});
 ch.concepts.forEach(c=>out.push({id:'concept::'+ch.room.topic+'::'+c.title,kind:'concept',chapter:ch.index,ch,concept:c,title:c.title.replace(/^OSCE: /,'')}));
 });return out;}
function next(){return timeline().find(m=>!complete.has(m.id))||null;}
function clearedChapters(){return chapters().filter(ch=>ch.concepts.length&&ch.concepts.every(c=>complete.has('concept::'+ch.room.topic+'::'+c.title))).length;}
function frameTier(){const n=clearedChapters();let tier=0;R.frames.forEach((f,i)=>{if(n>=f.at)tier=i;});return tier;}
function routeFor(ch){return ROUTES[ch%ROUTES.length];}
function weakTransfer(m){const prev=chapters()[m.chapter-1].room;const stats=R.itemStats();const now=Date.now();return prev.items.slice().sort((a,b)=>{
 const rank=i=>{const s=stats[i.id]||{};return(s.wrong||0)*5-(s.box||0)*2+(s.due&&s.due<=now?8:0);};return rank(b)-rank(a);
 }).slice(0,8);}
function launch(){
 const m=next();if(!m){render();return;}launchMission(m);
}
function launchMission(m){
 active=m;lastTier=frameTier();
 const room=m.kind==='transfer'?{...m.ch.room,mode:'race',review:true,missionConcept:null,concepts:[],items:weakTransfer(m),locus:m.ch.room.locus,topic:'Transfer to '+m.ch.room.topic,note:['Dispatch route: '+routeFor(m.chapter).name+'.','Answer lanes rehearse material from the chapter you just completed. Brake for reading time; the route has no speed deadline.'] }:{...m.ch.room,missionConcept:m.concept};
 R.start([room],0,{campaign:true});R.routeTheme=routeFor(m.chapter);
 const enter=()=>{const p=SLOTS[room.idx];$.hero.x=p.x*2;$.hero.y=p.y*2;R.openBriefing();};
 const alreadyInChapter=m.kind==='concept'&&timeline().some(x=>x.kind==='concept'&&x.chapter===m.chapter&&complete.has(x.id));
 if(alreadyInChapter&&!m.concept.title.startsWith('OSCE:')){enter();updateRibbon();return;}
 const f=R.frames[frameTier()],title=m.ch.story[0],route=m.kind==='transfer';
 const body='<div class="cinemaTop"><span>OPERATION NIGHTINGALE</span><span>CHAPTER '+String(m.chapter+1).padStart(2,'0')+' / 20</span></div><p class="cinemaEyebrow">'+(route?'AMBULANCE DISPATCH':'SECTOR '+String(m.chapter+1).padStart(2,'0'))+'</p><h2 class="cinemaTitle">'+esc(route?R.routeTheme.name:title)+'</h2><p class="cinemaStory">'+esc(route?'The next relay is waiting. Take the ambulance through '+R.routeTheme.label.toLowerCase()+'. The questions on this road come from the chapter you just cleared.':m.ch.story[1])+'</p><div class="missionDossier"><span>YOUR NEXT OBJECTIVE</span><h3>'+esc(route?'Reach '+m.ch.room.locus:m.title)+'</h3><p>'+esc(route?'Eight review checkpoints · steer into the correct answer lane':m.ch.room.topic+' · '+m.concept.items.length+' course items · '+(m.concept.mode==='fps'?'ward-round simulation':'combat drill'))+'</p></div><div class="cinemaBottom"><span>'+esc(f.code+' '+f.name)+'</span><span>'+esc(m.ch.story[2])+'</span></div>';
 R.showCard('cinema','Incoming transmission',body,route?'Accept dispatch':'Enter mission',enter,300);
 updateRibbon();
}
const originalStart=R.start;
R.start=function(rooms,si,options){R.campaignRun=!!(options&&options.campaign);Q('#play').classList.toggle('campaignPlay',R.campaignRun);if(!R.campaignRun){active=null;R.routeTheme=null;}originalStart(rooms,si);};
R.onCampaignClear=function(){
 if(!R.campaignRun||!active)return false;
 const finished=active;complete.add(finished.id);save.partial=null;persist();const tier=frameTier(),upgrade=tier>lastTier,m=next(),f=R.frames[tier];
 const list=timeline(),done=list.filter(x=>complete.has(x.id)).length;
 const body='<div class="cinemaTop"><span>TRANSMISSION CONFIRMED</span><span>'+done+' / '+list.length+' MISSIONS</span></div><p class="cinemaEyebrow">'+(upgrade?'FRAME EVOLUTION UNLOCKED':'SIGNAL RESTORED')+'</p><h2 class="cinemaTitle">'+esc(upgrade?f.name:finished.kind==='transfer'?'Arrival confirmed':'Objective secured')+'</h2><p class="cinemaStory">'+esc(upgrade?f.code+' · '+f.role+'. Your new frame is waiting in the hangar and is equipped for the next combat mission.':finished.title)+'</p><div class="missionDossier"><span>'+(m?'NEXT IN THE STORY':'NETWORK RESTORED')+'</span><h3>'+esc(m?m.title:'Operation Nightingale complete')+'</h3><p>'+clearedChapters()+' / 20 chapters restored · '+(R.correct||0)+' correct choices this mission</p></div><div class="cinemaBottom"><span>Progress saved automatically</span><button class="btn ghost" id="campaignHangar">Return to hangar</button></div>';
 R.showCard('cinema',upgrade?'Mecha refit complete':'Mission complete',body,m?'Continue the story':'Return to hangar',()=>m?launchMission(m):home(),300);
 Q('#campaignHangar').onclick=home;render();updateRibbon();return true;
};
function home(){active=null;R.campaignRun=false;R.active=false;R.answerSplash=false;Q('#answerSplash').hidden=true;Q('#cardWrap').hidden=true;$.setState('idle');R.toHome();render();}
function recordItem(it){if(!R.campaignRun||!active)return;if(!save.partial||save.partial.mission!==active.id)save.partial={mission:active.id,cleared:[]};if(!save.partial.cleared.includes(it.id))save.partial.cleared.push(it.id);persist();}
function missionItems(items){if(!R.campaignRun||!active||!save.partial||save.partial.mission!==active.id)return items;return items.filter(i=>!save.partial.cleared.includes(i.id));}
function render(){
 const m=next(),tier=frameTier(),f=R.frames[tier],list=timeline(),done=list.filter(x=>complete.has(x.id)).length,percent=list.length?Math.round(done/list.length*100):0;
 const chapter=m?m.chapter:19;Q('#campaignChapter').textContent='CHAPTER '+String(chapter+1).padStart(2,'0')+' / 20';Q('#campaignTitle').textContent=m?m.ch.story[0]:'Network restored';Q('#campaignStory').textContent=m?m.ch.story[1]:'The course has been traversed. Keep building mastery through daily review and free-flight missions.';
 Q('#campaignObjective').textContent=m?m.title:'Operation Nightingale complete';Q('#campaignLaunch').textContent=m?(done?'Continue mission':'Begin the story'):'Campaign complete';Q('#campaignLaunch').disabled=!m;
 Q('#frameName').textContent=f.name;Q('#frameCode').textContent=f.code+' / '+f.role;Q('#campaignProgress').textContent=done+' / '+list.length+' missions · '+clearedChapters()+' / 20 chapters';Q('#campaignFill').style.width=percent+'%';
 Q('#frameNext').textContent=R.frames[tier+1]?'Next refit: '+R.frames[tier+1].name+' · restore '+R.frames[tier+1].at+' chapters':'Ascendant frame fully unlocked';
 Q('#chapterRail').innerHTML=chapters().map(ch=>{const n=ch.concepts.filter(c=>complete.has('concept::'+ch.room.topic+'::'+c.title)).length,status=n===ch.concepts.length?'done':ch.index===chapter?'current':'locked';return '<div class="chapterNode '+status+'" title="'+esc(ch.room.topic)+'"><span>'+String(ch.index+1).padStart(2,'0')+'</span><b>'+esc(ch.story[0])+'</b><small>'+n+'/'+ch.concepts.length+' missions</small></div>';}).join('');
 Q('#frameSteps').innerHTML=R.frames.map((fr,i)=>'<span class="'+(i<=tier?'earned':'')+'"><i></i>'+esc(fr.name)+'</span>').join('');
}
function updateRibbon(){const el=Q('#missionRibbon');el.hidden=!R.campaignRun||!R.active||!active||!!R.modeName();if(el.hidden){ribbonKey='';return;}const key=active.id+'::'+frameTier();if(key===ribbonKey)return;ribbonKey=key;const f=R.frames[frameTier()];el.innerHTML='<span>CH '+String(active.chapter+1).padStart(2,'0')+' · '+(active.kind==='transfer'?'DISPATCH':'NIGHTINGALE')+'</span><b>'+esc(active.title)+'</b><small>'+esc(f.name)+' · progress saves as you answer</small>';}
R.campaign={hudLabel:()=>active?'Chapter '+String(active.chapter+1).padStart(2,'0')+' / 20 · '+(active.kind==='transfer'?'Dispatch':'Mission'):'',launch,render,frameTier,routeFor,recordItem,missionItems,timeline,next,clearedChapters,updateRibbon};
Q('#campaignLaunch').onclick=launch;
// Animated hangar, drawn at a bounded resolution and paused when it is off screen.
let last=0;const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;const canvas=Q('#hangarArt'),c=canvas.getContext('2d');
function hangar(now){requestAnimationFrame(hangar);if(now-last<(reduced?1000:33)||Q('#home').hidden)return;const rect=canvas.getBoundingClientRect();if(rect.bottom<0||rect.top>window.innerHeight)return;last=now;
 const dpr=Math.min(window.devicePixelRatio||1,1.5),w=rect.width,h=rect.height;if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}c.setTransform(dpr,0,0,dpr,0,0);const t=reduced?0:now/1000,tier=frameTier(),f=R.frames[tier];
 const bg=c.createLinearGradient(0,0,w,h);bg.addColorStop(0,'#080f18');bg.addColorStop(.55,'#142c38');bg.addColorStop(1,'#080e16');c.fillStyle=bg;c.fillRect(0,0,w,h);
 const narrow=w<650,cx=narrow?w*.5:w*.71,cy=narrow?155:h*.48,sc=narrow?Math.min(1.15,w/285):Math.min(h/290,w/450)*.93;
 // Cathedral-like hangar architecture and warm shafts of light.
 for(let k=0;k<9;k++){const x=w*.34+k*w*.1;c.fillStyle=k%2?'#152632':'#1c3440';c.fillRect(x,0,w*.025,h);c.fillStyle='#aacac519';c.fillRect(x+w*.025,0,2,h);}
 c.save();c.globalCompositeOperation='screen';for(let k=0;k<3;k++){const x=w*.53+k*w*.17;c.beginPath();c.moveTo(x,-20);c.lineTo(x+30,-20);c.lineTo(x-90,h);c.lineTo(x-210,h);c.closePath();const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'#d5e8c22b');g.addColorStop(1,'#d5e8c200');c.fillStyle=g;c.fill();}c.restore();
 c.strokeStyle='#89bbc322';c.lineWidth=1;for(let i=0;i<14;i++){const y=h*.69+Math.pow(i/13,1.7)*h*.4;c.beginPath();c.moveTo(0,y);c.lineTo(w,y);c.stroke();}for(let i=-8;i<12;i++){c.beginPath();c.moveTo(cx+i*20,h*.69);c.lineTo(cx+i*120,h);c.stroke();}
 // Refit platform and projected reticle.
 c.save();c.translate(cx,narrow?285:h*.86);c.scale(1,.24);c.fillStyle='#02070dbb';c.beginPath();c.arc(0,0,sc*111,0,Math.PI*2);c.fill();for(let k=0;k<3;k++){c.strokeStyle=k?f.core+'44':f.core+'aa';c.lineWidth=k?1:3;c.beginPath();c.arc(0,0,sc*(90+k*17),t*.12+k,t*.12+k+Math.PI*1.7);c.stroke();}c.restore();
 c.save();c.translate(cx,cy);c.strokeStyle=f.core+'1e';c.lineWidth=1;c.setLineDash([4,8]);c.beginPath();c.arc(0,0,sc*125,0,Math.PI*2);c.stroke();c.setLineDash([]);c.restore();
 R.drawFrame(c,cx,cy,sc,tier,t,false);
 // Technical annotation lines, indexing and a scan pass.
 c.font='10px monospace';c.fillStyle=f.core+'bb';c.strokeStyle=f.core+'66';for(const [dy,label] of (narrow?[]:[[-65,'NEURAL LINK / ONLINE'],[20,'ARMOUR / INTEGRITY 100%'],[80,'PROPULSION / STANDBY']])){const yy=cy+dy*sc;c.beginPath();c.moveTo(cx+45*sc,yy);c.lineTo(cx+100*sc,yy-16);c.lineTo(w-22,yy-16);c.stroke();c.fillText(label,Math.min(w-190,cx+95*sc),yy-22);}
 const scan=(t*.12%1)*h;c.fillStyle=f.core+'08';c.fillRect(w*.38,scan,w*.62,2);
 for(let i=0;i<36;i++){const x=(i*127.1+t*(i%2?3:-2))%w,y=(i*79.3+t*7)%h;c.fillStyle=i%3?'#b9ebda44':'#ffd9a477';c.fillRect(x,y,1.5,1.5);}
 const shade=narrow?c.createLinearGradient(0,250,0,430):c.createLinearGradient(0,0,w,0);shade.addColorStop(0,narrow?'#050a1200':'#050a12');shade.addColorStop(.35,narrow?'#050a1244':'#050a12ed');shade.addColorStop(narrow?1:.6,narrow?'#050a12':'#050a1200');c.fillStyle=shade;c.fillRect(0,0,w,h);
}
render();requestAnimationFrame(hangar);
})();
