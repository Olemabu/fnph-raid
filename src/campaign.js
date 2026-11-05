/* Operation Nightingale. A linear campaign through the existing course content. */
(function(){
'use strict';
const R=$.raid,Q=s=>document.querySelector(s),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KEY='fnphraid.campaign.v1';let save;
try{save=JSON.parse(localStorage.getItem(KEY)||'null');}catch(e){}
if(!save||!Array.isArray(save.done))save={done:[],partial:null};
if(save.partial&&(!Array.isArray(save.partial.cleared)||typeof save.partial.mission!=='string'))save.partial=null;
let complete=new Set(save.done),active=null,lastTier=0,ribbonKey='',selectedSector=0,selectedMission=null,topicRun=false;
const FRAME_HITS=[0,5,15,30,60];
if(!Number.isFinite(save.visualXP))save.visualXP=Object.values(R.itemStats()).reduce((n,s)=>n+(s.right||0),0);
let refitTimer=0;
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
function next(){let changed=false;const all=timeline(),cursor=all.findIndex(m=>m.id===save.nextMission),ordered=cursor>0?all.slice(cursor).concat(all.slice(0,cursor)):all;for(const m of ordered){if(complete.has(m.id))continue;const retired=m.kind==='concept'?m.concept.items.every(R.isMastered):weakTransfer(m).length===0;if(retired){complete.add(m.id);changed=true;continue;}if(changed)persist();return m;}if(changed)persist();return null;}
function clearedChapters(){return chapters().filter(ch=>ch.concepts.length&&ch.concepts.every(c=>complete.has('concept::'+ch.room.topic+'::'+c.title))).length;}
function frameTier(){const n=clearedChapters();let tier=0;R.frames.forEach((f,i)=>{if(n>=f.at||save.visualXP>=FRAME_HITS[i])tier=i;});return tier;}
function frameLook(){const tier=frameTier(),f={...R.frames[tier]};if(tier===4)f.core=['#ffe392','#72e5ff','#ff9875','#bca2ff','#76ffd0'][Math.floor(Math.max(0,save.visualXP-60)/10)%5];return f;}
function onCorrect(){const before=frameTier(),paint=frameLook().core;save.visualXP++;persist();const tier=frameTier();if(tier>before||paint!==frameLook().core){const el=Q('#refitBanner');el.innerHTML='<span>'+ (tier>before?'LIVE FRAME UPGRADE':'REACTOR LIVERY UNLOCKED')+'</span><b>'+esc(frameLook().name)+'</b><small>Equipped now · '+save.visualXP+' correct hits</small>';el.hidden=false;clearTimeout(refitTimer);refitTimer=setTimeout(()=>el.hidden=true,3000);R.addShockwave&&R.addShockwave($.hero.x,$.hero.y,190,160);ribbonKey='';}}
function routeFor(ch){return ROUTES[ch%ROUTES.length];}
function weakTransfer(m){const stats=R.itemStats(),now=Date.now(),past=chapters().filter(ch=>ch.index<m.chapter).flatMap(ch=>ch.room.items).filter(i=>!R.isMastered(i));
 const pool=past.length?past:m.ch.room.items.filter(i=>!R.isMastered(i));
 return pool.slice().sort((a,b)=>{const rank=i=>{const s=stats[i.id]||{};return(s.wrong||0)*5-(s.box||0)*2+(s.due&&s.due<=now?8:0);};return rank(b)-rank(a);}).slice(0,8);
}
function launch(){
 topicRun=false;const m=next();if(!m){render();return;}launchMission(m);
}
function launchMission(m){
 active=m;lastTier=frameTier();
 const room=m.kind==='transfer'?{...m.ch.room,mode:'',review:true,missionConcept:null,concepts:[],items:weakTransfer(m),locus:m.ch.room.locus,topic:'Transfer to '+m.ch.room.topic,note:['Spaceship review: rehearse material from the chapter you just completed.'] }:{...m.ch.room,missionConcept:m.concept};
 R.start([room],0,{campaign:true});R.routeTheme=routeFor(m.chapter);
 const p=SLOTS[room.idx];$.hero.x=p.x*2;$.hero.y=p.y*2;R.beginCombat();updateRibbon();
}
function advanceSet(){
 const all=timeline(),index=all.findIndex(m=>m.id===active?.id);
 for(let offset=1;offset<=all.length;offset++){const m=all[(Math.max(0,index)+offset)%all.length];if(m.id===active?.id||complete.has(m.id))continue;
 const pending=m.kind==='concept'?m.concept.items.some(i=>!R.isMastered(i)):weakTransfer(m).length>0;if(!pending)continue;
 save.nextMission=m.id;persist();if(R.flight)R.flight.completeSet();R.toHome();topicRun=false;launchMission(m);R.toast('Next set · unfinished questions saved for later practice',true);return true;
 }R.toast('No other unfinished campaign sets available.',true);return false;
}
function showBriefing(){if(!active||!R.active)return;const m=active,notes=m.concept?m.concept.note:[];
 const body='<p class="cinemaEyebrow">CHAPTER '+String(m.chapter+1).padStart(2,'0')+'</p><h2 class="cinemaTitle">'+esc(m.title)+'</h2><p class="cinemaStory">'+esc(m.ch.story[1])+'</p><div class="missionDossier">'+notes.map(n=>'<p>'+esc(n)+'</p>').join('')+'</div>';
 R.showCard('cinema','Mission briefing',body,'Return to combat',()=>{},0);
}
const originalStart=R.start;
R.start=function(rooms,si,options){R.runLoadout=options&&options.loadout||null;R.campaignRun=!!(options&&options.campaign);Q('#play').classList.toggle('campaignPlay',R.campaignRun);if(!R.campaignRun){active=null;R.routeTheme=null;}originalStart(rooms,si);};
R.onCampaignClear=function(){
 if(!R.campaignRun||!active)return false;
 const finished=active;complete.add(finished.id);save.partial=null;persist();const tier=frameTier(),upgrade=tier>lastTier,m=topicRun?sectorMission(finished.chapter,false):next(),f=frameLook();
 const list=timeline(),done=list.filter(x=>complete.has(x.id)).length;
 const body='<div class="cinemaTop"><span>TRANSMISSION CONFIRMED</span><span>'+done+' / '+list.length+' MISSIONS</span></div><p class="cinemaEyebrow">'+(upgrade?'FRAME EVOLUTION UNLOCKED':'SIGNAL RESTORED')+'</p><h2 class="cinemaTitle">'+esc(upgrade?f.name:finished.kind==='transfer'?'Arrival confirmed':'Objective secured')+'</h2><p class="cinemaStory">'+esc(upgrade?f.code+' · '+f.role+'. Your new frame is waiting in the hangar and is equipped for the next combat mission.':finished.title)+'</p><div class="missionDossier"><span>'+(m?(topicRun?'NEXT IN THIS TOPIC':'NEXT IN THE STORY'):(topicRun?'TOPIC TRAVERSED':'NETWORK RESTORED'))+'</span><h3>'+esc(m?m.title:topicRun?'Topic missions complete':'Operation Nightingale complete')+'</h3><p>'+clearedChapters()+' / 20 chapters restored · '+(R.correct||0)+' correct choices this mission</p></div><div class="cinemaBottom"><span>Progress saved automatically</span><button class="btn ghost" id="campaignHangar">Return to hangar</button></div>';
 R.showCard('cinema',upgrade?'Mecha refit complete':'Mission complete',body,m?(topicRun?'Continue this topic':'Continue the story'):'Return to hangar',()=>m?launchMission(m):home(),300);
 Q('#campaignHangar').onclick=home;render();updateRibbon();return true;
};
function home(){active=null;R.campaignRun=false;R.active=false;R.answerSplash=false;Q('#answerSplash').hidden=true;Q('#cardWrap').hidden=true;$.setState('idle');R.toHome();render();}
function recordItem(it){if(it.type==='q'&&!R.isMastered(it))return;if(!R.campaignRun||!active)return;if(!save.partial||save.partial.mission!==active.id)save.partial={mission:active.id,cleared:[]};if(!save.partial.cleared.includes(it.id))save.partial.cleared.push(it.id);persist();}
function undoItem(it){if(save.partial)save.partial.cleared=save.partial.cleared.filter(id=>id!==it.id);save.visualXP=Math.max(0,save.visualXP-1);persist();ribbonKey='';}
function missionItems(items){if(!R.campaignRun||!active||!save.partial||save.partial.mission!==active.id)return items;return items.filter(i=>(i.type==='q'&&!R.isMastered(i))||!save.partial.cleared.includes(i.id));}
function render(){
 const m=next(),tier=frameTier(),f=frameLook(),list=timeline(),done=list.filter(x=>complete.has(x.id)).length,percent=list.length?Math.round(done/list.length*100):0;
 const chapter=m?m.chapter:19;Q('#campaignChapter').textContent='CHAPTER '+String(chapter+1).padStart(2,'0')+' / 20';Q('#campaignTitle').textContent=m?m.ch.story[0]:'Network restored';Q('#campaignStory').textContent='Continue your air patrol through coastline, farmland, city and mountain sectors. Each completed question set advances the route. Every three sets opens a new landscape.';
 Q('#campaignObjective').textContent=m?m.title:topicRun?'Topic missions complete':'Operation Nightingale complete';Q('#campaignLaunch').textContent='Continue flight →';Q('#campaignLaunch').disabled=false;
 Q('#frameName').textContent=f.name;Q('#frameCode').textContent=f.code+' / '+f.role;Q('#campaignProgress').textContent=done+' / '+list.length+' missions · '+clearedChapters()+' / 20 chapters';Q('#campaignFill').style.width=percent+'%';
 Q('#frameNext').textContent=R.frames[tier+1]?'Next refit: '+R.frames[tier+1].name+' · '+Math.max(0,FRAME_HITS[tier+1]-save.visualXP)+' correct hits to refit':'Reactor livery evolves every 10 further correct hits';
 Q('#chapterRail').innerHTML=chapters().map(ch=>{const n=ch.concepts.filter(c=>complete.has('concept::'+ch.room.topic+'::'+c.title)).length,status=n===ch.concepts.length?'done':ch.index===chapter?'current':'locked';return '<div class="chapterNode '+status+'" title="'+esc(ch.room.topic)+'"><span>'+String(ch.index+1).padStart(2,'0')+'</span><b>'+esc(ch.story[0])+'</b><small>'+n+'/'+ch.concepts.length+' missions</small></div>';}).join('');
 const gun=R.loadout();Q('#loadoutWeapon').textContent=gun.name;Q('#loadoutSpecs').textContent=gun.count+' projectile'+(gun.count>1?'s':'')+' / burst · '+save.visualXP+' career correct hits';drawLoadout();
 Q('#frameSteps').innerHTML=R.frames.map((fr,i)=>'<span class="'+(i<=tier?'earned':'')+'"><i></i>'+esc(fr.name)+'</span>').join('');
}
function updateRibbon(){const el=Q('#missionRibbon');el.hidden=!R.campaignRun||!R.active||!active||!!R.modeName();if(el.hidden){ribbonKey='';return;}const key=active.id+'::'+frameTier();if(key===ribbonKey)return;ribbonKey=key;const f=frameLook();el.innerHTML='<span>CH '+String(active.chapter+1).padStart(2,'0')+' · '+(active.kind==='transfer'?'DISPATCH':'NIGHTINGALE')+'</span><b>'+esc(active.title)+'</b><small>'+esc(f.name)+' · progress saves as you answer</small>';}
function drawLoadout(){const cv=Q('#loadoutShip'),g=cv.getContext('2d');g.clearRect(0,0,cv.width,cv.height);g.strokeStyle='#66b9c533';g.lineWidth=1;for(let x=0;x<cv.width;x+=20){g.beginPath();g.moveTo(x,0);g.lineTo(x,cv.height);g.stroke();}for(let y=0;y<cv.height;y+=20){g.beginPath();g.moveTo(0,y);g.lineTo(cv.width,y);g.stroke();}R.drawFrame(g,180,90,2,frameTier(),save.visualXP*.1,true,-Math.PI/2,0);}
function mcqItems(items){return [...new Map(items.filter(it=>it.type==='q').map(it=>[it.id,it])).values()];}
function topicProgress(r){
 const items=mcqItems(r.items),stats=R.itemStats(),total=items.length,retired=items.filter(R.isMastered).length;
 const unseen=items.filter(it=>!R.isMastered(it)&&!((stats[it.id]||{}).seen||(stats[it.id]||{}).right||(stats[it.id]||{}).wrong||(stats[it.id]||{}).guessed)).length;
 const remaining=total-retired,repeats=remaining-unseen,started=retired>0||repeats>0,percent=total?Math.round(retired/total*100):0;
 return {retired,total,remaining,unseen,repeats,percent,started,state:!total?'none':!remaining?'full':!started?'empty':percent<34?'started':percent<67?'half':'advanced'};
}
function openWarMap(){const rooms=R.deckRooms();selectedSector=Math.max(0,rooms.findIndex(r=>topicProgress(r).remaining));R.showScreen('warRoom');renderWarMap();}
function renderWarMap(){
 const all=R.deckRooms(),st=topicProgress({items:all.flatMap(r=>r.items)});
 Q('#warCount').textContent=all.length+' TOPICS / '+st.total+' MCQs';Q('#warMastery').textContent=st.retired+' completed · '+st.remaining+' left';
 const positions=all.map((r,i)=>{const row=Math.floor(i/4),col=row%2?3-i%4:i%4;return{x:125+250*col,y:64+128*row};});
 Q('#warPaths').innerHTML=positions.slice(1).map((p,i)=>{const a=positions[i];return '<path d="M'+a.x+' '+a.y+' L'+p.x+' '+p.y+'" fill="none" stroke="#416c79" stroke-width="2" stroke-dasharray="5 7"/>';}).join('');
 const labels={none:'NO MCQs',empty:'UNTOUCHED',started:'IN PROGRESS',half:'BUILDING MASTERY',advanced:'NEARLY COMPLETE',full:'COMPLETED'};
 Q('#warNodes').innerHTML=all.map((r,i)=>{const p=positions[i],st=topicProgress(r),count=st.total?st.remaining+' left · '+st.retired+'/'+st.total+' completed':'No MCQs';return '<button class="warNode progress-'+st.state+'" data-sector="'+i+'" aria-label="'+esc(r.topic)+', '+count+'" style="--nx:'+p.x/10+'%;--ny:'+p.y/6.4+'%;--sectorFill:'+st.percent+'%"><span>TOPIC '+String(i+1).padStart(2,'0')+' / '+labels[st.state]+'</span><b>'+esc(r.topic)+'</b><small>'+count+'</small><i></i></button>';}).join('');
 Q('#warNodes').querySelectorAll('[data-sector]').forEach(b=>b.onclick=()=>{inspectSector(+b.dataset.sector);if(innerWidth<800)Q('#warTopic').scrollIntoView({block:'start',behavior:'smooth'});});inspectSector(selectedSector);
}
function selectMission(m){selectedMission=m;const r=R.deckRooms()[selectedSector],st=topicProgress(r);Q('#warNext').textContent=m?r.topic+' · '+m.title:r.topic+(st.total?' · all MCQs completed':' · no MCQs');Q('#warDeploy').disabled=!m;Q('#warDeploy').textContent=m?'Play remaining MCQs →':st.total?'All MCQs completed':'No MCQs';Q('#warConcepts').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(!!m&&b.dataset.mission===m.id)));}
function inspectSector(i){selectedSector=i;const r=R.deckRooms()[i],st=topicProgress(r);Q('#warSector').textContent='TOPIC '+String(i+1).padStart(2,'0');Q('#warTopic').textContent=r.topic;Q('#warIntelText').textContent=st.unseen+' unseen · '+st.repeats+' need repeat practice. A missed or guessed question stays unfinished until its required correct repeats are complete.';
 Q('#warIntelStats').innerHTML='<b>'+st.total+'<small>TOTAL MCQs</small></b><b>'+st.retired+'<small>COMPLETED</small></b><b>'+st.remaining+'<small>LEFT</small></b>';
 const missions=[{id:'topic',title:'All unfinished MCQs',items:r.items},...(r.concepts||[]).map((c,k)=>({id:'concept-'+k,title:c.title,items:c.items}))].filter(m=>mcqItems(m.items).length);
 Q('#warConcepts').innerHTML=missions.map((m,k)=>{const st=topicProgress(m);return '<li class="'+(!st.remaining?'retired':'')+'"><button data-mission="'+m.id+'" data-concept="'+k+'"'+(!st.remaining?' disabled':'')+'>'+esc(m.title)+'<small>'+st.remaining+' left · '+st.retired+'/'+st.total+' completed</small></button></li>';}).join('');
 Q('#warConcepts').querySelectorAll('button').forEach(b=>b.onclick=()=>selectMission(missions[+b.dataset.concept]));
 Q('#warNodes').querySelectorAll('[data-sector]').forEach(b=>{b.classList.toggle('selected',+b.dataset.sector===i);b.setAttribute('aria-pressed',String(+b.dataset.sector===i));});selectMission(missions.find(m=>topicProgress(m).remaining)||null);
}
function deploySelected(){
 if(!selectedMission)return;const base=R.deckRooms()[selectedSector],items=mcqItems(selectedMission.items).filter(it=>!R.isMastered(it));
 if(!items.length){inspectSector(selectedSector);return;}
 const room={...base,locus:'MCQ map practice',topic:base.topic+' · '+selectedMission.title,mode:'',review:true,studyPractice:true,randomFree:false,missionConcept:null,concepts:[],nextSetPool:items,items:items.slice(0,10),note:['Unfinished MCQs only. Progress saves across game modes. Use Next set to move to another group without marking skipped questions complete.']};
 R.start([room],0);R.beginCombat();
}
R.campaign={hudLabel:()=>active?'Chapter '+String(active.chapter+1).padStart(2,'0')+' / 20 · '+(active.kind==='transfer'?'Dispatch':'Mission'):'',launch:launch,deploy:launch,advanceSet,openWarMap,render,frameTier,frameLook,onCorrect,showBriefing,routeFor,recordItem,undoItem,missionItems,timeline,next,clearedChapters,updateRibbon,topicProgress,renderWarMap,inspectSector};
Q('#campaignLaunch').onclick=launch;Q('#warDeploy').onclick=deploySelected;Q('#warBack').onclick=()=>R.showScreen('home');
// Animated hangar, drawn at a bounded resolution and paused when it is off screen.
let last=0;const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;const canvas=Q('#hangarArt'),c=canvas.getContext('2d');
function hangarFit(w,h){
 const pad=Math.max(16,Math.min(28,w*.04,h*.08)),narrow=w<650&&h>400;
 const zone=narrow?Math.min(300,h*.48):h-44;
 const size=Math.max(20,Math.min(narrow?w-2*pad:w*.46-2*pad,zone-2*pad,500));
 return {narrow,cx:narrow?w/2:w*.74,cy:zone/2,sc:size/300,size,pad};
}
function hangar(now){requestAnimationFrame(hangar);if(now-last<(reduced?1000:33)||Q('#home').hidden)return;const rect=canvas.getBoundingClientRect();if(rect.bottom<0||rect.top>window.innerHeight)return;last=now;
 const dpr=Math.min(window.devicePixelRatio||1,1.5),w=rect.width,h=rect.height;if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}c.setTransform(dpr,0,0,dpr,0,0);const t=reduced?0:now/1000,tier=frameTier(),f=frameLook();
 const bg=c.createLinearGradient(0,0,w,h);bg.addColorStop(0,(FNPHTheme.light?'#f7f5ee':'#080f18'));bg.addColorStop(.55,(FNPHTheme.light?'#e4e9e4':'#142c38'));bg.addColorStop(1,(FNPHTheme.light?'#f3f1e9':'#080e16'));c.fillStyle=bg;c.fillRect(0,0,w,h);
 const {narrow,cx,cy,sc}=hangarFit(w,h);
 // Cathedral-like hangar architecture and warm shafts of light.
 for(let k=0;k<9;k++){const x=w*.34+k*w*.1;c.fillStyle=k%2?(FNPHTheme.light?'#d8dfdc':'#152632'):(FNPHTheme.light?'#e6eae4':'#1c3440');c.fillRect(x,0,w*.025,h);c.fillStyle='#aacac519';c.fillRect(x+w*.025,0,2,h);}
 c.save();c.globalCompositeOperation='screen';for(let k=0;k<3;k++){const x=w*.53+k*w*.17;c.beginPath();c.moveTo(x,-20);c.lineTo(x+30,-20);c.lineTo(x-90,h);c.lineTo(x-210,h);c.closePath();const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'#d5e8c22b');g.addColorStop(1,'#d5e8c200');c.fillStyle=g;c.fill();}c.restore();
 c.strokeStyle='#89bbc322';c.lineWidth=1;for(let i=0;i<14;i++){const y=h*.69+Math.pow(i/13,1.7)*h*.4;c.beginPath();c.moveTo(0,y);c.lineTo(w,y);c.stroke();}for(let i=-8;i<12;i++){c.beginPath();c.moveTo(cx+i*20,h*.69);c.lineTo(cx+i*120,h);c.stroke();}
 // Refit platform and projected reticle.
 c.save();c.translate(cx,narrow?285:h*.86);c.scale(1,.24);c.fillStyle='#02070dbb';c.beginPath();c.arc(0,0,sc*111,0,Math.PI*2);c.fill();for(let k=0;k<3;k++){c.strokeStyle=k?f.core+'44':f.core+'aa';c.lineWidth=k?1:3;c.beginPath();c.arc(0,0,sc*(90+k*17),t*.12+k,t*.12+k+Math.PI*1.7);c.stroke();}c.restore();
 c.save();c.translate(cx,cy);c.strokeStyle=f.core+'1e';c.lineWidth=1;c.setLineDash([4,8]);c.beginPath();c.arc(0,0,sc*125,0,Math.PI*2);c.stroke();c.setLineDash([]);c.restore();
 R.drawFrame(c,cx,cy,sc,tier,t,false);
 // Technical annotation lines, indexing and a scan pass.
 c.font='10px monospace';c.fillStyle=FNPHTheme.light?'#526874':f.core+'bb';c.strokeStyle=FNPHTheme.light?'#a0aeaa':f.core+'66';for(const [dy,label] of (narrow||w<1100||h<400?[]:[[-65,'NEURAL LINK / ONLINE'],[20,'ARMOUR / INTEGRITY 100%'],[80,'PROPULSION / STANDBY']])){const yy=cy+dy*sc;c.beginPath();c.moveTo(cx+45*sc,yy);c.lineTo(cx+100*sc,yy-16);c.lineTo(w-22,yy-16);c.stroke();c.fillText(label,Math.min(w-230,cx+95*sc),yy-22);}
 const scan=(t*.12%1)*h;c.fillStyle=f.core+'08';c.fillRect(w*.38,scan,w*.62,2);
 for(let i=0;i<36;i++){const x=(i*127.1+t*(i%2?3:-2))%w,y=(i*79.3+t*7)%h;c.fillStyle=i%3?'#b9ebda44':'#ffd9a477';c.fillRect(x,y,1.5,1.5);}
 const shade=narrow?c.createLinearGradient(0,250,0,430):c.createLinearGradient(0,0,w,0);shade.addColorStop(0,narrow?(FNPHTheme.light?'#f7f5ee00':'#050a1200'):(FNPHTheme.light?'#f7f5ee':'#050a12'));shade.addColorStop(.35,narrow?(FNPHTheme.light?'#f7f5ee44':'#050a1244'):(FNPHTheme.light?'#f7f5eeed':'#050a12ed'));shade.addColorStop(narrow?1:.6,narrow?(FNPHTheme.light?'#f7f5ee':'#050a12'):(FNPHTheme.light?'#f7f5ee00':'#050a1200'));c.fillStyle=shade;c.fillRect(0,0,w,h);
}
render();requestAnimationFrame(hangar);
})();
