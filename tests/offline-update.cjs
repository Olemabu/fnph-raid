const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const html=v=>`<html><script id="fnphPayload">${v}</script></html>`;
function worker(fetcher,saved=html('old')){
 const events={},entries=new Map(),game='https://olemabu.github.io/fnph-raid/dist/fnph-raid.html';if(saved)entries.set(game,new Response(saved));let activated=false;
 const cache={match:async u=>entries.get(String(u))?.clone(),put:async(u,r)=>entries.set(String(u),r)};
 const self={location:game.replace('fnph-raid.html','sw.js'),addEventListener:(type,fn)=>events[type]=fn,skipWaiting:async()=>activated=true,clients:{claim:async()=>{}}};
 const c={self,URL,Response,TextDecoder,AbortSignal,caches:{open:async()=>cache,keys:async()=>[],delete:async()=>{}},fetch:fetcher};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/pwa/sw.js'),'utf8'),c);
 return {async navigate(){let out;events.fetch({request:{url:game,method:'GET',mode:'navigate'},respondWith:p=>out=p});return out;},async install(){let p;events.install({waitUntil:v=>p=v});await p;},cache,activated:()=>activated};
}
test('online navigation replaces an old cached game with a validated current build',async()=>{
 let mode;const w=worker(async(r,o)=>{mode=o.cache;return new Response(html('new'));});assert.equal(await (await w.navigate()).text(),html('new'));assert.equal(mode,'no-store');assert.equal(await (await w.cache.match('https://olemabu.github.io/fnph-raid/dist/fnph-raid.html')).text(),html('new'));
});
test('offline navigation still plays the saved complete build',async()=>{const w=worker(async()=>{throw Error('offline');});assert.equal(await (await w.navigate()).text(),html('old'));});
test('failed or incomplete online updates never replace the working saved game',async()=>{for(const response of [new Response('bad',{status:503}),new Response('<html>partial')]){const w=worker(async()=>response);assert.equal(await (await w.navigate()).text(),html('old'));}});
test('a fully staged update activates automatically; an incomplete download does not',async()=>{
 const w=worker(async url=>new Response(String(url).endsWith('fnph-raid.html')?html('new'):'asset'));await w.install();assert(w.activated());
 const broken=worker(async()=>new Response('partial'));await assert.rejects(broken.install());assert.equal(broken.activated(),false);
});
