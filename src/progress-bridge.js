(function(){
'use strict';const R=$.raid;
function hash(s){let h=5381;for(let i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;return(h>>>0).toString(36);}
R.progressId=function(it){if(it.type!=='q'||!it.room)return null;const link=window.FNPH_MCQ_LINKS[it.id];return link&&link.signature===hash(it.room.topic+'::'+it.prompt+'::'+it.answer)?link.id:null;};
R.recordProgress=(it,kind,state)=>{const id=R.progressId(it);if(id)McqProgressSync.record(id,kind,state);};
McqProgressSync.configure({applyShared:R.applySharedSave,seed:()=>{const out={};for(const room of R.deckRooms())for(const it of room.items){const id=R.progressId(it),s=R.itemStats()[it.id];if(id&&s)out[id]={done:!!s.mcqDone,remaining:s.mcqRemaining||0,seen:!!s.seen};}return out;},apply:R.applyProgress});
const pane=document.getElementById('homePane-progress'),button=document.createElement('button');button.className='btn';button.textContent='Central saves / Sync with Nebula';button.onclick=()=>{R.homeMenu.close();McqProgressSync.open();};pane.prepend(button);
const mapButton=document.createElement('button');mapButton.className='btn';mapButton.textContent='Central saves / Sync with Nebula';mapButton.onclick=()=>McqProgressSync.open();document.querySelector('.warHeader').append(mapButton);
})();
