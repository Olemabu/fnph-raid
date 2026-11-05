const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'../src',f),'utf8'),code=read('timetable.js'),base={window:{},Date};vm.createContext(base);vm.runInContext(read('timetable-data.js'),base);vm.runInContext(code,base);const D=base.window.FNPH_TIMETABLE_DATA,M=base.window.NebulaRaidTimetable;
const on=(y,m,d)=>new Date(y,m-1,d,12);
test('5 November follows Substance day one, then day two and weekly revision',()=>{let p=M.calculate(D,{},on(2026,11,5));assert.equal(p.topicId,'substance');assert.equal(p.part,1);assert.equal(p.n,11);const q=M.calculate(D,{},on(2026,11,6));assert.equal(q.topicId,'substance');assert.equal(q.part,2);assert(!p.ids.some(id=>q.ids.includes(id)));assert.equal(p.ids.length+q.ids.length,D.topics.substance.mcqIds.length);assert.equal(M.calculate(D,{},on(2026,11,7)).kind,'revision');});
test('all 56 initial calendar days and topic parts match Nebula’s actual planning code',()=>{
 const app=fs.readFileSync(path.join(__dirname,'../../nebula/app.js'),'utf8'),order=Array.from(D.topicDays),start=on(2026,10,25);start.setHours(0,0,0,0);
 const c={S:D,P:{order},START:start,TOTAL_DAYS:56,EXAM_IDX:187,READY_IDX:77,Date,Math};vm.createContext(c);
 vm.runInContext(app.slice(app.indexOf('  function topicPart('),app.indexOf('  // Phase 1 (cover)'))+app.slice(app.indexOf('  const days = Array.from'),app.indexOf('  const allMcqs ='))+';globalThis.realDays=days;',c);
 for(let i=0;i<56;i++){const now=new Date(start);now.setDate(now.getDate()+i);const expected=c.realDays[i],got=M.calculate(D,{},now);assert.equal(got.topicId,expected.topicId);assert.equal(got.n,expected.n);if(got.topicId){const part=c.topicPart(expected);assert.equal(got.part,part.part);assert.equal(got.total,part.total);}}
});
test('personal start dates, swaps and old one-day orders work without changing today’s date',()=>{
 assert.equal(M.calculate(D,{plan:D.plan,start:'2026-10-26'},on(2026,11,5)).topicId,'interview');
 const order=Array.from(D.topicDays,id=>id==='substance'?'mood':id==='mood'?'substance':id);const day=M.calculate(D,{plan:D.plan,order},on(2026,11,5));assert.equal(day.topicId,'mood');assert.equal(day.date,'2026-11-05');
 assert.equal(M.calculate(D,{order:order.filter((_,i)=>i%2===0)},on(2026,11,5)).topicId,'mood');
 assert.equal(M.calculate(D,{plan:'another-plan',order},on(2026,11,5)).topicId,'substance');
 assert.equal(M.calculate(D,{start:'2026-02-30'},on(2026,11,5)).topicId,'substance');
});
test('only the scheduled MCQs are selected, and already mastered items never cause a different-topic fallback',()=>{
 const day=M.calculate(D,{},on(2026,11,5)),items=[...day.ids.map((id,i)=>({id:'raid-'+i,source:id,type:'q',done:i===0})),{id:'wrong-topic',source:D.topics.phenomenology.mcqIds[0],type:'q'}];
 const selected=M.select(items,day,x=>x.source,x=>x.done);assert.equal(selected.length,day.ids.length-1);assert(selected.every(x=>day.ids.includes(x.source)));for(const it of items)it.done=true;assert.equal(M.select(items,day,x=>x.source,x=>x.done).length,0);
});
function ui(linked=false,remote=null){
 const nodes=new Map(),raf=[],interval=[],store=new Map(),make=()=>({textContent:'',hidden:false,disabled:false,className:'',style:{},setAttribute(){},after(){},prepend(){}}),node=id=>{if(!nodes.has(id))nodes.set(id,make());return nodes.get(id);};
 const fixture=JSON.parse(JSON.stringify(D));const room={idx:0,topic:'Substance use disorders',concepts:[],items:[]};for(const id of fixture.topics.substance.mcqIds)room.items.push({id,source:id,type:'q',room});const other={idx:1,topic:'Phenomenology & psychopathology',items:[]};other.items=[{id:'old',source:fixture.topics.phenomenology.mcqIds[0],type:'q',done:false,room:other}];
 class Clock extends Date{constructor(...args){super(...(args.length?args:[2026,10,5,12]));}}
 const R={active:false,rooms:[],si:0,deckRooms:()=>[room,other],isMastered:i=>!!i.done,progressId:i=>i.source,escape:s=>s,homeMenu:{close(){}},campaign:{launch(){R.manual=true;},openWarMap(){R.map=true;}},flight:{completeSet(){}},showScreen(){},showCard(...args){R.card=args;},toHome(){R.active=false;},toast:m=>R.toastText=m,start(rooms){R.rooms=rooms;R.si=0;R.active=true;R.started=(R.started||0)+1;},beginCombat(){R.began=true;}};
 const c={window:null,$:{raid:R},document:{querySelector:node,createElement:make,addEventListener(){},hidden:false},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},Date:Clock,Map,Set,Math,setInterval:f=>interval.push(f),requestAnimationFrame:f=>raf.push(f),McqProgressSync:{isLinked:()=>linked,readTimetable:async()=>remote},addEventListener(){}};c.window=c;c.FNPH_TIMETABLE_DATA=fixture;vm.createContext(c);vm.runInContext(code,c);return {R,c,nodes,room,other,store};
}
test('main play launches today, Next set stays in its selection, and manual campaign is separate',async()=>{const t=ui();assert.match(t.nodes.get('#campaignLaunch').textContent,/Substance/);await t.R.timetable.launch();assert(t.R.began);assert(t.R.rooms[0].timetableRun);assert(!t.R.manual);const ids=new Set(t.R.timetable.plan().ids);assert(t.R.rooms[0].items.every(i=>ids.has(i.source)));assert(t.R.timetable.nextSet());assert(t.R.rooms[0].items.every(i=>ids.has(i.source)));assert.equal(t.other.items[0].done,false);});
test('completing today shows completion and never launches Phenomenology instead',async()=>{const t=ui();for(const it of t.room.items)it.done=true;await t.R.timetable.launch();assert.equal(t.R.started,undefined);assert.match(t.R.card[2],/All available MCQs/);t.R.card[4]();assert(t.R.map);assert(!t.R.manual);});

test('disconnecting or switching profiles never reuses the previous personal timetable',async()=>{const t=ui(true,{plan:D.plan,start:'2026-10-26'});await t.R.timetable.refresh();assert.equal(t.R.timetable.plan().topicId,'interview');t.store.delete('fnphraid.nebula-timetable-v1');t.c.McqProgressSync.isLinked=()=>false;await t.R.timetable.refresh();assert.equal(t.R.timetable.plan().topicId,'substance');});
