/* Spaceship practice and persistent gameplay menu. */
(function(){
'use strict';
const R=$.raid,Q=s=>document.querySelector(s);
const root=document.createElement('section');root.className='operations';root.setAttribute('aria-label','Spaceship practice');
root.innerHTML=`<div class="opsHeading"><div><span class="opsKicker">SPACESHIP COMBAT</span><h2>Random free run</h2></div><p>Fly your interceptor. Shoot the correct answer. Practise any topic or mix the whole syllabus.</p></div><div class="opsFields" id="opsSetup"><label>Syllabus topic<select id="opsSector"><option value="all">All syllabus topics · mixed</option></select></label><label>Run length<select id="opsCount"><option value="10">10 random items</option><option value="20" selected>20 random items</option><option value="40">40 random items</option><option value="0">Continuous</option></select></label><p id="opsStatus" role="status"></p><button class="btn launchBtn" id="opsDeploy">Start spaceship free run →</button></div>`;
Q('#home .freeFlight').before(root);
for(const [i,r] of R.deckRooms().entries())Q('#opsSector').add(new Option(r.topic,i));
function pool(){const scope=Q('#opsSector').value;return [...new Map((scope==='all'?R.deckRooms():[R.deckRooms()[+scope]]).flatMap(r=>r.items).filter(i=>!R.isMastered(i)).map(i=>[i.id,i])).values()];}
function shuffle(items){return items.map(i=>({i,k:Math.random()})).sort((a,b)=>a.k-b.k).map(x=>x.i);}
function status(){const n=pool().length;Q('#opsStatus').textContent=n+' active questions · saved mastery and earned ship upgrades';Q('#opsDeploy').disabled=!n;}
Q('#opsSector').onchange=status;Q('#opsCount').onchange=status;
Q('#opsDeploy').onclick=()=>{const items=shuffle(pool()),count=+Q('#opsCount').value;if(!items.length)return;const base=items[0].room,room={...base,locus:'Spaceship free run',topic:Q('#opsSector').value==='all'?'Mixed syllabus':base.topic,mode:'',review:true,randomFree:true,endless:count===0,randomScope:Q('#opsSector').value,missionConcept:null,concepts:[],items:items.slice(0,count||20),note:['Shoot the correct answer with your interceptor. Mastery progress saves automatically.']};R.start([room],0,{});const p=SLOTS[room.idx];$.hero.x=p.x*2;$.hero.y=p.y*2;R.beginCombat();};
R.onFreeRunClear=room=>{if(!room.randomFree||!room.endless)return false;const rooms=room.randomScope==='all'?R.deckRooms():[R.deckRooms()[+room.randomScope]],items=shuffle(rooms.flatMap(r=>r.items).filter(i=>!R.isMastered(i)));if(!items.length)return false;room.items=items.slice(0,20);R.beginCombat();R.toast('Next spaceship round',true);return true;};
R.operations={refresh:status};status();
const menus=document.createElement('nav');menus.id='gameMenuBar';menus.setAttribute('aria-label','Gameplay menu');menus.innerHTML='<button id="gameBack" disabled>Back / Retry</button><button id="gameGuessed" disabled>Guessed it</button><button id="gamePause">Pause · Esc / Start</button><button id="gameHome">Main menu</button>';Q('#play').appendChild(menus);Q('#gameBack').onclick=()=>R.reconsider(false);Q('#gameGuessed').onclick=()=>R.reconsider(true);Q('#gamePause').onclick=()=>R.pause();Q('#gameHome').onclick=()=>R.toHome();
function menuLoop(){requestAnimationFrame(menuLoop);Q('#gameBack').disabled=Q('#gameGuessed').disabled=!R.canReconsider();menus.hidden=!R.active||Q('#play').hidden||(!Q('#cardWrap').hidden&&R.phase!=='reviewEnd');menus.style.top=innerWidth<900?(innerHeight<500?'35px':Math.max(112,Q('#qbar').getBoundingClientRect().bottom+8)+'px'):'146px';}
requestAnimationFrame(menuLoop);
})();
