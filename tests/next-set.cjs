const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'../src',f),'utf8'),raid=read('raid.js');
test('a missed MCQ requires two correct repeats; another miss resets it to two',()=>{
 const it={id:'a',type:'q'},stats={},c={stats,deck:{rooms:[{items:[it]}]},R:{cur:it},MASTER_AT:3,SRS_DAYS:[0,1,3,7,16,35],store:{set(){}},Date,st:id=>stats[id]||(stats[id]={box:0,right:0,wrong:0,seen:0})};
 vm.createContext(c);vm.runInContext(raid.slice(raid.indexOf('function grade('),raid.indexOf('// Preserve prior answers')),c);
 c.grade('a',false);assert.equal(stats.a.mcqRemaining,2);c.grade('a',true);assert.equal(stats.a.mcqRemaining,1);assert.equal(stats.a.mcqDone,false);
 c.grade('a',false);assert.equal(stats.a.mcqRemaining,2);c.grade('a',true);c.grade('a',true);assert.equal(stats.a.mcqDone,true);
});
test('respawning replaces outstanding duplicates with exactly two repeats',()=>{
 const it={id:'a',type:'q'},other={id:'b'},c={R:{cur:it,campaignRun:true,queue:[it,it,it,other],total:5,toast(){}},$:{hero:{},enemies:[],carriers:[],bullets:[]},deathMode:'drill',setTimeout(){},nextQuestion(){},insertMcqRepeat:i=>c.R.queue.push(i)};
 vm.createContext(c);vm.runInContext(raid.slice(raid.indexOf('function respawn('),raid.indexOf('function swarmDown(')),c);c.respawn();assert.equal(c.R.queue.filter(i=>i.id==='a').length,2);assert(c.R.queue.includes(other));
});
function operations(room,deck){const c={R:{active:true,campaignRun:false,rooms:[room],si:0,isMastered:i=>!!i.done,deckRooms:()=>deck,toast(){},toHome(){},start(rooms){this.rooms=rooms;this.cur=null;},beginCombat(){}},shuffle:a=>a};vm.createContext(c);const src=read('operations.js');vm.runInContext(src.slice(src.indexOf('R.nextSet=function'),src.indexOf('R.operations=')),c);return c.R;}
test('Next set in free flight chooses fresh questions and preserves unfinished work',()=>{
 const all=Array.from({length:12},(_,i)=>({id:String(i),type:'q'})),room={randomFree:true,randomScope:'all',items:all.slice(0,4)},R=operations(room,[{items:all}]);assert.equal(R.nextSet(),true);assert.deepEqual(Array.from(R.rooms[0].items,i=>i.id),['4','5','6','7']);assert(all.every(i=>!i.done));
});
test('Next set moves to the next OSCE station while retaining full station order and the original pack',()=>{
 const all=[1,2,3].flatMap(n=>[{id:n+'a',osceLesson:{stationNumber:n}},{id:n+'b',type:'l'}]),R=operations({studyMode:'osce',items:all},[]);R.cur=all[0];assert(R.nextSet());assert.deepEqual(Array.from(R.rooms[0].items,i=>i.id),['2a','2b']);assert.equal(R.rooms[0].nextSetPool,all);assert(R.nextSet());assert.deepEqual(Array.from(R.rooms[0].items,i=>i.id),['3a','3b']);assert(all.every(i=>!i.done));
});
test('campaign Next set saves a cursor without falsely completing the skipped mission',()=>{
 const all=[1,2,3].map(n=>({id:String(n),kind:'concept',concept:{items:[{}]}})),c={active:all[0],timeline:()=>all,save:{},complete:new Set(),persist(){},weakTransfer:()=>[],topicRun:true,R:{isMastered:()=>false,toast(){},toHome(){c.active=null;}},launchMission:m=>c.active=m};vm.createContext(c);const src=read('campaign.js');vm.runInContext(src.slice(src.indexOf('function advanceSet('),src.indexOf('function showBriefing(')),c);
 assert(c.advanceSet());assert.equal(c.active.id,'2');assert.equal(c.save.nextMission,'2');assert.equal(c.complete.size,0);
 vm.runInContext(src.slice(src.indexOf('function next()'),src.indexOf('function clearedChapters()')),c);assert.equal(c.next().id,'2');
});
