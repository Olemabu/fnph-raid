/* Nebula calendar is the default launch route; a manual topic never changes its saved progress. */
(function(root){
'use strict';
function dateOnly(s){if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return null;const [y,m,d]=s.split('-').map(Number),v=new Date(y,m-1,d);return v.getFullYear()===y&&v.getMonth()===m-1&&v.getDate()===d?v:null;}
function localDay(now){return [now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');}
function calculate(data,settings={},now=new Date()){
 const matches=!settings.plan||settings.plan===data.plan,s=matches?settings:{},start=dateOnly(s.start)||dateOnly(data.start),today=new Date(now.getFullYear(),now.getMonth(),now.getDate()),limit=Math.max(data.weeks*7,Math.round((dateOnly(data.examBy)-start)/864e5)+1)-1;
 const index=Math.max(0,Math.min(limit,Math.round((today-start)/864e5))),phase=index<data.weeks*7?1:index<=Math.round((dateOnly(data.readyBy)-start)/864e5)?2:3;
 let order=s.order;if(Array.isArray(order)&&order.length*2===data.topicDays.length)order=order.flatMap(id=>[id,id]);if(!Array.isArray(order)||order.length!==data.topicDays.length||order.some(id=>id!==null&&!data.topics[id]))order=data.topicDays;
 const revision=phase===1&&index%7===6,n=phase===1&&!revision?index-Math.floor(index/7)+1:null,topicId=n?order[n-1]:null;
 let part=1,total=1,ids=[],title='',kind='topic';
 if(phase>1){const pick=s.phaseDays?.[index];ids=pick?.mcq||[];title='Mixed MCQ review';kind='review';}
 else if(revision){ids=s.wrongIds||[];title='Weekly revision';kind='revision';}
 else if(!topicId){title='Mock · mixed MCQs';kind='mock';}
 else{const at=n-1;let left=at,right=at;while(left>0&&order[left-1]===topicId)left--;while(right+1<order.length&&order[right+1]===topicId)right++;part=at-left+1;total=right-left+1;const all=data.topics[topicId].mcqIds,per=Math.ceil(all.length/total);ids=all.slice((part-1)*per,part*per);title=data.topics[topicId].title;}
 if(!ids.length&&kind!=='topic')ids=Object.values(data.topics).flatMap(t=>t.mcqIds);
 return {date:localDay(now),index,n,phase,topicId,part,total,ids,title,kind,plan:data.plan,start:localDay(start),personalised:matches&&!!(s.start||s.order),key:data.plan+'::'+localDay(now)+'::'+(topicId||kind)+'::'+part};
}
function select(items,day,sourceId,mastered){const ranks=new Map(day.ids.map((id,i)=>[id,i])),seen=new Set();return items.filter(it=>it.type==='q'&&ranks.has(sourceId(it))&&!mastered(it)&&!seen.has(it.id)&&seen.add(it.id)).sort((a,b)=>ranks.get(sourceId(a))-ranks.get(sourceId(b)));}
root.NebulaRaidTimetable={calculate,select,dateOnly,localDay};
if(typeof document==='undefined'||typeof $==='undefined')return;
const R=$.raid,D=root.FNPH_TIMETABLE_DATA,Q=s=>document.querySelector(s),KEY='fnphraid.nebula-timetable-v1';let config={},refreshing=null,notice='',buttonBusy=false;
try{config=JSON.parse(localStorage.getItem(KEY)||'{}');}catch{}
const allItems=()=>R.deckRooms().flatMap(r=>r.items),plan=()=>calculate(D,config),itemsFor=day=>select(allItems(),day,R.progressId,R.isMastered);
function partLabel(day){return day.kind==='topic'?'Day '+day.part+' of '+day.total:day.phase>1?'Consolidation and review':'Revision / mock';}
function renderHome(){
 if(R.active||!Q('#campaignLaunch'))return;const day=plan(),left=itemsFor(day).length;
 Q('#campaignChapter').textContent=new Date().toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})+' · NEBULA TIMETABLE';
 Q('#campaignTitle').textContent=day.title;Q('#campaignObjective').textContent=day.title+' · '+partLabel(day);
 Q('#campaignStory').textContent=(day.n?'Nebula study day '+day.n+' / '+D.topicDays.length+'. ':'')+left+' MCQs left in today’s selection. Other topics stay available in MCQ map.';
 const status=Q('#timetableStatus');status.textContent=notice||(day.personalised?'Using your saved Nebula timetable.':root.McqProgressSync.isLinked()?'Nebula default plan · checking shared timetable…':'Nebula default plan · link Central saves for personal timetable changes.');
 const button=Q('#campaignLaunch');button.disabled=buttonBusy;button.textContent=buttonBusy?'Checking Nebula timetable…':left?'Play today · '+day.title:'Today complete · '+day.title;
 Q('#campaignObjectiveLabel').textContent='TODAY’S NEBULA TOPIC';
}
async function refresh(){
 if(refreshing)return refreshing;if(!localStorage.getItem(KEY)){config={};notice='';}if(!root.McqProgressSync.isLinked()){config={};notice='';renderHome();return;}
 refreshing=(async()=>{try{const value=await root.McqProgressSync.readTimetable();if(value){config=value;localStorage.setItem(KEY,JSON.stringify(config));notice=config.plan&&config.plan!==D.plan?'A different Nebula plan was found. Update both apps; the bundled plan is shown.':config.plan?'Shared Nebula timetable updated.':'No personal timetable saved yet · using Nebula’s default plan.';}}catch{notice=config.fetchedAt?'Offline · using your last saved Nebula timetable.':'Could not check shared timetable · using Nebula’s default plan.';}finally{refreshing=null;renderHome();}})();return refreshing;
}
function launchItems(day,items){
 if(!items.length){R.showScreen('play');R.showCard('learn','Nebula timetable','<h2>'+R.escape(day.title)+'</h2><p>All available MCQs in today’s selection are complete. Choose another topic explicitly from MCQ map if you want more practice.</p>','Open MCQ map',()=>R.campaign.openWarMap(),0);return false;}
 const base=items[0].room,room={...base,locus:'Nebula timetable',topic:day.title+' · '+partLabel(day),mode:'',review:true,studyPractice:true,timetableRun:true,timetableDay:day,randomFree:false,missionConcept:null,concepts:[],nextSetPool:itemsFor(day),items:items.slice(0,10),note:['Nebula timetable: '+day.title+'. '+partLabel(day)+'. This run stays inside today’s selection.']};
 R.start([room],0);R.beginCombat();return true;
}
async function launch(){if(buttonBusy)return;buttonBusy=true;renderHome();try{await refresh();const day=plan();launchItems(day,itemsFor(day));}finally{buttonBusy=false;renderHome();}}
function isCurrentRun(){return !!(R.active&&R.rooms?.[R.si]?.timetableRun);}
function nextSet(){const room=R.rooms[R.si],day=room.timetableDay,excluded=new Set(room.items.map(i=>i.id)),fresh=itemsFor(day).filter(it=>!excluded.has(it.id));if(!fresh.length){R.toast(itemsFor(day).length?'Only this set remains today. Finish its outstanding questions.':'Today’s timetable MCQs are complete. Choose another topic in MCQ map.',true);return false;}R.flight?.completeSet();R.toHome();return launchItems(day,fresh);}
R.onTimetableClear=function(room){if(!room.timetableRun)return false;const day=room.timetableDay,left=itemsFor(day);R.showCard('learn','Nebula timetable','<h2>'+R.escape(day.title)+'</h2><p>'+partLabel(day)+' · '+(left.length?left.length+' MCQs remain in today’s selection.':'Today’s available MCQs are complete. Your progress is saved.')+'</p>',left.length?'Next today’s set':'Return to timetable',()=>{R.toHome();if(left.length)launchItems(day,itemsFor(day));else renderHome();},0);return true;};
const meta=document.createElement('p');meta.id='timetableStatus';meta.className='campaignFootnote';meta.setAttribute('role','status');Q('#campaignLaunch').after(meta);
Q('#campaignLaunch').onclick=launch;const campaignButton=document.createElement('button');campaignButton.className='btn';campaignButton.textContent='Continue story campaign';campaignButton.onclick=()=>{R.homeMenu.close();R.campaign.launch();};Q('#homePane-progress').prepend(campaignButton);
const label=document.createElement('span');label.id='qRunTopic';Q('#qbar').prepend(label);
function hud(){requestAnimationFrame(hud);const room=R.active&&R.rooms?.[R.si],text=room?(room.nebulaOsceId?'NEBULA OSCE · ':room.timetableRun?'NEBULA TODAY · ':'MANUAL TOPIC · ')+(room.timetableRun?room.timetableDay.title+' · '+partLabel(room.timetableDay):room.topic):'';if(label.textContent!==text)label.textContent=text;label.hidden=!room;}
R.timetable={renderHome,refresh,launch,nextSet,isCurrentRun,plan,itemsFor};
window.addEventListener('focus',()=>{if(!R.active)refresh();});document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!R.active)refresh();});setInterval(()=>{if(!document.hidden&&!R.active){renderHome();refresh();}},60000);
renderHome();refresh();requestAnimationFrame(hud);
})(typeof window!=='undefined'?window:globalThis);
