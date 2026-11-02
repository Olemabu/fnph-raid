// Exercise the real deck parser and study queue without a browser or provider call.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/raid.js'),'utf8');
const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/osce-pack.json'),'utf8'));
function engine(){
 const state={card:null,waves:0},stats={};
 const context={console,stats,MASTER_AT:3,store:{set(){}},R:{si:0,rooms:[],modeName:()=>'',campaignRun:false},$:{setDifficulty(){}},SLOTS:Array(20),timerOn:true,
  st:id=>stats[id]||(stats[id]={box:0,mcqDone:false}),mastered:it=>it.type==='q'?!!stats[it.id]?.mcqDone:(stats[it.id]?.box||0)>=3,
  masteredCount:r=>r.items.filter(context.mastered).length,pickConcept:()=>null,mixQueue:a=>a.slice().reverse(),conceptsDone:()=>0,arsenalLine:()=>'',noteHTML:a=>a.join(' '),fmt:x=>String(x),
  esc:s=>String(s).replaceAll('<','&lt;'),card:(kind,title,body,button,callback)=>{state.card={kind,title,body,button,callback};},setupWave:()=>state.waves++,stationCleared(){},Q:()=>({}),pickOne:a=>a[0]};
 vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/study-kit.js'),'utf8'),context);
 vm.runInContext(source.slice(source.indexOf('function hash('),source.indexOf('{const bh=')),context);
 vm.runInContext(source.slice(source.indexOf('function studyRoom('),source.indexOf('R.findStudy=')),context);
 vm.runInContext(source.slice(source.indexOf('function insertMcqRepeat('),source.indexOf('R.optionLabel=')),context);
 vm.runInContext(source.slice(source.indexOf('function openBriefing('),source.indexOf('function fmt(')),context);
 context.R.start=rooms=>{context.R.rooms=rooms;};return{context,state,stats};
}
test('OSCE station compiles all phases and preserves clinical order despite the normal shuffle',()=>{
 const{context:c,state}=engine();c.R.playStudyPack(fixture);const room=c.R.rooms[0];
 assert.equal(room.items.length,13);assert.equal(room.concepts.length,0);assert.equal(room.items[0].osceLesson.step,1);assert.equal(room.items[3].osceLesson.step,2);
 c.openBriefing();assert.deepEqual(Array.from(c.R.queue,i=>i.id),Array.from(room.items,i=>i.id));
 state.card.callback();assert.match(state.card.title,/Step 1 of 4/);assert(state.card.body.includes(fixture.stations[0].phases[0].say));assert(state.card.body.includes(fixture.stations[0].phases[0].expect));assert(state.card.body.includes(fixture.stations[0].phases[0].reply));
 state.card.callback();assert.equal(state.waves,1);
 c.stats[c.R.cur.id].mcqDone=true;c.nextQuestion();assert.equal(state.waves,2);assert.match(c.R.cur.prompt,/What would you say/);
 c.stats[c.R.cur.id].mcqDone=true;c.nextQuestion();assert.equal(state.waves,3);assert.match(c.R.cur.prompt,/How do you respond/);
 c.stats[c.R.cur.id].mcqDone=true;c.nextQuestion();assert.match(state.card.title,/Step 2 of 4/);
});
test('missed OSCE responses stay before subsequent phases; restarting affects only this session',()=>{
 const{context:c}=engine();c.stats.syllabus={box:5};c.R.playStudyPack(fixture);const room=c.R.rooms[0],current=room.items[0],later=room.items[3];c.R.queue=[later];
 for(let n=0;n<3;n++)c.insertMcqRepeat(current);
 assert.deepEqual(Array.from(c.R.queue,i=>i.id),[current.id,current.id,current.id,later.id]);
 c.stats[current.id].mcqDone=true;assert.equal(c.R.studyProgress(fixture).done,1);c.R.playStudyPack(fixture,true);assert.equal(c.R.studyProgress(fixture).done,0);assert.equal(c.stats.syllabus.box,5);
});
test('multiple OSCE stations retain their own script and order rehearsal',()=>{
 const{context:c}=engine(),p=structuredClone(fixture);p.stations.push({...structuredClone(p.stations[0]),title:'Second station'});c.R.playStudyPack(p);
 const items=c.R.rooms[0].items;assert.equal(items.length,26);assert.equal(items[13].osceLesson.stationNumber,2);assert.notEqual(items[0].osceLesson.key,items[13].osceLesson.key);assert.equal(items.filter(i=>i.type==='l').length,2);
});
