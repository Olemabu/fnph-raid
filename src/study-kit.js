/* Shared, versioned study-pack contract. Also bundled into FNPH Raid; no network or secrets. */
(function(root, factory) {
  root.StudyKit = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';
  const text = (s, max = 12000) => {
    if (typeof s !== 'string' || !s.trim() || s.length > max) throw Error('Invalid or oversized study text.');
    return s.trim();
  };
  function validate(p) {
    if (!p || p.format !== 'nebula-study-pack' || ![1,2].includes(p.version)) throw Error('Choose a supported Nebula study pack (version 1 or 2).');
    const list = (a, min, max, fn) => {
      if (!Array.isArray(a) || a.length < min || a.length > max) throw Error('Invalid study pack list.');
      return a.map(fn);
    };
    const result = {
      format: p.format, version: p.version, title: text(p.title, 200), question: text(p.question),
      modelAnswer: text(p.modelAnswer, 20000), role: text(p.role, 4000),
      checklist: list(p.checklist, 2, 40, x => text(x, 800)),
      critical: list(p.critical, 0, 10, x => text(x, 800)),
      sources: list(p.sources, 1, 30, s => {
        const url = text(s.url, 1000);
        if (!/^https:\/\//.test(url)) throw Error('Source must use HTTPS.');
        return { title: text(s.title, 200), url };
      }),
      mcqs: list(p.mcqs, p.version===2 && p.mode==='osce' ? 0 : 1, 30, q => {
        const options = list(q.options, 4, 5, x => text(x, 1000));
        if (new Set(options).size !== options.length || !Number.isInteger(q.answer) || q.answer < 0 || q.answer >= options.length) throw Error('Invalid MCQ answer/options.');
        return { q: text(q.q, 2000), options, answer: q.answer, explain: text(q.explain, 4000) };
      }),
      status: p.status === 'reviewed' ? 'reviewed' : 'draft',
    };
    if(p.version===2){
      if(!['osce','essay'].includes(p.mode))throw Error('Choose OSCE or Essay.');
      result.mode=p.mode;
      if(p.mode==='osce'){
        result.stations=list(p.stations,1,4,s=>{
          const station={title:text(s.title,160),brief:text(s.brief,2000),role:text(s.role,1500),phases:list(s.phases,4,12,x=>{
            if(typeof x.critical!=='boolean')throw Error('Invalid critical-step flag.');
            return{title:text(x.title,140),action:text(x.action,300),say:text(x.say,450),expect:text(x.expect,450),reply:text(x.reply,450),reason:text(x.reason,800),critical:x.critical};
          })};
          for(const field of ['title','action','say','reply'])if(new Set(station.phases.map(x=>x[field])).size!==station.phases.length)throw Error('OSCE phase actions and dialogue must be distinct.');
          return station;
        });
        if(result.stations.reduce((n,s)=>n+s.phases.length,0)>24)throw Error('Too many OSCE phases. Split the question into separate sessions.');
      }else {result.essayPlan=list(p.essayPlan,3,12,s=>({heading:text(s.heading,160),points:list(s.points,1,8,x=>text(x,600))}));if(new Set(result.essayPlan.map(s=>s.heading)).size!==result.essayPlan.length)throw Error('Essay headings must be distinct.');}
    }
    return result;
  }
  const clean = s => s.replace(/[\r\n|]/g, ' ').replace(/ = /g, ' equals ').replace(/ :: /g, ': ').replace(/ ~~ /g, ' ').trim();
  function osceDrills(input){
    const p=validate(input);if(p.mode!=='osce')return[];
    return p.stations.flatMap((station,si)=>station.phases.flatMap((phase,pi)=>{
      const lesson={...phase,station:station.title,stationNumber:si+1,step:pi+1,total:station.phases.length,key:si+':'+pi};
      const prefix='Station '+(si+1)+' '+station.title+' · Step '+(pi+1)+' '+phase.title;
      return [
        {field:'action',prompt:prefix+': What do you do next?'},
        {field:'say',prompt:prefix+': What would you say?'},
        {field:'reply',prompt:prefix+': They say “'+phase.expect+'”. How do you respond?'}
      ].map(({field,prompt})=>({prompt:clean(prompt),answer:clean(phase[field]),lesson,
        wrongs:[1,2,3].map(offset=>{const index=(pi+offset)%station.phases.length;return{text:clean(station.phases[index][field]),reason:'This belongs to step '+(index+1)+' ('+clean(station.phases[index].title)+'), rather than the current step.'};}),
        note:clean(phase.reason)+(phase.critical?' Critical safety step.':'')}));
    }));
  }
  function deck(input) {
    const p = validate(input);
    if(p.mode==='osce'){
      const drills=osceDrills(p),lines=['## OSCE practice | '+clean(p.title),'> '+clean(p.question)];
      for(const [si,station]of p.stations.entries()){
        lines.push('> Station '+(si+1)+': '+clean(station.title),'> Candidate brief: '+clean(station.brief),'> Role: '+clean(station.role));
        for(const d of drills.filter(d=>d.lesson.stationNumber===si+1))lines.push('Q: '+d.prompt+' = '+[d.answer,...d.wrongs.map(w=>w.text+' :: '+w.reason)].join(' | '),'> '+d.note);
        lines.push('L: Station '+(si+1)+' '+clean(station.title)+': rehearse the phases in order = '+station.phases.map(x=>clean(x.title)+' => '+clean(x.action)).join(' | '),'> Process cues: '+station.phases.map(x=>clean(x.title)).join(' | '),'> '+station.phases.map(x=>clean(x.title)+': say “'+clean(x.say)+'”').join('; '));
      }
      lines.push(...p.sources.map(s=>'> Source: '+clean(s.title)+' '+s.url));return lines.join('\n');
    }
    return ['## Imported study | ' + clean(p.title), '### ' + clean(p.title),
      '> ' + clean(p.question), '> ' + clean(p.modelAnswer),
      ...(p.essayPlan||[]).map(s=>'> '+clean(s.heading)+': '+s.points.map(clean).join('; ')),
      ...p.sources.map(s => '> Source: ' + clean(s.title) + ' ' + s.url),
      ...p.mcqs.flatMap(q => ['Q: ' + clean(q.q) + ' = ' + [q.options[q.answer], ...q.options.filter((_, i) => i !== q.answer)].map(clean).join(' | '), '> ' + clean(q.explain)]),
      'S: Examiner checklist = ' + p.checklist.map(clean).join(' | '),
      ...(p.essayPlan?['L: Build the essay in order = '+p.essayPlan.map(s=>clean(s.heading)+' => '+s.points.map(clean).join('; ')).join(' | ')]:[]),
      '> Critical: ' + p.critical.map(clean).join('; ')].join('\n');
  }
  function segments(s, max = 500) {
    const words = String(s).trim().split(/\s+/), out = []; let part = '';
    for (const word of words) {
      if (part && part.length + word.length + 1 > max) { out.push(part); part = ''; }
      if (word.length > max) { if (part) { out.push(part); part = ''; } for (let i = 0; i < word.length; i += max) out.push(word.slice(i, i + max)); }
      else part += (part ? ' ' : '') + word;
    }
    if (part) out.push(part); return out;
  }
  function terms(q) {
    const stop = new Set('a an the is of to with who and in on for discuss proposed management plan presented persistent about commence university mother year old adolescent'.split(' '));
    return [...new Set(String(q).toLowerCase().replace(/bed[ -]?wetting/g, 'enuresis').match(/[\p{L}][\p{L}\p{N}-]*/gu) || [])].filter(w => w.length > 2 && !stop.has(w)).slice(0, 16);
  }
  function rank(items, query) {
    const words = terms(query); if (!words.length) return [];
    return items.map(x => ({ item: x, score: words.reduce((n, w) => n + ((x.head + ' ' + x.text).toLowerCase().includes(w) ? 1 : 0), 0) }))
      .filter(x => x.score > 0).sort((a, b) => b.score - a.score).map(x => x.item);
  }
  return { validate, deck, osceDrills, segments, terms, rank };
});
