/* Offline-first interchange with Nebula. No API token is accepted or stored by the game. */
(function(){
  'use strict';
  const R=$.raid, panel=document.createElement('section');panel.className='appTools';
  panel.innerHTML='<h2>Question workspace</h2><p>Search your syllabus questions, or import a sourced Nebula study pack to practise its questions in a raid. Create new packs in Nebula, then export them here.</p><input id="studyQuery" aria-label="Question or clinical keywords" placeholder="Paste a question or clinical keywords"><button class="btn" id="studyFind">Find questions</button><button class="btn" id="studyPlayMatches" hidden>Play matching questions</button><div id="studyMatches"></div><label class="btn">Import Nebula study pack<input id="studyImport" type="file" accept="application/json,.json"></label><button class="btn" id="studyPlay" hidden>Play imported questions</button><button class="btn" id="studyExport" hidden>Export study pack</button><p id="studyStatus" role="status"></p><details id="studyNotes" hidden><summary>Model answer and examiner checklist</summary><div id="studyAnswer"></div></details><a class="btn" href="https://nebula-study.pages.dev/" target="_blank" rel="noopener noreferrer">Open Nebula</a>';
  document.querySelector('#home .themeSettings').after(panel);
  const Q=s=>panel.querySelector(s);let pack=null;
  function show(p){
    pack=StudyKit.validate(p);Q('#studyPlay').hidden=false;Q('#studyExport').hidden=false;Q('#studyNotes').hidden=false;
    const box=Q('#studyAnswer');box.replaceChildren();
    for(const value of [pack.question,pack.modelAnswer,'Checklist:',...pack.checklist,'Critical actions: '+pack.critical.join('; ')]){const p=document.createElement('p');p.textContent=value;box.append(p);}
    for(const source of pack.sources){const a=document.createElement('a');a.href=source.url;a.textContent=source.title;a.target='_blank';a.rel='noopener noreferrer';box.append(a,document.createElement('br'));}
    Q('#studyStatus').textContent=pack.title+' · '+pack.mcqs.length+' questions · '+(pack.status==='draft'?'AI draft: review sources':'Source-reviewed educational pack');
  }
  try{const saved=localStorage.getItem('fnphraid.studyPack');if(saved)show(JSON.parse(saved));}catch{Q('#studyStatus').textContent='Saved study pack could not be loaded. Import it again.';}
  Q('#studyImport').onchange=async e=>{try{const f=e.target.files[0];if(!f)return;if(f.size>250000)throw Error('Study pack too large.');const validated=StudyKit.validate(JSON.parse(await f.text()));localStorage.setItem('fnphraid.studyPack',JSON.stringify(validated));show(validated);}catch(error){Q('#studyStatus').textContent='Import failed: '+error.message;}finally{e.target.value='';}};
  Q('#studyPlay').onclick=()=>{try{R.playStudyPack(pack);}catch(e){Q('#studyStatus').textContent=e.message;}};
  Q('#studyExport').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(pack,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='nebula-study-pack.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  Q('#studyFind').onclick=()=>{const hits=R.findStudy(Q('#studyQuery').value),box=Q('#studyMatches');box.replaceChildren();for(const hit of hits){const p=document.createElement('p');p.textContent=hit.head;box.append(p);}Q('#studyPlayMatches').hidden=!hits.length;Q('#studyStatus').textContent=hits.length+' matching questions (up to 30 shown).';};
  Q('#studyPlayMatches').onclick=()=>{try{R.playStudyMatches(Q('#studyQuery').value);}catch(e){Q('#studyStatus').textContent=e.message;}};
})();
