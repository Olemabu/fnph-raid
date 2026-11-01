/* Runs before the large embedded syllabus: don't offer dead launch controls
   while the remainder of the single-file game is still downloading. */
(function(){
'use strict';
let ready=false,failed=false,timer;
const launch=document.getElementById('campaignLaunch');
const panel=document.createElement('div');panel.id='startupStatus';panel.setAttribute('role','status');panel.setAttribute('aria-live','polite');
panel.innerHTML='<div><strong id="startupTitle">Loading your syllabus and game…</strong><p id="startupDetail">Please wait for the download to finish. Your saved progress is kept.</p><i class="startupProgress" aria-hidden="true"></i></div><button id="startupRetry" type="button">Retry download</button>';
document.getElementById('home').prepend(panel);
if(launch){launch.disabled=true;launch.textContent='Loading game…';}
const title=document.getElementById('startupTitle'),detail=document.getElementById('startupDetail');
function fail(message){if(ready)return;failed=true;panel.classList.add('startupFailed');title.textContent='The game has not finished loading';detail.textContent=message||'The download may have been interrupted. Retry to load a fresh copy; your saved progress stays here.';}
document.getElementById('startupRetry').onclick=()=>{const url=new URL(location.href);url.searchParams.set('reload',Date.now().toString());location.replace(url.href);};
// A partial HTML response can contain the menu but none of its game handlers.
document.addEventListener('click',event=>{if(ready)return;const button=event.target.closest('button');if(button&&button.id!=='startupRetry'){event.preventDefault();event.stopImmediatePropagation();panel.scrollIntoView({block:'start'});}},true);
window.addEventListener('error',()=>fail('Part of the game could not load. Retry the download. Your saved progress will not be reset.'));
timer=setTimeout(()=>fail('The syllabus is still downloading. You can wait, or retry the download if it has stopped.'),20000);
window.addEventListener('load',()=>{if(ready||failed)return;if(window.FNPHUnpackStarted){title.textContent='Preparing your game…';detail.textContent='Download complete. Preparing the syllabus and controls.';}else fail();});
window.FNPHBoot={fail,finish(){
 const complete=()=>{const R=window.$&&window.$.raid;if(!R||!R.campaign||!R.operations||!window.$.initialized||typeof launch.onclick!=='function'){fail();return;}
 ready=true;clearTimeout(timer);panel.remove();launch.disabled=false;document.documentElement.dataset.gameReady='true';};
 const afterImages=()=>{const R=window.$&&$.raid;Promise.resolve(R&&R.shipAssetsReady).then(complete).catch(()=>fail('The ship artwork could not load. Retry the download.'));};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',afterImages,{once:true});else afterImages();
}};
})();
