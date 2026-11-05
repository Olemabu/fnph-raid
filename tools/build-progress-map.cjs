// Exact matching only: edited/generated/ambiguous questions never receive a source ID.
const fs=require('fs'),vm=require('vm'),path=require('path');
const raid=path.resolve(__dirname,'..'),nebula=path.resolve(process.argv[2]||path.join(raid,'../nebula'));
const c={NEBULA:{topics:{}},SLOTS:[]};c.window=c;vm.createContext(c);
for(const f of fs.readdirSync(nebula+'/data/topics').filter(f=>f.endsWith('.js')&&f!=='index.js'))vm.runInContext(fs.readFileSync(nebula+'/data/topics/'+f,'utf8'),c);
vm.runInContext(fs.readFileSync(nebula+'/data/syllabus.js','utf8'),c);
const src=fs.readFileSync(raid+'/src/raid.js','utf8');vm.runInContext(src.slice(src.indexOf('function hash('),src.indexOf('{const bh=hash(window.FNPH_DECK)')),c);
const deck=c.parseDeck(fs.readFileSync(raid+'/src/deck.txt','utf8'));
const clean=s=>String(s??'').replace(/\*\*|__|`/g,'').replace(/(^|\s)\*(\S[^*]*?)\*(?=\s|[.,;:)]|$)/g,'$1$2').replace(/\s+/g,' ').replace(/ = /g,' ＝ ').replace(/ :: /g,' : ').replace(/ ~~ /g,' ~ ').replace(/\|/g,'/').trim();
const cut=(s,n)=>s.length<=n?s:s.slice(0,s.lastIndexOf(' ',n-1)>n*.6?s.lastIndexOf(' ',n-1):n-1)+'…';
const matches=new Map();
for(const [tid,t] of Object.entries(c.NEBULA.topics))for(const q of t.mcqs||[]){
 if(!q.options||!Number.isInteger(q.answer))continue;
 const title=clean(c.NEBULA.syllabus.topics.find(t=>t.id===tid)?.title||''),key=title+'::'+clean(q.q)+'::'+cut(clean(q.options[q.answer]),220);
 const ids=matches.get(key)||[];ids.push(q.id);matches.set(key,ids);
}
const result={},ambiguous=new Set();let count=0;
for(const room of deck.rooms)for(const it of room.items.filter(it=>it.type==='q')){
 const ids=matches.get(room.topic+'::'+it.prompt+'::'+it.answer);if(!ids||ids.length!==1)continue;
 const signature=c.hash(room.topic+'::'+it.prompt+'::'+it.answer),prev=result[it.id];
 if(prev&&(prev.id!==ids[0]||prev.signature!==signature)){ambiguous.add(it.id);continue;}
 result[it.id]={id:ids[0],signature};count++;
}
for(const id of ambiguous)delete result[id];
fs.writeFileSync(raid+'/src/progress-map.js','window.FNPH_MCQ_LINKS='+JSON.stringify(result)+';\n');
console.log(Object.keys(result).length+' uniquely matched Raid MCQs; '+ambiguous.size+' ambiguous items excluded.');
