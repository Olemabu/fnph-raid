const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'../src',f),'utf8');
test('all 1783 source mappings use stable unique source IDs; edited answers and generated drills are excluded',()=>{
 const c={window:{},R:{},document:{getElementById:()=>({prepend(){}}),createElement:()=>({}),querySelector:()=>({append(){}})},McqProgressSync:{configure(){},record(){}},$:{raid:{homeMenu:{close(){}}}}};
 c.$.raid.deckRooms=()=>[];c.$.raid.applyProgress=()=>{};vm.createContext(c);vm.runInContext(read('progress-map.js'),c);vm.runInContext(read('progress-bridge.js'),c);
 assert.equal(Object.keys(c.window.FNPH_MCQ_LINKS).length,1783);assert.equal(new Set(Object.values(c.window.FNPH_MCQ_LINKS).map(v=>v.id)).size,1783);
 const src=read('raid.js');vm.runInContext(src.slice(src.indexOf('function hash('),src.indexOf('{const bh=hash(window.FNPH_DECK)')),c);const deck=c.parseDeck(read('deck.txt'));
 const linked=deck.rooms.flatMap(r=>r.items).filter(i=>c.$.raid.progressId(i));assert.equal(linked.length,1783);
 const it=linked[0];assert.equal(c.$.raid.progressId({...it,answer:'changed answer'}),null);assert.equal(c.$.raid.progressId({...it,type:'l'}),null);
});
test('actual game grading emits wrong/right only after the local result is saved',()=>{
 const src=read('raid.js'),it={id:'a',type:'q'},stats={},calls=[];
 const c={stats,deck:{rooms:[{items:[it]}]},R:{cur:it,recordProgress:(it,kind)=>calls.push([kind,stats[it.id].mcqRemaining])},MASTER_AT:3,SRS_DAYS:[0,1,3,7,16,35],store:{set(){}},Date,st:id=>stats[id]||(stats[id]={box:0,right:0,wrong:0,seen:0})};vm.createContext(c);vm.runInContext(src.slice(src.indexOf('function grade('),src.indexOf('// Preserve prior answers')),c);c.grade('a',false);c.grade('a',true);c.grade('a',true);assert.deepEqual(calls,[['wrong',2],['right',1],['right',0]]);
});
