/* Decode the bundled game locally. No secondary script or data download. */
(async function(){
'use strict';
window.FNPHUnpackStarted=true;window.FNPHBoot.stage('Unpacking the syllabus…','Ship images are already bundled and loading locally.',45);
try{
 if(typeof DecompressionStream!=='function')throw Error('This browser cannot unpack the game. Open it in a current Chrome, Edge, Firefox or Safari browser.');
 const payload=document.getElementById('fnphPayload'),binary=atob(payload.textContent.trim());
 const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
 const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
 const source=await new Response(stream).text();
 window.FNPHBoot.stage('Starting flight controls…','Preparing your saved progress and syllabus map.',75);
 const script=document.createElement('script');script.textContent=source;
 document.body.appendChild(script);payload.remove();
}catch(error){window.FNPHBoot.fail(error.message||'The game download was interrupted. Retry to download a complete copy.');}
})();
