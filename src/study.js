/* Single question-to-game flow. Provider credentials remain on the Nebula server. */
(function(){
  'use strict';
  const R=$.raid, panel=document.createElement('section');panel.className='appTools';
  panel.innerHTML='<h2>Turn a question into a game</h2><p>Paste your school question. Build a sourced answer and a teaching raid, then practise until you clear every item. Remove patient names and identifying details first.</p><label for="studyQuery">Your question</label><textarea id="studyQuery" rows="5" maxlength="8000" style="width:100%;box-sizing:border-box;height:9rem;min-height:9rem;font:inherit;line-height:1.5" placeholder="Paste your OSCE or exam question"></textarea><label for="studyFormat">Question format</label><select id="studyFormat" aria-label="Question format"><option value="osce">OSCE — learn the station step by step</option><option value="essay">Essay — learn a structured answer</option></select><p id="studyFormatHelp">OSCE teaches what to do and say, likely responses, and the station order while you play.</p><label for="studyCode">Study access code</label><input id="studyCode" aria-describedby="studyCodeError" type="password" autocomplete="off" placeholder="Your Nebula study access code"><div id="studyCodeError" role="alert" hidden style="border:2px solid #b3261e;border-radius:8px;padding:12px;background:#fff0ef;color:#8b1a14;font-weight:700"></div><p class="muted">Use your study access code here, never an API key. New sessions need internet; saved sessions play offline.</p><button class="btn" id="studyGenerate">Build my learning session</button><button class="btn" id="studyCancel" hidden>Cancel</button><button class="btn" id="studyFind">Find existing questions</button><button class="btn" id="studyPlayMatches" hidden>Play matching questions</button><div id="studyMatches"></div><details><summary>Import or export a session</summary><label class="btn">Import Nebula study pack<input id="studyImport" type="file" accept="application/json,.json"></label><button class="btn" id="studyExport" hidden>Export study pack</button></details><p id="studyStatus" role="status" aria-live="polite"></p><button class="btn" id="studyPlay" hidden>Play my session</button><p id="studyProgress" aria-live="polite"></p><details id="studyNotes" hidden><summary>Model answer, sources and examiner checklist</summary><div id="studyAnswer"></div></details>';
  document.querySelector('#home .themeSettings').after(panel);
  const Q=s=>panel.querySelector(s);let pack=null,controller=null;
  try{Q('#studyQuery').value=localStorage.getItem('fnphraid.studyQuestion')||'';}catch{}
  try{Q('#studyFormat').value=localStorage.getItem('fnphraid.studyFormat')||'osce';}catch{}
  Q('#studyFormat').onchange=()=>{const mode=Q('#studyFormat').value;try{localStorage.setItem('fnphraid.studyFormat',mode);}catch{}Q('#studyFormatHelp').textContent=mode==='osce'?'OSCE teaches what to do and say, likely responses, and the station order while you play.':'Essay teaches the answer structure, key points and how to organise a complete written discussion.';};
  Q('#studyFormat').onchange();
  Q('#studyQuery').oninput=()=>{try{localStorage.setItem('fnphraid.studyQuestion',Q('#studyQuery').value);}catch{}};
  function clearCodeError(){Q('#studyCode').removeAttribute('aria-invalid');Q('#studyCode').style.outline='';Q('#studyCodeError').hidden=true;}
  function codeError(message){const box=Q('#studyCodeError');box.textContent=message;box.hidden=false;Q('#studyCode').setAttribute('aria-invalid','true');Q('#studyCode').style.outline='2px solid #b3261e';Q('#studyCode').focus();}
  Q('#studyCode').oninput=clearCodeError;
  function progress(){if(!pack)return;const p=R.studyProgress(pack);Q('#studyProgress').textContent=p.done+'/'+p.total+(pack.mode==='osce'?' OSCE drills cleared. Learn each step, choose what to do and say, then rehearse the station order.':' learning items cleared. Initial practice needs three correct answers; a missed question needs two correct repeats.');Q('#studyPlay').textContent=p.done===p.total?'Practise this session again':pack.mode==='osce'?'Play my OSCE stations':pack.mode==='essay'?'Play my essay session':'Play saved general session';}
  function save(p){const validated=StudyKit.validate(p);try{localStorage.setItem('fnphraid.studyPack',JSON.stringify(validated));}catch{Q('#studyStatus').textContent='Session ready, but storage is full. Export it to keep a copy.';}show(validated);}
  function show(p){
    pack=StudyKit.validate(p);Q('#studyPlay').hidden=false;Q('#studyExport').hidden=false;Q('#studyNotes').hidden=false;
    const box=Q('#studyAnswer');box.replaceChildren();
    for(const value of [pack.question,pack.modelAnswer,'Checklist:',...pack.checklist,'Critical actions: '+pack.critical.join('; ')]){const p=document.createElement('p');p.textContent=value;box.append(p);}
    function line(value,heading=false){const el=document.createElement(heading?'h3':'p');el.textContent=value;box.append(el);}
    if(pack.mode==='osce')for(const [si,station]of pack.stations.entries()){
      line('Station '+(si+1)+': '+station.title,true);line('Candidate brief: '+station.brief);line('Role: '+station.role);
      for(const [pi,phase]of station.phases.entries()){line('Step '+(pi+1)+': '+phase.title,true);line('Do: '+phase.action);line('Say: “'+phase.say+'”');line('They may say: “'+phase.expect+'”');line('Your reply: “'+phase.reply+'”');line('Why: '+phase.reason+(phase.critical?' — Critical safety step.':''));}
    }
    if(pack.mode==='essay')for(const section of pack.essayPlan){line(section.heading,true);section.points.forEach(point=>line('• '+point));}
    for(const source of pack.sources){const a=document.createElement('a');a.href=source.url;a.textContent=source.title;a.target='_blank';a.rel='noopener noreferrer';box.append(a,document.createElement('br'));}
    Q('#studyStatus').textContent=(pack.mode==='osce'?'OSCE':pack.mode==='essay'?'Essay':'Saved general session')+': '+pack.title+' · '+(pack.mode==='osce'?pack.stations.length+' OSCE station(s), '+pack.stations.reduce((n,s)=>n+s.phases.length,0)+' steps':pack.mcqs.length+' questions')+' · '+(pack.status==='draft'?'AI draft: review sources':'Source-reviewed educational pack');
    progress();
  }
  try{const saved=localStorage.getItem('fnphraid.studyPack');if(saved)show(JSON.parse(saved));}catch{Q('#studyStatus').textContent='Saved study pack could not be loaded. Import it again.';}
  Q('#studyImport').onchange=async e=>{try{const f=e.target.files[0];if(!f)return;if(f.size>250000)throw Error('Study pack too large.');const validated=StudyKit.validate(JSON.parse(await f.text()));localStorage.setItem('fnphraid.studyPack',JSON.stringify(validated));show(validated);}catch(error){Q('#studyStatus').textContent='Import failed: '+error.message;}finally{e.target.value='';}};
  Q('#studyPlay').onclick=()=>{try{const p=R.studyProgress(pack);R.playStudyPack(pack,p.done===p.total);}catch(e){Q('#studyStatus').textContent=e.message;}};
  Q('#studyGenerate').onclick=async()=>{
    if(controller)return;
    const question=Q('#studyQuery').value.trim(),code=Q('#studyCode').value.trim();
    if(question.length<12){Q('#studyStatus').textContent='Paste the full question first.';return;}
    clearCodeError();
    if(!code||/^(sk-|sk_)/i.test(code)){const message='Enter your study access code, not your API key.';codeError(message);Q('#studyStatus').textContent=message;return;}
    const pending=controller=new AbortController();let timedOut=false;
    const timeout=setTimeout(()=>{timedOut=true;pending.abort();},100000);
    Q('#studyGenerate').disabled=true;Q('#studyCancel').hidden=false;Q('#studyStatus').textContent='Finding clinical sources and building your teaching session…';
    try{
      const response=await fetch('https://nebula-study.pages.dev/api/study',{method:'POST',headers:{'Content-Type':'application/json','X-Tutor-Code':code},signal:pending.signal,body:JSON.stringify({question,research:true,mode:Q('#studyFormat').value})});
      const out=await response.json().catch(()=>({}));
      if(response.status===401){codeError('Wrong access code. Use the same access code as Nebula Voice Tutor, then try again.');throw Error('Wrong access code. Your question has been kept.');}
      if(!response.ok)throw Error(out.error||(response.status===404?'The study service needs its latest update deployed.':'Could not build this session. Please retry.'));
      if(pending.signal.aborted)return;
      const validated=StudyKit.validate(out.pack);save(validated);Q('#studyNotes').open=true;
      Q('#studyStatus').textContent='Session ready. Review the sourced teaching, then use the Play button for this session. Generated material is a study draft.';
    }catch(e){Q('#studyStatus').textContent=pending.signal.aborted?(timedOut?'The session took too long. Your question is saved; please retry.':'Generation cancelled. Your question and previous session are kept.'):(e.message==='Failed to fetch'?'Could not reach the study service. Check your connection and try again.':e.message);}
    finally{clearTimeout(timeout);controller=null;Q('#studyGenerate').disabled=false;Q('#studyCancel').hidden=true;}
  };
  Q('#studyCancel').onclick=()=>controller?.abort();
  // Refresh progress after a raid without changing controller or gameplay handlers.
  new MutationObserver(()=>{if(!document.querySelector('#home').hidden)progress();}).observe(document.querySelector('#home'),{attributes:true,attributeFilter:['hidden','class','style']});
  Q('#studyExport').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(pack,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='nebula-study-pack.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  Q('#studyFind').onclick=()=>{const hits=R.findStudy(Q('#studyQuery').value),box=Q('#studyMatches');box.replaceChildren();for(const hit of hits){const p=document.createElement('p');p.textContent=hit.head;box.append(p);}Q('#studyPlayMatches').hidden=!hits.length;Q('#studyStatus').textContent=hits.length+' matching questions (up to 30 shown).';};
  Q('#studyPlayMatches').onclick=()=>{try{R.playStudyMatches(Q('#studyQuery').value);}catch(e){Q('#studyStatus').textContent=e.message;}};
})();
