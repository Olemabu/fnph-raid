/* First bytes of the package: visible before the stylesheet or game payload. */
(function(){
'use strict';
const start=performance.now();let ready=false,watchdog;
const panel=document.createElement('section');panel.id='bootScreen';panel.setAttribute('role','status');panel.setAttribute('aria-live','polite');panel.innerHTML='<div><small>FNPH RAID / KESTREL</small><h1 id="startupTitle">Opening your game…</h1><p id="startupDetail">The syllabus, rendered ship and sound are included in this package.</p><progress id="startupProgress" max="100" value="8"></progress><p id="startupElapsed"></p><button id="startupRetry" type="button">Reload game</button></div>';document.body.appendChild(panel);
const Q=id=>document.getElementById(id),stages=[];
const elapsed=setInterval(()=>{if(!ready)Q('startupElapsed').textContent=Math.floor((performance.now()-start)/1000)+' seconds elapsed';},500);
function fail(message){if(ready)return;clearTimeout(watchdog);panel.classList.add('startupFailed');Q('startupTitle').textContent='Loading stopped';Q('startupDetail').textContent=message||'Reload this complete package. Your saved progress will be kept.';}
function stage(title,detail,percent){if(ready)return;stages.push({title,ms:Math.round(performance.now()-start)});Q('startupTitle').textContent=title;Q('startupDetail').textContent=detail;Q('startupProgress').value=percent;}
Q('startupRetry').onclick=()=>{if(location.protocol==='file:')location.reload();else{const url=new URL(location.href);url.searchParams.set('reload',Date.now().toString());location.replace(url.href);}};
document.addEventListener('click',e=>{if(ready)return;const button=e.target.closest('button');if(button&&button.id!=='startupRetry'){e.preventDefault();e.stopImmediatePropagation();}},true);
window.addEventListener('error',e=>fail(e.message||'A game component could not start. Reload the complete package.'));
watchdog=setTimeout(()=>fail('This copy has stalled. Reload it, or extract the offline ZIP and open fnph-raid.html in Chrome or Edge.'),20000);
window.FNPHBoot={stage,fail,stages,finish(){const complete=()=>{const R=window.$&&$.raid;if(!R?.campaign||!R.operations||!$.initialized||typeof Q('campaignLaunch')?.onclick!=='function'){fail('Game controls could not start. Reload the complete package.');return;}ready=true;clearTimeout(watchdog);clearInterval(elapsed);window.FNPHBoot.readyMs=Math.round(performance.now()-start);document.documentElement.dataset.gameReady='true';panel.remove();Q('campaignLaunch').disabled=false;};const afterImages=()=>{stage('Preparing the rendered ship…','Decoding the two bundled ship images locally. No artwork download is needed.',90);Promise.resolve(window.$?.raid?.shipAssetsReady).then(complete).catch(e=>fail(e.message||'Ship artwork could not load. Reload the package.'));};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',afterImages,{once:true});else afterImages();}};
})();
