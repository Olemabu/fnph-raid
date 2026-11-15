// Build src/deck.txt from Nebula topics and MCQs plus the earlier FNPH Raid deck as bonus concepts.
// Input: nebula.json = {syl: NEBULA.syllabus, topics: NEBULA.topics}, loaded from Nebula data files.
// usage: node nebula2deck.js nebula.json old-deck.txt > deck.txt
const fs=require('fs');
const N=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const OLD=fs.readFileSync(process.argv[3],'utf8');
const clean=s=>String(s==null?'':s).replace(/\*\*|__|`/g,'').replace(/(^|\s)\*(\S[^*]*?)\*(?=\s|[.,;:)]|$)/g,'$1$2').replace(/\s+/g,' ').replace(/ = /g,' ＝ ').replace(/ :: /g,' : ').replace(/ ~~ /g,' ~ ').replace(/\|/g,'/').trim();
const cut=(s,n)=>s.length<=n?s:s.slice(0,s.lastIndexOf(' ',n-1)>n*.6?s.lastIndexOf(' ',n-1):n-1)+'…';
function noteLines(text){const out=[];String(text||'').split(/\r?\n/).forEach(l=>{const t=l.replace(/^\s*[-•]\s+/,'- ');const b=t.startsWith('- ');const c=clean(b?t.slice(2):t);if(!c)return;out.push('> '+(b?'- ':'')+c);});return out;}
// ---- old deck: retain non-station bonus concepts; exclude OSCE blocks from future regeneration.
const old={};let cur=null,skipOsce=false;
OLD.split(/\r?\n/).forEach(l=>{if(l.startsWith('## ')){const p=l.slice(3).split('|').map(s=>s.trim());cur={locus:p[0],topic:p[1],mode:p[2]||'',lines:[]};old[p[0]]=cur;skipOsce=false;return;}if(!cur||l.startsWith('# ')||l==='#')return;if(l.startsWith('### '))skipOsce=/\bosce\b/i.test(l);if(!skipOsce)cur.lines.push(l);});
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
const titles=Object.fromEntries(N.syl.topics.map(t=>[t.id,t]));
const out=[];
out.push('# FNPH Raid deck. Generated from nebula-study (Documents/nebula-study/data) by tools/nebula2deck.js, plus the earlier FNPH Raid deck as bonus concepts.');
out.push('# "## Locus | Topic | mode" starts a station (map order). "### Concept | mode" starts a concept: one run plays one concept.');
out.push('# ">" lines under a station or concept are its briefing (the high-yield summary); under an item they are its teaching note.');
out.push('# Q: question = right answer | wrong | wrong (:: why) ... · L: procedure in order = step | step ~~ decoy · S: list in any order = item | item ~~ decoy');
out.push('# Modes: race (ambulance run), fps (first-person ward round). Rebuild after edits: build.bat or python build.py.');
let stats={concepts:0,q:0};
for(const [locus,tid,olds,mode] of SLOTS){
  const T=N.topics[tid]||{points:[],mcqs:[]},t=titles[tid];
  out.push('');out.push('## '+locus+' | '+clean(t.title)+(mode?' | '+mode:''));
  out.push('> '+clean(t.title)+'. Source: '+clean(t.lecture)+'. Each run plays one concept: read its summary in the briefing, then answer all of its questions.');
  const byPoint={};T.mcqs.forEach(m=>{(byPoint[m.point]=byPoint[m.point]||[]).push(m);});
  const emit=m=>{const ans=m.options[m.answer];const wr=m.options.filter((o,i)=>i!==m.answer);
    out.push('Q: '+clean(m.q)+' = '+[ans].concat(wr).map(o=>{const reason=m.why&&m.why[o];return cut(clean(o),220)+(reason?' :: '+cut(clean(reason),350):'');}).join(' | '));
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
  // bonus concepts from the earlier deck
  olds.forEach(name=>{const o=old[name];if(!o)return;stats.concepts++;
    const om=o.mode&&!mode?' | '+o.mode:'';
    out.push('');out.push('### Bonus drill: '+o.topic.replace(/\|/g,'/')+om);
    o.lines.forEach(l=>{if(l.trim())out.push(l);});
  });
}
process.stdout.write(out.join('\n')+'\n');
