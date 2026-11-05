// Bundle timetable metadata and source MCQ order directly from Nebula, never a second handwritten plan.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const raid=path.resolve(__dirname,'..'),nebula=path.resolve(process.argv[2]||path.join(raid,'../nebula')),c={NEBULA:{topics:{}}};c.window=c;vm.createContext(c);
for(const f of fs.readdirSync(nebula+'/data/topics').filter(f=>f.endsWith('.js')&&f!=='index.js'))vm.runInContext(fs.readFileSync(nebula+'/data/topics/'+f,'utf8'),c);
vm.runInContext(fs.readFileSync(nebula+'/data/syllabus.js','utf8'),c);const s=c.NEBULA.syllabus;
vm.runInContext(fs.readFileSync(nebula+'/data/osce/stations.js','utf8'),c);
fs.copyFileSync(nebula+'/osce-limit.js',raid+'/src/osce-limit.js');
const data={plan:s.plan,start:s.start,weeks:s.weeks,readyBy:s.readyBy,examBy:s.examBy,topicDays:s.topicDays,osceStations:c.NEBULA.osceStations.map(({id,title,group,brief,patient,critical,phases})=>({id,title,group,brief,patient,critical,phases})),topics:Object.fromEntries(s.topics.map(t=>[t.id,{title:t.title,mcqIds:(c.NEBULA.topics[t.id]?.mcqs||[]).map(q=>q.id)}]))};
fs.writeFileSync(raid+'/src/timetable-data.js','window.FNPH_TIMETABLE_DATA='+JSON.stringify(data)+';\n');console.log('Bundled '+data.topicDays.length+' study-day slots from Nebula '+data.plan);
