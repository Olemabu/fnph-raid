// Build src/deck.txt from nebula-study (topics: points + MCQs; OSCE scripts) plus the old FNPH Raid deck as bonus concepts.
// Input: nebula.json = {syl: NEBULA.syllabus, topics: NEBULA.topics, osce: NEBULA.osceStations}, made by loading nebula-study/data/syllabus.js, topics/*.js and osce/stations.js in node with global.window=global.
// usage: node nebula2deck.js nebula.json old-deck.txt > deck.txt
const fs=require('fs');
const N=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const OLD=fs.readFileSync(process.argv[3],'utf8');
const clean=s=>String(s==null?'':s).replace(/\*\*|__|`/g,'').replace(/(^|\s)\*(\S[^*]*?)\*(?=\s|[.,;:)]|$)/g,'$1$2').replace(/\s+/g,' ').replace(/ = /g,' ＝ ').replace(/ :: /g,' : ').replace(/ ~~ /g,' ~ ').replace(/\|/g,'/').trim();
const cut=(s,n)=>s.length<=n?s:s.slice(0,s.lastIndexOf(' ',n-1)>n*.6?s.lastIndexOf(' ',n-1):n-1)+'…';
function noteLines(text){const out=[];String(text||'').split(/\r?\n/).forEach(l=>{const t=l.replace(/^\s*[-•]\s+/,'- ');const b=t.startsWith('- ');const c=clean(b?t.slice(2):t);if(!c)return;out.push('> '+(b?'- ':'')+c);});return out;}
// ---- old deck: stations become bonus concepts
const old={};let cur=null;
OLD.split(/\r?\n/).forEach(l=>{if(l.startsWith('## ')){const p=l.slice(3).split('|').map(s=>s.trim());cur={locus:p[0],topic:p[1],mode:p[2]||'',lines:[]};old[p[0]]=cur;return;}if(!cur||l.startsWith('# ')||l==='#')return;cur.lines.push(l);});
// ---- map: slot -> locus, topic, old bonus stations
const SLOTS=[
 ['Main Gate','phenomenology',['Main Gate']],
 ['Car Park','interview',['Car Park','NE Wing','South Ward']],
 ['Main Block','mood',['Main Block']],
 ['NE Wing','personality',[]],
 ['Pink Quad','schizophrenia',['Pink Quad']],
 ['Clozapine Clinic','biological',['Clozapine Clinic','Sports Field','Courtyard Block']],
 ['Emergency Resus','emergency',['Emergency Resus','West Courtyard','Round Huts'],'race'],
 ['U-Block','substance',['U-Block']],
 ['Sports Field','genetics',[]],
 ['West Courtyard','perinatal',[]],
 ['Long Red Ward','oldage',['Long Red Ward']],
 ['Round Huts','laterlife',[]],
 ['South Ward','neurology1',[]],
 ['Courtyard Block','neurology2',[]],
 ['SE Clinic','forensic1',['SE Clinic']],
 ['Admin Block','forensic2',[]],
 ['OPD Clinic','community',[]],
 ['Pharmacy','telepsychiatry',[]],
 ['Library','history',[]],
 ['Records Office','statistics',[]],
];
const OSCE_TOPIC={'dep-cog':'mood',grief:'mood',antidepressants:'mood','bad-psychoed':'mood','parents-depression':'mood',
 'trs-clozapine':'schizophrenia','schiz-relative':'schizophrenia',
 'mse-thought':'phenomenology',passivity:'phenomenology','mse-full':'phenomenology','judgement-insight':'phenomenology','defence-mech':'phenomenology',
 premorbid:'interview',psychosexual:'interview','ocd-hx':'interview',bdd:'interview',ptsd:'interview',agoraphobia:'interview','gender-incongruence':'interview',conversion:'interview',eating:'interview',tourette:'interview',conduct:'interview',enuresis:'interview','reading-disorder':'interview','asd-teacher':'interview',cbt:'interview',erp:'interview','sys-desens':'interview',wais:'statistics',
 bpd:'personality',npd:'personality','pd-traits':'personality',
 'alcohol-exam':'substance',opioid:'substance',mi:'substance','alcohol-lft':'substance',
 'ect-counsel':'biological','ect-electrodes':'biological',lithium:'biological',capacity:'biological',
 serotonin:'emergency','suicide-risk':'emergency',pfa:'emergency',
 puerperal:'perinatal','dep-dementia':'oldage',mmse:'laterlife',
 tle:'neurology1',frontal:'neurology1','temporal-exam':'neurology1','parietal-exam':'neurology1',
 cerebellar:'neurology2','cranial-nerves':'neurology2','parkinson-psychosis':'neurology2',
 'mha-detention':'forensic1',testamentary:'forensic1','fitness-plead':'forensic2','violence-risk':'forensic2','morbid-jealousy':'forensic2'};
const titles=Object.fromEntries(N.syl.topics.map(t=>[t.id,t]));
const out=[];
out.push('# FNPH Raid deck. Generated from nebula-study (Documents/nebula-study/data) by tools/nebula2deck.js, plus the earlier FNPH Raid deck as bonus concepts.');
out.push('# "## Locus | Topic | mode" starts a station (map order). "### Concept | mode" starts a concept: one run plays one concept.');
out.push('# ">" lines under a station or concept are its briefing (the high-yield summary); under an item they are its teaching note.');
out.push('# Q: question = right answer | wrong | wrong (:: why) ... · L: procedure in order = step | step ~~ decoy · S: list in any order = item | item ~~ decoy');
out.push('# Modes: race (ambulance run), fps (first-person ward round). Rebuild after edits: build.bat or python build.py.');
let stats={concepts:0,q:0,osce:0,osceItems:0};
const used=new Set();
for(const [locus,tid,olds,mode] of SLOTS){
  const T=N.topics[tid]||{points:[],mcqs:[]},t=titles[tid];
  out.push('');out.push('## '+locus+' | '+clean(t.title)+(mode?' | '+mode:''));
  out.push('> '+clean(t.title)+'. Source: '+clean(t.lecture)+'. Each run plays one concept: read its summary in the briefing, then answer all of its questions.');
  const byPoint={};T.mcqs.forEach(m=>{(byPoint[m.point]=byPoint[m.point]||[]).push(m);});
  const emit=m=>{const ans=m.options[m.answer];const wr=m.options.filter((o,i)=>i!==m.answer);
    out.push('Q: '+clean(m.q)+' = '+[ans].concat(wr).map(o=>cut(clean(o),220)).join(' | '));
    noteLines(m.explain).forEach(l=>out.push(l));stats.q++;};
  T.points.forEach(p=>{
    const lines=String(p.text).split(/\r?\n/);let title=clean(lines[0]).replace(/[:.]$/,'');let body=lines.slice(1).join('\n');
    if(!title||title.length>90){title=cut(clean(p.id.replace(/^[a-z]+-/,'').replace(/-/g,' ')),60);body=p.text;}
    out.push('');out.push('### '+title);stats.concepts++;
    noteLines(body).forEach(l=>out.push(l));
    (byPoint[p.id]||[]).forEach(emit);delete byPoint[p.id];
  });
  const rest=Object.values(byPoint).flat();
  if(rest.length){out.push('');out.push('### Mixed questions: '+clean(t.title));out.push('> Questions from the lecture that are not tied to one summary point.');rest.forEach(emit);stats.concepts++;}
  // OSCE stations for this topic, embedded as concepts (first-person ward round unless the station is a race station)
  N.osce.filter(s=>(OSCE_TOPIC[s.id]||'interview')===tid).forEach(s=>{
    used.add(s.id);stats.osce++;
    out.push('');out.push('### OSCE: '+clean(s.title)+(mode?'':' | fps'));stats.concepts++;
    out.push('> '+clean(s.group)+' station. Task: '+clean(s.brief));
    if(s.patient)out.push('> Patient: '+clean(s.patient));
    (s.notes&&s.notes.items||[]).forEach(n=>out.push('> - '+clean(n)));
    if(s.critical)out.push('> Critical fail: '+clean(s.critical));
    const ph=(s.phases||[]).filter(p=>p.h);
    if(ph.length>=2){out.push('L: '+clean(s.title)+': the phases of the station, in order = '+ph.map(p=>cut(clean(p.h),70)).join(' | '));stats.osceItems++;}
    ph.forEach((p,i)=>{
      const others=ph.filter(o=>o!==p).map(o=>cut(clean(o.h),70));
      if(p.say&&others.length>=3){out.push('Q: '+clean(s.title)+'. Which phase is this line from? '+cut(clean(p.say),170)+' = '+[cut(clean(p.h),70)].concat(others).join(' | '));out.push('> What to say: '+clean(p.say));if(p.check)out.push('> Examiner checks: '+clean(p.check));stats.osceItems++;}
      const oc=ph.filter(o=>o!==p&&o.check).map(o=>cut(clean(o.check),170));
      if(p.check&&oc.length>=3){out.push('Q: '+clean(s.title)+', '+cut(clean(p.h),70)+': what is the examiner looking for? = '+[cut(clean(p.check),170)].concat(oc).join(' | '));if(p.say)out.push('> Say: '+clean(p.say));stats.osceItems++;}
    });
    if(s.critical){const oc=N.osce.filter(o=>o!==s&&o.critical&&o.group===s.group).map(o=>cut(clean(o.critical),170)).slice(0,5);
      if(oc.length>=3){out.push('Q: '+clean(s.title)+': what is the critical fail in this station? = '+[cut(clean(s.critical),170)].concat(oc).join(' | '));out.push('> '+clean(s.critical));stats.osceItems++;}}
    (s.viva||[]).forEach(v=>{const oa=N.osce.filter(o=>o.group===s.group).flatMap(o=>(o.viva||[])).filter(x=>x!==v).map(x=>cut(clean(x.a),170));
      if(oa.length>=3){const pick=oa.sort(()=>Math.random()-.5).slice(0,4);out.push('Q: Viva ('+clean(s.title)+'): '+clean(v.q)+' = '+[cut(clean(v.a),170)].concat(pick).join(' | '));out.push('> '+clean(v.a));stats.osceItems++;}});
  });
  // bonus concepts from the earlier deck
  olds.forEach(name=>{const o=old[name];if(!o)return;stats.concepts++;
    const om=o.mode&&!mode?' | '+o.mode:'';
    out.push('');out.push('### Bonus drill: '+o.topic.replace(/\|/g,'/')+om);
    o.lines.forEach(l=>{if(l.trim())out.push(l);});
  });
}
const missing=N.osce.filter(s=>!used.has(s.id)).map(s=>s.id);
console.error(JSON.stringify(stats),'unplaced OSCE:',missing.join(',')||'none');
process.stdout.write(out.join('\n')+'\n');
