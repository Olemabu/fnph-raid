const VERSION='b65acd74e41ad912',CACHE='fnphraid-offline-'+VERSION;
const ROOT=new URL('./',self.location),GAME=new URL('fnph-raid.html',ROOT).href;
const FILES=['fnph-raid.html','manifest.webmanifest','icon-192.png','icon-512.png','apple-touch-icon.png'];
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const staged=[];
 for(const file of FILES){
  const url=new URL(file,ROOT),response=await fetch(url,{cache:'reload'});
  if(!response.ok)throw Error('Offline download failed');
  const bytes=await response.arrayBuffer();
  if(file==='fnph-raid.html'){const text=new TextDecoder().decode(bytes);if(!text.includes('id="fnphPayload"')||!text.trim().endsWith('</html>'))throw Error('Incomplete game download');}
  staged.push([url.href,new Response(bytes,{status:200,headers:response.headers})]);
 }
 const cache=await caches.open(CACHE);await Promise.all(staged.map(([url,response])=>cache.put(url,response)));
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('fnphraid-offline-')&&key!==CACHE)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('message',event=>{if(event.data==='ACTIVATE_UPDATE')self.skipWaiting();if(event.data==='OFFLINE_STATUS')event.waitUntil((async()=>{const cache=await caches.open(CACHE),ready=(await Promise.all(FILES.map(f=>cache.match(new URL(f,ROOT).href)))).every(Boolean);event.ports[0]?.postMessage({ready,version:VERSION});})());});
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==ROOT.origin||!url.pathname.startsWith(ROOT.pathname))return;const name=url.pathname.slice(ROOT.pathname.length);if(name==='fnph-raid.html'||(event.request.mode==='navigate'&&name==='')){event.respondWith((async()=>await(await caches.open(CACHE)).match(GAME)||fetch(event.request))());}else if(FILES.includes(name))event.respondWith((async()=>await(await caches.open(CACHE)).match(new URL(name,ROOT).href)||fetch(event.request))());});
